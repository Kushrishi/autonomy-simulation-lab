type ControlPanelProps = {
  onPlanPath: () => void;
  onAnimate: () => void;
  onReset: () => void;
  isAnimating: boolean;
};

export default function ControlPanel({
  onPlanPath,
  onAnimate,
  onReset,
  isAnimating,
}: ControlPanelProps) {
  return (
    <section className="panel">
      <h2>Controls</h2>

      <button onClick={onPlanPath} disabled={isAnimating}>
        Plan Path
      </button>

      <button onClick={onAnimate} disabled={isAnimating}>
        Run Simulation
      </button>

      <button onClick={onReset}>Reset</button>

      <div className="control-note">
        Planner: <strong>BFS</strong>
      </div>
    </section>
  );
}