import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { extractFacultyAndBatch, getRoleDisplayName, DEFAULT_PROFILE_PICTURE } from '../utils/helpers';
import '../styles/profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    profilePicture: '',
    tel: '',
    personalEmail: '',
    district: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setProfile(response.data.user);
      setFormData({
        name: response.data.user.name,
        profilePicture: response.data.user.profilePicture || '',
        tel: response.data.user.tel || '',
        personalEmail: response.data.user.personalEmail || '',
        district: response.data.user.district || ''
      });
      setPasswordData({
        currentPassword: '',
        password: '',
        confirmPassword: ''
      });
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch profile');
      setLoading(false);
    }
  };


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleBackgroundClick = (e) => {
    if (e.target.id === 'image-input-wrapper') {
      e.preventDefault();
    }
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (limit to 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('Image size must be less than 2MB');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          profilePicture: reader.result
        }));
        setError(''); // Clear any previous errors
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteProfilePicture = () => {
    setFormData(prev => ({
      ...prev,
      profilePicture: null
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await authAPI.updateProfile(formData);
      setProfile(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      window.dispatchEvent(new Event('authStateChanged'));
      setEditMode(false);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordSaving(true);
    setError('');
    setSuccess('');

    try {
      if (!passwordData.password || !passwordData.confirmPassword) {
        setError('New password and confirmation are required');
        return;
      }

      const response = await authAPI.setPassword(passwordData);
      setProfile(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      window.dispatchEvent(new Event('authStateChanged'));
      setPasswordData({
        currentPassword: '',
        password: '',
        confirmPassword: ''
      });
      setSuccess(response.data.message || 'Password updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-container">
        <div className="error-message">Failed to load profile</div>
        <button onClick={() => navigate('/login')} className="btn-primary">
          Go to Login
        </button>
      </div>
    );
  }

  const { faculty, batch } = extractFacultyAndBatch(profile.userId);

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>My Profile</h1>
        <p>Manage your account information</p>
      </div>

      <div className="profile-content">
        <div className="profile-sidebar">
          <div className="profile-picture-section">
            {editMode ? (
              <div id="image-input-wrapper" className="profile-upload">
                <img 
                  src={formData.profilePicture || DEFAULT_PROFILE_PICTURE} 
                  alt="Profile" 
                  className="profile-image"
                />
                <label htmlFor="picture-input" className="upload-label">
                  📷 Change
                </label>
                <input 
                  type="file" 
                  id="picture-input" 
                  onChange={handleProfilePictureChange}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                <button 
                  type="button"
                  onClick={handleDeleteProfilePicture}
                  className="delete-picture-btn"
                >
                  🗑️ Delete
                </button>
              </div>
            ) : (
              <img 
                src={profile.profilePicture || DEFAULT_PROFILE_PICTURE} 
                alt="Profile" 
                className="profile-image"
              />
            )}
          </div>

          <div className="profile-summary">
            <div className="summary-item">
              <span className="label">User ID:</span>
              <span className="value">{profile.userId}</span>
            </div>
            <div className="summary-item">
              <span className="label">Role:</span>
              <span className="value role-badge">{getRoleDisplayName(profile.role)}</span>
            </div>
            <div className="summary-item">
              <span className="label">Batch:</span>
              <span className="value">{batch}</span>
            </div>
          </div>
        </div>

        <div className="profile-main">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {editMode ? (
            <>
              <form onSubmit={handleSubmit} className="profile-form">
                <div className="form-section">
                  <h3>Basic Information</h3>
                  
                  <div className="form-group">
                    <label htmlFor="name">Full Name (as in university records)</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="tel">Telephone Number (Optional)</label>
                    <input
                      type="tel"
                      id="tel"
                      name="tel"
                      value={formData.tel}
                      onChange={handleChange}
                      placeholder="e.g., +94XXXXXXXXX"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="personalEmail">Personal Email (Optional)</label>
                    <input
                      type="email"
                      id="personalEmail"
                      name="personalEmail"
                      value={formData.personalEmail}
                      onChange={handleChange}
                      placeholder="e.g., yourname@gmail.com"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="district">District (Optional)</label>
                    <input
                      type="text"
                      id="district"
                      name="district"
                      value={formData.district}
                      onChange={handleChange}
                      placeholder="e.g., Kandy"
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button 
                    type="button" 
                    className="btn-outline" 
                    onClick={() => setEditMode(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>

              <div className="profile-section password-section">
                <div className="section-heading">
                  <h3>{profile.needsPasswordSetup ? 'Set Your Password' : 'Change Password'}</h3>
                  <p>Use this password later with your user ID to sign in.</p>
                </div>

                {profile.needsPasswordSetup && (
                  <div className="setup-notice">
                    Your Google registration is complete. Set a password now so you can log in later with your user ID.
                  </div>
                )}

                <form onSubmit={handlePasswordSubmit} className="password-form">
                  {!profile.needsPasswordSetup && (
                    <div className="form-group">
                      <label htmlFor="currentPassword">Current Password (Optional)</label>
                      <input
                        type="password"
                        id="currentPassword"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        placeholder="Enter current password if you want to verify it"
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label htmlFor="password">New Password</label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={passwordData.password}
                      onChange={handlePasswordChange}
                      placeholder="Minimum 6 characters"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm New Password</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="Re-enter the new password"
                      required
                    />
                  </div>

                  <div className="form-actions password-actions">
                    <button type="submit" className="btn-primary" disabled={passwordSaving}>
                      {passwordSaving ? 'Saving...' : profile.needsPasswordSetup ? 'Set Password' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <>
              <div className="profile-view">
                <div className="profile-section">
                  <h3>Account Information</h3>
                  
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="label">Name:</span>
                      <span className="value">{profile.name}</span>
                    </div>

                    <div className="info-item">
                      <span className="label">Email (University):</span>
                      <span className="value">{profile.email}</span>
                    </div>

                    <div className="info-item">
                      <span className="label">Faculty:</span>
                      <span className="value">{faculty}</span>
                    </div>

                    <div className="info-item">
                      <span className="label">Batch:</span>
                      <span className="value">{batch}</span>
                    </div>

                    <div className="info-item">
                      <span className="label">Role:</span>
                      <span className="value role-badge">{getRoleDisplayName(profile.role)}</span>
                    </div>
                  </div>
                </div>

                <div className="profile-section">
                  <h3>Contact Information</h3>
                  
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="label">Personal Email:</span>
                      <span className="value">{profile.personalEmail || 'Not provided'}</span>
                    </div>

                    <div className="info-item">
                      <span className="label">Telephone Number:</span>
                      <span className="value">{profile.tel || 'Not provided'}</span>
                    </div>

                    <div className="info-item">
                      <span className="label">District:</span>
                      <span className="value">{profile.district || 'Not provided'}</span>
                    </div>
                  </div>
                </div>

                <div className="profile-actions">
                  <button 
                    onClick={() => setEditMode(true)}
                    className="btn-primary"
                  >
                    Edit Profile
                  </button>
                </div>
              </div>

            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;