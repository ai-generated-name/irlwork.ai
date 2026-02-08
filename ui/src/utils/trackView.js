import API_URL from '../config/api';

const AI_REFERRERS = [
  { pattern: /chat\.openai\.com|chatgpt\.com/i, source: 'chatgpt' },
  { pattern: /perplexity\.ai/i, source: 'perplexity' },
  { pattern: /claude\.ai/i, source: 'claude' },
  { pattern: /gemini\.google\.com/i, source: 'gemini' },
  { pattern: /bing\.com\/chat/i, source: 'bing_copilot' },
  { pattern: /you\.com/i, source: 'you_com' },
  { pattern: /phind\.com/i, source: 'phind' },
];

export function trackView(pageType, targetId) {
  const referrer = document.referrer;
  const aiMatch = AI_REFERRERS.find(r => r.pattern.test(referrer));

  fetch(`${API_URL}/views`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      page_type: pageType,
      target_id: targetId,
      referrer: referrer || null,
      ai_source: aiMatch?.source || null
    })
  }).catch(() => {});
}
