from typing import Dict, Any
from app.graph_engine import Graph


def extract_functions(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Dummy extraction: pretend we parsed the code and found some functions.
    """
    code = state.get("code", "")
    # For demo, count 'def' occurrences as functions
    functions = []
    for i, line in enumerate(code.splitlines(), start=1):
        if "def " in line:
            functions.append(f"func_at_line_{i}")
    state["functions"] = functions or ["main"]
    return state


def check_complexity(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Dummy complexity: bigger code -> bigger complexity.
    """
    code = state.get("code", "")
    length = len(code)
    complexity = min(10, max(1, length // 50))  # very rough fake metric
    state["complexity"] = complexity
    return state


def detect_basic_issues(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Dummy issue detection: just pretend we found some small issues.
    """
    complexity = state.get("complexity", 1)
    issues_found = max(0, complexity - 3)  # more complexity -> more "issues"
    state["issues_found"] = issues_found
    return state


def suggest_improvements(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Dummy suggestions based on complexity and issues.
    """
    suggestions = []
    complexity = state.get("complexity", 1)
    issues = state.get("issues_found", 0)

    if complexity > 5:
        suggestions.append("Refactor large functions into smaller ones.")
    if issues > 0:
        suggestions.append("Reduce nested conditionals and loops.")
    if not suggestions:
        suggestions.append("Code looks clean. Minor style improvements only.")

    state["suggestions"] = suggestions
    return state


def evaluate_quality(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Increase quality_score on each review iteration and stop when threshold is reached.
    Demonstrates looping behavior.
    """
    score = state.get("quality_score", 0)
    score += 2  # each cycle improves quality by +2
    state["quality_score"] = score

    threshold = state.get("threshold", 7)
    if score >= threshold:
        state["done"] = True  # Graph.run will stop when this is set

    return state


def build_code_review_graph() -> Graph:
    """
    Build a simple looping code-review workflow:
      extract_functions -> check_complexity -> detect_basic_issues
           -> suggest_improvements -> evaluate_quality -> (back to extract_functions)
    Loop stops when quality_score >= threshold.
    """
    g = Graph()
    g.add_node("extract_functions", extract_functions)
    g.add_node("check_complexity", check_complexity)
    g.add_node("detect_basic_issues", detect_basic_issues)
    g.add_node("suggest_improvements", suggest_improvements)
    g.add_node("evaluate_quality", evaluate_quality)

    g.add_edge("extract_functions", "check_complexity")
    g.add_edge("check_complexity", "detect_basic_issues")
    g.add_edge("detect_basic_issues", "suggest_improvements")
    g.add_edge("suggest_improvements", "evaluate_quality")
    # loop back
    g.add_edge("evaluate_quality", "extract_functions")

    return g
