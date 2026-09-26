import { useNavigate } from 'react-router-dom';
import logoImage from './logo.PNG?url';
import { DEFAULT_PROFILE_PICTURE } from '../utils/helpers';
import '../styles/header.css';

const Header = ({ userProfile }) => {
  const navigate = useNavigate();

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');

    // Notify App component to update auth state
    window.dispatchEvent(new Event('authStateChanged'));

    navigate('/login');
  };

  return (
    <header className="header">

      <div className="header-container">
        <img src={logoImage} alt="GympAPPa Logo" className="header-logo" />
        <div className="logo">
          <h1>GympAPPa</h1>
          <p className="tagline">PERA Sports & Gymnasium Management System</p>
        </div>
        <div className="logo-spacer"></div>



        <div className="header-right">
          {userProfile && (
            <div className="user-section">
              <button onClick={handleLogout} className="btn-logout">Logout</button>
              <img
                src={userProfile.profilePicture || DEFAULT_PROFILE_PICTURE}
                alt="Profile"
                className="profile-pic"
                onClick={handleProfileClick}
                title="Click to view profile"
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;