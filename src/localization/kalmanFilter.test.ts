import { describe, expect, it } from "vitest";
import {
  createInitialKalmanState,
  getKalmanPosition,
  updateKalmanFilter,
} from "./kalmanFilter";

describe("Kalman localization filter", () => {
  it("initializes the state from the first measured position", () => {
    const state = createInitialKalmanState({ row: 2, col: 3 });
    const position = getKalmanPosition(state);

    expect(position).toEqual({ row: 2, col: 3 });
    expect(state.stateVector[2]).toBe(0);
    expect(state.stateVector[3]).toBe(0);
  });

  it("updates the position estimate toward a new measurement", () => {
    const initialState = createInitialKalmanState({ row: 0, col: 0 });

    const updatedState = updateKalmanFilter(initialState, {
      row: 1,
      col: 1,
    });

    const updatedPosition = getKalmanPosition(updatedState);

    expect(updatedPosition.row).toBeGreaterThan(0);
    expect(updatedPosition.col).toBeGreaterThan(0);
    expect(updatedPosition.row).toBeLessThanOrEqual(1);
    expect(updatedPosition.col).toBeLessThanOrEqual(1);
  });

  it("learns velocity from repeated position updates", () => {
    let state = createInitialKalmanState({ row: 0, col: 0 });

    state = updateKalmanFilter(state, { row: 1, col: 0 });
    state = updateKalmanFilter(state, { row: 2, col: 0 });

    expect(state.stateVector[2]).toBeGreaterThan(0);
    expect(Math.abs(state.stateVector[3])).toBeLessThan(0.25);
  });
});