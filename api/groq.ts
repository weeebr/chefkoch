const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

/**
 * Edge proxy to Groq (no @vercel/node — Node serverless was returning FUNCTION_INVOCATION_FAILED).
 * Client POST body is forwarded as raw text (same JSON as OpenAI chat completions).
 */
export const config = {
  runtime: "edge",
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: { message: "Method not allowed" } });
  }

  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return jsonResponse(401, { error: { message: "Missing Authorization header" } });
  }

  const payload = await request.text();
  if (!payload.trim()) {
    return jsonResponse(400, {
      error: { message: "Request body missing (expected JSON)." },
    });
  }

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: payload,
    });

    const text = await groqRes.text();
    const ct =
      groqRes.headers.get("content-type")?.split(";")[0]?.trim() || "application/json";

    return new Response(text, {
      status: groqRes.status,
      headers: {
        ...corsHeaders,
        "Content-Type": ct,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Proxy error";
    return jsonResponse(502, { error: { message: msg } });
  }
}
