import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight } from 'lucide-react';

/**
 * Friendly 404 page for unmatched routes.
 * Detects the user's role and directs them to the appropriate portal home.
 */
export const NotFound = () => {
  let homePath = '/login';
  let buttonLabel = 'Back to login';

  try {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (token && user) {
      if (user.role === 'admin') {
        homePath = '/admin';
        buttonLabel = 'Back to admin queue';
      } else {
        homePath = '/books';
        buttonLabel = 'Back to my books';
      }
    }
  } catch {
    // Fall back to /login on any localStorage parsing error
  }

  return (
    <div className="min-h-screen bg-page flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 text-center">
      <main id="main" className="max-w-md w-full bg-surface border border-line rounded-2xl p-8 sm:p-10 shadow-xs animate-fade-in-up">
        <div className="w-16 h-16 bg-blush rounded-2xl flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-8 h-8 text-brand" />
        </div>
        <span className="text-xs font-semibold text-brand uppercase tracking-wider">
          404 Error
        </span>
        <h1 className="text-2xl font-semibold text-ink mt-2 mb-3">
          We couldn't find that page
        </h1>
        <p className="text-sm text-muted mb-8 leading-relaxed">
          The page you are looking for doesn't exist, has been moved, or is temporarily unavailable.
        </p>
        <Link
          to={homePath}
          className="inline-flex items-center justify-center px-6 py-3 bg-brand hover:bg-brand-dark text-white rounded-full text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand w-full sm:w-auto"
        >
          <span>{buttonLabel}</span>
          <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </main>
    </div>
  );
};

export default NotFound;
