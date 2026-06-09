import { useMemo, useState } from "react";
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
import {
  buildLocalizationSamples,
  calculateLocalizationMetrics,
} from "./localization/localization";
import type {
  PlannerName,
  PlannerResult,
  Position,
  Scenario,
  SimulationMetrics,
  LocalizationSample,    
} from "./simulation/types";

function App() {
  const [selectedScenario, setSelectedScenario] =
    useState<Scenario>(defaultScenario);

  const [selectedPlanner, setSelectedPlanner] = useState<PlannerName>("BFS");

  const [plannedAlgorithm, setPlannedAlgorithm] =
    useState<PlannerName | null>(null);

  const [robotPosition, setRobotPosition] = useState<Position>(
    defaultScenario.start
  );

  const [plannerResult, setPlannerResult] = useState<PlannerResult>({
    path: [],
    visited: [],
    success: false,
  });

  const [visibleVisited, setVisibleVisited] = useState<Position[]>([]);
  const [visiblePath, setVisiblePath] = useState<Position[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

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
  const sensorReadings = useMemo(
  () => getRangeSensorReadings(selectedScenario, robotPosition, 5),
  [selectedScenario, robotPosition]
);
  // Runs the currently selected path planner and measures its runtime.  
  function runSelectedPlanner(
    scenario: Scenario = selectedScenario
  ): {
    result: PlannerResult;
    runtimeMs: number;
  } {
    const startTime = performance.now();

    const result =
      selectedPlanner === "BFS" ? runBfs(scenario) : runAstar(scenario);

    const endTime = performance.now();

    return {
      result,
      runtimeMs: endTime - startTime,
    };
  }
  // Resets robot position, planner output, visualization state, and telemetry.
  function resetSimulation(
    planner: PlannerName = selectedPlanner,
    scenario: Scenario = selectedScenario
  ) {
    setLocalizationSamples([]);
    setLocalizationStep(0);
    setRobotPosition(scenario.start);
    setPlannerResult({
      path: [],
      visited: [],
      success: false,
    });
    setVisibleVisited([]);
    setVisiblePath([]);
    setPlannedAlgorithm(null);
    setIsAnimating(false);
    setMetrics({
      algorithm: planner,
      pathLength: 0,
      nodesVisited: 0,
      currentStep: 0,
      runtimeMs: 0,
      status: "idle",
    });
  }

  function handleScenarioChange(scenarioName: string) {
    const nextScenario =
      scenarios.find((scenario) => scenario.name === scenarioName) ??
      defaultScenario;

    setSelectedScenario(nextScenario);
    resetSimulation(selectedPlanner, nextScenario);
  }

  function handlePlannerChange(planner: PlannerName) {
    setSelectedPlanner(planner);
    resetSimulation(planner, selectedScenario);
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
      pathLength: result.path.length,
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
      pathLength: result.path.length,
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
        pathLength: result.path.length,
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
      plannerResult.path.length > 0 && plannedAlgorithm === selectedPlanner;

    const plannerRun = canUseExistingPlan
      ? {
          result: plannerResult,
          runtimeMs: metrics.runtimeMs,
        }
      : runSelectedPlanner();

    const { result, runtimeMs } = plannerRun;
    const nextLocalizationSamples = buildLocalizationSamples(result.path);

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

    setPlannerResult(result);
    setPlannedAlgorithm(selectedPlanner);
    setIsAnimating(true);
    setVisibleVisited(result.visited);
    setVisiblePath(result.path);
    setLocalizationSamples(nextLocalizationSamples);
    setLocalizationStep(0);

    setMetrics({
      algorithm: selectedPlanner,
      pathLength: result.path.length,
      nodesVisited: result.visited.length,
      currentStep: 0,
      runtimeMs,
      status: "running",
    });

    let step = 0;

    const movementIntervalId = window.setInterval(() => {
      const nextPosition = result.path[step];

      setRobotPosition(nextPosition);
      setLocalizationStep(step);
      setMetrics({
        algorithm: selectedPlanner,
        pathLength: result.path.length,
        nodesVisited: result.visited.length,
        currentStep: step,
        runtimeMs,
        status: step === result.path.length - 1 ? "complete" : "running",
      });

      step++;

      if (step >= result.path.length) {
        window.clearInterval(movementIntervalId);
        setIsAnimating(false);
      }
    }, 180);
  }

  return (
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
                Compare BFS and A* path planning across configurable simulated
                navigation environments.
              </p>
            </div>
          </div>

          <SimulatorGrid
  scenario={selectedScenario}
  robotPosition={robotPosition}
  path={visiblePath}
  visited={visibleVisited}
  sensorReadings={sensorReadings}
  localizationSample={currentLocalizationSample}
/>

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
          </div>
        </div>

        <aside className="side-panel">
          <ControlPanel
            scenarios={scenarios}
            selectedScenarioName={selectedScenario.name}
            selectedPlanner={selectedPlanner}
            onScenarioChange={handleScenarioChange}
            onPlannerChange={handlePlannerChange}
            onPlanPath={handlePlanPath}
            onVisualizeSearch={handleVisualizeSearch}
            onAnimate={handleAnimate}
            onReset={() => resetSimulation()}
            isAnimating={isAnimating}
          />

          <MetricsPanel metrics={metrics} />

<SensorPanel readings={sensorReadings} />
<LocalizationPanel
  sample={currentLocalizationSample}
  metrics={localizationMetrics}
/>
<PlannerComparisonPanel scenario={selectedScenario} />
        </aside>
      </section>
    </main>
  );
}

export default App;