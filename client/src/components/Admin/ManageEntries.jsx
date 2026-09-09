import React, { useState } from 'react';
import { chiliAPI, mediaUrl } from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

const ManageEntries = ({ chilis, onUpdate, onError }) => {
  const [editingChili, setEditingChili] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEdit = (chili) => {
    setEditingChili({ ...chili });
    setShowEditModal(true);
  };

  const handleDelete = async (chiliId) => {
    if (!confirm('Are you sure you want to delete this chili entry? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      await chiliAPI.delete(chiliId);
      onUpdate();
      onError('Chili entry deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting chili:', error);
      onError(error.response?.data?.error || 'Failed to delete chili entry');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updatedData) => {
    setLoading(true);
    try {
      const submitData = new FormData();
      submitData.append('name', updatedData.name);
      submitData.append('description', updatedData.description || '');
      submitData.append('contestant_name', updatedData.contestant_name);
      
      if (updatedData.imageFile) {
        submitData.append('image', updatedData.imageFile);
      }

      await chiliAPI.update(editingChili.id, submitData);
      setShowEditModal(false);
      setEditingChili(null);
      onUpdate();
      onError('Chili entry updated successfully', 'success');
    } catch (error) {
      console.error('Error updating chili:', error);
      onError(error.response?.data?.error || 'Failed to update chili entry');
    } finally {
      setLoading(false);
    }
  };

  if (!chilis || chilis.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <span className="text-6xl mb-4 block">🌶️</span>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Chili Entries</h3>
        <p className="text-gray-500">No chili entries have been added yet. Create your first entry to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Manage Chili Entries</h2>
          <p className="text-sm text-gray-600 mt-1">
            Edit or delete existing chili entries ({chilis.length} total)
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chili
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contestant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Votes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {chilis.map((chili) => (
                <tr key={chili.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {chili.image_path ? (
                          <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={mediaUrl(chili.image_path)}
                            alt={chili.name}
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
                        <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                          {chili.name}
                        </div>
                        {chili.description && (
                          <div className="text-sm text-gray-500 truncate max-w-[200px]">
                            {chili.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{chili.contestant_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {chili.vote_count || 0} vote{chili.vote_count === 1 ? '' : 's'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {chili.avg_overall ? (
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900 mr-1">
                          {chili.avg_overall}
                        </span>
                        <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">No votes</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(chili)}
                        disabled={loading}
                        className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(chili.id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingChili && (
        <EditChiliModal
          chili={editingChili}
          onSave={handleUpdate}
          onClose={() => {
            setShowEditModal(false);
            setEditingChili(null);
          }}
          loading={loading}
        />
      )}
    </div>
  );
};

// Edit Modal Component
const EditChiliModal = ({ chili, onSave, onClose, loading }) => {
  const [formData, setFormData] = useState({
    name: chili.name || '',
    description: chili.description || '',
    contestant_name: chili.contestant_name || ''
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

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
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, or GIF)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.contestant_name.trim()) {
      alert('Name and contestant name are required');
      return;
    }

    onSave({
      ...formData,
      imageFile: selectedImage
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Edit Chili Entry</h2>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chili-red"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contestant Name *</label>
            <input
              type="text"
              name="contestant_name"
              value={formData.contestant_name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chili-red"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chili-red"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chili Photo</label>
            {imagePreview || chili.image_path ? (
              <div className="space-y-2">
                <img
                  src={imagePreview || mediaUrl(chili.image_path)}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreview(null);
                  }}
                  disabled={loading}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Remove image
                </button>
              </div>
            ) : (
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={loading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-chili-red file:text-white hover:file:bg-red-700"
              />
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-chili-red text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="small" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManageEntries;
