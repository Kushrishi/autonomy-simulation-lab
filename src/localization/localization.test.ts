import { describe, expect, it } from "vitest";
import {
  buildLocalizationSamples,
  buildRangeObservations,
  calculateLocalizationMetrics,
  createDefaultBeacons,
  estimatePositionFromRanges,
} from "./localization";
import type { ContinuousPosition, Position } from "../simulation/types";

function distance(a: ContinuousPosition, b: ContinuousPosition): number {
  const rowDifference = a.row - b.row;
  const colDifference = a.col - b.col;

  return Math.sqrt(rowDifference * rowDifference + colDifference * colDifference);
}

describe("localization validation", () => {
  it("creates one localization sample for each path position", () => {
    const path: Position[] = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ];

    const samples = buildLocalizationSamples(path);

    expect(samples).toHaveLength(path.length);
    expect(samples[0].step).toBe(0);
    expect(samples[1].step).toBe(1);
    expect(samples[2].step).toBe(2);
  });

  it("adds range and Kalman estimates to each sample", () => {
    const path: Position[] = [
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 1, col: 3 },
    ];

    const samples = buildLocalizationSamples(path, 0.35, 5, 5);

    expect(samples[0].rangeObservations).toHaveLength(4);
    expect(samples[0].rangeEstimatedPosition).toBeDefined();
    expect(samples[0].rangeError).toBeGreaterThanOrEqual(0);
    expect(samples[0].kalmanEstimatedPosition).toBeDefined();
    expect(samples[0].kalmanError).toBeGreaterThanOrEqual(0);
  });

  it("calculates RMSE from smoothing, range least-squares, and Kalman errors correctly", () => {
    const path: Position[] = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
    ];

    const samples = buildLocalizationSamples(path);
    const metrics = calculateLocalizationMetrics(samples, samples.length - 1);

    const expectedRmse = Math.sqrt(
      samples.reduce((sum, sample) => sum + sample.error * sample.error, 0) /
        samples.length
    );

    const expectedRangeRmse = Math.sqrt(
      samples.reduce(
        (sum, sample) => sum + sample.rangeError * sample.rangeError,
        0
      ) / samples.length
    );

    const expectedKalmanRmse = Math.sqrt(
      samples.reduce(
        (sum, sample) => sum + sample.kalmanError * sample.kalmanError,
        0
      ) / samples.length
    );

    expect(metrics.sampleCount).toBe(samples.length);
    expect(metrics.rmse).toBeCloseTo(expectedRmse, 8);
    expect(metrics.rangeRmse).toBeCloseTo(expectedRangeRmse, 8);
    expect(metrics.kalmanRmse).toBeCloseTo(expectedKalmanRmse, 8);
    expect(metrics.maxError).toBeGreaterThanOrEqual(metrics.currentError);
    expect(metrics.averageError).toBeGreaterThanOrEqual(0);
    expect(metrics.rangeAverageError).toBeGreaterThanOrEqual(0);
    expect(metrics.kalmanAverageError).toBeGreaterThanOrEqual(0);
  });

  it("creates four default beacons around the grid corners", () => {
    const beacons = createDefaultBeacons(10, 12);

    expect(beacons).toHaveLength(4);
    expect(beacons[0].position).toEqual({ row: 0, col: 0 });
    expect(beacons[1].position).toEqual({ row: 0, col: 11 });
    expect(beacons[2].position).toEqual({ row: 9, col: 0 });
    expect(beacons[3].position).toEqual({ row: 9, col: 11 });
  });

  it("recovers the true position from zero-noise range observations", () => {
    const truePosition = { row: 4, col: 6 };
    const beacons = createDefaultBeacons(10, 10);

    const observations = buildRangeObservations(truePosition, beacons, 0, 0);

    const estimate = estimatePositionFromRanges(
      observations,
      { row: 5, col: 5 },
      10
    );

    expect(estimate.row).toBeCloseTo(truePosition.row, 2);
    expect(estimate.col).toBeCloseTo(truePosition.col, 2);
    expect(distance(estimate, truePosition)).toBeLessThan(0.02);
  });

  it("produces near-zero residuals for zero-noise observations", () => {
    const path: Position[] = [{ row: 4, col: 6 }];
    const samples = buildLocalizationSamples(path, 0, 10, 10);
    const sample = samples[0];

    expect(sample.rangeError).toBeLessThan(1e-6);

    for (const observation of sample.rangeObservations) {
      expect(Math.abs(observation.residual)).toBeLessThan(1e-6);
    }
  });

  it("keeps noisy range estimates finite and reasonably close to the true path", () => {
    const path: Position[] = [
      { row: 2, col: 2 },
      { row: 3, col: 3 },
      { row: 4, col: 4 },
      { row: 5, col: 5 },
    ];

    const samples = buildLocalizationSamples(path, 0.35, 10, 10);

    for (const sample of samples) {
      expect(Number.isFinite(sample.rangeEstimatedPosition.row)).toBe(true);
      expect(Number.isFinite(sample.rangeEstimatedPosition.col)).toBe(true);
      expect(Number.isFinite(sample.rangeError)).toBe(true);
      expect(sample.rangeError).toBeLessThan(1.5);
    }
  });

  it("stores range residuals as measured range minus predicted range", () => {
    const path: Position[] = [{ row: 3, col: 7 }];
    const samples = buildLocalizationSamples(path, 0.35, 10, 10);
    const sample = samples[0];

    for (const observation of sample.rangeObservations) {
      const predictedRange = distance(
        sample.rangeEstimatedPosition,
        observation.beaconPosition
      );

      expect(observation.residual).toBeCloseTo(
        observation.measuredRange - predictedRange,
        8
      );
    }
  });
});