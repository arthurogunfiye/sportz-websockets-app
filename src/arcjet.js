import arcjet, { detectBot, shield, slidingWindow } from '@arcjet/node';

const arcjetKey = process.env.ARCJET_KEY;
const arcjetMode = process.env.ARCJET_MODE === 'DRY_RUN' ? 'DRY_RUN' : 'LIVE';

if (!arcjetKey) throw new Error('ARCJET_KEY environment variable is missing');

export const httpArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      rules: [
        shield({ mode: arcjetMode }),
        detectBot({
          mode: arcjetMode,
          allow: [
            'CATEGORY:SEARCH_ENGINE',
            'CATEGORY:PREVIEW',
            'POSTMAN',
            'CURL'
          ]
        }),
        slidingWindow({
          mode: arcjetMode,
          interval: '10s',
          max: 50
        })
      ]
    })
  : null;

export const wsArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      rules: [
        shield({ mode: arcjetMode }),
        detectBot({
          mode: arcjetMode,
          allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW']
        }),
        slidingWindow({
          mode: arcjetMode,
          interval: '2s',
          max: 5
        })
      ]
    })
  : null;

export function securityMiddleware() {
  return async (req, res, next) => {
    if (!httpArcjet) return next();

    try {
      const decision = await httpArcjet.protect(req);

      if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
          res.writeHead(429, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Too Many Requests' }));
        } else if (decision.reason.isBot()) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'No bots allowed' }));
        } else {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Forbidden' }));
        }
      }
    } catch (error) {
      console.error('Arcjet middleware error', error);
      return res.status(503).json({ error: 'Service Unavailable' });
    }

    next();
  };
}
