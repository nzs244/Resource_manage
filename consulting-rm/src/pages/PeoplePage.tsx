import { useMemo, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { ListSearchBar } from '../components/listTools'
import { Button, Card, Input, Label, TextArea } from '../components/ui'
import type { Employee } from '../types'

function employeeMatchesQuery(q: string, e: Employee): boolean {
  const n = q.trim().toLowerCase()
  if (!n) return true
  const hay = [
    e.name,
    e.role,
    e.discipline ?? '',
    e.skills.join(' '),
    (e.certifications ?? []).join(' '),
    e.previousProjectsSummary ?? '',
    e.billingRate != null ? String(e.billingRate) : '',
  ]
    .join(' ')
    .toLowerCase()
  return hay.includes(n)
}

export function PeoplePage() {
  const {
    employees,
    addEmployee,
    updateEmployee,
    removeEmployee,
    duplicateEmployee,
  } = useAppStore()
  const [listQuery, setListQuery] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [discipline, setDiscipline] = useState('')
  const [skills, setSkills] = useState('')
  const [certs, setCerts] = useState('')
  const [billingRate, setBillingRate] = useState('')
  const [prev, setPrev] = useState('')

  const visibleEmployees = useMemo(() => {
    return [...employees]
      .filter((e) => employeeMatchesQuery(listQuery, e))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  }, [employees, listQuery])

  const submitAdd = () => {
    if (!name.trim() || !role.trim()) return
    addEmployee({
      name: name.trim(),
      role: role.trim(),
      discipline: discipline.trim() || undefined,
      skills: skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      certifications: (() => {
        const c = certs
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        return c.length ? c : undefined
      })(),
      billingRate: (() => {
        const n = parseFloat(billingRate)
        return Number.isFinite(n) && n > 0 ? n : undefined
      })(),
      previousProjectsSummary: prev.trim() || undefined,
    })
    setName('')
    setRole('')
    setDiscipline('')
    setSkills('')
    setCerts('')
    setBillingRate('')
    setPrev('')
  }

  return (
    <div className="space-y-8 text-left">
      <header>
        <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-white">
          People
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Roles and skills power capacity views and assignment matching.
        </p>
      </header>

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold">Add person</h2>
        <form
          className="contents"
          onSubmit={(e) => {
            e.preventDefault()
            submitAdd()
          }}
        >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Role</Label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
          <div>
            <Label>Discipline</Label>
            <Input
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
              placeholder="e.g. FS, Healthcare"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Skills (comma-separated)</Label>
            <Input
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g. Strategy, SQL, Change"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Certifications (comma-separated)</Label>
            <Input
              value={certs}
              onChange={(e) => setCerts(e.target.value)}
              placeholder="e.g. PMP, AWS SA, CPA"
            />
          </div>
          <div>
            <Label>Billing rate ($/hr, optional)</Label>
            <Input
              type="number"
              value={billingRate}
              onChange={(e) => setBillingRate(e.target.value)}
              placeholder="Overrides Settings default for revenue"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Previous projects (optional)</Label>
            <TextArea
              rows={2}
              value={prev}
              onChange={(e) => setPrev(e.target.value)}
              placeholder="Short history for staffing context"
            />
          </div>
        </div>
        <Button type="submit" className="mt-4">
          Add employee
        </Button>
        <p className="mt-2 text-xs text-slate-500">
          Tip: press <kbd className="rounded border border-slate-300 bg-slate-100 px-1 dark:border-slate-600 dark:bg-slate-800">Enter</kbd> in the form to add.
        </p>
        </form>
      </Card>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <ListSearchBar
            value={listQuery}
            onChange={setListQuery}
            placeholder="Name, role, skills, discipline…"
            id="people-filter"
          />
          <p className="text-sm text-slate-500">
            {visibleEmployees.length} of {employees.length} shown · sorted A–Z
          </p>
        </div>
      </Card>

      <div className="space-y-4">
        {visibleEmployees.map((e) => (
          <PersonRow
            key={e.id}
            employee={e}
            onSave={(p) => updateEmployee(e.id, p)}
            onRemove={() => removeEmployee(e.id)}
            onDuplicate={() => duplicateEmployee(e.id)}
          />
        ))}
        {employees.length === 0 && (
          <p className="text-sm text-slate-500">
            No people yet. Add above or load sample data from Settings.
          </p>
        )}
        {employees.length > 0 && visibleEmployees.length === 0 && (
          <p className="text-sm text-slate-500">
            No people match your filter. Clear the search box to see everyone.
          </p>
        )}
      </div>
    </div>
  )
}

function PersonRow({
  employee: e,
  onSave,
  onRemove,
  onDuplicate,
}: {
  employee: Employee
  onSave: (p: Partial<Employee>) => void
  onRemove: () => void
  onDuplicate: () => void
}) {
  const [name, setName] = useState(e.name)
  const [role, setRole] = useState(e.role)
  const [discipline, setDiscipline] = useState(e.discipline ?? '')
  const [skills, setSkills] = useState(e.skills.join(', '))
  const [certs, setCerts] = useState((e.certifications ?? []).join(', '))
  const [billingRate, setBillingRate] = useState(
    e.billingRate != null ? String(e.billingRate) : ''
  )
  const [prev, setPrev] = useState(e.previousProjectsSummary ?? '')

  return (
    <Card>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(ev) => setName(ev.target.value)} />
        </div>
        <div>
          <Label>Role</Label>
          <Input value={role} onChange={(ev) => setRole(ev.target.value)} />
        </div>
        <div>
          <Label>Discipline</Label>
          <Input
            value={discipline}
            onChange={(ev) => setDiscipline(ev.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Skills</Label>
          <Input value={skills} onChange={(ev) => setSkills(ev.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Certifications</Label>
          <Input value={certs} onChange={(ev) => setCerts(ev.target.value)} />
        </div>
        <div>
          <Label>Billing rate ($/hr)</Label>
          <Input
            type="number"
            value={billingRate}
            onChange={(ev) => setBillingRate(ev.target.value)}
            placeholder="Uses Settings default if empty"
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Previous projects</Label>
          <TextArea
            rows={2}
            value={prev}
            onChange={(ev) => setPrev(ev.target.value)}
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() =>
            onSave({
              name: name.trim(),
              role: role.trim(),
              discipline: discipline.trim() || undefined,
              skills: skills
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
              certifications: (() => {
                const c = certs
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
                return c.length ? c : undefined
              })(),
              billingRate: (() => {
                const t = billingRate.trim()
                if (!t) return undefined
                const n = parseFloat(t)
                return Number.isFinite(n) && n > 0 ? n : undefined
              })(),
              previousProjectsSummary: prev.trim() || undefined,
            })
          }
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
    </Card>
  )
}
