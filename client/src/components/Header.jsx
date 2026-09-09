import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getAdminToken } from '../services/api';

const Header = ({ config, currentView, onViewChange, adminTokenRequired }) => {
  const location = useLocation();

  // Once the event runs with a token, guests should not see an Admin tab
  // inviting them in. Navigating to /admin directly still works, which is how
  // the organizer gets in the first time to enter the token.
  const showAdminLink = !adminTokenRequired || Boolean(getAdminToken());

  const navItems = [
    { path: '/', label: 'Vote', key: 'voter' },
    ...(showAdminLink ? [{ path: '/admin', label: 'Admin', key: 'admin' }] : []),
    { path: '/results', label: 'Results', key: 'results' }
  ];

  const isVotingOpen = config?.voting_open === 'true';

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 py-3 sm:h-16 sm:py-0">
          {/* Logo and Event Info */}
          <div className="flex items-center min-w-0">
            <div className="flex items-center min-w-0">
              <span className="text-2xl flex-shrink-0">🌶️</span>
              <h1 className="ml-2 text-lg sm:text-xl font-bold text-gray-900 truncate">
                {config?.event_name || 'Chili Cook-Off'}
              </h1>
            </div>
            <div className="ml-6 hidden lg:block">
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{config?.event_date || 'TBD'}</span>
                <span>•</span>
                <span>{config?.event_location || 'TBD'}</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-2 sm:gap-4 order-last sm:order-none">
            {navItems.map((item) => (
              <Link
                key={item.key}
                to={item.path}
                onClick={() => onViewChange(item.key)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-chili-red text-white'
                    : 'text-gray-600 hover:text-chili-red hover:bg-gray-50'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Status Indicator */}
          <div className="flex items-center flex-shrink-0">
            <div className={`w-3 h-3 rounded-full mr-2 flex-shrink-0 ${
              isVotingOpen ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
              {isVotingOpen ? 'Voting Open' : 'Voting Closed'}
            </span>
          </div>
        </div>

        {/* Event details, shown below the bar on phones */}
        <div className="sm:hidden pb-3 flex items-center justify-between text-xs text-gray-500">
          <span className="truncate">{config?.event_date || 'TBD'}</span>
          <span className="truncate ml-3">{config?.event_location || 'TBD'}</span>
        </div>
      </div>

      {/* Event Status Banner */}
      {!isVotingOpen && location.pathname === '/' && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-yellow-800 text-sm font-medium">
                Voting is currently closed. Please check back later or contact the organizer.
              </span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
