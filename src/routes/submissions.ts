import { Router, Request, Response } from 'express';
import { saveSubmission, getSubmissionById, listSubmissions } from '../db/submissions.js';
import { sendSubmissionEmail } from '../services/mailer.js';

export const submissionsRouter = Router();

/**
 * Main POST endpoint to receive submission data.
 * The payload fields can be anything - they will be preserved and saved to SQLite,
 * then formatted into an email notification.
 */
submissionsRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body;

    // Basic validation: ensure body is a non-empty object
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) || Object.keys(payload).length === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid request body. Expected a non-empty JSON object with your submission fields.',
      });
      return;
    }

    // 1. Save data to SQLite database
    const savedSubmission = saveSubmission(payload);

    // 2. Send email notification (configured via .env)
    const emailResult = await sendSubmissionEmail(savedSubmission);

    // 3. Return response to client
    res.status(201).json({
      success: true,
      message: 'Submission received and saved successfully.',
      submission: {
        id: savedSubmission.id,
        createdAt: savedSubmission.createdAt,
        payload: savedSubmission.payload,
      },
      email: {
        sent: emailResult.success,
        skipped: emailResult.skipped ?? false,
        ...(emailResult.messageId ? { messageId: emailResult.messageId } : {}),
        ...(emailResult.error ? { notice: emailResult.error } : {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[Submissions Router Error]', error);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * Optional helper: Retrieve a specific submission by ID
 */
submissionsRouter.get('/:id', (req: Request, res: Response): void => {
  const idRaw = req.params.id;
  const idStr = Array.isArray(idRaw) ? idRaw[0] : idRaw;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    res.status(400).json({ success: false, error: 'ID must be an integer' });
    return;
  }

  const submission = getSubmissionById(id);
  if (!submission) {
    res.status(404).json({ success: false, error: `Submission with ID ${id} not found` });
    return;
  }

  res.json({ success: true, submission });
});

/**
 * Optional helper: List recent submissions
 */
submissionsRouter.get('/', (req: Request, res: Response): void => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const submissions = listSubmissions(isNaN(limit) ? 50 : limit);

  res.json({
    success: true,
    count: submissions.length,
    submissions,
  });
});
