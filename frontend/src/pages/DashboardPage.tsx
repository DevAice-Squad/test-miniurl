import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.username}!
        </h1>
        <p className="text-gray-600">
          Here's an overview of your URL shortening activity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total URLs</h3>
            <p className="text-3xl font-bold text-primary-600">0</p>
            <p className="text-sm text-gray-500 mt-1">URLs created</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Clicks</h3>
            <p className="text-3xl font-bold text-success-600">0</p>
            <p className="text-sm text-gray-500 mt-1">Clicks received</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">This Month</h3>
            <p className="text-3xl font-bold text-warning-600">0</p>
            <p className="text-sm text-gray-500 mt-1">New URLs created</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="card-body">
          <p className="text-gray-600 mb-4">Get started by creating your first shortened URL!</p>
          <button className="btn-primary">Create New URL</button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage; 