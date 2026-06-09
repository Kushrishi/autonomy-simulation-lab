import type { PlannerName, Scenario } from "../simulation/types";

type ControlPanelProps = {
  scenarios: Scenario[];
  selectedScenarioName: string;
  selectedPlanner: PlannerName;
  isAnimating: boolean;
  onScenarioChange: (scenarioName: string) => void;
  onPlannerChange: (planner: PlannerName) => void;
  onPlanPath: () => void;
  onVisualizeSearch: () => void;
  onAnimate: () => void;
  onReset: () => void;
};

const plannerOptions: PlannerName[] = ["BFS", "A*", "Dijkstra"];

export default function ControlPanel({
  scenarios,
  selectedScenarioName,
  selectedPlanner,
  isAnimating,
  onScenarioChange,
  onPlannerChange,
  onPlanPath,
  onVisualizeSearch,
  onAnimate,
  onReset,
}: ControlPanelProps) {
  return (
    <section className="panel">
      <h2>Controls</h2>

      <label className="control-label" htmlFor="scenario-select">
        Scenario
      </label>
      <select
        id="scenario-select"
        value={selectedScenarioName}
        disabled={isAnimating}
        onChange={(event) => onScenarioChange(event.target.value)}
      >
        {scenarios.map((scenario) => (
          <option key={scenario.name} value={scenario.name}>
            {scenario.name}
          </option>
        ))}
      </select>

      <label className="control-label" htmlFor="planner-select">
        Path planner
      </label>
      <select
        id="planner-select"
        value={selectedPlanner}
        disabled={isAnimating}
        onChange={(event) => onPlannerChange(event.target.value as PlannerName)}
      >
        {plannerOptions.map((planner) => (
          <option key={planner} value={planner}>
            {planner}
          </option>
        ))}
      </select>

      <button disabled={isAnimating} onClick={onPlanPath}>
        Plan Path
      </button>

      <button disabled={isAnimating} onClick={onVisualizeSearch}>
        Visualize Search
      </button>

      <button disabled={isAnimating} onClick={onAnimate}>
        Run Simulation
      </button>

      <button disabled={isAnimating} onClick={onReset}>
        Reset
      </button>

      <p className="control-note">
        BFS treats all traversable cells equally. A* and Dijkstra use terrain
        costs to plan lower-cost paths through rough and slow zones.
      </p>
    </section>
  );
}