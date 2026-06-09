import type { PlannerResult, Position, Scenario } from "../simulation/types";
import { calculatePathCost, getMoveCost } from "../simulation/terrain";
import { MinPriorityQueue } from "./MinPriorityQueue";

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

function getDistance(
  distanceMap: Map<string, number>,
  position: Position
): number {
  return distanceMap.get(positionKey(position)) ?? Number.POSITIVE_INFINITY;
}

export function runDijkstra(scenario: Scenario): PlannerResult {
  const openSet = new MinPriorityQueue<Position>();
  const closedSet = new Set<string>();
  const visited: Position[] = [];
  const cameFrom = new Map<string, Position>();
  const distanceMap = new Map<string, number>();

  distanceMap.set(positionKey(scenario.start), 0);
  openSet.enqueue(scenario.start, 0);

  while (!openSet.isEmpty()) {
    const current = openSet.dequeue();

    if (!current) {
      break;
    }

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

      const newDistance =
        getDistance(distanceMap, current) + getMoveCost(scenario, neighbor);

      if (newDistance < getDistance(distanceMap, neighbor)) {
        cameFrom.set(neighborKey, current);
        distanceMap.set(neighborKey, newDistance);
        openSet.enqueue(neighbor, newDistance);
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