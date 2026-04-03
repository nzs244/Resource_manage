import type { Assignment, Employee, Project, Scenario } from '../types'
import { isPipelineProject, normalizeWinProbability } from './billing'
import { overlapDays, overlapWeeks, projectDurationDays } from './dates'

export type AssignmentHourOpts = {
  commitment?: 'all' | 'hard' | 'soft'
  billability?: 'all' | 'billable' | 'non_billable'
}

export function assignmentMatchesFilter(
  assignment: Assignment,
  opts?: AssignmentHourOpts
): boolean {
  if (!opts) return true
  const comm = assignment.commitment ?? 'hard'
  if (opts.commitment && opts.commitment !== 'all' && comm !== opts.commitment)
    return false
  const bill = assignment.billable !== false
  if (opts.billability === 'billable' && !bill) return false
  if (opts.billability === 'non_billable' && bill) return false
  return true
}

export function assignmentHoursInWindow(
  assignment: Assignment,
  project: Project,
  filterStart: string,
  filterEnd: string,
  defaultHoursPerWeek: number,
  committedMultiplier: number,
  opts?: AssignmentHourOpts
): number {
  if (!assignmentMatchesFilter(assignment, opts)) return 0
  const overlap = overlapDays(
    project.startDate,
    project.endDate,
    filterStart,
    filterEnd
  )
  if (overlap <= 0) return 0

  const projDays = projectDurationDays(project.startDate, project.endDate)
  const frac = overlap / projDays

  let raw = 0
  switch (assignment.mode) {
    case 'hours_total':
      raw = assignment.value * frac
      break
    case 'hours_per_week': {
      const weeks = overlapWeeks(
        project.startDate,
        project.endDate,
        filterStart,
        filterEnd
      )
      raw = assignment.value * weeks
      break
    }
    case 'percent_fte': {
      const weeks = overlapWeeks(
        project.startDate,
        project.endDate,
        filterStart,
        filterEnd
      )
      raw = assignment.value * defaultHoursPerWeek * weeks
      break
    }
    default:
      raw = 0
  }

  return raw * committedMultiplier
}

export function plannedHoursInWindow(
  project: Project,
  filterStart: string,
  filterEnd: string,
  scenario: Scenario
): number {
  const overlap = overlapDays(
    project.startDate,
    project.endDate,
    filterStart,
    filterEnd
  )
  if (overlap <= 0) return 0
  const projDays = projectDurationDays(project.startDate, project.endDate)
  const frac = overlap / projDays
  return project.plannedHours * frac * scenario.plannedHoursMultiplier
}

/** Planned demand hours for charts — applies scenario pipeline treatment to pursuits. */
export function plannedDemandHoursInWindow(
  project: Project,
  filterStart: string,
  filterEnd: string,
  scenario: Scenario
): number {
  const base = plannedHoursInWindow(project, filterStart, filterEnd, scenario)
  if (!isPipelineProject(project)) return base
  const mode = scenario.pipelineDemandMode ?? 'nominal'
  const prob = normalizeWinProbability(project.winProbability)
  switch (mode) {
    case 'nominal':
      return base
    case 'probability_weighted':
      return base * prob
    case 'exclude_pipeline':
      return 0
    case 'optimistic_pipeline':
      return base * Math.min(1, prob + (1 - prob) * 0.4)
    case 'pessimistic_pipeline':
      return base * prob * 0.5
    default:
      return base
  }
}

export function committedHoursForProject(
  projectId: string,
  assignments: Assignment[],
  projects: Project[],
  scenarioId: string,
  filterStart: string,
  filterEnd: string,
  defaultHoursPerWeek: number,
  scenario: Scenario
): number {
  const pmap = new Map(projects.map((p) => [p.id, p]))
  return assignments
    .filter((a) => a.projectId === projectId && a.scenarioId === scenarioId)
    .reduce((sum, a) => {
      const p = pmap.get(a.projectId)
      if (!p) return sum
      return (
        sum +
        assignmentHoursInWindow(
          a,
          p,
          filterStart,
          filterEnd,
          defaultHoursPerWeek,
          scenario.committedHoursMultiplier,
          undefined
        )
      )
    }, 0)
}

export function roleCapacityHours(
  employees: Employee[],
  role: string,
  filterStart: string,
  filterEnd: string,
  defaultHoursPerWeek: number
): number {
  const count = employees.filter(
    (e) => e.role.toLowerCase() === role.toLowerCase()
  ).length
  const days = overlapDays(filterStart, filterEnd, filterStart, filterEnd)
  if (days <= 0) return 0
  const weeks = Math.max(1, Math.ceil(days / 7))
  return count * defaultHoursPerWeek * weeks
}

export function uniqueRoles(employees: Employee[]): string[] {
  const s = new Set(employees.map((e) => e.role.trim()).filter(Boolean))
  return [...s].sort((a, b) => a.localeCompare(b))
}

export function allSkills(
  employees: Employee[],
  projects: Project[]
): string[] {
  const set = new Set<string>()
  employees.forEach((e) => e.skills.forEach((sk) => set.add(sk.trim())))
  projects.forEach((p) => p.requiredSkills.forEach((sk) => set.add(sk.trim())))
  return [...set].filter(Boolean).sort((a, b) => a.localeCompare(b))
}

export function allDisciplines(employees: Employee[]): string[] {
  const set = new Set<string>()
  employees.forEach((e) => {
    const d = e.discipline?.trim()
    if (d) set.add(d)
  })
  return [...set].sort((a, b) => a.localeCompare(b))
}
