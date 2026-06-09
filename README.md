# Autonomy Simulation Lab

![CI](https://github.com/Kushrishi/autonomy-simulation-lab/actions/workflows/ci.yml/badge.svg)

An interactive robotics and autonomy simulation project focused on robot navigation, path planning, search visualization, sensor simulation, localization, telemetry export, and analysis.

This project is designed as a portfolio-focused engineering system that starts with a browser-based robot navigation simulator and gradually expands into more advanced autonomy, navigation, and GNSS-inspired concepts.

## Current Version

The current version implements a visual grid-based autonomy simulator using React, TypeScript, and Vite.

The simulator includes:

* A 2D grid-based navigation environment
* Start and goal positions
* Obstacle cells
* Rough and slow weighted terrain cells
* Multiple configurable navigation scenarios
* Breadth-first search path planning
* A* path planning with Manhattan distance
* Dijkstra path planning for weighted terrain
* Planner selection between BFS, A*, and Dijkstra
* Animated search expansion visualization
* Final path visualization
* Animated robot movement
* Live telemetry metrics
* Cost-aware planner comparison dashboard
* Four-direction range sensor simulation
* Sensor ray visualization
* Obstacle hit highlighting
* Sensor telemetry panel
* GNSS-inspired noisy localization simulation
* True, measured, and estimated position tracking
* Localization error metrics including RMSE
* Telemetry export to JSON and CSV
* Python analysis scripts for exported telemetry
* Automated validation tests for planner and localization behavior
* Professional dark UI

## Demo Scenarios

The simulator currently supports multiple test environments:

* Warehouse Navigation Demo
* Maze Navigation Demo
* Obstacle Course Demo
* Weighted Terrain Demo

These scenarios allow BFS, A*, and Dijkstra to be tested across different obstacle layouts, terrain-cost patterns, and navigation conditions.

## Path Planning

The project currently supports three path-planning algorithms.

### Breadth-First Search

BFS explores the grid outward from the start position and finds the shortest path by number of steps in an unweighted grid. In this simulator, BFS treats all traversable cells equally, so it does not optimize for terrain cost.

BFS is useful for demonstrating complete search behavior, but it often explores many cells before reaching the goal.

### A* Search

A* uses Manhattan distance as a heuristic to prioritize cells that appear closer to the goal.

In this project, A* uses terrain-aware movement cost for accumulated path cost and Manhattan distance for goal-directed search. This allows A* to find low-cost paths while often visiting far fewer cells than Dijkstra.

### Dijkstra Search

Dijkstra search computes the lowest-cost path through the grid using accumulated terrain movement cost.

Unlike BFS, Dijkstra accounts for rough and slow terrain. Unlike A*, it does not use a heuristic, so it can explore more cells while still finding the lowest-cost route.

## Weighted Terrain

The simulator supports weighted terrain cells:

* Normal terrain: standard movement cost
* Rough terrain: increased movement cost
* Slow terrain: high movement cost

BFS ignores these costs during planning, while A* and Dijkstra use them to find lower-cost routes.

The Weighted Terrain Demo is designed to show the difference between shortest-step planning and cost-aware planning.

## Planner Comparison

The simulator includes a planner comparison dashboard showing:

* Algorithm name
* Path steps
* Path cost
* Nodes visited
* Runtime
* Search directness

Path steps count robot movements from start to goal. Path cost accounts for weighted terrain. Search directness compares final path steps against visited search cells; higher values indicate that the planner searched more directly toward the final route.

## Sensor Simulation

The simulator includes a simple four-direction range sensor system.

The robot scans:

* Up
* Down
* Left
* Right

Each sensor reports whether an obstacle is detected within range and how far away it is. Sensor rays are visualized on the grid, and detected obstacles are highlighted.

This introduces a robotics-style sensing layer beyond basic path planning.

## GNSS-Inspired Localization

The simulator includes a GNSS-inspired localization layer.

During robot movement, the system tracks:

* True robot position
* Noisy measured position
* Smoothed estimated position
* Current localization error
* Average localization error
* Maximum localization error
* RMSE

The measured position simulates noisy GNSS-style observations. The estimated position applies simple smoothing to reduce measurement noise.

This is not intended to be a full GNSS least-squares solution or Kalman filter. It is an introductory localization simulation layer that connects path planning, noisy measurements, and error metrics.

## Telemetry Export

The simulator can export telemetry data to:

* JSON
* CSV

Exported telemetry includes planner information, path cells, visited cells, terrain-aware path cost, runtime metrics, robot trajectory data, and localization samples.

This allows the browser simulation to connect with external analysis tools.

## Python Analysis

The project includes Python scripts for analyzing exported telemetry.

The analysis tools can generate plots for:

* Robot trajectory
* Localization error over time
* Planner comparison metrics

This adds an offline data-analysis workflow similar to how robotics, autonomy, and navigation systems are often evaluated.

## Testing and Validation

The project includes automated validation tests using Vitest.

Current tests verify that:

* BFS, A*, and Dijkstra find correct paths on normal terrain
* BFS ignores terrain cost while A* and Dijkstra optimize weighted terrain cost
* A* matches Dijkstra on weighted-cost optimality
* Planners fail cleanly when the goal is blocked
* Localization samples are generated correctly
* RMSE is calculated consistently from localization error values

These tests help verify that the core algorithm behavior is correct as the project grows.

## How It Works

The simulator represents the robot environment as a grid. Each cell can represent empty space, an obstacle, rough terrain, slow terrain, the robot start position, the goal position, a visited search cell, a final path cell, a sensor scan cell, or a localized robot state.

The selected planner searches for a path from the start position to the goal while avoiding obstacles. Depending on the selected algorithm, the planner may optimize for shortest step count or lowest weighted terrain cost.

The application can show the result instantly or animate the search process step by step.

After a path is found, the robot can animate along the planned route while telemetry, sensor readings, and localization estimates update in real time.

## Current Tech Stack

* TypeScript
* React
* Vite
* CSS
* Vitest
* Python
* Pandas
* Matplotlib

## Running the Project

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build the project:

```bash
npm run build
```

Run validation tests:

```bash
npm test
```

## Planned Features

Future versions may add:

* Interactive scenario editing
* Dynamic obstacles and replanning
* Improved robot motion visualization
* Noisy range sensor readings
* More advanced localization filters
* C++ path-planning benchmark module
* GitHub Pages live demo
* Demo GIFs and screenshots
* Expanded README documentation with architecture diagrams

## Portfolio Relevance

This project is intended to demonstrate skills relevant to:

* Robotics simulation
* Autonomous navigation
* Path planning
* Search algorithm visualization
* Weighted graph search
* Sensor modeling
* Localization
* GNSS/navigation-inspired systems
* Telemetry and metrics
* Data export
* Python-based data analysis
* Algorithm validation
* Engineering software architecture
