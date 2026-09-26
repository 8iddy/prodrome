# Architecture

Raw sources → adapter validation/normalisation → canonical JSONL → chronological Python model run → versioned JSON artefact → static Next.js research dashboard.

Raw files are immutable, generated synthetic data lives under `data/synthetic/`, and processed outputs live under `data/processed/`. The browser only renders generated artefacts; it does not train models. A future deployment may place source/model artefacts in R2 and run metadata in D1, while keeping the adapter contract unchanged.
