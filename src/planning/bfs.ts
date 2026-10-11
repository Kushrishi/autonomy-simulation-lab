import { hasValidEndpoints } from "./validEndpoints";
import type { PlannerResult, Position, Scenario } from "../simulation/types";
import { calculatePathCost } from "../simulation/terrain";

function samePosition(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

function positionKey(position: Position): string {
  return `${position.row},${position.col}`;
}

function isInsideGrid(position: Position, scenario: Scenario): boolean {
  return (
    position.row >= 0 &&
    position.row < scenario.rows &&
    position.col >= 0 &&
    position.col < scenario.cols
  );
}

function isObstacle(position: Position, scenario: Scenario): boolean {
  return scenario.obstacles.some((obstacle) => samePosition(obstacle, position));
}

function getNeighbors(position: Position, scenario: Scenario): Position[] {
  const candidates = [
    { row: position.row - 1, col: position.col },
    { row: position.row + 1, col: position.col },
    { row: position.row, col: position.col - 1 },
    { row: position.row, col: position.col + 1 },
  ];

  return candidates.filter(
    (candidate) => isInsideGrid(candidate, scenario) && !isObstacle(candidate, scenario)
  );
}

function rebuildPath(
  cameFrom: Map<string, Position>,
  start: Position,
  goal: Position
): Position[] {
  const path = [goal];
  let current = goal;

  while (!samePosition(current, start)) {
    const previous = cameFrom.get(positionKey(current));

    if (!previous) {
      return [];
    }

    path.push(previous);
    current = previous;
  }

  return path.reverse();
}

export function runBfs(scenario: Scenario): PlannerResult {
  if (!hasValidEndpoints(scenario)) {
    return { path: [], visited: [], success: false, pathCost: 0 };
  }
  const queue: Position[] = [scenario.start];
  const visited: Position[] = [];
  const visitedSet = new Set<string>([positionKey(scenario.start)]);
  const cameFrom = new Map<string, Position>();

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      break;
    }

    visited.push(current);

    if (samePosition(current, scenario.goal)) {
      const path = rebuildPath(cameFrom, scenario.start, scenario.goal);

      return {
        path,
        visited,
        success: true,
        pathCost: calculatePathCost(path, scenario),
      };
    }

    for (const neighbor of getNeighbors(current, scenario)) {
      const key = positionKey(neighbor);

      if (visitedSet.has(key)) {
        continue;
      }

      visitedSet.add(key);
      cameFrom.set(key, current);
      queue.push(neighbor);
    }
  }

  return {
    path: [],
    visited,
    success: false,
    pathCost: 0,
  };
}