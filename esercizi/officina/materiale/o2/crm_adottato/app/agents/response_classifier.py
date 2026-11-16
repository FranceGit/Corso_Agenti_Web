import json
from app.services.llm_service import LLMService
from app.models import Lead, EmailStatus

class ResponseClassifierAgent:
    def __init__(self, llm_service: LLMService):
        self.llm = llm_service

    def simulate_response(self, lead: Lead, email_body: str) -> dict:
        lead_info = f"Name: {lead.name}, Title: {lead.job_title}, Company: {lead.company}"
        response_str = self.llm.classify_response(email_body, lead_info)
        
        try:
            cleaned_response = response_str.replace("```json", "").replace("```", "").strip()
            data = json.loads(cleaned_response)
            
            # Map classification to enum
            status_str = data.get("classification", "Needs Follow-up")
            if "Interested" in status_str:
                status = EmailStatus.INTERESTED
            elif "Not Interested" in status_str:
                status = EmailStatus.NOT_INTERESTED
            else:
                status = EmailStatus.NEEDS_FOLLOW_UP
                
            return {"classification": status, "response_text": data.get("response_text", "")}
            
        except json.JSONDecodeError:
            print("Error decoding Response Classifier data")
            return {"classification": EmailStatus.UNKNOWN, "response_text": "Error"}
