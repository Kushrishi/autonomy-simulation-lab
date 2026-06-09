# Telemetry Analysis

This folder contains Python scripts for analyzing telemetry exported from the Autonomy Simulation Lab.

The browser simulator can export telemetry as CSV or JSON. These files can be used to analyze:

- Robot trajectory
- Noisy GNSS-like measured positions
- Smoothed estimated positions
- Localization error over time
- Planner metrics from JSON exports

## Setup

From the repository root, install the Python dependencies:

```bash
pip install -r analysis/requirements.txt
```

## Recommended Workflow

1. Run the simulator.
2. Click **Run Simulation**.
3. Export telemetry using **Export CSV** and/or **Export JSON**.
4. Move the exported files into:

```text
analysis/data/
```

5. Run the analysis scripts from the repository root.

## Plot Trajectory

```bash
python analysis/plot_trajectory.py analysis/data/YOUR_FILE.csv
```

This generates:

```text
analysis/output/trajectory_plot.png
```

## Plot Localization Error

```bash
python analysis/plot_localization_error.py analysis/data/YOUR_FILE.csv
```

This generates:

```text
analysis/output/localization_error_plot.png
```

## Compare Planner JSON Files

Export JSON files from different planners or scenarios, then run:

```bash
python analysis/compare_planners.py analysis/data/file1.json analysis/data/file2.json
```

This prints a planner comparison table in the terminal.