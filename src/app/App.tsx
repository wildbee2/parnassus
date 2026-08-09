import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from '../pages/LandingPage';
import { GeneratePage } from '../pages/GeneratePage';
import { EvaluatePage } from '../pages/EvaluatePage';
import { ExamplesPage } from '../pages/ExamplesPage';
import { RulesPage } from '../pages/RulesPage';
import { SettingsPage } from '../pages/SettingsPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/generate" element={<GeneratePage />} />
      <Route path="/evaluate" element={<EvaluatePage />} />
      <Route path="/examples" element={<ExamplesPage />} />
      <Route path="/rules" element={<RulesPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

