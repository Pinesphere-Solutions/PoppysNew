import React, { useState, useEffect, createContext, useContext } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./src/components/Layout"; /* Sidebar, Header, Footer */
import Login from "./src/screens/Login";
import Dashboard from "./src/screens/Dashboard";
import Machine from "./src/screens/Machine";
import Operator from "./src/screens/Operator";
import Line from "./src/screens/Line";
import Consolidated from "./src/screens/Consolidated";

// ✅ Simple Loading Context
const LoadingContext = createContext();

// ✅ Simple Loading Hook
export const useLoading = () => {
  const context = useContext(LoadingContext);
  return context || { 
    showLoading: () => {}, 
    hideLoading: () => {}, 
    isLoading: false 
  };
};

// ✅ Simple Loading Component
const SimpleLoader = ({ isLoading }) => {
  if (!isLoading) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        padding: '30px',
        backgroundColor: 'white',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <div style={{
          fontSize: '16px',
          color: '#333',
          fontWeight: '500'
        }}>
          Loading...
        </div>
      </div>
      <style>
        {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
      </style>
    </div>
  );
};

// ✅ Simple Loading Provider
const LoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const showLoading = () => setIsLoading(true);
  const hideLoading = () => setIsLoading(false);
  
  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading, isLoading }}>
      {children}
      <SimpleLoader isLoading={isLoading} />
    </LoadingContext.Provider>
  );
};

// ✅ Auto Loading for Routes and API
const AutoLoader = ({ children }) => {
  const { showLoading, hideLoading } = useLoading();
  
  useEffect(() => {
    // Show loading on page load/refresh
    showLoading();
    const timer = setTimeout(hideLoading, 1000);
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    // Intercept fetch for API loading
    const originalFetch = window.fetch;
    let requestCount = 0;
    
    window.fetch = async (...args) => {
      requestCount++;
      if (requestCount === 1) showLoading();
      
      try {
        const response = await originalFetch(...args);
        return response;
      } finally {
        requestCount--;
        if (requestCount === 0) hideLoading();
      }
    };
    
    return () => { window.fetch = originalFetch; };
  }, [showLoading, hideLoading]);
  
  return children;
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LoadingProvider>
      <AutoLoader>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/machine" element={<Machine />} />
              <Route path="/operator" element={<Operator />} />
              <Route path="/line" element={<Line />} />
              <Route path="/consolidated" element={<Consolidated />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AutoLoader>
    </LoadingProvider>
  </React.StrictMode>
);