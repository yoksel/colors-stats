module.exports = {
  "rules": {
    "indentation": [2, {
        "indentClosingBrace": false,
    }],
    "at-rule-empty-line-before": [
        "always",
        {
            "except": [
              "first-nested",
            ],
            "ignoreAtRules": [
                "import",
                "font-face"
            ]
        }
    ],
    "at-rule-no-vendor-prefix": true,
    "block-opening-brace-space-before": "always",
    "block-closing-brace-empty-line-before": "never",
    "color-hex-case": "lower",
    "color-hex-length": "short",
    "comment-whitespace-inside": "always",
    "declaration-block-trailing-semicolon": "always",
    "declaration-colon-space-before": "never",
    "declaration-colon-space-after": "always-single-line",
    "declaration-block-no-duplicate-properties": true,
    "declaration-empty-line-before": "never",
    "font-family-name-quotes": "always-where-required",
    "font-family-no-missing-generic-family-keyword": true,
    "function-url-quotes": "always",
    "length-zero-no-unit": true,
    "max-empty-lines": 2,
    "media-feature-range-operator-space-before": "always",
    "media-feature-range-operator-space-after": "always",
    "media-feature-parentheses-space-inside": "never",
    "media-feature-colon-space-before": "never",
    "media-feature-colon-space-after": "always",
    "no-duplicate-selectors": true,
    "no-empty-first-line": true,
    "property-no-vendor-prefix": true,
    "rule-empty-line-before": [
        "always",
        {
            "except": [
              "first-nested"
            ]
        }
    ],
    "selector-max-id": 0,
    "selector-max-compound-selectors": 3,
    "selector-combinator-space-after": "always",
    "selector-attribute-quotes": "always",
    "selector-type-case": [
        "upper",
        {
            "ignoreTypes": ["svg"]
        }
    ],
    "selector-pseudo-element-colon-notation": "double",
    "selector-pseudo-class-parentheses-space-inside": "never",
    "selector-no-vendor-prefix": true,
    "shorthand-property-no-redundant-values": true,
    "string-quotes": "double",
    "unit-no-unknown": true,
    "value-no-vendor-prefix": true,
  },
};
