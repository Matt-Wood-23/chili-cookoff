import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../LoadingSpinner';
import OCRUpload from './OCRUpload';

// Defined at module scope on purpose. When this lived inside RatingForm it was
// a fresh component type on every keystroke, so React unmounted and remounted
// the slider mid-gesture and the drag died after a single step.
const RatingSlider = ({ category, value, label, description, onChange, error, disabled }) => (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <p className="text-xs text-gray-500 mb-3">{description}</p>
      
      <div className="flex items-center space-x-4">
        <input
          type="range"
          min="1"
          max="10"
          value={value}
          onChange={(e) => onChange(category, parseInt(e.target.value, 10))}
          className="rating-slider flex-1"
          disabled={disabled}
        />
        
        <div className="flex items-center space-x-2">
          <span className="text-lg font-bold text-gray-700 min-w-[2rem] text-center">
            {value}
          </span>
          <div className="text-xs text-gray-500">
            {value <= 3 && '👎'}
            {value >= 4 && value <= 7 && '👍'}
            {value >= 8 && '🔥'}
          </div>
        </div>
      </div>
      
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>1 (Poor)</span>
        <span>10 (Excellent)</span>
      </div>
      
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  );

const RatingForm = ({ chili, judgeName, alreadyVoted, onSubmit, onClose, onError, loading, ocrAvailable }) => {
  const [ratings, setRatings] = useState({
    heat: 5,
    flavor: 5,
    texture: 5,
    presentation: 5,
    overall: 5,
    comments: ''
  });

  const [errors, setErrors] = useState({});
  const [showScanner, setShowScanner] = useState(false);
  const [ocrData, setOcrData] = useState(null);

  // Pre-populate from a scanned scoresheet. This used to be handed in as part
  // of the chili object and read from a prop that was never passed, so scanned
  // scores were silently discarded.
  useEffect(() => {
    if (!ocrData) return;
    setRatings((previous) => ({
      heat: ocrData.heat || previous.heat,
      flavor: ocrData.flavor || previous.flavor,
      texture: ocrData.texture || previous.texture,
      presentation: ocrData.presentation || previous.presentation,
      overall: ocrData.overall || previous.overall,
      comments: ocrData.comments || previous.comments
    }));
  }, [ocrData]);

  // The model returns 0 for anything it could not read; make the judge look at
  // those rather than quietly accepting a default.
  const unreadCategories = ocrData
    ? ['heat', 'flavor', 'texture', 'presentation', 'overall'].filter((key) => !ocrData[key])
    : [];

  const categories = [
    { key: 'heat', label: '🌶️ Heat Level', description: 'How spicy is the chili?' },
    { key: 'flavor', label: '👅 Flavor', description: 'How does it taste?' },
    { key: 'texture', label: '🥄 Texture', description: 'How is the consistency?' },
    { key: 'presentation', label: '👁️ Presentation', description: 'How does it look?' },
    { key: 'overall', label: '⭐ Overall', description: 'Your overall impression' }
  ];

  const handleRatingChange = (category, value) => {
    setRatings(prev => ({
      ...prev,
      [category]: value
    }));
    
    // Clear error when user starts adjusting
    if (errors[category]) {
      setErrors(prev => ({
        ...prev,
        [category]: null
      }));
    }
  };

  const handleCommentsChange = (value) => {
    setRatings(prev => ({
      ...prev,
      comments: value
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    categories.forEach(category => {
      const value = ratings[category.key];
      if (!value || value < 1 || value > 10) {
        newErrors[category.key] = 'Rating must be between 1 and 10';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit(ratings);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Rate Chili</h2>
              <p className="text-gray-600">{chili.name} by {chili.contestant_name}</p>
              <p className="text-sm text-gray-500">Judge: {judgeName}</p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          {alreadyVoted && (
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <span className="text-sm text-amber-800">
                You already rated this chili. Submitting again replaces your earlier scores.
              </span>
            </div>
          )}

          {/* Paper scoresheet scan — scoped to this chili so the scores have
              somewhere to go. */}
          {ocrAvailable && !ocrData && (
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-chili-red hover:text-chili-red transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Scan a paper scoresheet instead</span>
              </button>
            </div>
          )}

          {ocrData && (
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p>Pre-filled from your scoresheet. Check every score before submitting.</p>
                  {unreadCategories.length > 0 && (
                    <p className="mt-1 font-medium">
                      Could not read: {unreadCategories.join(', ')} — set {unreadCategories.length === 1 ? 'it' : 'them'} by hand.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Rating Categories */}
          <div className="space-y-6">
            {categories.map((category) => (
              <RatingSlider
                key={category.key}
                category={category.key}
                value={ratings[category.key]}
                label={category.label}
                description={category.description}
                onChange={handleRatingChange}
                error={errors[category.key]}
                disabled={loading}
              />
            ))}
          </div>

          {/* Comments */}
          <div className="mt-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comments (Optional)
            </label>
            <textarea
              value={ratings.comments}
              onChange={(e) => handleCommentsChange(e.target.value)}
              placeholder="Share your thoughts about this chili..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chili-red focus:border-transparent resize-none"
              disabled={loading}
            />
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="vote-button px-6 py-2 flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="small" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Submit Rating</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {showScanner && (
        <OCRUpload
          chiliName={chili.name}
          onCapture={(data) => {
            setOcrData(data);
            setShowScanner(false);
          }}
          onError={onError}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};

export default RatingForm;
