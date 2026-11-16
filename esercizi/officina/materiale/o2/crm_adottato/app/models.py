from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from enum import Enum

class Lead(BaseModel):
    name: str
    email: str
    company: str
    job_title: str
    industry: str
    company_size: str

class PriorityScore(str, Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

class EmailStatus(str, Enum):
    INTERESTED = "Interested"
    NOT_INTERESTED = "Not Interested"
    NEEDS_FOLLOW_UP = "Needs Follow-up"
    UNKNOWN = "Unknown"

class EnrichedLead(Lead):
    priority_score: int = Field(default=0, ge=0, le=100)
    priority_label: PriorityScore = PriorityScore.LOW
    buyer_persona: str = ""
    pain_points: List[str] = Field(default_factory=list)
    suggested_approach: str = ""
    generated_email: str = ""
    simulated_response: EmailStatus = EmailStatus.UNKNOWN
    processing_log: str = ""
