/** Derive sold hours when only budget + blended rate are known. */
export function resolvePlannedHours(
  budget: number | undefined,
  explicitPlanned: number | undefined,
  blendedHourlyRate: number | undefined
): number {
  if (explicitPlanned != null && Number.isFinite(explicitPlanned) && explicitPlanned > 0)
    return explicitPlanned
  if (
    budget != null &&
    Number.isFinite(budget) &&
    blendedHourlyRate != null &&
    blendedHourlyRate > 0
  )
    return Math.max(0, Math.round(budget / blendedHourlyRate))
  return 0
}
