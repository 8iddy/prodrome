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

These are proof of concept benchmark results from a retrospective analysis of public data. Rebuild them with `python -m analytics build-datasets`. The full tables, including every Health Board and every reference season, are in `public/datasets/phs-scotland/validation.json`. The Benchmark page on the site shows the same numbers.

All runs used `configs/scoring/v2-balanced.json` unchanged (SHA-256 `f59ce2a07bf0…`, seed 20260927).

### Influenza

Of 42 Health Board seasons, 39 had a defined onset. Orkney 2023/24, Orkney 2025/26 and Shetland 2023/24 had peaks below 10 confirmed cases.

| All 14 Health Boards | ProDrome | Comparison rule |
| --- | ---: | ---: |
| Seasons with an alert from 4 weeks before onset to peak | 31 of 39 (79%) | 33 of 39 (85%) |
| First alert relative to onset, median (IQR), weeks | 0 (−2 to 1) | −1 (−3 to 1) |
| First alert relative to peak, median (IQR), weeks | −3.5 (−7 to −1) | −5 (−6 to −3) |
| Off season alerts per Health Board year | 0.10 (4 in 42) | 0.19 (8 in 42) |
| Alerts per Health Board season | 1.6 | 2.1 |

On the 11 mainland boards, ProDrome alerted in 28 of 33 seasons (85%) and the comparison rule in 31 of 33 (94%). ProDrome gave 1.7 alerts per season and the comparison rule 2.4. On the island boards, ProDrome alerted in 3 of 6 defined seasons and the comparison rule in 2 of 6.

For influenza, the comparison rule found a few more seasons and alerted about one week earlier. ProDrome raised half as many off season alerts and fewer alerts per season. The median ProDrome alert came in the onset week, about three to four weeks before the peak.

### RSV

Of 42 Health Board seasons, 33 had a defined onset. All 9 island board seasons had peaks below 10 confirmed cases, so the RSV detection and timing results cover the 11 mainland boards.

| All 14 Health Boards | ProDrome | Comparison rule |
| --- | ---: | ---: |
| Seasons with an alert from 4 weeks before onset to peak | 29 of 33 (88%) | 24 of 33 (73%) |
| First alert relative to onset, median (IQR), weeks | 1 (0 to 2) | 3 (2 to 4) |
| First alert relative to peak, median (IQR), weeks | −4 (−6 to −3) | −2 (−5 to −1) |
| Off season alerts per Health Board year | 0.05 (2 in 42) | 0.02 (1 in 42) |
| Alerts per Health Board season | 1.6 | 1.3 |

For RSV, ProDrome alerted in more seasons and about two weeks earlier than the comparison rule. RSV positivity in CARI passes 10% in every mainland board, and the comparison rule reaches that level for two weeks a median of 3 weeks after onset. Several boards test fewer than 10 CARI samples in a typical week (Dumfries and Galloway, Fife, Grampian and Tayside), so their weekly positivity moves in large steps.

### Reading these results

- The two pathogens give different results. For influenza, the fixed positivity rule found slightly more seasons slightly earlier, and ProDrome raised fewer off season alerts. For RSV, ProDrome found more seasons and alerted earlier.
- The episode grouping holds on this data: about 1.6 alerts per Health Board season for both pathogens.
- The island boards have few cases. Their seasons are often below the minimum size, and their results rest on a handful of seasons.
- The reference is the confirmed case series. Seasonal waves are expected events, so this benchmark measures timing against a known wave. It says nothing about detection of unexpected outbreaks, and it says nothing about performance on Ugandan laboratory data. The implementation study in Uganda measures that.
