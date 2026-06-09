import { useMemo } from "react";
import type { Scenario } from "../simulation/types";
import { comparePlanners } from "../planning/comparePlanners";

type PlannerComparisonPanelProps = {
  scenario: Scenario;
};

export default function PlannerComparisonPanel({
  scenario,
}: PlannerComparisonPanelProps) {
  const comparisons = useMemo(() => comparePlanners(scenario), [scenario]);

  return (
    <section className="panel">
      <h2>Planner Comparison</h2>

      <div className="comparison-table">
        <div className="comparison-header">
          <span>Planner</span>
          <span>Steps</span>
          <span>Cost</span>
          <span>Visited</span>
          <span>Runtime</span>
          <span>Directness</span>
        </div>

        {comparisons.map((comparison) => (
          <div className="comparison-row" key={comparison.algorithm}>
            <strong>{comparison.algorithm}</strong>
            <span>{comparison.success ? comparison.pathLength : "Failed"}</span>
            <span>{comparison.success ? comparison.pathCost.toFixed(1) : "—"}</span>
            <span>{comparison.nodesVisited}</span>
            <span>{comparison.runtimeMs.toFixed(2)} ms</span>
            <span>{comparison.directnessScore.toFixed(1)}%</span>
          </div>
        ))}
      </div>

      <p className="panel-note">
        Steps count robot movements, while cost accounts for weighted terrain.
        Directness compares final path steps against visited search cells; higher
        values mean the planner searched more directly toward the final route.
      </p>
    </section>
  );
}