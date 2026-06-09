import { describe, expect, it } from "vitest";
import type { Position, Scenario } from "./types";
import {
  buildScenarioWithDynamicObstacle,
  chooseDynamicObstaclePosition,
  createReplanningScenario,
  positionListIncludes,
} from "./dynamicObstacles";

const baseScenario: Scenario = {
  name: "Dynamic Obstacle Test",
  rows: 5,
  cols: 5,
  start: { row: 0, col: 0 },
  goal: { row: 4, col: 4 },
  obstacles: [{ row: 2, col: 2 }],
  terrain: [
    { position: { row: 1, col: 1 }, type: "rough" },
    { position: { row: 1, col: 2 }, type: "slow" },
  ],
};

describe("dynamic obstacle utilities", () => {
  it("checks whether a position exists in a position list", () => {
    const positions: Position[] = [
      { row: 0, col: 1 },
      { row: 2, col: 3 },
    ];

    expect(positionListIncludes(positions, { row: 2, col: 3 })).toBe(true);
    expect(positionListIncludes(positions, { row: 3, col: 2 })).toBe(false);
  });

  it("returns the original scenario when no dynamic obstacle is provided", () => {
    const result = buildScenarioWithDynamicObstacle(baseScenario, null);

    expect(result).toBe(baseScenario);
  });

  it("does not duplicate an existing obstacle", () => {
    const result = buildScenarioWithDynamicObstacle(baseScenario, {
      row: 2,
      col: 2,
    });

    expect(result).toBe(baseScenario);
    expect(result.obstacles).toHaveLength(1);
  });

  it("adds a dynamic obstacle and removes terrain from that cell", () => {
    const result = buildScenarioWithDynamicObstacle(baseScenario, {
      row: 1,
      col: 2,
    });

    expect(result.obstacles).toContainEqual({ row: 1, col: 2 });
    expect(result.terrain).not.toContainEqual({
      position: { row: 1, col: 2 },
      type: "slow",
    });
  });

  it("chooses the next route cell as a dynamic obstacle candidate", () => {
    const path: Position[] = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
      { row: 0, col: 4 },
      { row: 1, col: 4 },
    ];

    const result = chooseDynamicObstaclePosition(path, 1, baseScenario);

    expect(result).toEqual({ row: 0, col: 2 });
  });

  it("does not choose a dynamic obstacle too early or too late in the path", () => {
    const path: Position[] = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
      { row: 0, col: 4 },
    ];

    expect(chooseDynamicObstaclePosition(path, 0, baseScenario)).toBeNull();
    expect(chooseDynamicObstaclePosition(path, 3, baseScenario)).toBeNull();
  });

  it("does not choose the start, goal, or existing obstacles", () => {
    const pathThroughObstacle: Position[] = [
      { row: 0, col: 0 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
      { row: 2, col: 3 },
      { row: 4, col: 4 },
    ];

    const result = chooseDynamicObstaclePosition(
      pathThroughObstacle,
      1,
      baseScenario
    );

    expect(result).toBeNull();
  });

  it("creates a replanning scenario from the robot current position", () => {
    const currentPosition = { row: 3, col: 1 };
    const result = createReplanningScenario(baseScenario, currentPosition);

    expect(result.start).toEqual(currentPosition);
    expect(result.goal).toEqual(baseScenario.goal);
    expect(result.obstacles).toEqual(baseScenario.obstacles);
    expect(result.terrain).toEqual(baseScenario.terrain);
  });
});