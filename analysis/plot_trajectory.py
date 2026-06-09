from __future__ import annotations

import argparse
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd


def load_telemetry(csv_path: Path) -> pd.DataFrame:
    if not csv_path.exists():
        raise FileNotFoundError(f"Telemetry file not found: {csv_path}")

    dataframe = pd.read_csv(csv_path)

    required_columns = {
        "true_row",
        "true_col",
        "measured_row",
        "measured_col",
        "estimated_row",
        "estimated_col",
    }

    missing_columns = required_columns - set(dataframe.columns)

    if missing_columns:
        raise ValueError(
            "CSV is missing required columns: "
            + ", ".join(sorted(missing_columns))
        )

    return dataframe


def plot_trajectory(dataframe: pd.DataFrame, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    plt.figure(figsize=(9, 7))

    plt.plot(
        dataframe["true_col"],
        dataframe["true_row"],
        marker="o",
        label="True trajectory",
    )

    plt.plot(
        dataframe["measured_col"],
        dataframe["measured_row"],
        marker="x",
        linestyle="--",
        label="Measured GNSS-like trajectory",
    )

    plt.plot(
        dataframe["estimated_col"],
        dataframe["estimated_row"],
        marker="s",
        linestyle="-.",
        label="Estimated trajectory",
    )

    plt.gca().invert_yaxis()
    plt.title("Robot Trajectory: True vs Measured vs Estimated")
    plt.xlabel("Grid column")
    plt.ylabel("Grid row")
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(output_path, dpi=200)
    plt.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Plot true, measured, and estimated robot trajectories."
    )

    parser.add_argument(
        "csv_path",
        type=Path,
        help="Path to telemetry CSV exported from the simulator.",
    )

    parser.add_argument(
        "--output",
        type=Path,
        default=Path("analysis/output/trajectory_plot.png"),
        help="Output path for the generated plot.",
    )

    args = parser.parse_args()

    dataframe = load_telemetry(args.csv_path)
    plot_trajectory(dataframe, args.output)

    print(f"Saved trajectory plot to: {args.output}")


if __name__ == "__main__":
    main()