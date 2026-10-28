import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Navbar from '../components/Navbar';
import PageBand from '../components/PageBand';
import { BookStatusBadge } from '../components/StatusBadge';
import CustomSelect from '../components/CustomSelect';
import toast from 'react-hot-toast';
import { Send, AlertCircle, BookOpen } from 'lucide-react';

const QUICK_CHIPS = [
  'Royalty not received',
  'Royalty amount seems low',
  'ISBN mismatch',
  'Print quality issue',
  'Book unavailable on Amazon',
  'Production delay',
  'Update book details',
];

export const NewTicket = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [bookId, setBookId] = useState('general');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const res = await api.get('/books');
        setBooks(res.data);
      } catch (err) {
        console.error('Failed to load author books:', err);
      }
    };
    fetchBooks();
  }, []);

  const selectedBook = books.find((b) => b._id === bookId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.error('Please enter both subject and description');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/tickets', {
        bookId: bookId === 'general' ? null : bookId,
        subject: subject.trim(),
        description: description.trim(),
      });

      toast.success('Your support ticket has been submitted!');
      navigate('/tickets');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <PageBand
        title="Raise a ticket"
        subtitle="Tell us what you need help with."
      />

      <main id="main" className="mx-auto max-w-6xl px-4 sm:px-6 py-5 sm:py-6 w-full flex-1 animate-fade-in-up">
        {/* On smaller screens, show the selected book above the form */}
        <div className="block lg:hidden mb-6 bg-blush rounded-2xl p-4">
          <span className="text-xs font-medium text-muted block mb-2">
            Selected book
          </span>
          {selectedBook ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-semibold text-ink text-sm leading-snug">{selectedBook.title}</h3>
                <p className="text-xs text-muted mt-0.5">{selectedBook.isbn}</p>
              </div>
              <div className="flex items-center gap-3">
                <BookStatusBadge status={selectedBook.status} />
                <span className="text-xs text-ink font-semibold tabular-nums">
                  Earned: ₹{(selectedBook.total_royalty_earned ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted leading-relaxed italic">
              General account inquiry · Not tied to a specific book
            </p>
          )}
        </div>

        {/* 2-Column Layout: Form on left, Selected Book panel on right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Form Container */}
          <div className="lg:col-span-2 bg-white border border-line rounded-2xl p-4 sm:p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Book Selection */}
              <div>
                <label htmlFor="bookId" className="block text-xs font-medium text-ink mb-2">
                  Which book is this about?
                </label>
                <CustomSelect
                  id="bookId"
                  ariaLabel="Which book is this about?"
                  value={bookId}
                  onChange={(e) => setBookId(e.target.value)}
                  options={[
                    { value: 'general', label: 'General / account level (no specific book)' },
                    ...books.map((b) => ({ value: b._id, label: `${b.title} (${b.isbn})` })),
                  ]}
                />
              </div>

              {/* Quick-pick Chips */}
              <div>
                <span className="block text-xs font-medium text-muted mb-2">
                  Quick-pick topics
                </span>
                <div className="flex flex-wrap gap-2">
                  {QUICK_CHIPS.map((chip) => {
                    const isSelected = subject === chip;
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setSubject(chip)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-coral text-white border-coral font-medium'
                            : 'bg-white text-body hover:bg-blush border-line'
                        }`}
                      >
                        {chip}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subject with Character Counter */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="subject" className="block text-xs font-medium text-ink">
                    Subject
                  </label>
                  <span className="text-[11px] text-muted tabular-nums">{subject.length}/120</span>
                </div>
                <input
                  id="subject"
                  type="text"
                  maxLength={120}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your question or issue"
                  required
                  className="input"
                />
              </div>

              {/* Description with Character Counter */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="description" className="block text-xs font-medium text-ink">
                    Description
                  </label>
                  <span className="text-[11px] text-muted tabular-nums">{description.length}/2000</span>
                </div>
                <textarea
                  id="description"
                  maxLength={2000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder="Provide as much context as possible (e.g. payout dates, retailers, defect details)..."
                  required
                  className="input"
                />
              </div>

              {/* File Attachment (UI only demo) */}
              <div className="bg-blush-soft rounded-xl p-4">
                <label htmlFor="ticket-attachment" className="block text-xs font-medium text-ink mb-1">
                  Attach supporting file / screenshot
                </label>
                <div className="flex items-center space-x-3 mt-1.5">
                  <input
                    id="ticket-attachment"
                    type="file"
                    className="text-xs text-muted file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border file:border-line file:text-xs file:font-medium file:bg-white file:text-coral-deep hover:file:bg-blush cursor-pointer transition-colors"
                  />
                </div>
                <p className="text-xs text-muted mt-2 flex items-center">
                  <AlertCircle className="w-3.5 h-3.5 mr-1 text-muted" />
                  (UI demo — file attachments are not uploaded in this take-home demo)
                </p>
              </div>

              {/* Submit & Cancel Actions */}
              <div className="flex items-center justify-end space-x-4 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/tickets')}
                  className="text-sm text-muted hover:text-ink transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs"
                >
                  {submitting ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      <span>Submit ticket</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Selected Book Side Panel (flat blush, no border) */}
          <div className="hidden lg:block lg:col-span-1 bg-blush rounded-2xl p-6 sticky top-20">
            <span className="text-xs font-medium text-muted block mb-4">
              Selected book
            </span>

            {selectedBook ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-ink text-base leading-snug">
                    {selectedBook.title}
                  </h3>
                  <p className="text-xs text-muted mt-0.5">{selectedBook.isbn}</p>
                  <div className="mt-3">
                    <BookStatusBadge status={selectedBook.status} />
                  </div>
                </div>

                <div className="pt-3 border-t border-line space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Publication date</span>
                    <span className="text-ink font-medium">
                      {selectedBook.publication_date || <span className="italic font-normal">In production</span>}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Copies sold</span>
                    <span className="text-ink font-semibold tabular-nums">
                      {(selectedBook.total_copies_sold ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Total royalty earned</span>
                    <span className="text-ink font-semibold tabular-nums">
                      ₹{(selectedBook.total_royalty_earned ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Royalty paid</span>
                    <span className="text-ink font-semibold tabular-nums">
                      ₹{(selectedBook.royalty_paid ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-line">
                    <span className="text-muted font-medium">Royalty pending</span>
                    <span className="text-ink font-semibold tabular-nums">
                      ₹{(selectedBook.royalty_pending ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted space-y-2 leading-relaxed bg-white p-4 rounded-xl border border-line">
                <div className="flex items-center gap-1.5 text-ink font-semibold">
                  <BookOpen className="w-4 h-4 text-coral" />
                  <span>General inquiry</span>
                </div>
                <p>
                  This inquiry is not tied to a specific book. Use this for general author royalty questions, profile updates, account access, or publisher correspondence.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default NewTicket;
