import React, { useEffect, useState } from 'react';
import { equipmentAPI } from '../utils/api';
import '../styles/template.css';

const getStoredUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

const statusStyle = (status) => {
  switch (status) {
    case 'pending':        return { backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba' };
    case 'issued':         return { backgroundColor: '#cce5ff', color: '#004085', border: '1px solid #b8daff' };
    case 'pending_return': return { backgroundColor: '#ffd6a5', color: '#7d4e00', border: '1px solid #ffb347' };
    case 'returned':       return { backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' };
    case 'cancelled':      return { backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' };
    default:               return { backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba' };
  }
};

const statusLabel = (status) => {
  switch (status) {
    case 'pending':        return '⏳ Pending Approval';
    case 'issued':         return '📦 Collected';
    case 'pending_return': return '🔄 Return in Progress';
    case 'returned':       return '↩️ Returned';
    case 'cancelled':      return '🚫 Declined';
    default:               return '⏳ Pending';
  }
};

const formatTime = (isoString) => {
  return new Date(isoString).toLocaleString([], {
    year:     'numeric',
    month:    'short',
    day:      'numeric',
    hour:     '2-digit',
    minute:   '2-digit',
    hour12:   true,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
};

const STUDENT_LIKE_ROLES = ['student', 'games-captain', 'psu', 'faculty-coordinator'];

const Dashboard = () => {
  const [availability, setAvailability] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  const user      = getStoredUser();
  const role      = user?.role || '';
  const studentId = user?.userId || user?.user_id || '';
  const name      = user?.name || studentId;
  const canUseStudentFeatures = STUDENT_LIKE_ROLES.includes(role);

  const fetchAvailability = async () => {
    setAvailabilityLoading(true);
    try {
      const response = await equipmentAPI.getAll();
      setAvailability(response.data || {});
    } catch {
      setAvailability({});
    } finally {
      setAvailabilityLoading(false);
    }
  };

  useEffect(() => {
    if (canUseStudentFeatures) {
      fetchAvailability();
      // Poll for updates every 8 seconds
      const id = setInterval(() => fetchAvailability(), 8000);

      // Listen for cross-tab update signals from staff actions
      const onStorage = (e) => {
        if (e.key === 'equipment-updated') {
          fetchAvailability();
        }
      };
      window.addEventListener('storage', onStorage);

      return () => {
        clearInterval(id);
        window.removeEventListener('storage', onStorage);
      };
    }
  }, [canUseStudentFeatures]);

  // ── Admin Dashboard ──
  if (role === 'admin') {
    return (
      <div className="template-container">
        <div className="template-header">
          <h1>👋 Welcome, {name}</h1>
          <p>You are logged in as <strong>Admin</strong>. Use the menu to manage equipment and sports.</p>
        </div>
        <div className="template-content">
          <div className="template-section">
            <h3>Quick Actions</h3>
            <ul style={{ marginTop: '12px', lineHeight: '2', fontSize: '15px' }}>
              <li>➕ <strong>Add Equipment</strong> — Add new sports or equipment to the system</li>
              <li>⚙️ <strong>Manage Equipment</strong> — Update stock, remove equipment</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // ── Counter Staff Dashboard ──
  if (role === 'counter-staff') {
    return (
      <div className="template-container">
        <div className="template-header">
          <h1>👋 Welcome, {name}</h1>
          <p>You are logged in as <strong>Counter Staff</strong>. Use the menu to issue and return equipment.</p>
        </div>
        <div className="template-content">
          <div className="template-section">
            <h3>Quick Actions</h3>
            <ul style={{ marginTop: '12px', lineHeight: '2', fontSize: '15px' }}>
              <li>📦 <strong>Issue Equipment</strong> — Search a student and accept their requests</li>
              <li>↩️ <strong>Return Equipment</strong> — Confirm equipment returned by students</li>
              <li>📋 <strong>My Issued Items</strong> — View all currently issued equipment</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // ── Student Dashboard ──
  return (
    <div className="template-container">

      <div className="template-header">
        <h1>👋 Welcome, {name}</h1>
        <p>Track current equipment availability below and use the menu to view your request history.</p>
      </div>

      <div className="template-content">

        <div className="template-section">
          <h2 style={{ marginBottom: '12px' }}>🏓 Current Equipment Availability</h2>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search equipment — e.g. Racket, Shuttlecock"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
            />
            <button className="btn-secondary" onClick={() => setSearchTerm('')}>Clear</button>
          </div>
          {availabilityLoading && <p style={{ color: 'var(--color-text-light)' }}>⏳ Loading availability...</p>}
          {!availabilityLoading && Object.keys(availability).length === 0 && (
            <p style={{ color: 'var(--color-text-light)' }}>No availability data available.</p>
          )}
          {!availabilityLoading && Object.keys(availability).length > 0 && (
            <div>
              <div style={{ marginBottom: '12px' }}>
                <table className="equipment-table stock-compact-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '6%', border: '1px solid var(--color-border)', padding: '8px' }}>ID</th>
                      <th style={{ border: '1px solid var(--color-border)', padding: '8px' }}>Equipment</th>
                      <th style={{ width: '24%', border: '1px solid var(--color-border)', padding: '8px' }}>Sport</th>
                      <th style={{ width: '12%', border: '1px solid var(--color-border)', padding: '8px', textAlign: 'center' }}>Available</th>
                      <th style={{ width: '14%', border: '1px solid var(--color-border)', padding: '8px', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(availability).sort().flatMap((sportName) => {
                      const items = availability[sportName] || [];
                      return items.map((item) => ({ ...item, sport_name: sportName }));
                    }).filter(item => {
                      if (!searchTerm.trim()) return true;
                      const q = searchTerm.toLowerCase();
                      return (String(item.display_name || item.equipment_name).toLowerCase().includes(q) || String(item.sport_name || '').toLowerCase().includes(q));
                    }).map((item) => (
                      <tr key={item.id}>
                        <td style={{ border: '1px solid var(--color-border)', padding: '8px', textAlign: 'center' }}>{item.id}</td>
                        <td style={{ border: '1px solid var(--color-border)', padding: '8px' }}><strong>{item.display_name || item.equipment_name}</strong></td>
                        <td style={{ border: '1px solid var(--color-border)', padding: '8px' }}>{item.sport_name}</td>
                        <td style={{ border: '1px solid var(--color-border)', padding: '8px', textAlign: 'center' }}>{item.remaining_quantity}</td>
                        <td style={{ border: '1px solid var(--color-border)', padding: '8px', textAlign: 'center' }}>
                          <span className={`eq-badge ${item.remaining_quantity > 0 ? 'badge-success' : 'badge-danger'}`}>
                            {item.remaining_quantity > 0 ? 'Available' : 'Out of Stock'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;