console.log('[DEBUG] app.js loading...');
let slowHintTimer = null;

console.log('[DEBUG] Checking initial state - ApiClient:', typeof ApiClient, 'UIRenderer:', typeof UIRenderer, 'DetectionEngine:', typeof DetectionEngine, 'SlopDetector:', typeof SlopDetector);

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
    setupUrlFetcher();
    setupOsTabs();

    // Input tabs (Paste, URL, File)
    const inputTabs = document.querySelectorAll('.input-tab');
    const tabContents = {
        paste: document.getElementById('input-tab-paste'),
        url: document.getElementById('input-tab-url'),
        file: document.getElementById('input-tab-file')
    };
    inputTabs.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            inputTabs.forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            Object.values(tabContents).forEach(tc => tc.classList.add('hidden'));
            tabContents[tab].classList.remove('hidden');
        });
    });

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

    // Show/hide AI model dropdown based on authorship type
    const attestModelSelect = document.getElementById('attest-model');
    if (attestModelSelect) {
        attestModelSelect.addEventListener('change', () => {
            const aiModelGroup = document.getElementById('attest-ai-model-group');
            if (aiModelGroup) {
                aiModelGroup.classList.toggle('hidden', attestModelSelect.value === 'human');
            }
        });
    }

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

    // File upload handler
    const fileUpload = document.getElementById('file-upload');
    const fileCharCount = document.getElementById('file-char-count');
    if (fileUpload) {
        fileUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                let text = event.target.result;
                // Strip HTML tags if it's an HTML file
                if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
                    const doc = new DOMParser().parseFromString(text, 'text/html');
                    text = doc.body.textContent || doc.body.innerText || '';
                }
                document.getElementById('content-input').value = text;
                fileCharCount.textContent = text.length.toLocaleString();
                // Switch to paste tab to show content
                inputTabs.forEach(t => t.classList.remove('active'));
                inputTabs[0].classList.add('active');
                Object.values(tabContents).forEach(tc => tc.classList.add('hidden'));
                tabContents.paste.classList.remove('hidden');
                // Update char counter for paste
                document.getElementById('char-count').textContent = text.length.toLocaleString();
            };
            reader.readAsText(file);
        });
    }

    // URL fetch handler for unified input
    const fetchUrlBtn = document.getElementById('fetch-url-btn');
    if (fetchUrlBtn) {
        fetchUrlBtn.addEventListener('click', async () => {
            const urlInput = document.getElementById('url-input');
            const url = urlInput.value.trim();
            if (!url) return;
            try {
                fetchUrlBtn.disabled = true;
                fetchUrlBtn.textContent = 'Fetching...';
                const result = await UrlExtractor.extract(url);
                let content = '';
                if (result.title) content = result.title + '\n\n';
                content += result.content;
                document.getElementById('content-input').value = content;
                document.getElementById('char-count').textContent = content.length.toLocaleString();
                // Show preview in accordion
                const accordion = document.getElementById('fetched-content-accordion');
                const fetchedText = document.getElementById('fetched-content-text');
                if (accordion && fetchedText) {
                    fetchedText.textContent = content.length > 2000 ? content.slice(0, 2000) + '...' : content;
                    accordion.classList.remove('hidden');
                }
                // Switch to paste tab to show content
                inputTabs.forEach(t => t.classList.remove('active'));
                inputTabs[0].classList.add('active');
                Object.values(tabContents).forEach(tc => tc.classList.add('hidden'));
                tabContents.paste.classList.remove('hidden');
            } catch (err) {
                alert('Failed to fetch URL: ' + err.message);
            } finally {
                fetchUrlBtn.disabled = false;
                fetchUrlBtn.textContent = 'Fetch Content';
            }
        });
    }

    // Analyze button
    document.getElementById('analyze-btn').addEventListener('click', handleAnalyze);
    
    // Quick Analyze button (local only, instant)
    const quickAnalyzeBtn = document.getElementById('quick-analyze-btn');
    if (quickAnalyzeBtn) {
        quickAnalyzeBtn.addEventListener('click', handleQuickAnalyze);
    }

    // Ctrl/Cmd+Enter to analyze
    contentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            handleAnalyze();
        }
    });

    // URL routing
    handleUrlRouting();
    
    // Setup attestation functionality
    setupAttestationButtons();
    
    // Setup API query parameter handling
    setupApiQueryParams();
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

// --- URL Fetcher ---

function setupUrlFetcher() {
    // Setup accordion toggle for fetched content
    const accordionToggle = document.getElementById('toggle-fetched-content');
    const accordionContent = document.getElementById('fetched-content-preview');
    
    if (accordionToggle && accordionContent) {
        accordionToggle.addEventListener('click', () => {
            const isHidden = accordionContent.classList.contains('hidden');
            accordionContent.classList.toggle('hidden');
            const icon = accordionToggle.querySelector('.accordion-icon');
            if (icon) {
                icon.textContent = isHidden ? '▼' : '▶';
            }
        });
    }
}

// Fetch URL content before analysis (called from handleAnalyze/handleQuickAnalyze)
async function fetchUrlIfNeeded() {
    const urlInput = document.getElementById('url-input');
    const contentInput = document.getElementById('content-input');
    const charCount = document.getElementById('char-count');
    const accordion = document.getElementById('fetched-content-accordion');
    const fetchedText = document.getElementById('fetched-content-text');
    
    const url = urlInput.value.trim();
    const existingContent = contentInput.value.trim();
    
    // Only fetch if URL is provided and content is empty
    if (!url) return true;
    if (existingContent) return true; // Content already present, don't overwrite
    
    UIRenderer.hideError();
    
    try {
        updateLoadingStatus('Fetching URL...', 'Extracting content from ' + new URL(url).hostname);
        
        const result = await UrlExtractor.extract(url);
        
        // Build content
        let content = '';
        if (result.title) {
            content = result.title + '\n\n';
        }
        content += result.content;
        
        // Populate content input
        contentInput.value = content;
        charCount.textContent = content.length.toLocaleString();
        
        // Show fetched content in accordion
        if (accordion && fetchedText) {
            fetchedText.textContent = content.length > 2000 ? content.slice(0, 2000) + '...' : content;
            accordion.classList.remove('hidden');
        }
        
        // Clear URL input
        urlInput.value = '';
        
        return true;
    } catch (err) {
        UIRenderer.showError('Failed to fetch URL: ' + err.message);
        return false;
    }
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

// Quick analyze - local pattern detection only (instant results)
async function handleQuickAnalyze() {
    console.log('[DEBUG] handleQuickAnalyze called (local only)');
    
    // Auto-fetch URL if needed
    const urlInput = document.getElementById('url-input');
    if (urlInput.value.trim()) {
        document.getElementById('analyze-btn').disabled = true;
        document.getElementById('quick-analyze-btn').disabled = true;
        UIRenderer.showLoading();
        const fetched = await fetchUrlIfNeeded();
        UIRenderer.hideLoading();
        if (!fetched) {
            document.getElementById('analyze-btn').disabled = false;
            document.getElementById('quick-analyze-btn').disabled = false;
            return;
        }
    }
    
    const content = document.getElementById('content-input').value.trim();

    UIRenderer.hideError();

    if (!content) {
        UIRenderer.showError('Please enter content to analyze or provide a URL.');
        return;
    }

    if (content.length < 50) {
        UIRenderer.showError('Please enter at least 50 characters for meaningful analysis.');
        return;
    }

    // Disable buttons during analysis
    document.getElementById('analyze-btn').disabled = true;
    document.getElementById('quick-analyze-btn').disabled = true;

    // Run local slop detection
    if (typeof SlopDetector === 'undefined') {
        UIRenderer.showError('Local detector not loaded. Please refresh the page.');
        document.getElementById('analyze-btn').disabled = false;
        document.getElementById('quick-analyze-btn').disabled = false;
        return;
    }

    const slopAnalysis = SlopDetector.analyze(content);
    const classification = SlopDetector.classify(slopAnalysis.score);
    
    // Build result object compatible with UIRenderer
    const result = {
        detection_score: slopAnalysis.score,
        human_probability: 100 - slopAnalysis.score,
        ai_probability: slopAnalysis.score,
        classification: classification.toLowerCase(),
        confidence: slopAnalysis.confidence,
        summary: slopAnalysis.explanation,
        ai_indicators: slopAnalysis.indicators.ai.slice(0, 5).map(i => 
            `${i.type}${i.examples ? ': ' + i.examples : ''} (${i.count}x)`
        ),
        human_indicators: slopAnalysis.indicators.human.slice(0, 5).map(i => 
            `${i.type}${i.examples ? ': ' + i.examples : ''} (${i.count}x)`
        ),
        highlighted_passages: SlopDetector.generateHighlightedPassages(content, slopAnalysis),
        local_analysis: {
            slop_score: slopAnalysis.score,
            confidence: slopAnalysis.confidence,
            explanation: slopAnalysis.explanation,
            pattern_counts: slopAnalysis.metrics?.patternCounts,
            raw_scores: slopAnalysis.rawScores
        },
        analysis_note: '⚡ Quick analysis using local pattern detection only. For deeper semantic analysis, use full "Analyze Content".',
        quick_mode: true
    };

    // Store for attestation
    window.lastAnalysisResult = result;
    window.lastAnalyzedContent = content;

    // Render results
    UIRenderer.renderOutput(result, content);
    updateAttestationOptions(result);

    // Re-enable buttons
    document.getElementById('analyze-btn').disabled = false;
    document.getElementById('quick-analyze-btn').disabled = false;
}

async function handleAnalyze() {
    console.log('[DEBUG] handleAnalyze called');
    console.log('[DEBUG] Checking globals - ApiClient:', typeof ApiClient, 'DetectionEngine:', typeof DetectionEngine, 'SlopDetector:', typeof SlopDetector);
    
    // Auto-fetch URL if needed
    const urlInput = document.getElementById('url-input');
    if (urlInput.value.trim()) {
        document.getElementById('analyze-btn').disabled = true;
        document.getElementById('quick-analyze-btn').disabled = true;
        UIRenderer.showLoading();
        const fetched = await fetchUrlIfNeeded();
        if (!fetched) {
            UIRenderer.hideLoading();
            document.getElementById('analyze-btn').disabled = false;
            document.getElementById('quick-analyze-btn').disabled = false;
            return;
        }
    }
    
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
        UIRenderer.showError('Please enter content to analyze or provide a URL.');
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

    // Preflight check for local/custom endpoints
    if (apiMode === 'ollama' || apiMode === 'custom') {
        updateLoadingStatus('Checking connection...', 'Verifying ' + (apiMode === 'ollama' ? 'Ollama' : 'endpoint') + ' is reachable');

        const check = await ApiClient.preflightCheck(params);
        if (!check.ok) {
            UIRenderer.showError(check.error);
            document.getElementById('analyze-btn').disabled = false;
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
    updateLoadingStatus('Running local analysis...', 'Detecting AI patterns with local heuristics');
    
    // Run local slop detection first
    let slopAnalysis = null;
    if (typeof SlopDetector !== 'undefined') {
        slopAnalysis = DetectionEngine.runLocalAnalysis(content);
        if (slopAnalysis) {
            const localClass = SlopDetector.classify(slopAnalysis.score);
            updateLoadingStatus('Local analysis complete', 
                `Slop score: ${slopAnalysis.score}/100 (${localClass}) — now running semantic analysis`);
            await new Promise(r => setTimeout(r, 300));
        }
    }
    
    updateLoadingStatus('Analyzing content...', 'Building detection analysis for ' + (apiMode === 'puter' ? 'Puter' : apiMode === 'ollama' ? 'Ollama' : apiMode));
    const { system, user } = DetectionEngine.buildDetectionPrompt(content, slopAnalysis);
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
        console.log('[DEBUG] About to call ApiClient.analyze');
        console.log('[DEBUG] ApiClient:', ApiClient);
        console.log('[DEBUG] ApiClient.analyze:', typeof ApiClient?.analyze);
        console.log('[DEBUG] params:', params);
        
        if (typeof ApiClient?.analyze !== 'function') {
            throw new Error('ApiClient.analyze is not a function. ApiClient is: ' + JSON.stringify(Object.keys(ApiClient || {})));
        }
        
        let result = await ApiClient.analyze(params);
        console.log('[DEBUG] API result received:', result);
        
        // Enhance with local slop analysis
        if (slopAnalysis) {
            result = DetectionEngine.enhanceWithLocalAnalysis(result, slopAnalysis, content);
        }
        
        // Store result for attestation
        window.lastAnalysisResult = result;
        window.lastAnalyzedContent = content;
        
        // Update attestation options based on classification
        updateAttestationOptions(result);
        
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
        updateLoadingStatus('Analyzing content...', 'Examining vocabulary, structure, and stylistic patterns');
    }
}

// --- Attestation Functions ---

function setupAttestationButtons() {
    const createBtn = document.getElementById('btn-create-attestation');
    const copyLinkBtn = document.getElementById('btn-copy-attest-link');
    const copyBadgeBtn = document.getElementById('btn-copy-attest-badge');
    const copyEmailHeaderBtn = document.getElementById('btn-copy-email-header');
    const signMethodSelect = document.getElementById('attest-sign-method');
    
    if (createBtn) {
        createBtn.addEventListener('click', handleCreateAttestation);
    }
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', handleCopyAttestLink);
    }
    if (copyBadgeBtn) {
        copyBadgeBtn.addEventListener('click', handleCopyAttestBadge);
    }
    if (copyEmailHeaderBtn) {
        copyEmailHeaderBtn.addEventListener('click', handleCopyEmailHeader);
    }
    
    // Toggle password field visibility based on signature method
    if (signMethodSelect) {
        signMethodSelect.addEventListener('change', () => {
            const passwordGroup = document.getElementById('attest-password-group');
            if (signMethodSelect.value === 'password') {
                passwordGroup.classList.remove('hidden');
            } else {
                passwordGroup.classList.add('hidden');
            }
        });
    }
}

async function handleCreateAttestation() {
    console.log('[DEBUG] handleCreateAttestation called');
    const result = window.lastAnalysisResult;
    const content = window.lastAnalyzedContent;
    
    if (!result) {
        UIRenderer.showError('Please analyze content first before creating an attestation.');
        return;
    }
    
    const contentName = document.getElementById('attest-content-name').value.trim() || 'Analyzed Content';
    const signMethod = document.getElementById('attest-sign-method')?.value || 'none';
    
    // Determine allowed attestation type based on analysis (auto-select, don't block)
    const allowedType = getAttestationTypeFromClassification(result.classification, result.detection_score);
    const authorshipType = allowedType; // Use the allowed type directly
    
    console.log('[DEBUG] Creating attestation:', { 
        classification: result.classification, 
        score: result.detection_score, 
        allowedType, 
        authorshipType 
    });
    
    // Map authorship to attest.ink role
    let role = 'collaborated';
    if (authorshipType === 'human') role = 'authored';
    if (authorshipType === 'ai') role = 'generated';
    
    // Determine model value for attest.ink (required field)
    let modelValue = 'human';
    if (authorshipType !== 'human') {
        const aiModelSelect = document.getElementById('attest-ai-model');
        modelValue = aiModelSelect?.value || 'ai-assisted';
    }
    
    // Generate content hash using SHA-256
    const contentHash = await generateContentHash(content);
    
    // Create attestation data
    const attestationData = {
        version: '2.0',
        id: generateAttestationId(),
        content_name: contentName,
        content_hash: 'sha256:' + contentHash,
        model: modelValue,
        timestamp: new Date().toISOString(),
        platform: 'whodoneit',
        authorship_type: authorshipType,
        role: role,
        document_type: 'text',
        analysis: {
            detection_score: result.detection_score,
            human_probability: result.human_probability,
            ai_probability: result.ai_probability,
            classification: result.classification,
            confidence: result.confidence,
            local_slop_score: result.local_analysis?.slop_score
        }
    };
    
    // Handle signing based on selected method
    let signature = null;
    let signerAddress = null;
    
    if (signMethod === 'metamask') {
        try {
            const signResult = await signWithMetaMask(attestationData);
            signature = signResult.signature;
            signerAddress = signResult.address;
            attestationData.signature = {
                method: 'ethereum',
                address: signerAddress,
                signature: signature
            };
        } catch (err) {
            UIRenderer.showError('MetaMask signing failed: ' + err.message);
            return;
        }
    } else if (signMethod === 'password') {
        const password = document.getElementById('attest-password')?.value;
        if (!password) {
            UIRenderer.showError('Please enter a password for signing.');
            return;
        }
        try {
            const signResult = await signWithPassword(attestationData, password);
            signature = signResult.signature;
            attestationData.signature = {
                method: 'password-hmac',
                signature: signature
            };
        } catch (err) {
            UIRenderer.showError('Password signing failed: ' + err.message);
            return;
        }
    }
    
    // Encode attestation data
    const encodedData = btoa(JSON.stringify(attestationData));
    const verifyUrl = `https://attest.ink/verify/?data=${encodeURIComponent(encodedData)}`;
    
    // Store for copy buttons
    window.lastAttestation = {
        data: attestationData,
        encodedData,
        verifyUrl,
        content,
        result
    };
    
    // Show result
    const resultDiv = document.getElementById('attest-result');
    const previewDiv = document.getElementById('attest-badge-preview');
    
    // Create badge preview
    const badgeText = authorshipType === 'human' ? 'Human Written' : 
                      authorshipType === 'ai' ? 'AI Generated' : 'Human + AI';
    const badgeColor = authorshipType === 'human' ? '#2e7d32' : 
                       authorshipType === 'ai' ? '#c62828' : '#f57c00';
    
    let signedLabel = '';
    let signedInfo = '';
    if (signature) {
        if (signMethod === 'metamask' && signerAddress) {
            signedLabel = '<span style="font-size:11px;opacity:0.8;"> — Wallet Signed</span>';
            signedInfo = `<br>• Signature: Ethereum wallet <code style="font-size:11px;background:#f0f0f0;padding:2px 4px;border-radius:3px;">${signerAddress}</code>`;
        } else if (signMethod === 'password') {
            signedLabel = '<span style="font-size:11px;opacity:0.8;"> — Password Signed</span>';
            signedInfo = '<br>• Signature: User-provided password (HMAC-SHA256)';
        } else {
            signedLabel = '<span style="font-size:11px;opacity:0.8;"> — Signed via whodoneit</span>';
            signedInfo = '<br>• Signature: Signed via whodoneit (no wallet or password)';
        }
    } else {
        signedLabel = '<span style="font-size:11px;opacity:0.8;"> — Unsigned</span>';
        signedInfo = '<br>• Signature: None (unsigned attestation)';
    }
    
    previewDiv.innerHTML = `
        <a href="${verifyUrl}" target="_blank" rel="noopener noreferrer" style="background: ${badgeColor};">
            ${badgeText} — Verified${signedLabel}
        </a>
        <div class="attest-info">
            <strong>Attestation Created</strong><br>
            • Content: ${contentName}<br>
            • Classification: ${result.classification} (${result.detection_score}/100)<br>
            • ID: ${attestationData.id}<br>
            • Hash: <code style="font-size:10px;background:#f0f0f0;padding:1px 4px;border-radius:2px;">${attestationData.content_hash.slice(0,20)}...</code>${signedInfo}<br>
            <small>Click the badge to verify, or use the buttons below to copy.</small>
        </div>
    `;
    
    resultDiv.classList.remove('hidden');
}

// Sign attestation data with MetaMask (Ethereum personal_sign)
async function signWithMetaMask(attestationData) {
    if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed. Please install the MetaMask extension.');
    }
    
    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please connect MetaMask.');
    }
    
    const address = accounts[0];
    const message = JSON.stringify(attestationData, null, 2);
    const msgHex = '0x' + Array.from(new TextEncoder().encode(message))
        .map(b => b.toString(16).padStart(2, '0')).join('');
    
    const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [msgHex, address]
    });
    
    return { signature, address };
}

// Sign attestation data with password-derived key (HMAC-SHA256)
async function signWithPassword(attestationData, password) {
    const encoder = new TextEncoder();
    const message = JSON.stringify(attestationData);
    
    // Derive key from password using PBKDF2
    const passwordKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );
    
    const hmacKey = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: encoder.encode('whodoneit-attestation-v1'),
            iterations: 100000,
            hash: 'SHA-256'
        },
        passwordKey,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    // Sign the message
    const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        hmacKey,
        encoder.encode(message)
    );
    
    // Convert to hex string
    const signature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('');
    
    return { signature };
}

// Determine allowed attestation type based on analysis classification
function getAttestationTypeFromClassification(classification, score) {
    if (classification === 'human' || score <= 25) {
        return 'human';
    } else if (classification === 'ai' || score >= 75) {
        return 'ai';
    } else {
        return 'assisted';
    }
}

// Update attestation dropdown to only show the allowed option based on analysis
function updateAttestationOptions(result) {
    const select = document.getElementById('attest-model');
    const hint = document.getElementById('attest-model-hint');
    const aiModelGroup = document.getElementById('attest-ai-model-group');
    if (!select || !result) return;
    
    const allowedType = getAttestationTypeFromClassification(result.classification, result.detection_score);
    
    // Disable options that don't match the analysis
    Array.from(select.options).forEach(option => {
        if (option.value === allowedType) {
            option.disabled = false;
            option.selected = true;
        } else {
            option.disabled = true;
        }
    });
    
    // Show/hide AI model dropdown based on authorship type
    if (aiModelGroup) {
        aiModelGroup.classList.toggle('hidden', allowedType === 'human');
    }
    
    // Update hint text
    const typeLabels = {
        human: 'Human Written',
        assisted: 'AI-Assisted (Collaboration)',
        ai: 'AI Generated'
    };
    
    if (hint) {
        hint.textContent = `Based on analysis (score: ${result.detection_score}/100), only "${typeLabels[allowedType]}" is allowed.`;
    }
}

function generateAttestationId() {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `${dateStr}-${randomStr}`;
}

// Generate SHA-256 hash of content
async function generateContentHash(content) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function handleCopyAttestLink() {
    if (!window.lastAttestation) {
        UIRenderer.showError('Please create an attestation first.');
        return;
    }
    
    navigator.clipboard.writeText(window.lastAttestation.verifyUrl).then(() => {
        const btn = document.getElementById('btn-copy-attest-link');
        const original = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = original; }, 1500);
    });
}

function handleCopyAttestBadge() {
    if (!window.lastAttestation) {
        UIRenderer.showError('Please create an attestation first.');
        return;
    }
    
    const { data, verifyUrl } = window.lastAttestation;
    const badgeText = data.authorship_type === 'human' ? 'Human Written' : 
                      data.authorship_type === 'ai' ? 'AI Generated' : 'Human + AI';
    
    // HTML badge code
    const badgeHtml = `<a href="${verifyUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#333;color:#fff;padding:5px 10px;border-radius:4px;font-size:12px;text-decoration:none;">${badgeText}</a>`;
    
    navigator.clipboard.writeText(badgeHtml).then(() => {
        const btn = document.getElementById('btn-copy-attest-badge');
        const original = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = original; }, 1500);
    });
}

function handleCopyEmailHeader() {
    const result = window.lastAnalysisResult;
    
    if (!result) {
        UIRenderer.showError('Please analyze content first.');
        return;
    }
    
    // Generate email header format
    const header = generateEmailHeader(result);
    
    navigator.clipboard.writeText(header).then(() => {
        const btn = document.getElementById('btn-copy-email-header');
        const original = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = original; }, 1500);
    });
}

function generateEmailHeader(result) {
    const classification = result.classification?.toUpperCase() || 'UNKNOWN';
    const humanPct = result.human_probability || 0;
    const aiPct = result.ai_probability || 0;
    const score = result.detection_score || 50;
    const confidence = result.confidence || 'unknown';
    const localScore = result.local_analysis?.slop_score;
    
    let header = `═══════════════════════════════════════════════════════
📊 AI CONTENT ANALYSIS (via whodoneit)
═══════════════════════════════════════════════════════
Classification: ${classification}
Detection Score: ${score}/100
Human: ${humanPct}% | AI: ${aiPct}%
Confidence: ${confidence}`;

    if (localScore !== undefined) {
        header += `\nLocal Slop Score: ${localScore}/100`;
    }
    
    header += `
───────────────────────────────────────────────────────
${result.summary || 'No summary available.'}
═══════════════════════════════════════════════════════
`;

    return header;
}

// --- API Query Parameter Support ---

function setupApiQueryParams() {
    // Check for API mode parameters
    const params = new URLSearchParams(window.location.search);
    const apiMode = params.get('api');
    const format = params.get('format');
    
    // If api=json is specified, we'll output JSON to console after analysis
    if (apiMode === 'json' || format === 'json') {
        window.apiOutputMode = 'json';
    }
    
    // Check for callback URL
    const callback = params.get('callback');
    if (callback) {
        window.apiCallback = callback;
    }
}

// Expose API function for programmatic use
window.whodoneitAnalyze = async function(content, options = {}) {
    if (!content || content.length < 50) {
        return { error: 'Content must be at least 50 characters.' };
    }
    
    // Run local analysis
    let slopAnalysis = null;
    if (typeof SlopDetector !== 'undefined') {
        slopAnalysis = SlopDetector.analyze(content);
    }
    
    // If quick mode, return local analysis only
    if (options.quick || options.localOnly) {
        return {
            success: true,
            mode: 'local',
            detection_score: slopAnalysis?.score || 50,
            classification: SlopDetector?.classify(slopAnalysis?.score) || 'collaboration',
            confidence: slopAnalysis?.confidence || 'low',
            human_probability: 100 - (slopAnalysis?.score || 50),
            ai_probability: slopAnalysis?.score || 50,
            summary: slopAnalysis?.explanation || 'Local analysis only.',
            ai_indicators: slopAnalysis?.indicators?.ai?.map(i => i.type) || [],
            human_indicators: slopAnalysis?.indicators?.human?.map(i => i.type) || [],
            local_analysis: slopAnalysis
        };
    }
    
    // Full analysis requires API call - use existing analyze function
    // This is a simplified version for external use
    try {
        const apiMode = options.apiMode || 'puter';
        const { system, user } = DetectionEngine.buildDetectionPrompt(content, slopAnalysis);
        
        const params = {
            systemMessage: system,
            userMessage: user,
            apiMode,
            apiKey: options.apiKey,
            model: options.model,
            puterModel: options.puterModel
        };
        
        let result = await ApiClient.analyze(params);
        
        if (slopAnalysis) {
            result = DetectionEngine.enhanceWithLocalAnalysis(result, slopAnalysis, content);
        }
        
        return { success: true, mode: 'full', ...result };
    } catch (err) {
        return { error: err.message, local_analysis: slopAnalysis };
    }
};

// Generate email header for external content
window.whodoneitEmailHeader = function(content) {
    if (!content || content.length < 50) {
        return 'Content too short for analysis.';
    }
    
    const slopAnalysis = SlopDetector?.analyze(content);
    if (!slopAnalysis) {
        return 'Slop detector not available.';
    }
    
    const classification = SlopDetector.classify(slopAnalysis.score);
    
    const result = {
        classification,
        detection_score: slopAnalysis.score,
        human_probability: 100 - slopAnalysis.score,
        ai_probability: slopAnalysis.score,
        confidence: slopAnalysis.confidence,
        summary: slopAnalysis.explanation,
        local_analysis: slopAnalysis
    };
    
    return generateEmailHeader(result);
};
