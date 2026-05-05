export interface SuggestionView {
  id: string;
  headline: string;
  url: string;
  source: string;
  publishedAt: string;
  snippet?: string;
}

export function toSuggestionsResponse(suggestions: SuggestionView[]) {
  return { suggestions };
}

export function normalizeSuggestionViews(source: string, suggestions: Array<Partial<SuggestionView>>): SuggestionView[] {
  return suggestions
    .map((suggestion, index) => {
      const headline = String(suggestion.headline || '').trim();
      const url = String(suggestion.url || '').trim();
      if (!headline) return null;

      return {
        id: String(suggestion.id || url || `${source}-${index + 1}`),
        headline,
        url,
        source: String(suggestion.source || source),
        publishedAt: suggestion.publishedAt || new Date().toISOString(),
        snippet: suggestion.snippet,
      };
    })
    .filter(Boolean) as SuggestionView[];
}
