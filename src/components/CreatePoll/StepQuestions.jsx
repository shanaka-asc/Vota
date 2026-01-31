
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, GripVertical, Type, List, AlignJustify } from 'lucide-react'

const QuestionItem = ({ q, index, updateQuestion, removeQuestion }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="glass"
            style={{ padding: '20px', borderRadius: '16px', marginBottom: '16px', position: 'relative' }}
        >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ color: 'var(--color-text-muted)', paddingTop: '10px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Q{index + 1}</span>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input
                        className="input-glass"
                        placeholder="What do you want to ask?"
                        value={q.text}
                        onChange={e => updateQuestion(index, { ...q, text: e.target.value })}
                        style={{ fontWeight: 600 }}
                    />

                    {/* Simple Type Selector */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {[
                                { id: 'single', label: 'Single Choice', icon: List },
                                { id: 'multiple', label: 'Multiple Choice', icon: List },
                                { id: 'text', label: 'Text Answer', icon: AlignJustify }
                            ].map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => updateQuestion(index, { ...q, type: type.id })}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '6px 12px', borderRadius: '8px', border: 'none',
                                        fontSize: '0.8rem',
                                        background: q.type === type.id ? 'var(--color-primary)' : 'rgba(0,0,0,0.05)',
                                        color: q.type === type.id ? 'white' : 'var(--color-text-muted)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <type.icon size={14} /> {type.label}
                                </button>
                            ))}
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={q.isRequired || false}
                                onChange={e => updateQuestion(index, { ...q, isRequired: e.target.checked })}
                                style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                            />
                            Required
                        </label>
                    </div>

                    {/* Options (if not text) */}
                    {q.type !== 'text' && (
                        <div style={{ marginLeft: '10px', borderLeft: '2px solid rgba(0,0,0,0.05)', paddingLeft: '10px' }}>
                            {q.options.map((opt, optIndex) => (
                                <div key={optIndex} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid var(--color-text-muted)', marginTop: '12px' }} />
                                    <input
                                        className="input-glass"
                                        style={{ padding: '8px', fontSize: '0.9rem', background: 'transparent', borderBottom: '1px solid #ccc', borderRadius: 0 }}
                                        placeholder={`Option ${optIndex + 1}`}
                                        value={opt}
                                        onChange={e => {
                                            const newOpts = [...q.options]
                                            newOpts[optIndex] = e.target.value
                                            updateQuestion(index, { ...q, options: newOpts })
                                        }}
                                    />
                                    {q.options.length > 2 && (
                                        <button onClick={() => {
                                            const newOpts = q.options.filter((_, i) => i !== optIndex)
                                            updateQuestion(index, { ...q, options: newOpts })
                                        }} style={{ background: 'transparent', border: 'none', color: 'var(--color-error)', opacity: 0.6 }}>
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                onClick={() => updateQuestion(index, { ...q, options: [...q.options, ''] })}
                                style={{ color: 'var(--color-primary)', background: 'transparent', border: 'none', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}
                            >
                                <Plus size={16} /> Add Option
                            </button>
                        </div>
                    )}
                </div>

                <button onClick={() => removeQuestion(index)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)' }}>
                    <Trash2 size={18} />
                </button>
            </div>
        </motion.div>
    )
}

const StepQuestions = ({ data, updateData, next, back }) => {
    const addQuestion = () => {
        updateData({
            questions: [
                ...data.questions,
                { id: Date.now(), text: '', type: 'single', options: ['', ''], isRequired: false }
            ]
        })
    }

    const updateQuestion = (index, newQ) => {
        const newQuestions = [...data.questions]
        newQuestions[index] = newQ
        updateData({ questions: newQuestions })
    }

    const removeQuestion = (index) => {
        const newQuestions = data.questions.filter((_, i) => i !== index)
        updateData({ questions: newQuestions })
    }

    return (
        <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex-col gap-4"
        >
            <h2 className="text-h3">Add Questions</h2>

            <div>
                <AnimatePresence>
                    {data.questions.map((q, i) => (
                        <QuestionItem
                            key={q.id}
                            index={i}
                            q={q}
                            updateQuestion={updateQuestion}
                            removeQuestion={removeQuestion}
                        />
                    ))}
                </AnimatePresence>
            </div>

            <button
                onClick={addQuestion}
                className="glass"
                style={{
                    width: '100%', padding: '16px', borderStyle: 'dashed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer'
                }}
            >
                <Plus size={20} /> Add Another Question
            </button>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
                <button className="glass" style={{ padding: '10px 20px', borderRadius: '20px', border: 'none' }} onClick={back}>Back</button>
                <button
                    className="btn-primary"
                    onClick={next}
                    disabled={data.questions.length === 0 || !data.questions[0].text}
                    style={{ opacity: (data.questions.length === 0 || !data.questions[0].text) ? 0.5 : 1 }}
                >
                    Next Step
                </button>
            </div>
        </motion.div>
    )
}

export default StepQuestions
