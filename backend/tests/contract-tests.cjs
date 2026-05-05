require('ts-node/register');
const assert = require('assert');

const { normalizeSuggestionViews, toSuggestionsResponse } = require('../src/services/suggestionsContract');
const { createMetricsToken, isValidMetricsToken } = require('../src/services/metricsToken');

const normalized = normalizeSuggestionViews('google', [
  {
    headline: 'Tema atual',
    url: 'https://example.com',
  },
]);

assert.strictEqual(normalized[0].id, 'https://example.com');
assert.strictEqual(normalized[0].source, 'google');

const response = toSuggestionsResponse(normalized);
assert.ok(Array.isArray(response.suggestions), 'suggestions must be an array');
assert.strictEqual(response.suggestions[0].id, 'https://example.com');

const token = createMetricsToken();
assert.strictEqual(token.length, 48, 'metrics token must be 24 bytes in hex');
assert.strictEqual(isValidMetricsToken({ metricsWebhookToken: token }, token), true);
assert.strictEqual(isValidMetricsToken({ metricsWebhookToken: token }, 'wrong'), false);

console.log('contract-tests ok');
