import { useState } from "react";
import ControlPanel from "./components/ControlPanel";
import MetricsPanel from "./components/MetricsPanel";
import SimulatorGrid from "./components/SimulatorGrid";
import { runAstar } from "./planning/astar";
import { runBfs } from "./planning/bfs";
import { defaultScenario } from "./simulation/scenarios";
import type {
  PlannerName,
  PlannerResult,
  Position,
  SimulationMetrics,
} from "./simulation/types";

function App() {
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

  function runSelectedPlanner(): {
    result: PlannerResult;
    runtimeMs: number;
  } {
    const startTime = performance.now();

    const result =
      selectedPlanner === "BFS"
        ? runBfs(defaultScenario)
        : runAstar(defaultScenario);

    const endTime = performance.now();

    return {
      result,
      runtimeMs: endTime - startTime,
    };
  }

  function resetSimulation(planner: PlannerName = selectedPlanner) {
    setRobotPosition(defaultScenario.start);
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

  function handlePlannerChange(planner: PlannerName) {
    setSelectedPlanner(planner);
    resetSimulation(planner);
  }

  function handlePlanPath() {
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

    setMetrics({
      algorithm: selectedPlanner,
      pathLength: result.path.length,
      nodesVisited: result.visited.length,
      currentStep: 0,
      runtimeMs,
      status: "running",
    });

    let step = 0;

    const intervalId = window.setInterval(() => {
      const nextPosition = result.path[step];

      setRobotPosition(nextPosition);

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
        window.clearInterval(intervalId);
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
            avoidance, and future navigation/localization experiments.
          </p>
        </div>
      </header>

      <section className="dashboard">
        <div className="simulator-card">
          <div className="card-header">
            <div>
              <h2>{defaultScenario.name}</h2>
              <p>
                Compare BFS and A* path planning through a simulated warehouse
                environment.
              </p>
            </div>
          </div>

          <SimulatorGrid
            scenario={defaultScenario}
            robotPosition={robotPosition}
            path={visiblePath}
            visited={visibleVisited}
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
            selectedPlanner={selectedPlanner}
            onPlannerChange={handlePlannerChange}
            onPlanPath={handlePlanPath}
            onAnimate={handleAnimate}
            onReset={() => resetSimulation()}
            isAnimating={isAnimating}
          />

          <MetricsPanel metrics={metrics} />
        </aside>
      </section>
    </main>
  );
}

export default App;