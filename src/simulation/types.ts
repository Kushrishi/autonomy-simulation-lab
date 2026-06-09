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

export type PlannerResult = {
  path: Position[];
  visited: Position[];
  success: boolean;
};

export type SimulationMetrics = {
  pathLength: number;
  nodesVisited: number;
  currentStep: number;
  status: "idle" | "planning" | "running" | "complete" | "failed";
};