from app.services.llm_service import LLMService
from app.models import Lead

class OutreachAgent:
    def __init__(self, llm_service: LLMService):
        self.llm = llm_service

    def draft_email(self, lead: Lead, enrichment_data: dict) -> str:
        lead_info = f"Name: {lead.name}, Title: {lead.job_title}, Company: {lead.company}"
        enrichment_str = json.dumps(enrichment_data)
        
        email_body = self.llm.generate_email(lead_info, enrichment_str)
        # Clean quotes if potentially added
        return email_body.strip('"').strip()

import json
