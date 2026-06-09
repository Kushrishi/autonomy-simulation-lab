import { describe, expect, it } from "vitest";
import type { Scenario } from "../simulation/types";
import { runAstar } from "./astar";
import { runBfs } from "./bfs";
import { runDijkstra } from "./dijkstra";

function getSteps(pathLength: number): number {
  return Math.max(pathLength - 1, 0);
}

describe("planner validation", () => {
  it("BFS, A*, and Dijkstra all find the same shortest path on normal terrain", () => {
    const scenario: Scenario = {
      name: "Normal Terrain Test",
      rows: 5,
      cols: 5,
      start: { row: 0, col: 0 },
      goal: { row: 2, col: 2 },
      obstacles: [],
      terrain: [],
    };

    const bfs = runBfs(scenario);
    const astar = runAstar(scenario);
    const dijkstra = runDijkstra(scenario);

    expect(bfs.success).toBe(true);
    expect(astar.success).toBe(true);
    expect(dijkstra.success).toBe(true);

    expect(getSteps(bfs.path.length)).toBe(4);
    expect(getSteps(astar.path.length)).toBe(4);
    expect(getSteps(dijkstra.path.length)).toBe(4);

    expect(bfs.pathCost).toBe(4);
    expect(astar.pathCost).toBe(4);
    expect(dijkstra.pathCost).toBe(4);
  });

  it("BFS ignores terrain cost while Dijkstra and A* avoid expensive slow cells", () => {
    const scenario: Scenario = {
      name: "Weighted Terrain Test",
      rows: 5,
      cols: 5,
      start: { row: 2, col: 0 },
      goal: { row: 2, col: 4 },
      obstacles: [],
      terrain: [
        { position: { row: 2, col: 1 }, type: "slow" },
        { position: { row: 2, col: 2 }, type: "slow" },
        { position: { row: 2, col: 3 }, type: "slow" },
      ],
    };

    const bfs = runBfs(scenario);
    const astar = runAstar(scenario);
    const dijkstra = runDijkstra(scenario);

    expect(bfs.success).toBe(true);
    expect(astar.success).toBe(true);
    expect(dijkstra.success).toBe(true);

    // BFS should take the direct 4-step route through slow terrain.
    expect(getSteps(bfs.path.length)).toBe(4);
    expect(bfs.pathCost).toBeGreaterThan(dijkstra.pathCost);

    // Dijkstra should find the lower-cost route around the slow corridor.
    expect(dijkstra.pathCost).toBe(6);

    // A* should also find the optimal low-cost route.
    expect(astar.pathCost).toBe(dijkstra.pathCost);

    // A* should normally search more directly than Dijkstra because it uses a heuristic.
    expect(astar.visited.length).toBeLessThanOrEqual(dijkstra.visited.length);
  });

  it("planners fail cleanly when the goal is blocked off", () => {
    const scenario: Scenario = {
      name: "Blocked Goal Test",
      rows: 3,
      cols: 3,
      start: { row: 0, col: 0 },
      goal: { row: 1, col: 1 },
      obstacles: [
        { row: 0, col: 1 },
        { row: 1, col: 0 },
        { row: 1, col: 2 },
        { row: 2, col: 1 },
      ],
      terrain: [],
    };

    const bfs = runBfs(scenario);
    const astar = runAstar(scenario);
    const dijkstra = runDijkstra(scenario);

    expect(bfs.success).toBe(false);
    expect(astar.success).toBe(false);
    expect(dijkstra.success).toBe(false);

    expect(bfs.path).toHaveLength(0);
    expect(astar.path).toHaveLength(0);
    expect(dijkstra.path).toHaveLength(0);

    expect(bfs.pathCost).toBe(0);
    expect(astar.pathCost).toBe(0);
    expect(dijkstra.pathCost).toBe(0);
  });
});