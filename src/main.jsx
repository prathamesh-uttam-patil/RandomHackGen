import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

// Initialize dark mode from localStorage or system preference
const initTheme = () => {
  const stored = localStorage.getItem('theme')
  if (stored) {
    document.documentElement.classList.toggle('dark', stored === 'dark')
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', prefersDark)
    localStorage.setItem('theme', prefersDark ? 'dark' : 'light')
  }
}

initTheme()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

