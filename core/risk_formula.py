import math

def compute_risk_score(signal_result: dict) -> dict:
    signals = signal_result.get("signals", {})
    
    # Helper to pull the score securely
    def s(name: str) -> float:
        return float(signals.get(name, {}).get("score", 0.0))

    # Step 1 - Compute agent scores (simple mean)
    dep_score = sum([
        s("blocked_task_ratio"),
        s("critical_path_depth"),
        s("dependency_centrality_max")
    ]) / 3.0

    work_score = sum([
        s("overloaded_dev_ratio"),
        s("task_concentration_index"),
        s("unassigned_task_ratio")
    ]) / 3.0

    scope_score = sum([
        s("mid_sprint_task_additions"),
        s("scope_growth_rate"),
        s("out_of_scope_pr_count")
    ]) / 3.0

    delay_score = sum([
        s("overdue_task_ratio"),
        s("stale_task_ratio"),
        s("avg_pr_age_days")
    ]) / 3.0

    comms_score = sum([
        s("silent_dev_ratio"),
        s("unanswered_thread_ratio"),
        s("escalation_keyword_count")
    ]) / 3.0
    
    agent_scores = {
        "dependency": dep_score,
        "workload": work_score,
        "scope": scope_score,
        "delay": delay_score,
        "comms": comms_score
    }
    
    # Identify dominant risk agent
    dominant_risk = max(agent_scores, key=agent_scores.get)

    # Step 2 - Weighted aggregation
    weights = {
        "dependency": 0.30,
        "delay": 0.25,
        "workload": 0.20,
        "scope": 0.15,
        "comms": 0.10
    }
    
    base_score = sum((agent_scores[k] * weights[k]) for k in agent_scores)
    
    # Step 3 - Interaction penalty
    penalty = 0.0
    
    # Penalty 1: Critical path + overload convergence
    if s("critical_path_depth") > 0.70 and s("overloaded_dev_ratio") > 0.60:
        penalty += 0.05
        
    # Penalty 2: Delay + comms breakdown
    if s("overdue_task_ratio") > 0.70 and s("silent_dev_ratio") > 0.50:
        penalty += 0.04
        
    penalty = min(float(penalty), 0.09)
    
    # Step 4 - Final score
    raw_score = base_score + penalty
    clamped_score = max(0.0, min(raw_score, 1.0))
    total_score = round(clamped_score * 100.0, 2)
    
    # Step 5 - Risk level classification
    if total_score < 40.0:
        risk_level = "LOW"
    elif total_score < 60.0:
        risk_level = "MODERATE"
    elif total_score < 75.0:
        risk_level = "HIGH"
    else:
        risk_level = "CRITICAL"
        
    return {
        "total_score": total_score,
        "risk_level": risk_level,
        "agent_scores": agent_scores,
        "dominant_risk": dominant_risk,
        "interaction_penalty": penalty,
        "formula_version": "1.0"
    }


if __name__ == "__main__":
    import json
    from signal_extractor import extract_signals  # Running natively from core dir needs direct import if executing explicitly there vs relative, but user requested 'python core/risk_formula.py', so let's import carefully.

    import sys
    import os
    # Add root to sys.path so 'core.signal_extractor' works regardless of where the script runs from
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
    from core.signal_extractor import extract_signals

    with open("data/unified_project_state.json") as f:
        data = json.load(f)

    signals_output = extract_signals(data)
    result = compute_risk_score(signals_output)

    print(f"\n{'='*40}")
    print(f"  MERIDIAN RISK SCORE: {result['total_score']}")
    print(f"  RISK LEVEL: {result['risk_level']}")
    print(f"{'='*40}")
    print(f"\nAgent Breakdown:")
    for agent, score in result['agent_scores'].items():
        bar = "█" * int(score * 20)
        print(f"  {agent:<12} {score:.2f}  {bar}")
    print(f"\nDominant Risk:       {result['dominant_risk']}")
    print(f"Interaction Penalty: +{result['interaction_penalty']:.2f}")
