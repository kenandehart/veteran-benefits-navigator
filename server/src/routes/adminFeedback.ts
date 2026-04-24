// Compatibility shim — the /admin router in admin.ts holds the real
// handlers and auth middleware. This file stays so tests/adminFeedback.test.ts
// and its `app.use('/admin/feedback', adminFeedbackRouter)` mount keep
// working without modification. index.ts does NOT import this file; the
// consolidated admin router is mounted at /admin there.

import { Router } from 'express';
import { adminAuth, feedbackHandler } from './admin.js';

const router = Router();
router.get('/', adminAuth, feedbackHandler);

export default router;
