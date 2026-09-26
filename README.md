# ProDrome

ProDrome is a reproducible research prototype for detecting unusual aggregate laboratory-surveillance signals. It combines transparent statistical surveillance and constrained machine-learning anomaly detection to produce **elevated surveillance signals** for human verification; it does not declare outbreaks.

## Current status

The project is a demonstration and retrospective-analysis platform. It is not connected to Uganda Ministry of Health systems, laboratories, DHIS2 production systems, or national surveillance systems. The built-in benchmark uses labelled, deterministic synthetic aggregate data. WHO FluNet is an available retrospective public source; Uganda event records are reference context, not model labels.

## Local setup

```bash
python3 -m pip install -r requirements.txt
pnpm install
python3 -m analytics generate-synthetic
python3 -m analytics replay --dataset synthetic-lab-network
python3 -m analytics evaluate
pnpm build
```

Then use `pnpm dev` for the web interface. The dashboard reads generated JSON in `public/analytics/` and always displays the data mode.

## Analytics CLI

```bash
python3 -m analytics --help
python3 -m analytics inspect 'data/Uganda FluNet data.xlsx' --adapter flunet
python3 -m analytics ingest 'data/Uganda FluNet data.xlsx' --adapter flunet
python3 -m analytics generate-synthetic --seed 20260927
python3 -m analytics replay --dataset synthetic-lab-network
python3 -m analytics evaluate
```

Run tests with `python3 -m pytest`. Read [the local audit](docs/audit.md), [data inventory](docs/data-inventory.md), [architecture](docs/architecture.md), [analytics](docs/analytics.md), and [limitations](docs/limitations.md) before using generated output.

## Deployment

The web application is a Cloudflare Pages-compatible static export. Build with `npm run pages:build`; verify a Pages preview before associating the existing `prodrome.health` custom domain. Deployment details are in [docs/cloudflare-deployment.md](docs/cloudflare-deployment.md).
