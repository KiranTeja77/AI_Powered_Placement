import { z } from 'zod'

// Zod would otherwise probe whether eval is allowed (new Function) when it builds each schema, to
// pre-compile the fast path. The Content-Security-Policy forbids eval, so the probe would be
// reported as a violation on every page load. Skipping it costs nothing noticeable here.
//
// Schemas are created while modules load, so this file is imported first in main.tsx.
z.config({ jitless: true })
