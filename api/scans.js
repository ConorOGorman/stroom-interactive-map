const MAX_EVENTS = 60;
const DEFAULT_SESSION = 'default';

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') return await handleGet(req, res);
    if (req.method === 'POST') return await handlePost(req, res);
  } catch (error) {
    return res.status(500).json({ error: 'Scan relay is not available' });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};

async function handleGet(req, res) {
  const session = cleanSession(req.query?.session);
  const since = Number(req.query?.since || 0);
  const events = await readEvents(session);
  const freshEvents = events.filter((event) => event.ts > since);

  return res.status(200).json({
    now: Date.now(),
    events: freshEvents,
  });
}

async function handlePost(req, res) {
  if (process.env.RELAY_SECRET) {
    const secret = req.headers['x-reader-secret'];
    if (secret !== process.env.RELAY_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const cardId = cleanCardId(body.cardId || body.card_id || body.card);
  const session = cleanSession(body.session);

  if (!cardId) {
    return res.status(400).json({ error: 'Missing cardId' });
  }

  const event = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    cardId,
    ts: Date.now(),
  };

  await writeEvent(session, event);
  return res.status(200).json({ ok: true, event });
}

async function readEvents(session) {
  ensureRedis();
  const response = await redisCommand(['LRANGE', keyFor(session), '0', '-1']);
  const rawEvents = Array.isArray(response.result) ? response.result : [];
  return rawEvents
    .map((item) => {
      try {
        return JSON.parse(item);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

async function writeEvent(session, event) {
  ensureRedis();
  const key = keyFor(session);
  await redisPipeline([
    ['RPUSH', key, JSON.stringify(event)],
    ['LTRIM', key, String(-MAX_EVENTS), '-1'],
    ['EXPIRE', key, '3600'],
  ]);
}

async function redisCommand(command) {
  const response = await fetch(redisUrl(), {
    method: 'POST',
    headers: redisHeaders(),
    body: JSON.stringify(command),
  });
  if (!response.ok) throw new Error('Redis command failed');
  return response.json();
}

async function redisPipeline(commands) {
  const response = await fetch(`${redisUrl()}/pipeline`, {
    method: 'POST',
    headers: redisHeaders(),
    body: JSON.stringify(commands),
  });
  if (!response.ok) throw new Error('Redis pipeline failed');
  return response.json();
}

function redisHeaders() {
  return {
    Authorization: `Bearer ${redisToken()}`,
    'Content-Type': 'application/json',
  };
}

function ensureRedis() {
  if (!redisUrl() || !redisToken()) {
    throw new Error('Cloud scan relay is not configured');
  }
}

function redisUrl() {
  return process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
}

function redisToken() {
  return process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
}

function keyFor(session) {
  return `stroom:scans:${session}`;
}

function cleanSession(value) {
  return String(value || DEFAULT_SESSION).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40) || DEFAULT_SESSION;
}

function cleanCardId(value) {
  return String(value || '').trim().slice(0, 40);
}
