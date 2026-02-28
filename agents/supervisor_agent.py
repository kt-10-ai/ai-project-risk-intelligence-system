import asyncio
import json
from concurrent.futures import ThreadPoolExecutor

from core.signal_extractor import extract_signals
from core.risk_formula import compute_risk_score
from core.whatif_engine import run_simulation as run_whatif_simulation

from agents import dependency_agent
from agents import workload_agent
from agents import scope_agent
from agents import delay_agent
from agents import comms_agent

def _safe_analyze(agent_module, signals, data):
    try:
        return agent_module.analyze(signals, data)
    except Exception as e:
        # If any single agent fails, we construct a fallback output mimicking its expected format
        agent_name = agent_module.__name__.split('.')[-1]
        return {
            "agent": agent_name,
            "risk_contribution": 0.0,
            "confidence": 0.0,
            "top_risks": [f"Agent failed to execute: {str(e)}"],
            "evidence": ["No evidence due to failure."],
            "reasoning": "Exception encountered during execution.",
            "signal_refs": []
        }

async def run_full_analysis(data: dict) -> dict:
    signals = extract_signals(data)
    
    # Compute the risk score deterministically
    risk_data = compute_risk_score(signals)
    
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [
            loop.run_in_executor(executor, _safe_analyze, agent_module, signals, data)
            for agent_module in [
                dependency_agent,
                workload_agent,
                scope_agent,
                delay_agent,
                comms_agent
            ]
        ]
        results = await asyncio.gather(*futures)
        
    final_output = {
        "risk_score": risk_data["total_score"],
        "risk_level": risk_data["risk_level"],
        "agent_scores": risk_data["agent_scores"],
        "dominant_risk": risk_data.get("dominant_risk", "Unknown"),
        "interaction_penalty": risk_data.get("interaction_penalty", 0.0),
        "agents": results,
        "signals": signals,
        "timestamp": data.get("metadata", {}).get("simulated_now", ""),
        "formula_version": "1.0"
    }
    
    return final_output

def run_simulation(data: dict, mutation: dict) -> dict:
    return run_whatif_simulation(data, mutation)

if __name__ == "__main__":
    import os
    import sys
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    
    with open("data/unified_project_state.json") as f:
        data = json.load(f)

    result = asyncio.run(run_full_analysis(data))

    print(f"\n{'='*50}")
    print(f"  MERIDIAN RISK SCORE: {result['risk_score']}")
    print(f"  RISK LEVEL:             {result['risk_level']}")
    print(f"{'='*50}")

    print(f"\nAgent Results:")
    for agent in result['agents']:
        print(f"\n  [{agent['agent']}]")
        print(f"  Risk Contribution: {agent['risk_contribution']:.2f}")
        print(f"  Confidence:        {agent['confidence']:.2f}")
        for risk in agent['top_risks']:
            print(f"  - {risk}")
        print(f"  Reasoning: {agent['reasoning']}")

    print(f"\nDominant Risk:       {result['dominant_risk']}")
    print(f"\nInteraction Penalty: +{result['interaction_penalty']:.2f}")

    # Explain which penalties triggered
    signals = result['signals']['signals']
    if signals['critical_path_depth']['score'] > 0.70 and signals['overloaded_dev_ratio']['score'] > 0.60:
        print(f"  → Triggered: critical_path_depth ({signals['critical_path_depth']['score']:.2f}) "
              f"+ overloaded_dev_ratio ({signals['overloaded_dev_ratio']['score']:.2f}) "
              f"→ cascading failure risk")

    if signals['overdue_task_ratio']['score'] > 0.70 and signals['silent_dev_ratio']['score'] > 0.50:
        print(f"  → Triggered: overdue_task_ratio ({signals['overdue_task_ratio']['score']:.2f}) "
              f"+ silent_dev_ratio ({signals['silent_dev_ratio']['score']:.2f}) "
              f"→ unresolved stall pattern")

    if result['interaction_penalty'] == 0.0:
        print(f"  → No interaction penalties triggered")
