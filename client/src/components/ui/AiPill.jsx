import React from "react";

/** Marks an AI friend next to its name, so nobody mistakes it for a person. */
export default function AiPill({ className = "" }) {
  return (
    <span
      title="AI friend"
      className={[
        "inline-flex flex-none items-center rounded-full border border-accent/30 bg-accent-soft px-1.5 text-meta font-semibold text-accent-text",
        className,
      ].join(" ")}
    >
      AI<span className="sr-only"> friend</span>
    </span>
  );
}
