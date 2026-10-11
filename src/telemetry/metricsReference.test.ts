import { describe, expect, it } from "vitest";
import { buildLocalizationSamples, calculateLocalizationMetrics } from "../localization/localization";

describe("independent localization metric calculations", () => {
  it("matches direct position-distance calculations for every displayed prefix", () => {
    const samples = buildLocalizationSamples([{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 1 }], 0.35, 5, 5);
    for (let step = 0; step < samples.length; step++) {
      const m = calculateLocalizationMetrics(samples, step);
      const prefix = samples.slice(0, step + 1);
      const errors = prefix.map(s => Math.hypot(s.estimatedPosition.row - s.truePosition.row, s.estimatedPosition.col - s.truePosition.col));
      const ranges = prefix.map(s => Math.hypot(s.rangeEstimatedPosition.row - s.truePosition.row, s.rangeEstimatedPosition.col - s.truePosition.col));
      const kalman = prefix.map(s => Math.hypot(s.kalmanEstimatedPosition.row - s.truePosition.row, s.kalmanEstimatedPosition.col - s.truePosition.col));
      const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
      const rms = (values: number[]) => Math.sqrt(mean(values.map(x => x * x)));
      expect(m.sampleCount).toBe(prefix.length);
      expect(m.currentError).toBeCloseTo(errors.at(-1)!, 12);
      expect(m.averageError).toBeCloseTo(mean(errors), 12);
      expect(m.maxError).toBeCloseTo(Math.max(...errors), 12);
      expect(m.rmse).toBeCloseTo(rms(errors), 12);
      expect(m.rangeCurrentError).toBeCloseTo(ranges.at(-1)!, 12);
      expect(m.rangeAverageError).toBeCloseTo(mean(ranges), 12);
      expect(m.rangeRmse).toBeCloseTo(rms(ranges), 12);
      expect(m.kalmanCurrentError).toBeCloseTo(kalman.at(-1)!, 12);
      expect(m.kalmanAverageError).toBeCloseTo(mean(kalman), 12);
      expect(m.kalmanRmse).toBeCloseTo(rms(kalman), 12);
    }
  });
});
