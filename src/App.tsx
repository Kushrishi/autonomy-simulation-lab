import { useState } from "react";
import ControlPanel from "./components/ControlPanel";
import MetricsPanel from "./components/MetricsPanel";
import SimulatorGrid from "./components/SimulatorGrid";
import { runBfs } from "./planning/bfs";
import { defaultScenario } from "./simulation/scenarios";
import type { PlannerResult, Position, SimulationMetrics } from "./simulation/types";

function App() {
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
    pathLength: 0,
    nodesVisited: 0,
    currentStep: 0,
    status: "idle",
  });

  function handlePlanPath() {
    const result = runBfs(defaultScenario);

    setPlannerResult(result);
    setVisibleVisited(result.visited);
    setVisiblePath(result.path);

    setMetrics({
      pathLength: result.path.length,
      nodesVisited: result.visited.length,
      currentStep: 0,
      status: result.success ? "complete" : "failed",
    });
  }

  function handleAnimate() {
    const result =
      plannerResult.path.length > 0 ? plannerResult : runBfs(defaultScenario);

    if (!result.success || result.path.length === 0) {
      setMetrics({
        pathLength: 0,
        nodesVisited: result.visited.length,
        currentStep: 0,
        status: "failed",
      });
      return;
    }

    setIsAnimating(true);
    setVisibleVisited(result.visited);
    setVisiblePath(result.path);

    setMetrics({
      pathLength: result.path.length,
      nodesVisited: result.visited.length,
      currentStep: 0,
      status: "running",
    });

    let step = 0;

    const intervalId = window.setInterval(() => {
      const nextPosition = result.path[step];

      setRobotPosition(nextPosition);

      setMetrics({
        pathLength: result.path.length,
        nodesVisited: result.visited.length,
        currentStep: step,
        status: step === result.path.length - 1 ? "complete" : "running",
      });

      step++;

      if (step >= result.path.length) {
        window.clearInterval(intervalId);
        setIsAnimating(false);
      }
    }, 180);
  }

  function handleReset() {
    setRobotPosition(defaultScenario.start);
    setPlannerResult({
      path: [],
      visited: [],
      success: false,
    });
    setVisibleVisited([]);
    setVisiblePath([]);
    setIsAnimating(false);
    setMetrics({
      pathLength: 0,
      nodesVisited: 0,
      currentStep: 0,
      status: "idle",
    });
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
                BFS path planning from start to goal through a simulated
                warehouse environment.
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
            onPlanPath={handlePlanPath}
            onAnimate={handleAnimate}
            onReset={handleReset}
            isAnimating={isAnimating}
          />

          <MetricsPanel metrics={metrics} />
        </aside>
      </section>
    </main>
  );
}

export default App;