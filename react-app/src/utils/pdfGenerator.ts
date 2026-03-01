/**
 * Meridian PDF Generator
 * Uses browser print-to-PDF — no external libraries required.
 * Opens an invisible window, injects formatted HTML, triggers print dialog.
 */
import type { RiskAnalysis, AgentResult } from '../api/meridianApi';

const BASE_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Arial', sans-serif;
    color: #1a1a2e;
    background: #ffffff;
    font-size: 11pt;
    line-height: 1.5;
  }
  @page {
    size: A4;
    margin: 18mm 18mm 18mm 18mm;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  /* ── Layout helpers ── */
  .page-break { page-break-before: always; }
  .avoid-break { page-break-inside: avoid; }

  /* ── Cover / header ── */
  .cover {
    background: #0f0e17;
    color: #ffffff;
    padding: 48pt 40pt;
    border-radius: 4pt;
    margin-bottom: 24pt;
  }
  .cover-badge {
    display: inline-block;
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 2pt;
    text-transform: uppercase;
    padding: 4pt 10pt;
    border-radius: 2pt;
    margin-bottom: 16pt;
  }
  .cover h1 {
    font-size: 26pt;
    font-weight: 900;
    letter-spacing: -0.5pt;
    margin-bottom: 6pt;
  }
  .cover .subtitle { font-size: 11pt; color: #a0a0c0; margin-bottom: 24pt; }
  .cover-meta { display: flex; gap: 32pt; }
  .cover-meta-item label { font-size: 7pt; letter-spacing: 1.5pt; text-transform: uppercase; color: #6060a0; display: block; margin-bottom: 3pt; }
  .cover-meta-item span { font-size: 10pt; font-weight: 700; color: #e0e0ff; }

  /* ── Score pill ── */
  .score-pill {
    display: inline-block;
    padding: 3pt 10pt;
    border-radius: 20pt;
    font-size: 9pt;
    font-weight: 800;
    letter-spacing: 0.5pt;
    text-transform: uppercase;
  }
  .level-critical  { background: #fef2f2; color: #dc2626; border: 1pt solid #fca5a5; }
  .level-high      { background: #fff7ed; color: #ea580c; border: 1pt solid #fdba74; }
  .level-moderate  { background: #fefce8; color: #ca8a04; border: 1pt solid #fde047; }
  .level-low       { background: #f0fdf4; color: #16a34a; border: 1pt solid #86efac; }

  /* ── Section headings ── */
  h2 {
    font-size: 13pt;
    font-weight: 800;
    color: #0f0e17;
    margin-bottom: 10pt;
    padding-bottom: 5pt;
    border-bottom: 1.5pt solid #e2e8f0;
    letter-spacing: -0.2pt;
  }
  h3 {
    font-size: 10pt;
    font-weight: 700;
    color: #334155;
    margin-bottom: 6pt;
    text-transform: uppercase;
    letter-spacing: 0.8pt;
    font-size: 8pt;
  }

  /* ── Cards / boxes ── */
  .card {
    background: #f8fafc;
    border: 1pt solid #e2e8f0;
    border-radius: 4pt;
    padding: 14pt;
    margin-bottom: 10pt;
  }
  .card-accent { border-left: 4pt solid #4f46e5; }
  .card-critical { border-left: 4pt solid #dc2626; background: #fef9f9; }
  .card-high     { border-left: 4pt solid #ea580c; background: #fffbf7; }
  .card-low      { border-left: 4pt solid #16a34a; background: #f7fdf9; }

  /* ── Grid ── */
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8pt; margin-bottom: 14pt; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8pt; margin-bottom: 14pt; }
  .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8pt; margin-bottom: 14pt; }
  .stat-box {
    background: #f8fafc;
    border: 1pt solid #e2e8f0;
    border-radius: 4pt;
    padding: 10pt;
    text-align: center;
  }
  .stat-box .stat-label { font-size: 6.5pt; font-weight: 700; letter-spacing: 1pt; text-transform: uppercase; color: #94a3b8; margin-bottom: 4pt; }
  .stat-box .stat-value { font-size: 20pt; font-weight: 900; font-family: 'Courier New', monospace; }
  .stat-box .stat-sub   { font-size: 7.5pt; color: #64748b; margin-top: 2pt; }

  /* ── Table ── */
  table { width: 100%; border-collapse: collapse; margin-bottom: 14pt; font-size: 9pt; }
  thead tr { background: #0f0e17; color: #ffffff; }
  thead th { padding: 7pt 10pt; text-align: left; font-size: 7pt; letter-spacing: 1pt; text-transform: uppercase; font-weight: 700; }
  tbody tr { border-bottom: 1pt solid #f1f5f9; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tbody td { padding: 7pt 10pt; color: #334155; }
  td.mono { font-family: 'Courier New', monospace; font-size: 9pt; }
  td.bold { font-weight: 700; }

  /* ── Progress bar ── */
  .bar-track { background: #e2e8f0; border-radius: 2pt; height: 5pt; width: 100%; }
  .bar-fill  { height: 5pt; border-radius: 2pt; }

  /* ── Footer ── */
  .report-footer {
    margin-top: 28pt;
    padding-top: 10pt;
    border-top: 1pt solid #e2e8f0;
    font-size: 7pt;
    color: #94a3b8;
    display: flex;
    justify-content: space-between;
  }

  /* ── Paragraphs ── */
  p { color: #374151; margin-bottom: 8pt; font-size: 10pt; }
  .text-sm { font-size: 9pt; }
  .text-muted { color: #6b7280; }
  .verdict-box {
    background: #fef2f2;
    border: 1pt solid #fca5a5;
    border-left: 4pt solid #dc2626;
    border-radius: 4pt;
    padding: 12pt 14pt;
    margin-bottom: 14pt;
  }
  .verdict-box .verdict-label { font-size: 7pt; font-weight: 800; letter-spacing: 1.5pt; text-transform: uppercase; color: #dc2626; margin-bottom: 4pt; }
  .verdict-box p { font-size: 11pt; font-weight: 600; color: #1a1a2e; margin: 0; }
  ul { padding-left: 14pt; color: #374151; margin-bottom: 8pt; }
  ul li { margin-bottom: 4pt; font-size: 10pt; }
`;

function openPrintWindow(htmlContent: string, title: string) {
  const win = window.open('', '_blank', 'width=900,height=1200');
  if (!win) { alert('Please allow popups for PDF export.'); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${BASE_STYLES}</style></head><body>${htmlContent}</body></html>`);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 600);
}

function levelClass(level: string): string {
  const l = level?.toUpperCase() ?? '';
  if (l === 'CRITICAL') return 'level-critical';
  if (l === 'HIGH') return 'level-high';
  if (l === 'MODERATE') return 'level-moderate';
  return 'level-low';
}

function scoreColor(score: number): string {
  if (score >= 75) return '#dc2626';
  if (score >= 60) return '#ea580c';
  if (score >= 40) return '#ca8a04';
  return '#16a34a';
}

function barFill(score: number): string {
  return `<div class="bar-track"><div class="bar-fill" style="width:${Math.min(score, 100)}%;background:${scoreColor(score)};"></div></div>`;
}

function footer(page: number, total: number, title: string): string {
  return `<div class="report-footer">
    <span>MERIDIAN RISK INTELLIGENCE SYSTEM — CONFIDENTIAL</span>
    <span>${title}</span>
    <span>Page ${page} of ${total}</span>
  </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT 1 — Full Intelligence Report (6-7 pages)
// ─────────────────────────────────────────────────────────────────────────────
export function exportFullReport(analysis: RiskAnalysis | null | undefined): void {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const score = analysis?.risk_score ?? 78.8;
  const level = analysis?.risk_level ?? 'CRITICAL';
  const agents: AgentResult[] = analysis?.agents ?? [];
  const signals = analysis?.signals?.signals ?? {};
  const mc = analysis?.monte_carlo;
  const pen = analysis?.interaction_penalty ?? 0;

  const SIGNAL_GROUPS: Record<string, { label: string; group: string }> = {
    blocked_task_ratio: { label: 'Blocked Task Ratio', group: 'Dependency' },
    critical_path_depth: { label: 'Critical Path Depth', group: 'Dependency' },
    dependency_centrality_max: { label: 'Dependency Centrality', group: 'Dependency' },
    overloaded_dev_ratio: { label: 'Overloaded Dev Ratio', group: 'Workload' },
    task_concentration_index: { label: 'Task Concentration', group: 'Workload' },
    unassigned_task_ratio: { label: 'Unassigned Task Ratio', group: 'Workload' },
    mid_sprint_task_additions: { label: 'Mid-Sprint Additions', group: 'Scope' },
    scope_growth_rate: { label: 'Scope Growth Rate', group: 'Scope' },
    out_of_scope_pr_count: { label: 'Orphan PR Count', group: 'Scope' },
    overdue_task_ratio: { label: 'Overdue Task Ratio', group: 'Delay' },
    stale_task_ratio: { label: 'Stale PR Ratio', group: 'Delay' },
    avg_pr_age_days: { label: 'Avg PR Age (days)', group: 'Delay' },
    silent_dev_ratio: { label: 'Silent Developer Ratio', group: 'Comms' },
    unanswered_thread_ratio: { label: 'Unanswered Thread Ratio', group: 'Comms' },
    escalation_keyword_count: { label: 'Escalation Keywords', group: 'Comms' },
  };

  const agentRows = agents.map(a => {
    const s = Math.round(a.risk_contribution * 100);
    const name = a.agent.replace('_agent', '').replace(/\b\w/g, (c: string) => c.toUpperCase());
    return `<tr>
      <td class="bold">${name}</td>
      <td class="mono" style="color:${scoreColor(s)};">${s}</td>
      <td>${a.reasoning ?? '—'}</td>
      <td>${a.confidence ? (a.confidence * 100).toFixed(0) + '%' : '—'}</td>
    </tr>`;
  }).join('');

  const sigRows = Object.entries(SIGNAL_GROUPS).map(([key, meta]) => {
    const sig = signals[key];
    const s100 = sig ? Math.round(sig.score * 100) : 0;
    const raw = sig?.value !== undefined ? sig.value : '—';
    return `<tr>
      <td>${meta.label}</td>
      <td class="mono" style="color:#6764f2;">${meta.group}</td>
      <td class="mono">${typeof raw === 'number' && raw > 0 && raw < 1 ? (raw * 100).toFixed(1) + '%' : raw}</td>
      <td class="mono" style="color:${scoreColor(s100)};font-weight:700;">${s100}</td>
      <td style="width:80pt;">${barFill(s100)}</td>
    </tr>`;
  }).join('');

  const agentWeights: Record<string, string> = { dependency: '30%', delay: '25%', workload: '20%', scope: '15%', comms: '10%' };
  const agentScoreBoxes = Object.entries(analysis?.agent_scores ?? {}).map(([name, s]: [string, number]) => {
    const s100 = Math.round(s * 100);
    return `<div class="stat-box">
      <div class="stat-label">${name}</div>
      <div class="stat-value" style="color:${scoreColor(s100)};font-size:18pt;">${s100}</div>
      <div class="stat-sub">Weight: ${agentWeights[name] ?? '—'}</div>
    </div>`;
  }).join('');

  const mcSection = mc ? `
  <div class="page-break"></div>
  <h2>Monte Carlo Simulation Results</h2>
  <p>The following results are derived from ${mc.n_simulations?.toLocaleString() ?? '10,000'} independent simulations, each sampling all 15 signals from a Gaussian distribution reflecting real-world uncertainty. This probabilistic analysis complements the deterministic score by quantifying confidence and worst-case risk.</p>
  <div class="verdict-box">
    <div class="verdict-label">Simulation Verdict</div>
    <p>${mc.verdict}</p>
  </div>
  <div class="grid-4">
    <div class="stat-box"><div class="stat-label">Mean Score</div><div class="stat-value" style="color:#1a1a2e;">${mc.mean_score?.toFixed(1)}</div></div>
    <div class="stat-box"><div class="stat-label">Std Deviation</div><div class="stat-value" style="color:#4f46e5;">${mc.std_deviation?.toFixed(2)}</div></div>
    <div class="stat-box"><div class="stat-label">Best Case (P5)</div><div class="stat-value" style="color:#16a34a;">${mc.percentile_5?.toFixed(1)}</div></div>
    <div class="stat-box"><div class="stat-label">Worst Case (P95)</div><div class="stat-value" style="color:#dc2626;">${mc.percentile_95?.toFixed(1)}</div></div>
  </div>
  <div class="card avoid-break">
    <h3>95% Confidence Interval</h3>
    <p style="font-size:16pt;font-family:'Courier New',monospace;font-weight:900;color:#1a1a2e;margin-bottom:4pt;">[${mc.confidence_interval?.lower?.toFixed(1)}, ${mc.confidence_interval?.upper?.toFixed(1)}]</p>
    <p class="text-muted text-sm">There is a 95% statistical probability that the true underlying risk score falls within this range, accounting for measurement uncertainty in all signals.</p>
  </div>
  <h3>Risk Level Distribution Across Simulations</h3>
  <table>
    <thead><tr><th>Risk Level</th><th>Threshold</th><th>% of Simulations</th><th>Interpretation</th></tr></thead>
    <tbody>
      <tr><td>LOW</td><td>Score &lt; 40</td><td class="mono">${mc.risk_level_distribution?.LOW ?? 0}%</td><td>Project is healthy with minimal risk</td></tr>
      <tr><td>MODERATE</td><td>40 – 59</td><td class="mono">${mc.risk_level_distribution?.MODERATE ?? 0}%</td><td>Some concerns but manageable</td></tr>
      <tr><td>HIGH</td><td>60 – 74</td><td class="mono">${mc.risk_level_distribution?.HIGH ?? 0}%</td><td>Significant risks requiring attention</td></tr>
      <tr><td><strong>CRITICAL</strong></td><td>≥ 75</td><td class="mono" style="color:#dc2626;font-weight:700;">${mc.risk_level_distribution?.CRITICAL ?? 0}%</td><td>Immediate escalation required</td></tr>
    </tbody>
  </table>
  <div class="card card-critical avoid-break">
    <h3>Probability of Critical Status</h3>
    <p style="font-size:28pt;font-family:'Courier New',monospace;font-weight:900;color:#dc2626;margin-bottom:6pt;">${((mc.probability_critical ?? 0) * 100).toFixed(1)}%</p>
    <p class="text-sm text-muted">Based on ${mc.n_simulations?.toLocaleString()} simulations · Deterministic baseline score: ${mc.current_score}</p>
  </div>
  ${footer(5, 6, 'Monte Carlo Simulation')}` : '';

  const html = `
  <!-- PAGE 1: Cover -->
  <div class="cover avoid-break">
    <div class="cover-badge" style="background:#4f46e520;color:#a5b4fc;border:1pt solid #4f46e540;">
      MERIDIAN RISK INTELLIGENCE SYSTEM
    </div>
    <h1>Project Risk Intelligence<br>Report</h1>
    <p class="subtitle">Comprehensive AI-powered risk analysis, probabilistic simulation, and mitigation guidance</p>
    <div class="cover-meta">
      <div class="cover-meta-item"><label>Generated</label><span>${date}</span></div>
      <div class="cover-meta-item"><label>Risk Score</label><span style="color:${scoreColor(score)};">${score.toFixed(1)} / 100</span></div>
      <div class="cover-meta-item"><label>Risk Level</label><span style="color:${scoreColor(score)};">${level}</span></div>
      <div class="cover-meta-item"><label>Formula Version</label><span>${analysis?.formula_version ?? '1.0'}</span></div>
    </div>
  </div>
  ${footer(1, 6, 'Cover')}

  <!-- PAGE 2: Executive Summary -->
  <div class="page-break"></div>
  <h2>Executive Summary</h2>
  <p>This report presents a complete risk assessment of the project as evaluated by the Meridian AI Risk Intelligence System. The analysis incorporates 15 quantitative signals across 5 risk dimensions, weighted and aggregated into a composite score. Interaction penalties are applied where correlated risk factors compound each other.</p>
  <div class="card card-${level.toLowerCase()} avoid-break">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10pt;">
      <div>
        <div style="font-size:8pt;font-weight:700;letter-spacing:1pt;text-transform:uppercase;color:#94a3b8;margin-bottom:4pt;">Composite Risk Score</div>
        <div style="font-size:36pt;font-weight:900;font-family:'Courier New',monospace;color:${scoreColor(score)};line-height:1;">${score.toFixed(1)}</div>
      </div>
      <div class="score-pill ${levelClass(level)}">${level} RISK</div>
    </div>
    <p class="text-sm text-muted">Dominant Risk Dimension: <strong>${(analysis?.dominant_risk ?? 'delay').toUpperCase()}</strong> · Interaction Penalty Applied: <strong>+${pen.toFixed(2)} pts</strong> · Timestamp: ${analysis?.timestamp?.replace('T', ' ').slice(0, 19) ?? 'N/A'}</p>
  </div>
  <h3>Scoring Methodology</h3>
  <p>The composite score is computed as a weighted average of five agent scores. Two interaction penalties of up to +9 points total are applied when cascading risk conditions are simultaneously active: (1) Critical path bottlenecks combined with developer overload, and (2) Overdue tasks combined with communication breakdown.</p>
  <table class="avoid-break">
    <thead><tr><th>Dimension</th><th>Weight</th><th>Signals Evaluated</th><th>Interpretation</th></tr></thead>
    <tbody>
      <tr><td class="bold">Dependency</td><td class="mono">30%</td><td>Blocked tasks, critical path depth, hub centrality</td><td>Structural delivery blockers</td></tr>
      <tr><td class="bold">Delay</td><td class="mono">25%</td><td>Overdue tasks, stale PRs, avg PR age</td><td>Timeline and throughput health</td></tr>
      <tr><td class="bold">Workload</td><td class="mono">20%</td><td>Overloaded devs, task concentration, unassigned tasks</td><td>Team capacity utilisation</td></tr>
      <tr><td class="bold">Scope</td><td class="mono">15%</td><td>Mid-sprint additions, scope growth, orphan PRs</td><td>Feature creep and scope control</td></tr>
      <tr><td class="bold">Comms</td><td class="mono">10%</td><td>Silent devs, unanswered threads, escalation keywords</td><td>Team communication health</td></tr>
    </tbody>
  </table>
  ${footer(2, 6, 'Executive Summary')}

  <!-- PAGE 3: Agent Breakdown -->
  <div class="page-break"></div>
  <h2>Agent Analysis Breakdown</h2>
  <p>Five specialist AI agents independently evaluated their assigned risk dimension. Each agent produces a risk contribution score (0–100), a confidence rating, and a chain of reasoning based on evidence extracted from project signals. Results are summarised below.</p>
  <div class="grid-${Math.min(Object.keys(analysis?.agent_scores ?? {}).length, 5)} avoid-break" style="margin-bottom:16pt;">
    ${agentScoreBoxes}
  </div>
  <table>
    <thead><tr><th>Agent</th><th>Score</th><th>Reasoning</th><th>Confidence</th></tr></thead>
    <tbody>${agentRows || '<tr><td colspan="4" style="color:#94a3b8;">Run analysis to populate agent data.</td></tr>'}</tbody>
  </table>
  ${agents.map(a => {
    const s = Math.round(a.risk_contribution * 100);
    const name = a.agent.replace('_agent', '').replace(/\b\w/g, (c: string) => c.toUpperCase());
    const risks = (a.top_risks ?? []).slice(0, 3);
    return `<div class="card avoid-break">
      <h3>${name} Agent — Score: ${s} &nbsp;<span class="score-pill ${levelClass(s >= 75 ? 'CRITICAL' : s >= 60 ? 'HIGH' : s >= 40 ? 'MODERATE' : 'LOW')}">${s >= 75 ? 'CRITICAL' : s >= 60 ? 'HIGH' : s >= 40 ? 'MODERATE' : 'LOW'}</span></h3>
      <p class="text-sm">${a.reasoning ?? 'No reasoning available.'}</p>
      ${risks.length ? '<ul>' + risks.map((r: string) => `<li>${r}</li>`).join('') + '</ul>' : ''}
    </div>`;
  }).join('')}
  ${footer(3, 6, 'Agent Breakdown')}

  <!-- PAGE 4: Signal Summary -->
  <div class="page-break"></div>
  <h2>Signal Summary — All 15 Dimensions</h2>
  <p>All input signals are normalised to a 0–100 risk scale. A score of 0 represents no risk; 100 represents maximum observed risk. Raw values are the original measurements extracted from project data before normalisation.</p>
  <table>
    <thead><tr><th>Signal</th><th>Dimension</th><th>Raw Value</th><th>Risk Score</th><th style="width:80pt;">Severity</th></tr></thead>
    <tbody>${sigRows}</tbody>
  </table>
  <div class="card card-accent avoid-break">
    <h3>How to read these signals</h3>
    <p class="text-sm">Signals with a risk score above 75 require immediate attention. Scores between 60–74 are elevated and should be monitored closely. Scores below 40 are within acceptable ranges. The weighted combination of all signals produces the composite risk score shown on the cover page.</p>
  </div>
  ${footer(4, 6, 'Signal Summary')}

  ${mcSection}

  <!-- PAGE 6: Recommendations & Appendix -->
  <div class="page-break"></div>
  <h2>Recommendations &amp; Next Steps</h2>
  <p>Based on the risk signal analysis, the following actions are recommended in order of priority. Implementing high-priority actions within 48 hours can materially reduce the composite risk score.</p>
  <div class="card card-critical avoid-break">
    <h3>Priority 1 — Immediate (0–48 hours)</h3>
    <ul>
      <li>Identify and unblock the highest-centrality dependency hub. Assign additional engineers to unblock stalled tasks on the critical path.</li>
      <li>Escalate all PRs older than 72 hours to Level-2 reviewers to reduce stale PR ratio and avg PR age score.</li>
      <li>Check in with silent developers immediately. Communication gaps compound delay risk significantly.</li>
    </ul>
  </div>
  <div class="card card-high avoid-break">
    <h3>Priority 2 — Short Term (Week 1)</h3>
    <ul>
      <li>Rebalance task distribution from overloaded team members to reduce the task concentration index.</li>
      <li>Implement a PR age automation alert at 48h and 7d to prevent future stale PR accumulation.</li>
      <li>Review all unanswered threads in project channels and assign owners for resolution within 24 hours.</li>
    </ul>
  </div>
  <div class="card avoid-break">
    <h3>Priority 3 — Medium Term (Weeks 2–4)</h3>
    <ul>
      <li>Introduce a sprint scope governance gate requiring PM sign-off for all mid-sprint task additions.</li>
      <li>Schedule a dependency audit with all stakeholders to reduce critical path depth below 4 hops.</li>
      <li>Define and enforce team communication SLAs to prevent future silent developer situations.</li>
    </ul>
  </div>
  <h2 style="margin-top:16pt;">Appendix — Report Metadata</h2>
  <table class="avoid-break">
    <thead><tr><th>Field</th><th>Value</th></tr></thead>
    <tbody>
      <tr><td>Report Generated</td><td>${date}</td></tr>
      <tr><td>Analysis Timestamp</td><td>${analysis?.timestamp?.replace('T', ' ') ?? 'N/A'}</td></tr>
      <tr><td>Formula Version</td><td>${analysis?.formula_version ?? '1.0'}</td></tr>
      <tr><td>Total Signals Evaluated</td><td>15</td></tr>
      <tr><td>Simulations Run</td><td>${mc ? mc.n_simulations?.toLocaleString() : 'Not run'}</td></tr>
      <tr><td>Classification System</td><td>LOW (&lt;40) · MODERATE (40–59) · HIGH (60–74) · CRITICAL (≥75)</td></tr>
      <tr><td>Interaction Penalties Applied</td><td>Up to +9 pts for compound risk conditions</td></tr>
    </tbody>
  </table>
  ${footer(6, 6, 'Recommendations & Appendix')}
  `;

  openPrintWindow(html, `Meridian Full Risk Report — ${date}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT 2 — Dependency Mitigation Plan (PDF)
// ─────────────────────────────────────────────────────────────────────────────
export function exportMitigationPlanPDF(planScore: { current: number; projected: number; level: string } | null, steps: Array<{ priority: string; title: string; detail: string; impact: number; effort: string }>): void {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const current = planScore?.current ?? 75;
  const projected = planScore?.projected ?? 29;
  const totalImpact = steps.reduce((a, s) => a + s.impact, 0);

  const P_COLORS: Record<string, string> = { IMMEDIATE: '#dc2626', SHORT_TERM: '#ea580c', MEDIUM_TERM: '#4f46e5' };
  const P_LABELS: Record<string, string> = { IMMEDIATE: '0–48 hours', SHORT_TERM: 'Week 1', MEDIUM_TERM: 'Weeks 2–4' };

  const stepCards = steps.map((s, i) => {
    const color = P_COLORS[s.priority] ?? '#4f46e5';
    const label = P_LABELS[s.priority] ?? s.priority;
    return `<div class="card avoid-break" style="border-left:4pt solid ${color};margin-bottom:10pt;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6pt;">
        <div>
          <span style="font-size:7pt;font-weight:800;letter-spacing:1pt;text-transform:uppercase;color:${color};background:${color}18;padding:2pt 6pt;border-radius:2pt;border:1pt solid ${color}40;">${s.priority.replace(/_/g, ' ')} · ${label}</span>
        </div>
        <span style="font-size:8pt;font-weight:700;color:#94a3b8;">Action ${i + 1} of ${steps.length}</span>
      </div>
      <p style="font-weight:800;font-size:11pt;color:#0f0e17;margin-bottom:4pt;">${s.title}</p>
      <p class="text-sm" style="margin-bottom:6pt;">${s.detail}</p>
      <div style="display:flex;gap:16pt;">
        <span style="font-size:8pt;color:${color};font-weight:700;">Score Impact: ${s.impact} pts</span>
        <span style="font-size:8pt;color:#64748b;">Implementation Effort: ${s.effort}</span>
      </div>
    </div>`;
  }).join('');

  const html = `
  <div class="cover avoid-break">
    <div class="cover-badge" style="background:#4f46e520;color:#a5b4fc;border:1pt solid #4f46e540;">MERIDIAN — DEPENDENCY RISK</div>
    <h1>Dependency Risk<br>Mitigation Plan</h1>
    <p class="subtitle">AI-generated action plan to resolve critical dependency bottlenecks and reduce project risk</p>
    <div class="cover-meta">
      <div class="cover-meta-item"><label>Generated</label><span>${date}</span></div>
      <div class="cover-meta-item"><label>Current Score</label><span style="color:#dc2626;">${current.toFixed(1)}</span></div>
      <div class="cover-meta-item"><label>Projected Score</label><span style="color:#16a34a;">${projected.toFixed(1)}</span></div>
      <div class="cover-meta-item"><label>Total Reduction</label><span style="color:#16a34a;">${totalImpact} pts</span></div>
    </div>
  </div>
  ${footer(1, 3, 'Cover')}

  <div class="page-break"></div>
  <h2>Mitigation Summary</h2>
  <p>The Meridian Dependency Agent has identified ${steps.length} concrete actions to resolve the active dependency bottleneck. If all actions are executed, the composite risk score is projected to decrease from <strong>${current.toFixed(1)}</strong> to <strong>${projected.toFixed(1)}</strong> — a reduction of <strong>${Math.abs(totalImpact)} points</strong>.</p>
  <div class="grid-3 avoid-break">
    <div class="stat-box"><div class="stat-label">Current Score</div><div class="stat-value" style="color:#dc2626;">${current.toFixed(1)}</div><div class="stat-sub">${planScore?.level ?? 'CRITICAL'} status</div></div>
    <div class="stat-box"><div class="stat-label">Projected Score</div><div class="stat-value" style="color:#16a34a;">${projected.toFixed(1)}</div><div class="stat-sub">After all actions</div></div>
    <div class="stat-box"><div class="stat-label">Total Reduction</div><div class="stat-value" style="color:#4f46e5;">${Math.abs(totalImpact)}</div><div class="stat-sub">Points removed</div></div>
  </div>
  <h3>Prioritised Action Plan</h3>
  ${stepCards}
  ${footer(2, 3, 'Mitigation Plan')}

  <div class="page-break"></div>
  <h2>Dependency Risk Context</h2>
  <p>Dependency risk represents 30% of the composite risk score — the highest weighted dimension in the Meridian model. A high dependency risk score indicates that critical project tasks are structurally blocked, that the critical path has too many sequential hops, or that a single task or developer is a hub for too many downstream dependencies.</p>
  <div class="card card-accent avoid-break">
    <h3>What is a Dependency Hub?</h3>
    <p class="text-sm">A dependency hub is a task or component that many other tasks depend on, directly or indirectly. When a hub task is blocked, delayed, or under-resourced, the impact multiplies across all dependent tasks. The Meridian agent uses graph centrality analysis to detect these hubs automatically.</p>
  </div>
  <div class="card avoid-break">
    <h3>Critical Path Depth</h3>
    <p class="text-sm">Critical path depth measures the longest chain of sequential task dependencies needed to deliver the project. A depth above 4 hops significantly increases the probability that a single delay cascades into a project-wide delay. Reducing depth by parallelising work or decoupling tasks is the most effective structural mitigation.</p>
  </div>
  <h2 style="margin-top:16pt;">Implementation Checklist</h2>
  <table class="avoid-break">
    <thead><tr><th>#</th><th>Action</th><th>Priority</th><th>Effort</th><th>Score Impact</th></tr></thead>
    <tbody>
      ${steps.map((s, i) => `<tr>
        <td class="mono">${i + 1}</td>
        <td>${s.title}</td>
        <td style="color:${P_COLORS[s.priority] ?? '#4f46e5'};font-weight:700;">${s.priority.replace(/_/g, ' ')}</td>
        <td>${s.effort}</td>
        <td class="mono" style="color:#16a34a;font-weight:700;">${s.impact} pts</td>
      </tr>`).join('')}
    </tbody>
  </table>
  ${footer(3, 3, 'Context & Checklist')}
  `;

  openPrintWindow(html, `Meridian Dependency Mitigation Plan — ${date}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT 3 — Comms Analysis Report (PDF)
// ─────────────────────────────────────────────────────────────────────────────
export function exportCommsReportPDF(analysis: RiskAnalysis | null | undefined): void {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const commsAgent = analysis?.agents?.find((a: AgentResult) => a.agent === 'comms_agent');
  const commsScore = commsAgent ? Math.round(commsAgent.risk_contribution * 100) : 56;
  const commsLevel = commsScore >= 75 ? 'CRITICAL' : commsScore >= 60 ? 'HIGH' : commsScore >= 40 ? 'MODERATE' : 'LOW';
  const signals = analysis?.signals?.signals ?? {};

  const commsSigs = ['silent_dev_ratio', 'unanswered_thread_ratio', 'escalation_keyword_count'];
  const sigDetails: Record<string, string> = {
    silent_dev_ratio: 'Proportion of active developers with zero recorded activity (GitHub commits, PR reviews, Slack messages) in the past 48 hours.',
    unanswered_thread_ratio: 'Proportion of high-priority communication threads that have received no response from the assigned stakeholder.',
    escalation_keyword_count: 'Number of detected escalation-level keywords (e.g. "blocker", "urgent", "roll back") in project communication channels in the past 72 hours.',
  };

  const sigRows = commsSigs.map(key => {
    const sig = signals[key];
    const s100 = sig ? Math.round(sig.score * 100) : 0;
    const raw = sig?.value !== undefined ? sig.value : '—';
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    return `<tr>
      <td class="bold">${label}</td>
      <td class="mono">${typeof raw === 'number' && raw > 0 && raw < 1 ? (raw * 100).toFixed(1) + '%' : raw}</td>
      <td class="mono" style="color:${scoreColor(s100)};font-weight:700;">${s100}</td>
      <td style="width:80pt;">${barFill(s100)}</td>
    </tr>`;
  }).join('');

  const html = `
  <div class="cover avoid-break">
    <div class="cover-badge" style="background:#4f46e520;color:#a5b4fc;border:1pt solid #4f46e540;">MERIDIAN — COMMS AGENT</div>
    <h1>Communications Risk<br>Analysis Report</h1>
    <p class="subtitle">Detailed analysis of team communication health, silent developer detection, and escalation signal monitoring</p>
    <div class="cover-meta">
      <div class="cover-meta-item"><label>Generated</label><span>${date}</span></div>
      <div class="cover-meta-item"><label>Comms Score</label><span style="color:${scoreColor(commsScore)};">${commsScore} / 100</span></div>
      <div class="cover-meta-item"><label>Status</label><span style="color:${scoreColor(commsScore)};">${commsLevel}</span></div>
      <div class="cover-meta-item"><label>Confidence</label><span>${commsAgent ? (commsAgent.confidence * 100).toFixed(0) + '%' : '75%'}</span></div>
    </div>
  </div>
  ${footer(1, 3, 'Cover')}

  <div class="page-break"></div>
  <h2>Communications Risk Overview</h2>
  <p>The Communications (Comms) agent monitors team communication health across three key dimensions: developer activity (silent developer detection), thread resolution (unanswered thread ratio), and sentiment escalation (keyword detection). Communication risk accounts for 10% of the composite score but can trigger a cascading interaction penalty when combined with delay signals.</p>
  <div class="card card-${commsLevel.toLowerCase()} avoid-break">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8pt;">
      <div>
        <div style="font-size:8pt;font-weight:700;letter-spacing:1pt;text-transform:uppercase;color:#94a3b8;margin-bottom:4pt;">Comms Risk Score</div>
        <div style="font-size:32pt;font-weight:900;font-family:'Courier New',monospace;color:${scoreColor(commsScore)};line-height:1;">${commsScore}</div>
      </div>
      <div class="score-pill ${levelClass(commsLevel)}">${commsLevel}</div>
    </div>
    <p class="text-sm text-muted">${commsAgent?.reasoning ?? 'The comms agent detected elevated communication risk across the team.'}</p>
  </div>
  <h2>Signal Breakdown</h2>
  <table>
    <thead><tr><th>Signal</th><th>Raw Value</th><th>Risk Score</th><th style="width:80pt;">Severity</th></tr></thead>
    <tbody>${sigRows}</tbody>
  </table>
  <h2>Signal Definitions</h2>
  ${commsSigs.map(key => {
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    return `<div class="card avoid-break">
      <h3>${label}</h3>
      <p class="text-sm">${sigDetails[key]}</p>
    </div>`;
  }).join('')}
  ${footer(2, 3, 'Overview & Signals')}

  <div class="page-break"></div>
  <h2>Agent Reasoning</h2>
  <p>${commsAgent?.reasoning ?? 'The comms agent detected statistically significant communication breakdown patterns.'}</p>
  ${(commsAgent?.top_risks ?? ['Silent developers detected', 'Unanswered high-priority threads', 'Escalation keywords in project channels']).length > 0 ? `
  <div class="card card-accent avoid-break">
    <h3>Top Risk Factors Identified</h3>
    <ul>${(commsAgent?.top_risks ?? ['Silent developers', 'Unanswered threads', 'Escalation keywords']).map((r: string) => `<li>${r}</li>`).join('')}</ul>
  </div>` : ''}
  <h2>Recommended Remediation Actions</h2>
  <div class="card card-critical avoid-break">
    <h3>Immediate Actions (0–24 hours)</h3>
    <ul>
      <li>Send automated check-in notifications to all silent developers (zero activity in 48+ hours).</li>
      <li>Escalate all unanswered high-priority threads to the project manager for direct follow-up.</li>
      <li>Review all detected escalation keywords in communication channels and assess severity.</li>
    </ul>
  </div>
  <div class="card avoid-break">
    <h3>Process Improvements (Week 1–2)</h3>
    <ul>
      <li>Establish a mandatory daily standup to surface communication blockers proactively.</li>
      <li>Define SLA for thread response times: 4 hours for high-priority, 24 hours for standard.</li>
      <li>Assign a communication lead responsible for monitoring and resolving unanswered threads.</li>
      <li>Implement automated Meridian alerts when any developer exceeds 24 hours of inactivity.</li>
    </ul>
  </div>
  <h2 style="margin-top:16pt;">Interaction Penalty Note</h2>
  <div class="card card-high avoid-break">
    <p class="text-sm">The Comms agent participates in an interaction penalty rule: when <strong>overdue_task_ratio &gt; 0.70</strong> AND <strong>silent_dev_ratio &gt; 0.50</strong> are simultaneously active, an additional <strong>+4 points</strong> is added to the composite risk score. This reflects the compounding danger of unaddressed delays in a team that has stopped communicating. Resolving either condition independently will eliminate this penalty.</p>
  </div>
  ${footer(3, 3, 'Reasoning & Recommendations')}
  `;

  openPrintWindow(html, `Meridian Comms Risk Report — ${date}`);
}
