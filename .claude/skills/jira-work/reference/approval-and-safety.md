# Approval policy and external-action safety

## Ask the Product Owner (stop that branch of work, continue independent work)
- Changing an approved design direction (visual language, structure of approved pages, new colours/fonts,
  removing approved sections) - the ticket asking for a change *is* approval of that change, not of how far to
  take it; anything beyond the ticket's words is a question.
- Changing or adding business requirements; proposed ACs (ticket had none or incomplete ones).
- Choosing between materially different behaviours the ticket does not settle.
- Any business fact not in the allowed sources: prices, hours, contact data, claims, legal text, people.
- Pricing or commercial terms; new paid services, third-party scripts, trackers, external form backends.
- Destructive operations (deleting files/pages/branches, discarding changes, history rewrites).
- Security-sensitive changes (file uploads, personal data handling, auth, CSP, new origins).
- Anything outward-facing: push, PR, merge to a shared branch, deploy, publish (incl. Artifacts), Jira or
  Confluence writes, emails/messages.
- Accepting a required gate that is not PASS.
- Continuing past a resource **approval** checkpoint (`resources.perTicket.approval` in the profile): say what is
  done, what remains, why more is needed, and the alternatives.

## Decide yourself (log it, do not ask)
Implementation details, refactors inside the ticket's scope, fixing defects, re-running tests, matching the
approved design, choosing among installed skills, ordering tasks, choosing ports/viewports/test data.

## How to ask
One AskUserQuestion with up to 4 questions; each has 2-4 concrete options, your recommendation first and
labelled, and one line on the consequence. Record each as `approvals` Q-n (status pending → approved/rejected,
`answer`). In a non-interactive run, leave them pending, set stage `awaiting-approval` for that ticket, and list
them in the final message.

## External actions after approval
Approval covers exactly the action asked about ("push WEB-25 to main", "move WEB-25 to In Review"), once. The
guard hook will still show a permission prompt; that prompt is the final confirmation. Typical follow-ups
the user may request after review:
- **Commit**: on the user's request, commit only the ticket's files (`state.filesChanged`), message
  `<KEY>: <summary>`.
- **Deploy**: per the profile's `deploy.target` (here: push `main`), then verify the live URL.
- **Jira**: comment with the handoff summary and/or transition - only the operation the user named.

## Guard hook (`.claude/hooks/guard.py`, PreToolUse)
| Situation | Decision |
|---|---|
| Bash: git push / reset --hard / clean -f / branch -D / checkout -- or . / restore / stash drop / merge / rebase / worktree remove --force | ask |
| Bash: gh write actions, gh api POST/PUT/PATCH/DELETE, vercel, netlify/firebase/wrangler/surge deploy, npm publish, docker push, terraform/kubectl apply, scp/sftp/rsync to host, curl writes to non-localhost, sendmail | ask |
| Any MCP tool whose action is a write verb (create/edit/update/add/transition/delete/comment/publish/send/upload/…) | ask |
| Subagent: git commit/push/merge/rebase/reset/checkout/restore/stash/… | deny |
| Subagent: Artifact publish/delete | ask |
| Read-only specialist: Edit/Write outside `.jira-work/` or the scratchpad | deny |
"ask" in a non-interactive run (`claude -p`) or a background agent cannot be answered → the call is blocked.
Project-specific extra Bash patterns: `safety.extraAskBashPatterns` in the profile. Every ask/deny is logged to
`.jira-work/guard-log.jsonl` (time, session, agent, tool, command); `wf.py report` lists the events of a ticket's
sessions under "External actions".
Unit tests: `python3 .claude/skills/jira-work/tests/test_guard.py`.

Limits: the hook sees one tool call at a time; a determined script could still reach the network (e.g. a node
script). The policy forbids it; reviewers and the verifier check for it.
