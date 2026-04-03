import type { AppSettings, Employee, Project } from '../types'

export function effectiveBillingRate(
  employee: Employee,
  settings: AppSettings
): number {
  if (
    employee.billingRate != null &&
    Number.isFinite(employee.billingRate) &&
    employee.billingRate > 0
  )
    return employee.billingRate
  if (
    settings.defaultBillingRate != null &&
    Number.isFinite(settings.defaultBillingRate) &&
    settings.defaultBillingRate > 0
  )
    return settings.defaultBillingRate
  if (
    settings.blendedHourlyRate != null &&
    Number.isFinite(settings.blendedHourlyRate) &&
    settings.blendedHourlyRate > 0
  )
    return settings.blendedHourlyRate
  return 0
}

/** Win probability stored as 0–1; accepts legacy 0–100. */
export function normalizeWinProbability(raw: number | undefined): number {
  if (raw == null || !Number.isFinite(raw)) return 0
  if (raw > 1) return Math.min(1, raw / 100)
  return Math.max(0, Math.min(1, raw))
}

export function isPipelineProject(p: Project): boolean {
  return p.status === 'pipeline' || p.projectKind === 'opportunity'
}

export function pipelineExpectedBudget(projects: Project[]): {
  pipelineCount: number
  grossBudget: number
  weightedBudget: number
} {
  let pipelineCount = 0
  let grossBudget = 0
  let weightedBudget = 0
  for (const p of projects) {
    if (!isPipelineProject(p)) continue
    pipelineCount++
    const b = p.budget != null && Number.isFinite(p.budget) ? p.budget : 0
    grossBudget += b
    const prob = normalizeWinProbability(p.winProbability)
    weightedBudget += b * prob
  }
  return { pipelineCount, grossBudget, weightedBudget }
}
