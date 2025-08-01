import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginForm from './Components/LoginPage';
import LDDashboard from './Components/LD/LDDashboard';
import DeliveryDashboard from './Components/Delivery/DeliveryDashboard';
import HRTagDashboard from './Components/HRTag/HRTagDashboard';
import AdminDashboard from './Components/Admin/AdminDashboard';
import HROpssDashboard from './Components/HROps/HROpssDashboard';
import ITDashboard from './Components/IT/ITDashboard';
import VenkatPanel from './Components/VenkatPanel';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('authToken');
  const userData = localStorage.getItem('userData');
  
  if (!token || !userData) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Team Based Route Component with Error Handling
const TeamBasedRoute = () => {
  try {
    const userDataString = localStorage.getItem('userData');
    
    if (!userDataString) {
      console.error('No userData found in localStorage');
      return <Navigate to="/login" replace />;
    }
    
    const userData = JSON.parse(userDataString);
    const team = userData?.team;
    
    if (!team) {
      console.error('No team found in userData:', userData);
      return <Navigate to="/login" replace />;
    }
    
    console.log('User team:', team); // Debug log
    
    switch (team) {
      case 'L&D':
        return <LDDashboard />;
      case 'Delivery':
        return <DeliveryDashboard />;
      case 'HR Tag':
        return <HRTagDashboard />;
      case 'Admin':
        return <AdminDashboard />;
      case 'HR Ops':
        return <HROpssDashboard />;
      case 'IT': 
        return <ITDashboard />;
      case 'VENKAT': 
        return <VenkatPanel />;
      default:
        console.error('Unknown team:', team);
        return <Navigate to="/login" replace />;
    }
  } catch (error) {
    console.error('Error in TeamBasedRoute:', error);
    // Clear corrupted data
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    return <Navigate to="/login" replace />;
  }
};

const App = () => {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginForm />} />
          
          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <TeamBasedRoute />
              </ProtectedRoute>
            } 
          />
          
          {/* Team Specific Routes */}
          <Route 
            path="/ld-dashboard" 
            element={
              <ProtectedRoute>
                <LDDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/hareesh-dashboard" 
            element={
              <ProtectedRoute>
                <DeliveryDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/hr-tag-dashboard" 
            element={
              <ProtectedRoute>
                <HRTagDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/admin-dashboard" 
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/hr-ops-dashboard" 
            element={
              <ProtectedRoute>
                <HROpssDashboard />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/it-dashboard" 
            element={
              <ProtectedRoute>
                <ITDashboard />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/admin-venkat" 
            element={
                <VenkatPanel />
            } 
          />
          
          {/* Default Routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;