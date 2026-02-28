import json
import datetime
from collections import defaultdict
from agents.base_agent import call_llm

def _parse_iso(iso_str: str) -> datetime.datetime:
    if iso_str.endswith("Z"):
        iso_str = iso_str[:-1] + "+00:00"
    return datetime.datetime.fromisoformat(iso_str)

def analyze(signals: dict, data: dict) -> dict:
    tasks = data.get("tasks", [])
    devs = data.get("developers", [])
    threads = data.get("messages", [])
    active_tasks = [t for t in tasks if t.get("status") != "done"]
    
    simulated_now = _parse_iso(data["metadata"]["simulated_now"])
    
    sig_data = signals.get("signals", {})
    silent_sig = sig_data.get("silent_dev_ratio", {"value": 0.0, "score": 0.0})
    unanswered_sig = sig_data.get("unanswered_thread_ratio", {"value": 0.0, "score": 0.0})
    escalation_sig = sig_data.get("escalation_keyword_count", {"value": 0.0, "score": 0.0})
    
    # Calculate Risk Contribution
    risk_contribution = (silent_sig["score"] + unanswered_sig["score"] + escalation_sig["score"]) / 3.0
    
    # Calculate Confidence
    confidence = 0.75  # comms signals are metadata-based, fixed moderate confidence
    
    # Evidence 1: Silent developers (no messages in 72h)
    active_dev_ids = {t["assigned_to"] for t in active_tasks if t.get("assigned_to") is not None}
    dev_map = {d.get("dev_id"): d.get("name", d.get("dev_id")) for d in devs}
    
    devs_with_recent_msgs = set()
    for m in threads:
        if m.get("timestamp") and (simulated_now - _parse_iso(m["timestamp"])).total_seconds() <= 72 * 3600:
            devs_with_recent_msgs.add(m.get("user_id"))
            
    silent_dev_names = [dev_map.get(d_id, d_id) for d_id in active_dev_ids if d_id not in devs_with_recent_msgs]
    
    if silent_dev_names:
        ev_1 = f"Silent developers (last 72h): {', '.join(silent_dev_names)}"
    else:
        ev_1 = "Silent developers (last 72h): None"
        
    # Evidence 2: Unanswered thread count
    thread_msg_counts = defaultdict(int)
    for m in threads:
        t_id = m.get("thread_id")
        if t_id:
            thread_msg_counts[t_id] += 1
            
    unanswered_threads = sum(1 for c in thread_msg_counts.values() if c == 1)
    ev_2 = f"Unanswered threads: {unanswered_threads}"
    
    # Evidence 3: Escalation keyword count in last 72h
    escalations = sum(
        1 for m in threads 
        if m.get("contains_trigger_word") == True 
        and m.get("timestamp") and (simulated_now - _parse_iso(m["timestamp"])).total_seconds() <= 72 * 3600
    )
    ev_3 = f"Escalation keywords (last 72h): {escalations}"
    
    evidence = [ev_1, ev_2, ev_3]
    
    # Construct Prompts
    system_prompt = (
        "You are a communications risk analyst for a software project.\n"
        "You will be given quantitative signals about team communication, silent developers, and escalations.\n"
        "You must identify the 2-3 most critical communication risks.\n"
        "Return ONLY a JSON object with keys: \"top_risks\" (list of 2-3 strings, each under 20 words) and \"reasoning\" (1-2 sentences).\n"
        "Do not invent data. Only reference what is given to you."
    )
    
    user_prompt = (
        f"Project Risk Evidence:\n"
        f"- {ev_1}\n"
        f"- {ev_2}\n"
        f"- {ev_3}\n\n"
        f"Signal Values:\n"
        f"silent_dev_ratio: value={silent_sig['value']:.3f}, score={silent_sig['score']:.3f}\n"
        f"unanswered_thread_ratio: value={unanswered_sig['value']:.3f}, score={unanswered_sig['score']:.3f}\n"
        f"escalation_keyword_count: value={escalation_sig['value']}, score={escalation_sig['score']:.3f}\n\n"
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
        "agent": "comms_agent",
        "risk_contribution": risk_contribution,
        "confidence": confidence,
        "top_risks": top_risks,
        "evidence": evidence,
        "reasoning": reasoning,
        "signal_refs": ["silent_dev_ratio", "unanswered_thread_ratio", "escalation_keyword_count"]
    }
