# AI-Enhanced Sales Campaign CRM (MVP)

A fully dockerized, AI-powered CRM that automates the sales pipeline: from lead ingestion to scoring, enrichment, outreach, and response classification. Built with **FastAPI**, **Groq (LLM)**, and **MailHog**.

## 🚀 Key Features

*   **⚡ Automated Pipeline**: Ingests leads, scores them, enriches data, and drafts personalized emails in one go.
*   **🤖 Multi-Agent System**:
    *   **Scoring Agent**: Evaluates lead potential (High/Medium/Low).
    *   **Enrichment Agent**: Infers buyer persona and pain points.
    *   **Outreach Agent**:Writes personalized cold emails.
    *   **Response Classifier**: (Simulation) Categorizes replies (Interested/Not Interested).
*   **🐳 Docker Ready**: Spin up the entire stack (App + MailHog) with a single command.
*   **🧠 Free LLM Integration**: Uses Groq API (free tier) for lightning-fast inference.

## 🛠 Tech Stack

*   **Backend**: Python 3.9, FastAPI
*   **AI/LLM**: Groq API (Llama3-8b-8192)
*   **Email Simulation**: MailHog (SMTP testing)
*   **Data Processing**: Pandas
*   **Containerization**: Docker & Docker Compose

## 🏃‍♂️ Quick Start

### Prerequisites
*   Docker & Docker Compose installed.
*   A Groq API Key (get one [here](https://console.groq.com/keys)).

### 1. Setup Environment
Create a `.env` file in the `sales-crm` directory:
```bash
GROQ_API_KEY=gsk_... # Your actual key
SMTP_HOST=mailhog
SMTP_PORT=1025
CSV_INPUT_PATH=data/leads.csv
CSV_OUTPUT_PATH=data/leads_output.csv
```

### 2. Run the Application
```bash
docker compose up --build
```
*   **API**: `http://localhost:8000`
*   **MailHog UI**: `http://localhost:8025`

### 3. Trigger the Campaign
You can trigger the processing pipeline via the API docs or curl:

**Option A: Browser (Swagger UI)**
1.  Go to [http://localhost:8000/docs](http://localhost:8000/docs).
2.  Expand `POST /api/process-campaign`.
3.  Click **Try it out** -> **Execute**.

**Option B: PowerShell/Terminal**
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/process-campaign"
```

### 4. View Results
*   **Emails**: Check [http://localhost:8025](http://localhost:8025) to see sent emails.
*   **CSV Output**: Check `data/leads_output.csv` for enriched data (scores, personas, response categories).
*   **Report**: Check `reports/campaign_summary.md` for the campaign execution summary.

## 🏗 Architecture & Approach

This MVP demonstrates a modular **Agentic Workflow**:

1.  **Ingestion**: Reads raw CSV data (`name`, `company`, `title`, etc.).
2.  **Scoring Agent**: The LLM analyzes the job title and company size to assign a priority score (0-100).
3.  **Enrichment Agent**: Based on the industry and role, the LLM hallucinates/infers a likely "Buyer Persona" and "Pain Points" to tailor the message.
4.  **Outreach Agent**: Uses the persona and pain points to generate a unique, non-generic email.
5.  **Simulation & Classification**: 
    *   *Note*: To demonstrate the full loop without waiting for days, the system **simulates** a reply from the lead.
    *   The **Classifier Agent** reads this reply and tags it (e.g., "Interested", "Needs Follow-up").

## 📂 Project Structure

```
sales-crm/
├── app/
│   ├── agents/          # Logic for Score, Enrich, Outreach, Classify
│   ├── services/        # CSV, Email, and LLM service wrappers
│   ├── models.py        # Pydantic data models
│   ├── main.py          # FastAPI entry point & pipeline orchestration
├── data/                # Input/Output CSVs
├── reports/             # Generated Markdown summaries
├── docker-compose.yml   # Orchestration
└── Dockerfile           # App container definition
```

---
**Prepared for Softstandard Solutions Jr. AI Engineer Assessment**
