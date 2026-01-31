
import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, ArrowRight, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/Auth'

const Login = () => {
    const { signIn } = useAuth()
    const location = useLocation()
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState('')
    const [cooldown, setCooldown] = useState(0)

    React.useEffect(() => {
        let timer
        if (cooldown > 0) {
            timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
        }
        return () => clearTimeout(timer)
    }, [cooldown])

    React.useEffect(() => {
        if (!location.state?.returnTo) {
            localStorage.removeItem('vota_return_path')
        }
    }, [location.state])

    const handleLogin = async (e) => {
        e.preventDefault()
        if (cooldown > 0) return

        setLoading(true)
        setError('')

        if (location.state?.returnTo) {
            localStorage.setItem('vota_return_path', location.state.returnTo)
        }

        const { error } = await signIn(email)

        if (error) {
            if (error.status === 429) {
                setError('Too many requests. Please wait a minute before trying again.')
                setCooldown(60)
            } else {
                setError(error.message)
            }
        } else {
            setSent(true)
        }
        setLoading(false)
    }

    return (
        <div className="container flex-center" style={{ minHeight: '80vh' }}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="glass"
                style={{ padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '400px', textAlign: 'center' }}
            >
                <h1 className="text-h2" style={{ marginBottom: '8px' }}>Welcome Back</h1>
                <p className="text-muted" style={{ marginBottom: '32px' }}>Sign in to create manage your polls.</p>

                {sent ? (
                    <div style={{ color: 'var(--color-success)', background: 'rgba(16, 185, 129, 0.1)', padding: '20px', borderRadius: '12px' }}>
                        <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>Check your email!</h3>
                        <p>We sent a magic link to {email}.</p>
                    </div>
                ) : (
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ position: 'relative' }}>
                            <Mail size={20} color="var(--color-text-muted)" style={{ position: 'absolute', left: '12px', top: '14px' }} />
                            <input
                                type="email"
                                required
                                placeholder="name@example.com"
                                className="input-glass"
                                style={{ paddingLeft: '44px' }}
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>

                        {error && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: '#ef4444',
                                background: 'rgba(239, 68, 68, 0.1)',
                                padding: '12px',
                                borderRadius: '8px',
                                fontSize: '0.875rem'
                            }}>
                                <AlertCircle size={16} />
                                <p>{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading || cooldown > 0}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                            {loading ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Send Magic Link'}
                            {!loading && cooldown === 0 && <ArrowRight size={18} />}
                        </button>
                    </form>
                )}
            </motion.div>
        </div>
    )
}

export default Login
