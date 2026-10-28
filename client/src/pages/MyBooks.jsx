import React, { useEffect, useState } from 'react';
import api from '../api';
import Navbar from '../components/Navbar';
import PageBand from '../components/PageBand';
import { BookStatusBadge } from '../components/StatusBadge';
import Skeleton from '../components/Skeleton';

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
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <PageBand
        title="My books"
        subtitle="Your published books and royalties."
      />

      <main id="main" className="mx-auto max-w-6xl px-6 py-6 w-full flex-1 animate-fade-in-up">
        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-4 w-44" />
            <div className="border border-line rounded-2xl p-6 bg-white">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="border border-line rounded-2xl p-5 bg-white space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="border border-line text-body p-4 rounded-2xl text-sm bg-white">{error}</div>
        ) : books.length === 0 ? (
          <div className="border border-line rounded-2xl p-12 text-center bg-white">
            <p className="text-sm text-muted">
              You have no books yet. Once a book is in production it will show up here.
            </p>
          </div>
        ) : (
          <>
            {/* Counts above strip */}
            <p className="text-sm text-muted mb-2">
              {books.length} {books.length === 1 ? 'book' : 'books'} · {totalSold.toLocaleString()} copies sold
            </p>

            {/* ONE bordered white card with three figures side by side */}
            <div className="border border-line rounded-2xl bg-white p-5 mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-line">
                <div>
                  <span className="text-xs text-muted block mb-1">Total earned</span>
                  <span className="text-2xl font-semibold text-ink tabular-nums">
                    ₹{totalEarned.toLocaleString()}
                  </span>
                </div>
                <div className="pt-4 sm:pt-0 sm:pl-6">
                  <span className="text-xs text-muted block mb-1">Paid</span>
                  <span className="text-2xl font-semibold text-ink tabular-nums">
                    ₹{totalPaid.toLocaleString()}
                  </span>
                </div>
                <div className="pt-4 sm:pt-0 sm:pl-6">
                  <span className="text-xs text-muted block mb-1">Pending</span>
                  <span className="text-2xl font-semibold text-ink tabular-nums">
                    ₹{totalPending.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted block mt-1">Processed quarterly</span>
                </div>
              </div>
            </div>

            {/* ONE CARD PER BOOK */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {books.map((book) => {
                const inProduction = book.status !== 'Published & Live' || !book.publication_date;

                return (
                  <div
                    key={book._id}
                    className="bg-white border border-line rounded-2xl p-5"
                  >
                    {/* Top: title on left, status on right */}
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h3 className="font-semibold text-ink text-base leading-snug">
                        {book.title}
                      </h3>
                      <div className="shrink-0">
                        <BookStatusBadge status={book.status} />
                      </div>
                    </div>

                    {/* Muted line: genre · published date · ISBN */}
                    <p className="text-xs text-muted mb-4">
                      {book.genre} · {book.publication_date || 'In production'} · {book.isbn}
                    </p>

                    {/* Middle: three figures in a bg-blush-soft inset */}
                    <div className="bg-blush-soft rounded-xl p-3 mb-4">
                      {inProduction ? (
                        <>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <span className="text-xs text-muted block">Earned</span>
                              <span className="text-sm font-medium text-ink tabular-nums">₹0</span>
                            </div>
                            <div>
                              <span className="text-xs text-muted block">Paid</span>
                              <span className="text-sm font-medium text-ink tabular-nums">₹0</span>
                            </div>
                            <div>
                              <span className="text-xs text-muted block">Pending</span>
                              <span className="text-sm font-semibold text-ink tabular-nums">₹0</span>
                            </div>
                          </div>
                          <span className="text-xs text-muted italic block mt-1">Not on sale yet</span>
                        </>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-xs text-muted block">Earned</span>
                            <span className="text-sm font-medium text-ink tabular-nums">
                              ₹{(book.total_royalty_earned ?? 0).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-muted block">Paid</span>
                            <span className="text-sm font-medium text-ink tabular-nums">
                              ₹{(book.royalty_paid ?? 0).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-muted block">Pending</span>
                            <span className="text-sm font-semibold text-ink tabular-nums">
                              ₹{(book.royalty_pending ?? 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom muted line */}
                    <p className="text-xs text-muted pt-3 border-t border-line">
                      {book.mrp !== null ? `MRP ₹${book.mrp}` : 'MRP —'} · {(book.total_copies_sold ?? 0).toLocaleString()} copies sold
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default MyBooks;
