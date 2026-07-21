// src/lib/formula.ts
import type { FormulaToken } from '../types/formula';

// Renders the token list the way it will be evaluated/stored, e.g.
//   feeAmount * ( 1 + Company.riskRating / 100 )
export function tokensToExpression(tokens: FormulaToken[]): string {
  return tokens
    .map((t) => {
      if (t.kind === 'field') {
        return t.scope === 'cross' ? `${t.field.entityLabel}.${t.field.fieldId}` : t.field.fieldId;
      }
      if (t.kind === 'operator') return t.value;
      if (t.kind === 'number') return t.value;
      return t.value; // paren
    })
    .join(' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')');
}

// Distinct cross-entities referenced — surfaced as the formula's "Dependencies".
export function tokenDependencies(tokens: FormulaToken[]): string[] {
  const seen = new Set<string>();
  for (const t of tokens) {
    if (t.kind === 'field' && t.scope === 'cross') seen.add(t.field.entityLabel);
  }
  return Array.from(seen);
}

// Lightweight structural check — not a full parser, just enough to stop
// obviously-broken expressions (unbalanced parens, trailing operator, etc.)
export function validateTokens(tokens: FormulaToken[]): string | null {
  if (tokens.length === 0) return 'Add at least one field to the expression.';

  let depth = 0;
  for (const t of tokens) {
    if (t.kind === 'paren') depth += t.value === '(' ? 1 : -1;
    if (depth < 0) return 'Unbalanced parentheses.';
  }
  if (depth !== 0) return 'Unbalanced parentheses.';

  const last = tokens[tokens.length - 1];
  if (last.kind === 'operator') return 'Expression can\'t end with an operator.';
  if (last.kind === 'paren' && last.value === '(') return 'Expression can\'t end with an opening bracket.';

  return null;
}
