import React, { useState, useEffect } from 'react';
import AddChiliForm from './AddChiliForm';
import ManageEntries from './ManageEntries';
import VotingControls from './VotingControls';
import PaperBallotEntry from './PaperBallotEntry';
import JudgeCodes from './JudgeCodes';
import ShareAccess from './ShareAccess';
import LoadingSpinner from '../LoadingSpinner';
import { configAPI, resultsAPI } from '../../services/api';

const AdminPanel = ({ chilis, config, serverInfo, onDataUpdate, onError }) => {
  const [activeTab, setActiveTab] = useState('add');
  const [isVotingOpen, setIsVotingOpen] = useState(false);
  const [coverage, setCoverage] = useState(null);

  useEffect(() => {
    setIsVotingOpen(config?.voting_open === 'true');
  }, [config]);

  // Refreshed whenever the entry list does, which is after every action that
  // can change a vote count.
  useEffect(() => {
    let cancelled = false;
    resultsAPI.getCoverage()
      .then(({ data }) => { if (!cancelled) setCoverage(data); })
      .catch(() => { /* advisory only; the panel works without it */ });
    return () => { cancelled = true; };
  }, [chilis, config]);

  const handleToggleVoting = async () => {
    try {
      const newStatus = !isVotingOpen;

      // Closing is when the standings become the answer, so this is the moment
      // to say which chilis nobody finished rating - while it is still fixable.
      if (!newStatus) {
        const { data } = await resultsAPI.getCoverage();
        if (!data.ready) {
          const shortfall = (data.missing || [])
            .map((m) => `  • ${m.name} — ${m.vote_count} of ${data.expected_judges} (needs ${m.missing} more)`)
            .join('\n');
          const proceed = confirm(
            `Only ${data.qualified_judges} of ${data.expected_judges} judges have rated every chili.\n\n` +
            (shortfall ? `${shortfall}\n\n` : '') +
            'Close voting anyway? Without a full set of ballots the standings stay ' +
            'provisional, counting every rating cast rather than a matched set.'
          );
          if (!proceed) return;
        }
      }

      await configAPI.updateKey('voting_open', newStatus.toString());
      setIsVotingOpen(newStatus);
      onDataUpdate();
      onError(newStatus ? 'Voting is now open' : 'Voting is now closed', 'success');
    } catch (error) {
      console.error('Failed to toggle voting status:', error);
      onError(error.response?.data?.error || 'Failed to update voting status');
    }
  };

  const tabs = [
    { id: 'add', label: 'Add Chili', icon: '🌶️' },
    { id: 'manage', label: 'Manage Entries', icon: '📝' },
    { id: 'paper', label: 'Paper Ballots', icon: '🧾' },
    { id: 'codes', label: 'Judge Codes', icon: '🎟️' },
    { id: 'share', label: 'Share', icon: '📲' },
    { id: 'voting', label: 'Voting Controls', icon: '🗳️' }
  ];

  // How many ratings are still missing across the whole event - the one number
  // that says whether there is chasing left to do.
  const outstanding = (coverage?.missing || []).reduce((sum, m) => sum + m.missing, 0);

  if (!config || !chilis) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner text="Loading admin panel..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 print:hidden">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
        <p className="text-gray-600">Manage your chili cook-off event</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8 print:hidden">
        <nav className="-mb-px flex flex-wrap gap-x-8 gap-y-2">
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

        {activeTab === 'paper' && (
          <PaperBallotEntry
            chilis={chilis}
            onUpdate={() => onDataUpdate()}
            onError={onError}
          />
        )}

        {activeTab === 'codes' && (
          <JudgeCodes
            config={config}
            onUpdate={() => onDataUpdate()}
            onError={onError}
          />
        )}

        {activeTab === 'share' && (
          <ShareAccess config={config} onError={onError} />
        )}

        {activeTab === 'voting' && (
          <VotingControls
            config={config}
            isVotingOpen={isVotingOpen}
            adminTokenRequired={serverInfo?.admin_token_required}
            coverage={coverage}
            onToggleVoting={handleToggleVoting}
            onUpdate={() => onDataUpdate()}
            onError={onError}
          />
        )}
      </div>

      {/* Quick Stats */}
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 print:hidden">
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
              <span className="text-2xl">🧑‍🍳</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Judges</p>
              <p className="text-2xl font-semibold text-gray-900">
                {coverage?.expected_judges ?? '—'}
              </p>
              <p className="text-xs text-gray-400">have rated at least one</p>
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
              {coverage && (
                <p className={`text-xs ${outstanding > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {outstanding > 0 ? `${outstanding} still outstanding` : 'everyone has rated everything'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
