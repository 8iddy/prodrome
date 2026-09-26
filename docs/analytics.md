# Analytics

The local Python engine uses chronological rolling robust medians/MAD, an interpretable positive CUSUM-style score, deterministic Isolation Forest where at least two populated features and 24 historical observations exist, conservative same-period spatial corroboration, persistence, and versioned scoring weights in `configs/scoring/v1.json`.

At period T, only rows dated on or before T are passed to scoring. Model runs record IDs, configuration version, seed, timestamp, selected features, source rows, drivers, and alerts. Alerts are abnormal-surveillance signals requiring human verification; they are not outbreak declarations.
