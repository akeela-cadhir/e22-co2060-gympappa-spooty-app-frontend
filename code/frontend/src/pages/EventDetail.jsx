import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { eventsAPI } from '../utils/api';
import '../styles/events.css';

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

const EventDetail = () => {
  const { eventId } = useParams();
  const storedUser = (() => {
    try { return JSON.parse(sessionStorage.getItem('user') || '{}'); } catch { return {}; }
  })();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);

  useEffect(() => {
    const loadEvent = async () => {
      try {
        const response = await eventsAPI.getById(eventId);
        const loadedEvent = response.data?.event || null;
        setEvent(loadedEvent);
        setForm(loadedEvent);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load event');
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [eventId]);

  const handleChange = (eventChange) => {
    const { name, value } = eventChange.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleImageChange = (eventChange, field) => {
    const file = eventChange.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((previous) => ({ ...previous, [field]: reader.result || '' }));
    reader.readAsDataURL(file);
  };

  const handleSave = async (eventChange) => {
    eventChange.preventDefault();
    try {
      const response = await eventsAPI.update(eventId, form);
      setEvent(response.data?.event || form);
      setForm(response.data?.event || form);
      setEditing(false);
      setMessage('Event updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update event');
    }
  };

  if (loading) return <div className="events-page"><div className="events-panel">Loading event…</div></div>;
  if (error) return <div className="events-page"><div className="events-panel">{error}</div></div>;
  if (!event) return <div className="events-page"><div className="events-panel">Event not found.</div></div>;

  const expired = isEventExpired(event);
  const isAdmin = String(storedUser?.role || '').toLowerCase() === 'admin';
  const bookingDuration = `${event.startDate || 'TBD'}, ${event.startTime || 'TBD'} to ${event.endDate || event.startDate || 'TBD'}, ${event.endTime || 'TBD'}`;
 
  return (
    <div className="events-page">
      <section className="events-hero">
        <h1>{event.title}</h1>
        <p>{event.type === 'tournament' ? 'Tournament' : 'Event'} • {expired ? 'Expired' : event.status}</p>
      </section>

      <div className="events-content-grid">
        <div className="events-main-column">
          <section className="events-panel">
            {message ? <div className="events-inline-message success">{message}</div> : null}
            {event.bannerPath ? <img src={event.bannerPath} alt={event.title} className="events-detail-banner" /> : null}
            {expired ? <div className="events-inline-message error">This event has already ended and is no longer listed as upcoming.</div> : null}
            <h2>Overview</h2>
            <p>{event.description || 'No description provided.'}</p>
            <div className="events-detail-grid">
              <div className="events-booking-duration"><strong>Venue booking duration</strong><br />{bookingDuration}</div>
            </div>
          </section>

          <section className="events-panel">
            <h2>Schedule</h2>
            {event.type === 'tournament' && event.sports?.length ? (
              <div className="events-calendar-placeholder">
                {event.sports.map((sport, index) => (
                  <div key={sport.id || index} className="events-calendar-item">
                    <strong>{sport.sport_name || sport.sportName}</strong>
                    <span>{sport.sport_date || 'TBD'} • {sport.start_time || 'TBD'} - {sport.end_time || 'TBD'}</span>
                    {sport.game_banner ? <img src={sport.game_banner} alt={`${sport.sport_name || 'Schedule'} schedule`} className="events-schedule-photo" /> : null}
                  </div>
                ))}
              </div>
            ) : (
              event.schedulePhoto ? <img src={event.schedulePhoto} alt={`${event.title} schedule`} className="events-schedule-photo events-schedule-photo-large" /> : <p>No schedule details yet.</p>
            )}
          </section>

          <section className="events-panel">
            <h2>Details</h2>
            <div className="events-detail-list">
              <div><strong>Selected Courts</strong><br />{
                Array.isArray(event.selectedCourts)
                  ? event.selectedCourts.join(", ")
                  : Object.values(event.selectedCourts || {}).join(", ")
                }</div>
              <div><strong>Organized by</strong><br />{event.creatorName || 'Unknown'}</div>
              <div><strong>Status</strong><br />{expired ? 'Expired' : event.status}</div>
              <div><strong>Notes</strong><br />{event.notes || 'None'}</div>
            </div>
          </section>
          {isAdmin && editing ? (
            <section className="events-panel">
              <h2>Edit Event</h2>
              <form onSubmit={handleSave} className="events-form">
                <label className="events-form-label">Event name<input name="title" value={form.title || ''} onChange={handleChange} required /></label>
                <label className="events-form-label">Description<textarea name="description" value={form.description || ''} onChange={handleChange} rows="3" /></label>
                <label className="events-form-label">Replace banner<input type="file" accept="image/*" onChange={(change) => handleImageChange(change, 'bannerPath')} /></label>
                <label className="events-form-label">Add a schedule photo<input type="file" accept="image/*" onChange={(change) => handleImageChange(change, 'schedulePhoto')} /></label>
                <div className="events-form-grid">
                  <label>Booking start date<input type="date" name="startDate" value={form.startDate || ''} onChange={handleChange} /></label>
                  <label>Booking end date<input type="date" name="endDate" value={form.endDate || ''} onChange={handleChange} /></label>
                  <label>Booking start time<input type="time" name="startTime" value={form.startTime || ''} onChange={handleChange} /></label>
                  <label>Booking end time<input type="time" name="endTime" value={form.endTime || ''} onChange={handleChange} /></label>
                </div>
                <label className="events-form-label">Notes<textarea name="notes" value={form.notes || ''} onChange={handleChange} rows="3" /></label>
                <div className="events-form-actions"><button type="submit" className="btn-primary">Save changes</button><button type="button" className="btn-secondary" onClick={() => { setForm(event); setEditing(false); }}>Cancel</button></div>
              </form>
            </section>
          ) : null}
          {isAdmin && !editing ? <section className="events-panel"><button type="button" className="btn-primary" onClick={() => setEditing(true)}>Edit event</button></section> : null}
          <section className="events-panel">
            <Link to="/events-and-tournaments" className="btn-secondary">Back to Events</Link>
          </section>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
