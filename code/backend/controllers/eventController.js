import pool from '../utils/database.js';
import { expandCourtSelection } from '../utils/eventUtils.js';

const normalizeType = (value = 'event') => String(value || 'event').trim().toLowerCase();
const allowedRequestRoles = ['admin', 'psu', 'games-captain'];

const normalizeSelectedCourts = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  if (value && typeof value === 'object') {
    return Object.values(value);
  }
  return [];
};

const normalizeSportEntries = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const buildEventPayload = (row) => ({
  id: row.id,
  type: row.item_type,
  title: row.title,
  description: row.description,
  bannerPath: row.banner_path,
  startDate: row.start_date,
  endDate: row.end_date,
  startTime: row.start_time,
  endTime: row.end_time,
  preparationStartTime: row.preparation_start_time,
  handoverTime: row.handover_time,
  notes: row.notes,
  mainGymSelected: row.main_gym_selected,
  selectedCourts: normalizeSelectedCourts(row.selected_courts),
  status: row.status,
  creatorId: row.creator_id,
  creatorName: row.creator_name,
  creatorRole: row.creator_role,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  sports: row.sports || [],
});

const buildRequestPayload = (row) => ({
  id: row.id,
  type: row.request_type,
  title: row.title,
  description: row.description,
  bannerPath: row.banner_path,
  startDate: row.start_date,
  endDate: row.end_date,
  startTime: row.start_time,
  endTime: row.end_time,
  preparationStartTime: row.preparation_start_time,
  handoverTime: row.handover_time,
  notes: row.notes,
  mainGymSelected: row.main_gym_selected,
  selectedCourts: normalizeSelectedCourts(row.selected_courts),
  sportEntries: normalizeSportEntries(row.sport_entries),
  status: row.status,
  creatorId: row.creator_id,
  creatorName: row.creator_name,
  creatorRole: row.creator_role,
  reviewMessage: row.review_message,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const getEventMeta = async (req, res) => {
  try {
    const sportsResult = await pool.query('SELECT id, name FROM sports ORDER BY name ASC');
    const courtsResult = await pool.query(
      `SELECT id, name, location,
              CASE WHEN LOWER(COALESCE(location, '')) LIKE '%indoor%' OR name ILIKE '%main gym%' THEN true ELSE false END AS is_indoor
       FROM courts
       ORDER BY name ASC`
    );

    res.json({ sports: sportsResult.rows, courts: courtsResult.rows });
  } catch (error) {
    console.error('Error loading event meta:', error);
    res.status(500).json({ message: 'Failed to load event metadata', error: error.message });
  }
};

export const listApprovedEvents = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, u.name AS creator_name, u.role AS creator_role
       FROM events e
       LEFT JOIN "user" u ON e.creator_id = u.user_id
       WHERE e.status = 'approved'
       ORDER BY e.start_date ASC, e.start_time ASC`
    );

    const tournamentIds = result.rows.filter((row) => row.item_type === 'tournament').map((row) => row.id);
    const sportsByTournamentId = new Map();

    if (tournamentIds.length > 0) {
      const sportsResult = await pool.query(
        `SELECT * FROM tournament_sports WHERE tournament_id = ANY($1::int[]) ORDER BY tournament_id, sport_date ASC, start_time ASC`,
        [tournamentIds]
      );

      sportsResult.rows.forEach((sport) => {
        const existing = sportsByTournamentId.get(sport.tournament_id) || [];
        existing.push(sport);
        sportsByTournamentId.set(sport.tournament_id, existing);
      });
    }

    const events = result.rows.map((row) => {
      const payload = buildEventPayload({ ...row, sports: sportsByTournamentId.get(row.id) || [] });
      return payload;
    });

    res.json({ events });
  } catch (error) {
    console.error('Error listing events:', error);
    res.status(500).json({ message: 'Failed to fetch events', error: error.message });
  }
};

export const getEventById = async (req, res) => {
  try {
    const { eventId } = req.params;
    const eventResult = await pool.query(
      `SELECT e.*, u.name AS creator_name, u.role AS creator_role
       FROM events e
       LEFT JOIN "user" u ON e.creator_id = u.user_id
       WHERE e.id = $1`,
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const event = buildEventPayload(eventResult.rows[0]);

    if (event.type === 'tournament') {
      const sportsResult = await pool.query(
        `SELECT * FROM tournament_sports WHERE tournament_id = $1 ORDER BY sport_date ASC, start_time ASC`,
        [eventId]
      );
      event.sports = sportsResult.rows;
    }

    res.json({ event });
  } catch (error) {
    console.error('Error fetching event details:', error);
    res.status(500).json({ message: 'Failed to fetch event details', error: error.message });
  }
};

export const createEventRequest = async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;
    if (!allowedRequestRoles.includes(role)) {
      return res.status(403).json({ message: 'Only PSU, games captains, and admins can create event requests.' });
    }
    const body = req.body || {};
    const requestType = normalizeType(body.type || body.requestType);
    const title = String(body.title || body.tournamentName || '').trim();
    const description = String(body.description || '').trim();
    const bannerPath = body.bannerPath || body.banner || '';
    const startDate = body.startDate || body.start_date || null;
    const endDate = body.endDate || body.end_date || null;
    const startTime = body.startTime || body.start_time || null;
    const endTime = body.endTime || body.end_time || null;
    const preparationStartTime = body.preparationStartTime || body.preparation_start_time || null;
    const handoverTime = body.handoverTime || body.handover_time || null;
    const notes = body.notes || '';
    const selectedCourts = Array.isArray(body.selectedCourts) ? body.selectedCourts : [];
    const mainGymSelected = Boolean(body.mainGymSelected);
    const sportEntries = Array.isArray(body.sportEntries) ? body.sportEntries : [];

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    if (requestType === 'tournament' && sportEntries.length === 0) {
      return res.status(400).json({ message: 'At least one sport entry is required for tournaments' });
    }

    const status = role === 'admin' ? 'approved' : 'pending';

    if (role === 'admin') {
      const eventResult = await pool.query(
        `INSERT INTO events (
          item_type, title, description, banner_path, start_date, end_date, start_time, end_time,
          preparation_start_time, handover_time, notes, main_gym_selected, selected_courts, status, creator_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING id`,
        [requestType, title, description, bannerPath, startDate || null, endDate || null, startTime || null, endTime || null, preparationStartTime || null, handoverTime || null, notes || null, mainGymSelected, selectedCourts, 'approved', userId]
      );

      const createdEventId = eventResult.rows[0].id;
      if (requestType === 'tournament') {
        for (const entry of sportEntries) {
          await pool.query(
            `INSERT INTO tournament_sports (tournament_id, sport_name, sport_date, start_time, end_time, court_name, game_banner, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [createdEventId, entry.sportName || entry.sport || null, entry.date || null, entry.startTime || null, entry.endTime || null, entry.court || null, entry.gameBanner || null, entry.notes || null]
          );
        }
      }

      await reserveCourtsForEvent(selectedCourts, mainGymSelected, requestType, sportEntries);

      return res.status(201).json({ message: 'Event created successfully', eventId: createdEventId });
    }

    const requestResult = await pool.query(
      `INSERT INTO event_requests (
        request_type, title, description, banner_path, start_date, end_date, start_time, end_time,
        preparation_start_time, handover_time, notes, main_gym_selected, selected_courts, sport_entries, status, creator_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [requestType, title, description, bannerPath, startDate || null, endDate || null, startTime || null, endTime || null, preparationStartTime || null, handoverTime || null, notes || null, mainGymSelected, JSON.stringify(selectedCourts), JSON.stringify(sportEntries), status, userId]
    );

    res.status(201).json({ message: 'Event request submitted successfully', request: buildRequestPayload(requestResult.rows[0]) });
  } catch (error) {
    console.error('Error creating event request:', error);
    res.status(500).json({ message: 'Failed to submit event request', error: error.message });
  }
};

export const listMyRequests = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query(
      `SELECT er.*, u.name AS creator_name, u.role AS creator_role
       FROM event_requests er
       LEFT JOIN "user" u ON er.creator_id = u.user_id
       WHERE er.creator_id = $1
       ORDER BY er.created_at DESC`,
      [userId]
    );

    res.json({ requests: result.rows.map(buildRequestPayload) });
  } catch (error) {
    console.error('Error listing my requests:', error);
    res.status(500).json({ message: 'Failed to fetch your event requests', error: error.message });
  }
};

export const listAllRequests = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT er.*, u.name AS creator_name, u.role AS creator_role
       FROM event_requests er
       LEFT JOIN "user" u ON er.creator_id = u.user_id
       ORDER BY er.created_at DESC`
    );

    res.json({ requests: result.rows.map(buildRequestPayload) });
  } catch (error) {
    console.error('Error listing all requests:', error);
    res.status(500).json({ message: 'Failed to fetch requests', error: error.message });
  }
};

export const updateRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.userId;
    const role = req.user.role;
    if (!allowedRequestRoles.includes(role)) {
      return res.status(403).json({ message: 'Only PSU, games captains, and admins can edit event requests.' });
    }
    const body = req.body || {};
    const result = await pool.query('SELECT * FROM event_requests WHERE id = $1 AND creator_id = $2', [requestId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const existing = result.rows[0];
    if (existing.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending requests can be edited' });
    }

    const title = String(body.title || body.tournamentName || existing.title || '').trim();
    const description = String(body.description || existing.description || '').trim();
    const bannerPath = body.bannerPath || body.banner || existing.banner_path || '';
    const startDate = body.startDate || body.start_date || existing.start_date;
    const endDate = body.endDate || body.end_date || existing.end_date;
    const startTime = body.startTime || body.start_time || existing.start_time;
    const endTime = body.endTime || body.end_time || existing.end_time;
    const preparationStartTime = body.preparationStartTime || body.preparation_start_time || existing.preparation_start_time;
    const handoverTime = body.handoverTime || body.handover_time || existing.handover_time;
    const notes = body.notes || existing.notes || '';
    const selectedCourts = Array.isArray(body.selectedCourts) ? body.selectedCourts : normalizeSelectedCourts(existing.selected_courts);
    const mainGymSelected = Boolean(body.mainGymSelected ?? existing.main_gym_selected);
    const sportEntries = Array.isArray(body.sportEntries) ? body.sportEntries : normalizeSportEntries(existing.sport_entries);

    const updatedResult = await pool.query(
      `UPDATE event_requests
       SET title = $1,
           description = $2,
           banner_path = $3,
           start_date = $4,
           end_date = $5,
           start_time = $6,
           end_time = $7,
           preparation_start_time = $8,
           handover_time = $9,
           notes = $10,
           main_gym_selected = $11,
           selected_courts = $12,
           sport_entries = $13,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $14 AND creator_id = $15
       RETURNING *`,
      [title, description, bannerPath, startDate, endDate, startTime, endTime, preparationStartTime, handoverTime, notes, mainGymSelected, selectedCourts, JSON.stringify(sportEntries), requestId, userId]
    );

    res.json({ message: 'Request updated successfully', request: buildRequestPayload(updatedResult.rows[0]) });
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ message: 'Failed to update request', error: error.message });
  }
};

export const cancelRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.userId;
    const role = req.user.role;
    if (!allowedRequestRoles.includes(role)) {
      return res.status(403).json({ message: 'Only PSU, games captains, and admins can cancel event requests.' });
    }
    const result = await pool.query('UPDATE event_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND creator_id = $3 AND status = $4 RETURNING *', ['cancelled', requestId, userId, 'pending']);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pending request not found' });
    }

    res.json({ message: 'Request cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling request:', error);
    res.status(500).json({ message: 'Failed to cancel request', error: error.message });
  }
};

export const approveRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body || {};
    const requestResult = await pool.query('SELECT * FROM event_requests WHERE id = $1', [requestId]);

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const request = requestResult.rows[0];
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending requests can be approved' });
    }

    const eventResult = await pool.query(
      `INSERT INTO events (
        item_type, title, description, banner_path, start_date, end_date, start_time, end_time,
        preparation_start_time, handover_time, notes, main_gym_selected, selected_courts, status, creator_id, request_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING id`,
      [request.request_type, request.title, request.description, request.banner_path, request.start_date, request.end_date, request.start_time, request.end_time, request.preparation_start_time, request.handover_time, request.notes, request.main_gym_selected, request.selected_courts || [], 'approved', request.creator_id, request.id]
    );

    const createdEventId = eventResult.rows[0].id;
    if (request.request_type === 'tournament') {
      const sportEntries = normalizeSportEntries(request.sport_entries);
      for (const entry of sportEntries) {
        await pool.query(
          `INSERT INTO tournament_sports (tournament_id, sport_name, sport_date, start_time, end_time, court_name, game_banner, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [createdEventId, entry.sportName || entry.sport || null, entry.date || null, entry.startTime || null, entry.endTime || null, entry.court || null, entry.gameBanner || null, entry.notes || null]
        );
      }
    }

    await reserveCourtsForEvent(normalizeSelectedCourts(request.selected_courts), request.main_gym_selected, request.request_type, normalizeSportEntries(request.sport_entries));

    await pool.query(
      `UPDATE event_requests
       SET status = 'approved', review_message = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [reason || 'Approved by admin', req.user.userId, requestId]
    );

    res.json({ message: 'Request approved successfully', eventId: createdEventId });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ message: 'Failed to approve request', error: error.message });
  }
};

export const rejectRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body || {};
    const result = await pool.query(
      `UPDATE event_requests
       SET status = 'rejected', review_message = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND status = 'pending'
       RETURNING *`,
      [reason || 'Rejected by admin', req.user.userId, requestId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pending request not found' });
    }

    res.json({ message: 'Request rejected successfully' });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ message: 'Failed to reject request', error: error.message });
  }
};

const reserveCourtsForEvent = async (selectedCourts = [], mainGymSelected = false, requestType = 'event', sportEntries = []) => {
  const courtsResult = await pool.query(
    `SELECT id, name, location,
            CASE WHEN LOWER(COALESCE(location, '')) LIKE '%indoor%' OR name ILIKE '%main gym%' THEN true ELSE false END AS is_indoor
     FROM courts
     ORDER BY name ASC`
  );

  const selectedIds = Array.isArray(selectedCourts) ? selectedCourts : [];
  const courtNameValues = (sportEntries || []).map((entry) => entry?.court).filter((value) => typeof value === 'string' && value.trim());
  const courtNameSet = new Set(courtNameValues.map((value) => value.toLowerCase().trim()));
  const courtIds = expandCourtSelection(selectedIds, mainGymSelected, courtsResult.rows);
  const courtNameMatches = courtsResult.rows
    .filter((court) => courtNameSet.has(String(court.name || '').toLowerCase().trim()))
    .map((court) => Number(court.id))
    .filter((id) => !Number.isNaN(id));

  const uniqueCourtIds = [...new Set([...courtIds, ...courtNameMatches])].filter((id) => id);
  for (const courtId of uniqueCourtIds) {
    await pool.query(
      `INSERT INTO court_status (court_id, status, reason, updated_by)
       VALUES ($1, 'reserved', 'Reserved for approved event', null)`,
      [courtId]
    );
  }
};
