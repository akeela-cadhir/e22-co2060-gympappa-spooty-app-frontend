import test from 'node:test';
import assert from 'node:assert/strict';
import { expandCourtSelection, normalizeEventRequestPayload } from '../utils/eventUtils.js';

test('expandCourtSelection reserves indoor courts when Main Gym is selected', () => {
  const courts = [
    { id: 1, name: 'Main Gymnasium Hall', location: 'Main Gymnasium Hall', is_indoor: true },
    { id: 2, name: 'Badminton Court', location: 'Indoor Gymnasium', is_indoor: true },
    { id: 3, name: 'Basketball Court', location: 'Indoor Gymnasium', is_indoor: true },
    { id: 4, name: 'Football Field', location: 'Outdoor', is_indoor: false },
  ];

  const result = expandCourtSelection([4], true, courts);
  assert.deepEqual(result, [1, 2, 3, 4]);
});

test('expandCourtSelection keeps only explicitly chosen courts when Main Gym is not selected', () => {
  const courts = [
    { id: 1, name: 'Main Gymnasium Hall', location: 'Main Gymnasium Hall', is_indoor: true },
    { id: 2, name: 'Badminton Court', location: 'Indoor Gymnasium', is_indoor: true },
    { id: 3, name: 'Basketball Court', location: 'Indoor Gymnasium', is_indoor: true },
    { id: 4, name: 'Football Field', location: 'Outdoor', is_indoor: false },
  ];

  const result = expandCourtSelection([2, 4], false, courts);
  assert.deepEqual(result, [2, 4]);
});

test('normalizeEventRequestPayload converts form payloads into the backend shape', () => {
  const payload = normalizeEventRequestPayload({
    requestType: 'tournament',
    title: 'Campus Cup',
    description: 'Annual games',
    selectedCourts: '[2,4]',
    sportEntries: '[{"sportName":"Football","date":"2026-08-01"}]',
    mainGymSelected: true,
  });

  assert.equal(payload.type, 'tournament');
  assert.deepEqual(payload.selectedCourts, [2, 4]);
  assert.deepEqual(payload.sportEntries, [{ sportName: 'Football', date: '2026-08-01' }]);
  assert.equal(payload.mainGymSelected, true);
});
