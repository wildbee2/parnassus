import { Routes, Route, Navigate } from 'react-router-dom';
import { GeneratePage } from '../pages/GeneratePage';
import { EvaluatePage } from '../pages/EvaluatePage';
import { RulesPage } from '../pages/RulesPage';
import { SettingsPage } from '../pages/SettingsPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/playback" replace />} />
      <Route path="/playback" element={<GeneratePage />} />
      <Route path="/generate" element={<Navigate to="/playback" replace />} />
      <Route path="/evaluate" element={<EvaluatePage />} />
      <Route path="/rules" element={<RulesPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/examples" element={<Navigate to="/playback" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
