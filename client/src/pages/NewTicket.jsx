import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { Send, AlertCircle } from 'lucide-react';

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
    <div className="min-h-screen bg-page flex flex-col">
      <Navbar />

      {/* Title Band with Soft Blush Background */}
      <div className="bg-blush border-b border-line py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-semibold text-ink">Raise a support ticket</h1>
          <p className="text-sm text-muted mt-1">
            Need help with royalties, printing quality, ISBN, or distribution? Send us your query.
          </p>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <div className="bg-surface border border-line rounded-xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Book Selection */}
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">
                Which book does this relate to?
              </label>
              <select
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface border border-line rounded-lg text-sm text-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand transition-colors"
              >
                <option value="general">General / account level (no specific book)</option>
                {books.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.title} ({b.isbn})
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your question or issue"
                required
                className="w-full px-3.5 py-2.5 bg-surface border border-line rounded-lg text-sm text-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">
                Detailed description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Provide as much context as possible (e.g. payout dates, retailers, defect details)..."
                required
                className="w-full px-3.5 py-2.5 bg-surface border border-line rounded-lg text-sm text-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand transition-colors"
              />
            </div>

            {/* File Attachment (UI only as instructed) */}
            <div className="bg-blush/30 border border-line rounded-lg p-4">
              <label className="block text-xs font-medium text-ink mb-1">
                Attach supporting file / screenshot
              </label>
              <div className="flex items-center space-x-3 mt-1.5">
                <input
                  type="file"
                  className="text-xs text-muted file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border file:border-line file:text-xs file:font-medium file:bg-surface file:text-ink hover:file:bg-blush/50 cursor-pointer transition-colors"
                />
              </div>
              <p className="text-xs text-muted mt-2 flex items-center">
                <AlertCircle className="w-3.5 h-3.5 mr-1 text-muted" />
                (UI only — file attachments are not uploaded in this take-home demo)
              </p>
            </div>

            {/* Submit and Cancel Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/tickets')}
                className="px-5 py-2.5 rounded-full border border-line text-sm font-medium text-muted hover:text-ink hover:border-line-dark transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center px-6 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-full text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand disabled:opacity-50"
              >
                {submitting ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    <span>Submit ticket</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default NewTicket;
