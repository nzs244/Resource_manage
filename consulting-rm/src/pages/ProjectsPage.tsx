import { useMemo, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { ListSearchBar } from '../components/listTools'
import { Button, Card, Input, Label, Select } from '../components/ui'
import type { Project, ProjectKind, ProjectStatus } from '../types'

function winProbPercentField(raw: number | undefined): string {
  if (raw == null) return ''
  const pct = raw > 1 ? raw : raw * 100
  return String(Math.round(pct * 100) / 100)
}

function parseWinProbabilityInput(s: string): number | undefined {
  const t = s.trim()
  if (!t) return undefined
  const n = parseFloat(t)
  if (!Number.isFinite(n)) return undefined
  if (n > 1) return Math.max(0, Math.min(1, n / 100))
  return Math.max(0, Math.min(1, n))
}

function projectMatchesQuery(q: string, p: Project): boolean {
  const n = q.trim().toLowerCase()
  if (!n) return true
  const hay = [
    p.name,
    p.client ?? '',
    p.externalId ?? '',
    p.status,
    p.projectKind ?? '',
    p.requiredSkills.join(' '),
  ]
    .join(' ')
    .toLowerCase()
  return hay.includes(n)
}

export function ProjectsPage() {
  const {
    projects,
    addProject,
    updateProject,
    removeProject,
    duplicateProject,
  } = useAppStore()
  const [listQuery, setListQuery] = useState('')
  const [externalId, setExternalId] = useState('')
  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [budget, setBudget] = useState('')
  const [planned, setPlanned] = useState('')
  const [reqSkills, setReqSkills] = useState('')
  const [status, setStatus] = useState<ProjectStatus>('pipeline')
  const [projectKind, setProjectKind] = useState<ProjectKind>('delivery')
  const [winProb, setWinProb] = useState('35')

  const visibleProjects = useMemo(() => {
    return [...projects]
      .filter((p) => projectMatchesQuery(listQuery, p))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  }, [projects, listQuery])

  const submitAdd = () => {
    if (!name.trim() || !start || !end) return
    const ph = parseFloat(planned)
    const pipelineLike =
      status === 'pipeline' || projectKind === 'opportunity'
    addProject({
      externalId: externalId.trim() || undefined,
      name: name.trim(),
      client: client.trim() || undefined,
      startDate: start,
      endDate: end,
      budget: budget ? Number(budget) : undefined,
      plannedHours: Number.isFinite(ph) && ph > 0 ? ph : 0,
      requiredSkills: reqSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      status,
      projectKind,
      winProbability: pipelineLike
        ? parseWinProbabilityInput(winProb)
        : undefined,
    })
    setExternalId('')
    setName('')
    setClient('')
    setStart('')
    setEnd('')
    setBudget('')
    setPlanned('')
    setReqSkills('')
    setStatus('pipeline')
    setProjectKind('delivery')
    setWinProb('35')
  }

  return (
    <div className="space-y-8 text-left">
      <header>
        <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-white">
          Projects
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Pipeline and sold work: dates, budget, and planned hours drive demand.
        </p>
      </header>

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold">Add project</h2>
        <form
          className="contents"
          onSubmit={(e) => {
            e.preventDefault()
            submitAdd()
          }}
        >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Project ID (external)</Label>
            <Input
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              placeholder="CRM / finance code"
            />
          </div>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Client</Label>
            <Input value={client} onChange={(e) => setClient(e.target.value)} />
          </div>
          <div>
            <Label>Start</Label>
            <Input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div>
            <Label>End</Label>
            <Input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
          <div>
            <Label>Budget (optional)</Label>
            <Input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="USD"
            />
          </div>
          <div>
            <Label>Planned hours (sold)</Label>
            <Input
              type="number"
              value={planned}
              onChange={(e) => setPlanned(e.target.value)}
              placeholder="Total contract hours"
            />
          </div>
          <div>
            <Label>Kind</Label>
            <Select
              value={projectKind}
              onChange={(e) => setProjectKind(e.target.value as ProjectKind)}
            >
              <option value="delivery">Delivery (booked work)</option>
              <option value="opportunity">Opportunity (pursuit)</option>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            >
              <option value="pipeline">Pipeline</option>
              <option value="won">Won</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </Select>
          </div>
          {(status === 'pipeline' || projectKind === 'opportunity') && (
            <div>
              <Label>Win probability (%)</Label>
              <Input
                type="number"
                value={winProb}
                onChange={(e) => setWinProb(e.target.value)}
                placeholder="0–100 for weighted pipeline revenue"
                min={0}
                max={100}
              />
            </div>
          )}
          <div className="sm:col-span-2">
            <Label>Required skills (comma-separated)</Label>
            <Input
              value={reqSkills}
              onChange={(e) => setReqSkills(e.target.value)}
              placeholder="For staffing gap view"
            />
          </div>
        </div>
        <Button type="submit" className="mt-4">
          Add project
        </Button>
        <p className="mt-2 text-xs text-slate-500">
          Tip: <kbd className="rounded border border-slate-300 bg-slate-100 px-1 dark:border-slate-600 dark:bg-slate-800">Enter</kbd> submits when name and dates are valid.
        </p>
        </form>
      </Card>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <ListSearchBar
            value={listQuery}
            onChange={setListQuery}
            placeholder="Name, client, project ID, status…"
            id="projects-filter"
          />
          <p className="text-sm text-slate-500">
            {visibleProjects.length} of {projects.length} shown · sorted A–Z
          </p>
        </div>
      </Card>

      <div className="space-y-4">
        {visibleProjects.map((p) => (
          <ProjectRow
            key={p.id}
            project={p}
            onSave={(x) => updateProject(p.id, x)}
            onRemove={() => removeProject(p.id)}
            onDuplicate={() => duplicateProject(p.id)}
          />
        ))}
        {projects.length === 0 && (
          <p className="text-sm text-slate-500">No projects yet.</p>
        )}
        {projects.length > 0 && visibleProjects.length === 0 && (
          <p className="text-sm text-slate-500">
            No projects match your filter.
          </p>
        )}
      </div>
    </div>
  )
}

function ProjectRow({
  project: p,
  onSave,
  onRemove,
  onDuplicate,
}: {
  project: Project
  onSave: (x: Partial<Project>) => void
  onRemove: () => void
  onDuplicate: () => void
}) {
  const [externalId, setExternalId] = useState(p.externalId ?? '')
  const [name, setName] = useState(p.name)
  const [client, setClient] = useState(p.client ?? '')
  const [start, setStart] = useState(p.startDate)
  const [end, setEnd] = useState(p.endDate)
  const [budget, setBudget] = useState(p.budget?.toString() ?? '')
  const [planned, setPlanned] = useState(p.plannedHours.toString())
  const [reqSkills, setReqSkills] = useState(p.requiredSkills.join(', '))
  const [status, setStatus] = useState<ProjectStatus>(p.status)
  const [projectKind, setProjectKind] = useState<ProjectKind>(
    p.projectKind ?? 'delivery'
  )
  const [winProb, setWinProb] = useState(winProbPercentField(p.winProbability))

  const pipelineLike =
    status === 'pipeline' || projectKind === 'opportunity'

  return (
    <Card>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Project ID (external)</Label>
          <Input
            value={externalId}
            onChange={(e) => setExternalId(e.target.value)}
          />
        </div>
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Client</Label>
          <Input value={client} onChange={(e) => setClient(e.target.value)} />
        </div>
        <div>
          <Label>Start</Label>
          <Input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div>
          <Label>End</Label>
          <Input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
        <div>
          <Label>Budget</Label>
          <Input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
        </div>
        <div>
          <Label>Planned hours</Label>
          <Input
            type="number"
            value={planned}
            onChange={(e) => setPlanned(e.target.value)}
          />
        </div>
        <div>
          <Label>Kind</Label>
          <Select
            value={projectKind}
            onChange={(e) => setProjectKind(e.target.value as ProjectKind)}
          >
            <option value="delivery">Delivery</option>
            <option value="opportunity">Opportunity</option>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
          >
            <option value="pipeline">Pipeline</option>
            <option value="won">Won</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
          </Select>
        </div>
        {pipelineLike && (
          <div>
            <Label>Win probability (%)</Label>
            <Input
              type="number"
              value={winProb}
              onChange={(e) => setWinProb(e.target.value)}
              placeholder="0–100"
              min={0}
              max={100}
            />
          </div>
        )}
        <div className="sm:col-span-2">
          <Label>Required skills</Label>
          <Input value={reqSkills} onChange={(e) => setReqSkills(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            const ph = parseFloat(planned)
            onSave({
              externalId: externalId.trim() || undefined,
              name: name.trim(),
              client: client.trim() || undefined,
              startDate: start,
              endDate: end,
              budget: budget ? Number(budget) : undefined,
              plannedHours: Number.isFinite(ph) ? ph : 0,
              requiredSkills: reqSkills
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
              status,
              projectKind,
              winProbability: pipelineLike
                ? parseWinProbabilityInput(winProb)
                : undefined,
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
    </Card>
  )
}
