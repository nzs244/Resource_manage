/** Max concurrent project assignments per person per scenario (UI + duplicate). */
export const MAX_ASSIGNMENTS_PER_PERSON_PER_SCENARIO = 10

export function countAssignmentsForPersonInScenario(
  assignments: { employeeId: string; scenarioId: string }[],
  employeeId: string,
  scenarioId: string
): number {
  return assignments.filter(
    (a) => a.employeeId === employeeId && a.scenarioId === scenarioId
  ).length
}
