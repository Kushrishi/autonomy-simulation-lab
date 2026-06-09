import type { Position, Scenario, TerrainType } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function samePosition(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

function isValidGridSize(rows: unknown, cols: unknown): boolean {
  return (
    typeof rows === "number" &&
    typeof cols === "number" &&
    Number.isInteger(rows) &&
    Number.isInteger(cols) &&
    rows > 1 &&
    cols > 1 &&
    rows <= 50 &&
    cols <= 50
  );
}

function isValidPositionValue(
  value: unknown,
  rows: number,
  cols: number
): value is Position {
  if (!isRecord(value)) {
    return false;
  }

  const { row, col } = value;

  return (
    typeof row === "number" &&
    typeof col === "number" &&
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row < rows &&
    col >= 0 &&
    col < cols
  );
}

function isTerrainTypeValue(value: unknown): value is TerrainType {
  return value === "normal" || value === "rough" || value === "slow";
}

function parsePositions(
  value: unknown,
  rows: number,
  cols: number
): Position[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const positions: Position[] = [];

  for (const item of value) {
    if (!isValidPositionValue(item, rows, cols)) {
      return null;
    }

    positions.push({
      row: item.row,
      col: item.col,
    });
  }

  return positions;
}

function parseTerrain(
  value: unknown,
  rows: number,
  cols: number
): Scenario["terrain"] | null {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const terrain: Scenario["terrain"] = [];

  for (const item of value) {
    if (!isRecord(item)) {
      return null;
    }

    if (!isValidPositionValue(item.position, rows, cols)) {
      return null;
    }

    if (!isTerrainTypeValue(item.type)) {
      return null;
    }

    if (item.type !== "normal") {
      terrain.push({
        position: {
          row: item.position.row,
          col: item.position.col,
        },
        type: item.type,
      });
    }
  }

  return terrain;
}

export function parseImportedScenario(value: unknown): Scenario | null {
  if (!isRecord(value)) {
    return null;
  }

  const { name, rows, cols, start, goal, obstacles, terrain } = value;

  if (typeof name !== "string" || !isValidGridSize(rows, cols)) {
    return null;
  }

  const parsedRows = Number(rows);
  const parsedCols = Number(cols);

  if (!isValidPositionValue(start, parsedRows, parsedCols)) {
    return null;
  }

  if (!isValidPositionValue(goal, parsedRows, parsedCols)) {
    return null;
  }

  const parsedObstacles = parsePositions(obstacles, parsedRows, parsedCols);
  const parsedTerrain = parseTerrain(terrain, parsedRows, parsedCols);

  if (!parsedObstacles || !parsedTerrain) {
    return null;
  }

  return {
    name: name.trim() || "Imported Scenario",
    rows: parsedRows,
    cols: parsedCols,
    start: {
      row: start.row,
      col: start.col,
    },
    goal: {
      row: goal.row,
      col: goal.col,
    },
    obstacles: parsedObstacles.filter(
      (obstacle) =>
        !samePosition(obstacle, start) && !samePosition(obstacle, goal)
    ),
    terrain: parsedTerrain.filter(
      (cell) =>
        !samePosition(cell.position, start) &&
        !samePosition(cell.position, goal) &&
        !parsedObstacles.some((obstacle) =>
          samePosition(obstacle, cell.position)
        )
    ),
  };
}