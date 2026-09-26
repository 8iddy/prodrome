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
