from analytics.core import WHOFluNetAdapter, evaluate, generate_synthetic, run_pipeline, validate


def test_canonical_validation_preserves_missing_not_zero():
    records = validate([{"dataset_id":"x", "source_id":"x", "location_id":"a", "location_name":"A", "pathogen":"influenza", "observation_date":"2025-01-06", "tests_completed":None, "positive_tests":None}])
    assert records[0]["tests_completed"] is None
    assert records[0]["positive_tests"] is None
    assert records[0]["positivity_rate"] is None


def test_synthetic_generation_is_deterministic_and_labelled():
    first, first_events = generate_synthetic(seed=17, weeks=55)
    second, second_events = generate_synthetic(seed=17, weeks=55)
    assert first == second
    assert first_events == second_events
    assert all(row["location_type"] == "synthetic_facility" for row in first)
    assert any(event["event_type"] == "deliberately_injected_false_alarm" for event in first_events)


def test_replay_does_not_use_future_rows():
    records, _ = generate_synthetic(seed=5, weeks=60)
    cutoff = records[240]["observation_date"]
    before = run_pipeline(records, as_of=cutoff)
    changed = [dict(row) for row in records]
    for row in changed:
        if row["observation_date"] > cutoff:
            row["tests_completed"] = 999999
            row["positive_tests"] = 999999
    after = run_pipeline(changed, as_of=cutoff)
    assert [(s["observation"]["source_record_id"], s["risk_score"]) for s in before["signals"]] == [(s["observation"]["source_record_id"], s["risk_score"]) for s in after["signals"]]


def test_operational_alerts_are_grouped_and_reject_the_single_dimension_control():
    records, events = generate_synthetic()
    run = run_pipeline(records)
    result = evaluate(run, events)
    assert len(run["alerts"]) == 5
    assert {alert["location_id"] for alert in run["alerts"]} == {
        "synthetic-kampala", "synthetic-gulu", "synthetic-mbarara", "synthetic-mbale", "synthetic-arua"
    }
    assert result["false_alerts"] == 0
    assert result["detected_events"] == 5


def test_flunet_adapter_maps_test_and_detection_fields():
    records = WHOFluNetAdapter().transform("data/Uganda FluNet data.xlsx")
    assert len(records) == 192
    assert records[0]["tests_completed"] == 173
    assert records[0]["positive_tests"] == 15
    assert records[0]["pathogen"] == "influenza"
