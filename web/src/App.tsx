import { useRoute } from './lib/router'
import { EntryScreen, NewEntryScreen } from './screens/EntryScreen'
import { History } from './screens/History'
import { Home } from './screens/Home'
import { Settings } from './screens/Settings'

export function App() {
  const route = useRoute()
  return (
    <div className="app-frame">
      {route.name === 'home' && <Home />}
      {route.name === 'history' && <History />}
      {route.name === 'settings' && <Settings />}
      {route.name === 'new' && <NewEntryScreen mood={route.mood} at={route.at} />}
      {route.name === 'entry' && <EntryScreen id={route.id} />}
    </div>
  )
}
