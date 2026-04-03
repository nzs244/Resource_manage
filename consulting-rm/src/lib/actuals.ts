import type { ActualTimeEntry, AppSettings, Employee } from '../types'
import { overlapDays } from './dates'
import { effectiveBillingRate } from './billing'

/** Prorate logged hours by overlap with [filterStart, filterEnd]. */
export function actualEntryHoursInWindow(
  entry: Pick<ActualTimeEntry, 'periodStart' | 'periodEnd' | 'hours'>,
  filterStart: string,
  filterEnd: string
): number {
  const overlap = overlapDays(
    entry.periodStart,
    entry.periodEnd,
    filterStart,
    filterEnd
  )
  if (overlap <= 0) return 0
  const span = overlapDays(
    entry.periodStart,
    entry.periodEnd,
    entry.periodStart,
    entry.periodEnd
  )
  if (span <= 0) return 0
  return entry.hours * (overlap / span)
}

export function sumActualHoursInWindow(
  entries: ActualTimeEntry[],
  employeeId: string | null,
  projectId: string | null,
  filterStart: string,
  filterEnd: string,
  opts?: { billableOnly?: boolean }
): number {
  let sum = 0
  for (const e of entries) {
    if (employeeId && e.employeeId !== employeeId) continue
    if (projectId && e.projectId !== projectId) continue
    if (opts?.billableOnly && e.billable === false) continue
    sum += actualEntryHoursInWindow(e, filterStart, filterEnd)
  }
  return sum
}

export function actualRevenueInWindow(
  entries: ActualTimeEntry[],
  employees: Employee[],
  settings: AppSettings,
  filterStart: string,
  filterEnd: string
): number {
  const emap = new Map(employees.map((x) => [x.id, x]))
  let rev = 0
  for (const e of entries) {
    if (e.billable === false) continue
    const hrs = actualEntryHoursInWindow(e, filterStart, filterEnd)
    if (hrs <= 0) continue
    const emp = emap.get(e.employeeId)
    if (!emp) continue
    const rate = effectiveBillingRate(emp, settings)
    rev += hrs * rate
  }
  return rev
}
