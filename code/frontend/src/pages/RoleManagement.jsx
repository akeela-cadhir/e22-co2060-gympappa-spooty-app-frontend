import { useEffect, useMemo, useState } from 'react';
import { authAPI } from '../utils/api';
import { AVAILABLE_ROLES, getRoleDisplayName } from '../utils/helpers';
import '../styles/template.css';

const RoleManagement = () => {
  const currentUser = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();

  const [users, setUsers] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [roleSelections, setRoleSelections] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const usersResponse = await authAPI.getUsers();
      const nextUsers = usersResponse.data?.users || [];

      setUsers(nextUsers);
      setRoleSelections(Object.fromEntries(nextUsers.map((user) => [user.user_id, user.role])));
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Users API endpoint was not found. Start the updated backend in code/backend so /api/auth/users is available.');
      } else {
        setError(err.response?.data?.message || 'Failed to load role management data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateUserRole = async (userId) => {
    const selectedRole = roleSelections[userId];
    if (!selectedRole) {
      setError('Please select a role');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authAPI.updateUserRole(userId, selectedRole);
      setSuccess(response.data?.message || 'User role updated');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user role');
    } finally {
      setActionLoading(false);
    }
  };

  const visibleUsers = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return users;

    return users.filter((user) =>
      String(user.user_id || '').toLowerCase().includes(keyword)
      || String(user.name || '').toLowerCase().includes(keyword)
    );
  }, [users, searchText]);

  return (
    <div className="template-container">
      {currentUser?.role !== 'admin' && (
        <div className="template-content">
          <div className="error-message">Only admins can access this page.</div>
        </div>
      )}

      {currentUser?.role === 'admin' && (
        <>
      <div className="template-header">
        <h1>Role Management</h1>
        <p>Filter users by registration number or user ID and update roles directly.</p>
      </div>

      <div className="template-content">
        {error && <div className="error-message" style={{ marginBottom: '12px' }}>{error}</div>}
        {success && <div className="success-message" style={{ marginBottom: '12px' }}>{success}</div>}

        <div className="template-section">
          <h3 style={{ marginBottom: '10px' }}>Registered Users & Direct Role Update</h3>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search by registration number / user ID / name"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
            />
            <button className="btn-secondary" onClick={() => setSearchText('')}>Clear</button>
          </div>

          {loading ? (
            <p>Loading users...</p>
          ) : visibleUsers.length === 0 ? (
            <p style={{ color: 'var(--color-text-light)' }}>No users found.</p>
          ) : (
            <table className="equipment-table stock-full-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Current Role</th>
                  <th>New Role</th>
                  <th>Update</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user) => (
                  <tr key={user.user_id}>
                    <td>{user.user_id}</td>
                    <td>{user.name}</td>
                    <td>{user.university_email}</td>
                    <td>{getRoleDisplayName(user.role)}</td>
                    <td>
                      <select
                        value={roleSelections[user.user_id] || user.role}
                        onChange={(e) => setRoleSelections((prev) => ({ ...prev, [user.user_id]: e.target.value }))}
                        style={{ padding: '6px 8px', minWidth: '170px' }}
                      >
                        {AVAILABLE_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {getRoleDisplayName(role)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        className="btn-primary"
                        disabled={actionLoading || (roleSelections[user.user_id] || user.role) === user.role}
                        onClick={() => handleUpdateUserRole(user.user_id)}
                      >
                        Save Role
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
};

export default RoleManagement;
