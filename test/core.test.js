import { test } from "node:test";
import assert from "node:assert/strict";

import {
  Highlighter,
  highlight,
  findMatches,
  escapeHtml,
} from "../src/core.js";

// --- findMatches -----------------------------------------------------------

test("findMatches returns [] for empty needle", () => {
  assert.deepEqual(findMatches("hello", ""), []);
});

test("findMatches returns [] when needle absent", () => {
  assert.deepEqual(findMatches("hello world", "xyz"), []);
});

test("findMatches finds non-overlapping occurrences", () => {
  assert.deepEqual(findMatches("ab ab ab", "ab"), [0, 3, 6]);
});

test("findMatches returns overlapping occurrences", () => {
  assert.deepEqual(findMatches("aaaa", "aa"), [0, 1, 2]);
});

test("findMatches handles needle at end", () => {
  assert.deepEqual(findMatches("hello", "lo"), [3]);
});

test("findMatches handles needle longer than haystack", () => {
  assert.deepEqual(findMatches("hi", "hello"), []);
});

test("findMatches treats matches case-sensitively", () => {
  assert.deepEqual(findMatches("aAaA", "a"), [0, 2]);
});

test("findMatches throws on non-string inputs", () => {
  assert.throws(() => findMatches("hi", 5), TypeError);
  assert.throws(() => findMatches(null, "x"), TypeError);
});

// --- escapeHtml ------------------------------------------------------------

test("escapeHtml escapes the four special characters", () => {
  assert.equal(escapeHtml("a<b>&c\"d"), "a&lt;b&gt;&amp;c&quot;d");
});

test("escapeHtml leaves safe text unchanged", () => {
  assert.equal(escapeHtml("plain text 123"), "plain text 123");
});

// --- Highlighter: plain (terminal) mode ------------------------------------

test("Highlighter wraps a single match with markers", () => {
  const h = new Highlighter({ open: "[", close: "]" });
  assert.equal(h.highlight("hello world", "world"), "hello [world]");
});

test("Highlighter wraps multiple non-overlapping matches", () => {
  const h = new Highlighter({ open: "[", close: "]" });
  assert.equal(h.highlight("ab ab ab", "ab"), "[ab] [ab] [ab]");
});

test("Highlighter handles no match by returning text unchanged", () => {
  const h = new Highlighter({ open: "[", close: "]" });
  assert.equal(h.highlight("hello", "xyz"), "hello");
});

test("Highlighter with empty needle returns text unchanged", () => {
  const h = new Highlighter({ open: "[", close: "]" });
  assert.equal(h.highlight("hello", ""), "hello");
});

test("Highlighter handles needle at start", () => {
  const h = new Highlighter({ open: "[", close: "]" });
  assert.equal(h.highlight("abc def", "abc"), "[abc] def");
});

test("Highlighter handles needle at end", () => {
  const h = new Highlighter({ open: "[", close: "]" });
  assert.equal(h.highlight("abc def", "def"), "abc [def]");
});

test("Highlighter handles whole-string match", () => {
  const h = new Highlighter({ open: "[", close: "]" });
  assert.equal(h.highlight("abc", "abc"), "[abc]");
});

// --- Overlapping matches ---------------------------------------------------

test("Highlighter produces nested markers for overlapping matches", () => {
  // "aaa" with needle "aa" matches at 0 and 1.
  // Position 0: open (active 0 -> 1)
  // Position 1: active 1 -> 2 (still inside, no marker)
  // Position 2: active 2 -> 1 (still inside, no marker)
  // Position 3: close (active 1 -> 0)
  const h = new Highlighter({ open: "[", close: "]" });
  assert.equal(h.highlight("aaa", "aa"), "[aaa]");
});

test("Highlighter nested markers for adjacent overlapping matches", () => {
  // "aabb" with "ab" has no overlap; just two separate matches.
  const h = new Highlighter({ open: "<", close: ">" });
  assert.equal(h.highlight("xabx", "ab"), "x<ab>x");
});

// --- HTML mode -------------------------------------------------------------

test("HTML mode escapes text outside matches", () => {
  const h = new Highlighter({ open: "<mark>", close: "</mark>", html: true });
  assert.equal(
    h.highlight("a < b & c", "x"),
    "a &lt; b &amp; c",
  );
});

test("HTML mode escapes text and wraps matches", () => {
  const h = new Highlighter({ open: "<mark>", close: "</mark>", html: true });
  assert.equal(
    h.highlight("a <find> b", "find"),
    "a &lt;<mark>find</mark>&gt; b",
  );
});

test("HTML mode escapes text even when needle contains special chars", () => {
  const h = new Highlighter({ open: "<mark>", close: "</mark>", html: true });
  assert.equal(
    h.highlight("x < y", "<"),
    "x <mark>&lt;</mark> y",
  );
});

// --- Defaults --------------------------------------------------------------

test("default markers are ANSI bold codes", () => {
  const out = highlight("hi there", "there");
  assert.equal(out, "hi \u001b[1mthere\u001b[22m");
});

test("convenience highlight() accepts opts", () => {
  const out = highlight("hi there", "there", { open: "(", close: ")" });
  assert.equal(out, "hi (there)");
});
