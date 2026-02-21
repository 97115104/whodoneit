/**
 * URL Content Extractor
 * Fetches and extracts main content from blog posts and articles.
 */
const UrlExtractor = (function() {
    'use strict';

    // CORS proxies to try (in order)
    const CORS_PROXIES = [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?'
    ];

    /**
     * Fetch content from a URL, trying CORS proxies if needed
     */
    async function fetchWithProxy(url) {
        // First try direct fetch (works for CORS-enabled sites)
        try {
            const directResp = await fetch(url, {
                headers: { 'Accept': 'text/html' }
            });
            if (directResp.ok) {
                return await directResp.text();
            }
        } catch (e) {
            // Expected CORS error, continue to proxies
        }

        // Try CORS proxies
        for (const proxy of CORS_PROXIES) {
            try {
                const proxyUrl = proxy + encodeURIComponent(url);
                const resp = await fetch(proxyUrl);
                if (resp.ok) {
                    return await resp.text();
                }
            } catch (e) {
                // Continue to next proxy
            }
        }

        throw new Error('Could not fetch URL. The site may be blocking automated requests.');
    }

    /**
     * Extract main text content from HTML
     */
    function extractContent(html, sourceUrl) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Remove script, style, nav, header, footer, aside, comments
        const removeSelectors = [
            'script', 'style', 'noscript', 'nav', 'header', 'footer', 
            'aside', 'iframe', 'form', '.comments', '#comments', 
            '.sidebar', '.navigation', '.menu', '.social-share',
            '.related-posts', '.advertisement', '.ad', '[role="navigation"]',
            '[role="banner"]', '[role="contentinfo"]', '.cookie-notice',
            '.popup', '.modal', '.newsletter', '.subscribe'
        ];
        
        removeSelectors.forEach(sel => {
            doc.querySelectorAll(sel).forEach(el => el.remove());
        });

        // Try to find main content using common patterns
        const contentSelectors = [
            // Specific blog platforms
            'article.post-content',
            'article .post-content',
            '.post-content',
            '.entry-content',
            '.article-content',
            '.content-body',
            '.blog-post-content',
            '.single-post-content',
            
            // Substack specific
            '.body.markup',
            '.post-content-final',
            '[data-component-name="BodyMarkup"]',
            
            // Medium-like
            'article section',
            
            // Generic semantic
            'article',
            '[role="main"]',
            'main',
            '.main-content',
            '#main-content',
            '.content',
            '#content',
            
            // Fallback to body
            'body'
        ];

        let contentEl = null;
        for (const selector of contentSelectors) {
            const el = doc.querySelector(selector);
            if (el) {
                const text = el.textContent.trim();
                // Accept if it has substantial content (at least 200 chars)
                if (text.length > 200) {
                    contentEl = el;
                    break;
                }
            }
        }

        if (!contentEl) {
            contentEl = doc.body;
        }

        // Extract text, preserving paragraph structure
        const blocks = [];
        const blockElements = contentEl.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre');
        
        if (blockElements.length > 0) {
            blockElements.forEach(el => {
                const text = el.textContent.trim();
                if (text.length > 0) {
                    // Add heading markers
                    if (el.tagName.match(/^H[1-6]$/)) {
                        blocks.push('\n' + text + '\n');
                    } else if (el.tagName === 'BLOCKQUOTE') {
                        blocks.push('> ' + text);
                    } else if (el.tagName === 'PRE') {
                        blocks.push('```\n' + text + '\n```');
                    } else if (el.tagName === 'LI') {
                        blocks.push('• ' + text);
                    } else {
                        blocks.push(text);
                    }
                }
            });
        } else {
            // Fallback: get all text
            blocks.push(contentEl.textContent.trim());
        }

        // Join with double newlines for paragraph separation
        let content = blocks.join('\n\n');

        // Clean up excessive whitespace
        content = content
            .replace(/\n{3,}/g, '\n\n')
            .replace(/[ \t]+/g, ' ')
            .trim();

        // Get title
        let title = '';
        const titleEl = doc.querySelector('h1') || doc.querySelector('title');
        if (titleEl) {
            title = titleEl.textContent.trim();
        }

        return {
            title,
            content,
            url: sourceUrl
        };
    }

    /**
     * Main entry point: fetch URL and extract content
     */
    async function extract(url) {
        // Validate URL
        try {
            new URL(url);
        } catch (e) {
            throw new Error('Please enter a valid URL.');
        }

        // Fetch HTML
        const html = await fetchWithProxy(url);
        
        if (!html || html.length < 100) {
            throw new Error('Could not retrieve content from this URL.');
        }

        // Extract content
        const result = extractContent(html, url);
        
        if (!result.content || result.content.length < 50) {
            throw new Error('Could not extract meaningful content from this page. The site may use JavaScript rendering.');
        }

        return result;
    }

    return {
        extract
    };
})();
