import React, { useState } from 'react';
import ChiliGrid from './ChiliGrid';
import RatingForm from './RatingForm';
import OCRUpload from './OCRUpload';
import LoadingSpinner from '../LoadingSpinner';
import { voteAPI } from '../../services/api';

const VoterInterface = ({ chilis, config, onDataUpdate, onError }) => {
  const [selectedChili, setSelectedChili] = useState(null);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [showOCRUpload, setShowOCRUpload] = useState(false);
  const [judgeName, setJudgeName] = useState('');
  const [loading, setLoading] = useState(false);

  const isVotingOpen = config?.voting_open === 'true';

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
    if (!selectedChili || !judgeName) {
      onError('Missing required information');
      return;
    }

    setLoading(true);
    try {
      await voteAPI.submit({
        chili_id: selectedChili.id,
        judge_name: judgeName,
        ...ratings
      });
      
      setShowRatingForm(false);
      setSelectedChili(null);
      onDataUpdate();
      
      // Clear form for next rating
      setTimeout(() => {
        setJudgeName('');
      }, 1000);
      
    } catch (error) {
      onError('Failed to submit rating: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleOCRCapture = (ocrData) => {
    // Pre-populate rating form with OCR data
    setSelectedChili({ ...selectedChili, ocrData });
    setShowOCRUpload(false);
    setShowRatingForm(true);
  };

  const votedChiliIds = JSON.parse(localStorage.getItem('votedChiliIds') || '[]');

  if (!chilis || !config) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner text="Loading voter interface..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Vote on the Chilis</h1>
        <p className="text-gray-600">Rate each chili on 5 categories (1-10 scale)</p>
      </div>

      {/* Judge Info */}
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
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {isVotingOpen && judgeName && (
        <div className="mb-8 flex flex-wrap gap-4">
          <button
            onClick={() => setShowOCRUpload(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Upload Scoresheet (OCR)</span>
          </button>
          
          <button
            onClick={() => setShowRatingForm(true)}
            className="bg-chili-red text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span>Manual Rating</span>
          </button>
        </div>
      )}

      {/* Chili Grid */}
      <ChiliGrid 
        chilis={chilis}
        votedChiliIds={votedChiliIds}
        onChiliSelect={handleChiliSelect}
        isVotingOpen={isVotingOpen}
        judgeName={judgeName}
      />

      {/* Rating Form Modal */}
      {showRatingForm && selectedChili && (
        <RatingForm
          chili={selectedChili}
          judgeName={judgeName}
          onSubmit={handleRatingSubmit}
          onClose={() => {
            setShowRatingForm(false);
            setSelectedChili(null);
          }}
          loading={loading}
        />
      )}

      {/* OCR Upload Modal */}
      {showOCRUpload && (
        <OCRUpload
          onCapture={handleOCRCapture}
          onClose={() => setShowOCRUpload(false)}
        />
      )}
    </div>
  );
};

export default VoterInterface;
