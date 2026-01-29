import React from 'react';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { AdminDashboard } from '../components/admin';

export function Admin() {
  return (
    <ProtectedRoute requireAdmin>
      <AdminDashboard />
    </ProtectedRoute>
  );
}
