const parseJsonArray = (value) => {
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

const parseDateTimeValue = (dateValue, timeValue) => {
  if (!dateValue) return null;
  const date = String(dateValue).trim();
  if (!date) return null;
  const [year, month, day] = date.split('-').map((value) => Number(value));
  if ([year, month, day].some((value) => Number.isNaN(value))) return null;
  const time = typeof timeValue === 'string' && timeValue.trim() ? timeValue.trim() : '23:59';
  const [hours, minutes] = time.split(':').map((value) => Number(value));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return new Date(year, month - 1, day, hours, minutes, 0);
};

export const isEventExpired = (event = {}, now = new Date()) => {
  const startDate = event.startDate || event.start_date;
  const endDate = event.endDate || event.end_date;
  const startTime = event.startTime || event.start_time;
  const endTime = event.endTime || event.end_time;
  const start = parseDateTimeValue(startDate, startTime);
  const end = parseDateTimeValue(endDate || startDate, endTime || startTime || '23:59');

  if (!start && !end) return false;
  const reference = end || start;
  if (!reference) return false;

  return now.getTime() > reference.getTime();
};

export const normalizeEventRequestPayload = (body = {}) => {
  const type = String(body.type || body.requestType || 'event').trim().toLowerCase();

  return {
    type,
    title: String(body.title || body.tournamentName || '').trim(),
    description: String(body.description || '').trim(),
    bannerPath: body.bannerPath || body.banner || '',
    startDate: body.startDate || body.start_date || null,
    endDate: body.endDate || body.end_date || null,
    startTime: body.startTime || body.start_time || null,
    endTime: body.endTime || body.end_time || null,
    preparationStartTime: body.preparationStartTime || body.preparation_start_time || null,
    handoverTime: body.handoverTime || body.handover_time || null,
    notes: body.notes || '',
    selectedCourts: parseJsonArray(body.selectedCourts).map((item) => Number(item)).filter((item) => !Number.isNaN(item)),
    mainGymSelected: Boolean(body.mainGymSelected),
    sportEntries: parseJsonArray(body.sportEntries),
  };
};

export const expandCourtSelection = (selectedCourtIds = [], includeMainGym = false, courts = []) => {
  const selectedIds = Array.isArray(selectedCourtIds) ? selectedCourtIds : [];
  const normalizedIds = selectedIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id));
  const uniqueIds = [...new Set(normalizedIds)];

  if (!includeMainGym) return uniqueIds;

  const indoorCourtIds = courts
    .filter((court) => court?.is_indoor || court?.location?.toLowerCase().includes('indoor'))
    .map((court) => Number(court.id))
    .filter((id) => !Number.isNaN(id));

  return [...new Set([...indoorCourtIds, ...uniqueIds])];
};
