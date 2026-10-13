#!/usr/bin/env python3
"""jira-work state tool: the single writer of .jira-work/<KEY>/state.json (local, git-ignored).

Stdlib only (Python 3.9+). `wf.py -h`, `wf.py <command> -h`. Every mutation is appended to the ticket's history so a
later session can resume safely. Runtime state lives outside .claude/ because Claude Code treats .claude/ as a
sensitive path (agent writes there need approval).
"""
import argparse
import contextlib
import datetime as dt
import fcntl
import hashlib
import json
import os
import re
import subprocess
import sys

STAGES = ["intake", "analysis", "awaiting-approval", "planning", "design", "implementation", "review",
          "fixing", "verification", "ready-for-human-review", "blocked", "dry-run-complete", "plan-complete", "done"]
GATES = ["functional", "visual", "accessibility", "seo", "code", "security", "content", "performance", "cross-browser"]
GATE_STATUSES = ["PASS", "FAIL", "BLOCKED", "NOT APPLICABLE", "NOT VERIFIED"]
SEVERITIES = ["critical", "high", "medium", "low", "info"]
BLOCKING_SEVERITIES = {"critical", "high", "medium"}
DEFECT_CLOSED = {"verified", "wontfix-approved"}
DEVELOPER_ROLES = {"frontend-developer"}
LISTS = {"tasks": "T", "defects": "D", "approvals": "Q", "blockers": "B", "tests": "TC",
         "acceptanceCriteria": "AC", "notes": "N"}
CONTRACT_KEYS = ["ticket", "agent", "task", "status", "summary", "requirementsAddressed", "filesInspected",
                 "filesChanged", "skillsUsed", "toolsUsed", "evidence", "tests", "findings", "blockers",
                 "needsHumanDecision", "nextAction", "report"]
KEY_RE = re.compile(r"^[A-Z][A-Z0-9_]+-\d+$")
HERE = os.path.dirname(os.path.abspath(__file__))


def now():
    return dt.datetime.now().astimezone().isoformat(timespec="seconds")


def die(msg, code=2):
    print("ERROR: " + msg, file=sys.stderr)
    sys.exit(code)


def git(args, cwd, raw=False):
    r = subprocess.run(["git"] + args, cwd=cwd, capture_output=True, text=True)
    if r.returncode != 0:
        return ""
    return r.stdout if raw else r.stdout.strip()


def repo_root():
    """Main checkout root, also when called from inside a linked worktree."""
    start = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    common = git(["rev-parse", "--path-format=absolute", "--git-common-dir"], start)
    return os.path.dirname(common.rstrip("/")) if common else start


ROOT = repo_root()
WORK = os.path.join(ROOT, ".jira-work")
PROFILE_PATH = os.path.join(ROOT, ".claude", "workflow", "project.json")


def profile():
    try:
        with open(PROFILE_PATH, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def resources():
    r = {"perTicket": {"warn": {}, "approval": {}}, "noProgress": {"sameFailureRepeats": 2, "sameDefectAttemptsWarn": 3}}
    r.update(profile().get("resources", {}))
    return r


def tdir(key):
    if not KEY_RE.match(key):
        die("not a Jira key: %r" % key)
    return os.path.join(WORK, key)


def spath(key):
    return os.path.join(tdir(key), "state.json")


@contextlib.contextmanager
def locked(key, create=False):
    d = tdir(key)
    if not os.path.isdir(d):
        if not create:
            die("no state for %s (run: wf.py init %s)" % (key, key))
        os.makedirs(os.path.join(d, "reports"), exist_ok=True)
        os.makedirs(os.path.join(d, "evidence"), exist_ok=True)
    with open(os.path.join(d, ".lock"), "w") as lk:
        fcntl.flock(lk, fcntl.LOCK_EX)
        st = None
        if os.path.exists(spath(key)):
            with open(spath(key), encoding="utf-8") as f:
                st = upgrade(json.load(f))
        box = {"state": st}
        yield box
        if box["state"] is not None:
            tmp = spath(key) + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(box["state"], f, indent=2, ensure_ascii=False)
                f.write("\n")
            os.replace(tmp, spath(key))


def upgrade(st):
    """Bring older state files up to the current schema (new fields get empty defaults)."""
    if st is None or st.get("schema", 1) >= 2:
        return st
    for k, v in (("sessions", []), ("invocations", []), ("assessment", st.pop("classification", {}) or {}),
                 ("strategy", {}), ("notes", []), ("reports", [])):
        st.setdefault(k, v)
    for g in GATES:
        st["gates"].setdefault(g, {"status": "NOT VERIFIED", "required": False, "evidence": "", "note": ""})
    st["schema"] = 2
    return st


def load(key):
    if not os.path.exists(spath(key)):
        die("no state for %s (run: wf.py init %s)" % (key, key))
    with open(spath(key), encoding="utf-8") as f:
        return upgrade(json.load(f))


def current_session():
    return os.environ.get("CLAUDE_CODE_SESSION_ID")   # set by Claude Code in its Bash tool environment


def hist(st, event):
    st.setdefault("history", []).append({"at": now(), "event": event})
    st["updatedAt"] = now()
    sid = current_session()
    if sid:   # usage attribution: only the calling session's window grows; another session opens its own
        ss = st.setdefault("sessions", [])
        if ss and ss[-1]["id"] == sid:
            ss[-1]["to"] = now()
        else:
            ss.append({"id": sid, "from": now(), "to": now()})


def sha(path):
    try:
        with open(path, "rb") as f:
            return hashlib.sha1(f.read()).hexdigest()
    except (FileNotFoundError, IsADirectoryError):
        return None


def dirty_files(cwd):
    out = git(["status", "--porcelain", "--untracked-files=all"], cwd, raw=True)  # leading space is significant
    files = []
    for line in out.splitlines():
        p = line[3:]
        if " -> " in p:
            p = p.split(" -> ", 1)[1]
        p = p.strip('"')
        if p.startswith((".jira-work/", ".claude/worktrees/")):
            continue
        files.append(p)
    return files


def changed_now(st):
    """Files the ticket changed (new dirty files + baseline files whose content changed since intake)."""
    ws = st["workspace"]["path"]
    base = {b["path"]: b["sha1"] for b in st.get("baselineDirty", [])}
    return sorted(p for p in dirty_files(ws) if p not in base or sha(os.path.join(ws, p)) != base[p])


def fingerprint(st):
    ws = st["workspace"]["path"]
    return {p: sha(os.path.join(ws, p)) for p in changed_now(st)}


def fp_diff(old, new):
    return sorted(p for p in set(old) | set(new) if old.get(p) != new.get(p))


def parse_val(v):
    try:
        return json.loads(v)
    except ValueError:
        return v


def set_path(obj, dotted, value):
    parts = dotted.split(".")
    for p in parts[:-1]:
        obj = obj.setdefault(p, {})
    obj[parts[-1]] = value


def next_id(items, prefix):
    n = 0
    for it in items:
        m = re.match(r"^%s-(\d+)$" % prefix, str(it.get("id", "")))
        if m:
            n = max(n, int(m.group(1)))
    return "%s-%d" % (prefix, n + 1)


def find(items, item_id):
    for it in items:
        if it.get("id") == item_id:
            return it
    return None


def open_session(st, sid):
    sid = sid or current_session()
    if not sid:
        return
    ss = st.setdefault("sessions", [])
    if not ss or ss[-1]["id"] != sid:
        ss.append({"id": sid, "from": now(), "to": now()})


# ---------------------------------------------------------------- resource checkpoints

def metrics(st, with_usage=True):
    m = {"agentInvocations": len(st.get("invocations", [])), "fixRounds": st.get("budgets", {}).get("fixRounds", 0)}
    mins = 0.0
    for s in st.get("sessions", []):
        a, b = dt.datetime.fromisoformat(s["from"]), dt.datetime.fromisoformat(s.get("to") or now())
        mins += (b - a).total_seconds() / 60
    m["elapsedMinutes"] = round(mins, 1)
    if with_usage and st.get("sessions"):
        try:
            sys.path.insert(0, HERE)
            import usage  # noqa: E402  (same directory)
            u = usage.ticket_usage(st["ticket"])
            m["estCostUsd"] = u["total"]["estCostUsd"]
            per = resources().get("subscription", {}).get("usdPerFiveHourPercent")
            if per:   # calibrated conversion to the subscription's 5-hour window (approximate)
                m["estFiveHourWindowPct"] = round(m["estCostUsd"] / per, 1)
            m["outputTokens"] = u["total"]["output_tokens"]
            m["cacheReadTokens"] = u["total"]["cache_read_input_tokens"]
        except Exception as e:  # telemetry must never break the workflow
            m["usageError"] = str(e)[:120]
    return m


def checkpoint_lines(st, with_usage=True):
    res = resources()["perTicket"]
    allowance = float(st.get("resourceAllowance", 1))
    m = metrics(st, with_usage)
    level, notes = "OK", []
    for lvl in ("warn", "approval"):
        for k, lim in res.get(lvl, {}).items():
            if lim is None or k not in m:
                continue
            lim_eff = lim * (allowance if lvl == "approval" else 1)
            if m[k] >= lim_eff:
                notes.append("%s %s=%s >= %s" % (lvl.upper(), k, m[k], lim_eff))
                level = "APPROVAL REQUIRED" if lvl == "approval" else ("WARN" if level == "OK" else level)
    line = "CHECKPOINT %s %s %s" % (st["ticket"], level, json.dumps(m))
    if any(k.startswith("est") for k in m):
        notes.append("(est* = estimate from local transcripts at list prices; real plan usage: claude.ai Settings > Usage)")
    return level, [line] + notes


# ---------------------------------------------------------------- commands

def cmd_preflight(a):
    prof = profile()
    default = prof.get("git", {}).get("defaultBranch", "main")
    out = {
        "root": ROOT, "workDir": WORK,
        "profile": PROFILE_PATH if prof else "MISSING - create .claude/workflow/project.json",
        "project": prof.get("name"),
        "jira": {k: prof.get("jira", {}).get(k) for k in ("site", "cloudId", "projectKeys")},
        "git": {"branch": git(["branch", "--show-current"], ROOT), "head": git(["rev-parse", "--short", "HEAD"], ROOT),
                "aheadOfRemote": git(["rev-list", "--count", "origin/%s..HEAD" % default], ROOT),
                "dirtyFiles": dirty_files(ROOT),
                "worktrees": [l.split(" ", 1)[1] for l in git(["worktree", "list", "--porcelain"], ROOT).splitlines()
                              if l.startswith("worktree ")]},
        "tickets": {d: load(d).get("stage") for d in sorted(os.listdir(WORK))
                    if KEY_RE.match(d) and os.path.exists(spath(d))} if os.path.isdir(WORK) else {},
        "decisionLog": os.path.relpath(os.path.join(WORK, "decisions.md"), ROOT)
        if os.path.exists(os.path.join(WORK, "decisions.md")) else None,
    }
    print(json.dumps(out, indent=2, ensure_ascii=False))


def cmd_init(a):
    with locked(a.key, create=True) as box:
        if box["state"] is not None and not a.reset:
            st = box["state"]
            open_session(st, a.session)
            hist(st, "init called again: existing state kept")
            print("EXISTS %s stage=%s mode=%s (resume it; --reset archives it)" % (a.key, st.get("stage"), st.get("mode")))
            return
        if box["state"] is not None:
            arch = spath(a.key).replace("state.json", "state.%s.json" % dt.datetime.now().strftime("%Y%m%d%H%M%S"))
            with open(arch, "w", encoding="utf-8") as f:
                json.dump(box["state"], f, indent=2, ensure_ascii=False)
        ws = os.path.abspath(a.workspace or ROOT)
        default = profile().get("git", {}).get("defaultBranch", "main")
        base_dirty = dirty_files(ws)
        box["state"] = {
            "schema": 2, "ticket": a.key, "summary": a.summary or "", "mode": a.mode,
            "jira": {"url": a.url or "", "status": a.jira_status or "", "updated": a.jira_updated or "",
                     "fetchedAt": now() if a.jira_updated else ""},
            "stage": "intake", "assessment": {}, "strategy": {}, "agents": [],
            "workspace": {"mode": "main" if ws == ROOT else "worktree", "path": ws,
                          "branch": git(["branch", "--show-current"], ws), "head": git(["rev-parse", "HEAD"], ws),
                          "remoteHead": git(["rev-parse", "origin/%s" % default], ws)},
            "baselineDirty": [{"path": p, "sha1": sha(os.path.join(ws, p))} for p in base_dirty],
            "acceptanceCriteria": [], "tasks": [], "tests": [], "defects": [], "approvals": [], "blockers": [],
            "notes": [], "reports": [], "invocations": [], "filesChanged": [], "sessions": [],
            "gates": {g: {"status": "NOT VERIFIED", "required": False, "evidence": "", "note": ""} for g in GATES},
            "budgets": {"fixRounds": 0}, "createdAt": now(), "updatedAt": now(), "history": [],
        }
        open_session(box["state"], a.session)
        hist(box["state"], "init (%s), baseline dirty files: %d" % (a.mode, len(base_dirty)))
    print("INIT %s -> %s" % (a.key, os.path.relpath(tdir(a.key), ROOT)))


def cmd_session(a):
    with locked(a.key) as box:
        open_session(box["state"], a.session)
        hist(box["state"], "session %s attached" % a.session)
    print("OK")


def cmd_show(a):
    st = load(a.key)
    path = a.path or a.path_opt
    if path:
        for p in path.split("."):
            st = st[int(p)] if isinstance(st, list) else st.get(p)
    print(json.dumps(st, indent=2, ensure_ascii=False))


def cmd_set(a):
    with locked(a.key) as box:
        val = parse_val(a.value) if a.json else a.value
        if a.path == "stage" and val not in STAGES:
            die("stage must be one of: " + ", ".join(STAGES))
        set_path(box["state"], a.path, val)
        hist(box["state"], "set %s = %s" % (a.path, json.dumps(val, ensure_ascii=False)[:200]))
    print("OK")


def new_item(items, lst, item):
    if item.get("id") and find(items, item["id"]):
        die("%s already has %s (use update)" % (lst, item["id"]))
    item.setdefault("id", next_id(items, LISTS[lst]))
    item.setdefault("createdAt", now())
    if lst == "approvals":
        item.setdefault("status", "pending")
    if lst == "defects":
        item.setdefault("status", "open")
        item.setdefault("attempts", 0)
        item.setdefault("owner", "frontend-developer")
    if lst == "tasks":
        item.setdefault("status", "pending")
    items.append(item)
    return item["id"]


def cmd_add(a):
    if a.list not in LISTS:
        die("list must be one of: " + ", ".join(LISTS))
    data = parse_val(a.item)
    items_in = data if isinstance(data, list) else [data]
    if not all(isinstance(i, dict) for i in items_in):
        die("item must be a JSON object or a list of objects")
    with locked(a.key) as box:
        items = box["state"].setdefault(a.list, [])
        ids = [new_item(items, a.list, dict(i)) for i in items_in]
        hist(box["state"], "add %s %s" % (a.list, ",".join(ids)))
    print(" ".join(ids))


def apply_defect_rules(st, d, changes):
    new_status = changes.get("status")
    if new_status == "verified":
        by = changes.get("verifiedBy") or d.get("verifiedBy")
        if not by:
            die("verified needs verifiedBy=<independent agent>")
        if by in DEVELOPER_ROLES or by == d.get("owner"):
            die("%s cannot verify its own fix of %s; an independent agent must re-test it" % (by, d["id"]))
        if not (changes.get("evidence") or d.get("verifyEvidence")):
            die("verified needs evidence=<report or evidence path>")
        changes.setdefault("verifyEvidence", changes.pop("evidence", ""))
        changes["verifiedAt"] = now()
    if new_status == "wontfix-approved":
        q = find(st.get("approvals", []), changes.get("approval", d.get("approval", "")))
        if not q or q.get("status") != "approved":
            die("wontfix-approved needs approval=Q-n of an approved Product Owner decision")
    if new_status == "fixed-unverified":
        changes["attempts"] = int(d.get("attempts", 0)) + 1
    return changes


def cmd_update(a):
    if a.list not in LISTS:
        die("list must be one of: " + ", ".join(LISTS))
    changes = {}
    for kv in a.changes:
        if "=" not in kv:
            die("expected key=value, got %r" % kv)
        k, v = kv.split("=", 1)
        changes[k] = parse_val(v)
    with locked(a.key) as box:
        st = box["state"]
        it = find(st.get(a.list, []), a.id)
        if not it:
            die("%s %s not found" % (a.list, a.id))
        if a.list == "defects":
            changes = apply_defect_rules(st, it, changes)
        if a.list == "approvals" and changes.get("status") in ("approved", "rejected", "answered"):
            changes.setdefault("decidedAt", now())
        it.update(changes)
        hist(st, "update %s %s %s" % (a.list, a.id, json.dumps(changes, ensure_ascii=False)[:200]))
    print("OK")


def norm_gate(s):
    s = s.upper().replace("_", " ").replace("-", " ")
    if s not in GATE_STATUSES:
        die("gate status must be one of: " + ", ".join(GATE_STATUSES))
    return s


def cmd_plan(a):
    """Import plan.json: assessment, strategy, gates (required/na + why), tasks. Renders plan.md."""
    with open(a.plan_file, encoding="utf-8") as f:
        plan = json.load(f)
    with locked(a.key) as box:
        st = box["state"]
        st["assessment"] = plan.get("assessment", {})
        st["strategy"] = plan.get("strategy", {})
        for g, spec in plan.get("gates", {}).items():
            if g not in GATES:
                die("unknown gate %r" % g)
            st["gates"][g]["required"] = bool(spec.get("required"))
            st["gates"][g]["why"] = spec.get("why", "")
            if spec.get("na"):
                st["gates"][g].update(status="NOT APPLICABLE", required=False, note=spec.get("why", ""))
        existing = {t["id"] for t in st["tasks"]}
        for t in plan.get("tasks", []):
            if t.get("id") in existing:
                find(st["tasks"], t["id"]).update({k: v for k, v in t.items() if k != "status"})
            else:
                new_item(st["tasks"], "tasks", dict(t))
        hist(st, "plan imported: %d tasks, required gates %s" % (
            len(plan.get("tasks", [])), ",".join(g for g, v in st["gates"].items() if v.get("required"))))
        render_plan(st)
    print("OK plan.md written; %d tasks" % len(st["tasks"]))


def render_plan(st):
    L = ["# %s plan" % st["ticket"], "", st.get("strategy", {}).get("summary", ""), "", "## Assessment", "",
         "| Dimension | Rating | Why |", "|---|---|---|"]
    for dim, v in st.get("assessment", {}).items():
        v = v if isinstance(v, dict) else {"rating": v}
        L.append("| %s | %s | %s |" % (dim, v.get("rating", ""), str(v.get("why", "")).replace("|", "/")))
    L += ["", "## Strategy", ""]
    for k, v in st.get("strategy", {}).items():
        if k != "summary":
            L.append("- **%s:** %s" % (k, v if isinstance(v, str) else json.dumps(v, ensure_ascii=False)))
    L += ["", "## Tasks", "", "| ID | Agent | Model | Purpose | Evidence | Depends on |", "|---|---|---|---|---|---|"]
    for t in st["tasks"]:
        L.append("| %s | %s | %s | %s | %s | %s |" % (t["id"], t.get("agent", ""), t.get("model", "inherit"),
                 str(t.get("purpose", t.get("title", ""))).replace("|", "/"), str(t.get("evidence", "")).replace("|", "/"),
                 ", ".join(t.get("dependsOn", [])) or "-"))
    L += ["", "## Gates", "", "| Gate | Required | Status | Why |", "|---|---|---|---|"]
    for g, v in st["gates"].items():
        L.append("| %s | %s | %s | %s |" % (g, "yes" if v.get("required") else "no", v["status"], v.get("why") or v.get("note", "")))
    with open(os.path.join(tdir(st["ticket"]), "plan.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")


def cmd_plan_gates(a):
    with locked(a.key) as box:
        st = box["state"]
        for label, names, req in (("required", a.required, True), ("optional", a.optional, False), ("na", a.na, False)):
            for g in filter(None, (names or "").split(",")):
                if g not in GATES:
                    die("unknown gate %r" % g)
                st["gates"][g]["required"] = req
                if label == "na":
                    st["gates"][g].update(status="NOT APPLICABLE", note=a.reason or "not in scope for this ticket")
        hist(st, "plan gates required=%s optional=%s na=%s" % (a.required, a.optional, a.na))
    print("OK")


def cmd_gate(a):
    status = norm_gate(a.status)
    with locked(a.key) as box:
        st = box["state"]
        if a.gate not in GATES:
            die("gate must be one of: " + ", ".join(GATES))
        if status == "PASS":
            if not a.evidence:
                die("PASS needs --evidence")
            open_d = [d["id"] for d in st["defects"] if d.get("gate") == a.gate
                      and d.get("status") not in DEFECT_CLOSED and d.get("severity") in BLOCKING_SEVERITIES]
            if open_d:
                die("cannot PASS %s with open defects: %s" % (a.gate, ", ".join(open_d)))
        st["gates"][a.gate].update(status=status, evidence=a.evidence or "", note=a.note or "", at=now(),
                                   fp=fingerprint(st))
        hist(st, "gate %s = %s" % (a.gate, status))
    print("OK")


def stale_gates(st):
    cur = fingerprint(st)
    out = {}
    for g, v in st["gates"].items():
        if v["status"] in ("PASS", "FAIL") and "fp" in v:
            d = fp_diff(v["fp"], cur)
            if d:
                out[g] = d
    return out, cur


def cmd_stale(a):
    st = load(a.key)
    out, cur = stale_gates(st)
    tests = {}
    for t in st["tests"]:
        if "fp" in t:
            d = fp_diff(t["fp"], cur)
            if d:
                tests[t["id"]] = d
    if not out:
        print("CURRENT: no gate evidence predates a file change")
    for g, files in out.items():
        print("STALE gate %s (%s): changed since: %s" % (g, st["gates"][g]["status"], ", ".join(files)))
    for t, files in tests.items():
        print("STALE test %s (advisory - re-run it if these changes can affect it): changed since: %s" % (t, ", ".join(files)))


def cmd_log(a):
    with locked(a.key) as box:
        hist(box["state"], a.message)
    print("OK")


def next_report_path(key, agent):
    d = os.path.join(tdir(key), "reports")
    os.makedirs(d, exist_ok=True)
    n = len([f for f in os.listdir(d) if f.endswith(".json")]) + 1
    return os.path.relpath(os.path.join(d, "%02d-%s.md" % (n, agent)), ROOT)


def cmd_next_report(a):
    print(next_report_path(a.key, a.agent))


def cmd_invoke(a):
    """Record a delegation before it starts; flag redundant re-runs; evaluate resource checkpoints."""
    with locked(a.key) as box:
        st = box["state"]
        fp = fingerprint(st)
        inv = st.setdefault("invocations", [])
        prev = [i for i in inv if i["agent"] == a.agent and i.get("mode") == a.mode and i.get("scope") == a.scope
                and i.get("status") == "done"]
        report = next_report_path(a.key, a.agent)
        msgs = []
        if prev and not fp_diff(prev[-1].get("fp", {}), fp) and not a.force:
            msgs.append("REDUNDANT: %s %s%s already completed on identical files (invocation #%d, %s). Reuse it, or pass "
                        "--force with a reason if its inputs changed in another way."
                        % (a.agent, a.mode, " " + a.scope if a.scope else "", prev[-1]["n"], prev[-1].get("report")))
        else:
            inv.append({"n": len(inv) + 1, "agent": a.agent, "task": a.task, "mode": a.mode, "scope": a.scope,
                        "model": a.model, "continues": a.continues, "reason": a.reason, "report": report,
                        "fp": fp, "at": now(), "status": "running"})
            task = find(st["tasks"], a.task) if a.task else None
            if task:
                task["status"] = "in_progress"
            hist(st, "invoke #%d %s %s %s model=%s%s" % (len(inv), a.agent, a.mode, a.scope or "", a.model,
                                                          " (continues %s)" % a.continues if a.continues else ""))
            msgs.append("REPORT %s" % report)
        level, lines = checkpoint_lines(st, with_usage=not a.no_usage)
    print("\n".join(msgs + lines))
    if level == "APPROVAL REQUIRED":
        sys.exit(3)


def failure_signature(f):
    return re.sub(r"\W+", " ", ("%s %s" % (f.get("title", ""), f.get("detail", ""))).lower()).strip()[:240]


def cmd_ingest(a):
    """Consolidate one agent's JSON report into state: ACs, tests, defects, decisions, blockers, files."""
    with open(a.json_file, encoding="utf-8") as f:
        txt = f.read()
    m = re.search(r"```json\s*(\{.*\})\s*```\s*$", txt, re.S)
    rep = json.loads(m.group(1) if m else txt)
    missing = [k for k in CONTRACT_KEYS if k not in rep]
    if missing:
        die("report violates contract, missing keys: " + ", ".join(missing))
    agent = rep["agent"]
    msgs = []
    np = resources()["noProgress"]
    with locked(a.key) as box:
        st = box["state"]
        if rep["ticket"] != a.key and a.key not in rep.get("tickets", []):
            die("report is for %s, not %s" % (rep["ticket"], a.key))
        fp = fingerprint(st)
        st["reports"].append({"agent": agent, "task": rep["task"], "status": rep["status"], "report": rep["report"],
                              "json": os.path.relpath(os.path.abspath(a.json_file), ROOT),
                              "skillsUsed": rep["skillsUsed"], "at": now()})
        for inv in reversed(st.get("invocations", [])):
            if inv["agent"] == agent and inv.get("status") == "running":
                inv.update(status="done", outcome=rep["status"], doneAt=now(), fp=fp)
                break
        if agent not in st["agents"]:
            st["agents"].append(agent)
        task = find(st["tasks"], rep["task"])
        if task:
            task["status"] = {"complete": "done"}.get(rep["status"], rep["status"])
            task["report"] = rep["report"]
        for ac in rep.get("acceptanceCriteria", []):   # analyst: ACs travel in the report, no per-AC calls
            cur = find(st["acceptanceCriteria"], ac.get("id"))
            if cur:
                if cur.get("text") != ac.get("text") or cur.get("source") != ac.get("source"):
                    cur.update(ac, changedAt=now(), confirmed=False if ac.get("source") == "proposed" else cur.get("confirmed"))
                    msgs.append("AC CHANGED %s" % ac["id"])
            else:
                new_item(st["acceptanceCriteria"], "acceptanceCriteria", dict(ac))
                msgs.append("AC %s [%s]" % (ac.get("id"), ac.get("source")))
        if rep.get("assessment"):
            st.setdefault("analysis", {})["assessmentProposal"] = rep["assessment"]
        for t in rep["tests"]:
            cur = find(st["tests"], t["id"])
            run = {"result": t.get("result"), "by": agent, "evidence": t.get("evidence", ""), "at": now()}
            if cur:
                cur.update({k: v for k, v in t.items() if k != "id"})
                cur["fp"] = fp
                cur.setdefault("runs", []).append(run)
            else:
                st["tests"].append(dict(t, runs=[run], fp=fp))
        for fnd in rep["findings"]:
            sev = fnd.get("severity", "info")
            if fnd.get("resolves"):
                d = find(st["defects"], fnd["resolves"])
                if not d:
                    msgs.append("WARN finding %s resolves unknown %s" % (fnd.get("id"), fnd["resolves"]))
                    continue
                if agent in DEVELOPER_ROLES or agent == d.get("owner"):
                    if d.get("fixFp") is not None and not fp_diff(d["fixFp"], fp):
                        msgs.append("NO CHANGE %s: a fix is reported but no file changed since the previous attempt" % d["id"])
                    d.update(status="fixed-unverified", attempts=int(d.get("attempts", 0)) + 1,
                             fixNote=fnd.get("detail", ""), fixFp=fp)
                    if d["attempts"] >= np.get("sameDefectAttemptsWarn", 3):
                        msgs.append("WARN %s: %d fix attempts - reassess the approach (root cause, design, model) "
                                    "before another patch" % (d["id"], d["attempts"]))
                elif sev == "info":
                    d.update(status="verified", verifiedBy=agent, verifyEvidence=fnd.get("evidence") or rep["report"],
                             verifiedAt=now())
                else:
                    sig = failure_signature(fnd)
                    same = sig and sig == d.get("lastFailureSig")
                    d["status"] = "open"
                    d["reopened"] = d.get("reopened", 0) + 1
                    d["noProgress"] = d.get("noProgress", 0) + 1 if same else 0
                    d["lastFailureSig"] = sig
                    d["lastFailure"] = {"by": agent, "detail": fnd.get("detail", ""), "evidence": fnd.get("evidence", ""), "at": now()}
                    msgs.append("REOPENED %s (still failing per %s)" % (d["id"], agent))
                    if d["noProgress"] >= np.get("sameFailureRepeats", 2) - 1 and same:
                        msgs.append("NO PROGRESS %s: identical failure after the last fix - do not repeat the same approach; "
                                    "re-diagnose (systematic-debugging), change approach or model, or escalate" % d["id"])
                continue
            if sev == "info":
                st["notes"].append({"id": next_id(st["notes"], "N"), "by": agent, "title": fnd.get("title"),
                                    "detail": fnd.get("detail", "")})
                continue
            title = (fnd.get("title") or "").strip().lower()
            dup = next((d for d in st["defects"] if d.get("gate") == fnd.get("gate")
                        and d.get("title", "").strip().lower() == title and d.get("status") not in DEFECT_CLOSED), None)
            if dup:
                dup.setdefault("alsoReportedBy", []).append(agent)
                msgs.append("DUP %s also reported by %s" % (dup["id"], agent))
                continue
            did = next_id(st["defects"], "D")
            st["defects"].append({"id": did, "severity": sev, "gate": fnd.get("gate"), "title": fnd.get("title"),
                                  "detail": fnd.get("detail", ""), "repro": fnd.get("repro", ""),
                                  "evidence": fnd.get("evidence", ""), "foundBy": agent,
                                  "owner": fnd.get("suggestedOwner") or "frontend-developer",
                                  "relatedAC": fnd.get("relatedAC"), "status": "open", "attempts": 0,
                                  "lastFailureSig": failure_signature(fnd), "createdAt": now()})
            msgs.append("NEW %s [%s/%s] %s" % (did, sev, fnd.get("gate"), fnd.get("title")))
        for q in rep["needsHumanDecision"]:
            if any(x.get("question") == q.get("question") for x in st["approvals"]):
                continue
            qid = next_id(st["approvals"], "Q")
            st["approvals"].append(dict(q, id=qid, status="pending", askedBy=agent, createdAt=now()))
            msgs.append("DECISION %s%s: %s" % (qid, " (blocking)" if q.get("blocking") else "", q.get("question")))
        for b in rep["blockers"]:
            bid = next_id(st["blockers"], "B")
            st["blockers"].append(dict(b, id=bid, status="open", by=agent, createdAt=now()))
            msgs.append("BLOCKER %s: %s" % (bid, b.get("title")))
        for p in rep["filesChanged"]:
            if p not in st["filesChanged"]:
                st["filesChanged"].append(p)
        hist(st, "ingest %s %s (%s): %d tests, %d findings" % (agent, rep["task"], rep["status"],
                                                                len(rep["tests"]), len(rep["findings"])))
    print("\n".join(msgs) if msgs else "OK (no new ACs, defects, decisions or blockers)")


def ac_status(st, ac):
    tests = [t for t in st["tests"] if t.get("ac") == ac["id"]]
    if ac.get("status") == "waived":
        return "waived", tests
    if not tests:
        return "not-verified", tests
    results = {t.get("result") for t in tests}
    if "fail" in results:
        return "fail", tests
    if results <= {"pass"}:
        return "pass", tests
    return "not-verified", tests


def trace_lines(st):
    stale, _ = stale_gates(st)
    L = ["| AC | Criterion | Source | Tests | Result |", "|---|---|---|---|---|"]
    for ac in st["acceptanceCriteria"]:
        status, tests = ac_status(st, ac)
        tl = ", ".join("%s:%s" % (t["id"], t.get("result")) for t in tests) or "-"
        src = ac.get("source", "") + (" (confirmed)" if ac.get("confirmed") else "")
        L.append("| %s | %s | %s | %s | **%s** |" % (ac["id"], ac.get("text", "").replace("|", "/"), src, tl, status))
    D = ["| ID | Sev | Gate | Title | Status | Attempts | Found by | Verified by |", "|---|---|---|---|---|---|---|---|"]
    for d in st["defects"]:
        D.append("| %s | %s | %s | %s | %s | %s | %s | %s |" % (d["id"], d.get("severity"), d.get("gate"),
                 (d.get("title") or "").replace("|", "/"), d.get("status"), d.get("attempts", 0), d.get("foundBy", ""),
                 d.get("verifiedBy", "")))
    G = ["| Gate | Required | Status | Evidence / why |", "|---|---|---|---|"]
    for g, v in st["gates"].items():
        s = v["status"] + (" (STALE)" if g in stale else "")
        G.append("| %s | %s | %s | %s |" % (g, "yes" if v.get("required") else "no", s, v.get("evidence") or v.get("why") or v.get("note", "")))
    return L, D, G


def cmd_trace(a):
    st = load(a.key)
    L, D, G = trace_lines(st)
    out = os.path.join(tdir(a.key), "traceability.md")
    with open(out, "w", encoding="utf-8") as f:
        f.write("\n".join(["# %s traceability" % a.key, "", "Generated %s from state.json." % now(), ""] + L +
                          ["", "## Defects", ""] + D + ["", "## Gates", ""] + G) + "\n")
    print(os.path.relpath(out, ROOT))


def readiness(st):
    reasons = []
    if st.get("mode") in ("dry-run", "plan-only"):
        reasons.append("%s: nothing was implemented" % st["mode"])
    if not st["acceptanceCriteria"]:
        reasons.append("no acceptance criteria recorded")
    for ac in st["acceptanceCriteria"]:
        if ac.get("source") == "proposed" and not ac.get("confirmed"):
            reasons.append("%s is a proposal not yet confirmed by the Product Owner" % ac["id"])
        status, _ = ac_status(st, ac)
        if status not in ("pass", "waived"):
            reasons.append("%s is %s" % (ac["id"], status))
    stale, _ = stale_gates(st)
    for g, v in st["gates"].items():
        if v.get("required") and v["status"] not in ("PASS", "NOT APPLICABLE") and not v.get("exceptionApproval"):
            reasons.append("required gate %s is %s" % (g, v["status"]))
        elif v.get("required") and g in stale and not v.get("exceptionApproval"):
            reasons.append("required gate %s is stale (files changed since its evidence: %s)" % (g, ", ".join(stale[g])))
    for d in st["defects"]:
        if d.get("status") not in DEFECT_CLOSED and d.get("severity") in BLOCKING_SEVERITIES:
            reasons.append("defect %s (%s) is %s" % (d["id"], d.get("severity"), d.get("status")))
    for q in st["approvals"]:
        if q.get("status") == "pending" and q.get("blocking"):
            reasons.append("decision %s pending: %s" % (q["id"], q.get("question")))
    for b in st["blockers"]:
        if b.get("status") == "open":
            reasons.append("blocker %s open: %s" % (b["id"], b.get("title")))
    for t in st["tasks"]:
        if t.get("status") not in ("done", "skipped"):
            reasons.append("task %s (%s) is %s" % (t["id"], t.get("agent"), t.get("status")))
    if not os.path.exists(os.path.join(tdir(st["ticket"]), "handoff.md")):
        reasons.append("handoff.md missing (run delivery-verifier)")
    return reasons


def cmd_ready(a):
    st = load(a.key)
    reasons = readiness(st)
    if reasons:
        print("NOT READY %s\n- " % a.key + "\n- ".join(reasons))
        sys.exit(1)
    low = [d["id"] for d in st["defects"] if d.get("status") not in DEFECT_CLOSED]
    print("READY FOR HUMAN REVIEW %s%s" % (a.key, " (known low-severity issues: %s)" % ", ".join(low) if low else ""))


def cmd_report(a):
    """qa-report.md generated from state (no model tokens): verdict, ACs, gates, defects, decisions, usage."""
    st = load(a.key)
    reasons = readiness(st)
    verdict = "READY FOR HUMAN REVIEW" if not reasons else (
        "AWAITING DECISION" if any(r.startswith("decision") or "proposal" in r for r in reasons) and st["stage"] == "awaiting-approval"
        else ("BLOCKED" if st["stage"] == "blocked" else "NOT READY"))
    L, D, G = trace_lines(st)
    out = ["# %s - %s" % (a.key, verdict), "",
           "**Ticket:** [%s %s](%s) · Jira status %s (not changed by this workflow) · mode %s · stage %s" % (
               a.key, st.get("summary", ""), st["jira"].get("url", ""), st["jira"].get("status", "?"), st.get("mode"), st["stage"]),
           ""]
    if reasons:
        out += ["## Why not ready", ""] + ["- " + r for r in reasons] + [""]
    files = st.get("filesChanged") or []
    out += ["## Changed files", ""] + (["- `%s`" % f for f in files] or ["- none"]) + [""]
    prev = profile().get("commands", {}).get("preview", "")
    if prev:
        out += ["## Preview", "", "`%s` in the project folder (changed pages above)." % prev.replace("<port>", "8642"), ""]
    out += ["## Acceptance criteria", ""] + L + ["", "## Quality gates", ""] + G + ["", "## Defects", ""] + D + [""]
    dec = [q for q in st["approvals"]]
    if dec:
        out += ["## Decisions", ""] + ["- %s [%s] %s%s" % (q["id"], q.get("status"), q.get("question", ""),
                                                          " → " + str(q.get("answer")) if q.get("answer") else "") for q in dec] + [""]
    m = metrics(st)
    out += ["## Resources", "", "Agent runs %d · fix rounds %d · active minutes %s · estimated cost $%s at list price%s "
            "(tokens measured, $ and %% estimated)"
            % (m["agentInvocations"], m["fixRounds"], m["elapsedMinutes"], m.get("estCostUsd", "n/a"),
               " ≈ %s%% of a 5-hour window" % m["estFiveHourWindowPct"] if "estFiveHourWindowPct" in m else ""),
            "Details: `python3 .claude/skills/jira-work/scripts/usage.py --ticket %s`" % a.key, ""]
    out += ["## Evidence", "", "- handoff: `handoff.md` (delivery verifier's judgement, risks, untested areas)",
            "- traceability: `traceability.md` · reports: `reports/` · screenshots and scripts: `evidence/`", "",
            "## External actions", "", external_actions(st)]
    path = os.path.join(tdir(a.key), "qa-report.md")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(out) + "\n")
    print(os.path.relpath(path, ROOT))
    print(verdict)


def external_actions(st):
    log = os.path.join(WORK, "guard-log.jsonl")
    sids = {s["id"] for s in st.get("sessions", [])}
    rows = []
    if os.path.exists(log):
        with open(log, encoding="utf-8") as f:
            for line in f:
                try:
                    r = json.loads(line)
                except ValueError:
                    continue
                if r.get("session") in sids and r.get("at", "") >= st.get("createdAt", ""):
                    rows.append("- guard %s: %s `%s` (%s)" % (r["decision"], r.get("tool"), r.get("what", "")[:80], r.get("agent")))
    if not rows:
        return "None attempted: nothing pushed, merged, deployed, published or written to Jira."
    return "\n".join(["Guard events during this ticket (each needed the Product Owner's approval or was blocked):"] + rows)


def cmd_files(a):
    with locked(a.key) as box:
        st = box["state"]
        ch = changed_now(st)
        base = {b["path"] for b in st.get("baselineDirty", [])}
        mixed = [p for p in ch if p in base]
        st["filesChanged"] = ch
        st["filesMixedWithPreexisting"] = mixed
        hist(st, "files: %d changed, %d mixed with pre-existing edits" % (len(ch), len(mixed)))
    print(json.dumps({"changed": [p for p in ch if p not in mixed], "mixedWithPreexisting": mixed}, indent=2))


def cmd_fix_round(a):
    with locked(a.key) as box:
        st = box["state"]
        st["budgets"]["fixRounds"] = st["budgets"].get("fixRounds", 0) + 1
        hist(st, "fix round %d" % st["budgets"]["fixRounds"])
        level, lines = checkpoint_lines(st, with_usage=not a.no_usage)
    print("ROUND %d" % st["budgets"]["fixRounds"])
    print("\n".join(lines))
    if level == "APPROVAL REQUIRED":
        sys.exit(3)


def cmd_checkpoint(a):
    st = load(a.key)
    level, lines = checkpoint_lines(st, with_usage=not a.no_usage)
    print("\n".join(lines))
    if level == "APPROVAL REQUIRED":
        sys.exit(3)


def cmd_decision(a):
    """Project decision log (.jira-work/decisions.md): PO decisions that apply beyond one ticket."""
    path = os.path.join(WORK, "decisions.md")
    if a.action == "list":
        print(open(path, encoding="utf-8").read() if os.path.exists(path) else "No project decisions recorded.")
        return
    if not a.text:
        die("decision add needs --text")
    os.makedirs(WORK, exist_ok=True)
    new = not os.path.exists(path)
    with open(path, "a", encoding="utf-8") as f:
        if new:
            f.write("# Project decisions (Product Owner)\n\nRead before analysis and design; reopen only with new information.\n\n")
        f.write("- %s · %s%s: %s\n" % (dt.date.today().isoformat(), a.ticket or "project",
                                      " " + a.source if a.source else "", a.text))
    print("OK")


NEXT = {
    "intake": "delegate jira-requirements-analyst (analysis)",
    "analysis": "finish analysis (ingest records ACs), then plan",
    "awaiting-approval": "ask the Product Owner the pending decisions; continue independent work",
    "planning": "write plan.json and import it (wf.py plan)",
    "design": "finish design/content tasks, then implementation",
    "implementation": "check developer task status; ingest its report; then the review wave",
    "review": "run/finish the review wave; ingest reports",
    "fixing": "delegate open defects (continue the developer), then re-verify with the finding agent; check wf.py stale",
    "verification": "delivery-verifier, then wf.py ready + report",
    "ready-for-human-review": "nothing - waiting for the Product Owner's review",
    "blocked": "resolve blockers listed below with the Product Owner",
    "dry-run-complete": "a real run needs /jira-work <KEY> (re-initialises; analysis is reused if Jira is unchanged)",
    "plan-complete": "a real run needs /jira-work <KEY> (re-initialises; analysis and plan are reused if Jira is unchanged)",
}


def cmd_resume(a):
    if a.session:
        with locked(a.key) as box:
            open_session(box["state"], a.session)
            hist(box["state"], "resume in session %s" % a.session)
    st = load(a.key)
    ws = st["workspace"]
    out = {"ticket": a.key, "summary": st.get("summary"), "mode": st.get("mode"), "stage": st["stage"],
           "suggestedNext": NEXT.get(st["stage"], "?"), "checks": []}
    if not os.path.isdir(ws["path"]):
        out["checks"].append("WORKSPACE MISSING: %s - do not continue there; re-plan" % ws["path"])
    else:
        br, head = git(["branch", "--show-current"], ws["path"]), git(["rev-parse", "HEAD"], ws["path"])
        if br != ws.get("branch"):
            out["checks"].append("branch is %r, state expects %r" % (br, ws.get("branch")))
        if head != ws.get("head"):
            out["checks"].append("HEAD moved since intake (%s -> %s): new commits exist; review before continuing"
                                 % (ws.get("head", "")[:8], head[:8]))
        gone = [p for p in st["filesChanged"] if p not in set(dirty_files(ws["path"]))]
        if gone:
            out["checks"].append("files recorded as changed are no longer modified (reverted or committed?): " + ", ".join(gone))
        stale, _ = stale_gates(st)
        for g, files in stale.items():
            out["checks"].append("gate %s evidence is stale (changed: %s)" % (g, ", ".join(files)))
    out["checks"].append("Jira: recorded updated=%s - fetch only `updated,status` and re-analyse only if newer"
                         % st["jira"].get("updated", "?"))
    out["artifacts"] = sorted(f for f in os.listdir(tdir(a.key)) if f.endswith((".md", ".json")) and f != "state.json")
    out["inProgressTasks"] = [t for t in st["tasks"] if t.get("status") in ("in_progress", "partial")]
    out["pendingTasks"] = [t["id"] + " " + t.get("agent", "") for t in st["tasks"] if t.get("status") == "pending"]
    out["openDefects"] = [d["id"] + " " + d.get("status", "") + " " + (d.get("title") or "") for d in st["defects"]
                          if d.get("status") not in DEFECT_CLOSED]
    out["pendingDecisions"] = [q["id"] + " " + q.get("question", "") for q in st["approvals"] if q.get("status") == "pending"]
    out["openBlockers"] = [b["id"] + " " + b.get("title", "") for b in st["blockers"] if b.get("status") == "open"]
    out["lastEvents"] = st.get("history", [])[-5:]
    print(json.dumps(out, indent=2, ensure_ascii=False))


def cmd_status(a):
    if not os.path.isdir(WORK):
        print("No tickets in progress.")
        return
    rows = []
    for k in sorted(os.listdir(WORK)):
        if not KEY_RE.match(k) or not os.path.exists(spath(k)):
            continue
        st = load(k)
        if st["stage"] == "done" and not a.all:
            continue
        acs = st["acceptanceCriteria"]
        passed = sum(1 for ac in acs if ac_status(st, ac)[0] in ("pass", "waived"))
        opend = sum(1 for d in st["defects"] if d.get("status") not in DEFECT_CLOSED)
        pend = sum(1 for q in st["approvals"] if q.get("status") == "pending")
        req = [g for g, v in st["gates"].items() if v.get("required")]
        gp = sum(1 for g in req if st["gates"][g]["status"] in ("PASS", "NOT APPLICABLE"))
        row = [k, st["stage"] + (" (%s)" % st["mode"] if st.get("mode") not in (None, "run") else ""),
               "%d/%d" % (passed, len(acs)), str(opend), str(pend), "%d/%d" % (gp, len(req)),
               str(len(st.get("invocations", []))), st.get("updatedAt", "")[:16], (st.get("summary") or "")[:44]]
        if a.usage:
            row.insert(7, "$%s" % metrics(st).get("estCostUsd", "?"))
        rows.append(tuple(row))
    if not rows:
        print("No tickets in progress.")
        return
    head = ["Ticket", "Stage", "ACs", "Open defects", "Decisions", "Req. gates", "Agent runs", "Updated", "Summary"]
    if a.usage:
        head.insert(7, "Est. $")
    w = [max(len(r[i]) for r in rows + [tuple(head)]) for i in range(len(head))]
    for r in [tuple(head)] + rows:
        print("  ".join(c.ljust(w[i]) for i, c in enumerate(r)))


def main():
    ap = argparse.ArgumentParser(prog="wf.py", description=__doc__)
    sp = ap.add_subparsers(dest="cmd", required=True)
    sp.add_parser("preflight", help="project, git, tickets, decision log").set_defaults(fn=cmd_preflight)
    p = sp.add_parser("init", help="create ticket state (idempotent)")
    p.add_argument("key"); p.add_argument("--summary"); p.add_argument("--url"); p.add_argument("--jira-status")
    p.add_argument("--jira-updated"); p.add_argument("--workspace"); p.add_argument("--session", help="${CLAUDE_SESSION_ID}")
    p.add_argument("--mode", default="run", choices=["run", "dry-run", "plan-only"])
    p.add_argument("--dry-run", dest="mode", action="store_const", const="dry-run")
    p.add_argument("--reset", action="store_true"); p.set_defaults(fn=cmd_init)
    p = sp.add_parser("session", help="attach the current session (for usage attribution)")
    p.add_argument("key"); p.add_argument("session"); p.set_defaults(fn=cmd_session)
    p = sp.add_parser("show", help="show state or a dotted path: show KEY gates.functional")
    p.add_argument("key"); p.add_argument("path", nargs="?"); p.add_argument("--path", dest="path_opt")
    p.set_defaults(fn=cmd_show)
    p = sp.add_parser("set", help="set a dotted field, e.g. set KEY stage review")
    p.add_argument("key"); p.add_argument("path"); p.add_argument("value"); p.add_argument("--json", action="store_true")
    p.set_defaults(fn=cmd_set)
    p = sp.add_parser("add", help="append a JSON object or list to " + "|".join(LISTS))
    p.add_argument("key"); p.add_argument("list"); p.add_argument("item"); p.set_defaults(fn=cmd_add)
    p = sp.add_parser("update", help="update KEY defects D-1 status=verified verifiedBy=functional-qa evidence=...")
    p.add_argument("key"); p.add_argument("list"); p.add_argument("id"); p.add_argument("changes", nargs="+")
    p.set_defaults(fn=cmd_update)
    p = sp.add_parser("plan", help="import plan.json (assessment, strategy, gates, tasks) and render plan.md")
    p.add_argument("key"); p.add_argument("plan_file"); p.set_defaults(fn=cmd_plan)
    p = sp.add_parser("plan-gates", help="mark gates required/optional/not applicable")
    p.add_argument("key"); p.add_argument("--required"); p.add_argument("--optional"); p.add_argument("--na")
    p.add_argument("--reason"); p.set_defaults(fn=cmd_plan_gates)
    p = sp.add_parser("gate", help="record a gate result (fingerprints the changed files)")
    p.add_argument("key"); p.add_argument("gate"); p.add_argument("status"); p.add_argument("--evidence")
    p.add_argument("--note"); p.set_defaults(fn=cmd_gate)
    p = sp.add_parser("stale", help="evidence invalidated by later file changes"); p.add_argument("key")
    p.set_defaults(fn=cmd_stale)
    p = sp.add_parser("log"); p.add_argument("key"); p.add_argument("message"); p.set_defaults(fn=cmd_log)
    p = sp.add_parser("next-report", help="path for the next agent report (invoke also prints it)")
    p.add_argument("key"); p.add_argument("agent"); p.set_defaults(fn=cmd_next_report)
    p = sp.add_parser("invoke", help="record a delegation; flags redundant runs; checkpoint (exit 3 = approval needed)")
    p.add_argument("key"); p.add_argument("agent"); p.add_argument("--task"); p.add_argument("--mode", default="")
    p.add_argument("--scope", default=""); p.add_argument("--model", default="inherit")
    p.add_argument("--continues", help="agent id resumed with SendMessage"); p.add_argument("--reason")
    p.add_argument("--force", action="store_true"); p.add_argument("--no-usage", action="store_true")
    p.set_defaults(fn=cmd_invoke)
    p = sp.add_parser("ingest", help="consolidate an agent's JSON report")
    p.add_argument("key"); p.add_argument("json_file"); p.set_defaults(fn=cmd_ingest)
    p = sp.add_parser("trace", help="write traceability.md"); p.add_argument("key"); p.set_defaults(fn=cmd_trace)
    p = sp.add_parser("ready", help="readiness check (exit 1 if not ready)"); p.add_argument("key")
    p.set_defaults(fn=cmd_ready)
    p = sp.add_parser("report", help="write qa-report.md from state"); p.add_argument("key"); p.set_defaults(fn=cmd_report)
    p = sp.add_parser("files", help="refresh changed files vs baseline"); p.add_argument("key"); p.set_defaults(fn=cmd_files)
    p = sp.add_parser("fix-round", help="count a fix round + checkpoint (exit 3 = approval needed)"); p.add_argument("key")
    p.add_argument("--no-usage", action="store_true"); p.set_defaults(fn=cmd_fix_round)
    p = sp.add_parser("checkpoint", help="resource checkpoint (exit 3 = approval needed)"); p.add_argument("key")
    p.add_argument("--no-usage", action="store_true"); p.set_defaults(fn=cmd_checkpoint)
    p = sp.add_parser("decision", help="project decision log: decision add --text ... [--ticket KEY --source Q-1] | decision list")
    p.add_argument("action", choices=["add", "list"]); p.add_argument("--text"); p.add_argument("--ticket")
    p.add_argument("--source"); p.set_defaults(fn=cmd_decision)
    p = sp.add_parser("resume", help="safe-resume report"); p.add_argument("key"); p.add_argument("--session")
    p.set_defaults(fn=cmd_resume)
    p = sp.add_parser("status", help="all tickets"); p.add_argument("--all", action="store_true")
    p.add_argument("--usage", action="store_true", help="add estimated cost (reads transcripts)")
    p.set_defaults(fn=cmd_status)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
