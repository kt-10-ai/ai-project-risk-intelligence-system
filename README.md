# Meridian — AI Project Risk Intelligence System

> **Real-time, multi-agent risk scoring, simulation, and mitigation for software projects.**

Meridian tracks 15 signals across 5 risk dimensions, runs deterministic scoring plus 10,000-run Monte Carlo simulations, and surfaces actionable mitigation plans — all through a live React dashboard backed by a FastAPI + Python engine.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Risk Model Explained](#risk-model-explained)
4. [API Reference](#api-reference)
5. [Project Structure](#project-structure)
6. [Running Individual Modules](#running-individual-modules)
7. [Configuration & Data](#configuration--data)
8. [Pages & What They Do](#pages--what-they-do)
9. [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Backend

```bash
# From the MAIN/ directory
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install fastapi uvicorn

# Start the server (always run from MAIN/ with PYTHONPATH set)
PYTHONPATH=. python -m uvicorn api.main:app --reload --port 8000
```

Verify it's running:
```bash
curl http://localhost:8000/api/health
# → {"status":"ok","system":"Meridian"}
```

### 2. Frontend

```bash
cd react-app
npm install
npm run dev
# → http://localhost:5173
```

The frontend proxies `/api/*` to `localhost:8000` automatically (configured in `vite.config.ts`).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                 │
│  Dashboard · Simulation · Dependency · Workload · ...   │
└────────────────────┬────────────────────────────────────┘
                     │ REST  /api/*
┌────────────────────▼────────────────────────────────────┐
│              FastAPI  (api/main.py + api/routes.py)      │
└────┬──────────────────────────────────────┬─────────────┘
     │                                      │
┌────▼──────────────┐            ┌──────────▼─────────────┐
│  supervisor_agent │            │   core/                 │
│  orchestrates 5   │            │   signal_extractor.py   │
│  specialist agents│            │   risk_formula.py       │
│                   │            │   whatif_engine.py      │
│  dependency_agent │            │   monte_carlo.py        │
│  workload_agent   │            └────────────────────────┘
│  scope_agent      │
│  delay_agent      │            ┌────────────────────────┐
│  comms_agent      │            │  data/                  │
└───────────────────┘            │  unified_project_state  │
                                 │  .json  ← source of     │
                                 │  truth for all signals  │
                                 └────────────────────────┘
```

**Request flow for `/api/analysis`:**

1. Load `unified_project_state.json`
2. `signal_extractor.py` → compute 15 normalised signals (0–1)
3. `risk_formula.py` → weighted aggregation → deterministic score (0–100)
4. 5 agents run in parallel (ThreadPoolExecutor) → each returns evidence + reasoning
5. `monte_carlo.py` → 10,000 simulations with Gaussian noise on each signal
6. JSON response returned to frontend

---

## Risk Model Explained

### Signals (15 total, all normalised 0–1)

| Dimension | Weight | Signals |
|-----------|--------|---------|
| **Dependency** | 30% | `blocked_task_ratio`, `critical_path_depth`, `dependency_centrality_max` |
| **Delay** | 25% | `overdue_task_ratio`, `stale_task_ratio`, `avg_pr_age_days` |
| **Workload** | 20% | `overloaded_dev_ratio`, `task_concentration_index`, `unassigned_task_ratio` |
| **Scope** | 15% | `mid_sprint_task_additions`, `scope_growth_rate`, `out_of_scope_pr_count` |
| **Comms** | 10% | `silent_dev_ratio`, `unanswered_thread_ratio`, `escalation_keyword_count` |

### Interaction Penalties (up to +9 pts)

Two compound conditions are checked **after** the base score:

| Condition | Penalty | Meaning |
|-----------|---------|---------|
| `critical_path_depth > 0.70` **AND** `overloaded_dev_ratio > 0.60` | +5 pts | Cascading failure risk |
| `overdue_task_ratio > 0.70` **AND** `silent_dev_ratio > 0.50` | +4 pts | Unresolved stall pattern |

### Risk Levels

| Score | Level |
|-------|-------|
| < 40 | 🟢 LOW |
| 40–59 | 🟡 MODERATE |
| 60–74 | 🟠 HIGH |
| ≥ 75 | 🔴 CRITICAL |

### Monte Carlo Simulation

`core/monte_carlo.py` adds **uncertainty modelling** on top of the deterministic score. Each of the 10,000 runs samples every signal from a Gaussian distribution:

- **Low-uncertainty signals** (overdue ratio, PR age, stale ratio): σ = 0.04
- **High-uncertainty signals** (comms: silent devs, unanswered threads, escalations): σ = 0.12
- **Everything else**: σ = 0.08

The output is a full probability distribution: P(CRITICAL), P5/P95 range, 95% confidence interval, and a plain-English verdict.

---

## API Reference

All endpoints are served at `http://localhost:8000`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/analysis` | Full risk analysis — score, agents, signals, Monte Carlo |
| `POST` | `/api/simulate` | What-if simulation with a single mutation |
| `GET` | `/api/monte-carlo` | Standalone Monte Carlo run (10,000 simulations) |
| `WS` | `/ws/analysis` | WebSocket stream: live per-agent events |

### POST `/api/simulate` — Mutation types

```json
{ "type": "add_developers", "count": 2 }
{ "type": "extend_deadline", "days": 14 }
{ "type": "remove_scope",    "task_count": 5 }
{ "type": "close_prs",       "pr_count": 3 }
```

Response includes `baseline`, `simulated`, and `delta` scores so you can see exactly how much each intervention moves the needle.

### GET `/api/monte-carlo` — Example response

```json
{
  "n_simulations": 10000,
  "mean_score": 76.98,
  "std_deviation": 3.52,
  "percentile_5": 70.6,
  "percentile_95": 81.7,
  "confidence_interval": { "lower": 70.1, "upper": 83.9 },
  "risk_level_distribution": { "LOW": 0.0, "MODERATE": 0.0, "HIGH": 27.4, "CRITICAL": 72.6 },
  "probability_critical": 0.726,
  "verdict": "LIKELY CRITICAL: 73% probability of CRITICAL status."
}
```

---

## Project Structure

```
MAIN/
├── api/
│   ├── main.py          # FastAPI app, CORS, mounts router + WebSocket
│   ├── routes.py        # All REST endpoints
│   ├── schemas.py       # Pydantic request/response models
│   └── websocket.py     # /ws/analysis streaming endpoint
│
├── agents/
│   ├── supervisor_agent.py     # Orchestrates all agents, returns final output
│   ├── dependency_agent.py     # Analyses blocked tasks, critical path
│   ├── workload_agent.py       # Analyses dev overload, task concentration
│   ├── scope_agent.py          # Detects scope creep, mid-sprint additions
│   ├── delay_agent.py          # Stale PRs, overdue tasks, PR age
│   ├── comms_agent.py          # Silent devs, unanswered threads, keywords
│   └── base_agent.py           # Shared agent utilities
│
├── core/
│   ├── signal_extractor.py     # Raw data → 15 normalised signals
│   ├── risk_formula.py         # Signals → weighted score + penalties
│   ├── whatif_engine.py        # Mutation engine for what-if scenarios
│   └── monte_carlo.py          # 10,000-run probabilistic risk simulation
│
├── data/
│   └── unified_project_state.json   # The project data Meridian reads from
│
├── react-app/
│   └── src/
│       ├── pages/           # One file per page (Dashboard, Simulation, ...)
│       ├── components/      # Reusable UI (Layout, RiskBadge, MonteCarloPanel, ...)
│       ├── api/
│       │   └── meridianApi.ts   # All API calls + TypeScript types
│       └── context/
│           ├── AuthContext.tsx  # Login/auth state
│           └── RiskContext.tsx  # Global risk analysis state
│
├── config.py         # Shared config (DATA_PATH, etc.)
└── .env              # Environment variables
```

---

## Running Individual Modules

You can run each core module directly to test it in isolation. **Always run from `MAIN/` with `PYTHONPATH=.`**

```bash
# Full risk score (deterministic)
PYTHONPATH=. python core/risk_formula.py

# Signal extraction only
PYTHONPATH=. python core/signal_extractor.py

# What-if simulation (4 built-in scenarios)
PYTHONPATH=. python core/whatif_engine.py

# Monte Carlo — 10,000 simulations
PYTHONPATH=. python core/monte_carlo.py

# Full supervisor agent run
PYTHONPATH=. python agents/supervisor_agent.py
```

Each script prints a formatted breakdown to stdout — useful for quick debugging without starting the full server.

---

## Configuration & Data

### `data/unified_project_state.json`

This is the **single source of truth** for all risk calculations. It contains:

- `tasks[]` — list of all project tasks with status, assignee, blocked-by
- `pull_requests[]` — open PRs with age and review state
- `team[]` — dev workload and activity timestamps
- `communications[]` — thread data, escalation keywords
- `metadata` — sprint info, simulated timestamp

To test with different project states, swap in a different JSON file at this path, then call `/api/analysis`.

### `.env`

Currently used for auth-related settings. The backend data path is hardcoded relative to `MAIN/` and does not need an env variable.

---

## Pages & What They Do

| Page | Route | Purpose |
|------|-------|---------|
| **Dashboard** | `/` | Live composite score gauge, agent matrix, what-if simulator cards, mitigation priorities |
| **Simulation Engine** | `/simulation` | Slider-based what-if scenarios + Monte Carlo panel (10,000 runs on demand) |
| **Dependency** | `/dependency` | Deep-dive into blocked tasks, critical path, dependency graph |
| **Workload** | `/workload` | Dev overload, task concentration, unassigned task analysis |
| **Scope** | `/scope` | Mid-sprint additions, scope growth rate, orphan PRs |
| **Delay** | `/delay` | Overdue tasks, stale PRs, avg PR age breakdown |
| **Comms** | `/comms` | Silent developers, unanswered threads, escalation keyword frequency |
| **Report** | `/report` | Exportable full-project risk report |

---

## Troubleshooting

**`ModuleNotFoundError: No module named 'core'`**
→ Always run the backend or scripts with `PYTHONPATH=.` from the `MAIN/` directory.

**Frontend shows "Backend Offline"**
→ Check that uvicorn is running on port 8000 (`curl http://localhost:8000/api/health`). The Vite dev server proxies `/api` to `localhost:8000`.

**`/api/analysis` returns 500**
→ Check `uvicorn_log.txt` or the terminal for the Python traceback. Most common cause: `unified_project_state.json` is missing or malformed.

**Monte Carlo always shows 0% CRITICAL**
→ The signal scores in `unified_project_state.json` are likely all zero. Run `PYTHONPATH=. python core/signal_extractor.py` to verify signals are being extracted correctly.

**How do I add a new signal?**
1. Add extraction logic in `core/signal_extractor.py`
2. Add it to the appropriate agent mean in `core/risk_formula.py` and `core/monte_carlo.py`
3. Add a display entry in `react-app/src/api/meridianApi.ts` → `SIGNAL_META`
