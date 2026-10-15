/**
 * Core substring search and highlighting logic.
 *
 * The library deliberately treats the needle as a LITERAL string, not a regex.
 * This is the central design decision: callers pass user-typed text and we
 * wrap every occurrence with marker tokens. Supporting regex would change the
 * escaping contract and complicate HTML mode (would we escape the match text
 * then, or the whole result?). One clear rule wins: the needle is what the user
 * typed, matched byte-for-byte.
 */

/**
 * Characters that are special inside HTML text content.
 *
 * We escape only the four characters that matter in text content: & < > and the
 * double-quote. Escaping single-quote is unnecessary for text content (it only
 * matters inside attribute values), and escaping it would inflate output for
 * no safety gain. The order matters: ampersand MUST come first, otherwise we'd
 * double-escape the entities we just produced.
 */
const HTML_ESCAPES = [
  ["&", "&amp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['"', "&quot;"],
];

/**
 * Escape a string for safe inclusion in HTML text content.
 * @param {string} s
 * @returns {string}
 */
export function escapeHtml(s) {
  let out = s;
  for (const [from, to] of HTML_ESCAPES) {
    out = out.split(from).join(to);
  }
  return out;
}

/**
 * Find all start indices of `needle` in `haystack`.
 *
 * Uses the naive O(n*m) scan. For a highlighting library the typical needle is
 * short and the typical haystack is a screen of text; the overhead of
 * KMP/Boyer-Moore is not worth the code complexity, and naive matching is
 * trivially correct for the overlapping-match question we answer below.
 *
 * Overlapping matches ARE returned (e.g. "aa" in "aaa" yields [0, 1]). This is
 * intentional: the caller decides how to render overlaps, and suppressing them
 * here would hide information. The highlighter in this module renders every
 * match independently, which means overlapping matches produce nested markers.
 * See the README for why that's acceptable.
 *
 * @param {string} haystack
 * @param {string} needle
 * @returns {number[]} start indices, ascending
 */
export function findMatches(haystack, needle) {
  if (typeof haystack !== "string" || typeof needle !== "string") {
    throw new TypeError("haystack and needle must be strings");
  }
  if (needle.length === 0) return [];

  const positions = [];
  // `<=` (not `<`) so that for needle length L we check the final valid start
  // index `haystack.length - L`.
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    let match = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        match = false;
        break;
      }
    }
    if (match) positions.push(i);
  }
  return positions;
}

/**
 * Default marker pair for ANSI terminals: bold on / bold off.
 */
const DEFAULT_MARKERS = { open: "\u001b[1m", close: "\u001b[22m" };

/**
 * A reusable highlighter with fixed markers and escaping mode.
 */
export class Highlighter {
  /**
   * @param {object} [opts]
   * @param {string} [opts.open]  Opening marker placed before each match.
   * @param {string} [opts.close] Closing marker placed after each match.
   * @param {boolean} [opts.html] When true, input text and the needle are HTML-escaped
   *   before highlighting so the output is safe to splice into an HTML document's text
   *   content. Off by default because most callers are formatting terminal output.
   */
  constructor(opts = {}) {
    this.open = opts.open ?? DEFAULT_MARKERS.open;
    this.close = opts.close ?? DEFAULT_MARKERS.close;
    this.html = Boolean(opts.html);
  }

  /**
   * Highlight every occurrence of `needle` in `text`.
   *
   * The algorithm builds the output by walking the input once, tracking how many
   * active matches cover the current position. A match opens at its start index
   * and closes after its last character. When multiple matches overlap, this
   * naturally produces nested markers, which every consumer we target (ANSI
   * terminals, basic HTML spans) handles correctly. Merging overlapping ranges
   * into a single span would be a different feature and is not implemented here.
   *
   * @param {string} text
   * @param {string} needle
   * @returns {string}
   */
  highlight(text, needle) {
    const positions = findMatches(text, needle);
    if (positions.length === 0) {
      return this.html ? escapeHtml(text) : text;
    }

    // delta[i] = net change in active-match count at position i.
    // We size to text.length + 1 because a match ending at the last character
    // closes at index text.length.
    const delta = new Array(text.length + 1).fill(0);
    for (const start of positions) {
      delta[start] += 1;
      delta[start + needle.length] -= 1;
    }

    let out = "";
    let active = 0;
    let buf = "";

    const flushBuf = () => {
      if (buf) {
        out += this.html ? escapeHtml(buf) : buf;
        buf = "";
      }
    };

    for (let i = 0; i < text.length; i++) {
      if (delta[i] !== 0) {
        const wasInside = active > 0;
        const willBeInside = active + delta[i] > 0;
        // A transition across the zero boundary requires a marker.
        if (!wasInside && willBeInside) {
          flushBuf();
          out += this.open;
        } else if (wasInside && !willBeInside) {
          flushBuf();
          out += this.close;
        }
        active += delta[i];
      }
      buf += text[i];
    }
    flushBuf();

    // If the final match ends exactly at the last character, delta[text.length]
    // carries a -1 that closes the span.
    if (delta[text.length] !== 0) {
      active += delta[text.length];
      if (active <= 0) out += this.close;
    }

    return out;
  }
}

/**
 * Convenience function: highlight with default settings in one call.
 *
 * @param {string} text
 * @param {string} needle
 * @param {object} [opts] Same options as the Highlighter constructor.
 * @returns {string}
 */
export function highlight(text, needle, opts = {}) {
  return new Highlighter(opts).highlight(text, needle);
}
