import type { PlannerName, Scenario } from "../simulation/types";

type ControlPanelProps = {
  scenarios: Scenario[];
  selectedScenarioName: string;
  selectedPlanner: PlannerName;
  onScenarioChange: (scenarioName: string) => void;
  onPlannerChange: (planner: PlannerName) => void;
  onPlanPath: () => void;
  onVisualizeSearch: () => void;
  onAnimate: () => void;
  onReset: () => void;
  isAnimating: boolean;
};

export default function ControlPanel({
  scenarios,
  selectedScenarioName,
  selectedPlanner,
  onScenarioChange,
  onPlannerChange,
  onPlanPath,
  onVisualizeSearch,
  onAnimate,
  onReset,
  isAnimating,
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
        <option value="BFS">BFS</option>
        <option value="A*">A*</option>
      </select>

      <button onClick={onPlanPath} disabled={isAnimating}>
        Plan Path
      </button>

      <button onClick={onVisualizeSearch} disabled={isAnimating}>
        Visualize Search
      </button>

      <button onClick={onAnimate} disabled={isAnimating}>
        Run Simulation
      </button>

      <button onClick={onReset}>Reset</button>

      <div className="control-note">
        Scenario: <strong>{selectedScenarioName}</strong>
        <br />
        Active planner: <strong>{selectedPlanner}</strong>
      </div>
    </section>
  );
}