# Evaluation and alert policy

ProDrome evaluates its scoring policy on a deterministic, labelled synthetic laboratory network: six locations × 156 weekly periods (936 location-periods). It is a regression benchmark, not evidence of real-world sensitivity, specificity, or outbreak-confirmation performance.

## What changed

The legacy `v1` scorer turned every low-threshold anomaly signal into a new alert on every reporting period. This created repeated alerts within one continuing episode. `v2-balanced` makes a deliberate distinction:

- An **anomaly signal** remains available in the run artefact and charts whenever a robust MAD-based deviation crosses the signal threshold.
- An **operational alert** is emitted once at the start of a qualifying episode, then suppressed until the episode has been quiet for more than one period. A four-period cooldown prevents a briefly interrupted episode from immediately reopening.
- A normal operational alert needs sufficient risk, two periods of persistence, and either two independent indicator domains or same-period geographic corroboration. Test volume and positive-test count are one `testing_volume` domain because they are coupled.
- A severe, single-domain signal needs four periods of persistence. A reporting-completeness drop may alert after three persistent periods at risk ≥0.68, because it is a material surveillance-quality failure rather than an outbreak claim.
- HIGH requires high risk plus sustained persistence, multiple independent domains, or geographic corroboration. Low-level scores are not operational alerts.

The raw CUSUM and Isolation Forest components remain inputs to a weighted risk score; the final operating decision is not based on either score alone. The configuration also uses a 52-period robust baseline, stricter 3.25-MAD signal threshold, Isolation Forest contamination of 0.04, and a spatial contribution only where other meaningful signals exist.

## Candidate results

Run the reproducible comparison with:

```bash
python -m analytics generate-synthetic
python -m analytics benchmark --configs configs/scoring/v1.json configs/scoring/v2-sensitivity.json configs/scoring/v2-balanced.json configs/scoring/v2-conservative.json
```

| Configuration | Events detected / 5 | Rate | Operational alerts | False alerts | False alerts / location-period | Mean / median delay (days) | Missed | Precision |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| v1 legacy | 5 | 1.000 | 118 | 113 | 0.1207 | 2.8 / 0.0 | 0 | 0.042 |
| v2-sensitivity | 5 | 1.000 | 5 | 0 | 0.0000 | 8.4 / 7.0 | 0 | 1.000 |
| **v2-balanced (selected)** | **5** | **1.000** | **5** | **0** | **0.0000** | **8.4 / 7.0** | **0** | **1.000** |
| v2-conservative | 4 | 0.800 | 4 | 0 | 0.0000 | 14.0 / 14.0 | 1 | 1.000 |

The benchmark has six labelled scenarios: five expected operational scenarios and one deliberately injected single-domain false-alarm control. The control is not a true operational event, so it is excluded from the denominator and any alert it receives is false. This corrects the legacy presentation, which reported `ground_truth_events: 6`, `detected_events: 5`, `event_detection_rate: 0.833`, `generated_alerts: 118`, `false_alerts: 113`, and `detection_delay_days: 0.0` without treating that control separately.

`v2-balanced` is selected in [`configs/scoring/v2-balanced.json`](../configs/scoring/v2-balanced.json): it preserves all five expected detections while eliminating repeated operational alerts and rejecting the negative control. It is not selected merely for precision: the conservative candidate also has zero false alerts, but misses one event and doubles the median delay. Perfect precision in this small synthetic benchmark must not be interpreted as a production estimate.

## Evaluation limits and next checks

The events are simulated, the locations are not independent real surveillance sites, and the data generator does not capture reporting changes, intervention effects, or real verification outcomes. Before changing thresholds for production data, calibrate the policy prospectively with public retrospective data and documented human adjudication. Do not turn unknown low-level scores into operational incidents merely to improve apparent detection rates.

## Three benchmarks

The Benchmark page has three parts, each with its own question. All are proof of concept benchmark results.

1. **Simulated network (ground truth).** Does ProDrome find events whose timing is known? The results are above.
2. **External validation on Public Health Scotland data.** Do the frozen rules behave sensibly on an independent series? Definitions and results are in [external-validation.md](external-validation.md). The definitions were committed before the results.
3. **Ugandan series (WHO FluNet).** How do the rules behave on real Ugandan influenza testing from 2010 to 2026? The run raised 8 alerts on the national series. The run metadata notes the testing disruption of 2020 and 2021.

All three use `configs/scoring/v2-balanced.json` unchanged. No threshold was tuned on the Scottish or FluNet data.
