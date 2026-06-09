import type {
  LocalizationSample,
  PlannerName,
  Position,
  Scenario,
  SimulationMetrics,
} from "../simulation/types";
import {
  downloadTelemetryCsv,
  downloadTelemetryJson,
} from "../telemetry/exportTelemetry";

type TelemetryExportPanelProps = {
  scenario: Scenario;
  algorithm: PlannerName;
  metrics: SimulationMetrics;
  path: Position[];
  visited: Position[];
  localizationSamples: LocalizationSample[];
};

export default function TelemetryExportPanel({
  scenario,
  algorithm,
  metrics,
  path,
  visited,
  localizationSamples,
}: TelemetryExportPanelProps) {
  const hasTelemetry = path.length > 0;

  const exportInput = {
    scenario,
    algorithm,
    metrics,
    path,
    visited,
    localizationSamples,
  };

  return (
    <section className="panel">
      <h2>Telemetry Export</h2>

      <div className="export-buttons">
        <button
          className="secondary-button"
          disabled={!hasTelemetry}
          onClick={() => downloadTelemetryJson(exportInput)}
        >
          Export JSON
        </button>

        <button
          className="secondary-button"
          disabled={!hasTelemetry}
          onClick={() => downloadTelemetryCsv(exportInput)}
        >
          Export CSV
        </button>
      </div>

      <p className="panel-note">
        Export planner, path, visited-cell, and localization telemetry for
        external analysis in Python or spreadsheet tools.
      </p>
    </section>
  );
}