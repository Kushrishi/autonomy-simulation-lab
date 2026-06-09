export type Position = {
  row: number;
  col: number;
};

export type Scenario = {
  name: string;
  rows: number;
  cols: number;
  start: Position;
  goal: Position;
  obstacles: Position[];
};

export type PlannerName = "BFS" | "A*";

export type PlannerResult = {
  path: Position[];
  visited: Position[];
  success: boolean;
};

export type SimulationMetrics = {
  algorithm: PlannerName;
  pathLength: number;
  nodesVisited: number;
  currentStep: number;
  runtimeMs: number;
  status: "idle" | "planning" | "searching" | "running" | "complete" | "failed";
};

export type PlannerComparison = {
  algorithm: PlannerName;
  success: boolean;
  pathLength: number;
  nodesVisited: number;
  runtimeMs: number;
  efficiencyScore: number;
};