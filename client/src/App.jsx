import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { chiliAPI, configAPI, healthAPI } from './services/api';

// Import components
import Header from './components/Header';
import AdminPanel from './components/Admin/AdminPanel';
import VoterInterface from './components/Voter/VoterInterface';
import ResultsDashboard from './components/Results/ResultsDashboard';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';

function App() {
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [serverInfo, setServerInfo] = useState({ ocr_available: false, admin_token_required: false });
  const [config, setConfig] = useState(null);
  const [chilis, setChilis] = useState([]);
  const [currentView, setCurrentView] = useState('voter'); // 'admin', 'voter', 'results'

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setNotice(null);

        // Load configuration and chilis in parallel
        const [configResponse, chilisResponse] = await Promise.all([
          configAPI.getAll(),
          chiliAPI.getAll()
        ]);

        setConfig(configResponse.data);
        setChilis(chilisResponse.data);

        // Ask the server what it can actually do, so the UI does not offer
        // scoresheet scanning when Ollama is not running.
        try {
          const health = await healthAPI.check();
          setServerInfo(health.data);
        } catch {
          // Health is advisory; the app works without it.
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
        setNotice({
          type: 'error',
          message: 'Failed to load application data. Please check if the server is running.'
        });
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
      setNotice({ type: 'error', message: 'Failed to refresh chili entries.' });
    }
  };

  // Refresh configuration
  const refreshConfig = async () => {
    try {
      const response = await configAPI.getAll();
      setConfig(response.data);
    } catch (err) {
      console.error('Failed to refresh config:', err);
      setNotice({ type: 'error', message: 'Failed to refresh configuration.' });
    }
  };

  // Shared notice handler. Success confirmations were being rendered as errors
  // because the type argument callers pass was dropped on the floor.
  // Memoized so children can safely list it as an effect dependency.
  const handleNotice = useCallback((message, type = 'error') => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 5000);
  }, []);

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
        
        {notice && (
          <div className="max-w-7xl mx-auto px-4 pt-4">
            <ErrorMessage
              message={notice.message}
              type={notice.type}
              onClose={() => setNotice(null)}
            />
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
                  ocrAvailable={serverInfo.ocr_available}
                  onDataUpdate={refreshChilis}
                  onError={handleNotice}
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
                  serverInfo={serverInfo}
                  onDataUpdate={() => {
                    refreshChilis();
                    refreshConfig();
                  }}
                  onError={handleNotice}
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
                  onError={handleNotice}
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
