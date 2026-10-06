"""Bounded repeated replay harness; stage timings are host/workload observations."""

import argparse
import hashlib
import json
import platform
import resource
import subprocess
import tempfile
import time
from pathlib import Path

from compare import compare, load, percentile


def benchmark(
    binary, manifest, model, model_sha, repeats=3, preprocessing="asl-rgb-bilinear-v1"
):
    if not 2 <= repeats <= 20:
        raise ValueError("repeats must be 2..20")
    reports, rows = [], []
    with tempfile.TemporaryDirectory(prefix="asl-benchmark-") as temp:
        for i in range(repeats):
            result = Path(temp) / f"run-{i}.jsonl"
            start = time.perf_counter()
            run = subprocess.run(
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
                check=False,
                capture_output=True,
                text=True,
            )
            wall = time.perf_counter() - start
            if run.returncode:
                raise ValueError(run.stderr.strip())
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
                    "wall_seconds": wall,
                    "frames": len(current),
                    "whole_command_frames_per_second": len(current) / wall,
                    "latency": summaries,
                }
            )
        differences = [compare(rows[0], r, atol=0, rtol=0) for r in rows[1:]]
    return {
        "schema": "asl-benchmark-v1",
        "host": platform.platform(),
        "cpu": platform.processor(),
        "binary_sha256": hashlib.sha256(Path(binary).read_bytes()).hexdigest(),
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
        "peak_child_rss": resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss,
        "rss_unit": "bytes" if platform.system() == "Darwin" else "KiB",
        "timing_boundary": "verify is per-frame bounded read/hash; total excludes startup and JSON serialization; whole-command wall includes initialization, validation and serialization. RSS is child-process high-water on this harness host; no universal throughput claim.",
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("binary", type=Path)
    p.add_argument("manifest", type=Path)
    p.add_argument("model", type=Path)
    p.add_argument("--model-sha", required=True)
    p.add_argument("--repeats", type=int, default=3)
    p.add_argument("--preprocessing", default="asl-rgb-bilinear-v1")
    a = p.parse_args()
    try:
        report = benchmark(
            a.binary, a.manifest, a.model, a.model_sha, a.repeats, a.preprocessing
        )
    except (ValueError, OSError, KeyError) as e:
        p.exit(2, f"benchmark failed: {e}\n")
    print(json.dumps(report, indent=2, allow_nan=False))
    return 0 if report["exact_repeat_passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
