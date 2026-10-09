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
            assert Path(summary["report"]).is_file()
            again = subprocess.run(
                command, env=env, cwd=tmp, check=False, capture_output=True, text=True
            )
            assert again.returncode == 2 and "example failed" in again.stderr
            assert "Traceback" not in again.stderr
        finally:
            hidden.rename(ort_root)
    print(
        "Relocated install passed synthetic inference with original ONNX Runtime unavailable."
    )


if __name__ == "__main__":
    main(*sys.argv[1:])
