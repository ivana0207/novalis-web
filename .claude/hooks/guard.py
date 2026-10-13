#!/usr/bin/env python3
"""PreToolUse guard for the jira-work system (project-agnostic).

- External / publishing / irreversible actions -> "ask" (the Product Owner approves each one;
  in non-interactive runs and background subagents an "ask" cannot be answered, so the call is blocked).
- Read-only specialist agents writing outside the ticket work dir -> "deny".
- Any subagent committing or rewriting git history -> "deny" (the orchestrator owns git).
Everything else -> no decision (normal permission flow).

Extra patterns can be added per project in .claude/workflow/project.json -> safety.extraAskBashPatterns.
"""
import datetime
import json
import os
import re
import sys

READ_ONLY_AGENTS = {
    "jira-requirements-analyst", "ux-ui-designer", "content-brand-specialist", "seo-specialist",
    "functional-qa", "visual-a11y-qa", "code-security-reviewer", "delivery-verifier",
}

# A program in command position: start of the command or after ; & | ( ` or a wrapper such as `sudo`/`env X=1`,
# so `cat vercel.json` or `grep "git push" notes.md` do not trigger, while `cd x && git -C y push` does.
CMD = r"(?:^|[;&|(`]\s*|\b(?:then|do|else|exec|sudo|env|xargs|nohup|time|command)\s+)(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)*"
# `git [-C dir] [-c k=v] [--flags] <subcommand>`: match the subcommand, not words in later arguments
# (so `git log --grep=push` and `git merge-base` are fine).
GIT = CMD + r"git(?:\s+(?:-[cC]\s+\S+|--?[\w-]+(?:=\S+)?))*\s+"
# (regex, label). Applied to the whole command string, so compound commands are caught.
ASK_BASH = [
    (GIT + r"push\b", "git push (publishes commits to a remote)"),
    (GIT + r"reset\b[^\n;&|]*--hard", "git reset --hard (discards work)"),
    (GIT + r"clean\b[^\n;&|]*\s-[a-zA-Z]*f", "git clean -f (deletes untracked files)"),
    (GIT + r"branch\b[^\n;&|]*\s(-D|--delete\s+--force|-d\s+-f|-f\s+-d)(\s|$)", "git branch -D (deletes a branch)"),
    (GIT + r"checkout\b[^\n;&|]*\s(--|\.)(\s|$)", "git checkout -- / . (discards changes)"),
    (GIT + r"restore\b(?![^\n;&|]*--staged)", "git restore (discards working-tree changes)"),
    (GIT + r"stash\s+(drop|clear)\b", "git stash drop/clear (deletes stashed work)"),
    (GIT + r"(merge|rebase)(?=\s|$)", "git merge/rebase (changes branch history)"),
    (GIT + r"worktree\s+remove\b[^\n;&|]*--force", "git worktree remove --force (discards work)"),
    (CMD + r"gh\s+(pr|release|repo|issue|gist|workflow|secret|variable)\s+(create|merge|edit|close|comment|review|"
     r"delete|run|set|upload|ready|reopen|archive|rename|fork)\b", "GitHub CLI write action"),
    (CMD + r"gh\s+api\b[^\n;&|]*(-X|--method)\s*(POST|PUT|PATCH|DELETE)", "GitHub API write"),
    (CMD + r"(npx\s+|pnpm\s+dlx\s+)?vercel(\s|$)", "Vercel CLI (deploy / project change)"),
    (CMD + r"(npx\s+)?netlify\b[^\n;&|]*\bdeploy\b", "Netlify deploy"),
    (CMD + r"(npx\s+)?(firebase|wrangler|surge)\b[^\n;&|]*\b(deploy|publish)\b", "hosting deploy"),
    (CMD + r"(npm|pnpm|yarn)\s+publish\b", "package publish"),
    (CMD + r"docker\s+push\b", "container push"),
    (CMD + r"(terraform\s+(apply|destroy)|kubectl\s+(apply|delete|rollout))\b", "infrastructure change"),
    (CMD + r"(scp|sftp)\s|" + CMD + r"rsync\b[^\n;&|]*\s[\w.@-]+:\S*", "remote file copy"),
    (CMD + r"curl\b(?![^\n;&|]*(localhost|127\.0\.0\.1|\[::1\]))[^\n;&|]*"
     r"(-X\s*(POST|PUT|PATCH|DELETE)|--data|\s-d\s|\s-F\s|--form|--upload-file|\s-T\s)", "HTTP write to a remote server"),
    (CMD + r"(sendmail|mailx?)\s", "sending email"),
]

# MCP tools: any write-like verb after the server prefix asks first (Jira, Confluence, Canva, Docs, Slack ...).
MCP_WRITE = re.compile(
    r"^mcp__[^_].*?__(add|create|edit|update|transition|delete|remove|move|publish|send|post|upload|merge|"
    r"comment|reply|resolve|assign|copy|import|generate|resize|export|share|invite|set|write|batch|separate)", re.I)

SUBAGENT_GIT_DENY = re.compile(GIT + r"(commit|push|merge|rebase|reset|cherry-pick|revert|tag|am|"
                               r"stash(?!\s+(list|show)\b)|checkout|restore|switch|branch\s+-[dDmM])(?=\s|$)")

CTX = {}


def audit(kind, reason):
    """Append every ask/deny to .jira-work/guard-log.jsonl - the audit trail the delivery verifier reads."""
    try:
        log = os.environ.get("JIRA_WORK_GUARD_LOG") or os.path.join(CTX.get("root", "."), ".jira-work", "guard-log.jsonl")
        os.makedirs(os.path.dirname(log), exist_ok=True)
        inp = CTX.get("input") or {}
        what = inp.get("command") or inp.get("file_path") or inp.get("issueIdOrKey") or inp.get("action") or ""
        with open(log, "a", encoding="utf-8") as f:
            f.write(json.dumps({"at": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
                                "decision": kind, "tool": CTX.get("tool"), "agent": CTX.get("agent") or "main",
                                "session": CTX.get("session"), "what": str(what)[:300], "reason": reason},
                               ensure_ascii=False) + "\n")
    except OSError:
        pass


def decision(kind, reason):
    audit(kind, reason)
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PreToolUse", "permissionDecision": kind,
        "permissionDecisionReason": "[jira-work guard] " + reason}}))
    sys.exit(0)


def extra_patterns(root):
    try:
        with open(os.path.join(root, ".claude", "workflow", "project.json"), encoding="utf-8") as f:
            return [(p, "project rule") for p in json.load(f).get("safety", {}).get("extraAskBashPatterns", [])]
    except (OSError, ValueError):
        return []


def allowed_write(path, data, root):
    p = os.path.realpath(os.path.join(data.get("cwd") or root, path))
    ok = [os.path.realpath(os.path.join(root, ".jira-work")) + os.sep,
          os.path.realpath("/tmp") + os.sep, os.path.realpath("/private/tmp") + os.sep]
    if data.get("scratchpad_dir"):
        ok.append(os.path.realpath(data["scratchpad_dir"]) + os.sep)
    return any(p.startswith(o) for o in ok)


def main():
    try:
        data = json.load(sys.stdin)
    except ValueError:
        sys.exit(0)
    tool = data.get("tool_name", "")
    inp = data.get("tool_input") or {}
    agent = data.get("agent_type") or ""
    root = os.environ.get("CLAUDE_PROJECT_DIR") or data.get("cwd") or os.getcwd()
    CTX.update(root=root, tool=tool, agent=agent, input=inp, session=data.get("session_id"))

    if tool == "Bash":
        cmd = inp.get("command", "")
        if agent and SUBAGENT_GIT_DENY.search(cmd):
            decision("deny", "subagent %r may not commit or rewrite git history; report back to the orchestrator" % agent)
        for pat, label in ASK_BASH + extra_patterns(root):
            if re.search(pat, cmd):
                decision("ask", "%s needs the Product Owner's explicit approval (local-only delivery policy)" % label)
        sys.exit(0)

    if tool.startswith("mcp__") and MCP_WRITE.search(tool):
        decision("ask", "%s writes to an external system; Jira and other remotes are read-only unless the "
                        "Product Owner approves this specific operation" % tool)

    if tool == "Artifact" and agent and (inp.get("action") or "publish") in ("publish", "delete", "pin", "unpin"):
        decision("ask", "subagent %r tried to publish/change an Artifact; publishing needs approval" % agent)

    if tool in ("Edit", "Write", "NotebookEdit", "MultiEdit") and agent in READ_ONLY_AGENTS:
        path = inp.get("file_path") or inp.get("notebook_path") or ""
        if not allowed_write(path, data, root):
            decision("deny", "%s is a read-only role; it may write only under .jira-work/<KEY>/ or the scratchpad, "
                             "not %s. Report the change as a finding for frontend-developer." % (agent, path))
    sys.exit(0)


if __name__ == "__main__":
    main()
