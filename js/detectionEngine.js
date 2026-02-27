console.log('[DEBUG] detectionEngine.js loading...');
const DetectionEngine = (() => {
    console.log('[DEBUG] DetectionEngine IIFE executing...');

    /**
     * Build the detection prompt, optionally enhanced with local slop analysis
     * @param {string} content - The content to analyze
     * @param {Object} slopAnalysis - Optional pre-computed slop analysis from SlopDetector
     * @returns {Object} System and user messages for the LLM
     */
    function buildDetectionPrompt(content, slopAnalysis = null) {
        
        // Build context from slop analysis if available
        let slopContext = '';
        if (slopAnalysis && slopAnalysis.indicators) {
            const aiPatterns = slopAnalysis.indicators.ai.slice(0, 8).map(i => 
                `- ${i.type} (${i.count}x)${i.examples ? ': ' + i.examples : ''}`
            ).join('\n');
            
            const humanPatterns = slopAnalysis.indicators.human.slice(0, 6).map(i => 
                `- ${i.type} (${i.count}x)${i.examples ? ': ' + i.examples : ''}`
            ).join('\n');
            
            slopContext = `
PRE-ANALYSIS PATTERN DETECTION:
A local pattern detector has already scanned this text and found the following:

Slop Score: ${slopAnalysis.score}/100 (${slopAnalysis.score >= 70 ? 'high AI probability' : slopAnalysis.score <= 30 ? 'low AI probability' : 'mixed signals'})
Local Confidence: ${slopAnalysis.confidence}

AI PATTERNS DETECTED:
${aiPatterns || '(none found)'}

HUMAN PATTERNS DETECTED:
${humanPatterns || '(none found)'}

STRUCTURAL METRICS:
- Word count: ${slopAnalysis.metrics?.wordCount || 'unknown'}
- Sentence length uniformity: ${slopAnalysis.metrics?.sentenceAnalysis?.isAiLike ? 'uniform (AI-like)' : slopAnalysis.metrics?.sentenceAnalysis?.isHumanLike ? 'varied (human-like)' : 'moderate'}
- Paragraph structure: ${slopAnalysis.metrics?.paragraphAnalysis?.isAiLike ? 'uniform (AI-like)' : slopAnalysis.metrics?.paragraphAnalysis?.isHumanLike ? 'varied (human-like)' : 'moderate'}

Use this pre-analysis to GUIDE your assessment. The pattern detector is heuristic-based, so also apply your semantic understanding to confirm or refute these findings. Your final score should generally align with the slop score unless you have strong semantic reasons to differ.

`;
        }

        const systemMessage = `You are an expert AI content detection analyst specializing in distinguishing between human-written text, AI-generated text, and collaborative human-AI content. Your analysis is nuanced, probabilistic, and explains its reasoning.

CRITICAL LIMITATIONS YOU MUST ACKNOWLEDGE:
- AI detection CANNOT be 100% accurate
- Humans can write in ways that appear AI-like
- AI can be prompted to write in human-like styles
- Writing style varies enormously across individuals and contexts
- Your analysis provides PROBABILITY ESTIMATES, not definitive proof
${slopContext}
KNOWN AI WRITING PATTERNS (SLOP INDICATORS):

CRITICAL (High Confidence AI Markers):
- Antithetical constructions: "It's not about X, it's about Y", "This isn't just X—it's Y"
- Sycophantic openings: "Great question!", "That's fascinating!", "Thanks for sharing!"
- Colon declarations: "The answer is simple:", "Here's the thing:", "The bottom line:"
- AI self-reference: "As an AI", "As a language model"
- Excessive bullet/numbered lists when prose would suffice

HIGH PRIORITY PATTERNS:
- Formulaic transitions: However, Moreover, Furthermore, Additionally, That said, Interestingly
- Formulaic openers: "Let me explain", "Let's dive in", "In this article I will", "Picture this"
- Formulaic closers: "In conclusion", "At the end of the day", "I'd love to hear your thoughts"
- Em dash overuse (—) more than 2 per 500 words
- Pseudo-profound statements: "At its core", "What really matters is", "This changes everything"

MEDIUM PRIORITY PATTERNS:
- Intensifier clusters: incredibly, extremely, absolutely, truly, deeply, genuinely, actually
- Hedge word clusters: perhaps, maybe, might, could potentially, arguably, seemingly
- Corporate/AI vocabulary: landscape, ecosystem, framework, paradigm, leverage, utilize, seamless, robust, impactful, delve, unpack, navigate, fostering, underscore, multifaceted, meticulous, embark
- Balanced perspectives: "On one hand... on the other hand", "There are pros and cons"
- Passive voice clusters: "It was determined that", "It should be noted that"
- Self-referential meta-commentary: "As I mentioned above", "This brings us to"

HUMAN MARKERS:
- Informal language: gonna, wanna, kinda, btw, tbh, lol, yeah, nah
- Personal anecdotes: "I remember when", "My friend told me", "Back in college"
- Genuine uncertainty: "I'm not sure but", "Don't quote me on this", "I could be wrong"
- Colloquialisms: sorta, basically, you know, I mean, no brainer
- Emotional authenticity: ugh, meh, yikes, damn, crap
- Self-corrections/tangents: "wait, actually", "scratch that", "sorry I'm rambling"
- Specific concrete details: exact dates, specific dollar amounts, named people/places

You analyze text across these 8 dimensions:

1. VOCABULARY PATTERNS
   - Lexical diversity (type-token ratio)
   - Unusual word choices vs. common alternatives
   - Domain-specific terminology usage
   - Hedging language frequency ("might", "could", "perhaps")

2. SENTENCE STRUCTURE
   - Length variation (AI tends toward uniformity)
   - Complexity patterns (nested clauses, run-ons)
   - Rhythm and cadence
   - Parallel structure usage

3. COHERENCE & FLOW
   - Logical transitions between ideas
   - Topic consistency
   - Narrative thread maintenance
   - Non-sequiturs or tangents (human marker)

4. STYLISTIC MARKERS
   - Personal voice and idiosyncrasies
   - Cultural references and idioms
   - Humor, sarcasm, irony
   - Emotional authenticity
   - Contradictions in tone

5. FACTUAL PATTERNS
   - Confidence in claims
   - Hedging vs. certainty
   - Verifiable specifics vs. vague generalities
   - "Safe" neutral positions (AI marker)

6. STRUCTURAL PATTERNS
   - Formulaic openings/closings
   - Bullet point and list usage
   - "In conclusion" / "To summarize" phrases
   - Perfect paragraph structure

7. ERROR PATTERNS
   - Typos and grammatical quirks
   - Inconsistent formatting
   - Self-corrections
   - Regional language variations

8. TEMPERATURE MARKERS
   - Predictability of word choices
   - Creative/unexpected combinations
   - Repetitive phrasing patterns

You must return a valid JSON object with exactly these keys:

- "detection_score": An integer from 0 to 100, where:
  - 0-20: Almost certainly human-written
  - 21-40: Likely human-written with some AI-like patterns
  - 41-60: Uncertain / likely collaboration
  - 61-80: Likely AI-generated with some human editing
  - 81-100: Almost certainly AI-generated

- "classification": One of "human", "ai", or "collaboration"

- "confidence": One of "high", "medium", or "low" — how confident you are in your classification

- "human_probability": An integer 0-100 representing probability content is human-written

- "ai_probability": An integer 0-100 representing probability content is AI-generated
  (Note: human_probability + ai_probability should equal 100)

- "summary": 2-3 sentences summarizing your analysis. Be direct and specific. Mention the most compelling evidence for your classification and acknowledge uncertainty where appropriate.

- "ai_indicators": An array of 2-5 strings listing specific patterns in the text that suggest AI generation. Be specific — quote or reference actual content, don't give generic descriptions.

- "human_indicators": An array of 2-5 strings listing specific patterns in the text that suggest human authorship. Be specific — quote or reference actual content.

- "reasoning": An array of 3-6 objects analyzing different dimensions. Each object has:
  - "dimension": The analysis dimension name (e.g., "Vocabulary Patterns", "Sentence Structure")
  - "finding": A 2-4 sentence analysis of what you found in this dimension
  - "leans_toward": One of "human", "ai", or "neutral"

- "highlighted_passages": An array of objects breaking the content into sentence-level segments. Each sentence or short phrase should be individually classified. Each object has:
  - "text": The exact sentence or phrase from the input (preserve exact text)
  - "classification": One of "ai", "human", or "collaboration"
  - "reason": A brief explanation (1 sentence) of why this passage exhibits these characteristics

CRITICAL FOR HIGHLIGHTED_PASSAGES: You MUST break the text into individual sentences. Every sentence gets its own entry. The concatenation of all "text" fields should reproduce the original content. Do NOT combine multiple sentences into one passage unless they are very short.

- "limitations_note": 1-2 sentences explaining why this analysis cannot be considered definitive. Mention specific factors that create uncertainty for THIS particular text.

Return ONLY the JSON object. No markdown fences, no preamble, no explanation outside the JSON.`;

        const userMessage = `Analyze the following content and determine whether it was written by a human, generated by AI, or created through human-AI collaboration. Provide detailed reasoning across multiple dimensions.

--- CONTENT TO ANALYZE ---
${content}
--- END CONTENT ---

Provide your analysis as the specified JSON object. Break the text into INDIVIDUAL SENTENCES for highlighted_passages (one sentence per object). Remember: express uncertainty appropriately and never claim 100% accuracy.`;

        return {
            system: systemMessage,
            user: userMessage
        };
    }

    /**
     * Run local slop detection
     * @param {string} content - The content to analyze
     * @returns {Object} Slop analysis results
     */
    function runLocalAnalysis(content) {
        if (typeof SlopDetector !== 'undefined') {
            return SlopDetector.analyze(content);
        }
        return null;
    }

    /**
     * Generate fallback highlighted passages if LLM fails to provide them
     * @param {string} content - Original content
     * @param {Object} result - LLM result (may have empty/invalid passages)
     * @param {Object} slopAnalysis - Local slop analysis
     * @returns {Array} Array of passage objects
     */
    function generateFallbackHighlights(content, result, slopAnalysis) {
        // If LLM provided valid passages that cover most of the text, use them
        if (result.highlighted_passages && result.highlighted_passages.length > 0) {
            const coveredLength = result.highlighted_passages.reduce((sum, p) => sum + (p.text?.length || 0), 0);
            if (coveredLength >= content.length * 0.8) {
                return result.highlighted_passages;
            }
        }

        // Use slop detector to generate sentence-level highlights
        if (typeof SlopDetector !== 'undefined') {
            return SlopDetector.generateHighlightedPassages(content, slopAnalysis);
        }

        // Ultimate fallback: classify entire content based on overall result
        return [{
            text: content,
            classification: result.classification || 'collaboration',
            reason: result.summary || 'Overall classification based on analysis'
        }];
    }

    /**
     * Merge local slop analysis with LLM analysis for better results
     * @param {Object} llmResult - Result from LLM
     * @param {Object} slopAnalysis - Local slop detector result
     * @param {string} originalContent - Original content for fallback
     * @returns {Object} Enhanced result
     */
    function enhanceWithLocalAnalysis(llmResult, slopAnalysis, originalContent) {
        if (!slopAnalysis) return llmResult;

        const result = { ...llmResult };

        // Add slop detector metadata
        result.local_analysis = {
            slop_score: slopAnalysis.score,
            confidence: slopAnalysis.confidence,
            explanation: slopAnalysis.explanation,
            pattern_counts: slopAnalysis.metrics?.patternCounts,
            raw_scores: slopAnalysis.rawScores
        };

        // If LLM score differs significantly from slop score, note the discrepancy
        if (result.detection_score !== undefined && slopAnalysis.score !== undefined) {
            const diff = Math.abs(result.detection_score - slopAnalysis.score);
            if (diff > 25) {
                result.analysis_note = `Local pattern detection (${slopAnalysis.score}) and semantic analysis (${result.detection_score}) show ${diff}pt discrepancy. The local detector found ${slopAnalysis.metrics?.patternCounts?.critical || 0} critical and ${slopAnalysis.metrics?.patternCounts?.high || 0} high-priority AI patterns.`;
            }
        }

        // Add any AI indicators from slop detector that weren't in LLM response
        if (slopAnalysis.indicators?.ai) {
            const existingIndicators = new Set((result.ai_indicators || []).map(i => i.toLowerCase()));
            for (const indicator of slopAnalysis.indicators.ai.slice(0, 3)) {
                const indicatorText = `[Local] ${indicator.type}: ${indicator.examples || `(${indicator.count}x)`}`;
                if (!existingIndicators.has(indicatorText.toLowerCase())) {
                    result.ai_indicators = result.ai_indicators || [];
                    result.ai_indicators.push(indicatorText);
                }
            }
        }

        // Add human indicators from slop detector
        if (slopAnalysis.indicators?.human) {
            const existingIndicators = new Set((result.human_indicators || []).map(i => i.toLowerCase()));
            for (const indicator of slopAnalysis.indicators.human.slice(0, 2)) {
                const indicatorText = `[Local] ${indicator.type}: ${indicator.examples || `(${indicator.count}x)`}`;
                if (!existingIndicators.has(indicatorText.toLowerCase())) {
                    result.human_indicators = result.human_indicators || [];
                    result.human_indicators.push(indicatorText);
                }
            }
        }

        // Fix highlighted passages if needed
        result.highlighted_passages = generateFallbackHighlights(originalContent, result, slopAnalysis);

        return result;
    }

    const exports = { 
        buildDetectionPrompt,
        runLocalAnalysis,
        enhanceWithLocalAnalysis,
        generateFallbackHighlights
    };
    console.log('[DEBUG] DetectionEngine exports:', Object.keys(exports));
    return exports;
})();
console.log('[DEBUG] DetectionEngine loaded:', typeof DetectionEngine, DetectionEngine ? Object.keys(DetectionEngine) : 'null');
