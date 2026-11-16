import os
from groq import Groq
import json
from typing import List, Dict, Any

class LLMService:
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            # Fallback or allow error to be caught later, but better to warn
            print("Warning: GROQ_API_KEY not found in environment variables.")
        self.client = Groq(api_key=api_key)
        self.model = "llama-3.1-8b-instant"

    def _get_completion(self, prompt: str, system_prompt: str = "You are a helpful AI assistant.", json_mode: bool = False) -> str:
        try:
            kwargs = {
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "model": self.model,
                "temperature": 0.5,
                "max_tokens": 1024,
            }
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}

            chat_completion = self.client.chat.completions.create(**kwargs)
            return chat_completion.choices[0].message.content
        except Exception as e:
            print(f"Error calling Groq API: {e}")
            return ""

    def analyze_lead_priority(self, lead_info: str) -> str:
        system = "You are a Sales Operations Manager. Evaluate lead priority. Return valid JSON."
        prompt = f"""
        Analyze this lead and assign a priority score (0-100) and label (High/Medium/Low).
        Return JSON format: {{"score": 85, "label": "High", "reasoning": "..."}}
        
        Lead Info:
        {lead_info}
        """
        return self._get_completion(prompt, system, json_mode=True)

    def enrich_buyer_persona(self, lead_info: str) -> str:
        system = "You are a Market Research Specialist. Return valid JSON."
        prompt = f"""
        Generate a buyer persona, identify 3 key pain points, and suggest a communication approach.
        Return JSON format: 
        {{
            "persona": "...", 
            "pain_points": ["p1", "p2", "p3"], 
            "approach": "..."
        }}
        
        Lead Info:
        {lead_info}
        """
        return self._get_completion(prompt, system, json_mode=True)

    def generate_email(self, lead_info: str, enrichment_info: str) -> str:
        system = "You are an Expert Copywriter. Write a personalized cold email."
        prompt = f"""
        Write a professional, concise cold email (under 150 words) to this lead.
        Use the enrichment info to personalize it.
        
        Lead Info: {lead_info}
        Enrichment Info: {enrichment_info}
        
        Return just the email body text.
        """
        return self._get_completion(prompt, system, json_mode=False)

    def classify_response(self, email_content: str, lead_info: str) -> str:
        system = "You are a Sales SDR. Simulate a response from the lead. Return valid JSON."
        prompt = f"""
        Simulate a realistic response from this lead based on their profile and the email sent.
        Then classify the response as: Interested, Not Interested, or Needs Follow-up.
        
        Lead: {lead_info}
        Email Sent: {email_content}
        
        Return JSON format: {{"response_text": "...", "classification": "Interested"}}
        """
        return self._get_completion(prompt, system, json_mode=True)
