// Only log diagnostics in development
export const debug = import.meta.env.DEV ? console.log.bind(console) : () => {}

// Safely handle JSONB values that may already be parsed arrays or still be JSON strings
export const safeArr = v => { if (Array.isArray(v)) return v; if (!v) return []; try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
