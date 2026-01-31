
import React from 'react'
import { motion } from 'framer-motion'
import { Globe, Lock, Clock, Eye, EyeOff, ShieldAlert } from 'lucide-react'

const Switch = ({ label, desc, checked, onChange, icon: Icon }) => (
    <div className="glass" style={{ padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px', color: 'var(--color-primary)' }}>
                <Icon size={20} />
            </div>
            <div>
                <div style={{ fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{desc}</div>
            </div>
        </div>

        <div
            onClick={() => onChange(!checked)}
            style={{
                width: '48px', height: '28px',
                background: checked ? 'var(--color-success)' : '#cbd5e1',
                borderRadius: '999px',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.3s'
            }}
        >
            <div style={{
                width: '24px', height: '24px',
                background: 'white', borderRadius: '50%',
                position: 'absolute', top: '2px', left: checked ? '22px' : '2px',
                transition: 'left 0.3s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
        </div>
    </div>
)

const StepSettings = ({ data, updateData, next, back, loading, isEdit }) => {
    return (
        <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex-col gap-4"
        >
            <h2 className="text-h3">Settings</h2>

            {/* Access Control */}
            <div>
                <label className="text-muted" style={{ marginBottom: '8px', display: 'block', fontWeight: 600 }}>Access & Security</label>
                <Switch
                    icon={data.requiresLogin ? Lock : Globe}
                    label="Require Login"
                    desc="Only authenticated users can vote"
                    checked={data.requiresLogin}
                    onChange={val => updateData({ requiresLogin: val })}
                />

                {data.requiresLogin && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ overflow: 'hidden', marginBottom: '12px' }}>
                        <div className="glass" style={{ padding: '16px', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                                <ShieldAlert size={16} /> <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Restrict Domains (Optional)</label>
                            </div>
                            <input
                                className="input-glass"
                                placeholder="e.g. ascentic.se, google.com"
                                value={data.allowedDomains}
                                onChange={e => updateData({ allowedDomains: e.target.value })}
                                style={{ fontSize: '0.9rem' }}
                            />
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                Comma separated list of email domains allowed to vote.
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Results */}
            <div>
                <label className="text-muted" style={{ marginBottom: '8px', display: 'block', fontWeight: 600 }}>Results Visibility</label>
                <Switch
                    icon={data.showResultsInstant ? Eye : EyeOff}
                    label="Show Results Instantly"
                    desc="Voters see results immediately after voting"
                    checked={data.showResultsInstant}
                    onChange={val => updateData({ showResultsInstant: val })}
                />
            </div>

            {/* Timer */}
            <div>
                <label className="text-muted" style={{ marginBottom: '8px', display: 'block', fontWeight: 600 }}>Duration</label>
                <div className="glass" style={{ padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Clock size={20} color="var(--color-text-muted)" />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>Poll Ends At (Optional)</div>
                        <input
                            type="datetime-local"
                            className="input-glass"
                            style={{ padding: '8px' }}
                            value={data.expiresAt || ''}
                            onChange={e => updateData({ expiresAt: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
                <button className="glass" style={{ padding: '10px 20px', borderRadius: '20px', border: 'none' }} onClick={back}>Back</button>
                <button
                    className="btn-primary"
                    onClick={next}
                    disabled={loading}
                    style={{ minWidth: '120px' }}
                >
                    {loading ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Update Poll' : 'Create Poll')}
                </button>
            </div>

        </motion.div>
    )
}

export default StepSettings
