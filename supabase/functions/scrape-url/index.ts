import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapeResult {
  url: string;
  title: string | null;
  description: string | null;
  content: string | null;
  image: string | null;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SportingClubBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();
    const result = parseHtml(html, url);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Scrape error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Failed to scrape URL' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parseHtml(html: string, url: string): ScrapeResult {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  if (!doc) {
    return { url, title: null, description: null, content: null, image: null };
  }

  // Extract title
  let title = doc.querySelector('meta[property="og:title"]')?.getAttribute('content')
    || doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content')
    || doc.querySelector('title')?.textContent
    || null;

  if (title) {
    title = title.trim();
  }

  // Extract description
  let description = doc.querySelector('meta[property="og:description"]')?.getAttribute('content')
    || doc.querySelector('meta[name="description"]')?.getAttribute('content')
    || doc.querySelector('meta[name="twitter:description"]')?.getAttribute('content')
    || null;

  if (description) {
    description = description.trim();
  }

  // Extract image
  let image = doc.querySelector('meta[property="og:image"]')?.getAttribute('content')
    || doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content')
    || null;

  // Make image URL absolute if relative
  if (image && !image.startsWith('http')) {
    try {
      image = new URL(image, url).href;
    } catch {
      image = null;
    }
  }

  // Extract main content
  let content = '';

  // Try common content containers
  const contentSelectors = [
    'article',
    'main',
    '[role="main"]',
    '.content',
    '.post-content',
    '.entry-content',
    '#content',
    '.article-body',
  ];

  let contentElement = null;
  for (const selector of contentSelectors) {
    contentElement = doc.querySelector(selector);
    if (contentElement) break;
  }

  // Fall back to body if no content container found
  if (!contentElement) {
    contentElement = doc.querySelector('body');
  }

  if (contentElement) {
    // Remove script, style, nav, footer, header elements
    const removeSelectors = ['script', 'style', 'nav', 'footer', 'header', 'aside', '.sidebar', '.ad', '.advertisement'];
    for (const selector of removeSelectors) {
      const elements = contentElement.querySelectorAll(selector);
      elements.forEach((el: any) => el.remove());
    }

    // Get text content
    content = extractText(contentElement);
  }

  // Limit content length
  if (content.length > 10000) {
    content = content.slice(0, 10000) + '...';
  }

  return {
    url,
    title,
    description,
    content: content || null,
    image,
  };
}

function extractText(element: any): string {
  const text: string[] = [];

  // Process child nodes
  for (const node of element.childNodes) {
    if (node.nodeType === 3) {
      // Text node
      const trimmed = node.textContent?.trim();
      if (trimmed) {
        text.push(trimmed);
      }
    } else if (node.nodeType === 1) {
      // Element node
      const tagName = node.tagName?.toLowerCase();

      // Skip certain elements
      if (['script', 'style', 'noscript', 'svg', 'img', 'video', 'audio'].includes(tagName)) {
        continue;
      }

      // Add line breaks for block elements
      if (['p', 'div', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'tr'].includes(tagName)) {
        const childText = extractText(node);
        if (childText) {
          text.push(childText);
          text.push('\n');
        }
      } else {
        const childText = extractText(node);
        if (childText) {
          text.push(childText);
        }
      }
    }
  }

  return text.join(' ').replace(/\s+/g, ' ').trim();
}
