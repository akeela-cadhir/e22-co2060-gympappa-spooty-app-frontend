import React, { useEffect, useState } from 'react';
import { equipmentAPI } from '../utils/api';
import '../styles/template.css';

const getStoredStudentId = () => {
  try {
    const storedUser = JSON.parse(sessionStorage.getItem('user') || '{}');
    return storedUser?.userId || storedUser?.user_id || '';
  } catch {
    return '';
  }
};

const pad = (n) => String(n).padStart(2, '0');

const getMinDateTime = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const getMaxDateTime = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T20:00`;
};

const isValidPickupTime = (value) => {
  if (!value) return { ok: false, message: 'Please select a pickup time.' };

  // Read hour directly from the string to avoid timezone issues
  const hourStr = value.substring(11, 13);
  const localHour = parseInt(hourStr, 10);

  const d    = new Date(value);
  const now  = new Date();
  const tomorrow8pm = new Date();
  tomorrow8pm.setDate(now.getDate() + 1);
  tomorrow8pm.setHours(20, 0, 0, 0);

  if (d < now)         return { ok: false, message: 'Pickup time cannot be in the past.' };
  if (d > tomorrow8pm) return { ok: false, message: 'Pickup time cannot be beyond tomorrow 8:00 PM.' };
  if (localHour < 8)   return { ok: false, message: 'Pickup time cannot be before 8:00 AM.' };
  if (localHour >= 20) return { ok: false, message: 'Pickup time cannot be after 8:00 PM.' };

  return { ok: true, message: '' };
};

const RequestEquipment = () => {
  const [equipmentBySport, setEquipmentBySport] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openSport, setOpenSport] = useState(null);
  const [requestCounts, setRequestCounts] = useState({});
  const [pickupTime, setPickupTime] = useState('');
  const [timeError, setTimeError] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('pending');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const response = await equipmentAPI.getAll();
        setEquipmentBySport(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load equipment');
      } finally {
        setLoading(false);
      }
    };
    fetchEquipment();
  }, []);

  const showToast = (msg, type = 'pending') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAdd = (equipmentId, remaining) => {
    setRequestCounts(prev => {
      const current = prev[equipmentId] ?? 0;
      if (current >= 2 || current >= remaining) return prev;
      return { ...prev, [equipmentId]: current + 1 };
    });
  };

  const handleRemove = (equipmentId) => {
    setRequestCounts(prev => {
      const current = prev[equipmentId] ?? 0;
      if (current <= 0) return prev;
      return { ...prev, [equipmentId]: current - 1 };
    });
  };

  const toggleSport = (sportName) => {
    setOpenSport(prev => (prev === sportName ? null : sportName));
    setRequestCounts({});
    setPickupTime('');
    setTimeError('');
    setToastMessage(null);
  };

  const handleTimeChange = (value) => {
    setPickupTime(value);
    const { message } = isValidPickupTime(value);
    setTimeError(message);
  };

  const handleConfirmRequest = async () => {
    if (!openSport) return;

    const { ok, message } = isValidPickupTime(pickupTime);
    if (!ok) {
      showToast(`⚠️ ${message}`, 'error');
      return;
    }

    const sportEquipment = equipmentBySport[openSport] || [];
    const itemsToRequest = sportEquipment.filter(eq => (requestCounts[eq.id] ?? 0) > 0);

    if (itemsToRequest.length === 0) {
      showToast('⚠️ No equipment selected to request.', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const localDate = new Date(pickupTime);
      const tzOffset = localDate.getTimezoneOffset();
      const compensated = new Date(localDate.getTime() - tzOffset * 60 * 1000);
      const localPickupTime = compensated.toISOString().slice(0, 19);
      const studentId = getStoredStudentId();

      if (!studentId) {
        showToast('⚠️ Unable to determine your student ID. Please login again.', 'error');
        setSubmitting(false);
        return;
      }

      await Promise.all(
        itemsToRequest.map(eq =>
          equipmentAPI.requestEquipment({
            studentId,
            equipment_id: eq.id,
            quantity: requestCounts[eq.id],
            pickupTime: localPickupTime,
          })
        )
      );

      showToast('⏳ Pending — your request has been submitted and is awaiting approval.', 'pending');
      setRequestCounts({});
      setPickupTime('');
      setTimeError('');
    } catch (err) {
      const message = err.response?.data?.message || 'Network error. Please try again.';
      showToast(`❌ ${message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="template-container">
        <div className="template-header">
          <p>⏳ Loading equipment...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="template-container">
        <div className="template-header">
          <p style={{ color: 'var(--color-error)' }}>❌ Failed to load equipment: {error}</p>
        </div>
      </div>
    );

  const sportNames = Object.keys(equipmentBySport).sort();

  return (
    <div className="template-container">

      {/* Toast */}
      {toastMessage && (
        <div style={{
          position:        'fixed',
          bottom:          '30px',
          left:            '50%',
          transform:       'translateX(-50%)',
          backgroundColor: toastType === 'error' ? '#7b2020' : '#14532d',
          color:           'white',
          padding:         '15px 30px',
          borderRadius:    '8px',
          boxShadow:       '0 4px 12px rgba(0,0,0,0.3)',
          zIndex:          9999,
          fontSize:        '16px',
          fontWeight:      '600',
          maxWidth:        '90vw',
          textAlign:       'center',
        }}>
          {toastMessage}
        </div>
      )}

      {/* Page Header */}
      <div className="template-header">
        <h1>Equipment Availability Dashboard⚽</h1>
        <p>Select a sport to view and request equipment</p>
      </div>

      {/* Sports List */}
      <div className="template-content">
        {sportNames.map(sportName => {
          const sportEquipment = equipmentBySport[sportName] || [];
          const isOpen = openSport === sportName;

          return (
            <div key={sportName} className="template-section">
              <h2
                onClick={() => toggleSport(sportName)}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: isOpen ? '20px' : '0',
                }}
              >
                <span>🏅 {sportName}</span>
                <span style={{ fontSize: '14px', color: 'var(--color-text-light)' }}>
                  {sportEquipment.length} item{sportEquipment.length !== 1 ? 's' : ''}{' '}
                  {isOpen ? '▲' : '▼'}
                </span>
              </h2>

              {isOpen && (
                <>
                  {sportEquipment.length === 0 ? (
                    <p style={{ color: 'var(--color-text-light)' }}>No equipment listed for this sport.</p>
                  ) : (
                    <>
                      <div className="table-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Equipment</th>
                              <th>Available</th>
                              <th>Request / Cancel</th>
                              <th>Requested by You</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sportEquipment.map(eq => {
                              const count = requestCounts[eq.id] ?? 0;
                              return (
                                <tr key={eq.id}>
                                  <td>
                                    <strong>{eq.display_name}</strong>
                                    {eq.equipment_name && (
                                      <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                                        {eq.equipment_name}
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    <span
                                      className={
                                        eq.remaining_quantity > 0
                                          ? 'available'
                                          : 'unavailable'
                                      }
                                    >
                                      {eq.remaining_quantity}
                                    </span>
                                  </td>
                                  <td>
                                    <button
                                      className="btn-small danger"
                                      onClick={() => handleRemove(eq.id)}
                                      disabled={count === 0}
                                    >
                                      −
                                    </button>
                                    <button
                                      className="btn-small"
                                      onClick={() =>
                                        handleAdd(eq.id, eq.remaining_quantity)
                                      }
                                      disabled={
                                        eq.remaining_quantity === 0 || count >= 2
                                      }
                                    >
                                      +
                                    </button>
                                  </td>
                                  <td>{count}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pickup Time */}
                      <div style={{
                        margin:       '20px 0',
                        padding:      '20px',
                        background:   '#f8f9fa',
                        borderRadius: '10px',
                        border:       '1px solid #e0e0e0',
                      }}>
                        <label style={{ fontWeight: 700, fontSize: '15px', display: 'block', marginBottom: '8px' }}>
                          📅 Select Pickup Time
                          <span style={{ fontWeight: 400, fontSize: '12px', color: '#888', marginLeft: '8px' }}>
                            (8:00 AM – 8:00 PM · latest tomorrow 8:00 PM)
                          </span>
                        </label>

                        <input
                          type="datetime-local"
                          value={pickupTime}
                          min={getMinDateTime()}
                          max={getMaxDateTime()}
                          onChange={e => handleTimeChange(e.target.value)}
                          style={{
                            padding:      '10px 14px',
                            borderRadius: '8px',
                            border:       `2px solid ${timeError ? '#c0392b' : '#ccc'}`,
                            fontSize:     '15px',
                            cursor:       'pointer',
                            outline:      'none',
                            width:        '100%',
                            maxWidth:     '320px',
                            boxSizing:    'border-box',
                          }}
                        />

                        {timeError && (
                          <p style={{ color: '#c0392b', fontSize: '13px', marginTop: '6px' }}>
                            ⚠️ {timeError}
                          </p>
                        )}

                        {pickupTime && !timeError && (
                          <p
                            style={{
                              color: '#0D8A4E',
                              fontSize: '13px',
                              marginTop: '6px',
                              fontWeight: 600,
                            }}
                          >
                            ✅ Pickup set for:{' '}
                            {new Date(pickupTime).toLocaleString([], {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </p>
                        )}
                      </div>

                      <div className="form-actions">
                        <button
                          className="btn-primary"
                          onClick={handleConfirmRequest}
                          disabled={submitting}
                        >
                          {submitting ? '⏳ Submitting...' : '📋 Confirm Request'}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RequestEquipment;