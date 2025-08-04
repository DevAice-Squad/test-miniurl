import React from 'react';

const UrlsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My URLs</h1>
        <p className="text-gray-600">Manage and track your shortened URLs</p>
      </div>
      
      <div className="card">
        <div className="card-body text-center py-12">
          <p className="text-gray-500 mb-4">No URLs created yet</p>
          <button className="btn-primary">Create Your First URL</button>
        </div>
      </div>
    </div>
  );
};

export default UrlsPage; 