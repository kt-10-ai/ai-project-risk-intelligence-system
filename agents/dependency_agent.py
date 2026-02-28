import json
from collections import defaultdict
from agents.base_agent import call_llm

def analyze(signals: dict, data: dict) -> dict:
    tasks = data.get("tasks", [])
    active_tasks = [t for t in tasks if t.get("status") != "done"]
    
    sig_data = signals.get("signals", {})
    blocked_sig = sig_data.get("blocked_task_ratio", {"value": 0.0, "score": 0.0})
    crit_path_sig = sig_data.get("critical_path_depth", {"value": 0.0, "score": 0.0})
    dep_cent_sig = sig_data.get("dependency_centrality_max", {"value": 0.0, "score": 0.0})
    
    # Calculate Risk Contribution (mean of the three signal scores)
    risk_contribution = (blocked_sig["score"] + crit_path_sig["score"] + dep_cent_sig["score"]) / 3.0
    
    # Calculate Confidence
    confidence = 1.0 - (0.2 if blocked_sig["score"] < 0.3 else 0.0)
    
    # Evidence 1: Task with most dependents
    dep_counts = defaultdict(int)
    for t in tasks:
        for dep in t.get("depends_on", []):
            if dep:
                dep_counts[dep] += 1
                
    if dep_counts:
        most_deps_task = max(dep_counts, key=dep_counts.get)
        most_deps_count = dep_counts[most_deps_task]
        ev_1 = f"Task with most dependents: {most_deps_task} ({most_deps_count} dependents)"
    else:
        ev_1 = "Task with most dependents: None (0 dependents)"
        
    # Evidence 2: Longest dependency chain
    adj = {t["task_id"]: t.get("depends_on", []) for t in tasks}
    
    def get_longest_path(node, memo):
        if node in memo: return memo[node]
        deps = adj.get(node, [])
        if not deps:
            memo[node] = [node]
            return [node]
        max_path = []
        for dep in deps:
            if dep in adj:
                p = get_longest_path(dep, memo)
                if len(p) > len(max_path):
                    max_path = p
        memo[node] = [node] + max_path
        return memo[node]

    memo = {}
    longest_chain = []
    for t_id in adj:
        p = get_longest_path(t_id, memo)
        if len(p) > len(longest_chain):
            longest_chain = p
            
    if longest_chain:
        chain_str = " -> ".join(longest_chain)
        ev_2 = f"Longest dependency chain: {chain_str}"
    else:
        ev_2 = "Longest dependency chain: None"
        
    # Evidence 3: Blocked task count and ratio
    blocked_count = sum(1 for t in active_tasks if t.get("status") == "blocked")
    blocked_ratio = blocked_sig["value"]
    ev_3 = f"Blocked tasks: {blocked_count} ({blocked_ratio:.0%} active blocked ratio)"
    
    evidence = [ev_1, ev_2, ev_3]
    
    # Construct Prompts
    system_prompt = (
        "You are a dependency risk analyst for a software project.\n"
        "You will be given quantitative signals about task dependencies.\n"
        "You must identify the 2-3 most critical dependency risks.\n"
        "Return ONLY a JSON object with keys: \"top_risks\" (list of 2-3 strings, each under 20 words) and \"reasoning\" (1-2 sentences).\n"
        "Do not invent data. Only reference what is given to you."
    )
    
    user_prompt = (
        f"Project Risk Evidence:\n"
        f"- {ev_1}\n"
        f"- {ev_2}\n"
        f"- {ev_3}\n\n"
        f"Signal Values:\n"
        f"blocked_task_ratio: value={blocked_sig['value']:.3f}, score={blocked_sig['score']:.3f}\n"
        f"critical_path_depth: value={crit_path_sig['value']}, score={crit_path_sig['score']:.3f}\n"
        f"dependency_centrality_max: value={dep_cent_sig['value']}, score={dep_cent_sig['score']:.3f}\n\n"
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
            # Handle potential markdown wrapping
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
        "agent": "dependency_agent",
        "risk_contribution": risk_contribution,
        "confidence": confidence,
        "top_risks": top_risks,
        "evidence": evidence,
        "reasoning": reasoning,
        "signal_refs": ["blocked_task_ratio", "critical_path_depth", "dependency_centrality_max"]
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
