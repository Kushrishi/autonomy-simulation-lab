import type { Position, Scenario } from "./types";

function samePosition(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

export function positionListIncludes(
  list: Position[],
  position: Position
): boolean {
  return list.some((item) => samePosition(item, position));
}

export function buildScenarioWithDynamicObstacle(
  scenario: Scenario,
  dynamicObstaclePosition: Position | null
): Scenario {
  if (!dynamicObstaclePosition) {
    return scenario;
  }

  if (positionListIncludes(scenario.obstacles, dynamicObstaclePosition)) {
    return scenario;
  }

  return {
    ...scenario,
    obstacles: [...scenario.obstacles, dynamicObstaclePosition],
    terrain: (scenario.terrain ?? []).filter(
      (cell) => !samePosition(cell.position, dynamicObstaclePosition)
    ),
  };
}

export function chooseDynamicObstaclePosition(
  path: Position[],
  currentStep: number,
  scenario: Scenario
): Position | null {
  if (path.length < 5) {
    return null;
  }

  if (currentStep < 1 || currentStep >= path.length - 2) {
    return null;
  }

  const candidate = path[currentStep + 1];

  if (!candidate) {
    return null;
  }

  if (
    samePosition(candidate, scenario.start) ||
    samePosition(candidate, scenario.goal) ||
    positionListIncludes(scenario.obstacles, candidate)
  ) {
    return null;
  }

  return candidate;
}

export function createReplanningScenario(
  scenario: Scenario,
  currentPosition: Position
): Scenario {
  return {
    ...scenario,
    start: currentPosition,
  };
}