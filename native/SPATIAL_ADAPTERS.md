# Local sequence and viewer adapters

These adapters keep visualization and dataset-specific parsing outside the C++
core. They are tested with project-generated synthetic data. **A real KITTI
sequence has not yet been acquired or validated.**

## KITTI access boundary

Official raw-data source: https://www.cvlibs.net/datasets/kitti/raw_data.php
and policy: https://www.cvlibs.net/datasets/kitti/user_login.php.
Current official downloads require registration, purpose declaration and login.
Do not bypass this with mirrors. No account was created and no dataset was
downloaded in this implementation pass. Dataset terms remain the user's
responsibility at acquisition; raw data is never committed or packaged here.

Provisional first example: `2011_09_26_drive_0001_sync`, first 12 color-camera
`image_02` frames, matching OXTS records/timestamps and the date's calibration.
That identity is a plan, not an acquired/verified recording. Once lawfully
acquired, use the synchronized/rectified variant and run:

```bash
python3 native/tools/kitti_adapter.py /local/2011_09_26_drive_0001_sync /local/2011_09_26 --limit 12
```

The local adapter creates `asl-manifest.tsv`, `asl-spatial.jsonl` and a provenance
record inside the local sequence directory; existing outputs are never replaced.
Camera/OXTS counts must agree; each selected index has a finite 30-field OXTS
record. BOTH timestamps remain recorded. Maximum absolute skew defaults to a
declared 50 ms, configurable before analysis. Timestamps preserve nanoseconds;
their naive dataset clock is represented as UTC without claiming absolute UTC
accuracy. Missing, malformed, nonmonotonic or excessively skewed streams fail.

Position conversion is WGS84 latitude/longitude/altitude → ECEF → ENU at the
first pose, in metres. Roll/pitch/yaw remains separately recorded. This neither
estimates attitude nor fuses GNSS/IMU nor transforms pose into the camera frame.
Calibration files are structurally checked and hashed, not used to imply a
camera-to-world projection. Their names, timestamps, frame bytes and OXTS records
have local identities. Synthetic tests cover nanosecond precision, known vertical
offset, north displacement, missing pose, skew, nonfinite values and calibration.

## Rerun export

Pinned optional dependency: `rerun-sdk==0.38.1` (upstream Apache-2.0/MIT).
This adapter writes a local RRD; it neither spawns a GUI nor uploads data.

```bash
python3 native/tools/rerun_adapter.py recording.tsv baseline.jsonl output.rrd --spatial asl-spatial.jsonl --comparison comparison.json
rerun rrd verify output.rrd
```

Without spatial/comparison inputs, those channels are simply absent. The adapter
checks manifest/frame/result identity and timestamps, then logs camera images,
elapsed/frame timelines, top indices, latency and regression flags. Spatial data
adds ENU position and stream skew. A synthetic MobileNet replay export was
generated and reopened using the pinned CLI's RRD verification. No real-sequence
visualization or viewer interaction quality is claimed yet.

## MCAP and release boundary

Keep the transparent TSV manifest for this boundary. MCAP is a later adapter if
real users/interoperability justify it; replacing the working format now would
not answer a new engineering question. Native release readiness is assessed
separately. Real data and full spatial fault visualization remain next.
