import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAppStore } from '../store/useAppStore'
import { Card, Input, Label, Select } from '../components/ui'
import {
  budgetVsEstimated,
  buildRoleUtilizationHeatmap,
  buildSkillUtilizationHeatmap,
  buildUtilizationHeatmap,
  hoursByEmployeeClient,
  skillMatchPercent,
  weeklyDemandVsCapacity,
} from '../lib/planningMetrics'
import { pipelineModeDescription } from '../lib/standardScenarios'
import type { AssignmentHourOpts } from '../lib/capacity'

type Tab = 'heatmap' | 'demand' | 'skills' | 'clients' | 'budget'
type HeatmapDim = 'person' | 'role' | 'skill'

function utilBg(u: number): string {
  if (u < 0.65)
    return 'bg-emerald-200/90 dark:bg-emerald-900/50 text-emerald-950 dark:text-emerald-100'
  if (u < 0.9)
    return 'bg-amber-200/80 dark:bg-amber-900/40 text-amber-950 dark:text-amber-100'
  if (u < 1.05)
    return 'bg-violet-200/80 dark:bg-violet-900/40 text-violet-950 dark:text-violet-100'
  return 'bg-rose-300/90 dark:bg-rose-900/50 text-rose-950 dark:text-rose-100'
}

export function PlanningPage() {
  const {
    employees,
    projects,
    assignments,
    actualTimeEntries,
    scenarios,
    activeScenarioId,
    settings,
  } = useAppStore()

  const [tab, setTab] = useState<Tab>('heatmap')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    return d.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 3)
    return d.toISOString().slice(0, 10)
  })
  const [heatmapCommitment, setHeatmapCommitment] = useState<
    'all' | 'hard' | 'soft'
  >('all')
  const [demandCommitment, setDemandCommitment] = useState<
    'all' | 'hard' | 'soft'
  >('hard')
  const [skillProjectId, setSkillProjectId] = useState('')
  const [heatmapDim, setHeatmapDim] = useState<HeatmapDim>('person')

  const scenario = scenarios.find((s) => s.id === activeScenarioId)
  const blended = settings.blendedHourlyRate ?? 0

  const heatmap = useMemo(() => {
    if (!scenario) return null
    const heatOpts: AssignmentHourOpts | undefined =
      heatmapCommitment === 'all' ? undefined : { commitment: heatmapCommitment }
    return buildUtilizationHeatmap(
      employees,
      assignments,
      projects,
      scenario,
      activeScenarioId,
      dateFrom,
      dateTo,
      settings.defaultHoursPerWeek,
      heatOpts,
      actualTimeEntries
    )
  }, [
    scenario,
    employees,
    assignments,
    projects,
    activeScenarioId,
    dateFrom,
    dateTo,
    settings.defaultHoursPerWeek,
    heatmapCommitment,
    actualTimeEntries,
  ])

  const roleHeatmap = useMemo(() => {
    if (!scenario) return null
    const heatOpts: AssignmentHourOpts | undefined =
      heatmapCommitment === 'all' ? undefined : { commitment: heatmapCommitment }
    return buildRoleUtilizationHeatmap(
      employees,
      assignments,
      projects,
      scenario,
      activeScenarioId,
      dateFrom,
      dateTo,
      settings.defaultHoursPerWeek,
      heatOpts,
      actualTimeEntries
    )
  }, [
    scenario,
    employees,
    assignments,
    projects,
    activeScenarioId,
    dateFrom,
    dateTo,
    settings.defaultHoursPerWeek,
    heatmapCommitment,
    actualTimeEntries,
  ])

  const skillHeatmap = useMemo(() => {
    if (!scenario) return null
    const heatOpts: AssignmentHourOpts | undefined =
      heatmapCommitment === 'all' ? undefined : { commitment: heatmapCommitment }
    return buildSkillUtilizationHeatmap(
      employees,
      assignments,
      projects,
      scenario,
      activeScenarioId,
      dateFrom,
      dateTo,
      settings.defaultHoursPerWeek,
      heatOpts,
      actualTimeEntries
    )
  }, [
    scenario,
    employees,
    assignments,
    projects,
    activeScenarioId,
    dateFrom,
    dateTo,
    settings.defaultHoursPerWeek,
    heatmapCommitment,
    actualTimeEntries,
  ])

  const demandData = useMemo(() => {
    if (!scenario) return []
    return weeklyDemandVsCapacity(
      employees,
      projects,
      assignments,
      scenario,
      activeScenarioId,
      dateFrom,
      dateTo,
      settings.defaultHoursPerWeek,
      demandCommitment,
      actualTimeEntries,
      settings
    )
  }, [
    scenario,
    employees,
    projects,
    assignments,
    activeScenarioId,
    dateFrom,
    dateTo,
    settings.defaultHoursPerWeek,
    demandCommitment,
    actualTimeEntries,
    settings,
  ])

  const clientRows = useMemo(() => {
    if (!scenario) return []
    const heatOpts: AssignmentHourOpts | undefined =
      heatmapCommitment === 'all' ? undefined : { commitment: heatmapCommitment }
    return hoursByEmployeeClient(
      employees,
      assignments,
      projects,
      scenario,
      activeScenarioId,
      dateFrom,
      dateTo,
      settings.defaultHoursPerWeek,
      heatOpts
    )
  }, [
    scenario,
    employees,
    assignments,
    projects,
    activeScenarioId,
    dateFrom,
    dateTo,
    settings.defaultHoursPerWeek,
    heatmapCommitment,
  ])

  const budgetRows = useMemo(() => {
    if (!scenario) return []
    return budgetVsEstimated(
      projects,
      assignments,
      scenario,
      activeScenarioId,
      dateFrom,
      dateTo,
      settings.defaultHoursPerWeek,
      blended,
      actualTimeEntries,
      employees,
      settings
    ).filter(
      (r) =>
        r.committedHours > 0 ||
        r.actualHours > 0 ||
        (r.budget ?? 0) > 0
    )
  }, [
    scenario,
    projects,
    assignments,
    activeScenarioId,
    dateFrom,
    dateTo,
    settings.defaultHoursPerWeek,
    blended,
    actualTimeEntries,
    employees,
    settings,
  ])

  const skillProject = projects.find((p) => p.id === skillProjectId)

  const skillRanked = useMemo(() => {
    if (!skillProject || !scenario) return []
    const { weeks, cells } = buildUtilizationHeatmap(
      employees,
      assignments,
      projects,
      scenario,
      activeScenarioId,
      dateFrom,
      dateTo,
      settings.defaultHoursPerWeek,
      undefined,
      actualTimeEntries
    )
    return employees
      .map((e) => {
        let com = 0
        let stressSum = 0
        let capTotal = 0
        for (const w of weeks) {
          const c = cells.get(`${e.id}|${w.key}`)
          if (c) {
            com += c.committed
            stressSum += Math.max(c.committed, c.actual)
            capTotal += c.capacity
          }
        }
        return {
          id: e.id,
          name: e.name,
          role: e.role,
          match: skillMatchPercent(e, skillProject),
          utilization: capTotal > 0 ? stressSum / capTotal : 0,
          committed: com,
        }
      })
      .sort((a, b) => b.match - a.match || b.utilization - a.utilization)
  }, [
    skillProject,
    employees,
    assignments,
    projects,
    scenario,
    activeScenarioId,
    dateFrom,
    dateTo,
    settings.defaultHoursPerWeek,
    actualTimeEntries,
  ])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'heatmap', label: 'Workload heatmap' },
    { id: 'demand', label: 'Demand & forecast' },
    { id: 'skills', label: 'Skill staffing' },
    { id: 'clients', label: 'By client' },
    { id: 'budget', label: 'Budget vs estimated' },
  ]

  if (!scenario) {
    return <p className="text-slate-500">No scenario selected.</p>
  }

  return (
    <div className="space-y-6 text-left">
      <header>
        <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-white">
          Planning & utilization
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Weekly capacity, skill matching, multi-client hours, and demand vs
          supply. Use <strong>soft</strong> allocations for tentative staffing;{' '}
          <strong>hard</strong> for confirmed. Mark non-billable time on
          assignments where needed.
        </p>
      </header>

      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <Label>To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
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
                </option>
              ))}
            </Select>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Set <strong>Default billing rate</strong> in Settings for revenue
          lines (billable hours × rate).
        </p>
        <p className="mt-2 text-xs text-violet-800 dark:text-violet-200/90">
          <strong>Pipeline demand (this scenario):</strong>{' '}
          {pipelineModeDescription(scenario.pipelineDemandMode)} Adjust under{' '}
          <strong>Scenarios</strong> or pick a <strong>standard scenario</strong>{' '}
          preset.
        </p>
      </Card>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? 'bg-violet-600 text-white dark:bg-violet-500'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'heatmap' && heatmap && roleHeatmap && skillHeatmap && (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-display text-lg font-semibold">
              Utilization heatmaps
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-xl border border-slate-200 p-0.5 dark:border-slate-700">
                {(
                  [
                    ['person', 'By person'],
                    ['role', 'By role'],
                    ['skill', 'By skill'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setHeatmapDim(id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      heatmapDim === id
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Label className="!mb-0 mr-2">Show</Label>
                <Select
                  value={heatmapCommitment}
                  onChange={(e) =>
                    setHeatmapCommitment(e.target.value as 'all' | 'hard' | 'soft')
                  }
                >
                  <option value="all">All allocations</option>
                  <option value="hard">Confirmed (hard) only</option>
                  <option value="soft">Tentative (soft) only</option>
                </Select>
              </div>
            </div>
          </div>
          <p className="mb-4 text-xs text-slate-500">
            {heatmapDim === 'skill' ? (
              <>
                <strong>By skill</strong> rolls up everyone who lists that skill or
                certification — the same person can appear in multiple rows.{' '}
              </>
            ) : heatmapDim === 'role' ? (
              <>
                <strong>By role</strong> aggregates capacity and hours for each
                job title.{' '}
              </>
            ) : null}
            Utilization = max(committed, actual) ÷ capacity (prorated week).
          </p>
          <div className="max-h-[480px] overflow-auto">
            {heatmapDim === 'person' && (
              <table className="min-w-max border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-white px-2 py-2 text-left font-medium dark:bg-slate-900">
                      Person
                    </th>
                    {heatmap.weeks.map((w) => (
                      <th
                        key={w.key}
                        className="min-w-[52px] px-1 py-2 text-center font-medium text-slate-600 dark:text-slate-400"
                      >
                        {w.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e) => (
                    <tr key={e.id}>
                      <td className="sticky left-0 z-10 bg-white px-2 py-1 font-medium dark:bg-slate-900">
                        {e.name}
                      </td>
                      {heatmap.weeks.map((w) => {
                        const cell = heatmap.cells.get(`${e.id}|${w.key}`)
                        const u = cell?.utilization ?? 0
                        const pct = Math.round(u * 100)
                        return (
                          <td key={w.key} className="p-0.5">
                            <div
                              className={`rounded px-1 py-1.5 text-center font-medium ${utilBg(u)}`}
                              title={`Committed ${Math.round(cell?.committed ?? 0)}h, actual ${Math.round(cell?.actual ?? 0)}h, cap ${Math.round(cell?.capacity ?? 0)}h (${pct}%)`}
                            >
                              {pct}%
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {heatmapDim === 'role' && (
              <table className="min-w-max border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-white px-2 py-2 text-left font-medium dark:bg-slate-900">
                      Role
                    </th>
                    {roleHeatmap.weeks.map((w) => (
                      <th
                        key={w.key}
                        className="min-w-[52px] px-1 py-2 text-center font-medium text-slate-600 dark:text-slate-400"
                      >
                        {w.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roleHeatmap.rowKeys.map((row) => (
                    <tr key={row}>
                      <td className="sticky left-0 z-10 bg-white px-2 py-1 font-medium dark:bg-slate-900">
                        {row}
                      </td>
                      {roleHeatmap.weeks.map((w) => {
                        const cell = roleHeatmap.cells.get(`${row}|${w.key}`)
                        const u = cell?.utilization ?? 0
                        const pct = Math.round(u * 100)
                        return (
                          <td key={w.key} className="p-0.5">
                            <div
                              className={`rounded px-1 py-1.5 text-center font-medium ${utilBg(u)}`}
                              title={`Committed ${Math.round(cell?.committed ?? 0)}h, actual ${Math.round(cell?.actual ?? 0)}h, cap ${Math.round(cell?.capacity ?? 0)}h (${pct}%)`}
                            >
                              {pct}%
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {heatmapDim === 'skill' && (
              <table className="min-w-max border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-white px-2 py-2 text-left font-medium dark:bg-slate-900">
                      Skill / cert
                    </th>
                    {skillHeatmap.weeks.map((w) => (
                      <th
                        key={w.key}
                        className="min-w-[52px] px-1 py-2 text-center font-medium text-slate-600 dark:text-slate-400"
                      >
                        {w.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {skillHeatmap.rowKeys.map((row) => (
                    <tr key={row}>
                      <td className="sticky left-0 z-10 max-w-[140px] truncate bg-white px-2 py-1 font-medium dark:bg-slate-900">
                        {row}
                      </td>
                      {skillHeatmap.weeks.map((w) => {
                        const cell = skillHeatmap.cells.get(`${row}|${w.key}`)
                        const u = cell?.utilization ?? 0
                        const pct = Math.round(u * 100)
                        return (
                          <td key={w.key} className="p-0.5">
                            <div
                              className={`rounded px-1 py-1.5 text-center font-medium ${utilBg(u)}`}
                              title={`Committed ${Math.round(cell?.committed ?? 0)}h, actual ${Math.round(cell?.actual ?? 0)}h, cap ${Math.round(cell?.capacity ?? 0)}h (${pct}%)`}
                            >
                              {pct}%
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {tab === 'demand' && (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-display text-lg font-semibold">
              Demand vs capacity (weekly)
            </h2>
            <div className="flex items-center gap-2">
              <Label className="!mb-0 mr-2">Committed</Label>
              <Select
                value={demandCommitment}
                onChange={(e) =>
                  setDemandCommitment(e.target.value as 'all' | 'hard' | 'soft')
                }
              >
                <option value="all">All</option>
                <option value="hard">Hard only</option>
                <option value="soft">Soft only</option>
              </Select>
            </div>
          </div>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            <strong>Demand (scenario)</strong> = planned hours per week with this
            scenario&apos;s <strong>pipeline treatment</strong> (see Scenarios).{' '}
            <strong>Nominal planned</strong> = full hours including all pursuits.{' '}
            <strong>Weighted demand</strong> = pipeline × win probability
            (reference). <strong>Actual</strong> = logged timesheet hours. Revenue
            lines use person billing rates.
          </p>
          <div className="h-80 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={demandData} margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis
                  yAxisId="h"
                  tick={{ fontSize: 10 }}
                  label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
                />
                <YAxis
                  yAxisId="k"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  label={{
                    value: 'k$',
                    angle: 90,
                    position: 'insideRight',
                  }}
                />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="h"
                  type="monotone"
                  dataKey="demandHours"
                  name="Demand (scenario pipeline rules)"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="h"
                  type="monotone"
                  dataKey="nominalDemandHours"
                  name="Nominal planned (full pipeline)"
                  stroke="#64748b"
                  strokeDasharray="5 4"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Line
                  yAxisId="h"
                  type="monotone"
                  dataKey="weightedDemandHours"
                  name="Expected demand (× win prob)"
                  stroke="#a78bfa"
                  strokeDasharray="4 3"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="h"
                  type="monotone"
                  dataKey="capacityHours"
                  name="Supply (capacity h)"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="h"
                  type="monotone"
                  dataKey="committedHours"
                  name="Committed h"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="h"
                  type="monotone"
                  dataKey="actualHours"
                  name="Actual logged h"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="k"
                  type="monotone"
                  dataKey="forecastRevenueK"
                  name="Forecast revenue (k$)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="k"
                  type="monotone"
                  dataKey="actualRevenueK"
                  name="Actual revenue (k$)"
                  stroke="#ea580c"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {tab === 'skills' && (
        <Card>
          <h2 className="mb-4 font-display text-lg font-semibold">
            Skill-based staffing
          </h2>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Match score uses project <strong>required skills</strong> vs each
            person&apos;s <strong>skills</strong> and{' '}
            <strong>certifications</strong>. Experience text is not scored yet
            — use it when reviewing names.
          </p>
          <div className="mb-4 max-w-md">
            <Label>Project to staff</Label>
            <Select
              value={skillProjectId}
              onChange={(e) => setSkillProjectId(e.target.value)}
            >
              <option value="">Select a project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.externalId ? `${p.externalId} — ` : ''}
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          {skillProject && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2 pr-3">Match</th>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Role</th>
                    <th className="py-2 pr-3">Util. (period)</th>
                    <th className="py-2">Committed h</th>
                  </tr>
                </thead>
                <tbody>
                  {skillRanked.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-100 dark:border-slate-800"
                    >
                      <td className="py-2 pr-3 font-semibold text-violet-600 dark:text-violet-400">
                        {row.match}%
                      </td>
                      <td className="py-2 pr-3">{row.name}</td>
                      <td className="py-2 pr-3 text-slate-600 dark:text-slate-400">
                        {row.role}
                      </td>
                      <td className="py-2 pr-3">
                        {Math.round(row.utilization * 100)}%
                      </td>
                      <td className="py-2">{Math.round(row.committed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'clients' && (
        <Card>
          <h2 className="mb-4 font-display text-lg font-semibold">
            Hours by person × client
          </h2>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Multi-project visibility grouped by <strong>client</strong> on each
            project record.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2 pr-3">Person</th>
                  <th className="py-2 pr-3">Client</th>
                  <th className="py-2">Hours (period)</th>
                </tr>
              </thead>
              <tbody>
                {clientRows.map((r, i) => (
                  <tr
                    key={`${r.employeeId}-${r.client}-${i}`}
                    className="border-b border-slate-100 dark:border-slate-800"
                  >
                    <td className="py-2 pr-3">{r.employeeName}</td>
                    <td className="py-2 pr-3">{r.client}</td>
                    <td className="py-2">{Math.round(r.hours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {clientRows.length === 0 && (
              <p className="text-sm text-slate-500">No hours in this range.</p>
            )}
          </div>
        </Card>
      )}

      {tab === 'budget' && (
        <Card>
          <h2 className="mb-4 font-display text-lg font-semibold">
            Budget vs estimated actual (hours × rate)
          </h2>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Estimated cost uses each project&apos;s <strong>budget ÷ planned</strong>{' '}
            hourly rate when available, otherwise the blended rate in Settings.
            Variance = budget − estimate. <strong>Actual</strong> columns use
            logged hours and person billing rates.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2 pr-3">Project</th>
                  <th className="py-2 pr-3">Client</th>
                  <th className="py-2 pr-3">Budget</th>
                  <th className="py-2 pr-3">Committed h</th>
                  <th className="py-2 pr-3">Actual h</th>
                  <th className="py-2 pr-3">Est. cost</th>
                  <th className="py-2 pr-3">Actual revenue</th>
                  <th className="py-2">Variance</th>
                </tr>
              </thead>
              <tbody>
                {budgetRows.map((r) => (
                  <tr
                    key={r.projectId}
                    className="border-b border-slate-100 dark:border-slate-800"
                  >
                    <td className="py-2 pr-3">{r.name}</td>
                    <td className="py-2 pr-3">{r.client ?? '—'}</td>
                    <td className="py-2 pr-3">
                      {r.budget != null
                        ? `$${Math.round(r.budget).toLocaleString()}`
                        : '—'}
                    </td>
                    <td className="py-2 pr-3">{Math.round(r.committedHours)}</td>
                    <td className="py-2 pr-3">{Math.round(r.actualHours)}</td>
                    <td className="py-2 pr-3">
                      ${Math.round(r.estCost).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3">
                      ${Math.round(r.actualRevenue).toLocaleString()}
                    </td>
                    <td className="py-2">
                      {r.budget != null
                        ? `$${Math.round(r.variance).toLocaleString()}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
