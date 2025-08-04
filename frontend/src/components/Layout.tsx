import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  HomeIcon,
  LinkIcon,
  ChartBarIcon,
  UserIcon,
  CogIcon,
  UsersIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon as LogoutIcon,
  Bars3Icon as MenuIcon,
  XMarkIcon as XIcon,
} from '@heroicons/react/24/outline';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'My URLs', href: '/urls', icon: LinkIcon },
    { name: 'Profile', href: '/profile', icon: UserIcon },
  ];

  const adminNavigation = [
    { name: 'Admin Dashboard', href: '/admin', icon: ChartBarIcon },
    { name: 'Manage Users', href: '/admin/users', icon: UsersIcon },
    { name: 'Manage URLs', href: '/admin/urls', icon: DocumentTextIcon },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'block' : 'hidden'} fixed inset-0 z-20 transition-opacity bg-black opacity-50 lg:hidden`} onClick={() => setIsSidebarOpen(false)}></div>

      <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-30 w-64 overflow-y-auto transition duration-300 transform bg-white border-r border-gray-200 lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-center mt-8">
          <div className="flex items-center">
            <LinkIcon className="w-8 h-8 text-primary-600" />
            <span className="mx-2 text-2xl font-semibold text-gray-800">MinURL</span>
          </div>
        </div>

        <nav className="mt-10">
          <div className="px-4 pb-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Main
            </h3>
          </div>
          
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`${
                location.pathname === item.href
                  ? 'bg-primary-50 border-r-4 border-primary-600 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } group flex items-center px-6 py-2 text-sm font-medium transition-colors duration-200`}
            >
              <item.icon
                className={`${
                  location.pathname === item.href ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                } mr-3 flex-shrink-0 h-6 w-6`}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          ))}

          {user?.role === 'admin' && (
            <>
              <div className="px-4 pt-6 pb-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Administration
                </h3>
              </div>
              
              {adminNavigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    location.pathname === item.href
                      ? 'bg-primary-50 border-r-4 border-primary-600 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } group flex items-center px-6 py-2 text-sm font-medium transition-colors duration-200`}
                >
                  <item.icon
                    className={`${
                      location.pathname === item.href ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                    } mr-3 flex-shrink-0 h-6 w-6`}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              ))}
            </>
          )}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.username}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              title="Logout"
            >
              <LogoutIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <button
              className="text-gray-500 focus:outline-none focus:text-gray-600 lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <MenuIcon className="w-6 h-6" />
            </button>
            
            <div className="flex items-center ml-4 lg:ml-0">
              <h1 className="text-xl font-semibold text-gray-900">
                {navigation.find(item => item.href === location.pathname)?.name ||
                 adminNavigation.find(item => item.href === location.pathname)?.name ||
                 'Dashboard'}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {user?.role === 'admin' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Admin
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout; 