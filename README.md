# substring-search-highlighter

Finds substring matches in text and wraps them with specified marker tokens for terminal or HTML display.

```js
import { Highlighter, highlight, findMatches } from "substring-search-highlighter";

// One-shot, default ANSI bold markers:
highlight("hello world", "world");
// "hello \u001b[1mworld\u001b[22m"

// Reusable instance with custom markers and HTML escaping:
const h = new Highlighter({ open: "<mark>", close: "</mark>", html: true });
h.highlight("a <find> b", "find");
// "a &lt;<mark>find</mark>&gt; b"

// Raw match positions, no highlighting:
findMatches("ab ab ab", "ab"); // [0, 3, 6]
```

## Why this exists

CLI tools and small web views often need to show a user which part of a string matched their search. Bringing in a full templating or virtual-dom library for that is overkill, but hand-rolling escaping is error-prone. This library does one thing: find literal substrings and wrap them with markers, optionally HTML-escaping the surrounding text so the result is safe to splice into a document.

The needle is treated as a **literal string**, never a regex. If you need pattern matching, run the regex yourself and pass the matched substring here. Mixing the two contracts in one API is how escaping bugs happen.

## Edge cases you will hit

- **Overlapping matches** (e.g. needle `"aa"` in `"aaa"`) are all reported by `findMatches` as `[0, 1]`. When highlighted, overlapping ranges collapse into a single surrounding marker pair rather than emitting nested markers, because the highlighter only opens/closes at the zero boundary. This is a deliberate simplification: if you need distinct nested spans for overlaps, post-process the positions yourself.
- **HTML mode** escapes `&`, `<`, `>`, and `"` in the text content. It does not escape `'` (unnecessary in text content) and it does not sanitize the `open`/`close` markers you supply — those are trusted caller input, not user text.
- **Empty needle** returns the text unchanged (no matches, no markers). Matching the empty string at every position would produce nonsense output.
- Matching is **case-sensitive**. Lower-case your inputs first if you want case-insensitive highlighting.

## API

`new Highlighter(opts)` — `opts.open`, `opts.close` (marker strings, default ANSI bold on/off), `opts.html` (boolean, default `false`).

`highlighter.highlight(text, needle)` → `string`

`highlight(text, needle, opts)` — convenience wrapper that constructs a `Highlighter` and calls it once.

`findMatches(haystack, needle)` → `number[]` of ascending start indices, including overlapping ones. `[]` for empty needle.

`escapeHtml(s)` → `string`, exported for callers who want the same escaping used internally.

## Running the tests

```sh
node --test
```
