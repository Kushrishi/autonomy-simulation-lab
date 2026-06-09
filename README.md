# Autonomy Simulation Lab

An interactive robotics and autonomy simulation project focused on robot navigation, path planning, search visualization, sensor simulation, localization, and telemetry analysis.

This project is designed as a portfolio-focused engineering system that starts with a browser-based robot navigation simulator and gradually expands into more advanced autonomy, navigation, and GNSS-inspired concepts.

## Current Version

The current version implements a visual grid-based autonomy simulator using React, TypeScript, and Vite.

The simulator includes:

* A 2D grid-based navigation environment
* Start and goal positions
* Obstacle cells
* Multiple configurable navigation scenarios
* Breadth-first search path planning
* A* path planning with Manhattan distance
* Planner selection between BFS and A*
* Animated search expansion visualization
* Final path visualization
* Animated robot movement
* Live telemetry metrics
* Planner comparison dashboard
* Four-direction range sensor simulation
* Sensor ray visualization
* Obstacle hit highlighting
* Sensor telemetry panel
* Professional dark UI

## Demo Scenarios

The simulator currently supports multiple test environments:

* Warehouse Navigation Demo
* Maze Navigation Demo
* Obstacle Course Demo
* Open Field Demo

These scenarios allow BFS and A* to be tested across different obstacle layouts and navigation conditions.

## Path Planning

The project currently supports two path-planning algorithms:

### Breadth-First Search

BFS explores the grid outward from the start position and finds the shortest path in an unweighted grid. It is useful for demonstrating complete search behavior, but it often explores many cells before reaching the goal.

### A* Search

A* uses Manhattan distance as a heuristic to prioritize cells that appear closer to the goal. In many scenarios, A* finds the same shortest path as BFS while visiting fewer cells.

## Planner Comparison

The simulator includes a planner comparison dashboard showing:

* Algorithm name
* Path length
* Nodes visited
* Runtime
* Search efficiency score

The efficiency score is calculated as path length divided by visited nodes. Higher values suggest that the planner found a path while exploring fewer cells.

## Sensor Simulation

The simulator includes a simple four-direction range sensor system.

The robot scans:

* Up
* Down
* Left
* Right

Each sensor reports whether an obstacle is detected within range and how far away it is. Sensor rays are visualized on the grid, and detected obstacles are highlighted.

This introduces a robotics-style sensing layer beyond basic path planning.

## How It Works

The simulator represents the robot environment as a grid. Each cell can represent empty space, an obstacle, the robot start position, the goal position, a visited search cell, a final path cell, or a sensor scan cell.

The selected planner searches for a path from the start position to the goal while avoiding obstacles. The application can either show the result instantly or animate the search process step by step.

After a path is found, the robot can animate along the planned route while telemetry updates in real time. Sensor readings update based on the robot's current position.

## Current Tech Stack

* TypeScript
* React
* Vite
* CSS

## Planned Features

Future versions will add:

* Dijkstra path planning
* Weighted terrain costs
* Improved robot motion visualization
* Noisy range sensor readings
* GNSS-inspired noisy position measurements
* True vs estimated trajectory comparison
* Localization error metrics
* Telemetry export to CSV/JSON
* Python-based analysis and plotting
* C++ path-planning benchmark module
* GitHub Pages live demo
* Demo GIFs and screenshots

## Portfolio Relevance

This project is intended to demonstrate skills relevant to:

* Robotics simulation
* Autonomous navigation
* Path planning
* Search algorithm visualization
* Sensor modeling
* Localization
* GNSS/navigation-inspired systems
* Telemetry and metrics
* Data visualization
* Algorithm implementation
* Engineering software architecture
