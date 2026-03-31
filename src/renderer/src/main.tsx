import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '@fontsource/literata/latin-400.css'
import '@fontsource/literata/latin-600.css'
import '@fontsource/spline-sans/latin-400.css'
import '@fontsource/spline-sans/latin-500.css'
import 'leaflet/dist/leaflet.css'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
