import { describe, expect, it } from "vitest";
import {
  buildLocalizationSamples,
  calculateLocalizationMetrics,
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

    expect(metrics.sampleCount).toBe(samples.length);
    expect(metrics.rmse).toBeCloseTo(expectedRmse, 8);
    expect(metrics.maxError).toBeGreaterThanOrEqual(metrics.currentError);
    expect(metrics.averageError).toBeGreaterThanOrEqual(0);
  });
});