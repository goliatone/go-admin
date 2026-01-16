import 'prismjs/components/prism-sql.js';
import 'prismjs/components/prism-json.js';
/**
 * Pretty-print SQL query with proper indentation
 */
export declare function formatSQL(sql: string): string;
/**
 * Highlight SQL query using Prism
 */
export declare function highlightSQL(sql: string, prettyPrint?: boolean): string;
/**
 * Highlight JSON using Prism
 */
export declare function highlightJSON(data: unknown, prettyPrint?: boolean): string;
/**
 * CSS styles for Prism syntax highlighting with Catppuccin Mocha theme
 */
export declare const prismStyles = "\n  /* Prism Catppuccin Mocha Theme */\n  .token.comment,\n  .token.prolog,\n  .token.doctype,\n  .token.cdata {\n    color: #6c7086;\n    font-style: italic;\n  }\n\n  .token.punctuation {\n    color: #9399b2;\n  }\n\n  .token.namespace {\n    opacity: 0.7;\n  }\n\n  .token.property,\n  .token.tag,\n  .token.boolean,\n  .token.number,\n  .token.constant,\n  .token.symbol {\n    color: #fab387;\n  }\n\n  .token.selector,\n  .token.attr-name,\n  .token.string,\n  .token.char,\n  .token.builtin {\n    color: #a6e3a1;\n  }\n\n  .token.operator,\n  .token.entity,\n  .token.url,\n  .language-css .token.string,\n  .style .token.string,\n  .token.variable {\n    color: #89dceb;\n  }\n\n  .token.atrule,\n  .token.attr-value,\n  .token.function {\n    color: #f9e2af;\n  }\n\n  .token.keyword {\n    color: #cba6f7;\n    font-weight: 600;\n  }\n\n  .token.regex,\n  .token.important {\n    color: #fab387;\n  }\n\n  .token.important,\n  .token.bold {\n    font-weight: bold;\n  }\n\n  .token.italic {\n    font-style: italic;\n  }\n\n  .token.entity {\n    cursor: help;\n  }\n\n  .token.deleted {\n    color: #f38ba8;\n  }\n\n  .token.inserted {\n    color: #a6e3a1;\n  }\n";
/**
 * CSS styles for expandable SQL rows
 */
export declare const expandableRowStyles = "\n  /* Expandable row styles */\n  .expandable-row {\n    cursor: pointer;\n    transition: background 0.15s ease;\n  }\n\n  .expandable-row:hover {\n    background: rgba(137, 180, 250, 0.08) !important;\n  }\n\n  .expandable-row .expand-icon {\n    display: inline-block;\n    width: 14px;\n    height: 14px;\n    margin-right: 4px;\n    transition: transform 0.2s ease;\n    opacity: 0.6;\n  }\n\n  .expandable-row:hover .expand-icon {\n    opacity: 1;\n  }\n\n  .expandable-row.expanded .expand-icon {\n    transform: rotate(90deg);\n  }\n\n  .expanded-content {\n    display: none;\n    background: #181825;\n    border: 1px solid #313244;\n    border-radius: 4px;\n    margin: 8px 0;\n    padding: 12px;\n    overflow-x: auto;\n  }\n\n  .expanded-content pre {\n    margin: 0;\n    white-space: pre-wrap;\n    word-break: break-word;\n    line-height: 1.6;\n    font-size: 12px;\n  }\n\n  .expandable-row.expanded + tr .expanded-content {\n    display: block;\n  }\n\n  /* Row with expanded content */\n  .expansion-row {\n    background: transparent !important;\n  }\n\n  .expansion-row:hover {\n    background: transparent !important;\n  }\n\n  .expansion-row td {\n    padding: 0;\n    border: none;\n  }\n";
//# sourceMappingURL=syntax-highlight.d.ts.map