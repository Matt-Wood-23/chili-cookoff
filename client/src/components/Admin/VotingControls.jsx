import React, { useState } from 'react';
import { configAPI, voteAPI, resultsAPI, utils } from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

const VotingControls = ({ config, isVotingOpen, onToggleVoting, onUpdate, onError }) => {
  const [loading, setLoading] = useState(false);
  const [eventConfig, setEventConfig] = useState({
    event_name: config?.event_name || '',
    event_date: config?.event_date || '',
    event_location: config?.event_location || ''
  });

  const handleToggleVoting = async () => {
    setLoading(true);
    try {
      await onToggleVoting();
    } catch (error) {
      onError('Failed to toggle voting status');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllVotes = async () => {
    if (!confirm('Are you sure you want to clear ALL votes? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      await voteAPI.clearAll();
      onUpdate();
      onError('All votes cleared successfully', 'success');
    } catch (error) {
      console.error('Error clearing votes:', error);
      onError(error.response?.data?.error || 'Failed to clear votes');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEventConfig = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await configAPI.update(eventConfig);
      onUpdate();
      onError('Event configuration updated successfully', 'success');
    } catch (error) {
      console.error('Error updating event config:', error);
      onError(error.response?.data?.error || 'Failed to update configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setLoading(true);
    try {
      const response = await resultsAPI.exportCSV();
      const filename = `chili-cookoff-results-${new Date().toISOString().split('T')[0]}.csv`;
      utils.downloadBlob(response.data, filename);
      onError('Results exported successfully', 'success');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      onError('Failed to export results');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Voting Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Voting Controls</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Voting Toggle */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Status
              </label>
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full ${isVotingOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`text-lg font-medium ${isVotingOpen ? 'text-green-600' : 'text-red-600'}`}>
                  {isVotingOpen ? 'Voting Open' : 'Voting Closed'}
                </span>
              </div>
            </div>
            
            <button
              onClick={handleToggleVoting}
              disabled={loading}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                isVotingOpen
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {loading ? (
                <LoadingSpinner size="small" />
              ) : isVotingOpen ? (
                'Close Voting'
              ) : (
                'Open Voting'
              )}
            </button>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Quick Actions</h4>
            
            <button
              onClick={handleClearAllVotes}
              disabled={loading}
              className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              Clear All Votes
            </button>
            
            <button
              onClick={handleExportCSV}
              disabled={loading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Export Results (CSV)
            </button>
          </div>
        </div>
      </div>

      {/* Event Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Configuration</h3>
        
        <form onSubmit={handleUpdateEventConfig} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Name
            </label>
            <input
              type="text"
              value={eventConfig.event_name}
              onChange={(e) => setEventConfig(prev => ({ ...prev, event_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chili-red"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Date
            </label>
            <input
              type="date"
              value={eventConfig.event_date}
              onChange={(e) => setEventConfig(prev => ({ ...prev, event_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chili-red"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Location
            </label>
            <input
              type="text"
              value={eventConfig.event_location}
              onChange={(e) => setEventConfig(prev => ({ ...prev, event_location: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chili-red"
              disabled={loading}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-chili-red text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="small" />
                  <span>Updating...</span>
                </>
              ) : (
                <span>Update Configuration</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VotingControls;
