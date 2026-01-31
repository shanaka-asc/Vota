
import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AuthProvider } from './contexts/Auth'
import Layout from './components/Layout'
import CreatePoll from './pages/CreatePoll'
import Login from './pages/Login'
import PollView from './pages/PollView'
import PollResults from './pages/PollResults'
import PollSuccess from './pages/PollSuccess'
import Dashboard from './pages/Dashboard'

// Placeholder Pages (Will be implemented soon)
const Home = () => (
  <div className="container flex-col flex-center" style={{ minHeight: '80vh', gap: '2rem', textAlign: 'center' }}>
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-h1 gradient-text" style={{ fontSize: '4rem', marginBottom: '1rem' }}>Vota</h1>
      <p className="text-muted" style={{ fontSize: '1.5rem', maxWidth: '600px' }}>
        The premium way to gather opinions. <br />
        Real-time, secure, and beautifully designed.
      </p>
    </motion.div>

    <div className="flex-center gap-4">
      <Link className="btn-primary" to="/create" style={{ display: 'inline-block', textDecoration: 'none', fontSize: '1.2rem', padding: '16px 32px' }}>
        Create Poll
      </Link>
    </div>
  </div>
)

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreatePoll />} />
            <Route path="/poll/:id/edit" element={<CreatePoll />} />
            <Route path="/poll/:id" element={<PollView />} />
            <Route path="/poll/:id/results" element={<PollResults />} />
            <Route path="/poll/:id/success" element={<PollSuccess />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  )
}

export default App
