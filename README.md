# AI Project Risk Intelligence System

Meridian is an intelligent, AI-driven project risk management and simulation platform. It helps project managers and engineering leads to monitor, simulate, and mitigate project risks effectively.

## Features

- **Risk Simulation Engine**: Run "what-if" scenarios (add developers, extend deadlines, remove scope, etc.) and observe changes in the risk score.
- **Automated Mitigation Planning**: Generate AI-powered mitigation, recalibration, and remediation proposals.
- **Interactive Dashboard**: Modern UI built with React and Tailwind CSS providing visual feedback, risk graphs, and project health metrics.
- **Extensible Backend**: Powerful Python backend architecture that processes simulations, mutations, and risk analysis.

## Project Structure

- **`react-app/`**: Contains the frontend application, built with React, Vite, and TypeScript.
- **`api/`**: Contains FastAPI route definitions.
- **`core/`**: Contains core simulation engine logic (`whatif_engine.py`) and business logic.
- **`agents/`**: Contains AI agent logic that evaluates and determines intelligent mitigation plans.
- **`data/`**: Contains project data and baseline information.

## Getting Started

### Backend Setup

The backend requires Python 3.x.

1. Navigate to the `MAIN` directory.
2. Ensure you have the required dependencies (or set up a virtual environment).
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
3. Run the backend server using Uvicorn.

### Frontend Setup

The frontend requires Node.js and npm.

1. Navigate to the `react-app/` directory:
   ```bash
   cd react-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Workflow

To see the system in action:
1. Initialize the project with baseline data.
2. View the dashboard to see current project risk status based on multiple factors like Workload, Communication, Delays, and Dependencies.
3. Access specific pages to run mitigation scenarios, trigger remediation plans, and visually inspect predicted outcome changes.
