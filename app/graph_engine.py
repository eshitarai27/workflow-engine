from typing import Callable, Dict, Any

# A node is simply a function taking state → returning updated state
NodeFunction = Callable[[Dict[str, Any]], Dict[str, Any]]


class Graph:
    def __init__(self):
        self.nodes: Dict[str, NodeFunction] = {}
        # edges: node_name -> next_node_name (simple linear / cyclic flow)
        self.edges: Dict[str, str] = {}

    def add_node(self, name: str, func: NodeFunction):
        """Register a node function by name."""
        self.nodes[name] = func

    def add_edge(self, from_node: str, to_node: str):
        """Define which node runs after which."""
        self.edges[from_node] = to_node

    def run(self, start_node: str, initial_state: Dict[str, Any], max_steps: int = 100):
        """
        Run the workflow from the starting node.
        Supports simple looping by allowing edges to form cycles.
        Stops if:
          - there is no next node, OR
          - state['done'] is set to True by any node, OR
          - max_steps is reached (safety).
        """
        state = initial_state
        current = start_node
        log = []
        steps = 0

        while current is not None and steps < max_steps:
            if current not in self.nodes:
                raise ValueError(f"Node '{current}' is not defined.")

            log.append(f"Executing node: {current}")
            state["current_node"] = current

            node_func = self.nodes[current]
            state = node_func(state)

            # Allow nodes to signal termination
            if state.get("done"):
                log.append("Stopping: done flag set by node.")
                break

            # Move to next node (simple edge mapping)
            current = self.edges.get(current, None)
            steps += 1

        if steps >= max_steps:
            log.append("Stopped due to max_steps limit.")

        return state, log


# Simple test/example node functions (used by /run-test-graph)
def step1(state: Dict[str, Any]) -> Dict[str, Any]:
    state["value"] = state.get("value", 0) + 1
    return state


def step2(state: Dict[str, Any]) -> Dict[str, Any]:
    state["value"] = state["value"] * 2
    return state


# Local test (not used by FastAPI when imported)
if __name__ == "__main__":
    g = Graph()
    g.add_node("step1", step1)
    g.add_node("step2", step2)
    g.add_edge("step1", "step2")

    final_state, log = g.run("step1", {"value": 10})
    print("Final:", final_state)
    print("Log:", log)
