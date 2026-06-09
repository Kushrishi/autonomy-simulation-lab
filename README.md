# Autonomy Simulation Lab

An interactive robotics and autonomy simulation project focused on robot navigation, path planning, visualization, sensors, localization, and telemetry analysis.

This project is designed as a portfolio-focused engineering system that starts with a browser-based robot navigation simulator and will gradually expand into more advanced autonomy concepts.

## Current Milestone

The current version implements a visual grid-based navigation simulator using React and TypeScript.

The simulator includes:

* A 2D grid environment
* Start and goal positions
* Obstacle cells
* Breadth-first search path planning
* Visited-cell visualization
* Final path visualization
* Animated robot movement
* Live telemetry metrics
* Professional dark UI

## Current Tech Stack

* TypeScript
* React
* Vite
* CSS

## How It Works

The simulator represents the robot environment as a grid. Each cell can represent empty space, an obstacle, the robot start position, or the goal position.

A breadth-first search planner explores the grid from the start position until it reaches the goal. The application visualizes both the cells explored by the planner and the final path selected for the robot.

The robot can then animate along the planned path while the telemetry panel updates metrics such as path length, nodes visited, current step, and simulation status.

## Planned Features

Future versions will add:

* A* path planning
* Dijkstra path planning
* Algorithm selection and comparison
* Multiple navigation scenarios
* Sensor ray visualization
* Simulated noisy range readings
* GNSS-inspired localization
* True vs estimated trajectory comparison
* Telemetry export to CSV/JSON
* Python-based analysis and plotting
* C++ path-planning benchmark module

## Portfolio Relevance

This project is intended to demonstrate skills relevant to:

* Robotics simulation
* Autonomous navigation
* Path planning
* Sensor modeling
* Localization
* Data visualization
* Algorithm implementation
* Engineering software architecture
* GNSS/navigation-inspired systems
