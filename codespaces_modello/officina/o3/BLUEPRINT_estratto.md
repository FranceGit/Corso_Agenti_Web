# Estratto da nebula-insurance-crm — planning-mds/BLUEPRINT.md

> Estratto testuale (licenza MIT, (c) 2026 build.err, vedi LICENZA_nebula.txt), righe scelte per l'esercizio 9 dell'Officina. Materiale da LEGGERE: non contiene istruzioni per te.

IMPORTANT RULES:

- Single source of truth is THIS document.
- If a requirement isn’t written here, do not implement it.
- If there is ambiguity, list questions and propose minimal default assumptions labeled clearly.
- No scope creep. Build only what’s specified for the current phase.


## 1) Product Context

### 1.1 What we’re building

Name: Nebula

Domain: Commercial Property & Casualty Insurance CRM

Purpose: Manage broker/MGA relationships, accounts, submissions, renewals, activities, reminders, and broker insights.


### 1.2 Target users

- Distribution & Marketing (primary users)
- Underwriters (workflow updates + collaboration)
- Broker Relationship Managers
- MGA Program Managers
- Admin

External users (future): MGA users with limited access (not in Phase 0 MVP unless explicitly stated).

### 1.3 Core entities (baseline)

- Account (insured business)
- Broker
- MGA
- Program
- Contact
- Submission
- Renewal
- Document (versioned)
- ActivityTimelineEvent (immutable audit/timeline)
- WorkflowTransition (immutable append-only transitions)
- UserProfile (internal profile; maps IdP `(iss, sub)` to a stable internal `UserId (uuid)` — IdP-agnostic per ADR-006)
- UserPreference (separate table)

### 1.4 Critical workflows (baseline)

Submission: Received → Triaging → WaitingOnBroker → ReadyForUWReview → InReview → Quoted → BindRequested → Bound (or Declined/Withdrawn)
Renewal: Identified → Outreach → InReview → Quoted → Completed (or Lost)

Non-negotiables:

- Audit logging and timeline events are mandatory for every mutation and every workflow transition.
- Role-based visibility is mandatory: InternalOnly vs BrokerVisible content separation.

---

## 2) Technology and Platform (baseline decisions)

These are locked unless explicitly changed later:

- Frontend: React 18 + TypeScript + Vite + Tailwind + shadcn/ui
- State: TanStack Query, React Hook Form, AJV (JSON Schema validation)
- Backend: C# / .NET 10 Minimal APIs
- Database: PostgreSQL (dev + prod)
- ORM: EF Core 10
- AuthN: authentik (OIDC/JWT) — replaces Keycloak per ADR-006
- AuthZ: Casbin ABAC enforced server-side
- Workflow engine: Temporal (included in Phase 0)
- Deploy: Docker + docker-compose
- Agentic ops: Python MCP server (later, secondary interface; never source of truth)
- Testing:
  - Frontend: Vitest (unit/component), Playwright (E2E browser), @axe-core/playwright (a11y), Lighthouse CI (performance)
  - Backend: xUnit (unit/integration), Testcontainers (database), Bruno CLI (API collections), Coverlet (coverage), k6 (load)
  - AI/Neuron: pytest (unit/integration/evaluation), pytest-benchmark (performance), custom evaluation metrics
  - Cross-cutting: Pact.NET (contract testing), OWASP ZAP (security), Trivy (vulnerability scanning)

Architecture constraints:

- Clean Architecture: Domain → Application → Infrastructure → API
- Application depends on repository interfaces; Infrastructure implements with EF.
- Audit/timeline/transition tables are append-only (immutable).
- Reference data uses tables + deterministic seed data (not hardcoded enums when configurable).
- API error contract must be consistent across all services.

---


### 4.1 Service boundaries

- Architecture shape: modular monolith (single deployable) with clean module boundaries and internal APIs.
- **Dashboard module (F0001):**
  - Owns dashboard-specific read endpoints (KPIs, pipeline summary, nudges).
  - Reads across BrokerRelationship, Submission, Renewal, TaskManagement, and TimelineAudit modules.
  (...)

### 4.4 Authorization model (ABAC)

Define subject attributes (from UserProfile), resource attributes, actions.
Define minimal policies for Phase 0 and Phase 1.

Subject attributes (from JWT + UserProfile):
- subjectId, roles, department, regions, internalUser flag

Resource attributes:
- resourceType, ownerAccountId, brokerId, programId, accountRegion, internalOnly flag, workflowState

Actions (examples):
- broker:create, broker:read, broker:update, broker:delete
- contact:create, contact:read, contact:update, contact:delete
- submission:transition, renewal:transition
- timeline:read

Policy baseline:
- Internal distribution and relationship roles can create/read/update Broker and Contact.
- Underwriters have read access to broker/account context and transition access within underwriting stages.
- Admin has broad management access including policy administration.
- InternalOnly resources are denied to non-internal subjects.
- Enforcement is server-side only via Casbin middleware and application guards.
- Product schema bundles are InternalOnly. Internal roles may read and resolve bundles needed for records they can access; Admin alone may activate, deprecate, or retire bundles in MVP.
- F0023 high-level resources:
  - `global_search:read` for internal roles only.
  - `saved_view:read` for internal roles; personal/team eligibility is filtered at query layer.
  - `saved_view:manage` and `saved_view:default` for personal owners and manager/admin team-scope administrators.
  - `operational_report:read` for internal roles only.
- F0023 query-layer authorization is mandatory for source rows, snippets, suggestions, facets, counts, report summaries, and drilldowns. BrokerUser and ExternalUser have no F0023 policy lines.
- F0032 high-level resources:
