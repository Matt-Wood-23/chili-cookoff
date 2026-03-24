import React, { useState } from 'react';
import { chiliAPI } from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

const AddChiliForm = ({ onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    contestant_name: ''
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        onError('Please select a valid image file (JPEG, PNG, or GIF)');
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        onError('File size must be less than 5MB');
        return;
      }

      setSelectedImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name.trim() || !formData.contestant_name.trim()) {
      onError('Name and contestant name are required');
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('name', formData.name.trim());
      submitData.append('description', formData.description.trim());
      submitData.append('contestant_name', formData.contestant_name.trim());
      
      if (selectedImage) {
        submitData.append('image', selectedImage);
      }

      await chiliAPI.create(submitData);

      // Reset form
      setFormData({
        name: '',
        description: '',
        contestant_name: ''
      });
      setSelectedImage(null);
      setImagePreview(null);

      // Reset file input
      const fileInput = document.getElementById('imageInput');
      if (fileInput) fileInput.value = '';

      onSuccess();
      onError('Chili entry added successfully!', 'success');
    } catch (error) {
      console.error('Error creating chili entry:', error);
      onError(error.response?.data?.error || 'Failed to create chili entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Add New Chili Entry</h2>
        <p className="text-gray-600">Create a new entry for the chili cook-off</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Chili Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Chili Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g., Spicy Texas Red"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chili-red focus:border-transparent"
            required
            disabled={loading}
          />
        </div>

        {/* Contestant Name */}
        <div>
          <label htmlFor="contestant_name" className="block text-sm font-medium text-gray-700 mb-2">
            Contestant Name *
          </label>
          <input
            type="text"
            id="contestant_name"
            name="contestant_name"
            value={formData.contestant_name}
            onChange={handleInputChange}
            placeholder="e.g., John Smith"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chili-red focus:border-transparent"
            required
            disabled={loading}
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Describe your chili, ingredients, cooking time, etc."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chili-red focus:border-transparent resize-none"
            disabled={loading}
          />
        </div>

        {/* Image Upload */}
        <div>
          <label htmlFor="imageInput" className="block text-sm font-medium text-gray-700 mb-2">
            Chili Photo (Optional)
          </label>
          
          {!imagePreview ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-chili-red transition-colors">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="mt-4">
                <label htmlFor="imageInput" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    Upload a chili photo
                  </span>
                  <span className="mt-1 block text-sm text-gray-500">
                    PNG, JPG, GIF up to 5MB
                  </span>
                </label>
                <input
                  id="imageInput"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={loading}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Chili preview"
                  className="w-full h-48 object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedImage(null);
                  setImagePreview(null);
                  const fileInput = document.getElementById('imageInput');
                  if (fileInput) fileInput.value = '';
                }}
                disabled={loading}
                className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
              >
                Remove image
              </button>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-chili-red text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {loading ? (
              <>
                <LoadingSpinner size="small" />
                <span>Adding Chili...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add Chili Entry</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddChiliForm;
