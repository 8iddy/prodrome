"""Build the committed dataset artefacts in public/datasets/ from the files in data/.

External validation keeps the scoring rules frozen: every run uses configs/scoring/v2-balanced.json
unchanged, and each artefact records the configuration hash, seed, input checksums and analysis window.
"""
from __future__ import annotations

import glob
import json
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path
from typing import Any

import numpy as np

from .core import (ROOT, ScotlandCARIAdapter, ScotlandHealthBoardCasesAdapter, WHOFluNetAdapter, checksum,
                   run_pipeline, utcnow)

CONFIG = ROOT / "configs/scoring/v2-balanced.json"
OUT = ROOT / "public/datasets"
CARI_FILE = ROOT / "data/external/phs_cari_health_board_weekly_all_ages.csv"
FLUNET_FILE = ROOT / "data/raw/who/who_flunet_uganda_VIW_FNT_2006_2026.csv"
CENTROIDS = ROOT / "configs/geo/scotland-health-board-centroids.json"
SEED = 20260927

SCOTLAND_PATHOGENS = {"influenza": "Influenza (All)", "rsv": "RSV"}
ISLAND_BOARDS = {"S08000025", "S08000026", "S08000028"}  # Orkney, Shetland, Western Isles
SCORED_SEASONS = ["2023/24", "2024/25", "2025/26"]
WARM_UP_END = "2023-10-02"  # ISO week 40 of 2023: alerts before this date belong to the warm-up season
OFF_SEASON_WEEKS = range(21, 40)
OFF_SEASON_YEARS = [2024, 2025, 2026]
ONSET_SHARE = 0.20
MINIMUM_PEAK = 10
LOOKBACK_WEEKS = 4
COMPARISON_POSITIVITY = 0.10

OBSERVATION_FIELDS = ["location_id", "location_name", "location_type", "observation_date", "pathogen", "tests_completed",
                      "positive_tests", "positivity_rate", "median_tat_hours", "backlog_count", "rejected_samples",
                      "reagent_consumption", "qc_failures", "reporting_completeness", "latitude", "longitude",
                      "data_quality_flags"]
ALERT_FIELDS = ["alert_id", "model_run_id", "dataset_id", "location_id", "location", "pathogen", "start_date", "severity",
                "risk_score", "primary_driver", "supporting_drivers", "persistence", "spatial_corroboration",
                "data_quality", "verification_action"]


def _relative(path: Path) -> str:
    return str(Path(path).resolve().relative_to(ROOT))


def _metadata(inputs: list[Path], window: dict[str, Any], notes: list[str]) -> dict[str, Any]:
    return {"configuration_file": _relative(CONFIG), "configuration_sha256": checksum(CONFIG), "random_seed": SEED,
            "inputs": [{"file": _relative(p), "sha256": checksum(p)} for p in inputs], "analysis_window": window,
            "notes": notes, "built_at": utcnow()}


def trim_run(run: dict[str, Any], dataset_id: str, metadata: dict[str, Any]) -> dict[str, Any]:
    """Keep the fields the UI reads, so the committed file stays small."""
    signals = []
    for s in run["signals"]:
        o = s["observation"]
        observation = {k: o[k] for k in OBSERVATION_FIELDS if o.get(k) not in (None, [])}
        signal = {"observation": observation, "risk_score": s["risk_score"], "persistence": s["persistence"]}
        if s["drivers"]: signal["drivers"] = s["drivers"]
        if s.get("anomaly_signal"): signal["anomaly_signal"] = True
        if s.get("spatial_corroboration"): signal["spatial_corroboration"] = s["spatial_corroboration"]
        signals.append(signal)
    alerts = [{k: a.get(k) for k in ALERT_FIELDS} for a in run["alerts"]]
    for a in alerts: a["dataset_id"] = dataset_id
    return {"run_id": run["run_id"], "dataset_id": dataset_id, "model_version": run["model_version"],
            "configuration_version": run["configuration_version"], "created_at": run["created_at"],
            "records_scored": run["records_scored"], "random_seed": run["random_seed"], "metadata": metadata,
            "alerts": alerts, "signals": signals}


def write_json(path: Path, payload: Any) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, separators=(",", ":"), allow_nan=False)
    path.write_text(text)
    return len(text)


# ---------- Season arithmetic ----------

def season_of(iso_year: int, iso_week: int) -> str:
    start = iso_year if iso_week >= 40 else iso_year - 1
    return f"{start}/{str(start + 1)[-2:]}"


def iso_parts(day: str) -> tuple[int, int]:
    y, w, _ = date.fromisoformat(day).isocalendar()
    return y, w


def weeks_between(a: str, b: str) -> int:
    return (date.fromisoformat(b) - date.fromisoformat(a)).days // 7


def reference_seasons(cases: list[dict[str, Any]], pathogen: str) -> dict[tuple[str, str], dict[str, Any]]:
    """Season peak and onset for each Health Board from the confirmed case series."""
    series: dict[tuple[str, str], list[tuple[str, float]]] = defaultdict(list)
    names = {}
    for r in cases:
        if r["pathogen"] != pathogen or r["location_type"] != "health_board" or not r["observation_date"]: continue
        y, w = iso_parts(r["observation_date"])
        season = season_of(y, w)
        if season not in SCORED_SEASONS: continue
        series[(r["location_id"], season)].append((r["observation_date"], float(r["positive_tests"] or 0)))
        names[r["location_id"]] = r["location_name"]
    result = {}
    for (location_id, season), rows in series.items():
        rows.sort()
        peak_date, peak = max(rows, key=lambda x: (x[1], -date.fromisoformat(x[0]).toordinal()))
        entry = {"location_id": location_id, "location_name": names[location_id], "season": season,
                 "peak_week": None, "peak_cases": peak, "onset_week": None, "defined": peak >= MINIMUM_PEAK,
                 "first_week": rows[0][0], "last_week": rows[-1][0]}
        if entry["defined"]:
            entry["peak_week"] = peak_date
            level = ONSET_SHARE * peak
            for (d1, c1), (_, c2) in zip(rows, rows[1:]):
                if c1 >= level and c2 >= level:
                    entry["onset_week"] = d1
                    break
        result[(location_id, season)] = entry
    return result


def comparison_alerts(cari: list[dict[str, Any]], pathogen: str) -> list[dict[str, Any]]:
    """Positivity at or above 10% for two consecutive weeks; re-arms after one week below 10%."""
    by_location: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for r in cari:
        if r["pathogen"] == pathogen and r["location_type"] == "health_board": by_location[r["location_id"]].append(r)
    alerts = []
    for location_id, rows in by_location.items():
        rows.sort(key=lambda r: r["observation_date"])
        run_length, armed = 0, True
        for r in rows:
            above = bool(r["tests_completed"]) and (r["positivity_rate"] or 0) >= COMPARISON_POSITIVITY
            if not above:
                run_length, armed = 0, True
                continue
            run_length += 1
            if run_length >= 2 and armed:
                alerts.append({"location_id": location_id, "start_date": r["observation_date"]})
                armed = False
    return alerts


def _summary(values: list[float]) -> dict[str, Any]:
    if not values: return {"n": 0, "median": None, "q1": None, "q3": None}
    a = np.array(values, dtype=float)
    return {"n": len(values), "median": round(float(np.median(a)), 1), "q1": round(float(np.percentile(a, 25)), 1),
            "q3": round(float(np.percentile(a, 75)), 1)}


def season_metrics(alerts: list[dict[str, Any]], seasons: dict[tuple[str, str], dict[str, Any]], location_ids: set[str]) -> dict[str, Any]:
    scored = [a for a in alerts if a["start_date"] >= WARM_UP_END and a["location_id"] in location_ids]
    by_location = defaultdict(list)
    for a in scored: by_location[a["location_id"]].append(a["start_date"])
    entries = [s for (loc, _), s in seasons.items() if loc in location_ids]
    defined = [s for s in entries if s["defined"] and s["onset_week"]]
    detected, from_onset, from_peak, per_season = 0, [], [], []
    for s in entries:
        y = int(s["season"][:4])
        season_start = date.fromisocalendar(y, 40, 1).isoformat()
        season_end = date.fromisocalendar(y + 1, 39, 1).isoformat()
        per_season.append(sum(1 for d in by_location[s["location_id"]] if season_start <= d <= season_end))
    for s in defined:
        window_start = (date.fromisoformat(s["onset_week"]) - timedelta(weeks=LOOKBACK_WEEKS)).isoformat()
        dates = sorted(by_location[s["location_id"]])
        if any(window_start <= d <= s["peak_week"] for d in dates): detected += 1
        season_start = date.fromisocalendar(int(s["season"][:4]), 40, 1).isoformat()
        first = next((d for d in dates if season_start <= d <= s["peak_week"]), None)
        if first:
            from_onset.append(weeks_between(s["onset_week"], first))
            from_peak.append(weeks_between(s["peak_week"], first))
    off_season = sum(1 for a in scored if iso_parts(a["start_date"])[0] in OFF_SEASON_YEARS and iso_parts(a["start_date"])[1] in OFF_SEASON_WEEKS)
    board_years = len(location_ids) * len(OFF_SEASON_YEARS)
    return {"health_boards": len(location_ids), "health_board_seasons": len(entries), "defined_seasons": len(defined),
            "seasons_with_alert_in_window": detected,
            "detection_window_share": round(detected / len(defined), 3) if defined else None,
            "weeks_from_onset": _summary(from_onset), "weeks_from_peak": _summary(from_peak),
            "off_season_alerts": off_season, "health_board_years": board_years,
            "off_season_alerts_per_health_board_year": round(off_season / board_years, 3) if board_years else None,
            "alerts_in_scored_seasons": sum(per_season),
            "alerts_per_health_board_season": round(sum(per_season) / len(entries), 2) if entries else None}


def validation_for(pathogen: str, run: dict[str, Any], cari: list[dict[str, Any]], cases: list[dict[str, Any]]) -> dict[str, Any]:
    seasons = reference_seasons(cases, pathogen)
    boards = {loc for (loc, _) in seasons}
    names = {s["location_id"]: s["location_name"] for s in seasons.values()}
    rules = {"prodrome": [a for a in run["alerts"] if a["location_id"] in boards], "comparison": comparison_alerts(cari, pathogen)}
    groups = {"all": boards, "mainland": boards - ISLAND_BOARDS, "islands": boards & ISLAND_BOARDS}
    result = {"pathogen": pathogen, "source_label": SCOTLAND_PATHOGENS[pathogen], "groups": {}, "health_boards": [],
              "reference_seasons": sorted(seasons.values(), key=lambda s: (s["location_name"], s["season"])),
              "undefined_seasons": sorted(f"{s['location_name']} {s['season']}" for s in seasons.values() if not (s["defined"] and s["onset_week"]))}
    for name, ids in groups.items():
        result["groups"][name] = {rule: season_metrics(alerts, seasons, ids) for rule, alerts in rules.items()}
    for location_id in sorted(boards, key=lambda i: names[i]):
        result["health_boards"].append({"location_id": location_id, "location_name": names[location_id],
            "island": location_id in ISLAND_BOARDS,
            **{rule: season_metrics(alerts, seasons, {location_id}) for rule, alerts in rules.items()}})
    return result


# ---------- Builders ----------

def build_scotland(out: Path = OUT) -> dict[str, Any]:
    cases_file = Path(sorted(glob.glob(str(ROOT / "data/raw/phs/phs_cases_by_health_board_*.csv.gz")))[0])
    cari = ScotlandCARIAdapter().transform(CARI_FILE)
    cases = ScotlandHealthBoardCasesAdapter().transform(cases_file)
    dates = sorted(r["observation_date"] for r in cari)
    window = {"start": dates[0], "end": dates[-1], "warm_up_until": WARM_UP_END, "scored_seasons": SCORED_SEASONS}
    notes = ["2022/23 is a warm-up season for the baseline. Alerts before 2 October 2023 are excluded from validation metrics.",
             "Orkney, Shetland and the Western Isles have small weekly counts and are reported separately.",
             "The Scotland national series runs without coordinates and takes no part in spatial corroboration."]
    metadata = _metadata([CARI_FILE, cases_file, CENTROIDS], window, notes)
    runs, validation, sizes = {}, {"dataset_id": "phs-scotland", "definitions": "docs/external-validation.md",
        "reference": "Public Health Scotland weekly laboratory confirmed cases by Health Board",
        "comparison_rule": f"CARI positivity at or above {int(COMPARISON_POSITIVITY * 100)}% for two consecutive weeks",
        "parameters": {"onset_share_of_peak": ONSET_SHARE, "minimum_peak_cases": MINIMUM_PEAK, "lookback_weeks": LOOKBACK_WEEKS,
                       "off_season_iso_weeks": [21, 39], "off_season_years": OFF_SEASON_YEARS},
        "metadata": metadata, "pathogens": {}}, {}
    for pathogen in SCOTLAND_PATHOGENS:
        records = [r for r in cari if r["pathogen"] == pathogen]
        run = run_pipeline(records, config_path=CONFIG)
        runs[pathogen] = run
        sizes[pathogen] = write_json(out / "phs-scotland" / f"run-{pathogen}.json", trim_run(run, "phs-scotland", {**metadata, "pathogen": pathogen}))
        validation["pathogens"][pathogen] = validation_for(pathogen, run, cari, cases)
    write_json(out / "phs-scotland" / "validation.json", validation)
    return {"sizes": sizes, "period": [dates[0], dates[-1]], "alerts": {p: len(r["alerts"]) for p, r in runs.items()}}


def build_flunet(out: Path = OUT) -> dict[str, Any]:
    records = WHOFluNetAdapter().transform(FLUNET_FILE)
    window_start = "2010-01-04"
    scored = [r for r in records if r["observation_date"] >= window_start]
    window = {"start": window_start, "end": scored[-1]["observation_date"], "canonical_start": records[0]["observation_date"],
              "reason": "Uganda reported on fewer than 45 weeks a year before 2010. From 2010 the weekly series is close to continuous."}
    notes = ["Testing was disrupted in 2020 and 2021 during the COVID-19 pandemic. Influenza positives were very low in 2020, and test volumes changed sharply in 2021 and 2022.",
             "Test volume was low in 2018 (469 specimens processed in the year).",
             "Each ISO week has one FluNet row in this file, so every week carries the single_origin_source flag.",
             "FluNet reports tests and positives only. Turnaround time, backlog, reagents, rejection and quality control fields are absent."]
    run = run_pipeline(scored, config_path=CONFIG)
    size = write_json(out / "who-flunet-uganda" / "run.json", trim_run(run, "who-flunet-uganda", _metadata([FLUNET_FILE], window, notes)))
    return {"size": size, "period": [window_start, scored[-1]["observation_date"]], "alerts": len(run["alerts"])}


def build_index(scotland: dict[str, Any], flunet: dict[str, Any], out: Path = OUT) -> None:
    datasets = [
        {"id": "simulated-network", "title": "Simulated laboratory network", "label": "Simulated laboratory network", "kind": "simulated",
         "role": "Six simulated laboratories over 156 weeks, with planted events whose timing is known. This ground truth shows when an alert catches a known event, and the data carries the laboratory operations fields that no open dataset has together.",
         "publisher": "ProDrome benchmark generator", "licence": "Generated by ProDrome", "period": ["2023-01-02", "2025-12-22"],
         "locations": 6, "location_noun": ["lab", "labs"], "indicators": ["tests_completed", "positive_tests", "positivity_rate", "median_tat_hours", "backlog_count", "rejected_samples", "reagent_consumption", "qc_failures", "reporting_completeness"],
         "map": "uganda", "runs": [{"pathogen": "influenza", "path": "/analytics/latest-run.json"}]},
        {"id": "who-flunet-uganda", "title": "WHO FluNet Uganda", "label": "Public data · WHO FluNet Uganda", "kind": "public",
         "role": "Real Ugandan influenza surveillance over time. It lets ProDrome work with real variation in Ugandan laboratory testing and positivity.",
         "publisher": "World Health Organization, Global Influenza Surveillance and Response System", "licence": "WHO FluNet terms of use",
         "source_url": "https://www.who.int/tools/flunet", "period": flunet["period"], "locations": 1, "location_noun": ["national series", "national series"],
         "indicators": ["tests_completed", "positive_tests", "positivity_rate"], "map": "national",
         "runs": [{"pathogen": "influenza", "path": "/datasets/who-flunet-uganda/run.json"}]},
        {"id": "phs-scotland", "title": "Public Health Scotland", "label": "Public data · Public Health Scotland", "kind": "public",
         "role": "An independent surveillance series from 14 Health Boards, used as an external benchmark. It tests the detection logic on data outside its development set. It does not represent Ugandan epidemiology.",
         "publisher": "Public Health Scotland", "licence": "Open Government Licence v3.0", "source_url": "https://www.opendata.nhs.scot/",
         "period": scotland["period"], "locations": 14, "location_noun": ["Health Board", "Health Boards"],
         "indicators": ["tests_completed", "positive_tests", "positivity_rate"], "map": "list",
         "runs": [{"pathogen": "influenza", "path": "/datasets/phs-scotland/run-influenza.json"}, {"pathogen": "rsv", "path": "/datasets/phs-scotland/run-rsv.json"}],
         "validation": "/datasets/phs-scotland/validation.json"},
    ]
    write_json(out / "index.json", {"generated_at": utcnow(), "datasets": datasets})


def build_all(out: Path = OUT) -> dict[str, Any]:
    scotland = build_scotland(out)
    flunet = build_flunet(out)
    build_index(scotland, flunet, out)
    return {"phs-scotland": scotland, "who-flunet-uganda": flunet}
