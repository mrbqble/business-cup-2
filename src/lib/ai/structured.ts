import "server-only";

import { z } from "zod";

import { AiOutputError } from "./errors";
import type { AiClient, AiRequest, AiResult } from "./types";

export interface StructuredResult<T> {
  value: T;
  /** Every model call made, including a repair attempt. */
  calls: AiResult[];
}

/** Asks for JSON matching `schema`; one repair attempt on invalid output, then `AiOutputError`. */
export async function generateObject<T>(
  client: AiClient,
  request: Omit<AiRequest, "outputSchema">,
  schema: z.ZodType<T>,
): Promise<StructuredResult<T>> {
  const first = await client.complete({ ...request, outputSchema: schema });
  const parsed = parseOutput(first.output, schema);
  if (parsed.ok) return { value: parsed.value, calls: [first] };

  const retry = await client.complete({
    ...request,
    outputSchema: schema,
    prompt: `${request.prompt}\n\nYour previous answer could not be used (${parsed.error}). Previous answer:\n${first.output}\n\nAnswer again with corrected JSON only.`,
  });
  const reparsed = parseOutput(retry.output, schema);
  if (reparsed.ok) return { value: reparsed.value, calls: [first, retry] };
  throw new AiOutputError(`Model output failed validation twice: ${reparsed.error}`);
}

function parseOutput<T>(text: string, schema: z.ZodType<T>): { ok: true; value: T } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "the answer was not valid JSON" };
  }
  const result = schema.safeParse(json);
  return result.success ? { ok: true, value: result.data } : { ok: false, error: z.prettifyError(result.error) };
}
