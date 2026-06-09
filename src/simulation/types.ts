export type Position = {
  row: number;
  col: number;
};

export type ContinuousPosition = {
  row: number;
  col: number;
};

export type TerrainType = "normal" | "rough" | "slow";

export type EditorTool = "start" | "goal" | "obstacle" | "rough" | "slow" | "clear";

export type TerrainCell = {
  position: Position;
  type: TerrainType;
};

export type Scenario = {
  name: string;
  rows: number;
  cols: number;
  start: Position;
  goal: Position;
  obstacles: Position[];
  terrain?: TerrainCell[];
};

export type PlannerName = "BFS" | "A*" | "Dijkstra";

export type PlannerResult = {
  path: Position[];
  visited: Position[];
  success: boolean;
  pathCost: number;
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
  pathCost: number;
  nodesVisited: number;
  runtimeMs: number;
  directnessScore: number;
};

export type SensorDirection = "Up" | "Down" | "Left" | "Right";

export type SensorReading = {
  direction: SensorDirection;
  distance: number;
  detectedObstacle: boolean;
  cells: Position[];
  obstaclePosition?: Position;
};

export type LocalizationBeacon = {
  id: string;
  position: ContinuousPosition;
};

export type RangeObservation = {
  beaconId: string;
  beaconPosition: ContinuousPosition;
  trueRange: number;
  measuredRange: number;
  residual: number;
};

export type LocalizationSample = {
  step: number;
  truePosition: ContinuousPosition;
  measuredPosition: ContinuousPosition;
  estimatedPosition: ContinuousPosition;
  rangeEstimatedPosition: ContinuousPosition;
  rangeObservations: RangeObservation[];
  error: number;
  rangeError: number;
};

export type LocalizationMetrics = {
  currentError: number;
  averageError: number;
  maxError: number;
  rmse: number;
  rangeCurrentError: number;
  rangeAverageError: number;
  rangeRmse: number;
  sampleCount: number;
};