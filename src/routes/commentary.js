import { Router } from 'express';
import { desc, eq } from 'drizzle-orm';
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

  const MAX_LIMIT = 100;
  const limit = Math.min(queryResult.data.limit ?? MAX_LIMIT, MAX_LIMIT);

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
    const [matchExists] = await db
      .select()
      .from(matches)
      .where(eq(matches.id, paramsResult.data.id))
      .limit(1);

    if (!matchExists) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const { minute, ...rest } = bodyResult.data;
    const [result] = await db
      .insert(commentary)
      .values({
        matchId: paramsResult.data.id,
        minute,
        ...rest
      })
      .returning();

    res.status(201).json({ data: result });
  } catch (error) {
    console.error('Failed to create commentary: ', error);
    res.status(500).json({ error: 'Failed to create commentary' });
  }
});
