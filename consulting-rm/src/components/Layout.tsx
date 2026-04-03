import {
  BarChart3,
  Briefcase,
  CalendarRange,
  ClipboardList,
  Clock,
  Database,
  BookOpen,
  GitBranch,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import clsx from 'clsx'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/planning', label: 'Planning', icon: CalendarRange },
  { to: '/people', label: 'People', icon: Users },
  { to: '/projects', label: 'Projects', icon: Briefcase },
  { to: '/assignments', label: 'Assignments', icon: ClipboardList },
  { to: '/actuals', label: 'Actual hours', icon: Clock },
  { to: '/scenarios', label: 'Scenarios', icon: GitBranch },
  { to: '/import', label: 'Import / Export', icon: Database },
  { to: '/instructions', label: 'Instructions', icon: BookOpen },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Layout() {
  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 flex h-svh w-56 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-4 dark:border-slate-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="text-left">
            <div className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Resource Hub
            </div>
            <div className="text-xs text-slate-500">Consulting</div>
          </div>
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2 pb-0">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-200'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-slate-100 p-3 dark:border-slate-800">
          <p className="text-left text-[11px] leading-snug text-slate-500 dark:text-slate-400">
            Progress saves automatically in this browser.{' '}
            <Link
              to="/import"
              className="font-medium text-violet-600 hover:underline dark:text-violet-400"
            >
              Export a workspace file
            </Link>{' '}
            or read{' '}
            <Link
              to="/instructions"
              className="font-medium text-violet-600 hover:underline dark:text-violet-400"
            >
              Instructions
            </Link>
            .
          </p>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
