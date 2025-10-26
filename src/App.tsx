import React from 'react';
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthWrapper from './components/AuthWrapper';
import Layout from './components/Layout';
import ErrorModal from './components/ErrorModal';
import Dashboard from './pages/Dashboard';
import Emails from './pages/Emails';
import Quotations from './pages/Quotations';
import Equipment from './pages/Equipment';
import Settings from './pages/Settings';

interface GlobalError {
  title: string;
  message: string;
  type?: 'error' | 'timeout' | 'network';
}

function App() {
  const [globalError, setGlobalError] = useState<GlobalError | null>(null);

  const handleGlobalError = (error: GlobalError) => {
    console.error('Global error triggered:', error);
    setGlobalError(error);
  };

  const clearGlobalError = () => {
    console.log('Clearing global error');
    setGlobalError(null);
  };

  return (
    <AuthWrapper>
      <Router>
        <Layout onGlobalError={handleGlobalError}>
          <Routes>
            <Route path="/" element={<Dashboard onGlobalError={handleGlobalError} />} />
            <Route path="/emails" element={<Emails onGlobalError={handleGlobalError} />} />
            <Route path="/quotations" element={<Quotations onGlobalError={handleGlobalError} />} />
            <Route path="/equipment" element={<Equipment onGlobalError={handleGlobalError} />} />
            <Route path="/settings" element={<Settings onGlobalError={handleGlobalError} />} />
          </Routes>
        </Layout>
        <ErrorModal
          isOpen={!!globalError}
          onClose={clearGlobalError}
          title={globalError?.title || 'Error'}
          message={globalError?.message || ''}
          type={globalError?.type || 'error'}
          onRetry={globalError?.type === 'network' ? clearGlobalError : undefined}
        />
      </Router>
    </AuthWrapper>
  );
}

export default App;