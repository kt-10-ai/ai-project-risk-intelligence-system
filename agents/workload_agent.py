import json
from collections import defaultdict
from agents.base_agent import call_llm

def analyze(signals: dict, data: dict) -> dict:
    tasks = data.get("tasks", [])
    devs = data.get("developers", [])
    active_tasks = [t for t in tasks if t.get("status") != "done"]
    
    sig_data = signals.get("signals", {})
    overload_sig = sig_data.get("overloaded_dev_ratio", {"value": 0.0, "score": 0.0})
    conc_sig = sig_data.get("task_concentration_index", {"value": 0.0, "score": 0.0})
    unassigned_sig = sig_data.get("unassigned_task_ratio", {"value": 0.0, "score": 0.0})
    
    # Calculate Risk Contribution
    risk_contribution = (overload_sig["score"] + conc_sig["score"] + unassigned_sig["score"]) / 3.0
    
    # Calculate Confidence
    confidence = 1.0 - (0.15 if unassigned_sig["score"] < 0.2 else 0.0)
    
    # Evidence 1: List each developer's open task count
    open_assigned = defaultdict(int)
    for t in active_tasks:
        if t.get("assigned_to"):
            open_assigned[t["assigned_to"]] += 1
            
    dev_counts = []
    most_overloaded = None
    max_tasks = -1
    for d in devs:
        dev_id = d.get("dev_id", "Unknown")
        dev_name = d.get("name", dev_id)
        count = open_assigned.get(dev_id, 0)
        dev_counts.append(f"{dev_name}: {count}")
        if count > max_tasks:
            max_tasks = count
            most_overloaded = dev_name
            
    if not devs:
        for dev_id, count in open_assigned.items():
            dev_counts.append(f"{dev_id}: {count}")
            if count > max_tasks:
                max_tasks = count
                most_overloaded = dev_id
            
    ev_1 = "Open task counts: " + ", ".join(dev_counts) if dev_counts else "Open task counts: None"
    
    # Evidence 2: Most overloaded developer
    if most_overloaded and max_tasks > 0:
        ev_2 = f"Most overloaded dev: {most_overloaded} ({max_tasks} tasks)"
    else:
        ev_2 = "Most overloaded dev: None"
        
    # Evidence 3: Unassigned task count
    unassigned_count = sum(1 for t in active_tasks if t.get("assigned_to") is None)
    ev_3 = f"Unassigned tasks: {unassigned_count}"
    
    evidence = [ev_1, ev_2, ev_3]
    
    # Construct Prompts
    system_prompt = (
        "You are a workload risk analyst for a software project.\n"
        "You will be given quantitative signals about team workload and unassigned tasks.\n"
        "You must identify the 2-3 most critical workload risks.\n"
        "Return ONLY a JSON object with keys: \"top_risks\" (list of 2-3 strings, each under 20 words) and \"reasoning\" (1-2 sentences).\n"
        "Do not invent data. Only reference what is given to you."
    )
    
    user_prompt = (
        f"Project Risk Evidence:\n"
        f"- {ev_1}\n"
        f"- {ev_2}\n"
        f"- {ev_3}\n\n"
        f"Signal Values:\n"
        f"overloaded_dev_ratio: value={overload_sig['value']:.3f}, score={overload_sig['score']:.3f}\n"
        f"task_concentration_index: value={conc_sig['value']:.3f}, score={conc_sig['score']:.3f}\n"
        f"unassigned_task_ratio: value={unassigned_sig['value']:.3f}, score={unassigned_sig['score']:.3f}\n\n"
        f"Risk Contribution Score: {risk_contribution:.3f}\n\n"
        f"Based on this data, identify the top risks and explain the situation."
    )
    
    try:
        llm_output = call_llm(system_prompt, user_prompt, temperature=0.0)
    except Exception as e:
        print(f"WORKLOAD AGENT LLM ERROR: {e}")
        llm_output = "LLM_ERROR"
    
    # Parse Response
    top_risks = []
    reasoning = ""
    if llm_output == "LLM_ERROR":
        top_risks = ["LLM unavailable — signal data still valid"]
        reasoning = "Analysis unavailable."
    else:
        try:
            if llm_output.startswith("```json"):
                llm_output = llm_output.split("```json")[-1].split("```")[0].strip()
            elif llm_output.startswith("```"):
                llm_output = llm_output.split("```")[-1].split("```")[0].strip()
                
            resp = json.loads(llm_output)
            top_risks = resp.get("top_risks", ["LLM unavailable — signal data still valid"])
            reasoning = resp.get("reasoning", "Analysis unavailable.")
        except Exception:
            top_risks = ["LLM unavailable — signal data still valid"]
            reasoning = "Analysis unavailable."
            
    return {
        "agent": "workload_agent",
        "risk_contribution": risk_contribution,
        "confidence": confidence,
        "top_risks": top_risks,
        "evidence": evidence,
        "reasoning": reasoning,
        "signal_refs": ["overloaded_dev_ratio", "task_concentration_index", "unassigned_task_ratio"]
    }

if __name__ == "__main__":
    import json
    import os
    import sys
    
    # Add project root to sys.path so we can import core.signal_extractor correctly
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    from core.signal_extractor import extract_signals

    with open("data/unified_project_state.json") as f:
        data = json.load(f)

    signals = extract_signals(data)
    result = analyze(signals, data)

    print(f"Agent: {result['agent']}")
    print(f"Risk Contribution: {result['risk_contribution']:.2f}")
    print(f"Confidence: {result['confidence']:.2f}")
    print(f"Top Risks:")
    for r in result['top_risks']:
        print(f"  - {r}")
    print(f"Evidence:")
    for e in result['evidence']:
        print(f"  - {e}")
    print(f"Reasoning: {result['reasoning']}")
