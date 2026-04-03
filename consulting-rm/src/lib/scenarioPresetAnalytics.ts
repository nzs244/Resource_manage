import type {
  DashboardFilters,
  Employee,
  Project,
  Scenario,
  Assignment,
} from '../types'
import type { StandardScenarioPreset } from './standardScenarios'
import { STANDARD_SCENARIO_PRESETS } from './standardScenarios'
import {
  portfolioMetrics,
  totalsForScenario,
} from './dashboardMetrics'

/** In-memory scenario shape for analytics only — not persisted. */
export function syntheticScenarioFromPreset(
  preset: StandardScenarioPreset
): Scenario {
  const cfg = STANDARD_SCENARIO_PRESETS[preset]
  return {
    id: `__preset_${preset}`,
    name: cfg.name,
    description: cfg.description,
    plannedHoursMultiplier: cfg.plannedHoursMultiplier,
    committedHoursMultiplier: cfg.committedHoursMultiplier,
    pipelineDemandMode: cfg.pipelineDemandMode,
    isBaseline: false,
  }
}

export interface PresetAnalyticsRow {
  preset: StandardScenarioPreset
  label: string
  scenario: Scenario
  totals: { planned: number; committed: number; gap: number }
  staffingPct: number
  deliveryPlanned: number
  opportunityPlanned: number
  understaffedProjectCount: number
}

export function analyticsForAllPresets(
  projects: Project[],
  assignments: Assignment[],
  employees: Employee[],
  f: DashboardFilters,
  baselineScenarioId: string,
  defaultHoursPerWeek: number,
  presetLabels: { id: StandardScenarioPreset; label: string }[]
): PresetAnalyticsRow[] {
  return presetLabels.map(({ id, label }) => {
    const scenario = syntheticScenarioFromPreset(id)
    const totals = totalsForScenario(
      projects,
      assignments,
      employees,
      scenario,
      f,
      baselineScenarioId,
      defaultHoursPerWeek
    )
    const port = portfolioMetrics(
      projects,
      assignments,
      employees,
      scenario,
      f,
      baselineScenarioId,
      defaultHoursPerWeek
    )
    const staffingPct =
      totals.planned > 0
        ? Math.min(1.5, totals.committed / totals.planned)
        : 0
    return {
      preset: id,
      label,
      scenario,
      totals,
      staffingPct,
      deliveryPlanned: port.deliveryPlanned,
      opportunityPlanned: port.opportunityPlanned,
      understaffedProjectCount: port.understaffedProjectCount,
    }
  })
}
