// src/pages/Workflows.jsx
// Standalone Workflows module — the visual workflow builder is general-purpose
// (documents, decisions, installs, maintenance, etc.), so it lives at the top
// level rather than inside Documents.
import { useAuth } from '../contexts/AuthContext'
import WorkflowsTab from '../components/edoc/WorkflowsTab'

export default function Workflows() {
  const { user } = useAuth()
  return (
    <div className="h-full flex flex-col">
      <WorkflowsTab userId={user?.id} />
    </div>
  )
}
