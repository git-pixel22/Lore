from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import asyncio
import os

load_dotenv()

import hydra_client as hydra
import llm_client as llm
from seed_data import ARTIFACTS, format_for_hydra

app = FastAPI(title="Lore API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Reuse the existing active tenant, but with a dedicated sub-tenant for Lore
TENANT_ID = os.getenv("TENANT_ID", "pulse-orbit-demo")
SUB_TENANT_ID = "lore-team"


# ── Setup ──────────────────────────────────────────────────────────────────────

@app.post("/setup")
async def setup():
    """Ingest all seed artifacts into HydraDB knowledge base."""
    tasks = [
        hydra.add_artifact(
            tenant_id=TENANT_ID,
            sub_tenant_id=SUB_TENANT_ID,
            text=format_for_hydra(artifact),
            user_name=artifact["author"],
        )
        for artifact in ARTIFACTS
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    success_count = sum(1 for r in results if not isinstance(r, Exception))

    return {
        "success": True,
        "artifacts_ingested": success_count,
        "total": len(ARTIFACTS),
        "results": [str(r) for r in results],
    }


# ── Artifacts ─────────────────────────────────────────────────────────────────

@app.get("/artifacts")
async def get_artifacts():
    """Return the seed artifacts for display in the UI knowledge base panel."""
    return [
        {
            "id": a["id"],
            "type": a["type"],
            "source": a["source"],
            "date": a["date"],
            "author": a["author"],
            "content": a["content"],
        }
        for a in ARTIFACTS
    ]


# ── Ask ────────────────────────────────────────────────────────────────────────

class HistoryEntry(BaseModel):
    role: str   # "user" or "assistant"
    content: str


class AskRequest(BaseModel):
    question: str
    history: list[HistoryEntry] = []


@app.post("/ask")
async def ask(req: AskRequest):
    """
    Query the institutional knowledge graph.
    Accepts optional conversation history for follow-up question resolution.
    """
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # For follow-ups, augment the query with prior question for better recall
    recall_query = req.question
    if req.history:
        prior_questions = " ".join(
            h.content for h in req.history if h.role == "user"
        )
        recall_query = f"{prior_questions} {req.question}"

    recall_result = await hydra.recall(
        tenant_id=TENANT_ID,
        sub_tenant_id=SUB_TENANT_ID,
        query=recall_query,
        max_results=6,
    )

    chunks = hydra.extract_chunks(recall_result)

    if not chunks:
        chunks = [format_for_hydra(a) for a in ARTIFACTS]

    history = [{"role": h.role, "content": h.content} for h in req.history]
    answer = llm.generate_knowledge_answer(req.question, chunks, history=history)

    return {
        "question": req.question,
        "answer": answer,
        "sources_used": len(chunks),
    }


# ── Proactive file context ─────────────────────────────────────────────────────

# Each file surfaces a *different* slice of the knowledge graph.
FILE_QUERIES = {
    "payment_service.py":       "MongoDB database architecture decision Black Friday incident INC-2021-1104 payment service",
    "payment_ledger_model.py":  "idempotency constraint data model ledger schema payment_id dedup table design requirement",
    "checkout_handler.py":      "checkout flow payment writes error handling idempotency app-level safety constraint",
    "auth_service.py":          "Redis session cache caching layer auth latency Memcached rejected ADR-019 persistence",
    "payment_session_store.py": "Redis AOF persistence session store cross-replica invalidation pub/sub Memcached rejected",
}

# LLM is directed to focus on a specific aspect per file, even when source chunks overlap.
FILE_FOCUS = {
    "payment_service.py": (
        "the MongoDB vs Postgres architectural decision: WHY MongoDB was chosen, "
        "which incidents forced the decision, and the explicit warning that reverting to Postgres "
        "requires load test evidence above 15k TPS."
    ),
    "payment_ledger_model.py": (
        "the idempotency constraint on this model: MongoDB has no cross-collection ACID transactions, "
        "so ALL writes through this model MUST use the payment_id dedup table for idempotency. "
        "Surface the exact technical constraint and who mandated it."
    ),
    "checkout_handler.py": (
        "write safety and error handling: any payment write from checkout MUST be idempotent "
        "because MongoDB does not guarantee ACID across collections. "
        "Surface the constraint on safe retry behaviour and what happens if writes are not idempotent."
    ),
    "auth_service.py": (
        "the Redis session cache decision: WHY Redis was chosen over Memcached — specifically "
        "AOF persistence (sessions survive restarts) and pub/sub for cross-replica invalidation. "
        "Warn that disabling AOF persistence was the explicit reason Memcached was rejected."
    ),
    "payment_session_store.py": (
        "the Redis persistence constraint: AOF must stay enabled — this was the exact reason "
        "Memcached was rejected. Also surface the cross-replica session invalidation requirement "
        "via pub/sub, and the 80ms to 3ms latency improvement that validated the decision."
    ),
}

DEFAULT_FILE_QUERY = "decisions architecture history context for {filepath}"


@app.get("/proactive/{filepath:path}")
async def proactive_context(filepath: str):
    """
    Proactive context for when an engineer opens a file.
    Each file has a targeted query to surface a different slice of the knowledge graph.
    """
    query = FILE_QUERIES.get(filepath, DEFAULT_FILE_QUERY.format(filepath=filepath))

    recall_result = await hydra.recall(
        tenant_id=TENANT_ID,
        sub_tenant_id=SUB_TENANT_ID,
        query=query,
        max_results=4,
    )

    chunks = hydra.extract_chunks(recall_result)

    if not chunks:
        # Fallback: relevant seed data for payment files
        chunks = [format_for_hydra(a) for a in ARTIFACTS[:3]]

    focus = FILE_FOCUS.get(filepath, "")
    context = llm.generate_proactive_context(filepath, chunks, focus=focus)

    return {
        "filepath": filepath,
        "context": context,
        "sources_used": len(chunks),
    }
