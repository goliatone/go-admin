// Syntax highlighting utilities using Prism.js
// Provides SQL and JSON highlighting with Catppuccin Mocha theme

import Prism from 'prismjs';
import 'prismjs/components/prism-sql.js';
import 'prismjs/components/prism-json.js';

// SQL formatting/pretty-printing helper
const SQL_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
  'ON', 'AS', 'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'INSERT', 'INTO',
  'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX',
  'UNIQUE', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'NOT', 'NULL', 'DEFAULT',
  'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'IN', 'EXISTS', 'BETWEEN', 'LIKE',
  'IS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'UNION', 'ALL', 'ASC', 'DESC', 'WITH',
  'RETURNING', 'COALESCE', 'NULLIF', 'CAST', 'OVER', 'PARTITION', 'ROW_NUMBER', 'RANK',
]);

const NEWLINE_BEFORE = new Set([
  'FROM', 'WHERE', 'AND', 'OR', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
  'ORDER', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'SET', 'VALUES', 'RETURNING',
  'UNION', 'WITH',
]);

const INDENT_KEYWORDS = new Set(['AND', 'OR']);

/**
 * Pretty-print SQL query with proper indentation
 */
export function formatSQL(sql: string): string {
  if (!sql || typeof sql !== 'string') {
    return '';
  }

  // Normalize whitespace
  let formatted = sql.replace(/\s+/g, ' ').trim();

  // Tokenize while preserving strings and identifiers
  const tokens: string[] = [];
  let current = '';
  let inString = false;
  let stringChar = '';
  let inIdentifier = false;

  for (let i = 0; i < formatted.length; i++) {
    const char = formatted[i];

    if (inString) {
      current += char;
      if (char === stringChar && formatted[i - 1] !== '\\') {
        tokens.push(current);
        current = '';
        inString = false;
      }
    } else if (inIdentifier) {
      current += char;
      if (char === '"') {
        tokens.push(current);
        current = '';
        inIdentifier = false;
      }
    } else if (char === "'" || char === '"') {
      if (current.trim()) {
        tokens.push(current);
        current = '';
      }
      current = char;
      if (char === "'") {
        inString = true;
        stringChar = char;
      } else {
        inIdentifier = true;
      }
    } else if (char === ',' || char === '(' || char === ')') {
      if (current.trim()) {
        tokens.push(current);
        current = '';
      }
      tokens.push(char);
    } else if (char === ' ') {
      if (current.trim()) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    tokens.push(current);
  }

  // Rebuild with proper formatting
  const lines: string[] = [];
  let currentLine = '';
  let indent = 0;
  let parenDepth = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const upperToken = token.toUpperCase();

    if (token === '(') {
      parenDepth++;
      currentLine += token;
    } else if (token === ')') {
      parenDepth--;
      currentLine += token;
    } else if (token === ',') {
      currentLine += token;
    } else if (parenDepth === 0 && NEWLINE_BEFORE.has(upperToken)) {
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }
      const indentStr = INDENT_KEYWORDS.has(upperToken) ? '  ' : '';
      currentLine = indentStr + token;
    } else {
      if (currentLine && !currentLine.endsWith('(') && !currentLine.endsWith(',')) {
        currentLine += ' ';
      }
      currentLine += token;
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  return lines.join('\n');
}

/**
 * Highlight SQL query using Prism
 */
export function highlightSQL(sql: string, prettyPrint = false): string {
  if (!sql || typeof sql !== 'string') {
    return '';
  }

  const source = prettyPrint ? formatSQL(sql) : sql;
  return Prism.highlight(source, Prism.languages.sql, 'sql');
}

/**
 * Highlight JSON using Prism
 */
export function highlightJSON(data: unknown, prettyPrint = true): string {
  let json: string;

  if (typeof data === 'string') {
    // Try to parse and re-format if it's a JSON string
    try {
      const parsed = JSON.parse(data);
      json = prettyPrint ? JSON.stringify(parsed, null, 2) : data;
    } catch {
      json = data;
    }
  } else {
    try {
      json = JSON.stringify(data, null, prettyPrint ? 2 : 0);
    } catch {
      json = String(data ?? '');
    }
  }

  return Prism.highlight(json, Prism.languages.json, 'json');
}

/**
 * CSS styles for Prism syntax highlighting with Catppuccin Mocha theme
 */
export const prismStyles = `
  /* Prism Catppuccin Mocha Theme */
  .token.comment,
  .token.prolog,
  .token.doctype,
  .token.cdata {
    color: #6c7086;
    font-style: italic;
  }

  .token.punctuation {
    color: #9399b2;
  }

  .token.namespace {
    opacity: 0.7;
  }

  .token.property,
  .token.tag,
  .token.boolean,
  .token.number,
  .token.constant,
  .token.symbol {
    color: #fab387;
  }

  .token.selector,
  .token.attr-name,
  .token.string,
  .token.char,
  .token.builtin {
    color: #a6e3a1;
  }

  .token.operator,
  .token.entity,
  .token.url,
  .language-css .token.string,
  .style .token.string,
  .token.variable {
    color: #89dceb;
  }

  .token.atrule,
  .token.attr-value,
  .token.function {
    color: #f9e2af;
  }

  .token.keyword {
    color: #cba6f7;
    font-weight: 600;
  }

  .token.regex,
  .token.important {
    color: #fab387;
  }

  .token.important,
  .token.bold {
    font-weight: bold;
  }

  .token.italic {
    font-style: italic;
  }

  .token.entity {
    cursor: help;
  }

  .token.deleted {
    color: #f38ba8;
  }

  .token.inserted {
    color: #a6e3a1;
  }
`;

/**
 * CSS styles for expandable SQL rows
 */
export const expandableRowStyles = `
  /* Expandable row styles */
  .expandable-row {
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .expandable-row:hover {
    background: rgba(137, 180, 250, 0.08) !important;
  }

  .expandable-row .expand-icon {
    display: inline-block;
    width: 14px;
    height: 14px;
    margin-right: 4px;
    transition: transform 0.2s ease;
    opacity: 0.6;
  }

  .expandable-row:hover .expand-icon {
    opacity: 1;
  }

  .expandable-row.expanded .expand-icon {
    transform: rotate(90deg);
  }

  .expanded-content {
    display: none;
    background: #181825;
    border: 1px solid #313244;
    border-radius: 4px;
    margin: 8px 0;
    padding: 12px;
    overflow-x: auto;
  }

  .expanded-content pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.6;
    font-size: 12px;
  }

  .expandable-row.expanded + tr .expanded-content {
    display: block;
  }

  /* Row with expanded content */
  .expansion-row {
    background: transparent !important;
  }

  .expansion-row:hover {
    background: transparent !important;
  }

  .expansion-row td {
    padding: 0;
    border: none;
  }
`;
