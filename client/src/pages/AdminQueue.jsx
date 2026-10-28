import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import Navbar from '../components/Navbar';
import PageBand from '../components/PageBand';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import UnreadDot from '../components/UnreadDot';
import CustomSelect from '../components/CustomSelect';
import Skeleton from '../components/Skeleton';
import { initSocket, disconnectSocket } from '../socket';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';

const PRIORITY_ORDER = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'Open', label: 'Open' },
  { value: 'In Progress', label: 'In progress' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Closed', label: 'Closed' },
];

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All categories' },
  { value: 'Royalty & Payments', label: 'Royalty & payments' },
  { value: 'ISBN & Metadata Issues', label: 'ISBN & metadata issues' },
  { value: 'Printing & Quality', label: 'Printing & quality' },
  { value: 'Distribution & Availability', label: 'Distribution & availability' },
  { value: 'Book Status & Production Updates', label: 'Book status & production' },
  { value: 'General Inquiry', label: 'General inquiry' },
];

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All priorities' },
  { value: 'Critical', label: 'Critical' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

export const AdminQueue = () => {
  const navigate = useNavigate();
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

      socket.on('ticket:classified', fetchTickets);
      socket.on('ticket:updated', fetchTickets);
      socket.on('ticket:read', fetchTickets);
      window.addEventListener('ticket-read-updated', fetchTickets);

      return () => {
        disconnectSocket();
        window.removeEventListener('ticket-read-updated', fetchTickets);
      };
    }
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
  const getTicketAge = (createdAt, isUnresolved) => {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    let text = `${diffDays} days`;
    if (diffDays === 0) text = 'Today';
    else if (diffDays === 1) text = '1 day';

    let colorClass = 'text-muted';
    if (isUnresolved && diffDays >= 3) {
      colorClass = 'text-priority-critical font-medium';
    }

    return { text, days: diffDays, colorClass };
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setCategoryFilter('all');
    setPriorityFilter('all');
    setDateFilter('');
  };

  const handleOpenTicket = (ticketId, isUnread) => {
    if (isUnread) {
      setMyTickets((prev) =>
        prev.map((item) => (item._id === ticketId ? { ...item, unreadByAdmin: false } : item))
      );
      setAllTickets((prev) =>
        prev.map((item) => (item._id === ticketId ? { ...item, unreadByAdmin: false } : item))
      );
      api.post(`/admin/tickets/${ticketId}/read`).catch(() => {});
      window.dispatchEvent(new Event('ticket-read-updated'));
    }
    navigate(`/admin/tickets/${ticketId}`);
  };

  const getPriorityBorderClass = (priority) => {
    if (priority === 'Critical') return 'border-l-4 border-l-priority-critical';
    if (priority === 'High') return 'border-l-4 border-l-priority-high';
    return 'border-l-4 border-l-transparent';
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <PageBand
        title="Support tickets"
        subtitle="Manage and triage author inquiries."
        action={
          <button
            onClick={() => fetchTickets(true)}
            disabled={refreshing}
            aria-label="Refresh queue"
            className="btn-secondary text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-muted ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        }
      >
        {/* Summary: ONE plain line of text under the header */}
        <p className="text-sm text-muted mb-3 flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-ink">{openCount}</span> open ·{' '}
          <span className="font-semibold text-ink">{inProgressCount}</span> in progress ·{' '}
          <span className="font-semibold text-ink">{criticalCount}</span> critical
          {myUnreadCount > 0 && (
            <>
              <span className="text-line">·</span>
              <span className="font-bold text-coral-deep animate-pulse">
                {myUnreadCount} new {myUnreadCount === 1 ? 'reply' : 'replies'}
              </span>
            </>
          )}
        </p>

        {/* Pill-shaped tabs container */}
        <div className="max-w-full overflow-x-auto inline-flex rounded-full bg-white border border-line p-1">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-1.5 rounded-full text-xs transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'bg-coral text-white font-semibold'
                : 'text-muted hover:text-ink font-medium'
            }`}
          >
            All tickets
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my')}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs transition-colors cursor-pointer ${
              activeTab === 'my'
                ? 'bg-coral text-white font-semibold'
                : 'text-muted hover:text-ink font-medium'
            }`}
          >
            <span>My tickets</span>
            {myUnreadCount > 0 && (
              <span
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full leading-none shadow-2xs transition-colors ${
                  activeTab === 'my'
                    ? 'bg-white text-coral-deep'
                    : 'bg-coral text-white'
                }`}
              >
                {myUnreadCount}
              </span>
            )}
          </button>
        </div>
      </PageBand>

      <main id="main" className="mx-auto max-w-6xl px-4 sm:px-6 py-5 sm:py-6 w-full flex-1 animate-fade-in-up">
        {/* Toolbar: flex-wrap bar with bg-blush rounded-2xl sm:rounded-full p-2 gap-2 */}
        <div className="bg-blush rounded-2xl sm:rounded-full p-2 flex flex-wrap items-center gap-2 mb-6">
          <CustomSelect
            id="filter-status"
            ariaLabel="Filter tickets by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_OPTIONS}
            className="w-auto"
            buttonClassName="rounded-full bg-white px-3.5 py-1.5 text-xs text-body border-0 outline-none focus-visible:ring-2 focus-visible:ring-coral cursor-pointer shadow-2xs flex items-center justify-between gap-1.5"
          />

          <CustomSelect
            id="filter-category"
            ariaLabel="Filter tickets by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={CATEGORY_OPTIONS}
            className="w-auto max-w-[220px]"
            buttonClassName="rounded-full bg-white px-3.5 py-1.5 text-xs text-body border-0 outline-none focus-visible:ring-2 focus-visible:ring-coral cursor-pointer shadow-2xs flex items-center justify-between gap-1.5"
          />

          <CustomSelect
            id="filter-priority"
            ariaLabel="Filter tickets by priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            options={PRIORITY_OPTIONS}
            className="w-auto"
            buttonClassName="rounded-full bg-white px-3.5 py-1.5 text-xs text-body border-0 outline-none focus-visible:ring-2 focus-visible:ring-coral cursor-pointer shadow-2xs flex items-center justify-between gap-1.5"
          />

          <input
            id="filter-date"
            type="date"
            aria-label="Filter by created date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-full bg-white px-3 py-1 text-xs text-body border-0 outline-none focus-visible:ring-2 focus-visible:ring-coral cursor-pointer shadow-2xs"
          />

          {(statusFilter !== 'all' || categoryFilter !== 'all' || priorityFilter !== 'all' || dateFilter) && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-coral-deep hover:underline cursor-pointer px-2 py-1"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Quiet header row (hidden on phone) */}
        <div className="hidden md:grid md:grid-cols-[90px_1fr_130px_140px_110px_70px] items-center gap-4 px-5 py-2 text-xs text-muted font-normal mb-1">
          <div>Priority</div>
          <div>Subject</div>
          <div>Author</div>
          <div>Book</div>
          <div>Status</div>
          <div className="text-right">Age</div>
        </div>

        {/* Tickets List / Loading / Empty */}
        {loading ? (
          <div className="flex flex-col gap-2.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white border border-line rounded-2xl p-4 sm:px-5 sm:py-3.5">
                <div className="hidden md:grid md:grid-cols-[90px_1fr_130px_140px_110px_70px] items-center gap-4">
                  <Skeleton className="h-4 w-14" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12 ml-auto" />
                </div>
                <div className="md:hidden space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : displayedTickets.length === 0 ? (
          <div className="border border-line rounded-2xl p-12 text-center bg-white">
            <p className="text-sm text-muted">
              {activeTab === 'my' && myTickets.length === 0 && statusFilter === 'all' && categoryFilter === 'all' && priorityFilter === 'all' && !dateFilter ? (
                'You currently have no tickets assigned to your account.'
              ) : (
                <>
                  No tickets match these filters.{' '}
                  <button
                    onClick={clearFilters}
                    className="text-coral-deep hover:underline font-medium cursor-pointer"
                  >
                    Clear filters
                  </button>
                </>
              )}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {displayedTickets.map((t) => {
              const isUnresolved = t.status === 'Open' || t.status === 'In Progress';
              const age = getTicketAge(t.createdAt, isUnresolved);
              const isMyUnread = activeTab === 'my' && Boolean(t.unreadByAdmin);
              const fullDate = new Date(t.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              const cardBgClass = isMyUnread
                ? 'bg-[#f7fdf9] border-emerald-200/70 hover:bg-[#eefbf3] animate-blink-green'
                : 'bg-white border-line hover:bg-blush-soft';

              return (
                <div
                  key={t._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenTicket(t._id, Boolean(t.unreadByAdmin))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenTicket(t._id, Boolean(t.unreadByAdmin));
                    }
                  }}
                  className={`rounded-2xl border transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-coral p-4 sm:px-5 sm:py-3.5 ${cardBgClass} ${getPriorityBorderClass(t.priority)}`}
                >
                  {/* Desktop Layout */}
                  <div className="hidden md:grid md:grid-cols-[90px_1fr_130px_140px_110px_70px] items-center gap-4">
                    <div className="whitespace-nowrap">
                      <PriorityBadge priority={t.priority} />
                    </div>

                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        {isMyUnread && (
                          <span className="w-3 shrink-0 flex items-center justify-center">
                            <UnreadDot />
                          </span>
                        )}
                        <Link
                          to={`/admin/tickets/${t._id}`}
                          onClick={(e) => e.stopPropagation()}
                          className={`text-sm text-ink hover:text-coral-deep focus:underline outline-none truncate ${
                            isMyUnread ? 'font-bold' : 'font-semibold'
                          }`}
                        >
                          {t.subject}
                        </Link>
                      </div>
                      <div className="text-xs text-muted mt-0.5 truncate">{t.category}</div>
                    </div>

                    <div className="whitespace-nowrap text-xs text-ink truncate">
                      {t.author?.name || 'Unknown'}
                    </div>

                    <div className="whitespace-nowrap text-xs truncate">
                      {t.book ? (
                        <span className="text-ink">{t.book.title}</span>
                      ) : (
                        <span className="text-muted">General</span>
                      )}
                    </div>

                    <div className="whitespace-nowrap">
                      <StatusBadge status={t.status} />
                    </div>

                    <div className="whitespace-nowrap text-right">
                      <span
                        title={fullDate}
                        className={`text-xs tabular-nums ${age.colorClass}`}
                      >
                        {age.text}
                      </span>
                    </div>
                  </div>

                  {/* Mobile Layout (stacked fields) */}
                  <div className="md:hidden space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <PriorityBadge priority={t.priority} />
                      <StatusBadge status={t.status} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        {isMyUnread && (
                          <span className="w-3 shrink-0 flex items-center justify-center">
                            <UnreadDot />
                          </span>
                        )}
                        <Link
                          to={`/admin/tickets/${t._id}`}
                          onClick={(e) => e.stopPropagation()}
                          className={`text-sm text-ink hover:text-coral-deep outline-none leading-snug ${
                            isMyUnread ? 'font-bold' : 'font-semibold'
                          }`}
                        >
                          {t.subject}
                        </Link>
                      </div>
                      <div className="text-xs text-muted mt-0.5">{t.category}</div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted pt-1 border-t border-line/60">
                      <span className="truncate mr-2 min-w-0">{t.author?.name || 'Unknown'} · {t.book ? t.book.title : 'General'}</span>
                      <span title={fullDate} className={`tabular-nums ${age.colorClass}`}>
                        {age.text}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminQueue;
