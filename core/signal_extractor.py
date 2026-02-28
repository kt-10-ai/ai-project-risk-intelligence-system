import datetime
from collections import defaultdict

def _parse_iso(iso_str: str) -> datetime.datetime:
    """Helper to parse ISO-8601 strings and make them timezone-aware."""
    if iso_str.endswith("Z"):
        iso_str = iso_str[:-1] + "+00:00"
    return datetime.datetime.fromisoformat(iso_str)

def _limit(val: float) -> float:
    """Helper to clamp scores to [0.0, 1.0]."""
    return max(0.0, min(float(val), 1.0))

def _safe_div(num: float, den: float) -> float:
    """Helper to avoid division by zero."""
    if den == 0: return 0.0
    return float(num) / float(den)

def extract_signals(data: dict) -> dict:
    simulated_now = _parse_iso(data["metadata"]["simulated_now"])

    tasks = data.get("tasks", [])
    prs = data.get("pull_requests", [])
    devs = data.get("developers", [])
    threads = data.get("messages", [])
    sprints = data.get("sprints", [])

    total_tasks = len(tasks)
    active_tasks = [t for t in tasks if t["status"] != "done"]
    total_active_tasks = len(active_tasks)
    
    # ---- Dependency Signals ----
    
    # 1. blocked_task_ratio
    blocked_count = sum(1 for t in active_tasks if t["status"] == "blocked")
    val_blocked = _safe_div(blocked_count, total_active_tasks)
    score_blocked = _limit(val_blocked / 0.40)

    # 2. critical_path_depth
    adj = {t["task_id"]: t["depends_on"] for t in tasks}
    
    def dfs_depth(node, memo):
        if node in memo: return memo[node]
        deps = adj.get(node, [])
        if not deps:
            memo[node] = 0
            return 0
        max_d = 0
        for dep in deps:
            max_d = max(max_d, dfs_depth(dep, memo))
        memo[node] = 1 + max_d
        return memo[node]
        
    depths = {}
    for t_id in adj.keys():
        dfs_depth(t_id, depths)
    val_crit_path = max(depths.values()) if depths else 0
    score_crit_path = _limit(val_crit_path / 6.0)

    # 3. dependency_centrality_max
    dep_counts = defaultdict(int)
    for t in tasks:
        for dep in t["depends_on"]:
            if dep:  # ensure it's not empty
                dep_counts[dep] += 1
                
    # If tasks are listed but never depended on, they have 0
    val_dep_centrality = max(dep_counts.values()) if dep_counts else 0
    score_dep_centrality = _limit(val_dep_centrality / 5.0)


    # ---- Workload Signals ----

    # Calculate developer assignment mapping
    open_assigned = defaultdict(int)
    for t in active_tasks:
        if t["assigned_to"]:
            open_assigned[t["assigned_to"]] += 1
            
    # 4. overloaded_dev_ratio
    overloaded_count = sum(1 for d in devs if open_assigned[d["dev_id"]] > 5)
    total_devs = len(devs)
    val_overload = _safe_div(overloaded_count, total_devs)
    score_overload = _limit(val_overload / 0.50)

    # 5. task_concentration_index
    max_dev_tasks = max(open_assigned.values()) if open_assigned else 0
    val_concentration = _safe_div(max_dev_tasks, total_active_tasks)
    score_concentration = _limit(val_concentration / 0.40)

    # 6. unassigned_task_ratio
    unassigned_count = sum(1 for t in active_tasks if t["assigned_to"] is None)
    val_unassigned = _safe_div(unassigned_count, total_active_tasks)
    score_unassigned = _limit(val_unassigned / 0.30)


    # ---- Scope Signals ----
    
    # 7. mid_sprint_task_additions
    current_sprint = None
    for sp in sprints:
        if _parse_iso(sp["start_date"]) <= simulated_now <= _parse_iso(sp["end_date"]):
            current_sprint = sp
            break

    mid_sprint_additions = 0
    if current_sprint:
        sp_start = _parse_iso(current_sprint["start_date"])
        mid_sprint_additions = sum(
            1 for t in tasks 
            if t["sprint_id"] == current_sprint["sprint_id"]
            and _parse_iso(t["created_at"]) > sp_start
            and t["is_baseline"] == False
        )
    score_mid_sprint = _limit(mid_sprint_additions / 8.0)

    # 8. scope_growth_rate
    baseline_count = sum(1 for t in tasks if t["is_baseline"] == True)
    val_scope_growth = _safe_div((total_tasks - baseline_count), baseline_count)
    score_scope_growth = _limit(val_scope_growth / 0.40)

    # 9. out_of_scope_pr_count
    out_of_scope_prs = sum(1 for p in prs if p["task_id"] is None)
    score_out_of_scope = _limit(out_of_scope_prs / 5.0)


    # ---- Delay Signals ----
    
    # 10. overdue_task_ratio
    overdue_count = sum(1 for t in active_tasks if _parse_iso(t["due_date"]) < simulated_now)
    val_overdue = _safe_div(overdue_count, total_active_tasks)
    score_overdue = _limit(val_overdue / 0.50)

    # 11. stale_task_ratio
    stale_count = sum(1 for t in active_tasks if (simulated_now - _parse_iso(t["updated_at"])).total_seconds() > 5 * 24 * 3600)
    val_stale = _safe_div(stale_count, total_active_tasks)
    score_stale = _limit(val_stale / 0.60)

    # 12. avg_pr_age_days
    open_prs = [p for p in prs if p["status"] == "open"]
    if open_prs:
        pr_ages = [(simulated_now - _parse_iso(p["created_at"])).total_seconds() / 86400 for p in open_prs]
        avg_pr_age = sum(pr_ages) / len(pr_ages)
    else:
        avg_pr_age = 0.0
    score_avg_pr_age = _limit(avg_pr_age / 15.0)


    # ---- Comms Signals ----

    # 13. silent_dev_ratio
    active_dev_ids = {t["assigned_to"] for t in active_tasks if t["assigned_to"] is not None}
    total_active_devs = len(active_dev_ids)
    
    devs_with_recent_msgs = set()
    for m in threads:
        if (simulated_now - _parse_iso(m["timestamp"])).total_seconds() <= 72 * 3600:
            devs_with_recent_msgs.add(m["user_id"])
            
    silent_active_devs = sum(1 for d_id in active_dev_ids if d_id not in devs_with_recent_msgs)
    val_silent_dev = _safe_div(silent_active_devs, total_active_devs)
    score_silent_dev = _limit(val_silent_dev / 0.50)

    # 14. unanswered_thread_ratio
    thread_msg_counts = defaultdict(int)
    for m in threads:
        thread_msg_counts[m["thread_id"]] += 1
        
    unanswered_threads = sum(1 for c in thread_msg_counts.values() if c == 1)
    total_threads = len(thread_msg_counts)
    val_unanswered = _safe_div(unanswered_threads, total_threads)
    score_unanswered = _limit(val_unanswered / 0.40)

    # 15. escalation_keyword_count
    escalations = sum(
        1 for m in threads 
        if m["contains_trigger_word"] == True 
        and (simulated_now - _parse_iso(m["timestamp"])).total_seconds() <= 72 * 3600
    )
    score_escalation = _limit(escalations / 10.0)


    # Wrap up Output Structure
    signals_dict = {
        "blocked_task_ratio":         {"value": val_blocked,           "score": score_blocked},
        "critical_path_depth":        {"value": val_crit_path,         "score": score_crit_path},
        "dependency_centrality_max":  {"value": val_dep_centrality,    "score": score_dep_centrality},
        "overloaded_dev_ratio":       {"value": val_overload,          "score": score_overload},
        "task_concentration_index":   {"value": val_concentration,     "score": score_concentration},
        "unassigned_task_ratio":      {"value": val_unassigned,        "score": score_unassigned},
        "mid_sprint_task_additions":  {"value": mid_sprint_additions,  "score": score_mid_sprint},
        "scope_growth_rate":          {"value": val_scope_growth,      "score": score_scope_growth},
        "out_of_scope_pr_count":      {"value": out_of_scope_prs,      "score": score_out_of_scope},
        "overdue_task_ratio":         {"value": val_overdue,           "score": score_overdue},
        "stale_task_ratio":           {"value": val_stale,             "score": score_stale},
        "avg_pr_age_days":            {"value": avg_pr_age,            "score": score_avg_pr_age},
        "silent_dev_ratio":           {"value": val_silent_dev,        "score": score_silent_dev},
        "unanswered_thread_ratio":    {"value": val_unanswered,        "score": score_unanswered},
        "escalation_keyword_count":   {"value": escalations,           "score": score_escalation},
    }

    return {
        "signals": signals_dict,
        "metadata": {
            "simulated_now": data["metadata"]["simulated_now"],
            "extraction_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
        }
    }

if __name__ == "__main__":
    import json
    with open("data/unified_project_state.json") as f:
        data = json.load(f)
    result = extract_signals(data)
    for name, sig in result["signals"].items():
        bar = "█" * int(sig["score"] * 20)
        
        # Format values conditionally based on type
        if isinstance(sig['value'], int):
            val_str = f"{sig['value']}"
        else:
            val_str = f"{sig['value']:.3f}"
            
        print(f"{name:<35} value={val_str:<8} score={sig['score']:.2f}  {bar}")
