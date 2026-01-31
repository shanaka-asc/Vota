
import React from 'react'
import { motion } from 'framer-motion'
import { Calendar, Users, Trophy, AlignLeft } from 'lucide-react'

const templates = [
    { id: 'generic', icon: AlignLeft, label: 'Generic', desc: 'Standard poll' },
    { id: 'event', icon: Users, label: 'Event', desc: 'Plan an event' },
    { id: 'date', icon: Calendar, label: 'Date', desc: 'Find a time' },
    { id: 'nomination', icon: Trophy, label: 'Nomination', desc: 'Vote for best' },
]

const StepBasicInfo = ({ data, updateData, next }) => {
    return (
        <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex-col gap-4"
        >
            <div>
                <label className="text-muted" style={{ display: 'block', marginBottom: '8px' }}>Poll Title</label>
                <input
                    autoFocus
                    className="input-glass"
                    placeholder="e.g. Where should we go for lunch?"
                    value={data.title}
                    onChange={e => updateData({ title: e.target.value })}
                    style={{ fontSize: '1.5rem', fontWeight: 'bold' }}
                />
            </div>

            <div>
                <label className="text-muted" style={{ display: 'block', marginBottom: '8px' }}>Description (Optional)</label>
                <textarea
                    className="input-glass"
                    placeholder="Add some context..."
                    value={data.description}
                    onChange={e => updateData({ description: e.target.value })}
                    rows={3}
                />
            </div>

            <div style={{ marginTop: '20px' }}>
                <label className="text-muted" style={{ display: 'block', marginBottom: '12px' }}>Choose a Template</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                    {templates.map(t => (
                        <div
                            key={t.id}
                            onClick={() => updateData({ template: t.id })}
                            className={`glass ${data.template === t.id ? 'active-template' : ''}`}
                            style={{
                                padding: '16px',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                border: data.template === t.id ? '2px solid var(--color-primary)' : '1px solid var(--glass-border)',
                                background: data.template === t.id ? 'rgba(99, 102, 241, 0.1)' : 'var(--glass-bg)',
                                transition: 'all 0.2s'
                            }}
                        >
                            <t.icon size={24} color={data.template === t.id ? 'var(--color-primary)' : 'var(--color-text-muted)'} />
                            <div style={{ fontWeight: 600, marginTop: '8px' }}>{t.label}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{t.desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    className="btn-primary"
                    disabled={!data.title}
                    onClick={next}
                    style={{ opacity: !data.title ? 0.5 : 1 }}
                >
                    Next Step
                </button>
            </div>
        </motion.div>
    )
}

export default StepBasicInfo
