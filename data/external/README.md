# External data for ProDrome

Retrieved on 3 October 2026 from public sources. `SOURCE_MANIFEST.json` lists every file with its source URL, licence, row count and SHA-256 checksum.

## Public Health Scotland (external validation)

Source: Public Health Scotland open data, "Viral respiratory diseases (including influenza and COVID-19) data in Scotland". Licence: Open Government Licence v3.0.

`data/raw/phs/phs_cari_*.csv.gz` hold the four CARI seasons (2022/23 to 2025/26) exactly as published, gzip-compressed. CARI is community acute respiratory infection sentinel testing. Each file gives weekly tests, positives and positivity by Health Board, pathogen, age group and sex.

`data/raw/phs/phs_cases_by_health_board_*.csv.gz` holds weekly laboratory-confirmed cases of influenza, RSV and COVID-19 by Health Board from 2016/17 to 2025/26. This comes from a separate reporting stream, so it can act as an independent reference for season onset and peak timing.

`data/external/phs_cari_health_board_weekly_all_ages.csv` is the CARI data reduced to the "All ages" and "All sexes" rows: 43,056 rows, 16 areas (14 Health Boards, "Scotland" and "Unknown"), 13 pathogen rows, weeks from 3 Oct 2022 to 14 Sep 2026. It keeps the columns the `ScotlandCARIAdapter` expects. `WeekBeginning` is an integer in YYYYMMDD form and must be parsed with format `%Y%m%d`.

## WHO FluNet, Uganda (full series)

`data/raw/who/who_flunet_uganda_VIW_FNT_2006_2026.csv` is the full FluNet record for Uganda from the WHO public API: 930 weekly rows from 27 Mar 2006 to 21 Sep 2026. It has rows from two origin sources, SENTINEL (246) and NOTDEFINED (684). Some weeks therefore have more than one row, and these rows need summing by week.
