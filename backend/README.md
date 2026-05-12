# TAKDA Backend

FastAPI service.

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # then fill in values
uvicorn main:app --reload --port 8000
```

Health check: http://localhost:8000/health
