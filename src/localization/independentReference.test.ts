import { describe, expect, it } from "vitest";
import fixtures from "../../analysis/numerical-audit/fixtures.json";
import { updateKalmanFilter, type KalmanFilterState } from "./kalmanFilter";
import { buildLocalizationSamples, buildRangeObservations, createDefaultBeacons, estimatePositionFromRanges } from "./localization";

describe("independent NumPy Joseph and SciPy numerical references", () => {
  for (const fixture of fixtures.kalman) {
    it(`compares complete state/covariance: ${fixture.case.name}`, () => {
      let state = fixture.case.initial as KalmanFilterState;
      fixture.case.observations.forEach((z, step) => {
        state = updateKalmanFilter(state, z, fixture.case.config);
        const expected = fixture.expected[step];
        state.stateVector.forEach((v, i) => expect(Math.abs(v - expected.stateVector[i])).toBeLessThan(1e-10));
        state.covariance.forEach((row, i) => row.forEach((v, j) => {
          expect(Math.abs(v - expected.covariance[i][j])).toBeLessThan(1e-10);
          expect(v).toBe(state.covariance[j][i]);
        }));
      });
    });
  }
  it("matches SciPy positions/objectives on 40 zero-noise and inconsistent-range cases", () => {
    for (const { case: c, expected } of fixtures.ranges) {
      const observations = c.observations.map(o => ({ ...o, trueRange: o.measuredRange, residual: 0 }));
      const position = estimatePositionFromRanges(observations, c.initial, c.iterations);
      expect(Math.hypot(position.row - expected.position[0], position.col - expected.position[1])).toBeLessThan(2e-6);
      const objective = observations.reduce((sum, o) => sum + (Math.hypot(position.row-o.beaconPosition.row,position.col-o.beaconPosition.col)-o.measuredRange)**2, 0);
      expect(Math.abs(objective - expected.squared_residual_objective)).toBeLessThan(1e-10);
    }
  });
  it("preserves exact zero-noise geometry at all beacon corners", () => {
    const beacons = createDefaultBeacons(10,10);
    for (const { position } of beacons) {
      const observations = buildRangeObservations(position, beacons, 0, 0);
      expect(observations.every(o => o.measuredRange === o.trueRange)).toBe(true);
      const sample = buildLocalizationSamples([position], 0, 10, 10)[0];
      expect(sample.rangeError).toBe(0);
      expect(sample.rangeObservations.every(o => o.residual === 0)).toBe(true);
    }
  });
  it("handles zero-information geometry without inventing a range direction", () => {
    const observation = { beaconId:"same", beaconPosition:{row:0,col:0}, measuredRange:0, trueRange:0,residual:0 };
    expect(estimatePositionFromRanges([observation],{row:0,col:0})).toEqual({row:0,col:0});
  });
  it("rejects invalid Kalman parameters rather than silently producing NaN", () => {
    const state = fixtures.kalman[0].case.initial as KalmanFilterState;
    expect(() => updateKalmanFilter(state, {row:NaN,col:0})).toThrow();
    expect(() => updateKalmanFilter(state, {row:0,col:0}, {timeStep:1,processNoise:-1,measurementNoise:1})).toThrow();
  });
});
