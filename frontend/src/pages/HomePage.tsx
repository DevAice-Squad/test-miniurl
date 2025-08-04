import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { CreateUrlRequest, Url } from '../types';
import {
  LinkIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ClipboardDocumentIcon as CopyIcon,
  ArrowTopRightOnSquareIcon as ExternalLinkIcon,
  UserGroupIcon,
  ClockIcon,
  GlobeAltIcon as GlobeIcon,
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';

const HomePage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [shortenedUrl, setShortenedUrl] = useState<Url | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateUrlRequest>();

  const onSubmit = async (data: CreateUrlRequest) => {
    try {
      setIsLoading(true);
      const response = await apiService.shortenUrl(data);
      setShortenedUrl(response.data);
      reset();
      toast.success('URL shortened successfully!');
    } catch (error) {
      console.error('URL shortening error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const features = [
    {
      icon: LinkIcon,
      title: 'URL Shortening',
      description: 'Create short, memorable URLs that are easy to share and remember.'
    },
    {
      icon: ChartBarIcon,
      title: 'Analytics & Tracking',
      description: 'Get detailed insights about clicks, geographic data, and referrer information.'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security with 99.9% uptime guarantee.'
    },
    {
      icon: SparklesIcon,
      title: 'Custom Algorithms',
      description: 'Choose from multiple shortening algorithms or create your own.'
    },
  ];

  const stats = [
    { label: 'URLs Shortened', value: '10M+', icon: LinkIcon },
    { label: 'Active Users', value: '50K+', icon: UserGroupIcon },
    { label: 'Countries Served', value: '120+', icon: GlobeIcon },
    { label: 'Uptime', value: '99.9%', icon: ClockIcon },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <LinkIcon className="w-8 h-8 text-primary-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">MinURL</span>
            </div>
            
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">Welcome, {user?.username}!</span>
                  <Link to="/dashboard" className="btn-primary">
                    Dashboard
                  </Link>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link to="/login" className="btn-secondary">
                    Sign In
                  </Link>
                  <Link to="/register" className="btn-primary">
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Shorten URLs,
              <span className="text-gradient"> Amplify Reach</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Transform long, complex URLs into short, shareable links with powerful analytics.
              Perfect for social media, marketing campaigns, and professional communications.
            </p>

            {/* URL Shortening Form */}
            <div className="max-w-2xl mx-auto">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <input
                      {...register('original_url', {
                        required: 'URL is required',
                        pattern: {
                          value: /^https?:\/\/.+/,
                          message: 'Please enter a valid URL starting with http:// or https://'
                        }
                      })}
                      type="url"
                      placeholder="Enter your long URL here..."
                      className="input text-lg py-4"
                    />
                    {errors.original_url && (
                      <p className="text-danger-600 text-sm mt-1 text-left">
                        {errors.original_url.message}
                      </p>
                    )}
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary btn-lg px-8 sm:px-12"
                  >
                    {isLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      'Shorten URL'
                    )}
                  </button>
                </div>

                {/* Optional fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <input
                    {...register('title')}
                    type="text"
                    placeholder="Title (optional)"
                    className="input"
                  />
                  <select
                    {...register('algorithm')}
                    className="input"
                  >
                    <option value="hash">Hash Algorithm</option>
                    <option value="uuid">UUID Algorithm</option>
                    <option value="custom">Custom Algorithm</option>
                  </select>
                </div>
              </form>

              {/* Result */}
              {shortenedUrl && (
                <div className="mt-8 p-6 bg-white rounded-xl shadow-medium border border-gray-200 animate-slide-in">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Your shortened URL is ready!
                  </h3>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-600 mb-1">Short URL:</p>
                      <p className="text-lg font-mono text-primary-600 truncate">
                        {shortenedUrl.full_short_url}
                      </p>
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => copyToClipboard(shortenedUrl.full_short_url)}
                        className="btn-secondary btn-sm"
                        title="Copy to clipboard"
                      >
                        <CopyIcon className="w-4 h-4" />
                      </button>
                      <a
                        href={shortenedUrl.full_short_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary btn-sm"
                        title="Open in new tab"
                      >
                        <ExternalLinkIcon className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                  
                  <div className="mt-4 text-sm text-gray-600">
                    <p>Original: <span className="font-mono">{shortenedUrl.original_url}</span></p>
                    {shortenedUrl.title && (
                      <p>Title: <span className="font-medium">{shortenedUrl.title}</span></p>
                    )}
                  </div>

                  {!isAuthenticated && (
                    <div className="mt-4 p-3 bg-primary-50 rounded-lg">
                      <p className="text-sm text-primary-700">
                        <Link to="/register" className="font-medium hover:underline">
                          Create an account
                        </Link> to track analytics and manage your URLs!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={stat.label} className="text-center">
                <div className="flex justify-center mb-4">
                  <stat.icon className="w-8 h-8 text-primary-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features for Modern Link Management
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to create, manage, and track your shortened URLs
              with professional-grade tools and insights.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`card hover-lift p-6 text-center animation-delay-${index * 200}`}
              >
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-primary-600" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to start shortening URLs?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join thousands of users who trust MinURL for their link management needs.
            Get started today with our free plan.
          </p>
          
          {!isAuthenticated && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn-xl bg-white text-primary-600 hover:bg-gray-50">
                Get Started Free
              </Link>
              <Link to="/login" className="btn-xl border-2 border-white text-white hover:bg-white hover:text-primary-600">
                Sign In
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <LinkIcon className="w-6 h-6 text-primary-400" />
              <span className="ml-2 text-xl font-bold">MinURL</span>
            </div>
            
            <div className="text-gray-400 text-sm">
              © 2024 MinURL. Built with ❤️ for better link management.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage; 