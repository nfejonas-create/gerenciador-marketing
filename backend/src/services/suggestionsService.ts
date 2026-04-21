import Parser from 'rss-parser';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { PrismaClient } from '@prisma/client';

dayjs.extend(utc);

const prisma = new PrismaClient();
const parser = new Parser();

interface Suggestion {
  headline: string;
  url: string;
  source: string;
  publishedAt: string;
  snippet?: string;
}

export async function fetchGoogleNewsSuggestions(query: string, date: string): Promise<Suggestion[]> {
  const targetDate = dayjs.utc(date).startOf('day');
  const nextDay = targetDate.add(1, 'day');

  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

  try {
    const feed = await parser.parseURL(url);

    return feed.items
      .filter((item: Parser.Item) => {
        const raw = item.isoDate || item.pubDate;
        if (!raw) {
          return false;
        }
        const publishedAt = dayjs.utc(new Date(raw));
        return (publishedAt.isAfter(targetDate) || publishedAt.isSame(targetDate)) && publishedAt.isBefore(nextDay);
      })
      .map((item: Parser.Item) => ({
        headline: item.title || '',
        url: item.link || '',
        source: 'Google News',
        publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
        snippet: item.contentSnippet || item.content || '',
      }));
  } catch (error) {
    console.error('[fetchGoogleNewsSuggestions] Erro:', error);
    return [];
  }
}

export async function fetchNewsApiSuggestions(query: string, date: string, apiKey: string): Promise<Suggestion[]> {
  if (!apiKey) {
    console.warn('[fetchNewsApiSuggestions] NEWSAPI_KEY não configurada');
    return [];
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
      return [];
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
    return [];
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
  const targetDate = dayjs.utc(date).startOf('day').toDate();
  const nextDay = dayjs.utc(date).add(1, 'day').toDate();

  const suggestions = await prisma.contentSuggestion.findMany({
    where: {
      userId,
      source,
      fetchedAt: {
        gte: targetDate,
        lt: nextDay,
      },
    },
    orderBy: { fetchedAt: 'desc' },
  });

  return suggestions.map((suggestion) => ({
    headline: suggestion.headline,
    url: suggestion.url,
    source: suggestion.source,
    publishedAt: suggestion.fetchedAt.toISOString(),
    snippet: suggestion.snippet || undefined,
  }));
}