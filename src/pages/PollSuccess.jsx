
import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { QRCodeCanvas } from 'qrcode.react'
import { Copy, Check, ExternalLink, ArrowLeft, Lock, Unlock, Loader2, LayoutDashboard } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/Auth'
import PollResults from './PollResults'

const PollSuccess = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user, loading: authLoading } = useAuth()
    const [poll, setPoll] = useState(null)
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState(false)
    const [toggling, setToggling] = useState(false)

    const shareUrl = `${window.location.origin}/poll/${id}`

    useEffect(() => {
        if (!authLoading) fetchPoll()
    }, [id, user, authLoading])

    const fetchPoll = async () => {
        try {
            const { data, error } = await supabase
                .from('polls')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error

            // Authorization Check
            if (data.creator_id !== user?.id) {
                navigate(`/poll/${id}`)
                return
            }

            setPoll(data)
        } catch (err) {
            console.error('Error fetching poll:', err)
        } finally {
            setLoading(false)
        }
    }

    const togglePollStatus = async () => {
        setToggling(true)
        try {
            const { error } = await supabase
                .from('polls')
                .update({ is_closed: !poll.is_closed })
                .eq('id', id)

            if (error) throw error
            setPoll({ ...poll, is_closed: !poll.is_closed })
        } catch (err) {
            alert('Failed to update poll status: ' + err.message)
        } finally {
            setToggling(false)
        }
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (authLoading || loading) return <div className="container flex-center" style={{ height: '50vh' }}><Loader2 className="spin" /></div>
    if (!poll) return <div className="container flex-center">Poll not found</div>

    return (
        <div className="container" style={{ padding: '40px 20px' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto 40px auto' }}>
                <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', textDecoration: 'none', marginBottom: '32px' }} className="hover-link">
                    <ArrowLeft size={16} /> Back to Dashboard
                </Link>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-col flex-center text-center"
                style={{ marginBottom: '40px' }}
            >
                <div style={{ width: '64px', height: '64px', background: poll.is_closed ? 'var(--color-error)' : 'var(--color-success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: '16px', boxShadow: poll.is_closed ? '0 4px 12px rgba(239, 68, 68, 0.4)' : '0 4px 12px rgba(16, 185, 129, 0.4)' }}>
                    {poll.is_closed ? <Lock size={32} /> : <Check size={32} />}
                </div>
                <h1 className="text-h1 gradient-text" style={{ marginBottom: '8px' }}>
                    {poll.is_closed ? 'Poll Closed' : 'Poll is Live!'}
                </h1>
                <p className="text-muted">
                    {poll.is_closed ? 'Voters can no longer submit responses.' : 'Your poll is live. Share it with your audience.'}
                </p>
            </motion.div>

            {/* Share Section */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="glass"
                style={{ padding: '32px', borderRadius: '24px', maxWidth: '800px', margin: '0 auto 40px auto', display: 'flex', flexDirection: 'column', gap: '24px' }}
            >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <QRCodeCanvas value={shareUrl} size={150} />
                    </div>

                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <h3 className="text-h3" style={{ marginBottom: '12px' }}>Share Link</h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                className="input-glass"
                                readOnly
                                value={shareUrl}
                                style={{ flex: 1, cursor: 'text' }}
                            />
                            <button
                                className="btn-primary"
                                onClick={copyToClipboard}
                                style={{ minWidth: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                                {copied ? <Check size={18} /> : <Copy size={18} />}
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>

                        <div style={{ marginTop: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            <Link to={`/poll/${id}`} className="glass" style={{ padding: '10px 20px', borderRadius: '50px', textDecoration: 'none', color: 'var(--color-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <ExternalLink size={16} /> Open Voting Page
                            </Link>

                            <button
                                onClick={togglePollStatus}
                                disabled={toggling}
                                className="glass"
                                style={{ padding: '10px 20px', borderRadius: '50px', border: 'none', color: poll.is_closed ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                            >
                                {toggling ? <Loader2 className="spin" size={16} /> : (poll.is_closed ? <Unlock size={16} /> : <Lock size={16} />)}
                                {poll.is_closed ? 'Reopen Poll' : 'Close Poll'}
                            </button>

                            <Link to={`/poll/${id}/edit`} className="glass" style={{ padding: '10px 20px', borderRadius: '50px', textDecoration: 'none', color: 'var(--color-text)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <LayoutDashboard size={16} /> Edit Poll
                            </Link>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Real-time Results Embed */}
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '40px' }}>
                <h2 className="text-center text-h2" style={{ marginBottom: '20px' }}>Live Results</h2>
                <PollResults embed={true} pollId={id} />
            </div>
        </div>
    )
}

export default PollSuccess
