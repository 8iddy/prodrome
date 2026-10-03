from analytics.core import ScotlandCARIAdapter, ScotlandHealthBoardCasesAdapter, WHOFluNetAdapter, evaluate, generate_synthetic, run_pipeline, validate


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


FLUNET_HEADER = "COUNTRY_CODE,ISO_WEEKSTARTDATE,ISO_YEAR,ISO_WEEK,ORIGIN_SOURCE,SPEC_PROCESSED_NB,SPEC_RECEIVED_NB,INF_ALL\n"


def test_flunet_csv_sums_origin_sources_per_iso_week(tmp_path):
    path = tmp_path / "flunet.csv"
    path.write_text(FLUNET_HEADER
        + "UGA,2024-01-01,2024,1,SENTINEL,40,42,5\n"
        + "UGA,2024-01-01,2024,1,NOTDEFINED,60,61,7\n"
        + "UGA,2024-01-08,2024,2,NOTDEFINED,50,50,\n"
        + "KEN,2024-01-08,2024,2,SENTINEL,999,999,999\n")
    records = WHOFluNetAdapter().transform(path)
    assert [r["observation_date"] for r in records] == ["2024-01-01", "2024-01-08"]
    first, second = records
    assert (first["tests_completed"], first["tests_ordered"], first["positive_tests"]) == (100, 103, 12)
    assert first["positivity_rate"] == 0.12
    assert first["data_quality_flags"] == []
    assert second["tests_completed"] == 50
    assert second["positive_tests"] is None
    assert {"single_origin_source", "null_inf_all"} <= set(second["data_quality_flags"])


CARI_HEADER = "Season,ISOYear,ISOWeek,WeekBeginning,WeekEnding,HBName,HBcode,Pathogen,Tests,Positives,TestPositivity\n"


def test_cari_parses_integer_dates_and_drops_unknown(tmp_path):
    path = tmp_path / "cari.csv"
    path.write_text(CARI_HEADER
        + "2022/2023,2022,40,20221003,20221009,NHS Fife,S08000029,Influenza (All),50,5,10.0%\n"
        + "2022/2023,2022,40,20221003,20221009,Scotland,S92000003,Influenza (All),900,90,10.0%\n"
        + "2022/2023,2022,40,20221003,20221009,Unknown,Unknown,Influenza (All),3,1,33.3%\n"
        + "2022/2023,2022,40,20221003,20221009,NHS Fife,S08000029,RSV,50,2,4.0%\n")
    records = ScotlandCARIAdapter().transform(path)
    assert {r["observation_date"] for r in records} == {"2022-10-03"}
    assert "Unknown" not in {r["location_name"] for r in records}
    fife = next(r for r in records if r["location_id"] == "S08000029" and r["pathogen"] == "influenza")
    assert fife["location_type"] == "health_board" and fife["latitude"] is not None
    national = next(r for r in records if r["location_name"] == "Scotland")
    assert national["location_type"] == "country" and national["latitude"] is None
    assert {r["pathogen"] for r in records} == {"influenza", "rsv"}


def test_health_board_cases_parse_integer_dates(tmp_path):
    path = tmp_path / "cases.csv"
    path.write_text("_id,Season,ISOyear,ISOweek,WeekBeginning,WeekEnding,Pathogen,HBcode,HBName,HBQF,NumberCasesPerWeek,RateCasesPerWeek,Population\n"
        + '1,2016/17,2016,40,20161003,20161009,Influenza (All),S08000015,NHS Ayrshire and Arran,"",3,0.8,369730\n'
        + "2,2016/17,2016,40,20161003,20161009,Influenza (All),S92000003,Scotland,d,40,0.7,5400000\n")
    records = ScotlandHealthBoardCasesAdapter().transform(path)
    assert [r["observation_date"] for r in records] == ["2016-10-03", "2016-10-03"]
    assert records[0]["positive_tests"] == 3
    assert records[1]["location_type"] == "country"


def test_alert_ids_are_stable_across_runs():
    records, _ = generate_synthetic()
    assert [a["alert_id"] for a in run_pipeline(records)["alerts"]] == [a["alert_id"] for a in run_pipeline(records)["alerts"]]
