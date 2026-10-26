# tools

Repo scripts for maintainers. Not part of the site: `.vercelignore` keeps them off Vercel (GitHub Pages still serves
the folder, harmless). No dependencies; Node 18+ (`source ~/.nvm/nvm.sh` on this machine).

- `static-fallback.js` (WEB-22): writes the static fallback for crawlers that don't run JavaScript into the pages
  (footer unit links, the store pages' facts and JSON-LD, the landing's unit list and JSON-LD) and `llms.txt`, all from
  `data/units.js`. Run `node tools/static-fallback.js` after changing `data/units.js`, `js/schema.js`, the string tables
  in `js/site.js` / `js/poslovnica.js`, a page's canonical link or the domain. `--check` only reports what is out of
  date (exit 1); `.claude/workflow/smoke.js` runs it. How it works: the comment at the top of the script.
