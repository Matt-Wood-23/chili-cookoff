import React, { useState, useEffect } from 'react';
import ChiliGrid from './ChiliGrid';
import RatingForm from './RatingForm';
import LoadingSpinner from '../LoadingSpinner';
import { voteAPI } from '../../services/api';

// Judges rate one chili after another on a phone, so their name and their
// progress have to survive re-renders, reloads, and a dropped wifi connection.
const JUDGE_NAME_KEY = 'chiliJudgeName';
const VOTED_KEY = 'votedChiliIds';

const readVotedIds = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(VOTED_KEY) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
};

const VoterInterface = ({ chilis, config, ocrAvailable, onDataUpdate, onError }) => {
  const [selectedChili, setSelectedChili] = useState(null);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [judgeName, setJudgeName] = useState(() => {
    try {
      return localStorage.getItem(JUDGE_NAME_KEY) || '';
    } catch {
      return '';
    }
  });
  const [votedChiliIds, setVotedChiliIds] = useState(readVotedIds);
  const [loading, setLoading] = useState(false);

  const isVotingOpen = config?.voting_open === 'true';

  // Remember the judge across reloads. The old flow wiped the name a second
  // after every submission, so judges retyped it for each entry.
  useEffect(() => {
    try {
      if (judgeName.trim()) localStorage.setItem(JUDGE_NAME_KEY, judgeName.trim());
      else localStorage.removeItem(JUDGE_NAME_KEY);
    } catch {
      // Storage unavailable; the name just will not persist.
    }
  }, [judgeName]);

  const markVoted = (chiliId) => {
    setVotedChiliIds((previous) => {
      const next = previous.includes(chiliId) ? previous : [...previous, chiliId];
      try {
        localStorage.setItem(VOTED_KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable; the checkmark just will not survive a reload.
      }
      return next;
    });
  };

  const handleChiliSelect = (chili) => {
    if (!isVotingOpen) {
      onError('Voting is currently closed');
      return;
    }
    if (!judgeName.trim()) {
      onError('Please enter your judge name first');
      return;
    }
    setSelectedChili(chili);
    setShowRatingForm(true);
  };

  const handleRatingSubmit = async (ratings) => {
    if (!selectedChili || !judgeName.trim()) {
      onError('Missing required information');
      return;
    }

    setLoading(true);
    try {
      const response = await voteAPI.submit({
        chili_id: selectedChili.id,
        judge_name: judgeName.trim(),
        ...ratings
      });

      markVoted(selectedChili.id);
      setShowRatingForm(false);
      setSelectedChili(null);
      onDataUpdate();
      onError(
        response.data?.updated
          ? `Updated your rating for ${selectedChili.name}`
          : `Rating submitted for ${selectedChili.name}`,
        'success'
      );
    } catch (error) {
      // A 409 means someone else already rated under this name — the server
      // message explains how to fix it, so surface it verbatim.
      onError(error.response?.data?.error || error.message || 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  if (!chilis || !config) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner text="Loading voter interface..." />
      </div>
    );
  }

  const remaining = chilis.length - votedChiliIds.filter(
    (id) => chilis.some((chili) => chili.id === id)
  ).length;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Vote on the Chilis</h1>
        <p className="text-gray-600">Rate each chili on 5 categories (1-10 scale)</p>
      </div>

      {!isVotingOpen && (
        <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-yellow-800">Voting is currently closed. Please check back later.</span>
          </div>
        </div>
      )}

      {/* Judge Info */}
      {isVotingOpen && (
        <div className="mb-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Judge Information</h2>
          <div className="max-w-md">
            <label htmlFor="judgeName" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name *
            </label>
            <input
              type="text"
              id="judgeName"
              value={judgeName}
              onChange={(e) => setJudgeName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chili-red focus:border-transparent"
              required
            />
            <p className="mt-2 text-xs text-gray-500">
              Saved on this device, so you only enter it once. If someone shares your
              first name, add a last initial.
            </p>
          </div>
        </div>
      )}

      {/* Progress */}
      {isVotingOpen && judgeName.trim() && chilis.length > 0 && (
        <div className="mb-8 p-4 bg-white rounded-lg shadow flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Rated <span className="font-semibold text-gray-900">{chilis.length - remaining}</span> of{' '}
            <span className="font-semibold text-gray-900">{chilis.length}</span> entries
          </span>
          {remaining === 0 && (
            <span className="text-sm font-medium text-green-600">All done — thanks! 🌶️</span>
          )}
        </div>
      )}

      {/* Chili Grid */}
      <ChiliGrid
        chilis={chilis}
        votedChiliIds={votedChiliIds}
        onChiliSelect={handleChiliSelect}
        isVotingOpen={isVotingOpen}
        judgeName={judgeName.trim()}
      />

      {/* Rating Form Modal */}
      {showRatingForm && selectedChili && (
        <RatingForm
          chili={selectedChili}
          judgeName={judgeName.trim()}
          alreadyVoted={votedChiliIds.includes(selectedChili.id)}
          ocrAvailable={ocrAvailable}
          onSubmit={handleRatingSubmit}
          onClose={() => {
            setShowRatingForm(false);
            setSelectedChili(null);
          }}
          onError={onError}
          loading={loading}
        />
      )}
    </div>
  );
};

export default VoterInterface;
