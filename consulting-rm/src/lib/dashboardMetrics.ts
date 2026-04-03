import type {
  AllocationCommitment,
  Assignment,
  AssignmentMode,
  DashboardFilters,
  Employee,
  Project,
  Scenario,
} from '../types'
import {
  assignmentHoursInWindow,
  plannedDemandHoursInWindow,
  roleCapacityHours,
} from './capacity'

function isDeliveryProject(p: Project): boolean {
  return (p.projectKind ?? 'delivery') === 'delivery'
}

export function filterProjects(
  projects: Project[],
  f: DashboardFilters
): Project[] {
  return projects.filter((p) => {
    if (f.projectStatus !== 'all' && p.status !== f.projectStatus)
      return false
    if (f.projectKind === 'delivery' && !isDeliveryProject(p)) return false
    if (f.projectKind === 'opportunity' && p.projectKind !== 'opportunity')
      return false
    if (f.skill !== 'all') {
      const sk = f.skill.toLowerCase()
      const needs = p.requiredSkills.some((s) => s.toLowerCase() === sk)
      if (!needs) return false
    }
    return true
  })
}

export function filterAssignments(
  assignments: Assignment[],
  employees: Employee[],
  projects: Project[],
  f: DashboardFilters,
  scenarioId: string
): Assignment[] {
  const projSet = new Set(
    filterProjects(projects, f).map((p) => p.id)
  )
  const emap = new Map(employees.map((e) => [e.id, e]))

  return assignments.filter((a) => {
    if (a.scenarioId !== scenarioId) return false
    if (!projSet.has(a.projectId)) return false
    const e = emap.get(a.employeeId)
    if (!e) return false
    if (f.role !== 'all') {
      const r = f.role.toLowerCase()
      const roleMatch =
        e.role.toLowerCase() === r ||
        (a.roleOnProject && a.roleOnProject.toLowerCase() === r)
      if (!roleMatch) return false
    }
    if (f.skill !== 'all') {
      const sk = f.skill.toLowerCase()
      if (!e.skills.some((s) => s.toLowerCase() === sk)) return false
    }
    if (f.discipline !== 'all') {
      const d = f.discipline.toLowerCase()
      if ((e.discipline ?? '').trim().toLowerCase() !== d) return false
    }
    return true
  })
}

export interface ProjectDemandRow {
  projectId: string
  name: string
  planned: number
  committed: number
  gap: number
}

export function projectDemandRows(
  projects: Project[],
  assignments: Assignment[],
  employees: Employee[],
  scenario: Scenario,
  f: DashboardFilters,
  scenarioId: string,
  defaultHoursPerWeek: number
): ProjectDemandRow[] {
  const projs = filterProjects(projects, f)
  const assigns = filterAssignments(
    assignments,
    employees,
    projects,
    f,
    scenarioId
  )
  const emap = new Map(employees.map((e) => [e.id, e]))
  const pmap = new Map(projects.map((p) => [p.id, p]))

  return projs.map((p) => {
    const planned = plannedDemandHoursInWindow(
      p,
      f.dateFrom,
      f.dateTo,
      scenario
    )
    const committed = assigns
      .filter((a) => a.projectId === p.id)
      .reduce((sum, a) => {
        const emp = emap.get(a.employeeId)
        const proj = pmap.get(a.projectId)
        if (!emp || !proj) return sum
        return (
          sum +
          assignmentHoursInWindow(
            a,
            proj,
            f.dateFrom,
            f.dateTo,
            defaultHoursPerWeek,
            scenario.committedHoursMultiplier
          )
        )
      }, 0)
    return {
      projectId: p.id,
      name: p.name,
      planned,
      committed,
      gap: planned - committed,
    }
  })
}

export interface RoleLoadRow {
  role: string
  capacity: number
  committed: number
  utilization: number
}

export function roleLoadRows(
  employees: Employee[],
  assignments: Assignment[],
  projects: Project[],
  scenario: Scenario,
  f: DashboardFilters,
  scenarioId: string,
  defaultHoursPerWeek: number
): RoleLoadRow[] {
  const assigns = filterAssignments(
    assignments,
    employees,
    projects,
    f,
    scenarioId
  )
  const pmap = new Map(projects.map((p) => [p.id, p]))
  const emap = new Map(employees.map((e) => [e.id, e]))

  const roles = new Set<string>()
  employees.forEach((e) => {
    if (e.role.trim()) roles.add(e.role.trim())
  })

  const committedByRole = new Map<string, number>()
  assigns.forEach((a) => {
    const e = emap.get(a.employeeId)
    const p = pmap.get(a.projectId)
    if (!e || !p) return
    const role = a.roleOnProject?.trim() || e.role.trim() || 'Unspecified'
    const hrs = assignmentHoursInWindow(
      a,
      p,
      f.dateFrom,
      f.dateTo,
      defaultHoursPerWeek,
      scenario.committedHoursMultiplier
    )
    committedByRole.set(role, (committedByRole.get(role) ?? 0) + hrs)
  })

  return [...roles].map((role) => {
    const capacity = roleCapacityHours(
      employees,
      role,
      f.dateFrom,
      f.dateTo,
      defaultHoursPerWeek
    )
    const committed = committedByRole.get(role) ?? 0
    return {
      role,
      capacity,
      committed,
      utilization: capacity > 0 ? committed / capacity : 0,
    }
  })
}

export function skillGapSummary(
  projects: Project[],
  employees: Employee[],
  assignments: Assignment[],
  f: DashboardFilters,
  scenarioId: string
): { skill: string; requiredOnProjects: number; holders: number }[] {
  const projs = filterProjects(projects, f)
  const assigns = filterAssignments(
    assignments,
    employees,
    projects,
    f,
    scenarioId
  )
  const covered = new Set<string>()
  assigns.forEach((a) => {
    covered.add(`${a.projectId}`)
  })

  const skillDemand = new Map<string, number>()
  projs.forEach((p) => {
    p.requiredSkills.forEach((sk) => {
      const k = sk.trim()
      if (!k) return
      skillDemand.set(k, (skillDemand.get(k) ?? 0) + 1)
    })
  })

  const skillHolders = new Map<string, number>()
  employees.forEach((e) => {
    e.skills.forEach((sk) => {
      const k = sk.trim()
      if (!k) return
      skillHolders.set(k, (skillHolders.get(k) ?? 0) + 1)
    })
  })

  const keys = new Set([...skillDemand.keys(), ...skillHolders.keys()])
  return [...keys]
    .sort()
    .map((skill) => ({
      skill,
      requiredOnProjects: skillDemand.get(skill) ?? 0,
      holders: skillHolders.get(skill) ?? 0,
    }))
}

export function totalsForScenario(
  projects: Project[],
  assignments: Assignment[],
  employees: Employee[],
  scenario: Scenario,
  f: DashboardFilters,
  scenarioId: string,
  defaultHoursPerWeek: number
): { planned: number; committed: number; gap: number } {
  const rows = projectDemandRows(
    projects,
    assignments,
    employees,
    scenario,
    f,
    scenarioId,
    defaultHoursPerWeek
  )
  const planned = rows.reduce((s, r) => s + r.planned, 0)
  const committed = rows.reduce((s, r) => s + r.committed, 0)
  return { planned, committed, gap: planned - committed }
}

/** Hours in filter window for filtered assignments (respects dashboard filters). */
export function utilizationMixInFilter(
  assignments: Assignment[],
  employees: Employee[],
  projects: Project[],
  scenario: Scenario,
  f: DashboardFilters,
  scenarioId: string,
  defaultHoursPerWeek: number
): {
  billableHours: number
  nonBillableHours: number
  hardHours: number
  softHours: number
} {
  const assigns = filterAssignments(
    assignments,
    employees,
    projects,
    f,
    scenarioId
  )
  const pmap = new Map(projects.map((p) => [p.id, p]))
  let billableHours = 0
  let nonBillableHours = 0
  let hardHours = 0
  let softHours = 0
  for (const a of assigns) {
    const p = pmap.get(a.projectId)
    if (!p) continue
    const hrs = assignmentHoursInWindow(
      a,
      p,
      f.dateFrom,
      f.dateTo,
      defaultHoursPerWeek,
      scenario.committedHoursMultiplier
    )
    if (hrs <= 0) continue
    if (a.billable !== false) billableHours += hrs
    else nonBillableHours += hrs
    if ((a.commitment ?? 'hard') === 'hard') hardHours += hrs
    else softHours += hrs
  }
  return { billableHours, nonBillableHours, hardHours, softHours }
}

export interface PortfolioMetrics {
  totalBudget: number
  deliveryPlanned: number
  opportunityPlanned: number
  staffingPct: number
  understaffedProjectCount: number
  overAllocatedRoleCount: number
  headcountInFilter: number
}

export function portfolioMetrics(
  projects: Project[],
  assignments: Assignment[],
  employees: Employee[],
  scenario: Scenario,
  f: DashboardFilters,
  scenarioId: string,
  defaultHoursPerWeek: number
): PortfolioMetrics {
  const projs = filterProjects(projects, f)
  const totalBudget = projs.reduce((s, p) => s + (p.budget ?? 0), 0)

  const deliveryProjs = projs.filter(
    (p) => (p.projectKind ?? 'delivery') === 'delivery'
  )
  const oppProjs = projs.filter((p) => p.projectKind === 'opportunity')

  const sumPlanned = (list: Project[]) =>
    list.reduce(
      (s, p) =>
        s +
        plannedDemandHoursInWindow(p, f.dateFrom, f.dateTo, scenario),
      0
    )

  const deliveryPlanned = sumPlanned(deliveryProjs)
  const opportunityPlanned = sumPlanned(oppProjs)

  const totals = totalsForScenario(
    projects,
    assignments,
    employees,
    scenario,
    f,
    scenarioId,
    defaultHoursPerWeek
  )
  const staffingPct =
    totals.planned > 0
      ? Math.min(1.5, totals.committed / totals.planned)
      : 0

  const rows = projectDemandRows(
    projects,
    assignments,
    employees,
    scenario,
    f,
    scenarioId,
    defaultHoursPerWeek
  )
  const understaffedProjectCount = rows.filter(
    (r) => r.planned > 1 && r.gap > 1
  ).length

  const roleRows = roleLoadRows(
    employees,
    assignments,
    projects,
    scenario,
    f,
    scenarioId,
    defaultHoursPerWeek
  )
  const overAllocatedRoleCount = roleRows.filter(
    (r) => r.capacity > 0 && r.committed > r.capacity * 1.02
  ).length

  const headcountInFilter = employees.filter((e) => {
    if (f.role !== 'all') {
      const r = f.role.toLowerCase()
      if (e.role.toLowerCase() !== r) return false
    }
    if (f.skill !== 'all') {
      const sk = f.skill.toLowerCase()
      if (!e.skills.some((s) => s.toLowerCase() === sk)) return false
    }
    if (f.discipline !== 'all') {
      if (
        (e.discipline ?? '').trim().toLowerCase() !==
        f.discipline.toLowerCase()
      )
        return false
    }
    return true
  }).length

  return {
    totalBudget,
    deliveryPlanned,
    opportunityPlanned,
    staffingPct,
    understaffedProjectCount,
    overAllocatedRoleCount,
    headcountInFilter,
  }
}

function formatAssignmentValue(mode: AssignmentMode, value: number): string {
  if (mode === 'hours_total')
    return `${Math.round(value).toLocaleString()} h (total)`
  if (mode === 'hours_per_week') return `${value} h/wk`
  return `${Math.round(value * 100)}% FTE`
}

export interface ProjectStaffRow {
  employeeId: string
  name: string
  employeeRole: string
  roleOnProject: string
  allocationSummary: string
  commitmentLabel: string
  billableLabel: string
  hoursInWindow: number
}

/** Staffing on one project in the dashboard window (respects global filters). */
export function projectStaffRows(
  projectId: string,
  projects: Project[],
  assignments: Assignment[],
  employees: Employee[],
  scenario: Scenario,
  f: DashboardFilters,
  scenarioId: string,
  defaultHoursPerWeek: number
): ProjectStaffRow[] {
  const proj = projects.find((p) => p.id === projectId)
  if (!proj) return []

  const assigns = filterAssignments(
    assignments,
    employees,
    projects,
    f,
    scenarioId
  ).filter((a) => a.projectId === projectId)

  const emap = new Map(employees.map((e) => [e.id, e]))
  type Agg = {
    rows: Assignment[]
    hours: number
    roles: Set<string>
  }
  const byEmp = new Map<string, Agg>()

  for (const a of assigns) {
    const e = emap.get(a.employeeId)
    if (!e) continue
    const hrs = assignmentHoursInWindow(
      a,
      proj,
      f.dateFrom,
      f.dateTo,
      defaultHoursPerWeek,
      scenario.committedHoursMultiplier
    )
    const cur = byEmp.get(a.employeeId) ?? {
      rows: [],
      hours: 0,
      roles: new Set<string>(),
    }
    cur.rows.push(a)
    cur.hours += hrs
    const r = (a.roleOnProject ?? e.role).trim()
    if (r) cur.roles.add(r)
    byEmp.set(a.employeeId, cur)
  }

  const rows: ProjectStaffRow[] = []
  for (const [employeeId, agg] of byEmp) {
    const e = emap.get(employeeId)
    if (!e) continue
    const { rows: alist } = agg
    const commitments = new Set(
      alist.map((a) => (a.commitment ?? 'hard') as AllocationCommitment)
    )
    const billables = new Set(alist.map((a) => a.billable !== false))
    let commitmentLabel: string
    if (commitments.size === 1)
      commitmentLabel = [...commitments][0] === 'hard' ? 'Hard' : 'Soft'
    else commitmentLabel = 'Hard + soft'

    let billableLabel: string
    if (billables.size === 1) billableLabel = [...billables][0] ? 'Yes' : 'No'
    else billableLabel = 'Mixed'

    let allocationSummary: string
    if (alist.length === 1) {
      const a0 = alist[0]
      allocationSummary = formatAssignmentValue(a0.mode, a0.value)
    } else {
      allocationSummary = `${alist.length} allocations`
    }

    rows.push({
      employeeId,
      name: e.name,
      employeeRole: e.role,
      roleOnProject: [...agg.roles].sort().join(', ') || '—',
      allocationSummary,
      commitmentLabel,
      billableLabel,
      hoursInWindow: agg.hours,
    })
  }

  return rows.sort((a, b) => b.hoursInWindow - a.hoursInWindow)
}
