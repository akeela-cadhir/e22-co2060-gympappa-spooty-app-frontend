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
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadEvent = async () => {
      try {
        const response = await eventsAPI.getById(eventId);
        setEvent(response.data?.event || null);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load event');
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [eventId]);

  if (loading) return <div className="events-page"><div className="events-panel">Loading event…</div></div>;
  if (error) return <div className="events-page"><div className="events-panel">{error}</div></div>;
  if (!event) return <div className="events-page"><div className="events-panel">Event not found.</div></div>;

  const expired = isEventExpired(event);
 
  return (
    <div className="events-page">
      <section className="events-hero">
        <h1>{event.title}</h1>
        <p>{event.type === 'tournament' ? 'Tournament' : 'Event'} • {expired ? 'Expired' : event.status}</p>
      </section>

      <div className="events-content-grid">
        <div className="events-main-column">
          <section className="events-panel">
            {event.bannerPath ? <img src={event.bannerPath} alt={event.title} className="events-detail-banner" /> : null}
            {expired ? <div className="events-inline-message error">This event has already ended and is no longer listed as upcoming.</div> : null}
            <h2>Overview</h2>
            <p>{event.description || 'No description provided.'}</p>
            <div className="events-detail-grid">
              <div><strong>Dates</strong><br />{event.startDate || 'TBD'} {event.endDate ? `to ${event.endDate}` : ''}</div>
              <div><strong>Time</strong><br />{event.startTime || 'TBD'} {event.endTime ? `- ${event.endTime}` : ''}</div>
              <div><strong>Preparation</strong><br />{event.preparationStartTime || 'TBD'}</div>
              <div><strong>Handover</strong><br />{event.handoverTime || 'TBD'}</div>
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
                  </div>
                ))}
              </div>
            ) : <p>No schedule details yet.</p>}
          </section>

          <section className="events-panel">
            <h2>Details</h2>
            <div className="events-detail-list">
              <div><strong>Selected Courts</strong><br />{
                Array.isArray(event.selectedCourts)
                  ? event.selectedCourts.join(", ")
                  : Object.values(event.selectedCourts || {}).join(", ")
                }</div>
              <div><strong>Creator</strong><br />{event.creatorName || 'Unknown'}</div>
              <div><strong>Status</strong><br />{expired ? 'Expired' : event.status}</div>
              <div><strong>Notes</strong><br />{event.notes || 'None'}</div>
            </div>
          </section>
          <section className="events-panel">
            <Link to="/events-and-tournaments" className="btn-secondary">Back to Events</Link>
          </section>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
