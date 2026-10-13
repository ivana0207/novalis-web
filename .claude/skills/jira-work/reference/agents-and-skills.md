# Skill selection

Agent selection, planning depth and model routing are in `assessment.md`. This file covers **skills**: what each
contributes, which ones overlap, and which ones are complementary. Invoke a skill when its output adds something
the task needs. Do not invoke a skill just because it is installed or because it was used last time.
"Checklist" means: read and apply its method without running its interactive, saving or committing workflow.
Each skill invocation loads the whole SKILL.md (often 100-500 lines) into the agent's context, so the cost is real.
Skip a skill when the agent's instructions already cover the method.

Verified 2026-10-10 on Claude Code 2.1.295 by reading each SKILL.md on disk, and in a live dry run (WEB-25).
There the analyst invoked `brainstorming` and `writing-plans`, and the designer invoked `playwright-skill`,
`design-superpowers:design`, `design-skills:interaction-design` and `design:design-handoff` and read the design-system
artifacts.

## By purpose

| Purpose | Skill | Adds | Use when | Overlaps with / instead of |
|---|---|---|---|---|
| Expose hidden requirements | `brainstorming` (checklist) | question patterns for unclear goals | requirement uncertainty is high | not for clear tickets; never its interactive loop or committed spec |
| Implementation plan | `writing-plans` (checklist) | task decomposition for multi-step builds | the build has several components or ordering risks (orchestrator/developer) | not for requirements analysis; plan lives in the work dir |
| Research inputs | `design:research-synthesis` | themes from interviews/feedback | the ticket carries research data | - |
| Compose UI from a system | `design-superpowers:design` | DS-based composition, L1 mode (tokens + brand guide) | design complexity "extends" | complementary to interaction-design (structure vs behaviour) |
| States and behaviour | `design-skills:interaction-design` | states, transitions, error prevention | new interactive behaviour | - |
| New component/token | `design-skills:design-systems` | naming, token, component spec discipline | a genuinely new component or token is needed | - |
| Developer handoff | `design:design-handoff` | spec structure (layout, tokens, states, breakpoints) | the design spec is large | small specs: agent template is enough |
| New visual surface | `frontend-design:frontend-design`, `high-end-visual-design` | composition and typography quality | original design inside the system | never to restyle approved components |
| Microcopy | `design-skills:ux-writing` **or** `design:ux-copy` | labels, CTAs, errors, empty states | new interface text | redundant with each other: pick one (ux-writing is more thorough; ux-copy is lighter) |
| Brand compliance | `marketing:brand-review` | voice/terminology/claims review against the brand guide | copy review | complementary to ux-writing (brand vs usability) |
| Longer marketing copy | `marketing:content-creation` / `marketing:draft-content` | section/page drafts with SEO notes | a new page or long section | redundant with each other: pick one |
| TDD discipline | `test-driven-development` | test-first loop | logic changes where a check can fail first | - |
| Root cause | `systematic-debugging` | evidence → hypothesis → test loop | any unexpected failure; any reopened defect | mandatory before a second attempt at the same defect |
| Plan execution | `executing-plans` (checklist) | step tracking | a written multi-step plan exists | - |
| No elisions | `full-output-enforcement` | bans placeholder code | large file writes | - |
| Browser automation | `playwright-skill` | executor, helpers, screenshots | any browser evidence | the project smoke test covers baseline checks; write scripts only for AC-specific checks |
| WCAG method | `design-skills:accessibility-audit` | WCAG 2.2 AA method and severities | rendered/markup changes | `design:accessibility-review` targets 2.1, so it is a second choice. Do not run both |
| Interface guidelines | `web-design-guidelines` | current Vercel Web Interface Guidelines (fetched) | new or substantially changed UI | complementary to the WCAG audit (craft vs conformance) |
| Visual/heuristic review | `design-superpowers:design-review` | DS compliance + heuristic + visual-quality lenses from screenshots | visible UI changes with a design reference | complementary to the a11y audit; for tiny changes the agent's own checklist is enough |
| Code review | `requesting-code-review` (its `code-reviewer.md` checklist) | structured review | any code change | `simplify` (checklist) only for larger diffs; report, do not apply |
| Security | `security-review` | security checklist for pending changes | security surface touched | - |
| SEO | `marketing:seo-audit` (technical + on-page parts) | audit structure | head/URL/link/structured-data changes | keyword/competitor parts need Ahrefs/Similarweb (not authorised) → "needs live data" |
| Competitor research | `marketing:competitive-brief` | positioning comparison | only when a ticket asks for it | - |
| Before "done" | `verification-before-completion` | evidence-before-claims check | every QA/verifier report, and the orchestrator before "ready" | - |
| Parallel waves | `dispatching-parallel-agents` (checklist) | independence check | the first time a session runs a parallel wave | - |
| Worktrees | `using-git-worktrees` (checklist) | isolation steps | parallel builds of disjoint tickets | - |

## Installed but excluded by default
| Skill | Reason |
|---|---|
| `design-taste-frontend` (v1/v2), `gpt-taste`, `redesign-existing-projects`, `minimalist-ui`, `industrial-brutalist-ui`, `stitch-design-taste` | Impose their own visual language. v2 must use any image generator present (the Canva MCP is), so it risks invented imagery of a real business. Use only when the PO asks for a redesign or exploration |
| `image-to-code`, `imagegen-frontend-web/-mobile`, `brandkit` | Generate imagery (written for Codex/image tools); exploration only |
| `design-superpowers:creative/ds-make/ds-manage/ds-producer/ds-consumer/map-design/figma-setup` | Design-system authoring or Figma (PluginOS not installed); only for tickets about the system itself |
| `design-skills:design-critique`, `design:design-critique`, `design-skills:design-elevation` | Second opinions; use only when a design is contested |
| `design-skills:ux-research/journey-mapping/ux-strategy/design-ops`, `design:user-research` | Research/strategy tickets only |
| `marketing:campaign-plan/email-sequence/performance-report` | Not website delivery; need analytics connectors |
| `anthropic-skills:chrome-browser/built-in-browser/computer-use` | Their browser/computer tools are not connected here; Playwright covers QA |
| `subagent-driven-development` | Its loop commits per task; the orchestrator implements the same idea without commits |
| `finishing-a-development-branch` | Merges/pushes/PRs: only after the user explicitly asks to integrate |
| `loop`, `schedule` | Recurring/cloud runs are not authorised for this workflow |
