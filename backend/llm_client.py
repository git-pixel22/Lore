import os
from groq import Groq

_client = None


def get_client():
    global _client
    if _client is None:
        _client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    return _client


def generate_knowledge_answer(
    question: str,
    context_chunks: list[str],
    history: list[dict] | None = None,
) -> str:
    """
    Answer a question using the knowledge graph context.
    history is a list of {"role": "user"|"assistant", "content": str} turns
    for follow-up question resolution.
    """
    context = "\n\n".join(f"[Record {i+1}]: {c}" for i, c in enumerate(context_chunks))

    system_prompt = """You are Lore, an institutional knowledge assistant for engineering teams.
You answer questions about WHY the codebase is the way it is, using historical records from Slack threads, PR reviews, incident reports, and meeting notes.

You are in a conversation — prior Q&A turns are provided for context. Use them to resolve follow-up questions (e.g. "who made that decision?", "why was that rejected?").

When answering, use ONLY the information from the provided records. Be specific: use exact names, dates, incident IDs.

For the FIRST question in a conversation, format your response EXACTLY like this:

ANSWER: [1-2 sentence direct answer]

DECISION CHAIN:
[Chronological narrative. Each event on its own line, starting with the date.]

WHAT WAS REJECTED:
[Every alternative considered but not chosen, with exact reason]

KEY INSIGHT:
[One sentence — the core institutional lesson a new engineer must know]

For FOLLOW-UP questions (when there is prior conversation history), you may give a shorter, conversational answer. Still use the structured format if the answer warrants it, but don't repeat the full chain if it was already covered."""

    messages = [{"role": "system", "content": system_prompt}]

    # Inject knowledge base context as a system message
    messages.append({
        "role": "system",
        "content": f"Knowledge base records:\n{context}",
    })

    # Replay prior conversation turns
    if history:
        messages.extend(history)

    messages.append({"role": "user", "content": question})

    resp = get_client().chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        temperature=0.2,
        max_tokens=600,
    )
    return resp.choices[0].message.content.strip()


def generate_proactive_context(filepath: str, context_chunks: list[str], focus: str = "") -> str:
    """
    Given a filename and an optional focus hint, generate a proactive context
    alert surfacing the aspect of the knowledge base most relevant to that file.
    """
    if not context_chunks:
        return f"No critical decision history found for {filepath} in the knowledge base."

    context = "\n\n".join(f"- {c}" for c in context_chunks)

    focus_line = f"\nFocus specifically on: {focus}" if focus else ""

    system_prompt = f"""You are Lore, an institutional knowledge assistant.
A developer just opened a file in their editor. Before they make changes, proactively surface the critical context they must know.{focus_line}

Rules:
- Start with: "Before you touch this file:"
- Be specific: mention exact incidents, decisions, dates, names from the records
- Explain WHY this file is architecturally sensitive IN TERMS OF THE FOCUS AREA ABOVE
- Call out any explicit constraints or warnings relevant to this specific file
- Max 4 sentences. Do NOT repeat information unrelated to the focus area.
- If nothing critical exists, say: "This file has no critical decision history on record." """

    user_prompt = f"""Developer opened: {filepath}

Relevant historical records:
{context}

Generate the proactive context alert:"""

    resp = get_client().chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        max_tokens=200,
    )
    return resp.choices[0].message.content.strip()
