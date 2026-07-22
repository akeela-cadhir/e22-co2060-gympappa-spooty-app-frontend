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
//   const normalizedStatus = (status || '').toString().trim().toLowerCase();

//   switch (normalizedStatus) {
//     case 'available':
//       return 'status-badge available';
//     case 'occupied':
//       return 'status-badge occupied';
//     case 'reserved':
//       return 'status-badge reserved';
//     case 'blocked':
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

// const getCourtTypeLabel = (type, location = '') => {
//   const normalizedType = (type || '').toLowerCase();
//   const normalizedLocation = (location || '').toLowerCase();
//   const sourceText = `${normalizedType} ${normalizedLocation}`;

//   if (sourceText.includes('outdoor')) return 'Outdoor';
//   if (sourceText.includes('indoor') || sourceText.includes('gymnasium')) return 'Indoor';

//   return 'Indoor';
// };

// const normalizeStatus = (status) => {
//   return typeof status === 'string' && status.trim() ? status : 'Available';
// };

// const normalizeText = (value) => {
//   return (value || '').toString().trim().toLowerCase();
// };

// const hasDisplayValue = (value) => {
//   return typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined;
// };

// const parseTimeToMinutes = (timeValue) => {
//   const [hours, minutes] = (timeValue || '').split(':').map((part) => Number(part));

//   if (Number.isNaN(hours) || Number.isNaN(minutes)) {
//     return null;
//   }

//   return hours * 60 + minutes;
// };

// const getCourtOperatingHours = (court) => {
//   const courtType = getCourtTypeLabel(court?.type, court?.location);

//   if (courtType === 'Indoor') {
//     return {
//       min: '09:00',
//       max: '20:00',
//       isRestricted: true,
//     };
//   }

//   return {
//     min: '00:00',
//     max: '23:59',
//     isRestricted: false,
//   };
// };

// const isCourtAvailableAtTime = (court, selectedDateTime) => {
//   // A court is only unavailable when the selected time falls inside the latest status window.
//   // If there is no status record, or the selected time is outside that window, the court is available.
//   const status = normalizeStatus(court.status);
//   const selectedMinutes = selectedDateTime ? selectedDateTime.getHours() * 60 + selectedDateTime.getMinutes() : null;
//   const operatingHours = getCourtOperatingHours(court);

//   if (selectedMinutes === null) {
//     return false;
//   }

//   const openingMinutes = parseTimeToMinutes(operatingHours.min);
//   const closingMinutes = parseTimeToMinutes(operatingHours.max);

//   if (openingMinutes !== null && closingMinutes !== null) {
//     const isWithinOperatingHours = selectedMinutes >= openingMinutes && selectedMinutes <= closingMinutes;

//     if (!isWithinOperatingHours) {
//       return false;
//     }
//   }

//   if (status === 'Available' || !court.start_time || !court.end_time) {
//     return true;
//   }

//   if (!selectedDateTime || Number.isNaN(selectedDateTime.getTime())) {
//     return false;
//   }

//   const startTime = new Date(court.start_time);
//   const endTime = new Date(court.end_time);

//   if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
//     return true;
//   }

//   return !(selectedDateTime >= startTime && selectedDateTime <= endTime);
// };

// const StudentCourtAvailability = () => {
//   const [courts, setCourts] = useState([]);
//   const [crowdLevel, setCrowdLevel] = useState('Low');
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');
//   const [searchTerm, setSearchTerm] = useState('');
//   const [typeFilter, setTypeFilter] = useState('All');
//   const [sportFilter, setSportFilter] = useState('All');
//   const [selectedSport, setSelectedSport] = useState('All');
//   const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
//   const [selectedTime, setSelectedTime] = useState(new Date().toTimeString().slice(0, 5));

//   const user = getStoredUser();
//   const role = user?.role || '';

//   // ---- Data loading ----
//   const fetchCourts = async (showLoading = true) => {
//     try {
//       if (showLoading) {
//         setLoading(true);
//       }

//       const response = await axios.get('/api/courts', {
//         headers: {
//           Authorization: `Bearer ${localStorage.getItem('token')}`,
//         },
//       });

//       const courtData = response.data || [];
//       console.log('Courts received:', courtData);
//       console.log('Latest status per court:', courtData.map((court) => ({
//         id: court.id,
//         name: court.name,
//         status: court.status,
//         start_time: court.start_time,
//         end_time: court.end_time,
//         updated_at: court.updated_at,
//       })));
//       setCourts(courtData);
//       setError('');
//     } catch (err) {
//       setError(err.response?.data?.message || 'Failed to load court availability.');
//     } finally {
//       if (showLoading) {
//         setLoading(false);
//       }
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
//     if (role) {
//       fetchCourts(true);
//       fetchCrowdLevel();
//     }
//   }, [role]);

//   // ---- Auto-refresh every 30 seconds ----
//   useEffect(() => {
//     if (!role) return undefined;

//     const intervalId = window.setInterval(() => {
//       fetchCourts(false);
//       fetchCrowdLevel();
//     }, 30000);

//     return () => window.clearInterval(intervalId);
//   }, [role]);

//   // ---- Summary cards from the fetched court list ----
//   const summary = useMemo(() => {
//     // Total courts come from the courts table rows returned by the API.
//     // Availability is derived from the latest status record for each court, while
//     // courts with no status record are treated as Available.
//     const counts = { Total: courts.length, Available: 0, Occupied: 0, Reserved: 0, Blocked: 0 };

//     courts.forEach((court) => {
//       const status = normalizeStatus(court.status);

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

//     console.log('Calculated statistics:', counts);
//     return counts;
//   }, [courts]);

//   // ---- Filtered court list for the main card view ----
//   const filteredCourts = useMemo(() => {
//     // Search and filters are applied together so the main card grid and the availability
//     // lookup both reflect the same subset of courts.
//     const query = normalizeText(searchTerm);
//     const normalizedSportFilter = sportFilter === 'All' ? '' : normalizeText(sportFilter);

//     const result = courts.filter((court) => {
//       const courtType = getCourtTypeLabel(court.type, court.location).toLowerCase();
//       const matchesType = typeFilter === 'All' || courtType === typeFilter.toLowerCase();
//       const matchesSport = !normalizedSportFilter || normalizeText(court.sport) === normalizedSportFilter;
//       const matchesSearch = !query || normalizeText(court.name).includes(query) || normalizeText(court.sport).includes(query);

//       return matchesType && matchesSport && matchesSearch;
//     });

//     console.log('Filtered courts:', result);
//     return result;
//   }, [courts, searchTerm, typeFilter, sportFilter]);

//   // ---- Availability lookup section ----
//   const availabilityData = useMemo(() => {
//     // The availability checker uses the same filtered court set but evaluates each court
//     // against the selected date and time using the latest status window.
//     const requestedDateTime = new Date(`${selectedDate}T${selectedTime}`);

//     if (Number.isNaN(requestedDateTime.getTime())) {
//       return {
//         availableCourts: [],
//         nextAvailableTime: null,
//       };
//     }

//     const normalizedSportSelection = selectedSport === 'All' ? '' : normalizeText(selectedSport);
//     const candidateCourts = filteredCourts.filter((court) => {
//       return !normalizedSportSelection || normalizeText(court.sport) === normalizedSportSelection;
//     });

//     const availableCourts = candidateCourts.filter((court) => isCourtAvailableAtTime(court, requestedDateTime));
//     const unavailableCourts = candidateCourts.filter((court) => !isCourtAvailableAtTime(court, requestedDateTime));
//     const nextAvailableTime = unavailableCourts
//       .map((court) => (court.end_time ? new Date(court.end_time) : null))
//       .filter((value) => value && value > requestedDateTime)
//       .sort((a, b) => a - b)[0] || null;

//     console.log('Availability Result:', {
//       requestedDateTime,
//       selectedSport,
//       availableCourts,
//       nextAvailableTime,
//     });

//     return {
//       availableCourts,
//       nextAvailableTime,
//     };
//   }, [filteredCourts, selectedDate, selectedTime, selectedSport]);

//   const selectedSportHours = useMemo(() => {
//     const relevantCourts = selectedSport === 'All'
//       ? courts
//       : courts.filter((court) => normalizeText(court.sport) === normalizeText(selectedSport));

//     const hasIndoorCourts = relevantCourts.some((court) => getCourtTypeLabel(court.type, court.location) === 'Indoor');
//     const hasOutdoorCourts = relevantCourts.some((court) => getCourtTypeLabel(court.type, court.location) === 'Outdoor');

//     if (hasIndoorCourts && !hasOutdoorCourts) {
//       return { min: '09:00', max: '20:00' };
//     }

//     return null;
//   }, [courts, selectedSport]);

//   const sportOptions = useMemo(() => {
//     return Array.from(new Set(courts.map((court) => court.sport).filter(Boolean))).sort();
//   }, [courts]);

//   const typeOptions = ['All', 'Indoor', 'Outdoor'];

//   if (role !== 'student' && role !== 'games-captain' && role !== 'psu' && role !== 'faculty-coordinator' && role !== 'coach' && role !== 'private-coach' && role !== 'academic-staff') {
//     return (
//       <div className="template-container">
//         <div className="template-header">
//           <h1>Court Availability</h1>
//           <p>You need student access to view this page.</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="template-container">
//       <div className="template-header">
//         <h1>Court Availability</h1>
//         <p>Browse live court status, filters, and availability for your preferred sport.</p>
//       </div>

//       <div className="template-content">
//         {/* Crowd level summary */}
//         <section className="template-section crowd-card">
//           <div className="crowd-card__header">
//             <div>
//               <p className="section-label">Gym Overview</p>
//               <h2>Current Crowd</h2>
//             </div>
//             <span className="crowd-pill">{crowdLevel.toUpperCase()}</span>
//           </div>
//         </section>

//         {/* Summary cards */}
//         <section className="template-section">
//           <div className="stats-row">
//             <div className="stat-card">
//               <strong>{summary.Total}</strong>
//               <span>Total Courts</span>
//             </div>
//             <div className="stat-card">
//               <strong>{summary.Available}</strong>
//               <span>Available</span>
//             </div>
//             <div className="stat-card">
//               <strong>{summary.Occupied}</strong>
//               <span>Occupied</span>
//             </div>
//             <div className="stat-card">
//               <strong>{summary.Reserved}</strong>
//               <span>Reserved</span>
//             </div>
//             <div className="stat-card">
//               <strong>{summary.Blocked}</strong>
//               <span>Blocked</span>
//             </div>
//           </div>
//         </section>

//         {/* Search and filter controls */}
//         <section className="template-section">
//           <div className="court-filter-bar">
//             <div className="court-filter-group">
//               <label className="form-group-label" htmlFor="court-search">Search</label>
//               <input
//                 id="court-search"
//                 type="text"
//                 value={searchTerm}
//                 onChange={(event) => setSearchTerm(event.target.value)}
//                 placeholder="Search by court name"
//               />
//             </div>

//             <div className="court-filter-group">
//               <label className="form-group-label" htmlFor="court-type">Type</label>
//               <select id="court-type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
//                 {typeOptions.map((option) => (
//                   <option key={option} value={option}>{option}</option>
//                 ))}
//               </select>
//             </div>

//             <div className="court-filter-group">
//               <label className="form-group-label" htmlFor="court-sport">Sport</label>
//               <select id="court-sport" value={sportFilter} onChange={(event) => setSportFilter(event.target.value)}>
//                 <option value="All">All</option>
//                 {sportOptions.map((sport) => (
//                   <option key={sport} value={sport}>{sport}</option>
//                 ))}
//               </select>
//             </div>
//           </div>
//         </section>

//         {/* Availability check form */}
//         <section className="template-section">
//           <div className="availability-panel">
//             <div className="availability-panel__header">
//               <div>
//                 <p className="section-label">Check Availability</p>
//                 <h2>Find a court for your preferred slot</h2>
//               </div>
//             </div>

//             <div className="availability-panel__controls">
//               <div className="court-filter-group">
//                 <label className="form-group-label" htmlFor="check-sport">Sport</label>
//                 <select id="check-sport" value={selectedSport} onChange={(event) => setSelectedSport(event.target.value)}>
//                   <option value="All">All</option>
//                   {sportOptions.map((sport) => (
//                     <option key={sport} value={sport}>{sport}</option>
//                   ))}
//                 </select>
//               </div>

//               <div className="court-filter-group">
//                 <label className="form-group-label" htmlFor="check-date">Date</label>
//                 <input id="check-date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
//               </div>

//               <div className="court-filter-group">
//                 <label className="form-group-label" htmlFor="check-time">Time</label>
//                 <input
//                   id="check-time"
//                   type="time"
//                   value={selectedTime}
//                   min={selectedSportHours?.min}
//                   max={selectedSportHours?.max}
//                   onChange={(event) => setSelectedTime(event.target.value)}
//                 />
//               </div>
//             </div>

//             <div className="availability-result-card">
//               <p className="availability-result-card__title">Matching courts</p>
//               {availabilityData.availableCourts.length > 0 ? (
//                 <>
//                   <p className="availability-result-card__summary">
//                     {availabilityData.availableCourts.length} court{availabilityData.availableCourts.length === 1 ? '' : 's'} available for this slot.
//                   </p>
//                   <ul className="availability-list">
//                     {availabilityData.availableCourts.map((court) => (
//                       <li key={court.id}>{court.name} • {court.sport}</li>
//                     ))}
//                   </ul>
//                 </>
//               ) : (
//                 <p className="availability-result-card__summary">
//                   No courts are available for this slot. Next available time: {availabilityData.nextAvailableTime ? formatDateTime(availabilityData.nextAvailableTime) : 'Not available yet.'}
//                 </p>
//               )}
//             </div>
//           </div>
//         </section>

//         {/* Court cards */}
//         <section className="template-section">
//           {loading && <p className="loading-text">Loading court availability...</p>}
//           {error && <p className="error-message">{error}</p>}

//           {!loading && !error && (
//             <div className="court-grid">
//               {filteredCourts.map((court) => (
//                 <article className="court-card" key={court.id}>
//                   <div className="court-card__header">
//                     <div>
//                       <h3>{court.name}</h3>
//                       <p className="court-meta">{court.sport}</p>
//                     </div>
//                     <span className={getStatusClass(court.status)}>{court.status || 'Available'}</span>
//                   </div>

//                   <div className="court-card__body">
//                     {hasDisplayValue(court.reason) && (
//                       <div className="info-row">
//                         <span className="info-label">Reason</span>
//                         <span>{court.reason}</span>
//                       </div>
//                     )}
//                     {hasDisplayValue(court.start_time) && (
//                       <div className="info-row">
//                         <span className="info-label">Available from</span>
//                         <span>{formatDateTime(court.start_time)}</span>
//                       </div>
//                     )}
//                     {hasDisplayValue(court.end_time) && (
//                       <div className="info-row">
//                         <span className="info-label">End time</span>
//                         <span>{formatDateTime(court.end_time)}</span>
//                       </div>
//                     )}
//                     <div className="info-row">
//                       <span className="info-label">Last updated</span>
//                       <span>{formatDateTime(court.updated_at)}</span>
//                     </div>
//                   </div>
//                 </article>
//               ))}
//             </div>
//           )}
//         </section>
//       </div>
//     </div>
//   );
// };

// export default StudentCourtAvailability;


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
  const normalizedStatus = (status || '').toString().trim().toLowerCase();

  switch (normalizedStatus) {
    case 'available':
      return 'status-badge available';
    case 'occupied':
      return 'status-badge occupied';
    case 'reserved':
      return 'status-badge reserved';
    case 'blocked':
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

const getCourtTypeLabel = (type, location = '') => {
  const normalizedType = (type || '').toLowerCase();
  const normalizedLocation = (location || '').toLowerCase();
  const sourceText = `${normalizedType} ${normalizedLocation}`;

  if (sourceText.includes('outdoor')) return 'Outdoor';
  if (sourceText.includes('indoor') || sourceText.includes('gymnasium')) return 'Indoor';

  return 'Indoor';
};

const normalizeStatus = (status) => {
  return typeof status === 'string' && status.trim() ? status : 'Available';
};

const normalizeText = (value) => {
  return (value || '').toString().trim().toLowerCase();
};

const hasDisplayValue = (value) => {
  return typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined;
};

const parseTimeToMinutes = (timeValue) => {
  const [hours, minutes] = (timeValue || '').split(':').map((part) => Number(part));

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
};

const getCourtOperatingHours = (court) => {
  const courtType = getCourtTypeLabel(court?.type, court?.location);

  if (courtType === 'Indoor') {
    return {
      min: '09:00',
      max: '20:00',
      isRestricted: true,
    };
  }

  return {
    min: '00:00',
    max: '23:59',
    isRestricted: false,
  };
};

const isCourtAvailableAtTime = (court, selectedDateTime) => {
  // A court is only unavailable when the selected time falls inside the latest status window.
  // If there is no status record, or the selected time is outside that window, the court is available.
  const status = normalizeStatus(court.status);
  const selectedMinutes = selectedDateTime ? selectedDateTime.getHours() * 60 + selectedDateTime.getMinutes() : null;
  const operatingHours = getCourtOperatingHours(court);

  if (selectedMinutes === null) {
    return false;
  }

  const openingMinutes = parseTimeToMinutes(operatingHours.min);
  const closingMinutes = parseTimeToMinutes(operatingHours.max);

  if (openingMinutes !== null && closingMinutes !== null) {
    const isWithinOperatingHours = selectedMinutes >= openingMinutes && selectedMinutes <= closingMinutes;

    if (!isWithinOperatingHours) {
      return false;
    }
  }

  if (status === 'Available' || !court.start_time || !court.end_time) {
    return true;
  }

  if (!selectedDateTime || Number.isNaN(selectedDateTime.getTime())) {
    return false;
  }

  const startTime = new Date(court.start_time);
  const endTime = new Date(court.end_time);

  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    return true;
  }

  return !(selectedDateTime >= startTime && selectedDateTime <= endTime);
};

const StudentCourtAvailability = () => {
  const [courts, setCourts] = useState([]);
  const [crowdLevel, setCrowdLevel] = useState('Low');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [sportFilter, setSportFilter] = useState('All');
  const [selectedSport, setSelectedSport] = useState('All');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedTime, setSelectedTime] = useState(new Date().toTimeString().slice(0, 5));

  const user = getStoredUser();
  const role = user?.role || '';

  // ---- Data loading ----
  const fetchCourts = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const response = await courtAPI.getAll(); // CHANGED: use courtAPI.getAll()

      // Defensive check: only accept real arrays. If the backend/proxy ever
      // returns something unexpected (SPA fallback HTML, error object, etc.)
      // we fall back to an empty array and surface an error instead of crashing.
      if (!Array.isArray(response.data)) {
        console.error('Unexpected /courts response shape:', response.data);
        setCourts([]);
        setError('Unexpected response from server while loading court availability.');
        return;
      }

      const courtData = response.data;
      setCourts(courtData);
      setError('');
    } catch (err) {
      console.error('Failed to fetch courts:', err);
      setCourts([]); // CHANGED: always reset to a valid array on failure
      setError(err.response?.data?.message || 'Failed to load court availability.');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
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
    if (role) {
      fetchCourts(true);
      fetchCrowdLevel();
    }
  }, [role]);

  // ---- Auto-refresh every 30 seconds ----
  useEffect(() => {
    if (!role) return undefined;

    const intervalId = window.setInterval(() => {
      fetchCourts(false);
      fetchCrowdLevel();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [role]);

  // ---- Summary cards from the fetched court list ----
  const summary = useMemo(() => {
    // Total courts come from the courts table rows returned by the API.
    // Availability is derived from the latest status record for each court, while
    // courts with no status record are treated as Available.
    const counts = { Total: 0, Available: 0, Occupied: 0, Reserved: 0, Blocked: 0 };

    if (!Array.isArray(courts)) {
      return counts;
    }

    counts.Total = courts.length;

    courts.forEach((court) => {
      const status = normalizeStatus(court.status);

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

  // ---- Filtered court list for the main card view ----
  const filteredCourts = useMemo(() => {
    // Search and filters are applied together so the main card grid and the availability
    // lookup both reflect the same subset of courts.
    if (!Array.isArray(courts)) {
      return [];
    }

    const query = normalizeText(searchTerm);
    const normalizedSportFilter = sportFilter === 'All' ? '' : normalizeText(sportFilter);

    return courts.filter((court) => {
      const courtType = getCourtTypeLabel(court.type, court.location).toLowerCase();
      const matchesType = typeFilter === 'All' || courtType === typeFilter.toLowerCase();
      const matchesSport = !normalizedSportFilter || normalizeText(court.sport) === normalizedSportFilter;
      const matchesSearch = !query || normalizeText(court.name).includes(query) || normalizeText(court.sport).includes(query);

      return matchesType && matchesSport && matchesSearch;
    });
  }, [courts, searchTerm, typeFilter, sportFilter]);

  // ---- Availability lookup section ----
  const availabilityData = useMemo(() => {
    // The availability checker uses the same filtered court set but evaluates each court
    // against the selected date and time using the latest status window.
    const requestedDateTime = new Date(`${selectedDate}T${selectedTime}`);

    if (Number.isNaN(requestedDateTime.getTime())) {
      return {
        availableCourts: [],
        nextAvailableTime: null,
      };
    }

    const normalizedSportSelection = selectedSport === 'All' ? '' : normalizeText(selectedSport);
    const candidateCourts = filteredCourts.filter((court) => {
      return !normalizedSportSelection || normalizeText(court.sport) === normalizedSportSelection;
    });

    const availableCourts = candidateCourts.filter((court) => isCourtAvailableAtTime(court, requestedDateTime));
    const unavailableCourts = candidateCourts.filter((court) => !isCourtAvailableAtTime(court, requestedDateTime));
    const nextAvailableTime = unavailableCourts
      .map((court) => (court.end_time ? new Date(court.end_time) : null))
      .filter((value) => value && value > requestedDateTime)
      .sort((a, b) => a - b)[0] || null;

    return {
      availableCourts,
      nextAvailableTime,
    };
  }, [filteredCourts, selectedDate, selectedTime, selectedSport]);

  const selectedSportHours = useMemo(() => {
    const relevantCourts = selectedSport === 'All'
      ? courts
      : courts.filter((court) => normalizeText(court.sport) === normalizeText(selectedSport));

    const hasIndoorCourts = relevantCourts.some((court) => getCourtTypeLabel(court.type, court.location) === 'Indoor');
    const hasOutdoorCourts = relevantCourts.some((court) => getCourtTypeLabel(court.type, court.location) === 'Outdoor');

    if (hasIndoorCourts && !hasOutdoorCourts) {
      return { min: '09:00', max: '20:00' };
    }

    return null;
  }, [courts, selectedSport]);

  const sportOptions = useMemo(() => {
    if (!Array.isArray(courts)) return [];
    return Array.from(new Set(courts.map((court) => court.sport).filter(Boolean))).sort();
  }, [courts]);

  const typeOptions = ['All', 'Indoor', 'Outdoor'];

  if (role !== 'student' && role !== 'games-captain' && role !== 'psu' && role !== 'faculty-coordinator' && role !== 'coach' && role !== 'private-coach' && role !== 'academic-staff') {
    return (
      <div className="template-container">
        <div className="template-header">
          <h1>Court Availability</h1>
          <p>You need student access to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="template-container">
      <div className="template-header">
        <h1>Court Availability</h1>
        <p>Browse live court status, filters, and availability for your preferred sport.</p>
      </div>

      <div className="template-content">
        {/* Crowd level summary */}
        <section className="template-section crowd-card">
          <div className="crowd-card__header">
            <div>
              <p className="section-label">Gym Overview</p>
              <h2>Current Crowd</h2>
            </div>
            <span className="crowd-pill">{crowdLevel.toUpperCase()}</span>
          </div>
        </section>

        {/* Summary cards */}
        <section className="template-section">
          <div className="stats-row">
            <div className="stat-card">
              <strong>{summary.Total}</strong>
              <span>Total Courts</span>
            </div>
            <div className="stat-card">
              <strong>{summary.Available}</strong>
              <span>Available</span>
            </div>
            <div className="stat-card">
              <strong>{summary.Occupied}</strong>
              <span>Occupied</span>
            </div>
            <div className="stat-card">
              <strong>{summary.Reserved}</strong>
              <span>Reserved</span>
            </div>
            <div className="stat-card">
              <strong>{summary.Blocked}</strong>
              <span>Blocked</span>
            </div>
          </div>
        </section>

        {/* Search and filter controls */}
        <section className="template-section">
          <div className="court-filter-bar">
            <div className="court-filter-group">
              <label className="form-group-label" htmlFor="court-search">Search</label>
              <input
                id="court-search"
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by court name"
              />
            </div>

            <div className="court-filter-group">
              <label className="form-group-label" htmlFor="court-type">Type</label>
              <select id="court-type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                {typeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="court-filter-group">
              <label className="form-group-label" htmlFor="court-sport">Sport</label>
              <select id="court-sport" value={sportFilter} onChange={(event) => setSportFilter(event.target.value)}>
                <option value="All">All</option>
                {sportOptions.map((sport) => (
                  <option key={sport} value={sport}>{sport}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Availability check form */}
        <section className="template-section">
          <div className="availability-panel">
            <div className="availability-panel__header">
              <div>
                <p className="section-label">Check Availability</p>
                <h2>Find a court for your preferred slot</h2>
              </div>
            </div>

            <div className="availability-panel__controls">
              <div className="court-filter-group">
                <label className="form-group-label" htmlFor="check-sport">Sport</label>
                <select id="check-sport" value={selectedSport} onChange={(event) => setSelectedSport(event.target.value)}>
                  <option value="All">All</option>
                  {sportOptions.map((sport) => (
                    <option key={sport} value={sport}>{sport}</option>
                  ))}
                </select>
              </div>

              <div className="court-filter-group">
                <label className="form-group-label" htmlFor="check-date">Date</label>
                <input id="check-date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
              </div>

              <div className="court-filter-group">
                <label className="form-group-label" htmlFor="check-time">Time</label>
                <input
                  id="check-time"
                  type="time"
                  value={selectedTime}
                  min={selectedSportHours?.min}
                  max={selectedSportHours?.max}
                  onChange={(event) => setSelectedTime(event.target.value)}
                />
              </div>
            </div>

            <div className="availability-result-card">
              <p className="availability-result-card__title">Matching courts</p>
              {availabilityData.availableCourts.length > 0 ? (
                <>
                  <p className="availability-result-card__summary">
                    {availabilityData.availableCourts.length} court{availabilityData.availableCourts.length === 1 ? '' : 's'} available for this slot.
                  </p>
                  <ul className="availability-list">
                    {availabilityData.availableCourts.map((court) => (
                      <li key={court.id}>{court.name} • {court.sport}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="availability-result-card__summary">
                  No courts are available for this slot. Next available time: {availabilityData.nextAvailableTime ? formatDateTime(availabilityData.nextAvailableTime) : 'Not available yet.'}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Court cards */}
        <section className="template-section">
          {loading && <p className="loading-text">Loading court availability...</p>}
          {error && <p className="error-message">{error}</p>}

          {!loading && !error && (
            <div className="court-grid">
              {filteredCourts.map((court) => (
                <article className="court-card" key={court.id}>
                  <div className="court-card__header">
                    <div>
                      <h3>{court.name}</h3>
                      <p className="court-meta">{court.sport}</p>
                    </div>
                    <span className={getStatusClass(court.status)}>{court.status || 'Available'}</span>
                  </div>

                  <div className="court-card__body">
                    {hasDisplayValue(court.reason) && (
                      <div className="info-row">
                        <span className="info-label">Reason</span>
                        <span>{court.reason}</span>
                      </div>
                    )}
                    {hasDisplayValue(court.start_time) && (
                      <div className="info-row">
                        <span className="info-label">Available from</span>
                        <span>{formatDateTime(court.start_time)}</span>
                      </div>
                    )}
                    {hasDisplayValue(court.end_time) && (
                      <div className="info-row">
                        <span className="info-label">End time</span>
                        <span>{formatDateTime(court.end_time)}</span>
                      </div>
                    )}
                    <div className="info-row">
                      <span className="info-label">Last updated</span>
                      <span>{formatDateTime(court.updated_at)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default StudentCourtAvailability;
