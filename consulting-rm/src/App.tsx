import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { PeoplePage } from './pages/PeoplePage'
import { ProjectsPage } from './pages/ProjectsPage'
import { AssignmentsPage } from './pages/AssignmentsPage'
import { ScenariosPage } from './pages/ScenariosPage'
import { ImportPage } from './pages/ImportPage'
import { SettingsPage } from './pages/SettingsPage'
import { PlanningPage } from './pages/PlanningPage'
import { ActualsPage } from './pages/ActualsPage'
import { InstructionsPage } from './pages/InstructionsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="planning" element={<PlanningPage />} />
          <Route path="people" element={<PeoplePage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="assignments" element={<AssignmentsPage />} />
          <Route path="actuals" element={<ActualsPage />} />
          <Route path="scenarios" element={<ScenariosPage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="instructions" element={<InstructionsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
