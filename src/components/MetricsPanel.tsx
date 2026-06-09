import type { SimulationMetrics } from "../simulation/types";

type MetricsPanelProps = {
  metrics: SimulationMetrics;
};

export default function MetricsPanel({ metrics }: MetricsPanelProps) {
  return (
    <section className="panel">
      <h2>Telemetry</h2>

      <div className="metric-row">
        <span>Status</span>
        <strong>{metrics.status}</strong>
      </div>

      <div className="metric-row">
        <span>Path length</span>
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
    </section>
  );
}