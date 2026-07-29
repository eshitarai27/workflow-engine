import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProjectOverview from "./pages/ProjectOverview";
import Dashboard from "./pages/Dashboard";
import Workflows from "./pages/Workflows";
import WorkflowDetail from "./pages/WorkflowDetail";
import WorkflowBuilder from "./pages/WorkflowBuilder";
import Simulation from "./pages/Simulation";
import Executions from "./pages/Executions";
import ExecutionDetail from "./pages/ExecutionDetail";
import Metrics from "./pages/Metrics";
import Plugins from "./pages/Plugins";
import Events from "./pages/Events";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<ProjectOverview />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/workflows" element={<Workflows />} />
        <Route path="/workflows/:workflowId" element={<WorkflowDetail />} />
        <Route path="/workflows/:workflowId/simulate" element={<Simulation />} />
        <Route path="/builder" element={<WorkflowBuilder />} />
        <Route path="/builder/:workflowId" element={<WorkflowBuilder />} />
        <Route path="/executions" element={<Executions />} />
        <Route path="/executions/:executionId" element={<ExecutionDetail />} />
        <Route path="/metrics" element={<Metrics />} />
        <Route path="/plugins" element={<Plugins />} />
        <Route path="/events" element={<Events />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
