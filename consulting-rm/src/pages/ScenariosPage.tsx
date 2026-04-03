import { useMemo, useState } from 'react'
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
import { useAppStore, BASELINE_ID } from '../store/useAppStore'
import { Button, Card, Input, Label, Select, TextArea } from '../components/ui'
import { totalsForScenario } from '../lib/dashboardMetrics'
import {
  STANDARD_PRESET_LABELS,
  STANDARD_SCENARIO_PRESETS,
} from '../lib/standardScenarios'
import { analyticsForAllPresets } from '../lib/scenarioPresetAnalytics'
import type { PipelineDemandMode } from '../types'

const PIPELINE_MODE_OPTIONS: { id: PipelineDemandMode; label: string }[] = [
  { id: 'nominal', label: 'Nominal — full hours on pursuits' },
  { id: 'probability_weighted', label: 'Expected — × win probability' },
  { id: 'exclude_pipeline', label: 'Booked only — exclude pursuits' },
  { id: 'optimistic_pipeline', label: 'Upside — stronger conversion' },
  { id: 'pessimistic_pipeline', label: 'Downside — haircut on pursuits' },
]

const COLORS = {
  planned: '#8b5cf6',
  assigned: '#10b981',
  gap: '#f59e0b',
  delivery: '#6366f1',
  opportunity: '#c084fc',
}

function fmtHours(n: number) {
  return `${Math.round(n).toLocaleString()} h`
}

const tipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.92)',
  border: 'none',
  borderRadius: '12px',
  fontSize: '12px',
}

function tipHours(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return fmtHours(value)
  const num = Number(value)
  return Number.isFinite(num) ? fmtHours(num) : String(value ?? '')
}

export function ScenariosPage() {
  const {
    scenarios,
    assignments,
    projects,
    employees,
    settings,
    dashboardFilters,
    setActiveScenario,
    setCompareScenario,
    addScenario,
    addStandardScenario,
    updateScenario,
    removeScenario,
  } = useAppStore()

  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')

  const presetAnalytics = useMemo(
    () =>
      analyticsForAllPresets(
        projects,
        assignments,
        employees,
        dashboardFilters,
        BASELINE_ID,
        settings.defaultHoursPerWeek,
        STANDARD_PRESET_LABELS
      ),
    [
      projects,
      assignments,
      employees,
      dashboardFilters,
      settings.defaultHoursPerWeek,
    ]
  )

  const comparisonChartData = useMemo(
    () =>
      presetAnalytics.map((row) => ({
        label: row.label,
        Planned: row.totals.planned,
        Assigned: row.totals.committed,
        Gap: row.totals.gap,
      })),
    [presetAnalytics]
  )

  return (
    <div className="space-y-8 text-left">
      <header>
        <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-white">
          Scenarios & sensitivity
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          <strong>Preset analyses</strong> below run automatically on your current{' '}
          <strong>baseline</strong> staffing using the same date and project filters as
          the Dashboard. Charts update as you change assignments or filters. Save a
          preset as an editable scenario to tweak staffing on the Assignments tab.
        </p>
      </header>

      <Card>
        <h2 className="mb-1 font-display text-lg font-semibold">
          Preset comparison (baseline assignments)
        </h2>
        <p className="mb-4 text-xs text-slate-500">
          Same people and projects; each bar group applies that preset’s planned /
          committed multipliers and pipeline demand treatment.
        </p>
        <div className="h-80 w-full min-w-0">
          {comparisonChartData.length === 0 ? (
            <p className="text-sm text-slate-500">No data in the dashboard window.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonChartData}
                margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  opacity={0.15}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-22}
                  textAnchor="end"
                  height={72}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={tipStyle}
                  formatter={(value, n) => [tipHours(value), String(n)]}
                />
                <Legend />
                <Bar dataKey="Planned" fill={COLORS.planned} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Assigned" fill={COLORS.assigned} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Gap" fill={COLORS.gap} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {presetAnalytics.map((row) => {
          const cfg = STANDARD_SCENARIO_PRESETS[row.preset]
          const demandSplit = [
            { name: 'Delivery planned', value: row.deliveryPlanned },
            { name: 'Pipeline / opp. planned', value: row.opportunityPlanned },
          ].filter((x) => x.value > 0)
          const barData = [
            { name: 'Planned', hours: row.totals.planned },
            { name: 'Assigned', hours: row.totals.committed },
            { name: 'Gap', hours: row.totals.gap },
          ]
          const covPct =
            row.totals.planned > 0
              ? Math.round(
                  Math.min(150, (row.totals.committed / row.totals.planned) * 100)
                )
              : null

          return (
            <Card key={row.preset} className="flex flex-col">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                    {row.label}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {cfg.description}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="shrink-0 text-xs"
                  onClick={() => {
                    const sid = addStandardScenario(row.preset)
                    setActiveScenario(sid)
                  }}
                >
                  Save as scenario
                </Button>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Staffing coverage:{' '}
                {covPct !== null ? (
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {covPct}%
                  </span>
                ) : (
                  '—'
                )}
                {' · '}
                Understaffed projects:{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {row.understaffedProjectCount}
                </span>
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Hours in window
                  </p>
                  <div className="h-44 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={barData}
                        margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#334155"
                          opacity={0.12}
                        />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} width={36} />
                        <Tooltip
                          contentStyle={tipStyle}
                          formatter={(v) => [tipHours(v), 'Hours']}
                        />
                        <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                          {barData.map((_, i) => (
                            <Cell
                              key={i}
                              fill={
                                i === 0
                                  ? COLORS.planned
                                  : i === 1
                                    ? COLORS.assigned
                                    : COLORS.gap
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Planned demand by kind
                  </p>
                  <div className="mx-auto h-44 w-full max-w-[200px]">
                    {demandSplit.length === 0 ? (
                      <p className="pt-8 text-center text-xs text-slate-500">
                        No planned hours
                      </p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={demandSplit}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={62}
                            paddingAngle={2}
                          >
                            {demandSplit.map((entry) => (
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
                            formatter={(value, n) => [tipHours(value), n]}
                          />
                          <Legend wrapperStyle={{ fontSize: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold">
          New scenario from baseline
        </h2>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Copies all baseline assignments into a new scenario. Edit assignments on
          the Assignments tab while that scenario is selected.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. +2 seniors on Acme"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <TextArea
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
        </div>
        <Button
          className="mt-4"
          onClick={() => {
            if (!name.trim()) return
            const id = addScenario(name.trim(), desc.trim() || undefined)
            setActiveScenario(id)
            setName('')
            setDesc('')
          }}
        >
          Create scenario
        </Button>
      </Card>

      <div className="space-y-4">
        {scenarios.map((s) => {
          const totals = totalsForScenario(
            projects,
            assignments,
            employees,
            s,
            dashboardFilters,
            s.id,
            settings.defaultHoursPerWeek
          )
          const isBase = s.id === BASELINE_ID
          return (
            <Card key={s.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-semibold">
                    {s.name}
                    {isBase && (
                      <span className="ml-2 text-sm font-normal text-violet-600">
                        baseline
                      </span>
                    )}
                  </h3>
                  {s.description && (
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {s.description}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-slate-500">
                    Window totals — planned: {Math.round(totals.planned)} · assigned:{' '}
                    {Math.round(totals.committed)} · gap: {Math.round(totals.gap)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => setActiveScenario(s.id)}>
                    Use in Assignments
                  </Button>
                  <Button variant="secondary" onClick={() => setCompareScenario(s.id)}>
                    Compare on Dashboard
                  </Button>
                  {!isBase && (
                    <Button variant="danger" onClick={() => removeScenario(s.id)}>
                      Delete
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 dark:border-slate-800 sm:grid-cols-2">
                <div>
                  <Label>Planned hours multiplier</Label>
                  <Input
                    type="number"
                    step="0.05"
                    value={s.plannedHoursMultiplier}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      if (Number.isFinite(v) && v >= 0)
                        updateScenario(s.id, { plannedHoursMultiplier: v })
                    }}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    e.g. 1.1 = 10% scope growth on all projects in charts.
                  </p>
                </div>
                <div>
                  <Label>Committed hours multiplier</Label>
                  <Input
                    type="number"
                    step="0.05"
                    value={s.committedHoursMultiplier}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      if (Number.isFinite(v) && v >= 0)
                        updateScenario(s.id, { committedHoursMultiplier: v })
                    }}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    e.g. 0.9 = efficiency gain; 1.2 = overtime / slippage.
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <Label>Pipeline &amp; opportunity demand</Label>
                  <Select
                    value={s.pipelineDemandMode ?? 'nominal'}
                    onChange={(e) =>
                      updateScenario(s.id, {
                        pipelineDemandMode: e.target.value as PipelineDemandMode,
                      })
                    }
                  >
                    {PIPELINE_MODE_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                  <p className="mt-1 text-xs text-slate-500">
                    Controls how pursuit work counts toward{' '}
                    <strong>planned demand</strong> and gaps. Delivery / booked work
                    always uses full planned hours × multiplier above.
                  </p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
