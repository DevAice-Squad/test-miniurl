import React from 'react';
import { Link } from 'react-router-dom';
import { LinkIcon } from '@heroicons/react/24/outline';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      <div className="text-center">
        <LinkIcon className="w-16 h-16 text-primary-600 mx-auto mb-8" />
        
        <h1 className="text-9xl font-bold text-gray-200 mb-4">404</h1>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Page not found
        </h2>
        
        <p className="text-gray-600 mb-8 max-w-md">
          Sorry, we couldn't find the page you're looking for. 
          The link might be broken or the page may have been moved.
        </p>
        
        <div className="space-y-4">
          <Link to="/" className="btn-primary inline-block">
            Go back home
          </Link>
          
          <div className="text-sm text-gray-500">
            <Link to="/login" className="text-primary-600 hover:underline">
              Sign in
            </Link>
            {' or '}
            <Link to="/register" className="text-primary-600 hover:underline">
              create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage; 