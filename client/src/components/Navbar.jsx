import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import { initSocket } from '../socket';
import { LogOut } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isAdmin = user?.role === 'admin';
  const [authorUnreadCount, setAuthorUnreadCount] = useState(0);
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const fetchUnreadCount = async () => {
    if (!isAdmin && user?.id) {
      try {
        const res = await api.get('/tickets/mine');
        const count = res.data.filter((t) => t.unreadByAuthor).length;
        setAuthorUnreadCount(count);
      } catch {
        // ignore errors
      }
    } else if (isAdmin && user?.id) {
      try {
        const res = await api.get('/admin/tickets?assignedTo=me');
        const count = res.data.filter((t) => t.unreadByAdmin).length;
        setAdminUnreadCount(count);
      } catch {
        // ignore errors
      }
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    if (user?.id) {
      const socket = initSocket(user.id, user.role);
      const handleTicketUpdate = () => {
        fetchUnreadCount();
      };
      const handleTicketRead = () => {
        if (!isAdmin) {
          setAuthorUnreadCount((prev) => Math.max(0, prev - 1));
        } else {
          setAdminUnreadCount((prev) => Math.max(0, prev - 1));
        }
        fetchUnreadCount();
      };

      socket.on('ticket:updated', handleTicketUpdate);
      socket.on('ticket:classified', handleTicketUpdate);
      socket.on('ticket:read', handleTicketUpdate);
      window.addEventListener('ticket-read-updated', handleTicketRead);

      return () => {
        socket.off('ticket:updated', handleTicketUpdate);
        socket.off('ticket:classified', handleTicketUpdate);
        socket.off('ticket:read', handleTicketUpdate);
        window.removeEventListener('ticket-read-updated', handleTicketRead);
      };
    }
  }, [isAdmin, user?.id, location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const linkClass = (path) =>
    `relative py-1.5 font-medium transition-colors ${
      isActive(path)
        ? 'text-coral-deep font-semibold after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[2px] after:bg-coral after:rounded-full'
        : 'text-muted hover:text-ink'
    }`;

  return (
    <>
      {/* Accessible Skip to Content Link */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-coral focus:text-white focus:rounded-full focus:shadow-md focus:text-xs focus:font-semibold focus:outline-hidden"
      >
        Skip to main content
      </a>

      <header className="bg-white border-b border-line sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            {/* BookLeaf Logo */}
            <Link
              to={isAdmin ? '/admin' : '/books'}
              className="flex items-center space-x-2.5 group"
            >
              <div className="w-8 h-8 rounded-lg bg-coral flex items-center justify-center text-white font-light text-xl select-none leading-none shadow-xs">
                <span className="inline-block transform -translate-y-0.5">/</span>
              </div>
              <div className="font-display leading-tight flex flex-col justify-center">
                <span className="block text-sm font-semibold text-ink leading-tight">
                  BookLeaf
                </span>
                <span className="block text-[11px] font-normal text-muted leading-tight">
                  Publishing
                </span>
              </div>
            </Link>

            {/* Navigation Links */}
            <nav className="flex items-center space-x-4 sm:space-x-6 text-sm">
              {!isAdmin ? (
                <>
                  <Link to="/books" className={linkClass('/books')}>
                    My books
                  </Link>

                  <Link
                    to="/tickets"
                    className={`${linkClass('/tickets')} inline-flex items-center`}
                  >
                    <span>My tickets</span>
                    {authorUnreadCount > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-coral text-white leading-none">
                        {authorUnreadCount}
                      </span>
                    )}
                  </Link>

                  <Link to="/new-ticket" className={linkClass('/new-ticket')}>
                    Raise ticket
                  </Link>
                </>
              ) : (
                <Link
                  to="/admin"
                  className={`${linkClass('/admin')} inline-flex items-center`}
                >
                  <span>Ticket queue</span>
                  {adminUnreadCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-coral text-white leading-none">
                      {adminUnreadCount}
                    </span>
                  )}
                </Link>
              )}

              {/* User name and sign out */}
              <div className="flex items-center pl-4 border-l border-line space-x-3 ml-2">
                <span className="hidden sm:inline text-sm text-ink font-medium">
                  {user?.name}
                </span>
                <button
                  onClick={() => setShowLogoutModal(true)}
                  title="Sign out"
                  aria-label="Sign out"
                  className="p-1.5 text-muted hover:text-coral-deep transition-colors rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-coral"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Sign out confirmation modal */}
      <ConfirmModal
        open={showLogoutModal}
        title="Sign out of BookLeaf?"
        message="Are you sure you want to sign out? You will need your email and password to log back in."
        confirmText="Sign out"
        cancelText="Stay signed in"
        onConfirm={() => {
          setShowLogoutModal(false);
          handleLogout();
        }}
        onCancel={() => setShowLogoutModal(false)}
      />
    </>
  );
};

export default Navbar;
