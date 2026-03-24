import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../LoadingSpinner';

const RatingForm = ({ chili, judgeName, onSubmit, onClose, loading, ocrData }) => {
  const [ratings, setRatings] = useState({
    heat: 5,
    flavor: 5,
    texture: 5,
    presentation: 5,
    overall: 5,
    comments: ''
  });

  const [errors, setErrors] = useState({});

  // Pre-populate with OCR data if available
  useEffect(() => {
    if (ocrData) {
      setRatings({
        heat: ocrData.heat || 5,
        flavor: ocrData.flavor || 5,
        texture: ocrData.texture || 5,
        presentation: ocrData.presentation || 5,
        overall: ocrData.overall || 5,
        comments: ocrData.comments || ''
      });
    }
  }, [ocrData]);

  const categories = [
    { key: 'heat', label: 'Heat Level', description: 'How spicy is the chili?' },
    { key: 'flavor', label: 'Flavor', description: 'How does it taste?' },
    { key: 'texture', label: 'Texture', description: 'How is the consistency?' },
    { key: 'presentation', label: 'Presentation', description: 'How does it look?' },
    { key: 'overall', label: 'Overall', description: 'Your overall impression' }
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

  const RatingSlider = ({ category, value, label, description, color }) => (
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
          onChange={(e) => handleRatingChange(category, parseInt(e.target.value))}
          className={`rating-input flex-1 ${color}`}
          disabled={loading}
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
      
      {errors[category] && (
        <p className="text-red-500 text-xs mt-1">{errors[category]}</p>
      )}
    </div>
  );

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
          {/* OCR Notice */}
          {ocrData && (
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-blue-800">
                  Pre-filled from OCR scan. Please review and adjust as needed.
                </span>
              </div>
            </div>
          )}

          {/* Rating Categories */}
          <div className="space-y-6">
            <RatingSlider
              category="heat"
              value={ratings.heat}
              label="🌶️ Heat Level"
              description="How spicy is the chili?"
              color="bg-red-500"
            />
            
            <RatingSlider
              category="flavor"
              value={ratings.flavor}
              label="👅 Flavor"
              description="How does it taste?"
              color="bg-orange-500"
            />
            
            <RatingSlider
              category="texture"
              value={ratings.texture}
              label="🥄 Texture"
              description="How is the consistency?"
              color="bg-yellow-500"
            />
            
            <RatingSlider
              category="presentation"
              value={ratings.presentation}
              label="👁️ Presentation"
              description="How does it look?"
              color="bg-green-500"
            />
            
            <RatingSlider
              category="overall"
              value={ratings.overall}
              label="⭐ Overall"
              description="Your overall impression"
              color="bg-purple-500"
            />
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
    </div>
  );
};

export default RatingForm;
