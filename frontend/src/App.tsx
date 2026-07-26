import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Workflows from "./pages/Workflows";
import WorkflowDetail from "./pages/WorkflowDetail";
import WorkflowBuilder from "./pages/WorkflowBuilder";
import Simulation from "./pages/Simulation";
import ExecutionDetail from "./pages/ExecutionDetail";
import Metrics from "./pages/Metrics";
import Plugins from "./pages/Plugins";
import Events from "./pages/Events";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/workflows" element={<Workflows />} />
        <Route path="/workflows/:workflowId" element={<WorkflowDetail />} />
        <Route path="/workflows/:workflowId/simulate" element={<Simulation />} />
        <Route path="/builder" element={<WorkflowBuilder />} />
        <Route path="/builder/:workflowId" element={<WorkflowBuilder />} />
        <Route path="/executions/:executionId" element={<ExecutionDetail />} />
        <Route path="/metrics" element={<Metrics />} />
        <Route path="/plugins" element={<Plugins />} />
        <Route path="/events" element={<Events />} />
      </Route>
    </Routes>
  );
}
