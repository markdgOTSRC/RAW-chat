// Cloudflare Pages Function — POST /api/chat
//
// This runs server-side only. The browser never sees ANTHROPIC_API_KEY.
// Set it in Cloudflare Pages → Settings → Environment variables (as a
// "Secret", not plain text) before deploying.

const SYSTEM_PROMPT =
  "You are a helpful, direct, and warm conversational assistant.";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1024;

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.ANTHROPIC_API_KEY) {
    return json(
      { error: "Server is missing ANTHROPIC_API_KEY. Set it in Cloudflare Pages env vars." },
      500
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return json({ error: "No messages provided." }, 400);
  }

  // Basic shape validation + size guard, so a malformed or huge payload
  // can't be forwarded straight through to the API.
  const cleaned = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-40) // keep the last 40 turns — plenty for a chat, caps cost
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));

  if (cleaned.length === 0) {
    return json({ error: "No valid messages provided." }, 400);
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: cleaned,
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      const message = data?.error?.message || `Anthropic API error (${upstream.status}).`;
      return json({ error: message }, upstream.status);
    }

    const reply = (data.content || [])
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    return json({ reply: reply || "(empty response)" }, 200);
  } catch (err) {
    return json({ error: "Failed to reach Anthropic API. Try again in a moment." }, 502);
  }
}

// Reject anything that isn't a POST to keep the surface area small.
export async function onRequestGet() {
  return json({ error: "Use POST." }, 405);
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}
