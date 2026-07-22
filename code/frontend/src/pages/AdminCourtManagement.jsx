// import React, { useEffect, useMemo, useState } from 'react';
// import axios from 'axios';
// import '../styles/template.css';
// import '../styles/admin-court-management.css';

// const getStoredUser = () => {
//   try {
//     return JSON.parse(localStorage.getItem('user') || '{}');
//   } catch {
//     return {};
//   }
// };

// const getStatusClass = (status) => {
//   switch (status) {
//     case 'Available':
//       return 'status-badge available';
//     case 'Occupied':
//       return 'status-badge occupied';
//     case 'Reserved':
//       return 'status-badge reserved';
//     case 'Blocked':
//       return 'status-badge blocked';
//     default:
//       return 'status-badge available';
//   }
// };

// const formatDateTime = (value) => {
//   if (!value) return 'Not set';

//   const date = new Date(value);
//   if (Number.isNaN(date.getTime())) return value;

//   return date.toLocaleString([], {
//     year: 'numeric',
//     month: 'short',
//     day: 'numeric',
//     hour: '2-digit',
//     minute: '2-digit',
//     hour12: true,
//   });
// };

// const toDateTimeLocalValue = (value) => {
//   if (!value) return '';

//   const date = new Date(value);
//   if (Number.isNaN(date.getTime())) return '';

//   const offset = date.getTimezoneOffset();
//   const localDate = new Date(date.getTime() - offset * 60000);
//   return localDate.toISOString().slice(0, 16);
// };

// const AdminCourtManagement = () => {
//   const [courts, setCourts] = useState([]);
//   const [crowdLevel, setCrowdLevel] = useState('Low');
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');
//   const [crowdLoading, setCrowdLoading] = useState(false);
//   const [isEditModalOpen, setIsEditModalOpen] = useState(false);
//   const [selectedCourt, setSelectedCourt] = useState(null);
//   const [editForm, setEditForm] = useState({
//     status: 'Available',
//     reason: '',
//     start_time: '',
//     end_time: '',
//   });
//   const [editErrors, setEditErrors] = useState({});
//   const [isSavingCourt, setIsSavingCourt] = useState(false);
//   const [toastMessage, setToastMessage] = useState('');

//   const user = getStoredUser();
//   const role = user?.role || '';

//   const fetchCourts = async () => {
//     try {
//       const response = await axios.get('/api/courts', {
//         headers: {
//           Authorization: `Bearer ${localStorage.getItem('token')}`,
//         },
//       });
//       setCourts(response.data || []);
//       setError('');
//     } catch (err) {
//       setError(err.response?.data?.message || 'Failed to load courts.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchCrowdLevel = async () => {
//     try {
//       const response = await axios.get('/api/crowd', {
//         headers: {
//           Authorization: `Bearer ${localStorage.getItem('token')}`,
//         },
//       });
//       setCrowdLevel(response.data?.crowd_level || 'Low');
//     } catch (err) {
//       console.error('Failed to fetch crowd level', err);
//     }
//   };

//   useEffect(() => {
//     if (role === 'admin') {
//       fetchCourts();
//       fetchCrowdLevel();
//     }
//   }, [role]);

//   useEffect(() => {
//     if (!toastMessage) return undefined;

//     const timer = window.setTimeout(() => setToastMessage(''), 3500);
//     return () => window.clearTimeout(timer);
//   }, [toastMessage]);

//   // ---- Court edit modal helpers ----
//   const openEditModal = (court) => {
//     setSelectedCourt(court);
//     setEditForm({
//       status: court.status || 'Available',
//       reason: court.reason || '',
//       start_time: toDateTimeLocalValue(court.start_time),
//       end_time: toDateTimeLocalValue(court.end_time),
//     });
//     setEditErrors({});
//     setIsEditModalOpen(true);
//   };

//   const closeEditModal = () => {
//     setIsEditModalOpen(false);
//     setSelectedCourt(null);
//     setEditErrors({});
//     setIsSavingCourt(false);
//   };

//   const handleEditFieldChange = (field) => (event) => {
//     const value = event.target.value;
//     setEditForm((prev) => ({ ...prev, [field]: value }));
//     if (editErrors[field]) {
//       setEditErrors((prev) => ({ ...prev, [field]: '' }));
//     }
//   };

//   const validateEditForm = () => {
//     const nextErrors = {};

//     if (!editForm.status) {
//       nextErrors.status = 'Please select a status.';
//     }

//     if (editForm.status !== 'Available' && !editForm.reason.trim()) {
//       nextErrors.reason = 'Reason is required unless the court is available.';
//     }

//     if (editForm.start_time && editForm.end_time) {
//       const startDate = new Date(editForm.start_time);
//       const endDate = new Date(editForm.end_time);

//       if (endDate <= startDate) {
//         nextErrors.end_time = 'End time must be later than start time.';
//       }
//     }

//     return nextErrors;
//   };

//   const handleSaveCourtStatus = async (event) => {
//     event.preventDefault();

//     const nextErrors = validateEditForm();
//     if (Object.keys(nextErrors).length > 0) {
//       setEditErrors(nextErrors);
//       return;
//     }

//     setIsSavingCourt(true);
//     setEditErrors({});

//     try {
//       const payload = {
//         status: editForm.status,
//         reason: editForm.reason.trim(),
//         start_time: editForm.start_time || null,
//         end_time: editForm.end_time || null,
//       };

//       await axios.put(`/api/courts/${selectedCourt.id}/status`, payload, {
//         headers: {
//           Authorization: `Bearer ${localStorage.getItem('token')}`,
//         },
//       });

//       await fetchCourts();
//       setToastMessage('Court status updated successfully.');
//       closeEditModal();
//     } catch (err) {
//       setEditErrors({
//         submit: err.response?.data?.message || 'Failed to update court status.',
//       });
//     } finally {
//       setIsSavingCourt(false);
//     }
//   };

//   const summary = useMemo(() => {
//     // The API already returns one row per court using the latest status record.
//     // Availability is derived from the total court count minus every court currently
//     // marked as Occupied, Reserved, or Blocked. Courts with no status record are treated as Available.
//     const counts = {
//       Total: courts.length,
//       Available: 0,
//       Occupied: 0,
//       Reserved: 0,
//       Blocked: 0,
//     };

//     courts.forEach((court) => {
//       const status = typeof court.status === 'string' && court.status.trim() ? court.status : 'Available';

//       if (status === 'Occupied') {
//         counts.Occupied += 1;
//       } else if (status === 'Reserved') {
//         counts.Reserved += 1;
//       } else if (status === 'Blocked') {
//         counts.Blocked += 1;
//       } else {
//         counts.Available += 1;
//       }
//     });

//     return counts;
//   }, [courts]);

//   if (role !== 'admin') {
//     return (
//       <div className="template-container">
//         <div className="template-header">
//           <h1>Admin Court Management</h1>
//           <p>You need admin access to view this page.</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="template-container">
//       <div className="template-header">
//         <h1>Admin Court Management</h1>
//         <p>Monitor court availability, venue status, and gym crowd levels.</p>
//       </div>

//       <div className="template-content">
//         <section className="template-section crowd-card">
//           <div className="crowd-card__header">
//             <div>
//               <p className="section-label">Crowd Management</p>
//               <h2>Current Crowd</h2>
//             </div>
//             <span className="crowd-pill">{crowdLevel.toUpperCase()}</span>
//           </div>

//           <div className="crowd-card__controls">
//             <label htmlFor="crowd-level" className="form-group-label">Select crowd level</label>
//             <select
//               id="crowd-level"
//               value={crowdLevel}
//               onChange={(e) => setCrowdLevel(e.target.value)}
//               disabled={crowdLoading}
//             >
//               <option value="Low">Low</option>
//               <option value="Moderate">Moderate</option>
//               <option value="High">High</option>
//               <option value="Full">Full</option>
//             </select>
//             <button className="btn-primary" disabled={crowdLoading}>Save</button>
//           </div>
//         </section>

//         <section className="template-section">
//           <div className="stats-row">
//             <div className="stat-card">
//               <strong>{summary.Total}</strong>
//               <span>Total Courts</span>
//             </div>
//             <div className="stat-card">
//               <strong>{summary.Available}</strong>
//               <span>Available Courts</span>
//             </div>
//             <div className="stat-card">
//               <strong>{summary.Occupied}</strong>
//               <span>Occupied Courts</span>
//             </div>
//             <div className="stat-card">
//               <strong>{summary.Reserved}</strong>
//               <span>Reserved Courts</span>
//             </div>
//             <div className="stat-card">
//               <strong>{summary.Blocked}</strong>
//               <span>Blocked Courts</span>
//             </div>
//           </div>

//           {loading && <p className="loading-text">Loading courts...</p>}
//           {error && <p className="error-message">{error}</p>}

//           {!loading && !error && (
//             <div className="court-grid">
//               {courts.map((court) => (
//                 <article className="court-card" key={court.id}>
//                   <div className="court-card__header">
//                     <div>
//                       <h3>{court.name}</h3>
//                       <p className="court-meta">{court.sport}</p>
//                     </div>
//                     <span className={getStatusClass(court.status)}>{court.status || 'Available'}</span>
//                   </div>

//                   <div className="court-card__body">
//                     <div className="info-row">
//                       <span className="info-label">Type</span>
//                       <span>{court.type}</span>
//                     </div>
//                     <div className="info-row">
//                       <span className="info-label">Reason</span>
//                       <span>{court.reason || 'No reason provided'}</span>
//                     </div>
//                     <div className="info-row">
//                       <span className="info-label">Start</span>
//                       <span>{formatDateTime(court.start_time)}</span>
//                     </div>
//                     <div className="info-row">
//                       <span className="info-label">End</span>
//                       <span>{formatDateTime(court.end_time)}</span>
//                     </div>
//                     <div className="info-row">
//                       <span className="info-label">Last Updated</span>
//                       <span>{formatDateTime(court.updated_at)}</span>
//                     </div>
//                   </div>

//                   <div className="court-card__footer">
//                     <button className="btn-outline" type="button" onClick={() => openEditModal(court)}>
//                       Edit
//                     </button>
//                   </div>
//                 </article>
//               ))}
//             </div>
//           )}
//         </section>
//       </div>

//       {/* Court edit modal */}
//       {isEditModalOpen && selectedCourt && (
//         <div className="court-edit-modal-backdrop" role="presentation" onClick={closeEditModal}>
//           <div className="court-edit-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
//             <div className="court-edit-modal__header">
//               <div>
//                 <p className="section-label">Edit Court Status</p>
//                 <h3>{selectedCourt.name}</h3>
//               </div>
//               <button className="btn-outline" type="button" onClick={closeEditModal}>
//                 Close
//               </button>
//             </div>

//             <form className="court-edit-form" onSubmit={handleSaveCourtStatus}>
//               <div className="form-field">
//                 <label className="form-group-label" htmlFor="court-status">Status</label>
//                 <select id="court-status" value={editForm.status} onChange={handleEditFieldChange('status')}>
//                   <option value="Available">Available</option>
//                   <option value="Occupied">Occupied</option>
//                   <option value="Reserved">Reserved</option>
//                   <option value="Blocked">Blocked</option>
//                 </select>
//                 {editErrors.status && <p className="field-error">{editErrors.status}</p>}
//               </div>

//               <div className="form-field">
//                 <label className="form-group-label" htmlFor="court-reason">Reason</label>
//                 <textarea
//                   id="court-reason"
//                   rows="4"
//                   value={editForm.reason}
//                   onChange={handleEditFieldChange('reason')}
//                   placeholder="Add a reason for the current status"
//                 />
//                 {editErrors.reason && <p className="field-error">{editErrors.reason}</p>}
//               </div>

//               <div className="form-row">
//                 <div className="form-field">
//                   <label className="form-group-label" htmlFor="court-start">Start Date & Time</label>
//                   <input
//                     id="court-start"
//                     type="datetime-local"
//                     value={editForm.start_time}
//                     onChange={handleEditFieldChange('start_time')}
//                   />
//                 </div>

//                 <div className="form-field">
//                   <label className="form-group-label" htmlFor="court-end">End Date & Time</label>
//                   <input
//                     id="court-end"
//                     type="datetime-local"
//                     value={editForm.end_time}
//                     onChange={handleEditFieldChange('end_time')}
//                   />
//                   {editErrors.end_time && <p className="field-error">{editErrors.end_time}</p>}
//                 </div>
//               </div>

//               {editErrors.submit && <p className="field-error field-error--submit">{editErrors.submit}</p>}

//               <div className="court-edit-modal__actions">
//                 <button className="btn-outline" type="button" onClick={closeEditModal}>
//                   Cancel
//                 </button>
//                 <button className="btn-primary" type="submit" disabled={isSavingCourt}>
//                   {isSavingCourt ? 'Saving...' : 'Save'}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {toastMessage && (
//         <div className="court-toast" role="status">
//           {toastMessage}
//         </div>
//       )}
//     </div>
//   );
// };

// export default AdminCourtManagement;

import React, { useEffect, useMemo, useState } from 'react';
import { courtAPI } from '../utils/api'; // CHANGED: use centralized courtAPI instead of raw axios
import '../styles/template.css';
import '../styles/admin-court-management.css';

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

const getStatusClass = (status) => {
  switch (status) {
    case 'Available':
      return 'status-badge available';
    case 'Occupied':
      return 'status-badge occupied';
    case 'Reserved':
      return 'status-badge reserved';
    case 'Blocked':
      return 'status-badge blocked';
    default:
      return 'status-badge available';
  }
};

const formatDateTime = (value) => {
  if (!value) return 'Not set';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const toDateTimeLocalValue = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
};

const AdminCourtManagement = () => {
  const [courts, setCourts] = useState([]);
  const [crowdLevel, setCrowdLevel] = useState('Low');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [crowdLoading, setCrowdLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [editForm, setEditForm] = useState({
    status: 'Available',
    reason: '',
    start_time: '',
    end_time: '',
  });
  const [editErrors, setEditErrors] = useState({});
  const [isSavingCourt, setIsSavingCourt] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const user = getStoredUser();
  const role = user?.role || '';

  const fetchCourts = async () => {
    try {
      const response = await courtAPI.getAll(); // CHANGED: use courtAPI.getAll()

      // Defensive check: only accept real arrays. If the backend/proxy ever
      // returns something unexpected (HTML fallback page, error object, etc.)
      // we fall back to an empty array instead of crashing the whole page.
      if (Array.isArray(response.data)) {
        setCourts(response.data);
        setError('');
      } else {
        console.error('Unexpected /courts response shape:', response.data);
        setCourts([]);
        setError('Unexpected response from server while loading courts.');
      }
    } catch (err) {
      console.error('Failed to fetch courts:', err);
      setCourts([]); // CHANGED: always reset to a valid array on failure
      setError(err.response?.data?.message || 'Failed to load courts.');
    } finally {
      setLoading(false);
    }
  };

  // ADDED: this was missing — the Save button had no handler, so changing
  // the crowd level dropdown never actually persisted anything.
  const handleSaveCrowdLevel = async () => {
    setCrowdLoading(true);
    try {
      await courtAPI.updateCrowdLevel(crowdLevel);
      setToastMessage('Crowd level updated successfully.');
    } catch (err) {
      console.error('Failed to update crowd level', err);
      setToastMessage('Failed to update crowd level.');
    } finally {
      setCrowdLoading(false);
    }
  };

  const fetchCrowdLevel = async () => {
    try {
      const response = await courtAPI.getCrowdLevel(); // CHANGED: use courtAPI.getCrowdLevel() (fixes wrong '/api/crowd' path bug)
      setCrowdLevel(response.data?.crowd_level || 'Low');
    } catch (err) {
      console.error('Failed to fetch crowd level', err);
    }
  };

  useEffect(() => {
    if (role === 'admin') {
      fetchCourts();
      fetchCrowdLevel();
    }
  }, [role]);

  useEffect(() => {
    if (!toastMessage) return undefined;

    const timer = window.setTimeout(() => setToastMessage(''), 3500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  // ---- Court edit modal helpers ----
  const openEditModal = (court) => {
    setSelectedCourt(court);
    setEditForm({
      status: court.status || 'Available',
      reason: court.reason || '',
      start_time: toDateTimeLocalValue(court.start_time),
      end_time: toDateTimeLocalValue(court.end_time),
    });
    setEditErrors({});
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedCourt(null);
    setEditErrors({});
    setIsSavingCourt(false);
  };

  const handleEditFieldChange = (field) => (event) => {
    const value = event.target.value;
    setEditForm((prev) => ({ ...prev, [field]: value }));
    if (editErrors[field]) {
      setEditErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateEditForm = () => {
    const nextErrors = {};

    if (!editForm.status) {
      nextErrors.status = 'Please select a status.';
    }

    if (editForm.status !== 'Available' && !editForm.reason.trim()) {
      nextErrors.reason = 'Reason is required unless the court is available.';
    }

    if (editForm.start_time && editForm.end_time) {
      const startDate = new Date(editForm.start_time);
      const endDate = new Date(editForm.end_time);

      if (endDate <= startDate) {
        nextErrors.end_time = 'End time must be later than start time.';
      }
    }

    return nextErrors;
  };

  const handleSaveCourtStatus = async (event) => {
    event.preventDefault();

    const nextErrors = validateEditForm();
    if (Object.keys(nextErrors).length > 0) {
      setEditErrors(nextErrors);
      return;
    }

    setIsSavingCourt(true);
    setEditErrors({});

    try {
      const payload = {
        status: editForm.status,
        reason: editForm.reason.trim(),
        start_time: editForm.start_time || null,
        end_time: editForm.end_time || null,
      };

      await courtAPI.updateStatus(selectedCourt.id, payload); // CHANGED: use courtAPI.updateStatus()

      await fetchCourts();
      setToastMessage('Court status updated successfully.');
      closeEditModal();
    } catch (err) {
      setEditErrors({
        submit: err.response?.data?.message || 'Failed to update court status.',
      });
    } finally {
      setIsSavingCourt(false);
    }
  };

  const summary = useMemo(() => {
    // The API already returns one row per court using the latest status record.
    // Availability is derived from the total court count minus every court currently
    // marked as Occupied, Reserved, or Blocked. Courts with no status record are treated as Available.
    const counts = {
      Total: 0,
      Available: 0,
      Occupied: 0,
      Reserved: 0,
      Blocked: 0,
    };

    // CHANGED: guard against courts ever being a non-array (defense in depth,
    // even though fetchCourts already guarantees this now).
    if (!Array.isArray(courts)) {
      return counts;
    }

    counts.Total = courts.length;

    courts.forEach((court) => {
      const status = typeof court.status === 'string' && court.status.trim() ? court.status : 'Available';

      if (status === 'Occupied') {
        counts.Occupied += 1;
      } else if (status === 'Reserved') {
        counts.Reserved += 1;
      } else if (status === 'Blocked') {
        counts.Blocked += 1;
      } else {
        counts.Available += 1;
      }
    });

    return counts;
  }, [courts]);

  if (role !== 'admin') {
    return (
      <div className="template-container">
        <div className="template-header">
          <h1>Admin Court Management</h1>
          <p>You need admin access to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="template-container">
      <div className="template-header">
        <h1>Admin Court Management</h1>
        <p>Monitor court availability, venue status, and gym crowd levels.</p>
      </div>

      <div className="template-content">
        <section className="template-section crowd-card">
          <div className="crowd-card__header">
            <div>
              <p className="section-label">Crowd Management</p>
              <h2>Current Crowd</h2>
            </div>
            <span className="crowd-pill">{crowdLevel.toUpperCase()}</span>
          </div>

          <div className="crowd-card__controls">
            <label htmlFor="crowd-level" className="form-group-label">Select crowd level</label>
            <select
              id="crowd-level"
              value={crowdLevel}
              onChange={(e) => setCrowdLevel(e.target.value)}
              disabled={crowdLoading}
            >
              <option value="Low">Low</option>
              <option value="Moderate">Moderate</option>
              <option value="High">High</option>
              <option value="Full">Full</option>
            </select>
            <button className="btn-primary" onClick={handleSaveCrowdLevel} disabled={crowdLoading}>
              {crowdLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </section>

        <section className="template-section">
          <div className="stats-row">
            <div className="stat-card">
              <strong>{summary.Total}</strong>
              <span>Total Courts</span>
            </div>
            <div className="stat-card">
              <strong>{summary.Available}</strong>
              <span>Available Courts</span>
            </div>
            <div className="stat-card">
              <strong>{summary.Occupied}</strong>
              <span>Occupied Courts</span>
            </div>
            <div className="stat-card">
              <strong>{summary.Reserved}</strong>
              <span>Reserved Courts</span>
            </div>
            <div className="stat-card">
              <strong>{summary.Blocked}</strong>
              <span>Blocked Courts</span>
            </div>
          </div>

          {loading && <p className="loading-text">Loading courts...</p>}
          {error && <p className="error-message">{error}</p>}

          {!loading && !error && (
            <div className="court-grid">
              {courts.map((court) => (
                <article className="court-card" key={court.id}>
                  <div className="court-card__header">
                    <div>
                      <h3>{court.name}</h3>
                      <p className="court-meta">{court.sport}</p>
                    </div>
                    <span className={getStatusClass(court.status)}>{court.status || 'Available'}</span>
                  </div>

                  <div className="court-card__body">
                    <div className="info-row">
                      <span className="info-label">Type</span>
                      <span>{court.type}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Reason</span>
                      <span>{court.reason || 'No reason provided'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Start</span>
                      <span>{formatDateTime(court.start_time)}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">End</span>
                      <span>{formatDateTime(court.end_time)}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Last Updated</span>
                      <span>{formatDateTime(court.updated_at)}</span>
                    </div>
                  </div>

                  <div className="court-card__footer">
                    <button className="btn-outline" type="button" onClick={() => openEditModal(court)}>
                      Edit
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Court edit modal */}
      {isEditModalOpen && selectedCourt && (
        <div className="court-edit-modal-backdrop" role="presentation" onClick={closeEditModal}>
          <div className="court-edit-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="court-edit-modal__header">
              <div>
                <p className="section-label">Edit Court Status</p>
                <h3>{selectedCourt.name}</h3>
              </div>
              <button className="btn-outline" type="button" onClick={closeEditModal}>
                Close
              </button>
            </div>

            <form className="court-edit-form" onSubmit={handleSaveCourtStatus}>
              <div className="form-field">
                <label className="form-group-label" htmlFor="court-status">Status</label>
                <select id="court-status" value={editForm.status} onChange={handleEditFieldChange('status')}>
                  <option value="Available">Available</option>
                  <option value="Occupied">Occupied</option>
                  <option value="Reserved">Reserved</option>
                  <option value="Blocked">Blocked</option>
                </select>
                {editErrors.status && <p className="field-error">{editErrors.status}</p>}
              </div>

              <div className="form-field">
                <label className="form-group-label" htmlFor="court-reason">Reason</label>
                <textarea
                  id="court-reason"
                  rows="4"
                  value={editForm.reason}
                  onChange={handleEditFieldChange('reason')}
                  placeholder="Add a reason for the current status"
                />
                {editErrors.reason && <p className="field-error">{editErrors.reason}</p>}
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label className="form-group-label" htmlFor="court-start">Start Date & Time</label>
                  <input
                    id="court-start"
                    type="datetime-local"
                    value={editForm.start_time}
                    onChange={handleEditFieldChange('start_time')}
                  />
                </div>

                <div className="form-field">
                  <label className="form-group-label" htmlFor="court-end">End Date & Time</label>
                  <input
                    id="court-end"
                    type="datetime-local"
                    value={editForm.end_time}
                    onChange={handleEditFieldChange('end_time')}
                  />
                  {editErrors.end_time && <p className="field-error">{editErrors.end_time}</p>}
                </div>
              </div>

              {editErrors.submit && <p className="field-error field-error--submit">{editErrors.submit}</p>}

              <div className="court-edit-modal__actions">
                <button className="btn-outline" type="button" onClick={closeEditModal}>
                  Cancel
                </button>
                <button className="btn-primary" type="submit" disabled={isSavingCourt}>
                  {isSavingCourt ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="court-toast" role="status">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default AdminCourtManagement;