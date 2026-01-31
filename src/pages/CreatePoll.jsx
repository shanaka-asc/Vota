import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/Auth'
import StepBasicInfo from '../components/CreatePoll/StepBasicInfo'
import StepQuestions from '../components/CreatePoll/StepQuestions'
import StepSettings from '../components/CreatePoll/StepSettings'
import confetti from 'canvas-confetti'

const CreatePoll = () => {
    const { id: editId } = useParams()
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(!!editId)
    const [data, setData] = useState({
        title: '',
        description: '',
        template: 'generic',
        questions: [
            { id: 1, text: '', type: 'single', options: ['', ''], isRequired: false }
        ],
        requiresLogin: false,
        allowedDomains: '',
        showResultsInstant: true,
        expiresAt: '',
    })

    useEffect(() => {
        if (editId && user) {
            fetchPollData()
        }
    }, [editId, user])

    const fetchPollData = async () => {
        try {
            const { data: poll, error } = await supabase
                .from('polls')
                .select('*')
                .eq('id', editId)
                .single()

            if (error) throw error
            if (poll.creator_id !== user.id) {
                alert("You don't have permission to edit this poll")
                navigate('/dashboard')
                return
            }

            const { data: questions, error: qError } = await supabase
                .from('poll_questions')
                .select('*, poll_options(*)')
                .eq('poll_id', editId)
                .order('order_index')
                .order('order_index', { foreignTable: 'poll_options' })

            if (qError) throw qError

            // Map to state format
            const mappedQuestions = questions.map(q => ({
                id: q.id, // Keeps DB ID
                text: q.question_text,
                type: q.question_type,
                isRequired: q.is_required,
                options: q.question_type === 'text'
                    ? []
                    : q.poll_options.map(o => ({ id: o.id, text: o.option_text })) // Object for existing options
            }))

            setData({
                title: poll.title,
                description: poll.description || '',
                template: poll.template_type,
                questions: mappedQuestions,
                requiresLogin: poll.requires_login,
                allowedDomains: poll.allowed_domains ? poll.allowed_domains.join(', ') : '',
                showResultsInstant: poll.show_results_instant,
                expiresAt: poll.expires_at || ''
            })

        } catch (err) {
            console.error(err)
            alert('Failed to load poll')
        } finally {
            setInitialLoading(false)
        }
    }

    console.log('CreatePoll render:', { authLoading, user, step })

    if (authLoading || initialLoading) return <div className="container flex-center" style={{ height: '50vh' }}>Loading...</div>;

    if (!user) return (
        <div className="container flex-col flex-center" style={{ height: '60vh' }}>
            <h2 className="text-h2">Please Sign In</h2>
            <p className="text-muted" style={{ marginBottom: '24px' }}>You need to be logged in to create a poll.</p>
            <Link to="/login" className="btn-primary" style={{ textDecoration: 'none' }}>Go to Login</Link>
        </div>
    );

    const updateData = (newData) => setData({ ...data, ...newData })

    const handleCreate = async () => {
        setLoading(true)
        try {
            // Self-heal: Ensure profile exists if logged in
            if (user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: user.id,
                        email: user.email,
                        // We can't easily get metadata here without more calls, but id/email is enough for constraint
                    }, { onConflict: 'id' })

                if (profileError) {
                    console.warn('Profile sync warning:', profileError)
                    // We continue - maybe RLS blocks us, but we tried.
                }
            }

            // 1. Create or Update Poll
            const pollPayload = {
                title: data.title,
                description: data.description,
                template_type: data.template,
                requires_login: data.requiresLogin,
                allowed_domains: data.allowedDomains ? data.allowedDomains.split(',').map(d => d.trim()) : null,
                show_results_instant: data.showResultsInstant,
                expires_at: data.expiresAt || null,
                creator_id: user.id
            }

            // If editing, include ID to upsert
            if (editId) pollPayload.id = editId

            const { data: poll, error: pollError } = await supabase
                .from('polls')
                .upsert(pollPayload)
                .select()
                .single()

            if (pollError) throw pollError

            // 2. Add/Update Questions & Options
            for (let i = 0; i < data.questions.length; i++) {
                const q = data.questions[i]

                const questionPayload = {
                    poll_id: poll.id,
                    question_text: q.text,
                    question_type: q.type,
                    order_index: i,
                    is_required: q.isRequired
                }

                // If it's an existing question (ID is a UUID string vs number/temp ID)
                if (typeof q.id === 'string') questionPayload.id = q.id

                const { data: qData, error: qError } = await supabase
                    .from('poll_questions')
                    .upsert(questionPayload)
                    .select()
                    .single()

                if (qError) throw qError

                if (q.type !== 'text') {
                    // Logic for options: 
                    // If q.options contains objects {id, text}, update. 
                    // If strings, insert.
                    // Mixed array handling needed if we support adding options to existing Q.

                    const optionsToUpsert = q.options
                        .filter(o => {
                            // Handle both string and object options
                            const text = typeof o === 'object' ? o.text : o
                            return text && text.trim() !== ''
                        })
                        .map((o, idx) => {
                            const payload = {
                                question_id: qData.id,
                                option_text: typeof o === 'object' ? o.text : o,
                                order_index: idx
                            }
                            if (typeof o === 'object' && o.id) payload.id = o.id
                            return payload
                        })

                    if (optionsToUpsert.length > 0) {
                        const { error: optError } = await supabase
                            .from('poll_options')
                            .upsert(optionsToUpsert)
                        if (optError) throw optError
                    }
                }
            }

            // Success!
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            })

            setTimeout(() => {
                navigate(`/poll/${poll.id}/success`)
            }, 1000)

        } catch (error) {
            console.error('Error creating poll:', error)
            alert('Failed to create poll: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container" style={{ paddingBottom: '40px' }}>
            <div style={{ maxWidth: '600px', margin: '40px auto' }}>
                {/* Progress Bar */}
                <div style={{ marginBottom: '30px', display: 'flex', gap: '8px' }}>
                    {[1, 2, 3].map(s => (
                        <div
                            key={s}
                            style={{
                                height: '6px', flex: 1, borderRadius: '4px',
                                background: s <= step ? 'var(--color-primary)' : '#e2e8f0',
                                transition: 'background 0.3s'
                            }}
                        />
                    ))}
                </div>

                <div>
                    {step === 1 && (
                        <StepBasicInfo
                            data={data}
                            updateData={updateData}
                            next={() => setStep(2)}
                        />
                    )}
                    {step === 2 && (
                        <StepQuestions
                            data={data}
                            updateData={updateData}
                            next={() => setStep(3)}
                            back={() => setStep(1)}
                        />
                    )}
                    {step === 3 && (
                        <StepSettings
                            data={data}
                            updateData={updateData}
                            next={handleCreate}
                            back={() => setStep(2)}
                            loading={loading}
                            isEdit={!!editId}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

export default CreatePoll
