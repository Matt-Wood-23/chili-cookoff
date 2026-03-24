import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { chiliAPI, configAPI } from './services/api';

// Import components
import Header from './components/Header';
import AdminPanel from './components/Admin/AdminPanel';
import VoterInterface from './components/Voter/VoterInterface';
import ResultsDashboard from './components/Results/ResultsDashboard';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(null);
  const [chilis, setChilis] = useState([]);
  const [currentView, setCurrentView] = useState('voter'); // 'admin', 'voter', 'results'

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load configuration and chilis in parallel
        const [configResponse, chilisResponse] = await Promise.all([
          configAPI.getAll(),
          chiliAPI.getAll()
        ]);

        setConfig(configResponse.data);
        setChilis(chilisResponse.data);
      } catch (err) {
        console.error('Failed to load initial data:', err);
        setError('Failed to load application data. Please check if the server is running.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Refresh chilis data
  const refreshChilis = async () => {
    try {
      const response = await chiliAPI.getAll();
      setChilis(response.data);
    } catch (err) {
      console.error('Failed to refresh chilis:', err);
      setError('Failed to refresh chili entries.');
    }
  };

  // Refresh configuration
  const refreshConfig = async () => {
    try {
      const response = await configAPI.getAll();
      setConfig(response.data);
    } catch (err) {
      console.error('Failed to refresh config:', err);
      setError('Failed to refresh configuration.');
    }
  };

  // Error handler
  const handleError = (errorMessage) => {
    setError(errorMessage);
    setTimeout(() => setError(null), 5000); // Clear error after 5 seconds
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header 
          config={config}
          currentView={currentView}
          onViewChange={setCurrentView}
        />
        
        {error && (
          <div className="max-w-7xl mx-auto px-4 pt-4">
            <ErrorMessage message={error} onClose={() => setError(null)} />
          </div>
        )}

        <main className="max-w-7xl mx-auto px-4 py-8">
          <Routes>
            {/* Voter Interface - Default view */}
            <Route 
              path="/" 
              element={
                <VoterInterface 
                  chilis={chilis}
                  config={config}
                  onDataUpdate={refreshChilis}
                  onError={handleError}
                />
              } 
            />
            
            {/* Admin Panel */}
            <Route 
              path="/admin" 
              element={
                <AdminPanel 
                  chilis={chilis}
                  config={config}
                  onDataUpdate={() => {
                    refreshChilis();
                    refreshConfig();
                  }}
                  onError={handleError}
                />
              } 
            />
            
            {/* Results Dashboard */}
            <Route 
              path="/results" 
              element={
                <ResultsDashboard 
                  chilis={chilis}
                  config={config}
                  onDataUpdate={refreshChilis}
                  onError={handleError}
                />
              } 
            />
            
            {/* Redirect unknown routes to voter interface */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
