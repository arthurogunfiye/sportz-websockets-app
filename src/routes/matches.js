import { Router } from 'express';
import {
  createMatchSchema,
  listMatchesQuerySchema,
  MATCH_STATUS
} from '../validation/matches.js';
import { db } from '../db/db.js';
import { matches } from '../db/schema.js';
import { getMatchStatus } from '../utils/match-status.js';
import { desc } from 'drizzle-orm';

export const matchRouter = Router();

const MAX_LIMIT = 100;

matchRouter.get('/', async (req, res) => {
  const parsedData = listMatchesQuerySchema.safeParse(req.query);

  if (!parsedData.success) {
    console.error('Invalid query: ', parsedData.error.issues);
    return res.status(400).json({
      error: 'Invalid query'
    });
  }

  const limit = Math.min(parsedData.data.limit ?? 50, MAX_LIMIT);

  try {
    const data = await db
      .select()
      .from(matches)
      .orderBy(desc(matches.createdAt))
      .limit(limit);

    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to list matches'
    });
  }
});

matchRouter.post('/', async (req, res) => {
  const parsedData = createMatchSchema.safeParse(req.body);

  if (!parsedData.success) {
    console.error('Invalid query: ', parsedData.error.issues);
    return res.status(400).json({
      error: 'Invalid payload'
    });
  }

  const {
    data: { startTime, endTime, homeScore, awayScore }
  } = parsedData;

  try {
    const [event] = await db
      .insert(matches)
      .values({
        ...parsedData.data,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        homeScore: homeScore ?? 0,
        awayScore: awayScore ?? 0,
        status: getMatchStatus(startTime, endTime) ?? MATCH_STATUS.SCHEDULED
      })
      .returning();

    res.status(201).json({
      data: event
    });
  } catch (error) {
    console.error('Failed to create match: ', error);
    res.status(500).json({
      error: 'Failed to create match'
    });
  }
});
