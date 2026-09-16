// =========================================================================
// VOCAFLOW 06D-CLOZE-ENGINE.JS (v0.10.10-16 Build 317 - EXTENDED LEARNING MODE BETA)
// AI Cloze Test (Reading Comprehension & In-Context Vocabulary Lab)
// =========================================================================

let clozePassagesList = [];
let currentClozeIndex = 0;
let currentClozeDifficulty = localStorage.getItem('vocaflow_cloze_difficulty') || 'easy';
let selectedClozeSetupDifficulty = 'easy';
let clozeSetupPassageCount = 1; // 1 | 2 | 3 | 'custom'
let clozeSetupCustomPassageCountValue = null;
let clozeSetupUseSelection = false;
let clozeSetupCustomWordList = null;

let clozeCurrentPassage = null; // Current passage object
let clozePlacements = {};       // blankIndex (1-based) -> optionId
let clozeActiveBlankIndex = 1;  // 1-based index of focused blank
let clozeSessionPointsEarned = 0;
let clozeSessionWrongBlanks = [];
let clozeSessionTotalBlanksCount = 0;
let clozeSessionCorrectBlanksCount = 0;
let clozeHintsUsed = 0;
let clozeSkipsUsed = 0;
let clozeStartTime = 0;
let clozeIsEvaluating = false;
let clozeIsAudioPlaying = false;
let clozeSpeechUtterance = null;
let clozeIsCompleted = false;

// =========================================================================
// 1. DIFFICULTY CONFIG & REWARDS ENGINE (BALANCE_V2 & V3)
// =========================================================================
function getClozeDifficultyConfig(diff) {
  if (diff === 'expert') {
    return {
      floorScore: 95,
      diffMult: 4.0,
      minBlanks: 10,
      maxBlanks: 15,
      inDeckRatio: 0.5,
      decoyRatio: 0.25, // 25% extra distractor decoy options
      baseXuRange: [150, 250],
      masteryBonus: 35,
      label: '🔥 Siêu Khó',
      passageLenDesc: '160 - 250 từ'
    };
  }
  if (diff === 'hard') {
    return {
      floorScore: 90,
      diffMult: 2.8,
      minBlanks: 8,
      maxBlanks: 12,
      inDeckRatio: 0.5,
      decoyRatio: 0.0,
      baseXuRange: [80, 130],
      masteryBonus: 25,
      label: '🔴 Khó',
      passageLenDesc: '120 - 180 từ'
    };
  }
  if (diff === 'medium') {
    return {
      floorScore: 80,
      diffMult: 2.0,
      minBlanks: 5,
      maxBlanks: 8,
      inDeckRatio: 0.75,
      decoyRatio: 0.0,
      baseXuRange: [40, 70],
      masteryBonus: 16,
      label: '🟡 Trung Bình',
      passageLenDesc: '80 - 130 từ'
    };
  }
  return {
    floorScore: 70,
    diffMult: 1.5,
    minBlanks: 3,
    maxBlanks: 5,
    inDeckRatio: 1.0, // 100% in-deck words
    decoyRatio: 0.0,
    baseXuRange: [20, 35],
    masteryBonus: 10,
    label: '🟢 Dễ',
    passageLenDesc: '50 - 80 từ'
  };
}

// =========================================================================
// 2. SETUP MODAL HANDLERS
// =========================================================================
function selectClozeSetupDifficulty(diff) {
  selectedClozeSetupDifficulty = diff;
  ['easy', 'medium', 'hard', 'expert'].forEach(d => {
    const card = document.getElementById('cloze-diff-card-' + d);
    if (card) {
      if (d === diff) {
        const colors = { easy: '#10b981', medium: '#f59e0b', hard: '#ef4444', expert: '#ec4899' };
        card.style.borderColor = colors[d];
      } else {
        card.style.borderColor = 'var(--border)';
      }
    }
  });
}

function selectClozeSetupPassageCount(count) {
  clozeSetupPassageCount = count;
  ['1', '2', '3'].forEach(c => {
    const btn = document.getElementById('cloze-pc-' + c);
    if (btn) {
      if (c === String(count)) {
        btn.classList.add('active');
        btn.style.borderColor = '#6366f1';
        btn.style.background = 'rgba(99,102,241,0.15)';
        btn.style.color = 'var(--text)';
      } else {
        btn.classList.remove('active');
        btn.style.borderColor = 'var(--border)';
        btn.style.background = 'transparent';
        btn.style.color = 'var(--text-muted)';
      }
    }
  });

  const customBtn = document.getElementById('cloze-pc-custom');
  if (customBtn) {
    if (count === 'custom') {
      customBtn.style.borderColor = '#6366f1';
      customBtn.style.background = 'rgba(99,102,241,0.15)';
    } else {
      customBtn.style.borderColor = 'var(--border)';
      customBtn.style.background = 'var(--surface-elevated)';
    }
  }
}

function handleClozeCustomPassageCountInput(val) {
  const num = parseInt(val, 10);
  if (!isNaN(num) && num > 0) {
    clozeSetupCustomPassageCountValue = Math.min(10, num);
    selectClozeSetupPassageCount('custom');
  } else {
    clozeSetupCustomPassageCountValue = null;
  }
}

function openClozeSetupModal(useSelection = false, customWordList = null) {
  clozeSetupUseSelection = useSelection;
  clozeSetupCustomWordList = customWordList;
  selectedClozeSetupDifficulty = currentClozeDifficulty;

  selectClozeSetupDifficulty(selectedClozeSetupDifficulty);
  selectClozeSetupPassageCount(1);

  const shuffleCb = document.getElementById('cloze-setup-shuffle-checkbox');
  if (shuffleCb) shuffleCb.checked = (typeof isStudyShuffle !== 'undefined') ? isStudyShuffle : true;

  // Subtitle info
  let wordCount = 0;
  if (customWordList) wordCount = customWordList.length;
  else if (useSelection && selectedWordIds && selectedWordIds.size > 0) wordCount = selectedWordIds.size;
  else if (typeof words !== 'undefined' && typeof currentDeckId !== 'undefined') wordCount = words.filter(w => w.deckId === currentDeckId).length;

  const sub = document.getElementById('cloze-setup-subtitle');
  if (sub) sub.textContent = `${wordCount} từ vựng sẵn sàng làm ngữ liệu sinh bài đọc`;

  if (typeof openModal === 'function') openModal('modal-cloze-setup');
}

async function confirmStartClozeFromModal() {
  currentClozeDifficulty = selectedClozeSetupDifficulty;
  localStorage.setItem('vocaflow_cloze_difficulty', currentClozeDifficulty);

  const shuffleCb = document.getElementById('cloze-setup-shuffle-checkbox');
  if (shuffleCb && typeof isStudyShuffle !== 'undefined') {
    isStudyShuffle = shuffleCb.checked;
    localStorage.setItem('vocaflow_study_shuffle', isStudyShuffle ? 'true' : 'false');
  }

  let finalCount = 1;
  if (clozeSetupPassageCount === 'custom' && clozeSetupCustomPassageCountValue) {
    finalCount = clozeSetupCustomPassageCountValue;
  } else if (typeof clozeSetupPassageCount === 'number') {
    finalCount = clozeSetupPassageCount;
  }

  if (typeof closeModal === 'function') closeModal('modal-cloze-setup');
  await startClozeMode(clozeSetupUseSelection, clozeSetupCustomWordList, finalCount);
}

// =========================================================================
// 3. START & INITIALIZE CLOZE MODE
// =========================================================================
async function startClozeMode(fromSelection = false, customWordList = null, totalPassagesToGenerate = 1) {
  if (typeof currentDeckId === 'undefined' && !customWordList) return;
  const deck = (typeof decks !== 'undefined') ? decks.find(d => d.id === currentDeckId) : null;
  if (!deck && !customWordList) return;

  if (typeof studySourceContext !== 'undefined') {
    studySourceContext = customWordList ? 'review-queue' : 'deck';
  }

  let targetWords = [];
  if (customWordList) {
    targetWords = [...customWordList];
  } else if (fromSelection && selectedWordIds && selectedWordIds.size > 0) {
    targetWords = words.filter(w => selectedWordIds.has(w.id));
  } else if (typeof words !== 'undefined') {
    targetWords = words.filter(w => w.deckId === currentDeckId);
  }

  if (targetWords.length === 0) {
    alert('Bộ từ này chưa có từ vựng nào để tạo bài tập điền từ Cloze Test!');
    return;
  }

  if (typeof isStudyShuffle !== 'undefined' && isStudyShuffle) {
    targetWords = [...targetWords].sort(() => Math.random() - 0.5);
  }

  // Initialize session state
  clozePassagesList = [];
  currentClozeIndex = 0;
  clozeSessionPointsEarned = 0;
  clozeSessionWrongBlanks = [];
  clozeSessionTotalBlanksCount = 0;
  clozeSessionCorrectBlanksCount = 0;
  clozeHintsUsed = 0;
  clozeSkipsUsed = 0;
  clozeStartTime = Date.now();
  clozeIsCompleted = false;

  // Show screen and initial loading state
  if (typeof showScreen === 'function') showScreen('screen-cloze');

  const diffCfg = getClozeDifficultyConfig(currentClozeDifficulty);
  const diffBadge = document.getElementById('cloze-difficulty-badge');
  if (diffBadge) {
    diffBadge.textContent = `${diffCfg.label} (x${diffCfg.diffMult})`;
  }

  const scoreBadge = document.getElementById('cloze-score-badge');
  if (scoreBadge) scoreBadge.textContent = 'Bài: +0đ';

  // Prepare passage plans
  const totalPassages = Math.max(1, totalPassagesToGenerate || 1);
  for (let p = 0; p < totalPassages; p++) {
    // Slice or shuffle target words for each passage
    let pWords = [...targetWords];
    if (p > 0) pWords = [...targetWords].sort(() => Math.random() - 0.5);
    clozePassagesList.push({
      passageIndex: p,
      targetWords: pWords,
      difficulty: currentClozeDifficulty,
      passageData: null, // Will be generated when loaded
      isGraded: false
    });
  }

  // Load and render first passage
  await loadAndRenderClozePassage(0);
}

// =========================================================================
// 4. GENERATE & LOAD PASSAGE
// =========================================================================
async function loadAndRenderClozePassage(index) {
  if (index < 0 || index >= clozePassagesList.length) return;
  currentClozeIndex = index;
  const pItem = clozePassagesList[index];

  // Stop any playing TTS audio
  stopClozePassageAudio();

  // Reset current passage interactive state
  clozePlacements = {};
  clozeActiveBlankIndex = 1;
  clozeIsEvaluating = false;

  // Update counter
  const counterEl = document.getElementById('cloze-counter');
  if (counterEl) counterEl.textContent = `Bài ${index + 1} / ${clozePassagesList.length}`;

  // Reset cards & UI
  const passageBody = document.getElementById('cloze-passage-body');
  const passageTitle = document.getElementById('cloze-passage-title');
  const wordBankChips = document.getElementById('cloze-word-bank-chips');
  const blanksBadge = document.getElementById('cloze-blanks-count-badge');
  const resultPanel = document.getElementById('cloze-result-panel');
  const hintBox = document.getElementById('cloze-hint-box');
  const submitBtn = document.getElementById('btn-cloze-submit');

  if (resultPanel) resultPanel.style.display = 'none';
  if (hintBox) hintBox.style.display = 'none';
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.style.opacity = '1';
  }

  // Update hints and skips counters
  updateClozePowerupBadges();

  if (!pItem.passageData) {
    // Show AI Generation Loading Placeholder
    if (passageBody) {
      passageBody.innerHTML = `
        <div style="text-align: center; padding: 40px 10px; color: var(--text-muted);">
          <div style="font-size: 36px; animation: spkSpin 1.5s linear infinite; display: inline-block; margin-bottom: 12px;">🧩</div>
          <h4 style="margin: 0 0 6px 0; color: var(--text);">Gemini AI đang kiến tạo bài đọc ngữ cảnh...</h4>
          <p style="font-size: 12.5px; margin: 0;">Lồng ghép từ vựng vào đoạn văn mạch lạc chuẩn văn phong bản ngữ</p>
        </div>
      `;
    }
    if (wordBankChips) {
      wordBankChips.innerHTML = `<span style="color: var(--text-muted); font-size: 12px;">Đang nạp từ vựng...</span>`;
    }

    // Generate via Gemini AI or Fallback
    const generatedData = await generateClozePassageWithGemini(pItem.targetWords, pItem.difficulty);
    pItem.passageData = generatedData;
  }

  clozeCurrentPassage = pItem.passageData;
  renderClozePassageUI(clozeCurrentPassage);
}

// =========================================================================
// 5. GEMINI AI PASSAGE GENERATION & OFFLINE FALLBACK
// =========================================================================
async function generateClozePassageWithGemini(targetWords, difficulty) {
  const cfg = getClozeDifficultyConfig(difficulty);
  const sampleWords = targetWords.slice(0, 15).map(w => ({
    term: (w.term || '').trim(),
    pos: w.partOfSpeech || 'word',
    def: w.definitionVi || w.definition || ''
  })).filter(w => w.term.length > 0);

  const wordsPromptList = sampleWords.map(w => `- ${w.term} (${w.pos}): ${w.def}`).join('\n');
  const targetTermsList = sampleWords.map(w => w.term).join(', ');

  const prompt = `You are an expert Native English Curriculum Designer and Reading Assessment Specialist.
Create a high-quality, natural English reading comprehension passage with contextual CLOZE blanks (fill-in-the-blank test) based on the given vocabulary list.

[DIFFICULTY LEVEL: ${difficulty.toUpperCase()}]
- Passage Length: ${cfg.passageLenDesc}
- Number of Blanks: Between ${cfg.minBlanks} and ${cfg.maxBlanks} blanks.
- In-Deck Vocabulary Ratio: ${difficulty === 'easy' ? '100% of blanks MUST be from the provided word list' : (difficulty === 'medium' ? 'Most blanks from word list, 1-2 contextual extra words' : '50% from word list and 50% contextual out-of-deck words')}
- Extra Distractor Decoy Options: ${cfg.decoyRatio > 0 ? 'Include 2-4 plausible distractor word options in the "options" list that DO NOT fit any blank' : 'No extra decoy words needed'}

[STUDENT VOCABULARY LIST]
${wordsPromptList}

[INSTRUCTIONS FOR CLOZE PASSAGE]
1. Write a coherent, engaging passage on a relevant real-world topic (e.g. technology, culture, personal development, science, daily life).
2. Insert blanks using the exact token format: [[blank_1]], [[blank_2]], [[blank_3]], etc. consecutively.
3. Every blank must have ONE clear, unambiguous correct word based on surrounding grammar and context collocations.
4. For each blank, provide:
   - "id": "blank_1", "blank_2", etc.
   - "index": 1, 2, etc. (number)
   - "correctWord": exact word in base or appropriate inflected form (lowercase)
   - "partOfSpeech": "noun" | "verb" | "adjective" | "adverb" | "preposition" | "phrase"
   - "hintVi": Helpful Vietnamese clue (e.g. "Tính từ: thiết yếu, quan trọng (bắt đầu bằng 'e')")
   - "explanationVi": Clear grammatical & contextual reason in Vietnamese why this word fits best.
5. In "options", provide an array of all word choices (including all blank correctWords plus any decoy distractors). Each option has { "id": "opt_1", "word": "example", "isDecoy": false }.
6. Provide "fullTextOriginal": the complete English passage without blanks.
7. Provide "passageTranslationVi": complete, fluent Vietnamese translation of the entire passage.

Output MUST be valid JSON only (no markdown code blocks, no backticks) matching this exact schema:
{
  "title": "Topic Title in English",
  "fullTextOriginal": "Full English passage without blanks...",
  "passageWithBlanks": "Passage text with [[blank_1]], [[blank_2]], etc. embedded...",
  "blanks": [
    {
      "id": "blank_1",
      "index": 1,
      "correctWord": "word",
      "partOfSpeech": "noun",
      "hintVi": "Gợi ý nghĩa tiếng Việt và từ loại...",
      "explanationVi": "Giải thích ngữ pháp và ngữ cảnh tại sao từ này chính xác..."
    }
  ],
  "options": [
    { "id": "opt_1", "word": "word", "isDecoy": false }
  ],
  "passageTranslationVi": "Bản dịch toàn văn tiếng Việt mượt mà..."
}`;

  let genSuccess = false;
  let resultData = null;

  try {
    const keys = typeof getStoredApiKeys === 'function' ? getStoredApiKeys() : [];
    // Prioritize fast flash-lite models for ultra fast cloze generation
    const modelsToTry = typeof getGeminiModelsForTier === 'function' ? getGeminiModelsForTier('fast') : ['gemini-3.5-flash-lite', 'gemini-2.0-flash-lite', 'gemini-3.8-flash', 'gemini-3.7-flash'];

    for (const k of keys) {
      if (genSuccess) break;
      for (const m of modelsToTry) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k.trim()}`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 18000);

          const res = await fetch(url, {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.3,
                maxOutputTokens: 2048
              }
            })
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const resJson = await res.json();
            const rawText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
              const parsed = JSON.parse(rawText.replace(/```json/gi, '').replace(/```/gi, '').trim());
              if (parsed && parsed.blanks && parsed.blanks.length > 0 && parsed.passageWithBlanks) {
                resultData = parsed;
                genSuccess = true;
                if (typeof saveWorkingGeminiModel === 'function') {
                  saveWorkingGeminiModel(m, 'fast');
                }
                break;
              }
            }
          }
        } catch (e) {
          console.warn(`Gemini Cloze generation failed with model ${m}:`, e);
        }
      }
    }
  } catch (err) {
    console.error('Gemini Cloze outer error:', err);
  }

  // Fallback if offline or API failed
  if (!genSuccess || !resultData) {
    resultData = generateOfflineClozePassage(targetWords, difficulty);
  }

  // Ensure options are shuffled and have IDs
  if (resultData && resultData.options) {
    resultData.options = resultData.options.sort(() => Math.random() - 0.5);
    resultData.options.forEach((opt, idx) => {
      if (!opt.id) opt.id = 'opt_' + (idx + 1);
    });
  }

  return resultData;
}

// Offline fallback generator with pre-built contextual templates
function generateOfflineClozePassage(targetWords, difficulty) {
  const cfg = getClozeDifficultyConfig(difficulty);
  const wordsToUse = (targetWords && targetWords.length > 0) ? targetWords.slice(0, 10) : [
    { term: 'knowledge', partOfSpeech: 'noun', definitionVi: 'kiến thức' },
    { term: 'practice', partOfSpeech: 'verb', definitionVi: 'thực hành' },
    { term: 'effective', partOfSpeech: 'adjective', definitionVi: 'hiệu quả' },
    { term: 'improve', partOfSpeech: 'verb', definitionVi: 'cải thiện' },
    { term: 'fluency', partOfSpeech: 'noun', definitionVi: 'sự trôi chảy' }
  ];

  const blanksCount = Math.min(wordsToUse.length, Math.max(3, cfg.minBlanks));
  const selectedWords = wordsToUse.slice(0, blanksCount);

  const sentences = [];
  const blanks = [];
  const options = [];

  const templates = [
    { prefix: "Learning a new language requires deep", suffix: "and continuous dedication to achieve mastery.", defaultPos: "noun" },
    { prefix: "Students must regularly", suffix: "speaking and writing to build natural confidence.", defaultPos: "verb" },
    { prefix: "Using spaced repetition is an extremely", suffix: "strategy for long-term memory retention.", defaultPos: "adjective" },
    { prefix: "Consistent daily effort will significantly", suffix: "your communication skills over time.", defaultPos: "verb" },
    { prefix: "Reaching a high level of", suffix: "allows you to express complex ideas effortlessly.", defaultPos: "noun" },
    { prefix: "Language learners should embrace every", suffix: "to interact with native speakers directly.", defaultPos: "noun" },
    { prefix: "Developing a rich vocabulary is an", suffix: "foundation for academic and professional success.", defaultPos: "adjective" }
  ];

  let fullOriginalParts = [];
  let passageBlankParts = [];

  selectedWords.forEach((w, idx) => {
    const bIndex = idx + 1;
    const bId = 'blank_' + bIndex;
    const tpl = templates[idx % templates.length];
    const termClean = (w.term || 'word').toLowerCase().trim();

    passageBlankParts.push(`${tpl.prefix} [[${bId}]] ${tpl.suffix}`);
    fullOriginalParts.push(`${tpl.prefix} ${termClean} ${tpl.suffix}`);

    blanks.push({
      id: bId,
      index: bIndex,
      correctWord: termClean,
      partOfSpeech: w.partOfSpeech || tpl.defaultPos,
      hintVi: `${w.partOfSpeech || tpl.defaultPos}: ${w.definitionVi || w.definition || termClean}`,
      explanationVi: `Từ '${termClean}' (${w.partOfSpeech || tpl.defaultPos}) phù hợp ngữ cảnh và ngữ pháp của câu ${bIndex}.`
    });

    options.push({
      id: 'opt_' + bIndex,
      word: termClean,
      isDecoy: false
    });
  });

  // If expert difficulty, add 2 decoy options
  if (difficulty === 'expert') {
    const decoys = ['arbitrary', 'meticulous', 'spontaneous', 'resilient'];
    decoys.slice(0, 2).forEach((dw, dIdx) => {
      options.push({
        id: 'opt_decoy_' + (dIdx + 1),
        word: dw,
        isDecoy: true
      });
    });
  }

  return {
    title: "Mastering Language Through Context & Daily Practice",
    fullTextOriginal: fullOriginalParts.join(' '),
    passageWithBlanks: passageBlankParts.join(' '),
    blanks: blanks,
    options: options.sort(() => Math.random() - 0.5),
    passageTranslationVi: "Học một ngôn ngữ mới đòi hỏi sự kiên trì và thực hành liên tục. Sử dụng các phương pháp học khoa học sẽ giúp bạn nâng cao năng lực diễn đạt và đạt được sự lưu loát."
  };
}

// =========================================================================
// 6. RENDER PASSAGE UI & INTERACTIVE BLANKS
// =========================================================================
function renderClozePassageUI(passage) {
  if (!passage) return;

  // Title
  const titleEl = document.getElementById('cloze-passage-title');
  if (titleEl) titleEl.textContent = passage.title || 'Reading Comprehension & Cloze Test';

  // Full Translation
  const transEl = document.getElementById('cloze-full-translation-text');
  if (transEl) transEl.textContent = passage.passageTranslationVi || '';

  // Render Passage Body with interactive Blank Zones
  const passageBody = document.getElementById('cloze-passage-body');
  if (passageBody) {
    let rawText = passage.passageWithBlanks || '';
    
    // Replace each [[blank_X]] with interactive drop zone span
    if (passage.blanks) {
      passage.blanks.forEach(b => {
        const token = `[[${b.id}]]`;
        const bIndex = b.index;
        const placedOptId = clozePlacements[bIndex];
        const placedWord = placedOptId ? getClozeOptionWordById(placedOptId) : '';

        const blankSpan = `
          <span class="cloze-blank-zone ${bIndex === clozeActiveBlankIndex ? 'active-blank' : ''} ${placedWord ? 'has-word' : ''}" 
                id="cloze-blank-zone-${bIndex}" 
                data-blank-index="${bIndex}"
                onclick="handleClozeBlankClick(${bIndex})"
                ondragover="handleClozeBlankDragOver(event)"
                ondragleave="handleClozeBlankDragLeave(event)"
                ondrop="handleClozeBlankDrop(event, ${bIndex})"
                title="Ô trống ${bIndex}: Nhấp để chọn hoặc kéo từ thả vào">
            <span class="cloze-blank-num">${bIndex}</span>
            <span class="cloze-blank-content" id="cloze-blank-val-${bIndex}">${placedWord ? placedWord : `_____${bIndex}_____`}</span>
          </span>
        `;
        rawText = rawText.split(token).join(blankSpan);
      });
    }

    passageBody.innerHTML = rawText;
  }

  // Render Word Bank Chips
  renderClozeWordBankChips();

  // Update Blanks count badge
  updateClozeBlanksCountBadge();
}

function getClozeOptionWordById(optId) {
  if (!clozeCurrentPassage || !clozeCurrentPassage.options) return '';
  const opt = clozeCurrentPassage.options.find(o => o.id === optId);
  return opt ? opt.word : '';
}

// Generate shortcut key representation (1-9, then a-z)
function getClozeShortcutKey(index) {
  if (index < 9) return String(index + 1);
  const code = index - 9;
  if (code < 26) return String.fromCharCode(97 + code); // 'a' - 'z'
  return '';
}

function renderClozeWordBankChips() {
  const container = document.getElementById('cloze-word-bank-chips');
  if (!container || !clozeCurrentPassage || !clozeCurrentPassage.options) return;

  const placedOptionIds = new Set(Object.values(clozePlacements));
  let availableCount = 0;

  const html = clozeCurrentPassage.options.map((opt, idx) => {
    const isPlaced = placedOptionIds.has(opt.id);
    if (!isPlaced) availableCount++;
    const shortcut = getClozeShortcutKey(idx);

    return `
      <div class="cloze-word-chip ${isPlaced ? 'placed' : ''}" 
           id="cloze-chip-${opt.id}" 
           data-option-id="${opt.id}"
           data-shortcut="${shortcut}"
           draggable="${!isPlaced}"
           ondragstart="handleClozeChipDragStart(event, '${opt.id}')"
           onclick="handleClozeChipClick('${opt.id}')"
           title="${isPlaced ? 'Đã được điền vào ô trống' : `Nhấp chọn hoặc nhấn phím [${shortcut}] để điền`}">
        ${shortcut ? `<span class="cloze-chip-key">${shortcut}</span>` : ''}
        <span class="cloze-chip-text">${opt.word}</span>
        ${isPlaced ? '<span class="cloze-chip-check">✓</span>' : ''}
      </div>
    `;
  }).join('');

  container.innerHTML = html;

  const availBadge = document.getElementById('cloze-available-words-count');
  if (availBadge) availBadge.textContent = `${availableCount} từ còn lại`;
}

function updateClozeBlanksCountBadge() {
  const badge = document.getElementById('cloze-blanks-count-badge');
  if (!badge || !clozeCurrentPassage || !clozeCurrentPassage.blanks) return;

  const total = clozeCurrentPassage.blanks.length;
  const filled = Object.keys(clozePlacements).length;
  badge.textContent = `${filled} / ${total} ô đã điền`;
  if (filled === total && total > 0) {
    badge.style.background = 'rgba(16, 185, 129, 0.15)';
    badge.style.color = '#34d399';
  } else {
    badge.style.background = 'rgba(99, 102, 241, 0.15)';
    badge.style.color = '#818cf8';
  }
}

// =========================================================================
// 7. DRAG-AND-DROP & CLICK-TO-PLACE INTERACTION HANDLERS
// =========================================================================
function handleClozeBlankClick(blankIndex) {
  if (clozeIsEvaluating) return;

  // If blank already has a word placed, clicking it removes/unplaces the word
  if (clozePlacements[blankIndex]) {
    unplaceWordFromBlank(blankIndex);
    return;
  }

  // Otherwise, set this blank as active focused blank
  selectClozeBlank(blankIndex);
}

function selectClozeBlank(blankIndex) {
  clozeActiveBlankIndex = blankIndex;
  
  // Highlight active blank zone
  if (clozeCurrentPassage && clozeCurrentPassage.blanks) {
    clozeCurrentPassage.blanks.forEach(b => {
      const el = document.getElementById('cloze-blank-zone-' + b.index);
      if (el) {
        if (b.index === blankIndex) {
          el.classList.add('active-blank');
        } else {
          el.classList.remove('active-blank');
        }
      }
    });
  }

  // Hide old hint box when switching blank
  const hintBox = document.getElementById('cloze-hint-box');
  if (hintBox) hintBox.style.display = 'none';
}

function handleClozeChipClick(optionId) {
  if (clozeIsEvaluating || !clozeCurrentPassage) return;

  const placedOptionIds = new Set(Object.values(clozePlacements));
  // If already placed, find which blank has it and unplace it
  if (placedOptionIds.has(optionId)) {
    for (const [bIdx, oId] of Object.entries(clozePlacements)) {
      if (oId === optionId) {
        unplaceWordFromBlank(parseInt(bIdx, 10));
        return;
      }
    }
    return;
  }

  // Otherwise, place into active blank, or first empty blank
  let targetBlank = clozeActiveBlankIndex;
  if (clozePlacements[targetBlank]) {
    // Find next empty blank
    const emptyBlank = clozeCurrentPassage.blanks.find(b => !clozePlacements[b.index]);
    if (emptyBlank) {
      targetBlank = emptyBlank.index;
    }
  }

  placeWordInBlank(targetBlank, optionId);
}

function placeWordInBlank(blankIndex, optionId) {
  if (!clozeCurrentPassage) return;

  // If this blank already had another word, release it
  clozePlacements[blankIndex] = optionId;

  // Update UI for the blank
  const word = getClozeOptionWordById(optionId);
  const valEl = document.getElementById('cloze-blank-val-' + blankIndex);
  const zoneEl = document.getElementById('cloze-blank-zone-' + blankIndex);

  if (valEl) valEl.textContent = word;
  if (zoneEl) {
    zoneEl.classList.add('has-word');
    zoneEl.classList.add('placed-anim');
    setTimeout(() => zoneEl.classList.remove('placed-anim'), 300);
  }

  // Update word bank chips
  renderClozeWordBankChips();
  updateClozeBlanksCountBadge();

  // Play micro sound
  if (typeof playVocaSfx === 'function') playVocaSfx('pop');

  // Auto-focus next unfilled blank
  const nextEmpty = clozeCurrentPassage.blanks.find(b => !clozePlacements[b.index]);
  if (nextEmpty) {
    selectClozeBlank(nextEmpty.index);
  }
}

function unplaceWordFromBlank(blankIndex) {
  if (!clozePlacements[blankIndex]) return;

  delete clozePlacements[blankIndex];

  const valEl = document.getElementById('cloze-blank-val-' + blankIndex);
  const zoneEl = document.getElementById('cloze-blank-zone-' + blankIndex);

  if (valEl) valEl.textContent = `_____${blankIndex}_____`;
  if (zoneEl) zoneEl.classList.remove('has-word');

  renderClozeWordBankChips();
  updateClozeBlanksCountBadge();
  selectClozeBlank(blankIndex);

  if (typeof playVocaSfx === 'function') playVocaSfx('click');
}

function clearAllClozeBlanks() {
  if (clozeIsEvaluating || !clozeCurrentPassage) return;
  clozePlacements = {};

  if (clozeCurrentPassage.blanks) {
    clozeCurrentPassage.blanks.forEach(b => {
      const valEl = document.getElementById('cloze-blank-val-' + b.index);
      const zoneEl = document.getElementById('cloze-blank-zone-' + b.index);
      if (valEl) valEl.textContent = `_____${b.index}_____`;
      if (zoneEl) zoneEl.classList.remove('has-word');
    });
  }

  renderClozeWordBankChips();
  updateClozeBlanksCountBadge();
  selectClozeBlank(1);
  if (typeof showToast === 'function') showToast('🔄 Đã gỡ tất cả các từ khỏi ô trống!');
}

function shuffleCurrentCloze() {
  if (!clozeCurrentPassage || !clozeCurrentPassage.options) return;
  clozeCurrentPassage.options = clozeCurrentPassage.options.sort(() => Math.random() - 0.5);
  renderClozeWordBankChips();
  if (typeof showToast === 'function') showToast('🔀 Đã xáo trộn vị trí các từ!');
}

// Drag and drop event handlers
function handleClozeChipDragStart(event, optionId) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', optionId);
    event.dataTransfer.effectAllowed = 'move';
  }
}

function handleClozeBlankDragOver(event) {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  event.currentTarget.classList.add('drag-over');
}

function handleClozeBlankDragLeave(event) {
  event.currentTarget.classList.remove('drag-over');
}

function handleClozeBlankDrop(event, blankIndex) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  const optionId = event.dataTransfer ? event.dataTransfer.getData('text/plain') : null;
  if (optionId) {
    placeWordInBlank(blankIndex, optionId);
  }
}

// =========================================================================
// 8. KEYBOARD SHORTCUTS ENGINE (1-9, a-z, Backspace, Tab, Enter)
// =========================================================================
window.addEventListener('keydown', function handleClozeGlobalKeydown(e) {
  const clozeScreen = document.getElementById('screen-cloze');
  if (!clozeScreen || !clozeScreen.classList.contains('active') || clozeIsEvaluating) return;

  // Avoid triggering if user is typing in an input/textarea inside a modal
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  // Enter or Ctrl+Enter -> Submit
  if (e.key === 'Enter') {
    e.preventDefault();
    submitClozeEvaluation();
    return;
  }

  // Backspace or Delete -> Unplace active blank
  if (e.key === 'Backspace' || e.key === 'Delete') {
    e.preventDefault();
    unplaceWordFromBlank(clozeActiveBlankIndex);
    return;
  }

  // Tab or Arrow navigation
  if (e.key === 'Tab' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault();
    if (clozeCurrentPassage && clozeCurrentPassage.blanks) {
      const nextIdx = (clozeActiveBlankIndex % clozeCurrentPassage.blanks.length) + 1;
      selectClozeBlank(nextIdx);
    }
    return;
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (clozeCurrentPassage && clozeCurrentPassage.blanks) {
      const prevIdx = clozeActiveBlankIndex > 1 ? clozeActiveBlankIndex - 1 : clozeCurrentPassage.blanks.length;
      selectClozeBlank(prevIdx);
    }
    return;
  }

  // Match shortcut key for word bank chips: 1-9 or a-z
  const keyChar = e.key.toLowerCase();
  if (clozeCurrentPassage && clozeCurrentPassage.options) {
    const chipIdx = clozeCurrentPassage.options.findIndex((opt, idx) => getClozeShortcutKey(idx) === keyChar);
    if (chipIdx !== -1) {
      e.preventDefault();
      const opt = clozeCurrentPassage.options[chipIdx];
      handleClozeChipClick(opt.id);
    }
  }
});

// =========================================================================
// 9. POWER-UPS & ASSISTANCE (VOCAHINT & VOCASKIP)
// =========================================================================
function updateClozePowerupBadges() {
  const hintsCountEl = document.getElementById('cloze-hints-count');
  const skipsCountEl = document.getElementById('cloze-skips-count');

  const hintsVal = (typeof currentUser !== 'undefined' && currentUser && currentUser.hints !== undefined) ? currentUser.hints : 5;
  const skipsVal = (typeof currentUser !== 'undefined' && currentUser && currentUser.skips !== undefined) ? currentUser.skips : 3;

  if (hintsCountEl) hintsCountEl.textContent = hintsVal;
  if (skipsCountEl) skipsCountEl.textContent = skipsVal;
}

function useClozeHint() {
  if (!clozeCurrentPassage || !clozeCurrentPassage.blanks) return;
  const blank = clozeCurrentPassage.blanks.find(b => b.index === clozeActiveBlankIndex);
  if (!blank) return;

  let hasHintResource = false;
  if (typeof currentUser !== 'undefined' && currentUser) {
    if (currentUser.hints > 0) {
      currentUser.hints--;
      hasHintResource = true;
      if (typeof addLedgerEntry === 'function') addLedgerEntry('HINT_USED', 0, `Dùng VocaHint cho Cloze Test ô ${clozeActiveBlankIndex}`);
    } else if (typeof getUserPoints === 'function' && getUserPoints() >= 50) {
      setUserPoints(getUserPoints() - 50);
      hasHintResource = true;
      if (typeof addLedgerEntry === 'function') addLedgerEntry('BUY_HINT', -50, `Mua 1 VocaHint cho Cloze Test ô ${clozeActiveBlankIndex}`);
    }
  } else {
    hasHintResource = true; // Guest test mode
  }

  if (!hasHintResource) {
    if (typeof showToast === 'function') showToast('⚠️ Bạn không đủ VocaHint hoặc Xu (cần 50 Xu)!');
    return;
  }

  clozeHintsUsed++;
  updateClozePowerupBadges();
  if (typeof saveDatabase === 'function') saveDatabase();

  const hintBox = document.getElementById('cloze-hint-box');
  if (hintBox) {
    hintBox.style.display = 'block';
    const firstLetter = blank.correctWord ? blank.correctWord[0].toUpperCase() : '';
    hintBox.innerHTML = `
      <strong>💡 Gợi ý VocaHint cho ô [${clozeActiveBlankIndex}]:</strong><br>
      • <strong>Từ loại & Nghĩa:</strong> ${blank.hintVi || 'Xem ngữ cảnh câu'}<br>
      • <strong>Chữ cái đầu:</strong> <span style="background: rgba(245,158,11,0.25); padding: 1px 6px; border-radius: 4px; font-weight: 800; font-size: 14px;">${firstLetter}___</span> (${blank.correctWord.length} chữ cái)
    `;
  }

  if (typeof playVocaSfx === 'function') playVocaSfx('pop');
}

function useClozeSkip() {
  if (!clozeCurrentPassage || !clozeCurrentPassage.blanks) return;
  const blank = clozeCurrentPassage.blanks.find(b => b.index === clozeActiveBlankIndex);
  if (!blank) return;

  let hasSkipResource = false;
  if (typeof currentUser !== 'undefined' && currentUser) {
    if (currentUser.skips > 0) {
      currentUser.skips--;
      hasSkipResource = true;
      if (typeof addLedgerEntry === 'function') addLedgerEntry('SKIP_USED', 0, `Dùng VocaSkip điền tự động ô ${clozeActiveBlankIndex}`);
    }
  } else {
    hasSkipResource = true;
  }

  if (!hasSkipResource) {
    if (typeof showToast === 'function') showToast('⚠️ Bạn đã hết lượt VocaSkip!');
    return;
  }

  clozeSkipsUsed++;
  updateClozePowerupBadges();
  if (typeof saveDatabase === 'function') saveDatabase();

  // Find matching option for this correct word
  const matchOpt = clozeCurrentPassage.options.find(o => o.word.toLowerCase() === blank.correctWord.toLowerCase());
  if (matchOpt) {
    placeWordInBlank(clozeActiveBlankIndex, matchOpt.id);
    if (typeof showToast === 'function') showToast(`⏭️ VocaSkip đã điền: '${matchOpt.word}'`);
  }
}

// =========================================================================
// 10. PASSAGE AUDIO TTS ENGINE
// =========================================================================
function toggleClozePassageAudio() {
  if (clozeIsAudioPlaying) {
    stopClozePassageAudio();
  } else {
    playClozePassageAudio();
  }
}

function playClozePassageAudio() {
  if (!clozeCurrentPassage || !clozeCurrentPassage.fullTextOriginal) return;

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Stop any pending speech
    clozeSpeechUtterance = new SpeechSynthesisUtterance(clozeCurrentPassage.fullTextOriginal);
    clozeSpeechUtterance.lang = 'en-US';
    clozeSpeechUtterance.rate = 0.92;

    clozeSpeechUtterance.onstart = () => {
      clozeIsAudioPlaying = true;
      const indicator = document.getElementById('cloze-audio-playing-indicator');
      const icon = document.getElementById('cloze-tts-icon');
      const label = document.getElementById('cloze-tts-label');
      if (indicator) indicator.style.display = 'flex';
      if (icon) icon.textContent = '⏹️';
      if (label) label.textContent = 'Dừng đọc';
    };

    clozeSpeechUtterance.onend = () => {
      stopClozePassageAudio();
    };

    clozeSpeechUtterance.onerror = () => {
      stopClozePassageAudio();
    };

    window.speechSynthesis.speak(clozeSpeechUtterance);
  } else {
    if (typeof speakText === 'function') {
      speakText(clozeCurrentPassage.fullTextOriginal);
    }
  }
}

function stopClozePassageAudio() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  clozeIsAudioPlaying = false;
  clozeSpeechUtterance = null;
  const indicator = document.getElementById('cloze-audio-playing-indicator');
  const icon = document.getElementById('cloze-tts-icon');
  const label = document.getElementById('cloze-tts-label');
  if (indicator) indicator.style.display = 'none';
  if (icon) icon.textContent = '🔊';
  if (label) label.textContent = 'Nghe bài đọc';
}

function toggleClozeTranslationView() {
  const transEl = document.getElementById('cloze-full-translation-text');
  const btnEl = document.getElementById('btn-toggle-cloze-trans');
  if (!transEl) return;
  if (transEl.style.display === 'none') {
    transEl.style.display = 'block';
    if (btnEl) btnEl.textContent = '👁️ Ẩn dịch';
  } else {
    transEl.style.display = 'none';
    if (btnEl) btnEl.textContent = '👁️ Xem dịch';
  }
}

// =========================================================================
// 11. SUBMIT, EVALUATION & SETTLEMENT
// =========================================================================
function submitClozeEvaluation() {
  if (clozeIsEvaluating || !clozeCurrentPassage) return;

  const totalBlanks = clozeCurrentPassage.blanks.length;
  const filledBlanks = Object.keys(clozePlacements).length;

  if (filledBlanks < totalBlanks) {
    const confirmSubmit = confirm(`Bạn mới điền ${filledBlanks}/${totalBlanks} ô trống. Bạn có chắc chắn muốn nộp bài sớm không?`);
    if (!confirmSubmit) return;
  }

  clozeIsEvaluating = true;
  const submitBtn = document.getElementById('btn-cloze-submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.5';
  }

  const resultPanel = document.getElementById('cloze-result-panel');
  const aiLoading = document.getElementById('cloze-ai-loading');
  const aiContent = document.getElementById('cloze-result-content');

  if (resultPanel) resultPanel.style.display = 'block';
  if (aiLoading) aiLoading.style.display = 'block';
  if (aiContent) aiContent.style.display = 'none';

  // Evaluate after short UI pulse
  setTimeout(() => {
    evaluateClozeResults();
  }, 400);
}

function evaluateClozeResults() {
  if (!clozeCurrentPassage || !clozeCurrentPassage.blanks) return;

  const diffCfg = getClozeDifficultyConfig(currentClozeDifficulty);
  const blanks = clozeCurrentPassage.blanks;
  let correctCount = 0;
  const detailedFeedback = [];

  blanks.forEach(b => {
    const placedOptId = clozePlacements[b.index];
    const userWord = placedOptId ? getClozeOptionWordById(placedOptId) : '';
    const cleanUser = userWord.toLowerCase().trim();
    const cleanCorrect = b.correctWord.toLowerCase().trim();
    const isCorrect = (cleanUser === cleanCorrect);

    if (isCorrect) {
      correctCount++;
    } else {
      clozeSessionWrongBlanks.push({
        word: b.correctWord,
        userWord: userWord || '(Bỏ trống)',
        blankIndex: b.index,
        hintVi: b.hintVi
      });
    }

    detailedFeedback.push({
      index: b.index,
      isCorrect: isCorrect,
      userWord: userWord || '(Chưa điền)',
      correctWord: b.correctWord,
      partOfSpeech: b.partOfSpeech,
      explanationVi: b.explanationVi || `Từ '${b.correctWord}' phù hợp ngữ cảnh câu.`
    });
  });

  clozeSessionTotalBlanksCount += blanks.length;
  clozeSessionCorrectBlanksCount += correctCount;

  const accuracyPct = Math.round((correctCount / blanks.length) * 100);
  const isFloorPassed = accuracyPct >= diffCfg.floorScore;

  // Calculate Xu Reward
  const minXu = diffCfg.baseXuRange[0];
  const maxXu = diffCfg.baseXuRange[1];
  let earnedXu = Math.round(minXu + (maxXu - minXu) * (accuracyPct / 100));
  if (!isFloorPassed) {
    earnedXu = Math.round(earnedXu * 0.4); // Partial credit if below floor score
  }
  clozeSessionPointsEarned += earnedXu;

  // Record daily study time & streak flow
  if (typeof addDailyStudySeconds === 'function') {
    addDailyStudySeconds(45);
  }
  if (typeof recordStudyFlowAction === 'function') {
    recordStudyFlowAction();
  }

  // Render Result UI
  const aiLoading = document.getElementById('cloze-ai-loading');
  const aiContent = document.getElementById('cloze-result-content');
  if (aiLoading) aiLoading.style.display = 'none';
  if (aiContent) aiContent.style.display = 'block';

  const scoreCircle = document.getElementById('cloze-score-circle');
  const verdictEl = document.getElementById('cloze-result-verdict');
  const summaryEl = document.getElementById('cloze-result-summary-text');
  const rewardBadge = document.getElementById('cloze-reward-badge');

  if (scoreCircle) {
    scoreCircle.textContent = `${accuracyPct}%`;
    scoreCircle.style.borderColor = accuracyPct >= 80 ? '#34d399' : (accuracyPct >= 60 ? '#fbbf24' : '#f87171');
    scoreCircle.style.color = accuracyPct >= 80 ? '#34d399' : (accuracyPct >= 60 ? '#fbbf24' : '#f87171');
  }

  if (verdictEl) {
    if (accuracyPct === 100) verdictEl.textContent = '🎉 Hoàn Hảo! 100% Chính Xác';
    else if (accuracyPct >= 80) verdictEl.textContent = '🌟 Xuất Sắc! Nắm Vững Ngữ Cảnh';
    else if (accuracyPct >= 60) verdictEl.textContent = '👏 Khá Tốt! Cần Trau Chuốt Thêm';
    else verdictEl.textContent = '⚠️ Cần Luyện Tập Thêm Về Collocations';
  }

  if (summaryEl) {
    summaryEl.textContent = `Bạn đã điền đúng ${correctCount}/${blanks.length} vị trí (${accuracyPct}%)`;
  }

  if (rewardBadge) {
    rewardBadge.textContent = `+${earnedXu} Xu`;
  }

  const scoreBadge = document.getElementById('cloze-score-badge');
  if (scoreBadge) scoreBadge.textContent = `Bài: +${clozeSessionPointsEarned}đ`;

  // Render detailed blank-by-blank feedback
  const feedbackList = document.getElementById('cloze-blanks-feedback-list');
  if (feedbackList) {
    feedbackList.innerHTML = detailedFeedback.map(item => `
      <div style="background: var(--surface-elevated); border: 1px solid ${item.isCorrect ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}; border-radius: 10px; padding: 10px 12px; display: flex; align-items: flex-start; gap: 10px;">
        <span style="font-size: 16px; margin-top: 1px;">${item.isCorrect ? '✅' : '❌'}</span>
        <div style="flex: 1;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; flex-wrap: wrap; gap: 6px;">
            <div>
              <strong style="color: var(--text); font-size: 13px;">Ô [${item.index}]: </strong>
              <span style="color: ${item.isCorrect ? '#34d399' : '#f87171'}; font-weight: 700; font-size: 13.5px;">${item.userWord}</span>
              ${!item.isCorrect ? `<span style="color: var(--text-muted); font-size: 12px;"> -> Đáp án đúng: <strong style="color: #34d399;">${item.correctWord}</strong></span>` : ''}
            </div>
            <span class="badge" style="background: rgba(99,102,241,0.15); color: #818cf8; font-size: 10.5px;">${item.partOfSpeech || 'word'}</span>
          </div>
          <div style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">${item.explanationVi}</div>
        </div>
      </div>
    `).join('');
  }

  // Update Next button label if on last passage
  const nextBtn = document.getElementById('btn-cloze-next');
  if (nextBtn) {
    if (currentClozeIndex < clozePassagesList.length - 1) {
      nextBtn.textContent = '🚀 Bài Tiếp Theo';
    } else {
      nextBtn.textContent = '🏁 Hoàn Tất & Tổng Kết';
    }
  }

  // Play sound
  if (typeof playVocaSfx === 'function') {
    playVocaSfx(accuracyPct >= 80 ? 'correct' : 'wrong');
  }

  // Auto-scroll to result panel
  if (resultPanel) {
    resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function retryCurrentClozePassage() {
  clozePlacements = {};
  clozeActiveBlankIndex = 1;
  clozeIsEvaluating = false;

  const resultPanel = document.getElementById('cloze-result-panel');
  if (resultPanel) resultPanel.style.display = 'none';

  const submitBtn = document.getElementById('btn-cloze-submit');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.style.opacity = '1';
  }

  if (clozeCurrentPassage) {
    renderClozePassageUI(clozeCurrentPassage);
  }

  const passageCard = document.getElementById('cloze-passage-card');
  if (passageCard) {
    passageCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

async function nextClozePassage() {
  if (currentClozeIndex < clozePassagesList.length - 1) {
    await loadAndRenderClozePassage(currentClozeIndex + 1);
  } else {
    finishClozeSession();
  }
}

function finishClozeSession() {
  clozeIsCompleted = true;
  stopClozePassageAudio();

  // Final session points settlement
  if (clozeSessionPointsEarned > 0 && typeof setUserPoints === 'function') {
    const curDeck = (typeof decks !== 'undefined') ? decks.find(d => d.id === currentDeckId) : null;
    const deckTitle = curDeck ? curDeck.title : 'Bộ từ vựng';

    setUserPoints(Math.max(0, getUserPoints() + clozeSessionPointsEarned));
    if (typeof addLedgerEntry === 'function') {
      addLedgerEntry('STUDY_CLOZE', clozeSessionPointsEarned, `Điền từ Cloze Test "${deckTitle}" (+${clozeSessionPointsEarned} Xu)`);
    }
    if (typeof saveDatabase === 'function') saveDatabase(true);
    if (typeof pushCurrentDatabaseToCloud === 'function') pushCurrentDatabaseToCloud();
  }

  // Populate Celebration Modal
  const totalPassagesEl = document.getElementById('cloze-res-total-passages');
  const accuracyEl = document.getElementById('cloze-res-accuracy');
  const totalCoinsEl = document.getElementById('cloze-res-total-coins');
  const diffEl = document.getElementById('cloze-res-difficulty');
  const wrongCont = document.getElementById('cloze-res-wrong-container');
  const wrongList = document.getElementById('cloze-res-wrong-list');

  const overallAccuracy = clozeSessionTotalBlanksCount > 0 ? Math.round((clozeSessionCorrectBlanksCount / clozeSessionTotalBlanksCount) * 100) : 100;
  const diffCfg = getClozeDifficultyConfig(currentClozeDifficulty);

  if (totalPassagesEl) totalPassagesEl.textContent = `${clozePassagesList.length} bài`;
  if (accuracyEl) accuracyEl.textContent = `${overallAccuracy}%`;
  if (totalCoinsEl) totalCoinsEl.textContent = `+${clozeSessionPointsEarned} Xu`;
  if (diffEl) diffEl.textContent = diffCfg.label;

  if (wrongCont && wrongList) {
    if (clozeSessionWrongBlanks.length > 0) {
      wrongCont.style.display = 'block';
      wrongList.innerHTML = clozeSessionWrongBlanks.map(w => `
        <span class="chip" style="background: rgba(239,68,68,0.12); color: #f87171; border-color: rgba(239,68,68,0.3); font-size: 11px;">
          ${w.word} (đã điền: ${w.userWord})
        </span>
      `).join('');
    } else {
      wrongCont.style.display = 'none';
    }
  }

  if (typeof playVocaSfx === 'function') playVocaSfx('fireworks');
  if (typeof openModal === 'function') openModal('modal-cloze-result');
}

function exitClozeMode() {
  stopClozePassageAudio();

  if (typeof studySourceContext !== 'undefined' && (studySourceContext === 'review-queue' || !currentDeckId)) {
    if (typeof showScreen === 'function') showScreen('screen-decks');
    if (typeof refreshActiveScreenData === 'function') refreshActiveScreenData();
  } else {
    if (typeof showScreen === 'function') showScreen('screen-deck-detail');
    if (typeof refreshActiveScreenData === 'function') refreshActiveScreenData();
  }
}
