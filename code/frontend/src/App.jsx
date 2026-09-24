import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { authAPI } from './utils/api';
import Header from './components/Header';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import RequestEquipment from './pages/RequestEquipment';
import RequestHistory from './pages/RequestHistory';
import Profile from './pages/Profile';
import ManageEquipment from './pages/ManageEquipment';
import AddEquipment from './pages/AddEquipment';
import IssueEquipment from './pages/IssueEquipment';
import StaffEquipment from './pages/StaffEquipment';
import MyIssuedItems from './pages/MyIssuedItems';
import RoleManagement from './pages/RoleManagement';
import PartnerFinder from './pages/PartnerFinder';
import AdminCourtManagement from './pages/AdminCourtManagement';
import StudentCourtAvailability from './pages/StudentCourtAvailability';
import EventsAndTournaments from './pages/EventsAndTournaments';
import EventDetail from './pages/EventDetail';
import './styles/App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = sessionStorage.getItem('token');
      const userData = sessionStorage.getItem('user');

      if (token && userData) {
        try {
          const profileResponse = await authAPI.getProfile();
          const freshUser = profileResponse.data?.user || JSON.parse(userData);
          setUser(freshUser);
          sessionStorage.setItem('user', JSON.stringify(freshUser));
        } catch (error) {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    initializeAuth();

    const handleAuthStateChange = () => {
      const updatedToken = sessionStorage.getItem('token');
      const updatedUserData = sessionStorage.getItem('user');
      if (updatedToken && updatedUserData) {
        try {
          setUser(JSON.parse(updatedUserData));
        } catch (error) {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    window.addEventListener('authStateChanged', handleAuthStateChange);
    return () => window.removeEventListener('authStateChanged', handleAuthStateChange);
  }, []);

  // Show loading spinner while checking auth
  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  // These use user state — NOT localStorage directly
  const ProtectedRoute = ({ element }) => {
    return user ? element : <Navigate to="/login" replace />;
  };

  const PublicRoute = ({ element }) => {
    return !user ? element : <Navigate to="/dashboard" replace />;
  };

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="App">
        {user && <Header userProfile={user} />}
        {user && <Navigation role={user?.role} />}
        <main className="main-content">
          <Routes>
            <Route path="/login" element={<PublicRoute element={<Login />} />} />
            <Route path="/register" element={<PublicRoute element={<Register />} />} />
            <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
            <Route path="/request-equipment" element={<ProtectedRoute element={<RequestEquipment />} />} />
            <Route path="/request-history" element={<ProtectedRoute element={<RequestHistory />} />} />
            <Route path="/profile" element={<ProtectedRoute element={<Profile />} />} />
            <Route path="/manage-equipment" element={<ProtectedRoute element={<ManageEquipment />} />} />
            <Route path="/add-equipment" element={<ProtectedRoute element={<AddEquipment />} />} />
            <Route path="/issue-equipment" element={<ProtectedRoute element={<IssueEquipment />} />} />
            <Route path="/staff-equipment" element={<ProtectedRoute element={<StaffEquipment />} />} />
            <Route path="/my-issued-items" element={<ProtectedRoute element={<MyIssuedItems />} />} />
            <Route path="/role-management" element={<ProtectedRoute element={<RoleManagement />} />} />
            <Route path="/partner-finder" element={<ProtectedRoute element={<PartnerFinder />} />} />
            <Route path="/student-court-availability" element={<ProtectedRoute element={<StudentCourtAvailability />} />} />
            <Route path="/admin-court-management" element={<ProtectedRoute element={<AdminCourtManagement />} />} />
            <Route path="/events-and-tournaments" element={<ProtectedRoute element={<EventsAndTournaments />} />} />
            <Route path="/events/:eventId" element={<ProtectedRoute element={<EventDetail />} />} />
            <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
            <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;