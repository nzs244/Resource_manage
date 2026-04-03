import { useMemo, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { ListSearchBar } from '../components/listTools'
import { Button, Card, Input, Label, Select, TextArea } from '../components/ui'
import type { ActualTimeEntry, Employee, Project } from '../types'

function entryMatchesQuery(
  q: string,
  ent: ActualTimeEntry,
  emap: Map<string, Employee>,
  pmap: Map<string, Project>
): boolean {
  const n = q.trim().toLowerCase()
  if (!n) return true
  const e = emap.get(ent.employeeId)
  const p = pmap.get(ent.projectId)
  const hay = [
    e?.name ?? '',
    p?.name ?? '',
    p?.externalId ?? '',
    ent.periodStart,
    ent.periodEnd,
    String(ent.hours),
    ent.notes ?? '',
  ]
    .join(' ')
    .toLowerCase()
  return hay.includes(n)
}

export function ActualsPage() {
  const {
    employees,
    projects,
    actualTimeEntries,
    addActualTimeEntry,
    updateActualTimeEntry,
    removeActualTimeEntry,
    duplicateActualTimeEntry,
  } = useAppStore()

  const [employeeId, setEmployeeId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [hours, setHours] = useState('')
  const [billable, setBillable] = useState(true)
  const [notes, setNotes] = useState('')
  const [listQuery, setListQuery] = useState('')

  const emap = new Map(employees.map((e) => [e.id, e]))
  const pmap = new Map(projects.map((p) => [p.id, p]))

  const sortedVisible = useMemo(() => {
    const em = new Map(employees.map((e) => [e.id, e]))
    const pm = new Map(projects.map((p) => [p.id, p]))
    return [...actualTimeEntries]
      .filter((ent) => entryMatchesQuery(listQuery, ent, em, pm))
      .sort((a, b) => b.periodStart.localeCompare(a.periodStart))
  }, [actualTimeEntries, listQuery, employees, projects])

  const submitAdd = () => {
    if (!employeeId || !projectId || !periodStart || !periodEnd) return
    const h = parseFloat(hours)
    if (!Number.isFinite(h) || h <= 0) return
    if (periodEnd < periodStart) return
    addActualTimeEntry({
      employeeId,
      projectId,
      periodStart,
      periodEnd,
      hours: h,
      billable,
      notes: notes.trim() || undefined,
    })
    setHours('')
    setNotes('')
  }

  return (
    <div className="space-y-8 text-left">
      <header>
        <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-white">
          Actual hours
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Logged / timesheet slices by person, project, and period. These drive{' '}
          <strong>actual</strong> utilization on Planning and revenue on the
          demand chart when hours are billable.
        </p>
      </header>

      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">Add entry</h2>
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
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">Select…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Project</Label>
            <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
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
            <Label>Hours</Label>
            <Input
              type="number"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="e.g. 40"
              min={0}
              step={0.25}
            />
          </div>
          <div>
            <Label>Period start</Label>
            <Input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
          </div>
          <div>
            <Label>Period end</Label>
            <Input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2 pb-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={billable}
                onChange={(e) => setBillable(e.target.checked)}
                className="rounded border-slate-300"
              />
              Billable
            </label>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Label>Notes (optional)</Label>
            <TextArea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <Button type="submit" className="mt-4">
          Add actual hours
        </Button>
        <p className="text-xs text-slate-500">
          <kbd className="rounded border border-slate-300 bg-slate-100 px-1 dark:border-slate-600 dark:bg-slate-800">Enter</kbd>{' '}
          submits when all required fields are valid.
        </p>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <ListSearchBar
            value={listQuery}
            onChange={setListQuery}
            placeholder="Person, project, dates, hours…"
            id="actuals-filter"
          />
          <p className="text-sm text-slate-500">
            {sortedVisible.length} of {actualTimeEntries.length} entries
          </p>
        </div>
        <h2 className="mb-4 font-display text-lg font-semibold">Entries</h2>
        <div className="space-y-6">
          {sortedVisible.map((ent) => (
            <ActualEntryRow
              key={ent.id}
              entry={ent}
              employees={employees}
              projects={projects}
              employeeName={emap.get(ent.employeeId)?.name ?? ent.employeeId}
              projectLabel={
                (() => {
                  const p = pmap.get(ent.projectId)
                  if (!p) return ent.projectId
                  return p.externalId ? `${p.externalId} — ${p.name}` : p.name
                })()
              }
              onSave={(p) => updateActualTimeEntry(ent.id, p)}
              onRemove={() => removeActualTimeEntry(ent.id)}
              onDuplicate={() => duplicateActualTimeEntry(ent.id)}
            />
          ))}
        </div>
        {actualTimeEntries.length === 0 && (
          <p className="text-sm text-slate-500">No actual hours logged yet.</p>
        )}
        {actualTimeEntries.length > 0 && sortedVisible.length === 0 && (
          <p className="text-sm text-slate-500">No entries match your filter.</p>
        )}
      </Card>
    </div>
  )
}

function ActualEntryRow({
  entry: ent,
  employees,
  projects,
  employeeName,
  projectLabel,
  onSave,
  onRemove,
  onDuplicate,
}: {
  entry: ActualTimeEntry
  employees: Employee[]
  projects: Project[]
  employeeName: string
  projectLabel: string
  onSave: (p: Partial<ActualTimeEntry>) => void
  onRemove: () => void
  onDuplicate: () => void
}) {
  const [employeeId, setEmployeeId] = useState(ent.employeeId)
  const [projectId, setProjectId] = useState(ent.projectId)
  const [periodStart, setPeriodStart] = useState(ent.periodStart)
  const [periodEnd, setPeriodEnd] = useState(ent.periodEnd)
  const [hours, setHours] = useState(String(ent.hours))
  const [billable, setBillable] = useState(ent.billable !== false)
  const [notes, setNotes] = useState(ent.notes ?? '')

  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <p className="mb-3 text-xs text-slate-500">
        {employeeName} · {projectLabel}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Label>Person</Label>
          <Select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Project</Label>
          <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.externalId ? `${p.externalId} — ` : ''}
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Hours</Label>
          <Input
            type="number"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            min={0}
            step={0.25}
          />
        </div>
        <div>
          <Label>Period start</Label>
          <Input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
          />
        </div>
        <div>
          <Label>Period end</Label>
          <Input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
          />
        </div>
        <div className="flex items-end gap-2 pb-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={billable}
              onChange={(e) => setBillable(e.target.checked)}
              className="rounded border-slate-300"
            />
            Billable
          </label>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Label>Notes</Label>
          <TextArea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            const h = parseFloat(hours)
            if (!Number.isFinite(h) || h <= 0) return
            if (periodEnd < periodStart) return
            onSave({
              employeeId,
              projectId,
              periodStart,
              periodEnd,
              hours: h,
              billable,
              notes: notes.trim() || undefined,
            })
          }}
        >
          Save
        </Button>
        <Button type="button" variant="secondary" onClick={onDuplicate}>
          Duplicate
        </Button>
        <Button variant="danger" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </div>
  )
}
