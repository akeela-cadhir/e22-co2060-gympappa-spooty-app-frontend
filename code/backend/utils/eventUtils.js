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
