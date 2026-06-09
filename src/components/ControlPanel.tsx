import type { PlannerName } from "../simulation/types";

type ControlPanelProps = {
  selectedPlanner: PlannerName;
  onPlannerChange: (planner: PlannerName) => void;
  onPlanPath: () => void;
  onVisualizeSearch: () => void;
  onAnimate: () => void;
  onReset: () => void;
  isAnimating: boolean;
};

export default function ControlPanel({
  selectedPlanner,
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
        Active planner: <strong>{selectedPlanner}</strong>
      </div>
    </section>
  );
}