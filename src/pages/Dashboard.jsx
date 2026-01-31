
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/Auth';
import { motion } from 'framer-motion';
import { Plus, BarChart2, ExternalLink, Calendar, Loader2, ArrowRight, Share2, Lock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const Dashboard = () => {
    const { user, loading: authLoading } = useAuth();
    const [polls, setPolls] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchPolls();
    }, [user]);

    const fetchPolls = async () => {
        try {
            const { data, error } = await supabase
                .from('polls')
                .select('*')
                .eq('creator_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPolls(data);
        } catch (error) {
            console.error('Error fetching polls:', error);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || loading) return <div className="container flex-center" style={{ height: '50vh' }}><Loader2 className="spin" /></div>;

    if (!user) return (
        <div className="container flex-col flex-center" style={{ height: '60vh' }}>
            <h2 className="text-h2">Please Sign In</h2>
            <p className="text-muted" style={{ marginBottom: '24px' }}>You need to be logged in to view your dashboard.</p>
            <Link to="/login" className="btn-primary" style={{ textDecoration: 'none' }}>Go to Login</Link>
        </div>
    );

    return (
        <div className="container" style={{ padding: '60px 20px' }}>
            {/* Dashboard Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '48px' }}>
                <div>
                    <h1 className="text-h1 gradient-text">My Polls</h1>
                    <p className="text-muted" style={{ fontSize: '1.1rem', marginTop: '8px' }}>Manage your active and past polls.</p>
                </div>
                <Link to="/create" className="btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Plus size={20} />
                    <span>Create New Poll</span>
                </Link>
            </div>

            {/* Poll Grid */}
            {polls.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass"
                    style={{ padding: '80px 40px', textAlign: 'center', borderRadius: '32px' }}
                >
                    <div className="flex-center" style={{ width: '80px', height: '80px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '50%', margin: '0 auto 24px auto', color: 'var(--color-primary)' }}>
                        <Plus size={40} />
                    </div>
                    <h3 className="text-h3" style={{ marginBottom: '12px' }}>No Polls Yet</h3>
                    <p className="text-muted" style={{ marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px auto' }}>Ready to gather some opinions? Create your first poll in just a few clicks.</p>
                    <Link to="/create" className="btn-primary" style={{ textDecoration: 'none' }}>Get Started</Link>
                </motion.div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
                    {polls.map((poll, i) => (
                        <motion.div
                            key={poll.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="glass glass-hover"
                            style={{ padding: '32px', borderRadius: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}
                        >
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Calendar size={14} />
                                        <span>{formatDistanceToNow(new Date(poll.created_at), { addSuffix: true })}</span>
                                    </div>
                                    {poll.is_closed && (
                                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Lock size={12} /> Closed
                                        </div>
                                    )}
                                </div>
                                <h3 className="text-h3" style={{ fontSize: '1.4rem', lineHeight: 1.2, marginBottom: '8px' }}>{poll.title}</h3>
                                {poll.description && (
                                    <p className="text-muted" style={{ fontSize: '0.95rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {poll.description}
                                    </p>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div style={{ marginTop: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <Link
                                    to={`/poll/${poll.id}/results`}
                                    className="btn-glass"
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textDecoration: 'none', fontSize: '0.85rem' }}
                                >
                                    <BarChart2 size={16} />
                                    <span>Results</span>
                                </Link>
                                <Link
                                    to={`/poll/${poll.id}/success`}
                                    className="btn-glass"
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textDecoration: 'none', fontSize: '0.85rem' }}
                                >
                                    <Share2 size={16} />
                                    <span>Share</span>
                                </Link>
                                <Link
                                    to={`/poll/${poll.id}`}
                                    className="btn-primary"
                                    style={{ flex: '1 0 100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textDecoration: 'none', fontSize: '0.85rem', padding: '10px' }}
                                >
                                    <ExternalLink size={16} />
                                    <span>Vote Page</span>
                                </Link>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
