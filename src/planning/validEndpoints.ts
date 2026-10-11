import type { Scenario } from "../simulation/types";

// Public planner entry points also accept scenarios outside the validated UI importer.
export function hasValidEndpoints(scenario: Scenario): boolean {
  return [scenario.start, scenario.goal].every((position) =>
    Number.isInteger(position.row) && Number.isInteger(position.col) &&
    position.row >= 0 && position.row < scenario.rows &&
    position.col >= 0 && position.col < scenario.cols &&
    !scenario.obstacles.some((obstacle) =>
      obstacle.row === position.row && obstacle.col === position.col)
  );
}
