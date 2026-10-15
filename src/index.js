/**
 * Public entry point for substring-search-highlighter.
 *
 * Re-exports the core API so callers import from a single path:
 *   import { Highlighter, highlight, findMatches } from "substring-search-highlighter";
 */
export { Highlighter, highlight, findMatches, escapeHtml } from "./core.js";
