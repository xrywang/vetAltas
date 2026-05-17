const STORE_KEY = "vetaltas:analytics:v1";
const MAX_EVENTS = 5000;

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
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

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 256 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function cleanEvent(event) {
  const now = new Date().toISOString();
  const type = event && typeof event.type === "string" ? event.type : "unknown";
  return {
    type,
    received_at: now,
    session: event && event.session ? event.session : null,
    page_view: event && event.page_view ? event.page_view : null,
  };
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const raw = await readBody(req);
    const event = cleanEvent(JSON.parse(raw || "{}"));
    const serialized = JSON.stringify(event);
    const hasStorage = Boolean(redisConfig());

    if (hasStorage) {
      await redisCommand(["LPUSH", STORE_KEY, serialized]);
      await redisCommand(["LTRIM", STORE_KEY, 0, MAX_EVENTS - 1]);
    }

    return res.status(200).json({ ok: true, stored: hasStorage });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message || "Invalid analytics payload" });
  }
};
