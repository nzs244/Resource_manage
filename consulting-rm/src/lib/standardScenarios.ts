import type { PipelineDemandMode, Scenario } from '../types'

export type StandardScenarioPreset =
  | 'booked_only'
  | 'expected_pipeline'
  | 'optimistic_pipeline'
  | 'pessimistic_pipeline'
  | 'scope_up'
  | 'delivery_slip'

export const STANDARD_SCENARIO_PRESETS: Record<
  StandardScenarioPreset,
  Pick<Scenario, 'name' | 'description' | 'plannedHoursMultiplier' | 'committedHoursMultiplier' | 'pipelineDemandMode'>
> = {
  booked_only: {
    name: 'Booked work only',
    description:
      'Demand from delivery / sold work only — pipeline & opportunity hours excluded from planned demand.',
    plannedHoursMultiplier: 1,
    committedHoursMultiplier: 1,
    pipelineDemandMode: 'exclude_pipeline',
  },
  expected_pipeline: {
    name: 'Expected pipeline',
    description:
      'Pipeline & opportunity demand weighted by each project’s win probability.',
    plannedHoursMultiplier: 1,
    committedHoursMultiplier: 1,
    pipelineDemandMode: 'probability_weighted',
  },
  optimistic_pipeline: {
    name: 'Pipeline upside',
    description:
      'Stronger assumed conversion on pursuits (boost toward full nominal).',
    plannedHoursMultiplier: 1,
    committedHoursMultiplier: 1,
    pipelineDemandMode: 'optimistic_pipeline',
  },
  pessimistic_pipeline: {
    name: 'Pipeline downside',
    description:
      'Conservative view — heavy haircut on pursuit volume vs probability.',
    plannedHoursMultiplier: 1,
    committedHoursMultiplier: 1,
    pipelineDemandMode: 'pessimistic_pipeline',
  },
  scope_up: {
    name: 'Scope +10%',
    description:
      'All planned hours scaled up — stress-test capacity vs scope growth.',
    plannedHoursMultiplier: 1.1,
    committedHoursMultiplier: 1,
    pipelineDemandMode: 'nominal',
  },
  delivery_slip: {
    name: 'Delivery slip (−10% realized)',
    description:
      'Lower committed delivery assumption (efficiency / staffing risk).',
    plannedHoursMultiplier: 1,
    committedHoursMultiplier: 0.9,
    pipelineDemandMode: 'probability_weighted',
  },
}

export const STANDARD_PRESET_LABELS: {
  id: StandardScenarioPreset
  label: string
}[] = [
  { id: 'booked_only', label: 'Booked only' },
  { id: 'expected_pipeline', label: 'Expected pipeline' },
  { id: 'optimistic_pipeline', label: 'Pipeline upside' },
  { id: 'pessimistic_pipeline', label: 'Pipeline downside' },
  { id: 'scope_up', label: 'Scope +10%' },
  { id: 'delivery_slip', label: 'Delivery slip (−10%)' },
]

export function pipelineModeDescription(mode: PipelineDemandMode | undefined): string {
  switch (mode ?? 'nominal') {
    case 'nominal':
      return 'Full nominal hours on pipeline & opportunities.'
    case 'probability_weighted':
      return 'Pipeline hours × win probability.'
    case 'exclude_pipeline':
      return 'Pipeline & opportunities contribute no planned demand.'
    case 'optimistic_pipeline':
      return 'Upside conversion on pursuits.'
    case 'pessimistic_pipeline':
      return 'Downside haircut on pursuits.'
    default:
      return ''
  }
}
