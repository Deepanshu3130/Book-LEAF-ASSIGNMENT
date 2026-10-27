import React, { useEffect, useState } from 'react';
import api from '../api';
import Navbar from '../components/Navbar';
import { BookOpen } from 'lucide-react';

export const MyBooks = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const res = await api.get('/books');
        setBooks(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load books');
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  // Calculate summary metrics across all books
  const totalEarned = books.reduce((acc, b) => acc + (b.total_royalty_earned || 0), 0);
  const totalPaid = books.reduce((acc, b) => acc + (b.royalty_paid || 0), 0);
  const totalPending = books.reduce((acc, b) => acc + (b.royalty_pending || 0), 0);
  const totalSold = books.reduce((acc, b) => acc + (b.total_copies_sold || 0), 0);

  return (
    <div className="min-h-screen bg-page flex flex-col">
      <Navbar />

      {/* Title Band with Soft Blush Background */}
      <div className="bg-blush border-b border-line py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-semibold text-ink">My published books &amp; royalties</h1>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            Track your book sales, production stages, and earned royalty payouts.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Metrics Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-surface p-5 rounded-xl border border-line">
            <span className="text-xs text-muted block mb-1">Total books</span>
            <div className="text-2xl font-semibold text-ink">{books.length}</div>
            <div className="text-xs text-muted mt-1">{totalSold.toLocaleString()} copies sold</div>
          </div>

          <div className="bg-surface p-5 rounded-xl border border-line">
            <span className="text-xs text-muted block mb-1">Total royalty earned</span>
            <div className="text-2xl font-semibold text-ink">₹{totalEarned.toLocaleString()}</div>
            <div className="text-xs text-muted mt-1">80% net author share</div>
          </div>

          <div className="bg-surface p-5 rounded-xl border border-line">
            <span className="text-xs text-muted block mb-1">Royalty paid</span>
            <div className="text-2xl font-semibold text-emerald-700">₹{totalPaid.toLocaleString()}</div>
            <div className="text-xs text-muted mt-1">Disbursed via bank transfer</div>
          </div>

          <div className="bg-surface p-5 rounded-xl border border-line">
            <span className="text-xs text-muted block mb-1">Royalty pending</span>
            <div className="text-2xl font-semibold text-amber-700">₹{totalPending.toLocaleString()}</div>
            <div className="text-xs text-muted mt-1">Processed quarterly</div>
          </div>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="text-center py-16 text-muted text-sm">Loading your books...</div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm">{error}</div>
        ) : books.length === 0 ? (
          /* Empty State */
          <div className="bg-surface border border-line rounded-xl p-12 text-center">
            <BookOpen className="w-10 h-10 text-muted mx-auto mb-3 opacity-60" />
            <h3 className="text-base font-semibold text-ink">No books found</h3>
            <p className="text-sm text-muted mt-1">
              You do not have any published books associated with your author account yet.
            </p>
          </div>
        ) : (
          /* Books Table */
          <div className="bg-surface border border-line rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-line text-xs font-medium text-muted">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">Book title &amp; ISBN</th>
                    <th scope="col" className="px-6 py-3.5">Genre</th>
                    <th scope="col" className="px-6 py-3.5">Published date</th>
                    <th scope="col" className="px-6 py-3.5">Status</th>
                    <th scope="col" className="px-6 py-3.5 text-right">MRP</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Sold</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Earned</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Paid</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Pending</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {books.map((book) => {
                    const isLive = book.status === 'Published & Live';
                    return (
                      <tr key={book._id} className="hover:bg-blush/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-ink">{book.title}</div>
                          <div className="text-xs text-muted font-mono mt-0.5">{book.isbn}</div>
                        </td>
                        <td className="px-6 py-4 text-muted">{book.genre}</td>
                        <td className="px-6 py-4 text-muted whitespace-nowrap">
                          {book.publication_date ? book.publication_date : <span className="italic">In production</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-xs text-ink font-medium">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                isLive ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                            />
                            <span>{book.status}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-muted font-medium">
                          {book.mrp !== null ? `₹${book.mrp}` : '—'}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-ink">
                          {book.total_copies_sold ?? 0}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-ink">
                          ₹{(book.total_royalty_earned ?? 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-emerald-700">
                          ₹{(book.royalty_paid ?? 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-amber-700">
                          ₹{(book.royalty_pending ?? 0).toLocaleString()}
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

export default MyBooks;
