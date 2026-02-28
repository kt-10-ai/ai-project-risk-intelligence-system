import json
import asyncio
from pathlib import Path
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from concurrent.futures import ThreadPoolExecutor

from core.signal_extractor import extract_signals
from core.risk_formula import compute_risk_score

from agents import dependency_agent
from agents import workload_agent
from agents import scope_agent
from agents import delay_agent
from agents import comms_agent

ws_router = APIRouter()

def get_data_path() -> Path:
    return Path(__file__).parent.parent / "data" / "unified_project_state.json"

@ws_router.websocket("/ws/analysis")
async def websocket_analysis(websocket: WebSocket):
    # CORSMiddleware does not cover WebSocket upgrades — check origin manually
    origin = websocket.headers.get("origin", "")
    allowed = (
        not origin  # no origin header (e.g. curl / Postman)
        or origin.startswith("http://localhost")
        or origin.startswith("http://127.0.0.1")
    )
    if not allowed:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    
    try:
        await websocket.send_json({"event": "connected", "message": "Meridian analysis starting"})
        
        data_path = get_data_path()
        with open(data_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        signals = extract_signals(data)
        await websocket.send_json({"event": "signals_ready", "data": signals})
        
        agents_to_run = [
            ("dependency_agent", dependency_agent),
            ("workload_agent", workload_agent),
            ("scope_agent", scope_agent),
            ("delay_agent", delay_agent),
            ("comms_agent", comms_agent)
        ]
        
        agent_results = []
        loop = asyncio.get_event_loop()
        
        with ThreadPoolExecutor(max_workers=1) as executor:
            for name, agent_module in agents_to_run:
                await websocket.send_json({"event": "agent_start", "agent": name})
                
                try:
                    result = await loop.run_in_executor(executor, agent_module.analyze, signals, data)
                except Exception as e:
                    # Fallback output
                    result = {
                        "agent": name,
                        "risk_contribution": 0.0,
                        "confidence": 0.0,
                        "top_risks": [f"Agent failed to execute: {str(e)}"],
                        "evidence": ["No evidence due to failure."],
                        "reasoning": "Exception encountered during execution.",
                        "signal_refs": []
                    }
                
                agent_results.append(result)
                await websocket.send_json({"event": "agent_complete", "agent": name, "data": result})
                
        # Final risk score gathering
        risk_data = compute_risk_score(signals)
        
        final_output = {
            "risk_score": risk_data["total_score"],
            "risk_level": risk_data["risk_level"],
            "agent_scores": risk_data["agent_scores"],
            "dominant_risk": risk_data.get("dominant_risk", "Unknown"),
            "interaction_penalty": risk_data.get("interaction_penalty", 0.0),
            "agents": agent_results,
            "signals": signals,
            "timestamp": data.get("metadata", {}).get("simulated_now", ""),
            "formula_version": "1.0"
        }
        
        await websocket.send_json({"event": "risk_score_ready", "data": final_output})
        await websocket.send_json({"event": "complete", "message": "Analysis complete"})
        
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"event": "error", "message": "An unexpected error occurred during WebSocket analysis."})
        except:
            pass
