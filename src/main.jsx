import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App'
import './styles/index.css'

Sentry.init({
  dsn: "https://96b64c786f66e79fc327fd347aff3c25@o4511563973394432.ingest.us.sentry.io/4511563979423744",
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD, // only track errors in production, not dev
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)