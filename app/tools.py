# Example tools (not required, but structured for future extension)

def detect_issues(state):
    state["issues"] = state.get("issues", 0) + 3
    return state
