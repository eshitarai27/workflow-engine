<h1 align="center">⚙️ Workflow Engine — Python + FastAPI</h1>
<p align="center">
A minimal graph-based workflow engine built for the AI Engineering Assignment.  
Supports node execution, looping, shared state, and an example Code Review workflow.
Done by Eshita Rai.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-blue" />
  <img src="https://img.shields.io/badge/FastAPI-Framework-green" />
  <img src="https://img.shields.io/badge/Status-Completed-brightgreen" />
</p>


Features

#Workflow / Graph Engine
- Nodes as Python functions  
- Shared state passed between nodes  
- Edges defining execution flow  
- Looping via cyclic edges  
- Early stopping using `state["done"] = True`  
- Execution logs for debugging  

FastAPI Endpoints
- `GET /` — Health check  
- `POST /run-test-graph` — Verify engine  
- `POST /graph/create` — Create custom workflow  
- `POST /graph/run` — Run stored workflow  
- `GET /graph/state/{run_id}` — Retrieve run output  
- `POST /workflow/code-review/run` — Example workflow with looping  

---

Project Structure

app/
├── main.py # API endpoints
├── graph_engine.py # Core workflow engine
├── tools.py # Optional tool registry
└── workflows/
└── codereview.py # Example Code Review workflow

▶️ Run Locally
1. Create a virtual environment
```bash
python3 -m venv venv
source venv/bin/activate
(Windows)

Copy code
venv\Scripts\activate
2. Install dependencies
bash
Copy code
pip install -r requirements.txt
3. Start the API server
bash
Copy code
uvicorn app.main:app --reload
4. Open Swagger docs
http://127.0.0.1:8000/docs

Improvements (If more time)
Add conditional branching rules

Add WebSocket streaming logs

Add persistent storage (SQLite/Postgres)

Add async execution for heavy tasks

Add a small UI to design workflows visually

Summary
This project implements a clean, extensible workflow engine suitable for AI/ML pipelines, backend orchestration, and agent-like graph execution.

