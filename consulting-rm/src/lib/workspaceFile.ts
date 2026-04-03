/** File you email or Slack to teammates — opens the same plan & dashboards. */

export const WORKSPACE_FORMAT = 'consulting-rm-workspace' as const
export const WORKSPACE_VERSION = 1

export interface WorkspacePayload {
  employees: unknown
  projects: unknown
  assignments: unknown
  actualTimeEntries: unknown
  fictionalDemoBundle: unknown
  scenarios: unknown
  settings: unknown
  dashboardFilters: unknown
  activeScenarioId: unknown
  compareScenarioId: unknown
}

export interface WorkspaceEnvelope {
  format: typeof WORKSPACE_FORMAT
  version: number
  exportedAt: string
  /** Shown in filename and metadata */
  label?: string
  /** Optional context for recipients */
  notes?: string
  payload: WorkspacePayload
}

export function buildWorkspaceEnvelope(
  payload: WorkspacePayload,
  options?: { label?: string; notes?: string }
): WorkspaceEnvelope {
  return {
    format: WORKSPACE_FORMAT,
    version: WORKSPACE_VERSION,
    exportedAt: new Date().toISOString(),
    label: options?.label?.trim() || undefined,
    notes: options?.notes?.trim() || undefined,
    payload,
  }
}

export function safeFilenamePart(s: string): string {
  return s
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 48) || 'workspace'
}
