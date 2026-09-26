# Cloudflare deployment

The repository is configured for a static Cloudflare Pages deployment. Run `npm run pages:build`, then deploy the generated `out/` directory to the existing ProDrome Pages project after reviewing the preview. Connect the requested GitHub repository (`8iddy/prodrome`) in the Cloudflare dashboard and preserve the existing `prodrome.health` custom-domain mapping; do not change DNS until the preview is verified.

No credentials were available during implementation, so neither DNS nor the existing deployment was modified. Future large raw files/model artefacts can use R2 and run metadata D1, but neither is required at prototype scale.
