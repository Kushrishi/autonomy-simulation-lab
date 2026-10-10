"""Relocate an install and test inference with the original ORT folder unavailable.

Run after the build's other tests. The supplied ORT directory must be a disposable
CI/test dependency. It is restored in finally; no user recordings are accessed.
"""

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path


def main(build, ort_root):
    build = Path(build).resolve()
    ort_root = Path(ort_root).resolve()
    hidden = ort_root.with_name(ort_root.name + ".relocation-test-hidden")
    if hidden.exists():
        raise RuntimeError(f"Refusing to replace existing directory: {hidden}")
    with tempfile.TemporaryDirectory() as tmp:
        original = Path(tmp) / "install"
        relocated = Path(tmp) / "relocated install"
        subprocess.run(
            ["cmake", "--install", str(build), "--prefix", str(original)], check=True
        )
        original.rename(relocated)
        assert (relocated / "share/asl-replay/LICENSE").is_file()
        assert (relocated / "share/asl-replay/onnxruntime/LICENSE").is_file()
        assert (
            relocated / "share/asl-replay/onnxruntime/ThirdPartyNotices.txt"
        ).is_file()
        assert (relocated / "share/asl-replay/onnxruntime/VERSION_NUMBER").is_file()
        env = os.environ.copy()
        for key in (
            "LD_LIBRARY_PATH",
            "DYLD_LIBRARY_PATH",
            "DYLD_FALLBACK_LIBRARY_PATH",
        ):
            env.pop(key, None)
        ort_root.rename(hidden)
        try:
            subprocess.run(
                [
                    sys.executable,
                    str(Path(__file__).with_name("test_inference.py")),
                    str(relocated / "bin/asl-replay"),
                ],
                env=env,
                cwd=tmp,
                check=True,
            )
            # Exercise only installed tools/assets from an unrelated directory.
            output = Path(tmp) / "first-use"
            command = [sys.executable, str(relocated / "bin/asl-example"), str(output)]
            first = subprocess.run(
                command, env=env, cwd=tmp, check=True, capture_output=True, text=True
            )
            summary = json.loads(first.stdout)
            assert summary["exact_repeat_passed"] is True
            assert summary["detected_fault_frames"] == ["f0"]
            assert summary["executed_configuration_changed_frames"] == ["f0", "f1"]
            assert Path(summary["report"]).is_file()
            assert Path(summary["configuration_report"]).is_file()
            saved = json.loads(Path(summary["report"]).read_text())
            assert saved["executed_configuration_comparison"]["changed_frames"] == [
                "f0", "f1"
            ]
            again = subprocess.run(
                command, env=env, cwd=tmp, check=False, capture_output=True, text=True
            )
            assert again.returncode == 2 and "example failed" in again.stderr
            assert "Traceback" not in again.stderr
            # Continue from installed assets through actual two-configuration replay
            # and viewer preparation, without source-checkout imports or Rerun.
            tools = relocated / "share/asl-replay/tools"
            assets = relocated / "share/asl-replay"
            comparison_dir = Path(tmp) / "configuration comparison"
            subprocess.run(
                [
                    sys.executable,
                    str(tools / "compare_configurations.py"),
                    str(relocated / "bin/asl-replay"),
                    str(assets / "examples/synthetic/manifest.tsv"),
                    str(assets / "tests/fixtures/channel_means.onnx"),
                    str(comparison_dir),
                    "--model-sha",
                    "436aa6e3a86b7d5d82af06c55060eb0ca3d8ca07cc60879d05fcd39e446130a0",
                ],
                env=env,
                cwd=tmp,
                check=True,
                capture_output=True,
                text=True,
            )
            inspection = subprocess.run(
                [
                    sys.executable,
                    "-c",
                    "import sys; from pathlib import Path; sys.path.insert(0,sys.argv[1]); "
                    "from rerun_adapter import prepare; "
                    "x=prepare(Path(sys.argv[2]),Path(sys.argv[3]),comparison=Path(sys.argv[4])); "
                    "assert x[3]=={'f0','f1'}; assert len(x[1])==2; "
                    "assert 'rerun' not in sys.modules",
                    str(tools),
                    str(assets / "examples/synthetic/manifest.tsv"),
                    str(comparison_dir / "candidate.jsonl"),
                    str(comparison_dir / "comparison.json"),
                ],
                env=env,
                cwd=tmp,
                check=True,
                capture_output=True,
                text=True,
            )
            assert inspection.returncode == 0
            assert (assets / "docs/INSTALLED_RECORDING_WORKFLOW.md").is_file()
        finally:
            hidden.rename(ort_root)
    print(
        "Relocated install passed synthetic inference with original ONNX Runtime unavailable."
    )


if __name__ == "__main__":
    main(*sys.argv[1:])
