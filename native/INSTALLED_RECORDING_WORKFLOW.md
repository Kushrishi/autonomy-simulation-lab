# Compare a recording and inspect changed frames

This workflow uses the installed C++ runner and Python tools. It executes two
preprocessing configurations on the same recording, preserves both results and
opens the candidate's changed frames in an optional local viewer. A change is not
necessarily an accuracy regression: no ground-truth class labels are used.

## Inputs and installation

Follow `USABILITY.md` to build and install with bundled ONNX Runtime. Set an
absolute installation prefix and paths to your authorized local recording and
model. The selected short sequence must fit the viewer's 256 MiB aggregate
encoded-image bound. This does not download a dataset or model.

```bash
ASL_PREFIX=/absolute/path/to/install
ASL_SEQUENCE=/absolute/path/to/2011_09_26_drive_0001_sync
ASL_CALIBRATION=/absolute/path/to/2011_09_26
ASL_MODEL=/absolute/path/to/model.onnx
ASL_MODEL_SHA=replace_with_the_verified_model_sha256
ASL_OUTPUT=/absolute/path/to/new-comparison
ASL_TOOLS="$ASL_PREFIX/share/asl-replay/tools"
```

Use the pinned supported model and hash from `INFERENCE.md` in the repository,
or a compatible model you have independently verified. Native replay validates
model identity and tensor shape. Do not present the bundled channel-mean fixture
as a perception model.

## Import once, then execute the comparison

If the retained recording already has `asl-manifest.tsv` and `asl-spatial.jsonl`,
reuse them and skip import. Otherwise:

```bash
python3 "$ASL_TOOLS/kitti_adapter.py" "$ASL_SEQUENCE" "$ASL_CALIBRATION" --limit 1000
```

For the documented 108-frame sequence, this imports every frame. The adapter
refuses existing outputs and validates image/OXTS inventory, timestamps and
calibration. Keep source and generated dataset files private.

Run the two configurations once:

```bash
python3 "$ASL_TOOLS/compare_configurations.py" \
  "$ASL_PREFIX/bin/asl-replay" "$ASL_SEQUENCE/asl-manifest.tsv" \
  "$ASL_MODEL" "$ASL_OUTPUT" --model-sha "$ASL_MODEL_SHA" \
  --baseline asl-imagenet-center-v1 --candidate asl-rgb-bilinear-v1 --timeout 300
```

The output directory must be new. Each subprocess has its own 300-second limit.
A setup/runtime failure exits 2 and retains completed execution records and logs.
A completed comparison exits 0 even when outputs differ. Inspect `report.json`
for actual whole-subprocess wall times and numerical versus configuration
changes. CPU and peak RSS remain unknown in this workflow. `comparison.json`
contains the input-bound comparison expected by the viewer; do not manually
edit its changed-frame list.

## Inspect without repeating inference

Install the optional viewer into your chosen Python environment:

```bash
python3 -m pip install rerun-sdk==0.38.1
python3 "$ASL_TOOLS/rerun_adapter.py" \
  "$ASL_SEQUENCE/asl-manifest.tsv" "$ASL_OUTPUT/candidate.jsonl" \
  "$ASL_OUTPUT/candidate.rrd" --spatial "$ASL_SEQUENCE/asl-spatial.jsonl" \
  --comparison "$ASL_OUTPUT/comparison.json"
rerun rrd verify "$ASL_OUTPUT/candidate.rrd"
rerun "$ASL_OUTPUT/candidate.rrd"
```

The exporter verifies exact frame coverage, bytes, timestamps and comparison
identity before writing the RRD. It does not execute the model. The viewer is
local; export does not upload data. Each RRD destination must be new.

Use the `frame` timeline. The `regression/changed` channel marks frames whose
outputs or identities differ; compare its IDs with `comparison.json`. Inspect
camera imagery, top output indices, inference/total latency, ENU position and
camera/OXTS skew at the same frame. The marker includes configuration changes,
so it is not synonymous with numerical change or reduced model accuracy.
To inspect the baseline, export `baseline.jsonl` to a separate RRD using the
same comparison. Both sides are bound by their complete saved-record digests.

Human acceptance remains separate: scrub and step through beginning, middle
and end, check panel readability and synchronization, and close/reopen the
recording. Record pass/fail/not-tested for each task from `USABILITY.md`.
Headless export, SDK validation and automated checks do not certify usability.

## What has been verified

The relocated installation test runs both configurations on the bundled synthetic
recording with the original ONNX Runtime directory unavailable, then validates
candidate-to-comparison viewer preparation using installed tools only. It needs
no Rerun dependency for that boundary check. The subsequent [installed real-recording validation](INSTALLED_RECORDING_VALIDATION_2026_10_10.md)
executed both configurations on all 108 recovered real frames, exported and
verified the candidate recording, and prepared its viewer layout. Human desktop
acceptance remains pending.
