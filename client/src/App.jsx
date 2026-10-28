import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Login from './pages/Login';
import MyBooks from './pages/MyBooks';
import NewTicket from './pages/NewTicket';
import MyTickets from './pages/MyTickets';
import AdminQueue from './pages/AdminQueue';
import AdminTicket from './pages/AdminTicket';
import NotFound from './pages/NotFound';

// Simple route guard ensuring user is authenticated and authorized for the route role
const ProtectedRoute = ({ children, requiredRole }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    // Redirect author away from admin routes and vice-versa
    return <Navigate to={user.role === 'admin' ? '/admin' : '/books'} replace />;
  }

  return children;
};

// Root index redirect based on user authentication and role
const RootRedirect = () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={user.role === 'admin' ? '/admin' : '/books'} replace />;
};

export const App = () => {
  return (
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        gutter={10}
        containerStyle={{
          bottom: 24,
          right: 24,
        }}
        toastOptions={{
          duration: 3500,
          style: {
            background: '#ffffff',
            color: '#3B3036',
            border: '1px solid #F0D6DB',
            borderRadius: '16px',
            padding: '12px 18px',
            fontSize: '13px',
            fontWeight: '500',
            lineHeight: '1.45',
            boxShadow:
              '0 10px 25px -5px rgba(59, 48, 54, 0.12), 0 4px 10px -4px rgba(59, 48, 54, 0.06)',
            maxWidth: '420px',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#22A06B',
              secondary: '#ffffff',
            },
            style: {
              border: '1px solid #D1FAE5',
              backgroundColor: '#FFFFFF',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#D92D20',
              secondary: '#ffffff',
            },
            style: {
              border: '1px solid #FEE2E2',
              backgroundColor: '#FFFFFF',
            },
          },
          loading: {
            iconTheme: {
              primary: '#F2687A',
              secondary: '#ffffff',
            },
          },
        }}
      />
      <Routes>
        {/* Public login */}
        <Route path="/login" element={<Login />} />

        {/* Author routes */}
        <Route
          path="/books"
          element={
            <ProtectedRoute requiredRole="author">
              <MyBooks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/new-ticket"
          element={
            <ProtectedRoute requiredRole="author">
              <NewTicket />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets"
          element={
            <ProtectedRoute requiredRole="author">
              <MyTickets />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminQueue />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tickets/:id"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminTicket />
            </ProtectedRoute>
          }
        />

        {/* Root fallback */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
