import type { PlannerResult, Position, Scenario } from "../simulation/types";
import { calculatePathCost, getMoveCost } from "../simulation/terrain";
import { manhattanDistance } from "./manhattan";

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
    (candidate) =>
      isInsideGrid(candidate, scenario) && !isObstacle(candidate, scenario)
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

function getScore(scoreMap: Map<string, number>, position: Position): number {
  return scoreMap.get(positionKey(position)) ?? Number.POSITIVE_INFINITY;
}

// Selects the open cell with the lowest A* score.
// If two cells have the same fScore, the tie-breaker chooses the one
// closer to the goal so A* behaves more goal-directed than Dijkstra.
function removeLowestFScore(
  openSet: Position[],
  fScore: Map<string, number>,
  goal: Position
): Position {
  let bestIndex = 0;

  for (let index = 1; index < openSet.length; index++) {
    const currentScore = getScore(fScore, openSet[index]);
    const bestScore = getScore(fScore, openSet[bestIndex]);

    const currentHeuristic = manhattanDistance(openSet[index], goal);
    const bestHeuristic = manhattanDistance(openSet[bestIndex], goal);

    if (
      currentScore < bestScore ||
      (currentScore === bestScore && currentHeuristic < bestHeuristic)
    ) {
      bestIndex = index;
    }
  }

  return openSet.splice(bestIndex, 1)[0];
}

export function runAstar(scenario: Scenario): PlannerResult {
  const openSet: Position[] = [scenario.start];
  const closedSet = new Set<string>();
  const visited: Position[] = [];
  const cameFrom = new Map<string, Position>();

  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();

  gScore.set(positionKey(scenario.start), 0);
  fScore.set(
    positionKey(scenario.start),
    manhattanDistance(scenario.start, scenario.goal)
  );

  while (openSet.length > 0) {
    const current = removeLowestFScore(openSet, fScore, scenario.goal);
    const currentKey = positionKey(current);

    if (closedSet.has(currentKey)) {
      continue;
    }

    closedSet.add(currentKey);
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
      const neighborKey = positionKey(neighbor);

      if (closedSet.has(neighborKey)) {
        continue;
      }

      const tentativeGScore =
        getScore(gScore, current) + getMoveCost(scenario, neighbor);

      if (tentativeGScore < getScore(gScore, neighbor)) {
        cameFrom.set(neighborKey, current);
        gScore.set(neighborKey, tentativeGScore);
        fScore.set(
          neighborKey,
          tentativeGScore + manhattanDistance(neighbor, scenario.goal)
        );

        if (!openSet.some((position) => samePosition(position, neighbor))) {
          openSet.push(neighbor);
        }
      }
    }
  }

  return {
    path: [],
    visited,
    success: false,
    pathCost: 0,
  };
}