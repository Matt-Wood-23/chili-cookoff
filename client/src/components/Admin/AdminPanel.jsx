import React, { useState, useEffect } from 'react';
import AddChiliForm from './AddChiliForm';
import ManageEntries from './ManageEntries';
import VotingControls from './VotingControls';
import LoadingSpinner from '../LoadingSpinner';
import { configAPI } from '../../services/api';

const AdminPanel = ({ chilis, config, onDataUpdate, onError }) => {
  const [activeTab, setActiveTab] = useState('add');
  const [isVotingOpen, setIsVotingOpen] = useState(false);

  useEffect(() => {
    setIsVotingOpen(config?.voting_open === 'true');
  }, [config]);

  const handleToggleVoting = async () => {
    try {
      const newStatus = !isVotingOpen;
      await configAPI.updateKey('voting_open', newStatus.toString());
      setIsVotingOpen(newStatus);
      onDataUpdate();
    } catch (error) {
      console.error('Failed to toggle voting status:', error);
      onError('Failed to update voting status');
    }
  };

  const tabs = [
    { id: 'add', label: 'Add Chili', icon: '🌶️' },
    { id: 'manage', label: 'Manage Entries', icon: '📝' },
    { id: 'voting', label: 'Voting Controls', icon: '🗳️' }
  ];

  if (!config || !chilis) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner text="Loading admin panel..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
        <p className="text-gray-600">Manage your chili cook-off event</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-chili-red text-chili-red'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-8">
        {activeTab === 'add' && (
          <AddChiliForm 
            onSuccess={() => {
              onDataUpdate();
            }}
            onError={onError}
          />
        )}

        {activeTab === 'manage' && (
          <ManageEntries 
            chilis={chilis}
            onUpdate={() => onDataUpdate()}
            onError={onError}
          />
        )}

        {activeTab === 'voting' && (
          <VotingControls 
            config={config}
            isVotingOpen={isVotingOpen}
            onToggleVoting={handleToggleVoting}
            onUpdate={() => onDataUpdate()}
            onError={onError}
          />
        )}
      </div>

      {/* Quick Stats */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">🌶️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Entries</p>
              <p className="text-2xl font-semibold text-gray-900">{chilis.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`w-8 h-8 rounded-full ${isVotingOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Voting Status</p>
              <p className={`text-2xl font-semibold ${isVotingOpen ? 'text-green-600' : 'text-red-600'}`}>
                {isVotingOpen ? 'Open' : 'Closed'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Votes</p>
              <p className="text-2xl font-semibold text-gray-900">
                {chilis.reduce((sum, chili) => sum + (chili.vote_count || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
