import type {
  PlannerComparison,
  PlannerName,
  PlannerResult,
  Scenario,
} from "../simulation/types";
import { runAstar } from "./astar";
import { runBfs } from "./bfs";
import { runDijkstra } from "./dijkstra";

function getPathStepCount(result: PlannerResult): number {
  if (!result.success || result.path.length === 0) {
    return 0;
  }

  return Math.max(result.path.length - 1, 0);
}

function calculateDirectnessScore(result: PlannerResult): number {
  if (!result.success || result.visited.length === 0) {
    return 0;
  }

  const pathSteps = getPathStepCount(result);

  return (pathSteps / result.visited.length) * 100;
}

function measurePlanner(
  algorithm: PlannerName,
  scenario: Scenario,
  runPlanner: (scenario: Scenario) => PlannerResult
): PlannerComparison {
  const startTime = performance.now();
  const result = runPlanner(scenario);
  const runtimeMs = performance.now() - startTime;

  return {
    algorithm,
    success: result.success,
    pathLength: getPathStepCount(result),
    pathCost: result.pathCost,
    nodesVisited: result.visited.length,
    runtimeMs,
    directnessScore: calculateDirectnessScore(result),
  };
}

export function comparePlanners(scenario: Scenario): PlannerComparison[] {
  return [
    measurePlanner("BFS", scenario, runBfs),
    measurePlanner("A*", scenario, runAstar),
    measurePlanner("Dijkstra", scenario, runDijkstra),
  ];
}