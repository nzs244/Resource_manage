import { addMonths, formatISO, startOfMonth, subMonths } from 'date-fns'
import { MAX_ASSIGNMENTS_PER_PERSON_PER_SCENARIO } from './assignmentLimits'
import type {
  ActualTimeEntry,
  Assignment,
  AssignmentMode,
  Employee,
  FictionalDemoBundle,
  Project,
  ProjectKind,
  ProjectStatus,
  Scenario,
} from '../types'

const BASELINE_ID = 'baseline'

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Casey', 'Morgan', 'Riley', 'Quinn', 'Avery', 'Skyler',
  'Reese', 'Taylor', 'Cameron', 'Drew', 'Jamie', 'Blake', 'Rowan', 'Emerson',
  'Logan', 'Parker', 'Hayden', 'Reagan', 'Finley', 'Hayes', 'Sage', 'River',
  'Phoenix', 'Eden', 'Marlowe', 'Ellis', 'Kendall', 'Monroe', 'Lennox', 'Dakota',
  'Charlie', 'Remy', 'Shawn', 'Devon',
]

const LAST_NAMES = [
  'Nguyen', 'Patel', 'Kim', 'Hernandez', 'Okonkwo', 'Silva', 'Kowalski', 'Frost',
  'Bennett', 'Carver', 'Dubois', 'Ellison', 'Fujita', 'García', 'Hart', 'Ibrahim',
  'Jensen', 'Khan', 'Liu', 'Martens', 'Nakamura', 'Okafor', 'Park', 'Reyes',
  'Santos', 'Thompson', 'Varga', 'Walsh', 'Yilmaz', 'Zhou', 'Abbott', 'Bishop',
  'Cohen', 'Diaz', 'Eaton', 'Flynn',
]

const DISCIPLINES = [
  'Strategy',
  'Technology',
  'Operations',
  'Healthcare',
  'Financial Services',
  'People & Change',
] as const

const SKILL_POOLS: Record<string, string[]> = {
  Strategy: ['Strategy', 'Facilitation', 'Market analysis', 'Board decks', 'OKRs'],
  Technology: ['Cloud', 'Architecture', 'Agile', 'Data platforms', 'Cyber'],
  Operations: ['Lean', 'PMO', 'Supply chain', 'Process design', 'ERP'],
  Healthcare: ['Clinical ops', 'Revenue cycle', 'HIPAA', 'Interoperability'],
  'Financial Services': ['Risk', 'Regulatory', 'Treasury', 'FP&A'],
  'People & Change': ['Change', 'L&D', 'Org design', 'Culture', 'HR tech'],
}

const ROLES = [
  'Analyst',
  'Consultant',
  'Senior Consultant',
  'Manager',
  'Senior Manager',
  'Director',
  'Principal',
] as const

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]
}

interface ProjectSpec {
  code: string
  name: string
  client: string
  status: ProjectStatus
  kind: ProjectKind
  monthsStart: number
  monthsLen: number
  budgetK: number
  plannedHours: number
  skills: string[]
  winPct?: number
}

const PROJECT_SPECS: ProjectSpec[] = [
  {
    code: 'HZN-24-101',
    name: 'Enterprise strategy refresh',
    client: 'Northwind Retail Group',
    status: 'active',
    kind: 'delivery',
    monthsStart: -2,
    monthsLen: 8,
    budgetK: 1850,
    plannedHours: 4200,
    skills: ['Strategy', 'Facilitation', 'OKRs'],
  },
  {
    code: 'HZN-24-102',
    name: 'Cloud migration wave 2',
    client: 'Contoso Financial',
    status: 'active',
    kind: 'delivery',
    monthsStart: -1,
    monthsLen: 14,
    budgetK: 4200,
    plannedHours: 9800,
    skills: ['Cloud', 'Architecture', 'Agile'],
  },
  {
    code: 'HZN-24-103',
    name: 'Operating model redesign',
    client: 'Fabrikam Health',
    status: 'won',
    kind: 'delivery',
    monthsStart: 0,
    monthsLen: 9,
    budgetK: 2100,
    plannedHours: 4800,
    skills: ['Org design', 'Process design', 'Change'],
  },
  {
    code: 'HZN-24-104',
    name: 'ERP stabilization PMO',
    client: 'Litware Manufacturing',
    status: 'active',
    kind: 'delivery',
    monthsStart: -3,
    monthsLen: 12,
    budgetK: 3600,
    plannedHours: 8200,
    skills: ['PMO', 'ERP', 'Lean'],
  },
  {
    code: 'HZN-24-105',
    name: 'Digital patient intake',
    client: 'Coho Medical Network',
    status: 'pipeline',
    kind: 'opportunity',
    monthsStart: 2,
    monthsLen: 11,
    budgetK: 2800,
    plannedHours: 5600,
    skills: ['Clinical ops', 'Agile', 'Data platforms'],
    winPct: 0.42,
  },
  {
    code: 'HZN-24-106',
    name: 'Treasury transformation',
    client: 'Adventure Works Bank',
    status: 'won',
    kind: 'delivery',
    monthsStart: -1,
    monthsLen: 10,
    budgetK: 1950,
    plannedHours: 4100,
    skills: ['Treasury', 'Risk', 'Regulatory'],
  },
  {
    code: 'HZN-24-107',
    name: 'Customer analytics hub',
    client: 'Wide World Importers',
    status: 'active',
    kind: 'delivery',
    monthsStart: 0,
    monthsLen: 7,
    budgetK: 1450,
    plannedHours: 3200,
    skills: ['Data platforms', 'Market analysis', 'Cloud'],
  },
  {
    code: 'HZN-24-108',
    name: 'Merger integration office',
    client: 'Blue Yonder Holdings',
    status: 'active',
    kind: 'delivery',
    monthsStart: -4,
    monthsLen: 18,
    budgetK: 5100,
    plannedHours: 11200,
    skills: ['PMO', 'Change', 'Finance'],
  },
  {
    code: 'HZN-24-109',
    name: 'Sustainability reporting',
    client: 'Tailspin Energy',
    status: 'pipeline',
    kind: 'opportunity',
    monthsStart: 3,
    monthsLen: 6,
    budgetK: 980,
    plannedHours: 2200,
    skills: ['FP&A', 'Process design'],
    winPct: 0.28,
  },
  {
    code: 'HZN-24-110',
    name: 'Contact center modernization',
    client: 'Alpine Telecom',
    status: 'won',
    kind: 'delivery',
    monthsStart: -2,
    monthsLen: 9,
    budgetK: 1650,
    plannedHours: 3800,
    skills: ['Process design', 'Change', 'Agile'],
  },
  {
    code: 'HZN-25-201',
    name: 'GenAI governance framework',
    client: 'Northwind Retail Group',
    status: 'pipeline',
    kind: 'opportunity',
    monthsStart: 1,
    monthsLen: 5,
    budgetK: 720,
    plannedHours: 1600,
    skills: ['Cyber', 'Regulatory', 'Strategy'],
    winPct: 0.55,
  },
  {
    code: 'HZN-25-202',
    name: 'Supply chain control tower',
    client: 'Fabrikam Health',
    status: 'active',
    kind: 'delivery',
    monthsStart: 0,
    monthsLen: 11,
    budgetK: 2400,
    plannedHours: 5400,
    skills: ['Supply chain', 'Data platforms', 'Lean'],
  },
  {
    code: 'HZN-25-203',
    name: 'HR operating model',
    client: 'Contoso Financial',
    status: 'won',
    kind: 'delivery',
    monthsStart: -1,
    monthsLen: 8,
    budgetK: 1320,
    plannedHours: 2900,
    skills: ['Org design', 'HR tech', 'Change'],
  },
  {
    code: 'HZN-25-204',
    name: 'Payments platform assessment',
    client: 'Adventure Works Bank',
    status: 'pipeline',
    kind: 'opportunity',
    monthsStart: 2,
    monthsLen: 4,
    budgetK: 640,
    plannedHours: 1400,
    skills: ['Architecture', 'Treasury'],
    winPct: 0.38,
  },
  {
    code: 'HZN-25-205',
    name: 'Field service optimization',
    client: 'Litware Manufacturing',
    status: 'closed',
    kind: 'delivery',
    monthsStart: -14,
    monthsLen: 10,
    budgetK: 1180,
    plannedHours: 2600,
    skills: ['Lean', 'Process design'],
  },
  {
    code: 'HZN-25-206',
    name: 'Cyber resilience program',
    client: 'Wide World Importers',
    status: 'active',
    kind: 'delivery',
    monthsStart: 0,
    monthsLen: 12,
    budgetK: 2950,
    plannedHours: 6200,
    skills: ['Cyber', 'Architecture', 'PMO'],
  },
  {
    code: 'HZN-25-207',
    name: 'Commercial excellence sprint',
    client: 'Coho Medical Network',
    status: 'won',
    kind: 'delivery',
    monthsStart: -1,
    monthsLen: 5,
    budgetK: 890,
    plannedHours: 2000,
    skills: ['Market analysis', 'Facilitation'],
  },
  {
    code: 'HZN-25-208',
    name: 'Data center exit',
    client: 'Tailspin Energy',
    status: 'active',
    kind: 'delivery',
    monthsStart: -2,
    monthsLen: 16,
    budgetK: 4800,
    plannedHours: 10500,
    skills: ['Cloud', 'Architecture', 'ERP'],
  },
  {
    code: 'HZN-25-209',
    name: 'Loyalty platform RFP support',
    client: 'Alpine Telecom',
    status: 'pipeline',
    kind: 'opportunity',
    monthsStart: 4,
    monthsLen: 3,
    budgetK: 420,
    plannedHours: 900,
    skills: ['Strategy', 'Agile'],
    winPct: 0.33,
  },
  {
    code: 'HZN-25-210',
    name: 'Finance close automation',
    client: 'Blue Yonder Holdings',
    status: 'active',
    kind: 'delivery',
    monthsStart: 0,
    monthsLen: 9,
    budgetK: 1780,
    plannedHours: 3900,
    skills: ['FP&A', 'ERP', 'Process design'],
  },
  {
    code: 'HZN-25-211',
    name: 'Post-close synergy tracking',
    client: 'Woodgrove Capital',
    status: 'won',
    kind: 'delivery',
    monthsStart: -3,
    monthsLen: 12,
    budgetK: 2200,
    plannedHours: 5000,
    skills: ['PMO', 'Finance', 'Change'],
  },
  {
    code: 'HZN-25-212',
    name: 'Retail media network launch',
    client: 'Northwind Retail Group',
    status: 'pipeline',
    kind: 'opportunity',
    monthsStart: 1,
    monthsLen: 8,
    budgetK: 3100,
    plannedHours: 6800,
    skills: ['Market analysis', 'Data platforms', 'Strategy'],
    winPct: 0.48,
  },
]

export interface FictionalCompanyDemoPayload {
  employees: Employee[]
  projects: Project[]
  assignments: Assignment[]
  actualTimeEntries: ActualTimeEntry[]
  extraScenarios: Scenario[]
  bundle: FictionalDemoBundle
}

/** Deterministic fictional portfolio: Horizon Meridian Consulting (demo). */
export function buildFictionalCompanyDemo(
  newId: () => string
): FictionalCompanyDemoPayload {
  const t0 = startOfMonth(new Date())

  const employees: Employee[] = FIRST_NAMES.map((first, i) => {
    const last = LAST_NAMES[i % LAST_NAMES.length]
    const discipline = pick(DISCIPLINES, i)
    const pool = SKILL_POOLS[discipline] ?? ['General']
    const skills = [
      pool[i % pool.length],
      pool[(i + 2) % pool.length],
      pool[(i + 4) % pool.length],
    ].filter((s, j, a) => a.indexOf(s) === j)
    const role = pick(ROLES, i + i * 3)
    const billingRate =
      role.includes('Principal') || role.includes('Director')
        ? 320 + (i % 5) * 10
        : role.includes('Manager')
          ? 265 + (i % 4) * 8
          : role.includes('Senior')
            ? 235 + (i % 3) * 7
            : 175 + (i % 6) * 5
    const certs =
      i % 4 === 0
        ? ['PMP']
        : i % 7 === 0
          ? ['AWS SA', 'Scrum Master']
          : i % 5 === 0
            ? ['CPA']
            : undefined
    return {
      id: newId(),
      name: `${first} ${last}`,
      role,
      discipline,
      skills,
      certifications: certs,
      billingRate,
      previousProjectsSummary: `${pick(['Retail', 'Banking', 'Health', 'Industrials', 'Tech'], i)} sector delivery`,
    }
  })

  const employeeIds = employees.map((e) => e.id)

  const projects: Project[] = PROJECT_SPECS.map((spec) => {
    const start = formatISO(addMonths(t0, spec.monthsStart), {
      representation: 'date',
    })
    const end = formatISO(addMonths(t0, spec.monthsStart + spec.monthsLen), {
      representation: 'date',
    })
    const p: Project = {
      id: newId(),
      externalId: spec.code,
      name: spec.name,
      client: spec.client,
      startDate: start,
      endDate: end,
      budget: spec.budgetK * 1000,
      plannedHours: spec.plannedHours,
      requiredSkills: spec.skills,
      status: spec.status,
      projectKind: spec.kind,
    }
    if (spec.winPct != null && (spec.status === 'pipeline' || spec.kind === 'opportunity'))
      p.winProbability = spec.winPct
    return p
  })

  const projectIds = projects.map((p) => p.id)

  const assignments: Assignment[] = []
  const assignmentIds: string[] = []
  const modes: AssignmentMode[] = ['percent_fte', 'hours_per_week', 'hours_total']

  const pairKey = new Set<string>()
  const baselineCountByEmployee = new Map<string, number>()
  projects.forEach((proj, pi) => {
    const slots = 2 + (pi % 3)
    for (let k = 0; k < slots; k++) {
      const ei = (pi * 7 + k * 13 + k * k) % employees.length
      const emp = employees[ei]
      const n = baselineCountByEmployee.get(emp.id) ?? 0
      if (n >= MAX_ASSIGNMENTS_PER_PERSON_PER_SCENARIO) continue
      const key = `${emp.id}|${proj.id}`
      if (pairKey.has(key)) continue
      pairKey.add(key)
      baselineCountByEmployee.set(emp.id, n + 1)
      const mode = modes[(pi + k) % modes.length]
      const value =
        mode === 'percent_fte'
          ? 0.15 + ((pi + k) % 5) * 0.12
          : mode === 'hours_per_week'
            ? 8 + ((pi + k) % 18) * 2
            : 120 + ((pi + k) % 8) * 80
      const id = newId()
      assignmentIds.push(id)
      assignments.push({
        id,
        employeeId: emp.id,
        projectId: proj.id,
        scenarioId: BASELINE_ID,
        mode,
        value,
        commitment: (pi + k) % 4 === 0 ? 'soft' : 'hard',
        billable: (pi + k) % 11 !== 0,
        roleOnProject:
          k === 0 ? (mode === 'percent_fte' ? 'Engagement lead' : undefined) : undefined,
      })
    }
  })

  const growthScenarioId = newId()
  const extraScenarios: Scenario[] = [
    {
      id: growthScenarioId,
      name: 'FY26 growth case',
      description:
        'Demo scenario — higher demand; cloned staffing from baseline for comparison.',
      plannedHoursMultiplier: 1.14,
      committedHoursMultiplier: 1,
      pipelineDemandMode: 'probability_weighted',
      isBaseline: false,
    },
  ]

  const baselineOnly = assignments.filter((x) => x.scenarioId === BASELINE_ID)
  for (const a of baselineOnly) {
    const id = newId()
    assignmentIds.push(id)
    assignments.push({
      ...a,
      id,
      scenarioId: growthScenarioId,
    })
  }

  const actualTimeEntries: ActualTimeEntry[] = []
  const actualTimeEntryIds: string[] = []
  for (let i = 0; i < 58; i++) {
    const ei = (i * 17) % employees.length
    const pi = (i * 11) % projects.length
    const w0 = subMonths(t0, (i % 4) + Math.floor(i / 15))
    const periodStart = formatISO(startOfMonth(w0), { representation: 'date' })
    const periodEnd = formatISO(addMonths(startOfMonth(w0), 1), {
      representation: 'date',
    })
    const id = newId()
    actualTimeEntryIds.push(id)
    actualTimeEntries.push({
      id,
      employeeId: employees[ei].id,
      projectId: projects[pi].id,
      periodStart,
      periodEnd,
      hours: 16 + (i % 9) * 12,
      billable: i % 6 !== 0,
      notes: i % 7 === 0 ? 'Demo timesheet slice' : undefined,
    })
  }

  const bundle: FictionalDemoBundle = {
    label: 'Horizon Meridian Consulting (fictional demo)',
    employeeIds,
    projectIds,
    assignmentIds,
    actualTimeEntryIds,
    scenarioIds: [growthScenarioId],
  }

  return {
    employees,
    projects,
    assignments,
    actualTimeEntries,
    extraScenarios,
    bundle,
  }
}
