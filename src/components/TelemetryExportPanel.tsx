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
        Export the current plan and observations through the displayed step.
        Replanning starts a new localization segment; previous segments are not
        retained. Planning time accumulates within an animation. Positions and
        errors use grid-cell units, and time uses simulation steps.
      </p>
    </section>
  );
}