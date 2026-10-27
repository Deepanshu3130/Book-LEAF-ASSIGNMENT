import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import Navbar from '../components/Navbar';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import UnreadDot from '../components/UnreadDot';
import { initSocket, disconnectSocket } from '../socket';
import toast from 'react-hot-toast';
import { RefreshCw, Inbox } from 'lucide-react';

const PRIORITY_ORDER = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

export const AdminQueue = () => {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'my'
  const [allTickets, setAllTickets] = useState([]);
  const [myTickets, setMyTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Sort function for "My tickets": unreadByAdmin comes FIRST (most recently updated first), then normal urgency order
  const sortMyTickets = (ticketList) => {
    return [...ticketList].sort((a, b) => {
      const aClosed = a.status === 'Resolved' || a.status === 'Closed';
      const bClosed = b.status === 'Resolved' || b.status === 'Closed';

      if (aClosed && !bClosed) return 1;
      if (!aClosed && bClosed) return -1;

      if (aClosed && bClosed) {
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      }

      // Unread tickets come FIRST (most recently updated first)
      const aUnread = Boolean(a.unreadByAdmin);
      const bUnread = Boolean(b.unreadByAdmin);

      if (aUnread && !bUnread) return -1;
      if (!aUnread && bUnread) return 1;

      if (aUnread && bUnread) {
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      }

      // Then normal urgency order
      const aPriority = PRIORITY_ORDER[a.priority] ?? 2;
      const bPriority = PRIORITY_ORDER[b.priority] ?? 2;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
  };

  const fetchTickets = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (dateFilter) params.date = dateFilter;

      // 1. Fetch All tickets
      const resAll = await api.get('/admin/tickets', { params });
      setAllTickets(resAll.data);

      // 2. Fetch My tickets (assignedTo=me)
      const resMy = await api.get('/admin/tickets', { params: { ...params, assignedTo: 'me' } });
      setMyTickets(sortMyTickets(resMy.data));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch queue');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, categoryFilter, priorityFilter, dateFilter]);

  // Real-time socket events for admin queue
  useEffect(() => {
    if (user?.id) {
      const socket = initSocket(user.id, user.role);

      socket.on('ticket:classified', () => {
        fetchTickets();
      });
      socket.on('ticket:updated', () => {
        fetchTickets();
      });
    }

    return () => {
      disconnectSocket();
    };
  }, [user?.id, statusFilter, categoryFilter, priorityFilter, dateFilter]);

  // Unread count bubble ONLY for "My tickets" tab
  const myUnreadCount = myTickets.filter((t) => t.unreadByAdmin).length;

  // Active tickets to display depending on selected tab
  const displayedTickets = activeTab === 'all' ? allTickets : myTickets;

  // Calculate queue summary metrics for the currently active tab
  const openCount = displayedTickets.filter((t) => t.status === 'Open').length;
  const inProgressCount = displayedTickets.filter((t) => t.status === 'In Progress').length;
  const criticalCount = displayedTickets.filter(
    (t) => t.priority === 'Critical' && (t.status === 'Open' || t.status === 'In Progress')
  ).length;

  // Calculates ticket age in days
  const getTicketAge = (createdAt) => {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return { text: 'Today', days: 0 };
    if (diffDays === 1) return { text: '1 day', days: 1 };
    return { text: `${diffDays} days`, days: diffDays };
  };

  return (
    <div className="min-h-screen bg-page flex flex-col">
      <Navbar />

      {/* Title Band with Soft Blush Background */}
      <div className="bg-blush border-b border-line py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Support ticket queue</h1>
            <p className="text-sm text-muted mt-1">
              Manage and triage author inquiries across BookLeaf.
            </p>
          </div>

          <button
            onClick={() => fetchTickets(true)}
            disabled={refreshing}
            className="inline-flex items-center self-start sm:self-auto px-4 py-2 rounded-full border border-line bg-surface text-muted hover:text-ink hover:border-line-dark text-xs font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin text-brand' : ''}`} />
            <span>Refresh queue</span>
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Queue Summary: Clean single row with thin dividers and plain numbers */}
        <div className="bg-surface border border-line rounded-xl p-5 mb-8 flex items-center divide-x divide-line">
          <div className="flex-1 text-center sm:text-left sm:pl-4 first:pl-0">
            <span className="text-xs text-muted block mb-1">Open tickets</span>
            <span className="text-2xl font-semibold text-ink">{openCount}</span>
          </div>
          <div className="flex-1 text-center sm:text-left sm:pl-6">
            <span className="text-xs text-muted block mb-1">In progress</span>
            <span className="text-2xl font-semibold text-ink">{inProgressCount}</span>
          </div>
          <div className="flex-1 text-center sm:text-left sm:pl-6">
            <span className="text-xs text-muted block mb-1">Critical (unresolved)</span>
            <span className="text-2xl font-semibold text-ink">{criticalCount}</span>
          </div>
        </div>

        {/* Tabs: All tickets / My tickets */}
        <div className="flex items-center space-x-6 border-b border-line mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`pb-3 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'border-brand text-brand font-semibold'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <span>All tickets</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my')}
            className={`pb-3 border-b-2 text-sm font-medium transition-colors inline-flex items-center ${
              activeTab === 'my'
                ? 'border-brand text-brand font-semibold'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <span>My tickets</span>
            {myUnreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-brand text-white leading-tight">
                {myUnreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-surface p-4 rounded-xl border border-line mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-line rounded-lg bg-surface text-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand transition-colors"
              >
                <option value="all">All statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-line rounded-lg bg-surface text-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand transition-colors"
              >
                <option value="all">All categories</option>
                <option value="Royalty & Payments">Royalty &amp; payments</option>
                <option value="ISBN & Metadata Issues">ISBN &amp; metadata issues</option>
                <option value="Printing & Quality">Printing &amp; quality</option>
                <option value="Distribution & Availability">Distribution &amp; availability</option>
                <option value="Book Status & Production Updates">Book status &amp; production</option>
                <option value="General Inquiry">General inquiry</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Priority
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-line rounded-lg bg-surface text-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand transition-colors"
              >
                <option value="all">All priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Created date
              </label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-line rounded-lg bg-surface text-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Tickets Table / Empty State */}
        {loading ? (
          <div className="text-center py-16 text-muted text-sm">Loading tickets...</div>
        ) : displayedTickets.length === 0 ? (
          <div className="bg-surface border border-line rounded-xl p-12 text-center">
            <Inbox className="w-10 h-10 text-muted mx-auto mb-3 opacity-60" />
            <h3 className="text-base font-semibold text-ink">
              {activeTab === 'my' ? 'No tickets assigned to you' : 'No tickets found'}
            </h3>
            <p className="text-sm text-muted mt-1">
              {activeTab === 'my'
                ? 'You currently have no tickets assigned to your account.'
                : 'No tickets match your active filter criteria. Try clearing some filters.'}
            </p>
          </div>
        ) : (
          <div className="bg-surface border border-line rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-line text-xs font-medium text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">Priority</th>
                    <th scope="col" className="px-5 py-3.5">Status</th>
                    <th scope="col" className="px-5 py-3.5">Subject &amp; category</th>
                    <th scope="col" className="px-5 py-3.5">Author</th>
                    <th scope="col" className="px-5 py-3.5">Book</th>
                    <th scope="col" className="px-5 py-3.5">Age</th>
                    <th scope="col" className="px-5 py-3.5">Created date</th>
                    <th scope="col" className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {displayedTickets.map((t) => {
                    const age = getTicketAge(t.createdAt);
                    const isUnresolved = t.status === 'Open' || t.status === 'In Progress';
                    const isOldUnresolved = isUnresolved && age.days > 3;

                    // Unread rule: Only in "My tickets" tab does unreadByAdmin show dot, tint, and bold
                    const isMyUnread = activeTab === 'my' && Boolean(t.unreadByAdmin);

                    return (
                      <tr
                        key={t._id}
                        className={`transition-colors ${
                          isMyUnread ? 'bg-green-50/60 hover:bg-green-50/80' : 'hover:bg-blush/20'
                        }`}
                      >
                        <td className="px-5 py-4 whitespace-nowrap">
                          <PriorityBadge priority={t.priority} />
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <StatusBadge status={t.status} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {/* Fixed slot for unread dot so all subjects line up vertically */}
                            <span className="w-3 shrink-0 flex items-center justify-center">
                              {isMyUnread && <UnreadDot />}
                            </span>
                            <span
                              className={`text-ink max-w-xs truncate ${
                                isMyUnread ? 'font-semibold' : 'font-normal'
                              }`}
                            >
                              {t.subject}
                            </span>
                          </div>
                          <div className="text-xs text-muted mt-0.5 ml-5">{t.category}</div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-medium text-ink">{t.author?.name}</div>
                          <div className="text-xs text-muted">{t.author?.email}</div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-muted">
                          {t.book ? (
                            <span className="text-ink font-medium">{t.book.title}</span>
                          ) : (
                            <span className="italic text-xs">General / account</span>
                          )}
                        </td>
                        {/* Age Column (Red text if unresolved & older than 3 days) */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`text-xs ${
                              isOldUnresolved ? 'text-rose-600 font-semibold' : 'text-muted'
                            }`}
                          >
                            {age.text}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-muted">
                          {new Date(t.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-right">
                          <Link
                            to={`/admin/tickets/${t._id}`}
                            className="text-brand hover:underline font-medium text-xs transition-colors"
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminQueue;
