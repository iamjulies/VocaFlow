// =========================================================================
// VOCAFLOW 06D-CLOZE-ENGINE.JS (v0.10.10-35 Build 336 - EXTENDED LEARNING MODE BETA)
// Contextual Reading & Cloze Test Passage Generator with Strict JSON Schema
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
let clozeSessionWrongWords = [];
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

// Helper: Automatically supplement thematic vocabulary if word count < 5 (Issue 15)
function ensureMinimumClozeWords(targetWords) {
  if (!targetWords) targetWords = [];
  if (targetWords.length >= 5) return targetWords;
  const needed = 5 - targetWords.length;
  const supplementaryPool = [
    { id: 'supp_cloze_1', term: 'innovation', partOfSpeech: 'noun', definitionVi: 'sự đổi mới, sáng tạo', isAiSupplements: true, isAiGenerated: true },
    { id: 'supp_cloze_2', term: 'perspective', partOfSpeech: 'noun', definitionVi: 'góc nhìn, quan điểm', isAiSupplements: true, isAiGenerated: true },
    { id: 'supp_cloze_3', term: 'sustainable', partOfSpeech: 'adjective', definitionVi: 'bền vững, lâu dài', isAiSupplements: true, isAiGenerated: true },
    { id: 'supp_cloze_4', term: 'collaborate', partOfSpeech: 'verb', definitionVi: 'hợp tác, cộng tác', isAiSupplements: true, isAiGenerated: true },
    { id: 'supp_cloze_5', term: 'comprehend', partOfSpeech: 'verb', definitionVi: 'thấu hiểu, lĩnh hội', isAiSupplements: true, isAiGenerated: true },
    { id: 'supp_cloze_6', term: 'resilient', partOfSpeech: 'adjective', definitionVi: 'kiên cường, bền bỉ', isAiSupplements: true, isAiGenerated: true },
    { id: 'supp_cloze_7', term: 'initiative', partOfSpeech: 'noun', definitionVi: 'sáng kiến, sự chủ động', isAiSupplements: true, isAiGenerated: true }
  ];
  const existingTerms = new Set(targetWords.map(w => (w.term || '').toLowerCase().trim()));
  const added = [];
  for (const sup of supplementaryPool) {
    if (!existingTerms.has(sup.term.toLowerCase())) {
      added.push(sup);
      if (added.length >= needed) break;
    }
  }
  if (typeof showToast === 'function' && targetWords.length > 0) {
    showToast(`✨ AI đã bổ sung ${added.length} từ vựng chủ đề để đủ tối thiểu 5 từ tạo bài đọc!`);
  }
  return [...targetWords, ...added];
}

function openClozeSetupModal(useSelection = false, customWordList = null) {
  if (!customWordList && typeof currentDeckId !== 'undefined' && currentDeckId) {
    const curDeck = (typeof decks !== 'undefined') ? decks.find(d => d.id === currentDeckId) : null;
    if (curDeck && typeof isDeckLockedForUser === 'function' && isDeckLockedForUser(curDeck)) {
      alert(`🔒 Bộ từ "${curDeck.title}" thuộc đặc quyền VocaVIP!\n\nGói VocaVIP của bạn đã hết hạn. Vui lòng gia hạn hoặc nâng cấp VocaVIP để tiếp tục mở khóa học bộ từ này nhé!`);
      if (typeof openVipModal === 'function') openVipModal();
      else if (typeof openAuthModal === 'function') openAuthModal('vip');
      return;
    }
  }

  // Issue 13: Cloze Mode is strictly for VIP members
  if (typeof isUserVip === 'function' && !isUserVip()) {
    const isGuest = typeof currentUser === 'undefined' || !currentUser || !currentUser.email;
    if (isGuest && typeof openGuestFeatureLockModal === 'function') {
      openGuestFeatureLockModal('cloze', 'Chế độ Điền Từ Đoạn Văn (β)', '🧩 🔒', 'Tính Năng Độc Quyền VocaVIP');
    } else if (typeof openVipPricingModal === 'function') {
      if (typeof showToast === 'function') {
        showToast('👑 Chế độ Điền Từ (β) là tính năng nâng cao độc quyền dành riêng cho VocaVIP!');
      }
      openVipPricingModal();
    } else {
      alert('🔒 Chế độ Điền Từ Đoạn Văn (β) là tính năng độc quyền dành riêng cho thành viên VocaVIP!');
    }
    return;
  }

  // Issue 15: Check manual selection minimum (>= 5 words)
  if (useSelection && typeof selectedWordIds !== 'undefined' && selectedWordIds && selectedWordIds.size > 0 && selectedWordIds.size < 5) {
    alert(`⚠️ Vui lòng chọn tối thiểu 5 từ vựng để tạo bài tập Điền Từ Đoạn Văn (hiện chỉ chọn ${selectedWordIds.size} từ)!`);
    return;
  }

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
  if (sub) {
    if (wordCount < 5 && wordCount > 0) {
      sub.textContent = `${wordCount} từ gốc (AI sẽ bổ sung thêm để đủ 5 từ sinh bài đọc)`;
    } else {
      sub.textContent = `${wordCount} từ vựng sẵn sàng làm ngữ liệu sinh bài đọc`;
    }
  }

  if (typeof openModal === 'function') openModal('modal-cloze-setup');
}

async function confirmStartClozeFromModal() {
  if (typeof stopVocaSfx === 'function') stopVocaSfx('fireworks');
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
  if (typeof stopVocaSfx === 'function') stopVocaSfx('fireworks');

  // Issue 13: Cloze Mode VIP Check
  if (typeof isUserVip === 'function' && !isUserVip()) {
    const isGuest = typeof currentUser === 'undefined' || !currentUser || !currentUser.email;
    if (isGuest && typeof openGuestFeatureLockModal === 'function') {
      openGuestFeatureLockModal('cloze', 'Chế độ Điền Từ Đoạn Văn (β)', '🧩 🔒', 'Tính Năng Độc Quyền VocaVIP');
    } else if (typeof openVipPricingModal === 'function') {
      openVipPricingModal();
    }
    return;
  }

  if (typeof currentDeckId === 'undefined' && !customWordList) return;
  const deck = (typeof decks !== 'undefined') ? decks.find(d => d.id === currentDeckId) : null;
  if (!deck && !customWordList) return;

  if (!customWordList && deck && typeof isDeckLockedForUser === 'function' && isDeckLockedForUser(deck)) {
    alert(`🔒 Bộ từ "${deck.title}" thuộc đặc quyền VocaVIP!\n\nGói VocaVIP của bạn đã hết hạn. Vui lòng gia hạn hoặc nâng cấp VocaVIP để tiếp tục mở khóa học bộ từ này nhé!`);
    if (typeof openVipModal === 'function') openVipModal();
    else if (typeof openAuthModal === 'function') openAuthModal('vip');
    return;
  }

  if (typeof studySourceContext !== 'undefined') {
    studySourceContext = customWordList ? 'review-queue' : 'deck';
  }

  // Issue 15: Check manual selection minimum
  if (fromSelection && typeof selectedWordIds !== 'undefined' && selectedWordIds && selectedWordIds.size > 0 && selectedWordIds.size < 5) {
    alert(`⚠️ Vui lòng chọn tối thiểu 5 từ vựng để bắt đầu phiên học (hiện chỉ chọn ${selectedWordIds.size} từ)!`);
    return;
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

  // Issue 15: AI Word Supplement if total words in deck/queue < 5
  if (targetWords.length < 5) {
    targetWords = ensureMinimumClozeWords(targetWords);
  }

  if (typeof isStudyShuffle !== 'undefined' && isStudyShuffle) {
    targetWords = [...targetWords].sort(() => Math.random() - 0.5);
  }

  // Initialize session state
  clozePassagesList = [];
  currentClozeIndex = 0;
  clozeSessionPointsEarned = 0;
  clozeSessionWrongBlanks = [];
  clozeSessionWrongWords = [];
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
        <div style="text-align: center; padding: 45px 10px; color: var(--text-muted);">
          <div class="ai-spinner-container">
            <div class="ai-spinner-outer-ring"></div>
            <div class="ai-spinner-inner-ring"></div>
            <div class="ai-spinner-center-icon">🧩</div>
          </div>
          <h4 style="margin: 0 0 6px 0; color: var(--text); font-size: 16px; font-weight: 700;">
            Gemini AI đang kiến tạo bài đọc ngữ cảnh<span class="ai-loading-dots"><span>.</span><span>.</span><span>.</span></span>
          </h4>
          <p style="font-size: 12.5px; margin: 0; color: var(--text-muted);">
            Lồng ghép từ vựng vào đoạn văn mạch lạc chuẩn văn phong bản ngữ
          </p>
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

  const prompt = `You are an elite Native English Curriculum Designer and Reading Assessment Specialist.
Create a high-quality, engaging English reading comprehension passage with contextual CLOZE blanks (fill-in-the-blank test) based on the provided vocabulary list.

[DIFFICULTY LEVEL: ${difficulty.toUpperCase()}]
- Passage Length: ${cfg.passageLenDesc}
- Number of Blanks: Between ${cfg.minBlanks} and ${cfg.maxBlanks} blanks.
- In-Deck Vocabulary Ratio: ${difficulty === 'easy' ? '100% of blanks MUST be from the provided word list' : (difficulty === 'medium' ? 'Most blanks from word list, 1-2 contextual extra words' : '50% from word list and 50% contextual out-of-deck words')}
- Extra Distractor Decoy Options: ${cfg.decoyRatio > 0 ? 'Include 2-4 plausible distractor word options in the "options" list that DO NOT fit any blank' : 'No extra decoy words needed'}

[STUDENT VOCABULARY LIST]
${wordsPromptList}

[INSTRUCTIONS FOR CLOZE PASSAGE]
1. Write an insightful, well-structured, coherent passage on an interesting real-world topic (e.g. technology, science, psychology, culture, environment, personal growth, education).
2. Insert blanks using the exact token format: [[blank_1]], [[blank_2]], [[blank_3]], etc. consecutively.
3. Every blank must have ONE clear, unambiguous correct word based on surrounding grammar, collocations, and contextual clues.
4. PARALLEL / COORDINATE WORDS RULE: If two blanks are placed in a symmetric coordinate structure joined by 'and' or 'or' (e.g., 'the growth of [[blank_1]] and [[blank_2]]'), specify "interchangeableWith": [other_blank_index] for both blanks if either word order is equally natural and valid.
5. For each blank, provide:
   - "id": "blank_1", "blank_2", etc.
   - "index": 1, 2, etc. (number)
   - "correctWord": exact word in base or appropriate inflected form (lowercase)
   - "partOfSpeech": "noun" | "verb" | "adjective" | "adverb" | "preposition" | "phrase"
   - "hintVi": Subtle pedagogical Vietnamese clue focusing on contextual meaning and grammatical function (e.g. "Tính từ chỉ đặc tính quan trọng, thiết yếu"). DO NOT reveal the first letter or exact spelling.
   - "explanationVi": Thorough, pedagogical Vietnamese explanation detailing:
       (a) Vị trí ngữ pháp & từ loại yêu cầu tại ô trống (đứng sau từ gì, giữ chức năng gì trong câu).
       (b) Cụm từ cố định (collocation / giới từ đi kèm nếu có).
       (c) Sắc thái ngữ cảnh tại sao từ này là lựa chọn tối ưu và chính xác nhất.
   - "interchangeableWith": optional array of blank indices (numbers) that are interchangeable with this blank (e.g. [2]).
6. In "options", provide an array of all word choices (including all blank correctWords plus any decoy distractors). Each option has { "id": "opt_1", "word": "example", "isDecoy": false }.
7. Provide "fullTextOriginal": the complete English passage without blanks.
8. CRITICAL VIETNAMESE TRANSLATION STANDARD ("passageTranslationVi"):
   - Dịch toàn bộ bài đọc sang tiếng Việt với văn phong báo chí hiện đại, trau chuốt, tự nhiên, chuẩn mực văn phong đọc hiểu.
   - Dịch thoát ý, diễn đạt mượt mà, thuần Việt. TUYỆT ĐỐI KHÔNG DỊCH THÔ CỨNG TỪNG TỪ (word-by-word) hay dịch máy gượng gạo (tránh các từ ngô nghê như 'thử thách độc đáo', 'suất học sinh giỏi cạnh tranh', 'tác động lớn lao').

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
      "explanationVi": "Phân tích ngữ pháp chuyên sâu, cụm collocation và ngữ cảnh...",
      "interchangeableWith": []
    }
  ],
  "options": [
    { "id": "opt_1", "word": "word", "isDecoy": false }
  ],
  "passageTranslationVi": "Bản dịch tiếng Việt mượt mà, thoát ý, chuẩn văn phong báo chí hiện đại..."
}`;

  let genSuccess = false;
  let resultData = null;

  try {
    const keys = typeof getStoredApiKeys === 'function' ? getStoredApiKeys() : [];
    
    // Issue 14: Use Deep / High-Reasoning Flash models for Hard & Expert to ensure superior quality and speed
    const isHardOrExpert = (difficulty === 'hard' || difficulty === 'expert');
    const modelsToTry = isHardOrExpert
      ? ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.5-flash']
      : (typeof getGeminiModelsForTier === 'function' ? getGeminiModelsForTier('fast') : ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite', 'gemini-3.7-flash']);

    const timeoutMs = isHardOrExpert ? 16000 : 12000;

    for (const k of keys) {
      if (genSuccess) break;
      for (const m of modelsToTry) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k.trim()}`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
              const cleanJsonStr = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
              const parsed = JSON.parse(cleanJsonStr);
              if (parsed && parsed.blanks && parsed.blanks.length > 0 && parsed.passageWithBlanks) {
                resultData = parsed;
                genSuccess = true;
                if (typeof saveWorkingGeminiModel === 'function') {
                  saveWorkingGeminiModel(m, isHardOrExpert ? 'deep' : 'fast');
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

  const blanks = [];
  const options = [];

  const templates = [
    { 
      prefix: "Acquiring a deep understanding of a new domain requires structured", 
      suffix: "and continuous dedication to achieve true expertise.", 
      defaultPos: "noun",
      analysis: "Vị trí sau tính từ 'structured' cần một danh từ chỉ đối tượng tri thức để hoàn thiện tân ngữ cho động từ 'requires'." 
    },
    { 
      prefix: "Language learners must consistently", 
      suffix: "their communicative skills in authentic real-world contexts.", 
      defaultPos: "verb",
      analysis: "Đứng sau trợ động từ khuyết thiếu 'must consistently' nên bắt buộc cần một động từ nguyên thể để diễn tả hành động thực hành rèn luyện." 
    },
    { 
      prefix: "Spaced repetition has been scientifically proven to be an exceptionally", 
      suffix: "strategy for long-term memory retention and recall.", 
      defaultPos: "adjective",
      analysis: "Đứng sau trạng từ chỉ mức độ 'exceptionally' và trước danh từ 'strategy', vị trí này cần một tính từ bổ nghĩa cho chiến lược học tập." 
    },
    { 
      prefix: "Regular exposure to diverse vocabulary will significantly", 
      suffix: "your reading comprehension and expressive confidence over time.", 
      defaultPos: "verb",
      analysis: "Sau trạng từ 'significantly' và trợ động từ tương lai 'will' cần một động từ nguyên thể chỉ sự tiến bộ, nâng cao năng lực." 
    },
    { 
      prefix: "Developing natural language", 
      suffix: "enables speakers to convey nuanced perspectives effortlessly without hesitation.", 
      defaultPos: "noun",
      analysis: "Vị trí tạo thành cụm danh từ 'natural language [noun]' làm chủ ngữ cho câu, biểu thị sự lưu loát, trôi chảy trong giao tiếp." 
    },
    { 
      prefix: "Embracing new technological tools creates a valuable", 
      suffix: "to collaborate seamlessly with global experts across borders.", 
      defaultPos: "noun",
      analysis: "Sau mạo từ và tính từ 'a valuable' cần một danh từ đếm được số ít biểu thị cơ hội hoặc nền tảng học tập." 
    },
    { 
      prefix: "A comprehensive grasp of terminology forms an", 
      suffix: "foundation for academic growth and professional excellence.", 
      defaultPos: "adjective",
      analysis: "Đứng sau mạo từ 'an' và trước danh từ 'foundation' cần một tính từ bắt đầu bằng nguyên âm, chỉ tính chất then chốt, cốt lõi." 
    }
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
      explanationVi: `Vị trí ô [${bIndex}]: ${tpl.analysis} Từ '${termClean}' (${w.partOfSpeech || tpl.defaultPos}) hoàn toàn chuẩn xác về cả ngữ pháp và ngữ cảnh bài viết.`
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
    title: "Mastering Academic & Practical Vocabulary Through Context",
    fullTextOriginal: fullOriginalParts.join(' '),
    passageWithBlanks: passageBlankParts.join(' '),
    blanks: blanks,
    options: options.sort(() => Math.random() - 0.5),
    passageTranslationVi: "Việc tiếp thu kiến thức và làm chủ ngôn ngữ đòi hỏi sự kiên trì cùng phương pháp rèn luyện có hệ thống. Khi kết hợp các kỹ thuật học tập khoa học và tiếp xúc thường xuyên với ngữ cảnh thực tế, người học sẽ nâng cao rõ rệt độ trôi chảy và khả năng diễn đạt học thuật chuyên sâu."
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

function handleClozeChipDragEnd(event) {
  document.querySelectorAll('.cloze-blank-zone').forEach(el => el.classList.remove('drag-over'));
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

  const hintsVal = typeof getUserHints === 'function' ? getUserHints() : ((typeof currentUser !== 'undefined' && currentUser && currentUser.hints !== undefined) ? currentUser.hints : 5);
  const skipsVal = typeof getUserSkips === 'function' ? getUserSkips() : ((typeof currentUser !== 'undefined' && currentUser && currentUser.skips !== undefined) ? currentUser.skips : 3);

  if (hintsCountEl) hintsCountEl.textContent = hintsVal;
  if (skipsCountEl) skipsCountEl.textContent = skipsVal;
}

function useClozeHint() {
  if (!clozeCurrentPassage || !clozeCurrentPassage.blanks) return;
  const blank = clozeCurrentPassage.blanks.find(b => b.index === clozeActiveBlankIndex);
  if (!blank) return;

  const currentHints = typeof getUserHints === 'function' ? getUserHints() : 0;
  let hasHintResource = false;

  if (currentHints > 0) {
    if (typeof setUserHints === 'function') setUserHints(currentHints - 1);
    hasHintResource = true;
    if (typeof addLedgerEntry === 'function') addLedgerEntry('HINT_USED', 0, `Dùng VocaHint cho Cloze Test ô ${clozeActiveBlankIndex}`);
    if (typeof showToast === 'function') showToast(`💡 Đã dùng 1 VocaHint (còn ${typeof getUserHints === 'function' ? getUserHints() : 0} lượt)`);
  } else if (typeof getUserPoints === 'function' && getUserPoints() >= 50) {
    setUserPoints(getUserPoints() - 50);
    hasHintResource = true;
    if (typeof addLedgerEntry === 'function') addLedgerEntry('BUY_HINT', -50, `Mua 1 VocaHint cho Cloze Test ô ${clozeActiveBlankIndex}`);
    if (typeof showToast === 'function') showToast(`💡 Đã dùng 50 VoCoin mua 1 VocaHint (còn ${getUserPoints()} Xu)`);
  }

  if (!hasHintResource) {
    if (typeof showToast === 'function') showToast('⚠️ Bạn không đủ VocaHint hoặc Xu (cần 50 Xu)!');
    return;
  }

  clozeHintsUsed++;
  updateClozePowerupBadges();
  if (typeof saveDatabase === 'function') saveDatabase(true);

  const hintBox = document.getElementById('cloze-hint-box');
  if (hintBox) {
    hintBox.style.display = 'block';
    const cleanHint = (blank.hintVi || 'Xem xét kỹ ngữ cảnh câu và từ loại xung quanh ô trống.')
      .replace(/\s*\([bB]ắt đầu bằng[^)]*\)/gi, '')
      .replace(/\s*\([sS]tarts with[^)]*\)/gi, '')
      .trim();
    const posLabel = blank.partOfSpeech ? blank.partOfSpeech.toUpperCase() : 'TỪ LOẠI PHÙ HỢP';
    hintBox.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
        <strong style="color: #fbbf24; font-size: 13px;">💡 Gợi ý VocaHint cho ô [${clozeActiveBlankIndex}]:</strong>
        <span class="badge" style="background: rgba(99,102,241,0.2); color: #818cf8; font-size: 10.5px; font-weight: 700;">${posLabel}</span>
      </div>
      <div style="color: var(--text); font-size: 12.5px; line-height: 1.5;">
        • <strong>Gợi ý ngữ cảnh & ý nghĩa:</strong> ${cleanHint}
      </div>
    `;
  }

  if (typeof playVocaSfx === 'function') playVocaSfx('pop');
}

function useClozeSkip() {
  if (!clozeCurrentPassage || !clozeCurrentPassage.blanks) return;
  const blank = clozeCurrentPassage.blanks.find(b => b.index === clozeActiveBlankIndex);
  if (!blank) return;

  const currentSkips = typeof getUserSkips === 'function' ? getUserSkips() : 0;
  let hasSkipResource = false;

  if (currentSkips > 0) {
    if (typeof setUserSkips === 'function') setUserSkips(currentSkips - 1);
    hasSkipResource = true;
    if (typeof addLedgerEntry === 'function') addLedgerEntry('SKIP_USED', 0, `Dùng VocaSkip điền tự động ô ${clozeActiveBlankIndex}`);
  }

  if (!hasSkipResource) {
    if (typeof showToast === 'function') showToast('⚠️ Bạn đã hết lượt VocaSkip!');
    return;
  }

  clozeSkipsUsed++;
  updateClozePowerupBadges();
  if (typeof saveDatabase === 'function') saveDatabase(true);

  // Find matching option for this correct word
  const matchOpt = clozeCurrentPassage.options.find(o => o.word.toLowerCase() === blank.correctWord.toLowerCase());
  if (matchOpt) {
    placeWordInBlank(clozeActiveBlankIndex, matchOpt.id);
    if (typeof showToast === 'function') showToast(`⏭️ VocaSkip đã điền: '${matchOpt.word}' (còn ${typeof getUserSkips === 'function' ? getUserSkips() : 0} lượt)`);
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

  // =========================================================================
  // PARALLEL / COORDINATE INTERCHANGEABLE BLANKS GRAPH & BIPARTITE MATCHING
  // =========================================================================
  const interchangeableGraph = {};
  blanks.forEach(b => {
    interchangeableGraph[b.index] = new Set([b.index]);
  });

  // 1. Explicit interchangeableWith from Gemini JSON
  blanks.forEach(b => {
    if (b.interchangeableWith) {
      const list = Array.isArray(b.interchangeableWith) ? b.interchangeableWith : [b.interchangeableWith];
      list.forEach(otherIdx => {
        const oNum = parseInt(otherIdx, 10);
        if (!isNaN(oNum) && interchangeableGraph[oNum] && interchangeableGraph[b.index]) {
          interchangeableGraph[b.index].add(oNum);
          interchangeableGraph[oNum].add(b.index);
        }
      });
    }
  });

  // 2. Automatic text coordinate pair detection (e.g. [[blank_1]] and [[blank_2]])
  if (clozeCurrentPassage.passageWithBlanks) {
    const coordRegex = /\[\[blank_(\d+)\]\]\s*(?:,|và|cùng\s+với|hoặc|\/|and|or|as\s+well\s+as)\s*\[\[blank_(\d+)\]\]/gi;
    let match;
    while ((match = coordRegex.exec(clozeCurrentPassage.passageWithBlanks)) !== null) {
      const idx1 = parseInt(match[1], 10);
      const idx2 = parseInt(match[2], 10);
      if (interchangeableGraph[idx1] && interchangeableGraph[idx2]) {
        interchangeableGraph[idx1].add(idx2);
        interchangeableGraph[idx2].add(idx1);
      }
    }
  }

  // Find connected components
  const visitedBlanks = new Set();
  const blankGroups = [];
  blanks.forEach(b => {
    if (!visitedBlanks.has(b.index)) {
      const group = [];
      const queue = [b.index];
      visitedBlanks.add(b.index);
      while (queue.length > 0) {
        const cur = queue.shift();
        const bObj = blanks.find(x => x.index === cur);
        if (bObj) group.push(bObj);
        if (interchangeableGraph[cur]) {
          interchangeableGraph[cur].forEach(neighbor => {
            if (!visitedBlanks.has(neighbor)) {
              visitedBlanks.add(neighbor);
              queue.push(neighbor);
            }
          });
        }
      }
      blankGroups.push(group);
    }
  });

  // Evaluate each group with bipartite matching
  const blankResults = {}; // index -> { isCorrect, userWord, matchedTarget, isCoordinateSwap }
  blankGroups.forEach(group => {
    const remainingTargets = group.map(b => b.correctWord.toLowerCase().trim());

    // Pass 1: Exact slot matches
    group.forEach(b => {
      const placedOptId = clozePlacements[b.index];
      const rawUserWord = placedOptId ? getClozeOptionWordById(placedOptId) : '';
      const uWord = rawUserWord.toLowerCase().trim();
      const cWord = b.correctWord.toLowerCase().trim();

      if (uWord && uWord === cWord) {
        blankResults[b.index] = {
          isCorrect: true,
          userWord: rawUserWord,
          matchedTarget: b.correctWord,
          isCoordinateSwap: false
        };
        const tIdx = remainingTargets.indexOf(uWord);
        if (tIdx !== -1) remainingTargets.splice(tIdx, 1);
      }
    });

    // Pass 2: Coordinate interchangeable matches
    group.forEach(b => {
      if (!blankResults[b.index]) {
        const placedOptId = clozePlacements[b.index];
        const rawUserWord = placedOptId ? getClozeOptionWordById(placedOptId) : '';
        const uWord = rawUserWord.toLowerCase().trim();
        const tIdx = uWord ? remainingTargets.indexOf(uWord) : -1;

        if (tIdx !== -1) {
          blankResults[b.index] = {
            isCorrect: true,
            userWord: rawUserWord,
            matchedTarget: remainingTargets[tIdx],
            isCoordinateSwap: true
          };
          remainingTargets.splice(tIdx, 1);
        } else {
          blankResults[b.index] = {
            isCorrect: false,
            userWord: rawUserWord,
            matchedTarget: b.correctWord,
            isCoordinateSwap: false
          };
        }
      }
    });
  });

  // Build feedback and update blank DOM elements on the passage
  blanks.forEach(b => {
    const res = blankResults[b.index];
    const isCorrect = res ? res.isCorrect : false;
    const userWord = res ? res.userWord : '';

    // Find full word object from words in deck or construct one
    const cleanWord = b.correctWord.toLowerCase().trim();
    const matchedWord = (typeof words !== 'undefined' && Array.isArray(words))
      ? words.find(w => (w.deckId === currentDeckId || !w.deckId) && (w.term || '').trim().toLowerCase() === cleanWord)
      : null;
    const wordObj = matchedWord || {
      id: 'cloze_w_' + encodeURIComponent(b.correctWord).replace(/%/g, '_'),
      term: b.correctWord,
      partOfSpeech: b.partOfSpeech || 'word',
      definitionVi: b.hintVi ? b.hintVi.replace(/^[^:]+:\s*/, '') : b.correctWord,
      definition: b.hintVi || b.correctWord,
      deckId: currentDeckId || ''
    };

    if (isCorrect) {
      correctCount++;
      if (typeof removeWordFromMistakeList === 'function') {
        removeWordFromMistakeList(wordObj, true);
      }
    } else {
      clozeSessionWrongBlanks.push({
        word: b.correctWord,
        userWord: userWord || '(Bỏ trống)',
        blankIndex: b.index,
        hintVi: b.hintVi
      });
      if (!clozeSessionWrongWords.some(w => (w.term || '').toLowerCase() === cleanWord)) {
        clozeSessionWrongWords.push(wordObj);
      }
      if (typeof addWordToMistakeList === 'function') {
        addWordToMistakeList(wordObj, 'cloze');
      }
    }

    // Apply visual red/green coloring to the blank zone on passage text (Issue 6)
    const zoneEl = document.getElementById('cloze-blank-zone-' + b.index);
    const valEl = document.getElementById('cloze-blank-val-' + b.index);
    if (zoneEl) {
      zoneEl.classList.remove('correct-eval', 'wrong-eval', 'active-blank');
      if (isCorrect) {
        zoneEl.classList.add('correct-eval');
        if (valEl) {
          valEl.innerHTML = `${userWord || b.correctWord} <span style="font-size: 11px; margin-left: 2px;">✓</span>`;
        }
      } else {
        zoneEl.classList.add('wrong-eval');
        if (valEl) {
          if (userWord) {
            valEl.innerHTML = `<span style="text-decoration: line-through; opacity: 0.85;">${userWord}</span> <span style="color: #34d399; font-weight: 800; margin-left: 3px;">(${b.correctWord})</span> <span style="font-size: 11px;">✕</span>`;
          } else {
            valEl.innerHTML = `<span style="color: #f87171;">(trống)</span> <span style="color: #34d399; font-weight: 800; margin-left: 3px;">[${b.correctWord}]</span> <span style="font-size: 11px;">✕</span>`;
          }
        }
      }
    }

    let explanation = b.explanationVi || `Từ '${b.correctWord}' phù hợp ngữ cảnh câu.`;
    if (res && res.isCoordinateSwap) {
      explanation = `✨ <em>(Vị trí song hành hợp lệ):</em> Bạn đã điền từ '${res.userWord}' trong cấu trúc song hành liên từ. Cả hai vị trí đều tương đương nhau về ngữ pháp và ngữ nghĩa. ` + explanation;
    }

    detailedFeedback.push({
      index: b.index,
      isCorrect: isCorrect,
      userWord: userWord || '(Chưa điền)',
      correctWord: b.correctWord,
      partOfSpeech: b.partOfSpeech,
      explanationVi: explanation
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

    // =========================================================================
    // 3-TIER STRUCTURED CLOZE EXPLANATION CARDS FORMATTER (v0.10.10-20)
    // =========================================================================
    function formatClozeExplanationHTML(explanationText) {
      if (!explanationText || typeof explanationText !== 'string') return '';
      
      let text = explanationText.trim();
      let coordinatePrefix = '';

      // Extract coordinate swap notice if present
      if (text.includes('Vị trí song hành hợp lệ')) {
        coordinatePrefix = `
          <div style="background: rgba(168,85,247,0.15); border: 1px solid rgba(168,85,247,0.35); border-radius: 8px; padding: 6px 10px; margin-bottom: 8px; font-size: 12px; color: #d8b4fe; display: flex; align-items: center; gap: 6px;">
            <span>✨</span> <span><strong>Vị trí song hành hợp lệ:</strong> Bạn đã điền từ này trong cấu trúc song hành liên từ (and/or). Vị trí này hoàn toàn chính xác!</span>
          </div>
        `;
        text = text.replace(/✨\s*<em>\(Vị trí song hành hợp lệ\):<\/em>[^.]*\.\s*/i, '').replace(/✨\s*\(Vị trí song hành hợp lệ\):[^.]*\.\s*/i, '');
      }

      // Regex for (a)/(b)/(c) or 1./2./3. or a./b./c. or •
      let grammar = '', colloc = '', context = '';

      // Try matching standard (a), (b), (c)
      const matchABC = text.match(/(?:(?:\(a\)|(?:^|\s)a[\.\)]|Vị trí ngữ pháp:?|1[\.\)]))\s*([\s\S]*?)(?=(?:\(b\)|(?:^|\s)b[\.\)]|Cụm từ:?|2[\.\)]|$))(?:(?:\(b\)|(?:^|\s)b[\.\)]|Cụm từ:?|2[\.\)]))\s*([\s\S]*?)(?=(?:\(c\)|(?:^|\s)c[\.\)]|Ngữ cảnh:?|3[\.\)]|$))(?:(?:\(c\)|(?:^|\s)c[\.\)]|Ngữ cảnh:?|3[\.\)]))\s*([\s\S]*?)$/i);

      if (matchABC) {
        grammar = matchABC[1].trim().replace(/^[-:•]\s*/, '');
        colloc = matchABC[2].trim().replace(/^[-:•]\s*/, '');
        context = matchABC[3].trim().replace(/^[-:•]\s*/, '');
      } else {
        // If not matched fully, let's look for (a), (b), (c) individually
        const matchA = text.match(/(?:\(a\)|a[\.\)]|Vị trí ngữ pháp:?)\s*([^()]+?)(?=(?:\([bc]\)|[bc][\.\)]|Cụm từ:|Ngữ cảnh:|$))/i);
        const matchB = text.match(/(?:\(b\)|b[\.\)]|Cụm từ:?)\s*([^()]+?)(?=(?:\([ac]\)|[ac][\.\)]|Vị trí ngữ pháp:|Ngữ cảnh:|$))/i);
        const matchC = text.match(/(?:\(c\)|c[\.\)]|Ngữ cảnh:?)\s*([\s\S]+?)$/i);

        if (matchA || matchB || matchC) {
          if (matchA) grammar = matchA[1].trim().replace(/^[-:•]\s*/, '');
          if (matchB) colloc = matchB[1].trim().replace(/^[-:•]\s*/, '');
          if (matchC) context = matchC[1].trim().replace(/^[-:•]\s*/, '');
        }
      }

      if (grammar || colloc || context) {
        return `
          ${coordinatePrefix}
          <div class="cloze-explanation-container">
            ${grammar ? `
              <div class="cloze-explanation-card cloze-card-grammar">
                <div class="cloze-card-title">
                  <span>🏛️</span> <span>Vị Trí Ngữ Pháp & Cấu Trúc</span>
                </div>
                <div class="cloze-card-body">${grammar}</div>
              </div>
            ` : ''}
            ${colloc ? `
              <div class="cloze-explanation-card cloze-card-colloc">
                <div class="cloze-card-title">
                  <span>🔗</span> <span>Cụm Từ & Collocation Cố Định</span>
                </div>
                <div class="cloze-card-body">${colloc}</div>
              </div>
            ` : ''}
            ${context ? `
              <div class="cloze-explanation-card cloze-card-context">
                <div class="cloze-card-title">
                  <span>💡</span> <span>Sắc Thái Ngữ Cảnh & Ý Nghĩa</span>
                </div>
                <div class="cloze-card-body">${context}</div>
              </div>
            ` : ''}
          </div>
        `;
      }

      // Fallback for general text
      return `
        ${coordinatePrefix}
        <div class="cloze-explanation-container">
          <div class="cloze-explanation-card cloze-card-context">
            <div class="cloze-card-title">
              <span>💡</span> <span>Phân Tích & Giải Thích Chi Tiết</span>
            </div>
            <div class="cloze-card-body">${text}</div>
          </div>
        </div>
      `;
    }

  // Render detailed blank-by-blank feedback
  const feedbackList = document.getElementById('cloze-blanks-feedback-list');
  if (feedbackList) {
    feedbackList.innerHTML = detailedFeedback.map(item => `
      <div style="background: var(--surface-elevated); border: 1px solid ${item.isCorrect ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}; border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">${item.isCorrect ? '✅' : '❌'}</span>
            <div>
              <strong style="color: var(--text); font-size: 13.5px;">Ô [${item.index}]: </strong>
              <span style="color: ${item.isCorrect ? '#34d399' : '#f87171'}; font-weight: 800; font-size: 14px;">${item.userWord}</span>
              ${!item.isCorrect ? `<span style="color: var(--text-muted); font-size: 12.5px; margin-left: 4px;"> ➜ Đáp án đúng: <strong style="color: #34d399; font-size: 13.5px;">${item.correctWord}</strong></span>` : ''}
            </div>
          </div>
          <span class="badge" style="background: rgba(99,102,241,0.18); color: #a5b4fc; font-size: 11px; font-weight: 700; border: 1px solid rgba(99,102,241,0.3); padding: 2px 8px;">${item.partOfSpeech || 'word'}</span>
        </div>
        ${formatClozeExplanationHTML(item.explanationVi)}
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

  // Play sound & Trigger VIP Cat Meme
  if (typeof playVocaSfx === 'function') {
    playVocaSfx(accuracyPct >= 80 ? 'correct' : 'wrong');
  }
  if (typeof triggerVipMemeReaction === 'function') {
    triggerVipMemeReaction(accuracyPct >= 80 ? 'right' : 'fail');
  }

  // Auto-scroll to result panel
  if (resultPanel) {
    resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  // Study time in seconds and mm:ss format
  const durationSec = Math.max(1, Math.floor((Date.now() - clozeStartTime) / 1000));
  const mins = String(Math.floor(durationSec / 60)).padStart(2, '0');
  const secs = String(durationSec % 60).padStart(2, '0');

  // Record daily study time & activity (Issue 12)
  if (typeof addDailyStudySeconds === 'function') {
    addDailyStudySeconds(durationSec, 'cloze');
  }
  if (typeof recordStudyFlowAction === 'function') {
    recordStudyFlowAction('cloze');
  }
  if (typeof recordLessonCompleted === 'function') {
    recordLessonCompleted('cloze');
  }

  // Record spaced repetition review for words
  const reviewedWords = [];
  clozePassagesList.forEach(p => {
    if (p.passageData && p.passageData.blanks) {
      p.passageData.blanks.forEach(b => {
        const cleanWord = b.correctWord.toLowerCase().trim();
        const matched = (typeof words !== 'undefined' && Array.isArray(words))
          ? words.find(w => (w.deckId === currentDeckId || !w.deckId) && (w.term || '').trim().toLowerCase() === cleanWord)
          : null;
        if (matched && !reviewedWords.some(rw => rw.id === matched.id)) {
          reviewedWords.push(matched);
        }
      });
    }
  });
  if (reviewedWords.length > 0 && typeof recordStudySessionWordReviews === 'function') {
    recordStudySessionWordReviews(reviewedWords);
  }

  // Final session points settlement
  const totalBlanks = clozeSessionTotalBlanksCount || 1;
  const clozeItems = [];
  for (let i = 0; i < totalBlanks; i++) {
    clozeItems.push(i < clozeSessionCorrectBlanksCount ? 100 : 0);
  }
  const clozeExpRes = (typeof calculateUnifiedStudyExp === 'function')
    ? calculateUnifiedStudyExp('cloze', clozeItems, totalBlanks, currentClozeDifficulty)
    : { finalExp: 0 };

  if (clozeExpRes.finalExp > 0 && typeof addStudyExp === 'function') {
    addStudyExp(clozeExpRes.finalExp, 'cloze');
  }

  if ((clozeSessionPointsEarned > 0 || (clozeExpRes && clozeExpRes.finalExp > 0)) && typeof setUserPoints === 'function') {
    const curDeck = (typeof decks !== 'undefined') ? decks.find(d => d.id === currentDeckId) : null;
    const deckTitle = curDeck ? curDeck.title : 'Bộ từ vựng';
    const newBal = Math.max(0, getUserPoints() + clozeSessionPointsEarned);
    setUserPoints(newBal);
    if (typeof addLedgerEntry === 'function') {
      addLedgerEntry('STUDY_CLOZE', clozeSessionPointsEarned, `Điền từ Cloze Test "${deckTitle}" (+${clozeSessionPointsEarned} Xu)`, newBal, { studyExp: clozeExpRes?.finalExp || 0 });
    }
    if (typeof saveDatabase === 'function') saveDatabase(true);
    if (typeof pushCurrentDatabaseToCloud === 'function') pushCurrentDatabaseToCloud();
  }

  // Populate Celebration Modal (Issue 11 - 5-tile dashboard layout)
  const ratioEl = document.getElementById('cloze-res-floor-ratio');
  const pointsEl = document.getElementById('cloze-res-points');
  const expEl = document.getElementById('cloze-res-exp');
  const avgEl = document.getElementById('cloze-res-avg-score');
  const hintsSkipsEl = document.getElementById('cloze-res-hints-skips');
  const durationEl = document.getElementById('cloze-res-duration');
  const diffBadge = document.getElementById('cloze-res-difficulty-badge');

  const overallAccuracy = clozeSessionTotalBlanksCount > 0 ? Math.round((clozeSessionCorrectBlanksCount / clozeSessionTotalBlanksCount) * 100) : 100;
  const diffCfg = getClozeDifficultyConfig(currentClozeDifficulty);

  if (ratioEl) ratioEl.textContent = `${clozeSessionCorrectBlanksCount}/${clozeSessionTotalBlanksCount} (${overallAccuracy}%)`;
  if (pointsEl) pointsEl.textContent = `+${clozeSessionPointsEarned} VoCoin`;
  if (expEl) expEl.textContent = `+${clozeExpRes?.finalExp || 0} EXP`;
  if (avgEl) avgEl.textContent = `${clozeSessionCorrectBlanksCount} / ${clozeSessionTotalBlanksCount} từ`;
  if (hintsSkipsEl) hintsSkipsEl.textContent = `${clozeHintsUsed} gợi ý • ${clozeSkipsUsed} skip`;
  if (durationEl) durationEl.textContent = `${mins}:${secs}`;
  if (diffBadge) diffBadge.textContent = `🧩 Cấp độ: ${diffCfg.label} (x${diffCfg.diffMult})`;

  // Unified Balance v4 Bonus Breakdown & Energy Indicator
  const bonusBox = document.getElementById('cloze-res-bonus-box');
  let clozeRes = null;
  try {
    const total = clozePassagesList.length || 1;
    if (typeof calculateUnifiedSessionPoints === 'function') {
      clozeRes = calculateUnifiedSessionPoints('cloze', clozeSessionPointsEarned, total, total);
    } else if (typeof calculateSessionFinalPointsV3 === 'function') {
      clozeRes = calculateSessionFinalPointsV3(clozeSessionPointsEarned, total, total, true);
    } else if (typeof calculateSessionFinalPoints === 'function') {
      clozeRes = calculateSessionFinalPoints(clozeSessionPointsEarned, total, total, true);
    }
  } catch (e) {}

  if (bonusBox && clozeRes) {
    if (clozeRes.commitmentFactor < 1.0 || clozeRes.volumeMultiplier > 1.0 || (clozeRes.vipMultiplier && clozeRes.vipMultiplier > 1.0)) {
      bonusBox.style.display = 'block';
      bonusBox.innerHTML = `✨ Hệ số hoàn thành: <strong>x${clozeRes.commitmentFactor || clozeRes.completionMult || 1.0}</strong> • Khối lượng: <strong>x${clozeRes.volumeMultiplier || clozeRes.deckLengthMult || 1.0}</strong> • Trọng số: <strong>x${clozeRes.modeWeight || 2.8}</strong>`;
    } else {
      bonusBox.style.display = 'none';
    }
  }

  if (typeof updateModalBrainEnergyIndicator === 'function' && clozeRes) {
    updateModalBrainEnergyIndicator('cloze-res-energy-box', clozeRes);
  }

  // Wrong words retry banner (Issue 8 & 11)
  const wrongBanner = document.getElementById('cloze-res-wrong-banner');
  const wrongCountEl = document.getElementById('cloze-res-wrong-count');
  const wrongBtnLabel = document.getElementById('cloze-res-wrong-btn-label');

  if (clozeSessionWrongWords.length > 0) {
    if (wrongBanner) wrongBanner.style.display = 'block';
    if (wrongCountEl) wrongCountEl.textContent = `${clozeSessionWrongWords.length} từ`;
    if (wrongBtnLabel) wrongBtnLabel.textContent = `${clozeSessionWrongWords.length} từ`;
  } else {
    if (wrongBanner) wrongBanner.style.display = 'none';
  }

  if (typeof playVocaSfx === 'function') playVocaSfx('fireworks');
  if (typeof openModal === 'function') openModal('modal-cloze-result');
}

function closeClozeResultModal() {
  if (typeof stopVocaSfx === 'function') stopVocaSfx('fireworks');
  if (typeof closeModal === 'function') closeModal('modal-cloze-result');
}

function retryClozeWrongWordsOnly() {
  closeClozeResultModal();
  if (clozeSessionWrongWords.length === 0) {
    if (typeof showToast === 'function') showToast('🎉 Tuyệt vời! Bạn không có từ nào bị lỗi trong phiên này.');
    return;
  }
  const retryList = [...clozeSessionWrongWords];
  startClozeMode(true, retryList, 1);
}

function exitClozeMode() {
  const total = clozePassagesList.length || 1;
  const done = clozePassagesList.filter(p => p.isEvaluated || p.isSubmitted).length;

  if (!clozeIsCompleted && (done > 0 || clozeSessionPointsEarned !== 0 || currentClozeIndex > 0)) {
    if (typeof promptStudyEarlyExit === 'function') {
      promptStudyEarlyExit({
        mode: 'cloze',
        done,
        total,
        basePoints: clozeSessionPointsEarned,
        difficulty: currentClozeDifficulty,
        onConfirmExit: () => doExecuteExitCloze(done, total)
      });
      return;
    }
  }
  doExecuteExitCloze(done, total);
}

function doExecuteExitCloze(done, total) {
  stopClozePassageAudio();
  if (typeof stopVocaSfx === 'function') stopVocaSfx('fireworks');
  closeClozeResultModal();

  // Early exit points settlement via Unified Balance v4
  if (!clozeIsCompleted && (clozeSessionPointsEarned !== 0 || done > 0)) {
    const isComp = done >= total && total > 0;
    const res = (typeof calculateUnifiedSessionPoints === 'function')
      ? calculateUnifiedSessionPoints('cloze', clozeSessionPointsEarned, done, total)
      : (typeof calculateSessionFinalPointsV3 === 'function')
        ? calculateSessionFinalPointsV3(clozeSessionPointsEarned, done, total, isComp)
        : calculateSessionFinalPoints(clozeSessionPointsEarned, done, total, isComp);
    const finalPts = res.finalPoints ?? res.finalPts;

    const totalBlanks = clozeSessionTotalBlanksCount || done;
    const clozeItems = [];
    for (let i = 0; i < (clozeSessionTotalBlanksCount || done); i++) {
      clozeItems.push(i < clozeSessionCorrectBlanksCount ? 100 : 0);
    }
    const expRes = (typeof calculateUnifiedStudyExp === 'function')
      ? calculateUnifiedStudyExp('cloze', clozeItems.length > 0 ? clozeItems : new Array(done).fill(100), totalBlanks, currentClozeDifficulty)
      : { finalExp: 0 };

    if (expRes.finalExp > 0 && typeof addStudyExp === 'function') {
      addStudyExp(expRes.finalExp, 'cloze');
    }

    if ((finalPts !== 0 || expRes.finalExp > 0) && typeof setUserPoints === 'function') {
      const curDeck = (typeof decks !== 'undefined') ? decks.find(d => d.id === currentDeckId) : null;
      const deckTitle = curDeck ? curDeck.title : 'Bộ từ vựng';
      const newBalance = Math.max(0, getUserPoints() + finalPts);
      setUserPoints(newBalance);
      const bonusText = (res.metrics?.volumeMult > 1.0) ? ` + Quy mô x${res.metrics?.volumeMult}` : '';
      if (typeof addLedgerEntry === 'function') {
        addLedgerEntry('STUDY_CLOZE', finalPts, `Điền từ Cloze Test "${deckTitle}" (${done}/${total} đoạn, x${res.combinedMult || 1.0}${bonusText})`, newBalance, { studyExp: expRes.finalExp });
      }
      if (typeof saveDatabase === 'function') saveDatabase(true);
      if (typeof pushCurrentDatabaseToCloud === 'function') pushCurrentDatabaseToCloud();
      if (typeof showToast === 'function') {
        showToast(`🎉 Cloze Test: ${finalPts > 0 ? '+' : ''}${finalPts} VoCoin • +${expRes.finalExp} EXP`);
      }
    }
    clozeSessionPointsEarned = 0;
  }

  // Record study time on exit if session was active
  if (clozeStartTime > 0) {
    const durationSec = Math.max(1, Math.floor((Date.now() - clozeStartTime) / 1000));
    if (done > 0 && typeof addDailyStudySeconds === 'function') {
      addDailyStudySeconds(durationSec, 'cloze');
    }
    if (done > 0 && typeof recordStudyFlowAction === 'function') {
      recordStudyFlowAction('cloze');
    }
  }

  if (typeof studySourceContext !== 'undefined' && (studySourceContext === 'review-queue' || !currentDeckId)) {
    if (typeof showScreen === 'function') showScreen('screen-decks');
    if (typeof refreshActiveScreenData === 'function') refreshActiveScreenData();
  } else {
    if (typeof showScreen === 'function') showScreen('screen-deck-detail');
    if (typeof refreshActiveScreenData === 'function') refreshActiveScreenData();
  }
}

// Window Bindings for Global Access
window.openClozeSetupModal = openClozeSetupModal;
window.confirmStartClozeFromModal = confirmStartClozeFromModal;
window.selectClozeSetupDifficulty = selectClozeSetupDifficulty;
window.selectClozeSetupPassageCount = selectClozeSetupPassageCount;
window.handleClozeCustomPassageCountInput = handleClozeCustomPassageCountInput;
window.startClozeMode = startClozeMode;
window.exitClozeMode = exitClozeMode;
window.shuffleCurrentCloze = shuffleCurrentCloze;
window.toggleClozePassageAudio = toggleClozePassageAudio;
window.stopClozePassageAudio = stopClozePassageAudio;
window.handleClozeBlankClick = handleClozeBlankClick;
window.handleClozeBlankDragOver = handleClozeBlankDragOver;
window.handleClozeBlankDragLeave = handleClozeBlankDragLeave;
window.handleClozeBlankDrop = handleClozeBlankDrop;
window.handleClozeChipClick = handleClozeChipClick;
window.handleClozeChipDragStart = handleClozeChipDragStart;
window.handleClozeChipDragEnd = handleClozeChipDragEnd;
window.unplaceWordFromBlank = unplaceWordFromBlank;
window.useClozeHint = useClozeHint;
window.useClozeSkip = useClozeSkip;
window.submitClozeEvaluation = submitClozeEvaluation;
window.nextClozePassage = nextClozePassage;
window.finishClozeSession = finishClozeSession;
window.closeClozeResultModal = closeClozeResultModal;
window.retryClozeWrongWordsOnly = retryClozeWrongWordsOnly;

