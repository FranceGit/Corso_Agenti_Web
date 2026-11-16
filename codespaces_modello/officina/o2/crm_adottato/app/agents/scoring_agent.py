import json
from app.services.llm_service import LLMService
from app.models import Lead

class ScoringAgent:
    def __init__(self, llm_service: LLMService):
        self.llm = llm_service

    def score_lead(self, lead: Lead) -> dict:
        info = f"Name: {lead.name}, Title: {lead.job_title}, Company: {lead.company}, Industry: {lead.industry}, Size: {lead.company_size}"
        response_str = self.llm.analyze_lead_priority(info)
        
        try:
            # Clean up response to ensure valid JSON (remove backticks if any)
            cleaned_response = response_str.replace("```json", "").replace("```", "").strip()
            data = json.loads(cleaned_response)
            
            # Normalize label to match Enum
            label = data.get("label", "Medium").capitalize()
            if label not in ["High", "Medium", "Low"]:
                label = "Medium"
            data["label"] = label
            
            return data
        except json.JSONDecodeError:
            print("Error decoding Scoring Agent response")
            return {"score": 50, "label": "Medium", "reasoning": "Processing error, default score assigned."}
