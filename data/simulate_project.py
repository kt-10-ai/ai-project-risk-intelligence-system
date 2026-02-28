import json
import random
from datetime import datetime, timezone, timedelta

def to_iso(dt):
    s = dt.isoformat()
    if s.endswith("+00:00"):
        return s.replace("+00:00", "Z")
    return s

def main():
    simulated_now = datetime.now(timezone.utc)
    kickoff_date = simulated_now - timedelta(days=20)
    deadline_date = kickoff_date + timedelta(days=42)
    
    metadata = {
        "project_id": "proj_meridian",
        "project_name": "Meridian",
        "kickoff_date": to_iso(kickoff_date),
        "deadline_date": to_iso(deadline_date),
        "simulated_now": to_iso(simulated_now)
    }

    # Sprints
    sprints = []
    for i in range(3):
        start = kickoff_date + timedelta(days=14 * i)
        end = kickoff_date + timedelta(days=14 * (i + 1))
        sprints.append({
            "sprint_id": f"sprint_{i+1}",
            "start_date": to_iso(start),
            "end_date": to_iso(end)
        })

    # Developers
    developers = [
        {"dev_id": "dev_1", "name": "Alice Manager", "role": "manager"},
        {"dev_id": "dev_2", "name": "Bob Lead", "role": "lead"},
        {"dev_id": "dev_3", "name": "Charlie Dev", "role": "developer"},
        {"dev_id": "dev_4", "name": "Diana Dev", "role": "developer"},
        {"dev_id": "dev_5", "name": "Eve Dev", "role": "developer"},
        {"dev_id": "dev_6", "name": "Frank Dev", "role": "developer"}
    ]

    # Tasks
    tasks = []
    statuses = ['blocked']*7 + ['done']*10 + ['in_progress']*15 + ['todo']*8
    open_tasks = [i for i, s in enumerate(statuses) if s != 'done']
    
    assignees = [None] * 40
    # Fix 2: Redistribute dev_1's tasks. Keep 2 blocked tasks on dev_1.
    for i in range(2): assignees[open_tasks[i]] = "dev_1"
    pool_devs = ["dev_3", "dev_4", "dev_5", "dev_6"]
    # Reassign the other 4 blocked tasks to dev_3 through dev_6
    for i in range(2, 6): assignees[open_tasks[i]] = random.choice(pool_devs)
    # Give dev_1 and dev_2 their remaining tasks
    for i in range(6, 10): assignees[open_tasks[i]] = "dev_1"
    for i in range(10, 12): assignees[open_tasks[i]] = "dev_2"
    assignees[open_tasks[12]] = None
    assignees[open_tasks[13]] = None
    assignees[open_tasks[14]] = None
    
    pool_devs = ["dev_3", "dev_4", "dev_5", "dev_6"]
    for i in range(15, 30):
        assignees[open_tasks[i]] = random.choice(pool_devs)
        
    done_tasks = [i for i, s in enumerate(statuses) if s == 'done']
    for idx in done_tasks:
        assignees[idx] = random.choice(pool_devs)
        
    for i in range(40):
        is_baseline = (i < 30)
        status = statuses[i]
        
        if not is_baseline and i < 38: # 8 scope creep tasks guaranteed after sprint start
            sprint_idx = 0  # Sprint 1
            sprint = sprints[sprint_idx]
            s_start = datetime.fromisoformat(sprint["start_date"].replace('Z', '+00:00'))
            
            c_offset = random.randint(1, 5 * 86400)
            created_at = s_start + timedelta(seconds=c_offset)
            
            max_updated = simulated_now - timedelta(hours=72) if status in ['blocked', 'in_progress'] else simulated_now
            if created_at > max_updated - timedelta(hours=1):
                created_at = max_updated - timedelta(hours=1)
        else:
            sprint_idx = random.randint(0, 2)
            sprint = sprints[sprint_idx]
            s_start = datetime.fromisoformat(sprint["start_date"].replace('Z', '+00:00'))
            
            c_max = min(simulated_now, s_start)
            c_max_sec = int((c_max - kickoff_date).total_seconds())
            if c_max_sec <= 0: c_max_sec = 86400
            created_at = kickoff_date + timedelta(seconds=random.randint(0, c_max_sec))

        d_offset = random.randint(0, 14 * 86400)
        due_date = s_start + timedelta(seconds=d_offset)
        if due_date < created_at:
            due_date = created_at + timedelta(days=1)
            
        max_updated = simulated_now - timedelta(hours=72) if status in ['blocked', 'in_progress'] else simulated_now
        if created_at > max_updated:
            created_at = max_updated - timedelta(hours=1)
            
        u_max_sec = int((max_updated - created_at).total_seconds())
        if u_max_sec <= 0: u_max_sec = 1
        updated_at = created_at + timedelta(seconds=random.randint(0, u_max_sec))
        
        tasks.append({
            "task_id": f"task_{i+1}",
            "title": f"Task {i+1}",
            "status": status,
            "assigned_to": assignees[i],
            "created_at": to_iso(created_at),
            "updated_at": to_iso(updated_at),
            "due_date": to_iso(due_date),
            "sprint_id": sprint["sprint_id"],
            "depends_on": [],
            "is_baseline": is_baseline
        })

    # Fix 1: Deepen dependency graph (>5 depth, 2 chains with blocked mid-chain)
    for t in tasks: t["depends_on"] = []

    # Chain 1: T9 -> T10 -> T1 (blocked) -> T11 -> T12 -> T13 (Depth 6)
    tasks[8]["depends_on"].append("task_10")
    tasks[9]["depends_on"].append("task_1")
    tasks[0]["depends_on"].append("task_11")
    tasks[10]["depends_on"].append("task_12")
    tasks[11]["depends_on"].append("task_13")
    
    # Chain 2: T14 -> T15 -> T2 (blocked) -> T16 -> T17 -> T18 (Depth 6)
    tasks[13]["depends_on"].append("task_15")
    tasks[14]["depends_on"].append("task_2")
    tasks[1]["depends_on"].append("task_16")
    tasks[15]["depends_on"].append("task_17")
    tasks[16]["depends_on"].append("task_18")
    
    # Ensure at least 25 tasks have dependencies by creating one long chain (T19 -> T20 -> ... -> T35)
    for i in range(18, 35): # 17 tasks
        tasks[i]["depends_on"].append(f"task_{i+2}")
        
    # Extra random deps to meet any leftover constraints
    dependent_on_blocked = [36, 37, 38]
    for idx in dependent_on_blocked:
        blocked_target = f"task_{random.randint(3, 7)}"
        tasks[idx]["depends_on"].append(blocked_target)

    # Validate DAG iteratively
    visited = {}
    
    def has_cycle(tid, path):
        if tid in path: return True
        if tid in visited: return visited[tid]
        path.add(tid)
        t_obj = next(t for t in tasks if t["task_id"] == tid)
        for dep in t_obj["depends_on"]:
            if has_cycle(dep, path): return True
        path.remove(tid)
        visited[tid] = False
        return False

    for t in tasks:
        if has_cycle(t["task_id"], set()):
            print(f"Cycle detected at {t['task_id']}, removing dependencies")
            t["depends_on"] = []

    # Pull Requests
    prs = []
    pool_tasks = [t["task_id"] for t in tasks]
    for i in range(15):
        pr_id = f"pr_{i+1}"
        author = random.choice([d["dev_id"] for d in developers])
        t_id = None if i < 2 else random.choice(pool_tasks)
            
        if i < 5:
            status = "open"
            merged_at = None
            max_c = simulated_now - timedelta(days=5)
            c_sec = int((max_c - kickoff_date).total_seconds())
            if c_sec <= 0: c_sec = 86400
            created_at = kickoff_date + timedelta(seconds=random.randint(0, c_sec))
        else:
            status = "merged"
            c_sec = int((simulated_now - kickoff_date).total_seconds())
            c_offset = random.randint(0, c_sec - 1000)
            created_at = kickoff_date + timedelta(seconds=c_offset)
            m_sec = int((simulated_now - created_at).total_seconds())
            if m_sec <= 0: m_sec = 3600
            merged_at = created_at + timedelta(seconds=random.randint(1, m_sec))
            
        prs.append({
            "pr_id": pr_id,
            "task_id": t_id,
            "author_id": author,
            "created_at": to_iso(created_at),
            "merged_at": to_iso(merged_at) if merged_at else None,
            "status": status
        })

    # Messages
    messages = []
    thread_sizes = [1]*5 + [4]*10 + [3]*5
    triggers = 8
    msg_idx = 1
    
    for t_idx, size in enumerate(thread_sizes):
        thread_id = f"thread_{t_idx+1}"
        reply_to = None
        
        t_sec = int((simulated_now - kickoff_date).total_seconds())
        base_time = kickoff_date + timedelta(seconds=random.randint(0, t_sec - 86400))
        
        for m in range(size):
            msg_id = f"msg_{msg_idx}"
            m_time = base_time + timedelta(hours=m*2)
            if m_time > simulated_now:
                m_time = simulated_now - timedelta(minutes=random.randint(1, 60))
                
            cutoff = simulated_now - timedelta(hours=72)
            allowed_devs = [d["dev_id"] for d in developers]
            if m_time > cutoff:
                allowed_devs.remove("dev_6")
            author = random.choice(allowed_devs)
            
            if t_idx == 0 and m == 0:
                author = "dev_6"
                m_time = kickoff_date + timedelta(days=1, hours=2)
                base_time = m_time

            has_trigger = False
            if triggers > 0 and random.random() < 0.2:
                has_trigger = True
                triggers -= 1
                
            messages.append({
                "message_id": msg_id,
                "user_id": author,
                "timestamp": to_iso(m_time),
                "thread_id": thread_id,
                "reply_to_id": reply_to,
                "contains_trigger_word": has_trigger
            })
            
            reply_to = msg_id
            msg_idx += 1
            
    for i in range(triggers):
        messages[i]["contains_trigger_word"] = True

    state = {
        "metadata": metadata,
        "sprints": sprints,
        "developers": developers,
        "tasks": tasks,
        "pull_requests": prs,
        "messages": messages
    }
    
    with open("data/unified_project_state.json", "w") as f:
        json.dump(state, f, indent=2)
        
    blocked = len([t for t in tasks if t["status"] == "blocked"])
    overdue = 0
    for t in tasks:
        d = datetime.fromisoformat(t["due_date"].replace('Z', '+00:00'))
        if d < simulated_now and t["status"] != "done":
            overdue += 1
            
    devs_with_msg_last_72 = set()
    cutoff = simulated_now - timedelta(hours=72)
    for m in messages:
        dt = datetime.fromisoformat(m["timestamp"].replace('Z', '+00:00'))
        if dt > cutoff:
            devs_with_msg_last_72.add(m["user_id"])
            
    silent_devs = len([d for d in developers if d["dev_id"] not in devs_with_msg_last_72])
    
    print("✅ unified_project_state.json generated")
    print(f"   Tasks: {len(tasks)} | PRs: {len(prs)} | Messages: {len(messages)} | Developers: {len(developers)}")
    print(f"   Blocked tasks: {blocked} | Overdue tasks: {overdue} | Silent devs: {silent_devs}")

if __name__ == "__main__":
    main()
