#!/usr/bin/env python3
"""Unit tests for .claude/hooks/guard.py: feeds PreToolUse payloads, checks the decision. Run from anywhere."""
import json
import os
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
GUARD = os.path.join(ROOT, ".claude", "hooks", "guard.py")
LOG = os.path.join(tempfile.mkdtemp(prefix="guard-test-"), "guard-log.jsonl")  # keep the real audit log clean


def run(tool, inp, agent=None, cwd=ROOT):
    payload = {"hook_event_name": "PreToolUse", "tool_name": tool, "tool_input": inp, "cwd": cwd,
               "scratchpad_dir": "/private/tmp/claude-501/x/scratchpad"}
    if agent:
        payload.update(agent_id="a1", agent_type=agent)
    env = dict(os.environ, CLAUDE_PROJECT_DIR=ROOT, JIRA_WORK_GUARD_LOG=LOG)
    r = subprocess.run([sys.executable, GUARD], input=json.dumps(payload), capture_output=True, text=True, env=env)
    assert r.returncode == 0, r.stderr
    if not r.stdout.strip():
        return None
    return json.loads(r.stdout)["hookSpecificOutput"]["permissionDecision"]


def bash(cmd, agent=None):
    return run("Bash", {"command": cmd}, agent)


class ExternalActions(unittest.TestCase):
    def test_ask(self):
        for cmd in ["git push", "git push origin main", "cd /x && git -C /y push --force", "git -c a=b push",
                    "FOO=1 git push", "git reset --hard HEAD~1", "git clean -fd", "git branch -D feature",
                    "git checkout -- index.html", "git checkout .", "git restore css/styles.css", "git stash drop",
                    "git merge feature", "git rebase main", "git worktree remove --force .claude/worktrees/a",
                    "gh pr create --fill", "gh pr merge 3", "gh release create v1", "gh api -X POST repos/x/y/issues",
                    "vercel --prod", "npx vercel deploy", "netlify deploy --prod", "npm publish",
                    "curl -X POST https://api.example.com/x", "curl -d a=b https://example.com",
                    "rsync -a dist/ user@host:/var/www", "scp f host:/tmp", "(cd x; git push)",
                    "echo hi; vercel"]:
            with self.subTest(cmd=cmd):
                self.assertEqual(bash(cmd), "ask")

    def test_no_decision(self):
        for cmd in ["git status", "git diff -- js/site.js", "git log --oneline -5", "git log --grep=push",
                    "git merge-base HEAD origin/main", "git restore --staged x", "git worktree list",
                    "cat vercel.json", "grep -n \"git push\" CLAUDE.md", "python3 -m http.server 8642",
                    "curl -s http://127.0.0.1:8642/", "curl -X POST http://localhost:3000/api",
                    "node .claude/workflow/smoke.js", "gh pr list", "gh api repos/x/y",
                    "echo 'see email me'", "git checkout -b ticket/WEB-25"]:
            with self.subTest(cmd=cmd):
                self.assertIsNone(bash(cmd))


class Subagents(unittest.TestCase):
    def test_subagent_git_denied(self):
        for cmd in ["git commit -m x", "git add . && git commit -m x", "git stash", "git checkout main",
                    "git -C /wt reset HEAD"]:
            with self.subTest(cmd=cmd):
                self.assertEqual(bash(cmd, agent="frontend-developer"), "deny")

    def test_subagent_read_git_ok(self):
        self.assertIsNone(bash("git diff --stat", agent="code-security-reviewer"))
        self.assertIsNone(bash("git status --porcelain", agent="functional-qa"))
        self.assertIsNone(bash("git -C /x stash list", agent="functional-qa"))
        self.assertIsNone(bash("git stash show -p", agent="code-security-reviewer"))

    def test_main_session_commit_not_blocked(self):
        self.assertIsNone(bash("git commit -m 'WEB-25: header'"))

    def test_read_only_write_scope(self):
        self.assertEqual(run("Write", {"file_path": os.path.join(ROOT, "index.html")}, "functional-qa"), "deny")
        self.assertEqual(run("Edit", {"file_path": "js/site.js"}, "code-security-reviewer"), "deny")
        self.assertEqual(run("Write", {"file_path": os.path.join(ROOT, ".claude/agents/x.md")}, "ux-ui-designer"), "deny")
        self.assertIsNone(run("Write", {"file_path": os.path.join(ROOT, ".jira-work/WEB-1/reports/01-x.md")}, "functional-qa"))
        self.assertIsNone(run("Write", {"file_path": "/private/tmp/claude-501/x/scratchpad/t.js"}, "visual-a11y-qa"))
        self.assertIsNone(run("Write", {"file_path": os.path.join(ROOT, ".jira-work/../.jira-work/WEB-1/spec.md")}, "jira-requirements-analyst"))
        self.assertEqual(run("Write", {"file_path": os.path.join(ROOT, ".jira-work/../index.html")}, "seo-specialist"), "deny")

    def test_developer_and_main_may_edit_app(self):
        self.assertIsNone(run("Edit", {"file_path": os.path.join(ROOT, "js/site.js")}, "frontend-developer"))
        self.assertIsNone(run("Edit", {"file_path": os.path.join(ROOT, "js/site.js")}))

    def test_artifact_publish_by_subagent(self):
        self.assertEqual(run("Artifact", {"action": "publish", "file_path": "x.html"}, "ux-ui-designer"), "ask")
        self.assertIsNone(run("Artifact", {"action": "read", "url": "https://claude.ai/artifact/x"}, "ux-ui-designer"))
        self.assertIsNone(run("Artifact", {"action": "publish", "file_path": "x.html"}))


class Mcp(unittest.TestCase):
    def test_jira_writes_ask(self):
        for t in ["addCommentToJiraIssue", "editJiraIssue", "transitionJiraIssue", "createJiraIssue",
                  "addWorklogToJiraIssue", "createIssueLink", "updateConfluencePage", "createConfluencePage"]:
            with self.subTest(tool=t):
                self.assertEqual(run("mcp__plugin_design_atlassian__" + t, {}), "ask")
                self.assertEqual(run("mcp__plugin_design_atlassian__" + t, {}, "jira-requirements-analyst"), "ask")

    def test_jira_reads_pass(self):
        for t in ["getJiraIssue", "searchJiraIssuesUsingJql", "getJiraIssueRemoteIssueLinks", "fetch",
                  "getAccessibleAtlassianResources", "atlassianUserInfo", "getTransitionsForJiraIssue",
                  "lookupJiraAccountId", "getConfluencePage", "search"]:
            with self.subTest(tool=t):
                self.assertIsNone(run("mcp__plugin_design_atlassian__" + t, {}))

    def test_other_mcp_writes(self):
        self.assertEqual(run("mcp__claude_ai_Canva__generate-design", {}), "ask")
        self.assertEqual(run("mcp__claude_ai_Claude_Docs__batch", {}), "ask")
        self.assertEqual(run("mcp__plugin_marketing_slack__send_message", {}), "ask")
        self.assertIsNone(run("mcp__claude_ai_Canva__search-designs", {}))
        self.assertIsNone(run("mcp__claude_ai_Claude_Docs__read", {}))


class Audit(unittest.TestCase):
    def test_decisions_are_logged(self):
        bash("git push origin main")
        run("Write", {"file_path": os.path.join(ROOT, "index.html")}, "seo-specialist")
        bash("git status")
        with open(LOG) as f:
            rows = [json.loads(l) for l in f]
        self.assertTrue(any(r["decision"] == "ask" and r["what"] == "git push origin main" and r["agent"] == "main" for r in rows))
        self.assertTrue(any(r["decision"] == "deny" and r["agent"] == "seo-specialist" for r in rows))
        self.assertFalse(any(r["what"] == "git status" for r in rows))


if __name__ == "__main__":
    unittest.main(verbosity=1)
