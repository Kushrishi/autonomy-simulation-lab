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

      <div className="comparison-scroll">
        <table className="comparison-table" aria-label="Planner comparison">
          <thead>
          <tr className="comparison-header">
            <th scope="col">Planner</th>
            <th scope="col">Steps</th>
            <th scope="col">Cost</th>
            <th scope="col">Visited</th>
            <th scope="col">Runtime</th>
            <th scope="col">Directness</th>
          </tr>
          </thead>
          <tbody>
          {comparisons.map((comparison) => (
            <tr className="comparison-row" key={comparison.algorithm}>
              <th scope="row">{comparison.algorithm}</th>
              <td>{comparison.success ? comparison.pathLength : "Failed"}</td>
              <td>{comparison.success ? comparison.pathCost.toFixed(1) : "—"}</td>
              <td>{comparison.nodesVisited}</td>
              <td>{comparison.runtimeMs.toFixed(2)} ms</td>
              <td>{comparison.directnessScore.toFixed(1)}%</td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>

      <p className="panel-note">
        Steps count robot movements, while cost accounts for weighted terrain.
        Directness compares final path steps against visited search cells; higher
        values mean the planner searched more directly toward the final route.
      </p>
    </section>
  );
}