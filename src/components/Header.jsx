
import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/Auth';
import { LogOut, LayoutDashboard, Home as HomeIcon } from 'lucide-react';

const Header = () => {
    const { user, signOut } = useAuth();
    const location = useLocation();

    return (
        <header className="header glass">
            <div className="container header-container">
                {/* Brand Logo */}
                <Link to="/" className="logo-text">
                    Vota
                </Link>

                {/* Navigation Links */}
                <nav className="nav-group">
                    <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <HomeIcon size={18} />
                        <span>Home</span>
                    </NavLink>

                    {user && (
                        <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            <LayoutDashboard size={18} />
                            <span>My Polls</span>
                        </NavLink>
                    )}
                </nav>

                {/* User Section */}
                <div className="nav-group">
                    {user ? (
                        <div className="user-profile">
                            <div className="user-info">
                                <span className="user-label">Logged in as</span>
                                <span className="user-email">{user.email}</span>
                            </div>
                            <button
                                onClick={signOut}
                                className="btn-icon-logout"
                                title="Sign Out"
                                aria-label="Sign Out"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    ) : (
                        <Link to="/login" className="btn-glass" style={{ textDecoration: 'none' }}>
                            Sign In
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
