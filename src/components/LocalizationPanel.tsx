import type {
  LocalizationMetrics,
  LocalizationSample,
} from "../simulation/types";

type LocalizationPanelProps = {
  sample?: LocalizationSample;
  metrics: LocalizationMetrics;
};

function formatPosition(position: { row: number; col: number }): string {
  return `(${position.row.toFixed(2)}, ${position.col.toFixed(2)})`;
}

export default function LocalizationPanel({
  sample,
  metrics,
}: LocalizationPanelProps) {
  return (
    <section className="panel">
      <h2>GNSS Localization</h2>

      {sample ? (
        <>
          <div className="metric-row">
            <span>True position</span>
            <strong>{formatPosition(sample.truePosition)}</strong>
          </div>

          <div className="metric-row">
            <span>Measured</span>
            <strong>{formatPosition(sample.measuredPosition)}</strong>
          </div>

          <div className="metric-row">
            <span>Estimated</span>
            <strong>{formatPosition(sample.estimatedPosition)}</strong>
          </div>

          <div className="metric-row">
            <span>Current error</span>
            <strong>{metrics.currentError.toFixed(3)}</strong>
          </div>

          <div className="metric-row">
            <span>Average error</span>
            <strong>{metrics.averageError.toFixed(3)}</strong>
          </div>

          <div className="metric-row">
            <span>Max error</span>
            <strong>{metrics.maxError.toFixed(3)}</strong>
          </div>

          <div className="metric-row">
            <span>RMSE</span>
            <strong>{metrics.rmse.toFixed(3)}</strong>
          </div>
        </>
      ) : (
        <p className="panel-note">
          Run the simulation to generate GNSS-like noisy measurements and
          localization error metrics.
        </p>
      )}

      <p className="panel-note">
        The measured position simulates noisy GNSS-style observations. The
        estimated position applies simple smoothing to reduce measurement noise.
      </p>
    </section>
  );
}