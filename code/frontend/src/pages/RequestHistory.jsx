import React, { useEffect, useMemo, useState } from 'react';
import { equipmentAPI } from '../utils/api';
import '../styles/template.css';
import '../styles/equipment.css';

const getStoredUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

const normalize = (value = '') => String(value).replace(/[\s/]/g, '').toLowerCase();

const sortRecords = (items) => {
  return [...items].sort((left, right) => {
    const regCompare = normalize(left.student_id).localeCompare(normalize(right.student_id));
    if (regCompare !== 0) return regCompare;
    return new Date(right.requested_at) - new Date(left.requested_at);
  });
};

const formatTime = (isoString) => {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const statusStyle = (status) => {
  switch (status) {
    case 'pending': return { backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba' };
    case 'issued': return { backgroundColor: '#cce5ff', color: '#004085', border: '1px solid #b8daff' };
    case 'pending_return': return { backgroundColor: '#ffd6a5', color: '#7d4e00', border: '1px solid #ffb347' };
    case 'returned': return { backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' };
    case 'cancelled': return { backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' };
    default: return { backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba' };
  }
};

const statusLabel = (status) => {
  switch (status) {
    case 'pending': return '⏳ Pending Approval';
    case 'issued': return '📦 Collected';
    case 'pending_return': return '🔄 Return in Progress';
    case 'returned': return '↩️ Returned';
    case 'cancelled': return '🚫 Declined';
    default: return '⏳ Pending';
  }
};

const getDisplayedQuantity = (item) => {
  const issuedQuantity = Number(item.issued_quantity ?? 0);
  if (issuedQuantity > 0) return issuedQuantity;
  return Number(item.quantity ?? 0);
};

function RequestHistory() {
  const [history, setHistory] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const user = getStoredUser();
  const studentId = user?.userId || user?.user_id || '';
  const name = user?.name || studentId;

  useEffect(() => {
    const fetchHistory = async () => {
      if (!studentId) {
        setError('Unable to determine your student ID. Please login again.');
        return;
      }

      setLoading(true);
      setError('');
      try {
        const response = await equipmentAPI.getHistory(studentId);
        setHistory(sortRecords(response.data || []));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch request history.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
    // poll periodically and listen for updates from staff actions
    const id = setInterval(() => fetchHistory(), 8000);
    const onStorage = (e) => {
      if (e.key === 'equipment-updated') fetchHistory();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      clearInterval(id);
      window.removeEventListener('storage', onStorage);
    };
  }, [studentId]);

  const visibleHistory = useMemo(() => {
    const query = normalize(searchText);
    return history.filter((item) => {
      if (!query) return true;
      return [item.student_id, item.sport_name, item.display_name, item.status, item.quantity, item.issued_quantity].join(' ').toLowerCase().includes(query);
    });
  }, [history, searchText]);

  return (
    <div className="template-container">

      <div className="template-content">
        <div className="template-section">
          <h2 style={{ marginBottom: '12px' }}>📋 My Equipment Request History</h2>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search equipment, sport, status, or quantity"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
            />
            <button className="btn-secondary" onClick={() => setSearchText('')}>Clear</button>
          </div>

          {loading && <p style={{ color: 'var(--color-text-light)' }}>⏳ Loading your history...</p>}
          {error && <p style={{ color: 'var(--color-error, red)' }}>❌ {error}</p>}

          {!loading && !error && visibleHistory.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888', background: '#f8f9fa', borderRadius: '10px', border: '1px dashed #ccc' }}>
              <p style={{ fontSize: '18px', marginBottom: '8px' }}>No requests found.</p>
              <p style={{ fontSize: '14px' }}>Use Request Equipment to create a new request.</p>
            </div>
          )}

          {!loading && !error && visibleHistory.length > 0 && (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr style={{ backgroundColor: '#44A194', color: 'white' }}>
                    <th>Sport</th>
                    <th>Equipment</th>
                    <th>Qty</th>
                    <th>Pickup Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                          {visibleHistory.map((item) => (
                            <tr key={item.request_id ?? item.id}>
                              <td>{item.sport_name}</td>
                              <td><strong>{item.display_name}</strong></td>
                              <td style={{ textAlign: 'center' }}>{getDisplayedQuantity(item)}</td>
                              <td>{formatTime(item.pickup_time)}</td>
                              <td>
                                <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', ...statusStyle(item.status) }}>
                                  {statusLabel(item.status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RequestHistory;