# Local audit — 27 September 2026

## What exists and should be preserved

- A Next.js 16 / React 19 / TypeScript application with Tailwind and Recharts. It is statically exported (`output: 'export'`) and its existing `wrangler.toml` deploys `out/` to Cloudflare Pages.
- The dark, compact, operations-console visual language, alert hierarchy, tabular facility view, and SVG map styling are useful foundations.
- The local Git repository has useful prototype history on `main`; its configured remote is `Lu9er/prodrome-f0`, not the requested `8iddy/prodrome`. The configured remote was not changed during this audit.

## Current limitations and required modifications

- The active UI is synthetic mock telemetry (`lib/mock-data.ts`) with hard-coded alerts, named Uganda facilities, “LIVE”/Ministry-of-Health framing, and unsupported detection-lead-time language. It must not be presented as operational surveillance.
- There is no API, database, Python analytics layer, test suite, provenance model, data-mode control, research console, or reproducible model-run artefact.
- Existing `app/dashboard/*` routes are earlier prototype routes with inconsistent mock-data types; the public application should move to generated analytical artefacts rather than extending those claims.
- `next.config.mjs` suppresses TypeScript build errors. This should be removed after the route migration has been fully type-checked.
- No environment files, database migrations, R2/D1 bindings, or production deployment credentials were found. No deployment status can be asserted.

## Deployment assessment

Cloudflare Pages static hosting is the lowest-complexity compatible deployment for the current prototype. Python ingestion/model replay stays local or in scheduled research workflows; generated JSON artefacts are deployed with the static site. Future D1/R2 are optional boundaries, not present claims.

## Risks

Raw local data is currently untracked. The 72 MB WHO FluID CSV should not be committed accidentally. The source package duplicates the catalogue and manifest found at the top of `data/`; checksums confirm the top-level inputs should be treated as the working originals. Public Health Scotland resources are referenced but not locally downloaded, so their current schema must be validated at retrieval time.
