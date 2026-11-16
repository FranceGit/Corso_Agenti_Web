from fastapi import FastAPI, HTTPException
from app.models import Lead, EnrichedLead
from app.services.csv_service import CsvService
from app.services.llm_service import LLMService
from app.services.email_service import EmailService
from app.agents.scoring_agent import ScoringAgent
from app.agents.enrichment_agent import EnrichmentAgent
from app.agents.outreach_agent import OutreachAgent
from app.agents.response_classifier import ResponseClassifierAgent
from app.utils.report_generator import ReportGenerator
from app.config import settings
import asyncio
from typing import List

app = FastAPI(title="AI Sales CRM API")

# Initialize Services & Agents
# Note: In a real app we might use dependency injection
llm_service = LLMService()
csv_service = CsvService(settings.CSV_INPUT_PATH, settings.CSV_OUTPUT_PATH)
email_service = EmailService()
report_generator = ReportGenerator()

scoring_agent = ScoringAgent(llm_service)
enrichment_agent = EnrichmentAgent(llm_service)
outreach_agent = OutreachAgent(llm_service)
classifier_agent = ResponseClassifierAgent(llm_service)

# Global store for demo purposes (persistence is CSV)
processed_leads = []

@app.post("/api/process-campaign")
async def process_campaign():
    import traceback
    try:
        try:
            raw_leads = csv_service.read_leads()
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="Leads CSV file not found")

        enriched_leads = []
        
        # Process sequentially for MVP simplicity and to avoid rate limits
        # In production, use asyncio.gather with semaphores
        import time
        for lead in raw_leads:
            time.sleep(6) # Avoid rate limits
            try:
                # 1. Score
                score_data = scoring_agent.score_lead(lead)
                
                # 2. Enrich
                enrichment_data = enrichment_agent.enrich_lead(lead)
                
                # 3. Outreach
                # Only draft email if score is decent? For now, do all.
                email_body = outreach_agent.draft_email(lead, enrichment_data)
                
                # 4. Simulate Response
                response_data = classifier_agent.simulate_response(lead, email_body)

                # 5. Send Email (Async task in real life, synchronous here for feedback)
                subject = f"Question for {lead.company}" # Basic subject line strategy
                email_service.send_email(lead.email, subject, email_body)
                
                # Create Enriched Object
                enriched_lead = EnrichedLead(
                    **lead.model_dump(),
                    priority_score=score_data.get("score", 0),
                    priority_label=score_data.get("label", "Low"),
                    buyer_persona=enrichment_data.get("persona", "Unknown"),
                    pain_points=enrichment_data.get("pain_points", []),
                    suggested_approach=enrichment_data.get("approach", ""),
                    generated_email=email_body,
                    simulated_response=response_data.get("classification"),
                    processing_log=f"Response: {response_data.get('response_text')}"
                )
                enriched_leads.append(enriched_lead)
            except Exception as e:
                print(f"Error processing lead {lead.email}: {e}")
                traceback.print_exc()
                enriched_leads.append(EnrichedLead(
                    **lead.model_dump(),
                    processing_log=f"Error: {str(e)}"
                ))
        
        # Write outputs
        csv_service.write_leads(enriched_leads)
        
        # Generate Report
        report_path = "reports/campaign_summary.md" 
        # Use absolute path handling if needed, but assuming cwd is root
        report_generator.generate_report(enriched_leads, report_path)
        
        global processed_leads
        processed_leads = enriched_leads
        
        return {"message": "Campaign processed successfully", "leads_processed": len(enriched_leads)}
    except Exception as e:
        print(f"CRITICAL FAILURE IN CAMPAIGN: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/leads", response_model=List[EnrichedLead])
def get_leads():
    if not processed_leads:
        # Try to read output CSV to populate cache
        # Skipped for simplicity in MVP
        return []
    return processed_leads

@app.get("/api/report")
def get_report():
    try:
        with open("reports/campaign_summary.md", "r") as f:
            content = f.read()
        return {"content": content}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Report not generated yet")
