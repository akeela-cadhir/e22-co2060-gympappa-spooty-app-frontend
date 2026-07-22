import express from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import {
  getEventMeta,
  listApprovedEvents,
  getEventById,
  createEventRequest,
  listMyRequests,
  listAllRequests,
  updateRequest,
  cancelRequest,
  approveRequest,
  rejectRequest,
} from '../controllers/eventController.js';

const router = express.Router();

router.get('/meta', authenticateToken, getEventMeta);
router.get('/approved', authenticateToken, listApprovedEvents);
router.post('/requests', authenticateToken, createEventRequest);
router.get('/requests/me', authenticateToken, listMyRequests);
router.get('/requests', authenticateToken, authorizeRole(['admin']), listAllRequests);
router.put('/requests/:requestId', authenticateToken, updateRequest);
router.delete('/requests/:requestId', authenticateToken, cancelRequest);
router.post('/requests/:requestId/approve', authenticateToken, authorizeRole(['admin']), approveRequest);
router.post('/requests/:requestId/reject', authenticateToken, authorizeRole(['admin']), rejectRequest);
router.get('/:eventId', authenticateToken, getEventById);

export default router;
