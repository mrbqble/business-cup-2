export const NO_STORE = { "Cache-Control": "no-store" } as const;

export function jsonError(status: number, error: string, message: string): Response {
  return Response.json({ error, message }, { status, headers: NO_STORE });
}

/** The request carried no valid player token; the client recovers by creating a new player. */
export function unauthorized(): Response {
  return jsonError(401, "no_player", "Reload the page to start playing.");
}

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

/** Parses a JSON request body, returning null when it is missing or malformed. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
