import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import { initSocket } from '../socket';
import { LogOut } from 'lucide-react';

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isAdmin = user?.role === 'admin';
  const [authorUnreadCount, setAuthorUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    if (!isAdmin && user?.id) {
      try {
        const res = await api.get('/tickets/mine');
        const count = res.data.filter((t) => t.unreadByAuthor).length;
        setAuthorUnreadCount(count);
      } catch (err) {
        // ignore errors
      }
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    if (!isAdmin && user?.id) {
      const socket = initSocket(user.id);
      const handleTicketUpdate = () => {
        fetchUnreadCount();
      };

      socket.on('ticket:updated', handleTicketUpdate);
      window.addEventListener('ticket-read-updated', fetchUnreadCount);

      return () => {
        socket.off('ticket:updated', handleTicketUpdate);
        window.removeEventListener('ticket-read-updated', fetchUnreadCount);
      };
    }
  }, [isAdmin, user?.id, location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-surface border-b border-line sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Recreated BookLeaf Logo */}
          <Link
            to={isAdmin ? '/admin' : '/books'}
            className="flex items-center space-x-2.5 group"
          >
            <div className="w-8 h-8 rounded-md bg-brand flex items-center justify-center text-white font-light text-xl select-none leading-none">
              /
            </div>
            <div className="font-display leading-tight">
              <span className="block text-sm font-semibold tracking-wide text-ink">
                BookLeaf
              </span>
              <span className="block text-[11px] font-light text-muted uppercase tracking-wider">
                Publishing
              </span>
            </div>
          </Link>

          {/* Navigation Links with underline indicator */}
          <nav className="flex items-center space-x-4 sm:space-x-6 text-sm">
            {!isAdmin ? (
              <>
                <Link
                  to="/books"
                  className={`py-5 border-b-2 font-medium transition-colors ${
                    isActive('/books')
                      ? 'border-brand text-brand font-semibold'
                      : 'border-transparent text-muted hover:text-ink'
                  }`}
                >
                  My books
                </Link>

                <Link
                  to="/tickets"
                  className={`py-5 border-b-2 font-medium transition-colors inline-flex items-center ${
                    isActive('/tickets')
                      ? 'border-brand text-brand font-semibold'
                      : 'border-transparent text-muted hover:text-ink'
                  }`}
                >
                  <span>My tickets</span>
                  {authorUnreadCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-brand text-white leading-tight">
                      {authorUnreadCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/new-ticket"
                  className={`py-5 border-b-2 font-medium transition-colors ${
                    isActive('/new-ticket')
                      ? 'border-brand text-brand font-semibold'
                      : 'border-transparent text-muted hover:text-ink'
                  }`}
                >
                  Raise ticket
                </Link>
              </>
            ) : (
              <Link
                to="/admin"
                className={`py-5 border-b-2 font-medium transition-colors ${
                  isActive('/admin')
                    ? 'border-brand text-brand font-semibold'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                Ticket queue
              </Link>
            )}

            {/* User Profile and Sign Out */}
            <div className="flex items-center pl-4 border-l border-line space-x-3 ml-2">
              <span className="hidden sm:inline text-sm text-ink font-medium">
                {user?.name}
              </span>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-1.5 text-muted hover:text-brand transition-colors rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
