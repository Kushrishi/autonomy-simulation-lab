import { useMemo } from "react";
import { comparePlanners } from "../planning/comparePlanners";
import type { Scenario } from "../simulation/types";

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
          <span>Path</span>
          <span>Visited</span>
          <span>Runtime</span>
          <span>Efficiency</span>
        </div>

        {comparisons.map((comparison) => (
          <div className="comparison-row" key={comparison.algorithm}>
            <strong>{comparison.algorithm}</strong>
            <span>{comparison.success ? comparison.pathLength : "Failed"}</span>
            <span>{comparison.nodesVisited}</span>
            <span>{comparison.runtimeMs.toFixed(2)} ms</span>
            <span>{comparison.efficiencyScore.toFixed(1)}%</span>
          </div>
        ))}
      </div>

      <p className="panel-note">
        Efficiency is calculated as path length divided by visited nodes. Higher
        values suggest the planner found a path while exploring fewer cells.
      </p>
    </section>
  );
}