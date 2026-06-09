import { describe, expect, it } from "vitest";
import {
  buildLocalizationSamples,
  buildRangeObservations,
  calculateLocalizationMetrics,
  createDefaultBeacons,
  estimatePositionFromRanges,
} from "./localization";
import type { Position } from "../simulation/types";

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

  it("adds range observations and range-based estimates to each sample", () => {
    const path: Position[] = [
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 1, col: 3 },
    ];

    const samples = buildLocalizationSamples(path, 0.35, 5, 5);

    expect(samples[0].rangeObservations).toHaveLength(4);
    expect(samples[0].rangeEstimatedPosition).toBeDefined();
    expect(samples[0].rangeError).toBeGreaterThanOrEqual(0);
  });

  it("calculates RMSE from localization errors correctly", () => {
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

    expect(metrics.sampleCount).toBe(samples.length);
    expect(metrics.rmse).toBeCloseTo(expectedRmse, 8);
    expect(metrics.rangeRmse).toBeCloseTo(expectedRangeRmse, 8);
    expect(metrics.maxError).toBeGreaterThanOrEqual(metrics.currentError);
    expect(metrics.averageError).toBeGreaterThanOrEqual(0);
    expect(metrics.rangeAverageError).toBeGreaterThanOrEqual(0);
  });

  it("creates four default beacons around the grid corners", () => {
    const beacons = createDefaultBeacons(10, 12);

    expect(beacons).toHaveLength(4);
    expect(beacons[0].position).toEqual({ row: 0, col: 0 });
    expect(beacons[1].position).toEqual({ row: 0, col: 11 });
    expect(beacons[2].position).toEqual({ row: 9, col: 0 });
    expect(beacons[3].position).toEqual({ row: 9, col: 11 });
  });

  it("estimates position from range observations using least squares", () => {
    const truePosition = { row: 4, col: 6 };
    const beacons = createDefaultBeacons(10, 10);

    const observations = buildRangeObservations(
      truePosition,
      beacons,
      0,
      0
    );

    const estimate = estimatePositionFromRanges(
      observations,
      { row: 5, col: 5 },
      10
    );

    expect(estimate.row).toBeCloseTo(truePosition.row, 2);
    expect(estimate.col).toBeCloseTo(truePosition.col, 2);
  });
});