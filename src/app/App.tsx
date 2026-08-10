import { Routes, Route, Navigate } from 'react-router-dom';
import { GeneratePage } from '../pages/GeneratePage';
import { EvaluatePage } from '../pages/EvaluatePage';
import { RulesPage } from '../pages/RulesPage';
import { SettingsPage } from '../pages/SettingsPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/generate" replace />} />
      <Route path="/generate" element={<GeneratePage />} />
      <Route path="/evaluate" element={<EvaluatePage />} />
      <Route path="/rules" element={<RulesPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
