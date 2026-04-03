import {
  addWeeks,
  differenceInCalendarDays,
  format,
  formatISO,
  max as dfMax,
  min as dfMin,
  parseISO,
  startOfDay,
  startOfWeek,
} from 'date-fns'

export interface WeekBucket {
  key: string
  start: string
  end: string
  label: string
}

/** Weeks overlapping [dateFrom, dateTo], clipped to range (Mon-start weeks). */
export function weeksOverlappingRange(
  dateFrom: string,
  dateTo: string
): WeekBucket[] {
  const from = startOfDay(parseISO(dateFrom))
  const to = startOfDay(parseISO(dateTo))
  if (from > to) return []

  let cur = startOfWeek(from, { weekStartsOn: 1 })
  const out: WeekBucket[] = []

  while (cur <= to) {
    const weekEnd = addWeeks(cur, 1)
    const segEnd = new Date(weekEnd.getTime() - 86400000)
    const segStart = dfMax([cur, from])
    const segEndClipped = dfMin([segEnd, to])
    if (segStart <= segEndClipped) {
      out.push({
        key: format(cur, 'yyyy-MM-dd'),
        start: formatISO(segStart, { representation: 'date' }),
        end: formatISO(segEndClipped, { representation: 'date' }),
        label: format(cur, 'MMM d'),
      })
    }
    cur = addWeeks(cur, 1)
  }
  return out
}

/** Capacity hours for one FTE in this bucket (calendar-prorated week). */
export function bucketFteHours(
  bucketStart: string,
  bucketEnd: string,
  hoursPerWeek: number
): number {
  const s = startOfDay(parseISO(bucketStart))
  const e = startOfDay(parseISO(bucketEnd))
  const days = Math.max(0, differenceInCalendarDays(e, s) + 1)
  return (days / 7) * hoursPerWeek
}
