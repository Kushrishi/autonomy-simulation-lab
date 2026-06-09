import { runAstar } from "./astar";
import { runBfs } from "./bfs";
import type {
  PlannerComparison,
  PlannerName,
  PlannerResult,
  Scenario,
} from "../simulation/types";

function calculateEfficiencyScore(result: PlannerResult): number {
  if (!result.success || result.visited.length === 0) {
    return 0;
  }

  return (result.path.length / result.visited.length) * 100;
}

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

export function comparePlanners(scenario: Scenario): PlannerComparison[] {
  return [measurePlanner("BFS", scenario), measurePlanner("A*", scenario)];
}