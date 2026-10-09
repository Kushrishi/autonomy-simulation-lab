"""Snapshot-bound viewer input without an optional SDK or external dataset."""

import copy
import hashlib
import json
import sys
import tempfile
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
import kitti_adapter as adapter
import rerun_adapter as viewer
from compare import compare
from test_faults import record
from test_spatial_adapter import fixture


def main():
    with tempfile.TemporaryDirectory() as t:
        root = Path(t)
        seq, calib = fixture(root)
        manifest, spatial, _ = adapter.adapt(seq, calib, 2)
        source = manifest.read_bytes()
        rows = []
        for line in source.decode().splitlines()[1:]:
            frame, timestamp, _, image_sha = line.split("\t")
            row = record(frame, int(timestamp))
            row.update(
                input_sha256=image_sha,
                recording_sha256=hashlib.sha256(source).hexdigest(),
            )
            rows.append(row)
        results = root / "results.jsonl"
        results.write_text("".join(json.dumps(r) + "\n" for r in rows))
        identity, _, poses, _, images = viewer.prepare(manifest, results, spatial)
        assert identity == hashlib.sha256(source).hexdigest() and len(poses) == 2
        # Matching frame IDs alone cannot bind a highlight report to this replay.
        candidate = copy.deepcopy(rows)
        candidate[0]["output"][0] += 0.25
        report = compare(rows, candidate, atol=0, rtol=0)
        comparison = root / "comparison.json"
        comparison.write_text(json.dumps(report))
        assert viewer.prepare(manifest, results, comparison=comparison)[3] == {
            rows[0]["frame_id"]
        }
        candidate_results = root / "candidate.jsonl"
        candidate_results.write_text("".join(json.dumps(r) + "\n" for r in candidate))
        assert viewer.prepare(manifest, candidate_results, comparison=comparison)[3] == {
            rows[0]["frame_id"]
        }
        for fault in ("unbound", "stale", "string", "duplicate", "unknown", "object"):
            bad = copy.deepcopy(report)
            if fault == "unbound":
                del bad["result_identities"]
            elif fault == "stale":
                unrelated = copy.deepcopy(rows)
                unrelated[0]["latency_ms"]["total"] += 1
                bad = compare(unrelated, unrelated)
            elif fault == "string":
                bad["changed_frames"] = rows[0]["frame_id"]
            elif fault == "duplicate":
                bad["changed_frames"] *= 2
            elif fault == "unknown":
                bad["changed_frames"] = ["absent"]
            else:
                bad = []
            comparison.write_text(json.dumps(bad))
            try:
                viewer.prepare(manifest, results, comparison=comparison)
            except ValueError:
                pass
            else:
                raise AssertionError("unbound/malformed comparison accepted: " + fault)
        image = seq / "image_02/data/0000000000.png"
        original = image.read_bytes()
        image.write_bytes(b"replacement")
        assert images[0] == original  # export consumes snapshot, not this path
        try:
            viewer.prepare(manifest, results, spatial)
        except ValueError:
            pass
        else:
            raise AssertionError("changed input accepted")
        image.write_bytes(original)
        for fault in (
            "duplicate_manifest",
            "missing_result",
            "reordered",
            "missing_pose",
            "bad_position",
            "bad_skew",
            "wrong_manifest_hash",
        ):
            manifest.write_bytes(source)
            result_rows = json.loads(json.dumps(rows))
            pose_rows = [json.loads(x) for x in spatial.read_text().splitlines()]
            if fault == "duplicate_manifest":
                manifest.write_bytes(source + source.splitlines(keepends=True)[1])
            elif fault == "missing_result":
                result_rows.pop()
            elif fault == "reordered":
                result_rows.reverse()
            elif fault == "missing_pose":
                pose_rows.pop()
            elif fault == "bad_position":
                pose_rows[0]["position_enu_m"] = [float("nan"), 0, 0]
            elif fault == "bad_skew":
                pose_rows[0]["skew_ns"] = 7
            else:
                manifest.write_bytes(
                    source.replace(rows[0]["input_sha256"].encode(), b"0" * 64)
                )
                for row in result_rows:
                    row["recording_sha256"] = hashlib.sha256(
                        manifest.read_bytes()
                    ).hexdigest()
            results.write_text("".join(json.dumps(r) + "\n" for r in result_rows))
            pose_input = root / "poses.jsonl"
            pose_input.write_text("".join(json.dumps(r) + "\n" for r in pose_rows))
            try:
                viewer.prepare(manifest, results, pose_input)
            except ValueError:
                pass
            else:
                raise AssertionError("undetected viewer fault: " + fault)
        # SDK-facing boundary: init mutates the source after validation. Export
        # must still supply verified bytes, never a path that can be reopened.
        manifest.write_bytes(source)
        results.write_text("".join(json.dumps(r) + "\n" for r in rows))
        captured = []
        sdk = SimpleNamespace(
            init=lambda *a, **k: image.write_bytes(b"changed after prepare"),
            save=lambda output: None,
            set_time=lambda *a, **k: None,
            log=lambda *a, **k: None,
            EncodedImage=lambda *, contents, media_type: captured.append(contents),
            TextLog=lambda x: x,
            Scalars=lambda x: x,
            get_global_data_recording=lambda: SimpleNamespace(flush=lambda: None),
        )
        prior = sys.modules.get("rerun")
        sys.modules["rerun"] = sdk
        try:
            output = root / "viewer.rrd"
            viewer.export(manifest, results, output)
            assert captured[0] == original
            image.write_bytes(original)
            output.write_bytes(b"existing evidence")
            try:
                viewer.export(manifest, results, output)
            except FileExistsError:
                assert output.read_bytes() == b"existing evidence"
            else:
                raise AssertionError("existing viewer evidence overwritten")
        finally:
            if prior is None:
                del sys.modules["rerun"]
            else:
                sys.modules["rerun"] = prior
    print("viewer snapshots, coverage, metadata and comparison identity faults passed")


if __name__ == "__main__":
    main()
