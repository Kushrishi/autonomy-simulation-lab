import { runAstar } from "./astar";
import { runBfs } from "./bfs";
import type {
  PlannerComparison,
  PlannerName,
  PlannerResult,
  Scenario,
} from "../simulation/types";

// A simple comparison metric for this simulator.
// Higher values mean the planner found a path while exploring fewer cells.
function calculateEfficiencyScore(result: PlannerResult): number {
  if (!result.success || result.visited.length === 0) {
    return 0;
  }

  return (result.path.length / result.visited.length) * 100;
}

// Runs one planner on the selected scenario and records basic performance
// metrics for the comparison dashboard.
function measurePlanner(
  algorithm: PlannerName,
  scenario: Scenario
): PlannerComparison {
  const startTime = performance.now();

  const result = algorithm === "BFS" ? runBfs(scenario) : runAstar(scenario);

  const endTime = performance.now();

  return {
    algorithm,
    success: result.success,
    pathLength: result.path.length,
    nodesVisited: result.visited.length,
    runtimeMs: endTime - startTime,
    efficiencyScore: calculateEfficiencyScore(result),
  };
}

// Runs all supported planners on the same scenario so their behavior can be
// compared side by side.
export function comparePlanners(scenario: Scenario): PlannerComparison[] {
  return [measurePlanner("BFS", scenario), measurePlanner("A*", scenario)];
}