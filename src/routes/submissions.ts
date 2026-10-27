import { Router, Request, Response } from 'express';
import {
  saveSubmission,
  getSubmissionById,
  listSubmissions,
  normalizeSubmissionInput,
} from '../db/submissions.js';
import { sendSubmissionEmail } from '../services/mailer.js';

export const submissionsRouter = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Main POST endpoint to receive submission data.
 * Expected fields:
 * - first name (firstName / first_name)
 * - last name  (lastName / last_name)
 * - email address (email / emailAddress / email_address)
 * - company
 * - country
 * - phone number (phoneNumber / phone_number / phone)
 * - notes
 */
submissionsRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawBody = req.body;

    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody) || Object.keys(rawBody).length === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid request body. Expected a non-empty JSON object.',
      });
      return;
    }

    const input = normalizeSubmissionInput(rawBody);

    // Validation
    const errors: string[] = [];
    if (!input.firstName) {
      errors.push('first name is required');
    }
    if (!input.lastName) {
      errors.push('last name is required');
    }
    if (!input.email) {
      errors.push('email address is required');
    } else if (!EMAIL_REGEX.test(input.email)) {
      errors.push('email address must be a valid email format');
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
      return;
    }

    // 1. Save data to SQLite database
    const savedSubmission = saveSubmission(input);

    // 2. Send email notification (configured via .env)
    const emailResult = await sendSubmissionEmail(savedSubmission);

    // 3. Return response to client
    res.status(201).json({
      success: true,
      message: 'Submission received and saved successfully.',
      submission: savedSubmission,
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
 * Helper: Retrieve a specific submission by ID
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
 * Helper: List recent submissions
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
