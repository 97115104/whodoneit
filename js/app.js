let slowHintTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    // Detect file:// protocol — Puter SDK needs a web server
    if (window.location.protocol === 'file:') {
        document.getElementById('file-protocol-warning').classList.remove('hidden');
    }

    // Restore saved settings
    restoreSettings();

    // Setup UI interactions
    UIRenderer.setupTabs();
    UIRenderer.setupCopyButtons();
    UIRenderer.setupDownloadButtons();
    setupShareContentButton();
    setupUrlFetcher();
    setupOsTabs();

    // How to use modal
    document.getElementById('btn-info').addEventListener('click', () => {
        document.getElementById('info-modal').classList.remove('hidden');
    });
    document.getElementById('btn-close-info').addEventListener('click', () => {
        document.getElementById('info-modal').classList.add('hidden');
    });
    document.getElementById('info-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            document.getElementById('info-modal').classList.add('hidden');
        }
    });

    // Speed tip modal
    document.getElementById('slow-hint-link').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('speed-modal').classList.remove('hidden');
    });
    document.getElementById('btn-close-speed').addEventListener('click', () => {
        document.getElementById('speed-modal').classList.add('hidden');
    });
    document.getElementById('speed-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            document.getElementById('speed-modal').classList.add('hidden');
        }
    });

    // Ollama instructions modal
    document.getElementById('btn-ollama-help').addEventListener('click', () => {
        document.getElementById('ollama-modal').classList.remove('hidden');
    });
    document.getElementById('btn-close-ollama').addEventListener('click', () => {
        document.getElementById('ollama-modal').classList.add('hidden');
    });
    document.getElementById('ollama-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            document.getElementById('ollama-modal').classList.add('hidden');
        }
    });

    // Puter fallback modal
    document.getElementById('btn-close-fallback').addEventListener('click', () => {
        document.getElementById('puter-fallback-modal').classList.add('hidden');
    });
    document.getElementById('puter-fallback-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            document.getElementById('puter-fallback-modal').classList.add('hidden');
        }
    });
    document.getElementById('btn-switch-ollama').addEventListener('click', () => {
        document.getElementById('puter-fallback-modal').classList.add('hidden');
        document.getElementById('api-mode').value = 'ollama';
        updateApiModeUI();
        document.getElementById('settings-panel').classList.remove('hidden');
        document.getElementById('settings-toggle').textContent = '\u25BC API Settings';
    });

    // Settings toggle
    document.getElementById('settings-toggle').addEventListener('click', () => {
        const panel = document.getElementById('settings-panel');
        panel.classList.toggle('hidden');
        const btn = document.getElementById('settings-toggle');
        btn.textContent = panel.classList.contains('hidden')
            ? '\u25B6 API Settings'
            : '\u25BC API Settings';
    });

    // API mode toggle
    document.getElementById('api-mode').addEventListener('change', updateApiModeUI);
    updateApiModeUI();

    // Save checkbox
    document.getElementById('save-key').addEventListener('change', (e) => {
        if (!e.target.checked) {
            localStorage.removeItem('wd_api_key');
            localStorage.removeItem('wd_base_url');
            localStorage.removeItem('wd_model');
            localStorage.removeItem('wd_api_mode');
            localStorage.removeItem('wd_puter_model');
        }
    });

    // Character counter for content input
    const contentInput = document.getElementById('content-input');
    const charCount = document.getElementById('char-count');
    contentInput.addEventListener('input', () => {
        charCount.textContent = contentInput.value.length.toLocaleString();
    });

    // Analyze button
    document.getElementById('analyze-btn').addEventListener('click', handleAnalyze);

    // Ctrl/Cmd+Enter to analyze
    contentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            handleAnalyze();
        }
    });

    // URL routing
    handleUrlRouting();
});

// --- URL Routing ---

async function handleUrlRouting() {
    const params = new URLSearchParams(window.location.search);

    // Check for URL parameter first (fetch from URL)
    const urlParam = params.get('url');
    if (urlParam) {
        const urlInput = document.getElementById('url-input');
        const contentInput = document.getElementById('content-input');
        const charCount = document.getElementById('char-count');
        
        urlInput.value = urlParam;
        
        // Show loading state
        UIRenderer.showLoading();
        document.getElementById('loading-text').textContent = 'Fetching content...';
        document.getElementById('loading-status').textContent = 'Extracting main content from URL';
        
        try {
            const result = await UrlExtractor.extract(urlParam);
            
            let content = '';
            if (result.title) {
                content = result.title + '\n\n';
            }
            content += result.content;
            
            contentInput.value = content;
            charCount.textContent = content.length.toLocaleString();
            urlInput.value = '';
            
            UIRenderer.hideLoading();
            
            // Check if auto-analyze requested
            const autoEnter = params.get('enter');
            const rawSearch = window.location.search;
            const hasEnter = autoEnter !== null || rawSearch.includes('&enter') || rawSearch.includes('?enter');
            
            if (hasEnter) {
                setTimeout(() => handleAnalyze(), 300);
            }
        } catch (err) {
            UIRenderer.showError('Could not fetch URL: ' + err.message);
        }
        return;
    }

    // Check for content parameter
    let content = params.get('content');
    if (!content) {
        const raw = window.location.search;
        if (raw.startsWith('?=')) {
            content = decodeURIComponent(raw.substring(2).split('&')[0]);
        }
    }

    if (!content) return;

    const contentInput = document.getElementById('content-input');
    contentInput.value = content;
    document.getElementById('char-count').textContent = content.length.toLocaleString();

    const autoEnter = params.get('enter');
    const rawSearch = window.location.search;
    const hasEnter = autoEnter !== null || rawSearch.includes('&enter') || rawSearch.includes('?enter');

    if (hasEnter) {
        setTimeout(() => handleAnalyze(), 500);
    }
}

// --- Share Button ---

function setupShareContentButton() {
    const shareModal = document.getElementById('share-modal');

    document.getElementById('btn-share-content').addEventListener('click', () => {
        const content = document.getElementById('content-input').value.trim();
        if (!content) {
            UIRenderer.showError('Enter content first, then share it.');
            return;
        }
        document.getElementById('share-status').classList.add('hidden');
        shareModal.classList.remove('hidden');
    });

    document.getElementById('btn-close-share').addEventListener('click', () => {
        shareModal.classList.add('hidden');
    });
    shareModal.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            shareModal.classList.add('hidden');
        }
    });

    function buildShareUrl(includeEnter) {
        const content = document.getElementById('content-input').value.trim();
        const base = window.location.origin + window.location.pathname;
        let link = base + '?content=' + encodeURIComponent(content);
        if (includeEnter) link += '&enter';
        return link;
    }

    function showShareStatus(text) {
        const status = document.getElementById('share-status');
        status.textContent = text;
        status.classList.remove('hidden');
        setTimeout(() => { status.classList.add('hidden'); }, 2000);
    }

    document.getElementById('share-url').addEventListener('click', () => {
        navigator.clipboard.writeText(buildShareUrl(false)).then(() => {
            showShareStatus('Link copied!');
        });
    });

    document.getElementById('share-url-enter').addEventListener('click', () => {
        navigator.clipboard.writeText(buildShareUrl(true)).then(() => {
            showShareStatus('Link copied with auto-analyze!');
        });
    });
}

// --- URL Fetcher ---

function setupUrlFetcher() {
    const urlInput = document.getElementById('url-input');
    const fetchBtn = document.getElementById('fetch-url-btn');
    const fetchAnalyzeBtn = document.getElementById('fetch-analyze-btn');
    const contentInput = document.getElementById('content-input');
    const charCount = document.getElementById('char-count');

    async function handleFetch(andAnalyze = false) {
        const url = urlInput.value.trim();
        if (!url) {
            UIRenderer.showError('Please enter a URL to fetch.');
            return;
        }

        // Disable buttons and show loading state
        fetchBtn.disabled = true;
        fetchAnalyzeBtn.disabled = true;
        const originalFetchText = fetchBtn.textContent;
        const originalAnalyzeText = fetchAnalyzeBtn.textContent;
        fetchBtn.textContent = 'Fetching...';
        fetchAnalyzeBtn.textContent = 'Fetching...';
        UIRenderer.hideError();

        try {
            const result = await UrlExtractor.extract(url);
            
            // Populate content input
            let content = '';
            if (result.title) {
                content = result.title + '\n\n';
            }
            content += result.content;
            
            contentInput.value = content;
            charCount.textContent = content.length.toLocaleString();
            
            // Clear URL input
            urlInput.value = '';
            
            if (andAnalyze) {
                // Trigger analysis
                handleAnalyze();
            } else {
                // Scroll to content
                contentInput.focus();
                contentInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } catch (err) {
            UIRenderer.showError(err.message);
        } finally {
            fetchBtn.disabled = false;
            fetchAnalyzeBtn.disabled = false;
            fetchBtn.textContent = originalFetchText;
            fetchAnalyzeBtn.textContent = originalAnalyzeText;
        }
    }

    fetchBtn.addEventListener('click', () => handleFetch(false));
    fetchAnalyzeBtn.addEventListener('click', () => handleFetch(true));

    // Enter key to fetch
    urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleFetch(false);
        }
    });
}

// --- Provider Configuration ---

const PROVIDER_CONFIG = {
    puter: {},
    openrouter: {
        keyPlaceholder: 'sk-or-...',
        modelPlaceholder: 'anthropic/claude-sonnet-4',
        hint: 'CORS-friendly — works directly in the browser. Supports hundreds of models. Get a key at openrouter.ai/keys.',
        showBaseUrl: false
    },
    anthropic: {
        keyPlaceholder: 'sk-ant-...',
        modelPlaceholder: 'claude-sonnet-4-5-20250929',
        hint: 'Uses the Anthropic Messages API. Get a key at console.anthropic.com.',
        showBaseUrl: false
    },
    openai: {
        keyPlaceholder: 'sk-...',
        modelPlaceholder: 'gpt-4o',
        hint: 'Uses the OpenAI Chat Completions API. May require a CORS proxy for browser use. Get a key at platform.openai.com.',
        showBaseUrl: false
    },
    google: {
        keyPlaceholder: 'AIza...',
        modelPlaceholder: 'gemini-2.0-flash',
        hint: 'Uses the Google Gemini API. Get a key at aistudio.google.com.',
        showBaseUrl: false
    },
    custom: {
        keyPlaceholder: 'your-api-key',
        modelPlaceholder: 'gpt-4o',
        hint: 'Any OpenAI-compatible endpoint (Together, LM Studio, etc.). Uses Bearer token auth and /chat/completions format.',
        showBaseUrl: true
    }
};

function updateApiModeUI() {
    const mode = document.getElementById('api-mode').value;
    const puterSettings = document.getElementById('puter-settings');
    const ollamaSettings = document.getElementById('ollama-settings');
    const keyedSettings = document.getElementById('keyed-settings');

    puterSettings.classList.add('hidden');
    ollamaSettings.classList.add('hidden');
    keyedSettings.classList.add('hidden');

    if (mode === 'puter') {
        puterSettings.classList.remove('hidden');
    } else if (mode === 'ollama') {
        ollamaSettings.classList.remove('hidden');
    } else {
        keyedSettings.classList.remove('hidden');

        const config = PROVIDER_CONFIG[mode] || PROVIDER_CONFIG.custom;
        document.getElementById('api-key').placeholder = config.keyPlaceholder;
        document.getElementById('model-name').placeholder = config.modelPlaceholder;
        document.getElementById('provider-hint').textContent = config.hint;

        const baseUrlGroup = document.getElementById('base-url-group');
        if (config.showBaseUrl) {
            baseUrlGroup.classList.remove('hidden');
        } else {
            baseUrlGroup.classList.add('hidden');
        }
    }
}

function restoreSettings() {
    const savedKey = localStorage.getItem('wd_api_key');
    const savedUrl = localStorage.getItem('wd_base_url');
    const savedModel = localStorage.getItem('wd_model');
    const savedMode = localStorage.getItem('wd_api_mode');
    const savedPuterModel = localStorage.getItem('wd_puter_model');

    if (savedMode) {
        document.getElementById('api-mode').value = savedMode;
        updateApiModeUI();
    }
    if (savedKey) {
        document.getElementById('api-key').value = savedKey;
        document.getElementById('save-key').checked = true;
    }
    if (savedUrl) {
        document.getElementById('base-url').value = savedUrl;
    }
    if (savedModel) {
        document.getElementById('model-name').value = savedModel;
    }
    if (savedPuterModel) {
        document.getElementById('puter-model').value = savedPuterModel;
    }
    const savedOllamaUrl = localStorage.getItem('wd_ollama_url');
    const savedOllamaModel = localStorage.getItem('wd_ollama_model');
    if (savedOllamaUrl) {
        document.getElementById('ollama-url').value = savedOllamaUrl;
    }
    if (savedOllamaModel) {
        document.getElementById('ollama-model').value = savedOllamaModel;
    }
}

function saveSettings() {
    if (document.getElementById('save-key').checked) {
        const apiMode = document.getElementById('api-mode').value;
        localStorage.setItem('wd_api_mode', apiMode);
        localStorage.setItem('wd_puter_model', document.getElementById('puter-model').value);

        if (apiMode === 'ollama') {
            localStorage.setItem('wd_ollama_url', document.getElementById('ollama-url').value);
            localStorage.setItem('wd_ollama_model', document.getElementById('ollama-model').value);
        } else if (apiMode !== 'puter') {
            localStorage.setItem('wd_api_key', document.getElementById('api-key').value);
            const baseUrl = document.getElementById('base-url').value;
            const modelName = document.getElementById('model-name').value;
            if (baseUrl) localStorage.setItem('wd_base_url', baseUrl);
            else localStorage.removeItem('wd_base_url');
            if (modelName) localStorage.setItem('wd_model', modelName);
            else localStorage.removeItem('wd_model');
        }
    }
}

function setupOsTabs() {
    document.querySelectorAll('.os-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const os = btn.dataset.os;
            const container = btn.closest('.modal-body') || btn.closest('.modal');

            container.querySelectorAll('.os-tab-btn').forEach(t => t.classList.remove('active'));
            container.querySelectorAll('.os-panel').forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            container.querySelector(`.os-panel[data-os="${os}"]`).classList.add('active');
        });
    });
}

function updateLoadingStatus(text, status) {
    const textEl = document.getElementById('loading-text');
    const statusEl = document.getElementById('loading-status');
    if (text) textEl.textContent = text;
    if (status) statusEl.textContent = status;
}

function showPuterFallback(reason) {
    document.getElementById('puter-fallback-reason').textContent = reason;
    document.getElementById('puter-fallback-modal').classList.remove('hidden');
}

async function handleAnalyze() {
    const apiMode = document.getElementById('api-mode').value;
    const content = document.getElementById('content-input').value.trim();

    // Validate
    UIRenderer.hideError();

    if (apiMode !== 'puter' && apiMode !== 'ollama') {
        const apiKey = document.getElementById('api-key').value.trim();
        if (!apiKey) {
            UIRenderer.showError('Please enter your API key in the settings panel.');
            document.getElementById('settings-panel').classList.remove('hidden');
            document.getElementById('settings-toggle').textContent = '\u25BC API Settings';
            return;
        }
    }

    if (!content) {
        UIRenderer.showError('Please enter content to analyze.');
        return;
    }

    if (content.length < 50) {
        UIRenderer.showError('Please enter at least 50 characters for meaningful analysis. Short snippets cannot be reliably analyzed.');
        return;
    }

    // Save settings
    saveSettings();

    // Build params
    const params = {
        systemMessage: null,
        userMessage: null,
        apiMode
    };

    if (apiMode === 'puter') {
        params.puterModel = document.getElementById('puter-model').value;
    } else if (apiMode === 'ollama') {
        params.ollamaUrl = document.getElementById('ollama-url').value.trim() || undefined;
        params.ollamaModel = document.getElementById('ollama-model').value.trim() || undefined;
    } else {
        params.apiKey = document.getElementById('api-key').value.trim();
        params.model = document.getElementById('model-name').value.trim() || undefined;
        if (apiMode === 'custom') {
            params.baseUrl = document.getElementById('base-url').value.trim() || undefined;
        }
    }

    // Show loading
    UIRenderer.showLoading();
    document.getElementById('analyze-btn').disabled = true;
    document.getElementById('share-content-row').classList.add('hidden');

    // Preflight check for local/custom endpoints
    if (apiMode === 'ollama' || apiMode === 'custom') {
        updateLoadingStatus('Checking connection...', 'Verifying ' + (apiMode === 'ollama' ? 'Ollama' : 'endpoint') + ' is reachable');

        const check = await ApiClient.preflightCheck(params);
        if (!check.ok) {
            UIRenderer.showError(check.error);
            document.getElementById('analyze-btn').disabled = false;
            document.getElementById('share-content-row').classList.remove('hidden');
            return;
        }

        if (check.gptOssSuggestion && apiMode === 'ollama') {
            updateLoadingStatus('Connected to Ollama', 'Tip: You have ' + check.gptOssSuggestion + ' installed — consider using it for best results');
            await new Promise(r => setTimeout(r, 1500));
        } else {
            updateLoadingStatus('Connected', 'Model verified — building analysis request');
            await new Promise(r => setTimeout(r, 500));
        }
    }

    // Build detection prompt
    updateLoadingStatus('Analyzing content...', 'Building detection analysis for ' + (apiMode === 'puter' ? 'Puter' : apiMode === 'ollama' ? 'Ollama' : apiMode));
    const { system, user } = DetectionEngine.buildDetectionPrompt(content);
    params.systemMessage = system;
    params.userMessage = user;

    // Start slow-hint timer
    document.getElementById('slow-hint').classList.add('hidden');
    clearTimeout(slowHintTimer);
    slowHintTimer = setTimeout(() => {
        const loadingSection = document.getElementById('loading-section');
        if (!loadingSection.classList.contains('hidden')) {
            document.getElementById('slow-hint').classList.remove('hidden');
        }
    }, 10000);

    // Update status after short delay
    setTimeout(() => {
        const loadingSection = document.getElementById('loading-section');
        if (!loadingSection.classList.contains('hidden')) {
            updateLoadingStatus('Analyzing content...', 'Examining vocabulary, structure, and stylistic patterns');
        }
    }, 1000);

    setTimeout(() => {
        const loadingSection = document.getElementById('loading-section');
        if (!loadingSection.classList.contains('hidden')) {
            updateLoadingStatus('Deep analysis...', 'Evaluating coherence, factual patterns, and temperature markers');
        }
    }, 4000);

    try {
        const result = await ApiClient.analyze(params);
        UIRenderer.renderOutput(result, content);
    } catch (err) {
        if (err.puterFallback) {
            showPuterFallback(err.message);
        }
        UIRenderer.showError(err.message);
    } finally {
        clearTimeout(slowHintTimer);
        document.getElementById('slow-hint').classList.add('hidden');
        document.getElementById('analyze-btn').disabled = false;
        document.getElementById('share-content-row').classList.remove('hidden');
        updateLoadingStatus('Analyzing content...', 'Examining vocabulary, structure, and stylistic patterns');
    }
}
