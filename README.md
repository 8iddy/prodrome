# ProDrome

ProDrome is an early warning laboratory surveillance tool under implementation research. It watches routine laboratory activity for unusual patterns that may signal an emerging infectious disease event before it shows in routine aggregated reporting. It monitors test volume, positive results, positivity, turnaround time, backlog, sample rejection, reagent use, quality control failures and reporting completeness. It combines evidence across indicators and locations and raises alerts for laboratory and surveillance staff to review. People review every alert, record the checks done, and decide on the response.

## Vocabulary

- **Signal**: a week in which a measure moved far from its normal level.
- **Alert**: a pattern of signals that holds, as set by the rules in `configs/scoring/v2-balanced.json`.
- **Verified** or **dismissed**: the decision a reviewer records on an alert.

## Datasets

| Dataset | Role | Committed artefact |
| --- | --- | --- |
| Simulated laboratory network | Ground truth: 6 locations over 156 weeks with planted events of known timing, and the operations fields | `public/analytics/latest-run.json`, generated in CI |
| WHO FluNet Uganda | Real Ugandan influenza testing and positivity over time | `public/datasets/who-flunet-uganda/run.json` |
| Public Health Scotland | External benchmark on an independent series from 14 Health Boards | `public/datasets/phs-scotland/run-*.json`, `validation.json` |

`public/datasets/index.json` lists the datasets for the dashboard switcher. See [data inventory](docs/data-inventory.md) and [external validation](docs/external-validation.md).

## Local setup

```bash
python3 -m pip install -r requirements.txt
pnpm install
python3 -m analytics generate-synthetic
python3 -m analytics replay --dataset synthetic-lab-network
python3 -m analytics evaluate
pnpm build
```

Then use `pnpm dev` for the web interface.

## Analytics CLI

```bash
python3 -m analytics --help
python3 -m analytics inspect data/raw/who/who_flunet_uganda_VIW_FNT_2006_2026.csv --adapter flunet
python3 -m analytics inspect data/external/phs_cari_health_board_weekly_all_ages.csv --adapter cari
python3 -m analytics generate-synthetic --seed 20260927
python3 -m analytics replay --dataset synthetic-lab-network
python3 -m analytics evaluate
python3 -m analytics build-datasets   # rebuilds public/datasets from data/
```

`build-datasets` needs the files listed in `data/external/SOURCE_MANIFEST.json`. The raw files stay out of git; the derived artefacts in `public/datasets/` are committed, so CI deploys them without the raw data.

Run tests with `python3 -m pytest`. Read [the local audit](docs/audit.md), [architecture](docs/architecture.md), [analytics](docs/analytics.md), [evaluation](docs/evaluation.md) and [limitations](docs/limitations.md) before using generated output.

## Alert reviews

Screens record reviews through the `ReviewStore` interface in `lib/reviews.ts`. The prototype stores reviews in the browser. For the implementation study, a Cloudflare D1 store with named users can implement the same interface with no change to the screens. The review checks live in `REVIEW_CHECKS` and the tooltip text in `lib/glossary.ts`, so both are easy to adjust after feedback from practitioners.

## Deployment

The web application is a Cloudflare Pages static export. Pushes to `main` run the GitHub Actions workflow, which deploys to the `prodrome-f0` Pages project and `prodrome.health`. The workflow needs the repository secrets documented in [docs/cloudflare-deployment.md](docs/cloudflare-deployment.md).

## Licence

ProDrome is open source under the [Apache License 2.0](LICENSE). Copyright 2026 Neuravox Foundation Limited. See [NOTICE](NOTICE) for attributions.

The licence covers the ProDrome source code. Public datasets used for testing keep their own licences: Public Health Scotland data under the Open Government Licence v3.0, WHO FluNet data under the WHO terms of use, and Natural Earth map data in the public domain. [data/external/SOURCE_MANIFEST.json](data/external/SOURCE_MANIFEST.json) lists each source.
