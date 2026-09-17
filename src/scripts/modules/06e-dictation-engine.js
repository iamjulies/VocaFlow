// =========================================================================
// VOCAFLOW 06E-DICTATION-ENGINE.JS (v0.10.10-23 Build 324 - SENTENCE DICTATION VIP β)
// Full Sentence Dictation Engine with Natural Speech, Speed Slider, AI Scoring & Sequence Alignment
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
let dictationDiffMult = 1.2;
let dictationCurrentOriginalSentence = '';
let dictationCurrentTranslation = '';
let dictationCurrentWordRef = null;
let dictationCurrentTargetWords = [];
let dictationHintsRevealed = 0;
let dictationSessionPointsEarned = 0;
let dictationSessionWrongWords = [];
let dictationGradedIndices = new Set();
let dictationAutoPlayTimeout = null;
let dictationStartTime = 0;
let dictationIsCompleted = false;

// =========================================================================
// 1. DIFFICULTY CONFIGURATION (v0.10.10-22 - Issue 1)
// =========================================================================
function getDictationDifficultyConfig(diff) {
  if (diff === 'expert') {
    return {
      floorScore: 90,
      diffMult: 3.6,
      maxListens: 2,
      minWords: 20,
      maxWords: 30,
      targetWordCount: 3,
      showTargetWords: 0,
      baseXu: 36,
      label: '🔥 Siêu Khó'
    };
  }
  if (diff === 'hard') {
    return {
      floorScore: 90,
      diffMult: 2.4,
      maxListens: 3,
      minWords: 12,
      maxWords: 20,
      targetWordCount: 3,
      showTargetWords: 2,
      baseXu: 24,
      label: '🔴 Khó'
    };
  }
  if (diff === 'medium') {
    return {
      floorScore: 80,
      diffMult: 1.8,
      maxListens: 4,
      minWords: 10,
      maxWords: 15,
      targetWordCount: 2,
      showTargetWords: 1,
      baseXu: 18,
      label: '🟡 Trung Bình'
    };
  }
  return {
    floorScore: 70,
    diffMult: 1.2,
    maxListens: 5,
    minWords: 5,
    maxWords: 10,
    targetWordCount: 1,
    showTargetWords: 1,
    baseXu: 12,
    label: '🟢 Dễ'
  };
}

// =========================================================================
// 2. SETUP MODAL HANDLERS & VIP CHECK
// =========================================================================
function openDictationSetupModal(useSelection = false, customWordList = null) {
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
// 3. SENTENCE DICTATION REPOSITORY & BUILDER (Issue 1 & 3)
// =========================================================================
function generateSentenceForWord(mainWord, difficulty, poolWords = []) {
  const term = (mainWord.term || '').trim();
  const pos = (mainWord.partOfSpeech || 'noun').toLowerCase();
  const defVi = mainWord.definitionVi || mainWord.definition || '';

  // Collect potential secondary target words from pool
  const otherWords = (poolWords || []).filter(w => w.id !== mainWord.id && w.term && w.term !== term);
  const w2 = otherWords.length > 0 ? otherWords[0] : null;
  const term2 = w2 ? (w2.term || '').trim() : '';
  const defVi2 = w2 ? (w2.definitionVi || w2.definition || '') : '';
  const w3 = otherWords.length > 1 ? otherWords[1] : null;
  const term3 = w3 ? (w3.term || '').trim() : '';

  const cfg = getDictationDifficultyConfig(difficulty);
  let targetWordsArr = [{ term, pos, defVi }];

  // 1. Check if existing example fits nicely
  if (mainWord.exampleSentence || mainWord.example) {
    const rawEx = (mainWord.exampleSentence || mainWord.example).trim().replace(/^["']|["']$/g, '');
    const wordCount = rawEx.split(/\s+/).length;
    if (wordCount >= (cfg.minWords - 2) && wordCount <= (cfg.maxWords + 4) && rawEx.toLowerCase().includes(term.toLowerCase())) {
      const trans = mainWord.exampleTranslationVi || (defVi ? `Câu ví dụ rèn luyện từ "${term}": ${defVi}` : `Câu ví dụ thực tế chứa từ "${term}".`);
      return {
        sentenceText: rawEx,
        sentenceTranslationVi: trans,
        targetWords: targetWordsArr
      };
    }
  }

  // 2. High Quality Curated Templates with Genuine Contextual Vietnamese Translations
  if (difficulty === 'easy') {
    const templates = [
      { en: `She wants to learn this ${term} today.`, vi: `Cô ấy muốn học ${defVi ? defVi.toLowerCase() : term} này trong ngày hôm nay.` },
      { en: `We need a clear ${term} for our project.`, vi: `Chúng tôi cần một ${defVi ? defVi.toLowerCase() : term} rõ ràng cho dự án.` },
      { en: `He explained the new ${term} very well.`, vi: `Anh ấy đã giải thích ${defVi ? defVi.toLowerCase() : term} mới rất cặn kẽ.` },
      { en: `The teacher praised their ${term} in class.`, vi: `Giáo viên đã khen ngợi ${defVi ? defVi.toLowerCase() : term} của họ trong lớp.` },
      { en: `Good teamwork makes every ${term} much easier.`, vi: `Làm việc nhóm tốt giúp cho mọi ${defVi ? defVi.toLowerCase() : term} trở nên dễ dàng hơn nhiều.` },
      { en: `They discovered an interesting ${term} in the book.`, vi: `Họ đã phát hiện ra một ${defVi ? defVi.toLowerCase() : term} thú vị trong cuốn sách.` },
      { en: `Our main goal is to understand this ${term}.`, vi: `Mục tiêu chính của chúng tôi là thấu hiểu ${defVi ? defVi.toLowerCase() : term} này.` }
    ];
    const picked = templates[Math.floor(Math.random() * templates.length)];
    return { sentenceText: picked.en, sentenceTranslationVi: picked.vi, targetWords: targetWordsArr };
  }

  if (difficulty === 'medium') {
    if (term2 && cfg.targetWordCount >= 2) {
      targetWordsArr.push({ term: term2, pos: w2.partOfSpeech || 'noun', defVi: defVi2 });
      const doubleTemplates = [
        { en: `Recent scientific studies show that combining ${term} with ${term2} delivers substantial educational benefits.`, vi: `Các nghiên cứu khoa học gần đây chỉ ra rằng việc kết hợp ${term} cùng ${term2} mang lại nhiều lợi ích giáo dục to lớn.` },
        { en: `Our team decided to adopt a new ${term} and ${term2} to improve operational productivity.`, vi: `Đội ngũ của chúng tôi quyết định áp dụng ${term} và ${term2} mới nhằm nâng cao năng suất vận hành.` }
      ];
      const picked = doubleTemplates[Math.floor(Math.random() * doubleTemplates.length)];
      return { sentenceText: picked.en, sentenceTranslationVi: picked.vi, targetWords: targetWordsArr };
    }
    const singleTemplates = [
      { en: `Students who understand the concept of ${term} usually perform much better in their exams.`, vi: `Những học sinh hiểu rõ khái niệm về ${defVi ? defVi.toLowerCase() : term} thường làm bài thi tốt hơn nhiều.` },
      { en: `Our team decided to adopt a new ${term} in order to improve overall workplace productivity.`, vi: `Đội ngũ của chúng tôi quyết định áp dụng ${defVi ? defVi.toLowerCase() : term} mới nhằm nâng cao năng suất làm việc chung.` },
      { en: `Environmental scientists are actively studying the direct impact of this ${term} on local wildlife habitats.`, vi: `Các nhà khoa học môi trường đang tích cực nghiên cứu tác động trực tiếp của ${defVi ? defVi.toLowerCase() : term} này lên môi trường sống hoang dã.` },
      { en: `Technological innovations have introduced a revolutionary ${term} into the modern digital education sector.`, vi: `Các đổi mới công nghệ đã đưa một ${defVi ? defVi.toLowerCase() : term} mang tính cách mạng vào lĩnh vực giáo dục số hiện đại.` }
    ];
    const picked = singleTemplates[Math.floor(Math.random() * singleTemplates.length)];
    return { sentenceText: picked.en, sentenceTranslationVi: picked.vi, targetWords: targetWordsArr };
  }

  if (difficulty === 'hard') {
    if (term2 && cfg.targetWordCount >= 2) targetWordsArr.push({ term: term2, pos: w2.partOfSpeech || 'noun', defVi: defVi2 });
    if (term3 && cfg.targetWordCount >= 3) targetWordsArr.push({ term: term3, pos: w3.partOfSpeech || 'noun', defVi: w3.definitionVi || '' });

    const hardTemplates = [
      { en: `Although many experts debated the exact definition of ${term}, everyone agreed that its practical application is essential for organizational success.`, vi: `Mặc dù nhiều chuyên gia tranh luận về định nghĩa chính xác của ${defVi ? defVi.toLowerCase() : term}, mọi người đều đồng ý rằng ứng dụng thực tiễn của nó là thiết yếu cho sự thành công của tổ chức.` },
      { en: `The government has recently implemented comprehensive regulations regarding ${term} to safeguard public health and ensure environmental sustainability across the country.`, vi: `Chính phủ gần đây đã ban hành các quy định toàn diện liên quan đến ${defVi ? defVi.toLowerCase() : term} nhằm bảo vệ sức khỏe cộng đồng và bảo đảm tính bền vững môi trường trên cả nước.` },
      { en: `Through extensive interdisciplinary research, scholars demonstrated how this fundamental ${term} influences international economic stability and fosters long-term global cooperation.`, vi: `Thông qua nghiên cứu liên ngành sâu rộng, các học giả đã chứng minh cách thức ${defVi ? defVi.toLowerCase() : term} căn bản này tác động đến sự ổn định kinh tế quốc tế và thúc đẩy hợp tác toàn cầu lâu dài.` }
    ];
    const picked = hardTemplates[Math.floor(Math.random() * hardTemplates.length)];
    return { sentenceText: picked.en, sentenceTranslationVi: picked.vi, targetWords: targetWordsArr };
  }

  // Expert / Master (20-30 words, 1-3 target words, hidden)
  if (term2 && cfg.targetWordCount >= 2) targetWordsArr.push({ term: term2, pos: w2.partOfSpeech || 'noun', defVi: defVi2 });
  if (term3 && cfg.targetWordCount >= 3) targetWordsArr.push({ term: term3, pos: w3.partOfSpeech || 'noun', defVi: w3.definitionVi || '' });

  const expertTemplates = [
    { en: `Notwithstanding the persistent socioeconomic challenges encountered throughout the historical transition, the strategic implementation of ${term} enabled the institution to achieve unprecedented academic breakthroughs and international recognition.`, vi: `Bất chấp những thách thức kinh tế xã hội dai dẳng gặp phải trong suốt quá trình chuyển dịch lịch sử, việc triển khai chiến lược ${defVi ? defVi.toLowerCase() : term} đã giúp viện nghiên cứu đạt được những đột phá học thuật chưa từng có và sự công nhận quốc tế.` },
    { en: `Recent empirical investigations conducted across various developing metropolitan regions have confirmed that integrating ${term} with sustainable infrastructure significantly reduces long-term operational expenditures while accelerating community development.`, vi: `Các cuộc điều tra thực nghiệm gần đây được tiến hành trên khắp các vùng đô thị đang phát triển đã xác nhận rằng việc tích hợp ${defVi ? defVi.toLowerCase() : term} với cơ sở hạ tầng bền vững giúp giảm đáng kể chi phí vận hành dài hạn trong khi đẩy nhanh sự phát triển cộng đồng.` },
    { en: `By rigorously synthesizing theoretical methodologies with contemporary practical frameworks, researchers established that mastering ${term} provides professionals with a distinct competitive advantage in rapidly evolving international markets.`, vi: `Bằng cách tổng hợp chặt chẽ các phương pháp lý thuyết với các khuôn khổ thực tiễn đương đại, các nhà nghiên cứu đã xác lập rằng việc làm chủ ${defVi ? defVi.toLowerCase() : term} mang lại cho các chuyên gia lợi thế cạnh tranh rõ rệt trong các thị trường quốc tế đang chuyển dịch nhanh chóng.` }
  ];
  const picked = expertTemplates[Math.floor(Math.random() * expertTemplates.length)];
  return { sentenceText: picked.en, sentenceTranslationVi: picked.vi, targetWords: targetWordsArr };
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
  } else if (fromSelection && typeof selectedWordIds !== 'undefined' && selectedWordIds && selectedWordIds.size > 0) {
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

  if (dictationSetupQuestionCount === '5') workingList = workingList.slice(0, 5);
  else if (dictationSetupQuestionCount === '10') workingList = workingList.slice(0, 10);
  else if (dictationSetupQuestionCount === 'custom' && dictationSetupCustomCountValue) {
    workingList = workingList.slice(0, dictationSetupCustomCountValue);
  }

  dictationQuestionsList = workingList.map((w, idx) => {
    const generated = generateSentenceForWord(w, currentDictationDifficulty, workingList);
    return {
      index: idx,
      wordRef: w,
      wordTerm: w.term || '',
      wordPos: w.partOfSpeech || 'noun',
      sentenceText: generated.sentenceText,
      sentenceTranslationVi: generated.sentenceTranslationVi,
      targetWords: generated.targetWords || [{ term: w.term, pos: w.partOfSpeech || 'noun' }]
    };
  });

  currentDictationIndex = 0;
  dictationSessionPointsEarned = 0;
  dictationSessionWrongWords = [];
  dictationGradedIndices.clear();
  dictationStartTime = Date.now();
  dictationIsCompleted = false;

  const cfg = getDictationDifficultyConfig(currentDictationDifficulty);
  dictationFloorScore = cfg.floorScore;
  dictationMaxListens = cfg.maxListens;
  dictationDiffMult = cfg.diffMult;

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
// 5. RENDER CURRENT QUESTION & STATE LIFECYCLE (Issue 1 & 4)
// =========================================================================
function resetDictationQuestionState() {
  const resultPanel = document.getElementById('dictation-result-panel');
  const aiLoading = document.getElementById('dictation-ai-loading');
  const aiFeedbackBox = document.getElementById('dictation-ai-feedback-box');
  const diffDisplay = document.getElementById('dictation-diff-display');
  const hintBox = document.getElementById('dictation-hint-box');
  const textarea = document.getElementById('dictation-input-text');
  const submitBtn = document.getElementById('btn-dictation-submit');
  const waveBox = document.getElementById('dictation-wave-box');

  if (resultPanel) resultPanel.style.display = 'none';
  if (aiLoading) aiLoading.style.display = 'none';
  if (aiFeedbackBox) {
    aiFeedbackBox.style.display = 'none';
    const cards = document.getElementById('dictation-ai-feedback-cards');
    if (cards) cards.innerHTML = '';
  }
  if (diffDisplay) diffDisplay.innerHTML = '';
  if (hintBox) hintBox.style.display = 'none';
  if (waveBox) waveBox.style.display = 'none';

  if (textarea) {
    textarea.value = '';
    textarea.disabled = false;
    updateDictationCharCounter();
  }
  if (submitBtn) {
    submitBtn.style.display = 'inline-flex';
    submitBtn.disabled = false;
  }

  const curScreen = document.getElementById('screen-dictation');
  if (curScreen) {
    curScreen.scrollTop = 0;
  }
}

function renderDictationCurrentQuestion() {
  if (!dictationQuestionsList || dictationQuestionsList.length === 0) return;
  const q = dictationQuestionsList[currentDictationIndex];
  if (!q) return;

  if (dictationAutoPlayTimeout) {
    clearTimeout(dictationAutoPlayTimeout);
    dictationAutoPlayTimeout = null;
  }
  if (typeof stopAllAudio === 'function') stopAllAudio();

  resetDictationQuestionState();

  dictationCurrentOriginalSentence = q.sentenceText;
  dictationCurrentTranslation = q.sentenceTranslationVi;
  dictationCurrentWordRef = q.wordRef;
  dictationCurrentTargetWords = q.targetWords || [{ term: q.wordTerm, pos: q.wordPos }];
  dictationListensLeft = dictationMaxListens;
  dictationHintsRevealed = 0;

  // Counter
  const counterEl = document.getElementById('dictation-counter');
  if (counterEl) counterEl.textContent = `Câu ${currentDictationIndex + 1} / ${dictationQuestionsList.length}`;

  // Target Words Display by Difficulty (Issue 1)
  const cfg = getDictationDifficultyConfig(currentDictationDifficulty);
  const targetWordsContainer = document.getElementById('dictation-target-words-container');
  if (targetWordsContainer) {
    if (cfg.showTargetWords === 0) {
      targetWordsContainer.innerHTML = `
        <span class="badge" style="background: rgba(236, 72, 153, 0.15); color: #f472b6; border: 1px solid rgba(236, 72, 153, 0.35); font-size: 11.5px; font-weight: 700; padding: 4px 10px;">
          🙈 Đã ẩn từ trọng tâm • Thử thách 100% thính giác
        </span>
      `;
    } else {
      const visibleTargets = dictationCurrentTargetWords.slice(0, cfg.showTargetWords);
      const chipsHtml = visibleTargets.map(tw => `
        <span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.35); font-size: 11.5px; font-weight: 700; padding: 3px 8px;">
          🎯 ${escapeHtml(tw.term)} <small style="opacity: 0.8; font-size: 9.5px; margin-left: 2px;">(${escapeHtml(tw.pos)})</small>
        </span>
      `).join(' ');

      targetWordsContainer.innerHTML = `
        <span style="font-size: 12px; font-weight: 700; color: var(--text-muted);">Từ vựng trọng tâm:</span>
        <div style="display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap;">${chipsHtml}</div>
      `;
    }
  }

  updateDictationListenQuotaUI();
  updateDictationWalletBadges();

  const textarea = document.getElementById('dictation-input-text');
  if (textarea) {
    textarea.focus();
  }

  // 250ms Silent Audio Buffer Delay
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

  const wordsCount = dictationCurrentOriginalSentence.split(/\s+/).length;
  const durationMs = Math.max(1500, (wordsCount * 450) / dictationAudioRate);
  setTimeout(() => {
    if (waveBox) waveBox.style.display = 'none';
  }, durationMs);
}
window.playDictationAudio = playDictationAudio;

// =========================================================================
// 7. VOCAHINT MULTI-STAGE & VOCASKIP INTEGRATION (Issue 3)
// =========================================================================
function useDictationHint() {
  const currentHints = typeof getUserHints === 'function' ? getUserHints() : 0;
  if (currentHints <= 0) {
    if (typeof showToast === 'function') showToast('⚠️ Bạn đã hết VocaHint! Hãy ghé Cửa Hàng để nạp thêm nhé.');
    if (typeof openShopModal === 'function') openShopModal();
    return;
  }

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
    
    // Multi-tier smart hint
    if (dictationHintsRevealed === 1) {
      hintContent.innerHTML = `
        <div style="color: var(--text); font-size: 13px; line-height: 1.5;">
          🇻🇳 <strong>Dịch nghĩa câu:</strong> "${escapeHtml(dictationCurrentTranslation)}"
        </div>
      `;
    } else if (dictationHintsRevealed === 2) {
      const targetTermsStr = (dictationCurrentTargetWords || []).map(tw => `<code>${escapeHtml(tw.term)}</code> (${escapeHtml(tw.pos)})`).join(', ');
      hintContent.innerHTML = `
        <div style="color: var(--text); font-size: 13px; line-height: 1.5; margin-bottom: 6px;">
          🇻🇳 <strong>Dịch nghĩa câu:</strong> "${escapeHtml(dictationCurrentTranslation)}"
        </div>
        <div style="color: #38bdf8; font-size: 12.5px; line-height: 1.5;">
          🎯 <strong>Từ khóa trọng tâm trong câu:</strong> ${targetTermsStr || 'Đang xác định'}
        </div>
      `;
    } else {
      // 3rd Hint: Masked letter frame (e.g. "T___ M___ L___ is w_____ c__________ as an i_______ m__________.")
      const wordsArr = dictationCurrentOriginalSentence.split(/\s+/);
      const maskedWords = wordsArr.map(w => {
        const clean = w.replace(/^[^\w]+|[^\w]+$/g, '');
        if (clean.length <= 2) return w;
        const first = clean[0];
        const dashes = '_'.repeat(Math.min(clean.length - 1, 4));
        return w.replace(clean, first + dashes);
      }).join(' ');

      hintContent.innerHTML = `
        <div style="color: var(--text); font-size: 13px; line-height: 1.5; margin-bottom: 6px;">
          🇻🇳 <strong>Dịch nghĩa câu:</strong> "${escapeHtml(dictationCurrentTranslation)}"
        </div>
        <div style="color: #fbbf24; font-size: 12.5px; line-height: 1.6; font-family: monospace; background: rgba(0,0,0,0.2); padding: 6px 10px; border-radius: 6px;">
          🔤 <strong>Khung câu gợi ý:</strong> ${escapeHtml(maskedWords)}
        </div>
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
// 8. DUAL EVALUATION ENGINE: AI GEMINI + NEEDLEMAN-WUNSCH SEQUENCE ALIGNMENT (Issue 2)
// =========================================================================

function normalizeTokenForDiff(t) {
  return (t || '').toLowerCase().replace(/^[^\w]+|[^\w]+$/g, '');
}

function computeLevenshteinDistance(s1, s2) {
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

// Needleman-Wunsch Global Sequence Alignment Algorithm for Tokens
function alignSentenceTokens(origTokens, userTokens) {
  const m = origTokens.length;
  const n = userTokens.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  const MATCH_SCORE = 2;
  const TYPO_SCORE = 1;
  const MISMATCH_SCORE = -1;
  const GAP_SCORE = -1;

  for (let i = 0; i <= m; i++) dp[i][0] = i * GAP_SCORE;
  for (let j = 0; j <= n; j++) dp[0][j] = j * GAP_SCORE;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cleanO = normalizeTokenForDiff(origTokens[i - 1]);
      const cleanU = normalizeTokenForDiff(userTokens[j - 1]);

      let pairScore = MISMATCH_SCORE;
      if (cleanO === cleanU) {
        pairScore = MATCH_SCORE;
      } else if (cleanO && cleanU) {
        const dist = computeLevenshteinDistance(cleanO, cleanU);
        if (dist <= 2 && cleanO.length >= 4 && cleanU.length >= 3) {
          const isAntonymMismatch = (cleanO === 'immortal' && cleanU === 'mortal') ||
                                    (cleanO === 'mortal' && cleanU === 'immortal') ||
                                    (cleanO === 'patient' && cleanU === 'impatient');
          if (!isAntonymMismatch) {
            pairScore = TYPO_SCORE;
          }
        }
      }

      dp[i][j] = Math.max(
        dp[i - 1][j - 1] + pairScore,
        dp[i - 1][j] + GAP_SCORE,
        dp[i][j - 1] + GAP_SCORE
      );
    }
  }

  // Traceback
  const alignments = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const cleanO = normalizeTokenForDiff(origTokens[i - 1]);
      const cleanU = normalizeTokenForDiff(userTokens[j - 1]);
      let pairScore = MISMATCH_SCORE;
      let status = 'wrong';

      if (cleanO === cleanU) {
        pairScore = MATCH_SCORE;
        status = 'exact';
      } else if (cleanO && cleanU) {
        const dist = computeLevenshteinDistance(cleanO, cleanU);
        const isAntonymMismatch = (cleanO === 'immortal' && cleanU === 'mortal') ||
                                  (cleanO === 'mortal' && cleanU === 'immortal');
        if (dist <= 2 && cleanO.length >= 4 && cleanU.length >= 3 && !isAntonymMismatch) {
          pairScore = TYPO_SCORE;
          status = 'typo';
        }
      }

      if (dp[i][j] === dp[i - 1][j - 1] + pairScore) {
        alignments.unshift({
          origToken: origTokens[i - 1],
          userToken: userTokens[j - 1],
          status: status
        });
        i--; j--;
        continue;
      }
    }

    if (i > 0 && dp[i][j] === dp[i - 1][j] + GAP_SCORE) {
      alignments.unshift({
        origToken: origTokens[i - 1],
        userToken: '',
        status: 'missing'
      });
      i--;
    } else {
      alignments.unshift({
        origToken: '',
        userToken: userTokens[j - 1],
        status: 'extra'
      });
      j--;
    }
  }

  return alignments;
}

// Fallback sequence evaluation
function evaluateDictationWithSequenceAlignment(userText, origText, floorScore, diffMult, baseXu) {
  const origTokens = origText.split(/\s+/).filter(t => t.length > 0);
  const userTokens = userText.split(/\s+/).filter(t => t.length > 0);

  const aligned = alignSentenceTokens(origTokens, userTokens);

  let exactMatches = 0;
  let typos = 0;
  let wrongs = 0;
  let missing = 0;
  let extra = 0;

  aligned.forEach(item => {
    if (item.status === 'exact') exactMatches++;
    else if (item.status === 'typo') typos++;
    else if (item.status === 'wrong') wrongs++;
    else if (item.status === 'missing') missing++;
    else if (item.status === 'extra') extra++;
  });

  const totalWords = origTokens.length || 1;
  const rawRatio = (exactMatches * 1.0 + typos * 0.5) / totalWords;
  const extraPenalty = Math.min(20, extra * 4);
  const accuracyScore = Math.max(0, Math.min(100, Math.round(rawRatio * 100) - extraPenalty));
  const isPassed = accuracyScore >= floorScore;

  const earnedXu = isPassed ? Math.max(2, Math.round(baseXu * diffMult * (accuracyScore / 100))) : 0;

  let phoneticFeedback = '';
  if (exactMatches === totalWords && extra === 0) {
    phoneticFeedback = '🌟 Tuyệt vời! Bạn đã bắt âm chuẩn xác 100% tất cả các từ trong câu.';
  } else if (wrongs > 0 || typos > 0) {
    const wrongExamples = aligned.filter(a => a.status === 'wrong' || a.status === 'typo').slice(0, 3).map(a => `"${a.userToken}" → "${a.origToken}"`).join(', ');
    phoneticFeedback = `👂 Chú ý các từ phát âm dễ nhầm lẫn hoặc lỗi chính tả: ${wrongExamples}. Hãy lắng nghe kỹ âm đuôi và nguyên âm khi nghe câu mẫu.`;
  } else if (missing > 0) {
    phoneticFeedback = `👂 Bạn đã bỏ sót ${missing} từ trong câu. Hãy nghe chậm lại ở tốc độ 0.75x để bắt trọn từng từ nối.`;
  } else {
    phoneticFeedback = '👂 Khả năng nghe tổng thể rất tốt, chú ý kiểm tra lại các từ thừa khi nghe câu dài.';
  }

  let grammarFeedback = '';
  if (isPassed) {
    grammarFeedback = '✍️ Cấu trúc câu và từ loại được tái hiện chính xác, mạch lạc chuẩn văn phạm tiếng Anh.';
  } else {
    grammarFeedback = `✍️ Cần củng cố thêm ngữ pháp để đối chiếu chính xác các mạo từ (a/an/the) và liên từ nối giữa các vế câu.`;
  }

  let adviceFeedback = isPassed
    ? '💡 Tiếp tục duy trì phong độ và thử thách bản thân ở các cấp độ khó hơn!'
    : '💡 Mẹo: Hãy tận dụng các nút điều tốc (0.75x) và nghe lại câu chuẩn xác để ghi nhớ phản xạ.';

  return {
    score: accuracyScore,
    isPassed: isPassed,
    earnedXu: earnedXu,
    alignments: aligned,
    phoneticFeedbackVi: phoneticFeedback,
    grammarFeedbackVi: grammarFeedback,
    adviceFeedbackVi: adviceFeedback
  };
}

// AI-Powered Gemini Evaluation
async function evaluateDictationWithGemini(userText, origText, targetWords, difficulty, floorScore) {
  const prompt = `You are an elite English Listening Comprehension & Phonetics Examiner.
Evaluate the student's typed transcription against the original audio sentence for listening accuracy.

[ORIGINAL SENTENCE]: "${origText}"
[STUDENT TRANSCRIPTION]: "${userText}"
[DIFFICULTY]: ${difficulty.toUpperCase()}
[FLOOR PASSING SCORE]: ${floorScore}
[TARGET WORDS]: ${targetWords.map(t => t.term).join(', ')}

[EVALUATION RULES]
1. Fair & Intelligent Scoring (0 to 100):
   - Exact sentence match = 100.
   - Minor typos (1-2 letters typo in long word, like 'definiton' vs 'definition') = slight deduction (-3 to -5).
   - Significant mishearing of words (e.g. heard "a mortal" instead of "an immortal", or "fame" instead of "trade", or missing articles) = fair deduction (-10 to -20 per semantic error).
   - Extra inserted words or omitted words = proportional deduction.
2. Token-by-token alignment:
   Align user words against original words without index shifting errors.
   Statuses: "exact", "typo", "wrong", "missing", "extra".
3. Deep Vietnamese Diagnostic Feedback:
   - "phoneticFeedbackVi": Point out specific misheard phonetic patterns, connected speech (linking sounds, flap t, elision), or homophones.
   - "grammarFeedbackVi": Comment on structural clarity, articles (a/an/the), prepositions, or word forms.
   - "adviceFeedbackVi": Concise practical listening tip for next attempts.

Return strictly JSON matching this schema:
{
  "score": 85,
  "isPassed": true,
  "alignments": [
    { "userToken": "the", "origToken": "The", "status": "exact" }
  ],
  "phoneticFeedbackVi": "Phân tích cụ thể các từ nghe nhầm...",
  "grammarFeedbackVi": "Nhận xét ngữ pháp...",
  "adviceFeedbackVi": "Lời khuyên luyện nghe..."
}`;

  try {
    const keys = typeof getStoredApiKeys === 'function' ? getStoredApiKeys() : [];
    const modelsToTry = (typeof getGeminiModelsForTier === 'function')
      ? getGeminiModelsForTier('fast')
      : ['gemini-2.5-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.7-flash'];

    for (const k of keys) {
      for (const m of modelsToTry) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k.trim()}`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 7500);

          const res = await fetch(url, {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,
                maxOutputTokens: 1024
              }
            })
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const resJson = await res.json();
            const rawText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
              const cleanJson = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
              const parsed = JSON.parse(cleanJson);
              if (parsed && typeof parsed.score === 'number' && parsed.alignments) {
                return parsed;
              }
            }
          }
        } catch (e) {
          console.warn(`Gemini Dictation evaluation with model ${m} failed:`, e);
        }
      }
    }
  } catch (err) {
    console.error('Gemini Dictation outer error:', err);
  }
  return null;
}

// Master Submission & Evaluation Handler
async function submitDictationEvaluation() {
  const textarea = document.getElementById('dictation-input-text');
  const userText = textarea ? textarea.value.trim() : '';
  if (!userText) {
    if (typeof showToast === 'function') showToast('⚠️ Vui lòng nhập nội dung câu trước khi nộp bài chấm điểm!');
    return;
  }

  if (dictationGradedIndices.has(currentDictationIndex)) return;
  dictationGradedIndices.add(currentDictationIndex);

  // Show AI Loading State
  const submitBtn = document.getElementById('btn-dictation-submit');
  if (submitBtn) {
    submitBtn.style.display = 'none';
    submitBtn.disabled = true;
  }
  if (textarea) textarea.disabled = true;

  const aiLoading = document.getElementById('dictation-ai-loading');
  if (aiLoading) aiLoading.style.display = 'block';

  const cfg = getDictationDifficultyConfig(currentDictationDifficulty);

  let evalResult = null;
  try {
    evalResult = await evaluateDictationWithGemini(
      userText,
      dictationCurrentOriginalSentence,
      dictationCurrentTargetWords,
      currentDictationDifficulty,
      dictationFloorScore
    );
  } catch (e) {
    evalResult = null;
  }

  if (!evalResult) {
    evalResult = evaluateDictationWithSequenceAlignment(
      userText,
      dictationCurrentOriginalSentence,
      dictationFloorScore,
      cfg.diffMult,
      cfg.baseXu
    );
  } else {
    const score = Math.max(0, Math.min(100, Math.round(evalResult.score)));
    evalResult.score = score;
    evalResult.isPassed = (score >= dictationFloorScore);
    evalResult.earnedXu = evalResult.isPassed ? Math.max(2, Math.round(cfg.baseXu * cfg.diffMult * (score / 100))) : 0;
  }

  if (aiLoading) aiLoading.style.display = 'none';

  let diffHtml = '';
  if (evalResult.alignments && Array.isArray(evalResult.alignments)) {
    evalResult.alignments.forEach(item => {
      const uTok = item.userToken || '';
      const oTok = item.origToken || '';
      const status = item.status || 'exact';

      if (status === 'exact') {
        diffHtml += `<span class="dictation-token-exact" title="Chính xác">${escapeHtml(uTok || oTok)}</span> `;
      } else if (status === 'typo') {
        diffHtml += `<span class="dictation-token-typo" title="Gõ nhầm nhẹ (Đúng ra là: ${escapeHtml(oTok)})">${escapeHtml(uTok)}</span> `;
      } else if (status === 'wrong') {
        diffHtml += `<span class="dictation-token-wrong" title="Sai từ: ${escapeHtml(uTok)} (Mẫu chuẩn: ${escapeHtml(oTok)})">${escapeHtml(uTok)} → <small style="color:#38bdf8;">${escapeHtml(oTok)}</small></span> `;
      } else if (status === 'missing') {
        diffHtml += `<span class="dictation-token-miss" title="Bỏ sót từ">[${escapeHtml(oTok)}]</span> `;
      } else if (status === 'extra') {
        diffHtml += `<span class="dictation-token-extra" title="Từ thừa">[+${escapeHtml(uTok)}]</span> `;
      }
    });
  }

  const accuracyScore = evalResult.score;
  const isPassed = evalResult.isPassed;
  const earnedXu = evalResult.earnedXu;

  dictationSessionPointsEarned += earnedXu;

  const resultPanel = document.getElementById('dictation-result-panel');
  const verdictBanner = document.getElementById('dictation-verdict-banner');
  const verdictText = document.getElementById('dictation-verdict-text');
  const scoreDisplay = document.getElementById('dictation-score-display');
  const diffDisplay = document.getElementById('dictation-diff-display');
  const origTextEl = document.getElementById('dictation-original-sentence-text');
  const transEl = document.getElementById('dictation-sentence-translation');
  const aiFeedbackBox = document.getElementById('dictation-ai-feedback-box');
  const aiFeedbackCards = document.getElementById('dictation-ai-feedback-cards');

  if (resultPanel) resultPanel.style.display = 'block';
  if (diffDisplay) diffDisplay.innerHTML = diffHtml || escapeHtml(userText);
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

      if (dictationCurrentWordRef) {
        if (typeof addWordToMistakeList === 'function') {
          addWordToMistakeList(dictationCurrentWordRef, 'dictation');
        }
        dictationSessionWrongWords.push(dictationCurrentWordRef);
      }
    }
  }

  if (aiFeedbackBox && aiFeedbackCards) {
    aiFeedbackBox.style.display = 'block';
    const phonText = evalResult.phoneticFeedbackVi || evalResult.phoneticFeedback || 'Khả năng bắt âm tốt.';
    const gramText = evalResult.grammarFeedbackVi || evalResult.grammarFeedback || 'Cấu trúc câu hợp lệ.';
    const advText = evalResult.adviceFeedbackVi || evalResult.adviceFeedback || 'Tiếp tục rèn luyện phản xạ nghe thường xuyên.';

    aiFeedbackCards.innerHTML = `
      <div class="dictation-feedback-card dictation-card-phonetics">
        <div class="dictation-card-title">
          <span>👂</span> <span>Phân Tích Bắt Âm & Nghe Nhầm</span>
        </div>
        <div class="dictation-card-body">${escapeHtml(phonText)}</div>
      </div>
      <div class="dictation-feedback-card dictation-card-grammar">
        <div class="dictation-card-title">
          <span>✍️</span> <span>Ngữ Pháp & Cấu Trúc Câu</span>
        </div>
        <div class="dictation-card-body">${escapeHtml(gramText)}</div>
      </div>
      <div class="dictation-feedback-card dictation-card-advice">
        <div class="dictation-card-title">
          <span>💡</span> <span>Mẹo Thính Giác & Lời Khuyên</span>
        </div>
        <div class="dictation-card-body">${escapeHtml(advText)}</div>
      </div>
    `;
  }

  const scoreBadge = document.getElementById('dictation-score-badge');
  if (scoreBadge) scoreBadge.textContent = `Bài: +${dictationSessionPointsEarned}đ`;

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
    if (typeof recordStudyFlowAction === 'function') {
      recordStudyFlowAction('dictation');
    }
    if (typeof saveDatabase === 'function') saveDatabase(true);
    if (typeof pushCurrentDatabaseToCloud === 'function') pushCurrentDatabaseToCloud();
  }

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

  if (typeof playVocaSfx === 'function') playVocaSfx('fireworks', true);
  if (typeof openModal === 'function') openModal('modal-dictation-result');
}

function closeDictationResultModal() {
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
  const total = dictationQuestionsList.length || 1;
  const done = dictationQuestionsList.filter(q => dictationGradedIndices.has(q.index)).length;

  if (!dictationIsCompleted && (done > 0 || dictationSessionPointsEarned !== 0 || currentDictationIndex > 0)) {
    if (typeof promptStudyEarlyExit === 'function') {
      promptStudyEarlyExit({
        mode: 'dictation',
        done,
        total,
        basePoints: dictationSessionPointsEarned,
        onConfirmExit: () => doExecuteExitDictation(done, total)
      });
      return;
    }
  }
  doExecuteExitDictation(done, total);
}

function doExecuteExitDictation(done, total) {
  if (dictationAutoPlayTimeout) {
    clearTimeout(dictationAutoPlayTimeout);
    dictationAutoPlayTimeout = null;
  }
  if (typeof stopVocaSfx === 'function') stopVocaSfx('fireworks');
  if (typeof stopAllAudio === 'function') stopAllAudio();
  if (typeof closeModal === 'function') closeModal('modal-dictation-result');

  // Early exit points settlement via Balance v3 (Extended Lab β)
  if (!dictationIsCompleted && dictationSessionPointsEarned !== 0) {
    const isComp = done >= total && total > 0;
    const res = (typeof calculateSessionFinalPointsV3 === 'function')
      ? calculateSessionFinalPointsV3(dictationSessionPointsEarned, done, total, isComp)
      : calculateSessionFinalPoints(dictationSessionPointsEarned, done, total, isComp);
    const finalPts = res.finalPts;

    if (finalPts !== 0 && typeof setUserPoints === 'function') {
      const curDeck = (typeof decks !== 'undefined') ? decks.find(d => d.id === currentDeckId) : null;
      const deckTitle = curDeck ? curDeck.title : 'Bộ từ vựng';
      setUserPoints(Math.max(0, getUserPoints() + finalPts));
      const bonusText = res.milestoneBonus > 0 ? ` + Thưởng mốc ${done} câu (+${res.milestoneBonus} Xu)` : '';
      if (typeof addLedgerEntry === 'function') {
        addLedgerEntry('STUDY_DICTATION', finalPts, `Nghe gõ câu "${deckTitle}" (${done}/${total} câu, x${res.combinedMult}${bonusText})`);
      }
      if (typeof saveDatabase === 'function') saveDatabase(true);
      if (typeof pushCurrentDatabaseToCloud === 'function') pushCurrentDatabaseToCloud();
      if (typeof showToast === 'function') {
        showToast(`🎉 Nghe Gõ Câu: ${finalPts > 0 ? '+' : ''}${finalPts} Xu (x${res.completionMult} hoàn thành, x${res.deckLengthMult} quy mô${bonusText})`);
      }
    }
    dictationSessionPointsEarned = 0;
  }

  // Record study time on exit if session was active
  if (dictationStartTime > 0) {
    const durationSec = Math.max(1, Math.floor((Date.now() - dictationStartTime) / 1000));
    if (done > 0 && typeof addDailyStudySeconds === 'function') {
      addDailyStudySeconds(durationSec, 'dictation');
    }
    if (done > 0 && typeof recordStudyFlowAction === 'function') {
      recordStudyFlowAction('dictation');
    }
  }

  if (dictationSetupCustomWordList || !currentDeckId) {
    showScreen('screen-decks');
    if (typeof refreshActiveScreenData === 'function') refreshActiveScreenData();
  } else {
    showScreen('screen-deck-detail');
    if (typeof refreshActiveScreenData === 'function') refreshActiveScreenData();
  }
}
window.exitDictationMode = exitDictationMode;
