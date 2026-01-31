
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/Auth'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Loader2, Lock, AlertTriangle, CheckCircle, Share2, Clock, LayoutDashboard, ArrowRight, ArrowLeft } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { QRCodeCanvas } from 'qrcode.react'

const PollView = () => {
    const { id } = useParams()
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()

    const [poll, setPoll] = useState(null)
    const [questions, setQuestions] = useState([])
    const [loading, setLoading] = useState(true)
    const [answers, setAnswers] = useState({}) // { questionId: { optionId: "...", text: "..." } }
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState(null)
    const [showShare, setShowShare] = useState(false)
    const [hasVoted, setHasVoted] = useState(false)
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

    useEffect(() => {
        fetchPoll()
        checkVoted()
    }, [id, user])

    const checkVoted = async () => {
        // 1. Check LocalStorage (Quick check for anon)
        const localVoted = localStorage.getItem(`voted_${id}`)
        if (localVoted) {
            setHasVoted(true)
            return
        }

        // 2. Check Database (For logged-in users)
        if (user) {
            try {
                const { data, error } = await supabase
                    .from('poll_votes')
                    .select('id')
                    .eq('poll_id', id)
                    .eq('voter_id', user.id)
                    .limit(1)

                if (data && data.length > 0) {
                    setHasVoted(true)
                }
            } catch (err) {
                console.error('Error checking vote status:', err)
            }
        }
    }

    const fetchPoll = async () => {
        try {
            const { data: pollData, error: pollError } = await supabase
                .from('polls')
                .select('*')
                .eq('id', id)
                .single()

            if (pollError) throw pollError
            setPoll(pollData)

            const { data: qData, error: qError } = await supabase
                .from('poll_questions')
                .select('*, poll_options(*)')
                .eq('poll_id', id)
                .order('order_index')
                .order('order_index', { foreignTable: 'poll_options' })

            if (qError) throw qError
            setQuestions(qData)

        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSelectOption = (qId, optionId, type) => {
        setAnswers(prev => {
            const current = prev[qId] || {}
            if (type === 'multiple') {
                const selectedOptions = current.optionIds || []
                const newOptions = selectedOptions.includes(optionId)
                    ? selectedOptions.filter(id => id !== optionId)
                    : [...selectedOptions, optionId]
                return { ...prev, [qId]: { optionIds: newOptions } }
            }
            // Single choice logic
            return { ...prev, [qId]: { optionId } }
        })
    }

    const handleTextChange = (qId, text) => {
        setAnswers(prev => ({ ...prev, [qId]: { text } }))
    }

    const handleNext = () => {
        const currentQ = questions[currentQuestionIndex]
        const ans = answers[currentQ.id]

        // Validate required
        const hasAnswer = ans && (
            (currentQ.question_type === 'multiple' && ans.optionIds && ans.optionIds.length > 0) ||
            (currentQ.question_type !== 'multiple' && (ans.optionId || (ans.text && ans.text.trim().length > 0)))
        )

        if (currentQ.is_required && !hasAnswer) {
            alert(`Please answer the required question`)
            return
        }

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1)
        }
    }

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1)
        }
    }

    const submitVote = async () => {
        if (poll.requires_login && !user) {
            navigate('/login', { state: { returnTo: `/poll/${id}` } })
            return
        }

        if (poll.is_closed) {
            alert("This poll is closed and no longer accepting votes.")
            return
        }

        if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
            alert("This poll has expired and is no longer accepting votes.")
            return
        }

        setSubmitting(true)
        try {
            const votesToInsert = []

            // Validate and Build
            for (const q of questions) {
                const ans = answers[q.id]
                // Check if answered
                const hasAnswer = ans && (
                    (q.question_type === 'multiple' && ans.optionIds && ans.optionIds.length > 0) ||
                    (q.question_type !== 'multiple' && (ans.optionId || (ans.text && ans.text.trim().length > 0)))
                )

                if (q.is_required && !hasAnswer) {
                    alert(`Please answer the required question: "${q.question_text}"`)
                    setSubmitting(false)
                    return
                }

                if (hasAnswer) {
                    if (q.question_type === 'multiple' && ans.optionIds) {
                        ans.optionIds.forEach(optId => {
                            votesToInsert.push({
                                poll_id: poll.id,
                                question_id: q.id,
                                option_id: optId,
                                voter_id: user?.id || null
                            })
                        })
                    } else {
                        votesToInsert.push({
                            poll_id: poll.id,
                            question_id: q.id,
                            option_id: ans.optionId || null,
                            text_response: ans.text || null,
                            voter_id: user?.id || null
                        })
                    }
                }
            }

            if (votesToInsert.length === 0) {
                alert("Please answer at least one question")
                setSubmitting(false)
                return
            }

            const { error: voteError } = await supabase.from('poll_votes').insert(votesToInsert)
            if (voteError) throw voteError

            // Success
            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#6366f1', '#ec4899', '#8b5cf6']
            })

            setHasVoted(true)
            localStorage.setItem(`voted_${id}`, 'true')

            if (poll.show_results_instant) {
                setTimeout(() => navigate(`/poll/${id}/results`), 2000)
            }

        } catch (err) {
            alert(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (loading || authLoading) return <div className="container flex-center" style={{ height: '50vh' }}><Loader2 className="spin" /></div>

    if (error) return <div className="container flex-center" style={{ color: 'var(--color-error)' }}>Error: {error}</div>

    // Access Checks
    if (poll.requires_login && !user) {
        return (
            <div className="container flex-col flex-center" style={{ height: '60vh', textAlign: 'center', gap: '20px' }}>
                <div style={{ padding: '24px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '50%' }}>
                    <Lock size={48} color="var(--color-primary)" />
                </div>
                <h1 className="text-h2">Login Required</h1>
                <p className="text-muted">This poll is private. Please sign in to vote.</p>
                <button className="btn-primary" onClick={() => navigate('/login', { state: { returnTo: `/poll/${id}` } })}>
                    Login with Email
                </button>
            </div>
        )
    }

    // Domain Check (Simple client side, RLS should enforce server side)
    if (poll.allowed_domains && poll.allowed_domains.length > 0 && user) {
        const emailDomain = user.email.split('@')[1]
        if (!poll.allowed_domains.includes(emailDomain)) {
            return (
                <div className="container flex-col flex-center" style={{ height: '60vh', textAlign: 'center', gap: '20px' }}>
                    <AlertTriangle size={48} color="var(--color-error)" />
                    <h1 className="text-h2">Access Denied</h1>
                    <p className="text-muted">Your email domain (@{emailDomain}) is not authorized to vote on this poll.</p>
                </div>
            )
        }
    }

    if (poll.is_closed) {
        return (
            <div className="container flex-col flex-center" style={{ height: '60vh', textAlign: 'center', gap: '20px' }}>
                <div style={{ padding: '24px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%' }}>
                    <Lock size={48} color="var(--color-error)" />
                </div>
                <h1 className="text-h2">Poll Closed</h1>
                <p className="text-muted">This poll is no longer accepting responses.</p>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <button className="btn-primary" onClick={() => navigate(`/poll/${id}/results`)}>View Results</button>
                    {user?.id === poll.creator_id && (
                        <Link to={`/poll/${id}/success`} className="btn-glass" style={{ textDecoration: 'none' }}>Reopen Poll</Link>
                    )}
                </div>
            </div>
        )
    }

    if (hasVoted) {
        if (poll.show_results_instant) {
            navigate(`/poll/${id}/results`)
            return null
        }
        return (
            <div className="container flex-col flex-center" style={{ height: '60vh', textAlign: 'center', gap: '20px' }}>
                <CheckCircle size={64} color="var(--color-success)" />
                <h1 className="text-h2">Vote Recorded!</h1>
                <p className="text-muted">Thank you for participating. Results will be available once the poll is closed.</p>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <button className="btn-primary" onClick={() => navigate('/')}>Go Home</button>
                    {user?.id === poll.creator_id && (
                        <Link to={`/poll/${id}/success`} className="btn-glass" style={{ textDecoration: 'none' }}>Manage Poll</Link>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="container" style={{ padding: '40px 20px', maxWidth: '800px' }}>
            {/* Header */}
            <div style={{ marginBottom: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                        <h1 className="text-h1 gradient-text" style={{ marginBottom: '8px' }}>{poll.title}</h1>
                        {poll.description && <p className="text-muted" style={{ fontSize: '1.2rem' }}>{poll.description}</p>}

                        {poll.expires_at && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                <Clock size={16} /> Ends {formatDistanceToNow(new Date(poll.expires_at), { addSuffix: true })}
                            </div>
                        )}
                    </div>

                    <button
                        className="glass"
                        onClick={() => setShowShare(!showShare)}
                        style={{ borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', color: 'var(--color-primary)' }}
                    >
                        <Share2 size={20} />
                    </button>
                </div>

                <AnimatePresence>
                    {showShare && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div className="glass" style={{ padding: '20px', marginTop: '20px', borderRadius: '16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '20px' }}>
                                <div style={{ background: 'white', padding: '10px', borderRadius: '12px' }}>
                                    <QRCodeCanvas value={window.location.href} size={80} />
                                </div>
                                <div style={{ flex: 1, minWidth: '200px' }}>
                                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>Share this Poll</div>
                                    <input className="input-glass" readOnly value={window.location.href} onClick={e => e.target.select()} style={{ fontSize: '0.9rem', padding: '8px' }} />
                                </div>
                                {user?.id === poll.creator_id && (
                                    <Link to={`/poll/${id}/success`} className="btn-primary" style={{ textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <LayoutDashboard size={16} /> Management
                                    </Link>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Progress Bar */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                    <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                    <span>{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% completed</span>
                </div>
                <div style={{ height: '6px', background: 'var(--glass-border)', borderRadius: '3px', overflow: 'hidden' }}>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                        transition={{ duration: 0.3 }}
                        style={{ height: '100%', background: 'var(--color-primary)' }}
                    />
                </div>
            </div>

            {/* Questions */}
            <div className="flex-col gap-4" style={{ minHeight: '300px' }}>
                <AnimatePresence mode='wait'>
                    {questions.length > 0 && (() => {
                        const q = questions[currentQuestionIndex]
                        return (
                            <motion.div
                                key={q.id}
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="glass"
                                style={{ padding: '24px', borderRadius: '20px' }}
                            >
                                <h3 className="text-h3" style={{ marginBottom: '16px' }}>
                                    {q.question_text}
                                    {q.is_required && <span style={{ color: 'var(--color-error)', marginLeft: '4px' }}>*</span>}
                                </h3>

                                {q.question_type === 'text' ? (
                                    <textarea
                                        className="input-glass"
                                        placeholder="Type your answer here..."
                                        rows={3}
                                        value={answers[q.id]?.text || ''}
                                        onChange={(e) => handleTextChange(q.id, e.target.value)}
                                        autoFocus
                                    />
                                ) : (
                                    <div className="flex-col gap-2">
                                        {q.poll_options.map(opt => {
                                            const isMultiple = q.question_type === 'multiple'
                                            const isSelected = isMultiple
                                                ? answers[q.id]?.optionIds?.includes(opt.id)
                                                : answers[q.id]?.optionId === opt.id

                                            return (
                                                <motion.div
                                                    key={opt.id}
                                                    whileHover={{ scale: 1.01 }}
                                                    onClick={() => handleSelectOption(q.id, opt.id, q.question_type)}
                                                    style={{
                                                        padding: '16px',
                                                        borderRadius: '12px',
                                                        border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--glass-border)',
                                                        background: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'white',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '20px', height: '20px',
                                                        borderRadius: isMultiple ? '4px' : '50%',
                                                        border: isSelected ? '6px solid var(--color-primary)' : '2px solid #ccc',
                                                        background: isMultiple && isSelected ? 'var(--color-primary)' : 'transparent',
                                                        transition: 'all 0.2s',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        {isMultiple && isSelected && <CheckCircle size={12} color="white" />}
                                                    </div>
                                                    <span style={{ fontSize: '1.1rem', fontWeight: isSelected ? 600 : 400 }}>{opt.option_text}</span>
                                                </motion.div>
                                            )
                                        })}
                                    </div>
                                )}
                            </motion.div>
                        )
                    })()}
                </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                    className="btn-glass"
                    onClick={handlePrev}
                    disabled={currentQuestionIndex === 0}
                    style={{
                        padding: '12px 24px',
                        opacity: currentQuestionIndex === 0 ? 0 : 1,
                        pointerEvents: currentQuestionIndex === 0 ? 'none' : 'auto',
                        display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                >
                    <ArrowLeft size={20} /> Previous
                </button>

                {currentQuestionIndex === questions.length - 1 ? (
                    <button
                        className="btn-primary"
                        onClick={submitVote}
                        disabled={submitting}
                        style={{ padding: '16px 48px', fontSize: '1.2rem', minWidth: '180px' }}
                    >
                        {submitting ? <Loader2 className="spin" /> : 'Submit Vote'}
                    </button>
                ) : (
                    <button
                        className="btn-primary"
                        onClick={handleNext}
                        style={{ padding: '16px 32px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        Next <ArrowRight size={20} />
                    </button>
                )}
            </div>
        </div>
    )
}

export default PollView
