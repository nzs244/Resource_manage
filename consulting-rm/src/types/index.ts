export type Id = string

/** Tracks fictional demo entities so they can be removed in one action */
export interface FictionalDemoBundle {
  label: string
  employeeIds: Id[]
  projectIds: Id[]
  assignmentIds: Id[]
  actualTimeEntryIds: Id[]
  /** Non-baseline scenarios created for the demo */
  scenarioIds: Id[]
}

export type AssignmentMode = 'hours_total' | 'hours_per_week' | 'percent_fte'

/** Hard = confirmed staffing; soft = tentative / pipeline */
export type AllocationCommitment = 'hard' | 'soft'

export type ProjectStatus = 'pipeline' | 'won' | 'active' | 'closed'

/** Delivery = booked / current work; opportunity = pipeline / pursuit */
export type ProjectKind = 'delivery' | 'opportunity'

export interface Employee {
  id: Id
  name: string
  role: string
  /** Practice area / line (e.g. FS, Healthcare) */
  discipline?: string
  skills: string[]
  /** Credentials for skill-matching (PMP, CPA, cloud certs, etc.) */
  certifications?: string[]
  /** Free-text past engagements for context */
  previousProjectsSummary?: string
  notes?: string
  /** $/hr for this person when recognizing revenue from actuals / assignments */
  billingRate?: number
}

/** Logged / timesheet hours (truth) for a period on a project */
export interface ActualTimeEntry {
  id: Id
  employeeId: Id
  projectId: Id
  periodStart: string
  periodEnd: string
  hours: number
  billable: boolean
  notes?: string
}

export interface Project {
  id: Id
  /** ID from CRM / finance system — used for import upsert */
  externalId?: string
  name: string
  client?: string
  startDate: string
  endDate: string
  budget?: number
  /** Sold / planned hours on the contract */
  plannedHours: number
  requiredSkills: string[]
  status: ProjectStatus
  projectKind?: ProjectKind
  /** 0–1 win probability for pipeline / opportunities (weighted revenue) */
  winProbability?: number
}

export interface Assignment {
  id: Id
  employeeId: Id
  projectId: Id
  scenarioId: Id
  mode: AssignmentMode
  /** hours_total: total over project; hours_per_week: weekly; percent_fte: 0–1 */
  value: number
  roleOnProject?: string
  commitment?: AllocationCommitment
  /** Default true — false for internal / BD / training */
  billable?: boolean
}

/** How pipeline / opportunity planned hours enter demand & gap math (delivery work is always nominal × multiplier). */
export type PipelineDemandMode =
  | 'nominal'
  | 'probability_weighted'
  | 'exclude_pipeline'
  | 'optimistic_pipeline'
  | 'pessimistic_pipeline'

export interface Scenario {
  id: Id
  name: string
  description?: string
  /** Multiply all project planned hours for demand / gap charts (sensitivity) */
  plannedHoursMultiplier: number
  /** Multiply committed hours from assignments (e.g. efficiency / overtime) */
  committedHoursMultiplier: number
  /** Pipeline & opportunity demand treatment (defaults to nominal for older data). */
  pipelineDemandMode?: PipelineDemandMode
  isBaseline: boolean
}

export interface AppSettings {
  defaultHoursPerWeek: number
  /** Default horizon for dashboard (months from today) */
  dashboardHorizonMonths: number
  /** When > 0 and import has budget but no planned hours: hours = budget / rate */
  blendedHourlyRate?: number
  /** Billable hours × rate for revenue / cost estimates on Planning & Dashboard */
  defaultBillingRate?: number
}

export type DashboardProjectKindFilter = 'all' | ProjectKind

export interface DashboardFilters {
  dateFrom: string
  dateTo: string
  projectStatus: ProjectStatus | 'all'
  /** Delivery vs opportunity portfolio slice */
  projectKind: DashboardProjectKindFilter
  role: string | 'all'
  skill: string | 'all'
  discipline: string | 'all'
}
