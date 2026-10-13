#!/usr/bin/env python3
"""Token and cost accounting for jira-work, read from Claude Code's own session transcripts.

Measured: tokens per API request (input, output, cache reads, cache writes by TTL), model, timestamps - taken from
~/.claude/projects/<project>/<session>.jsonl and <session>/subagents/agent-*.jsonl (+ .meta.json).
Estimated: dollars, from the documented list prices in .claude/workflow/project.json -> pricing. Subscription plans
are not billed per token, so the dollar figure is an API-list-price equivalent, not a bill.

Attribution: a subagent belongs to the ticket(s) named in the first line of its brief ("Ticket WEB-25 ..." or
"Tickets WEB-1, WEB-2 ..."); orchestrator (main-session) requests are attributed by the ticket's recorded session
windows, split evenly when several tickets were active at the same time.

Usage: usage.py --ticket WEB-25 [--json]   |   usage.py --session <id> [--json]
"""
import argparse
import datetime as dt
import glob
import json
import os
import re
import subprocess
import sys

FIELDS = ("input_tokens", "output_tokens", "cache_read_input_tokens", "cache_creation_input_tokens", "cache_5m", "cache_1h")
KEY_RE = re.compile(r"\b([A-Z][A-Z0-9_]+-\d+)\b")


def repo_root():
    start = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    r = subprocess.run(["git", "rev-parse", "--path-format=absolute", "--git-common-dir"], cwd=start,
                       capture_output=True, text=True)
    return os.path.dirname(r.stdout.strip().rstrip("/")) if r.returncode == 0 and r.stdout.strip() else start


ROOT = repo_root()


def transcripts_dir(root=ROOT):
    base = os.environ.get("CLAUDE_TRANSCRIPTS_DIR")
    if base:
        return base
    return os.path.join(os.path.expanduser("~/.claude/projects"), re.sub(r"[^A-Za-z0-9]", "-", root))


def pricing():
    try:
        with open(os.path.join(ROOT, ".claude", "workflow", "project.json"), encoding="utf-8") as f:
            return json.load(f).get("pricing", {})
    except (OSError, ValueError):
        return {}


def ts(s):
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00")) if s else None


def requests_in(path):
    """One record per API request (transcripts repeat usage on every content block of a response)."""
    reqs = {}
    first_user = None
    with open(path, encoding="utf-8") as f:
        for line in f:
            try:
                e = json.loads(line)
            except ValueError:
                continue
            m = e.get("message") if isinstance(e.get("message"), dict) else {}
            if first_user is None and e.get("type") == "user":
                c = m.get("content")
                first_user = c if isinstance(c, str) else " ".join(
                    x.get("text", "") for x in (c or []) if isinstance(x, dict) and x.get("type") == "text")
            u = m.get("usage")
            if e.get("type") != "assistant" or not u:
                continue
            key = e.get("requestId") or m.get("id") or e.get("uuid")
            cc = u.get("cache_creation") or {}
            rec = {"input_tokens": u.get("input_tokens", 0), "output_tokens": u.get("output_tokens", 0),
                   "cache_read_input_tokens": u.get("cache_read_input_tokens", 0),
                   "cache_creation_input_tokens": u.get("cache_creation_input_tokens", 0),
                   "cache_5m": cc.get("ephemeral_5m_input_tokens", 0), "cache_1h": cc.get("ephemeral_1h_input_tokens", 0)}
            if not cc and rec["cache_creation_input_tokens"]:
                rec["cache_5m"] = rec["cache_creation_input_tokens"]   # TTL unknown: price as 5-minute writes
            old = reqs.get(key)
            if old:  # keep the largest value per field (streamed entries can carry partial counts)
                for k in FIELDS:
                    old[k] = max(old[k], rec[k])
                old["end"] = e.get("timestamp") or old["end"]
            else:
                rec.update(model=m.get("model") or "unknown", start=e.get("timestamp"), end=e.get("timestamp"))
                reqs[key] = rec
    return list(reqs.values()), first_user or ""


def cost(reqs):
    prices = pricing().get("models", {})
    total, unknown = 0.0, set()
    for r in reqs:
        p = prices.get(r["model"])
        if not p:
            unknown.add(r["model"])
            continue
        inp = p["input"]
        total += (r["input_tokens"] * inp + r["output_tokens"] * p["output"]
                  + r["cache_read_input_tokens"] * p.get("cacheRead", inp * 0.1)
                  + r["cache_5m"] * inp * 1.25 + r["cache_1h"] * inp * 2.0) / 1e6
    return total, sorted(unknown)


def summarize(label, reqs, share=1.0):
    s = {"label": label, "requests": len(reqs), "models": sorted({r["model"] for r in reqs}), "share": share}
    for k in FIELDS:
        s[k] = int(sum(r[k] for r in reqs) * share)
    starts = [ts(r["start"]) for r in reqs if r.get("start")]
    ends = [ts(r["end"]) for r in reqs if r.get("end")]
    s["minutes"] = round((max(ends) - min(starts)).total_seconds() / 60, 1) if starts and ends else 0
    c, unknown = cost(reqs)
    s["estCostUsd"] = round(c * share, 2)
    s["unpricedModels"] = unknown
    return s


def subagents(session_dir):
    out = []
    for f in sorted(glob.glob(os.path.join(session_dir, "subagents", "agent-*.jsonl"))):
        meta = {}
        mf = f[:-len(".jsonl")] + ".meta.json"
        if os.path.exists(mf):
            with open(mf, encoding="utf-8") as m:
                meta = json.load(m)
        reqs, brief = requests_in(f)
        head = brief.strip().splitlines()[0] if brief.strip() else ""
        keys = KEY_RE.findall(head) if re.match(r"\s*Tickets?\b", head) else []
        out.append({"agentId": os.path.basename(f)[6:-6], "agentType": meta.get("agentType", "?"),
                    "description": meta.get("description", ""), "tickets": keys, "reqs": reqs})
    return out


def ticket_windows(key):
    """[(session_id, start, end)] from the ticket's state.json sessions list."""
    p = os.path.join(ROOT, ".jira-work", key, "state.json")
    if not os.path.exists(p):
        return []
    with open(p, encoding="utf-8") as f:
        st = json.load(f)
    return [(s["id"], ts(s.get("from")), ts(s.get("to")) or dt.datetime.now(dt.timezone.utc)) for s in st.get("sessions", [])]


def all_ticket_windows():
    res = {}
    for p in glob.glob(os.path.join(ROOT, ".jira-work", "*", "state.json")):
        k = os.path.basename(os.path.dirname(p))
        res[k] = ticket_windows(k)
    return res


def ticket_usage(key):
    tdir = transcripts_dir()
    wins = ticket_windows(key)
    others = {k: v for k, v in all_ticket_windows().items() if k != key}
    rows, main_reqs_weighted = [], []
    for sid in sorted({w[0] for w in wins}):
        main = os.path.join(tdir, sid + ".jsonl")
        if os.path.exists(main):
            reqs, _ = requests_in(main)
            mine = [r for r in reqs if any(w[0] == sid and w[1] <= ts(r["start"]) <= w[2] for w in wins)]
            for r in mine:   # split requests made while other tickets were active in the same session
                t = ts(r["start"])
                n = 1 + sum(1 for ow in others.values() if any(w[0] == sid and w[1] <= t <= w[2] for w in ow))
                main_reqs_weighted.append((r, 1.0 / n))
        for a in subagents(os.path.join(tdir, sid)):
            if key in a["tickets"]:
                share = 1.0 / len(a["tickets"])
                row = summarize(a["agentType"], a["reqs"], share)
                row.update(agentId=a["agentId"], description=a["description"], sharedWith=[t for t in a["tickets"] if t != key])
                rows.append(row)
    orch = summarize("orchestrator (main session)", [r for r, _ in main_reqs_weighted])
    if main_reqs_weighted:   # apply per-request shares
        for k in FIELDS:
            orch[k] = int(sum(r[k] * w for r, w in main_reqs_weighted))
        orch["estCostUsd"] = round(sum(cost([r])[0] * w for r, w in main_reqs_weighted), 2)
    return finish(key, [orch] + rows, sessions=[w[0] for w in wins])


def session_usage(sid):
    tdir = transcripts_dir()
    reqs, _ = requests_in(os.path.join(tdir, sid + ".jsonl"))
    rows = [summarize("main session", reqs)]
    for a in subagents(os.path.join(tdir, sid)):
        row = summarize(a["agentType"], a["reqs"])
        row.update(agentId=a["agentId"], description=a["description"], tickets=a["tickets"])
        rows.append(row)
    return finish(sid, rows, sessions=[sid])


def finish(label, rows, sessions):
    tot = {k: sum(r[k] for r in rows) for k in FIELDS}
    tot["requests"] = sum(r["requests"] for r in rows)
    tot["estCostUsd"] = round(sum(r["estCostUsd"] for r in rows), 2)
    tot["agentInvocations"] = len(rows) - 1
    p = pricing()
    return {"scope": label, "sessions": sessions, "rows": rows, "total": tot,
            "measured": "tokens per API request from Claude Code transcripts (deduplicated by request id)",
            "estimated": "estCostUsd = tokens x list prices from %s (%s); not a bill on subscription plans"
                         % (p.get("source", "project.json pricing"), p.get("asOf", "?")),
            "unpricedModels": sorted({m for r in rows for m in r["unpricedModels"]})}


def fmt(n):
    return "%.1fM" % (n / 1e6) if n >= 1e6 else ("%.0fk" % (n / 1e3) if n >= 1e3 else str(int(n)))


def table(u):
    lines = ["| Agent | Model | Requests | Output | Cache read | Cache write | Input | Minutes | Est. $ |",
             "|---|---|---|---|---|---|---|---|---|"]
    for r in u["rows"]:
        if not r["requests"]:
            continue
        lines.append("| %s%s | %s | %d | %s | %s | %s | %s | %s | %.2f |" % (
            r["label"], " (shared %s)" % ", ".join(r["sharedWith"]) if r.get("sharedWith") else "",
            ", ".join(m.replace("claude-", "") for m in r["models"]), r["requests"], fmt(r["output_tokens"]),
            fmt(r["cache_read_input_tokens"]), fmt(r["cache_creation_input_tokens"]), fmt(r["input_tokens"]),
            r["minutes"], r["estCostUsd"]))
    t = u["total"]
    lines.append("| **Total** (%d agent runs) | | %d | %s | %s | %s | %s | | **%.2f** |" % (
        t["agentInvocations"], t["requests"], fmt(t["output_tokens"]), fmt(t["cache_read_input_tokens"]),
        fmt(t["cache_creation_input_tokens"]), fmt(t["input_tokens"]), t["estCostUsd"]))
    lines += ["", "Tokens: measured (%s). Dollars: estimated (%s)." % (u["measured"], u["estimated"])]
    if u["unpricedModels"]:
        lines.append("No price configured for: %s (excluded from $)." % ", ".join(u["unpricedModels"]))
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--ticket")
    g.add_argument("--session")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    u = ticket_usage(a.ticket) if a.ticket else session_usage(a.session)
    print(json.dumps(u, indent=2) if a.json else table(u))


if __name__ == "__main__":
    main()
