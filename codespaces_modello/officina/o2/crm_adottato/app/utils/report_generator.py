from typing import List
from app.models import EnrichedLead, PriorityScore, EmailStatus
import pandas as pd
from collections import Counter

class ReportGenerator:
    def generate_report(self, leads: List[EnrichedLead], output_path: str):
        total_leads = len(leads)
        
        # Priority Stats
        priorities = [lead.priority_label.value for lead in leads]
        priority_counts = Counter(priorities)
        
        # Status Stats
        statuses = [lead.simulated_response.value for lead in leads]
        status_counts = Counter(statuses)
        
        # Top Leads
        sorted_leads = sorted(leads, key=lambda x: x.priority_score, reverse=True)
        top_5 = sorted_leads[:5]
        
        report_content = f"""# Campaign Summary Report

## Overview
- **Total Leads Processed**: {total_leads}
- **Date**: {pd.Timestamp.now().strftime('%Y-%m-%d')}

## Engagement Predictions
- **Interested**: {status_counts.get("Interested", 0)}
- **Not Interested**: {status_counts.get("Not Interested", 0)}
- **Needs Follow-up**: {status_counts.get("Needs Follow-up", 0)}

## Priority Distribution
- **High Priority**: {priority_counts.get("High", 0)}
- **Medium Priority**: {priority_counts.get("Medium", 0)}
- **Low Priority**: {priority_counts.get("Low", 0)}

## Top 5 High-Potential Leads
| Name | Company | Score | Status |
|------|---------|-------|--------|
"""
        
        for lead in top_5:
            report_content += f"| {lead.name} | {lead.company} | {lead.priority_score} | {lead.simulated_response.value} |\n"
            
        report_content += "\n## Campaign Insights\n"
        report_content += "Processing complete. Review individual lead outputs for full email drafts and enrichment details."
        
        with open(output_path, "w") as f:
            f.write(report_content)
        
        return report_content
