import React, { useState, useRef, useEffect } from 'react';
import api from '../api';
import { StatusBadge } from './StatusBadge';
import UnreadDot from './UnreadDot';
import TicketProgress from './TicketProgress';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronUp, Send, Shield, User } from 'lucide-react';

export const TicketCard = ({ ticket, onTicketUpdated, isExpanded, onToggleExpand, isHighlighted }) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const cardRef = useRef(null);

  const expanded = isExpanded !== undefined ? isExpanded : internalExpanded;

  // Close conversation dropdown if clicked anywhere outside of this ticket card
  useEffect(() => {
    if (!expanded) return;

    const handleClickOutside = (event) => {
      if (cardRef.current && !cardRef.current.contains(event.target)) {
        if (
          event.target.closest('[role="dialog"]') ||
          event.target.closest('[data-dropdown]') ||
          event.target.closest('.toaster')
        ) {
          return;
        }
        if (onToggleExpand) {
          onToggleExpand(ticket._id, false);
        } else {
          setInternalExpanded(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expanded, onToggleExpand, ticket._id]);

  const toggleExpand = async () => {
    const nextState = !expanded;
    if (onToggleExpand) {
      onToggleExpand(ticket._id, nextState);
    } else {
      setInternalExpanded(nextState);
    }

    // When author expands conversation, mark as read
    if (nextState && ticket.unreadByAuthor) {
      // 1. Optimistically update local ticket state
      if (onTicketUpdated) {
        onTicketUpdated({ ...ticket, unreadByAuthor: false });
      }

      // 2. Optimistic UI update in Navbar
      window.dispatchEvent(new Event('ticket-read-updated'));

      // 3. Persist read state to backend
      try {
        await api.post(`/tickets/${ticket._id}/read`);
      } catch {
        // ignore
      }

      // 4. Re-sync count after DB commit
      window.dispatchEvent(new Event('ticket-read-updated'));
    }
  };

  const formattedDate = new Date(ticket.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const isClosed = ticket.status === 'Closed';
  const replyCount = ticket.replies?.length || 0;
  const isUnread = Boolean(ticket.unreadByAuthor);
  const isBlinking = isUnread || Boolean(isHighlighted);

  const handleAuthorReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) {
      toast.error('Please type a reply message first');
      document.getElementById(`author-reply-${ticket._id}`)?.focus();
      return;
    }

    setSending(true);
    try {
      const res = await api.post(`/tickets/${ticket._id}/replies`, {
        message: replyText.trim(),
      });
      setReplyText('');
      toast.success('Reply sent successfully!');
      if (onTicketUpdated) {
        onTicketUpdated(res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      ref={cardRef}
      className={`rounded-2xl transition-all duration-200 overflow-hidden ${
        expanded
          ? 'bg-white scale-[1.015] shadow-lg relative z-10 border border-line/60'
          : isBlinking
          ? 'animate-blink-green border border-emerald-200/60 shadow-2xs'
          : 'bg-white shadow-sm hover:shadow-md border border-line/40'
      }`}
    >
      {/* Top Part: filled with theme-compatible blush band when expanded */}
      <div
        className={`transition-colors duration-200 ${
          expanded ? 'bg-blush' : isBlinking ? 'bg-transparent' : 'bg-white'
        }`}
      >
        {/* Zone 1: Top row — subject + status */}
        <div className="px-4 sm:px-5 pt-4 sm:pt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-3 shrink-0 flex items-center justify-center">
                {ticket.unreadByAuthor && <UnreadDot />}
              </span>
              <h3 className="text-base truncate font-semibold text-ink">
                {ticket.subject}
              </h3>
            </div>
            <div className="shrink-0">
              <StatusBadge status={ticket.status} />
            </div>
          </div>

          {/* Zone 2: Muted line — book · date */}
          <p className="text-xs text-muted mt-1.5 pl-5">
            {ticket.book?.title || 'General question'} · {formattedDate}
          </p>
        </div>

        {/* Zone 3: Description preview */}
        <div className="px-4 sm:px-5 pt-3 pb-3">
          <div
            className={`rounded-xl p-3 text-sm text-body line-clamp-2 transition-colors ${
              expanded
                ? 'bg-white/90 shadow-2xs'
                : isBlinking
                ? 'bg-white/80 border border-green-100 shadow-2xs'
                : 'bg-blush-soft'
            }`}
          >
            {ticket.description}
          </div>
        </div>

        {/* Zone 4: Footer toggle row */}
        <div
          className={`mx-4 sm:mx-5 transition-colors ${
            expanded
              ? 'border-t border-line/60'
              : isBlinking
              ? 'border-t border-green-200/60'
              : 'border-t border-line/40'
          }`}
        >
          <button
            type="button"
            onClick={toggleExpand}
            aria-expanded={expanded}
            className="w-full flex items-center justify-between py-3 text-xs cursor-pointer group outline-none focus-visible:ring-2 focus-visible:ring-coral transition-colors"
          >
            <span className={isBlinking ? 'text-green-800/80 font-medium' : 'text-muted'}>
              {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
            </span>
            <span className="inline-flex items-center gap-1 text-coral-deep font-semibold group-hover:underline">
              <span>{expanded ? 'Hide conversation' : 'Show conversation'}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  expanded ? 'rotate-180' : ''
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Expanded Details & Conversation (Crisp white lower section) */}
      {expanded && (
        <div className="bg-white px-4 sm:px-5 py-5 space-y-5 animate-fade-in-up">
          {/* Progress bar — opens when author expands the ticket */}
          <div className="pb-3 border-b border-line/50">
            <TicketProgress status={ticket.status} />
          </div>

          {/* Metadata: Category & Short Ticket ID */}
          <div className="flex items-center justify-between text-xs text-muted">
            <span className="font-medium text-ink/80">{ticket.category}</span>
            <span className="tabular-nums">Ticket #{ticket._id?.slice(-8).toUpperCase()}</span>
          </div>

          {/* Full description */}
          <div className="text-sm text-body leading-relaxed whitespace-pre-wrap bg-blush-soft/60 rounded-xl p-3.5">
            {ticket.description}
          </div>

          {/* Conversation Thread */}
          {replyCount > 0 && (
            <div className="space-y-3 pt-2">
              {ticket.replies.map((reply, index) => {
                const isSupport = reply.from ? reply.from === 'admin' : reply.sentBy?.role === 'admin';
                return (
                  <div
                    key={index}
                    className={`p-3.5 rounded-2xl text-sm max-w-[85%] sm:max-w-lg ${
                      isSupport
                        ? 'bg-blush text-body mr-auto'
                        : 'bg-white border border-line text-body ml-auto'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs pb-2 mb-2 border-b border-line/60">
                      <span className="font-semibold text-ink flex items-center gap-1.5">
                        {isSupport ? (
                          <>
                            <Shield className="w-3.5 h-3.5 text-coral shrink-0" />
                            <span className="font-bold text-coral-deep">{reply.sentBy?.name || 'BookLeaf Support Team'}</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-coral/10 text-coral-deep border border-coral/20">
                              Support
                            </span>
                          </>
                        ) : (
                          <>
                            <User className="w-3.5 h-3.5 text-muted shrink-0" />
                            <span className="font-semibold text-ink">You</span>
                            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-700">
                              Author
                            </span>
                          </>
                        )}
                      </span>
                      <span className="text-muted tabular-nums text-[11px]">
                        {new Date(reply.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed select-text">{reply.message}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reply Form or Closed Notice */}
          <div className="pt-2">
            {isClosed ? (
              <p className="text-xs text-muted italic">
                This ticket is closed. If you need further assistance, please raise a new ticket.
              </p>
            ) : (
              <form onSubmit={handleAuthorReply} className="space-y-2">
                <textarea
                  id={`author-reply-${ticket._id}`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Type your reply here..."
                  className="input"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted tabular-nums">
                    {replyText.length}/2000
                  </span>
                  <button
                    type="submit"
                    disabled={sending}
                    className="btn-primary text-xs px-4 py-1.5"
                  >
                    {sending ? (
                      <span>Sending...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        <span>Send reply</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Bottom close / collapse button */}
          <div className="pt-3 border-t border-line/50 flex items-center justify-center">
            <button
              type="button"
              onClick={toggleExpand}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-coral-deep py-1.5 px-4 rounded-full bg-blush-soft/70 hover:bg-blush border border-line/60 hover:border-coral/30 transition-all cursor-pointer group shadow-2xs"
              title="Close conversation"
              aria-label="Close conversation"
            >
              <ChevronUp className="w-3.5 h-3.5 text-coral transition-transform group-hover:-translate-y-0.5" />
              <span>Close conversation</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketCard;
