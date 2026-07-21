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
