import { desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db/db.js';
import { commentary, matches } from '../db/schema.js';
import {
  createCommentarySchema,
  listCommentaryQuerySchema
} from '../validation/commentary.js';
import { matchIdParamSchema } from '../validation/matches.js';

export const commentaryRouter = Router({ mergeParams: true });

commentaryRouter.get('/', async (req, res) => {
  const paramsResult = matchIdParamSchema.safeParse(req.params);

  if (!paramsResult.success) {
    return res
      .status(400)
      .json({ error: 'Invalid match id', details: paramsResult.error.issues });
  }

  const queryResult = listCommentaryQuerySchema.safeParse(req.query);

  if (!queryResult.success) {
    return res.status(400).json({
      error: 'Invalid commentary query',
      details: queryResult.error.issues
    });
  }

  const limit = queryResult.data.limit ?? 100;

  try {
    const results = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, paramsResult.data.id))
      .orderBy(desc(commentary.createdAt))
      .limit(limit);

    res.status(200).json({ data: results });
  } catch (error) {
    console.error('Failed to fetch commentary: ', error);
    res.status(500).json({ error: 'Failed to fetch commentary' });
  }
});

commentaryRouter.post('/', async (req, res) => {
  const paramsResult = matchIdParamSchema.safeParse(req.params);

  if (!paramsResult.success) {
    return res
      .status(400)
      .json({ error: 'Invalid match id', details: paramsResult.error.issues });
  }

  const bodyResult = createCommentarySchema.safeParse(req.body);

  if (!bodyResult.success) {
    return res.status(400).json({
      error: 'Invalid commentary payload',
      details: bodyResult.error.issues
    });
  }

  try {
    // Wrap in transaction with explicit lock to prevent race condition
    const result = await db.transaction(async txn => {
      const [matchExists] = await txn
        .select()
        .from(matches)
        .where(eq(matches.id, paramsResult.data.id))
        .for('update')
        .limit(1);

      if (!matchExists) {
        throw new Error('MATCH_NOT_FOUND');
      }

      const { minute, ...rest } = bodyResult.data;

      const [createdCommentary] = await txn
        .insert(commentary)
        .values({
          matchId: paramsResult.data.id,
          minute,
          ...rest
        })
        .returning();

      return createdCommentary;
    });

    if (res.app.locals.broadcastCommentary && result) {
      res.app.locals.broadcastCommentary(result.matchId, result);
    }

    res.status(201).json({ data: result });
  } catch (error) {
    // Handle match not found (custom error from transaction)
    if (error.message === 'MATCH_NOT_FOUND') {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Handle foreign key constraint violations (edge case fallback)
    if (error.code === '23503') {
      return res.status(404).json({ error: 'Match not found' });
    }

    console.error('Failed to create commentary: ', error);
    res.status(500).json({ error: 'Failed to create commentary' });
  }
});
