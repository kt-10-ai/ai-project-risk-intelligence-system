import copy
import datetime
from collections import defaultdict
import sys
import os

# Ensure safe import of core modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from core.signal_extractor import extract_signals
from core.risk_formula import compute_risk_score


def _parse_iso(iso_str: str) -> datetime.datetime:
    if iso_str.endswith("Z"):
        iso_str = iso_str[:-1] + "+00:00"
    return datetime.datetime.fromisoformat(iso_str)


def run_simulation(data: dict, mutation: dict) -> dict:
    # 1. Deep copy the input data
    sim_data = copy.deepcopy(data)
    mut_type = mutation.get("type")
    
    # 2. Apply the mutation to the copy
    if mut_type == "add_developers":
        count = mutation.get("count", 0)
        
        # Add new devs
        new_dev_ids = []
        existing_devs_count = len(sim_data["developers"])
        for i in range(count):
            n_id = f"dev_{existing_devs_count + i + 1}_sim"
            sim_data["developers"].append({
                "dev_id": n_id,
                "name": f"Simulated Dev {i+1}",
                "role": "developer"
            })
            new_dev_ids.append(n_id)
            
        # Find exactly the most overloaded dev
        open_assigned = defaultdict(int)
        for t in sim_data["tasks"]:
            if t["status"] != "done" and t["assigned_to"]:
                open_assigned[t["assigned_to"]] += 1
                
        if open_assigned and new_dev_ids:
            most_overloaded_dev = max(open_assigned, key=open_assigned.get)
            tasks_to_reassign = count * 3
            
            # Reassign tasks
            reassigned = 0
            dev_idx = 0
            for t in sim_data["tasks"]:
                if reassigned >= tasks_to_reassign:
                    break
                if t["status"] != "done" and t["assigned_to"] == most_overloaded_dev:
                    t["assigned_to"] = new_dev_ids[dev_idx % len(new_dev_ids)]
                    dev_idx += 1
                    reassigned += 1
                    
    elif mut_type == "extend_deadline":
        days = mutation.get("days", 0)
        delta = datetime.timedelta(days=days)
        
        for t in sim_data["tasks"]:
            if t["status"] != "done":
                dt = _parse_iso(t["due_date"])
                new_dt = dt + delta
                t["due_date"] = new_dt.isoformat().replace("+00:00", "Z")
                
    elif mut_type == "remove_scope":
        task_count = mutation.get("task_count", 0)
        
        # Find eligible tasks
        eligible_tasks = [
            t for t in sim_data["tasks"] 
            if t["is_baseline"] == False and t["status"] != "done"
        ]
        
        # Select tasks to remove from the end
        to_remove = eligible_tasks[-task_count:] if task_count < len(eligible_tasks) else eligible_tasks
        to_remove_ids = {t["task_id"] for t in to_remove}
        
        # Remove them from main list
        sim_data["tasks"] = [t for t in sim_data["tasks"] if t["task_id"] not in to_remove_ids]
        
        # Remove depends_on references
        for t in sim_data["tasks"]:
            t["depends_on"] = [dep for dep in t["depends_on"] if dep not in to_remove_ids]
            
    elif mut_type == "close_prs":
        pr_count = mutation.get("pr_count", 0)
        sim_now_str = sim_data["metadata"]["simulated_now"]
        
        open_prs = [p for p in sim_data["pull_requests"] if p["status"] == "open"]
        open_prs.sort(key=lambda x: _parse_iso(x["created_at"]))
        
        to_close = open_prs[:pr_count]
        to_close_ids = {p["pr_id"] for p in to_close}
        
        for p in sim_data["pull_requests"]:
            if p["pr_id"] in to_close_ids:
                p["status"] = "closed"
                p["merged_at"] = sim_now_str


    # 3-6. Extraction and Scoring
    base_signals = extract_signals(data)
    base_risk = compute_risk_score(base_signals)
    
    sim_signals = extract_signals(sim_data)
    sim_risk = compute_risk_score(sim_signals)
    
    # 7. Compute Deltas
    agent_deltas = {}
    for agent in base_risk["agent_scores"]:
        base_val = base_risk["agent_scores"][agent]
        sim_val = sim_risk["agent_scores"].get(agent, 0.0)
        agent_deltas[agent] = sim_val - base_val
        
    delta_total_score = sim_risk["total_score"] - base_risk["total_score"]
    risk_level_changed = base_risk["risk_level"] != sim_risk["risk_level"]

    # 8. Return Result
    return {
        "baseline": {
            "total_score": base_risk["total_score"],
            "risk_level": base_risk["risk_level"],
            "agent_scores": base_risk["agent_scores"]
        },
        "simulated": {
            "total_score": sim_risk["total_score"],
            "risk_level": sim_risk["risk_level"],
            "agent_scores": sim_risk["agent_scores"]
        },
        "delta": {
            "total_score": delta_total_score,
            "risk_level_changed": risk_level_changed,
            "agent_deltas": agent_deltas
        },
        "mutation_applied": copy.deepcopy(mutation),
        "simulation_version": "1.0"
    }


if __name__ == "__main__":
    import json

    with open("data/unified_project_state.json") as f:
        data = json.load(f)

    scenarios = [
        {"type": "add_developers",  "count": 2},
        {"type": "extend_deadline", "days": 14},
        {"type": "remove_scope",    "task_count": 5},
        {"type": "close_prs",       "pr_count": 3},
    ]

    for mutation in scenarios:
        result = run_simulation(data, mutation)
        b = result["baseline"]["total_score"]
        s = result["simulated"]["total_score"]
        delta = result["delta"]["total_score"]
        level_before = result["baseline"]["risk_level"]
        level_after  = result["simulated"]["risk_level"]
        
        direction = "▼" if delta < 0 else "▲" if delta > 0 else "-"
        
        print(f"\nScenario: {mutation}")
        print(f"  Before: {b:.2f} ({level_before})")
        print(f"  After:  {s:.2f} ({level_after})")
        print(f"  Delta:  {direction} {abs(delta):.2f}")
        if result["delta"]["risk_level_changed"]:
            print(f"  ⚠️  Risk level changed: {level_before} → {level_after}")
