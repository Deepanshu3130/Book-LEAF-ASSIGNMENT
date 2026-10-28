import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import Navbar from '../components/Navbar';
import PageBand from '../components/PageBand';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import Skeleton from '../components/Skeleton';
import ConfirmModal from '../components/ConfirmModal';
import CustomSelect from '../components/CustomSelect';
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
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Wand2,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'Open', label: 'Open' },
  { value: 'In Progress', label: 'In progress' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Closed', label: 'Closed' },
];

const CATEGORY_OPTIONS = [
  { value: 'Royalty & Payments', label: 'Royalty & payments' },
  { value: 'ISBN & Metadata Issues', label: 'ISBN & metadata issues' },
  { value: 'Printing & Quality', label: 'Printing & quality' },
  { value: 'Distribution & Availability', label: 'Distribution & availability' },
  { value: 'Book Status & Production Updates', label: 'Book status & production' },
  { value: 'General Inquiry', label: 'General inquiry' },
];

const PRIORITY_OPTIONS = [
  { value: 'Critical', label: 'Critical' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

export const AdminTicket = () => {
  const { id } = useParams();

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
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);

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
      window.dispatchEvent(new Event('ticket-read-updated'));
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

      // Auto reply logic: pre-fill cached draft or automatically generate a fresh one on open
      if (t.aiDraft && t.aiDraft.trim()) {
        setReplyMessage(t.aiDraft);
      } else if (t.status !== 'Closed') {
        handleGenerateDraft(false, t.status);
      }

      // Mark unreadByAdmin as false when admin opens this ticket
      if (t.unreadByAdmin) {
        markAsRead();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch ticket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();

    // Real-time socket event for updates to this ticket
    if (currentUser?.id) {
      const socket = initSocket(currentUser.id, currentUser.role);

      socket.on('ticket:updated', (updatedTicket) => {
        if (updatedTicket._id === id) {
          setTicket(updatedTicket);
          setStatus(updatedTicket.status);
          setCategory(updatedTicket.category);
          setPriority(updatedTicket.priority);
          // If the reply box is empty and a draft is ready, auto-fill it
          if (updatedTicket.aiDraft && updatedTicket.aiDraft.trim()) {
            setReplyMessage((curr) => (curr && curr.trim() ? curr : updatedTicket.aiDraft));
          }
          markAsRead();
        }
      });
    }

    return () => {
      disconnectSocket();
    };
  }, [id, currentUser?.id]);

  // Save classification overrides
  const handleSaveOverrides = async () => {
    setSavingOverrides(true);
    try {
      const res = await api.patch(`/admin/tickets/${id}/override`, {
        status,
        category,
        priority,
      });
      const updated = res.data;
      setTicket(updated);
      toast.success('Ticket overrides saved successfully');

      // If status changed and no custom reply entered, offer to regenerate draft
      if (status !== ticket.status && !replyMessage.trim() && status !== 'Closed') {
        handleGenerateDraft(false, status);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update overrides');
    } finally {
      setSavingOverrides(false);
    }
  };

  // Assign to current logged in admin
  const handleAssignToMe = async () => {
    try {
      const res = await api.patch(`/admin/tickets/${id}/assign`, {
        assignedTo: currentUser.id,
      });
      setTicket(res.data);
      toast.success('Assigned ticket to you');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign ticket');
    }
  };

  const getAuthorFirstName = () => {
    return ticket?.author?.name ? ticket.author.name.trim().split(' ')[0] : 'Author';
  };

  const getResolvedMessage = () => {
    const firstName = getAuthorFirstName();
    const bookTitle = ticket?.book?.title ? ` regarding "${ticket.book.title}"` : '';
    return `Hi ${firstName},\n\nWe have resolved the issue${bookTitle} at our end. Please check it out and verify if everything looks good to you.\n\nIf you have any further questions or if anything is still not right, feel free to reply directly to this ticket at any time.\n\nWarm regards,\nBookLeaf Support Team`;
  };

  const getClosedMessage = () => {
    const firstName = getAuthorFirstName();
    return `Hi ${firstName},\n\nAs you confirmed that your issue has been solved, we are closing this ticket. Thank you for choosing BookLeaf Publishing! If you ever need help in the future, please feel free to raise a new ticket.\n\nWarm regards,\nBookLeaf Support Team`;
  };

  // Send reply: markResolved or markClosed options with custom or default message
  const handleSendReply = async (e, markResolved = false, markClosed = false, explicitMessage = null) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const messageToSend = (explicitMessage !== null ? explicitMessage : replyMessage).trim();
    if (!messageToSend) {
      toast.error('Reply message cannot be empty');
      return;
    }

    setSendingReply(true);
    try {
      const payload = {
        message: messageToSend,
        markResolved: Boolean(markResolved),
        markClosed: Boolean(markClosed),
      };

      const res = await api.post(`/admin/tickets/${id}/reply`, payload);
      const updated = res.data;
      setTicket(updated);
      setStatus(updated.status);
      setReplyMessage('');
      setPreviousReplyText(null);

      // Decrement unread if this ticket was unread
      window.dispatchEvent(new Event('ticket-read-updated'));

      if (markClosed) {
        toast.success('Ticket closed and closing reply sent!');
      } else if (markResolved) {
        toast.success('Ticket marked Resolved and reply sent!');
      } else {
        toast.success('Reply sent to author successfully!');
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
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <PageBand
          above={<Skeleton className="h-4 w-28" />}
          title="Loading ticket..."
          subtitle="Please wait"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-28" />
          </div>
        </PageBand>
        <main id="main" className="mx-auto max-w-6xl px-6 py-6 w-full flex-1 animate-fade-in-up">
          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
            <div className="space-y-5">
              <div className="bg-white border border-line rounded-2xl p-6 space-y-4">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
              <div className="bg-white border border-line rounded-2xl p-6 space-y-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            </div>
            <div className="space-y-5">
              <div className="bg-blush rounded-2xl p-6 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full rounded-lg" />
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
              <div className="bg-blush rounded-2xl p-6 space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-44" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-muted text-sm">
          Ticket not found.
        </div>
      </div>
    );
  }

  const isClosed = ticket.status === 'Closed';
  const isUnchangedAiDraft = Boolean(ticket.aiDraft && replyMessage === ticket.aiDraft);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      {/* PageBand Header */}
      <PageBand
        above={
          <Link
            to="/admin"
            className="inline-flex items-center text-xs text-muted hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            <span>Back to tickets</span>
          </Link>
        }
        title={ticket.subject}
        action={
          ticket.assignedTo ? (
            <div className="text-xs text-muted flex items-center gap-1.5 pt-1">
              <UserCheck className="w-3.5 h-3.5 text-coral shrink-0" />
              <span>Assigned to <strong className="text-ink font-semibold">{ticket.assignedTo.name}</strong></span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAssignToMe}
              className="btn-secondary text-xs"
            >
              Assign to me
            </button>
          )
        }
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <StatusBadge status={ticket.status} />
          <span>·</span>
          <PriorityBadge priority={ticket.priority} />
          <span>·</span>
          <span>{ticket.category}</span>
        </div>
      </PageBand>

      <main id="main" className="mx-auto max-w-6xl px-6 py-6 w-full flex-1 animate-fade-in-up">
        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5 items-start">
          {/* Left Column */}
          <div className="space-y-5">
            {/* Card 1: Conversation */}
            <div className="bg-white border border-line rounded-2xl p-5 space-y-4">
              <h2 className="text-base font-semibold text-ink">Conversation</h2>

              {/* Original description in bg-blush-soft rounded-xl inset */}
              <div className="bg-blush-soft rounded-xl p-4 text-sm text-body leading-relaxed whitespace-pre-wrap">
                <p>{ticket.description}</p>
                <div className="text-xs text-muted mt-2 text-right">
                  Raised on {new Date(ticket.createdAt).toLocaleString()}
                </div>
              </div>

              {/* Replies */}
              {ticket.replies?.length === 0 ? (
                <p className="text-xs text-muted italic">No replies have been sent to the author yet.</p>
              ) : (
                <div className="space-y-3 pt-1">
                  {ticket.replies.map((r, i) => {
                    const isStaff = r.from ? r.from === 'admin' : r.sentBy?.role === 'admin';
                    return (
                      <div
                        key={i}
                        className={`p-3.5 rounded-2xl text-sm ${
                          isStaff
                            ? 'bg-blush text-body mr-4 sm:mr-8'
                            : 'bg-white border border-line text-body ml-4 sm:ml-8'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs pb-2 mb-2 border-b border-line/60">
                          <span className="font-semibold text-ink flex items-center gap-1.5">
                            {isStaff ? (
                              <>
                                <Shield className="w-3.5 h-3.5 text-coral shrink-0" />
                                <span className="font-bold text-ink">{r.sentBy?.name || 'BookLeaf Support Team'}</span>
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-coral/10 text-coral-deep border border-coral/20">
                                  Staff
                                </span>
                              </>
                            ) : (
                              <>
                                <User className="w-3.5 h-3.5 text-muted shrink-0" />
                                <span className="font-semibold text-ink">{ticket.author?.name || 'Author'}</span>
                                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-700">
                                  Author
                                </span>
                              </>
                            )}
                          </span>
                          <span className="text-muted text-xs tabular-nums">
                            {new Date(r.createdAt).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed select-text">{r.message}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Card 2: Reply to author */}
            {isClosed ? (
              <div className="bg-white border border-line rounded-2xl p-5 text-center text-xs text-muted italic">
                This ticket is permanently closed. No further replies can be sent.
              </div>
            ) : (
              <div className="bg-white border border-line rounded-2xl p-5">
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-ink">Reply to author</h2>
                    {replyMessage.trim() && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                        Draft ready
                      </span>
                    )}
                  </div>

                  {/* Secondary pills: Clear text, Auto reply & Rewrite */}
                  <div className="flex items-center space-x-2">
                    {replyMessage.trim() && (
                      <button
                        type="button"
                        onClick={() => setReplyMessage('')}
                        className="text-xs text-muted hover:text-coral-deep font-medium transition-colors cursor-pointer mr-1 px-2.5 py-1 rounded-lg hover:bg-blush-soft"
                        title="Clear reply box"
                      >
                        Clear text
                      </button>
                    )}

                    {previousReplyText !== null && (
                      <button
                        type="button"
                        onClick={handleUndoRewrite}
                        className="inline-flex items-center text-xs text-coral-deep hover:underline font-medium transition-colors mr-1 cursor-pointer"
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
                      className="btn-secondary text-xs px-3.5 py-1.5"
                    >
                      <Sparkles className={`w-3.5 h-3.5 mr-1.5 text-coral ${generatingDraft ? 'animate-spin' : ''}`} />
                      <span>{generatingDraft ? 'Drafting...' : 'Auto reply'}</span>
                    </button>

                    {/* Rewrite Button with Dropdown */}
                    <div className="relative inline-block text-left">
                      <button
                        type="button"
                        onClick={() => setShowRewriteMenu((prev) => !prev)}
                        disabled={generatingDraft || rewriting || !replyMessage.trim()}
                        className="btn-secondary text-xs px-3.5 py-1.5"
                        title="Rewrite this reply with a different tone or style"
                      >
                        <Wand2 className={`w-3.5 h-3.5 mr-1.5 text-muted ${rewriting ? 'animate-spin' : ''}`} />
                        <span>{rewriting ? 'Rewriting...' : 'Rewrite'}</span>
                        <ChevronDown className="w-3 h-3 ml-1 text-muted" />
                      </button>

                      {showRewriteMenu && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setShowRewriteMenu(false)}
                          />
                          <div className="absolute right-0 mt-1 w-44 rounded-2xl bg-white shadow-lg border border-line py-1 z-20">
                            {['Polish', 'Shorter', 'More empathetic', 'More formal'].map((mode) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => handleRewrite(mode)}
                                className="w-full text-left px-3.5 py-1.5 text-xs text-body hover:bg-blush-soft hover:text-coral-deep transition-colors cursor-pointer font-medium"
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

                {/* Subtitle when AI draft is generating or loaded */}
                {generatingDraft ? (
                  <p className="text-xs text-coral-deep font-medium flex items-center gap-1.5 mb-2 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5 animate-spin text-coral" />
                    <span>Generating AI draft based on BookLeaf policies...</span>
                  </p>
                ) : (
                  ticket?.aiDraft && replyMessage === ticket.aiDraft && (
                    <p className="text-xs text-muted mb-2">
                      AI draft loaded. Review and edit before sending.
                    </p>
                  )
                )}

                {/* AI Error Fallback Notice */}
                {(aiError || ticket.aiStatus === 'failed') && (
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>AI is unavailable right now. You can write the reply manually.</span>
                    </div>
                    <button
                      onClick={() => handleGenerateDraft(true, status)}
                      disabled={generatingDraft}
                      className="font-medium underline ml-2 text-amber-950 cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendReply}>
                  <label htmlFor="admin-reply-message" className="sr-only">
                    Official reply
                  </label>
                  <textarea
                    id="admin-reply-message"
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={6}
                    placeholder={
                      generatingDraft
                        ? 'Generating AI draft based on BookLeaf policies...'
                        : "Type your reply here, or click 'Auto reply' to generate a response based on BookLeaf policies..."
                    }
                    className={`input ${isUnchangedAiDraft ? 'border-l-4 border-l-coral' : ''}`}
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3">
                    <span className="text-xs text-muted">
                      Sending a reply will automatically transition "Open" tickets to "In progress".
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="submit"
                        disabled={sendingReply || !replyMessage.trim()}
                        className="btn-primary text-xs px-4 py-2"
                      >
                        {sendingReply ? (
                          <span>Sending...</span>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5 mr-1.5" />
                            <span>Send</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          if (!replyMessage.trim()) {
                            // Empty box -> send directly!
                            handleSendReply(null, true, false, getResolvedMessage());
                          } else {
                            // Box has text -> show warning modal
                            setShowResolveModal(true);
                          }
                        }}
                        disabled={sendingReply}
                        className="btn-secondary text-xs px-4 py-2"
                        title="Mark ticket Resolved and send reply"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-muted" />
                        <span>Send &amp; mark resolved</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          if (!replyMessage.trim()) {
                            // Empty box -> send directly!
                            handleSendReply(null, false, true, getClosedMessage());
                          } else {
                            // Box has text -> show warning modal
                            setShowCloseModal(true);
                          }
                        }}
                        disabled={sendingReply}
                        className="btn-secondary text-xs px-4 py-2"
                        title="Send closing reply and mark ticket Closed"
                      >
                        <Lock className="w-3.5 h-3.5 mr-1.5 text-muted" />
                        <span>Send &amp; mark closed</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Right Column: flat bg-blush rounded-2xl panels with no border */}
          <div className="space-y-5">
            {/* Panel 1: Overrides */}
            <div className="bg-blush rounded-2xl p-5">
              <h2 className="text-xs text-muted font-medium mb-3">Overrides</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <label htmlFor="override-status" className="block text-xs text-muted font-medium mb-1">
                    Status
                  </label>
                  <CustomSelect
                    id="override-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    options={STATUS_OPTIONS}
                    ariaLabel="Override status"
                  />
                </div>

                <div>
                  <label htmlFor="override-category" className="block text-xs text-muted font-medium mb-1">
                    Category
                  </label>
                  <CustomSelect
                    id="override-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    options={CATEGORY_OPTIONS}
                    ariaLabel="Override category"
                  />
                </div>

                <div>
                  <label htmlFor="override-priority" className="block text-xs text-muted font-medium mb-1">
                    Priority
                  </label>
                  <CustomSelect
                    id="override-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    options={PRIORITY_OPTIONS}
                    ariaLabel="Override priority"
                  />
                </div>

                <div>
                  <label className="block text-xs text-muted font-medium mb-1">
                    Assigned to
                  </label>
                  <div className="text-xs text-ink font-medium px-3 py-2 rounded-lg bg-white border border-line flex items-center justify-between">
                    <span>{ticket.assignedTo?.name || 'Unassigned'}</span>
                    {!ticket.assignedTo && (
                      <button
                        type="button"
                        onClick={handleAssignToMe}
                        className="text-xs text-coral-deep hover:underline font-semibold cursor-pointer"
                      >
                        Assign to me
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveOverrides}
                  disabled={savingOverrides}
                  className="btn-primary w-full text-xs"
                >
                  {savingOverrides ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            {/* Panel 2: Author and book */}
            <div className="bg-blush rounded-2xl p-5 text-sm">
              <h2 className="text-xs text-muted font-medium mb-3">Author and book</h2>
              <div className="space-y-4">
                {/* Author Info */}
                <div className="space-y-2 pb-3 border-b border-line">
                  <div className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-muted shrink-0" />
                    <span>Author details</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted block">Name</span>
                    <span className="font-medium text-ink">{ticket.author?.name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted block">Email</span>
                    <a
                      href={`mailto:${ticket.author?.email}`}
                      className="text-coral-deep hover:underline font-medium text-xs"
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

                {/* Book Info */}
                {ticket.book ? (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-ink flex items-center gap-1.5">
                      <Book className="w-3.5 h-3.5 text-coral shrink-0" />
                      <span>Book fact sheet</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted block">Title</span>
                      <span className="font-medium text-ink">{ticket.book.title}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted block">ISBN</span>
                      <span className="text-xs text-muted tabular-nums">{ticket.book.isbn}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted block">Status</span>
                      <span className="text-xs font-medium text-ink">{ticket.book.status}</span>
                    </div>
                    <div className="pt-2 border-t border-line grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted block text-xs">Copies sold</span>
                        <span className="font-medium text-ink tabular-nums">{ticket.book.total_copies_sold ?? 0}</span>
                      </div>
                      <div>
                        <span className="text-muted block text-xs">MRP</span>
                        <span className="font-medium text-ink tabular-nums">
                          {ticket.book.mrp !== null ? `₹${ticket.book.mrp}` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted block text-xs">Earned</span>
                        <span className="font-medium text-ink tabular-nums">
                          ₹{(ticket.book.total_royalty_earned ?? 0).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted block text-xs">Pending</span>
                        <span className="font-semibold text-ink tabular-nums">
                          ₹{(ticket.book.royalty_pending ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted italic pt-1">
                    General question (no book attached).
                  </div>
                )}
              </div>
            </div>

            {/* Panel 3: Internal notes */}
            <div className="bg-blush rounded-2xl p-5 border border-line/60">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-coral shrink-0" />
                  <span>Internal notes</span>
                </h2>
                <span className="text-[11px] text-muted">Confidential</span>
              </div>

              {ticket.internalNotes?.length > 0 ? (
                <div className="space-y-2.5 mb-3.5 max-h-56 overflow-y-auto pr-1">
                  {ticket.internalNotes.map((note, i) => (
                    <div key={i} className="rounded-xl bg-white border border-line shadow-2xs overflow-hidden">
                      {/* Distinct note header showing who wrote it and timestamp */}
                      <div className="flex items-center justify-between px-3 py-1.5 bg-blush-soft/80 border-b border-line/60 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Shield className="w-3.5 h-3.5 text-coral shrink-0" />
                          <span className="font-bold text-ink truncate">
                            {note.admin?.name || 'BookLeaf Admin'}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-coral/10 text-coral-deep border border-coral/20">
                            Admin
                          </span>
                        </div>
                        <span className="text-[11px] text-muted tabular-nums shrink-0 ml-2">
                          {new Date(note.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {/* Actual note text with clear visual separation */}
                      <div className="p-3 text-xs text-body leading-relaxed whitespace-pre-wrap font-sans bg-white select-text">
                        {note.text}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-white/70 border border-line/50 text-center mb-3">
                  <p className="text-xs text-muted italic">No internal notes yet.</p>
                </div>
              )}

              <form onSubmit={handleAddNote} className="space-y-2">
                <label htmlFor="internal-note-text" className="sr-only">
                  Add internal note
                </label>
                <textarea
                  id="internal-note-text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={2}
                  placeholder="Add confidential internal note..."
                  required
                  className="input text-xs bg-white"
                />
                <button
                  type="submit"
                  disabled={addingNote}
                  className="btn-secondary w-full text-xs py-1.5 hover:bg-white"
                >
                  {addingNote ? 'Saving note...' : 'Add private note'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Warning modal when resolving with unsent text in the box */}
      <ConfirmModal
        open={showResolveModal}
        title="Mark ticket as Resolved?"
        message={
          <div className="space-y-2.5">
            <p className="text-xs text-ink/85 leading-relaxed">
              The message currently in your reply box will <strong>not</strong> be used. Instead, the following official resolution message will be sent to <strong>{getAuthorFirstName()}</strong>:
            </p>
            <div className="p-3 bg-blush-soft border border-line rounded-xl text-xs text-body whitespace-pre-wrap max-h-44 overflow-y-auto leading-relaxed">
              {getResolvedMessage()}
            </div>
          </div>
        }
        confirmText="Replace & Resolve"
        cancelText="Cancel"
        onConfirm={() => {
          setShowResolveModal(false);
          handleSendReply(null, true, false, getResolvedMessage());
        }}
        onCancel={() => setShowResolveModal(false)}
      />

      {/* Warning modal when closing with unsent text in the box */}
      <ConfirmModal
        open={showCloseModal}
        title="Close this ticket?"
        message={
          <div className="space-y-2.5">
            <p className="text-xs text-ink/85 leading-relaxed">
              The message currently in your reply box will <strong>not</strong> be used. Instead, the following official closing message will be sent to <strong>{getAuthorFirstName()}</strong>:
            </p>
            <div className="p-3 bg-blush-soft border border-line rounded-xl text-xs text-body whitespace-pre-wrap max-h-44 overflow-y-auto leading-relaxed">
              {getClosedMessage()}
            </div>
          </div>
        }
        confirmText="Replace & Close"
        cancelText="Cancel"
        onConfirm={() => {
          setShowCloseModal(false);
          handleSendReply(null, false, true, getClosedMessage());
        }}
        onCancel={() => setShowCloseModal(false)}
      />
    </div>
  );
};

export default AdminTicket;
