import { addMonths, formatISO, startOfMonth } from 'date-fns'
import { useAppStore } from '../store/useAppStore'
import { Button, Card, Input, Label } from '../components/ui'

export function SettingsPage() {
  const {
    settings,
    setSettings,
    resetDemo,
    dashboardFilters,
    setDashboardFilters,
    fictionalDemoBundle,
    loadFictionalCompanyDemo,
    clearFictionalCompanyDemo,
  } = useAppStore()

  return (
    <div className="space-y-8 text-left">
      <header>
        <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-white">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Defaults for FTE math and dashboard horizon. To share the full app
          state with someone else, use Import / Export → workspace file.
        </p>
      </header>

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold">Capacity defaults</h2>
        <div className="grid max-w-md gap-4">
          <div>
            <Label>Blended hourly rate (optional)</Label>
            <Input
              type="number"
              step="any"
              placeholder="e.g. 200 — used when budget is imported without hours"
              value={settings.blendedHourlyRate ?? ''}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                if (e.target.value === '')
                  setSettings({ blendedHourlyRate: undefined })
                else if (Number.isFinite(v) && v > 0)
                  setSettings({ blendedHourlyRate: v })
              }}
            />
          </div>
          <div>
            <Label>Default billing rate (optional)</Label>
            <Input
              type="number"
              step="any"
              placeholder="e.g. 250 — billable hours × rate on Planning revenue line"
              value={settings.defaultBillingRate ?? ''}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                if (e.target.value === '')
                  setSettings({ defaultBillingRate: undefined })
                else if (Number.isFinite(v) && v > 0)
                  setSettings({ defaultBillingRate: v })
              }}
            />
            <p className="mt-1 text-xs text-slate-500">
              Falls back to blended rate when empty. Used for revenue forecast
              chart only.
            </p>
          </div>
          <div>
            <Label>Hours per week (1.0 FTE)</Label>
            <Input
              type="number"
              value={settings.defaultHoursPerWeek}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (Number.isFinite(v) && v > 0)
                  setSettings({ defaultHoursPerWeek: v })
              }}
            />
          </div>
          <div>
            <Label>Dashboard default horizon (months)</Label>
            <Input
              type="number"
              value={settings.dashboardHorizonMonths}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (Number.isFinite(v) && v > 0) {
                  setSettings({ dashboardHorizonMonths: v })
                  const from = formatISO(startOfMonth(new Date()), {
                    representation: 'date',
                  })
                  const to = formatISO(
                    addMonths(startOfMonth(new Date()), v),
                    { representation: 'date' }
                  )
                  setDashboardFilters({ dateFrom: from, dateTo: to })
                }
              }}
            />
            <p className="mt-1 text-xs text-slate-500">
              Current filter: {dashboardFilters.dateFrom} →{' '}
              {dashboardFilters.dateTo} (adjust on Dashboard anytime).
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-display text-lg font-semibold">Sample data</h2>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Loads a small demo team and two projects. Replaces in-browser data for
          this browser only (export JSON first if you need to keep anything).
        </p>
        <Button variant="secondary" onClick={() => resetDemo()}>
          Load sample data
        </Button>
      </Card>

      <Card className="border-indigo-200/80 bg-indigo-50/40 dark:border-indigo-900/50 dark:bg-indigo-950/25">
        <h2 className="mb-2 font-display text-lg font-semibold text-slate-900 dark:text-white">
          Fictional company demo (medium portfolio)
        </h2>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          <strong>Horizon Meridian Consulting</strong> is entirely fictional: about{' '}
          <strong>36 people</strong>, <strong>22 projects</strong> (pipeline and
          delivery), <strong>~100 baseline assignments</strong> duplicated into a
          second <strong>“FY26 growth case”</strong> scenario, plus{' '}
          <strong>~58 actual-hour entries</strong> for dashboards and planning.
          Use it to stress-test lists, filters, heatmaps, and scenarios.
        </p>
        {fictionalDemoBundle && (
          <p className="mb-4 rounded-xl border border-indigo-200 bg-white/80 px-3 py-2 text-sm text-indigo-900 dark:border-indigo-800 dark:bg-slate-900/60 dark:text-indigo-200">
            Demo data is loaded: <strong>{fictionalDemoBundle.label}</strong> —{' '}
            {fictionalDemoBundle.employeeIds.length} people,{' '}
            {fictionalDemoBundle.projectIds.length} projects tracked for removal.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              if (
                !window.confirm(
                  'Add the fictional Horizon Meridian portfolio to your current workspace? Your existing people and projects stay; demo rows are tagged so you can remove them in one step.'
                )
              )
                return
              loadFictionalCompanyDemo('append')
            }}
          >
            Add fictional company (keep my data)
          </Button>
          <Button
            onClick={() => {
              if (
                !window.confirm(
                  'Replace the entire workspace with the fictional Horizon Meridian demo? Export a workspace file first if you need to keep what you have now.'
                )
              )
                return
              loadFictionalCompanyDemo('replace')
            }}
          >
            Replace with fictional company
          </Button>
          <Button
            variant="danger"
            disabled={!fictionalDemoBundle}
            onClick={() => {
              if (
                !window.confirm(
                  'Remove all fictional Horizon Meridian demo people, projects, assignments, actual hours, and demo scenarios? Other data is left as-is.'
                )
              )
                return
              clearFictionalCompanyDemo()
            }}
          >
            Remove fictional demo
          </Button>
        </div>
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          Workspace JSON export/import preserves the demo tag when present so you
          can still remove it after sharing a file.
        </p>
      </Card>
    </div>
  )
}
