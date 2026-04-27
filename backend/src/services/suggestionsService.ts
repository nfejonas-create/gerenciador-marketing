import Parser from 'rss-parser';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { PrismaClient } from '@prisma/client';

dayjs.extend(utc);

const prisma = new PrismaClient();
const parser = new Parser();

interface Suggestion {
        id?: string;
        headline: string;
        url: string;
        source: string;
        publishedAt: string;
        snippet?: string;
}

// Helper: busca RSS do Google News com query e janela de data ampla
async function fetchGoogleRSS(query: string, date: string, sourceLabel: string): Promise<Suggestion[]> {
        const targetDate = dayjs.utc(date).startOf('day');
        const windowStart = targetDate.subtract(6, 'day');
        const windowEnd = targetDate.add(1, 'day');

  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

  try {
            const feed = await parser.parseURL(url);

          const items = feed.items
              .filter((item: Parser.Item) => {
                            const raw = item.isoDate || item.pubDate;
                            if (!raw) return true;
                            const publishedAt = dayjs.utc(new Date(raw));
                            return publishedAt.isAfter(windowStart) && publishedAt.isBefore(windowEnd);
              })
              .slice(0, 20)
              .map((item: Parser.Item) => ({
                            headline: item.title || '',
                            url: item.link || '',
                            source: sourceLabel,
                            publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
                            snippet: item.contentSnippet || item.content || '',
              }));

          // Fallback: se filtro de data nao retornou nada, retorna os 20 mais recentes
          if (items.length === 0 && feed.items.length > 0) {
                      console.log(`[fetchGoogleRSS:${sourceLabel}] Filtro vazio, usando fallback sem filtro de data`);
                      return feed.items.slice(0, 20).map((item: Parser.Item) => ({
                                    headline: item.title || '',
                                    url: item.link || '',
                                    source: sourceLabel,
                                    publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
                                    snippet: item.contentSnippet || item.content || '',
                      }));
          }

          return items;
  } catch (error) {
            console.error(`[fetchGoogleRSS:${sourceLabel}] Erro:`, error);
            return [];
  }
}

// Busca noticias do Google News para o nicho do usuario
export async function fetchGoogleNewsSuggestions(query: string, date: string): Promise<Suggestion[]> {
        return fetchGoogleRSS(query, date, 'Google News');
}

// Busca noticias de LinkedIn/Marketing/Negocios via Google News RSS
// (substitui NewsAPI que requer chave paga)
export async function fetchLinkedInNewsSuggestions(query: string, date: string): Promise<Suggestion[]> {
        // Usa query combinada: nicho + termos de LinkedIn/marketing
  const linkedinQuery = `${query} LinkedIn marketing negocios`;
        return fetchGoogleRSS(linkedinQuery, date, 'LinkedIn News');
}

export async function fetchNewsApiSuggestions(query: string, date: string, apiKey: string): Promise<Suggestion[]> {
        if (!apiKey) {
                  console.warn('[fetchNewsApiSuggestions] NEWSAPI_KEY nao configurada, usando Google RSS como fallback');
                  return fetchLinkedInNewsSuggestions(query, date);
        }

  const fromDate = dayjs.utc(date).format('YYYY-MM-DD');
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=pt&from=${fromDate}&sortBy=popularity&apiKey=${apiKey}`;

  try {
            const response = await fetch(url);
            const data = await response.json() as {
                        status?: string;
                        message?: string;
                        articles?: Array<{
                          title?: string;
                          url?: string;
                          publishedAt?: string;
                          description?: string;
                          content?: string;
                          source?: { name?: string };
                        }>;
            };

          if (data.status !== 'ok') {
                      console.error('[fetchNewsApiSuggestions] API error:', data.message);
                      // Fallback para Google RSS se NewsAPI falhar
              return fetchLinkedInNewsSuggestions(query, date);
          }

          return (data.articles || []).map((article) => ({
                      headline: article.title || '',
                      url: article.url || '',
                      source: article.source?.name || 'NewsAPI',
                      publishedAt: article.publishedAt || new Date().toISOString(),
                      snippet: article.description || article.content || '',
          }));
  } catch (error) {
            console.error('[fetchNewsApiSuggestions] Erro:', error);
            return fetchLinkedInNewsSuggestions(query, date);
  }
}

export async function saveSuggestions(
        userId: string,
        source: 'google' | 'linkedin',
        suggestions: Suggestion[],
      ): Promise<void> {
        const existingUrls = await prisma.contentSuggestion.findMany({
                  where: { userId, url: { in: suggestions.map((suggestion) => suggestion.url) } },
                  select: { url: true },
        });

  const existingSet = new Set(existingUrls.map((entry) => entry.url));

  const newSuggestions = suggestions
          .filter((suggestion) => !existingSet.has(suggestion.url))
          .map((suggestion) => ({
                      userId,
                      source,
                      headline: suggestion.headline,
                      url: suggestion.url,
                      snippet: suggestion.snippet,
                      fetchedAt: new Date(),
          }));

  if (newSuggestions.length > 0) {
            await prisma.contentSuggestion.createMany({
                        data: newSuggestions,
            });
  }
}

export async function getCachedSuggestions(
        userId: string,
        source: 'google' | 'linkedin',
        date: string,
      ): Promise<Suggestion[]> {
        // Cache valido por 6 horas
  const cacheFrom = dayjs.utc().subtract(6, 'hour').toDate();

  const suggestions = await prisma.contentSuggestion.findMany({
            where: {
                        userId,
                        source,
                        fetchedAt: {
                                      gte: cacheFrom,
                        },
            },
            orderBy: { fetchedAt: 'desc' },
            take: 20,
  });

  return suggestions.map((suggestion) => ({
            id: suggestion.id,
            headline: suggestion.headline,
            url: suggestion.url,
            source: suggestion.source,
            publishedAt: suggestion.fetchedAt.toISOString(),
            snippet: suggestion.snippet || undefined,
  }));
}

// Busca sugestoes do banco pelo userId e source (retorna com IDs)
export async function getSuggestionsByUrls(
        userId: string,
        source: 'google' | 'linkedin',
        urls: string[],
      ): Promise<Suggestion[]> {
        const suggestions = await prisma.contentSuggestion.findMany({
                  where: {
                              userId,
                              source,
                              url: { in: urls },
                  },
                  orderBy: { fetchedAt: 'desc' },
                  take: 20,
        });

  return suggestions.map((suggestion) => ({
            id: suggestion.id,
            headline: suggestion.headline,
            url: suggestion.url,
            source: suggestion.source,
            publishedAt: suggestion.fetchedAt.toISOString(),
            snippet: suggestion.snippet || undefined,
  }));
}
