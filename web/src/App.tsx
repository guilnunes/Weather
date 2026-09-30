import { useEffect } from 'react'
import { hasConsented, useAuth } from './lib/auth'
import { navigate, useRoute, type Route } from './lib/router'
import { isConfigured } from './lib/supabase'
import { Consent, ForgotPassword, Loading, NotConfigured, SetNewPassword, SignIn, SignUp } from './screens/Auth'
import { EntryScreen, NewEntryScreen } from './screens/EntryScreen'
import { History } from './screens/History'
import { Home } from './screens/Home'
import { Settings } from './screens/Settings'

const SIGNED_OUT_ROUTES: Route['name'][] = ['signin', 'signup', 'forgot']

export function App() {
  return (
    <div className="app-frame">
      <Gate />
    </div>
  )
}

/** An account is required: signed-out visitors only see the account pages. */
function Gate() {
  const auth = useAuth()
  const route = useRoute()

  if (!isConfigured) return <NotConfigured />
  if (auth.status === 'loading') return <Loading />
  if (auth.status === 'recovery') return <SetNewPassword />

  if (auth.status === 'signedOut') {
    if (route.name === 'signup') return <SignUp />
    if (route.name === 'forgot') return <ForgotPassword />
    return <SignIn />
  }

  if (!hasConsented(auth.user)) return <Consent email={auth.user.email} />

  // Signed in: the account pages lead home.
  if (SIGNED_OUT_ROUTES.includes(route.name)) return <GoHome />

  switch (route.name) {
    case 'history':
      return <History />
    case 'settings':
      return <Settings />
    case 'new':
      return <NewEntryScreen mood={route.mood} at={route.at} />
    case 'entry':
      return <EntryScreen id={route.id} />
    default:
      return <Home />
  }
}

function GoHome() {
  useEffect(() => navigate({ name: 'home' }, { replace: true }), [])
  return <Loading />
}
