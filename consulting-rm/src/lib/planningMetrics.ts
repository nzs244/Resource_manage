import type {
  ActualTimeEntry,
  Assignment,
  Employee,
  Project,
  Scenario,
  AppSettings,
} from '../types'
import {
  assignmentHoursInWindow,
  plannedDemandHoursInWindow,
  plannedHoursInWindow,
  type AssignmentHourOpts,
} from './capacity'
import { bucketFteHours, type WeekBucket, weeksOverlappingRange } from './weekBuckets'
import { actualEntryHoursInWindow } from './actuals'
import {
  effectiveBillingRate,
  isPipelineProject,
  normalizeWinProbability,
} from './billing'

export function impliedHourlyRate(
  project: Project,
  fallbackBlended: number
): number {
  if (
    project.budget != null &&
    Number.isFinite(project.budget) &&
    project.plannedHours > 0
  )
    return project.budget / project.plannedHours
  return fallbackBlended > 0 ? fallbackBlended : 0
}

export function skillMatchPercent(employee: Employee, project: Project): number {
  const req = project.requiredSkills
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (req.length === 0) return 60
  const has = new Set(
    [
      ...employee.skills.map((s) => s.trim().toLowerCase()),
      ...(employee.certifications ?? []).map((s) => s.trim().toLowerCase()),
    ].filter(Boolean)
  )
  let hit = 0
  for (const r of req) if (has.has(r)) hit++
  return Math.round((hit / req.length) * 100)
}

export interface HeatmapCell {
  employeeId: string
  weekKey: string
  committed: number
  /** Logged actual hours (timesheet truth) */
  actual: number
  capacity: number
  /** Based on max(planned commitment, actual) vs capacity */
  utilization: number
}

export function buildUtilizationHeatmap(
  employees: Employee[],
  assignments: Assignment[],
  projects: Project[],
  scenario: Scenario,
  scenarioId: string,
  dateFrom: string,
  dateTo: string,
  hoursPerWeek: number,
  opts?: AssignmentHourOpts,
  actualEntries?: ActualTimeEntry[]
): { weeks: WeekBucket[]; cells: Map<string, HeatmapCell> } {
  const weeks = weeksOverlappingRange(dateFrom, dateTo)
  const pmap = new Map(projects.map((p) => [p.id, p]))
  const cells = new Map<string, HeatmapCell>()

  for (const e of employees) {
    for (const w of weeks) {
      const cap = bucketFteHours(w.start, w.end, hoursPerWeek)
      let committed = 0
      for (const a of assignments) {
        if (a.employeeId !== e.id || a.scenarioId !== scenarioId) continue
        const p = pmap.get(a.projectId)
        if (!p) continue
        committed += assignmentHoursInWindow(
          a,
          p,
          w.start,
          w.end,
          hoursPerWeek,
          scenario.committedHoursMultiplier,
          opts
        )
      }
      let actual = 0
      for (const ent of actualEntries ?? []) {
        if (ent.employeeId !== e.id) continue
        actual += actualEntryHoursInWindow(ent, w.start, w.end)
      }
      const stress = Math.max(committed, actual)
      const key = `${e.id}|${w.key}`
      cells.set(key, {
        employeeId: e.id,
        weekKey: w.key,
        committed,
        actual,
        capacity: cap,
        utilization: cap > 0 ? stress / cap : 0,
      })
    }
  }
  return { weeks, cells }
}

export interface DimHeatmapCell {
  rowKey: string
  weekKey: string
  committed: number
  actual: number
  capacity: number
  utilization: number
}

function employeeCommittedInWeek(
  employeeId: string,
  w: { start: string; end: string },
  assignments: Assignment[],
  scenario: Scenario,
  scenarioId: string,
  hoursPerWeek: number,
  pmap: Map<string, Project>,
  opts?: AssignmentHourOpts
): number {
  let committed = 0
  for (const a of assignments) {
    if (a.employeeId !== employeeId || a.scenarioId !== scenarioId) continue
    const p = pmap.get(a.projectId)
    if (!p) continue
    committed += assignmentHoursInWindow(
      a,
      p,
      w.start,
      w.end,
      hoursPerWeek,
      scenario.committedHoursMultiplier,
      opts
    )
  }
  return committed
}

/** Utilization rolled up by job role (one row per distinct role string). */
export function buildRoleUtilizationHeatmap(
  employees: Employee[],
  assignments: Assignment[],
  projects: Project[],
  scenario: Scenario,
  scenarioId: string,
  dateFrom: string,
  dateTo: string,
  hoursPerWeek: number,
  opts?: AssignmentHourOpts,
  actualEntries?: ActualTimeEntry[]
): { weeks: WeekBucket[]; rowKeys: string[]; cells: Map<string, DimHeatmapCell> } {
  const weeks = weeksOverlappingRange(dateFrom, dateTo)
  const pmap = new Map(projects.map((p) => [p.id, p]))
  const roleToEmployees = new Map<string, Employee[]>()
  for (const e of employees) {
    const r = e.role.trim() || 'Unspecified'
    if (!roleToEmployees.has(r)) roleToEmployees.set(r, [])
    roleToEmployees.get(r)!.push(e)
  }
  const rowKeys = [...roleToEmployees.keys()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  )
  const cells = new Map<string, DimHeatmapCell>()
  for (const role of rowKeys) {
    const emps = roleToEmployees.get(role) ?? []
    for (const w of weeks) {
      let committed = 0
      let actual = 0
      let capacity = 0
      for (const e of emps) {
        capacity += bucketFteHours(w.start, w.end, hoursPerWeek)
        committed += employeeCommittedInWeek(
          e.id,
          w,
          assignments,
          scenario,
          scenarioId,
          hoursPerWeek,
          pmap,
          opts
        )
        for (const ent of actualEntries ?? []) {
          if (ent.employeeId !== e.id) continue
          actual += actualEntryHoursInWindow(ent, w.start, w.end)
        }
      }
      const stress = Math.max(committed, actual)
      cells.set(`${role}|${w.key}`, {
        rowKey: role,
        weekKey: w.key,
        committed,
        actual,
        capacity,
        utilization: capacity > 0 ? stress / capacity : 0,
      })
    }
  }
  return { weeks, rowKeys, cells }
}

/** Utilization by skill/cert tag — people count toward every skill they hold (overlap expected). */
export function buildSkillUtilizationHeatmap(
  employees: Employee[],
  assignments: Assignment[],
  projects: Project[],
  scenario: Scenario,
  scenarioId: string,
  dateFrom: string,
  dateTo: string,
  hoursPerWeek: number,
  opts?: AssignmentHourOpts,
  actualEntries?: ActualTimeEntry[]
): { weeks: WeekBucket[]; rowKeys: string[]; cells: Map<string, DimHeatmapCell> } {
  const weeks = weeksOverlappingRange(dateFrom, dateTo)
  const pmap = new Map(projects.map((p) => [p.id, p]))
  const skillToEmployees = new Map<string, Employee[]>()
  for (const e of employees) {
    const tags = new Set<string>()
    for (const s of e.skills) {
      const t = s.trim()
      if (t) tags.add(t)
    }
    for (const c of e.certifications ?? []) {
      const t = c.trim()
      if (t) tags.add(t)
    }
    if (tags.size === 0) tags.add('(no skills listed)')
    for (const sk of tags) {
      if (!skillToEmployees.has(sk)) skillToEmployees.set(sk, [])
      skillToEmployees.get(sk)!.push(e)
    }
  }
  const rowKeys = [...skillToEmployees.keys()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  )
  const cells = new Map<string, DimHeatmapCell>()
  for (const sk of rowKeys) {
    const emps = skillToEmployees.get(sk) ?? []
    for (const w of weeks) {
      let committed = 0
      let actual = 0
      let capacity = 0
      for (const e of emps) {
        capacity += bucketFteHours(w.start, w.end, hoursPerWeek)
        committed += employeeCommittedInWeek(
          e.id,
          w,
          assignments,
          scenario,
          scenarioId,
          hoursPerWeek,
          pmap,
          opts
        )
        for (const ent of actualEntries ?? []) {
          if (ent.employeeId !== e.id) continue
          actual += actualEntryHoursInWindow(ent, w.start, w.end)
        }
      }
      const stress = Math.max(committed, actual)
      cells.set(`${sk}|${w.key}`, {
        rowKey: sk,
        weekKey: w.key,
        committed,
        actual,
        capacity,
        utilization: capacity > 0 ? stress / capacity : 0,
      })
    }
  }
  return { weeks, rowKeys, cells }
}

export interface WeeklyDemandRow {
  label: string
  /** Scenario-adjusted planned demand (pipeline mode + multipliers) */
  demandHours: number
  /** Full nominal planned hours (ignores pipeline mode) */
  nominalDemandHours: number
  /** Pipeline planned hours × win probability (per project) */
  weightedDemandHours: number
  capacityHours: number
  committedHours: number
  billableCommitted: number
  actualHours: number
  actualBillableHours: number
  /** Billable actual × person billing rate (k$) */
  actualRevenueK: number
  /** Forecast from billable committed × person rate (k$) — uses assignment owner */
  forecastRevenueK: number
}

export function weeklyDemandVsCapacity(
  employees: Employee[],
  projects: Project[],
  assignments: Assignment[],
  scenario: Scenario,
  scenarioId: string,
  dateFrom: string,
  dateTo: string,
  hoursPerWeek: number,
  commitment: 'all' | 'hard' | 'soft',
  actualEntries: ActualTimeEntry[] | undefined,
  settings: AppSettings
): WeeklyDemandRow[] {
  const weeks = weeksOverlappingRange(dateFrom, dateTo)
  const pmap = new Map(projects.map((p) => [p.id, p]))
  const emap = new Map(employees.map((x) => [x.id, x]))
  const opt: AssignmentHourOpts | undefined =
    commitment === 'all' ? undefined : { commitment }

  return weeks.map((w) => {
    let demandHours = 0
    let nominalDemandHours = 0
    let weightedDemandHours = 0
    for (const p of projects) {
      const ph = plannedHoursInWindow(p, w.start, w.end, scenario)
      nominalDemandHours += ph
      demandHours += plannedDemandHoursInWindow(p, w.start, w.end, scenario)
      const prob = isPipelineProject(p)
        ? normalizeWinProbability(p.winProbability)
        : 1
      weightedDemandHours += ph * prob
    }
    const capacityHours = employees.reduce(
      (s, _) => s + bucketFteHours(w.start, w.end, hoursPerWeek),
      0
    )
    let committedHours = 0
    let billableCommitted = 0
    let forecastRevenueK = 0
    for (const a of assignments) {
      if (a.scenarioId !== scenarioId) continue
      const p = pmap.get(a.projectId)
      if (!p) continue
      const hrs = assignmentHoursInWindow(
        a,
        p,
        w.start,
        w.end,
        hoursPerWeek,
        scenario.committedHoursMultiplier,
        opt
      )
      committedHours += hrs
      if (a.billable !== false) {
        billableCommitted += hrs
        const emp = emap.get(a.employeeId)
        if (emp)
          forecastRevenueK +=
            (hrs * effectiveBillingRate(emp, settings)) / 1000
      }
    }
    let actualHours = 0
    let actualBillableHours = 0
    let actualRevenueK = 0
    for (const ent of actualEntries ?? []) {
      const h = actualEntryHoursInWindow(ent, w.start, w.end)
      actualHours += h
      if (ent.billable !== false) {
        actualBillableHours += h
        const emp = emap.get(ent.employeeId)
        if (emp)
          actualRevenueK += (h * effectiveBillingRate(emp, settings)) / 1000
      }
    }
    return {
      label: w.label,
      demandHours,
      nominalDemandHours,
      weightedDemandHours,
      capacityHours,
      committedHours,
      billableCommitted,
      actualHours,
      actualBillableHours,
      actualRevenueK,
      forecastRevenueK,
    }
  })
}

export interface ClientHoursRow {
  employeeId: string
  employeeName: string
  client: string
  hours: number
}

export function hoursByEmployeeClient(
  employees: Employee[],
  assignments: Assignment[],
  projects: Project[],
  scenario: Scenario,
  scenarioId: string,
  dateFrom: string,
  dateTo: string,
  hoursPerWeek: number,
  opts?: AssignmentHourOpts
): ClientHoursRow[] {
  const pmap = new Map(projects.map((p) => [p.id, p]))
  const emap = new Map(employees.map((e) => [e.id, e]))
  const agg = new Map<string, number>()

  for (const a of assignments) {
    if (a.scenarioId !== scenarioId) continue
    const p = pmap.get(a.projectId)
    const e = emap.get(a.employeeId)
    if (!p || !e) continue
    const hrs = assignmentHoursInWindow(
      a,
      p,
      dateFrom,
      dateTo,
      hoursPerWeek,
      scenario.committedHoursMultiplier,
      opts
    )
    if (hrs <= 0) continue
    const client = (p.client?.trim() || 'Unassigned client')
    const key = `${a.employeeId}\t${client}`
    agg.set(key, (agg.get(key) ?? 0) + hrs)
  }

  const rows: ClientHoursRow[] = []
  for (const [key, hours] of agg) {
    const [employeeId, client] = key.split('\t')
    const employeeName = emap.get(employeeId)?.name ?? employeeId
    rows.push({ employeeId, employeeName, client, hours })
  }
  return rows.sort((a, b) => b.hours - a.hours)
}

export function committedBillableSplit(
  assignments: Assignment[],
  projects: Project[],
  scenario: Scenario,
  scenarioId: string,
  dateFrom: string,
  dateTo: string,
  hoursPerWeek: number
): { billable: number; nonBillable: number } {
  const pmap = new Map(projects.map((p) => [p.id, p]))
  let billable = 0
  let nonBillable = 0
  for (const a of assignments) {
    if (a.scenarioId !== scenarioId) continue
    const p = pmap.get(a.projectId)
    if (!p) continue
    const hrs = assignmentHoursInWindow(
      a,
      p,
      dateFrom,
      dateTo,
      hoursPerWeek,
      scenario.committedHoursMultiplier
    )
    if (hrs <= 0) continue
    if (a.billable !== false) billable += hrs
    else nonBillable += hrs
  }
  return { billable, nonBillable }
}

export interface BudgetVsRow {
  projectId: string
  name: string
  client?: string
  budget?: number
  committedHours: number
  estCost: number
  variance: number
  actualHours: number
  actualRevenue: number
}

export function budgetVsEstimated(
  projects: Project[],
  assignments: Assignment[],
  scenario: Scenario,
  scenarioId: string,
  dateFrom: string,
  dateTo: string,
  hoursPerWeek: number,
  blendedRate: number,
  actualEntries: ActualTimeEntry[] | undefined,
  employees: Employee[],
  settings: AppSettings
): BudgetVsRow[] {
  const pmap = new Map(projects.map((p) => [p.id, p]))
  const emap = new Map(employees.map((e) => [e.id, e]))
  return projects.map((p) => {
    let committedHours = 0
    for (const a of assignments) {
      if (a.projectId !== p.id || a.scenarioId !== scenarioId) continue
      const proj = pmap.get(a.projectId)
      if (!proj) continue
      committedHours += assignmentHoursInWindow(
        a,
        proj,
        dateFrom,
        dateTo,
        hoursPerWeek,
        scenario.committedHoursMultiplier
      )
    }
    const rate = impliedHourlyRate(p, blendedRate)
    const estCost = committedHours * rate
    const budget = p.budget
    const variance =
      budget != null && Number.isFinite(budget) ? budget - estCost : 0

    let actualHours = 0
    let actualRevenue = 0
    for (const ent of actualEntries ?? []) {
      if (ent.projectId !== p.id) continue
      const h = actualEntryHoursInWindow(ent, dateFrom, dateTo)
      actualHours += h
      if (ent.billable !== false) {
        const emp = emap.get(ent.employeeId)
        if (emp) actualRevenue += h * effectiveBillingRate(emp, settings)
      }
    }

    return {
      projectId: p.id,
      name: p.name,
      client: p.client,
      budget,
      committedHours,
      estCost,
      variance,
      actualHours,
      actualRevenue,
    }
  })
}
