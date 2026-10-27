import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Login from './pages/Login';
import MyBooks from './pages/MyBooks';
import NewTicket from './pages/NewTicket';
import MyTickets from './pages/MyTickets';
import AdminQueue from './pages/AdminQueue';
import AdminTicket from './pages/AdminTicket';

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
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
