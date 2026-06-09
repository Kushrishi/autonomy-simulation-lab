from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def load_json(json_path: Path) -> dict[str, Any]:
    if not json_path.exists():
        raise FileNotFoundError(f"Telemetry JSON file not found: {json_path}")

    with json_path.open("r", encoding="utf-8") as file:
        return json.load(file)


def summarize_payload(payload: dict[str, Any], source_file: Path) -> dict[str, Any]:
    metrics = payload.get("metrics", {})

    localization_samples = payload.get("localizationSamples", [])
    localization_errors = [
        sample.get("error", 0)
        for sample in localization_samples
        if sample.get("error") is not None
    ]

    average_error = (
        sum(localization_errors) / len(localization_errors)
        if localization_errors
        else 0
    )

    rmse = (
        (sum(error * error for error in localization_errors) / len(localization_errors))
        ** 0.5
        if localization_errors
        else 0
    )

    return {
        "file": source_file.name,
        "scenario": payload.get("scenarioName", "Unknown"),
        "algorithm": payload.get("algorithm", "Unknown"),
        "path_length": metrics.get("pathLength", 0),
        "nodes_visited": metrics.get("nodesVisited", 0),
        "runtime_ms": metrics.get("runtimeMs", 0),
        "localization_samples": len(localization_samples),
        "average_error": average_error,
        "rmse": rmse,
    }


def print_summary_table(rows: list[dict[str, Any]]) -> None:
    if not rows:
        print("No telemetry files were provided.")
        return

    headers = [
        "File",
        "Scenario",
        "Algorithm",
        "Path",
        "Visited",
        "Runtime ms",
        "Samples",
        "Avg error",
        "RMSE",
    ]

    print("\nPlanner Telemetry Comparison")
    print("=" * 120)
    print(
        f"{headers[0]:<32} "
        f"{headers[1]:<28} "
        f"{headers[2]:<10} "
        f"{headers[3]:>6} "
        f"{headers[4]:>8} "
        f"{headers[5]:>10} "
        f"{headers[6]:>8} "
        f"{headers[7]:>10} "
        f"{headers[8]:>10}"
    )
    print("-" * 120)

    for row in rows:
        print(
            f"{row['file']:<32} "
            f"{row['scenario']:<28} "
            f"{row['algorithm']:<10} "
            f"{row['path_length']:>6} "
            f"{row['nodes_visited']:>8} "
            f"{row['runtime_ms']:>10.3f} "
            f"{row['localization_samples']:>8} "
            f"{row['average_error']:>10.3f} "
            f"{row['rmse']:>10.3f}"
        )

    print("=" * 120)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Compare planner telemetry from exported simulator JSON files."
    )

    parser.add_argument(
        "json_paths",
        type=Path,
        nargs="+",
        help="One or more telemetry JSON files exported from the simulator.",
    )

    args = parser.parse_args()

    rows = [
        summarize_payload(load_json(json_path), json_path)
        for json_path in args.json_paths
    ]

    print_summary_table(rows)


if __name__ == "__main__":
    main()