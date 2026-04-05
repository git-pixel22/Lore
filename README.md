# Lore

**Institutional knowledge graph for engineering teams.**

Lore ingests raw team artifacts (Slack threads, incident reports, PR comments, meeting notes) and lets engineers ask *why* the codebase looks the way it does. Instead of a keyword search, you get the full causal decision chain: what incident forced a change, what alternatives were evaluated and rejected, and what constraints still apply today.

Built for the [HydraDB Hack Day](https://hydradb.com/), powered by HydraDB's `infer` + `graph_context` APIs and Groq's LLaMA 3.3 70B.

---

## The Problem

Engineers join a team and immediately face a wall of undocumented decisions:

- Why is the payment service on MongoDB instead of Postgres?
- Why is Redis configured with AOF persistence and you can't turn it off?
- Why does every write go through a `payment_id` dedup table?

The answers exist scattered across old Slack threads, incident post-mortems, ADR documents, and PR review comments. They're invisible, so the same mistakes get repeated, architectural constraints get violated, and onboarding takes months instead of days.

---

## What Lore Does

1. **Ingests** team artifacts into HydraDB with `infer:true`, which extracts structured facts from raw conversational text.
2. **Connects** artifacts using `graph_context:true`, which traverses causal relationships rather than doing simple similarity search.
3. **Answers** questions with full decision chains: the incident that triggered the decision, the alternatives that were rejected (and why), and the constraints that still apply.
4. **Proactive context** surfaces the relevant decision history automatically when an engineer opens a specific file.
5. **Knowledge graph** visualizes the causal chain between artifacts as an interactive node graph.

---

## HydraDB Features Used

| Feature | How Lore Uses It |
|---|---|
| `infer: true` | Extracts structured facts from raw Slack messages, PR comments, and incident reports |
| `graph_context: true` | Traverses causal chains (incident triggered discussion, discussion led to ADR, ADR referenced in PR) |
| `recency_bias: 0.3` | Old architectural decisions are equally relevant, not deprioritised |
| `sub_tenant_id` | Isolates the Lore knowledge base within a shared tenant |

---

## Demo Scenario

The seed knowledge base contains two real-world decision threads from a fictional payments team:

**Thread 1: MongoDB for payment_ledger**
- `INC-2021-1104` Black Friday incident: Postgres write lock contention at 12,847 TPS caused 100% checkout failure for 2.5 hours
- Post-mortem Slack discussion identifying the architectural root cause
- `ADR-017`: MongoDB chosen after 4 months of evaluation (Postgres capped at 8,200 TPS, CockroachDB rejected at $240k/yr)
- PR #247 validating the decision with the explicit constraint: do not migrate back without load test evidence above 15k TPS
- Q1 2023 architecture review: decision stands

**Thread 2: Redis for session cache**
- Slack report: auth checks hitting DB on every request, 80ms average latency
- `ADR-019`: Redis chosen for session cache (Memcached rejected for lack of AOF persistence)
- PR #312 enforcing the constraint: Memcached cannot be substituted
- Q3 2022 infrastructure review: Redis validated, 80ms to 3ms latency improvement confirmed

---

## Architecture

```
lore/
├── backend/
│   ├── main.py           # FastAPI app: /setup /ask /artifacts /proactive endpoints
│   ├── hydra_client.py   # HydraDB add_artifact + recall wrappers
│   ├── llm_client.py     # Groq LLaMA 3.3 70B structured answer generation
│   ├── seed_data.py      # 10 seed artifacts across 2 decision threads
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.jsx        # Homepage + LoreApp shell, continuous chat, tour orchestration
        ├── GraphView.jsx  # React Flow knowledge graph with custom node types
        ├── tour.js        # Driver.js 11-step guided tour
        └── index.css      # Tailwind base + Driver.js overrides
```

**Backend:** FastAPI, HydraDB, Groq (LLaMA 3.3 70B), Python 3.11+

**Frontend:** React 18, Vite, Tailwind CSS, React Flow, Driver.js, Lucide icons

---

## Running Locally

### Backend

```bash
cd lore/backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Copy and fill in your credentials
cp .env.example .env

uvicorn main:app --reload
# Runs on http://localhost:8000
```

### Frontend

```bash
cd lore/frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

The app auto-seeds the knowledge base on first load. Open [http://localhost:5173](http://localhost:5173) and hit "Guided Tour" to walk through every feature.

---

## Environment Variables

```
HYDRA_API_KEY=     # HydraDB API key
GROQ_API_KEY=      # Groq API key
TENANT_ID=         # HydraDB tenant ID
```

See [backend/.env.example](backend/.env.example) for the template.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/setup` | Ingest all seed artifacts into HydraDB |
| `GET` | `/artifacts` | Return seed artifacts for the UI knowledge base panel |
| `POST` | `/ask` | Query the knowledge graph with optional conversation history |
| `GET` | `/proactive/{filepath}` | Get proactive context for a specific file |

The `/ask` endpoint accepts conversation history for multi-turn follow-up questions:

```json
{
  "question": "Why can't we switch back to Postgres?",
  "history": [
    { "role": "user", "content": "Why is the payment service on MongoDB?" },
    { "role": "assistant", "content": "..." }
  ]
}
```

---

## Answer Format

Every answer from Lore follows a structured format:

```
ANSWER
Direct answer to the question.

DECISION CHAIN
Chronological causal chain of events that led to this state.

WHAT WAS REJECTED
Alternatives that were considered and why they were ruled out.

KEY INSIGHT
The one constraint or warning an engineer needs to know before touching this code.
```
