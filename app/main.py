from fastapi import FastAPI
from pydantic import BaseModel
import uuid

from app.graph_engine import Graph, step1, step2
from app.workflows.summarization import (
    build_summarization_graph
)

app = FastAPI()

# In-memory storage
GRAPHS = {}
RUNS = {}


@app.get("/")
def root():
    return {"message": "Workflow engine (Option B: Summarizer) running 🚀"}


# ------------------------ Test Graph ------------------------
@app.post("/run-test-graph")
def run_test():
    g = Graph()
    g.add_node("step1", step1)
    g.add_node("step2", step2)
    g.add_edge("step1", "step2")

    final_state, log = g.run("step1", {"value": 10})
    return {"final_state": final_state, "log": log}


# ------------------------ Generic Graph APIs ------------------------
class CreateGraphRequest(BaseModel):
    nodes: dict
    edges: dict


@app.post("/graph/create")
def create_graph(req: CreateGraphRequest):
    graph_id = str(uuid.uuid4())
    graph = Graph()

    def dummy_node(state):
        node = state.get("current_node")
        history = state.get("executed", [])
        history.append(node)
        state["executed"] = history
        return state

    for n in req.nodes.keys():
        graph.add_node(n, dummy_node)

    for frm, to in req.edges.items():
        graph.add_edge(frm, to)

    GRAPHS[graph_id] = graph
    return {"graph_id": graph_id}


class RunGraphRequest(BaseModel):
    graph_id: str
    initial_state: dict
    start_node: str


@app.post("/graph/run")
def run_graph(req: RunGraphRequest):
    if req.graph_id not in GRAPHS:
        return {"error": "Graph not found"}

    graph = GRAPHS[req.graph_id]
    final_state, log = graph.run(req.start_node, req.initial_state)

    run_id = str(uuid.uuid4())
    RUNS[run_id] = {"state": final_state, "log": log}

    return {"run_id": run_id, "final_state": final_state, "log": log}


@app.get("/graph/state/{run_id}")
def graph_state(run_id: str):
    if run_id not in RUNS:
        return {"error": "Run not found"}
    return RUNS[run_id]


# ------------------------ Summarization Workflow ------------------------
class SummarizationRequest(BaseModel):
    text: str
    target_length: int = 150


@app.post("/workflow/summarize/run")
def run_summarizer(req: SummarizationRequest):
    graph = build_summarization_graph()

    init = {
        "text": req.text,
        "target_length": req.target_length
    }

    final_state, log = graph.run("split_text", init)
    return {"final_summary": final_state.get("refined_summary", ""), "log": log}
