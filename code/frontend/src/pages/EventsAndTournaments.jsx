import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { eventsAPI } from '../utils/api';
import '../styles/events.css';

const initialForm = {
  type: 'event',
  title: '',
  description: '',
  bannerPath: '',
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  preparationStartTime: '',
  handoverTime: '',
  notes: '',
  selectedCourts: [],
  mainGymSelected: false,
  sportEntries: [],
};

const canManageEvents = ['admin', 'psu', 'games-captain', 'sports-council'];

const normalizeRole = (role) => String(role || '').trim().toLowerCase().replace(/\s+/g, '-');

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isEventExpired = (event = {}, now = new Date()) => {
  const startDate = event.startDate || event.start_date;
  const endDate = event.endDate || event.end_date;
  const startTime = event.startTime || event.start_time;
  const endTime = event.endTime || event.end_time;

  const parseDateTimeValue = (dateValue, timeValue) => {
    if (!dateValue) return null;
    const [year, month, day] = String(dateValue).split('-').map((value) => Number(value));
    if ([year, month, day].some((value) => Number.isNaN(value))) return null;
    const time = typeof timeValue === 'string' && timeValue.trim() ? timeValue.trim() : '23:59';
    const [hours, minutes] = time.split(':').map((value) => Number(value));
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return new Date(year, month - 1, day, hours, minutes, 0);
  };

  const start = parseDateTimeValue(startDate, startTime);
  const end = parseDateTimeValue(endDate || startDate, endTime || startTime || '23:59');
  if (!start && !end) return false;
  const reference = end || start;
  if (!reference) return false;
  return now.getTime() > reference.getTime();
};

const buildCalendarEntries = (events = []) => {
  return events.flatMap((event) => {
    const baseDate = event.startDate;
    const entries = [];

    if (event.type === 'tournament') {
      const sports = Array.isArray(event.sports) ? event.sports : [];
      if (sports.length > 0) {
        sports.forEach((sport, index) => {
          const sportDate = sport.sport_date || baseDate;
          if (!sportDate) return;
          entries.push({
            id: `${event.id}-sport-${index}`,
            eventId: event.id,
            date: sportDate,
            title: `${event.title} • ${sport.sport_name || sport.sportName || 'Game'}`,
            type: 'tournament',
            event,
            sport,
          });
        });
      } else if (baseDate) {
        entries.push({
          id: `${event.id}-tournament`,
          eventId: event.id,
          date: baseDate,
          title: event.title,
          type: 'tournament',
          event,
        });
      }
    } else if (baseDate) {
      entries.push({
        id: `${event.id}-event`,
        eventId: event.id,
        date: baseDate,
        title: event.title,
        type: 'event',
        event,
      });
    }

    return entries;
  }).sort((a, b) => a.date.localeCompare(b.date));
};

const EventsAndTournaments = () => {
  const [user, setUser] = useState(getStoredUser());
  const [events, setEvents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sports, setSports] = useState([]);
  const [courts, setCourts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [allRequests, setAllRequests] = useState([]);
  const [reviewReasons, setReviewReasons] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedRequestId, setExpandedRequestId] = useState(null);
  const [selectedCreateType, setSelectedCreateType] = useState(null);
  const [requestFilter, setRequestFilter] = useState('all');

  const canCreate = canManageEvents.includes(normalizeRole(user?.role));
  const isAdmin = normalizeRole(user?.role) === 'admin';
  const isRoleAllowed = canCreate || isAdmin;

  const refreshData = async () => {
    try {
      const [metaRes, approvedRes, requestsRes, allRequestsRes] = await Promise.all([
        eventsAPI.getMeta(),
        eventsAPI.getApproved(),
        eventsAPI.getMyRequests(),
        isAdmin ? eventsAPI.getAllRequests() : Promise.resolve({ data: { requests: [] } }),
      ]);
      setSports(metaRes.data?.sports || []);
      setCourts(metaRes.data?.courts || []);
      setEvents(approvedRes.data?.events || []);
      setRequests(requestsRes.data?.requests || []);
      setAllRequests(allRequestsRes.data?.requests || []);
      setUser(getStoredUser());
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleCreateTypeSelect = (type) => {
    setSelectedCreateType(type);
    setEditingId(null);
    setForm((prev) => ({ ...prev, type }));
  };

  const handleCourtToggle = (courtId) => {
    setForm((prev) => {
      const selectedCourts = prev.selectedCourts.includes(courtId)
        ? prev.selectedCourts.filter((id) => id !== courtId)
        : [...prev.selectedCourts, courtId];
      return { ...prev, selectedCourts };
    });
  };

  const handleBannerUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, bannerPath: reader.result || '' }));
    };
    reader.readAsDataURL(file);
  };

  const handleGameBannerUpload = (index, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => {
        const items = [...prev.sportEntries];
        items[index] = { ...items[index], gameBanner: reader.result || '' };
        return { ...prev, sportEntries: items };
      });
    };
    reader.readAsDataURL(file);
  };

  const handleAddSportEntry = (sportName = '') => {
    setForm((prev) => ({
      ...prev,
      sportEntries: [
        ...prev.sportEntries,
        {
          sportName: sportName || prev.sportEntries[0]?.sportName || sports[0]?.name || '',
          date: '',
          startTime: '',
          endTime: '',
          court: '',
          gameBanner: '',
          notes: '',
        },
      ],
    }));
  };

  const handleSportEntryChange = (index, field, value) => {
    setForm((prev) => {
      const items = [...prev.sportEntries];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, sportEntries: items };
    });
  };

  const removeSportEntry = (index) => {
    setForm((prev) => ({ ...prev, sportEntries: prev.sportEntries.filter((_, itemIndex) => itemIndex !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const payload = {
        type: form.type,
        title: form.title,
        description: form.description,
        bannerPath: form.bannerPath,
        startDate: form.startDate,
        endDate: form.endDate,
        startTime: form.startTime,
        endTime: form.endTime,
        preparationStartTime: form.preparationStartTime,
        handoverTime: form.handoverTime,
        notes: form.notes,
        selectedCourts: form.selectedCourts.map(Number).filter(Boolean),
        mainGymSelected: Boolean(form.mainGymSelected),
        sportEntries: Array.isArray(form.sportEntries) ? form.sportEntries : [],
      };
      await eventsAPI.createRequest(payload);
      setMessage('Your request was submitted successfully.');
      setSelectedCreateType(null);
      setForm(initialForm);
      await refreshData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to submit event request');
    }
  };

  const handleEditRequest = (request) => {
    setEditingId(request.id);
    setSelectedCreateType(request.type);
    setForm({
      ...initialForm,
      type: request.type,
      title: request.title || '',
      description: request.description || '',
      bannerPath: request.bannerPath || '',
      startDate: request.startDate || '',
      endDate: request.endDate || '',
      startTime: request.startTime || '',
      endTime: request.endTime || '',
      preparationStartTime: request.preparationStartTime || '',
      handoverTime: request.handoverTime || '',
      notes: request.notes || '',
      selectedCourts: request.selectedCourts || [],
      mainGymSelected: Boolean(request.mainGymSelected),
      sportEntries: request.sportEntries || [],
    });
  };

  const handleUpdateRequest = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        type: form.type,
        title: form.title,
        description: form.description,
        bannerPath: form.bannerPath,
        startDate: form.startDate,
        endDate: form.endDate,
        startTime: form.startTime,
        endTime: form.endTime,
        preparationStartTime: form.preparationStartTime,
        handoverTime: form.handoverTime,
        notes: form.notes,
        selectedCourts: form.selectedCourts.map(Number).filter(Boolean),
        mainGymSelected: Boolean(form.mainGymSelected),
        sportEntries: Array.isArray(form.sportEntries) ? form.sportEntries : [],
      };
      await eventsAPI.updateRequest(editingId, payload);
      setEditingId(null);
      setSelectedCreateType(null);
      setForm(initialForm);
      await refreshData();
      setMessage('Request updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update request');
    }
  };

  const handleCancelRequest = async (requestId) => {
    try {
      await eventsAPI.cancelRequest(requestId);
      refreshData();
      setMessage('Request cancelled.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to cancel request');
    }
  };

  const handleReview = async (requestId, action) => {
    try {
      const reason = reviewReasons[requestId] || (action === 'approve' ? 'Approved by admin' : 'Rejected by admin');
      if (action === 'approve') {
        await eventsAPI.approveRequest(requestId, { reason });
      } else {
        await eventsAPI.rejectRequest(requestId, { reason });
      }
      setReviewReasons((prev) => ({ ...prev, [requestId]: '' }));
      refreshData();
      setMessage(`Request ${action}d successfully.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to complete review');
    }
  };

  const featuredEvents = useMemo(() => [...events]
    .filter((event) => !isEventExpired(event))
    .sort((a, b) => new Date(a.startDate || '2099-12-31') - new Date(b.startDate || '2099-12-31'))
    .slice(0, 8), [events]);
  const calendarEntries = useMemo(() => buildCalendarEntries(events.filter((event) => !isEventExpired(event))), [events]);
  const filteredRequests = useMemo(() => {
    if (requestFilter === 'all') return requests;
    return requests.filter((request) => request.status === requestFilter);
  }, [requests, requestFilter]);
  const selectedDateKey = useMemo(() => formatDateKey(selectedDate), [selectedDate]);

  const selectedDateEvents = useMemo(() =>
    calendarEntries.filter((entry) => entry.date === selectedDateKey),
    [calendarEntries, selectedDateKey]
  );

  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    const hasEvent = calendarEntries.some((entry) => entry.date === formatDateKey(date));
    return hasEvent ? <span className="calendar-event-dot" /> : null;
  };

  if (loading) return <div className="events-page"><div className="events-panel">Loading events…</div></div>;

  return (
    <div className="events-page">
      <section className="events-page-header">
        <div>
          <h1>Events & Tournaments</h1>
          <p>Discover upcoming activities, review the calendar, and manage event requests in one place.</p>
        </div>
      </section>

      {message ? <div className="events-inline-message success">{message}</div> : null}
      {error ? <div className="events-inline-message error">{error}</div> : null}

      <div className="events-content-grid">
        <div className="events-main-column">
          <section className="events-panel">
            <div className="events-section-heading">
              <h2>Upcoming Events</h2>
              <p>Browse the next activities that are still active and open for attendance.</p>
            </div>
            <div className="events-highlight-list">
              {featuredEvents.length > 0 ? featuredEvents.map((event) => (
                <Link key={event.id} to={`/events/${event.id}`} className="events-highlight-card">
                  <div className="events-highlight-body">
                    <span className="events-badge">{event.type === 'tournament' ? 'Tournament' : 'Event'}</span>
                    <h3>{event.title}</h3>
                    <p>{event.description || 'More details will appear once approved.'}</p>
                    <small>{event.startDate} • {event.startTime || 'TBD'}</small>
                  </div>
                </Link>
              )) : <p>No upcoming events right now.</p>}
            </div>
          </section>

          <section className="events-panel">
            <div className="events-section-heading">
              <h2>Monthly Calendar</h2>
              <p>Game days from tournaments and events are shown on the calendar automatically.</p>
            </div>
            <Calendar
              onChange={setSelectedDate}
              value={selectedDate}
              tileContent={tileContent}
            />
            <div className="events-selected-day">
              <h3>{selectedDateKey}</h3>
              {selectedDateEvents.length > 0 ? (
                <div className="events-calendar-placeholder">
                  {selectedDateEvents.map((entry) => (
                    <div key={entry.id} className="events-calendar-item">
                      <strong>{entry.title}</strong>
                      <span>{entry.type === 'tournament' ? 'Tournament' : 'Event'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No activities scheduled for this day.</p>
              )}
            </div>
          </section>

          {canCreate ? (
            <section className="events-panel">
              <div className="events-section-heading">
                <h2>{editingId ? 'Edit Request' : 'Create an Event or Tournament'}</h2>
                <p>{editingId ? 'Update the pending request before it is reviewed.' : 'Choose Event or Tournament to begin, then submit your request.'}</p>
              </div>
              <div className="events-type-switcher">
                <button type="button" className={`events-type-btn ${form.type === 'event' ? 'active' : ''}`} onClick={() => handleCreateTypeSelect('event')}>Create Event</button>
                <button type="button" className={`events-type-btn ${form.type === 'tournament' ? 'active' : ''}`} onClick={() => handleCreateTypeSelect('tournament')}>Create Tournament</button>
              </div>
              {!editingId && !selectedCreateType ? (
                <p className="events-role-note">Select the type above to reveal the form for your request.</p>
              ) : null}
              {(editingId || selectedCreateType) ? (
                <form onSubmit={editingId ? handleUpdateRequest : handleSubmit} className="events-form">
                  <label className="events-form-label">
                    Title / Tournament Name
                    <input name="title" value={form.title} onChange={handleChange} required />
                  </label>
                  <label className="events-form-label">
                    Description
                    <textarea name="description" value={form.description} onChange={handleChange} rows="3" />
                  </label>
                  <label className="events-form-label">
                    Upload a banner
                    <input type="file" accept="image/*" onChange={handleBannerUpload} />
                  </label>
                  {form.bannerPath ? <img src={form.bannerPath} alt="Banner preview" className="events-banner-preview" /> : null}
                  <div className="events-form-grid">
                    <label>Start Date<input type="date" name="startDate" value={form.startDate} onChange={handleChange} /></label>
                    <label>End Date<input type="date" name="endDate" value={form.endDate} onChange={handleChange} /></label>
                    {form.type === 'event' ? (
                      <>
                        <label>Start Time<input type="time" name="startTime" value={form.startTime} onChange={handleChange} /></label>
                        <label>End Time<input type="time" name="endTime" value={form.endTime} onChange={handleChange} /></label>
                        <label>Preparation Start<input type="time" name="preparationStartTime" value={form.preparationStartTime} onChange={handleChange} /></label>
                        <label>Handover Time<input type="time" name="handoverTime" value={form.handoverTime} onChange={handleChange} /></label>
                      </>
                    ) : (
                      <>
                        <label>One-day Start Time<input type="time" name="startTime" value={form.startTime} onChange={handleChange} /></label>
                        <label>One-day End Time<input type="time" name="endTime" value={form.endTime} onChange={handleChange} /></label>
                      </>
                    )}
                  </div>

                  {form.type === 'event' ? (
                    <>
                      <div className="events-court-list">
                        <h3>Select courts</h3>
                        <div className="events-court-selector">
                          {courts.map((court) => (
                            <button
                              key={court.id}
                              type="button"
                              className={`events-court-chip ${form.selectedCourts.includes(Number(court.id)) ? 'active' : ''}`}
                              onClick={() => handleCourtToggle(Number(court.id))}
                            >
                              {court.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      <label className="events-checkbox">
                        <input type="checkbox" name="mainGymSelected" checked={form.mainGymSelected} onChange={handleChange} />
                        Reserve the main gymnasium and all indoor courts
                      </label>
                    </>
                  ) : (
                    <div className="events-tournament-layout">
                      <div className="events-sport-picker">
                        <h3>Select sports</h3>
                        <div className="events-sport-list">
                          {sports.map((sport) => (
                            <button key={sport.id} type="button" className="events-sport-pill" onClick={() => handleAddSportEntry(sport.name)}>
                              <span>+</span> {sport.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="events-tournament-table">
                        <div className="events-table-header">
                          <h3>Game schedule</h3>
                        </div>
                        {form.sportEntries.length > 0 ? (
                          <div className="events-table-body">
                            {form.sportEntries.map((entry, index) => (
                              <div key={`${entry.sportName}-${index}`} className="events-table-row">
                                <input value={entry.sportName || ''} onChange={(e) => handleSportEntryChange(index, 'sportName', e.target.value)} placeholder="Sport" />
                                <input type="date" value={entry.date || ''} onChange={(e) => handleSportEntryChange(index, 'date', e.target.value)} />
                                <input type="time" value={entry.startTime || ''} onChange={(e) => handleSportEntryChange(index, 'startTime', e.target.value)} />
                                <input type="time" value={entry.endTime || ''} onChange={(e) => handleSportEntryChange(index, 'endTime', e.target.value)} />
                                <input value={entry.court || ''} onChange={(e) => handleSportEntryChange(index, 'court', e.target.value)} placeholder="Court" />
                                <input value={entry.notes || ''} onChange={(e) => handleSportEntryChange(index, 'notes', e.target.value)} placeholder="Notes" />
                                <button type="button" className="btn-danger" onClick={() => removeSportEntry(index)}>Remove</button>
                              </div>
                            ))}
                          </div>
                        ) : <p>Add sport rows to build the tournament schedule.</p>}
                      </div>
                    </div>
                  )}

                  <label className="events-form-label">
                    Notes
                    <textarea name="notes" value={form.notes} onChange={handleChange} rows="3" />
                  </label>

                  <div className="events-form-actions">
                    <button type="submit" className="btn-primary">{isAdmin ? 'Create Event / Tournament' : editingId ? 'Save Request' : 'Submit Request'}</button>
                    {editingId ? <button type="button" className="btn-secondary" onClick={() => { setEditingId(null); setSelectedCreateType(null); setForm(initialForm); }}>Cancel</button> : null}
                  </div>
                  {!isRoleAllowed ? <p className="events-role-note">Only PSU, games captains, sports council members, and admins can create event requests.</p> : null}
                </form>
              ) : null}
            </section>
          ) : null}

          {canCreate ? (
          <section className="events-panel">
              <div className="events-section-heading">
                <h2>My Requests</h2>
                <p>Track the status of your submissions and update pending requests before review.</p>
              </div>
              <label className="events-form-label">
                Filter by status
                <select value={requestFilter} onChange={(e) => setRequestFilter(e.target.value)}>
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <div className="events-request-list">
                {filteredRequests.length > 0 ? filteredRequests.map((request) => (
                  <div key={request.id} className="events-request-card">
                    <div className="events-request-main">
                      <h3>{request.title}</h3>
                      <p>{request.description || 'No description provided.'}</p>
                      <small>Status: {request.status}</small>
                      {request.status === 'approved' ? <small>Approved and turned into a live event.</small> : null}
                    </div>
                    <div className="events-request-actions">
                      {request.status === 'pending' ? (
                        <>
                          <button className="btn-secondary" onClick={() => handleEditRequest(request)}>Edit</button>
                          <button className="btn-danger" onClick={() => handleCancelRequest(request.id)}>Cancel</button>
                        </>
                      ) : null}
                    </div>
                  </div>
                )) : <p>No requests matching this filter yet.</p>}
              </div>
            </section>
          ) : null}

          {isAdmin ? (
            <section className="events-panel">
              <div className="events-section-heading">
                <h2>Admin Review Queue</h2>
                <p>Review request details before accepting or declining them.</p>
              </div>
              <div className="events-request-list">
                {allRequests.length > 0 ? allRequests.map((request) => (
                  <div key={request.id} className="events-request-card review-card">
                    <div className="events-request-main">
                      <h3>{request.title}</h3>
                      <p>{request.description || 'No description provided.'}</p>
                      <small>Status: {request.status}</small>
                      {expandedRequestId === request.id ? (
                        <div className="events-request-preview">
                          <p><strong>Type:</strong> {request.type === 'tournament' ? 'Tournament' : 'Event'}</p>
                          <p><strong>Dates:</strong> {request.startDate || 'TBD'} {request.endDate ? `to ${request.endDate}` : ''}</p>
                          <p><strong>Times:</strong> {request.startTime || 'TBD'} {request.endTime ? `- ${request.endTime}` : ''}</p>
                          <p><strong>Courts:</strong> {(request.selectedCourts || []).join(', ') || 'None selected'}</p>
                          {request.sportEntries?.length ? <p><strong>Games:</strong> {request.sportEntries.map((entry) => entry.sportName || entry.sport).filter(Boolean).join(', ')}</p> : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="events-request-actions">
                      {request.status === 'pending' ? (
                        <>
                          <button className="btn-secondary" onClick={() => setExpandedRequestId((prev) => (prev === request.id ? null : request.id))}>View</button>
                          <input value={reviewReasons[request.id] || ''} onChange={(e) => setReviewReasons((prev) => ({ ...prev, [request.id]: e.target.value }))} placeholder="Reason for review" />
                          <button className="btn-primary" onClick={() => handleReview(request.id, 'approve')}>Approve</button>
                          <button className="btn-danger" onClick={() => handleReview(request.id, 'reject')}>Reject</button>
                        </>
                      ) : null}
                    </div>
                  </div>
                )) : <p>No pending requests to review.</p>}
              </div>
            </section>
          ) : null}
        </div>

      </div>
    </div>
  );
};

export default EventsAndTournaments;
