# External validation on Public Health Scotland data

This document sets out how ProDrome is tested on Public Health Scotland (PHS) open data. The definitions in sections 1 to 5 were written and committed before any metric was computed. The results in section 6 were added afterwards, in a later commit, so the order is visible in the git history.

## Purpose

The Scottish data is an external benchmark. It is an independent, structured surveillance series from 14 Health Boards. It tests the detection logic on data outside its development set. It does not represent Ugandan epidemiology. The results are proof of concept benchmark results from a retrospective analysis. They are not estimates of clinical sensitivity, specificity or operational effectiveness.

## 1. Data

- **Input to ProDrome.** CARI (community acute respiratory infection) sentinel testing: weekly tests and positives by Health Board, "All ages" and "All sexes", from the week beginning 3 October 2022 to the week beginning 14 September 2026. File: `data/external/phs_cari_health_board_weekly_all_ages.csv`.
- **Reference.** Weekly laboratory confirmed cases by Health Board, from a separate PHS reporting stream. File: `data/raw/phs/phs_cases_by_health_board_*.csv.gz`.
- **Pathogens.** "Influenza (All)" and "RSV", each in its own run.
- **Locations.** The 14 Health Boards. The "Scotland" row runs as a separate national series without coordinates, so it takes no part in spatial corroboration or in the Health Board metrics. The "Unknown" row is dropped.

## 2. Frozen rules

ProDrome runs with `configs/scoring/v2-balanced.json` exactly as it was set on the simulated benchmark. No threshold, weight or alert policy is changed for this data. Each run artefact records the SHA-256 of the configuration file, the random seed, the SHA-256 of every input file and the analysis window.

The CARI series starts in October 2022. The baseline needs 12 weeks of history and uses up to 52. The 2022/23 season is therefore a warm-up season. ProDrome scores it, but alerts that start before the week beginning 2 October 2023 (ISO week 40 of 2023) are left out of every metric.

## 3. Reference definitions

All definitions use the laboratory confirmed case series, one Health Board and one pathogen at a time.

- **Season.** ISO week 40 of one year to ISO week 39 of the next. The scored seasons are 2023/24, 2024/25 and 2025/26. The 2025/26 season ends at the last published week.
- **Season peak.** The week with the highest number of confirmed cases in that Health Board and season. If two weeks tie, the earlier week is the peak.
- **Season onset.** The first week of the first pair of consecutive weeks in which confirmed cases are at least 20% of that season's peak. The 20% level is fixed in advance.
- **Minimum season size.** A Health Board season whose peak is below 10 confirmed cases has no defined onset or peak. At such small counts, 20% of the peak is one or two cases, so a single case would set the onset. These seasons are listed by name in the results. They are left out of metrics 1 and 2 and stay in metrics 3 and 4.
- **Off season.** ISO weeks 21 to 39. The scored off season periods are weeks 21 to 39 of 2024, 2025 and 2026, which gives 42 Health Board years (14 Health Boards over 3 years).
- **Operational alert.** An alert in the run artefact. Its week is the week in which ProDrome raised it (`start_date`). Unusual weeks that did not become an alert (signals) are left out.

## 4. Metrics

Each metric is reported for each pathogen, for all 14 Health Boards together, and for each Health Board.

1. **Detection window.** The share of Health Board seasons with at least one operational alert between 4 weeks before onset and the peak week, both included.
2. **Timing.** For each Health Board season, the first operational alert between ISO week 40 and the peak week, both included. Its distance from onset and from peak, in weeks. Negative values mean the alert came first. Reported as a median and interquartile range across the Health Board seasons that have such an alert.
3. **Off season alerts.** Operational alerts that start in the off season, divided by the number of Health Board years.
4. **Alerts per season.** Operational alerts per Health Board season, across the full season from week 40 to week 39. This checks the episode grouping: one seasonal wave should give a small number of alerts.
5. **Comparison rule.** The same four metrics for a basic rule: CARI positivity at or above 10% for two consecutive weeks. The rule raises an alert in the second week. It raises a new alert only after positivity has fallen below 10% for at least one week. A week with zero tests counts as below 10%. The 10% level is a positivity threshold commonly used to mark the start of the influenza season in European sentinel surveillance. The same level applies to RSV, so the rule stays fixed and simple.

## 5. Groups

Orkney, Shetland and the Western Isles have small weekly counts. Their results are reported separately as "island boards". The other 11 Health Boards are reported as "mainland boards". The totals for all 14 Health Boards are reported as well.

Seasonal influenza and RSV waves are expected events. In this benchmark, an alert near season onset is the behaviour under test. An off season alert can reflect a real change in the data, so the count measures how often ProDrome speaks outside the main season. It is not a count of false alerts.

## 6. Results

Results are added in a separate commit after the definitions above.
