// src/lib/formula.ts
import type { FormulaToken } from '../types/formula';

// Renders tokens the way they're stored/evaluated, e.g.
//   imports + Grey Market.grey_imports
export function tokensToExpression(tokens: FormulaToken[]): string {
  return tokens
    .map((t) => {
      if (t.kind === 'field') {
        return t.scope === 'cross' && t.field.entityLabel
          ? `${t.field.entityLabel}.${t.field.fieldId}`
          : t.field.fieldId;
      }
      return t.value; // operator or number (parens are operator tokens too)
    })
    .join(' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')');
}

// Type is automatically derived: if ANY inserted field came from a Cross
// entity, the whole formula counts as Cross — otherwise it's Self.
export function deriveFormulaType(tokens: FormulaToken[]): 'self' | 'cross' {
  return tokens.some((t) => t.kind === 'field' && t.scope === 'cross') ? 'cross' : 'self';
}

// ---- Expression Editor (raw text) helpers ---------------------------------
// A raw expression looks like:
//   $ADNOC.diesel.TMP-001.imports + $ENOC.diesel.TMP-004.imports
// Any $EntityCode reference that isn't the base/self entity makes the whole
// formula 'cross', same rule as the visual builder.
const ENTITY_REF_RE = /\$([A-Za-z0-9_]+)\.([A-Za-z0-9_.]+)/g;

export function deriveFormulaTypeFromExpression(expression: string, selfEntityCode?: string): 'self' | 'cross' {
  const refs = [...expression.matchAll(ENTITY_REF_RE)];
  if (!selfEntityCode) return refs.length > 0 ? 'cross' : 'self';
  return refs.some((m) => m[1].toUpperCase() !== selfEntityCode.toUpperCase()) ? 'cross' : 'self';
}

// ---- tokenizer ----
// Splits a raw expression into refs ($a.b.c.d), numbers, parens and
// operators. Returns null if it hits a character/shape it can't make sense
// of (e.g. a still-being-typed $ref, or a stray symbol).
type ExprTok = { type: 'ref' | 'number' | 'op' | 'lparen' | 'rparen'; text: string };

const REF_RE = /^\$[A-Za-z0-9_]+(?:\.[A-Za-z0-9_-]+)*/;
const NUM_RE = /^\d+(\.\d+)?/;
// Longest-match-first so '>=' wins over '>', etc.
const OPS = ['>=', '<=', '==', '!=', 'AND', 'OR', '+', '-', '*', '/', '>', '<'];

function tokenizeExpression(src: string): ExprTok[] | null {
  const toks: ExprTok[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === ' ' || ch === '\t' || ch === '\n') { i++; continue; }
    if (ch === '(') { toks.push({ type: 'lparen', text: '(' }); i++; continue; }
    if (ch === ')') { toks.push({ type: 'rparen', text: ')' }); i++; continue; }
    if (ch === '$') {
      const m = REF_RE.exec(src.slice(i));
      if (!m) return null; // '$' not followed by a valid entity token
      toks.push({ type: 'ref', text: m[0] });
      i += m[0].length;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      const m = NUM_RE.exec(src.slice(i));
      toks.push({ type: 'number', text: m![0] });
      i += m![0].length;
      continue;
    }
    const opMatch = OPS.find((op) => {
      if (!src.startsWith(op, i)) return false;
      // word operators (AND/OR) need a boundary after them
      if (/^[A-Z]/.test(op)) {
        const after = src[i + op.length];
        return after === undefined || !/[A-Za-z0-9_]/.test(after);
      }
      return true;
    });
    if (opMatch) { toks.push({ type: 'op', text: opMatch }); i += opMatch.length; continue; }
    return null; // unrecognised character
  }
  return toks;
}

// Full structural + operator-placement check for the free-typed expression:
//  - every $ref must be a complete $entity.product.template.field path
//  - parentheses must balance
//  - an operator must sit between two values — never at the start, the end,
//    or back-to-back with another operator
export function validateExpressionString(expression: string): string | null {
  const trimmed = expression.trim();
  if (!trimmed) return 'Write an expression, e.g. $ADNOC.diesel.TMP-001.imports + $ENOC.diesel.TMP-004.imports.';

  const tokens = tokenizeExpression(trimmed);
  if (!tokens || tokens.length === 0) {
    return 'Finish the reference — expected $entity.product.template.field.';
  }

  let depth = 0;
  let expectValue = true; // true = next token must be a value (ref/number/lparen); false = operator/rparen

  for (const t of tokens) {
    if (t.type === 'ref' && t.text.slice(1).split('.').length !== 4) {
      return `Finish the reference "${t.text}" — expected $entity.product.template.field.`;
    }
    if (t.type === 'lparen') {
      if (!expectValue) return 'Add an operator before "(".';
      depth++;
      continue;
    }
    if (t.type === 'rparen') {
      if (expectValue) return 'Add a value before ")".';
      depth--;
      if (depth < 0) return 'Unbalanced parentheses.';
      continue;
    }
    if (t.type === 'ref' || t.type === 'number') {
      if (!expectValue) return `Add an operator before "${t.text}".`;
      expectValue = false;
      continue;
    }
    // operator
    if (expectValue) return `Operator "${t.text}" needs a field or value before it.`;
    expectValue = true;
  }

  if (depth !== 0) return 'Unbalanced parentheses.';
  if (expectValue) return "Expression can't end with an operator.";
  return null;
}

// Lightweight structural check — enough to catch unbalanced parens / a
// trailing operator, not a full expression parser.
export function validateTokens(tokens: FormulaToken[]): string | null {
  if (tokens.length === 0) return 'Add at least one field to the expression.';

  let depth = 0;
  for (const t of tokens) {
    if (t.kind === 'operator' && t.value === '(') depth++;
    if (t.kind === 'operator' && t.value === ')') depth--;
    if (depth < 0) return 'Unbalanced parentheses.';
  }
  if (depth !== 0) return 'Unbalanced parentheses.';

  const last = tokens[tokens.length - 1];
  if (last.kind === 'operator' && last.value !== ')') return "Expression can't end with an operator.";

  return null;
}
