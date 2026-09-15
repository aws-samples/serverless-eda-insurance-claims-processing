// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
"use client";

/**
 * App Router error boundary. Renders the actual error message + stack in plain
 * text so client-side crashes are legible (the dev overlay minifies them).
 * Also console.errors with a clear marker for log capture.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // eslint-disable-next-line no-console
  console.error("[APP ERROR]", error?.message, error?.stack);
  return (
    <html lang="en">
      <body style={{ fontFamily: "monospace", padding: 24 }}>
        <h2 style={{ color: "#c00" }}>Application error</h2>
        <p>
          <strong>Message:</strong> {error?.message ?? "(none)"}
        </p>
        {error?.digest ? (
          <p>
            <strong>Digest:</strong> {error.digest}
          </p>
        ) : null}
        <pre
          style={{
            whiteSpace: "pre-wrap",
            background: "#f5f5f5",
            padding: 12,
            border: "1px solid #ddd",
            maxHeight: 400,
            overflow: "auto",
          }}
        >
          {error?.stack ?? "(no stack)"}
        </pre>
        <button onClick={() => reset()} style={{ marginTop: 12, padding: "8px 16px" }}>
          Try again
        </button>
      </body>
    </html>
  );
}
