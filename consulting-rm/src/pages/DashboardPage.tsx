import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAppStore } from '../store/useAppStore'
import {
  filterProjects,
  portfolioMetrics,
  projectDemandRows,
  projectStaffRows,
  roleLoadRows,
  skillGapSummary,
  totalsForScenario,
  utilizationMixInFilter,
} from '../lib/dashboardMetrics'
import { pipelineExpectedBudget } from '../lib/billing'
import {
  actualRevenueInWindow,
  sumActualHoursInWindow,
} from '../lib/actuals'
import { Card, Input, Label, Select } from '../components/ui'
import type {
  ActualTimeEntry,
  DashboardFilters,
  DashboardProjectKindFilter,
  Employee,
  Project,
  ProjectStatus,
} from '../types'
import { allDisciplines, allSkills, uniqueRoles } from '../lib/capacity'

function actualEntriesMatchingFilters(
  entries: ActualTimeEntry[],
  employees: Employee[],
  projects: Project[],
  f: DashboardFilters
): ActualTimeEntry[] {
  const projs = filterProjects(projects, f)
  const pset = new Set(projs.map((p) => p.id))
  const emap = new Map(employees.map((e) => [e.id, e]))
  return entries.filter((ent) => {
    if (!pset.has(ent.projectId)) return false
    const e = emap.get(ent.employeeId)
    if (!e) return false
    if (f.role !== 'all' && e.role.toLowerCase() !== f.role.toLowerCase())
      return false
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

const COLORS = {
  planned: '#8b5cf6',
  assigned: '#10b981',
  gap: '#f59e0b',
  capacity: '#94a3b8',
  committed: '#6366f1',
  delivery: '#6366f1',
  opportunity: '#c084fc',
}

function fmtHours(n: number) {
  return `${Math.round(n).toLocaleString()} h`
}

function fmtCurrency(n: number) {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}k`
  return `$${Math.round(n).toLocaleString()}`
}

function tipHours(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return fmtHours(value)
  const n = Number(value)
  return Number.isFinite(n) ? fmtHours(n) : String(value ?? '')
}

const tipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.92)',
  border: 'none',
  borderRadius: '12px',
  fontSize: '12px',
}

export function DashboardPage() {
  const {
    employees,
    projects,
    assignments,
    actualTimeEntries,
    scenarios,
    activeScenarioId,
    compareScenarioId,
    settings,
    dashboardFilters,
    setDashboardFilters,
  } = useAppStore()

  const scenario = scenarios.find((s) => s.id === activeScenarioId)
  const compareScenario = compareScenarioId
    ? scenarios.find((s) => s.id === compareScenarioId)
    : null

  const f = dashboardFilters
  const roles = useMemo(() => ['all', ...uniqueRoles(employees)], [employees])
  const skills = useMemo(
    () => ['all', ...allSkills(employees, projects)],
    [employees, projects]
  )
  const disciplines = useMemo(
    () => ['all', ...allDisciplines(employees)],
    [employees]
  )

  const filteredProjectList = useMemo(
    () =>
      filterProjects(projects, f)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [projects, f]
  )

  const [spotlightProjectId, setSpotlightProjectId] = useState('')

  const spotlightStaff = useMemo(() => {
    if (!spotlightProjectId || !scenario) return []
    return projectStaffRows(
      spotlightProjectId,
      projects,
      assignments,
      employees,
      scenario,
      f,
      activeScenarioId,
      settings.defaultHoursPerWeek
    )
  }, [
    spotlightProjectId,
    scenario,
    projects,
    assignments,
    employees,
    f,
    activeScenarioId,
    settings.defaultHoursPerWeek,
  ])

  const spotlightBarData = useMemo(
    () =>
      spotlightStaff.map((r) => ({
        label: r.name.length > 24 ? `${r.name.slice(0, 22)}…` : r.name,
        hours: r.hoursInWindow,
      })),
    [spotlightStaff]
  )

  useEffect(() => {
    if (
      spotlightProjectId &&
      !filteredProjectList.some((p) => p.id === spotlightProjectId)
    ) {
      setSpotlightProjectId('')
    }
  }, [spotlightProjectId, filteredProjectList])

  const primaryTotals = useMemo(() => {
    if (!scenario) return { planned: 0, committed: 0, gap: 0 }
    return totalsForScenario(
      projects,
      assignments,
      employees,
      scenario,
      f,
      activeScenarioId,
      settings.defaultHoursPerWeek
    )
  }, [
    scenario,
    projects,
    assignments,
    employees,
    f,
    activeScenarioId,
    settings.defaultHoursPerWeek,
  ])

  const compareTotals = useMemo(() => {
    if (!compareScenario || !compareScenarioId) return null
    return totalsForScenario(
      projects,
      assignments,
      employees,
      compareScenario,
      f,
      compareScenarioId,
      settings.defaultHoursPerWeek
    )
  }, [
    compareScenario,
    compareScenarioId,
    projects,
    assignments,
    employees,
    f,
    settings.defaultHoursPerWeek,
  ])

  const portfolio = useMemo(() => {
    if (!scenario) return null
    return portfolioMetrics(
      projects,
      assignments,
      employees,
      scenario,
      f,
      activeScenarioId,
      settings.defaultHoursPerWeek
    )
  }, [
    scenario,
    projects,
    assignments,
    employees,
    f,
    activeScenarioId,
    settings.defaultHoursPerWeek,
  ])

  const utilMix = useMemo(() => {
    if (!scenario) return null
    return utilizationMixInFilter(
      assignments,
      employees,
      projects,
      scenario,
      f,
      activeScenarioId,
      settings.defaultHoursPerWeek
    )
  }, [
    scenario,
    assignments,
    employees,
    projects,
    f,
    activeScenarioId,
    settings.defaultHoursPerWeek,
  ])

  const projectRows = useMemo(() => {
    if (!scenario) return []
    return projectDemandRows(
      projects,
      assignments,
      employees,
      scenario,
      f,
      activeScenarioId,
      settings.defaultHoursPerWeek
    ).filter((r) => r.planned > 0 || r.committed > 0)
  }, [
    scenario,
    projects,
    assignments,
    employees,
    f,
    activeScenarioId,
    settings.defaultHoursPerWeek,
  ])

  const projectStackData = useMemo(() => {
    return [...projectRows]
      .sort((a, b) => b.planned - a.planned)
      .slice(0, 12)
      .map((r) => ({
        name:
          r.name.length > 22 ? `${r.name.slice(0, 20)}…` : r.name,
        Assigned: Math.round(Math.min(r.committed, r.planned)),
        Gap: Math.round(Math.max(0, r.gap)),
        plannedRaw: r.planned,
      }))
  }, [projectRows])

  const projectHorizData = useMemo(() => {
    return [...projectRows]
      .sort((a, b) => b.planned + b.committed - (a.planned + a.committed))
      .slice(0, 10)
      .map((r) => ({
        label:
          r.name.length > 28 ? `${r.name.slice(0, 26)}…` : r.name,
        Planned: Math.round(r.planned),
        Committed: Math.round(r.committed),
      }))
  }, [projectRows])

  const roleRows = useMemo(() => {
    if (!scenario) return []
    return roleLoadRows(
      employees,
      assignments,
      projects,
      scenario,
      f,
      activeScenarioId,
      settings.defaultHoursPerWeek
    ).filter((r) => r.capacity > 0 || r.committed > 0)
  }, [
    scenario,
    employees,
    assignments,
    projects,
    f,
    activeScenarioId,
    settings.defaultHoursPerWeek,
  ])

  const roleHorizData = roleRows.map((r) => ({
    label: r.role.length > 22 ? `${r.role.slice(0, 20)}…` : r.role,
    Capacity: Math.round(r.capacity),
    Committed: Math.round(r.committed),
    util: r.utilization,
  }))

  const skillRows = useMemo(
    () => skillGapSummary(projects, employees, assignments, f, activeScenarioId),
    [projects, employees, assignments, f, activeScenarioId]
  )

  const skillChartData = useMemo(() => {
    return [...skillRows]
      .filter((s) => s.requiredOnProjects > 0 || s.holders > 0)
      .sort((a, b) => b.requiredOnProjects - a.requiredOnProjects)
      .slice(0, 10)
      .map((s) => ({
        skill:
          s.skill.length > 16 ? `${s.skill.slice(0, 14)}…` : s.skill,
        Demand: s.requiredOnProjects,
        Supply: s.holders,
      }))
  }, [skillRows])

  const kindPieData = useMemo(() => {
    if (!portfolio) return []
    return [
      {
        name: 'Delivery (planned h)',
        value: Math.round(portfolio.deliveryPlanned),
      },
      {
        name: 'Opportunities (planned h)',
        value: Math.round(portfolio.opportunityPlanned),
      },
    ].filter((d) => d.value > 0)
  }, [portfolio])

  const pipelineBudget = useMemo(
    () => pipelineExpectedBudget(filterProjects(projects, f)),
    [projects, f]
  )

  const actualsInView = useMemo(() => {
    const ents = actualEntriesMatchingFilters(
      actualTimeEntries,
      employees,
      projects,
      f
    )
    return {
      hours: sumActualHoursInWindow(ents, null, null, f.dateFrom, f.dateTo),
      billableHours: sumActualHoursInWindow(ents, null, null, f.dateFrom, f.dateTo, {
        billableOnly: true,
      }),
      revenue: actualRevenueInWindow(
        ents,
        employees,
        settings,
        f.dateFrom,
        f.dateTo
      ),
    }
  }, [
    actualTimeEntries,
    employees,
    projects,
    f,
    settings,
  ])

  const staffingPctDisplay = portfolio
    ? Math.min(100, Math.round(portfolio.staffingPct * 100))
    : 0

  if (!scenario || !portfolio) {
    return <p className="text-slate-500">No scenario selected.</p>
  }

  return (
    <div className="space-y-8 text-left">
      <header>
        <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-white">
          Capacity & demand
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Hours and budget in your date window. Filters apply across all tiles
          and charts.
        </p>
      </header>

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold text-slate-900 dark:text-white">
          Filters
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label>From</Label>
            <Input
              type="date"
              value={f.dateFrom}
              onChange={(e) => setDashboardFilters({ dateFrom: e.target.value })}
            />
          </div>
          <div>
            <Label>To</Label>
            <Input
              type="date"
              value={f.dateTo}
              onChange={(e) => setDashboardFilters({ dateTo: e.target.value })}
            />
          </div>
          <div>
            <Label>Scenario</Label>
            <Select
              value={activeScenarioId}
              onChange={(e) =>
                useAppStore.getState().setActiveScenario(e.target.value)
              }
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.isBaseline ? ' (baseline)' : ''}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Compare to (optional)</Label>
            <Select
              value={compareScenarioId ?? ''}
              onChange={(e) =>
                useAppStore
                  .getState()
                  .setCompareScenario(e.target.value || null)
              }
            >
              <option value="">— None —</option>
              {scenarios
                .filter((s) => s.id !== activeScenarioId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </Select>
          </div>
          <div>
            <Label>Project kind</Label>
            <Select
              value={f.projectKind}
              onChange={(e) =>
                setDashboardFilters({
                  projectKind: e.target.value as DashboardProjectKindFilter,
                })
              }
            >
              <option value="all">All kinds</option>
              <option value="delivery">Delivery only</option>
              <option value="opportunity">Opportunities only</option>
            </Select>
          </div>
          <div>
            <Label>Project status</Label>
            <Select
              value={f.projectStatus}
              onChange={(e) =>
                setDashboardFilters({
                  projectStatus: e.target.value as ProjectStatus | 'all',
                })
              }
            >
              <option value="all">All</option>
              <option value="pipeline">Pipeline</option>
              <option value="won">Won</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </Select>
          </div>
          <div>
            <Label>People role</Label>
            <Select
              value={f.role}
              onChange={(e) => setDashboardFilters({ role: e.target.value })}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r === 'all' ? 'All roles' : r}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Discipline</Label>
            <Select
              value={f.discipline}
              onChange={(e) => setDashboardFilters({ discipline: e.target.value })}
            >
              {disciplines.map((d) => (
                <option key={d} value={d}>
                  {d === 'all' ? 'All disciplines' : d}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Skill</Label>
            <Select
              value={f.skill}
              onChange={(e) => setDashboardFilters({ skill: e.target.value })}
            >
              {skills.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All skills' : s}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 font-display text-lg font-semibold text-slate-900 dark:text-white">
          Project spotlight
        </h2>
        <p className="mb-4 text-xs text-slate-500">
          Pick a project (respects kind / status / skill filters above) to see who is
          staffed, allocation shape, hard vs soft commitment, and hours in the
          selected window for the active scenario.
        </p>
        <div className="mb-4 max-w-md">
          <Label>Project</Label>
          <Select
            value={spotlightProjectId}
            onChange={(e) => setSpotlightProjectId(e.target.value)}
          >
            <option value="">— Select project —</option>
            {filteredProjectList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {(p.projectKind ?? 'delivery') === 'delivery' ? '' : ' (opp.)'}
              </option>
            ))}
          </Select>
        </div>
        {!spotlightProjectId ? (
          <p className="text-sm text-slate-500">
            Choose a project to show staffing and charts.
          </p>
        ) : spotlightStaff.length === 0 ? (
          <p className="text-sm text-slate-500">
            No assignments on this project in the current scenario and filters.
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="min-w-0 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700">
                    <th className="py-2 pr-3 font-medium">Person</th>
                    <th className="py-2 pr-3 font-medium">Role on project</th>
                    <th className="py-2 pr-3 font-medium">Allocation</th>
                    <th className="py-2 pr-3 font-medium">Commitment</th>
                    <th className="py-2 pr-3 font-medium">Billable</th>
                    <th className="py-2 pr-0 text-right font-medium">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {spotlightStaff.map((r) => (
                    <tr
                      key={r.employeeId}
                      className="border-b border-slate-100 dark:border-slate-800"
                    >
                      <td className="py-2 pr-3">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {r.name}
                        </div>
                        <div className="text-xs text-slate-500">{r.employeeRole}</div>
                      </td>
                      <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">
                        {r.roleOnProject}
                      </td>
                      <td className="py-2 pr-3 text-slate-600 dark:text-slate-400">
                        {r.allocationSummary}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={
                            r.commitmentLabel === 'Hard'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : r.commitmentLabel === 'Soft'
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-slate-600 dark:text-slate-400'
                          }
                        >
                          {r.commitmentLabel}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-slate-600 dark:text-slate-400">
                        {r.billableLabel}
                      </td>
                      <td className="py-2 pr-0 text-right font-medium tabular-nums text-slate-900 dark:text-white">
                        {fmtHours(r.hoursInWindow)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Committed hours by person (window)
              </h3>
              <div className="h-64 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={spotlightBarData}
                    margin={{ left: 4, right: 12, top: 4, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#334155"
                      opacity={0.15}
                    />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={100}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={tipStyle}
                      formatter={(value) => [tipHours(value), 'Hours']}
                    />
                    <Bar
                      dataKey="hours"
                      fill={COLORS.committed}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-violet-500">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Planned hours
          </div>
          <div className="mt-1 font-display text-2xl font-semibold text-slate-900 dark:text-white">
            {fmtHours(primaryTotals.planned)}
          </div>
          {compareTotals && (
            <div className="mt-2 text-xs text-slate-500">
              Compare: {fmtHours(compareTotals.planned)}
            </div>
          )}
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Assigned hours
          </div>
          <div className="mt-1 font-display text-2xl font-semibold text-emerald-700 dark:text-emerald-400">
            {fmtHours(primaryTotals.committed)}
          </div>
          {compareTotals && (
            <div className="mt-2 text-xs text-slate-500">
              Compare: {fmtHours(compareTotals.committed)}
            </div>
          )}
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Unstaffed gap
          </div>
          <div className="mt-1 font-display text-2xl font-semibold text-amber-700 dark:text-amber-400">
            {fmtHours(primaryTotals.gap)}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Planned − assigned in window
          </p>
        </Card>
        <Card className="border-l-4 border-l-slate-400">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Filtered budget
          </div>
          <div className="mt-1 font-display text-2xl font-semibold text-slate-900 dark:text-white">
            {fmtCurrency(portfolio.totalBudget)}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Sum of project budgets in view
          </p>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-fuchsia-500">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Pipeline revenue (weighted)
          </div>
          <div className="mt-1 font-display text-2xl font-semibold text-slate-900 dark:text-white">
            {fmtCurrency(pipelineBudget.weightedBudget)}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {pipelineBudget.pipelineCount} pipeline / opp. projects · gross{' '}
            {fmtCurrency(pipelineBudget.grossBudget)}
          </p>
        </Card>
        <Card className="border-l-4 border-l-sky-500">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Logged hours (filtered)
          </div>
          <div className="mt-1 font-display text-2xl font-semibold text-sky-800 dark:text-sky-300">
            {fmtHours(actualsInView.hours)}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Billable slice: {fmtHours(actualsInView.billableHours)}
          </p>
        </Card>
        <Card className="border-l-4 border-l-orange-500 sm:col-span-2 lg:col-span-2">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Recognized revenue (actuals)
          </div>
          <div className="mt-1 font-display text-2xl font-semibold text-orange-700 dark:text-orange-400">
            {fmtCurrency(actualsInView.revenue)}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Billable logged hours × person billing rate in your date window (
            <Link to="/actuals" className="font-medium text-violet-600 hover:underline dark:text-violet-400">
              Actual hours
            </Link>
            ).
          </p>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Staffing coverage
          </div>
          <div className="mt-2 flex items-end gap-3">
            <span className="font-display text-3xl font-bold text-violet-600 dark:text-violet-400">
              {primaryTotals.planned > 0 ? `${staffingPctDisplay}%` : '—'}
            </span>
            <span className="pb-1 text-xs text-slate-500">
              assigned ÷ planned
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all"
              style={{
                width: `${primaryTotals.planned > 0 ? Math.min(100, staffingPctDisplay) : 0}%`,
              }}
            />
          </div>
        </Card>
        <Card>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Understaffed projects
          </div>
          <div className="mt-1 font-display text-3xl font-semibold text-amber-700 dark:text-amber-400">
            {portfolio.understaffedProjectCount}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Planned &gt; assigned (material gap)
          </p>
        </Card>
        <Card>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Roles over capacity
          </div>
          <div className="mt-1 font-display text-3xl font-semibold text-rose-600 dark:text-rose-400">
            {portfolio.overAllocatedRoleCount}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Committed &gt; role headcount × hours
          </p>
        </Card>
        <Card>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            People in filter
          </div>
          <div className="mt-1 font-display text-3xl font-semibold text-slate-900 dark:text-white">
            {portfolio.headcountInFilter}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Headcount matching role / skill / discipline
          </p>
        </Card>
      </div>

      {utilMix && (
        <Card>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Billable vs non-billable (filtered hours)
                </div>
                <div className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {fmtHours(utilMix.billableHours)}
                  </span>{' '}
                  billable ·{' '}
                  <span className="text-slate-600 dark:text-slate-400">
                    {fmtHours(utilMix.nonBillableHours)} non-billable
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {utilMix.billableHours + utilMix.nonBillableHours > 0
                    ? `${Math.round(
                        (utilMix.billableHours /
                          (utilMix.billableHours + utilMix.nonBillableHours)) *
                          100
                      )}% of committed is billable`
                    : 'No committed hours in filter'}
                </p>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Confirmed vs tentative
                </div>
                <div className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                  <span className="font-semibold">
                    {fmtHours(utilMix.hardHours)}
                  </span>{' '}
                  hard ·{' '}
                  <span className="text-slate-600 dark:text-slate-400">
                    {fmtHours(utilMix.softHours)} soft
                  </span>
                </div>
              </div>
            </div>
            <Link
              to="/planning"
              className="shrink-0 rounded-xl bg-violet-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-violet-500 dark:bg-violet-500 dark:hover:bg-violet-400"
            >
              Weekly heatmap &amp; demand →
            </Link>
          </div>
        </Card>
      )}

      {scenario.plannedHoursMultiplier !== 1 ||
      scenario.committedHoursMultiplier !== 1 ? (
        <Card className="border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/30">
          <strong className="text-amber-900 dark:text-amber-200">
            Sensitivity active:
          </strong>{' '}
          <span className="text-sm text-amber-800 dark:text-amber-300">
            Planned × {scenario.plannedHoursMultiplier}, committed ×{' '}
            {scenario.committedHoursMultiplier}
          </span>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h3 className="mb-1 font-display font-semibold text-slate-900 dark:text-white">
            Planned hours by kind
          </h3>
          <p className="mb-4 text-xs text-slate-500">
            Delivery vs opportunities (window-prorated)
          </p>
          <div className="mx-auto h-56 w-full max-w-[240px]">
            {kindPieData.length === 0 ? (
              <p className="text-sm text-slate-500">No planned hours in view.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={kindPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                  >
                    {kindPieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          entry.name.startsWith('Delivery')
                            ? COLORS.delivery
                            : COLORS.opportunity
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tipStyle}
                    formatter={(value, name) => [tipHours(value), name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-1 font-display font-semibold text-slate-900 dark:text-white">
            Top projects — staffed vs gap (stacked)
          </h3>
          <p className="mb-4 text-xs text-slate-500">
            Assigned portion vs remaining planned need
          </p>
          <div className="h-72 w-full min-w-0">
            {projectStackData.length === 0 ? (
              <p className="text-sm text-slate-500">No data in this window.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={projectStackData}
                  margin={{ left: 8, right: 16, top: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-28} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}`} />
                  <Tooltip
                    contentStyle={tipStyle}
                    formatter={(value, name) => [tipHours(value), name]}
                  />
                  <Legend />
                  <Bar
                    dataKey="Assigned"
                    stackId="a"
                    fill={COLORS.assigned}
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="Gap"
                    stackId="a"
                    fill={COLORS.gap}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-1 font-display font-semibold text-slate-900 dark:text-white">
            Projects — planned vs committed
          </h3>
          <p className="mb-4 text-xs text-slate-500">Horizontal bars for readability</p>
          <div className="h-80 w-full min-w-0">
            {projectHorizData.length === 0 ? (
              <p className="text-sm text-slate-500">No data.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={projectHorizData}
                  margin={{ left: 8, right: 16, top: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={120}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={tipStyle}
                    formatter={(value, name) => [tipHours(value), name]}
                  />
                  <Legend />
                  <Bar dataKey="Planned" fill={COLORS.planned} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Committed" fill={COLORS.assigned} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="mb-1 font-display font-semibold text-slate-900 dark:text-white">
            Roles — capacity vs committed
          </h3>
          <p className="mb-4 text-xs text-slate-500">
            Color hints when utilization &gt; 100%
          </p>
          <div className="h-80 w-full min-w-0">
            {roleHorizData.length === 0 ? (
              <p className="text-sm text-slate-500">No roles in filter.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={roleHorizData}
                  margin={{ left: 8, right: 16, top: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={100}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={tipStyle}
                    formatter={(value, name) => [tipHours(value), name]}
                  />
                  <Legend />
                  <Bar dataKey="Capacity" fill={COLORS.capacity} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Committed" radius={[0, 4, 4, 0]}>
                    {roleHorizData.map((row, i) => (
                      <Cell
                        key={i}
                        fill={
                          row.util > 1
                            ? '#f43f5e'
                            : row.util > 0.85
                              ? '#f59e0b'
                              : COLORS.committed
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="mb-1 font-display font-semibold text-slate-900 dark:text-white">
          Skills — demand vs supply (top 10)
        </h3>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Projects requiring a skill vs people listing it
        </p>
        <div className="h-72 w-full min-w-0">
          {skillChartData.length === 0 ? (
            <p className="text-sm text-slate-500">No skill signals.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={skillChartData}
                margin={{ left: 8, right: 16, top: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                <XAxis dataKey="skill" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={tipStyle} />
                <Legend />
                <Bar dataKey="Demand" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Supply" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 font-display font-semibold text-slate-900 dark:text-white">
          Skills — full table
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="py-2 pr-4 font-medium">Skill</th>
                <th className="py-2 pr-4 font-medium">Projects requiring</th>
                <th className="py-2 font-medium">People with skill</th>
              </tr>
            </thead>
            <tbody>
              {skillRows.map((row) => (
                <tr
                  key={row.skill}
                  className="border-b border-slate-100 dark:border-slate-800"
                >
                  <td className="py-2 pr-4">{row.skill}</td>
                  <td className="py-2 pr-4">{row.requiredOnProjects}</td>
                  <td className="py-2">{row.holders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
