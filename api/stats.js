const STORE_KEY = "vetaltas:analytics:v1";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function redisCommand(command) {
  const config = redisConfig();
  if (!config) return null;
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!response.ok) throw new Error(`Redis command failed: ${response.status}`);
  return response.json();
}

function parseEvent(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function summarize(events) {
  const sessions = new Map();
  const pages = new Map();
  let pageViews = 0;
  let activeSeconds = 0;
  let latest = null;

  for (const event of events) {
    if (!event) continue;
    const timestamp = event.received_at || event.page_view?.timestamp || event.session?.last_active_time;
    if (timestamp && (!latest || timestamp > latest)) latest = timestamp;

    if (event.session && event.session.session_id) {
      sessions.set(event.session.session_id, event.session);
      activeSeconds = Math.max(activeSeconds, Number(event.session.active_duration_seconds || 0));
    }

    if (event.page_view) {
      pageViews += 1;
      const path = event.page_view.page_path || "/";
      const current = pages.get(path) || { path, title: event.page_view.page_title || path, views: 0 };
      current.views += 1;
      current.title = event.page_view.page_title || current.title;
      pages.set(path, current);
    }
  }

  const topPages = Array.from(pages.values()).sort((a, b) => b.views - a.views).slice(0, 20);
  return {
    storage: redisConfig() ? "connected" : "not_configured",
    total_events: events.length,
    sessions: sessions.size,
    page_views: pageViews,
    active_seconds: activeSeconds,
    latest_event_at: latest,
    top_pages: topPages,
  };
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    let events = [];
    if (redisConfig()) {
      const data = await redisCommand(["LRANGE", STORE_KEY, 0, 4999]);
      events = (data && Array.isArray(data.result) ? data.result : []).map(parseEvent).filter(Boolean);
    }

    return res.status(200).json({ ok: true, ...summarize(events) });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || "Could not read stats" });
  }
};
