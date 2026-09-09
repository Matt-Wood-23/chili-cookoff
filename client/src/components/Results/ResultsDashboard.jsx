import React, { useState, useEffect, useCallback } from 'react';
import { resultsAPI, utils, mediaUrl } from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

const ResultsDashboard = ({ chilis, config, onDataUpdate, onError }) => {
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState(null);
  const [category, setCategory] = useState('overall');

  const loadResults = useCallback(async () => {
    setLoading(true);
    try {
      let response;
      switch (activeTab) {
        case 'leaderboard':
          response = await resultsAPI.getLeaderboard();
          setResults(response.data);
          break;
        case 'category':
          response = await resultsAPI.getCategoryRankings(category);
          setResults({ ...response.data });
          break;
        case 'stats':
          response = await resultsAPI.getStats();
          setResults(response.data);
          break;
        default:
          response = await resultsAPI.getLeaderboard();
          setResults(response.data);
      }
    } catch (error) {
      console.error('Error loading results:', error);
      onError('Failed to load results data');
    } finally {
      setLoading(false);
    }
  }, [activeTab, category, onError]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

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

  const tabs = [
    { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
    { id: 'category', label: 'Categories', icon: '⭐' },
    { id: 'stats', label: 'Statistics', icon: '📊' }
  ];

  const categories = ['heat', 'flavor', 'texture', 'presentation', 'overall'];

  if (loading && !results) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner text="Loading results..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Results Dashboard</h1>
        <p className="text-gray-600">Live rankings and statistics for the chili cook-off</p>
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

      {/* Category Filter (for category tab) */}
      {activeTab === 'category' && (
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Category:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chili-red"
              disabled={loading}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Export Button */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={handleExportCSV}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Export CSV</span>
        </button>
      </div>

      {/* Content */}
      <div>
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner text="Loading..." />
          </div>
        ) : activeTab === 'leaderboard' ? (
          <Leaderboard results={results} />
        ) : activeTab === 'category' ? (
          <CategoryRankings results={results} category={category} />
        ) : (
          <Statistics stats={results} />
        )}
      </div>
    </div>
  );
};

// Leaderboard Component
const Leaderboard = ({ results }) => {
  if (!results || !results.leaderboard || results.leaderboard.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <span className="text-6xl mb-4 block">🏆</span>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Yet</h3>
        <p className="text-gray-500">No votes have been cast yet. Results will appear here once voting begins.</p>
      </div>
    );
  }

  const leaderboard = results.leaderboard;
  const coverage = results.coverage || { expected_judges: 0, complete: false, missing: [] };
  const basis = results.ranking?.basis || 'average';

  return (
    <div className="space-y-4">
      {coverage.expected_judges > 0 && (
        coverage.complete ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              <span className="font-semibold">Every chili has been rated by all {coverage.expected_judges} judges.</span>{' '}
              Ranked by total points, on equal footing.
            </p>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-900 font-semibold">
              Not everyone has rated everything yet — these standings are provisional.
            </p>
            <p className="text-sm text-amber-800 mt-1">
              Ranked by total points, so an entry fewer people have tried is scoring
              lower than it otherwise would. Get the ratings below filled in before
              calling a winner.
            </p>
            <ul className="mt-2 text-sm text-amber-800 list-disc list-inside">
              {coverage.missing.slice(0, 6).map((m) => (
                <li key={m.id}>
                  <span className="font-medium">{m.name}</span> needs {m.missing} more
                  {' '}rating{m.missing === 1 ? '' : 's'}
                </li>
              ))}
              {coverage.missing.length > 6 && (
                <li>and {coverage.missing.length - 6} more</li>
              )}
            </ul>
          </div>
        )
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Overall Leaderboard</h2>
          <p className="text-sm text-gray-600 mt-1">
            Ranked by total overall points{basis === 'total' && !coverage.complete ? ' (provisional)' : ''}
          </p>
        </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Chili
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contestant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ratings
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Podium
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leaderboard.map((entry, index) => (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className={`text-lg font-bold ${
                      entry.rank === 1 ? 'text-yellow-600' :
                      entry.rank === 2 ? 'text-gray-500' :
                      entry.rank === 3 ? 'text-orange-600' : 'text-gray-700'
                    }`}>
                      {entry.tied ? `T-${entry.rank}` : `#${entry.rank}`}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {entry.image_path ? (
                        <img
                          className="h-10 w-10 rounded-full object-cover"
                          src={mediaUrl(entry.image_path)}
                          alt={entry.name}
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGM0Y0RjYiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMiA4QzEwLjU4IDE4IDEwLjU4IDggMTIgOFoiIGZpbGw9IiM5Q0E0QUYiLz4KPC9zdmc+Cjwvc3ZnPg==';
                          }}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-lg">🌶️</span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{entry.name}</div>
                      {entry.description && (
                        <div className="text-sm text-gray-500">{entry.description}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{entry.contestant_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    entry.missing_votes > 0 ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {coverage.expected_judges > 0
                      ? `${entry.vote_count} of ${coverage.expected_judges}`
                      : `${entry.vote_count} rating${entry.vote_count === 1 ? '' : 's'}`}
                  </span>
                  {entry.missing_votes > 0 && (
                    <div className="text-xs text-amber-700 mt-1">
                      needs {entry.missing_votes} more
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-lg font-bold text-gray-900">{entry.total_overall}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-lg font-bold text-gray-900 mr-1">{entry.avg_overall}</span>
                    <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {entry.podium_position && (
                    <div className="flex items-center">
                      {entry.podium_position === 1 && <span className="text-2xl">🥇</span>}
                      {entry.podium_position === 2 && <span className="text-2xl">🥈</span>}
                      {entry.podium_position === 3 && <span className="text-2xl">🥉</span>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

// Category Rankings Component
const CategoryRankings = ({ results, category }) => {
  if (!results || !results.rankings || results.rankings.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <span className="text-6xl mb-4 block">⭐</span>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Yet</h3>
        <p className="text-gray-500">No votes have been cast for this category yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          {category.charAt(0).toUpperCase() + category.slice(1)} Rankings
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chili</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contestant</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {results.rankings.map((entry, index) => (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-lg font-bold text-gray-700">#{entry.rank}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{entry.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{entry.contestant_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-lg font-bold text-gray-900">{entry.avg_category_score}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Statistics Component
const Statistics = ({ stats }) => {
  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <span className="text-6xl mb-4 block">📊</span>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Statistics Available</h3>
        <p className="text-gray-500">Statistics will appear here once voting begins.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Event Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-chili-red">{stats.eventStats?.total_chilis || 0}</div>
            <div className="text-sm text-gray-500">Total Chilis</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.eventStats?.total_votes || 0}</div>
            <div className="text-sm text-gray-500">Total Votes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.eventStats?.total_judges || 0}</div>
            <div className="text-sm text-gray-500">Total Judges</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.eventStats?.event_avg_overall || 0}</div>
            <div className="text-sm text-gray-500">Avg Overall</div>
          </div>
        </div>
      </div>

      {/* Category Leaders */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Category Leaders</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(stats.categoryLeaders || {}).map(([category, leader]) => (
            <div key={category} className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 capitalize">{category}</h3>
              {leader ? (
                <div className="mt-2">
                  <div className="text-sm font-medium text-gray-700">{leader.name}</div>
                  <div className="text-xs text-gray-500">by {leader.contestant_name}</div>
                  <div className="text-lg font-bold text-chili-red">{leader.avg_score}</div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No data yet</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Score Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Score Distribution</h2>
        <div className="space-y-2">
          {(stats.scoreDistribution || []).map((score) => (
            <div key={score.overall} className="flex items-center space-x-4">
              <div className="w-16 text-sm font-medium text-gray-700">Score {score.overall}</div>
              <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                <div
                  className="bg-chili-red h-4 rounded-full"
                  style={{ width: `${Math.max((score.vote_count / (stats.eventStats?.total_votes || 1)) * 100, 5)}%` }}
                ></div>
              </div>
              <div className="w-12 text-sm text-gray-500">{score.vote_count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResultsDashboard;
