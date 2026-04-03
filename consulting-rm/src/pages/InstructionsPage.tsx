import { Link } from 'react-router-dom'
import { Card } from '../components/ui'

export function InstructionsPage() {
  return (
    <div className="space-y-8 text-left">
      <header>
        <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-white">
          Instructions
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          How to start the app, what you need installed, and how to move data in
          and out with workspace files and Excel.
        </p>
      </header>

      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold text-slate-900 dark:text-white">
          Big fictional demo (Settings)
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Under <strong>Settings</strong>, use <strong>Fictional company demo</strong>{' '}
          to load <strong>Horizon Meridian Consulting</strong> — a medium-sized
          portfolio with dozens of people and projects, two scenarios, and actual
          hours. You can <strong>remove the entire demo in one click</strong> without
          touching your own data (when you used “add” mode), or replace the whole
          workspace to explore the app from scratch.
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold text-slate-900 dark:text-white">
          Starting the app
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          From the <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-800 dark:bg-slate-800 dark:text-slate-200">consulting-rm</code> folder:
        </p>
        <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li>
            <strong className="text-slate-800 dark:text-slate-200">Recommended:</strong>{' '}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">npm run launch</code>{' '}
            — installs dependencies on first run if needed, starts the dev server,
            and <strong>opens your default web browser</strong> to the app. You do
            not need to copy a URL from the terminal.
          </li>
          <li>
            Alternative:{' '}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">npm run dev</code>{' '}
            — same behavior (browser opens automatically).
          </li>
          <li>
            Production build:{' '}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">npm run build</code>{' '}
            then{' '}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">npm run preview</code>{' '}
            — serves the built app and opens your browser the same way as dev.
          </li>
        </ul>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
          For required software (Node, browser, editor plugins), see the{' '}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">README.md</code>{' '}
          in this project folder.
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold text-slate-900 dark:text-white">
          Where your data lives
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          The app saves progress in this browser&apos;s{' '}
          <strong>local storage</strong>. Clearing site data or using another
          browser or device starts from an empty plan unless you{' '}
          <strong>import a workspace file</strong> or Excel data. Use export
          regularly if you care about backup or sharing.
        </p>
      </Card>

      <Card className="border-violet-200/80 bg-violet-50/40 dark:border-violet-900/50 dark:bg-violet-950/20">
        <h2 className="mb-3 font-display text-lg font-semibold text-slate-900 dark:text-white">
          Workspace file — export (download)
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          A workspace file is a single <strong>JSON</strong> document. It is the
          complete handoff: everything needed for someone else to see the same
          plan in their browser.
        </p>
        <ol className="mt-4 list-inside list-decimal space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li>
            Open{' '}
            <Link
              to="/import"
              className="font-medium text-violet-700 underline decoration-violet-300 hover:text-violet-900 dark:text-violet-400 dark:hover:text-violet-300"
            >
              Import / Export
            </Link>
            .
          </li>
          <li>
            Optionally fill <strong>Label</strong> (used in the downloaded
            filename, e.g. <code className="rounded bg-white/80 px-1 dark:bg-slate-900">resource-hub-2026-04-02-Q2-review.json</code>) and{' '}
            <strong>Notes for recipients</strong> (stored inside the file for context).
          </li>
          <li>
            Click <strong>Download workspace file</strong>. Your browser saves
            the JSON file wherever downloads normally go.
          </li>
        </ol>
        <p className="mt-4 text-sm font-medium text-slate-800 dark:text-slate-200">
          Included in the workspace file
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-400">
          <li>People, projects, assignments</li>
          <li>Logged <strong>actual hours</strong></li>
          <li>All <strong>scenarios</strong></li>
          <li><strong>Settings</strong> (rates, default hours, horizon)</li>
          <li><strong>Dashboard filters</strong> and which scenario is selected (and compare scenario)</li>
        </ul>
      </Card>

      <Card className="border-violet-200/80 bg-violet-50/40 dark:border-violet-900/50 dark:bg-violet-950/20">
        <h2 className="mb-3 font-display text-lg font-semibold text-slate-900 dark:text-white">
          Workspace file — import (load)
        </h2>
        <ol className="list-inside list-decimal space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li>
            Go to{' '}
            <Link
              to="/import"
              className="font-medium text-violet-700 underline decoration-violet-300 hover:text-violet-900 dark:text-violet-400 dark:hover:text-violet-300"
            >
              Import / Export
            </Link>
            .
          </li>
          <li>
            Click <strong>Load workspace file</strong> and choose the{' '}
            <code className="rounded bg-white/80 px-1 dark:bg-slate-900">.json</code> workspace export.
          </li>
          <li>
            Confirm the prompt. <strong>This replaces</strong> the current people,
            projects, assignments, actual hours, scenarios, dashboard filters, and
            settings in <em>this</em> browser with the file contents.
          </li>
        </ol>
        <p className="mt-4 text-sm text-amber-800 dark:text-amber-200/90">
          If you pick a workspace file in the wrong place, use “Merge legacy JSON”
          only when you intend a partial merge (see below)—not for a full workspace.
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold text-slate-900 dark:text-white">
          Merge legacy JSON (advanced)
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Use <strong>Merge legacy JSON</strong> on the Import / Export page when
          you have a <em>flat</em> JSON object (not the full workspace envelope)
          and you want to <strong>merge</strong> catalog fields without wiping
          dashboard layout and active scenario.
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-400">
          <li>
            Merges: employees, projects, assignments, actual hours (if present),
            scenarios, settings (shallow merge with existing settings).
          </li>
          <li>
            Does <strong>not</strong> replace dashboard filters or which scenario
            is selected.
          </li>
          <li>
            A file with <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">format: consulting-rm-workspace</code> must be loaded with{' '}
            <strong>Load workspace file</strong>, not merge.
          </li>
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold text-slate-900 dark:text-white">
          Excel and CSV import
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          On{' '}
          <Link
            to="/import"
            className="font-medium text-violet-700 underline decoration-violet-300 hover:text-violet-900 dark:text-violet-400 dark:hover:text-violet-300"
          >
            Import / Export
          </Link>
          , download the <strong>Excel template</strong> for the expected sheet
          names and structure. You can also open your own{' '}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">.xlsx</code>,{' '}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">.xls</code>, or{' '}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">.csv</code> file.
        </p>
        <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">
          Typical sheets
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-400">
          <li><strong>Personnel</strong> — people upserted by name</li>
          <li><strong>Current_projects</strong> — booked work</li>
          <li><strong>Opportunities</strong> — pipeline projects; repeat project rows for staffing hints</li>
          <li><strong>Assignments</strong> — baseline staffing rows</li>
        </ul>
        <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">
          After choosing a file
        </p>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-slate-600 dark:text-slate-400">
          <li>Pick the sheet if the workbook has multiple tabs.</li>
          <li>
            Choose <strong>Import as</strong> (Personnel, Current projects,
            Opportunities, Assignments, or legacy modes) so column mapping matches
            your data.
          </li>
          <li>Click <strong>Import rows</strong>. Read the status message for counts or errors.</li>
        </ol>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
          <strong>Column reference</strong> (flexible header names are matched in
          the app): Personnel uses Name, Role, Discipline, optional Skills.
          Current projects: Project ID, Name, Start, End, Budget; optional Planned
          hours (or set blended rate in Settings to derive hours from budget).
          Opportunities add per-row Employee, commitment mode/value, role on project;
          re-import replaces baseline assignments for those project IDs. Assignments:
          Employee plus Project ID or project name and value.
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold text-slate-900 dark:text-white">
          Faster editing in the app
        </h2>
        <ul className="list-inside list-disc space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li>
            <strong>People</strong> and <strong>Projects</strong>: use{' '}
            <strong>Filter list</strong> to find rows; <strong>Duplicate</strong>{' '}
            clones a record (name gets a “(copy)” suffix; project external IDs get{' '}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">-copy</code>
            ). Press <kbd className="rounded border border-slate-300 bg-slate-100 px-1 dark:border-slate-600 dark:bg-slate-800">Enter</kbd>{' '}
            on add forms to submit quickly.
          </li>
          <li>
            <strong>Assignments</strong>: change <strong>person</strong>,{' '}
            <strong>project</strong>, or <strong>mode</strong> directly in the
            table; use <strong>Repeat last</strong> after an add to stamp the same
            shape again; <strong>Duplicate</strong> copies a row in the same
            scenario.
          </li>
          <li>
            <strong>Actual hours</strong>: filter long lists; duplicate an entry to
            tweak dates or hours.
          </li>
          <li>
            <strong>Import / Export</strong>: <strong>Quick CSV export</strong>{' '}
            downloads people, projects, or assignments for spreadsheet bulk edits.
          </li>
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold text-slate-900 dark:text-white">
          Quick links
        </h2>
        <ul className="list-inside list-disc text-sm text-slate-600 dark:text-slate-400">
          <li>
            <Link
              to="/import"
              className="font-medium text-violet-700 underline decoration-violet-300 hover:text-violet-900 dark:text-violet-400 dark:hover:text-violet-300"
            >
              Import / Export — run downloads and imports here
            </Link>
          </li>
          <li>
            <Link
              to="/settings"
              className="font-medium text-violet-700 underline decoration-violet-300 hover:text-violet-900 dark:text-violet-400 dark:hover:text-violet-300"
            >
              Settings — sample data, rates, defaults
            </Link>
          </li>
        </ul>
      </Card>
    </div>
  )
}
