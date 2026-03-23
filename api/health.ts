/** Sanity check for Edge deployment (no @vercel/node). */
export const config = {
  runtime: "edge",
};

export default function handler(_request: Request): Response {
  return new Response(
    JSON.stringify({ ok: true, runtime: "edge", route: "api/health" }),
    {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    },
  );
}
