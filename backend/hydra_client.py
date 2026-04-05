import httpx
import asyncio
import os

HYDRA_BASE = "https://api.hydradb.com"


def get_headers():
    return {
        "Authorization": f"Bearer {os.getenv('HYDRA_API_KEY')}",
        "Content-Type": "application/json",
    }


async def create_tenant(tenant_id: str):
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{HYDRA_BASE}/tenants/create",
            headers=get_headers(),
            json={"tenant_id": tenant_id},
        )
        return resp.json()


async def wait_for_tenant(tenant_id: str, retries: int = 10):
    async with httpx.AsyncClient(timeout=30) as client:
        for _ in range(retries):
            resp = await client.get(
                f"{HYDRA_BASE}/tenants/infra/status",
                headers=get_headers(),
                params={"tenant_id": tenant_id},
            )
            data = resp.json()
            if data.get("status") == "active":
                return True
            await asyncio.sleep(2)
    return False


async def add_artifact(tenant_id: str, sub_tenant_id: str, text: str, user_name: str):
    """Ingest a single artifact with its specific author as user_name."""
    payload = {
        "tenant_id": tenant_id,
        "sub_tenant_id": sub_tenant_id,
        "memories": [{
            "text": text,
            "infer": True,
            "user_name": user_name,
        }],
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{HYDRA_BASE}/memories/add_memory",
            headers=get_headers(),
            json=payload,
        )
        return resp.json()


async def recall(tenant_id: str, sub_tenant_id: str, query: str, max_results: int = 8):
    payload = {
        "tenant_id": tenant_id,
        "sub_tenant_id": sub_tenant_id,
        "query": query,
        "mode": "thinking",
        "graph_context": True,
        "max_results": max_results,
        "recency_bias": 0.3,  # lower for Lore — old decisions are just as relevant
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{HYDRA_BASE}/recall/full_recall",
            headers=get_headers(),
            json=payload,
        )
        return resp.json()


def extract_chunks(recall_result: dict) -> list[str]:
    """Normalize the HydraDB recall response into a list of text chunks."""
    chunks = []
    if "chunks" in recall_result:
        chunks = [c.get("content", "") for c in recall_result["chunks"] if c.get("content")]
    elif "results" in recall_result:
        chunks = [r.get("text", "") for r in recall_result["results"] if r.get("text")]
    elif "memories" in recall_result:
        chunks = [m.get("text", "") or m.get("content", "") for m in recall_result["memories"] if m]
    return [c for c in chunks if c]
