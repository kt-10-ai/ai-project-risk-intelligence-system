import json
import datetime
from agents.base_agent import call_llm

def _parse_iso(iso_str: str) -> datetime.datetime:
    if iso_str.endswith("Z"):
        iso_str = iso_str[:-1] + "+00:00"
    return datetime.datetime.fromisoformat(iso_str)

def analyze(signals: dict, data: dict) -> dict:
    tasks = data.get("tasks", [])
    prs = data.get("pull_requests", [])
    active_tasks = [t for t in tasks if t.get("status") != "done"]
    
    simulated_now = _parse_iso(data["metadata"]["simulated_now"])
    
    sig_data = signals.get("signals", {})
    overdue_sig = sig_data.get("overdue_task_ratio", {"value": 0.0, "score": 0.0})
    stale_sig = sig_data.get("stale_task_ratio", {"value": 0.0, "score": 0.0})
    avg_age_sig = sig_data.get("avg_pr_age_days", {"value": 0.0, "score": 0.0})
    
    # Calculate Risk Contribution
    risk_contribution = (overdue_sig["score"] + stale_sig["score"] + avg_age_sig["score"]) / 3.0
    
    # Calculate Confidence
    confidence = 1.0  # delay signals are purely timestamp-based, always high confidence
    
    # Evidence 1: Overdue task count and oldest overdue
    overdue_tasks = []
    for t in active_tasks:
        if t.get("due_date") and _parse_iso(t["due_date"]) < simulated_now:
            overdue_tasks.append(t)
            
    if overdue_tasks:
        oldest_overdue = min(overdue_tasks, key=lambda x: _parse_iso(x["due_date"]))
        ev_1 = f"Overdue tasks: {len(overdue_tasks)} (Oldest: {oldest_overdue['task_id']} due {oldest_overdue['due_date']})"
    else:
        ev_1 = "Overdue tasks: 0"
        
    # Evidence 2: Stale task count
    stale_count = sum(1 for t in active_tasks if t.get("updated_at") and (simulated_now - _parse_iso(t["updated_at"])).total_seconds() > 5 * 24 * 3600)
    ev_2 = f"Stale tasks (>5 days no update): {stale_count}"
    
    # Evidence 3: Average PR age and oldest PR age
    open_prs = [p for p in prs if p.get("status") == "open"]
    if open_prs:
        pr_ages = [(simulated_now - _parse_iso(p["created_at"])).total_seconds() / 86400 for p in open_prs]
        avg_pr_age = sum(pr_ages) / len(pr_ages)
        oldest_pr_age = max(pr_ages)
        ev_3 = f"Average open PR age: {avg_pr_age:.1f} days (Oldest: {oldest_pr_age:.1f} days)"
    else:
        ev_3 = "Average open PR age: 0 days (No open PRs)"
        
    evidence = [ev_1, ev_2, ev_3]
    
    # Construct Prompts
    system_prompt = (
        "You are a delay risk analyst for a software project.\n"
        "You will be given quantitative signals about overdue tasks, stale tasks, and PR ages.\n"
        "You must identify the 2-3 most critical delay risks.\n"
        "Return ONLY a JSON object with keys: \"top_risks\" (list of 2-3 strings, each under 20 words) and \"reasoning\" (1-2 sentences).\n"
        "Do not invent data. Only reference what is given to you."
    )
    
    user_prompt = (
        f"Project Risk Evidence:\n"
        f"- {ev_1}\n"
        f"- {ev_2}\n"
        f"- {ev_3}\n\n"
        f"Signal Values:\n"
        f"overdue_task_ratio: value={overdue_sig['value']:.3f}, score={overdue_sig['score']:.3f}\n"
        f"stale_task_ratio: value={stale_sig['value']:.3f}, score={stale_sig['score']:.3f}\n"
        f"avg_pr_age_days: value={avg_age_sig['value']:.3f}, score={avg_age_sig['score']:.3f}\n\n"
        f"Risk Contribution Score: {risk_contribution:.3f}\n\n"
        f"Based on this data, identify the top risks and explain the situation."
    )
    
    # Call LLM
    llm_output = call_llm(system_prompt, user_prompt, temperature=0.0)
    
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
        "agent": "delay_agent",
        "risk_contribution": risk_contribution,
        "confidence": confidence,
        "top_risks": top_risks,
        "evidence": evidence,
        "reasoning": reasoning,
        "signal_refs": ["overdue_task_ratio", "stale_task_ratio", "avg_pr_age_days"]
    }
