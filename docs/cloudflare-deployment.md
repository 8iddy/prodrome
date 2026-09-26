# Cloudflare deployment

Production is the existing Cloudflare Pages project **`prodrome-f0`**, not a new project. Its mapped production domain is **`prodrome.health`** and the production branch is **`main`** in [8iddy/prodrome](https://github.com/8iddy/prodrome).

## Automatic deployment

`.github/workflows/deploy-cloudflare-pages.yml` runs on every push to `main`. It installs the pinned pnpm dependency graph and Python requirements, regenerates the deterministic synthetic benchmark/model artefacts, runs the static Next.js build, and deploys `out/` to `prodrome-f0` with the official Cloudflare Wrangler Action.

Before the first GitHub Actions deployment, add these repository secrets in **GitHub → 8iddy/prodrome → Settings → Secrets and variables → Actions**:

- `CLOUDFLARE_API_TOKEN`: a scoped Cloudflare API token with **Account → Cloudflare Pages → Edit** for account `31bc3ba58912801eb96ec2159a122aa1`.
- `CLOUDFLARE_ACCOUNT_ID`: `31bc3ba58912801eb96ec2159a122aa1`.

No token is committed. The existing older native Git integration remains untouched; the workflow is the authoritative deployment path for this repository until the Pages project is reconnected to `8iddy/prodrome` in the Cloudflare dashboard.

## Local commands and troubleshooting

```bash
pnpm install --frozen-lockfile
python3 -m pip install -r requirements.txt
python3 -m analytics generate-synthetic
python3 -m analytics replay --dataset synthetic-lab-network
python3 -m analytics evaluate
pnpm build
```

`wrangler.toml` identifies the existing Pages project. `pnpm pages:deploy` is available for an explicitly authorised manual production deployment, but normal updates should use the GitHub Action. If an Actions deployment fails, inspect its log for the first failing build/secret step; do not expose tokens in issues or logs. Future large raw files/model artefacts can use R2 and run metadata D1, but neither is needed at prototype scale.
