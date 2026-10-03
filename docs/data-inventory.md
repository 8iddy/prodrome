# Data inventory

| Original file | Identity / publisher | Coverage and records | ProDrome use / limitations |
| --- | --- | --- | --- |
| `Uganda FluNet data.xlsx` | WHO FluNet Uganda export | 192 weekly sentinel rows, 2022-04-24 to 2025; Uganda; influenza | Training/replay input: specimens received/processed and influenza detections. No facility, TAT, backlog, QC, or coordinates. SHA-256 `9359b825…c518c7`. |
| `VIW_FID_EPI.csv` | WHO FluID weekly epidemiological interface | 593,622 global rows, 1996-09-30 to 2026-09-21; 221 Uganda rows | Reference/optional aggregate respiratory indicators. It is not laboratory testing data and age groups create multiple observations per week; do not use it as Uganda laboratory ground truth. SHA-256 `a0d18b…0b4710`. |
| `VIW_FLU_METADATA.csv` | WHO FluNet/FluID field dictionary | 90 metadata rows | Interprets WHO source columns. SHA-256 `44d413…9647d0`. |
| `uganda_outbreak_event_catalogue.csv` | Uganda National Institute of Public Health, structured catalogue | 5 event-level records; Uganda; 2024–2026 | External reference context only, not training data or a line list. It explicitly preserves a Nwoya date conflict. SHA-256 `c0db00…3a2db3`. |
| `prodrome_source_manifest.json` | ProDrome source manifest | CKAN IDs for current/archived CARI and Scottish health-board cases | Retrieval instructions/provenance only; no Scottish rows are bundled. |
| `Imported cholera…pdf` | Uganda National Institute of Public Health | 8-page Adjumani cholera investigation | Human-readable event source only; no weekly laboratory time series. SHA-256 `5a5495…560d`. |
| `Measles outbreak investigation…pdf` | Uganda National Institute of Public Health | 3-page Amolatar investigation | Human-readable event source only; confirms 6 Feb 2026 laboratory confirmation. SHA-256 `2323a2…83ea9`. |
| `Temporal trends…pdf` | Uganda National Institute of Public Health | 9-page Uganda measles analysis | Reference document, not a model input. SHA-256 `e0fcec…6964b`. |

The nested `Prodrome_Data_Source_Package/` contains byte-identical copies of the event catalogue and source manifest, plus a README explaining their use. No source identity was unresolved.

## Files added on 3 October 2026

Sources, licences and SHA-256 checksums are in `data/external/SOURCE_MANIFEST.json`. Files under `data/raw/` stay out of git.

| File | Publisher | Coverage | ProDrome use |
| --- | --- | --- | --- |
| `data/raw/who/who_flunet_uganda_VIW_FNT_2006_2026.csv` | WHO FluNet public API | 930 weekly rows, 27 Mar 2006 to 21 Sep 2026, origin sources SENTINEL and NOTDEFINED | `WHOFluNetAdapter` sums the origin sources for each ISO week and flags a missing count. Each week has one row. The origin source label is NOTDEFINED until 27 Dec 2021 and SENTINEL from 3 Jan 2022. The run records this switch as a series change in its metadata, and the charts mark it. The run scores from 4 Jan 2010, when weekly reporting becomes close to continuous. Tests and positives only. |
| `data/raw/phs/phs_cari_*.csv.gz` | Public Health Scotland, OGL v3.0 | Four CARI seasons, 2022/23 to 2025/26, by Health Board, pathogen, age and sex | Source of the derived CARI file. |
| `data/external/phs_cari_health_board_weekly_all_ages.csv` | Derived from the CARI files | 43,056 rows, "All ages" and "All sexes", 3 Oct 2022 to 14 Sep 2026 | Input to `ScotlandCARIAdapter`. `WeekBeginning` is parsed with `%Y%m%d`. The "Unknown" area is dropped and "Scotland" is a separate national series. |
| `data/raw/phs/phs_cases_by_health_board_*.csv.gz` | Public Health Scotland, OGL v3.0 | Weekly laboratory confirmed influenza, RSV and COVID-19 cases by Health Board, 2016/17 to 2025/26 | Independent reference for the external validation (`ScotlandHealthBoardCasesAdapter`). `HBQF = d` marks the derived national row. |
| `configs/geo/scotland-health-board-centroids.json` | Scottish Government boundary service, OGL v3.0 | 14 Health Board centroids | Coordinates for spatial corroboration. |

## Committed derived artefacts

`python -m analytics build-datasets` writes `public/datasets/index.json`, `public/datasets/who-flunet-uganda/run.json`, `public/datasets/phs-scotland/run-influenza.json`, `run-rsv.json` and `validation.json`. Each run records the configuration hash, seed, input checksums and analysis window.
