import type { PlannerResult, Position, Scenario } from "../simulation/types";
import { manhattanDistance } from "./manhattan";

function positionKey(position: Position): string {
  return `${position.row},${position.col}`;
}

function samePosition(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

function isInsideGrid(position: Position, rows: number, cols: number): boolean {
  return (
    position.row >= 0 &&
    position.row < rows &&
    position.col >= 0 &&
    position.col < cols
  );
}

function isObstacle(position: Position, obstacles: Position[]): boolean {
  return obstacles.some((obstacle) => samePosition(obstacle, position));
}

function getNeighbors(position: Position): Position[] {
  return [
    { row: position.row - 1, col: position.col },
    { row: position.row + 1, col: position.col },
    { row: position.row, col: position.col - 1 },
    { row: position.row, col: position.col + 1 },
  ];
}

// If a position has no score yet, treat it as infinitely expensive.
function getScore(scores: Map<string, number>, position: Position): number {
  return scores.get(positionKey(position)) ?? Infinity;
}

// Selects the open cell with the lowest estimated total cost.
// This is the main decision step in A*.
function removeLowestFScore(
  openSet: Position[],
  fScore: Map<string, number>
): Position {
  let bestIndex = 0;
  let bestScore = getScore(fScore, openSet[0]);

  for (let i = 1; i < openSet.length; i++) {
    const currentScore = getScore(fScore, openSet[i]);

    if (currentScore < bestScore) {
      bestScore = currentScore;
      bestIndex = i;
    }
  }

  const [bestPosition] = openSet.splice(bestIndex, 1);
  return bestPosition;
}

function rebuildPath(
  cameFrom: Map<string, Position>,
  start: Position,
  goal: Position
): Position[] {
  const path: Position[] = [];
  let current = goal;

  while (!samePosition(current, start)) {
    path.push(current);

    const previous = cameFrom.get(positionKey(current));

    if (!previous) {
      return [];
    }

    current = previous;
  }

  path.push(start);
  path.reverse();

  return path;
}

// A* search uses both the known distance from the start and a heuristic
// estimate to the goal. In this grid, the heuristic is Manhattan distance.
export function runAstar(scenario: Scenario): PlannerResult {
  const openSet: Position[] = [scenario.start];
  const openSetKeys = new Set<string>([positionKey(scenario.start)]);
  const closedSet = new Set<string>();

  const visited: Position[] = [];
  const cameFrom = new Map<string, Position>();

  // gScore = actual distance travelled from the start.
  // fScore = gScore + estimated remaining distance to the goal.
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();

  gScore.set(positionKey(scenario.start), 0);
  fScore.set(
    positionKey(scenario.start),
    manhattanDistance(scenario.start, scenario.goal)
  );

  while (openSet.length > 0) {
    const current = removeLowestFScore(openSet, fScore);
    const currentKey = positionKey(current);

    openSetKeys.delete(currentKey);

    if (closedSet.has(currentKey)) {
      continue;
    }

    visited.push(current);

    if (samePosition(current, scenario.goal)) {
      return {
        path: rebuildPath(cameFrom, scenario.start, scenario.goal),
        visited,
        success: true,
      };
    }

    closedSet.add(currentKey);

    const neighbors = getNeighbors(current);

    for (const neighbor of neighbors) {
      const neighborKey = positionKey(neighbor);

      if (!isInsideGrid(neighbor, scenario.rows, scenario.cols)) {
        continue;
      }

      if (isObstacle(neighbor, scenario.obstacles)) {
        continue;
      }

      if (closedSet.has(neighborKey)) {
        continue;
      }

      // Each move has a cost of 1 in the current unweighted grid.
      const tentativeGScore = getScore(gScore, current) + 1;

      if (tentativeGScore < getScore(gScore, neighbor)) {
        cameFrom.set(neighborKey, current);
        gScore.set(neighborKey, tentativeGScore);
        // A* prioritizes cells that appear cheaper overall:
        // actual cost so far + estimated cost to goal.
        fScore.set(
          neighborKey,
          tentativeGScore + manhattanDistance(neighbor, scenario.goal)
        );

        if (!openSetKeys.has(neighborKey)) {
          openSet.push(neighbor);
          openSetKeys.add(neighborKey);
        }
      }
    }
  }

  return {
    path: [],
    visited,
    success: false,
  };
}