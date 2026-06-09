import type { PlannerResult, Position, Scenario } from "../simulation/types";

// Positions are converted into string keys so they can be stored reliably
// in Sets and Maps. Example: { row: 2, col: 5 } becomes "2,5".
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

// The robot can move in four grid directions: up, down, left, and right.
// Diagonal motion is intentionally excluded for this first simulator version.
function getNeighbors(position: Position): Position[] {
  return [
    { row: position.row - 1, col: position.col },
    { row: position.row + 1, col: position.col },
    { row: position.row, col: position.col - 1 },
    { row: position.row, col: position.col + 1 },
  ];
}
// Reconstructs the final path by walking backward from the goal to the start
// using the cameFrom map, then reversing the result.
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
// Breadth-first search explores the grid outward from the start position.
// Because every move has equal cost, BFS finds the shortest path in this
// unweighted grid environment.
export function runBfs(scenario: Scenario): PlannerResult {
  // queue stores cells waiting to be explored.
// visited is used for visualization.
// visitedSet prevents repeated exploration.
// cameFrom remembers the previous cell for path reconstruction.
  const queue: Position[] = [];
  const visited: Position[] = [];
  const visitedSet = new Set<string>();
  const cameFrom = new Map<string, Position>();

  queue.push(scenario.start);
  visitedSet.add(positionKey(scenario.start));

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      break;
    }

    visited.push(current);

    if (samePosition(current, scenario.goal)) {
      return {
        path: rebuildPath(cameFrom, scenario.start, scenario.goal),
        visited,
        success: true,
      };
    }

    const neighbors = getNeighbors(current);

    for (const neighbor of neighbors) {
      const key = positionKey(neighbor);

      if (!isInsideGrid(neighbor, scenario.rows, scenario.cols)) {
        continue;
      }

      if (isObstacle(neighbor, scenario.obstacles)) {
        continue;
      }

      if (visitedSet.has(key)) {
        continue;
      }

      queue.push(neighbor);
      visitedSet.add(key);
      cameFrom.set(key, current);
    }
  }

  return {
    path: [],
    visited,
    success: false,
  };
}