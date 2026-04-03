import { addMonths, formatISO, startOfMonth } from 'date-fns'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  countAssignmentsForPersonInScenario,
  MAX_ASSIGNMENTS_PER_PERSON_PER_SCENARIO,
} from '../lib/assignmentLimits'
import { buildFictionalCompanyDemo } from '../lib/fictionalCompanyDemo'
import type { StandardScenarioPreset } from '../lib/standardScenarios'
import { STANDARD_SCENARIO_PRESETS } from '../lib/standardScenarios'
import type {
  ActualTimeEntry,
  AppSettings,
  Assignment,
  DashboardFilters,
  Employee,
  FictionalDemoBundle,
  Project,
  Scenario,
} from '../types'

const BASELINE_ID = 'baseline'

function todayISO(): string {
  return formatISO(new Date(), { representation: 'date' })
}

function defaultFilters(settings: AppSettings): DashboardFilters {
  const from = formatISO(startOfMonth(new Date()), { representation: 'date' })
  const to = formatISO(
    addMonths(startOfMonth(new Date()), settings.dashboardHorizonMonths),
    { representation: 'date' }
  )
  return {
    dateFrom: from,
    dateTo: to,
    projectStatus: 'all',
    projectKind: 'all',
    role: 'all',
    skill: 'all',
    discipline: 'all',
  }
}

const defaultSettings: AppSettings = {
  defaultHoursPerWeek: 40,
  dashboardHorizonMonths: 6,
  blendedHourlyRate: undefined,
  defaultBillingRate: undefined,
}

const baselineScenario: Scenario = {
  id: BASELINE_ID,
  name: 'Baseline',
  description: 'Live plan — edit assignments here.',
  plannedHoursMultiplier: 1,
  committedHoursMultiplier: 1,
  pipelineDemandMode: 'nominal',
  isBaseline: true,
}

export interface AppState {
  employees: Employee[]
  projects: Project[]
  assignments: Assignment[]
  /** Logged actual hours (timesheet truth) */
  actualTimeEntries: ActualTimeEntry[]
  scenarios: Scenario[]
  activeScenarioId: string
  compareScenarioId: string | null
  settings: AppSettings
  dashboardFilters: DashboardFilters
  /** IDs for the Horizon Meridian fictional demo — cleared by clearFictionalCompanyDemo */
  fictionalDemoBundle: FictionalDemoBundle | null

  setSettings: (p: Partial<AppSettings>) => void
  setDashboardFilters: (p: Partial<DashboardFilters>) => void
  setActiveScenario: (id: string) => void
  setCompareScenario: (id: string | null) => void

  addEmployee: (e: Omit<Employee, 'id'>) => void
  updateEmployee: (id: string, p: Partial<Employee>) => void
  removeEmployee: (id: string) => void
  upsertEmployeeByName: (input: {
    name: string
    role: string
    discipline?: string
    skills?: string[]
    certifications?: string[]
  }) => { id: string; created: boolean }

  addProject: (p: Omit<Project, 'id'>) => void
  updateProject: (id: string, p: Partial<Project>) => void
  removeProject: (id: string) => void
  upsertProject: (
    input: Omit<Project, 'id'>
  ) => { id: string; created: boolean }

  addAssignment: (a: Omit<Assignment, 'id'>) => void
  updateAssignment: (id: string, p: Partial<Assignment>) => void
  removeAssignment: (id: string) => void
  replaceBaselineAssignmentsForProjects: (projectIds: string[]) => void

  addActualTimeEntry: (e: Omit<ActualTimeEntry, 'id'>) => void
  updateActualTimeEntry: (id: string, p: Partial<ActualTimeEntry>) => void
  removeActualTimeEntry: (id: string) => void

  duplicateEmployee: (id: string) => void
  duplicateProject: (id: string) => void
  duplicateAssignment: (id: string) => void
  duplicateActualTimeEntry: (id: string) => void

  addScenario: (name: string, description?: string) => string
  addStandardScenario: (preset: StandardScenarioPreset) => string
  updateScenario: (id: string, p: Partial<Scenario>) => void
  removeScenario: (id: string) => void
  importSnapshot: (
    data: Partial<
      Pick<
        AppState,
        | 'employees'
        | 'projects'
        | 'assignments'
        | 'actualTimeEntries'
        | 'scenarios'
        | 'settings'
      >
    >
  ) => void
  /** Replace entire app state (use shared .json workspace files). */
  importWorkspace: (raw: unknown) => { ok: true } | { ok: false; error: string }
  resetDemo: () => void
  /** Append or replace workspace with a large fictional portfolio (tracked for one-click removal). */
  loadFictionalCompanyDemo: (mode: 'append' | 'replace') => void
  clearFictionalCompanyDemo: () => void
}

function newId(): string {
  return crypto.randomUUID()
}

function ensureBaselineInScenarios(list: Scenario[]): Scenario[] {
  if (list.some((s) => s.id === BASELINE_ID)) return list
  return [baselineScenario, ...list]
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      employees: [],
      projects: [],
      assignments: [],
      actualTimeEntries: [],
      scenarios: [baselineScenario],
      activeScenarioId: BASELINE_ID,
      compareScenarioId: null,
      settings: defaultSettings,
      dashboardFilters: defaultFilters(defaultSettings),
      fictionalDemoBundle: null,

      setSettings: (p) =>
        set((s) => ({
          settings: { ...s.settings, ...p },
        })),

      setDashboardFilters: (p) =>
        set((s) => ({
          dashboardFilters: { ...s.dashboardFilters, ...p },
        })),

      setActiveScenario: (id) => set({ activeScenarioId: id }),
      setCompareScenario: (id) => set({ compareScenarioId: id }),

      addEmployee: (e) =>
        set((s) => ({
          employees: [...s.employees, { ...e, id: newId() }],
        })),

      updateEmployee: (id, p) =>
        set((s) => ({
          employees: s.employees.map((x) => (x.id === id ? { ...x, ...p } : x)),
        })),

      removeEmployee: (id) =>
        set((s) => ({
          employees: s.employees.filter((x) => x.id !== id),
          assignments: s.assignments.filter((a) => a.employeeId !== id),
          actualTimeEntries: s.actualTimeEntries.filter(
            (x) => x.employeeId !== id
          ),
        })),

      upsertEmployeeByName: (input) => {
        const name = input.name.trim()
        const role = input.role.trim()
        if (!name || !role) return { id: '', created: false }
        const key = name.toLowerCase()
        const existing = get().employees.find(
          (e) => e.name.trim().toLowerCase() === key
        )
        if (existing) {
          set((s) => ({
            employees: s.employees.map((e) =>
              e.id === existing.id
                ? {
                    ...e,
                    role,
                    discipline:
                      input.discipline !== undefined
                        ? input.discipline.trim() || undefined
                        : e.discipline,
                    skills: input.skills ?? e.skills,
                    certifications:
                      input.certifications !== undefined
                        ? input.certifications
                        : e.certifications,
                  }
                : e
            ),
          }))
          return { id: existing.id, created: false }
        }
        const id = newId()
        set((s) => ({
          employees: [
            ...s.employees,
            {
              id,
              name,
              role,
              discipline: input.discipline?.trim() || undefined,
              skills: input.skills ?? [],
              certifications: input.certifications?.length
                ? input.certifications
                : undefined,
            },
          ],
        }))
        return { id, created: true }
      },

      addProject: (p) =>
        set((s) => ({
          projects: [...s.projects, { ...p, id: newId() }],
        })),

      updateProject: (id, p) =>
        set((s) => ({
          projects: s.projects.map((x) => (x.id === id ? { ...x, ...p } : x)),
        })),

      removeProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((x) => x.id !== id),
          assignments: s.assignments.filter((a) => a.projectId !== id),
          actualTimeEntries: s.actualTimeEntries.filter(
            (x) => x.projectId !== id
          ),
        })),

      upsertProject: (input) => {
        const ext = input.externalId?.trim()
        const state = get()
        if (ext) {
          const existing = state.projects.find((p) => p.externalId === ext)
          if (existing) {
            set((s) => ({
              projects: s.projects.map((p) =>
                p.id === existing.id
                  ? {
                      ...p,
                      ...input,
                      id: p.id,
                      externalId: ext,
                    }
                  : p
              ),
            }))
            return { id: existing.id, created: false }
          }
        }
        const id = newId()
        set((s) => ({
          projects: [
            ...s.projects,
            {
              ...input,
              id,
              externalId: ext || input.externalId,
            },
          ],
        }))
        return { id, created: true }
      },

      addAssignment: (a) =>
        set((s) => ({
          assignments: [...s.assignments, { ...a, id: newId() }],
        })),

      updateAssignment: (id, p) =>
        set((s) => ({
          assignments: s.assignments.map((x) =>
            x.id === id ? { ...x, ...p } : x
          ),
        })),

      removeAssignment: (id) =>
        set((s) => ({
          assignments: s.assignments.filter((x) => x.id !== id),
        })),

      replaceBaselineAssignmentsForProjects: (projectIds) => {
        const setIds = new Set(projectIds)
        set((s) => ({
          assignments: s.assignments.filter(
            (a) =>
              !(
                a.scenarioId === BASELINE_ID && setIds.has(a.projectId)
              )
          ),
        }))
      },

      addActualTimeEntry: (e) =>
        set((s) => ({
          actualTimeEntries: [...s.actualTimeEntries, { ...e, id: newId() }],
        })),

      updateActualTimeEntry: (id, p) =>
        set((s) => ({
          actualTimeEntries: s.actualTimeEntries.map((x) =>
            x.id === id ? { ...x, ...p } : x
          ),
        })),

      removeActualTimeEntry: (id) =>
        set((s) => ({
          actualTimeEntries: s.actualTimeEntries.filter((x) => x.id !== id),
        })),

      duplicateEmployee: (id) => {
        const e = get().employees.find((x) => x.id === id)
        if (!e) return
        const copy: Employee = {
          ...e,
          id: newId(),
          name: `${e.name} (copy)`,
        }
        set((s) => ({ employees: [...s.employees, copy] }))
      },

      duplicateProject: (id) => {
        const p = get().projects.find((x) => x.id === id)
        if (!p) return
        const ext = p.externalId?.trim()
        const copy: Project = {
          ...p,
          id: newId(),
          name: `${p.name} (copy)`,
          externalId: ext ? `${ext}-copy` : undefined,
        }
        set((s) => ({ projects: [...s.projects, copy] }))
      },

      duplicateAssignment: (id) => {
        const a = get().assignments.find((x) => x.id === id)
        if (!a) return
        if (
          countAssignmentsForPersonInScenario(
            get().assignments,
            a.employeeId,
            a.scenarioId
          ) >= MAX_ASSIGNMENTS_PER_PERSON_PER_SCENARIO
        )
          return
        const { id: _drop, ...rest } = a
        set((s) => ({
          assignments: [...s.assignments, { ...rest, id: newId() }],
        }))
      },

      duplicateActualTimeEntry: (id) => {
        const ent = get().actualTimeEntries.find((x) => x.id === id)
        if (!ent) return
        const { id: _drop, ...rest } = ent
        set((s) => ({
          actualTimeEntries: [
            ...s.actualTimeEntries,
            { ...rest, id: newId() },
          ],
        }))
      },

      addScenario: (name, description) => {
        const id = newId()
        const base = get().assignments.filter(
          (a) => a.scenarioId === BASELINE_ID
        )
        const clones = base.map((a) => ({
          ...a,
          id: newId(),
          scenarioId: id,
        }))
        set((s) => ({
          scenarios: [
            ...s.scenarios,
            {
              id,
              name,
              description,
              plannedHoursMultiplier: 1,
              committedHoursMultiplier: 1,
              pipelineDemandMode: 'nominal',
              isBaseline: false,
            },
          ],
          assignments: [...s.assignments, ...clones],
        }))
        return id
      },

      addStandardScenario: (preset) => {
        const cfg = STANDARD_SCENARIO_PRESETS[preset]
        const id = newId()
        const base = get().assignments.filter(
          (a) => a.scenarioId === BASELINE_ID
        )
        const clones = base.map((a) => ({
          ...a,
          id: newId(),
          scenarioId: id,
        }))
        set((s) => ({
          scenarios: [
            ...s.scenarios,
            {
              id,
              name: cfg.name,
              description: cfg.description,
              plannedHoursMultiplier: cfg.plannedHoursMultiplier,
              committedHoursMultiplier: cfg.committedHoursMultiplier,
              pipelineDemandMode: cfg.pipelineDemandMode,
              isBaseline: false,
            },
          ],
          assignments: [...s.assignments, ...clones],
        }))
        return id
      },

      updateScenario: (id, p) =>
        set((s) => ({
          scenarios: s.scenarios.map((x) => (x.id === id ? { ...x, ...p } : x)),
        })),

      removeScenario: (id) => {
        if (id === BASELINE_ID) return
        set((s) => ({
          scenarios: s.scenarios.filter((x) => x.id !== id),
          assignments: s.assignments.filter((a) => a.scenarioId !== id),
          activeScenarioId:
            s.activeScenarioId === id ? BASELINE_ID : s.activeScenarioId,
          compareScenarioId:
            s.compareScenarioId === id ? null : s.compareScenarioId,
        }))
      },

      importSnapshot: (data) =>
        set((s) => ({
          employees: data.employees ?? s.employees,
          projects: data.projects ?? s.projects,
          assignments: data.assignments ?? s.assignments,
          actualTimeEntries:
            data.actualTimeEntries ?? s.actualTimeEntries,
          scenarios:
            data.scenarios && data.scenarios.length
              ? data.scenarios
              : s.scenarios,
          settings: data.settings ? { ...s.settings, ...data.settings } : s.settings,
        })),

      importWorkspace: (raw) => {
        try {
          let payload: Record<string, unknown>
          if (
            raw &&
            typeof raw === 'object' &&
            'format' in raw &&
            (raw as { format?: string }).format === 'consulting-rm-workspace' &&
            'payload' in raw &&
            typeof (raw as { payload?: unknown }).payload === 'object' &&
            (raw as { payload?: unknown }).payload !== null
          ) {
            payload = (raw as { payload: Record<string, unknown> }).payload
          } else if (raw && typeof raw === 'object') {
            payload = raw as Record<string, unknown>
          } else {
            return { ok: false, error: 'File is not a JSON object.' }
          }

          const employees = Array.isArray(payload.employees)
            ? (payload.employees as Employee[])
            : []
          const projects = Array.isArray(payload.projects)
            ? (payload.projects as Project[])
            : []
          const assignments = Array.isArray(payload.assignments)
            ? (payload.assignments as Assignment[])
            : []
          const actualTimeEntries = Array.isArray(payload.actualTimeEntries)
            ? (payload.actualTimeEntries as ActualTimeEntry[])
            : []
          const rawBundle = payload.fictionalDemoBundle
          const fictionalDemoBundle =
            rawBundle &&
            typeof rawBundle === 'object' &&
            Array.isArray((rawBundle as FictionalDemoBundle).employeeIds)
              ? (rawBundle as FictionalDemoBundle)
              : null
          let scenarios = Array.isArray(payload.scenarios)
            ? (payload.scenarios as Scenario[])
            : [baselineScenario]
          scenarios = ensureBaselineInScenarios(scenarios)

          const settings = {
            ...defaultSettings,
            ...(typeof payload.settings === 'object' && payload.settings
              ? (payload.settings as AppSettings)
              : {}),
          }

          const baseDash = defaultFilters(settings)
          const savedDash = payload.dashboardFilters as
            | Partial<DashboardFilters>
            | undefined
          const dashboardFilters: DashboardFilters = {
            ...baseDash,
            ...savedDash,
            projectKind: savedDash?.projectKind ?? baseDash.projectKind,
            discipline: savedDash?.discipline ?? baseDash.discipline,
          }

          let activeScenarioId =
            typeof payload.activeScenarioId === 'string'
              ? payload.activeScenarioId
              : BASELINE_ID
          if (!scenarios.some((s) => s.id === activeScenarioId))
            activeScenarioId = BASELINE_ID

          let compareScenarioId: string | null = null
          if (
            typeof payload.compareScenarioId === 'string' &&
            scenarios.some((s) => s.id === payload.compareScenarioId)
          )
            compareScenarioId = payload.compareScenarioId

          set({
            employees,
            projects,
            assignments,
            actualTimeEntries,
            scenarios,
            settings,
            dashboardFilters,
            activeScenarioId,
            compareScenarioId,
            fictionalDemoBundle,
          })
          return { ok: true }
        } catch (e) {
          return {
            ok: false,
            error: e instanceof Error ? e.message : 'Invalid workspace file.',
          }
        }
      },

      resetDemo: () => {
        const e1 = newId()
        const e2 = newId()
        const e3 = newId()
        const p1 = newId()
        const p2 = newId()
        const t = todayISO()
        const employees: Employee[] = [
          {
            id: e1,
            name: 'Alex Chen',
            role: 'Senior Consultant',
            discipline: 'Strategy',
            skills: ['Strategy', 'Facilitation', 'Power BI'],
            certifications: ['PMP'],
            billingRate: 275,
            previousProjectsSummary: 'Retail transformation, ops excellence',
          },
          {
            id: e2,
            name: 'Jordan Mills',
            role: 'Manager',
            discipline: 'Operations',
            skills: ['PMO', 'Change', 'Finance'],
            previousProjectsSummary: 'Banking PMO, ERP cutover',
          },
          {
            id: e3,
            name: 'Sam Rivera',
            role: 'Analyst',
            discipline: 'Analytics',
            skills: ['Excel', 'Data modeling', 'SQL'],
            previousProjectsSummary: 'Healthcare analytics',
          },
        ]
        const projects: Project[] = [
          {
            id: p1,
            externalId: 'PRJ-ACME-01',
            name: 'Acme digital roadmap',
            client: 'Acme Corp',
            startDate: t,
            endDate: formatISO(addMonths(new Date(), 3), {
              representation: 'date',
            }),
            budget: 420000,
            plannedHours: 2400,
            requiredSkills: ['Strategy', 'Facilitation'],
            status: 'won',
            projectKind: 'delivery',
          },
          {
            id: p2,
            externalId: 'OPP-GLOBEX-01',
            name: 'Globex PMO standup',
            client: 'Globex',
            startDate: formatISO(addMonths(new Date(), 1), {
              representation: 'date',
            }),
            endDate: formatISO(addMonths(new Date(), 7), {
              representation: 'date',
            }),
            budget: 890000,
            plannedHours: 5200,
            requiredSkills: ['PMO', 'Change'],
            status: 'pipeline',
            projectKind: 'opportunity',
            winProbability: 0.35,
          },
        ]
        const assignments: Assignment[] = [
          {
            id: newId(),
            employeeId: e1,
            projectId: p1,
            scenarioId: BASELINE_ID,
            mode: 'percent_fte',
            value: 0.6,
          },
          {
            id: newId(),
            employeeId: e3,
            projectId: p1,
            scenarioId: BASELINE_ID,
            mode: 'hours_per_week',
            value: 32,
          },
        ]
        const m1 = formatISO(addMonths(new Date(), 1), {
          representation: 'date',
        })
        const actualTimeEntries: ActualTimeEntry[] = [
          {
            id: newId(),
            employeeId: e1,
            projectId: p1,
            periodStart: t,
            periodEnd: m1,
            hours: 120,
            billable: true,
            notes: 'Example timesheet slice',
          },
        ]
        set({
          employees,
          projects,
          assignments,
          actualTimeEntries,
          scenarios: [baselineScenario],
          activeScenarioId: BASELINE_ID,
          compareScenarioId: null,
          settings: defaultSettings,
          dashboardFilters: defaultFilters(defaultSettings),
          fictionalDemoBundle: null,
        })
      },

      loadFictionalCompanyDemo: (mode) => {
        const gen = buildFictionalCompanyDemo(newId)
        if (mode === 'replace') {
          const demoSettings: AppSettings = {
            ...defaultSettings,
            defaultBillingRate: 275,
            blendedHourlyRate: 215,
            defaultHoursPerWeek: 40,
            dashboardHorizonMonths: 9,
          }
          set({
            employees: gen.employees,
            projects: gen.projects,
            assignments: gen.assignments,
            actualTimeEntries: gen.actualTimeEntries,
            scenarios: [baselineScenario, ...gen.extraScenarios],
            activeScenarioId: BASELINE_ID,
            compareScenarioId: null,
            settings: demoSettings,
            dashboardFilters: defaultFilters(demoSettings),
            fictionalDemoBundle: gen.bundle,
          })
          return
        }
        set((s) => {
          const b = s.fictionalDemoBundle
          const mergedBundle: FictionalDemoBundle = b
            ? {
                label: gen.bundle.label,
                employeeIds: [...b.employeeIds, ...gen.bundle.employeeIds],
                projectIds: [...b.projectIds, ...gen.bundle.projectIds],
                assignmentIds: [...b.assignmentIds, ...gen.bundle.assignmentIds],
                actualTimeEntryIds: [
                  ...b.actualTimeEntryIds,
                  ...gen.bundle.actualTimeEntryIds,
                ],
                scenarioIds: [...b.scenarioIds, ...gen.bundle.scenarioIds],
              }
            : gen.bundle
          const scenarioIds = new Set(s.scenarios.map((x) => x.id))
          const extraToAdd = gen.extraScenarios.filter((sc) => !scenarioIds.has(sc.id))
          return {
            employees: [...s.employees, ...gen.employees],
            projects: [...s.projects, ...gen.projects],
            assignments: [...s.assignments, ...gen.assignments],
            actualTimeEntries: [...s.actualTimeEntries, ...gen.actualTimeEntries],
            scenarios: [...s.scenarios, ...extraToAdd],
            fictionalDemoBundle: mergedBundle,
          }
        })
      },

      clearFictionalCompanyDemo: () =>
        set((s) => {
          const b = s.fictionalDemoBundle
          if (!b) return {}
          const eSet = new Set(b.employeeIds)
          const pSet = new Set(b.projectIds)
          const aSet = new Set(b.assignmentIds)
          const actSet = new Set(b.actualTimeEntryIds)
          const scenSet = new Set(b.scenarioIds)

          const employees = s.employees.filter((x) => !eSet.has(x.id))
          const projects = s.projects.filter((x) => !pSet.has(x.id))
          const assignments = s.assignments.filter(
            (x) =>
              !aSet.has(x.id) &&
              !eSet.has(x.employeeId) &&
              !pSet.has(x.projectId) &&
              !scenSet.has(x.scenarioId)
          )
          const actualTimeEntries = s.actualTimeEntries.filter(
            (x) =>
              !actSet.has(x.id) &&
              !eSet.has(x.employeeId) &&
              !pSet.has(x.projectId)
          )
          const scenarios = s.scenarios.filter((x) => !scenSet.has(x.id))

          let activeScenarioId = s.activeScenarioId
          if (!scenarios.some((x) => x.id === activeScenarioId))
            activeScenarioId = BASELINE_ID
          let compareScenarioId = s.compareScenarioId
          if (
            compareScenarioId != null &&
            !scenarios.some((x) => x.id === compareScenarioId)
          )
            compareScenarioId = null

          return {
            employees,
            projects,
            assignments,
            actualTimeEntries,
            scenarios,
            activeScenarioId,
            compareScenarioId,
            fictionalDemoBundle: null,
          }
        }),
    }),
    {
      name: 'consulting-rm-storage-v1',
      partialize: (s) => ({
        employees: s.employees,
        projects: s.projects,
        assignments: s.assignments,
        actualTimeEntries: s.actualTimeEntries,
        scenarios: s.scenarios,
        activeScenarioId: s.activeScenarioId,
        compareScenarioId: s.compareScenarioId,
        settings: s.settings,
        dashboardFilters: s.dashboardFilters,
        fictionalDemoBundle: s.fictionalDemoBundle,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<AppState> | undefined
        const scenarios =
          p?.scenarios?.length && p.scenarios.some((s) => s.id === BASELINE_ID)
            ? p.scenarios
            : [baselineScenario, ...(p?.scenarios ?? [])].filter(
                (s, i, arr) => arr.findIndex((x) => x.id === s.id) === i
              )
        let activeScenarioId = p?.activeScenarioId ?? current.activeScenarioId
        if (!scenarios.some((s) => s.id === activeScenarioId))
          activeScenarioId = BASELINE_ID
        const baseDash = defaultFilters(
          p?.settings
            ? { ...defaultSettings, ...p.settings }
            : defaultSettings
        )
        const saved = (p?.dashboardFilters ?? {}) as Partial<DashboardFilters>
        const dashboardFilters: DashboardFilters = {
          ...baseDash,
          ...saved,
          projectKind: saved.projectKind ?? baseDash.projectKind,
          discipline: saved.discipline ?? baseDash.discipline,
        }

        return {
          ...current,
          ...p,
          scenarios,
          activeScenarioId,
          dashboardFilters,
          fictionalDemoBundle:
            p?.fictionalDemoBundle !== undefined
              ? p.fictionalDemoBundle
              : current.fictionalDemoBundle,
        }
      },
    }
  )
)

export { BASELINE_ID }
