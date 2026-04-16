# TAKDA — Ollama Local Model Setup
# Backend runs in Docker

## Goal
Replace OpenRouter with local Ollama for development.
Two-tier: qwen2.5:3b (fast nodes) + qwen2.5:7b (main Aly).
One env var swap to go back to OpenRouter for production.

## Step 1 — Install Ollama on Mac (outside Docker)
brew install ollama
ollama serve
ollama pull qwen2.5:7b
ollama pull qwen2.5:3b

Verify:
curl http://localhost:11434/api/tags

## Step 2 — docker-compose.yml
Add to backend service environment:
  OLLAMA_BASE_URL=http://host.docker.internal:11434/v1
  FAST_MODEL=qwen2.5:3b
  MAIN_MODEL=qwen2.5:7b
  AI_PROVIDER=ollama

## Step 3 — backend/.env
Add:
  OLLAMA_BASE_URL=http://host.docker.internal:11434/v1
  FAST_MODEL=qwen2.5:3b
  MAIN_MODEL=qwen2.5:7b
  AI_PROVIDER=ollama

## Step 4 — backend/services/agent_graph/nodes.py
Replace get_main_model() entirely:

import os
from langchain_openai import ChatOpenAI
from services.agent_graph.tools import AGENT_TOOLS

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434/v1")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
AI_PROVIDER = os.getenv("AI_PROVIDER", "ollama")
MAIN_MODEL = os.getenv("MAIN_MODEL", "qwen2.5:7b")
FAST_MODEL = os.getenv("FAST_MODEL", "qwen2.5:3b")

def get_main_model():
    if AI_PROVIDER == "ollama":
        base_url = OLLAMA_BASE_URL
        api_key = "ollama"
        model = MAIN_MODEL
    else:
        base_url = OPENROUTER_BASE_URL
        api_key = os.getenv("OPENROUTER_API_KEY")
        model = "anthropic/claude-sonnet-4-6"

    return ChatOpenAI(
        model=model,
        base_url=base_url,
        api_key=api_key,
        streaming=True,
        temperature=0.3,
    ).bind_tools(AGENT_TOOLS)

def get_fast_model():
    if AI_PROVIDER == "ollama":
        base_url = OLLAMA_BASE_URL
        api_key = "ollama"
        model = FAST_MODEL
    else:
        base_url = OPENROUTER_BASE_URL
        api_key = os.getenv("OPENROUTER_API_KEY")
        model = "meta-llama/llama-3.1-8b-instruct:free"

    return ChatOpenAI(
        model=model,
        base_url=base_url,
        api_key=api_key,
        streaming=False,
        temperature=0.1,
    )

## Step 5 — backend/services/ai.py
Update get_ai_response_async() to use get_fast_model()
when AI_PROVIDER == "ollama":

import os
AI_PROVIDER = os.getenv("AI_PROVIDER", "ollama")

async def get_ai_response_async(system: str, prompt: str) -> str:
    if AI_PROVIDER == "ollama":
        from services.agent_graph.nodes import get_fast_model
        model = get_fast_model()
        from langchain_core.messages import SystemMessage, HumanMessage
        response = await model.ainvoke([
            SystemMessage(content=system),
            HumanMessage(content=prompt),
        ])
        return response.content or ""
    else:
        # existing Gemini logic stays here unchanged
        ...

## Step 6 — Rebuild and test
docker-compose down
docker-compose up --build

# Watch logs
docker-compose logs backend -f

# Test tool calling via Aly
Send message: "Add a task called buy groceries"
Expect logs:
  [node_load_context] done
  [node_classify_intent] TASK
  [node_respond] streaming...
  [node_extract_memories] done

Check Supabase tasks table — row should appear.

## Switch to production (one line)
In .env change:
  AI_PROVIDER=openrouter

Restart Docker. No code changes needed.

## Troubleshooting
Ollama not reachable from Docker:
  → Make sure ollama serve is running on Mac
  → Test: docker-compose exec backend curl http://host.docker.internal:11434/api/tags

Tool calls not executing:
  → qwen2.5:7b sometimes needs explicit tool prompt
  → Add to ALY_SYSTEM in nodes.py:
    "When the user wants to create, update, or delete something,
     always use the available tools. Never just describe the action."

Model too slow:
  → Switch MAIN_MODEL=qwen2.5:3b for faster response
  → Accept slightly lower tool calling reliability