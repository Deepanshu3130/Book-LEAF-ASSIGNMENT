import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import Navbar from '../components/Navbar';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { initSocket, disconnectSocket } from '../socket';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Sparkles,
  Send,
  Book,
  User,
  Shield,
  Lock,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  Wand2,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';

export const AdminTicket = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  // Override controls state
  const [status, setStatus] = useState('Open');
  const [category, setCategory] = useState('General Inquiry');
  const [priority, setPriority] = useState('Medium');
  const [savingOverrides, setSavingOverrides] = useState(false);

  // Private note state
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Reply, Auto Reply & Rewrite state
  const [replyMessage, setReplyMessage] = useState('');
  const [aiError, setAiError] = useState('');
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [showRewriteMenu, setShowRewriteMenu] = useState(false);
  const [previousReplyText, setPreviousReplyText] = useState(null);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // Generate or Regenerate AI Draft using POST /api/admin/tickets/:id/draft
  const handleGenerateDraft = async (isManualClick = false, statusOverride = null) => {
    setGeneratingDraft(true);
    setAiError('');
    try {
      const activeStatus = statusOverride || status || ticket?.status;
      const res = await api.post(`/admin/tickets/${id}/draft`, {
        status: activeStatus,
      });
      const { aiDraft } = res.data;
      setReplyMessage(aiDraft);
      setTicket((prev) => (prev ? { ...prev, aiDraft, aiStatus: 'done' } : prev));
      if (isManualClick) {
        toast.success(`Fresh AI draft generated for "${activeStatus}"!`);
      }
    } catch (err) {
      setAiError('AI is unavailable right now. You can write the reply manually.');
      setTicket((prev) => (prev ? { ...prev, aiStatus: 'failed' } : prev));
      if (isManualClick) {
        toast.error('AI draft generation failed');
      }
    } finally {
      setGeneratingDraft(false);
    }
  };

  const markAsRead = async () => {
    try {
      await api.post(`/admin/tickets/${id}/read`);
      setTicket((prev) => (prev ? { ...prev, unreadByAdmin: false } : prev));
    } catch (err) {
      // silently ignore mark-as-read errors
    }
  };

  const fetchTicket = async () => {
    try {
      const res = await api.get(`/admin/tickets/${id}`);
      const t = res.data;
      setTicket(t);
      setStatus(t.status);
      setCategory(t.category);
      setPriority(t.priority);

      // Auto reply logic:
      if (t.aiDraft) {
        setReplyMessage(t.aiDraft);
      } else {
        handleGenerateDraft(false, t.status);
      }

      // Clear unread dot on open
      if (t.unreadByAdmin) {
        markAsRead();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();

    // Listen to real-time updates for this ticket
    if (currentUser?.id) {
      const socket = initSocket(currentUser.id, currentUser.role);
      socket.on('ticket:updated', (updatedDoc) => {
        if (updatedDoc && updatedDoc._id === id) {
          setTicket(updatedDoc);
          setStatus(updatedDoc.status);
          setCategory(updatedDoc.category);
          setPriority(updatedDoc.priority);
          // If updated while open on screen, mark as read immediately
          markAsRead();
        }
      });
    }

    return () => {
      disconnectSocket();
    };
  }, [id]);

  // Handle manual override saves (Status, Category, Priority)
  const handleSaveOverrides = async () => {
    setSavingOverrides(true);
    try {
      const res = await api.patch(`/admin/tickets/${id}`, {
        status,
        category,
        priority,
      });
      setTicket(res.data);
      toast.success('Ticket metadata updated');
      handleGenerateDraft(false, res.data.status);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update overrides');
    } finally {
      setSavingOverrides(false);
    }
  };

  // Assign ticket to current administrator
  const handleAssignToMe = async () => {
    try {
      const res = await api.patch(`/admin/tickets/${id}`, {
        assignedTo: currentUser.id,
      });
      setTicket(res.data);
      toast.success('Ticket assigned to you');
    } catch (err) {
      toast.error('Failed to assign ticket');
    }
  };

  // Send official reply
  const handleSendReply = async (e, markResolved = false, markClosed = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!replyMessage.trim()) {
      toast.error('Reply message cannot be empty');
      return;
    }

    setSendingReply(true);
    try {
      const res = await api.post(`/admin/tickets/${id}/reply`, {
        message: replyMessage.trim(),
        markResolved,
        markClosed,
      });

      setTicket(res.data);
      setStatus(res.data.status);
      setReplyMessage('');
      setPreviousReplyText(null);

      if (markClosed) {
        toast.success('Reply sent and ticket permanently closed');
      } else if (markResolved) {
        toast.success('Reply sent and ticket marked Resolved');
      } else {
        toast.success('Reply sent to author');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  // Rewrite drafted reply
  const handleRewrite = async (mode) => {
    if (!replyMessage.trim()) return;

    setRewriting(true);
    setShowRewriteMenu(false);
    setPreviousReplyText(replyMessage);

    try {
      const res = await api.post(`/admin/tickets/${id}/rewrite`, {
        text: replyMessage,
        mode,
      });
      setReplyMessage(res.data.rewrittenText);
      toast.success(`Draft rewritten (${mode})!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rewrite failed');
    } finally {
      setRewriting(false);
    }
  };

  const handleUndoRewrite = () => {
    if (previousReplyText !== null) {
      setReplyMessage(previousReplyText);
      setPreviousReplyText(null);
      toast.success('Reverted to previous draft text');
    }
  };

  // Add private internal note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setAddingNote(true);
    try {
      const res = await api.post(`/admin/tickets/${id}/notes`, {
        text: noteText.trim(),
      });
      setTicket((prev) => ({ ...prev, internalNotes: res.data }));
      setNoteText('');
      toast.success('Private internal note saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-page flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-muted text-sm">
          Loading ticket details...
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-page flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-muted text-sm">
          Ticket not found.
        </div>
      </div>
    );
  }

  const isClosed = ticket.status === 'Closed';

  return (
    <div className="min-h-screen bg-page flex flex-col">
      <Navbar />

      {/* Title Band with Soft Blush Background */}
      <div className="bg-blush border-b border-line py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Link
            to="/admin"
            className="inline-flex items-center text-xs font-medium text-muted hover:text-ink transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            <span>Back to queue</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
                <span className="text-xs text-muted">
                  {ticket.category}
                </span>
              </div>
              <h1 className="text-2xl font-semibold text-ink">{ticket.subject}</h1>
            </div>

            {/* Assignment action */}
            <div className="flex items-center space-x-2">
              {ticket.assignedTo ? (
                <div className="text-xs bg-surface border border-line text-ink px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-brand" />
                  <span>Assigned to: <strong>{ticket.assignedTo.name}</strong></span>
                </div>
              ) : (
                <button
                  onClick={handleAssignToMe}
                  className="px-4 py-1.5 bg-surface border border-line hover:border-line-dark text-ink text-xs font-medium rounded-full transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand"
                >
                  Assign to me
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Original Author Query */}
            <div className="bg-surface border border-line rounded-xl p-6">
              <h2 className="text-xs font-medium text-muted mb-2">
                Original author query
              </h2>
              <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed bg-blush/30 p-4 rounded-lg border border-line">
                {ticket.description}
              </p>
              <div className="text-xs text-muted mt-3 text-right">
                Raised on {new Date(ticket.createdAt).toLocaleString()}
              </div>
            </div>

            {/* Conversation Replies History */}
            <div className="bg-surface border border-line rounded-xl p-6">
              <h2 className="text-xs font-medium text-muted mb-4">
                Conversation thread ({ticket.replies?.length || 0})
              </h2>

              {ticket.replies?.length === 0 ? (
                <p className="text-xs text-muted italic">No replies have been sent to the author yet.</p>
              ) : (
                <div className="space-y-3">
                  {ticket.replies.map((r, i) => {
                    const isStaff = r.from ? r.from === 'admin' : r.sentBy?.role === 'admin';
                    return (
                      <div
                        key={i}
                        className={`p-4 rounded-lg border text-sm ${
                          isStaff
                            ? 'bg-blush/40 border-line text-ink mr-4 sm:mr-8'
                            : 'bg-surface border-line text-ink ml-4 sm:mr-4'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-medium flex items-center space-x-1.5">
                            {isStaff ? (
                              <>
                                <Shield className="w-3.5 h-3.5 text-brand" />
                                <span className="text-brand font-semibold">
                                  {r.sentBy?.name || 'Support Team'} (Admin)
                                </span>
                              </>
                            ) : (
                              <>
                                <User className="w-3.5 h-3.5 text-muted" />
                                <span className="text-ink font-semibold">
                                  {ticket.author?.name || 'Author'}
                                </span>
                              </>
                            )}
                          </span>
                          <span className="text-muted text-[11px]">
                            {new Date(r.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed text-sm text-ink">{r.message}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Official Reply Box & AI Draft Section */}
            {isClosed ? (
              <div className="bg-surface border border-line rounded-xl p-6 text-center text-xs text-muted italic">
                This ticket is permanently closed. No further replies can be sent.
              </div>
            ) : (
              <div className="bg-surface border border-line rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-sm font-semibold text-ink">Send official reply</h2>
                    <span className="text-xs text-muted">(Visible to author)</span>
                  </div>

                  {/* AI Draft & Rewrite Actions */}
                  <div className="flex items-center space-x-2">
                    {previousReplyText !== null && (
                      <button
                        type="button"
                        onClick={handleUndoRewrite}
                        className="inline-flex items-center text-xs text-brand hover:underline font-medium transition-colors mr-1"
                        title="Undo the last rewrite"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        <span>Undo</span>
                      </button>
                    )}

                    {/* Auto Reply Button */}
                    <button
                      type="button"
                      onClick={() => handleGenerateDraft(true, status)}
                      disabled={generatingDraft || rewriting}
                      title="Click to generate a fresh draft"
                      className="inline-flex items-center px-3.5 py-1.5 text-xs font-medium rounded-full bg-surface hover:bg-blush/40 text-brand border border-brand transition-colors disabled:opacity-50"
                    >
                      <Sparkles className={`w-3.5 h-3.5 mr-1.5 ${generatingDraft ? 'animate-spin' : ''}`} />
                      <span>{generatingDraft ? 'Drafting...' : 'Auto reply'}</span>
                    </button>

                    {/* Rewrite Button with Dropdown */}
                    <div className="relative inline-block text-left">
                      <button
                        type="button"
                        onClick={() => setShowRewriteMenu((prev) => !prev)}
                        disabled={generatingDraft || rewriting || !replyMessage.trim()}
                        className="inline-flex items-center px-3.5 py-1.5 text-xs font-medium rounded-full bg-surface hover:bg-blush/20 text-ink border border-line transition-colors disabled:opacity-50"
                        title="Rewrite this reply with a different tone or style"
                      >
                        <Wand2 className={`w-3.5 h-3.5 mr-1.5 ${rewriting ? 'animate-spin' : ''}`} />
                        <span>{rewriting ? 'Rewriting...' : 'Rewrite'}</span>
                        <ChevronDown className="w-3 h-3 ml-1 text-muted" />
                      </button>

                      {showRewriteMenu && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setShowRewriteMenu(false)}
                          />
                          <div className="absolute right-0 mt-1 w-44 rounded-xl bg-surface shadow-lg border border-line py-1 z-20">
                            {['Polish', 'Shorter', 'More empathetic', 'More formal'].map((mode) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => handleRewrite(mode)}
                                className="w-full text-left px-3.5 py-1.5 text-xs text-ink hover:bg-blush/40 hover:text-brand transition-colors"
                              >
                                {mode}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Error Fallback Notice */}
                {(aiError || ticket.aiStatus === 'failed') && (
                  <div className="mb-3 p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>AI is unavailable right now. You can write the reply manually.</span>
                    </div>
                    <button
                      onClick={() => handleGenerateDraft(true, status)}
                      disabled={generatingDraft}
                      className="font-medium underline ml-2 text-amber-950"
                    >
                      Retry
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendReply}>
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={6}
                    placeholder="Type your official reply here, or use 'Auto reply' to draft a response based on BookLeaf policy..."
                    required
                    className="w-full text-sm p-3.5 border border-line rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand font-sans text-ink bg-surface"
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3">
                    <span className="text-xs text-muted">
                      Sending a reply will automatically transition "Open" tickets to "In progress".
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleSendReply(e, false, true)}
                        disabled={sendingReply}
                        className="inline-flex items-center px-4 py-2 bg-surface hover:bg-slate-50 text-muted hover:text-ink border border-line rounded-full text-xs font-medium transition-colors disabled:opacity-50"
                        title="Send closing reply and mark ticket Closed"
                      >
                        <Lock className="w-3.5 h-3.5 mr-1.5 text-muted" />
                        <span>Send &amp; mark Closed</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleSendReply(e, true, false)}
                        disabled={sendingReply}
                        className="inline-flex items-center px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-xs font-medium transition-colors disabled:opacity-50"
                        title="Send this reply and mark the ticket Resolved"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                        <span>Send &amp; mark Resolved</span>
                      </button>
                      <button
                        type="submit"
                        disabled={sendingReply}
                        className="inline-flex items-center px-5 py-2 bg-brand hover:bg-brand-dark text-white rounded-full text-xs font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
                      >
                        {sendingReply ? (
                          <span>Sending...</span>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5 mr-1.5" />
                            <span>Send reply</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Sidebar Column (1 col): Author Info, Book Info, Overrides, Internal Notes */}
          <div className="space-y-6">
            {/* Manual Triage Overrides Card */}
            <div className="bg-surface border border-line rounded-xl p-5">
              <h3 className="text-xs font-medium text-muted mb-3">
                Ticket classification overrides
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-line rounded-lg bg-surface text-ink focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-line rounded-lg bg-surface text-ink focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <option value="Royalty & Payments">Royalty &amp; payments</option>
                    <option value="ISBN & Metadata Issues">ISBN &amp; metadata issues</option>
                    <option value="Printing & Quality">Printing &amp; quality</option>
                    <option value="Distribution & Availability">Distribution &amp; availability</option>
                    <option value="Book Status & Production Updates">Book status &amp; production</option>
                    <option value="General Inquiry">General inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-line rounded-lg bg-surface text-ink focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleSaveOverrides}
                  disabled={savingOverrides}
                  className="w-full mt-2 py-2 px-4 rounded-full border border-line bg-surface hover:bg-blush/30 text-ink text-xs font-medium transition-colors disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {savingOverrides ? 'Saving...' : 'Save overrides'}
                </button>
              </div>
            </div>

            {/* Author Information Card */}
            <div className="bg-surface border border-line rounded-xl p-5 text-sm">
              <h3 className="text-xs font-medium text-muted mb-3">
                Author details
              </h3>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-muted block">Name</span>
                  <span className="font-medium text-ink">{ticket.author?.name}</span>
                </div>
                <div>
                  <span className="text-xs text-muted block">Email</span>
                  <a
                    href={`mailto:${ticket.author?.email}`}
                    className="text-brand hover:underline font-medium text-xs"
                  >
                    {ticket.author?.email}
                  </a>
                </div>
                {ticket.author?.phone && (
                  <div>
                    <span className="text-xs text-muted block">Phone</span>
                    <span className="text-ink">{ticket.author?.phone}</span>
                  </div>
                )}
                {ticket.author?.city && (
                  <div>
                    <span className="text-xs text-muted block">City</span>
                    <span className="text-ink">{ticket.author?.city}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Book Information Card */}
            {ticket.book ? (
              <div className="bg-surface border border-line rounded-xl p-5 text-sm">
                <h3 className="text-xs font-medium text-muted mb-3">
                  Book fact sheet
                </h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-muted block">Title</span>
                    <span className="font-medium text-ink">{ticket.book.title}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted block">ISBN</span>
                    <span className="font-mono text-xs text-muted">{ticket.book.isbn}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted block">Status</span>
                    <span className="text-xs font-medium text-ink">{ticket.book.status}</span>
                  </div>
                  <div className="pt-2 border-t border-line grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted block">Copies sold</span>
                      <span className="font-semibold text-ink">{ticket.book.total_copies_sold ?? 0}</span>
                    </div>
                    <div>
                      <span className="text-muted block">MRP</span>
                      <span className="font-semibold text-ink">
                        {ticket.book.mrp !== null ? `₹${ticket.book.mrp}` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted block">Earned</span>
                      <span className="font-semibold text-ink">
                        ₹{(ticket.book.total_royalty_earned ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted block">Pending</span>
                      <span className="font-semibold text-amber-700">
                        ₹{(ticket.book.royalty_pending ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-surface border border-line rounded-xl p-4 text-xs text-muted italic">
                General / account level inquiry (No specific book attached).
              </div>
            )}

            {/* Private Internal Notes Card */}
            <div className="bg-surface border border-line rounded-xl p-5">
              <div className="flex items-center space-x-1.5 mb-1 text-amber-800">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <h3 className="text-xs font-medium text-ink">
                  Internal notes (private)
                </h3>
              </div>
              <p className="text-xs text-muted mb-3">
                Visible only to administrators.
              </p>

              {ticket.internalNotes?.length > 0 ? (
                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
                  {ticket.internalNotes.map((note, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-amber-50/50 border border-amber-200 text-xs">
                      <div className="flex items-center justify-between font-medium text-amber-900 mb-1">
                        <span>{note.admin?.name || 'Admin'}</span>
                        <span className="text-muted font-normal text-[11px]">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-ink whitespace-pre-wrap">{note.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted italic mb-3">No internal notes yet.</p>
              )}

              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={2}
                  placeholder="Add confidential internal note..."
                  required
                  className="w-full text-xs p-2.5 border border-line rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand text-ink bg-surface"
                />
                <button
                  type="submit"
                  disabled={addingNote}
                  className="w-full py-1.5 px-3 rounded-full border border-amber-300 bg-surface hover:bg-amber-50 text-amber-900 text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {addingNote ? 'Saving note...' : 'Add private note'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminTicket;
