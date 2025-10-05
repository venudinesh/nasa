#!/usr/bin/env node
// Minimal Express mock server to support the frontend ChatBot during development.
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Simple on-disk session store (JSON) for embeddings and messages
import fs from 'fs';
import path from 'path';

// Use an absolute path so the server can be started from anywhere
const STORE_FILE = path.resolve(process.cwd(), 'server', 'session-store.json');
// Ensure directory exists
try {
  fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
} catch (e) {
  console.warn('Failed to ensure session store directory', e && e.message);
}

let STORE = {};
const loadStore = () => {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf8');
      const parsed = JSON.parse(raw || '{}');
      // Basic validation/sanitization: ensure top-level object with session keys
      if (parsed && typeof parsed === 'object') {
        for (const k of Object.keys(parsed)) {
          const v = parsed[k];
          if (!v || typeof v !== 'object') {
            parsed[k] = { assistant: [], embeddings: [] };
            continue;
          }
          if (!Array.isArray(v.assistant)) parsed[k].assistant = [];
          if (!Array.isArray(v.embeddings)) parsed[k].embeddings = [];
          // Normalize embeddings to arrays of numbers if possible, otherwise drop
          parsed[k].embeddings = parsed[k].embeddings.filter(e => Array.isArray(e) && e.every(n => typeof n === 'number'));
        }
        STORE = parsed;
      } else {
        STORE = {};
      }
    }
  } catch (e) {
    console.warn('Failed to load session store, starting empty', e && e.message);
    STORE = {};
  }
};

loadStore();

const saveStore = () => {
  try {
    const tmp = STORE_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(STORE, null, 2), { encoding: 'utf8' });
    fs.renameSync(tmp, STORE_FILE);
  } catch (e) {
    console.warn('Failed to save session store', e && e.message);
  }
};

const computeLocalEmbedding = (text, dim = 256) => {
  const vec = new Array(dim).fill(0);
  const tokens = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const hash = (s) => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
    return Math.abs(h);
  };
  for (const t of tokens) {
    const idx = hash(t) % dim;
    vec[idx] += 1;
  }
  const sumSq = vec.reduce((a, b) => a + b * b, 0) || 1;
  const norm = Math.sqrt(sumSq);
  return vec.map(v => v / norm);
};

const cosine = (a, b) => {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  const d = Math.sqrt(na) * Math.sqrt(nb) || 1; return dot / d;
};

// Deterministic small-thesaurus based rewrite helper
const djb2 = (s) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
  return Math.abs(h >>> 0);
};

const SYNONYMS = {
  'here': ['present', 'in this message'],
  'another': ['a different', 'an alternate'],
  'angle': ['perspective', 'viewpoint'],
  'detail': ['information', 'context'],
  'quick': ['brief', 'short'],
  'follow-up': ['update', 'note'],
  'help': ['assist', 'support'],
  'show': ['display', 'present'],
  'tell': ['explain', 'describe'],
  'how': ['in what way', 'how exactly']
};

const chooseSynonym = (word, seed) => {
  const arr = SYNONYMS[word.toLowerCase()];
  if (!arr || arr.length === 0) return null;
  return arr[seed % arr.length];
};

const rewriteDeterministic = (text) => {
  if (!text || typeof text !== 'string') return text;
  const seed = djb2(text);

  // split sentences but keep punctuation
  const sentences = text.match(/[^.!?]+[.!?]?/g) || [text];

  // helper to replace some words via SYNONYMS deterministically
  const replaceWords = (s, localSeed) => {
    return s.replace(/\b([A-Za-z\-']+)\b/g, (m) => {
      const syn = chooseSynonym(m, localSeed + djb2(m));
      return syn ? syn : m;
    });
  };

  // If multiple sentences, rotate them deterministically and apply word replacements
  if (sentences.length > 1) {
    const rotateBy = (seed % sentences.length) || 1;
    const rotated = sentences.slice(rotateBy).concat(sentences.slice(0, rotateBy));
    const transformed = rotated.map((s, i) => replaceWords(s.trim(), seed + i)).join(' ');
    return transformed.trim();
  }

  // Single sentence: try to split by commas/clauses and reorder deterministically
  const s = sentences[0].trim();
  const clauses = s.split(/,\s*/).filter(Boolean);
  if (clauses.length > 1) {
    const orderSeed = seed % clauses.length;
    const reordered = clauses.slice(orderSeed).concat(clauses.slice(0, orderSeed));
    return replaceWords(reordered.join(', ').trim(), seed);
  }

  // Very short messages: swap two words deterministically and prefix a short variant
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length <= 6 && words.length >= 2) {
    const w = words.slice();
    const i = seed % (w.length - 1);
    [w[i], w[i+1]] = [w[i+1], w[i]];
    const variants = ['Quick note:', 'Briefly:', 'In short:'];
    const prefix = variants[seed % variants.length];
    return `${prefix} ${w.join(' ')}`;
  }

  // Fallback: perform some synonym replacements across the sentence
  return replaceWords(s, seed);
};

// Offline-only server: embeddings and rewrites are deterministic local implementations

// Offline rewrite: fallback deterministic behavior implemented directly in the /api/rewrite endpoint

app.get('/api/advanced-chat/suggestions', (req, res) => {
  res.json({ data: { suggestions: [
    'Show me potentially habitable planets',
    'What are the hottest exoplanets?',
    'Which planets are closest to Earth?'
  ] } });
});

// POST will stream chunks for demonstration if ?stream=1
app.post('/api/advanced-chat/message', (req, res) => {
  const { message } = req.body || {};
  const lower = (message || '').toLowerCase();

  if (req.query.stream === '1') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    const parts = [];
    if (lower.includes('habitable')) {
      parts.push('Here are a few potentially habitable exoplanets:\n');
      parts.push('• Kepler-452b — super-Earth in the habitable zone\n');
      parts.push('• TRAPPIST-1e — Earth-size, part of a compact system\n');
      parts.push('• K2-18b — water vapor detected in the atmosphere\n');
    } else {
      parts.push(`I heard: "${message}"\n`);
      parts.push('I can help with planet data, mission info, and comparisons.\n');
    }

    let i = 0;
    const iv = setInterval(() => {
      if (i >= parts.length) {
        clearInterval(iv);
        res.end();
        return;
      }
      res.write(parts[i]);
      i += 1;
    }, 450);
    return;
  }

  // non-streaming fallback
  res.json({ data: { response: `Echo: ${message}` } });
});

// Simple deterministic embeddings endpoint for local testing
app.post('/api/embeddings', (req, res) => {
  const { input } = req.body || {};
  const text = (Array.isArray(input) ? input.join(' ') : input || '').toString();
  const dim = 256;
  const vec = new Array(dim).fill(0);
  const tokens = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const hash = (s) => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
    return Math.abs(h);
  };
  for (const t of tokens) {
    const idx = hash(t) % dim;
    vec[idx] += 1;
  }
  const sumSq = vec.reduce((a, b) => a + b * b, 0) || 1;
  const norm = Math.sqrt(sumSq);
  const embedding = vec.map(v => v / norm);
  res.json({ data: { embedding } });
});

// Server-side message processing: compute embedding, check session history for duplicates,
// possibly rewrite response, persist assistant message and embedding for session.
app.post('/api/process-message', (req, res) => {
  const { sessionId, message } = req.body || {};
  if (!sessionId || !message) return res.status(400).json({ error: 'sessionId and message required' });

  // compute embedding for the incoming assistant response potential
  const assistantCandidate = `Echo: ${message}`; // in real server this would be actual LLM output
  const emb = computeLocalEmbedding(assistantCandidate);

  // ensure session exists
  if (!STORE[sessionId]) STORE[sessionId] = { assistant: [], embeddings: [] };

  // check similarity against stored embeddings
  const sims = STORE[sessionId].embeddings.map(e => cosine(e, emb));
  const maxSim = sims.length ? Math.max(...sims) : 0;
  const threshold = 0.86;

  let finalReply = assistantCandidate;
  if (maxSim >= threshold) {
    // rewrite using deterministic helper
    finalReply = rewriteDeterministic(assistantCandidate);
  }

  // persist assistant reply and embedding
  STORE[sessionId].assistant.push({ id: `a_${Date.now()}`, content: finalReply, ts: Date.now() });
  STORE[sessionId].embeddings.push(emb);
  // keep only recent 200 embeddings to bound storage
  if (STORE[sessionId].embeddings.length > 200) STORE[sessionId].embeddings = STORE[sessionId].embeddings.slice(-200);
  saveStore();

  res.json({ data: { reply: finalReply, maxSim } });
});

// Admin/debug endpoints (local use only)
app.get('/api/admin/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
  const entry = STORE[sessionId];
  if (!entry) return res.status(404).json({ error: 'session not found' });
  // return limited view (no raw embeddings unless explicitly requested)
  const limited = {
    assistant: entry.assistant || [],
    embeddingsCount: Array.isArray(entry.embeddings) ? entry.embeddings.length : 0
  };
  res.json({ data: limited });
});

app.delete('/api/admin/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
  if (STORE[sessionId]) {
    delete STORE[sessionId];
    saveStore();
    return res.json({ data: { deleted: true } });
  }
  res.status(404).json({ error: 'session not found' });
});

// POST /api/rewrite - attempts to rewrite text via provider; falls back to a very simple transform
app.post('/api/rewrite', async (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text is required' });
  // Offline rewrite: simple deterministic rephrase
  const rewritten = rewriteDeterministic(text);
  res.json({ data: { rewrite: rewritten } });
});

app.listen(PORT, () => {
  console.log(`Mock chat server listening on http://localhost:${PORT}`);
});
