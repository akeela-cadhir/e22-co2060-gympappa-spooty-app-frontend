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
