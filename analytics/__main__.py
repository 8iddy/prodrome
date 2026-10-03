from __future__ import annotations

import argparse
import json
from pathlib import Path

from .core import (ScotlandCARIAdapter, ScotlandHealthBoardCasesAdapter, SyntheticLabAdapter, WHOFluNetAdapter,
                   evaluate, generate_synthetic, read_jsonl, run_pipeline, write_jsonl)

ROOT = Path(__file__).resolve().parents[1]

def adapter_for(name: str):
    adapters={"flunet":WHOFluNetAdapter, "cari":ScotlandCARIAdapter, "scotland-cases":ScotlandHealthBoardCasesAdapter, "synthetic":SyntheticLabAdapter}
    return adapters[name]()

def main() -> None:
    parser=argparse.ArgumentParser(prog="python -m analytics", description="ProDrome reproducible surveillance analytics")
    sub=parser.add_subparsers(dest="command", required=True)
    inspect=sub.add_parser("inspect", help="inspect a recognised source file"); inspect.add_argument("file"); inspect.add_argument("--adapter", choices=["flunet","cari","scotland-cases","synthetic"], default="flunet")
    ingest=sub.add_parser("ingest", help="transform a source to canonical JSONL"); ingest.add_argument("file"); ingest.add_argument("--adapter", choices=["flunet","cari","scotland-cases","synthetic"], required=True); ingest.add_argument("--output", default="data/processed/observations.jsonl")
    synth=sub.add_parser("generate-synthetic", help="write deterministic labelled benchmark data"); synth.add_argument("--seed",type=int,default=20260927); synth.add_argument("--weeks",type=int,default=156); synth.add_argument("--output",default="data/synthetic/observations.jsonl"); synth.add_argument("--events",default="data/synthetic/events.json")
    replay=sub.add_parser("replay",help="run chronological no-leakage replay"); replay.add_argument("--dataset",required=True); replay.add_argument("--input",default="data/synthetic/observations.jsonl"); replay.add_argument("--as-of"); replay.add_argument("--output",default="public/analytics/latest-run.json")
    ev=sub.add_parser("evaluate",help="evaluate a labelled synthetic run"); ev.add_argument("--run",default="public/analytics/latest-run.json"); ev.add_argument("--events",default="data/synthetic/events.json"); ev.add_argument("--output",default="public/analytics/evaluation.json")
    benchmark=sub.add_parser("benchmark",help="evaluate versioned scoring candidates against labelled synthetic data"); benchmark.add_argument("--input",default="data/synthetic/observations.jsonl"); benchmark.add_argument("--events",default="data/synthetic/events.json"); benchmark.add_argument("--configs",nargs="+",required=True); benchmark.add_argument("--output",default="public/analytics/candidate-evaluation.json")
    sub.add_parser("build-datasets",help="rebuild the committed public/datasets artefacts from data/")
    export=sub.add_parser("export",help="copy a run artefact to JSON"); export.add_argument("--run",required=True); export.add_argument("--output",required=True)
    args=parser.parse_args()
    if args.command in {"inspect","ingest"}:
        adapter=adapter_for(args.adapter); records=adapter.transform(args.file)
        payload={"provenance":adapter.provenance(args.file),"record_count":len(records),"sample":records[:2]}
        if args.command=="inspect": print(json.dumps(payload,indent=2))
        else: write_jsonl(args.output,records); print(json.dumps({**payload,"output":args.output},indent=2))
    elif args.command=="generate-synthetic":
        records, events=generate_synthetic(args.seed,args.weeks); write_jsonl(args.output,records); Path(args.events).parent.mkdir(parents=True,exist_ok=True); Path(args.events).write_text(json.dumps(events,indent=2)); print(json.dumps({"observations":len(records),"events":len(events),"output":args.output},indent=2))
    elif args.command=="replay":
        records=[r for r in read_jsonl(args.input) if r["dataset_id"]==args.dataset]; run=run_pipeline(records,as_of=args.as_of); Path(args.output).parent.mkdir(parents=True,exist_ok=True); Path(args.output).write_text(json.dumps(run,indent=2)); print(json.dumps({"run_id":run["run_id"],"alerts":len(run["alerts"]),"output":args.output},indent=2))
    elif args.command=="evaluate":
        result=evaluate(json.loads(Path(args.run).read_text()),json.loads(Path(args.events).read_text())); Path(args.output).parent.mkdir(parents=True,exist_ok=True); Path(args.output).write_text(json.dumps(result,indent=2)); print(json.dumps(result,indent=2))
    elif args.command=="benchmark":
        records=read_jsonl(args.input); events=json.loads(Path(args.events).read_text()); results=[]
        for config in args.configs:
            run=run_pipeline(records,config_path=config); result=evaluate(run,events); result["config_path"]=config; results.append(result)
        payload={"dataset_id":"synthetic-lab-network","candidates":results}; Path(args.output).parent.mkdir(parents=True,exist_ok=True); Path(args.output).write_text(json.dumps(payload,indent=2)); print(json.dumps(payload,indent=2))
    elif args.command=="build-datasets":
        from .datasets import build_all
        print(json.dumps(build_all(),indent=2))
    else: Path(args.output).write_text(Path(args.run).read_text())
if __name__ == "__main__": main()
