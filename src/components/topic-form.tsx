"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { MAX_TOPIC_LENGTH, MIN_TOPIC_LENGTH } from "@/lib/case/topic";
import { useMe } from "@/lib/client/me";

import { Button } from "./ui";

const EXAMPLES = ["The Rosetta Stone", "The Antikythera mechanism", "The discovery of penicillin", "The Great Moon Hoax of 1835"];

export function TopicForm() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [error, setError] = useState<string | null>(null);
  const me = useMe();
  const freeLeft = me.status === "ready" ? Math.max(0, me.me.topicCases.free - me.me.topicCases.created) : null;

  function start(value: string) {
    const trimmed = value.trim();
    if (trimmed.length < MIN_TOPIC_LENGTH || trimmed.length > MAX_TOPIC_LENGTH) {
      setError(`Use ${MIN_TOPIC_LENGTH} to ${MAX_TOPIC_LENGTH} characters.`);
      return;
    }
    router.push(`/new?topic=${encodeURIComponent(trimmed)}`);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    start(topic);
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3" noValidate>
      <label htmlFor="topic" className="text-sm font-semibold">
        Topic
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="topic"
          name="topic"
          value={topic}
          onChange={(e) => {
            setTopic(e.target.value);
            setError(null);
          }}
          maxLength={MAX_TOPIC_LENGTH}
          placeholder="e.g. How was Neptune discovered?"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "topic-error" : undefined}
          className="min-h-11 flex-1 rounded-card border border-border bg-bg px-3 text-base"
        />
        <Button type="submit">Build the case</Button>
      </div>
      {error && (
        <p id="topic-error" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2" aria-label="Example topics">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => start(example)}
            className="rounded-full border border-border bg-surface-muted px-3 py-1.5 text-sm hover:border-accent"
          >
            {example}
          </button>
        ))}
      </div>
      {freeLeft !== null && (
        <p className="text-xs text-muted">
          {freeLeft > 0
            ? "Your first new case on any topic is free. Topics someone already opened are always free."
            : "You've used your free new topic case. Unlimited topic cases come with Plus; topics someone already opened stay free."}
        </p>
      )}
    </form>
  );
}
