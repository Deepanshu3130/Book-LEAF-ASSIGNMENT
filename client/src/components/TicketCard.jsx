import React, { useState } from 'react';
import api from '../api';
import { StatusBadge, PriorityBadge } from './StatusBadge';
import UnreadDot from './UnreadDot';
import toast from 'react-hot-toast';
import { Book, MessageCircle, ChevronDown, ChevronUp, User, Shield, Send } from 'lucide-react';

export const TicketCard = ({ ticket, onTicketUpdated, isExpanded, onToggleExpand }) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const expanded = isExpanded !== undefined ? isExpanded : internalExpanded;

  const toggleExpand = () => {
    const nextState = !expanded;
    if (onToggleExpand) {
      onToggleExpand(ticket._id, nextState);
    } else {
      setInternalExpanded(nextState);
    }

    // When author expands conversation, mark as read
    if (nextState && ticket.unreadByAuthor) {
      api.post(`/tickets/${ticket._id}/read`).catch(() => {});
      if (onTicketUpdated) {
        onTicketUpdated({ ...ticket, unreadByAuthor: false });
      }
      window.dispatchEvent(new Event('ticket-read-updated'));
    }
  };

  const formattedDate = new Date(ticket.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const isClosed = ticket.status === 'Closed';

  const handleAuthorReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

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
    <div className="bg-surface border border-line rounded-xl overflow-hidden transition-colors hover:border-line-dark">
      <div className="p-5">
        {/* Top row: Status, Priority & Category on left, Date & UnreadDot on right */}
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-3">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <span className="text-xs text-muted">
              {ticket.category}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted font-normal">{formattedDate}</span>
            {ticket.unreadByAuthor && <UnreadDot />}
          </div>
        </div>

        {/* Subject & Associated Book */}
        <h3 className="text-base font-semibold text-ink mb-1">
          {ticket.subject}
        </h3>
        {ticket.book ? (
          <div className="flex items-center text-xs text-muted mb-3 space-x-1.5">
            <Book className="w-3.5 h-3.5 text-muted opacity-70" />
            <span className="font-medium text-ink">{ticket.book.title}</span>
            <span>({ticket.book.isbn})</span>
          </div>
        ) : (
          <div className="text-xs text-muted mb-3 italic">General / account level ticket</div>
        )}

        {/* Original Description */}
        <p className="text-sm text-ink bg-blush/30 p-3.5 rounded-lg border border-line mb-4 whitespace-pre-wrap leading-relaxed">
          {ticket.description}
        </p>

        {/* Replies Summary Toggle */}
        <div className="flex items-center justify-between border-t border-line pt-3">
          <div className="flex items-center text-xs text-muted space-x-1">
            <MessageCircle className="w-3.5 h-3.5 opacity-60" />
            <span>
              {ticket.replies?.length || 0} {ticket.replies?.length === 1 ? 'reply' : 'replies'}
            </span>
          </div>

          <button
            onClick={toggleExpand}
            className="flex items-center text-xs font-medium text-brand hover:underline transition-colors"
          >
            <span>
              {expanded ? 'Hide conversation' : 'Show conversation'}
            </span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
          </button>
        </div>
      </div>

      {/* Expanded Conversation & Reply Section */}
      {expanded && (
        <div className="bg-page border-t border-line p-5 space-y-4">
          <h4 className="text-xs font-medium text-muted mb-2">
            Conversation
          </h4>

          {ticket.replies?.length === 0 ? (
            <p className="text-xs text-muted italic mb-2">No replies yet. Type below to add information.</p>
          ) : (
            <div className="space-y-3">
              {ticket.replies.map((reply, index) => {
                const isSupport = reply.from ? reply.from === 'admin' : reply.sentBy?.role === 'admin';
                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border text-sm ${
                      isSupport
                        ? 'bg-blush/40 border-line text-ink mr-4 sm:mr-8'
                        : 'bg-surface border-line text-ink ml-4 sm:ml-8'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium flex items-center space-x-1.5">
                        {isSupport ? (
                          <>
                            <Shield className="w-3.5 h-3.5 text-brand" />
                            <span className="text-brand font-semibold">BookLeaf Support Team</span>
                          </>
                        ) : (
                          <>
                            <User className="w-3.5 h-3.5 text-muted" />
                            <span className="text-ink font-semibold">You</span>
                          </>
                        )}
                      </span>
                      <span className="text-muted text-[11px]">
                        {new Date(reply.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed text-sm text-ink">{reply.message}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reply Form or Closed Notice */}
          <div className="pt-2">
            {isClosed ? (
              <div className="p-3 bg-surface border border-line rounded-lg text-xs text-muted italic text-center">
                This ticket is closed. Raise a new ticket if you need more help.
              </div>
            ) : (
              <form onSubmit={handleAuthorReply} className="pt-2">
                <label className="block text-xs font-medium text-ink mb-1.5">
                  Reply to this ticket
                </label>
                <div className="space-y-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Type your reply or follow-up question here..."
                    required
                    className="w-full text-sm p-3 bg-surface border border-line rounded-lg text-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand transition-colors"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">
                      {replyText.length}/2000 characters
                    </span>
                    <button
                      type="submit"
                      disabled={sending || !replyText.trim()}
                      className="inline-flex items-center px-5 py-2 bg-brand hover:bg-brand-dark text-white text-xs font-medium rounded-full transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
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
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketCard;
