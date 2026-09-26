import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/navigation.css';

const getUnreadCount = () => {
  try {
    return Number(localStorage.getItem('partnerFinderUnreadCount') || '0');
  } catch {
    return 0;
  }
};

const Navigation = ({ role }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(getUnreadCount());

  const getMenuItems = () => {
    const allItems = [
      // Student/General user items
      { label: 'Dashboard', path: '/dashboard', roles: ['student', 'games-captain', 'psu', 'faculty-coordinator', 'coach', 'private-coach', 'academic-staff'] },
      { label: 'Request Equipment', path: '/request-equipment', roles: ['student', 'games-captain', 'psu', 'faculty-coordinator', 'coach', 'private-coach', 'academic-staff'] },
      { label: 'Partner Finder', path: '/partner-finder', roles: ['student', 'games-captain', 'psu', 'faculty-coordinator', 'coach', 'private-coach', 'academic-staff'] },
      { label: 'Events & Tournaments', path: '/events-and-tournaments', roles: ['student', 'games-captain', 'psu', 'faculty-coordinator', 'coach', 'private-coach', 'academic-staff', 'admin'] },
      { label: 'Court Availability', path: '/student-court-availability', roles: ['student', 'games-captain', 'psu', 'faculty-coordinator', 'coach', 'private-coach', 'academic-staff'] },
      { label: 'Request History', path: '/request-history', roles: ['student', 'games-captain', 'psu', 'faculty-coordinator', 'coach', 'private-coach', 'academic-staff'] },

      // Admin only items
      { label: 'Manage Equipment', path: '/manage-equipment', roles: ['admin'] },
      { label: 'Add Equipment', path: '/add-equipment', roles: ['admin'] },
      { label: 'Court Management', path: '/admin-court-management', roles: ['admin'] },
      { label: 'Role Management', path: '/role-management', roles: ['admin'] },

      // Counter staff only items (consolidated)
      { label: 'Equipment Stock Overview', path: '/issue-equipment', roles: ['counter-staff'] },
      { label: 'Issue / Return Equipment', path: '/staff-equipment', roles: ['counter-staff'] },
      { label: 'Issued Items History', path: '/my-issued-items', roles: ['counter-staff'] },

      // Everyone sees Profile
      { label: 'Profile', path: '/profile', roles: ['student', 'games-captain', 'admin', 'counter-staff', 'psu', 'faculty-coordinator', 'coach', 'private-coach', 'academic-staff'] },
    ];

    return allItems.filter(item => item.roles.includes(role));
  };

  const menuItems = getMenuItems();

  const handleNavClick = (path) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    const syncUnread = () => setUnreadCount(getUnreadCount());
    syncUnread();
    window.addEventListener('storage', syncUnread);
    return () => window.removeEventListener('storage', syncUnread);
  }, []);

  return (
    <nav className={`navigation ${isMenuOpen ? 'active' : ''}`}>
      <div className="nav-container">
        <button className="nav-toggle" onClick={toggleMenu}>
          <span></span>
          <span></span>
          <span></span>
        </button>

        <ul className="nav-menu">
          {menuItems.map((item) => (
            <li key={item.path}>
              <button
                onClick={() => handleNavClick(item.path)}
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              >
                {item.label}
                {item.path === '/partner-finder' && unreadCount > 0 ? <span style={{ marginLeft: '8px', background: '#ef4444', color: 'white', borderRadius: '999px', padding: '2px 6px', fontSize: '11px' }}>{unreadCount}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default Navigation;