// =========================================================================
// VOCAFLOW 06E-DICTATION-ENGINE.JS (v0.10.10-21 Build 322 - SENTENCE DICTATION VIP β)
// Full Sentence Dictation Engine with Natural Speech, Speed Slider, and AI Scoring
// =========================================================================

let dictationQuestionsList = [];
let currentDictationIndex = 0;
let currentDictationDifficulty = localStorage.getItem('vocaflow_dictation_difficulty') || 'easy';
let selectedDictationSetupDifficulty = 'easy';
let dictationSetupQuestionCount = 'all'; // '5' | '10' | 'custom' | 'all'
let dictationSetupCustomCountValue = null;
let dictationSetupUseSelection = false;
let dictationSetupCustomWordList = null;

let dictationAudioRate = 1.0;
let dictationListensLeft = 5;
let dictationMaxListens = 5;
let dictationFloorScore = 70;
let dictationDiffMult = 1.0;
let dictationCurrentOriginalSentence = '';
let dictationCurrentTranslation = '';
let dictationCurrentWordRef = null;
let dictationHintsRevealed = 0;
let dictationSessionPointsEarned = 0;
let dictationSessionWrongWords = [];
let dictationGradedIndices = new Set();
let dictationAutoPlayTimeout = null;
let dictationStartTime = 0;
let dictationIsCompleted = false;

// =========================================================================
// 1. DIFFICULTY CONFIGURATION (v0.10.10-21)
// =========================================================================
function getDictationDifficultyConfig(diff) {
  if (diff === 'expert') {
    return {
      floorScore: 90,
      diffMult: 2.2,
      maxListens: 2,
      minWords: 23,
      maxWords: 35,
      baseXu: 32,
      label: '🔥 Siêu Khó'
    };
  }
  if (diff === 'hard') {
    return {
      floorScore: 90,
      diffMult: 1.8,
      maxListens: 3,
      minWords: 15,
      maxWords: 22,
      baseXu: 24,
      label: '🔴 Khó'
    };
  }
  if (diff === 'medium') {
    return {
      floorScore: 80,
      diffMult: 1.4,
      maxListens: 4,
      minWords: 9,
      maxWords: 14,
      baseXu: 16,
      label: '🟡 Trung Bình'
    };
  }
  return {
    floorScore: 70,
    diffMult: 1.0,
    maxListens: 5,
    minWords: 5,
    maxWords: 8,
    baseXu: 10,
    label: '🟢 Dễ'
  };
}

// =========================================================================
// 2. SETUP MODAL HANDLERS & VIP CHECK
// =========================================================================
function openDictationSetupModal(useSelection = false, customWordList = null) {
  // VIP Gate check (Issue 22)
  if (typeof isUserVip === 'function' && !isUserVip()) {
    const isGuest = typeof currentUser === 'undefined' || !currentUser || !currentUser.email;
    if (isGuest && typeof openGuestFeatureLockModal === 'function') {
      openGuestFeatureLockModal('dictation', 'Chế độ Nghe Gõ Câu (VIP β)', '🎧 🔒', 'Tính Năng Độc Quyền VocaVIP');
    } else if (typeof openVipPricingModal === 'function') {
      if (typeof showToast === 'function') {
        showToast('👑 Chế độ Nghe Gõ Câu (VIP β) là tính năng nâng cao độc quyền dành riêng cho VocaVIP!');
      }
      openVipPricingModal();
    } else {
      alert('🔒 Chế độ Nghe Gõ Câu (VIP β) là tính năng độc quyền dành riêng cho thành viên VocaVIP!');
    }
    return;
  }

  dictationSetupUseSelection = useSelection;
  dictationSetupCustomWordList = customWordList;
  selectedDictationSetupDifficulty = currentDictationDifficulty;

  selectDictationSetupDifficulty(selectedDictationSetupDifficulty);
  selectDictationSetupQuestionCount(dictationSetupQuestionCount || 'all');

  const shuffleCb = document.getElementById('dictation-setup-shuffle-checkbox');
  if (shuffleCb) shuffleCb.checked = (typeof isStudyShuffle !== 'undefined') ? isStudyShuffle : true;

  // Word count subtitle
  let wordCount = 0;
  if (customWordList) wordCount = customWordList.length;
  else if (useSelection && typeof selectedWordIds !== 'undefined' && selectedWordIds && selectedWordIds.size > 0) wordCount = selectedWordIds.size;
  else if (typeof words !== 'undefined' && typeof currentDeckId !== 'undefined') wordCount = words.filter(w => w.deckId === currentDeckId).length;

  const sub = document.getElementById('dictation-setup-subtitle');
  if (sub) sub.textContent = `${wordCount} từ vựng sẵn sàng luyện nghe chép câu`;

  if (typeof openModal === 'function') openModal('modal-dictation-setup');
}
window.openDictationSetupModal = openDictationSetupModal;

function selectDictationSetupDifficulty(diff) {
  selectedDictationSetupDifficulty = diff;
  ['easy', 'medium', 'hard', 'expert'].forEach(d => {
    const card = document.getElementById('dictation-diff-card-' + d);
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
window.selectDictationSetupDifficulty = selectDictationSetupDifficulty;

function selectDictationSetupQuestionCount(count) {
  dictationSetupQuestionCount = count;
  ['5', '10', 'custom', 'all'].forEach(c => {
    const btn = document.getElementById('dictation-qc-' + c);
    if (btn) {
      if (String(c) === String(count)) {
        btn.classList.add('active');
        btn.style.borderColor = '#6366f1';
        btn.style.background = 'rgba(99,102,241,0.15)';
        btn.style.color = 'var(--text)';
      } else {
        btn.classList.remove('active');
        btn.style.borderColor = 'var(--border)';
        btn.style.background = c === 'custom' ? 'var(--surface-elevated)' : 'transparent';
        btn.style.color = 'var(--text-muted)';
      }
    }
  });
}
window.selectDictationSetupQuestionCount = selectDictationSetupQuestionCount;

function handleDictationCustomQuestionCountInput(val) {
  let num = parseInt(val, 10);
  let maxWords = 999;
  if (dictationSetupCustomWordList) maxWords = dictationSetupCustomWordList.length;
  else if (dictationSetupUseSelection && selectedWordIds && selectedWordIds.size > 0) maxWords = selectedWordIds.size;
  else if (typeof currentDeckId !== 'undefined' && typeof words !== 'undefined') maxWords = words.filter(w => w.deckId === currentDeckId).length;

  if (isNaN(num) || num < 1) num = 1;
  if (num > maxWords && maxWords > 0) {
    num = maxWords;
    const inp = document.getElementById('dictation-qc-custom-input');
    if (inp) inp.value = num;
  }
  dictationSetupCustomCountValue = num;
  selectDictationSetupQuestionCount('custom');
}
window.handleDictationCustomQuestionCountInput = handleDictationCustomQuestionCountInput;

function confirmStartDictationFromModal() {
  if (typeof stopVocaSfx === 'function') stopVocaSfx('fireworks');
  currentDictationDifficulty = selectedDictationSetupDifficulty;
  localStorage.setItem('vocaflow_dictation_difficulty', currentDictationDifficulty);

  const shuffleCb = document.getElementById('dictation-setup-shuffle-checkbox');
  const doShuffle = shuffleCb ? shuffleCb.checked : true;

  closeModal('modal-dictation-setup');
  startDictationMode(dictationSetupUseSelection, dictationSetupCustomWordList, doShuffle);
}
window.confirmStartDictationFromModal = confirmStartDictationFromModal;

// =========================================================================
// 3. SENTENCE DICTATION REPOSITORY & BUILDER
// =========================================================================
function generateSentenceForWord(word, difficulty) {
  const term = (word.term || '').trim();
  const pos = (word.partOfSpeech || 'noun').toLowerCase();
  const defVi = word.definitionVi || word.definition || '';

  // Check if existing example fits nicely
  if (word.exampleSentence || word.example) {
    const rawEx = (word.exampleSentence || word.example).trim().replace(/^["']|["']$/g, '');
    const wordCount = rawEx.split(/\s+/).length;
    const cfg = getDictationDifficultyConfig(difficulty);
    if (wordCount >= (cfg.minWords - 3) && wordCount <= (cfg.maxWords + 5) && rawEx.toLowerCase().includes(term.toLowerCase())) {
      return {
        sentenceText: rawEx,
        sentenceTranslationVi: word.exampleTranslationVi || `Câu ví dụ chứa từ "${term}" (${defVi})`
      };
    }
  }

  // Curated templates based on difficulty
  if (difficulty === 'easy') {
    const templates = [
      { en: `She wants to learn this ${term} today.`, vi: `Cô ấy muốn học ${defVi || term} này hôm nay.` },
      { en: `We need a clear ${term} for our project.`, vi: `Chúng tôi cần một ${defVi || term} rõ ràng cho dự án.` },
      { en: `He explained the new ${term} very well.`, vi: `Anh ấy đã giải thích ${defVi || term} mới rất tốt.` },
      { en: `The students practiced the ${term} in class.`, vi: `Các học sinh đã luyện tập ${defVi || term} trong lớp.` },
      { en: `Good teamwork makes every ${term} much easier.`, vi: `Làm việc nhóm tốt giúp mọi ${defVi || term} dễ dàng hơn nhiều.` }
    ];
    const picked = templates[Math.floor(Math.random() * templates.length)];
    return { sentenceText: picked.en, sentenceTranslationVi: picked.vi };
  }

  if (difficulty === 'medium') {
    const templates = [
      { en: `Students who understand the concept of ${term} usually perform better in their exams.`, vi: `Những học sinh hiểu rõ khái niệm về ${defVi || term} thường làm bài thi tốt hơn.` },
      { en: `Our team decided to adopt a new ${term} in order to improve overall productivity.`, vi: `Đội ngũ của chúng tôi quyết định áp dụng ${defVi || term} mới nhằm nâng cao năng suất chung.` },
      { en: `Environmental scientists are studying the impact of this ${term} on local wildlife habitats.`, vi: `Các nhà khoa học môi trường đang nghiên cứu tác động của ${defVi || term} này lên môi trường sống hoang dã.` },
      { en: `Technological innovations have introduced a revolutionary ${term} into modern digital education.`, vi: `Các đổi mới công nghệ đã đưa một ${defVi || term} mang tính cách mạng vào nền giáo dục số hiện đại.` }
    ];
    const picked = templates[Math.floor(Math.random() * templates.length)];
    return { sentenceText: picked.en, sentenceTranslationVi: picked.vi };
  }

  if (difficulty === 'hard') {
    const templates = [
      { en: `Although many experts debated the exact definition of ${term}, everyone agreed that its practical application is essential for sustained organizational success.`, vi: `Mặc dù nhiều chuyên gia tranh luận về định nghĩa chính xác của ${defVi || term}, mọi người đều đồng ý rằng ứng dụng thực tiễn của nó là thiết yếu cho sự thành công bền vững của tổ chức.` },
      { en: `The government has recently implemented comprehensive regulations regarding ${term} to safeguard public health and ensure environmental sustainability across the country.`, vi: `Chính phủ gần đây đã ban hành các quy định toàn diện liên quan đến ${defVi || term} nhằm bảo vệ sức khỏe cộng đồng và bảo đảm tính bền vững môi trường trên cả nước.` },
      { en: `Through extensive interdisciplinary research, scholars demonstrated how this fundamental ${term} influences international economic stability and fosters global cooperation.`, vi: `Thông qua nghiên cứu liên ngành sâu rộng, các học giả đã chứng minh cách thức ${defVi || term} căn bản này tác động đến sự ổn định kinh tế quốc tế và thúc đẩy hợp tác toàn cầu.` }
    ];
    const picked = templates[Math.floor(Math.random() * templates.length)];
    return { sentenceText: picked.en, sentenceTranslationVi: picked.vi };
  }

  // Expert / Master
  const expertTemplates = [
    { en: `Notwithstanding the persistent socioeconomic challenges encountered throughout the historical transition, the strategic implementation of ${term} enabled the institution to achieve unprecedented academic breakthroughs and international recognition.`, vi: `Bất chấp những thách thức kinh tế xã hội dai dẳng gặp phải trong suốt quá trình chuyển dịch lịch sử, việc triển khai chiến lược ${defVi || term} đã giúp viện nghiên cứu đạt được những đột phá học thuật chưa từng có và sự công nhận quốc tế.` },
    { en: `Recent empirical investigations conducted across various developing metropolitan regions have confirmed that integrating ${term} with sustainable infrastructure significantly reduces long-term operational expenditures while accelerating community development.`, vi: `Các cuộc điều tra thực nghiệm gần đây được tiến hành trên khắp các vùng đô thị đang phát triển đã xác nhận rằng việc tích hợp ${defVi || term} với cơ sở hạ tầng bền vững giúp giảm đáng kể chi phí vận hành dài hạn trong khi đẩy nhanh sự phát triển cộng đồng.` }
  ];
  const picked = expertTemplates[Math.floor(Math.random() * expertTemplates.length)];
  return { sentenceText: picked.en, sentenceTranslationVi: picked.vi };
}

// =========================================================================
// 4. START DICTATION SESSION
// =========================================================================
function startDictationMode(fromSelection = false, customWordList = null, doShuffle = true) {
  if (typeof stopVocaSfx === 'function') stopVocaSfx('fireworks');
  if (typeof stopAllAudio === 'function') stopAllAudio();

  let targetWords = [];
  if (customWordList && customWordList.length > 0) {
    targetWords = customWordList;
  } else if (fromSelection && typeof selectedWordIds !== 'undefined' && selectedWordIds.size > 0) {
    targetWords = words.filter(w => selectedWordIds.has(w.id));
  } else if (typeof currentDeckId !== 'undefined' && typeof words !== 'undefined') {
    targetWords = words.filter(w => w.deckId === currentDeckId);
  }

  if (!targetWords || targetWords.length === 0) {
    alert('Bộ từ này chưa có từ vựng nào để luyện nghe gõ câu!');
    return;
  }

  let workingList = [...targetWords];
  if (doShuffle) {
    workingList.sort(() => Math.random() - 0.5);
  }

  // Limit question count if requested
  if (dictationSetupQuestionCount === '5') workingList = workingList.slice(0, 5);
  else if (dictationSetupQuestionCount === '10') workingList = workingList.slice(0, 10);
  else if (dictationSetupQuestionCount === 'custom' && dictationSetupCustomCountValue) {
    workingList = workingList.slice(0, dictationSetupCustomCountValue);
  }

  dictationQuestionsList = workingList.map((w, idx) => {
    const generated = generateSentenceForWord(w, currentDictationDifficulty);
    return {
      index: idx,
      wordRef: w,
      wordTerm: w.term || '',
      wordPos: w.partOfSpeech || 'noun',
      sentenceText: generated.sentenceText,
      sentenceTranslationVi: generated.sentenceTranslationVi
    };
  });

  currentDictationIndex = 0;
  dictationSessionPointsEarned = 0;
  dictationSessionWrongWords = [];
  dictationGradedIndices.clear();
  dictationStartTime = Date.now();
  dictationIsCompleted = false;

  // Config setup
  const cfg = getDictationDifficultyConfig(currentDictationDifficulty);
  dictationFloorScore = cfg.floorScore;
  dictationMaxListens = cfg.maxListens;
  dictationDiffMult = cfg.diffMult;

  // UI Setup
  const diffBadge = document.getElementById('dictation-difficulty-badge');
  if (diffBadge) {
    diffBadge.textContent = `${cfg.label} (x${dictationDiffMult})`;
  }

  const scoreBadge = document.getElementById('dictation-score-badge');
  if (scoreBadge) scoreBadge.textContent = 'Bài: +0đ';

  const deckTitleEl = document.getElementById('dictation-deck-title');
  if (deckTitleEl) {
    const curDeck = (typeof decks !== 'undefined') ? decks.find(d => d.id === currentDeckId) : null;
    deckTitleEl.textContent = customWordList ? 'Hàng Đợi Ôn Tập Hôm Nay' : (curDeck ? curDeck.title : 'Bộ từ vựng');
  }

  showScreen('screen-dictation');
  renderDictationCurrentQuestion();
}
window.startDictationMode = startDictationMode;

// =========================================================================
// 5. RENDER CURRENT QUESTION & 250ms AUDIO BUFFER DELAY
// =========================================================================
function renderDictationCurrentQuestion() {
  if (!dictationQuestionsList || dictationQuestionsList.length === 0) return;
  const q = dictationQuestionsList[currentDictationIndex];
  if (!q) return;

  if (dictationAutoPlayTimeout) {
    clearTimeout(dictationAutoPlayTimeout);
    dictationAutoPlayTimeout = null;
  }
  if (typeof stopAllAudio === 'function') stopAllAudio();

  dictationCurrentOriginalSentence = q.sentenceText;
  dictationCurrentTranslation = q.sentenceTranslationVi;
  dictationCurrentWordRef = q.wordRef;
  dictationListensLeft = dictationMaxListens;
  dictationHintsRevealed = 0;

  // Counter
  const counterEl = document.getElementById('dictation-counter');
  if (counterEl) counterEl.textContent = `Câu ${currentDictationIndex + 1} / ${dictationQuestionsList.length}`;

  // Term clue
  const termEl = document.getElementById('dictation-word-term');
  if (termEl) termEl.textContent = q.wordTerm;
  const posEl = document.getElementById('dictation-word-pos');
  if (posEl) posEl.textContent = q.wordPos;

  // Listen Quota Badge & Button state
  updateDictationListenQuotaUI();

  // Reset Input
  const textarea = document.getElementById('dictation-input-text');
  if (textarea) {
    textarea.value = '';
    textarea.disabled = false;
    textarea.focus();
    updateDictationCharCounter();
  }

  // Reset Hint Box
  const hintBox = document.getElementById('dictation-hint-box');
  if (hintBox) hintBox.style.display = 'none';
  updateDictationWalletBadges();

  // Hide Result Panel & Wave Box
  const resultPanel = document.getElementById('dictation-result-panel');
  if (resultPanel) resultPanel.style.display = 'none';
  const waveBox = document.getElementById('dictation-wave-box');
  if (waveBox) waveBox.style.display = 'none';

  // Action Buttons
  const submitBtn = document.getElementById('btn-dictation-submit');
  if (submitBtn) submitBtn.style.display = 'inline-flex';
  const hintBtn = document.getElementById('btn-dictation-hint');
  if (hintBtn) hintBtn.disabled = false;
  const skipBtn = document.getElementById('btn-dictation-skip');
  if (skipBtn) skipBtn.disabled = false;

  // 250ms Silent Audio Buffer Delay (Requirement 16)
  dictationAutoPlayTimeout = setTimeout(() => {
    const curScreen = document.getElementById('screen-dictation');
    if (curScreen && curScreen.classList.contains('active')) {
      playDictationAudio(true);
    }
  }, 250);
}

function updateDictationListenQuotaUI() {
  const badge = document.getElementById('dictation-listen-quota-badge');
  const btn = document.getElementById('btn-dictation-play-audio');
  if (badge) {
    badge.textContent = `Nghe Câu Mẫu (${dictationListensLeft}/${dictationMaxListens})`;
  }
  if (btn) {
    if (dictationListensLeft <= 0) {
      btn.classList.add('study-mode-btn-disabled');
      btn.disabled = true;
      btn.style.opacity = '0.5';
    } else {
      btn.classList.remove('study-mode-btn-disabled');
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  }
}

function updateDictationWalletBadges() {
  const hintCountBadge = document.getElementById('dictation-hint-count-badge');
  if (hintCountBadge) {
    const hints = typeof getUserHints === 'function' ? getUserHints() : 5;
    hintCountBadge.textContent = `(${hints})`;
  }
  const skipCountBadge = document.getElementById('dictation-skip-count-badge');
  if (skipCountBadge) {
    const skips = typeof getUserSkips === 'function' ? getUserSkips() : 3;
    skipCountBadge.textContent = `(${skips})`;
  }
}

function updateDictationCharCounter() {
  const textarea = document.getElementById('dictation-input-text');
  const counter = document.getElementById('dictation-char-counter');
  if (textarea && counter) {
    const text = textarea.value.trim();
    const charCount = textarea.value.length;
    const wordCount = text ? text.split(/\s+/).length : 0;
    counter.textContent = `${charCount} ký tự • ${wordCount} từ`;
  }
}

// Bind textarea events
document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('dictation-input-text');
  if (textarea) {
    textarea.addEventListener('input', updateDictationCharCounter);
    textarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        submitDictationEvaluation();
      }
    });
  }
});

// =========================================================================
// 6. AUDIO PLAYBACK & SPEED CONTROLLER
// =========================================================================
function setDictationAudioRate(rate) {
  dictationAudioRate = rate;
  currentSpeechRateEn = rate;
  ['05', '075', '09', '10', '125'].forEach(s => {
    const btn = document.getElementById('speed-btn-' + s);
    if (btn) {
      const match = (s === '05' && rate === 0.5) ||
                    (s === '075' && rate === 0.75) ||
                    (s === '09' && rate === 0.9) ||
                    (s === '10' && rate === 1.0) ||
                    (s === '125' && rate === 1.25);
      if (match) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });
  if (typeof showToast === 'function') {
    showToast(`⚡ Tốc độ đọc: ${rate}x`);
  }
}
window.setDictationAudioRate = setDictationAudioRate;

function playDictationAudio(isAutoPlay = false) {
  if (dictationListensLeft <= 0) {
    if (typeof showToast === 'function') showToast('⚠️ Bạn đã hết lượt nghe mẫu cho câu này!');
    return;
  }

  dictationListensLeft--;
  updateDictationListenQuotaUI();

  const waveBox = document.getElementById('dictation-wave-box');
  if (waveBox) waveBox.style.display = 'flex';

  if (typeof speakText === 'function' && dictationCurrentOriginalSentence) {
    speakText(dictationCurrentOriginalSentence, 'en-US');
  }

  // Wave auto hide after estimated duration
  const wordsCount = dictationCurrentOriginalSentence.split(/\s+/).length;
  const durationMs = Math.max(1500, (wordsCount * 450) / dictationAudioRate);
  setTimeout(() => {
    if (waveBox) waveBox.style.display = 'none';
  }, durationMs);
}
window.playDictationAudio = playDictationAudio;

// =========================================================================
// 7. VOCAHINT & VOCASKIP WALLET INTEGRATION (Requirement 17)
// =========================================================================
function useDictationHint() {
  const currentHints = typeof getUserHints === 'function' ? getUserHints() : 0;
  if (currentHints <= 0) {
    if (typeof showToast === 'function') showToast('⚠️ Bạn đã hết VocaHint! Hãy ghé Cửa Hàng để nạp thêm nhé.');
    if (typeof openShopModal === 'function') openShopModal();
    return;
  }

  // Deduct real wallet hint
  setUserHints(currentHints - 1);
  if (typeof addLedgerEntry === 'function') {
    addLedgerEntry('HINT_USED', 0, `Sử dụng 1 VocaHint trong Nghe Gõ Câu (còn ${currentHints - 1})`);
  }
  updateDictationWalletBadges();

  dictationHintsRevealed++;
  const hintBox = document.getElementById('dictation-hint-box');
  const hintContent = document.getElementById('dictation-hint-content');

  if (hintBox && hintContent) {
    hintBox.style.display = 'block';
    if (dictationHintsRevealed === 1) {
      hintContent.innerHTML = `🇻🇳 <strong>Dịch nghĩa:</strong> "${dictationCurrentTranslation}"`;
    } else if (dictationHintsRevealed === 2) {
      const wordsArr = dictationCurrentOriginalSentence.split(/\s+/);
      const firstLetters = wordsArr.map(w => w.charAt(0) + '...').join(' ');
      hintContent.innerHTML = `
        <div>🇻🇳 <strong>Dịch nghĩa:</strong> "${dictationCurrentTranslation}"</div>
        <div style="margin-top: 6px; color: #38bdf8;">🔤 <strong>Chữ cái đầu các từ:</strong> <code>${firstLetters}</code></div>
      `;
    } else {
      const wordsCount = dictationCurrentOriginalSentence.split(/\s+/).length;
      const charCount = dictationCurrentOriginalSentence.length;
      hintContent.innerHTML = `
        <div>🇻🇳 <strong>Dịch nghĩa:</strong> "${dictationCurrentTranslation}"</div>
        <div style="margin-top: 4px; color: #38bdf8;">🔤 <strong>Độ dài câu:</strong> ${wordsCount} từ • ${charCount} ký tự</div>
      `;
    }
  }
  if (typeof playVocaSfx === 'function') playVocaSfx('pop');
}
window.useDictationHint = useDictationHint;

function skipDictationQuestion() {
  const currentSkips = typeof getUserSkips === 'function' ? getUserSkips() : 0;
  if (currentSkips <= 0) {
    if (typeof showToast === 'function') showToast('⚠️ Bạn đã hết VocaSkip! Hãy ghé Cửa Hàng để nạp thêm nhé.');
    if (typeof openShopModal === 'function') openShopModal();
    return;
  }

  // Deduct real wallet skip
  setUserSkips(currentSkips - 1);
  if (typeof addLedgerEntry === 'function') {
    addLedgerEntry('SKIP_USED', 0, `Sử dụng 1 VocaSkip trong Nghe Gõ Câu (còn ${currentSkips - 1})`);
  }
  updateDictationWalletBadges();

  if (typeof showToast === 'function') showToast(`⏭️ Đã bỏ qua câu hiện tại (còn ${currentSkips - 1} VocaSkip)`);
  if (typeof playVocaSfx === 'function') playVocaSfx('skip');

  nextDictationQuestion();
}
window.skipDictationQuestion = skipDictationQuestion;

// =========================================================================
// 8. EVALUATION & TOKEN-BY-TOKEN LEVENSHTEIN DIFF
// =========================================================================
function normalizeTokenForDiff(t) {
  return (t || '').toLowerCase().replace(/^[^\w]+|[^\w]+$/g, '');
}

function computeTokenLevenshteinDistance(s1, s2) {
  const m = s1.length, n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function submitDictationEvaluation() {
  const textarea = document.getElementById('dictation-input-text');
  const userText = textarea ? textarea.value.trim() : '';
  if (!userText) {
    if (typeof showToast === 'function') showToast('⚠️ Vui lòng nhập nội dung câu trước khi nộp bài chấm điểm!');
    return;
  }

  if (dictationGradedIndices.has(currentDictationIndex)) return;
  dictationGradedIndices.add(currentDictationIndex);

  const origTokens = dictationCurrentOriginalSentence.split(/\s+/);
  const userTokens = userText.split(/\s+/);

  let exactMatches = 0;
  let typos = 0;
  let diffHtml = '';

  const maxLen = Math.max(origTokens.length, userTokens.length);
  for (let i = 0; i < maxLen; i++) {
    const oTok = origTokens[i] || '';
    const uTok = userTokens[i] || '';

    const cleanO = normalizeTokenForDiff(oTok);
    const cleanU = normalizeTokenForDiff(uTok);

    if (cleanO && cleanU && cleanO === cleanU) {
      exactMatches++;
      diffHtml += `<span class="dictation-token-exact" title="Chính xác">${escapeHtml(uTok)}</span> `;
    } else if (cleanO && cleanU) {
      const dist = computeTokenLevenshteinDistance(cleanO, cleanU);
      if (dist <= 2 && dist < cleanO.length) {
        typos++;
        diffHtml += `<span class="dictation-token-typo" title="Sai chính tả nhỏ (gợi ý: ${escapeHtml(oTok)})">${escapeHtml(uTok)}</span> `;
      } else {
        diffHtml += `<span class="dictation-token-miss" title="Đúng ra là: ${escapeHtml(oTok)}">${escapeHtml(uTok || '___')}</span> `;
      }
    } else if (!cleanU && cleanO) {
      diffHtml += `<span class="dictation-token-miss" title="Thiếu từ: ${escapeHtml(oTok)}">[${escapeHtml(oTok)}]</span> `;
    } else if (cleanU && !cleanO) {
      diffHtml += `<span class="dictation-token-extra" title="Từ thừa">${escapeHtml(uTok)}</span> `;
    }
  }

  const totalWords = origTokens.length || 1;
  const accuracyScore = Math.min(100, Math.max(0, Math.round(((exactMatches * 1.0 + typos * 0.5) / totalWords) * 100)));
  const isPassed = accuracyScore >= dictationFloorScore;

  // Reward points
  const cfg = getDictationDifficultyConfig(currentDictationDifficulty);
  const earnedXu = isPassed ? Math.max(2, Math.round(cfg.baseXu * cfg.diffMult * (accuracyScore / 100))) : 0;
  dictationSessionPointsEarned += earnedXu;

  // UI Result Display
  const resultPanel = document.getElementById('dictation-result-panel');
  const verdictBanner = document.getElementById('dictation-verdict-banner');
  const verdictText = document.getElementById('dictation-verdict-text');
  const scoreDisplay = document.getElementById('dictation-score-display');
  const diffDisplay = document.getElementById('dictation-diff-display');
  const origTextEl = document.getElementById('dictation-original-sentence-text');
  const transEl = document.getElementById('dictation-sentence-translation');

  if (resultPanel) resultPanel.style.display = 'block';
  if (diffDisplay) diffDisplay.innerHTML = diffHtml;
  if (origTextEl) origTextEl.textContent = dictationCurrentOriginalSentence;
  if (transEl) transEl.textContent = `🇻🇳 ${dictationCurrentTranslation}`;

  if (verdictBanner && verdictText && scoreDisplay) {
    if (isPassed) {
      verdictBanner.style.background = 'rgba(16, 185, 129, 0.15)';
      verdictBanner.style.border = '1px solid #10b981';
      verdictBanner.style.color = '#34d399';
      verdictText.textContent = `🎉 Đạt chuẩn sàn ${dictationFloorScore}đ! (+${earnedXu} Xu)`;
      scoreDisplay.style.background = '#10b981';
      scoreDisplay.style.color = '#ffffff';
      scoreDisplay.textContent = `${accuracyScore} / 100đ`;
      if (typeof playVocaSfx === 'function') playVocaSfx('correct');
    } else {
      verdictBanner.style.background = 'rgba(239, 68, 68, 0.15)';
      verdictBanner.style.border = '1px solid #ef4444';
      verdictBanner.style.color = '#f87171';
      verdictText.textContent = `❌ Chưa đạt điểm sàn ${dictationFloorScore}đ (Đã thêm vào Sổ tay từ sai)`;
      scoreDisplay.style.background = '#ef4444';
      scoreDisplay.style.color = '#ffffff';
      scoreDisplay.textContent = `${accuracyScore} / 100đ`;
      if (typeof playVocaSfx === 'function') playVocaSfx('wrong');

      // Requirement 19: Mother word added to Mistake Notebook
      if (dictationCurrentWordRef) {
        if (typeof addWordToMistakeList === 'function') {
          addWordToMistakeList(dictationCurrentWordRef, 'dictation');
        }
        dictationSessionWrongWords.push(dictationCurrentWordRef);
      }
    }
  }

  // Update session score badge
  const scoreBadge = document.getElementById('dictation-score-badge');
  if (scoreBadge) scoreBadge.textContent = `Bài: +${dictationSessionPointsEarned}đ`;

  // Disable submit button & textarea
  const submitBtn = document.getElementById('btn-dictation-submit');
  if (submitBtn) submitBtn.style.display = 'none';
  if (textarea) textarea.disabled = true;

  // Next button label if last question
  const nextBtn = document.getElementById('btn-dictation-next');
  if (nextBtn) {
    if (currentDictationIndex >= dictationQuestionsList.length - 1) {
      nextBtn.innerHTML = '<span>Xem Tổng Kết</span> <span>🏆</span>';
    } else {
      nextBtn.innerHTML = '<span>Câu Tiếp Theo</span> <span>➡️</span>';
    }
  }
}
window.submitDictationEvaluation = submitDictationEvaluation;

function nextDictationQuestion() {
  if (currentDictationIndex < dictationQuestionsList.length - 1) {
    currentDictationIndex++;
    renderDictationCurrentQuestion();
  } else {
    finishDictationSession();
  }
}
window.nextDictationQuestion = nextDictationQuestion;

// =========================================================================
// 9. CELEBRATION, FIREWORKS & SESSION SETTLEMENT
// =========================================================================
function finishDictationSession() {
  dictationIsCompleted = true;
  if (dictationAutoPlayTimeout) {
    clearTimeout(dictationAutoPlayTimeout);
    dictationAutoPlayTimeout = null;
  }
  if (typeof stopAllAudio === 'function') stopAllAudio();

  const total = dictationQuestionsList.length || 1;
  const done = dictationGradedIndices.size;
  const isComp = done >= total && total > 0;

  // Settle points via balance_v2 / calculateSessionFinalPoints
  let res = { finalPts: dictationSessionPointsEarned, completionMult: 1.0, deckLengthMult: 1.0, milestoneBonus: 0, combinedMult: 1.0 };
  if (typeof calculateSessionFinalPointsV3 === 'function') {
    res = calculateSessionFinalPointsV3(dictationSessionPointsEarned, done, total, isComp);
  } else if (typeof calculateSessionFinalPoints === 'function') {
    res = calculateSessionFinalPoints(dictationSessionPointsEarned, done, total, isComp);
  }

  const finalPts = res.finalPts;
  if (finalPts > 0) {
    if (typeof setUserPoints === 'function') setUserPoints(getUserPoints() + finalPts);
    if (typeof addLedgerEntry === 'function') {
      const bonusText = res.milestoneBonus > 0 ? ` + Thưởng mốc ${done} câu (+${res.milestoneBonus} Xu)` : '';
      addLedgerEntry('STUDY_DICTATION', finalPts, `Luyện Nghe Gõ Câu (${done}/${total} câu, x${res.combinedMult}${bonusText})`);
    }
    // Record Flow 7-day activity (Requirement 20)
    if (typeof recordStudyFlowAction === 'function') {
      recordStudyFlowAction('dictation');
    }
    if (typeof saveDatabase === 'function') saveDatabase(true);
    if (typeof pushCurrentDatabaseToCloud === 'function') pushCurrentDatabaseToCloud();
  }

  // Populate Result Modal
  const totalCountEl = document.getElementById('dictation-res-total-count');
  const accuracyEl = document.getElementById('dictation-res-accuracy');
  const coinsEl = document.getElementById('dictation-res-coins');
  const mistakesCont = document.getElementById('dictation-res-mistakes-container');
  const mistakesList = document.getElementById('dictation-res-mistakes-list');

  if (totalCountEl) totalCountEl.textContent = `${done}/${total} câu`;
  if (accuracyEl) {
    const accuracyPct = Math.round((done / total) * 100);
    accuracyEl.textContent = `${accuracyPct}%`;
  }
  if (coinsEl) coinsEl.textContent = `+${finalPts} Xu`;

  if (dictationSessionWrongWords.length > 0 && mistakesCont && mistakesList) {
    mistakesCont.style.display = 'block';
    mistakesList.innerHTML = dictationSessionWrongWords.map(w => `
      <span class="badge" style="background: #ef4444; color: #fff; font-size: 11px;">${escapeHtml(w.term || '')}</span>
    `).join(' ');
  } else if (mistakesCont) {
    mistakesCont.style.display = 'none';
  }

  // Play celebration fireworks
  if (typeof playVocaSfx === 'function') playVocaSfx('fireworks', true);
  if (typeof openModal === 'function') openModal('modal-dictation-result');
}

function closeDictationResultModal() {
  // Requirement 18: Fireworks sound MUST stop immediately upon modal dismissal
  if (typeof stopVocaSfx === 'function') stopVocaSfx('fireworks');
  if (typeof stopAllAudio === 'function') stopAllAudio();
  closeModal('modal-dictation-result');

  if (dictationSetupCustomWordList || !currentDeckId) {
    showScreen('screen-decks');
    if (typeof refreshActiveScreenData === 'function') refreshActiveScreenData();
  } else {
    showScreen('screen-deck-detail');
    if (typeof refreshActiveScreenData === 'function') refreshActiveScreenData();
  }
}
window.closeDictationResultModal = closeDictationResultModal;

function exitDictationMode() {
  if (dictationAutoPlayTimeout) {
    clearTimeout(dictationAutoPlayTimeout);
    dictationAutoPlayTimeout = null;
  }
  if (typeof stopVocaSfx === 'function') stopVocaSfx('fireworks');
  if (typeof stopAllAudio === 'function') stopAllAudio();

  if (dictationSetupCustomWordList || !currentDeckId) {
    showScreen('screen-decks');
    if (typeof refreshActiveScreenData === 'function') refreshActiveScreenData();
  } else {
    showScreen('screen-deck-detail');
    if (typeof refreshActiveScreenData === 'function') refreshActiveScreenData();
  }
}
window.exitDictationMode = exitDictationMode;
