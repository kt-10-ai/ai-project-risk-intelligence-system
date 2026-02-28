import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.tsx';
import { RiskProvider } from './context/RiskContext.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';

import LoginPage from './pages/LoginPage.tsx';
import SignupPage from './pages/SignupPage.tsx';
import InitPage from './pages/InitPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import AgentsPage from './pages/AgentsPage.tsx';
import DependencyPage from './pages/DependencyPage.tsx';
import DelayPage from './pages/DelayPage.tsx';
import WorkloadPage from './pages/WorkloadPage.tsx';
import ScopePage from './pages/ScopePage.tsx';
import CommsPage from './pages/CommsPage.tsx';
import SignalsPage from './pages/SignalsPage.tsx';
import SimulationPage from './pages/SimulationPage.tsx';
import ReportPage from './pages/ReportPage.tsx';

function Protected({ element }: { element: React.ReactNode }) {
  return <ProtectedRoute>{element}</ProtectedRoute>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RiskProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/init" element={<Protected element={<InitPage />} />} />
            <Route path="/dashboard" element={<Protected element={<DashboardPage />} />} />
            <Route path="/agents" element={<Protected element={<AgentsPage />} />} />
            <Route path="/dependency" element={<Protected element={<DependencyPage />} />} />
            <Route path="/delay" element={<Protected element={<DelayPage />} />} />
            <Route path="/workload" element={<Protected element={<WorkloadPage />} />} />
            <Route path="/scope" element={<Protected element={<ScopePage />} />} />
            <Route path="/comms" element={<Protected element={<CommsPage />} />} />
            <Route path="/signals" element={<Protected element={<SignalsPage />} />} />
            <Route path="/simulation" element={<Protected element={<SimulationPage />} />} />
            <Route path="/report" element={<Protected element={<ReportPage />} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </RiskProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
