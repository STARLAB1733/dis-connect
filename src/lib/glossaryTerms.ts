/**
 * Plain-language definitions for technical terms that appear in scenario text.
 *
 * Content convention: scenario JSON text fields mark a term by wrapping it in
 * double brackets, e.g. "run a [[load test]] before launch". The GlossaryText
 * component parses those markers and renders a tap-to-define chip.
 *
 * Keys are lower-case; lookup is case-insensitive. Definitions must be one
 * short sentence a 15-year-old with no CS background can understand.
 */
export const GLOSSARY: Record<string, string> = {
  serverless: 'A way of hosting where you only pay when someone actually uses the app — it switches itself on and off.',
  'load test': 'A rehearsal where you simulate thousands of users at once to check the app can cope.',
  'api spec': 'A written agreement on how two pieces of software will talk to each other.',
  cdn: 'Copies of your content stored all around the region so pages load fast for everyone nearby.',
  pipeline: 'An automatic assembly line that moves data or code through a series of steps.',
  backend: 'The behind-the-scenes part of an app that stores data and does the heavy lifting.',
};

/** Case-insensitive glossary lookup. Returns undefined if the term is unknown. */
export function lookupGlossary(term: string): string | undefined {
  return GLOSSARY[term.trim().toLowerCase()];
}
