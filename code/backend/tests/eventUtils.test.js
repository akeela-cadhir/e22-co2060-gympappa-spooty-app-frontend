import test from 'node:test';
import assert from 'node:assert/strict';
import { expandCourtSelection } from '../utils/eventUtils.js';

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
