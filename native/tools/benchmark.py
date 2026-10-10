"""Bounded repeated replay harness; stage timings are host/workload observations."""

import argparse
import hashlib
import json
import os
import platform
import subprocess
import tempfile
import time
from pathlib import Path

from compare import compare, load, percentile


def measured_run(command, stdout_path, stderr_path):
    """Wait for this child only; prior children cannot inflate its RSS receipt."""
    if not hasattr(os, "wait4"):
        raise ValueError("per-child resource measurement requires Linux/macOS wait4")
    start = time.perf_counter()
    with stdout_path.open("x") as stdout, stderr_path.open("x") as stderr:
        process = subprocess.Popen(command, stdout=stdout, stderr=stderr)
        _, status, usage = os.wait4(process.pid, 0)
        process.returncode = os.waitstatus_to_exitcode(status)
    return {
        "returncode": process.returncode,
        "wall_seconds": time.perf_counter() - start,
        "child_cpu_seconds": usage.ru_utime + usage.ru_stime,
        "peak_child_rss_bytes": int(usage.ru_maxrss)
        * (1 if platform.system() == "Darwin" else 1024),
        "resource_scope": "wait4 for this native child only; includes initialization",
    }


def benchmark(
    binary,
    manifest,
    model,
    model_sha,
    repeats=3,
    preprocessing="asl-rgb-bilinear-v1",
    output=None,
):
    if not 2 <= repeats <= 20:
        raise ValueError("repeats must be 2..20")
    binary = Path(binary).resolve()
    binary_sha = hashlib.sha256(binary.read_bytes()).hexdigest()
    reports, rows = [], []
    temporary = (
        tempfile.TemporaryDirectory(prefix="asl-benchmark-") if output is None else None
    )
    directory = Path(temporary.name) if temporary else Path(output)
    if output is not None:
        directory.mkdir()
    try:
        for i in range(repeats):
            result = directory / f"run-{i}.jsonl"
            run = measured_run(
                [
                    str(Path(binary).resolve()),
                    "run",
                    str(Path(manifest).resolve()),
                    "--model",
                    str(Path(model).resolve()),
                    "--model-sha",
                    model_sha,
                    "--preprocessing",
                    preprocessing,
                    "--out",
                    str(result),
                ],
                directory / f"run-{i}.stdout.txt",
                directory / f"run-{i}.stderr.txt",
            )
            if hashlib.sha256(binary.read_bytes()).hexdigest() != binary_sha:
                raise ValueError("native executable changed during benchmark")
            wall = run["wall_seconds"]
            residue = [
                p.name
                for p in (Path(str(result) + ".partial"), Path(str(result) + ".lock"))
                if p.exists()
            ]
            (directory / f"run-{i}.resources.json").write_text(
                json.dumps({**run, "output_residue": residue}, indent=2) + "\n"
            )
            if run["returncode"] or residue:
                raise ValueError(
                    f"run {i} failed or left publication residue; preserve {directory}"
                )
            current = load(result)
            rows.append(current)
            summaries = {}
            for stage in ("verify", "decode", "preprocess", "inference", "total"):
                values = [r["latency_ms"][stage] for r in current]
                summaries[stage] = {
                    "p50_ms": percentile(values, 0.5),
                    "p95_ms": percentile(values, 0.95),
                }
            reports.append(
                {
                    **run,
                    "results_sha256": hashlib.sha256(result.read_bytes()).hexdigest(),
                    "wall_seconds": wall,
                    "frames": len(current),
                    "whole_command_frames_per_second": len(current) / wall,
                    "latency": summaries,
                }
            )
        differences = [compare(rows[0], r, atol=0, rtol=0) for r in rows[1:]]
    except BaseException as error:
        if output is not None:
            (directory / "failed.json").write_text(
                json.dumps(
                    {
                        "error_type": type(error).__name__,
                        "completed_runs": reports,
                        "automatic_retry": False,
                    },
                    indent=2,
                )
                + "\n"
            )
        raise
    finally:
        if temporary:
            temporary.cleanup()
    report = {
        "schema": "asl-benchmark-v2",
        "host": platform.platform(),
        "cpu": platform.processor(),
        "binary_sha256": binary_sha,
        "recording_sha256": rows[0][0]["recording_sha256"],
        "model_sha256": model_sha,
        "runtime": rows[0][0]["runtime"],
        "threads": rows[0][0]["threads"],
        "preprocessing": preprocessing,
        "runs": reports,
        "exact_repeat_passed": all(
            not r["changed_frames"]
            and not r["missing"]
            and not r["extra"]
            and not r["reordered"]
            for r in differences
        ),
        "peak_child_rss_bytes": max(run["peak_child_rss_bytes"] for run in reports),
        "retained_directory": str(directory.resolve()) if output is not None else None,
        "timing_boundary": "verify is per-frame bounded read/hash; total excludes startup and JSON serialization; whole-command wall includes initialization, validation and serialization. CPU/RSS are per native child via wait4; no universal throughput claim.",
    }
    if output is not None:
        (directory / "report.json").write_text(
            json.dumps(report, indent=2, allow_nan=False) + "\n"
        )
    return report


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("binary", type=Path)
    p.add_argument("manifest", type=Path)
    p.add_argument("model", type=Path)
    p.add_argument("--model-sha", required=True)
    p.add_argument("--repeats", type=int, default=3)
    p.add_argument("--preprocessing", default="asl-rgb-bilinear-v1")
    p.add_argument(
        "--output", type=Path, required=True, help="Fresh retained evidence directory"
    )
    a = p.parse_args()
    try:
        report = benchmark(
            a.binary,
            a.manifest,
            a.model,
            a.model_sha,
            a.repeats,
            a.preprocessing,
            a.output,
        )
    except (ValueError, OSError, KeyError) as e:
        p.exit(2, f"benchmark failed: {e}\n")
    print(json.dumps(report, indent=2, allow_nan=False))
    return 0 if report["exact_repeat_passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
