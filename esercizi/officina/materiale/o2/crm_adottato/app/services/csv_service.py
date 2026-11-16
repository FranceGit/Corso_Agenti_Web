import pandas as pd
from typing import List
import os
from app.models import Lead, EnrichedLead

class CsvService:
    def __init__(self, input_path: str, output_path: str):
        self.input_path = input_path
        self.output_path = output_path

    def read_leads(self) -> List[Lead]:
        if not os.path.exists(self.input_path):
            raise FileNotFoundError(f"Input file not found: {self.input_path}")
        
        df = pd.read_csv(self.input_path)
        leads = []
        for _, row in df.iterrows():
            leads.append(Lead(
                name=row.get('name', ''),
                email=row.get('email', ''),
                company=row.get('company', ''),
                job_title=row.get('job_title', ''),
                industry=row.get('industry', ''),
                company_size=str(row.get('company_size', ''))
            ))
        return leads

    def write_leads(self, leads: List[EnrichedLead]):
        os.makedirs(os.path.dirname(self.output_path), exist_ok=True)
        
        data = []
        for lead in leads:
            lead_dict = lead.model_dump()
            # Convert list to string for CSV
            lead_dict['pain_points'] = "; ".join(lead_dict['pain_points'])
            data.append(lead_dict)
            
        df = pd.DataFrame(data)
        df.to_csv(self.output_path, index=False)
