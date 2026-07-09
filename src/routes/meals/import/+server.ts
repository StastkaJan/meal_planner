import { json, error } from '@sveltejs/kit';
import { findRecipeNode, parseRecipeJsonLd } from '$lib/server/meals';
import type { RequestHandler } from './$types';

// Pull every <script type="application/ld+json"> block out of an HTML string.
function extractJsonLd(html: string): unknown[] {
  const docs: unknown[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try { docs.push(JSON.parse(m[1].trim())); } catch { /* skip malformed block */ }
  }
  return docs;
}

// Basic SSRF guard: only public http(s) URLs. ponytail: hostname-literal check only — does
// not defend against DNS rebinding; fine for a personal tool, revisit if exposed publicly.
function isPublicHttpUrl(raw: string): boolean {
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h === '0.0.0.0' || h === '::1' || h === '[::1]') return false;
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
  return true;
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Not authenticated');
  const { url, text } = await request.json();

  let docs: unknown[] = [];
  if (typeof text === 'string' && text.trim()) {
    // pasted JSON-LD, or raw HTML source
    try { docs = [JSON.parse(text)]; } catch { docs = extractJsonLd(text); }
  } else if (typeof url === 'string' && url) {
    if (!isPublicHttpUrl(url)) error(400, 'Enter a public http(s) recipe URL');
    let res: Response;
    try {
      res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (meal-plan recipe import)' } });
    } catch {
      error(502, 'Could not fetch that URL');
    }
    if (!res.ok) error(502, `Fetch failed (${res.status})`);
    docs = extractJsonLd(await res.text());
  } else {
    error(400, 'Provide a url or text');
  }

  const recipe = findRecipeNode(docs);
  if (!recipe) error(422, "Couldn't find recipe data on that page");
  return json(parseRecipeJsonLd(recipe));
};
