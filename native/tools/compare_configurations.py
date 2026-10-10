"""Execute two preprocessing configurations and retain their comparison."""

import argparse
import hashlib
import json
import math
import platform
import subprocess
import time
from pathlib import Path

from compare import compare, load

CONTRACTS = ("asl-imagenet-center-v1", "asl-rgb-bilinear-v1")


def write(path, value):
    with path.open("x", encoding="utf-8") as stream:
        stream.write(json.dumps(value, indent=2, allow_nan=False) + "\n")


def source_hashes(binary, manifest, model):
    """Stream the three execution inputs without retaining model bytes in memory."""
    hashes = {}
    for name, path in (("binary", binary), ("manifest", manifest), ("model", model)):
        with path.open("rb") as stream:
            hashes[name] = hashlib.file_digest(stream, "sha256").hexdigest()
    return hashes


def run(binary, manifest, model, model_sha, output, baseline, candidate, timeout=300):
    if baseline not in CONTRACTS or candidate not in CONTRACTS:
        raise ValueError("unknown preprocessing contract")
    if not math.isfinite(timeout) or timeout <= 0:
        raise ValueError("timeout must be finite and positive")
    binary, manifest, model = (Path(p).resolve() for p in (binary, manifest, model))
    output = Path(output).resolve()
    sources = source_hashes(binary, manifest, model)
    output.mkdir()
    plan = {
        "schema": "asl-executed-comparison-v1",
        "binary_sha256": sources["binary"],
        "source_sha256": sources,
        "host": platform.platform(),
        "model_sha256": model_sha,
        "baseline": baseline,
        "candidate": candidate,
        "timeout_per_run_seconds": timeout,
        "atol": 1e-6,
        "rtol": 1e-6,
        "scope": "actual inference executions; no accuracy labels",
    }
    write(output / "plan.json", plan)
    executions = []
    active = "baseline"
    try:
        if sources["model"] != model_sha:
            raise ValueError("model SHA-256 mismatch before execution")
        for active, contract in (("baseline", baseline), ("candidate", candidate)):
            if source_hashes(binary, manifest, model) != sources:
                raise ValueError("execution inputs changed before " + active)
            command = [
                str(binary),
                "run",
                str(manifest),
                "--model",
                str(model),
                "--model-sha",
                model_sha,
                "--preprocessing",
                contract,
                "--out",
                str(output / (active + ".jsonl")),
            ]
            start = time.perf_counter()
            with (
                (output / (active + ".stdout.txt")).open("x") as stdout,
                (output / (active + ".stderr.txt")).open("x") as stderr,
            ):
                process = subprocess.run(
                    command, stdout=stdout, stderr=stderr, timeout=timeout, check=False
                )
            execution = {
                "release": active,
                "wall_seconds": time.perf_counter() - start,
                "returncode": process.returncode,
                "output_residue": [
                    active + ".jsonl" + suffix
                    for suffix in (".partial", ".lock")
                    if (output / (active + ".jsonl" + suffix)).exists()
                    or (output / (active + ".jsonl" + suffix)).is_symlink()
                ],
            }
            write(output / (active + ".execution.json"), execution)
            executions.append(execution)
            if process.returncode:
                raise ValueError(f"{active} execution failed; see retained stderr")
            if execution["output_residue"]:
                raise ValueError(
                    f"{active} output cleanup incomplete; preserved partial/lock evidence"
                )
            if source_hashes(binary, manifest, model) != sources:
                raise ValueError("execution inputs changed during " + active)
        records = {
            name: load(output / (name + ".jsonl")) for name in ("baseline", "candidate")
        }
        for name, contract in (("baseline", baseline), ("candidate", candidate)):
            if any(
                row["recording_sha256"] != sources["manifest"]
                or row["model_sha256"] != sources["model"]
                or row["preprocessing"] != contract
                for row in records[name]
            ):
                raise ValueError("saved records differ from planned inputs: " + name)
        comparison = compare(
            records["baseline"],
            records["candidate"],
            atol=plan["atol"],
            rtol=plan["rtol"],
        )
        if comparison["missing"] or comparison["extra"] or comparison["reordered"] or any(
            set(row["identity_differences"]) - {"preprocessing"}
            for row in comparison["frames"]
        ):
            # Preserve the actual differences as diagnostic evidence, not a valid
            # controlled preprocessing comparison.
            write(output / "comparison.json", comparison)
            raise ValueError("comparison contains unplanned input or execution identities")
        report = {
            "schema": plan["schema"],
            "execution_scope": plan["scope"],
            "executions": executions,
            "comparison": comparison,
            "timing_scope": "whole subprocess wall including startup and serialization",
            "cpu_seconds": None,
            "peak_rss": None,
        }
        write(output / "comparison.json", comparison)
        write(output / "report.json", report)
        return report
    except (
        OSError,
        ValueError,
        TypeError,
        KeyError,
        subprocess.TimeoutExpired,
    ) as error:
        write(
            output / "failed.json",
            {
                "release": active,
                "error_type": type(error).__name__,
                "completed": executions,
            },
        )
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("binary", "manifest", "model", "output"):
        parser.add_argument(name, type=Path)
    parser.add_argument("--model-sha", required=True)
    parser.add_argument("--baseline", choices=CONTRACTS, default=CONTRACTS[0])
    parser.add_argument("--candidate", choices=CONTRACTS, default=CONTRACTS[1])
    parser.add_argument("--timeout", type=float, default=300)
    args = parser.parse_args()
    try:
        report = run(
            args.binary,
            args.manifest,
            args.model,
            args.model_sha,
            args.output,
            args.baseline,
            args.candidate,
            args.timeout,
        )
    except (
        OSError,
        ValueError,
        TypeError,
        KeyError,
        subprocess.TimeoutExpired,
    ) as error:
        parser.exit(2, f"configuration comparison failed: {error}\n")
    comparison = report["comparison"]
    print(
        json.dumps(
            {
                "report": str(args.output / "report.json"),
                "viewer_comparison": str(args.output / "comparison.json"),
                "changed_frames": len(comparison["changed_frames"]),
                "numerically_changed_frames": sum(
                    r["numerical_changed"] for r in comparison["frames"]
                ),
            }
        )
    )
    # A completed comparison succeeds even when the deliberately changed configuration differs.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
