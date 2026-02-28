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
    sprints = data.get("sprints", [])
    
    simulated_now = _parse_iso(data["metadata"]["simulated_now"])
    
    sig_data = signals.get("signals", {})
    mid_sprint_sig = sig_data.get("mid_sprint_task_additions", {"value": 0.0, "score": 0.0})
    growth_sig = sig_data.get("scope_growth_rate", {"value": 0.0, "score": 0.0})
    out_of_scope_sig = sig_data.get("out_of_scope_pr_count", {"value": 0.0, "score": 0.0})
    
    # Calculate Risk Contribution
    risk_contribution = (mid_sprint_sig["score"] + growth_sig["score"] + out_of_scope_sig["score"]) / 3.0
    
    # Calculate Confidence
    confidence = 1.0 - (0.1 if mid_sprint_sig["score"] == 0.0 else 0.0)
    
    # Evidence 1: Baseline task count vs current count
    total_tasks = len(tasks)
    baseline_count = sum(1 for t in tasks if t.get("is_baseline") == True)
    ev_1 = f"Scope growth: {baseline_count} baseline tasks -> {total_tasks} current tasks"
    
    # Evidence 2: Mid-sprint additions
    current_sprint = None
    for sp in sprints:
        if _parse_iso(sp["start_date"]) <= simulated_now <= _parse_iso(sp["end_date"]):
            current_sprint = sp
            break

    mid_additions = []
    if current_sprint:
        sp_start = _parse_iso(current_sprint["start_date"])
        for t in tasks:
            if t.get("sprint_id") == current_sprint["sprint_id"]:
                if _parse_iso(t["created_at"]) > sp_start and t.get("is_baseline") == False:
                    mid_additions.append(t["task_id"])
                    
    if mid_additions:
        ev_2 = f"Mid-sprint additions ({len(mid_additions)}): {', '.join(mid_additions)}"
    else:
        ev_2 = "Mid-sprint additions: None"
        
    # Evidence 3: Out of scope PRs
    out_of_scope_prs = sum(1 for p in prs if p.get("task_id") is None)
    ev_3 = f"PRs with no linked task: {out_of_scope_prs}"
    
    evidence = [ev_1, ev_2, ev_3]
    
    # Construct Prompts
    system_prompt = (
        "You are a scope risk analyst for a software project.\n"
        "You will be given quantitative signals about scope creep, mid-sprint additions, and unlinked PRs.\n"
        "You must identify the 2-3 most critical scope risks.\n"
        "Return ONLY a JSON object with keys: \"top_risks\" (list of 2-3 strings, each under 20 words) and \"reasoning\" (1-2 sentences).\n"
        "Do not invent data. Only reference what is given to you."
    )
    
    user_prompt = (
        f"Project Risk Evidence:\n"
        f"- {ev_1}\n"
        f"- {ev_2}\n"
        f"- {ev_3}\n\n"
        f"Signal Values:\n"
        f"mid_sprint_task_additions: value={mid_sprint_sig['value']}, score={mid_sprint_sig['score']:.3f}\n"
        f"scope_growth_rate: value={growth_sig['value']:.3f}, score={growth_sig['score']:.3f}\n"
        f"out_of_scope_pr_count: value={out_of_scope_sig['value']}, score={out_of_scope_sig['score']:.3f}\n\n"
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
        "agent": "scope_agent",
        "risk_contribution": risk_contribution,
        "confidence": confidence,
        "top_risks": top_risks,
        "evidence": evidence,
        "reasoning": reasoning,
        "signal_refs": ["mid_sprint_task_additions", "scope_growth_rate", "out_of_scope_pr_count"]
    }
