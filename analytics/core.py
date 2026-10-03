from __future__ import annotations

import csv
import hashlib
import json
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

ROOT = Path(__file__).resolve().parents[1]
CANONICAL_FIELDS = [
    "source_id", "dataset_id", "location_id", "location_name", "location_type", "country", "region",
    "observation_date", "iso_year", "iso_week", "period_type", "pathogen", "tests_ordered",
    "tests_completed", "positive_tests", "positivity_rate", "median_tat_hours", "backlog_count",
    "rejected_samples", "reagent_consumption", "qc_failures", "reporting_completeness", "latitude",
    "longitude", "source_record_id", "ingested_at", "data_quality_flags",
]
NUMERIC_FIELDS = set(CANONICAL_FIELDS) - {
    "source_id", "dataset_id", "location_id", "location_name", "location_type", "country", "region",
    "observation_date", "period_type", "pathogen", "source_record_id", "ingested_at", "data_quality_flags",
}


def utcnow() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def checksum(path: str | Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def nullable_number(value: Any) -> float | int | None:
    if value is None or (isinstance(value, str) and value.strip() in {"", "NA", "N/A", "null", "None"}):
        return None
    try:
        result = float(value)
        if np.isnan(result):
            return None
        return int(result) if result.is_integer() else result
    except (TypeError, ValueError):
        return None


def iso_date(value: Any) -> str | None:
    if value is None or value == "":
        return None
    parsed = pd.to_datetime(value, errors="coerce")
    return None if pd.isna(parsed) else parsed.date().isoformat()


def normalise_pathogen(value: Any) -> str:
    raw = str(value or "unknown").strip().lower()
    aliases = {"flu": "influenza", "influenza a": "influenza", "influenza b": "influenza",
               "sars-cov-2": "covid-19", "covid19": "covid-19", "rsv": "rsv"}
    return aliases.get(raw, raw or "unknown")


def base_observation(**overrides: Any) -> dict[str, Any]:
    record = {field: None for field in CANONICAL_FIELDS}
    record.update({"period_type": "week", "data_quality_flags": [], "ingested_at": utcnow()})
    record.update(overrides)
    return record


def quality_flags(record: dict[str, Any]) -> list[str]:
    flags = list(record.get("data_quality_flags") or [])
    if not record.get("observation_date"):
        flags.append("missing_date")
    if not record.get("location_id"):
        flags.append("missing_location")
    tests, positives, positivity = record.get("tests_completed"), record.get("positive_tests"), record.get("positivity_rate")
    if any(v is not None and v < 0 for v in [tests, positives]): flags.append("negative_count")
    if tests is not None and positives is not None and positives > tests: flags.append("positives_exceed_tests")
    if positivity is not None and not 0 <= positivity <= 1: flags.append("invalid_positivity")
    if not record.get("pathogen") or record["pathogen"] == "unknown": flags.append("unknown_pathogen")
    return sorted(set(flags))


def validate(records: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    result, seen = [], set()
    for raw in records:
        record = base_observation(**{key: raw.get(key) for key in CANONICAL_FIELDS if key in raw})
        for key in NUMERIC_FIELDS:
            record[key] = nullable_number(record.get(key))
        if record.get("positive_tests") is not None and record.get("tests_completed") not in (None, 0):
            record["positivity_rate"] = round(record["positive_tests"] / record["tests_completed"], 6)
        record["data_quality_flags"] = quality_flags(record)
        duplicate_key = (record.get("dataset_id"), record.get("location_id"), record.get("pathogen"), record.get("observation_date"))
        if duplicate_key in seen: record["data_quality_flags"].append("duplicate_observation")
        seen.add(duplicate_key)
        result.append(record)
    return result


class Adapter:
    dataset_id = "unknown"
    publisher = "Unknown"
    source_url = None
    transformation_version = "1.0.0"

    def provenance(self, path: str | Path) -> dict[str, Any]:
        p = Path(path)
        return {"dataset_id": self.dataset_id, "publisher": self.publisher, "source_url": self.source_url,
                "original_filename": p.name, "checksum_sha256": checksum(p), "retrieved_or_imported_at": utcnow(),
                "transformation_version": self.transformation_version}


def parse_yyyymmdd(value: Any) -> str | None:
    """Parse PHS integer dates such as 20221003. A bare pd.to_datetime on the integer reads it as nanoseconds."""
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return None
    parsed = pd.to_datetime(str(value).strip().split(".")[0], format="%Y%m%d", errors="coerce")
    return None if pd.isna(parsed) else parsed.date().isoformat()


PHS_PATHOGENS = {"Influenza (All)": "influenza", "Influenza A": "influenza-a", "Influenza B": "influenza-b",
                 "RSV": "rsv", "COVID-19": "covid-19"}
PHS_NATIONAL_CODE = "S92000003"
HEALTH_BOARD_CENTROIDS = ROOT / "configs/geo/scotland-health-board-centroids.json"


def phs_pathogen(value: Any) -> str:
    raw = str(value or "").strip()
    return PHS_PATHOGENS.get(raw) or raw.lower().replace(" (any type)", "").replace(" ", "-") or "unknown"


def health_board_centroids() -> dict[str, dict[str, Any]]:
    return json.loads(HEALTH_BOARD_CENTROIDS.read_text())["health_boards"]


def _phs_location(code: str, name: str, centroids: dict[str, dict[str, Any]]) -> dict[str, Any]:
    """Health Boards carry centroids for spatial corroboration; the national series stays separate and unmapped."""
    if code == PHS_NATIONAL_CODE or name == "Scotland":
        return {"location_id": PHS_NATIONAL_CODE, "location_name": "Scotland", "location_type": "country"}
    point = centroids.get(code, {})
    return {"location_id": code, "location_name": name, "location_type": "health_board",
            "latitude": point.get("latitude"), "longitude": point.get("longitude")}


class WHOFluNetAdapter(Adapter):
    dataset_id = "who-flunet-uganda"
    publisher = "World Health Organization"
    source_url = "https://www.who.int/teams/global-influenza-programme/surveillance-and-monitoring/flunet"
    transformation_version = "1.1.0"

    def transform(self, path: str | Path) -> list[dict[str, Any]]:
        if Path(path).suffix.lower() == ".csv":
            return self._transform_viw_fnt(path)
        frame = pd.read_excel(path, dtype=object)
        frame.columns = [str(c).strip() for c in frame.columns]
        frame = frame[frame.get("COUNTRY/AREA/TERRITORY", pd.Series(dtype=str)).astype(str).str.strip().eq("Uganda")]
        records = []
        for index, row in frame.iterrows():
            tests = nullable_number(row.get("SPEC_PROCESSED_NB"))
            positives = nullable_number(row.get("INF_ALL"))
            observation_date = iso_date(row.get("ISO_SDATE"))
            record = base_observation(
                source_id="who-flunet", dataset_id=self.dataset_id, location_id="UGA", location_name="Uganda",
                location_type="country", country="Uganda", region="Eastern Africa", observation_date=observation_date,
                iso_year=nullable_number(row.get("ISO_YEAR")), iso_week=nullable_number(row.get("ISO_WEEK")),
                pathogen="influenza", tests_ordered=nullable_number(row.get("SPEC_RECEIVED_NB")), tests_completed=tests,
                positive_tests=positives, source_record_id=f"flunet-uganda-{index}",
                data_quality_flags=[] if observation_date else ["missing_date"],
            )
            records.append(record)
        return validate(records)

    def _transform_viw_fnt(self, path: str | Path) -> list[dict[str, Any]]:
        """Sum the WHO FluNet origin sources (SENTINEL, NOTDEFINED) into one national row per ISO week."""
        frame = pd.read_csv(path, dtype={"ORIGIN_SOURCE": str})
        if "COUNTRY_CODE" in frame.columns:
            frame = frame[frame["COUNTRY_CODE"].astype(str).str.strip().eq("UGA")]
        required = {"ISO_YEAR", "ISO_WEEK", "ISO_WEEKSTARTDATE", "ORIGIN_SOURCE", "SPEC_PROCESSED_NB", "SPEC_RECEIVED_NB", "INF_ALL"}
        missing = required - set(frame.columns)
        if missing: raise ValueError(f"FluNet VIW_FNT schema missing required fields: {sorted(missing)}")
        records = []
        for (year, week), group in frame.groupby(["ISO_YEAR", "ISO_WEEK"], sort=True):
            flags = []
            if group["ORIGIN_SOURCE"].nunique() < 2: flags.append("single_origin_source")
            totals = {}
            for field in ["SPEC_PROCESSED_NB", "SPEC_RECEIVED_NB", "INF_ALL"]:
                values = [nullable_number(v) for v in group[field]]
                present = [v for v in values if v is not None]
                if len(present) < len(values): flags.append(f"null_{field.lower()}")
                totals[field] = sum(present) if present else None
            sources = "+".join(sorted(group["ORIGIN_SOURCE"].astype(str).unique()))
            records.append(base_observation(
                source_id="who-flunet", dataset_id=self.dataset_id, location_id="UGA", location_name="Uganda",
                location_type="country", country="Uganda", region="Eastern Africa",
                observation_date=iso_date(group["ISO_WEEKSTARTDATE"].iloc[0]), iso_year=int(year), iso_week=int(week),
                pathogen="influenza", tests_ordered=totals["SPEC_RECEIVED_NB"], tests_completed=totals["SPEC_PROCESSED_NB"],
                positive_tests=totals["INF_ALL"], source_record_id=f"flunet-uganda-{int(year)}-W{int(week):02d}-{sources}",
                data_quality_flags=flags))
        return validate(records)


class ScotlandCARIAdapter(Adapter):
    dataset_id = "phs-cari"
    publisher = "Public Health Scotland"
    source_url = "https://www.opendata.nhs.scot/"
    transformation_version = "1.1.0"

    def transform(self, path: str | Path) -> list[dict[str, Any]]:
        frame = pd.read_csv(path)
        required = {"WeekBeginning", "HBcode", "HBName", "Pathogen", "Tests", "Positives"}
        missing = required - set(frame.columns)
        if missing: raise ValueError(f"CARI schema missing required fields: {sorted(missing)}")
        for column, value in [("AgeGroup", "All ages"), ("Sex", "All sexes")]:
            if column in frame.columns: frame = frame[frame[column].astype(str).str.strip().eq(value)]
        frame = frame[~frame["HBName"].astype(str).str.strip().eq("Unknown")]
        centroids = health_board_centroids()
        rows = []
        for index, row in frame.iterrows():
            rows.append(base_observation(source_id="phs-cari", dataset_id=self.dataset_id,
                **_phs_location(str(row["HBcode"]), str(row["HBName"]), centroids), country="Scotland",
                observation_date=parse_yyyymmdd(row["WeekBeginning"]), iso_year=nullable_number(row.get("ISOYear")),
                iso_week=nullable_number(row.get("ISOWeek")), pathogen=phs_pathogen(row["Pathogen"]),
                tests_completed=nullable_number(row["Tests"]), positive_tests=nullable_number(row["Positives"]),
                source_record_id=f"cari-{row['HBcode']}-{row['WeekBeginning']}-{phs_pathogen(row['Pathogen'])}"))
        return validate(rows)


class ScotlandHealthBoardCasesAdapter(Adapter):
    dataset_id = "phs-health-board-cases"
    publisher = "Public Health Scotland"
    source_url = "https://www.opendata.nhs.scot/"
    transformation_version = "1.1.0"

    def transform(self, path: str | Path) -> list[dict[str, Any]]:
        frame = pd.read_csv(path)
        required = {"WeekBeginning", "HBcode", "HBName", "Pathogen", "NumberCasesPerWeek"}
        missing = required - set(frame.columns)
        if missing: raise ValueError(f"Health Board cases schema missing required fields: {sorted(missing)}")
        frame = frame[~frame["HBName"].astype(str).str.strip().eq("Unknown")]
        centroids = health_board_centroids()
        return validate(base_observation(source_id="phs-health-board-cases", dataset_id=self.dataset_id,
            **_phs_location(str(row["HBcode"]), str(row["HBName"]), centroids), country="Scotland",
            observation_date=parse_yyyymmdd(row["WeekBeginning"]), iso_year=nullable_number(row.get("ISOyear")),
            iso_week=nullable_number(row.get("ISOweek")), pathogen=phs_pathogen(row["Pathogen"]),
            positive_tests=nullable_number(row["NumberCasesPerWeek"]),
            source_record_id=f"phs-cases-{row['HBcode']}-{row['WeekBeginning']}-{phs_pathogen(row['Pathogen'])}")
            for _, row in frame.iterrows())


class SyntheticLabAdapter(Adapter):
    dataset_id = "synthetic-lab-network"
    publisher = "ProDrome synthetic benchmark generator"
    source_url = None

    def transform(self, path: str | Path) -> list[dict[str, Any]]:
        return validate(read_jsonl(path))


def generate_synthetic(seed: int = 20260927, weeks: int = 156) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Generate labelled, aggregate weekly laboratory observations; never production data."""
    rng = np.random.default_rng(seed)
    facilities = [
        ("synthetic-kampala", "Synthetic Kampala Laboratory", "Central", 0.3476, 32.5825),
        ("synthetic-gulu", "Synthetic Gulu Laboratory", "Northern", 2.7746, 32.2990),
        ("synthetic-mbarara", "Synthetic Mbarara Laboratory", "Western", -0.6072, 30.6545),
        ("synthetic-mbale", "Synthetic Mbale Laboratory", "Eastern", 1.0644, 34.1790),
        ("synthetic-arua", "Synthetic Arua Laboratory", "West Nile", 3.0201, 30.9111),
        ("synthetic-soroti", "Synthetic Soroti Laboratory", "Eastern", 1.7146, 33.6111),
    ]
    events = [
        {"event_id": "syn-volume-positivity", "event_type": "test_volume_and_positivity_increase", "location_id": "synthetic-gulu", "start_week": 92, "end_week": 100, "affected_variables": ["tests_completed", "positive_tests"]},
        {"event_id": "syn-operations", "event_type": "laboratory_operations_problem_no_infection_signal", "location_id": "synthetic-mbarara", "start_week": 112, "end_week": 121, "affected_variables": ["median_tat_hours", "backlog_count", "qc_failures"]},
        {"event_id": "syn-correlated", "event_type": "correlated_multi_location_anomaly", "location_id": "synthetic-mbale", "start_week": 132, "end_week": 141, "affected_variables": ["tests_completed", "positive_tests"]},
        {"event_id": "syn-correlated-arua", "event_type": "correlated_multi_location_anomaly", "location_id": "synthetic-arua", "start_week": 132, "end_week": 141, "affected_variables": ["tests_completed", "positive_tests"]},
        {"event_id": "syn-false-alarm", "event_type": "deliberately_injected_false_alarm", "location_id": "synthetic-soroti", "start_week": 72, "end_week": 73, "affected_variables": ["tests_completed"]},
        {"event_id": "syn-reporting-gap", "event_type": "reporting_gap", "location_id": "synthetic-kampala", "start_week": 145, "end_week": 147, "affected_variables": ["reporting_completeness"]},
    ]
    start = date(2023, 1, 2)
    observations = []
    for location_id, name, region, lat, lon in facilities:
        for week in range(weeks):
            seasonal = 1 + .24 * np.sin(2 * np.pi * week / 52)
            tests = max(2, round((130 + rng.normal(0, 10)) * seasonal))
            positivity = np.clip(.11 + .035 * np.sin(2*np.pi*(week-8)/52) + rng.normal(0, .012), .01, .55)
            tat, backlog, rejected, reagent, qc, completeness = 16 + rng.normal(0, 1.2), 4, 1, 100, 0, 1.0
            active = [e for e in events if e["location_id"] == location_id and e["start_week"] <= week <= e["end_week"]]
            for event in active:
                if event["event_type"] in {"test_volume_and_positivity_increase", "correlated_multi_location_anomaly"}: tests = round(tests * 1.75); positivity = min(.75, positivity + .2)
                if event["event_type"] == "laboratory_operations_problem_no_infection_signal": tat += 17; backlog += 55; qc += 7; reagent -= 35
                if event["event_type"] == "deliberately_injected_false_alarm": tests = round(tests * 2.2)
                if event["event_type"] == "reporting_gap": completeness = .35
            current = start + timedelta(weeks=week)
            year, iso_week, _ = current.isocalendar()
            observations.append(base_observation(source_id="synthetic-lab", dataset_id="synthetic-lab-network",
                location_id=location_id, location_name=name, location_type="synthetic_facility", country="Uganda",
                region=region, observation_date=current.isoformat(), iso_year=year, iso_week=iso_week, pathogen="influenza",
                tests_ordered=tests, tests_completed=tests, positive_tests=round(tests*positivity), median_tat_hours=round(tat,2),
                backlog_count=backlog, rejected_samples=rejected, reagent_consumption=reagent, qc_failures=qc,
                reporting_completeness=completeness, latitude=lat, longitude=lon, source_record_id=f"synthetic-{location_id}-{week}"))
    for event in events:
        event["event_start"] = (start + timedelta(weeks=event.pop("start_week"))).isoformat()
        event["event_end"] = (start + timedelta(weeks=event.pop("end_week"))).isoformat()
        event["pathogen"] = "influenza"; event["synthetic"] = True
    return validate(observations), events


def read_jsonl(path: str | Path) -> list[dict[str, Any]]:
    with open(path, encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def write_jsonl(path: str | Path, records: Iterable[dict[str, Any]]) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        for record in records: handle.write(json.dumps(record, sort_keys=True) + "\n")


def _features(row: dict[str, Any]) -> list[str]:
    return [f for f in ["tests_completed", "positive_tests", "positivity_rate", "median_tat_hours", "backlog_count", "rejected_samples", "reagent_consumption", "qc_failures", "reporting_completeness"] if row.get(f) is not None]


LOW_IS_ABNORMAL = {"reagent_consumption", "reporting_completeness"}
INDICATOR_DOMAINS = {
    "tests_completed": "testing_volume",
    "positive_tests": "testing_volume",
    "positivity_rate": "positivity",
    "median_tat_hours": "laboratory_workflow",
    "backlog_count": "laboratory_workflow",
    "rejected_samples": "specimen_quality",
    "reagent_consumption": "reagent_supply",
    "qc_failures": "laboratory_quality",
    "reporting_completeness": "reporting_quality",
}


def _independent_indicator_count(output: dict[str, Any]) -> int:
    return len({INDICATOR_DOMAINS.get(driver["metric"], driver["metric"]) for driver in output["drivers"]})


def _severity(risk_score: float, config: dict[str, Any], output: dict[str, Any]) -> str:
    """Keep HIGH for corroborated or sustained episodes, never a lone low-level signal."""
    policy = config.get("operational_alert_policy", {})
    high = config["severity_thresholds"]["high"]
    if risk_score >= high and (
        output["persistence"] >= policy.get("high_minimum_persistence", 1)
        or _independent_indicator_count(output) >= policy.get("high_minimum_indicators", 1)
        or output.get("spatial_corroboration", 0) >= policy.get("high_minimum_spatial_corroboration", 99)
    ):
        return "high"
    return "medium" if risk_score >= config["severity_thresholds"]["medium"] else "low"


def _operational_eligible(output: dict[str, Any], config: dict[str, Any]) -> bool:
    """Separate unusual measurements from alerts that merit human verification."""
    policy = config.get("operational_alert_policy", {})
    if output["risk_score"] < policy.get("minimum_risk_score", config["severity_thresholds"]["low"]):
        return False
    if not policy.get("require_combination", False):
        return True
    sustained = output["persistence"] >= policy.get("minimum_persistence", 2)
    multi_indicator = _independent_indicator_count(output) >= policy.get("minimum_abnormal_indicators", 2)
    spatial = output.get("spatial_corroboration", 0) >= policy.get("minimum_spatial_corroboration", 1)
    strong_single_signal = (
        output["persistence"] >= policy.get("strong_signal_persistence", 4)
        and output["risk_score"] >= policy.get("strong_signal_risk_score", .8)
    )
    persistent_reporting_gap = (
        "reporting_quality" in output.get("abnormal_indicator_domains", [])
        and output["persistence"] >= policy.get("reporting_quality_persistence", 99)
        and output["risk_score"] >= policy.get("reporting_quality_risk_score", 1.1)
    )
    return (sustained and (multi_indicator or spatial)) or strong_single_signal or persistent_reporting_gap


def alert_identifier(row: dict[str, Any], configuration_version: str) -> str:
    """Stable across reruns, so human reviews stay attached to the same alert."""
    key = "|".join(str(row.get(k)) for k in ["dataset_id", "location_id", "pathogen", "observation_date"])
    return "alert-" + hashlib.sha256(f"{key}|{configuration_version}".encode()).hexdigest()[:16]


def run_pipeline(records: list[dict[str, Any]], config_path: str | Path = ROOT / "configs/scoring/v2-balanced.json", as_of: str | None = None) -> dict[str, Any]:
    """Run chronological, no-future-data scoring. A row only uses earlier periods in its series."""
    config = json.loads(Path(config_path).read_text())
    filtered = [r for r in validate(records) if not as_of or (r.get("observation_date") or "") <= as_of]
    by_series: dict[tuple[str, str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in filtered: by_series[(row["dataset_id"], row["location_id"], row["pathogen"])].append(row)
    signals, alerts, outputs = [], [], []
    for _, rows in by_series.items():
        rows.sort(key=lambda r: r.get("observation_date") or "")
        persistence = 0
        for i, row in enumerate(rows):
            history = rows[max(0, i-config["rolling_window"]):i]
            available = _features(row)
            deviations, drivers = [], []
            for feature in available:
                values = [float(h[feature]) for h in history if h.get(feature) is not None]
                if len(values) < config["minimum_history_periods"]: continue
                median = float(np.median(values))
                mad = float(np.median(np.abs(np.array(values) - median)))
                scale = max(mad * 1.4826, abs(median) * .05, .01)
                direction = -1 if feature in LOW_IS_ABNORMAL else 1
                z = direction * (float(row[feature])-median)/scale
                if z >= config["z_score_threshold"]:
                    deviations.append(min(1.0, z/6)); drivers.append({"metric": feature, "observed": row[feature], "expected": round(median, 3), "z_score": round(z, 2)})
            cusum = 0.0
            if history and drivers:
                lead = drivers[0]["metric"]
                z_history = []
                for h in history:
                    vals = [float(k[lead]) for k in history if k.get(lead) is not None and k["observation_date"] < h["observation_date"]]
                    if len(vals) >= config["minimum_history_periods"] and h.get(lead) is not None:
                        med = np.median(vals); scale=max(np.median(np.abs(np.array(vals)-med))*1.4826,abs(med)*.05,.01); z_history.append(max(0,(float(h[lead])-med)/scale-.5))
                cusum = min(1.0, sum(z_history[-4:]) / config["cusum_threshold"])
            isolation = 0.0
            feature_list = [f for f in available if sum(1 for h in history if h.get(f) is not None) >= 24]
            # Refit on four-week checkpoints: this remains chronological and deterministic while
            # keeping replay practical for a local research workflow.
            if i % 4 == 0 and len(feature_list) >= 2 and len(history) >= 24 and all(h.get(f) is not None for h in history[-24:] for f in feature_list):
                matrix = np.array([[h[f] for f in feature_list] for h in history[-52:]])
                forest = config.get("isolation_forest", {})
                model = IsolationForest(n_estimators=forest.get("n_estimators", 25), contamination=forest.get("contamination", .1), random_state=20260927)
                model.fit(matrix); isolation = max(0.0, min(1.0, -float(model.score_samples([[row[f] for f in feature_list]])[0])-.35))/.25
            deviation = max(deviations, default=0.0); persistence = persistence + 1 if deviation else 0
            spatial = 0.0  # filled as a deliberately conservative same-period corroboration pass below
            quality = 1.0 if not row["data_quality_flags"] else .4
            weights=config["risk_weights"]
            risk = min(1.0, weights["deviation"]*deviation + weights["change"]*cusum + weights["multivariate"]*isolation + weights["persistence"]*min(1,persistence/3) + weights["data_quality"]*quality)
            result = {"observation": row, "risk_score": round(risk, 4), "drivers": drivers, "persistence": persistence,
                      "cusum": round(cusum,4), "isolation_forest_score": round(isolation,4), "features": feature_list}
            outputs.append(result)
    # Spatial corroboration: only rows with valid coordinates and multiple high signals in the same period.
    by_date=defaultdict(list)
    spatial_signal_risk = config.get("spatial_signal_risk", .3)
    for output in outputs:
        if output["risk_score"] >= spatial_signal_risk and output["drivers"] and output["observation"].get("latitude") is not None:
            by_date[output["observation"]["observation_date"]].append(output)
    for output in outputs:
        related=by_date[output["observation"]["observation_date"]]
        corroborating=max(0, len({o["observation"]["location_id"] for o in related})-1)
        if corroborating:
            output["risk_score"]=round(min(1,output["risk_score"]+config["risk_weights"]["spatial"]),4)
        output["spatial_corroboration"] = corroborating
        output["abnormal_indicator_domains"] = sorted({INDICATOR_DOMAINS.get(driver["metric"], driver["metric"]) for driver in output["drivers"]})
        output["anomaly_signal"] = bool(output["drivers"] and output["risk_score"] >= config["severity_thresholds"]["low"])
        output["operational_eligible"] = _operational_eligible(output, config)

    policy = config.get("operational_alert_policy", {})
    grouped = defaultdict(list)
    for output in outputs:
        row = output["observation"]
        grouped[(row["dataset_id"], row["location_id"], row["pathogen"])].append(output)
    for series_outputs in grouped.values():
        series_outputs.sort(key=lambda output: output["observation"]["observation_date"])
        active_episode = False
        quiet_periods = 0
        last_alert_index = -10_000
        for index, output in enumerate(series_outputs):
            if not output["operational_eligible"]:
                if active_episode:
                    quiet_periods += 1
                    if quiet_periods > policy.get("episode_gap_periods", 0):
                        active_episode = False
                continue
            quiet_periods = 0
            is_new_episode = not active_episode
            active_episode = True
            if policy.get("episode_grouping", False) and not is_new_episode:
                continue
            if index - last_alert_index <= policy.get("cooldown_periods", 0):
                continue
            row, drivers = output["observation"], output["drivers"]
            primary = drivers[0] if drivers else {"metric": "combined indicators", "observed": None, "expected": None}
            alert = {"alert_id": alert_identifier(row, config["version"]), "model_run_id": None, "dataset_id": row["dataset_id"], "location_id": row["location_id"], "location": row["location_name"], "pathogen": row["pathogen"], "start_date": row["observation_date"], "generated_date": utcnow(), "severity": _severity(output["risk_score"], config, output), "risk_score": output["risk_score"], "confidence_category": "moderate" if output["features"] else "low", "primary_driver": primary, "supporting_drivers": drivers[1:], "persistence": output["persistence"], "spatial_corroboration": output["spatial_corroboration"], "data_quality": row["data_quality_flags"], "verification_action": "Review laboratory and case surveillance data and request verification from the relevant surveillance team.", "status": "retrospective/model-generated", "mode": "SYNTHETIC" if row["dataset_id"].startswith("synthetic") else "RETROSPECTIVE"}
            alerts.append(alert)
            last_alert_index = index
    run_id=f"run-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}"
    for a in alerts: a["model_run_id"]=run_id
    return {"run_id":run_id,"model_version":"scoring-v2","configuration_version":config["version"],"created_at":utcnow(),"as_of":as_of,"records_scored":len(outputs),"alerts":alerts,"signals":outputs,"random_seed":20260927}


def evaluate(run: dict[str, Any], events: list[dict[str, Any]]) -> dict[str, Any]:
    """Evaluate operational-alert episodes; a labelled false-alarm scenario is a negative control."""
    alerts = run["alerts"]
    alertable_events = [event for event in events if event["event_type"] != "deliberately_injected_false_alarm"]
    matched_alert_ids, detected, delays = set(), 0, []
    for event in alertable_events:
        candidates = [alert for alert in alerts if alert["location_id"] == event["location_id"] and event["event_start"] <= alert["start_date"] <= event["event_end"] and alert["pathogen"] == event.get("pathogen")]
        if candidates:
            detected += 1
            first = min(candidates, key=lambda alert: alert["start_date"])
            matched_alert_ids.add(first["alert_id"])
            delays.append((pd.Timestamp(first["start_date"]) - pd.Timestamp(event["event_start"])).days)
    false_alerts = len(alerts) - len(matched_alert_ids)
    location_periods = len({(signal["observation"]["location_id"], signal["observation"]["observation_date"]) for signal in run["signals"]})
    mean_delay = round(float(np.mean(delays)), 2) if delays else None
    return {"evaluation_id": f"evaluation-{run['run_id']}", "dataset_id": "synthetic-lab-network", "model_run_id": run["run_id"], "configuration_version": run["configuration_version"], "labelled_scenarios": len(events), "ground_truth_events": len(alertable_events), "negative_control_scenarios": len(events) - len(alertable_events), "event_detection_rate": round(detected / len(alertable_events), 3) if alertable_events else None, "detected_events": detected, "missed_events": len(alertable_events) - detected, "generated_alerts": len(alerts), "total_operational_alerts": len(alerts), "false_alerts": false_alerts, "false_alerts_per_location_period": round(false_alerts / location_periods, 4) if location_periods else None, "alert_precision": round(len(matched_alert_ids) / len(alerts), 3) if alerts else None, "detection_delay_days": mean_delay, "mean_detection_delay_days": mean_delay, "median_detection_delay_days": round(float(np.median(delays)), 2) if delays else None, "limitations": "Synthetic benchmark metrics apply only to labelled simulated scenarios; the deliberately injected false-alarm scenario is a negative control and is not counted as a true operational event."}
