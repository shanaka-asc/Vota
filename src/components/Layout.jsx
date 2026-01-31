
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/Auth';
import Header from './Header';

const Layout = ({ children }) => {
    const { user } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (user) {
            const returnPath = localStorage.getItem('vota_return_path')
            if (returnPath) {
                localStorage.removeItem('vota_return_path')
                navigate(returnPath)
            }
        }
    }, [user, navigate])

    return (
        <div className="app-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header />

            <main style={{ flex: 1, position: 'relative' }}>
                {children}
            </main>

            <footer className="footer container" style={{ padding: '32px 20px', textAlign: 'center', opacity: 0.6 }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                    &copy; {new Date().getFullYear()} Vota. Built with React & Supabase.
                </p>
            </footer>
        </div>
    );
};

export default Layout;
