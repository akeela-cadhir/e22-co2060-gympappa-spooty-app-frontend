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

const canManageEvents = ['admin', 'psu', 'games-captain'];

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

  const canCreate = canManageEvents.includes(user?.role);
  const isAdmin = user?.role === 'admin';
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
      await eventsAPI.createRequest({ ...form, selectedCourts: form.selectedCourts.map(Number) });
      setMessage('Your request was submitted successfully.');
      setForm(initialForm);
      refreshData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to submit event request');
    }
  };

  const handleEditRequest = (request) => {
    setEditingId(request.id);
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
      await eventsAPI.updateRequest(editingId, { ...form, selectedCourts: form.selectedCourts.map(Number) });
      setEditingId(null);
      setForm(initialForm);
      refreshData();
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

  const featuredEvents = useMemo(() => [...events].sort((a, b) => new Date(a.startDate || '2099-12-31') - new Date(b.startDate || '2099-12-31')).slice(0, 8), [events]);
  const calendarEntries = useMemo(() => buildCalendarEntries(events), [events]);
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
          <p className="events-page-eyebrow">Campus activity planning</p>
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
              <h2>Upcoming Highlights</h2>
              <p>Swipe through the next activities in a single moving bar.</p>
            </div>
            <div className="events-marquee">
              <div className="events-marquee-track">
                {[...featuredEvents, ...featuredEvents].map((event, index) => (
                  <Link key={`${event.id}-${index}`} to={`/events/${event.id}`} className="events-marquee-card">
                    <div className="events-marquee-body">
                      <span className="events-badge">{event.type === 'tournament' ? 'Tournament' : 'Event'}</span>
                      <h3>{event.title}</h3>
                      <p>{event.description || 'More details will appear once approved.'}</p>
                      <small>{event.startDate} • {event.startTime || 'TBD'}</small>
                    </div>
                  </Link>
                ))}
              </div>
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

          <section className="events-panel">
            <div className="events-section-heading">
              <h2>{editingId ? 'Edit Request' : 'Create an Event or Tournament'}</h2>
              <p>Choose the form you need and submit it for approval if you are not an admin.</p>
            </div>
            <div className="events-type-switcher">
              <button type="button" className={`events-type-btn ${form.type === 'event' ? 'active' : ''}`} onClick={() => setForm((prev) => ({ ...prev, type: 'event' }))}>Create Event</button>
              <button type="button" className={`events-type-btn ${form.type === 'tournament' ? 'active' : ''}`} onClick={() => setForm((prev) => ({ ...prev, type: 'tournament' }))}>Create Tournament</button>
            </div>
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
                {editingId ? <button type="button" className="btn-secondary" onClick={() => { setEditingId(null); setForm(initialForm); }}>Cancel</button> : null}
              </div>
              {!isRoleAllowed ? <p className="events-role-note">Only PSU, games captains, and admins can create event requests.</p> : null}
            </form>
          </section>

          {canCreate ? (
            <section className="events-panel">
              <div className="events-section-heading">
                <h2>Pending Requests</h2>
                <p>Editors can update their submissions before the admin reviews them.</p>
              </div>
              <div className="events-request-list">
                {requests.length > 0 ? requests.map((request) => (
                  <div key={request.id} className="events-request-card">
                    <div className="events-request-main">
                      <h3>{request.title}</h3>
                      <p>{request.description || 'No description provided.'}</p>
                      <small>Status: {request.status}</small>
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
                )) : <p>No pending requests yet.</p>}
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

        <aside className="events-sidebar">
          <section className="events-panel">
            <div className="events-section-heading">
              <h2>Upcoming Schedule</h2>
              <p>Browse approved activities and open their full details.</p>
            </div>
            <div className="events-side-list">
              {featuredEvents.map((event) => (
                <Link key={event.id} to={`/events/${event.id}`} className="events-side-link">
                  <strong>{event.title}</strong>
                  <span>{event.startDate}</span>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default EventsAndTournaments;
