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
      <h2>GNSS-Inspired Localization</h2>

      {sample ? (
        <>
          <div className="metric-row">
            <span>True position</span>
            <strong>{formatPosition(sample.truePosition)}</strong>
          </div>

          <div className="metric-row">
            <span>Noisy measured</span>
            <strong>{formatPosition(sample.measuredPosition)}</strong>
          </div>

          <div className="metric-row">
            <span>Smoothed estimate</span>
            <strong>{formatPosition(sample.estimatedPosition)}</strong>
          </div>

          <div className="metric-row">
            <span>Range LS estimate</span>
            <strong>{formatPosition(sample.rangeEstimatedPosition)}</strong>
          </div>

          <div className="metric-row">
            <span>Range observations</span>
            <strong>{sample.rangeObservations.length}</strong>
          </div>

          <div className="metric-row">
            <span>Smoothing error</span>
            <strong>{metrics.currentError.toFixed(3)}</strong>
          </div>

          <div className="metric-row">
            <span>Range LS error</span>
            <strong>{metrics.rangeCurrentError.toFixed(3)}</strong>
          </div>

          <div className="metric-row">
            <span>Smoothing RMSE</span>
            <strong>{metrics.rmse.toFixed(3)}</strong>
          </div>

          <div className="metric-row">
            <span>Range LS RMSE</span>
            <strong>{metrics.rangeRmse.toFixed(3)}</strong>
          </div>
        </>
      ) : (
        <p className="panel-note">
          Run the simulation to generate GNSS-inspired noisy measurements,
          beacon range observations, least-squares estimates, and localization
          error metrics.
        </p>
      )}

      <p className="panel-note">
        The measured position simulates noisy position fixes. The smoothed
        estimate applies simple temporal smoothing, while the range LS estimate
        uses beacon-style range observations and iterative least squares.
      </p>
    </section>
  );
}