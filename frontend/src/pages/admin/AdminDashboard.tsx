import React from 'react';

const AdminDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">System overview and analytics</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="stat-card">
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-primary-600">0</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total URLs</h3>
            <p className="text-3xl font-bold text-success-600">0</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Clicks</h3>
            <p className="text-3xl font-bold text-warning-600">0</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Active URLs</h3>
            <p className="text-3xl font-bold text-purple-600">0</p>
          </div>
        </div>
      </div>
      
      <div className="card">
        <div className="card-body">
          <p className="text-gray-500">Admin analytics coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 