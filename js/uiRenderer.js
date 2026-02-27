console.log('[DEBUG] uiRenderer.js loading...');
const UIRenderer = (() => {
    console.log('[DEBUG] UIRenderer IIFE executing...');
    // SVG icon definitions
    function createSvgIcon(type) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '14');
        svg.setAttribute('height', '14');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.style.cssText = 'display:inline;vertical-align:-2px;margin-right:4px;';
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        switch(type) {
            case 'warning': // Triangle with exclamation
                path.setAttribute('d', 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z');
                const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line1.setAttribute('x1', '12');
                line1.setAttribute('y1', '9');
                line1.setAttribute('x2', '12');
                line1.setAttribute('y2', '13');
                const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line2.setAttribute('x1', '12');
                line2.setAttribute('y1', '17');
                line2.setAttribute('x2', '12.01');
                line2.setAttribute('y2', '17');
                svg.appendChild(path);
                svg.appendChild(line1);
                svg.appendChild(line2);
                return svg;
            case 'check': // Checkmark
                path.setAttribute('d', 'M20 6L9 17l-5-5');
                svg.appendChild(path);
                return svg;
            case 'robot': // AI/Robot icon
                path.setAttribute('d', 'M12 8V4H8');
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', '4');
                rect.setAttribute('y', '8');
                rect.setAttribute('width', '16');
                rect.setAttribute('height', '12');
                rect.setAttribute('rx', '2');
                const c1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                c1.setAttribute('cx', '9');
                c1.setAttribute('cy', '13');
                c1.setAttribute('r', '1');
                const c2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                c2.setAttribute('cx', '15');
                c2.setAttribute('cy', '13');
                c2.setAttribute('r', '1');
                svg.appendChild(path);
                svg.appendChild(rect);
                svg.appendChild(c1);
                svg.appendChild(c2);
                return svg;
            case 'user': // Human/User icon
                path.setAttribute('d', 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2');
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', '12');
                circle.setAttribute('cy', '7');
                circle.setAttribute('r', '4');
                svg.appendChild(path);
                svg.appendChild(circle);
                return svg;
            case 'scale': // Balance/Scale icon
                path.setAttribute('d', 'M12 3v18M5 8l7-5 7 5M5 8v8a3 3 0 0 0 3 3h1M19 8v8a3 3 0 0 1-3 3h-1');
                svg.appendChild(path);
                return svg;
            default:
                return svg;
        }
    }

    function showLoading() {
        document.getElementById('loading-section').classList.remove('hidden');
        document.getElementById('output-section').classList.add('hidden');
        document.getElementById('error-section').classList.add('hidden');
    }

    function hideLoading() {
        document.getElementById('loading-section').classList.add('hidden');
    }

    function showError(message) {
        hideLoading();
        const el = document.getElementById('error-section');
        el.innerHTML = '';
        message.split('\n').forEach((line, i) => {
            if (i > 0) el.appendChild(document.createElement('br'));
            el.appendChild(document.createTextNode(line));
        });
        el.classList.remove('hidden');
    }

    function hideError() {
        document.getElementById('error-section').classList.add('hidden');
    }

    function renderOutput(result, originalContent) {
        hideLoading();
        hideError();

        const section = document.getElementById('output-section');
        section.classList.remove('hidden');

        renderAnalysisTab(result);
        renderHighlightsTab(result, originalContent);
        renderJsonTab(result);

        activateTab('analysis');
    }

    // --- Analysis Tab ---

    function renderAnalysisTab(result) {
        // Detection badge
        const badge = document.getElementById('detection-badge');
        const score = typeof result.detection_score === 'number' ? result.detection_score : 50;
        const classification = result.classification || 'collaboration';

        document.getElementById('detection-score').textContent = score;
        // Use shorter label for collaboration to fit
        const labelText = classification === 'collaboration' ? 'COLLAB' : classification.toUpperCase();
        document.getElementById('detection-label').textContent = labelText;

        badge.className = 'detection-badge';
        if (classification === 'human') badge.classList.add('classification-human');
        else if (classification === 'ai') badge.classList.add('classification-ai');
        else badge.classList.add('classification-collaboration');

        // Summary - include local analysis info if available
        let summaryText = result.summary || '';
        if (result.local_analysis?.slop_score !== undefined) {
            summaryText += ` Local pattern analysis scored ${result.local_analysis.slop_score}/100.`;
        }
        if (result.analysis_note) {
            summaryText += ` ${result.analysis_note}`;
        }
        document.getElementById('detection-summary').textContent = summaryText;

        // Confidence bar
        const humanProb = result.human_probability || (100 - score);
        const aiProb = result.ai_probability || score;

        document.getElementById('confidence-human').style.width = humanProb + '%';
        document.getElementById('confidence-ai').style.width = aiProb + '%';
        document.getElementById('human-percent').textContent = humanProb + '%';
        document.getElementById('ai-percent').textContent = aiProb + '%';

        // AI Indicators - use SVG icon
        renderItemList('ai-indicators-list', result.ai_indicators || [], 'ai-icon', createSvgIcon('warning'));

        // Human Indicators - use SVG icon
        renderItemList('human-indicators-list', result.human_indicators || [], 'human-icon', createSvgIcon('check'));

        // Reasoning
        renderReasoningList('reasoning-list', result.reasoning || []);

        // Store raw text for copying
        const rawText = buildAnalysisText(result);
        document.getElementById('analysis-raw').value = rawText;
    }

    function renderItemList(containerId, items, iconClass, iconElement) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        if (!items || items.length === 0) {
            const empty = document.createElement('p');
            empty.style.cssText = 'color:#999;font-size:13px;padding:8px 0;';
            empty.textContent = 'None identified.';
            container.appendChild(empty);
            return;
        }

        items.forEach(text => {
            const item = document.createElement('div');
            item.className = 'analysis-item';

            const icon = document.createElement('span');
            icon.className = `item-icon ${iconClass}`;
            // Clone the SVG element for each item
            if (iconElement instanceof SVGElement) {
                icon.appendChild(iconElement.cloneNode(true));
            } else {
                icon.textContent = iconElement;
            }

            const content = document.createElement('span');
            content.textContent = text;

            item.appendChild(icon);
            item.appendChild(content);
            container.appendChild(item);
        });
    }

    function renderReasoningList(containerId, reasoning) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        if (!reasoning || reasoning.length === 0) {
            const empty = document.createElement('p');
            empty.style.cssText = 'color:#999;font-size:13px;';
            empty.textContent = 'No detailed reasoning provided.';
            container.appendChild(empty);
            return;
        }

        reasoning.forEach((r, idx) => {
            const item = document.createElement('div');
            item.className = 'reasoning-item';

            const title = document.createElement('div');
            title.className = 'reasoning-title';
            // Create SVG icon based on leans_toward
            const iconType = r.leans_toward === 'ai' ? 'robot' : r.leans_toward === 'human' ? 'user' : 'scale';
            const iconSvg = createSvgIcon(iconType);
            title.appendChild(iconSvg);
            title.appendChild(document.createTextNode(r.dimension || 'Analysis ' + (idx + 1)));

            const detail = document.createElement('div');
            detail.className = 'reasoning-detail';
            detail.textContent = r.finding || '';

            item.appendChild(title);
            item.appendChild(detail);
            container.appendChild(item);
        });
    }

    function buildAnalysisText(result) {
        const lines = [];
        lines.push(`HUMAN OR AI OR BOTH ANALYSIS`);
        lines.push(`Score: ${result.detection_score}/100`);
        lines.push(`Classification: ${result.classification?.toUpperCase()}`);
        lines.push(`Confidence: ${result.confidence}`);
        lines.push(`Human Probability: ${result.human_probability}%`);
        lines.push(`AI Probability: ${result.ai_probability}%`);
        
        if (result.local_analysis) {
            lines.push('');
            lines.push(`LOCAL SLOP ANALYSIS`);
            lines.push(`Slop Score: ${result.local_analysis.slop_score}/100`);
            lines.push(`Local Confidence: ${result.local_analysis.confidence}`);
            if (result.local_analysis.explanation) {
                lines.push(`Explanation: ${result.local_analysis.explanation}`);
            }
        }
        lines.push('');

        lines.push(result.summary || '');
        lines.push('');

        if (result.ai_indicators && result.ai_indicators.length > 0) {
            lines.push('AI INDICATORS');
            result.ai_indicators.forEach(i => lines.push(`[!] ${i}`));
            lines.push('');
        }

        if (result.human_indicators && result.human_indicators.length > 0) {
            lines.push('HUMAN INDICATORS');
            result.human_indicators.forEach(i => lines.push(`[+] ${i}`));
            lines.push('');
        }

        if (result.reasoning && result.reasoning.length > 0) {
            lines.push('DETAILED REASONING');
            result.reasoning.forEach(r => {
                lines.push(`[${r.dimension}] (${r.leans_toward})`);
                lines.push(r.finding);
                lines.push('');
            });
        }

        if (result.limitations_note) {
            lines.push('LIMITATIONS');
            lines.push(result.limitations_note);
        }

        return lines.join('\n');
    }

    // --- Highlights Tab ---

    function renderHighlightsTab(result, originalContent) {
        const container = document.getElementById('highlighted-content');
        container.innerHTML = '';

        if (!originalContent) {
            container.innerHTML = '<p style="color:#666;">No content to display.</p>';
            return;
        }

        const passages = result.highlighted_passages || [];

        // If no passages, generate them locally using slop detector
        if (passages.length === 0) {
            // No highlights — classify entire content based on overall classification
            const overallClass = result.classification === 'ai' ? 'highlight-ai' :
                                 result.classification === 'human' ? 'highlight-human' :
                                 'highlight-collaboration';
            const tooltip = result.summary || 'Overall classification';
            container.innerHTML = `<span class="${overallClass}" title="${escapeHtml(tooltip)}">${escapeHtml(originalContent).replace(/\n/g, '<br>')}</span>`;
            return;
        }

        // Always use position-based highlighting to ensure ALL text is shown
        // This finds each passage in the original content and fills gaps
        let html = '';
        let lastIndex = 0;
        
        // Sort passages by their position in the original text
        const sortedPassages = [...passages].map(p => {
            const idx = originalContent.indexOf(p.text || '');
            return { ...p, foundIndex: idx };
        }).filter(p => p.foundIndex !== -1).sort((a, b) => a.foundIndex - b.foundIndex);
        
        for (const p of sortedPassages) {
            if (!p.text) continue;
            
            const passageIndex = p.foundIndex;
            
            // Skip if this passage would overlap with already processed text
            if (passageIndex < lastIndex) continue;
            
            // Add any unhighlighted text before this passage
            if (passageIndex > lastIndex) {
                const gap = originalContent.slice(lastIndex, passageIndex);
                // Analyze the gap to determine its classification
                const gapClass = getGapClassification(gap, result);
                html += `<span class="${gapClass}" title="Uncategorized segment">${escapeHtml(gap).replace(/\n/g, '<br>')}</span>`;
            }
            
            const classType = p.classification === 'ai' ? 'highlight-ai' :
                              p.classification === 'human' ? 'highlight-human' :
                              p.classification === 'unclear' ? 'highlight-unclear' :
                              'highlight-collaboration';
            let tooltip = p.reason || '';
            if (p.score !== undefined) {
                tooltip += tooltip ? ` (Score: ${p.score}/100)` : `Score: ${p.score}/100`;
            }
            html += `<span class="${classType}" title="${escapeHtml(tooltip)}">${escapeHtml(p.text).replace(/\n/g, '<br>')}</span>`;
            lastIndex = passageIndex + p.text.length;
        }
        
        // Add any remaining text after the last passage
        if (lastIndex < originalContent.length) {
            const remainder = originalContent.slice(lastIndex);
            const gapClass = getGapClassification(remainder, result);
            html += `<span class="${gapClass}" title="Uncategorized segment">${escapeHtml(remainder).replace(/\n/g, '<br>')}</span>`;
        }
        
        // If no passages were found in the text, show entire content with overall classification
        if (html === '') {
            const overallClass = result.classification === 'ai' ? 'highlight-ai' :
                                 result.classification === 'human' ? 'highlight-human' :
                                 'highlight-collaboration';
            html = `<span class="${overallClass}" title="${escapeHtml(result.summary || 'Overall classification')}">${escapeHtml(originalContent).replace(/\n/g, '<br>')}</span>`;
        }
        
        container.innerHTML = html;
    }
    
    // Determine classification for gap text based on overall result
    function getGapClassification(gapText, result) {
        // Use local slop detector if available for more accurate gap classification
        if (typeof SlopDetector !== 'undefined' && gapText.trim().length > 20) {
            const gapAnalysis = SlopDetector.analyze(gapText);
            if (gapAnalysis.score >= 65) return 'highlight-ai';
            if (gapAnalysis.score <= 35) return 'highlight-human';
            if (gapAnalysis.score >= 40 && gapAnalysis.score <= 60) return 'highlight-unclear';
            return 'highlight-collaboration';
        }
        // Fallback to overall classification for short gaps
        if (result.detection_score >= 65) return 'highlight-ai';
        if (result.detection_score <= 35) return 'highlight-human';
        if (result.detection_score >= 40 && result.detection_score <= 60) return 'highlight-unclear';
        return 'highlight-collaboration';
    }

    // --- JSON Tab ---

    function renderJsonTab(result) {
        const jsonStr = JSON.stringify(result, null, 2);
        document.getElementById('json-content').innerHTML = highlightJson(escapeHtml(jsonStr));
        document.getElementById('json-content').dataset.rawText = jsonStr;
    }

    // --- Tabs ---

    function setupTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                activateTab(btn.dataset.tab);
            });
        });
    }

    function activateTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.dataset.tab === tabName);
        });
    }

    // --- Copy buttons ---

    function setupCopyButtons() {
        document.querySelectorAll('.btn-copy').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.target;
                const el = document.getElementById(target);
                const text = el.dataset.rawText || el.value || el.textContent;
                copyToClipboard(text, btn);
            });
        });
    }

    function copyToClipboard(text, btn) {
        navigator.clipboard.writeText(text).then(() => {
            flashButton(btn);
        }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            flashButton(btn);
        });
    }

    function flashButton(btn) {
        const original = btn.textContent;
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = original;
            btn.classList.remove('copied');
        }, 1500);
    }

    // --- Download buttons ---

    function setupDownloadButtons() {
        document.querySelectorAll('.btn-download').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.target;
                const format = btn.dataset.format;
                const el = document.getElementById(target);
                const content = el.dataset.rawText || el.textContent;
                const ext = format === 'json' ? 'json' : 'txt';
                downloadFile(content, `whodoneit-analysis.${ext}`);
            });
        });
    }

    function downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // --- Helpers ---

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function highlightJson(escaped) {
        return escaped
            .replace(/"([^"\\]*(\\.[^"\\]*)*)"(\s*:)/g, '<span class="json-key">"$1"</span>$3')
            .replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, '<span class="json-string">"$1"</span>')
            .replace(/\b(-?\d+\.?\d*)\b/g, '<span class="json-number">$1</span>')
            .replace(/\b(true|false|null)\b/g, '<span class="json-keyword">$1</span>');
    }

    const exports = {
        showLoading,
        hideLoading,
        showError,
        hideError,
        renderOutput,
        setupTabs,
        setupCopyButtons,
        setupDownloadButtons
    };
    console.log('[DEBUG] UIRenderer exports:', Object.keys(exports));
    return exports;
})();
console.log('[DEBUG] UIRenderer loaded:', typeof UIRenderer);
