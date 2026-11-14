import { z } from "zod";

import { AiAllProvidersFailedError, AiRefusalError, AiTimeoutError, getSafetyAi } from "@/lib/ai";
import { GenerationError, type GenerationEvent } from "@/lib/case/generate";
import { checkTopicRules, checkTopicSafety } from "@/lib/case/safety";
import { createCase } from "@/lib/case/service";
import { MAX_TOPIC_LENGTH, normalizeTopic } from "@/lib/case/topic";
import { countTopicCasesCreatedBy, findTopicCase } from "@/lib/db/cases";
import { jsonError, NO_STORE, readJson, unauthorized } from "@/lib/http";
import { canCreateTopicCase } from "@/lib/player/entitlements";
import { authenticate } from "@/lib/player/service";
import { clientIp, createRateLimiter, tooManyRequests } from "@/lib/rate-limit";

/** Drafting plus up to two repair rounds can take a few minutes on long sources. */
export const maxDuration = 300;

const body = z.object({ topic: z.string().max(MAX_TOPIC_LENGTH * 2) });
const limiter = createRateLimiter({ limit: 3, windowMs: 60 * 60 * 1000 });

export type GenerateEvent =
  | ({ type: "progress" } & GenerationEvent)
  | { type: "done"; slug: string }
  | { type: "refused"; message: string; retryable: boolean }
  | { type: "failed"; message: string; retryable: boolean };

/**
 * Streams NDJSON: progress events while the case is built, then exactly one of done, refused or failed.
 * A topic that already has a case returns it at once, free and without using the rate limit.
 */
export async function POST(request: Request): Promise<Response> {
  const player = await authenticate(request);
  if (!player) return unauthorized();

  const parsed = body.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(400, "invalid_request", "Send { topic }.");
  const topic = parsed.data.topic.trim();

  const rules = checkTopicRules(topic);
  if (!rules.allowed) return jsonError(422, "topic_refused", rules.reason);

  const cached = await findTopicCase(normalizeTopic(topic));
  if (cached) return ndjson([{ type: "done", slug: cached.slug }]);

  if (!canCreateTopicCase(await countTopicCasesCreatedBy(player.id))) {
    return jsonError(
      403,
      "topic_limit",
      "You've used your free case on a topic. Unlimited topic cases come with Plus. Today's case is always free.",
    );
  }

  const decision = limiter.check(clientIp(request.headers));
  if (!decision.allowed) return tooManyRequests(decision);

  return ndjson(async (send) => {
    const verdict = await checkTopicSafety(topic, getSafetyAi());
    if (!verdict.allowed) return send({ type: "refused", message: verdict.reason, retryable: verdict.retryable });

    try {
      const record = await createCase({
        topic,
        kind: "topic",
        createdBy: player.id,
        onEvent: (event) => send({ type: "progress", ...event }),
      });
      send({ type: "done", slug: record.slug });
    } catch (error) {
      // A simultaneous request for the same topic may have stored it first.
      const existing = await findTopicCase(normalizeTopic(topic)).catch(() => null);
      if (existing) return send({ type: "done", slug: existing.slug });
      console.error("case generation failed", { topic, error });
      send({ type: "failed", ...failureMessage(error) });
    }
  });
}

function failureMessage(error: unknown): { message: string; retryable: boolean } {
  if (error instanceof GenerationError && error.reason === "no_sources") {
    return { message: "We couldn't find enough on Wikipedia about this topic. Try naming it differently.", retryable: false };
  }
  if (error instanceof GenerationError) {
    return { message: "We couldn't verify every quote for this topic, so we didn't publish the case. Try again or pick another topic.", retryable: true };
  }
  if (error instanceof AiRefusalError) {
    return { message: "This topic can't be turned into a case. Try another one.", retryable: false };
  }
  if (error instanceof AiAllProvidersFailedError || error instanceof AiTimeoutError) {
    return { message: "The case writer is busy right now. Please try again in a minute.", retryable: true };
  }
  return { message: "Something went wrong while building the case. Please try again.", retryable: true };
}

type Send = (event: GenerateEvent) => void;

function ndjson(events: GenerateEvent[] | ((send: Send) => Promise<void>)): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send: Send = (event) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        if (Array.isArray(events)) events.forEach(send);
        else await events(send);
      } catch (error) {
        console.error("case generation stream failed", error);
        send({ type: "failed", message: "Something went wrong while building the case. Please try again.", retryable: true });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { ...NO_STORE, "Content-Type": "application/x-ndjson; charset=utf-8" } });
}
