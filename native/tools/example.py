"""Run the included synthetic recording twice and demonstrate a detected fault."""

import argparse
import json
import subprocess
from pathlib import Path

from compare import compare, load
from faults import inject

MODEL_SHA = "436aa6e3a86b7d5d82af06c55060eb0ca3d8ca07cc60879d05fcd39e446130a0"


def example(binary, output):
    binary, output = Path(binary).resolve(), Path(output)
    native = Path(__file__).resolve().parents[1]
    output.mkdir()  # Never overwrite a previous example/report.
    manifest = native / "examples/synthetic/manifest.tsv"
    model = native / "tests/fixtures/channel_means.onnx"
    for name in ("baseline", "candidate"):
        subprocess.run(
            [
                str(binary),
                "run",
                str(manifest),
                "--model",
                str(model),
                "--model-sha",
                MODEL_SHA,
                "--out",
                str(output / (name + ".jsonl")),
            ],
            check=True,
        )
    baseline = load(output / "baseline.jsonl")
    repeated = compare(baseline, load(output / "candidate.jsonl"), atol=0, rtol=0)
    fault = inject(
        output / "baseline.jsonl", output / "fault", "result", "numeric", delta=0.25
    )
    changed = compare(baseline, load(fault), atol=0, rtol=0)
    if repeated["changed_frames"] or not changed["changed_frames"]:
        raise ValueError("example expected exact repeat and detected numerical fault")
    report = {
        "schema": "asl-example-v1",
        "synthetic_only": True,
        "exact_repeat": repeated,
        "injected_fault": changed,
        "fault_scope": "record-only numerical perturbation; not a retrained model result",
    }
    (output / "report.json").write_text(
        json.dumps(report, indent=2, allow_nan=False) + "\n"
    )
    return report


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("binary", type=Path)
    p.add_argument("output", type=Path)
    a = p.parse_args()
    try:
        r = example(a.binary, a.output)
    except (ValueError, OSError, subprocess.CalledProcessError) as e:
        p.exit(2, f"example failed: {e}\n")
    print(
        json.dumps(
            {
                "exact_repeat_passed": not r["exact_repeat"]["changed_frames"],
                "fault_frames": r["injected_fault"]["changed_frames"],
                "report": str(a.output / "report.json"),
            }
        )
    )


if __name__ == "__main__":
    main()
