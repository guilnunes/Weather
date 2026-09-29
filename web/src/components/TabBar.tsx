import { Clock, House, Settings } from 'lucide-react'
import { navigate, type Route } from '../lib/router'

type Tab = 'home' | 'history' | 'settings'

const TABS: { key: Tab; label: string; route: Route; Icon: typeof House }[] = [
  { key: 'home', label: 'Home', route: { name: 'home' }, Icon: House },
  { key: 'history', label: 'History', route: { name: 'history' }, Icon: Clock },
  { key: 'settings', label: 'Settings', route: { name: 'settings' }, Icon: Settings },
]

export function TabBar({ active }: { active: Tab }) {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(({ key, label, route, Icon }) => {
        const isActive = key === active
        return (
          <button
            key={key}
            type="button"
            className={`tab${isActive ? ' is-active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            // Tabs swap the page rather than stacking history.
            onClick={() => !isActive && navigate(route, { replace: true })}
          >
            <Icon
              size={30}
              strokeWidth={isActive ? 2.2 : 1.8}
              fill={isActive && key === 'home' ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
            <span>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
