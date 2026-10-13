#!/usr/bin/env python3
"""Synthetic-ticket fixture for wf.py and usage.py, run in a throwaway git repo (never the real project state).

Covers: init/baseline/sessions, plan import, AC ingest from the analyst report, contract validation, invocation
records and redundancy detection, de-duplication, decisions, independent-verification rule, NO PROGRESS / NO CHANGE
detection, resource checkpoints (WARN / APPROVAL REQUIRED / allowance), stale evidence, readiness, generated report,
decision log, resume, status, and token accounting from synthetic transcripts.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
WF = os.environ.get("WF_UNDER_TEST") or os.path.join(HERE, "..", "scripts", "wf.py")
USAGE = os.path.join(HERE, "..", "scripts", "usage.py")
KEY = "TEST-1"
SID = "11111111-2222-3333-4444-555555555555"


def report(agent, task, tests=(), findings=(), decisions=(), files=(), status="complete", **extra):
    r = {"ticket": KEY, "agent": agent, "task": task, "status": status, "summary": "fixture",
         "requirementsAddressed": ["AC-1"], "filesInspected": [], "filesChanged": list(files),
         "skillsUsed": ["playwright-skill"], "toolsUsed": ["Bash"], "evidence": [], "tests": list(tests),
         "findings": list(findings), "blockers": [], "needsHumanDecision": list(decisions),
         "nextAction": "", "report": ".jira-work/%s/reports/x.md" % KEY}
    r.update(extra)
    return r


class Lifecycle(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.repo = tempfile.mkdtemp(prefix="wf-fixture-")
        cls.tx = tempfile.mkdtemp(prefix="wf-transcripts-")
        g = lambda *a: subprocess.run(["git"] + list(a), cwd=cls.repo, check=True, capture_output=True)
        g("init", "-q", "-b", "main")
        g("config", "user.email", "t@example.com"); g("config", "user.name", "t")
        os.makedirs(os.path.join(cls.repo, ".claude", "workflow"))
        cls.write_profile(warn={"agentInvocations": 3}, approval={"agentInvocations": 5})
        for name in ("app.js", "style.css", "notes.txt"):
            with open(os.path.join(cls.repo, name), "w") as f:
                f.write("v1\n")
        g("add", "."); g("commit", "-qm", "init")
        with open(os.path.join(cls.repo, "notes.txt"), "a") as f:   # pre-existing uncommitted change
            f.write("user edit\n")

    @classmethod
    def write_profile(cls, warn, approval):
        with open(os.path.join(cls.repo, ".claude", "workflow", "project.json"), "w") as f:
            json.dump({"name": "fixture", "commands": {"preview": "python3 -m http.server <port>"},
                       "resources": {"perTicket": {"warn": warn, "approval": approval},
                                     "noProgress": {"sameFailureRepeats": 2, "sameDefectAttemptsWarn": 3}},
                       "pricing": {"source": "test", "asOf": "test",
                                   "models": {"claude-opus-5-5": {"input": 4.0, "output": 20.0, "cacheRead": 0.20},
                                              "claude-sonnet-5": {"input": 2.0, "output": 10.0, "cacheRead": 0.20}}}}, f)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.repo, ignore_errors=True)
        shutil.rmtree(cls.tx, ignore_errors=True)

    def env(self, session=SID):
        return dict(os.environ, CLAUDE_PROJECT_DIR=self.repo, CLAUDE_TRANSCRIPTS_DIR=self.tx, CLAUDE_CODE_SESSION_ID=session)

    def wf(self, *args, ok=True):
        r = subprocess.run([sys.executable, WF] + list(args), cwd=self.repo, capture_output=True, text=True, env=self.env())
        if ok is True:
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        elif ok is False:
            self.assertNotEqual(r.returncode, 0, r.stdout + r.stderr)
        elif isinstance(ok, int) and not isinstance(ok, bool):
            self.assertEqual(r.returncode, ok, r.stdout + r.stderr)
        return r.stdout + r.stderr

    def put(self, name, obj):
        p = os.path.join(self.repo, ".jira-work", KEY, "reports", name)
        with open(p, "w") as f:
            json.dump(obj, f)
        return p

    def ingest(self, rep, name):
        return self.wf("ingest", KEY, self.put(name, rep))

    def state(self):
        with open(os.path.join(self.repo, ".jira-work", KEY, "state.json")) as f:
            return json.load(f)

    def touch(self, name, text):
        with open(os.path.join(self.repo, name), "w") as f:
            f.write(text)

    def transcripts(self):
        """A main session with one request written as 3 lines (deduplicated) and one subagent for TEST-1."""
        st = self.state()
        t0 = st["sessions"][0]["from"]
        main = os.path.join(self.tx, SID + ".jsonl")
        u = {"input_tokens": 10, "output_tokens": 1000, "cache_read_input_tokens": 100000,
             "cache_creation_input_tokens": 2000, "cache_creation": {"ephemeral_1h_input_tokens": 2000, "ephemeral_5m_input_tokens": 0}}
        with open(main, "w") as f:
            for _ in range(3):
                f.write(json.dumps({"type": "assistant", "requestId": "req-1", "timestamp": t0,
                                    "message": {"model": "claude-opus-5-5", "usage": u}}) + "\n")
        os.makedirs(os.path.join(self.tx, SID, "subagents"))
        sub = os.path.join(self.tx, SID, "subagents", "agent-abc.jsonl")
        with open(sub, "w") as f:
            f.write(json.dumps({"type": "user", "message": {"content": "Ticket TEST-1 · Task T-2 · Role functional-qa"}}) + "\n")
            f.write(json.dumps({"type": "assistant", "requestId": "r-a", "timestamp": t0,
                                "message": {"model": "claude-sonnet-5", "usage": {"input_tokens": 0, "output_tokens": 2000,
                                            "cache_read_input_tokens": 50000, "cache_creation_input_tokens": 1000,
                                            "cache_creation": {"ephemeral_5m_input_tokens": 1000, "ephemeral_1h_input_tokens": 0}}}}) + "\n")
        with open(sub[:-6] + ".meta.json", "w") as f:
            json.dump({"agentType": "functional-qa", "description": "QA TEST-1"}, f)

    def test_lifecycle(self):
        # intake: baseline + session window
        self.assertIn("INIT", self.wf("init", KEY, "--summary", "Header categories", "--session", SID))
        self.assertIn("EXISTS", self.wf("init", KEY))
        st = self.state()
        self.assertEqual([b["path"] for b in st["baselineDirty"]], ["notes.txt"])
        self.assertEqual([s["id"] for s in st["sessions"]], [SID])
        # another Claude Code session touching the ticket gets its own usage window; the first one does not grow
        r = subprocess.run([sys.executable, WF, "log", KEY, "other session"], cwd=self.repo, capture_output=True,
                           text=True, env=self.env(session="other-session"))
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual([s["id"] for s in self.state()["sessions"]], [SID, "other-session"])
        self.wf("log", KEY, "back in the first session")
        self.assertEqual([s["id"] for s in self.state()["sessions"]], [SID, "other-session", SID])
        self.wf("set", KEY, "stage", "nonsense", ok=False)

        # analyst report carries the ACs (no per-AC calls); contract validation
        bad = report("jira-requirements-analyst", "T-0"); del bad["tests"]
        self.assertIn("missing keys: tests", self.wf("ingest", KEY, self.put("bad.json", bad), ok=False))
        out = self.ingest(report("jira-requirements-analyst", "T-0", acceptanceCriteria=[
            {"id": "AC-1", "text": "Categories shown in header", "source": "jira"},
            {"id": "AC-2", "text": "Works at 390px", "source": "proposed"}],
            assessment={"scope": {"rating": "high", "why": "shared header"}},
            decisions=[{"question": "Confirm AC-2?", "options": ["yes", "no"], "recommendation": "yes", "blocking": True}]),
            "01-jira-requirements-analyst.json")
        self.assertIn("AC AC-1 [jira]", out)
        self.assertIn("DECISION Q-1 (blocking)", out)
        self.assertEqual(self.state()["analysis"]["assessmentProposal"]["scope"]["rating"], "high")
        self.assertIn("AC CHANGED AC-2", self.ingest(report("jira-requirements-analyst", "T-0", acceptanceCriteria=[
            {"id": "AC-2", "text": "Works at 390px and 320px", "source": "proposed"}]), "01b.json"))

        # plan import in one call, plan.md rendered
        plan = {"assessment": {"scope": {"rating": "medium", "why": "two files"}},
                "strategy": {"summary": "Build then verify", "sequencing": "sequential"},
                "gates": {"functional": {"required": True, "why": "behaviour"}, "code": {"required": True, "why": "JS"},
                          "seo": {"na": True, "why": "no head changes"}},
                "tasks": [{"id": "T-1", "agent": "frontend-developer", "model": "inherit", "purpose": "build", "evidence": "diff"},
                          {"id": "T-2", "agent": "functional-qa", "model": "sonnet", "purpose": "verify", "dependsOn": ["T-1"]}]}
        pp = os.path.join(self.repo, ".jira-work", KEY, "plan.json")
        with open(pp, "w") as f:
            json.dump(plan, f)
        self.assertIn("2 tasks", self.wf("plan", KEY, pp))
        self.assertEqual(self.state()["gates"]["seo"]["status"], "NOT APPLICABLE")
        with open(os.path.join(self.repo, ".jira-work", KEY, "plan.md")) as f:
            self.assertIn("| T-2 | functional-qa | sonnet |", f.read())
        self.assertIn('"rating": "medium"', self.wf("show", KEY, "assessment.scope"))

        # invocation records; developer builds
        out = self.wf("invoke", KEY, "frontend-developer", "--task", "T-1", "--mode", "implement", "--no-usage")
        self.assertIn("REPORT .jira-work/TEST-1/reports/", out)
        self.assertIn("CHECKPOINT TEST-1 OK", out)
        self.touch("app.js", "v2\n")
        self.ingest(report("frontend-developer", "T-1", files=["app.js"]), "02-frontend-developer.json")
        self.assertEqual(json.loads(self.wf("files", KEY))["changed"], ["app.js"])
        self.assertEqual(self.state()["invocations"][0]["status"], "done")

        # QA finds a defect (twice -> one defect)
        f1 = {"id": "F-1", "severity": "high", "gate": "functional", "title": "Menu overlaps logo at 390px",
              "detail": "logo hidden behind menu", "repro": "390px", "evidence": "evidence/a.png",
              "suggestedOwner": "frontend-developer", "relatedAC": "AC-2", "resolves": None}
        self.wf("invoke", KEY, "functional-qa", "--task", "T-2", "--mode", "full", "--model", "sonnet", "--no-usage")
        out = self.ingest(report("functional-qa", "T-2",
                                 tests=[{"id": "TC-1", "ac": "AC-1", "title": "visible", "result": "pass", "evidence": "e"},
                                        {"id": "TC-2", "ac": "AC-2", "title": "390", "result": "fail", "evidence": "e"}],
                                 findings=[f1, dict(f1, id="F-2")]), "03-functional-qa.json")
        self.assertIn("NEW D-1", out)
        self.assertIn("DUP D-1", out)
        # identical re-run with no file change is flagged as redundant (and not recorded)
        out = self.wf("invoke", KEY, "functional-qa", "--task", "T-2", "--mode", "full", "--no-usage")
        self.assertIn("REDUNDANT", out)
        self.assertEqual(len(self.state()["invocations"]), 2)
        self.assertIn("cannot PASS functional", self.wf("gate", KEY, "functional", "PASS", "--evidence", "r.md", ok=False))

        # fix round 1: claim, self-verification refused, identical failure -> NO PROGRESS; claim w/o change -> NO CHANGE
        self.assertIn("ROUND 1", self.wf("fix-round", KEY, "--no-usage"))
        self.touch("app.js", "v3\n")
        self.ingest(report("frontend-developer", "T-1", findings=[dict(f1, severity="info", resolves="D-1")]), "04-dev.json")
        self.assertEqual(self.state()["defects"][0]["status"], "fixed-unverified")
        self.assertIn("cannot verify its own fix",
                      self.wf("update", KEY, "defects", "D-1", "status=verified", "verifiedBy=frontend-developer", "evidence=x", ok=False))
        out = self.ingest(report("functional-qa", "T-2", findings=[dict(f1, resolves="D-1")]), "05-qa.json")
        self.assertIn("REOPENED D-1", out)
        self.assertIn("NO PROGRESS D-1", out)
        out = self.ingest(report("frontend-developer", "T-1", findings=[dict(f1, severity="info", resolves="D-1")]), "06-dev.json")
        self.assertIn("NO CHANGE D-1", out)

        # checkpoints: invocations 2 -> 3 hits WARN; 5 hits APPROVAL (exit 3); allowance lifts the approval line
        self.assertIn("WARN agentInvocations", self.wf("invoke", KEY, "frontend-developer", "--task", "T-1", "--mode", "fix D-1", "--no-usage"))
        self.wf("invoke", KEY, "functional-qa", "--task", "T-2", "--mode", "re-verify D-1", "--no-usage")
        out = self.wf("invoke", KEY, "code-security-reviewer", "--mode", "review", "--no-usage", ok=3)
        self.assertIn("APPROVAL REQUIRED", out)
        self.wf("set", KEY, "resourceAllowance", "2", "--json")
        self.assertNotIn("APPROVAL", self.wf("checkpoint", KEY, "--no-usage"))

        # real fix, independent verification closes it; gate PASS is fingerprinted
        self.touch("app.js", "v4\n")
        self.ingest(report("frontend-developer", "T-1", findings=[dict(f1, severity="info", resolves="D-1")]), "07-dev.json")
        self.ingest(report("functional-qa", "T-2",
                           tests=[{"id": "TC-2", "ac": "AC-2", "title": "390", "result": "pass", "evidence": "e2"}],
                           findings=[dict(f1, severity="info", resolves="D-1", evidence="evidence/b.png")]), "08-qa.json")
        d1 = self.state()["defects"][0]
        self.assertEqual((d1["status"], d1["verifiedBy"]), ("verified", "functional-qa"))
        self.wf("gate", KEY, "functional", "PASS", "--evidence", "reports/08-qa.json")
        self.wf("gate", KEY, "code", "pass", "--evidence", "reports/09-code.md")
        self.wf("gate", KEY, "visual", "maybe", ok=False)
        out = self.wf("stale", KEY)
        self.assertIn("CURRENT", out)                                   # gates set after the last change
        self.assertIn("STALE test TC-1 (advisory", out)                 # TC-1 passed before two fixes to app.js

        # a later change invalidates the evidence; ready refuses stale required gates
        self.wf("update", KEY, "approvals", "Q-1", "status=approved", "answer=yes")
        self.wf("update", KEY, "acceptanceCriteria", "AC-2", "confirmed=true")
        self.wf("update", KEY, "tasks", "T-1", "status=done")
        self.wf("update", KEY, "tasks", "T-2", "status=done")
        with open(os.path.join(self.repo, ".jira-work", KEY, "handoff.md"), "w") as f:
            f.write("# handoff\n")
        self.assertIn("READY FOR HUMAN REVIEW", self.wf("ready", KEY))
        self.touch("style.css", "v2\n")
        self.assertIn("STALE gate functional", self.wf("stale", KEY))
        self.assertIn("required gate functional is stale", self.wf("ready", KEY, ok=False))
        self.wf("gate", KEY, "functional", "PASS", "--evidence", "reports/10-qa.json")
        self.wf("gate", KEY, "code", "PASS", "--evidence", "reports/11-code.md")
        self.assertIn("READY FOR HUMAN REVIEW", self.wf("ready", KEY))

        # decision log, generated report, traceability, status, resume
        self.wf("decision", "add", "--ticket", KEY, "--source", "Q-1", "--text", "Header shows 4 categories")
        self.assertIn("Header shows 4 categories", self.wf("decision", "list"))
        out = self.wf("report", KEY)
        self.assertIn("READY FOR HUMAN REVIEW", out)
        with open(os.path.join(self.repo, ".jira-work", KEY, "qa-report.md")) as f:
            qa = f.read()
        self.assertIn("| AC-2 | Works at 390px and 320px | proposed (confirmed) | TC-2:pass | **pass** |", qa)
        self.assertIn("None attempted", qa)
        self.assertIn(KEY, self.wf("status"))
        res = json.loads(self.wf("resume", KEY))
        self.assertEqual(res["openDefects"], [])
        subprocess.run(["git", "add", "app.js"], cwd=self.repo, check=True)
        subprocess.run(["git", "commit", "-qm", "someone committed"], cwd=self.repo, check=True)
        res = json.loads(self.wf("resume", KEY))
        self.assertTrue(any("HEAD moved" in c for c in res["checks"]), res["checks"])

        # usage: request de-duplication, subagent attribution by brief, pricing by model and cache TTL
        self.transcripts()
        r = subprocess.run([sys.executable, USAGE, "--ticket", KEY, "--json"], cwd=self.repo, capture_output=True,
                           text=True, env=self.env())
        self.assertEqual(r.returncode, 0, r.stderr)
        u = json.loads(r.stdout)
        orch, qa_row = u["rows"][0], u["rows"][1]
        self.assertEqual(orch["requests"], 1)            # 3 transcript lines, one API request
        self.assertEqual(orch["output_tokens"], 1000)
        self.assertEqual(qa_row["label"], "functional-qa")
        # opus: 10*4 + 1000*20 + 100000*0.2 + 2000*4*2 (1h write) = 56040 -> $0.056 ; sonnet: 2000*10 + 50000*0.2 + 1000*2*1.25 = 32500 -> $0.0325
        self.assertAlmostEqual(orch["estCostUsd"], 0.06, places=2)
        self.assertAlmostEqual(qa_row["estCostUsd"], 0.03, places=2)
        self.assertEqual(u["total"]["agentInvocations"], 1)


if __name__ == "__main__":
    unittest.main(verbosity=1)
