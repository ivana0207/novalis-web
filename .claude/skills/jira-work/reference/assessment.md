# Work assessment and execution strategy

Assess each ticket (or each cluster of related tickets) on the dimensions below, from evidence: the spec, the code
the change touches, the project profile and the decision log. Write each rating with a one-line reason in
`plan.json`. The ratings are not a label that selects a pipeline. Each one has consequences, listed beside it, and
the strategy is the sum of those consequences. Two tickets with the same "size" can need very different teams.

| Dimension | Questions | Consequences |
|---|---|---|
| **Scope** | Which pages, components, data, files? Shared code (`stack.structure.shared`) or one page? | Workspace and ordering; regression breadth (shared → full smoke, all pages; isolated → targeted); which reviewers can be scoped to which files |
| **Technical complexity** | Straight edit of an existing pattern, or new state/interaction logic, integration, architecture, hard debugging? | Developer model and planning depth; code-review depth; whether the developer gets an implementation plan first |
| **Design complexity** | Fully determined by the design system/existing pattern, extends a pattern, or needs original design? | Determined → no designer; the developer follows the system and visual QA checks it. Extends → designer writes a focused spec. Original → designer, plus a PO-approved design (Design artifact) before the build |
| **Requirement uncertainty** | Are ACs present, complete, testable? Business decisions missing? Contradictions? | Analyst depth; decisions asked before any build; proposed ACs need confirmation; high uncertainty → do not plan implementation details yet |
| **Dependencies** | Other tickets, shared components, external services, unfinished work, content from the client? | Order; sequential vs parallel; blocked parts vs independent parts; which work can continue while waiting |
| **Risk** | Impact on existing behaviour, security/privacy, accessibility, SEO, performance, business/legal | Which independent verifications are needed and how deep; the gates that become required |
| **Verification effort** | What evidence proves each AC? Browser behaviour, visual comparison, keyboard/a11y, data checks, link checks, copy checks? | QA agents and their scope; viewports and browsers; whether one verifier can cover all ACs or separate specialists add evidence |
| **Reusability** | Existing components, tokens, test scripts, prior analysis/spec, decisions, verified evidence still valid? | What not to redo; what agents should read rather than rediscover; reuse of evidence only if `wf.py stale` says it is still current |

## From assessment to strategy

For every agent you include, write its **purpose** (what it contributes) and its **evidence** (what it must produce).
If you cannot name both, leave it out. If a gate needs evidence that no included agent produces, add one.

| Agent | Include when | Usually unnecessary when | Combine / reuse |
|---|---|---|---|
| jira-requirements-analyst | Always for retrieval and the spec. Depth follows requirement uncertainty | Never skip retrieval. A current spec exists and Jira `updated` is unchanged → refresh mode, not a new analysis | One analyst for a cluster of related tickets (same code area) avoids reading the same code twice |
| ux-ui-designer | Design complexity "extends" or "original"; interaction or state behaviour not determined | The design system or an existing component fully determines the result | Can take several tickets that touch the same UI region in one spec |
| content-brand-specialist | New or changed user-facing copy, facts, labels, metadata text, translations | Pure code/behaviour change with no new text | Write and review can be the same agent continued (SendMessage) when the copy is small |
| frontend-developer | Any application change | Research/test-only tickets (until fixes are approved) | One developer continued across fix rounds keeps context; overlapping tickets in one checkout are best done by the same developer in sequence |
| code-security-reviewer | Logic/JS changes, shared code, new dependencies/origins, forms, uploads, personal data, anything security-relevant | Pure content/data edits that change no behaviour, when functional QA and content review cover the risk | Review all tickets of an integrated batch in one pass over the combined diff |
| functional-qa | Behaviour or navigation changes; ACs that need browser evidence; negative cases matter | Trivial, well-specified changes where the delivery verifier's own AC re-run plus smoke is enough independent evidence (say so in the plan) | Re-verification by the same QA agent (continued) reuses its scripts |
| visual-a11y-qa | Rendered UI, layout, styles, focus/keyboard behaviour or contrast change | No rendered change | Covers visual and accessibility in one pass; it does not replace a design-system review the designer owes |
| seo-specialist | Head tags, URLs, headings, internal links, structured data, sitemap/robots/redirects, indexable copy | Changes that touch none of these | Batch SEO check after integration |
| delivery-verifier | Always, at the end. Depth is proportional to risk | Never skipped | One verifier per integrated batch, checking each ticket's ACs |

**Independence invariant:** every acceptance criterion is verified by an agent other than the one that implemented
it. A developer's own test run is evidence of effort, not of correctness. Do not merge implementation and
verification to save tokens.

**Planning depth:**
- Low uncertainty, determined design, isolated scope: `plan.json` with the assessment and a few tasks, nothing more.
- Several components, new interactions, or dependencies: add an implementation outline (files, order, risks) for
  the developer.
- High uncertainty: resolve the decisions first and plan the build afterwards. Do not write a detailed plan for
  requirements that may change.
Do not reconsider recorded decisions (`.jira-work/decisions.md`, approvals in state) without new information.

**Sequential or parallel:** run work in parallel only when it is independent. That means no shared files, no
output→input dependency, and no shared decision pending. Parallel runs do not reduce tokens; they reduce wall time
and add coordination (separate contexts, separate cache entries, integration). Prefer sequential when one agent's
output would let the next one do less, for example a spec before code or a fix before re-verification. Prefer
parallel for independent verifications of the same build.

## Model routing (per invocation; pass `model` on the Agent call)

Documented facts (claude-api skill, prices as of 2026-06-24, USD per million input/output tokens):
Opus 5.5 $4/$20 (the session model here). Sonnet 5 $2/$10 is described as "near-Opus quality on coding and agentic
work". Haiku 4.5 $1/$5 "fits high-volume work with checkable outputs, not long agentic loops". Fable 5.1 $10/$50 is
the most capable model. Caches are model-scoped: a resumed agent keeps its model and its cache.
Anthropic's own guidance is to judge cost per *completed* task. A cheaper run that needs a redo is not cheaper.

| Use | When |
|---|---|
| `inherit` (session model) | Judgment under uncertainty: analysis of unclear tickets, original design, non-trivial implementation, code/security review, root-cause debugging, verification of high-risk tickets. The default when unsure |
| `sonnet` | Well-specified work with checkable output: implementing an existing pattern from a precise spec, executing written test cases, re-verifying specific defects, SEO checks of small changes, verification of low-risk tickets |
| `haiku` | Not for the specialist agents (long agentic loops). Only for a one-shot, mechanical, checkable sub-task |
| `fable` | Escalation only: a defect or design problem that resisted the session model with no new insight, or exceptional architectural reasoning. Counts toward the resource checkpoints; say why in the plan |

When a cheaper model's output is incomplete or wrong (missed evidence, rejected by review), re-run that task on
`inherit` and record it. `usage.py` reports the model of every run, so routing can be judged on real outcomes over
time. Agent frontmatter defaults to `inherit`, so a run with no routing decision gets the safe choice.
