import { AgentDetailPage } from '../components/AgentDetailPage';

export default function ScopePage() {
    return (
        <AgentDetailPage
            agentId="scope_agent"
            agentLabel="Scope Agent"
            icon="track_changes"
            description="Detects scope creep via unplanned mid-sprint tasks, requirement changes, and feature expansion from baseline."
            signals={['mid_sprint_task_additions', 'scope_growth_rate', 'out_of_scope_pr_count']}
            mitigationTitle="Scope Control Actions"
            mitigationActions={[
                'Freeze new task additions to the current sprint — defer to backlog unless P0.',
                'Close or tag out-of-scope PRs that are not linked to any sprint task.',
                'Review scope growth rate weekly — alert stakeholders if baseline deviation exceeds 15%.',
            ]}
        />
    );
}
