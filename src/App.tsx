import { useMemo, useRef, useState, type ChangeEvent } from "react";
import ControlPanel from "./components/ControlPanel";
import MetricsPanel from "./components/MetricsPanel";
import PlannerComparisonPanel from "./components/PlannerComparisonPanel";
import SensorPanel from "./components/SensorPanel";
import SimulatorGrid from "./components/SimulatorGrid";
import { getRangeSensorReadings } from "./sensors/rangeSensor";
import { runAstar } from "./planning/astar";
import { runBfs } from "./planning/bfs";
import { defaultScenario, scenarios } from "./simulation/scenarios";
import LocalizationPanel from "./components/LocalizationPanel";
import TelemetryExportPanel from "./components/TelemetryExportPanel";
import { runDijkstra } from "./planning/dijkstra";
import {
  buildLocalizationSamples,
  calculateLocalizationMetrics,
} from "./localization/localization";
import type {
  EditorTool,
  PlannerName,
  PlannerResult,
  Position,
  Scenario,
  SimulationMetrics,
  LocalizationSample,
  TerrainType,
} from "./simulation/types";

function samePosition(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

function removePosition(list: Position[], position: Position): Position[] {
  return list.filter((item) => !samePosition(item, position));
}

function setScenarioTerrain(
  scenario: Scenario,
  position: Position,
  type: TerrainType
): Scenario {
  const existingTerrain = scenario.terrain ?? [];

  return {
    ...scenario,
    terrain: [
      ...existingTerrain.filter(
        (cell) => !samePosition(cell.position, position)
      ),
      {
        position,
        type,
      },
    ],
  };
}

function clearScenarioTerrain(scenario: Scenario, position: Position): Scenario {
  return {
    ...scenario,
    terrain: (scenario.terrain ?? []).filter(
      (cell) => !samePosition(cell.position, position)
    ),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidGridSize(rows: unknown, cols: unknown): boolean {
  return (
    Number.isInteger(rows) &&
    Number.isInteger(cols) &&
    Number(rows) >= 2 &&
    Number(cols) >= 2 &&
    Number(rows) <= 50 &&
    Number(cols) <= 50
  );
}

function isValidPositionValue(
  value: unknown,
  rows: number,
  cols: number
): value is Position {
  if (!isRecord(value)) {
    return false;
  }

  const { row, col } = value;

  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    Number(row) >= 0 &&
    Number(row) < rows &&
    Number(col) >= 0 &&
    Number(col) < cols
  );
}

function isTerrainTypeValue(value: unknown): value is TerrainType {
  return value === "normal" || value === "rough" || value === "slow";
}

function parsePositions(
  value: unknown,
  rows: number,
  cols: number
): Position[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const positions: Position[] = [];

  for (const item of value) {
    if (!isValidPositionValue(item, rows, cols)) {
      return null;
    }

    positions.push({
      row: item.row,
      col: item.col,
    });
  }

  return positions;
}

function parseTerrain(
  value: unknown,
  rows: number,
  cols: number
): Scenario["terrain"] | null {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const terrain: Scenario["terrain"] = [];

  for (const item of value) {
    if (!isRecord(item)) {
      return null;
    }

    if (!isValidPositionValue(item.position, rows, cols)) {
      return null;
    }

    if (!isTerrainTypeValue(item.type)) {
      return null;
    }

    if (item.type !== "normal") {
      terrain.push({
        position: {
          row: item.position.row,
          col: item.position.col,
        },
        type: item.type,
      });
    }
  }

  return terrain;
}

function parseImportedScenario(value: unknown): Scenario | null {
  if (!isRecord(value)) {
    return null;
  }

  const { name, rows, cols, start, goal, obstacles, terrain } = value;

  if (typeof name !== "string" || !isValidGridSize(rows, cols)) {
    return null;
  }

  const parsedRows = Number(rows);
  const parsedCols = Number(cols);

  if (!isValidPositionValue(start, parsedRows, parsedCols)) {
    return null;
  }

  if (!isValidPositionValue(goal, parsedRows, parsedCols)) {
    return null;
  }

  const parsedObstacles = parsePositions(obstacles, parsedRows, parsedCols);
  const parsedTerrain = parseTerrain(terrain, parsedRows, parsedCols);

  if (!parsedObstacles || !parsedTerrain) {
    return null;
  }

  return {
    name: name.trim() || "Imported Scenario",
    rows: parsedRows,
    cols: parsedCols,
    start: {
      row: start.row,
      col: start.col,
    },
    goal: {
      row: goal.row,
      col: goal.col,
    },
    obstacles: parsedObstacles.filter(
      (obstacle) =>
        !samePosition(obstacle, start) && !samePosition(obstacle, goal)
    ),
    terrain: parsedTerrain.filter(
      (cell) =>
        !samePosition(cell.position, start) &&
        !samePosition(cell.position, goal) &&
        !parsedObstacles.some((obstacle) =>
          samePosition(obstacle, cell.position)
        )
    ),
  };
}

function positionListIncludes(list: Position[], position: Position): boolean {
  return list.some((item) => samePosition(item, position));
}

function buildScenarioWithDynamicObstacle(
  scenario: Scenario,
  dynamicObstaclePosition: Position | null
): Scenario {
  if (!dynamicObstaclePosition) {
    return scenario;
  }

  if (positionListIncludes(scenario.obstacles, dynamicObstaclePosition)) {
    return scenario;
  }

  return {
    ...scenario,
    obstacles: [...scenario.obstacles, dynamicObstaclePosition],
    terrain: (scenario.terrain ?? []).filter(
      (cell) => !samePosition(cell.position, dynamicObstaclePosition)
    ),
  };
}

function chooseDynamicObstaclePosition(
  path: Position[],
  currentStep: number,
  scenario: Scenario
): Position | null {
  if (path.length < 5) {
    return null;
  }

  if (currentStep < 1 || currentStep >= path.length - 2) {
    return null;
  }

  const candidate = path[currentStep + 1];

  if (!candidate) {
    return null;
  }

  if (
    samePosition(candidate, scenario.start) ||
    samePosition(candidate, scenario.goal) ||
    positionListIncludes(scenario.obstacles, candidate)
  ) {
    return null;
  }

  return candidate;
}

function createReplanningScenario(
  scenario: Scenario,
  currentPosition: Position
): Scenario {
  return {
    ...scenario,
    start: currentPosition,
  };
}

function App() {
  const [selectedScenario, setSelectedScenario] =
    useState<Scenario>(defaultScenario);

  const [selectedPlanner, setSelectedPlanner] = useState<PlannerName>("BFS");

  const [selectedEditorTool, setSelectedEditorTool] =
    useState<EditorTool>("obstacle");
  const [customScenario, setCustomScenario] = useState<Scenario | null>(null);
  const scenarioFileInputRef = useRef<HTMLInputElement | null>(null);

  const [plannedAlgorithm, setPlannedAlgorithm] =
    useState<PlannerName | null>(null);

  const [robotPosition, setRobotPosition] = useState<Position>(
    defaultScenario.start
  );

  const [plannerResult, setPlannerResult] = useState<PlannerResult>({
    path: [],
    visited: [],
    success: false,
    pathCost: 0,
  });

  const [visibleVisited, setVisibleVisited] = useState<Position[]>([]);
  const [visiblePath, setVisiblePath] = useState<Position[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const [dynamicObstacleMode, setDynamicObstacleMode] = useState(false);
  const [dynamicObstaclePosition, setDynamicObstaclePosition] =
    useState<Position | null>(null);
  const [replanCount, setReplanCount] = useState(0);

  const [metrics, setMetrics] = useState<SimulationMetrics>({
    algorithm: selectedPlanner,
    pathLength: 0,
    nodesVisited: 0,
    currentStep: 0,
    runtimeMs: 0,
    status: "idle",
  });

  const [localizationSamples, setLocalizationSamples] = useState<
    LocalizationSample[]
  >([]);

  const [localizationStep, setLocalizationStep] = useState(0);

  const currentLocalizationSample = localizationSamples[localizationStep];

  const localizationMetrics = calculateLocalizationMetrics(
    localizationSamples,
    localizationStep
  );

  // Sensor readings are recalculated whenever the robot position or scenario
  // changes, so the sensor panel updates during robot movement.
  const displayedScenario = useMemo(
    () =>
      buildScenarioWithDynamicObstacle(
        selectedScenario,
        dynamicObstaclePosition
      ),
    [selectedScenario, dynamicObstaclePosition]
  );

  const sensorReadings = useMemo(
    () => getRangeSensorReadings(displayedScenario, robotPosition, 5),
    [displayedScenario, robotPosition]
  );

  const scenarioOptions = useMemo(
    () => (customScenario ? [customScenario, ...scenarios] : scenarios),
    [customScenario]
  );

  // Runs the currently selected path planner and measures its runtime.  
  function runPlannerForScenario(
    planner: PlannerName,
    scenario: Scenario
  ): {
    result: PlannerResult;
    runtimeMs: number;
  } {
    const startTime = performance.now();

    const result =
      planner === "BFS"
        ? runBfs(scenario)
        : planner === "A*"
          ? runAstar(scenario)
          : runDijkstra(scenario);

    const runtimeMs = performance.now() - startTime;

    return {
      result,
      runtimeMs,
    };
  }

  function resetSimulation(
    planner: PlannerName = selectedPlanner,
    scenario: Scenario = selectedScenario
  ) {
    setPlannerResult({
      path: [],
      visited: [],
      success: false,
      pathCost: 0,
    });

    setPlannedAlgorithm(null);
    setVisibleVisited([]);
    setVisiblePath([]);
    setIsAnimating(false);
    setDynamicObstaclePosition(null);
    setReplanCount(0);
    setRobotPosition(scenario.start);
    setLocalizationSamples([]);
    setLocalizationStep(0);

    setMetrics({
      algorithm: planner,
      pathLength: 0,
      nodesVisited: 0,
      currentStep: 0,
      runtimeMs: 0,
      status: "idle",
    });
  }

  function runSelectedPlanner(planner: PlannerName = selectedPlanner): {
    result: PlannerResult;
    runtimeMs: number;
  } {
    return runPlannerForScenario(planner, displayedScenario);
  }

  function handleScenarioChange(scenarioName: string) {
    const nextScenario =
      scenarioOptions.find((scenario) => scenario.name === scenarioName) ??
      defaultScenario;

    setSelectedScenario(nextScenario);
    resetSimulation(selectedPlanner, nextScenario);
  }

  function handlePlannerChange(planner: PlannerName) {
    setSelectedPlanner(planner);
    resetSimulation(planner, selectedScenario);
  }

  function handleDynamicObstacleModeToggle() {
    if (isAnimating) {
      return;
    }

    setDynamicObstacleMode((currentValue) => !currentValue);
    resetSimulation(selectedPlanner, selectedScenario);
  }

  function handleResetSimulation() {
    resetSimulation(selectedPlanner, selectedScenario);
  }

  function handleCellEdit(position: Position) {
    if (isAnimating) {
      return;
    }

    let nextScenario: Scenario = selectedScenario;

    if (selectedEditorTool === "start") {
      if (samePosition(position, selectedScenario.goal)) {
        return;
      }

      nextScenario = clearScenarioTerrain(
        {
          ...selectedScenario,
          start: position,
          obstacles: removePosition(selectedScenario.obstacles, position),
        },
        position
      );
    }

    if (selectedEditorTool === "goal") {
      if (samePosition(position, selectedScenario.start)) {
        return;
      }

      nextScenario = clearScenarioTerrain(
        {
          ...selectedScenario,
          goal: position,
          obstacles: removePosition(selectedScenario.obstacles, position),
        },
        position
      );
    }

    if (selectedEditorTool === "obstacle") {
      if (
        samePosition(position, selectedScenario.start) ||
        samePosition(position, selectedScenario.goal)
      ) {
        return;
      }

      const alreadyObstacle = selectedScenario.obstacles.some((obstacle) =>
        samePosition(obstacle, position)
      );

      nextScenario = clearScenarioTerrain(
        {
          ...selectedScenario,
          obstacles: alreadyObstacle
            ? removePosition(selectedScenario.obstacles, position)
            : [...selectedScenario.obstacles, position],
        },
        position
      );
    }

    if (selectedEditorTool === "rough" || selectedEditorTool === "slow") {
      if (
        samePosition(position, selectedScenario.start) ||
        samePosition(position, selectedScenario.goal) ||
        selectedScenario.obstacles.some((obstacle) =>
          samePosition(obstacle, position)
        )
      ) {
        return;
      }

      const existingTerrain = selectedScenario.terrain?.find((cell) =>
        samePosition(cell.position, position)
      );

      if (existingTerrain?.type === selectedEditorTool) {
        nextScenario = clearScenarioTerrain(selectedScenario, position);
      } else {
        nextScenario = setScenarioTerrain(
          selectedScenario,
          position,
          selectedEditorTool
        );
      }
    }

    if (selectedEditorTool === "clear") {
      nextScenario = clearScenarioTerrain(
        {
          ...selectedScenario,
          obstacles: removePosition(selectedScenario.obstacles, position),
        },
        position
      );
    }

    setSelectedScenario(nextScenario);
    resetSimulation(selectedPlanner, nextScenario);
  }

  function handleExportScenario() {
    const scenarioJson = JSON.stringify(selectedScenario, null, 2);
    const blob = new Blob([scenarioJson], {
      type: "application/json",
    });

    const safeName =
      selectedScenario.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "custom-scenario";

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${safeName}.json`;
    link.click();

    window.URL.revokeObjectURL(url);
  }

  function handleChooseScenarioFile() {
    scenarioFileInputRef.current?.click();
  }

  function handleImportScenario(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsedJson = JSON.parse(String(reader.result));
        const importedScenario = parseImportedScenario(parsedJson);

        if (!importedScenario) {
          window.alert("Invalid scenario file. Please import a valid scenario JSON file.");
          return;
        }

        const scenarioToLoad = {
          ...importedScenario,
          name: importedScenario.name.startsWith("Custom:")
            ? importedScenario.name
            : `Custom: ${importedScenario.name}`,
        };

        setCustomScenario(scenarioToLoad);
        setSelectedScenario(scenarioToLoad);
        resetSimulation(selectedPlanner, scenarioToLoad);
      } catch {
        window.alert("Could not read this scenario file. Please check that it is valid JSON.");
      } finally {
        input.value = "";
      }
    };

    reader.onerror = () => {
      window.alert("Could not read this scenario file.");
      input.value = "";
    };

    reader.readAsText(file);
  }

  function handlePlanPath() {
    setLocalizationSamples([]);
    setLocalizationStep(0);
    setMetrics((currentMetrics) => ({
      ...currentMetrics,
      algorithm: selectedPlanner,
      status: "planning",
    }));

    const { result, runtimeMs } = runSelectedPlanner();

    setPlannerResult(result);
    setPlannedAlgorithm(selectedPlanner);
    setVisibleVisited(result.visited);
    setVisiblePath(result.path);

    setMetrics({
      algorithm: selectedPlanner,
      pathLength: Math.max(result.path.length - 1, 0),
      nodesVisited: result.visited.length,
      currentStep: 0,
      runtimeMs,
      status: result.success ? "complete" : "failed",
    });
  }
  // Animates the planner's search process by revealing visited cells one at a time
  // before displaying the final path.
  function handleVisualizeSearch() {
    setLocalizationSamples([]);
    setLocalizationStep(0);
    const { result, runtimeMs } = runSelectedPlanner();

    setRobotPosition(selectedScenario.start);
    setPlannerResult(result);
    setPlannedAlgorithm(selectedPlanner);
    setVisibleVisited([]);
    setVisiblePath([]);
    setIsAnimating(true);

    setMetrics({
      algorithm: selectedPlanner,
      pathLength: Math.max(result.path.length - 1, 0),
      nodesVisited: result.visited.length,
      currentStep: 0,
      runtimeMs,
      status: result.success ? "searching" : "failed",
    });

    if (!result.success) {
      setVisibleVisited(result.visited);
      setIsAnimating(false);
      return;
    }

    let visitedIndex = 0;

    const searchIntervalId = window.setInterval(() => {
      const nextVisitedCells = result.visited.slice(0, visitedIndex + 1);

      setVisibleVisited(nextVisitedCells);

      setMetrics({
        algorithm: selectedPlanner,
        pathLength: Math.max(result.path.length - 1, 0),
        nodesVisited: result.visited.length,
        currentStep: visitedIndex,
        runtimeMs,
        status:
          visitedIndex === result.visited.length - 1 ? "complete" : "searching",
      });

      visitedIndex++;

      if (visitedIndex >= result.visited.length) {
        window.clearInterval(searchIntervalId);
        setVisiblePath(result.path);
        setIsAnimating(false);
      }
    }, 18);
  }
  // Animates the robot along the planned path. If no current plan exists,
  // the selected planner is run first.
  function handleAnimate() {
    const canUseExistingPlan =
      plannerResult.path.length > 0 &&
      plannedAlgorithm === selectedPlanner &&
      !dynamicObstacleMode &&
      !dynamicObstaclePosition;

    const plannerRun = canUseExistingPlan
      ? {
        result: plannerResult,
        runtimeMs: metrics.runtimeMs,
      }
      : runPlannerForScenario(selectedPlanner, displayedScenario);

    const { result, runtimeMs } = plannerRun;

    if (!result.success || result.path.length === 0) {
      setMetrics({
        algorithm: selectedPlanner,
        pathLength: 0,
        nodesVisited: result.visited.length,
        currentStep: 0,
        runtimeMs,
        status: "failed",
      });
      return;
    }

    let activePath = result.path;
    let activeVisited = result.visited;
    let activeRuntimeMs = runtimeMs;
    let runtimeScenario = displayedScenario;
    let obstacleHasBeenInserted = dynamicObstaclePosition !== null;

    setPlannerResult(result);
    setPlannedAlgorithm(selectedPlanner);
    setIsAnimating(true);
    setVisibleVisited(activeVisited);
    setVisiblePath(activePath);
    setLocalizationSamples(buildLocalizationSamples(activePath));
    setLocalizationStep(0);

    setMetrics({
      algorithm: selectedPlanner,
      pathLength: Math.max(activePath.length - 1, 0),
      nodesVisited: activeVisited.length,
      currentStep: 0,
      runtimeMs: activeRuntimeMs,
      status: "running",
    });

    let step = 0;

    const movementIntervalId = window.setInterval(() => {
      const currentPosition = activePath[step];

      if (!currentPosition) {
        window.clearInterval(movementIntervalId);
        setIsAnimating(false);
        return;
      }

      setRobotPosition(currentPosition);
      setLocalizationStep(step);

      if (
        dynamicObstacleMode &&
        !obstacleHasBeenInserted &&
        step > 0 &&
        step < activePath.length - 2
      ) {
        const newObstaclePosition = chooseDynamicObstaclePosition(
          activePath,
          step,
          runtimeScenario
        );

        if (newObstaclePosition) {
          obstacleHasBeenInserted = true;
          runtimeScenario = buildScenarioWithDynamicObstacle(
            runtimeScenario,
            newObstaclePosition
          );

          setDynamicObstaclePosition(newObstaclePosition);
        }
      }

      const nextPosition = activePath[step + 1];
      const routeIsBlocked =
        nextPosition &&
        positionListIncludes(runtimeScenario.obstacles, nextPosition);

      if (routeIsBlocked) {
        const replanningScenario = createReplanningScenario(
          runtimeScenario,
          currentPosition
        );

        const replanRun = runPlannerForScenario(
          selectedPlanner,
          replanningScenario
        );

        activeRuntimeMs += replanRun.runtimeMs;

        if (!replanRun.result.success || replanRun.result.path.length === 0) {
          setPlannerResult(replanRun.result);
          setVisibleVisited(replanRun.result.visited);
          setVisiblePath([]);
          setMetrics({
            algorithm: selectedPlanner,
            pathLength: 0,
            nodesVisited: replanRun.result.visited.length,
            currentStep: step,
            runtimeMs: activeRuntimeMs,
            status: "failed",
          });
          window.clearInterval(movementIntervalId);
          setIsAnimating(false);
          return;
        }

        activePath = replanRun.result.path;
        activeVisited = replanRun.result.visited;
        step = 0;

        setReplanCount((currentCount) => currentCount + 1);
        setPlannerResult(replanRun.result);
        setPlannedAlgorithm(selectedPlanner);
        setVisibleVisited(activeVisited);
        setVisiblePath(activePath);
        setLocalizationSamples(buildLocalizationSamples(activePath));
        setLocalizationStep(0);

        setMetrics({
          algorithm: selectedPlanner,
          pathLength: Math.max(activePath.length - 1, 0),
          nodesVisited: activeVisited.length,
          currentStep: 0,
          runtimeMs: activeRuntimeMs,
          status: "running",
        });

        return;
      }

      setMetrics({
        algorithm: selectedPlanner,
        pathLength: Math.max(activePath.length - 1, 0),
        nodesVisited: activeVisited.length,
        currentStep: step,
        runtimeMs: activeRuntimeMs,
        status: step === activePath.length - 1 ? "complete" : "running",
      });

      step++;

      if (step >= activePath.length) {
        window.clearInterval(movementIntervalId);
        setIsAnimating(false);
      }
    }, 180);
  }

  return (
    <>
      <main className="app-shell">
        <header className="hero">
          <div>
            <p className="eyebrow">Autonomy Simulation Lab</p>
            <h1>Interactive Robot Navigation Simulator</h1>
            <p className="subtitle">
              A browser-based autonomy simulation for path planning, obstacle
              avoidance, scenario testing, and future navigation/localization
              experiments.
            </p>
          </div>
        </header>

        <section className="dashboard">
          <div className="simulator-card">
            <div className="card-header">
              <div>
                <h2>{selectedScenario.name}</h2>
                <p>
                  Compare BFS, A*, and Dijkstra path planning across configurable weighted
                  navigation environments.
                </p>
              </div>
            </div>

            <SimulatorGrid
              scenario={displayedScenario}
              robotPosition={robotPosition}
              path={visiblePath}
              visited={visibleVisited}
              sensorReadings={sensorReadings}
              localizationSample={currentLocalizationSample}
              onCellClick={handleCellEdit}
            />
            <div className="telemetry-strip" aria-label="Compact simulation telemetry">
              <div className="telemetry-pill">
                <span>Status</span>
                <strong>{metrics.status}</strong>
              </div>

              <div className="telemetry-pill">
                <span>Planner</span>
                <strong>{metrics.algorithm}</strong>
              </div>

              <div className="telemetry-pill">
                <span>Step</span>
                <strong>
                  {metrics.currentStep} / {metrics.pathLength}
                </strong>
              </div>

              <div className="telemetry-pill">
                <span>Replans</span>
                <strong>{replanCount}</strong>
              </div>

              <div className="telemetry-pill">
                <span>Dynamic Mode</span>
                <strong>{dynamicObstacleMode ? "On" : "Off"}</strong>
              </div>

              <div className="telemetry-pill">
                <span>Dynamic Obstacle</span>
                <strong>
                  {dynamicObstaclePosition
                    ? `(${dynamicObstaclePosition.row}, ${dynamicObstaclePosition.col})`
                    : "None"}
                </strong>
              </div>
            </div>
            
            <div className="legend">
              <span>
                <i className="legend-dot robot-dot"></i>Robot
              </span>
              <span>
                <i className="legend-dot start-dot"></i>Start
              </span>
              <span>
                <i className="legend-dot goal-dot"></i>Goal
              </span>
              <span>
                <i className="legend-dot obstacle-dot"></i>Obstacle
              </span>
              <span>
                <i className="legend-dot visited-dot"></i>Visited
              </span>
              <span>
                <i className="legend-dot path-dot"></i>Path
              </span>
              <span>
                <i className="legend-dot rough-dot"></i>Rough
              </span>
              <span>
                <i className="legend-dot slow-dot"></i>Slow
              </span>
            </div>
          </div>

          <aside className="sidebar">
            <ControlPanel
              scenarios={scenarioOptions}
              selectedScenarioName={selectedScenario.name}
              selectedPlanner={selectedPlanner}
              isAnimating={isAnimating}
              onScenarioChange={handleScenarioChange}
              onPlannerChange={handlePlannerChange}
              onPlanPath={handlePlanPath}
              onVisualizeSearch={handleVisualizeSearch}
              onAnimate={handleAnimate}
              onReset={handleResetSimulation}
            />

            <section className="panel">
              <h2>Dynamic Obstacles</h2>
              <p className="panel-description">
                Insert a dynamic obstacle during robot movement and replan from the robot&apos;s
                current position when the active route becomes blocked.
              </p>

              <button
                className={`secondary-button ${dynamicObstacleMode ? "active-mode-button" : ""}`}
                disabled={isAnimating}
                onClick={handleDynamicObstacleModeToggle}
              >
                {dynamicObstacleMode ? "Dynamic Mode On" : "Dynamic Mode Off"}
              </button>

              <p className="control-note">
                When enabled, a new obstacle can appear on the robot&apos;s planned route.
                The simulator detects the blocked route, replans, and continues toward the
                goal when a valid alternate path exists.
              </p>
            </section>

            <MetricsPanel
              metrics={metrics}
              dynamicObstacleMode={dynamicObstacleMode}
              replanCount={replanCount}
              dynamicObstaclePosition={dynamicObstaclePosition}
            />

            <section className="panel">
              <h2>Scenario Editor</h2>
              <p className="panel-description">
                Click grid cells to customize the current navigation scenario.
              </p>

              <div className="editor-tools">
                {(["start", "goal", "obstacle", "rough", "slow", "clear"] as EditorTool[]).map(
                  (tool) => (
                    <button
                      key={tool}
                      className={`editor-tool-button ${selectedEditorTool === tool ? "active-editor-tool" : ""
                        }`}
                      disabled={isAnimating}
                      onClick={() => setSelectedEditorTool(tool)}
                    >
                      {tool === "start"
                        ? "Start"
                        : tool === "goal"
                          ? "Goal"
                          : tool === "obstacle"
                            ? "Obstacle"
                            : tool === "rough"
                              ? "Rough"
                              : tool === "slow"
                                ? "Slow"
                                : "Clear"}
                    </button>
                  )
                )}
              </div>

              <div className="editor-actions">
                <button
                  className="secondary-button"
                  disabled={isAnimating}
                  onClick={handleExportScenario}
                >
                  Export Scenario
                </button>

                <button
                  className="secondary-button"
                  disabled={isAnimating}
                  onClick={handleChooseScenarioFile}
                >
                  Import Scenario
                </button>

                <input
                  ref={scenarioFileInputRef}
                  className="hidden-file-input"
                  type="file"
                  accept="application/json,.json"
                  onChange={handleImportScenario}
                />
              </div>
            </section>
          </aside>
        </section>
      </main>
      <section className="dashboard-grid">
        <SensorPanel readings={sensorReadings} />

        <LocalizationPanel
          sample={currentLocalizationSample}
          metrics={localizationMetrics}
        />

        <TelemetryExportPanel
          scenario={selectedScenario}
          algorithm={plannedAlgorithm ?? selectedPlanner}
          metrics={metrics}
          path={visiblePath}
          visited={visibleVisited}
          localizationSamples={localizationSamples}
        />

        <PlannerComparisonPanel scenario={selectedScenario} />
      </section>
    </>
  );
}

export default App;