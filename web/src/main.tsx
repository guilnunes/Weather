import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Warm up the journal editor so it is ready by the first mood tap.
const warmUp = () => void import('./components/RichTextEditor')
if ('requestIdleCallback' in window) requestIdleCallback(warmUp)
else setTimeout(warmUp, 1500)
