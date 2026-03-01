/**
 * eslint-plugin-irlwork
 *
 * Custom ESLint rules to prevent UI/UX drift in the irlwork codebase.
 * Enforces usage of shared components (Card, Button) and consistent
 * copy style (sentence case, no exclamation marks, no emoji).
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the raw string value from a JSXAttribute's value node.
 * Handles Literal ("...") and JSXExpressionContainer with a Literal inside.
 */
function getClassNameValue(attrNode) {
  if (!attrNode || !attrNode.value) return null;
  if (attrNode.value.type === 'Literal') return attrNode.value.value;
  if (
    attrNode.value.type === 'JSXExpressionContainer' &&
    attrNode.value.expression.type === 'TemplateLiteral'
  ) {
    // Flatten template literal quasis
    return attrNode.value.expression.quasis.map((q) => q.value.raw).join('');
  }
  if (
    attrNode.value.type === 'JSXExpressionContainer' &&
    attrNode.value.expression.type === 'Literal'
  ) {
    return attrNode.value.expression.value;
  }
  return null;
}

/**
 * Get the className attribute node from a JSXOpeningElement.
 */
function getClassNameAttr(node) {
  return (
    node.attributes &&
    node.attributes.find(
      (a) => a.type === 'JSXAttribute' && a.name && a.name.name === 'className'
    )
  );
}

/**
 * Return the element name string from a JSXOpeningElement.
 */
function getElementName(node) {
  if (node.name && node.name.type === 'JSXIdentifier') return node.name.name;
  return null;
}

// Emoji regex: matches most common emoji ranges (Unicode emoji blocks).
// Covers emoticons, dingbats, symbols, supplemental symbols, flags, etc.
const EMOJI_REGEX =
  /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/u;

// Title-case allow-list — acronyms and proper nouns that are always uppercase.
const TITLE_CASE_ALLOWLIST = new Set([
  'API',
  'URL',
  'AI',
  'CTA',
  'MCP',
  'USDC',
  'USD',
  'FAQ',
  'OAuth',
  'SSO',
  'ID',
  'UI',
  'UX',
  'R2',
  'CSV',
  'PDF',
  'HTML',
  'CSS',
  'JS',
  'SDK',
]);

// Multi-word allow-list phrases that are conventionally Title Case.
const TITLE_CASE_PHRASES = [
  'Privacy Policy',
  'Terms of Service',
  'Terms and Conditions',
  'Stripe Connect',
  'Stripe Dashboard',
  'Google Maps',
];

/**
 * Check whether a text string contains 3+ consecutive Title Case words
 * (ignoring allow-listed acronyms and phrases).
 */
function hasTitleCaseViolation(text) {
  if (!text || typeof text !== 'string') return false;

  // Remove allow-listed phrases first
  let cleaned = text;
  for (const phrase of TITLE_CASE_PHRASES) {
    cleaned = cleaned.split(phrase).join('ALLOWED_PHRASE');
  }

  // Split into segments separated by commas/semicolons (list delimiters reset
  // the counter because comma-separated items are often proper nouns).
  const segments = cleaned.split(/[,;]/);
  for (const segment of segments) {
    const words = segment.split(/[\s:()\[\]{}"]+/).filter(Boolean);

    let consecutiveUpper = 0;
    for (const word of words) {
      // Skip allowed acronyms/words
      if (TITLE_CASE_ALLOWLIST.has(word)) {
        // Does not break the streak but does not count toward it either.
        continue;
      }
      if (word === 'ALLOWED_PHRASE') {
        consecutiveUpper = 0;
        continue;
      }
      // A word "starts with uppercase" if its first char is A-Z and it has
      // at least one lowercase char (to avoid counting acronyms like "HTML").
      const startsUpper = /^[A-Z]/.test(word) && word.length > 1;
      if (startsUpper) {
        consecutiveUpper++;
        if (consecutiveUpper >= 3) return true;
      } else {
        consecutiveUpper = 0;
      }
    }
  }
  return false;
}

/**
 * Determine if the current file path matches the Button component or other
 * shared UI components that are allowed to use the brand orange directly.
 */
function isOrangeAllowedFile(filename) {
  // Button.jsx uses it for the primary variant
  if (/Button\.jsx$/.test(filename)) return true;
  // Shared UI components that use orange as brand accent
  if (/components\/ui\//.test(filename)) return true;
  // Layout components that use orange for nav/brand elements
  if (/V4Layout\.jsx$/.test(filename)) return true;
  // Error boundary needs brand styling
  if (/ErrorBoundary\.jsx$/.test(filename)) return true;
  // main.jsx (root-level loading states)
  if (/main\.jsx$/.test(filename)) return true;
  return false;
}

/**
 * Check if a node is inside a non-UI context (console calls, throws, toast
 * notifications, alert calls, or generic function calls that are not JSX
 * rendering).
 */
function isInNonUIContext(node) {
  let parent = node.parent;
  while (parent) {
    // console.log(...), console.error(...), etc.
    if (
      parent.type === 'CallExpression' &&
      parent.callee &&
      parent.callee.type === 'MemberExpression' &&
      parent.callee.object &&
      parent.callee.object.name === 'console'
    ) {
      return true;
    }
    // toast.success(...), toast.error(...), etc.
    if (
      parent.type === 'CallExpression' &&
      parent.callee &&
      parent.callee.type === 'MemberExpression' &&
      parent.callee.object &&
      parent.callee.object.name === 'toast'
    ) {
      return true;
    }
    // alert(...)
    if (
      parent.type === 'CallExpression' &&
      parent.callee &&
      parent.callee.type === 'Identifier' &&
      parent.callee.name === 'alert'
    ) {
      return true;
    }
    // throw new Error(...)
    if (parent.type === 'ThrowStatement') return true;
    // new Error(...)
    if (
      parent.type === 'NewExpression' &&
      parent.callee &&
      parent.callee.name === 'Error'
    ) {
      return true;
    }
    parent = parent.parent;
  }
  return false;
}

/**
 * Check if a node is inside JSX context (descendant of JSXElement or JSXFragment).
 */
function isInJSXContext(node) {
  let parent = node.parent;
  while (parent) {
    if (
      parent.type === 'JSXElement' ||
      parent.type === 'JSXFragment' ||
      parent.type === 'JSXAttribute' ||
      parent.type === 'JSXExpressionContainer'
    ) {
      return true;
    }
    parent = parent.parent;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

module.exports = {
  rules: {
    // -----------------------------------------------------------------
    // Rule 1: no-inline-card-pattern
    // -----------------------------------------------------------------
    'no-inline-card-pattern': {
      meta: {
        type: 'suggestion',
        docs: {
          description:
            'Disallow inline card styling on <div>; use <Card> from src/components/ui instead.',
        },
        messages: {
          noInlineCard:
            "Use <Card> from 'src/components/ui' instead of inline card styling.",
        },
        schema: [],
      },
      create(context) {
        return {
          JSXOpeningElement(node) {
            if (getElementName(node) !== 'div') return;

            const attr = getClassNameAttr(node);
            const cls = getClassNameValue(attr);
            if (!cls) return;

            const hasBgWhite = /\bbg-white\b/.test(cls);
            const hasRounded =
              /\brounded-xl\b/.test(cls) || /\brounded-\[14px\]/.test(cls);
            const hasBorderOrShadow =
              /\bborder\b/.test(cls) || /\bshadow/.test(cls);

            if (hasBgWhite && hasRounded && hasBorderOrShadow) {
              context.report({ node, messageId: 'noInlineCard' });
            }
          },
        };
      },
    },

    // -----------------------------------------------------------------
    // Rule 2: no-inline-button-pattern
    // -----------------------------------------------------------------
    'no-inline-button-pattern': {
      meta: {
        type: 'suggestion',
        docs: {
          description:
            'Disallow inline button styling on <button>; use <Button> from src/components/ui instead.',
        },
        messages: {
          noInlineButton:
            "Use <Button> from 'src/components/ui' instead of inline button styling.",
        },
        schema: [],
      },
      create(context) {
        return {
          JSXOpeningElement(node) {
            if (getElementName(node) !== 'button') return;

            const attr = getClassNameAttr(node);
            const cls = getClassNameValue(attr);
            if (!cls) return;

            // Must have a background color class
            const hasBg =
              /\bbg-\[#/.test(cls) ||
              /\bbg-coral\b/.test(cls) ||
              /\bbg-red\b/.test(cls) ||
              /\bbg-red-\d/.test(cls) ||
              /\bbg-green\b/.test(cls) ||
              /\bbg-green-\d/.test(cls) ||
              /\bbg-blue\b/.test(cls) ||
              /\bbg-blue-\d/.test(cls) ||
              /\bbg-orange\b/.test(cls) ||
              /\bbg-orange-\d/.test(cls) ||
              /\bbg-yellow\b/.test(cls) ||
              /\bbg-yellow-\d/.test(cls) ||
              /\bbg-indigo\b/.test(cls) ||
              /\bbg-indigo-\d/.test(cls) ||
              /\bbg-purple\b/.test(cls) ||
              /\bbg-purple-\d/.test(cls) ||
              /\bbg-gray-\d/.test(cls) ||
              /\bbg-slate-\d/.test(cls);

            // Must have a text color class
            const hasTextColor =
              /\btext-white\b/.test(cls) ||
              /\btext-\[#/.test(cls) ||
              /\btext-gray-\d/.test(cls) ||
              /\btext-red/.test(cls) ||
              /\btext-blue/.test(cls) ||
              /\btext-green/.test(cls);

            // Must have border-radius
            const hasRounded = /\brounded/.test(cls);

            if (hasBg && hasTextColor && hasRounded) {
              context.report({ node, messageId: 'noInlineButton' });
            }
          },
        };
      },
    },

    // -----------------------------------------------------------------
    // Rule 3: no-orange-outside-button
    // -----------------------------------------------------------------
    'no-orange-outside-button': {
      meta: {
        type: 'suggestion',
        docs: {
          description:
            'Disallow direct use of brand orange (#E8853D / #D4742E) outside Button.jsx.',
        },
        messages: {
          noOrangeOutside:
            "Orange accent (#E8853D) should only be used via <Button variant='primary'>.",
        },
        schema: [],
      },
      create(context) {
        const filename = context.getFilename();
        if (isOrangeAllowedFile(filename)) return {};

        function checkValue(node, value) {
          if (typeof value !== 'string') return;
          if (/#E8853D/i.test(value) || /#D4742E/i.test(value)) {
            context.report({ node, messageId: 'noOrangeOutside' });
          }
        }

        return {
          Literal(node) {
            // Only check literals that appear in JSX context
            if (!isInJSXContext(node)) return;
            checkValue(node, node.value);
          },
          TemplateLiteral(node) {
            if (!isInJSXContext(node)) return;
            for (const quasi of node.quasis) {
              checkValue(node, quasi.value.raw);
            }
          },
        };
      },
    },

    // -----------------------------------------------------------------
    // Rule 4: no-title-case-ui-strings
    // -----------------------------------------------------------------
    'no-title-case-ui-strings': {
      meta: {
        type: 'suggestion',
        docs: {
          description:
            'Enforce sentence case for UI strings (no Title Case With Every Word Capitalized).',
        },
        messages: {
          noTitleCase:
            'Use sentence case for UI text. See DESIGN_SYSTEM.md Copy & Tone.',
        },
        schema: [],
      },
      create(context) {
        function checkText(node, text) {
          if (hasTitleCaseViolation(text)) {
            context.report({ node, messageId: 'noTitleCase' });
          }
        }

        return {
          JSXText(node) {
            checkText(node, node.value);
          },
          // Check string props like title="...", label="...", placeholder="..."
          JSXAttribute(node) {
            const propName = node.name && node.name.name;
            const textProps = [
              'title',
              'label',
              'placeholder',
              'aria-label',
              'alt',
            ];
            if (!textProps.includes(propName)) return;
            if (node.value && node.value.type === 'Literal') {
              checkText(node.value, node.value.value);
            }
          },
        };
      },
    },

    // -----------------------------------------------------------------
    // Rule 5: no-exclamation-in-ui
    // -----------------------------------------------------------------
    'no-exclamation-in-ui': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Disallow exclamation marks in UI-facing text.',
        },
        messages: {
          noExclamation: 'Remove exclamation mark from UI text.',
        },
        schema: [],
      },
      create(context) {
        function check(node, text) {
          if (typeof text !== 'string') return;
          // Skip if the text is just a standalone "!" (used as icon glyph)
          if (/^\s*!\s*$/.test(text)) return;
          // Only flag if there is an exclamation mark that is not part of !== or !=
          if (/!/.test(text) && !/^[!=]/.test(text)) {
            // Make sure this is actual UI text with a real "!" (not just "!=")
            const cleaned = text.replace(/!==?/g, '').replace(/!\w/g, '');
            if (/!/.test(cleaned)) {
              context.report({ node, messageId: 'noExclamation' });
            }
          }
        }

        return {
          JSXText(node) {
            check(node, node.value);
          },
          Literal(node) {
            // Only in JSX context, skip console/throw/toast
            if (!isInJSXContext(node)) return;
            if (isInNonUIContext(node)) return;
            check(node, node.value);
          },
        };
      },
    },

    // -----------------------------------------------------------------
    // Rule 6: no-emoji-in-ui
    // -----------------------------------------------------------------
    'no-emoji-in-ui': {
      meta: {
        type: 'suggestion',
        docs: {
          description:
            'Disallow emoji Unicode characters in UI text; use lucide-react icons instead.',
        },
        messages: {
          noEmoji: 'Remove emoji from UI text. Use lucide-react icons instead.',
        },
        schema: [],
      },
      create(context) {
        const filename = context.getFilename();
        // Skip test files
        if (/\.(test|spec)\.[jt]sx?$/.test(filename)) return {};
        if (/__(tests|mocks)__/.test(filename)) return {};

        function check(node, text) {
          if (typeof text !== 'string') return;
          if (EMOJI_REGEX.test(text)) {
            context.report({ node, messageId: 'noEmoji' });
          }
        }

        return {
          JSXText(node) {
            check(node, node.value);
          },
          Literal(node) {
            if (!isInJSXContext(node)) return;
            check(node, node.value);
          },
          TemplateLiteral(node) {
            if (!isInJSXContext(node)) return;
            for (const quasi of node.quasis) {
              check(node, quasi.value.raw);
            }
          },
        };
      },
    },
  },
};
