# Quality gates

Statuses: **PASS** · **FAIL** · **BLOCKED** (could not run: tool/decision/dependency missing) · **NOT APPLICABLE**
(out of scope, with a reason) · **NOT VERIFIED** (applicable but not run). Default is NOT VERIFIED.
`wf.py` enforces three rules:
- PASS needs an evidence path and no open critical/high/medium defect in that gate.
- Every PASS records a fingerprint of the changed files. If those files change afterwards, the gate becomes
  **stale**: `wf.py stale` lists it and `wf.py ready` refuses it.
- A required gate that is not PASS/NOT APPLICABLE needs an approved exception.

| Gate | Evidence producer | PASS means |
|---|---|---|
| functional | functional-qa and/or delivery-verifier | every AC's test cases pass in a browser; relevant negative cases pass; regression clean for the affected scope (smoke `--baseline`: only new failures count) |
| visual | visual-a11y-qa | matches design.md / design-system references at the profile viewports (+320px reflow); no overflow, clipping or broken states |
| accessibility | visual-a11y-qa | axe: 0 serious/critical on changed pages at all viewports; manual keyboard, focus, contrast and target-size checks done; limitations listed (not a certification) |
| seo | seo-specialist | locally verifiable checks pass for changed pages; live-data items listed as recommendations |
| code | code-security-reviewer + project commands | build/lint/tests pass where they exist (static site: smoke is the build check); no open correctness/maintainability defect ≥ medium |
| security | code-security-reviewer | no open security defect; new origins, forms, uploads, data flows reviewed |
| content | content-brand-specialist | copy matches copy.md/sources; style rules; no unverified facts |
| performance | developer / visual / seo measurements | no new heavy assets, render-blocking resources or layout shift on changed pages |
| cross-browser | functional-qa / verifier | automated Chrome only here; Safari/Firefox are manual → usually NOT VERIFIED and listed as untested, unless the ticket requires them (then BLOCKED until checked) |

## Choosing required gates: from the change and its risk, not the ticket type
A gate is required when the change can break what it checks or when an AC depends on it:
- **Behaviour, navigation, data-driven rendering** changed → functional.
- **Rendered output** changed (markup, CSS, components, images) → visual + accessibility.
- **Markup structure, focus, keyboard, colours** changed → accessibility (even if the visual change is tiny).
- **Head tags, URLs, headings, links, structured data, indexable copy** changed → seo.
- **Any code** changed → code. **Security surface** (forms, uploads, personal data, third-party code, new
  origins, CSP) → security.
- **User-facing text or facts** changed → content.
- **Assets or loading** changed → performance.
- **Shared files** (`stack.structure.shared`) changed → functional regression covers all pages, not only the
  ticket's pages.
A pure copy edit in `data/units.js` may need content + targeted functional (the data drives rendering) + seo (if it
feeds titles/JSON-LD), and no visual gate. A one-line CSS change in a shared component may need visual +
accessibility on every page. Write the reason for each required or N/A gate in `plan.json`.

## After a fix: which evidence is invalidated
Run `wf.py stale <KEY>`. It lists every gate/test whose evidence predates a change to the files it covered. Then
re-run only what the change can affect:
| Change in the fix | Re-verify |
|---|---|
| CSS only | the defect's check + visual/a11y at affected viewports; targeted smoke of pages using that CSS |
| JS logic | the defect's check + functional cases touching that code path + code review of the diff |
| HTML structure | the defect's check + accessibility + seo (if head/headings/links) + functional on that page |
| Data / copy | content + functional where the data renders + seo if it feeds metadata |
| Shared file of any kind | the above, across all pages that load it (full smoke) |
Do not re-run unaffected gates. If you skip a stale gate, explain why it is still valid, or re-run it. `ready`
treats a stale gate as not passed.

## Exceptions
A required gate may end FAIL/BLOCKED/NOT VERIFIED only with an approved PO decision (`approvals` Q-n, then
`wf.py set <KEY> gates.<gate>.exceptionApproval Q-n`). List every exception in the handoff.
