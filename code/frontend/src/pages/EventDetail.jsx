import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { eventsAPI } from '../utils/api';
import '../styles/events.css';

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
 
  return (
    <div className="events-page">
      <section className="events-hero">
        <h1>{event.title}</h1>
        <p>{event.type === 'tournament' ? 'Tournament' : 'Event'} • {event.status}</p>
      </section>

      <div className="events-content-grid">
        <div className="events-main-column">
          <section className="events-panel">
            {event.bannerPath ? <img src={event.bannerPath} alt={event.title} className="events-detail-banner" /> : null}
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
        </div>

        <aside className="events-sidebar">
          <section className="events-panel">
            <h2>Details</h2>
            <div className="events-detail-list">
              <div><strong>Selected Courts</strong><br />{
                Array.isArray(event.selectedCourts)
                  ? event.selectedCourts.join(", ")
                  : Object.values(event.selectedCourts || {}).join(", ")
                }</div>
              <div><strong>Creator</strong><br />{event.creatorName || 'Unknown'}</div>
              <div><strong>Status</strong><br />{event.status}</div>
              <div><strong>Notes</strong><br />{event.notes || 'None'}</div>
            </div>
          </section>
          <section className="events-panel">
            <Link to="/events-and-tournaments" className="btn-secondary">Back to Events</Link>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default EventDetail;
