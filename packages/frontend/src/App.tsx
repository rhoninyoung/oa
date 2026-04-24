import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import IterationDetailPage from './pages/IterationDetailPage.jsx';
import SchedulePage from './pages/SchedulePage.jsx';
import MasterPage from './pages/MasterPage/MasterPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<ProjectsPage />} />
        <Route path="/iterations/:iterationId" element={<IterationDetailPage />} />
        <Route path="/iterations/:iterationId/schedules/:groupId" element={<SchedulePage />} />
        <Route path="/iterations/:iterationId/master" element={<MasterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
