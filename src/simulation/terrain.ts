import type { Position, Scenario, TerrainType } from "./types";

const terrainCosts: Record<TerrainType, number> = {
  normal: 1,
  rough: 3,
  slow: 5,
};

function samePosition(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

export function getTerrainType(
  scenario: Scenario,
  position: Position
): TerrainType {
  const terrainCell = scenario.terrain?.find((cell) =>
    samePosition(cell.position, position)
  );

  return terrainCell?.type ?? "normal";
}

export function getMoveCost(scenario: Scenario, position: Position): number {
  return terrainCosts[getTerrainType(scenario, position)];
}

export function calculatePathCost(path: Position[], scenario: Scenario): number {
  if (path.length <= 1) {
    return 0;
  }

  return path
    .slice(1)
    .reduce((totalCost, position) => totalCost + getMoveCost(scenario, position), 0);
}