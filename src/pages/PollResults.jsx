import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/Auth'
import { motion } from 'framer-motion'
import { Loader2, ArrowLeft, AlertTriangle, AlertCircle, LayoutDashboard, Lock, Download } from 'lucide-react'

const PollResults = (props) => {
    const { user } = useAuth()
    const { id: paramId } = useParams()
    const id = props.pollId || paramId

    const [poll, setPoll] = useState(null)
    const [questions, setQuestions] = useState([])
    const [options, setOptions] = useState([])
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchMetadata = async () => {
        const { data: pollData, error: pollError } = await supabase.from('polls').select('*').eq('id', id).single()
        if (pollError) throw pollError
        setPoll(pollData)

        const { data: qData, error: qError } = await supabase.from('poll_questions').select('*').eq('poll_id', id).order('order_index')
        if (qError) throw qError
        setQuestions(qData)

        const { data: optData, error: optError } = await supabase.from('poll_options').select('*').in('question_id', qData.map(q => q.id))
        if (optError) throw optError
        setOptions(optData)

        return { poll: pollData, questions: qData, options: optData }
    }

    const fetchVotes = useCallback(async (passedQuestions = null, passedOptions = null) => {
        const activeQuestions = passedQuestions || questions
        const activeOptions = passedOptions || options

        if (!activeQuestions || activeQuestions.length === 0) return

        try {
            const { data: votes, error: voteError } = await supabase.from('poll_votes').select('*').eq('poll_id', id)
            if (voteError) throw voteError

            const res = activeQuestions.map(q => {
                const qOptions = activeOptions.filter(o => o.question_id === q.id)
                const qVotes = votes.filter(v => v.question_id === q.id)

                if (q.question_type === 'text') {
                    return {
                        ...q,
                        totalVotes: qVotes.length,
                        type: 'text',
                        answers: qVotes.map(v => v.text_response).filter(Boolean)
                    }
                }

                const stats = qOptions.map(opt => {
                    const count = qVotes.filter(v => v.option_id === opt.id).length
                    const uniqueVoters = new Set(qVotes.map(v => v.voter_id || v.voter_ip)).size
                    return { ...opt, count, percent: uniqueVoters ? (count / uniqueVoters) * 100 : 0 }
                })

                stats.sort((a, b) => b.count - a.count)
                return { ...q, options: stats, totalVotes: qVotes.length, type: 'choice' }
            })

            setResults(res)
        } catch (err) {
            console.error('Error fetching votes:', err)
        }
    }, [id, questions, options])

    useEffect(() => {
        if (!id) return

        const loadInitialData = async () => {
            try {
                const meta = await fetchMetadata()
                if (meta) {
                    await fetchVotes(meta.questions, meta.options)
                }
            } catch (err) {
                console.error('Initial load error:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        loadInitialData()
    }, [id])

    useEffect(() => {
        if (!id) return

        const channel = supabase
            .channel(`poll-results-${id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'poll_votes',
                filter: `poll_id=eq.${id}`
            }, () => {
                fetchVotes()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [id, fetchVotes])

    // Secondary effect to compute results when questions/options/votes are loaded
    // (Handled inside fetchVotes for simplicity in this refactor, but could be separate useMemo)

    const handleExportCSV = async () => {
        try {
            // Fetch all votes with related data
            const { data: votes, error: voteError } = await supabase
                .from('poll_votes')
                .select('*')
                .eq('poll_id', id)

            if (voteError) throw voteError

            if (!votes || votes.length === 0) {
                alert('No votes to export.')
                return
            }

            // Fetch voter profiles for email addresses
            const voterIds = [...new Set(votes.map(v => v.voter_id).filter(Boolean))]
            let profileMap = {}

            if (voterIds.length > 0) {
                const { data: profiles, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, email')
                    .in('id', voterIds)

                if (!profileError && profiles) {
                    profiles.forEach(p => profileMap[p.id] = p.email)
                }
            }

            // Prepare Maps
            const optionMap = {}
            options.forEach(o => optionMap[o.id] = o.option_text)

            // Group votes by Voter ID or IP
            const votesByVoter = {}
            votes.forEach(vote => {
                // Use voter_id if available, otherwise fallback to IP
                const voterKey = vote.voter_id || vote.voter_ip || 'anonymous'

                if (!votesByVoter[voterKey]) {
                    votesByVoter[voterKey] = {
                        voterIdentifier: vote.voter_id ? (profileMap[vote.voter_id] || 'Unknown User') : 'Anonymous',
                        timestamp: new Date(vote.created_at), // Initial timestamp
                        answers: {} // question_id -> response string
                    }
                }

                // Update timestamp to the latest vote if multiple (though unusual for strict polls, good for safety)
                const voteTime = new Date(vote.created_at)
                if (voteTime > votesByVoter[voterKey].timestamp) {
                    votesByVoter[voterKey].timestamp = voteTime
                }

                // Determine response text
                let responseText = ''
                if (vote.text_response) {
                    responseText = vote.text_response
                } else if (vote.option_id) {
                    responseText = optionMap[vote.option_id] || 'Unknown Option'
                }

                // If multiple-choice allowed, we might want to concatenate or just overwrite. 
                // For now, assuming single choice or simple overwrite, but let's handle basic concatenation if needed
                // in case specific Q types allow multiple selections.
                if (votesByVoter[voterKey].answers[vote.question_id]) {
                    votesByVoter[voterKey].answers[vote.question_id] += `; ${responseText}`
                } else {
                    votesByVoter[voterKey].answers[vote.question_id] = responseText
                }
            })

            // Construct CSV
            // Header: Timestamp, Voter Email, [Question 1], [Question 2], ...
            let csvContent = "Timestamp,Voter Email"
            questions.forEach(q => {
                csvContent += `,${`"${q.question_text.replace(/"/g, '""')}"`}`
            })
            csvContent += "\n"

            // Rows
            Object.values(votesByVoter).forEach(voterData => {
                const timestamp = voterData.timestamp.toLocaleString()
                const email = voterData.voterIdentifier

                let row = `"${timestamp}","${email}"`

                questions.forEach(q => {
                    const ans = voterData.answers[q.id] || ''
                    row += `,${`"${ans.replace(/"/g, '""')}"`}`
                })

                csvContent += row + "\n"
            })

            // Trigger download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.setAttribute('href', url)
            link.setAttribute('download', `poll-results-${id}.csv`)
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

        } catch (err) {
            console.error('Error exporting CSV:', err)
            alert('Failed to export results.')
        }
    }

    if (loading) return <div className="container flex-center" style={{ height: '30vh' }}><Loader2 className="spin" /></div>

    if (error) return (
        <div className="container flex-center flex-col" style={{ padding: '60px', gap: '16px' }}>
            <AlertCircle color="var(--color-error)" size={48} />
            <p className="text-muted">Error loading results: {error}</p>
        </div>
    )

    if (!poll) return (
        <div className="container flex-center flex-col" style={{ padding: '60px', gap: '16px' }}>
            <AlertTriangle color="var(--color-text-muted)" size={48} />
            <p className="text-muted">Poll not found</p>
        </div>
    )

    const canSeeResults = user?.id === poll.creator_id || poll.show_results_instant || poll.is_closed;

    if (!canSeeResults) {
        return (
            <div className="container" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto' }} className="glass">
                    <div style={{ padding: '40px' }}>
                        <Lock size={48} style={{ marginBottom: '20px', color: 'var(--color-primary)' }} />
                        <h2 className="text-h2">Results are Hidden</h2>
                        <p className="text-muted" style={{ marginBottom: '24px' }}>
                            The organizer has disabled live results. Results will be visible once the poll is closed.
                        </p>
                        <Link to={`/poll/${id}`} className="btn-primary" style={{ textDecoration: 'none' }}>Back to Poll</Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="container" style={{ padding: props.embed ? '0' : '40px 20px', maxWidth: '800px' }}>
            {!props.embed && (
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                        <div>
                            <Link to={`/poll/${id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: 'var(--color-text-muted)' }} className="hover-link">
                                <ArrowLeft size={16} /> Back to Vote
                            </Link>

                            <h1 className="text-h1 gradient-text" style={{ marginBottom: '8px' }}>Results</h1>
                            <p className="text-muted" style={{ fontSize: '1.2rem' }}>{poll.title}</p>
                        </div>
                        {user?.id === poll.creator_id && (
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={handleExportCSV} className="btn-glass" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <Download size={18} /> Export CSV
                                </button>
                                <Link to="/dashboard" className="btn-glass" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <LayoutDashboard size={18} /> Dashboard
                                </Link>
                                <Link to={`/poll/${id}/success`} className="btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Manage
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="flex-col gap-4">
                {results.length === 0 ? (
                    <div className="glass" style={{ padding: '40px', textAlign: 'center', borderRadius: '24px' }}>
                        <p className="text-muted">No votes yet. Results will appear here in real-time.</p>
                    </div>
                ) : (
                    results.map((q, i) => (
                        <motion.div
                            key={q.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="glass"
                            style={{ padding: '24px', borderRadius: '24px' }}
                        >
                            <h3 className="text-h3" style={{ marginBottom: '20px' }}>{q.question_text}</h3>
                            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>{q.totalVotes} votes</div>

                            {q.type === 'text' ? (
                                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                    {q.answers.map((ans, idx) => (
                                        <div key={idx} style={{ padding: '12px', background: 'rgba(255,255,255,0.5)', marginBottom: '8px', borderRadius: '8px' }}>
                                            "{ans}"
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex-col gap-2">
                                    {q.options.map(opt => (
                                        <div key={opt.id} style={{ position: 'relative', marginBottom: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', position: 'relative', zIndex: 1 }}>
                                                <span style={{ fontWeight: 600 }}>{opt.option_text}</span>
                                                <span>{Math.round(opt.percent)}% ({opt.count})</span>
                                            </div>
                                            <div style={{ height: '12px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${opt.percent}%` }}
                                                    transition={{ duration: 1, ease: 'easeOut' }}
                                                    style={{ height: '100%', background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))' }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    )
}

export default PollResults
