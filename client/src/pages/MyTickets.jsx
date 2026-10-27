import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import Navbar from '../components/Navbar';
import TicketCard from '../components/TicketCard';
import { initSocket, disconnectSocket } from '../socket';
import toast from 'react-hot-toast';
import { LifeBuoy, PlusCircle, RefreshCw } from 'lucide-react';

export const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openTicketIds, setOpenTicketIds] = useState(new Set());
  const openTicketIdsRef = useRef(openTicketIds);
  openTicketIdsRef.current = openTicketIds;

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Sort author tickets:
  // 1. Tickets with unread replies from support come FIRST
  // 2. Among unread (and among the rest), newest activity (latest reply or update) comes first
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

  const fetchTickets = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.get('/tickets/mine');
      setTickets(sortAuthorTickets(res.data));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch tickets');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
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

  // Count tickets that have a new unread reply from support
  const unreadRepliesCount = tickets.filter((t) => t.unreadByAuthor).length;

  return (
    <div className="min-h-screen bg-page flex flex-col">
      <Navbar />

      {/* Title Band with Soft Blush Background */}
      <div className="bg-blush border-b border-line py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-semibold text-ink">My support tickets</h1>
              {unreadRepliesCount > 0 && (
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-medium leading-none text-white bg-brand rounded-full">
                  {unreadRepliesCount} {unreadRepliesCount === 1 ? 'new' : 'new'}
                </span>
              )}
            </div>
            <p className="text-sm text-muted mt-1">
              Track communication with BookLeaf support in real-time.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchTickets(true)}
              disabled={refreshing}
              className="p-2.5 rounded-full border border-line bg-surface text-muted hover:text-ink hover:border-line-dark transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand"
              title="Refresh tickets"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand' : ''}`} />
            </button>
            <Link
              to="/new-ticket"
              className="inline-flex items-center px-5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-full text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              <span>Raise ticket</span>
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Content */}
        {loading ? (
          <div className="text-center py-16 text-muted text-sm">Loading your tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="bg-surface border border-line rounded-xl p-12 text-center">
            <LifeBuoy className="w-10 h-10 text-muted mx-auto mb-3 opacity-60" />
            <h3 className="text-base font-semibold text-ink">No tickets yet</h3>
            <p className="text-sm text-muted mt-1 mb-5">
              Raise a ticket when you need help from the BookLeaf team.
            </p>
            <Link
              to="/new-ticket"
              className="inline-flex items-center px-5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-full text-sm font-medium transition-colors"
            >
              Raise your first ticket
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket._id}
                ticket={ticket}
                isExpanded={openTicketIds.has(ticket._id)}
                onToggleExpand={handleToggleExpand}
                onTicketUpdated={handleTicketUpdated}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyTickets;
