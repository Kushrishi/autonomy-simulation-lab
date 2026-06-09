import type { Position, SimulationMetrics } from "../simulation/types";

type MetricsPanelProps = {
  metrics: SimulationMetrics;
  dynamicObstacleMode: boolean;
  replanCount: number;
  dynamicObstaclePosition: Position | null;
};

export default function MetricsPanel({
  metrics,
  dynamicObstacleMode,
  replanCount,
  dynamicObstaclePosition,
}: MetricsPanelProps) {
  const dynamicObstacleLabel = dynamicObstaclePosition
    ? `(${dynamicObstaclePosition.row}, ${dynamicObstaclePosition.col})`
    : "None";

  return (
    <section className="panel">
      <h2>Telemetry</h2>

      <div className="metric-row">
        <span>Status</span>
        <strong>{metrics.status}</strong>
      </div>

      <div className="metric-row">
        <span>Algorithm</span>
        <strong>{metrics.algorithm}</strong>
      </div>

      <div className="metric-row">
        <span>Path steps</span>
        <strong>{metrics.pathLength}</strong>
      </div>

      <div className="metric-row">
        <span>Nodes visited</span>
        <strong>{metrics.nodesVisited}</strong>
      </div>

      <div className="metric-row">
        <span>Current step</span>
        <strong>{metrics.currentStep}</strong>
      </div>

      <div className="metric-row">
        <span>Runtime</span>
        <strong>{metrics.runtimeMs.toFixed(2)} ms</strong>
      </div>

      <div className="metric-row">
        <span>Dynamic mode</span>
        <strong>{dynamicObstacleMode ? "on" : "off"}</strong>
      </div>

      <div className="metric-row">
        <span>Replans</span>
        <strong>{replanCount}</strong>
      </div>

      <div className="metric-row">
        <span>Dynamic obstacle</span>
        <strong>{dynamicObstacleLabel}</strong>
      </div>
    </section>
  );
}