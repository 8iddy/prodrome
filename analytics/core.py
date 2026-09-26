from __future__ import annotations

import csv
import hashlib
import json
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable
from uuid import uuid4

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


class WHOFluNetAdapter(Adapter):
    dataset_id = "who-flunet-uganda"
    publisher = "World Health Organization"
    source_url = "https://www.who.int/teams/global-influenza-programme/surveillance-and-monitoring/flunet"

    def transform(self, path: str | Path) -> list[dict[str, Any]]:
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


class ScotlandCARIAdapter(Adapter):
    dataset_id = "phs-cari"
    publisher = "Public Health Scotland"
    source_url = "https://www.opendata.nhs.scot/"

    def transform(self, path: str | Path) -> list[dict[str, Any]]:
        frame = pd.read_csv(path)
        required = {"WeekBeginning", "HBcode", "HBName", "Pathogen", "Tests", "Positives"}
        missing = required - set(frame.columns)
        if missing: raise ValueError(f"CARI schema missing required fields: {sorted(missing)}")
        rows = []
        for index, row in frame.iterrows():
            rows.append(base_observation(source_id="phs-cari", dataset_id=self.dataset_id,
                location_id=str(row["HBcode"]), location_name=str(row["HBName"]), location_type="health_board",
                country="Scotland", observation_date=iso_date(row["WeekBeginning"]), iso_year=nullable_number(row.get("ISOYear")),
                iso_week=nullable_number(row.get("ISOWeek")), pathogen=normalise_pathogen(row["Pathogen"]),
                tests_completed=nullable_number(row["Tests"]), positive_tests=nullable_number(row["Positives"]),
                source_record_id=f"cari-{index}"))
        return validate(rows)


class ScotlandHealthBoardCasesAdapter(Adapter):
    dataset_id = "phs-health-board-cases"
    publisher = "Public Health Scotland"
    source_url = "https://www.opendata.nhs.scot/"

    def transform(self, path: str | Path) -> list[dict[str, Any]]:
        frame = pd.read_csv(path)
        required = {"WeekBeginning", "HBcode", "HBName", "Pathogen", "NumberCasesPerWeek"}
        missing = required - set(frame.columns)
        if missing: raise ValueError(f"Health Board cases schema missing required fields: {sorted(missing)}")
        return validate(base_observation(source_id="phs-health-board-cases", dataset_id=self.dataset_id,
            location_id=str(row["HBcode"]), location_name=str(row["HBName"]), location_type="health_board",
            country="Scotland", observation_date=iso_date(row["WeekBeginning"]), iso_year=nullable_number(row.get("ISOyear")),
            iso_week=nullable_number(row.get("ISOweek")), pathogen=normalise_pathogen(row["Pathogen"]),
            positive_tests=nullable_number(row["NumberCasesPerWeek"]), source_record_id=f"health-board-{index}")
            for index, row in frame.iterrows())


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
    return [f for f in ["tests_completed", "positive_tests", "positivity_rate", "median_tat_hours", "backlog_count", "rejected_samples", "reagent_consumption", "qc_failures"] if row.get(f) is not None]


def run_pipeline(records: list[dict[str, Any]], config_path: str | Path = ROOT / "configs/scoring/v1.json", as_of: str | None = None) -> dict[str, Any]:
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
                z = (float(row[feature])-median)/scale
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
                model = IsolationForest(n_estimators=25, contamination=.1, random_state=20260927)
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
    for output in outputs:
        if output["risk_score"] >= .3 and output["observation"].get("latitude") is not None: by_date[output["observation"]["observation_date"]].append(output)
    for output in outputs:
        related=by_date[output["observation"]["observation_date"]]
        corroborating=max(0, len({o["observation"]["location_id"] for o in related})-1)
        if corroborating:
            output["risk_score"]=round(min(1,output["risk_score"]+config["risk_weights"]["spatial"]),4)
        if output["risk_score"] >= config["severity_thresholds"]["low"]:
            severity="high" if output["risk_score"]>=config["severity_thresholds"]["high"] else "medium" if output["risk_score"]>=config["severity_thresholds"]["medium"] else "low"
            drivers=output["drivers"]
            primary=drivers[0] if drivers else {"metric":"combined indicators", "observed":None,"expected":None}
            alert={"alert_id":str(uuid4()),"model_run_id":None,"dataset_id":output["observation"]["dataset_id"],"location":output["observation"]["location_name"],"pathogen":output["observation"]["pathogen"],"start_date":output["observation"]["observation_date"],"generated_date":utcnow(),"severity":severity,"risk_score":output["risk_score"],"confidence_category":"moderate" if output["features"] else "low","primary_driver":primary,"supporting_drivers":drivers[1:],"persistence":output["persistence"],"spatial_corroboration":corroborating,"data_quality":output["observation"]["data_quality_flags"],"verification_action":"Review laboratory and case surveillance data and request verification from the relevant surveillance team.","status":"retrospective/model-generated","mode":"SYNTHETIC" if output["observation"]["dataset_id"].startswith("synthetic") else "RETROSPECTIVE"}
            alerts.append(alert)
    run_id=f"run-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}"
    for a in alerts: a["model_run_id"]=run_id
    return {"run_id":run_id,"model_version":"scoring-v1","configuration_version":config["version"],"created_at":utcnow(),"as_of":as_of,"records_scored":len(outputs),"alerts":alerts,"signals":outputs,"random_seed":20260927}


def evaluate(run: dict[str, Any], events: list[dict[str, Any]]) -> dict[str, Any]:
    alerts=run["alerts"]; matched=0; delays=[]
    for event in events:
        candidates=[a for a in alerts if a["location"] and a["start_date"] and event["event_start"] <= a["start_date"] <= event["event_end"] and a["pathogen"]==event.get("pathogen")]
        if candidates:
            matched += 1; delays.append((pd.Timestamp(min(a["start_date"] for a in candidates))-pd.Timestamp(event["event_start"])).days)
    false_alerts=max(0,len(alerts)-matched)
    return {"evaluation_id":f"evaluation-{run['run_id']}","dataset_id":"synthetic-lab-network","model_run_id":run["run_id"],"ground_truth_events":len(events),"event_detection_rate":round(matched/len(events),3) if events else None,"detected_events":matched,"generated_alerts":len(alerts),"false_alerts":false_alerts,"detection_delay_days":round(float(np.mean(delays)),2) if delays else None,"limitations":"Synthetic benchmark metrics apply only to labelled simulated scenarios; they are not evidence of real-world outbreak-detection performance."}
