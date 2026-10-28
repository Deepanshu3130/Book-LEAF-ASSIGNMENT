import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import Navbar from '../components/Navbar';
import PageBand from '../components/PageBand';
import TicketCard from '../components/TicketCard';
import Skeleton from '../components/Skeleton';
import { initSocket, disconnectSocket } from '../socket';
import toast from 'react-hot-toast';
import { Search, X } from 'lucide-react';

export const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [highlightedTicketId, setHighlightedTicketId] = useState(null);
  const [openTicketIds, setOpenTicketIds] = useState(new Set());
  const openTicketIdsRef = useRef(openTicketIds);
  openTicketIdsRef.current = openTicketIds;

  // Refinements: Filter tabs and search
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'active' | 'resolved'
  const [searchQuery, setSearchQuery] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Sort author tickets:
  // 1. Tickets with unread replies from support come FIRST
  // 2. Among unread (and among the rest), newest activity comes first
  const sortAuthorTickets = (list) => {
    return [...list].sort((a, b) => {
      const aUnread = Boolean(a.unreadByAuthor);
      const bUnread = Boolean(b.unreadByAuthor);

      if (aUnread && !bUnread) return -1;
      if (!aUnread && bUnread) return 1;

      const getLatestTime = (t) => {
        const replyTime =
          t.replies && t.replies.length > 0
            ? new Date(t.replies[t.replies.length - 1].createdAt).getTime()
            : 0;
        const updateTime = t.updatedAt ? new Date(t.updatedAt).getTime() : 0;
        const createTime = t.createdAt ? new Date(t.createdAt).getTime() : 0;
        return Math.max(replyTime, updateTime, createTime);
      };

      return getLatestTime(b) - getLatestTime(a);
    });
  };

  const fetchTickets = async () => {
    try {
      const res = await api.get('/tickets/mine');
      setTickets(sortAuthorTickets(res.data));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();

    // Initialize Socket.IO connection for real-time ticket updates
    if (user?.id) {
      const socket = initSocket(user.id);

      socket.on('ticket:updated', (updatedTicket) => {
        // If the ticket conversation is currently open, mark read immediately
        if (openTicketIdsRef.current.has(updatedTicket._id)) {
          api.post(`/tickets/${updatedTicket._id}/read`).catch(() => {});
          updatedTicket.unreadByAuthor = false;
        }

        setTickets((prev) => {
          const filtered = prev.filter((t) => t._id !== updatedTicket._id);
          return sortAuthorTickets([updatedTicket, ...filtered]);
        });

        // Briefly highlight the ticket that received the new update/reply
        setHighlightedTicketId(updatedTicket._id);
        setTimeout(() => setHighlightedTicketId(null), 2000);

        toast.success(`New update on ticket: "${updatedTicket.subject}"`, {
          icon: '🔔',
        });
      });
    }

    return () => {
      disconnectSocket();
    };
  }, [user?.id]);

  const handleTicketUpdated = (updatedTicket) => {
    setTickets((prev) => {
      const filtered = prev.filter((t) => t._id !== updatedTicket._id);
      return sortAuthorTickets([updatedTicket, ...filtered]);
    });
  };

  const handleToggleExpand = (ticketId, isExpanded) => {
    setOpenTicketIds((prev) => {
      const nextSet = new Set(prev);
      if (isExpanded) {
        nextSet.add(ticketId);
      } else {
        nextSet.delete(ticketId);
      }
      return nextSet;
    });
  };

  // Metrics
  const activeCount = tickets.filter(
    (t) => t.status === 'Open' || t.status === 'In Progress'
  ).length;
  const resolvedCount = tickets.filter(
    (t) => t.status === 'Resolved' || t.status === 'Closed'
  ).length;
  const unreadCount = tickets.filter((t) => Boolean(t.unreadByAuthor)).length;

  // Filter & search tickets
  const filteredTickets = tickets.filter((t) => {
    // 1. Tab filter
    if (filterTab === 'active' && t.status !== 'Open' && t.status !== 'In Progress') {
      return false;
    }
    if (filterTab === 'resolved' && t.status !== 'Resolved' && t.status !== 'Closed') {
      return false;
    }
    // 2. Search query filter (subject, description preview, book, or category)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchSubject = t.subject?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchBook = t.book?.title?.toLowerCase().includes(q);
      const matchCategory = t.category?.toLowerCase().includes(q);
      if (!matchSubject && !matchDesc && !matchBook && !matchCategory) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <PageBand
        title="My tickets"
        subtitle="Track replies from the BookLeaf team."
        action={
          <Link to="/new-ticket" className="btn-primary text-xs">
            Raise ticket
          </Link>
        }
      >
        {!loading && tickets.length > 0 && (
          <div className="space-y-3 pt-1">
            {/* 1. Summary Status Line */}
            <p className="text-sm text-muted">
              <span className="font-semibold text-ink">{activeCount}</span> active ·{' '}
              <span className="font-semibold text-ink">{resolvedCount}</span> resolved
              {unreadCount > 0 && (
                <>
                  {' '}·{' '}
                  <span className="font-semibold text-coral-deep">
                    {unreadCount} new {unreadCount === 1 ? 'reply' : 'replies'}
                  </span>
                </>
              )}
            </p>

            {/* 2. Pill Filter Tabs */}
            <div className="inline-flex rounded-full bg-white border border-line p-1">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-4 py-1.5 rounded-full text-xs transition-colors cursor-pointer ${
                  filterTab === 'all'
                    ? 'bg-coral text-white font-semibold'
                    : 'text-muted hover:text-ink'
                }`}
              >
                All tickets ({tickets.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('active')}
                className={`px-4 py-1.5 rounded-full text-xs transition-colors cursor-pointer ${
                  filterTab === 'active'
                    ? 'bg-coral text-white font-semibold'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Active ({activeCount})
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('resolved')}
                className={`px-4 py-1.5 rounded-full text-xs transition-colors cursor-pointer ${
                  filterTab === 'resolved'
                    ? 'bg-coral text-white font-semibold'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Resolved ({resolvedCount})
              </button>
            </div>
          </div>
        )}
      </PageBand>

      <main id="main" className="mx-auto max-w-3xl px-6 py-6 w-full flex-1 animate-fade-in-up">
        {/* Loading Skeletons */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white shadow-sm rounded-2xl p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          /* Empty State: No tickets raised yet */
          <div className="bg-white shadow-sm rounded-2xl p-12 text-center">
            <p className="text-sm text-muted mb-4 max-w-md mx-auto">
              No tickets yet. Raise a ticket when you need help from the BookLeaf team.
            </p>
            <Link to="/new-ticket" className="btn-primary">
              Raise ticket
            </Link>
          </div>
        ) : (
          <>
            {/* Search Bar */}
            <div className="mb-5 max-w-sm">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by subject or book..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-line rounded-full pl-9 pr-8 py-1.5 text-xs text-body outline-none focus-visible:ring-2 focus-visible:ring-coral shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer p-0.5"
                    aria-label="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Ticket Cards List */}
            {filteredTickets.length === 0 ? (
              <div className="bg-white shadow-sm rounded-2xl p-8 text-center">
                <p className="text-sm text-muted mb-3">
                  {searchQuery
                    ? `No tickets match "${searchQuery}".`
                    : filterTab === 'active'
                    ? 'You have no active tickets right now.'
                    : 'You have no resolved tickets yet.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFilterTab('all');
                    setSearchQuery('');
                  }}
                  className="text-xs text-coral-deep hover:underline font-semibold cursor-pointer"
                >
                  Show all tickets
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTickets.map((ticket) => (
                  <TicketCard
                    key={ticket._id}
                    ticket={ticket}
                    isExpanded={openTicketIds.has(ticket._id)}
                    onToggleExpand={handleToggleExpand}
                    isHighlighted={highlightedTicketId === ticket._id}
                    onTicketUpdated={handleTicketUpdated}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default MyTickets;
