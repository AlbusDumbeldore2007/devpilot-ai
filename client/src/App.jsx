import { Routes, Route } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Projects from './pages/Projects.jsx';
import ProjectDetails from './pages/ProjectDetails.jsx';
import Tasks from './pages/Tasks.jsx';
import AIPlanner from './pages/AIPlanner.jsx';
import Assistant from './pages/Assistant.jsx';
import JsLab from './pages/JsLab.jsx';
import NotFound from './pages/NotFound.jsx';

/** Client-side routing — every page is a real route (React Router DOM). */
export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetails />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/ai-planner" element={<AIPlanner />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/lab" element={<JsLab />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
