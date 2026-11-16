import json
from app.services.llm_service import LLMService
from app.models import Lead

class EnrichmentAgent:
    def __init__(self, llm_service: LLMService):
        self.llm = llm_service

    def enrich_lead(self, lead: Lead) -> dict:
        info = f"Name: {lead.name}, Title: {lead.job_title}, Company: {lead.company}, Industry: {lead.industry}"
        response_str = self.llm.enrich_buyer_persona(info)
        
        try:
            cleaned_response = response_str.replace("```json", "").replace("```", "").strip()
            data = json.loads(cleaned_response)
            
            # Ensure fields are valid types for EnrichedLead model
            if isinstance(data.get("persona"), (dict, list)):
                data["persona"] = json.dumps(data["persona"])
            
            if isinstance(data.get("approach"), (dict, list)):
                data["approach"] = json.dumps(data["approach"])
                
            return data
        except json.JSONDecodeError:
            print("Error decoding Enrichment Agent response")
            return {"persona": "Unknown", "pain_points": [], "approach": "Standard"}
