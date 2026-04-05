"""
Seed artifacts for Lore demo.
Two independent decision threads:
  1. MongoDB vs Postgres for payment_ledger (Nov 2021 - Feb 2023)
  2. Redis vs Memcached for payment session cache (Jan 2022 - Q3 2022)
"""

ARTIFACTS = [
    {
        "id": "inc-2021-1104",
        "type": "Incident Report",
        "source": "INC-2021-1104",
        "date": "2021-11-05",
        "author": "Rahul Mehta",
        "content": (
            "INC-2021-1104 - Black Friday Payment Service Degradation (November 5, 2021). "
            "On-call: Rahul Mehta. Duration: 2.5 hours (14:32 to 17:04 IST). "
            "Impact: 100% of checkout flows failed or timed out. Revenue impact: ~$180k. "
            "Root cause: Postgres write lock contention on the payment_ledger table under 12,847 TPS peak Black Friday load. "
            "Postgres row-level locking saturated the lock wait queue, causing cascading timeouts. "
            "Mitigation applied: connection pooling + batched writes. "
            "This is the THIRD incident with this root cause in 2021 (previous: July 2021, September 2021). "
            "Permanent architectural fix required. Action item assigned to Priya Nair: lead payment database architecture review. "
            "CTO briefed. Do not close this incident without a long-term fix proposal."
        ),
    },
    {
        "id": "slack-2021-1106",
        "type": "Slack",
        "source": "#payments-eng",
        "date": "2021-11-06",
        "author": "Rahul Mehta",
        "content": (
            "Rahul Mehta in #payments-eng (Nov 6, 2021): "
            "Team, yesterday was a wake-up call. 2.5 hours of payment failures on Black Friday. "
            "The Postgres write lock issue is not a config problem, it is architectural. "
            "We have been patching this ceiling for 6 months. "
            "We need to seriously evaluate whether Postgres is the right database for the payment_ledger table. "
            "Tagging @priya to lead this. We need a permanent fix before next Black Friday. "
            "The row-level locking ceiling at 12k TPS is real and we have hit it three times this year."
        ),
    },
    {
        "id": "slack-2022-0314",
        "type": "Slack",
        "source": "#payments-eng",
        "date": "2022-03-14",
        "author": "Priya Nair",
        "content": (
            "Priya Nair in #payments-eng (March 14, 2022): "
            "After 4 months of research and load testing, I am recommending MongoDB for the payment_ledger. "
            "Key findings from evaluation: "
            "(1) MongoDB: No row-level lock contention. Sustained 15,200 TPS in our load tests with no degradation. "
            "(2) Postgres v14 was also evaluated. Improved predicate locking but still hit a ceiling at 8,200 TPS in our tests. That is still below our Black Friday peak. Postgres rejected. "
            "(3) CockroachDB evaluated. Licensing cost is prohibitive at our scale ($240k/year). Rejected on cost. "
            "(4) MongoDB tradeoff: no cross-collection ACID transactions. Requires app-level idempotency for all payment writes. We prototyped this and it is manageable with a payment_id dedup table. "
            "My recommendation: migrate payment_ledger to MongoDB. Tagging @arjun and @rahul for final alignment. ADR-017 to follow."
        ),
    },
    {
        "id": "slack-2022-0315",
        "type": "Slack",
        "source": "#payments-eng",
        "date": "2022-03-15",
        "author": "Arjun Singh",
        "content": (
            "Arjun Singh in #payments-eng (March 15, 2022): "
            "Aligned. MongoDB decision approved. "
            "DECISION FINALIZED: payment_ledger migrates from Postgres to MongoDB. "
            "Postgres rejected due to: (a) Black Friday 2021 incident INC-2021-1104, (b) Postgres v14 failing to meet 12k TPS threshold in load tests. "
            "CockroachDB rejected on cost. "
            "MongoDB accepted with constraint: app-level idempotency must be implemented for ALL payment writes using payment_id dedup table. "
            "Migration target: Q2 2022. Owner: Priya Nair. "
            "This is an architectural decision. Any future proposal to revert to Postgres requires full team review plus load test evidence above 15k TPS. "
            "ADR-017 is now the authoritative record."
        ),
    },
    {
        "id": "pr-247",
        "type": "PR Comment",
        "source": "payment-service PR #247",
        "date": "2022-07-22",
        "author": "Dev Kapoor",
        "content": (
            "PR #247 comment thread (payment-service, July 22, 2022). "
            "Dev Kapoor asked: Why is this service using MongoDB? We use Postgres for everything else in the stack. This seems inconsistent. "
            "Priya Nair replied: This is not inconsistency, it is intentional architecture. "
            "MongoDB was chosen for the payment_ledger after the Black Friday 2021 incident (INC-2021-1104) where Postgres write locks caused 2.5 hours of payment failures at 12k TPS. "
            "Postgres v14 was explicitly evaluated and rejected because it still could not meet our TPS requirements. "
            "See ADR-017 for the full decision record and the #payments-eng Slack thread from March 2022. "
            "This is load-bearing architecture. Do not propose migrating back to Postgres without load test evidence above 15k TPS and full team alignment."
        ),
    },
    {
        "id": "meeting-2023-q1",
        "type": "Meeting Notes",
        "source": "Q1 2023 Architecture Review",
        "date": "2023-02-10",
        "author": "Arjun Singh",
        "content": (
            "Q1 2023 Architecture Review - Payment Infrastructure (February 10, 2023). "
            "Attendees: Arjun Singh, Priya Nair, Rahul Mehta, Kavya Reddy (new engineer). "
            "Agenda: Should we revisit the MongoDB decision now that Postgres v15 is available? "
            "Discussion: Postgres v15 introduced improved MVCC and better write throughput. The team reviewed original decision criteria from ADR-017. "
            "Conclusion: STAY on MongoDB. "
            "Rationale: (1) No active incidents with MongoDB. System has been stable since Q2 2022 migration. "
            "(2) Migration cost is high. Idempotency logic is deeply integrated into payment_service. "
            "(3) We have not run updated load tests with Postgres v15. Cannot compare without data. "
            "(4) Risk of migrating a financial system without a clear, active problem is not justified. "
            "Revisit criteria: if Postgres v15 load tests show more than 15k TPS without contention AND we have a zero-downtime migration path, reopen conversation in 2025."
        ),
    },

    # ── Thread 2: Redis vs Memcached for payment session cache ────────────────
    {
        "id": "slack-2022-0118",
        "type": "Slack",
        "source": "#payments-eng",
        "date": "2022-01-18",
        "author": "Kavya Reddy",
        "content": (
            "Kavya Reddy in #payments-eng (January 18, 2022): "
            "Flagging a performance issue. Payment auth checks are hitting the database on every single request. "
            "We are seeing 80ms average latency on auth lookups during peak hours. "
            "This is unacceptable for a payments flow where the user is mid-checkout. "
            "Root cause: no caching layer for payment session tokens. Every auth check = a full DB round-trip. "
            "We need a caching layer before Q2 when we launch the mobile checkout feature. "
            "I'm going to evaluate options this week. Tagging @arjun for visibility. "
            "This will affect auth_service.py and payment_session_store.py."
        ),
    },
    {
        "id": "slack-2022-0201",
        "type": "Slack",
        "source": "#payments-eng",
        "date": "2022-02-01",
        "author": "Kavya Reddy",
        "content": (
            "Kavya Reddy in #payments-eng (February 1, 2022): "
            "Completed the caching layer evaluation. Recommendation: Redis. "
            "Options evaluated: (1) Redis, (2) Memcached, (3) In-process LRU cache. "
            "Memcached rejected: no native persistence. If the cache node restarts, all active payment sessions are invalidated and users are logged out mid-checkout. "
            "Unacceptable for a financial product. "
            "In-process LRU cache rejected: does not work across multiple service replicas. "
            "We run 4 replicas of auth_service. A session cached in replica 1 is invisible to replica 2. "
            "Redis chosen because: (a) AOF persistence — sessions survive restarts, "
            "(b) pub/sub — we can broadcast session invalidations across all auth_service replicas instantly, "
            "(c) TTL support — automatic session expiry without a cron job. "
            "ADR-019 to follow. Implementation target: end of February 2022. Owner: Kavya Reddy."
        ),
    },
    {
        "id": "pr-312",
        "type": "PR Comment",
        "source": "auth-service PR #312",
        "date": "2022-03-05",
        "author": "Dev Kapoor",
        "content": (
            "PR #312 comment thread (auth-service, March 5, 2022). "
            "Dev Kapoor asked: Why are we adding Redis? Memcached is simpler and we already know how to operate it. "
            "Redis feels like overengineering for a session cache. "
            "Kavya Reddy replied: Memcached has no persistence. If auth_service restarts, every active payment session is invalidated. "
            "That means users get logged out mid-checkout, which triggers chargebacks and support tickets. "
            "We evaluated this explicitly — see ADR-019 and the #payments-eng Slack thread from February 1. "
            "Redis pub/sub is also required for cross-replica session invalidation. "
            "With 4 auth_service replicas, in-process or Memcached caches create split-brain session state. "
            "This is not overengineering. The persistence and pub/sub requirements are real constraints from our architecture."
        ),
    },
    {
        "id": "meeting-2022-q3",
        "type": "Meeting Notes",
        "source": "Q3 2022 Infrastructure Review",
        "date": "2022-09-15",
        "author": "Arjun Singh",
        "content": (
            "Q3 2022 Infrastructure Review — Session Caching (September 15, 2022). "
            "Attendees: Arjun Singh, Kavya Reddy, Rahul Mehta. "
            "Agenda: Review Redis session cache performance 6 months post-deployment. "
            "Results: Auth latency reduced from 80ms average to 3ms average. A 96% reduction. "
            "Zero session-loss incidents since deployment (previously ~2 per month from auth_service restarts). "
            "Mobile checkout launched successfully in Q2 with no auth-related incidents. "
            "Conclusion: Redis decision validated. No changes recommended. "
            "Caveat noted by Kavya: the AOF persistence log is growing. "
            "Schedule Redis AOF compaction as a recurring maintenance task. "
            "Do NOT disable AOF persistence to save disk space — this was the explicit reason Memcached was rejected."
        ),
    },
]


def format_for_hydra(artifact: dict) -> str:
    """Format an artifact as a rich text string for HydraDB ingestion."""
    return (
        f"[{artifact['type']} | Source: {artifact['source']} | "
        f"Date: {artifact['date']} | Author: {artifact['author']}]\n"
        f"{artifact['content']}"
    )
