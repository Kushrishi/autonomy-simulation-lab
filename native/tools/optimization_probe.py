"""Prospective paired probe of one optional graph optimization on real inputs.

This is a host/workload observation, not a default-setting promotion or a
confidence interval. Every attempt and a failed comparison remain available.
"""

import argparse
import copy
import hashlib
import json
import platform
import statistics
from pathlib import Path

from benchmark import measured_run
from compare import compare, load

ORDER = ("disabled", "basic", "basic", "disabled", "disabled", "basic")


def digest(path):
    with Path(path).open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def equivalent(baseline, candidate):
    """Allow exactly the prospectively selected graph-level identity change."""
    if any(row["graph_optimization"] != "disabled" for row in baseline):
        raise ValueError("baseline graph level differs")
    if any(row["graph_optimization"] != "basic" for row in candidate):
        raise ValueError("candidate graph level differs")
    normalized = copy.deepcopy(candidate)
    for row in normalized:
        row["graph_optimization"] = "disabled"
    report = compare(baseline, normalized, atol=1e-6, rtol=1e-6)
    return {
        "passed": not any(
            report[key] for key in ("missing", "extra", "reordered", "changed_frames")
        ),
        "allowed_identity_change": "graph_optimization: disabled -> basic",
        "comparison": report,
    }


def probe(binary, manifest, model, model_sha, output):
    binary, manifest, model = (
        Path(path).resolve() for path in (binary, manifest, model)
    )
    output = Path(output)
    identities = {
        "binary": digest(binary),
        "manifest": digest(manifest),
        "model": digest(model),
    }
    if identities["model"] != model_sha:
        raise ValueError("prospective model hash differs")
    output.mkdir()
    protocol = {
        "schema": "asl-graph-probe/1",
        "host": platform.platform(),
        "source_identities": identities,
        "order": ORDER,
        "atol": 1e-6,
        "rtol": 1e-6,
        "top_indices": "exact",
        "all_other_record_identities": "exact; ordered complete frame set",
        "speed_acceptance": "all three adjacent basic walls below disabled; median paired wall reduction >= 5%; equivalence required",
        "automatic_retry": False,
        "default_promotion": False,
        "scope": "one host, binary, recording and model; uncontrolled cache/scheduling; no comparison with historical FPS",
    }
    (output / "protocol.json").write_text(json.dumps(protocol, indent=2) + "\n")
    runs, records = [], []
    try:
        for index, level in enumerate(ORDER):
            result = output / f"run-{index}-{level}.jsonl"
            command = [
                str(binary),
                "run",
                str(manifest),
                "--model",
                str(model),
                "--model-sha",
                model_sha,
                "--graph-optimization",
                level,
                "--out",
                str(result),
            ]
            measured = measured_run(
                command,
                output / f"run-{index}.stdout.txt",
                output / f"run-{index}.stderr.txt",
            )
            run = {**measured, "level": level, "command": command}
            (output / f"run-{index}.resources.json").write_text(
                json.dumps(run, indent=2) + "\n"
            )
            runs.append(run)
            if measured["returncode"] or any(
                Path(str(result) + suffix).exists() for suffix in (".lock", ".partial")
            ):
                raise ValueError(
                    "child failed or output publication incomplete; no retry"
                )
            if identities != {
                "binary": digest(binary),
                "manifest": digest(manifest),
                "model": digest(model),
            }:
                raise ValueError("prospective input or executable changed")
            current = load(result)
            run["results_sha256"] = digest(result)
            run["frames"] = len(current)
            run["stage_sum_ms"] = {
                stage: sum(row["latency_ms"][stage] for row in current)
                for stage in ("verify", "decode", "preprocess", "inference", "total")
            }
            records.append(current)
        pairs = []
        for start in (0, 2, 4):
            base, candidate = sorted(
                (start, start + 1), key=lambda i: runs[i]["level"] == "basic"
            )
            pairs.append(
                {
                    "baseline_run": base,
                    "candidate_run": candidate,
                    "wall_reduction_fraction": 1
                    - runs[candidate]["wall_seconds"] / runs[base]["wall_seconds"],
                    "equivalence": equivalent(records[base], records[candidate]),
                }
            )
        repeats = []
        for level in ("disabled", "basic"):
            indices = [i for i, row in enumerate(runs) if row["level"] == level]
            for index in indices[1:]:
                check = compare(records[indices[0]], records[index], atol=0, rtol=0)
                repeats.append(
                    not any(
                        check[key]
                        for key in ("missing", "extra", "reordered", "changed_frames")
                    )
                )
        reductions = [pair["wall_reduction_fraction"] for pair in pairs]
        numerical = all(pair["equivalence"]["passed"] for pair in pairs) and all(
            repeats
        )
        report = {
            "protocol_sha256": digest(output / "protocol.json"),
            "runs": runs,
            "pairs": pairs,
            "exact_within_configuration_repeats": all(repeats),
            "numerical_acceptance_passed": numerical,
            "median_paired_wall_reduction_fraction": statistics.median(reductions),
            "speed_acceptance_passed": numerical
            and min(reductions) > 0
            and statistics.median(reductions) >= 0.05,
            "default_promotion": False,
        }
        (output / "report.json").write_text(
            json.dumps(report, indent=2, allow_nan=False) + "\n"
        )
        return report
    except BaseException as error:
        (output / "failed.json").write_text(
            json.dumps(
                {
                    "error_type": type(error).__name__,
                    "error": str(error),
                    "runs": runs,
                    "automatic_retry": False,
                },
                indent=2,
            )
            + "\n"
        )
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("binary", "manifest", "model", "output"):
        parser.add_argument(name, type=Path)
    parser.add_argument("--model-sha", required=True)
    args = parser.parse_args()
    report = probe(args.binary, args.manifest, args.model, args.model_sha, args.output)
    print(
        json.dumps(
            {
                key: value
                for key, value in report.items()
                if key not in ("runs", "pairs")
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
