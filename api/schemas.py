from pydantic import BaseModel
from typing import List, Dict, Any

class MutationRequest(BaseModel):
    type: str
    count: int = 0
    days: int = 0
    task_count: int = 0
    pr_count: int = 0

class AgentOutput(BaseModel):
    agent: str
    risk_contribution: float
    confidence: float
    top_risks: List[str]
    evidence: List[str]
    reasoning: str
    signal_refs: List[str]

class RiskAnalysisResponse(BaseModel):
    risk_score: float
    risk_level: str
    agent_scores: Dict[str, float]
    dominant_risk: str
    interaction_penalty: float
    agents: List[AgentOutput]
    signals: Dict[str, Any]
    timestamp: str
    formula_version: str

class SimulationResponse(BaseModel):
    baseline: Dict[str, Any]
    simulated: Dict[str, Any]
    delta: Dict[str, Any]
    mutation_applied: Dict[str, Any]
    simulation_version: str
