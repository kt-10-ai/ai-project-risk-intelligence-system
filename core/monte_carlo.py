import random
import math
import statistics
from typing import Dict

WEIGHTS = {
    'dependency': 0.30,
    'delay':      0.25,
    'workload':   0.20,
    'scope':      0.15,
    'comms':      0.10
}

UNCERTAINTY = {
    'overdue_task_ratio':        0.04,
    'stale_task_ratio':          0.04,
    'avg_pr_age_days':           0.04,
    'silent_dev_ratio':          0.12,
    'unanswered_thread_ratio':   0.12,
    'escalation_keyword_count':  0.12,
}
DEFAULT_UNCERTAINTY = 0.08

def sample_signal(score: float, uncertainty: float) -> float:
    return max(0.0, min(1.0, random.gauss(score, uncertainty)))

def sample_all_signals(signals: dict) -> dict:
    s = signals['signals']
    return {
        name: sample_signal(
            s[name]['score'],
            UNCERTAINTY.get(name, DEFAULT_UNCERTAINTY)
        )
        for name in s
    }

def mean3(a, b, c):
    return (a + b + c) / 3.0

def run_monte_carlo(signals: dict, n_simulations: int = 10000) -> dict:
    simulation_scores = []

    for _ in range(n_simulations):
        s = sample_all_signals(signals)

        dep   = mean3(s['blocked_task_ratio'], s['critical_path_depth'], s['dependency_centrality_max'])
        work  = mean3(s['overloaded_dev_ratio'], s['task_concentration_index'], s['unassigned_task_ratio'])
        scope = mean3(s['mid_sprint_task_additions'], s['scope_growth_rate'], s['out_of_scope_pr_count'])
        delay = mean3(s['overdue_task_ratio'], s['stale_task_ratio'], s['avg_pr_age_days'])
        comms = mean3(s['silent_dev_ratio'], s['unanswered_thread_ratio'], s['escalation_keyword_count'])

        base = dep*0.30 + delay*0.25 + work*0.20 + scope*0.15 + comms*0.10

        penalty = 0.0
        if s['critical_path_depth'] > 0.70 and s['overloaded_dev_ratio'] > 0.60:
            penalty += 0.05
        if s['overdue_task_ratio'] > 0.70 and s['silent_dev_ratio'] > 0.50:
            penalty += 0.04
        penalty = min(penalty, 0.09)

        final = min(base + penalty, 1.0) * 100
        simulation_scores.append(final)

    simulation_scores.sort()
    n = len(simulation_scores)
    mean_score   = statistics.mean(simulation_scores)
    median_score = statistics.median(simulation_scores)
    std_dev      = statistics.stdev(simulation_scores)
    p5           = simulation_scores[int(n * 0.05)]
    p95          = simulation_scores[int(n * 0.95)]

    level_counts = {'LOW': 0, 'MODERATE': 0, 'HIGH': 0, 'CRITICAL': 0}
    for score in simulation_scores:
        if score < 40:   level_counts['LOW'] += 1
        elif score < 60: level_counts['MODERATE'] += 1
        elif score < 75: level_counts['HIGH'] += 1
        else:            level_counts['CRITICAL'] += 1

    dist = {k: round(v / n * 100, 1) for k, v in level_counts.items()}
    prob_critical = level_counts['CRITICAL'] / n
    prob_above    = sum(1 for s in simulation_scores if s > 78.8) / n

    if prob_critical >= 0.80:
        verdict = f"HIGH CERTAINTY CRITICAL: {prob_critical:.0%} of simulations confirm CRITICAL status. Score range {p5:.1f}–{p95:.1f}."
    elif prob_critical >= 0.50:
        verdict = f"LIKELY CRITICAL: {prob_critical:.0%} probability of CRITICAL status. Some scenarios show HIGH."
    elif prob_critical >= 0.20:
        verdict = f"BORDERLINE: Score could range {p5:.1f}–{p95:.1f} depending on signal accuracy."
    else:
        verdict = f"LOW CRITICAL RISK: Most simulations show HIGH or below. Score range {p5:.1f}–{p95:.1f}."

    return {
        "n_simulations":             n_simulations,
        "mean_score":                round(mean_score, 2),
        "median_score":              round(median_score, 2),
        "std_deviation":             round(std_dev, 2),
        "percentile_5":              round(p5, 2),
        "percentile_95":             round(p95, 2),
        "confidence_interval": {
            "lower": round(mean_score - 1.96 * std_dev, 2),
            "upper": round(mean_score + 1.96 * std_dev, 2),
        },
        "risk_level_distribution":   dist,
        "probability_critical":      round(prob_critical, 4),
        "probability_above_current": round(prob_above, 4),
        "current_score":             78.8,
        "verdict":                   verdict,
        "simulation_version":        "1.0"
    }


if __name__ == "__main__":
    import json
    from core.signal_extractor import extract_signals

    with open("data/unified_project_state.json") as f:
        data = json.load(f)

    signals = extract_signals(data)
    result = run_monte_carlo(signals, n_simulations=10000)

    print(f"\n{'='*50}")
    print(f"  MONTE CARLO — {result['n_simulations']:,} SIMULATIONS")
    print(f"{'='*50}")
    print(f"  Current Score:    {result['current_score']}")
    print(f"  Mean Score:       {result['mean_score']:.1f}")
    print(f"  Std Deviation:    {result['std_deviation']:.2f}")
    print(f"  5th Percentile:   {result['percentile_5']:.1f}  (best case)")
    print(f"  95th Percentile:  {result['percentile_95']:.1f}  (worst case)")
    print(f"  95% CI:           [{result['confidence_interval']['lower']:.1f}, {result['confidence_interval']['upper']:.1f}]")
    print(f"\n  Risk Level Distribution:")
    for level, pct in result['risk_level_distribution'].items():
        bar = '█' * int(pct / 2)
        print(f"    {level:<10} {pct:5.1f}%  {bar}")
    print(f"\n  P(CRITICAL):  {result['probability_critical']:.1%}")
    print(f"  Verdict: {result['verdict']}")
