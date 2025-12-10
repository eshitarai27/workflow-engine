from typing import Dict, Any, List
from app.graph_engine import Graph


def split_text(state: Dict[str, Any]) -> Dict[str, Any]:
    """Split text into chunks of ~200 chars."""
    text = state.get("text", "")
    chunk_size = 200
    chunks = [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]
    state["chunks"] = chunks
    return state


def summarize_chunks(state: Dict[str, Any]) -> Dict[str, Any]:
    """Summarize each chunk by taking the first sentence or first 20 words."""
    summaries = []
    for chunk in state.get("chunks", []):
        words = chunk.split()
        snippet = " ".join(words[:20])
        summaries.append(snippet + "...")
    state["summaries"] = summaries
    return state


def merge_summaries(state: Dict[str, Any]) -> Dict[str, Any]:
    """Merge chunk summaries into one combined summary."""
    summaries = state.get("summaries", [])
    merged = " ".join(summaries)
    state["merged_summary"] = merged
    return state


def refine_summary(state: Dict[str, Any]) -> Dict[str, Any]:
    """Remove repeated phrases and reduce length."""
    summary = state.get("merged_summary", "")

    # Basic refinement: remove duplicates
    sentences = summary.split(".")
    seen = set()
    refined = []
    for s in sentences:
        s = s.strip()
        if s and s not in seen:
            refined.append(s)
            seen.add(s)

    refined_text = ". ".join(refined)
    state["refined_summary"] = refined_text
    return state


def final_check(state: Dict[str, Any]) -> Dict[str, Any]:
    """End loop when summary length is shorter than desired limit."""
    target_length = state.get("target_length", 150)
    summary = state.get("refined_summary", "")

    if len(summary) <= target_length:
        state["done"] = True  # engine stops
    return state


def build_summarization_graph() -> Graph:
    """Build workflow graph for summarization."""
    g = Graph()

    g.add_node("split_text", split_text)
    g.add_node("summarize_chunks", summarize_chunks)
    g.add_node("merge_summaries", merge_summaries)
    g.add_node("refine_summary", refine_summary)
    g.add_node("final_check", final_check)

    # define workflow steps
    g.add_edge("split_text", "summarize_chunks")
    g.add_edge("summarize_chunks", "merge_summaries")
    g.add_edge("merge_summaries", "refine_summary")
    g.add_edge("refine_summary", "final_check")

    # loop until summary is short enough
    g.add_edge("final_check", "merge_summaries")

    return g
