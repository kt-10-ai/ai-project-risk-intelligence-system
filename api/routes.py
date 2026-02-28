import json
import asyncio
from pathlib import Path
from fastapi import APIRouter, HTTPException

from api.schemas import MutationRequest, RiskAnalysisResponse, SimulationResponse
from agents import supervisor_agent

router = APIRouter()

def get_data_path() -> Path:
    return Path(__file__).parent.parent / "data" / "unified_project_state.json"

@router.get("/api/health")
def health_check():
    return {"status": "ok", "system": "Meridian"}

@router.get("/api/analysis", response_model=RiskAnalysisResponse)
async def get_analysis():
    data_path = get_data_path()
    try:
        with open(data_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to load project state data.")

    try:
        # Await the async function directly inside the async route
        result = await supervisor_agent.run_full_analysis(data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal analysis failed.")

@router.post("/api/simulate", response_model=SimulationResponse)
def simulate(request: MutationRequest):
    data_path = get_data_path()
    try:
        with open(data_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to load project state data.")

    mutation = {"type": request.type}
    if request.type == "add_developers":
        mutation["count"] = request.count
    elif request.type == "extend_deadline":
        mutation["days"] = request.days
    elif request.type == "remove_scope":
        mutation["task_count"] = request.task_count
    elif request.type == "close_prs":
        mutation["pr_count"] = request.pr_count

    try:
        result = supervisor_agent.run_simulation(data, mutation)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail="Simulation failed.")
