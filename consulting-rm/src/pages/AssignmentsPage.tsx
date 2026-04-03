import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore, BASELINE_ID } from '../store/useAppStore'
import { ListSearchBar } from '../components/listTools'
import { Button, Card, Input, Label, Select } from '../components/ui'
import {
  countAssignmentsForPersonInScenario,
  MAX_ASSIGNMENTS_PER_PERSON_PER_SCENARIO,
} from '../lib/assignmentLimits'
import type { AllocationCommitment, Assignment, AssignmentMode } from '../types'

type RepeatPayload = Omit<Assignment, 'id' | 'scenarioId'>

function assignmentMatchesQuery(
  q: string,
  a: Assignment,
  employees: { id: string; name: string }[],
  projects: { id: string; name: string; externalId?: string }[]
): boolean {
  const n = q.trim().toLowerCase()
  if (!n) return true
  const e = employees.find((x) => x.id === a.employeeId)
  const p = projects.find((x) => x.id === a.projectId)
  const hay = [
    e?.name ?? '',
    p?.name ?? '',
    p?.externalId ?? '',
    a.mode,
    a.roleOnProject ?? '',
    a.commitment ?? '',
  ]
    .join(' ')
    .toLowerCase()
  return hay.includes(n)
}

export function AssignmentsPage() {
  const {
    employees,
    projects,
    assignments,
    scenarios,
    activeScenarioId,
    setActiveScenario,
    addAssignment,
    updateAssignment,
    removeAssignment,
    duplicateAssignment,
  } = useAppStore()

  const scenario = scenarios.find((s) => s.id === activeScenarioId)
  const isBaseline = activeScenarioId === BASELINE_ID

  const [empId, setEmpId] = useState('')
  const [projId, setProjId] = useState('')
  const [mode, setMode] = useState<AssignmentMode>('percent_fte')
  const [value, setValue] = useState('0.5')
  const [roleOnProject, setRoleOnProject] = useState('')
  const [commitment, setCommitment] = useState<AllocationCommitment>('hard')
  const [billable, setBillable] = useState(true)
  const [listQuery, setListQuery] = useState('')
  const [repeatAvailable, setRepeatAvailable] = useState(false)
  const lastRepeatRef = useRef<RepeatPayload | null>(null)

  const filtered = useMemo(() => {
    return assignments.filter((a) => a.scenarioId === activeScenarioId)
  }, [assignments, activeScenarioId])

  const visible = useMemo(() => {
    return filtered.filter((a) =>
      assignmentMatchesQuery(listQuery, a, employees, projects)
    )
  }, [filtered, listQuery, employees, projects])

  useEffect(() => {
    setRepeatAvailable(false)
    lastRepeatRef.current = null
  }, [activeScenarioId])

  const selectedEmpAssignmentCount = useMemo(() => {
    if (!empId) return 0
    return countAssignmentsForPersonInScenario(
      assignments,
      empId,
      activeScenarioId
    )
  }, [assignments, empId, activeScenarioId])

  const atProjectCap =
    selectedEmpAssignmentCount >= MAX_ASSIGNMENTS_PER_PERSON_PER_SCENARIO

  const repeatWouldExceedCap = useMemo(() => {
    if (!repeatAvailable) return false
    const x = lastRepeatRef.current
    if (!x) return false
    return (
      countAssignmentsForPersonInScenario(
        assignments,
        x.employeeId,
        activeScenarioId
      ) >= MAX_ASSIGNMENTS_PER_PERSON_PER_SCENARIO
    )
  }, [repeatAvailable, assignments, activeScenarioId])

  const submitAdd = () => {
    if (!empId || !projId) return
    if (atProjectCap) return
    const v = parseFloat(value)
    if (!Number.isFinite(v)) return
    addAssignment({
      employeeId: empId,
      projectId: projId,
      scenarioId: activeScenarioId,
      mode,
      value: v,
      roleOnProject: roleOnProject.trim() || undefined,
      commitment,
      billable,
    })
    lastRepeatRef.current = {
      employeeId: empId,
      projectId: projId,
      mode,
      value: v,
      roleOnProject: roleOnProject.trim() || undefined,
      commitment,
      billable,
    }
    setRepeatAvailable(true)
    setProjId('')
    setValue(mode === 'percent_fte' ? '0.5' : '20')
  }

  const repeatLast = () => {
    const x = lastRepeatRef.current
    if (!x) return
    if (
      countAssignmentsForPersonInScenario(
        assignments,
        x.employeeId,
        activeScenarioId
      ) >= MAX_ASSIGNMENTS_PER_PERSON_PER_SCENARIO
    )
      return
    addAssignment({
      ...x,
      scenarioId: activeScenarioId,
    })
  }

  return (
    <div className="space-y-8 text-left">
      <header>
        <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-white">
          Assignments
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          <strong>Hard</strong> = confirmed staffing; <strong>soft</strong> =
          tentative. Each person can be on up to{' '}
          <strong>{MAX_ASSIGNMENTS_PER_PERSON_PER_SCENARIO} projects</strong> at
          once in this scenario (add form and duplicate respect this; Excel import
          can exceed). Edit person, project, or mode in the table; use{' '}
          <strong>Duplicate</strong> or <strong>Repeat last</strong> for speed.
        </p>
      </header>

      <Card>
        <div className="mb-4 flex flex-wrap items-end gap-4">
          <div className="min-w-[200px] flex-1">
            <Label>Working scenario</Label>
            <Select
              value={activeScenarioId}
              onChange={(e) => setActiveScenario(e.target.value)}
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.isBaseline ? ' (baseline)' : ''}
                </option>
              ))}
            </Select>
          </div>
          {!isBaseline && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              You are editing a scenario. Baseline is unchanged until you merge
              manually.
            </p>
          )}
        </div>

        <h2 className="mb-3 font-display text-lg font-semibold">Add assignment</h2>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            submitAdd()
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Person</Label>
              <Select
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} — {e.role}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Project</Label>
              <Select
                value={projId}
                onChange={(e) => setProjId(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.externalId ? `${p.externalId} — ` : ''}
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Mode</Label>
              <Select
                value={mode}
                onChange={(e) => setMode(e.target.value as AssignmentMode)}
              >
                <option value="percent_fte">% FTE (0–1)</option>
                <option value="hours_per_week">Hours / week</option>
                <option value="hours_total">Total hours (over project)</option>
              </Select>
            </div>
            <div>
              <Label>
                {mode === 'percent_fte'
                  ? 'FTE (e.g. 0.5)'
                  : mode === 'hours_per_week'
                    ? 'Hours per week'
                    : 'Total hours'}
              </Label>
              <Input
                type="number"
                step="any"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Commitment</Label>
              <Select
                value={commitment}
                onChange={(e) =>
                  setCommitment(e.target.value as AllocationCommitment)
                }
              >
                <option value="hard">Hard (confirmed)</option>
                <option value="soft">Soft (tentative)</option>
              </Select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={billable}
                  onChange={(e) => setBillable(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Billable
              </label>
            </div>
            <div className="sm:col-span-2">
              <Label>Role on project (optional)</Label>
              <Input
                value={roleOnProject}
                onChange={(e) => setRoleOnProject(e.target.value)}
                placeholder="Overrides person role in role-based charts"
              />
            </div>
          </div>
          {empId && (
            <p className="text-xs text-slate-500">
              Projects for selected person in this scenario:{' '}
              <strong>
                {selectedEmpAssignmentCount} /{' '}
                {MAX_ASSIGNMENTS_PER_PERSON_PER_SCENARIO}
              </strong>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              disabled={!empId || !projId || atProjectCap}
            >
              Add assignment
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!repeatAvailable || repeatWouldExceedCap}
              onClick={repeatLast}
            >
              Repeat last
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            <kbd className="rounded border border-slate-300 bg-slate-100 px-1 dark:border-slate-600 dark:bg-slate-800">Enter</kbd>{' '}
            submits. Repeat last reuses the last successful add (this scenario
            only).
          </p>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <ListSearchBar
            value={listQuery}
            onChange={setListQuery}
            placeholder="Person, project, ID, mode…"
            id="assignments-filter"
          />
          <p className="text-sm text-slate-500">
            {visible.length} of {filtered.length} in scenario
          </p>
        </div>
        <h2 className="mb-4 font-display text-lg font-semibold">
          Current scenario ({scenario?.name})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="py-2 pr-2 font-medium">Person</th>
                <th className="py-2 pr-2 font-medium">Project</th>
                <th className="py-2 pr-2 font-medium">Mode</th>
                <th className="py-2 pr-2 font-medium">Value</th>
                <th className="py-2 pr-2 font-medium">Hard / soft</th>
                <th className="py-2 pr-2 font-medium">Billable</th>
                <th className="py-2 pr-2 font-medium">Role on project</th>
                <th className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((a) => {
                const dupBlocked =
                  countAssignmentsForPersonInScenario(
                    assignments,
                    a.employeeId,
                    activeScenarioId
                  ) >= MAX_ASSIGNMENTS_PER_PERSON_PER_SCENARIO
                return (
                <tr
                  key={a.id}
                  className="border-b border-slate-100 dark:border-slate-800"
                >
                  <td className="py-1.5 pr-2 align-top">
                    <Select
                      className="!py-1.5 text-xs"
                      value={a.employeeId}
                      onChange={(ev) =>
                        updateAssignment(a.id, {
                          employeeId: ev.target.value,
                        })
                      }
                    >
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="py-1.5 pr-2 align-top">
                    <Select
                      className="!py-1.5 text-xs"
                      value={a.projectId}
                      onChange={(ev) =>
                        updateAssignment(a.id, {
                          projectId: ev.target.value,
                        })
                      }
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {(p.externalId ? `${p.externalId} — ` : '') + p.name}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="py-1.5 pr-2 align-top">
                    <Select
                      className="!py-1.5 text-xs"
                      value={a.mode}
                      onChange={(ev) =>
                        updateAssignment(a.id, {
                          mode: ev.target.value as AssignmentMode,
                        })
                      }
                    >
                      <option value="percent_fte">percent_fte</option>
                      <option value="hours_per_week">hours_per_week</option>
                      <option value="hours_total">hours_total</option>
                    </Select>
                  </td>
                  <td className="py-1.5 pr-2 align-top">
                    <Input
                      className="max-w-[88px] !py-1.5 text-xs"
                      type="number"
                      step="any"
                      defaultValue={a.value}
                      key={`${a.id}-val-${a.value}`}
                      onBlur={(ev) => {
                        const v = parseFloat(ev.target.value)
                        if (Number.isFinite(v))
                          updateAssignment(a.id, { value: v })
                      }}
                    />
                  </td>
                  <td className="py-1.5 pr-2 align-top">
                    <Select
                      className="!py-1.5 text-xs"
                      value={a.commitment ?? 'hard'}
                      onChange={(ev) =>
                        updateAssignment(a.id, {
                          commitment: ev.target.value as AllocationCommitment,
                        })
                      }
                    >
                      <option value="hard">Hard</option>
                      <option value="soft">Soft</option>
                    </Select>
                  </td>
                  <td className="py-1.5 pr-2 align-top">
                    <input
                      type="checkbox"
                      checked={a.billable !== false}
                      onChange={(ev) =>
                        updateAssignment(a.id, { billable: ev.target.checked })
                      }
                      className="mt-2 rounded border-slate-300"
                    />
                  </td>
                  <td className="py-1.5 pr-2 align-top">
                    <Input
                      className="min-w-[120px] !py-1.5 text-xs"
                      defaultValue={a.roleOnProject ?? ''}
                      key={`${a.id}-role-${a.roleOnProject ?? ''}`}
                      placeholder="—"
                      onBlur={(ev) => {
                        const t = ev.target.value.trim()
                        updateAssignment(a.id, {
                          roleOnProject: t || undefined,
                        })
                      }}
                    />
                  </td>
                  <td className="py-1.5 align-top">
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        className="!px-2 !py-1 text-xs"
                        type="button"
                        disabled={dupBlocked}
                        title={
                          dupBlocked
                            ? `This person already has ${MAX_ASSIGNMENTS_PER_PERSON_PER_SCENARIO} projects in this scenario`
                            : undefined
                        }
                        onClick={() => duplicateAssignment(a.id)}
                      >
                        Duplicate
                      </Button>
                      <Button
                        variant="ghost"
                        className="!px-2 !py-1 text-xs text-rose-700 dark:text-rose-400"
                        type="button"
                        onClick={() => removeAssignment(a.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-sm text-slate-500">No assignments in this scenario.</p>
        )}
        {filtered.length > 0 && visible.length === 0 && (
          <p className="text-sm text-slate-500">No rows match your filter.</p>
        )}
      </Card>
    </div>
  )
}
