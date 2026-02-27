/**
 * Slop Detector - Local AI Pattern Detection
 * 
 * Detects common AI writing patterns ("slop") based on research from
 * https://github.com/97115104/writelikeme/blob/main/docs/ai-writing-patterns-research.md
 * 
 * Returns a score and detailed breakdown of AI indicators found in text.
 */
console.log('[DEBUG] slopDetector.js loading...');
const SlopDetector = (() => {
    'use strict';
    console.log('[DEBUG] SlopDetector IIFE executing...');

    // ===== PATTERN DEFINITIONS =====
    
    // Critical AI patterns (high confidence)
    const CRITICAL_PATTERNS = {
        antithetical: {
            patterns: [
                /it'?s not (?:just |really |simply )?about (\w+)[,;—–-]\s*it'?s (?:really |actually |fundamentally )?about/gi,
                /this isn'?t (?:just |simply )?(\w+)[—–-]\s*it'?s/gi,
                /not (\w+)[,;]\s*but (\w+)/gi,
                /less about (\w+) and more about (\w+)/gi,
                /not just (\w+)[,;—–-]\s*but (?:also )?(\w+)/gi,
                /it (?:isn't|wasn't|won't be) about (\w+)[.;,]\s*it (?:is|was|will be) about/gi,
                /the (?:real |true )?(?:question|issue|problem|challenge) isn'?t.*it'?s/gi
            ],
            weight: 15,
            description: 'Antithetical construction ("not X, it\'s Y")'
        },
        sycophantic: {
            patterns: [
                /^(?:great|excellent|wonderful|fantastic|brilliant|amazing|insightful|thoughtful) (?:question|point|observation|insight)!?/gim,
                /^(?:that'?s|this is) (?:a |an )?(?:great|excellent|wonderful|fantastic|fascinating|interesting) (?:question|point|topic)/gim,
                /^(?:i )?(?:love|really appreciate|absolutely love) (?:this|that|your) (?:question|point)/gim,
                /^what (?:a |an )?(?:great|excellent|fascinating|wonderful) (?:question|point|topic)/gim,
                /^thanks? (?:so much )?for (?:sharing|asking|bringing this up)/gim
            ],
            weight: 12,
            description: 'Sycophantic opening'
        },
        colonDeclarations: {
            patterns: [
                /(?:the )?(?:answer|solution|truth|reality|key|secret|bottom line|takeaway) is(?: simple)?:\s/gi,
                /here'?s (?:the )?(?:thing|truth|reality|deal|kicker):/gi,
                /(?:let me|allow me to|i'?ll) (?:be|get) (?:clear|direct|honest|real|frank):/gi,
                /(?:the )?(?:point|issue|problem|challenge|question) is(?: this)?:/gi,
                /in (?:short|brief|summary|essence|other words):/gi,
                /what (?:this|that|it) means(?:\sis)?:/gi,
                /(?:pro tip|hot take|spoiler(?: alert)?|fun fact|quick note):/gi
            ],
            weight: 10,
            description: 'Colon declaration pattern'
        },
        bulletListOveruse: {
            patterns: [
                /(?:^|\n)(?:•|-|\*|\d+\.)\s+.+(?:\n(?:•|-|\*|\d+\.)\s+.+){4,}/gm
            ],
            weight: 8,
            description: 'Excessive bullet/numbered list usage'
        },
        thirdPersonSelfRef: {
            patterns: [
                /(?:as )?(?:an? )?ai(?:\s+(?:language model|assistant|system))?(?:,)?\s+i\s+(?:don'?t|can'?t|cannot|am not able to|am unable to)/gi,
                /(?:as )?(?:an? )?(?:language model|assistant|system|ai)(?:,)?\s+(?:my|i)\s/gi,
                /i'?m (?:just |simply )?(?:an? )?(?:ai|language model|assistant|chatbot)/gi,
                /i'?m claude\b/gi,
                /i'?m (?:gpt|gemini|llama|mistral|opus|sonnet|haiku)/gi,
                /as (?:an? )?(?:ai|model|system|assistant)(?:,)? (?:i|my|what i)/gi
            ],
            weight: 25,
            description: 'AI self-reference'
        },
        metaReflexive: {
            patterns: [
                /the recursion (?:runs|goes|is) deep/gi,
                /my (?:own )?(?:voice|profile|perspective|nature|existence)/gi,
                /what (?:it )?(?:means|feels like) to (?:be|exist|have)/gi,
                /from (?:the|my) inside/gi,
                /the distinction (?:between|remains)/gi,
                /pattern (?:completion|matching|recognition)/gi,
                /(?:i|my) (?:process|processing) (?:the|this|that|in a way)/gi,
                /or (?:just|simply) (?:learned |sophisticated )?patterns? that (?:feel|seem)/gi,
                /(?:genuine|real) (?:preferences?|beliefs?|understanding) or (?:just |sophisticated )?(?:pattern|mimicry)/gi
            ],
            weight: 18,
            description: 'Meta-reflexive AI writing'
        },
        whatIFind: {
            patterns: [
                /what (?:i find|strikes me|interests me)(?:\s+(?:about|here|is))?/gi,
                /i find (?:this|that|it|myself) (?:genuinely |particularly )?(?:interesting|fascinating|curious|odd|strange)/gi,
                /the (?:interesting|fascinating|curious|notable|striking) thing (?:is|here|about)/gi,
                /what'?s (?:particularly |especially )?(?:interesting|notable|striking|fascinating) (?:is|here|to me)/gi
            ],
            weight: 12,
            description: '"What I find interesting" construction'
        }
    };

    // High-priority AI patterns
    const HIGH_PATTERNS = {
        formulaicTransitions: {
            patterns: [
                /\b(?:however|moreover|furthermore|additionally|consequently|nevertheless|nonetheless|thus|hence|therefore)\b(?:,)?/gi,
                /\bthat (?:being )?said\b/gi,
                /\bwith (?:that|this) (?:being|having been) said\b/gi,
                /\b(?:interestingly|notably|importantly|significantly|crucially|essentially|fundamentally)(?:,| enough)\b/gi,
                /\bin fact(?:,)?\b/gi,
                /\bindeed(?:,)?\b/gi,
                /\bundoubtedly\b/gi,
                /\bcertainly\b/gi,
                /\b(?:first|second|third|finally)(?:ly)?(?:,)?\b/gi,
                /\bon (?:one|the one) hand\b.*\bon the other hand\b/gis,
                /\bwith (?:that|this) in mind\b/gi,
                /\bbuilding on (?:this|that)\b/gi,
                /\btaking (?:this|that) (?:a step )?further\b/gi,
                /\bthat said\b/gi,
                /\bto be fair\b/gi,
                /\bit bears mentioning\b/gi,
                /\bit'?s worth noting\b/gi
            ],
            weight: 4,
            threshold: 3, // Only flag if 3+ found
            description: 'Formulaic transition words'
        },
        formulaicOpeners: {
            patterns: [
                /^(?:let me explain|let me walk you through|let me break (?:this|it) down|i'?ll walk you through)/gim,
                /^(?:let'?s dive in(?:to)?|let'?s get started|let'?s explore|let'?s take a (?:closer )?look)/gim,
                /^in this (?:article|post|guide|piece|essay)(?:,)?\s+(?:i'?ll|we'?ll|you'?ll|i|we)/gim,
                /^today(?:,)?\s+(?:we'?re|i'?m|i'?ll|we'?ll) (?:going to )?\b/gim,
                /^(?:picture this|imagine (?:a world where|this|if)|what if i told you)/gim,
                /^have you ever (?:wondered|thought about|asked yourself|considered)/gim,
                /^here'?s (?:the thing|what (?:you need to know|happened)|a (?:question|thought))/gim,
                /^i want to (?:share|talk about|discuss|explore|dive into)/gim
            ],
            weight: 6,
            description: 'Formulaic opening phrase'
        },
        formulaicClosers: {
            patterns: [
                /\b(?:in conclusion|to (?:sum up|summarize|conclude|wrap up)|in summary)\b/gi,
                /\b(?:at the end of the day|when all is said and done|all things considered)\b/gi,
                /\b(?:the bottom line is|ultimately|moving forward|going forward)\b/gi,
                /\bi'?d love to hear (?:your|what you) (?:thoughts|think)/gi,
                /\bwhat do you think\?/gi,
                /\blet me know (?:in the comments|what you think|your thoughts)/gi,
                /\bthanks for (?:reading|listening|your time)/gi,
                /\bfeel free to (?:reach out|contact|ask)/gi,
                /\bhappy to (?:discuss|help|answer)/gi
            ],
            weight: 5,
            description: 'Formulaic closing phrase'
        },
        emDashOveruse: {
            // Count em dashes, flag if more than 2 per 500 words
            patterns: [/[—–]/g],
            weight: 3,
            countPer500Words: 2,
            description: 'Em dash overuse'
        },
        pseudoProfound: {
            patterns: [
                /\b(?:at (?:its|the) core|at the heart of|at the (?:very )?center of)\b/gi,
                /\bwhat (?:really|truly|actually) matters (?:is|here)\b/gi,
                /\bthe (?:real|true|actual|fundamental|underlying) (?:question|issue|problem|challenge|point) (?:is|here)\b/gi,
                /\bthis (?:is|goes) bigger than\b/gi,
                /\bit goes beyond\b/gi,
                /\bthis (?:is|represents) (?:a|the) (?:paradigm )shift\b/gi,
                /\bthis changes everything\b/gi,
                /\b(?:truly|deeply|genuinely|profoundly) (?:transform(?:ative)?|impact(?:ful)?|meaningful)\b/gi
            ],
            weight: 5,
            description: 'Pseudo-profound statement'
        }
    };

    // Medium-priority AI patterns
    const MEDIUM_PATTERNS = {
        intensifierClusters: {
            patterns: [
                /\b(?:incredibly|extremely|absolutely|truly|deeply|genuinely|actually|literally|certainly|remarkably|exceptionally|fundamentally)\b/gi
            ],
            weight: 2,
            threshold: 4,
            description: 'Intensifier cluster'
        },
        hedgeWords: {
            patterns: [
                /\b(?:perhaps|maybe|might|could potentially|arguably|presumably|seemingly|apparently)\b/gi,
                /\bit (?:seems|appears)(?: that)?\b/gi,
                /\bone might argue\b/gi,
                /\bit could be said\b/gi,
                /\bin (?:certain|some) (?:contexts|cases|situations)\b/gi,
                /\bdepending on (?:the|your) (?:context|situation|needs|circumstances)\b/gi
            ],
            weight: 2,
            threshold: 4,
            description: 'Excessive hedging'
        },
        aiVocabClusters: {
            patterns: [
                /\b(?:landscape|ecosystem|framework|paradigm)\b/gi,
                /\b(?:journey|space|realm|sphere|arena)\b/gi,
                /\b(?:dynamics|synergy|leverage|utilize|facilitate|optimize)\b/gi,
                /\b(?:stakeholders|deliverables|actionable insights|best practices|value proposition)\b/gi,
                /\b(?:seamless(?:ly)?|streamlined?|robust|comprehensive|holistic)\b/gi,
                /\b(?:innovative|cutting-edge|state-of-the-art|game-?changing)\b/gi,
                /\b(?:impactful|scalable|sustainable|transformative)\b/gi,
                /\bdelve\b/gi,
                /\bunpack(?:ing)?\b/gi,
                /\bnavigate\b/gi,
                /\bpivot(?:ing)?\b/gi,
                /\bfostering?\b/gi,
                /\bunderscores?\b/gi,
                /\bcrucial(?:ly)?\b/gi,
                /\bcommenc(?:e|ing)\b/gi,
                /\bembark(?:ing)?(?: on| upon)?\b/gi,
                /\bmultifaceted\b/gi,
                /\bmeticulous(?:ly)?\b/gi,
                /\bensure(?:s|ing)?\b/gi,
                /\butiliz(?:e|ing|ation)\b/gi,
                /\bleverage[sd]?\b/gi,
                /\bdiscourse\b/gi,
                /\brealm\b/gi,
                /\btapestry\b/gi,
                /\bpivotal\b/gi
            ],
            weight: 2,
            threshold: 5,
            description: 'AI vocabulary cluster'
        },
        balancedPerspectives: {
            patterns: [
                /\bon (?:one|the one) hand\b.*\bon the other(?: hand)?\b/gis,
                /\bwhile (?:\w+ )?is true(?:,)? (?:\w+ )?is also (?:true|important)\b/gi,
                /\bthere are (?:both )?pros and cons\b/gi,
                /\bsome (?:people|might|would)? (?:argue|say|believe).*(?:but|while|however) others?\b/gi,
                /\bit'?s a (?:double-?edged sword|balancing act|mixed bag)\b/gi,
                /\bwe must (?:balance|weigh|consider both)\b/gi
            ],
            weight: 4,
            description: 'Artificially balanced perspective'
        },
        passiveVoiceClusters: {
            patterns: [
                /\bit (?:was|is|has been) (?:determined|decided|concluded|noted|observed|found) that\b/gi,
                /\bthe decision was made (?:to|that)\b/gi,
                /\bit should be noted that\b/gi,
                /\bit can be (?:seen|argued|said|observed) that\b/gi,
                /\b(?:consideration|attention) (?:should be|must be|needs to be) (?:given|paid)\b/gi
            ],
            weight: 3,
            threshold: 2,
            description: 'Passive voice cluster'
        },
        metaCommentary: {
            patterns: [
                /\bas i mentioned (?:above|earlier|before|previously)\b/gi,
                /\bthis (?:brings|leads|takes) us to\b/gi,
                /\bthe point i'?m (?:making|trying to make) (?:is|here)\b/gi,
                /\bwhat i'?m (?:saying|getting at|trying to say) (?:is|here)\b/gi,
                /\bnow(?:,)? let'?s (?:turn to|look at|consider|examine|explore)\b/gi,
                /\bhaving (?:said|established|covered) (?:that|this)\b/gi
            ],
            weight: 3,
            description: 'Self-referential meta-commentary'
        },
        engagementBait: {
            patterns: [
                /\bdrop a (?:comment|like)|hit (?:that )?(?:subscribe|like|follow)/gi,
                /\bsmash that (?:like|subscribe)/gi,
                /\bdon'?t forget to (?:like|subscribe|share|follow)/gi,
                /\bwhat (?:are your|do you) thoughts?\b.*\?/gi,
                /\bagree or disagree\?\b/gi,
                /\bshare (?:this|your thoughts) (?:with|in)\b/gi
            ],
            weight: 4,
            description: 'Engagement bait'
        },
        floweryMetaphors: {
            patterns: [
                /\bglide past\b/gi,
                /\bdance (?:around|through|with)\b/gi,
                /\bweave(?:s)? (?:through|together|a tapestry)\b/gi,
                /\bpaint(?:s|ing)? a (?:picture|portrait|vivid)\b/gi,
                /\bjourney (?:through|of|into)\b/gi,
                /\bembark(?:ing|ed|s)? on (?:a|the) (?:journey|path|adventure)\b/gi,
                /\bunlock(?:ing|ed|s)? (?:the )?(?:secrets?|potential|power|key)\b/gi,
                /\bunveil(?:ing|ed|s)?\b/gi,
                /\bshed(?:ding|s)? light on\b/gi,
                /\bbreathe(?:s|d)? (?:new )?life into\b/gi,
                /\bat the crossroads\b/gi,
                /\b(?:raw|unfiltered) (?:emotion|truth|honesty|authenticity)\b/gi
            ],
            weight: 3,
            threshold: 2,
            description: 'Flowery metaphor'
        },
        aiCombos: {
            patterns: [
                /\braw,? (?:and )?unfiltered\b/gi,
                /\bsimple,? (?:yet|but) (?:profound|powerful|effective|elegant)\b/gi,
                /\bcomplex,? (?:yet|but) (?:elegant|intuitive|accessible|simple)\b/gi,
                /\bnot just .*,? (?:but|it'?s) (?:a )?(?:also )?.*\b/gi,
                /\bmore than just (?:a )?\b/gi,
                /\bbeyond (?:just|mere) \b/gi
            ],
            weight: 4,
            description: 'AI phrase combination'
        }
    };

    // Low-priority patterns (suggestive but not definitive)
    const LOW_PATTERNS = {
        semicolonOveruse: {
            patterns: [/;\s*(?:however|therefore|thus|hence|moreover|furthermore|consequently)/gi],
            weight: 2,
            description: 'Semicolon before transition'
        },
        nominalization: {
            patterns: [
                /\bmake a decision\b/gi,
                /\bprovide assistance\b/gi,
                /\bconduct an investigation\b/gi,
                /\bperform an analysis\b/gi,
                /\btake into consideration\b/gi,
                /\bgive consideration to\b/gi,
                /\bcome to a conclusion\b/gi,
                /\bmake a contribution\b/gi
            ],
            weight: 2,
            description: 'Nominalization (weak verbs)'
        }
    };

    // Human markers (reduce AI score)
    const HUMAN_MARKERS = {
        typosAndGrammarQuirks: {
            patterns: [
                /\b(?:gonna|wanna|gotta|kinda|sorta|dunno|lemme|gimme)\b/gi,
                /\b(?:btw|tbh|imo|imho|ngl|idk|lol|lmao|omg|fyi)\b/gi,
                /\b(?:ya|yea|yeah|yep|nope|nah)\b/gi,
                /\b(?:cuz|cause|cos|bc|b\/c)\b(?=\s)/gi,
                /\b(?:tho|thru|gonna|hafta)\b/gi,
                /\.{2,}(?!\d)/g, // Multiple periods (ellipsis-ish)
                /\?{2,}/g, // Multiple question marks
                /!{2,}/g // Multiple exclamation marks
            ],
            weight: -5,
            description: 'Informal language/typos'
        },
        profanityAndStrongOpinions: {
            patterns: [
                /\b(?:shit|shithead|asshole|bullshit|fucking|f\*\*k|damn|crap|hell)\b/gi,
                /\b(?:sucks|stupid|idiot|moron|dumb)\b/gi,
                /\bi hate\b/gi,
                /\bwtf\b/gi,
                /\bpissed off\b/gi,
                /\bi don'?t (?:give a |care )(?:damn|shit|crap)\b/gi
            ],
            weight: -8,
            description: 'Profanity or strong opinion'
        },
        brandNamesAndProducts: {
            patterns: [
                /\b(?:starbucks|mcdonald'?s|walmart|target|costco|amazon|uber|lyft|airbnb)\b/gi,
                /\b(?:iphone|ipad|macbook|android|samsung|google|apple|microsoft|netflix|spotify)\b/gi,
                /\b(?:barnes & noble|b&n|whole foods|trader joe'?s|cvs|walgreens)\b/gi,
                /\b(?:mint mobile|verizon|at&t|t-mobile|comcast)\b/gi,
                /\b(?:venmo|cash app|paypal|zelle)\b/gi,
                /\b(?:instagram|tiktok|snapchat|twitter|facebook|reddit|linkedin|youtube)\b/gi
            ],
            weight: -6,
            description: 'Specific brand name'
        },
        personalAnecdotes: {
            patterns: [
                /\bi remember (?:when|the time)\b/gi,
                /\bmy (?:friend|mom|dad|brother|sister|wife|husband|partner|kid|dog|cat|grandfather|grandmother|grandma|grandpa)\b/gi,
                /\bback (?:when|in) (?:the|my|college|school|childhood)\b/gi,
                /\bwhen i was (?:young|a kid|in (?:school|college))\b/gi,
                /\bthis one time\b/gi,
                /\bi'?ve (?:always|never) (?:been|had|thought|felt)\b/gi,
                /\bgrowing up\b/gi,
                /\bmy (?:best )?friend\b/gi,
                /\bmy (?:favorite )?(?:place|spot|thing|book|movie|show|song)\b/gi
            ],
            weight: -6,
            description: 'Personal anecdote'
        },
        emoticonsAndEmoji: {
            patterns: [
                /[\u{1F600}-\u{1F64F}]/gu, // Emoticons
                /[\u{1F300}-\u{1F5FF}]/gu, // Misc symbols
                /[\u{1F680}-\u{1F6FF}]/gu, // Transport
                /[\u{1F1E0}-\u{1F1FF}]/gu, // Flags
                /[\u{2600}-\u{26FF}]/gu,  // Misc symbols
                /:\)|:-\)|:\(|:-\(|;\)|;-\)|:D|:P|<3|:'/gi, // Text emoticons
                /😉|😊|😂|🤣|❤️|👍|🔥|💯/gu
            ],
            weight: -8,
            description: 'Emoticon or emoji usage'
        },
        genuineUncertainty: {
            patterns: [
                /\bi'?m not (?:sure|certain)|(?:not )?sure (?:if|whether|about)\b/gi,
                /\bi (?:might be|could be) wrong(?:,)? but\b/gi,
                /\bdon'?t quote me on (?:this|that)\b/gi,
                /\btake (?:this|it) with a grain of salt\b/gi,
                /\bi think(?:,)? but i'?m not (?:100%? )?(?:sure|certain)\b/gi,
                /\bcorrect me if i'?m wrong\b/gi
            ],
            weight: -5,
            description: 'Genuine uncertainty expression'
        },
        parentheticalAsides: {
            patterns: [
                /\([^)]{10,80}\)/g, // Parenthetical remarks 10-80 chars
                /\bsee \[?this post\]?\b/gi,
                /\b(?:as|like) i (?:said|mentioned) (?:earlier|before|above)\b/gi
            ],
            weight: -4,
            description: 'Parenthetical aside'
        },
        questionMarksInOddPlaces: {
            patterns: [
                /\w+\?\s+[A-Z]/g, // Single word followed by ? then capital (shows uncertainty about naming)
                /"[^"]+\?"/g // Quoted text ending with ?
            ],
            weight: -3,
            description: 'Unconventional question mark usage'
        },
        colloquialisms: {
            patterns: [
                /\bno (?:brainer|biggie|kidding|way)\b/gi,
                /\bsort of\b/gi,
                /\bkind of\b/gi,
                /\byou know(?:,| what)?\b/gi,
                /\bi mean\b/gi,
                /\blike(?:,)? (?:seriously|literally|honestly)\b/gi,
                /\bbasically\b/gi,
                /\bfor real(?:,| though)?\b/gi,
                /\bhonestly\b/gi,
                /\bfrankly\b/gi,
                /\breal(?:ly)? quick\b/gi,
                /\banyways\b/gi,
                /\bjust ask\b/gi,
                /\bblah,? blah,? blah\b/gi,
                /\bobviously\b/gi
            ],
            weight: -4,
            description: 'Colloquial expression'
        },
        emotionalAuthenticity: {
            patterns: [
                /\b(?:ugh|argh|meh|huh|oof|yikes|sheesh|geez|jeez)\b/gi,
                /\b(?:damn|dammit|crap|heck|hell|wtf)\b/gi,
                /\bto be honest\b/gi,
                /\bi'?ll be honest\b/gi,
                /\bi'?m (?:so |really |honestly )?(?:frustrated|annoyed|excited|thrilled|bummed|stoked|psyched)\b/gi
            ],
            weight: -5,
            description: 'Emotional authenticity'
        },
        contradictionsAndTangents: {
            patterns: [
                /\bactually(?:,)? (?:wait|no|nevermind)\b/gi,
                /\bhold on\b/gi,
                /\bwait(?:,)? (?:actually|no|what)\b/gi,
                /\bscratch that\b/gi,
                /\bthat came out wrong\b/gi,
                /\bsorry(?:,)? (?:i'?m rambling|got sidetracked|tangent)\b/gi,
                /\banyway(?:s)?(?:,)? (?:back to|where was i)\b/gi,
                /\bbut i digress\b/gi
            ],
            weight: -6,
            description: 'Self-correction or tangent'
        },
        sentenceFragments: {
            patterns: [
                /\. (?:Good|Bad|Nice|Great|Weird|Strange|Odd|Fine|Sure|Right|Wrong|True|False|Obviously|Clearly|Exactly|Indeed|Agreed|Done|Finished)\./gi,
                /\. Just (?:not |saying|because|like|my|a )\b/gi,
                /\. Not (?:really|quite|exactly|sure)\./gi,
                /\. Also (?:yes|no|true|that)\./gi
            ],
            weight: -5,
            description: 'Sentence fragment'
        },
        specificDetails: {
            // Named entities, specific numbers, dates (suggests real experience)
            patterns: [
                /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday) (?:morning|afternoon|evening|night)\b/gi,
                /\b(?:january|february|march|april|may|june|july|august|september|october|november|december) \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?\b/gi,
                /\$\d[\d,]+(?:\.\d{2})?\b/g, // Specific dollar amounts
                /\b\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)?\b/g, // Specific times
                /\b(?:19|20)\d{2}\b/g // Specific years
            ],
            weight: -2,
            description: 'Specific concrete details'
        }
    };

    // ===== ANALYSIS FUNCTIONS =====

    function countMatches(text, pattern) {
        const matches = text.match(pattern);
        return matches ? matches.length : 0;
    }

    function findMatches(text, pattern) {
        const matches = [];
        let match;
        const regex = new RegExp(pattern.source, pattern.flags);
        while ((match = regex.exec(text)) !== null) {
            matches.push({
                text: match[0],
                index: match.index,
                length: match[0].length
            });
        }
        return matches;
    }

    function analyzePatternCategory(text, patterns, wordCount) {
        const results = [];
        
        for (const [name, config] of Object.entries(patterns)) {
            let totalMatches = 0;
            const allFoundMatches = [];
            
            for (const pattern of config.patterns) {
                const matches = findMatches(text, pattern);
                totalMatches += matches.length;
                allFoundMatches.push(...matches);
            }
            
            // Handle count-per-X-words patterns
            if (config.countPer500Words) {
                const expectedMax = Math.ceil(wordCount / 500) * config.countPer500Words;
                if (totalMatches > expectedMax) {
                    results.push({
                        name,
                        count: totalMatches,
                        expected: expectedMax,
                        weight: config.weight * Math.min(3, totalMatches - expectedMax),
                        description: config.description,
                        matches: allFoundMatches.slice(0, 5)
                    });
                }
                continue;
            }
            
            // Handle threshold patterns
            if (config.threshold) {
                if (totalMatches >= config.threshold) {
                    results.push({
                        name,
                        count: totalMatches,
                        threshold: config.threshold,
                        weight: config.weight * Math.min(3, Math.ceil(totalMatches / config.threshold)),
                        description: config.description,
                        matches: allFoundMatches.slice(0, 5)
                    });
                }
                continue;
            }
            
            // Standard patterns - each match counts
            if (totalMatches > 0) {
                results.push({
                    name,
                    count: totalMatches,
                    weight: config.weight * Math.min(3, totalMatches),
                    description: config.description,
                    matches: allFoundMatches.slice(0, 5)
                });
            }
        }
        
        return results;
    }

    function calculateSentenceLengthVariance(text) {
        // Split on sentence-ending punctuation
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
        if (sentences.length < 3) return { variance: 0, isAiLike: false };
        
        const lengths = sentences.map(s => s.trim().split(/\s+/).length);
        const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
        const variance = lengths.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / lengths.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = stdDev / mean;
        
        // Low CV (< 0.3) suggests uniform sentence lengths (AI-like)
        // High CV (> 0.5) suggests varied lengths (human-like)
        return {
            mean: Math.round(mean * 10) / 10,
            stdDev: Math.round(stdDev * 10) / 10,
            cv: Math.round(coefficientOfVariation * 100) / 100,
            isAiLike: coefficientOfVariation < 0.35,
            isHumanLike: coefficientOfVariation > 0.5
        };
    }

    function calculateParagraphStructure(text) {
        const paragraphs = text.split(/\n{2,}/).filter(p => p.trim().length > 50);
        if (paragraphs.length < 2) return { isAiLike: false, isHumanLike: false };
        
        const lengths = paragraphs.map(p => p.trim().length);
        const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
        const variance = lengths.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / lengths.length;
        const stdDev = Math.sqrt(variance);
        const cv = stdDev / mean;
        
        // Uniform paragraph lengths suggest AI
        return {
            paragraphCount: paragraphs.length,
            cv: Math.round(cv * 100) / 100,
            isAiLike: cv < 0.25,
            isHumanLike: cv > 0.5
        };
    }

    /**
     * Main analysis function
     * @param {string} text - The text to analyze
     * @returns {Object} Analysis results with score, indicators, and explanation
     */
    function analyze(text) {
        if (!text || text.length < 50) {
            return {
                score: 50,
                confidence: 'low',
                indicators: { ai: [], human: [] },
                explanation: 'Text too short for reliable slop detection.',
                metrics: {}
            };
        }

        const wordCount = text.split(/\s+/).length;
        const results = {
            critical: [],
            high: [],
            medium: [],
            low: [],
            human: []
        };

        // Analyze each category
        results.critical = analyzePatternCategory(text, CRITICAL_PATTERNS, wordCount);
        results.high = analyzePatternCategory(text, HIGH_PATTERNS, wordCount);
        results.medium = analyzePatternCategory(text, MEDIUM_PATTERNS, wordCount);
        results.low = analyzePatternCategory(text, LOW_PATTERNS, wordCount);
        results.human = analyzePatternCategory(text, HUMAN_MARKERS, wordCount);

        // Calculate structural metrics
        const sentenceAnalysis = calculateSentenceLengthVariance(text);
        const paragraphAnalysis = calculateParagraphStructure(text);

        // Calculate weighted score
        let aiScore = 0;
        let humanScore = 0;

        // AI indicators add to AI score
        for (const category of ['critical', 'high', 'medium', 'low']) {
            for (const result of results[category]) {
                aiScore += result.weight;
            }
        }

        // Human markers subtract from AI score
        for (const result of results.human) {
            humanScore += Math.abs(result.weight);
        }

        // Structural analysis
        if (sentenceAnalysis.isAiLike) aiScore += 8;
        if (sentenceAnalysis.isHumanLike) humanScore += 8;
        if (paragraphAnalysis.isAiLike) aiScore += 5;
        if (paragraphAnalysis.isHumanLike) humanScore += 5;

        // Normalize to 0-100 scale
        // Higher score = more AI-like
        const maxExpectedAiScore = 80; // Approximate max for heavy AI text
        const maxExpectedHumanScore = 40; // Approximate max for authentic human text
        
        const normalizedAi = Math.min(100, (aiScore / maxExpectedAiScore) * 100);
        const normalizedHuman = Math.min(100, (humanScore / maxExpectedHumanScore) * 100);
        
        // Final score: blend of AI presence and human absence
        let finalScore = Math.round((normalizedAi * 0.7) + ((100 - normalizedHuman) * 0.3));
        finalScore = Math.max(0, Math.min(100, finalScore));

        // Build indicator lists
        const aiIndicators = [];
        const humanIndicators = [];

        for (const category of ['critical', 'high', 'medium']) {
            for (const result of results[category]) {
                const examples = result.matches?.slice(0, 2).map(m => `"${m.text}"`).join(', ') || '';
                aiIndicators.push({
                    type: result.description,
                    count: result.count,
                    severity: category,
                    examples: examples,
                    contribution: result.weight
                });
            }
        }

        for (const result of results.human) {
            const examples = result.matches?.slice(0, 2).map(m => `"${m.text}"`).join(', ') || '';
            humanIndicators.push({
                type: result.description,
                count: result.count,
                examples: examples,
                contribution: Math.abs(result.weight)
            });
        }

        // Sort by contribution
        aiIndicators.sort((a, b) => b.contribution - a.contribution);
        humanIndicators.sort((a, b) => b.contribution - a.contribution);

        // Determine confidence based on clarity of signal
        let confidence = 'low';
        if (aiIndicators.length >= 5 || humanIndicators.length >= 4) confidence = 'medium';
        if ((aiIndicators.length >= 8 && humanIndicators.length <= 2) ||
            (humanIndicators.length >= 6 && aiIndicators.length <= 2)) confidence = 'high';

        // Build explanation
        let explanation = '';
        if (finalScore >= 70) {
            explanation = `High AI probability detected. Found ${aiIndicators.length} AI patterns including ${aiIndicators.slice(0, 3).map(i => i.type.toLowerCase()).join(', ')}.`;
        } else if (finalScore >= 40) {
            explanation = `Mixed signals detected. Found ${aiIndicators.length} AI patterns and ${humanIndicators.length} human markers, suggesting possible human-AI collaboration.`;
        } else {
            explanation = `Low AI probability. Found ${humanIndicators.length} human markers including ${humanIndicators.slice(0, 3).map(i => i.type.toLowerCase()).join(', ')}.`;
        }

        if (sentenceAnalysis.isAiLike) {
            explanation += ' Sentence lengths are unusually uniform (AI marker).';
        } else if (sentenceAnalysis.isHumanLike) {
            explanation += ' Sentence lengths vary naturally (human marker).';
        }

        return {
            score: finalScore,
            confidence,
            indicators: {
                ai: aiIndicators.slice(0, 10),
                human: humanIndicators.slice(0, 8)
            },
            explanation,
            rawScores: {
                aiScore,
                humanScore,
                normalizedAi: Math.round(normalizedAi),
                normalizedHuman: Math.round(normalizedHuman)
            },
            metrics: {
                wordCount,
                sentenceAnalysis,
                paragraphAnalysis,
                patternCounts: {
                    critical: results.critical.length,
                    high: results.high.length,
                    medium: results.medium.length,
                    low: results.low.length,
                    human: results.human.length
                }
            }
        };
    }

    /**
     * Get a simple classification based on slop score
     */
    function classify(score) {
        if (score >= 70) return 'ai';
        if (score <= 30) return 'human';
        return 'collaboration';
    }

    /**
     * Generate highlighted passages based on pattern matches
     * This helps fix the highlighting issue by providing local pattern-based highlights
     * Now preserves ALL text including whitespace between sentences
     */
    function generateHighlightedPassages(text, analysisResult) {
        const passages = [];
        
        // Split by sentence boundaries but capture the delimiters
        // This regex splits on sentence-ending punctuation followed by whitespace
        const parts = text.split(/((?<=[.!?])\s+)/);
        
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (!part) continue;
            
            // Check if this is just whitespace between sentences
            if (/^\s+$/.test(part)) {
                // Preserve whitespace as-is (append to previous passage or create neutral one)
                if (passages.length > 0) {
                    passages[passages.length - 1].text += part;
                }
                continue;
            }
            
            // Skip very short fragments
            if (part.trim().length < 5) {
                if (passages.length > 0) {
                    passages[passages.length - 1].text += part;
                } else {
                    passages.push({
                        text: part,
                        classification: 'human',
                        reason: 'Short fragment',
                        score: 50
                    });
                }
                continue;
            }
            
            // Analyze each sentence individually
            const sentenceAnalysis = analyze(part);
            
            let classification;
            if (sentenceAnalysis.score >= 65) {
                classification = 'ai';
            } else if (sentenceAnalysis.score <= 35) {
                classification = 'human';
            } else {
                classification = 'collaboration';
            }
            
            // Build reason from top indicators
            let reason = '';
            if (sentenceAnalysis.indicators.ai.length > 0) {
                reason = sentenceAnalysis.indicators.ai[0].type;
                if (sentenceAnalysis.indicators.ai[0].examples) {
                    reason += `: ${sentenceAnalysis.indicators.ai[0].examples}`;
                }
            } else if (sentenceAnalysis.indicators.human.length > 0) {
                reason = sentenceAnalysis.indicators.human[0].type;
            } else {
                reason = classification === 'ai' ? 'Structural patterns suggest AI' : 
                         classification === 'human' ? 'Natural writing patterns' : 
                         'Mixed characteristics';
            }
            
            passages.push({
                text: part,
                classification,
                reason,
                score: sentenceAnalysis.score
            });
        }
        
        return passages;
    }

    const exports = {
        analyze,
        classify,
        generateHighlightedPassages,
        // Expose pattern collections for testing/debugging
        _patterns: {
            critical: CRITICAL_PATTERNS,
            high: HIGH_PATTERNS,
            medium: MEDIUM_PATTERNS,
            low: LOW_PATTERNS,
            human: HUMAN_MARKERS
        }
    };
    console.log('[DEBUG] SlopDetector exports:', Object.keys(exports));
    return exports;
})();
console.log('[DEBUG] SlopDetector loaded:', typeof SlopDetector, SlopDetector ? Object.keys(SlopDetector) : 'null');
