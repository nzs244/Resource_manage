import {
  differenceInCalendarDays,
  max as dfMax,
  min as dfMin,
  parseISO,
  startOfDay,
} from 'date-fns'

export function overlapDays(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): number {
  const as = startOfDay(parseISO(aStart))
  const ae = startOfDay(parseISO(aEnd))
  const bs = startOfDay(parseISO(bStart))
  const be = startOfDay(parseISO(bEnd))
  const s = dfMax([as, bs])
  const e = dfMin([ae, be])
  const d = differenceInCalendarDays(e, s)
  return d >= 0 ? d + 1 : 0
}

export function projectDurationDays(start: string, end: string): number {
  const s = startOfDay(parseISO(start))
  const e = startOfDay(parseISO(end))
  return Math.max(1, differenceInCalendarDays(e, s) + 1)
}

/** Calendar weeks spanned (minimum 1) for weekly allocations */
export function overlapWeeks(
  projStart: string,
  projEnd: string,
  filterStart: string,
  filterEnd: string
): number {
  const days = overlapDays(projStart, projEnd, filterStart, filterEnd)
  if (days <= 0) return 0
  return Math.max(1, Math.ceil(days / 7))
}
