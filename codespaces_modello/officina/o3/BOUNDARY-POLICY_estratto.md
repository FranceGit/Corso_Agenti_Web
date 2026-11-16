# Estratto da nebula-agents — BOUNDARY-POLICY.md

> Estratto testuale (licenza MIT, (c) 2026 build.err, vedi LICENZA_nebula.txt).

## Purpose

This policy defines the boundary between generic, reusable agent roles (`agents/`) and solution-specific content (`{NEBULA_PRODUCT_ROOT}/planning-mds/`).

---

## Policy Rules

### Rule 1: agents/ is Generic and Reusable

**Principle:** Everything in `agents/` must be applicable to **any** software project, regardless of domain.

**What belongs in agents/:**
- ✅ Agent role definitions (SKILL.md and supporting references/scripts/assets)
- ✅ Generic best practices (SOLID, DDD, INVEST, vertical slicing, etc.)
- ✅ Generic examples from multiple domains (B2B SaaS, e-commerce, healthcare, etc.)
- ✅ Generic templates (story, feature, persona, ADR, API contract, etc.)
- ✅ Generic scripts and tools (validation, linting, formatting)

**What does NOT belong in agents/:**
- ❌ Domain-specific terminology (insurance, underwriting, claims, etc.)
- ❌ Competitive analysis for specific markets
- ❌ Solution-specific examples (personas, features, stories referencing project entities)
- ❌ Solution-specific architecture patterns
- ❌ Project-specific business rules or workflows

---

### Rule 2: {NEBULA_PRODUCT_ROOT}/planning-mds/ is Solution-Specific

