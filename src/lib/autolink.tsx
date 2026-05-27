import React from "react";

const URL_RE = /(https?:\/\/[^\s<>"'(){}[\]]+)/g;

/**
 * Render plain text with URLs converted to clickable links.
 * Safe — links open in new tab, rel=noopener noreferrer.
 */
export function autolink(text: string): React.ReactNode[] {
  if (!text) return [];
  const out: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((match = URL_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push(text.slice(lastIndex, match.index));
    }
    const url = match[1];
    out.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all underline"
        style={{ color: "var(--brand-600, #7c3aed)" }}
      >
        {url}
      </a>,
    );
    lastIndex = match.index + url.length;
  }
  if (lastIndex < text.length) out.push(text.slice(lastIndex));
  return out;
}

export function AutoLinkText({ text }: { text: string }) {
  return <span className="whitespace-pre-wrap break-words">{autolink(text)}</span>;
}
