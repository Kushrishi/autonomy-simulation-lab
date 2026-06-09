from __future__ import annotations

import argparse
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd


def load_telemetry(csv_path: Path) -> pd.DataFrame:
    if not csv_path.exists():
        raise FileNotFoundError(f"Telemetry file not found: {csv_path}")

    dataframe = pd.read_csv(csv_path)

    required_columns = {"step", "localization_error"}
    missing_columns = required_columns - set(dataframe.columns)

    if missing_columns:
        raise ValueError(
            "CSV is missing required columns: "
            + ", ".join(sorted(missing_columns))
        )

    return dataframe


def plot_localization_error(dataframe: pd.DataFrame, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    plt.figure(figsize=(9, 5))

    plt.plot(
        dataframe["step"],
        dataframe["localization_error"],
        marker="o",
        label="Localization error",
    )

    mean_error = dataframe["localization_error"].mean()
    rmse = (dataframe["localization_error"] ** 2).mean() ** 0.5

    plt.axhline(
        mean_error,
        linestyle="--",
        label=f"Mean error = {mean_error:.3f}",
    )

    plt.axhline(
        rmse,
        linestyle=":",
        label=f"RMSE = {rmse:.3f}",
    )

    plt.title("Localization Error Over Time")
    plt.xlabel("Simulation step")
    plt.ylabel("Position error")
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(output_path, dpi=200)
    plt.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Plot localization error over simulation steps."
    )

    parser.add_argument(
        "csv_path",
        type=Path,
        help="Path to telemetry CSV exported from the simulator.",
    )

    parser.add_argument(
        "--output",
        type=Path,
        default=Path("analysis/output/localization_error_plot.png"),
        help="Output path for the generated plot.",
    )

    args = parser.parse_args()

    dataframe = load_telemetry(args.csv_path)
    plot_localization_error(dataframe, args.output)

    print(f"Saved localization error plot to: {args.output}")


if __name__ == "__main__":
    main()