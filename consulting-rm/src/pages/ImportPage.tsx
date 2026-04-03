import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { useAppStore, BASELINE_ID } from '../store/useAppStore'
import { Button, Card, Input, Label, Select, TextArea } from '../components/ui'
import type {
  AppSettings,
  AssignmentMode,
  Assignment,
  Employee,
  Project,
  ProjectStatus,
  Scenario,
} from '../types'
import { resolvePlannedHours } from '../lib/plannedFromBudget'
import {
  buildWorkspaceEnvelope,
  safeFilenamePart,
} from '../lib/workspaceFile'
import { downloadCsvText, rowsToCsv } from '../lib/csvExport'

type ImportKind =
  | 'personnel'
  | 'current_projects'
  | 'opportunities'
  | 'employees_legacy'
  | 'projects_legacy'
  | 'assignments'

function norm(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function findCol(headers: string[], candidates: string[]): number {
  const h = headers.map(norm)
  for (const c of candidates) {
    const i = h.indexOf(norm(c))
    if (i >= 0) return i
  }
  return -1
}

function parseDate(v: unknown): string {
  if (v instanceof Date && !isNaN(v.getTime()))
    return v.toISOString().slice(0, 10)
  const s = String(v ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return ''
}

function parseStatus(v: unknown): ProjectStatus {
  const s = norm(v)
  if (s.includes('pipeline')) return 'pipeline'
  if (s.includes('won') || s.includes('sold')) return 'won'
  if (s.includes('active')) return 'active'
  if (s.includes('close')) return 'closed'
  return 'pipeline'
}

export function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [sheet, setSheet] = useState('')
  const [kind, setKind] = useState<ImportKind>('personnel')
  const [message, setMessage] = useState('')
  const [workspaceLabel, setWorkspaceLabel] = useState('')
  const [workspaceNotes, setWorkspaceNotes] = useState('')

  const store = useAppStore()

  const parseFile = async (file: File) => {
    setMessage('')
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    setSheetNames(wb.SheetNames)
    const first = wb.SheetNames[0] ?? ''
    setSheet(first)
    const ws = wb.Sheets[first]
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      defval: '',
    })
    if (json.length === 0) {
      setRows([])
      setHeaders([])
      setMessage('Sheet is empty.')
      return
    }
    const hdrs = Object.keys(json[0])
    setHeaders(hdrs)
    setRows(json)
    setMessage(`Loaded ${json.length} rows from "${first}".`)
  }

  const applySheet = (name: string, wbBuf: ArrayBuffer) => {
    const wb = XLSX.read(wbBuf, { type: 'array' })
    const ws = wb.Sheets[name]
    if (!ws) return
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      defval: '',
    })
    if (json.length === 0) {
      setRows([])
      setHeaders([])
      return
    }
    setHeaders(Object.keys(json[0]))
    setRows(json)
    setMessage(`Showing ${json.length} rows from "${name}".`)
  }

  const onPickSheet = async (name: string) => {
    setSheet(name)
    const f = fileRef.current?.files?.[0]
    if (!f) return
    const buf = await f.arrayBuffer()
    applySheet(name, buf)
  }

  const runImport = () => {
    setMessage('')
    if (rows.length === 0 || headers.length === 0) {
      setMessage('Nothing to import.')
      return
    }

    const blendedRate = useAppStore.getState().settings.blendedHourlyRate

    if (kind === 'personnel') {
      const iName = findCol(headers, ['name', 'employee', 'employee name'])
      const iRole = findCol(headers, ['role', 'title', 'job title'])
      const iDisc = findCol(headers, ['discipline', 'practice', 'service line'])
      const iSkills = findCol(headers, ['skills', 'skill'])
      const iCert = findCol(headers, [
        'certifications',
        'certification',
        'certs',
        'credentials',
      ])
      const iPrev = findCol(headers, [
        'previous projects',
        'past projects',
        'experience',
      ])
      if (iName < 0 || iRole < 0) {
        setMessage('Need columns: Name and Role. Discipline is optional.')
        return
      }
      let n = 0
      for (const r of rows) {
        const vals = headers.map((h) => r[h])
        const name = String(vals[iName] ?? '').trim()
        const role = String(vals[iRole] ?? '').trim()
        if (!name || !role) continue
        const discipline =
          iDisc >= 0 ? String(vals[iDisc] ?? '').trim() || undefined : undefined
        const sk =
          iSkills >= 0
            ? String(vals[iSkills] ?? '')
                .split(/[,;]/)
                .map((x) => x.trim())
                .filter(Boolean)
            : undefined
        const certList =
          iCert >= 0
            ? String(vals[iCert] ?? '')
                .split(/[,;]/)
                .map((x) => x.trim())
                .filter(Boolean)
            : undefined
        const prev =
          iPrev >= 0 ? String(vals[iPrev] ?? '').trim() || undefined : undefined
        const { id } = store.upsertEmployeeByName({
          name,
          role,
          discipline,
          skills: sk,
          certifications: certList,
        })
        if (id && prev)
          useAppStore.getState().updateEmployee(id, {
            previousProjectsSummary: prev,
          })
        n++
      }
      setMessage(`Upserted ${n} personnel rows (matched by name).`)
      return
    }

    if (kind === 'current_projects') {
      const iExt = findCol(headers, [
        'project id',
        'projectid',
        'project code',
        'crm id',
        'id',
        'code',
      ])
      const iName = findCol(headers, ['project name', 'name', 'project'])
      const iStart = findCol(headers, ['start', 'start date'])
      const iEnd = findCol(headers, ['end', 'end date', 'finish'])
      const iBudget = findCol(headers, ['budget'])
      const iHours = findCol(headers, [
        'planned hours',
        'hours',
        'sold hours',
        'contract hours',
      ])
      const iClient = findCol(headers, ['client', 'customer'])
      const iSkills = findCol(headers, ['required skills', 'skills needed'])
      const iStatus = findCol(headers, ['status'])
      if (iExt < 0 || iName < 0 || iStart < 0 || iEnd < 0) {
        setMessage(
          'Current projects need: Project ID, Name, Start date, End date. Add Budget and/or Planned hours (or blended rate in Settings to derive hours from budget).'
        )
        return
      }
      let n = 0
      for (const r of rows) {
        const vals = headers.map((h) => r[h])
        const externalId = String(vals[iExt] ?? '').trim()
        const name = String(vals[iName] ?? '').trim()
        const start = parseDate(vals[iStart])
        const end = parseDate(vals[iEnd])
        const budgetRaw =
          iBudget >= 0
            ? String(vals[iBudget] ?? '').replace(/[^0-9.-]/g, '')
            : ''
        const budget = budgetRaw ? parseFloat(budgetRaw) : NaN
        if (!externalId || !name || !start || !end) continue
        const explicitPh =
          iHours >= 0 ? parseFloat(String(vals[iHours])) : NaN
        const plannedHours = resolvePlannedHours(
          Number.isFinite(budget) ? budget : undefined,
          Number.isFinite(explicitPh) && explicitPh > 0 ? explicitPh : undefined,
          blendedRate
        )
        const client =
          iClient >= 0
            ? String(vals[iClient] ?? '').trim() || undefined
            : undefined
        const req =
          iSkills >= 0
            ? String(vals[iSkills] ?? '')
                .split(/[,;]/)
                .map((x) => x.trim())
                .filter(Boolean)
            : []
        const status: ProjectStatus =
          iStatus >= 0 ? parseStatus(vals[iStatus]) : 'active'
        store.upsertProject({
          externalId,
          name,
          client,
          startDate: start,
          endDate: end,
          budget: Number.isFinite(budget) ? budget : undefined,
          plannedHours,
          requiredSkills: req,
          status,
          projectKind: 'delivery',
        })
        n++
      }
      setMessage(`Upserted ${n} delivery / current projects by Project ID.`)
      return
    }

    if (kind === 'opportunities') {
      const iExt = findCol(headers, [
        'project id',
        'projectid',
        'opportunity id',
        'id',
        'code',
      ])
      const iName = findCol(headers, ['project name', 'name', 'opportunity'])
      const iStart = findCol(headers, ['start', 'start date'])
      const iEnd = findCol(headers, ['end', 'end date', 'finish'])
      const iBudget = findCol(headers, ['budget'])
      const iHours = findCol(headers, ['planned hours', 'hours', 'estimate hours'])
      const iClient = findCol(headers, ['client', 'customer'])
      const iSkills = findCol(headers, ['required skills', 'skills needed'])
      const iEmp = findCol(headers, [
        'employee',
        'resource',
        'person',
        'employee name',
        'staff',
      ])
      const iMode = findCol(headers, ['commitment mode', 'mode', 'type'])
      const iVal = findCol(headers, [
        'commitment value',
        'value',
        'hours',
        'fte',
      ])
      const iRoleP = findCol(headers, ['role on project', 'project role'])

      if (iExt < 0 || iName < 0 || iStart < 0 || iEnd < 0) {
        setMessage(
          'Opportunities need: Project ID, Name, Start date, End date. Budget optional. Same sheet can include Employee + commitment columns per row.'
        )
        return
      }

      type RowSlice = {
        externalId: string
        vals: unknown[]
      }
      const byExt = new Map<string, RowSlice[]>()
      for (const r of rows) {
        const vals = headers.map((h) => r[h])
        const externalId = String(vals[iExt] ?? '').trim()
        if (!externalId) continue
        if (!byExt.has(externalId)) byExt.set(externalId, [])
        byExt.get(externalId)!.push({ externalId, vals })
      }

      const touchedInternalIds: string[] = []
      let projectsUpserted = 0
      let assignmentsAdded = 0

      for (const [, group] of byExt) {
        const first = group[0].vals
        const name = String(first[iName] ?? '').trim()
        const start = parseDate(first[iStart])
        const end = parseDate(first[iEnd])
        if (!name || !start || !end) continue

        const budgetRaw =
          iBudget >= 0
            ? String(first[iBudget] ?? '').replace(/[^0-9.-]/g, '')
            : ''
        const budget = budgetRaw ? parseFloat(budgetRaw) : NaN
        const explicitPh =
          iHours >= 0 ? parseFloat(String(first[iHours])) : NaN
        const plannedHours = resolvePlannedHours(
          Number.isFinite(budget) ? budget : undefined,
          Number.isFinite(explicitPh) && explicitPh > 0 ? explicitPh : undefined,
          blendedRate
        )
        const client =
          iClient >= 0
            ? String(first[iClient] ?? '').trim() || undefined
            : undefined
        const req =
          iSkills >= 0
            ? String(first[iSkills] ?? '')
                .split(/[,;]/)
                .map((x) => x.trim())
                .filter(Boolean)
            : []

        const { id: projectId } = store.upsertProject({
          externalId: group[0].externalId,
          name,
          client,
          startDate: start,
          endDate: end,
          budget: Number.isFinite(budget) ? budget : undefined,
          plannedHours,
          requiredSkills: req,
          status: 'pipeline',
          projectKind: 'opportunity',
        })
        touchedInternalIds.push(projectId)
        projectsUpserted++
      }

      store.replaceBaselineAssignmentsForProjects(touchedInternalIds)

      const nameToEmp = new Map(
        useAppStore.getState().employees.map((e) => [norm(e.name), e.id])
      )
      const extToProj = new Map(
        useAppStore.getState().projects
          .filter((p) => p.externalId)
          .map((p) => [p.externalId!.trim().toLowerCase(), p.id])
      )

      for (const r of rows) {
        const vals = headers.map((h) => r[h])
        const extRaw = String(vals[iExt] ?? '').trim()
        if (!extRaw) continue
        if (iEmp < 0 || iVal < 0) continue
        const en = norm(vals[iEmp])
        const eid = nameToEmp.get(en)
        const pid = extToProj.get(extRaw.toLowerCase())
        if (!eid || !pid) continue
        let mode: AssignmentMode = 'hours_per_week'
        if (iMode >= 0) {
          const m = norm(vals[iMode])
          if (m.includes('percent') || m.includes('fte')) mode = 'percent_fte'
          else if (m.includes('total')) mode = 'hours_total'
          else mode = 'hours_per_week'
        }
        const v = parseFloat(String(vals[iVal]))
        if (!Number.isFinite(v)) continue
        const roleOn =
          iRoleP >= 0
            ? String(vals[iRoleP] ?? '').trim() || undefined
            : undefined
        store.addAssignment({
          employeeId: eid,
          projectId: pid,
          scenarioId: BASELINE_ID,
          mode,
          value: mode === 'percent_fte' ? Math.min(1, v > 1 ? v / 100 : v) : v,
          roleOnProject: roleOn,
        })
        assignmentsAdded++
      }

      setMessage(
        `Opportunities: ${projectsUpserted} projects upserted; baseline staffing rows added: ${assignmentsAdded}. Re-import replaces prior baseline assignments for those opportunity IDs.`
      )
      return
    }

    if (kind === 'employees_legacy') {
      const iName = findCol(headers, ['name', 'employee', 'employee name'])
      const iRole = findCol(headers, ['role', 'title', 'job title'])
      const iSkills = findCol(headers, ['skills', 'skill'])
      const iPrev = findCol(headers, [
        'previous projects',
        'past projects',
        'experience',
      ])
      if (iName < 0 || iRole < 0) {
        setMessage('Need columns for name and role.')
        return
      }
      let n = 0
      for (const r of rows) {
        const vals = headers.map((h) => r[h])
        const name = String(vals[iName] ?? '').trim()
        const role = String(vals[iRole] ?? '').trim()
        if (!name || !role) continue
        const sk =
          iSkills >= 0
            ? String(vals[iSkills] ?? '')
                .split(/[,;]/)
                .map((x) => x.trim())
                .filter(Boolean)
            : []
        const prev =
          iPrev >= 0 ? String(vals[iPrev] ?? '').trim() || undefined : undefined
        store.addEmployee({
          name,
          role,
          skills: sk,
          previousProjectsSummary: prev,
        })
        n++
      }
      setMessage(`Imported ${n} new employees (legacy mode — always adds).`)
      return
    }

    if (kind === 'projects_legacy') {
      const iName = findCol(headers, ['project', 'name', 'project name'])
      const iClient = findCol(headers, ['client', 'customer'])
      const iStart = findCol(headers, ['start', 'start date'])
      const iEnd = findCol(headers, ['end', 'end date', 'finish'])
      const iBudget = findCol(headers, ['budget'])
      const iHours = findCol(headers, [
        'planned hours',
        'hours',
        'sold hours',
        'contract hours',
      ])
      const iSkills = findCol(headers, ['required skills', 'skills needed'])
      const iStatus = findCol(headers, ['status'])
      if (iName < 0 || iStart < 0 || iEnd < 0) {
        setMessage('Need project name, start date, end date columns.')
        return
      }
      let n = 0
      for (const r of rows) {
        const vals = headers.map((h) => r[h])
        const name = String(vals[iName] ?? '').trim()
        const start = parseDate(vals[iStart])
        const end = parseDate(vals[iEnd])
        if (!name || !start || !end) continue
        const client =
          iClient >= 0 ? String(vals[iClient] ?? '').trim() || undefined : undefined
        const budget =
          iBudget >= 0
            ? Number(String(vals[iBudget]).replace(/[^0-9.-]/g, ''))
            : NaN
        const ph = iHours >= 0 ? parseFloat(String(vals[iHours])) : NaN
        const req =
          iSkills >= 0
            ? String(vals[iSkills] ?? '')
                .split(/[,;]/)
                .map((x) => x.trim())
                .filter(Boolean)
            : []
        const status =
          iStatus >= 0 ? parseStatus(vals[iStatus]) : 'pipeline'
        store.addProject({
          name,
          client,
          startDate: start,
          endDate: end,
          budget: Number.isFinite(budget) ? budget : undefined,
          plannedHours: Number.isFinite(ph) && ph > 0 ? ph : 0,
          requiredSkills: req,
          status,
        })
        n++
      }
      setMessage(`Imported ${n} projects (legacy — always adds).`)
      return
    }

    if (kind === 'assignments') {
      const iEmp = findCol(headers, [
        'employee',
        'resource',
        'person',
        'name',
      ])
      const iProj = findCol(headers, [
        'project id',
        'projectid',
        'project',
        'project name',
      ])
      const iMode = findCol(headers, ['mode', 'type', 'commitment mode'])
      const iVal = findCol(headers, ['value', 'hours', 'fte', 'commitment value'])
      const iRole = findCol(headers, ['role on project', 'project role'])
      if (iEmp < 0 || iProj < 0 || iVal < 0) {
        setMessage('Need employee, project (name or Project ID), and value.')
        return
      }

      const emps = useAppStore.getState().employees
      const projs = useAppStore.getState().projects
      const nameToEmp = new Map(emps.map((e) => [norm(e.name), e.id]))
      const nameToProj = new Map(projs.map((p) => [norm(p.name), p.id]))
      const extToProj = new Map(
        projs
          .filter((p) => p.externalId)
          .map((p) => [p.externalId!.trim().toLowerCase(), p.id])
      )

      let n = 0
      for (const r of rows) {
        const vals = headers.map((h) => r[h])
        const en = norm(vals[iEmp])
        const projKey = String(vals[iProj] ?? '').trim()
        const eid = nameToEmp.get(en)
        const pid =
          extToProj.get(projKey.toLowerCase()) ??
          nameToProj.get(norm(projKey))
        if (!eid || !pid) continue
        let mode: AssignmentMode = 'hours_per_week'
        if (iMode >= 0) {
          const m = norm(vals[iMode])
          if (m.includes('percent') || m.includes('fte')) mode = 'percent_fte'
          else if (m.includes('total')) mode = 'hours_total'
          else mode = 'hours_per_week'
        }
        const v = parseFloat(String(vals[iVal]))
        if (!Number.isFinite(v)) continue
        const roleOn =
          iRole >= 0
            ? String(vals[iRole] ?? '').trim() || undefined
            : undefined
        store.addAssignment({
          employeeId: eid,
          projectId: pid,
          scenarioId: BASELINE_ID,
          mode,
          value: mode === 'percent_fte' ? Math.min(1, v > 1 ? v / 100 : v) : v,
          roleOnProject: roleOn,
        })
        n++
      }
      setMessage(`Imported ${n} baseline assignments.`)
    }
  }

  const downloadTemplate = () => {
    const personnel = [
      {
        Name: 'Jane Doe',
        Role: 'Manager',
        Discipline: 'Operations',
        Certifications: 'PMP',
      },
    ]
    const current = [
      {
        'Project ID': 'PRJ-1001',
        'Project name': 'Active client work',
        'Start date': '2026-01-01',
        'End date': '2026-06-30',
        Budget: 600000,
        'Planned hours': 3000,
      },
    ]
    const opps = [
      {
        'Project ID': 'OPP-2001',
        'Project name': 'New logo pursuit',
        'Start date': '2026-02-01',
        'End date': '2026-08-31',
        Budget: 400000,
        Employee: 'Jane Doe',
        'Commitment mode': 'percent_fte',
        'Commitment value': 0.25,
        'Role on project': 'Manager',
      },
      {
        'Project ID': 'OPP-2001',
        'Project name': 'New logo pursuit',
        'Start date': '2026-02-01',
        'End date': '2026-08-31',
        Budget: 400000,
        Employee: 'John Smith',
        'Commitment mode': 'hours_per_week',
        'Commitment value': 8,
        'Role on project': '',
      },
    ]
    const asn = [
      {
        Employee: 'Jane Doe',
        'Project ID': 'PRJ-1001',
        Mode: 'percent_fte',
        Value: 0.5,
      },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(personnel),
      'Personnel'
    )
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(current),
      'Current_projects'
    )
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(opps),
      'Opportunities'
    )
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(asn), 'Assignments')
    XLSX.writeFile(wb, 'resource-manager-template.xlsx')
  }

  const csvStamp = () => new Date().toISOString().slice(0, 10)

  const exportPeopleCsv = () => {
    const st = useAppStore.getState()
    const headers = [
      'Name',
      'Role',
      'Discipline',
      'Skills',
      'Certifications',
      'BillingRate',
      'PreviousProjects',
    ]
    const rows = st.employees.map((e) => [
      e.name,
      e.role,
      e.discipline ?? '',
      e.skills.join(', '),
      (e.certifications ?? []).join(', '),
      e.billingRate != null ? String(e.billingRate) : '',
      (e.previousProjectsSummary ?? '').replace(/\r?\n/g, ' '),
    ])
    downloadCsvText(
      `resource-hub-people-${csvStamp()}.csv`,
      rowsToCsv(headers, rows)
    )
    setMessage('Downloaded people CSV — edit in Excel and re-import as Personnel.')
  }

  const exportProjectsCsv = () => {
    const st = useAppStore.getState()
    const headers = [
      'Project ID',
      'Name',
      'Client',
      'Start',
      'End',
      'Budget',
      'Planned hours',
      'Required skills',
      'Status',
      'Kind',
      'Win probability pct',
    ]
    const rows = st.projects.map((p) => {
      const wp = p.winProbability
      const pct =
        wp == null
          ? ''
          : wp > 1
            ? String(Math.round(wp * 100) / 100)
            : String(Math.round(wp * 10000) / 100)
      return [
        p.externalId ?? '',
        p.name,
        p.client ?? '',
        p.startDate,
        p.endDate,
        p.budget != null ? String(p.budget) : '',
        String(p.plannedHours),
        p.requiredSkills.join(', '),
        p.status,
        p.projectKind ?? 'delivery',
        pct,
      ]
    })
    downloadCsvText(
      `resource-hub-projects-${csvStamp()}.csv`,
      rowsToCsv(headers, rows)
    )
    setMessage(
      'Downloaded projects CSV — align columns with your import sheet or template.'
    )
  }

  const exportAssignmentsCsv = () => {
    const st = useAppStore.getState()
    const em = new Map(st.employees.map((e) => [e.id, e]))
    const pm = new Map(st.projects.map((p) => [p.id, p]))
    const headers = [
      'Scenario',
      'Employee',
      'Project ID',
      'Project name',
      'Mode',
      'Value',
      'Commitment',
      'Billable',
      'Role on project',
    ]
    const rows = st.assignments.map((a) => {
      const sc = st.scenarios.find((s) => s.id === a.scenarioId)
      const e = em.get(a.employeeId)
      const p = pm.get(a.projectId)
      return [
        sc?.name ?? a.scenarioId,
        e?.name ?? a.employeeId,
        p?.externalId ?? '',
        p?.name ?? a.projectId,
        a.mode,
        String(a.value),
        a.commitment ?? 'hard',
        a.billable !== false ? 'yes' : 'no',
        a.roleOnProject ?? '',
      ]
    })
    downloadCsvText(
      `resource-hub-assignments-${csvStamp()}.csv`,
      rowsToCsv(headers, rows)
    )
    setMessage(
      'Downloaded assignments CSV — use as a reference; re-import via Assignments or Opportunities flows as needed.'
    )
  }

  const exportWorkspaceFile = () => {
    const st = useAppStore.getState()
    const payload = {
      employees: st.employees,
      projects: st.projects,
      assignments: st.assignments,
      actualTimeEntries: st.actualTimeEntries,
      fictionalDemoBundle: st.fictionalDemoBundle,
      scenarios: st.scenarios,
      settings: st.settings,
      dashboardFilters: st.dashboardFilters,
      activeScenarioId: st.activeScenarioId,
      compareScenarioId: st.compareScenarioId,
    }
    const envelope = buildWorkspaceEnvelope(payload, {
      label: workspaceLabel,
      notes: workspaceNotes,
    })
    const blob = new Blob([JSON.stringify(envelope, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    const date = new Date().toISOString().slice(0, 10)
    const part = workspaceLabel.trim()
      ? safeFilenamePart(workspaceLabel)
      : 'workspace'
    a.download = `resource-hub-${date}-${part}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setMessage('Workspace file downloaded — send it to teammates to open the same plan.')
  }

  const loadWorkspaceFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as unknown
        const ok = window.confirm(
          'Load this workspace file? This will replace all people, projects, assignments, logged actual hours, scenarios, dashboard filters, and settings in this browser (what you see now will be overwritten).'
        )
        if (!ok) {
          setMessage('Load cancelled.')
          return
        }
        const result = useAppStore.getState().importWorkspace(parsed)
        if (result.ok) {
          const meta =
            parsed &&
            typeof parsed === 'object' &&
            'exportedAt' in parsed &&
            typeof (parsed as { exportedAt?: string }).exportedAt === 'string'
              ? ` (exported ${(parsed as { exportedAt: string }).exportedAt.slice(0, 10)})`
              : ''
          setMessage(`Workspace loaded${meta}. Data is saved in this browser.`)
        } else {
          setMessage(`Could not load file: ${result.error}`)
        }
      } catch {
        setMessage('Invalid JSON file.')
      }
    }
    reader.readAsText(file)
  }

  const mergeLegacyJson = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as Record<
          string,
          unknown
        >
        if (
          data.format === 'consulting-rm-workspace' &&
          data.payload &&
          typeof data.payload === 'object'
        ) {
          setMessage(
            'That file is a full workspace. Use “Load workspace file” instead of merge.'
          )
          return
        }
        useAppStore.getState().importSnapshot({
          employees: data.employees as Employee[] | undefined,
          projects: data.projects as Project[] | undefined,
          assignments: data.assignments as Assignment[] | undefined,
          actualTimeEntries: data.actualTimeEntries as
            | import('../types').ActualTimeEntry[]
            | undefined,
          scenarios: data.scenarios as Scenario[] | undefined,
          settings: data.settings as AppSettings | undefined,
        })
        setMessage(
          'Merged catalog data (people, projects, assignments, actual hours, scenarios, settings). Dashboard filters and selected scenario were not changed.'
        )
      } catch {
        setMessage('Invalid JSON file.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-8 text-left">
      <header>
        <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-white">
          Import / export
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Save a <strong>workspace file</strong> to share the full plan with your
          team. Edits also persist automatically in this browser. Use Excel for
          personnel and project feeds from Power BI or other systems.{' '}
          <Link
            to="/instructions"
            className="font-medium text-violet-700 underline decoration-violet-300 hover:text-violet-900 dark:text-violet-400 dark:hover:text-violet-300"
          >
            Step-by-step import &amp; export instructions
          </Link>
        </p>
      </header>

      <Card>
        <h2 className="mb-2 font-display text-lg font-semibold text-slate-900 dark:text-white">
          Quick CSV export (edit in Excel)
        </h2>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Download current <strong>people</strong>, <strong>projects</strong>, or{' '}
          <strong>assignments</strong> as CSV for bulk edits. Save from Excel as
          CSV or copy into sheets that match the template, then use{' '}
          <strong>Import from Excel / CSV</strong> below. For a full round-trip
          including scenarios and filters, prefer a <strong>workspace JSON</strong>{' '}
          file.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportPeopleCsv}>
            Download people CSV
          </Button>
          <Button variant="secondary" onClick={exportProjectsCsv}>
            Download projects CSV
          </Button>
          <Button variant="secondary" onClick={exportAssignmentsCsv}>
            Download assignments CSV
          </Button>
        </div>
      </Card>

      <Card className="border-violet-200/80 bg-violet-50/40 dark:border-violet-900/50 dark:bg-violet-950/20">
        <h2 className="mb-2 font-display text-lg font-semibold text-slate-900 dark:text-white">
          Workspace file — save & share
        </h2>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          One JSON file contains people, projects, assignments,{' '}
          <strong>actual hours</strong>, <strong>all scenarios</strong>,{' '}
          <strong>dashboard filters</strong>, and which scenario is selected. Teammates use “Load workspace file” to see
          the same view. This is the best way to hand off work between Mac and PC
          or between colleagues.
        </p>
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Label (optional, used in filename)</Label>
            <Input
              value={workspaceLabel}
              onChange={(e) => setWorkspaceLabel(e.target.value)}
              placeholder="e.g. Q2-capacity-review"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Notes for recipients (optional, stored in file)</Label>
            <TextArea
              rows={2}
              value={workspaceNotes}
              onChange={(e) => setWorkspaceNotes(e.target.value)}
              placeholder="e.g. After leadership sync — use Baseline scenario"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportWorkspaceFile}>
            Download workspace file
          </Button>
          <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
            Load workspace file
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) loadWorkspaceFile(f)
                e.target.value = ''
              }}
            />
          </label>
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-display text-lg font-semibold">
          Merge legacy JSON (advanced)
        </h2>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Older flat exports only updated people, projects, assignments,
          scenarios, and settings — <strong>not</strong> dashboard filters or
          which scenario is active. Use this to combine data without replacing
          your current screen layout.
        </p>
        <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
          Merge legacy JSON
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) mergeLegacyJson(f)
              e.target.value = ''
            }}
          />
        </label>
      </Card>

      {message ? (
        <p className="rounded-xl border border-violet-200 bg-violet-50/90 px-4 py-3 text-sm text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
          {message}
        </p>
      ) : null}

      <Card>
        <h2 className="mb-2 font-display text-lg font-semibold">
          Excel template
        </h2>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Sheets: Personnel, Current_projects, Opportunities (with staffing),
          Assignments.
        </p>
        <Button variant="secondary" onClick={downloadTemplate}>
          Download Excel template
        </Button>
      </Card>

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold">
          Import from Excel / CSV
        </h2>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="mb-4 block text-sm"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void parseFile(f)
          }}
        />
        {sheetNames.length > 1 && (
          <div className="mb-4 max-w-xs">
            <Label>Sheet</Label>
            <Select value={sheet} onChange={(e) => void onPickSheet(e.target.value)}>
              {sheetNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="mb-4 max-w-md">
          <Label>Import as</Label>
          <Select
            value={kind}
            onChange={(e) => setKind(e.target.value as ImportKind)}
          >
            <option value="personnel">Personnel (upsert by name — role, discipline)</option>
            <option value="current_projects">
              Current projects (upsert by Project ID — budget, dates)
            </option>
            <option value="opportunities">
              Opportunities + staffing (Project ID; optional Employee / commitment per row)
            </option>
            <option value="assignments">
              Assignments only (baseline — Project ID or project name)
            </option>
            <option value="employees_legacy">Legacy: add employees (always new)</option>
            <option value="projects_legacy">Legacy: add projects (always new)</option>
          </Select>
        </div>
        <Button onClick={runImport}>Import rows</Button>
        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs text-slate-600 dark:bg-slate-900/50 dark:text-slate-400">
          <strong className="text-slate-800 dark:text-slate-200">Reference</strong>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              <strong>Personnel:</strong> Name, Role, Discipline (optional Skills).
            </li>
            <li>
              <strong>Current projects:</strong> Project ID, Name, Start, End, Budget;
              optional Planned hours. If hours omitted, set blended hourly rate in
              Settings to estimate hours from budget.
            </li>
            <li>
              <strong>Opportunities:</strong> same project columns; repeat Project ID
              on multiple rows to attach Employee, Commitment mode (percent_fte /
              hours_per_week / hours_total), Commitment value, Role on project.
              Re-import clears baseline assignments for those IDs then re-adds rows.
            </li>
            <li>
              <strong>Assignments:</strong> Employee + Project ID (or name) + Value.
            </li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
