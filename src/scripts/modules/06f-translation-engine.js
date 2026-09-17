// =========================================================================
// VOCAFLOW 06F-TRANSLATION-ENGINE.JS (v0.10.10-25 Build 326 - TRANSLATION LAB VIP β)
// Bidirectional Translation Engine (EN ↔ VI) with Strict AI Grading & Balance v3
// =========================================================================

let translationQuestionsList = [];
let currentTranslationIndex = 0;
let currentTranslationDifficulty = localStorage.getItem('vocaflow_translation_difficulty') || 'easy';
let selectedTranslationSetupDifficulty = 'easy';
let currentTranslationDirection = localStorage.getItem('vocaflow_translation_direction') || 'en_to_vi'; // 'en_to_vi' | 'vi_to_en'
let selectedTranslationSetupDirection = 'en_to_vi';
let translationSetupQuestionCount = 'all'; // '5' | '10' | 'custom' | 'all'
let translationSetupCustomCountValue = null;
let translationSetupUseSelection = false;
let translationSetupCustomWordList = null;

let translationFloorScore = 70;
let translationDiffMult = 1.2;
let translationCurrentSourceText = '';
let translationCurrentBenchmarkText = '';
let translationCurrentWordRef = null;
let translationHintsRevealed = 0;
let translationSessionPointsEarned = 0;
let translationSessionWrongWords = [];
let translationSessionScores = [];
let translationHintsUsedTotal = 0;
let translationSkipsUsedTotal = 0;
let translationGradedIndices = new Set();
let translationStartTime = 0;
let translationIsCompleted = false;

// =========================================================================
// 1. DIFFICULTY CONFIGURATION
// =========================================================================
function getTranslationDifficultyConfig(diff) {
  if (diff === 'hard') {
    return {
      floorScore: 90,
      diffMult: 2.4,
      minWords: 18,
      baseXu: 24,
      label: '🔴 Khó'
    };
  }
  if (diff === 'medium') {
    return {
      floorScore: 80,
      diffMult: 1.8,
      minWords: 10,
      baseXu: 18,
      label: '🟡 Trung Bình'
    };
  }
  return {
    floorScore: 70,
    diffMult: 1.2,
    minWords: 5,
    baseXu: 12,
    label: '🟢 Dễ'
  };
}

// =========================================================================
// 2. VIP ACCESS CHECKER
// =========================================================================
function checkTranslationVipAccess() {
  if (typeof currentUser === 'undefined' || !currentUser) {
    if (typeof showToast === 'function') {
      showToast('🔒 Chế độ Dịch Thuật Song Phương (VIP β) yêu cầu đăng nhập tài khoản VIP!');
    }
    if (typeof openAuthModal === 'function') openAuthModal('login');
    return false;
  }
  if (!currentUser.isVip && currentUser.role !== 'vip') {
    if (typeof showToast === 'function') {
      showToast('👑 Chế độ Dịch Thuật Song Phương (VIP β) chỉ dành riêng cho thành viên VIP!');
    }
    if (typeof openVipPricingModal === 'function') {
      openVipPricingModal();
    } else if (typeof openFeatureGuestLockModal === 'function') {
      openFeatureGuestLockModal('translation');
    }
    return false;
  }
  return true;
}

// =========================================================================
// 3. SETUP MODAL CONTROLLER
// =========================================================================
function openTranslationSetupModal(useSelection = false, customWordList = null) {
  if (!checkTranslationVipAccess()) return;

  translationSetupUseSelection = useSelection;
  translationSetupCustomWordList = customWordList;

  selectedTranslationSetupDifficulty = currentTranslationDifficulty;
  selectedTranslationSetupDirection = currentTranslationDirection;
  selectTranslationSetupDifficulty(selectedTranslationSetupDifficulty);
  selectTranslationSetupDirection(selectedTranslationSetupDirection);

  let targetWords = [];
  if (customWordList) {
    targetWords = customWordList;
  } else if (useSelection && selectedWordIds.size > 0) {
    targetWords = words.filter(w => selectedWordIds.has(w.id));
  } else if (currentDeckId) {
    targetWords = words.filter(w => w.deckId === currentDeckId);
  }

  const sub = document.getElementById('translation-setup-subtitle');
  if (sub) {
    const dirText = selectedTranslationSetupDirection === 'en_to_vi' ? 'Anh ➔ Việt' : 'Việt ➔ Anh';
    sub.textContent = `${targetWords.length} từ vựng sẵn sàng • Chiều: ${dirText}`;
  }

  const shuffleCb = document.getElementById('translation-setup-shuffle-checkbox');
  if (shuffleCb) shuffleCb.checked = true;

  selectTranslationSetupQuestionCount('all');
  openModal('modal-translation-setup');
}
window.openTranslationSetupModal = openTranslationSetupModal;

function selectTranslationSetupDirection(direction) {
  selectedTranslationSetupDirection = direction;
  ['en_to_vi', 'vi_to_en'].forEach(d => {
    const card = document.getElementById('translation-dir-card-' + d);
    if (card) {
      if (d === direction) {
        card.style.borderColor = d === 'en_to_vi' ? '#10b981' : '#0ea5e9';
        card.style.background = 'rgba(16, 185, 129, 0.08)';
      } else {
        card.style.borderColor = 'var(--border)';
        card.style.background = 'var(--surface-elevated)';
      }
    }
  });
}
window.selectTranslationSetupDirection = selectTranslationSetupDirection;

function selectTranslationSetupDifficulty(diff) {
  selectedTranslationSetupDifficulty = diff;
  ['easy', 'medium', 'hard'].forEach(d => {
    const card = document.getElementById('translation-diff-card-' + d);
    if (card) {
      if (d === diff) {
        const colors = { easy: '#10b981', medium: '#f59e0b', hard: '#ef4444' };
        card.style.borderColor = colors[d];
        card.style.background = 'rgba(16, 185, 129, 0.08)';
      } else {
        card.style.borderColor = 'var(--border)';
        card.style.background = 'var(--surface-elevated)';
      }
    }
  });
}
window.selectTranslationSetupDifficulty = selectTranslationSetupDifficulty;

function selectTranslationSetupQuestionCount(countMode) {
  translationSetupQuestionCount = countMode;
  ['5', '10', 'custom', 'all'].forEach(k => {
    const btn = document.getElementById('translation-qc-' + k);
    if (btn) {
      if (k === countMode) {
        btn.classList.add('active');
        btn.style.borderColor = '#10b981';
        btn.style.background = 'rgba(16, 185, 129, 0.15)';
        btn.style.color = 'var(--text)';
      } else {
        btn.classList.remove('active');
        btn.style.borderColor = 'var(--border)';
        btn.style.background = 'transparent';
        btn.style.color = 'var(--text-muted)';
      }
    }
  });
}
window.selectTranslationSetupQuestionCount = selectTranslationSetupQuestionCount;

function handleTranslationCustomQuestionCountInput(val) {
  const n = parseInt(val, 10);
  if (!isNaN(n) && n > 0) {
    translationSetupCustomCountValue = n;
  }
}
window.handleTranslationCustomQuestionCountInput = handleTranslationCustomQuestionCountInput;

function confirmStartTranslationFromModal() {
  currentTranslationDifficulty = selectedTranslationSetupDifficulty;
  currentTranslationDirection = selectedTranslationSetupDirection;
  localStorage.setItem('vocaflow_translation_difficulty', currentTranslationDifficulty);
  localStorage.setItem('vocaflow_translation_direction', currentTranslationDirection);

  const shuffleCb = document.getElementById('translation-setup-shuffle-checkbox');
  const doShuffle = shuffleCb ? shuffleCb.checked : true;

  closeModal('modal-translation-setup');
  startTranslationMode(translationSetupUseSelection, translationSetupCustomWordList, doShuffle);
}
window.confirmStartTranslationFromModal = confirmStartTranslationFromModal;

// =========================================================================
// 4. TASK GENERATOR (EN ↔ VI WITH POS-AWARE TEMPLATES)
// =========================================================================
function generateTranslationTaskForWord(mainWord, difficulty, direction) {
  const term = (mainWord.term || '').trim();
  const rawPos = (mainWord.partOfSpeech || 'noun').toLowerCase();
  const pos = rawPos.includes('verb') ? 'verb' : (rawPos.includes('adj') ? 'adjective' : (rawPos.includes('adv') ? 'adverb' : 'noun'));
  const rawDefVi = mainWord.definitionVi || mainWord.definition || '';
  const defVi = rawDefVi.replace(/^["'“”]|["'“”]$/g, '').trim();
  const safeMeaning = defVi ? defVi.toLowerCase() : term;

  let enSentence = '';
  let viSentence = '';

  // 1. Check if existing example fits
  if (mainWord.exampleSentence || mainWord.example) {
    const rawEx = (mainWord.exampleSentence || mainWord.example).trim();
    if (typeof sanitizeEnglishDictationSentence === 'function') {
      const sanitized = sanitizeEnglishDictationSentence(rawEx, mainWord.exampleTranslationVi || '');
      if (sanitized.cleanSentence && sanitized.extractedVi && !sanitized.extractedVi.startsWith('Câu ví dụ')) {
        enSentence = sanitized.cleanSentence;
        viSentence = sanitized.extractedVi;
      }
    }
  }

  // 2. High-Quality POS Templates if no natural custom pair available
  if (!enSentence || !viSentence) {
    if (difficulty === 'easy') {
      if (pos === 'verb') {
        const verbPairs = [
          { en: `We need to ${term} carefully to achieve great results.`, vi: `Chúng ta cần phải ${safeMeaning} một cách cẩn thận để đạt được kết quả tuyệt vời.` },
          { en: `She wants to ${term} every morning to stay healthy.`, vi: `Cô ấy muốn ${safeMeaning} vào mỗi buổi sáng để duy trì sức khỏe tốt.` },
          { en: `They decided to ${term} together before the meeting.`, vi: `Họ đã quyết định cùng nhau ${safeMeaning} trước khi cuộc họp diễn ra.` }
        ];
        const p = verbPairs[Math.floor(Math.random() * verbPairs.length)];
        enSentence = p.en; viSentence = p.vi;
      } else if (pos === 'adjective') {
        const adjPairs = [
          { en: `The weather today is surprisingly ${term} and pleasant.`, vi: `Thời tiết hôm nay thật bất ngờ khi rất ${safeMeaning} và dễ chịu.` },
          { en: `She gave a very ${term} explanation during the lesson.`, vi: `Cô ấy đã đưa ra một lời giải thích rất ${safeMeaning} trong suốt buổi học.` },
          { en: `This was a truly ${term} experience for our team.`, vi: `Đây thực sự là một trải nghiệm ${safeMeaning} đối với cả đội ngũ chúng tôi.` }
        ];
        const p = adjPairs[Math.floor(Math.random() * adjPairs.length)];
        enSentence = p.en; viSentence = p.vi;
      } else if (pos === 'adverb') {
        const advPairs = [
          { en: `She completed the challenging assignment ${term}.`, vi: `Cô ấy đã hoàn thành bài tập đầy thử thách một cách ${safeMeaning}.` },
          { en: `The system operates ${term} even during peak hours.`, vi: `Hệ thống vận hành một cách ${safeMeaning} ngay cả trong những khung giờ cao điểm.` }
        ];
        const p = advPairs[Math.floor(Math.random() * advPairs.length)];
        enSentence = p.en; viSentence = p.vi;
      } else {
        const nounPairs = [
          { en: `The teacher clearly explained the importance of this ${term}.`, vi: `Giáo viên đã giải thích rõ ràng tầm quan trọng của ${safeMeaning} này.` },
          { en: `They found useful information about this ${term} today.`, vi: `Họ đã tìm thấy thông tin hữu ích về ${safeMeaning} này vào hôm nay.` },
          { en: `Our main goal is to understand how this ${term} works.`, vi: `Mục tiêu chính của chúng tôi là hiểu rõ cách thức ${safeMeaning} này vận hành.` }
        ];
        const p = nounPairs[Math.floor(Math.random() * nounPairs.length)];
        enSentence = p.en; viSentence = p.vi;
      }
    } else if (difficulty === 'medium') {
      if (pos === 'verb') {
        const verbMed = [
          { en: `Students who actively learn to ${term} tend to solve complex problems much faster.`, vi: `Những học sinh chủ động học cách ${safeMeaning} có xu hướng giải quyết các vấn đề phức tạp nhanh hơn nhiều.` },
          { en: `The management team encourages all staff members to ${term} whenever new challenges arise.`, vi: `Ban quản lý khuyến khích tất cả nhân viên ${safeMeaning} bất cứ khi nào có thách thức mới phát sinh.` }
        ];
        const p = verbMed[Math.floor(Math.random() * verbMed.length)];
        enSentence = p.en; viSentence = p.vi;
      } else if (pos === 'adjective') {
        const adjMed = [
          { en: `Having a ${term} mindset allows researchers to uncover surprising insights in modern science.`, vi: `Có một tư duy ${safeMeaning} cho phép các nhà nghiên cứu khám phá ra những hiểu biết bất ngờ trong khoa học hiện đại.` },
          { en: `The company established a ${term} framework that supports continuous innovation and collaboration.`, vi: `Công ty đã thiết lập một khuôn khổ ${safeMeaning} hỗ trợ sự đổi mới và hợp tác liên tục.` }
        ];
        const p = adjMed[Math.floor(Math.random() * adjMed.length)];
        enSentence = p.en; viSentence = p.vi;
      } else {
        const nounMed = [
          { en: `Students who thoroughly understand the value of ${term} usually perform significantly better on their exams.`, vi: `Những học sinh hiểu thấu đáo giá trị của ${safeMeaning} thường đạt kết quả tốt hơn đáng kể trong các kỳ thi.` },
          { en: `Our development team decided to adopt a modern ${term} in order to improve overall system reliability.`, vi: `Đội ngũ phát triển của chúng tôi quyết định áp dụng một ${safeMeaning} hiện đại nhằm nâng cao độ tin cậy của toàn bộ hệ thống.` }
        ];
        const p = nounMed[Math.floor(Math.random() * nounMed.length)];
        enSentence = p.en; viSentence = p.vi;
      }
    } else {
      // Hard
      const hardPairs = [
        { en: `Although many distinguished scholars debated the exact scope of ${term}, everyone agreed that its practical application is indispensable for long-term institutional success.`, vi: `Mặc dù nhiều học giả uy tín đã tranh luận về phạm vi chính xác của ${safeMeaning}, mọi người đều nhất trí rằng ứng dụng thực tiễn của nó là không thể thiếu cho sự thành công lâu dài của tổ chức.` },
        { en: `The international council has officially introduced rigorous standards regarding ${term} to safeguard ethical compliance and foster transparent international collaboration.`, vi: `Hội đồng quốc tế đã chính thức ban hành các tiêu chuẩn nghiêm ngặt liên quan đến ${safeMeaning} nhằm đảm bảo tính tuân thủ đạo đức và thúc đẩy sự hợp tác quốc tế minh bạch.` }
      ];
      const p = hardPairs[Math.floor(Math.random() * hardPairs.length)];
      enSentence = p.en; viSentence = p.vi;
    }
  }

  const isEnToVi = (direction === 'en_to_vi');
  return {
    sourceText: isEnToVi ? enSentence : viSentence,
    benchmarkText: isEnToVi ? viSentence : enSentence,
    englishSentence: enSentence,
    vietnameseSentence: viSentence,
    targetWord: term,
    partOfSpeech: pos,
    definitionVi: defVi,
    direction: direction
  };
}

// =========================================================================
// 5. ENGINE START & RENDER
// =========================================================================
function startTranslationMode(fromSelection = false, customWordList = null, doShuffle = true) {
  if (!checkTranslationVipAccess()) return;
  if (!currentDeckId && !customWordList) return;

  studySourceContext = customWordList ? 'review-queue' : 'deck';

  let targetWords = [];
  if (customWordList) {
    targetWords = customWordList;
  } else if (fromSelection && selectedWordIds.size > 0) {
    targetWords = words.filter(w => selectedWordIds.has(w.id));
  } else {
    targetWords = words.filter(w => w.deckId === currentDeckId);
  }

  if (targetWords.length === 0) {
    if (typeof showToast === 'function') {
      showToast('⚠️ Không có từ vựng nào để bắt đầu dịch thuật!');
    }
    return;
  }

  let baseWords = [...targetWords];
  if (doShuffle) {
    baseWords.sort(() => Math.random() - 0.5);
  }

  // Question count limiter
  if (translationSetupQuestionCount === '5') {
    baseWords = baseWords.slice(0, 5);
  } else if (translationSetupQuestionCount === '10') {
    baseWords = baseWords.slice(0, 10);
  } else if (translationSetupQuestionCount === 'custom' && translationSetupCustomCountValue) {
    baseWords = baseWords.slice(0, translationSetupCustomCountValue);
  }

  const cfg = getTranslationDifficultyConfig(currentTranslationDifficulty);
  translationFloorScore = cfg.floorScore;
  translationDiffMult = cfg.diffMult;

  translationQuestionsList = baseWords.map(w => {
    const task = generateTranslationTaskForWord(w, currentTranslationDifficulty, currentTranslationDirection);
    return {
      mainWord: w,
      task: task
    };
  });

  currentTranslationIndex = 0;
  translationSessionPointsEarned = 0;
  translationSessionWrongWords = [];
  translationSessionScores = [];
  translationHintsUsedTotal = 0;
  translationSkipsUsedTotal = 0;
  translationGradedIndices.clear();
  translationStartTime = Date.now();
  translationIsCompleted = false;

  const curDeck = decks.find(d => d.id === currentDeckId);
  const deckTitleEl = document.getElementById('translation-deck-title');
  if (deckTitleEl) {
    deckTitleEl.textContent = curDeck ? curDeck.title : (customWordList ? 'Hàng Đợi Ôn Tập' : 'Bộ từ');
  }

  const scoreBadge = document.getElementById('translation-score-badge');
  if (scoreBadge) scoreBadge.textContent = 'Bài: +0đ';

  updateTranslationHeaderBadges();
  showScreen('screen-translation');
  renderTranslationCurrentQuestion();
}
window.startTranslationMode = startTranslationMode;

function updateTranslationHeaderBadges() {
  const dirBadge = document.getElementById('translation-direction-badge');
  if (dirBadge) {
    if (currentTranslationDirection === 'en_to_vi') {
      dirBadge.textContent = '🇬🇧 ➔ 🇻🇳 Anh - Việt';
      dirBadge.style.color = '#34d399';
      dirBadge.style.borderColor = 'rgba(16, 185, 129, 0.35)';
      dirBadge.style.background = 'rgba(16, 185, 129, 0.18)';
    } else {
      dirBadge.textContent = '🇻🇳 ➔ 🇬🇧 Việt - Anh';
      dirBadge.style.color = '#38bdf8';
      dirBadge.style.borderColor = 'rgba(14, 165, 233, 0.35)';
      dirBadge.style.background = 'rgba(14, 165, 233, 0.18)';
    }
  }

  const diffBadge = document.getElementById('translation-difficulty-badge');
  if (diffBadge) {
    const cfg = getTranslationDifficultyConfig(currentTranslationDifficulty);
    diffBadge.textContent = `${cfg.label} (x${translationDiffMult})`;
  }
}

function renderTranslationCurrentQuestion() {
  if (translationQuestionsList.length === 0) return;
  const q = translationQuestionsList[currentTranslationIndex];
  if (!q) return;

  translationHintsRevealed = 0;
  translationCurrentWordRef = q.mainWord;
  translationCurrentSourceText = q.task.sourceText;
  translationCurrentBenchmarkText = q.task.benchmarkText;

  // Counter
  const counterEl = document.getElementById('translation-counter');
  if (counterEl) {
    counterEl.textContent = `Câu ${currentTranslationIndex + 1} / ${translationQuestionsList.length}`;
  }

  // Source text & prompt label
  const promptLabel = document.getElementById('translation-prompt-lang-label');
  const sourceTextEl = document.getElementById('translation-source-text');
  const inputLabel = document.getElementById('translation-input-label');
  const inputArea = document.getElementById('translation-input-text');

  if (promptLabel) {
    promptLabel.textContent = q.task.direction === 'en_to_vi' ? '🇬🇧 CÂU TIẾNG ANH CẦN DỊCH:' : '🇻🇳 CÂU TIẾNG VIỆT CẦN DỊCH:';
    promptLabel.style.color = q.task.direction === 'en_to_vi' ? '#10b981' : '#38bdf8';
  }

  if (sourceTextEl) {
    sourceTextEl.textContent = translationCurrentSourceText;
  }

  // Audio button visibility
  const speakSourceBtn = document.getElementById('btn-translation-speak-source');
  if (speakSourceBtn) {
    speakSourceBtn.style.display = q.task.direction === 'en_to_vi' ? 'flex' : 'none';
  }

  // Target word clue
  const termEl = document.getElementById('translation-word-term');
  const posEl = document.getElementById('translation-word-pos');
  const meaningEl = document.getElementById('translation-word-meaning');
  if (termEl) termEl.textContent = q.mainWord.term || '';
  if (posEl) posEl.textContent = q.mainWord.partOfSpeech || 'noun';
  if (meaningEl) meaningEl.textContent = q.mainWord.definitionVi || q.mainWord.definition || '';

  // Input area setup
  if (inputLabel) {
    inputLabel.textContent = q.task.direction === 'en_to_vi' ? '✍️ Nhập bản dịch tiếng Việt của bạn:' : '✍️ Nhập bản dịch tiếng Anh của bạn:';
  }
  if (inputArea) {
    inputArea.value = '';
    inputArea.disabled = false;
    inputArea.placeholder = q.task.direction === 'en_to_vi' ? 'Nhập bản dịch tiếng Việt mượt mà, đúng ngữ cảnh...' : 'Type your natural, grammatically correct English translation...';
    inputArea.focus();
  }

  // Character counter reset
  updateTranslationCharCounter();

  // Reset hints & evaluation panels
  const hintBox = document.getElementById('translation-hint-box');
  const resultPanel = document.getElementById('translation-result-panel');
  const aiLoading = document.getElementById('translation-ai-loading');
  const actionsRow = document.getElementById('translation-actions-row');

  if (hintBox) hintBox.style.display = 'none';
  if (resultPanel) resultPanel.style.display = 'none';
  if (aiLoading) aiLoading.style.display = 'none';
  if (actionsRow) actionsRow.style.display = 'flex';

  updateTranslationWalletBadges();
}

function updateTranslationCharCounter() {
  const inputArea = document.getElementById('translation-input-text');
  const counterEl = document.getElementById('translation-char-counter');
  if (!inputArea || !counterEl) return;
  const val = inputArea.value || '';
  const charCount = val.length;
  const wordCount = val.trim() ? val.trim().split(/\s+/).length : 0;
  counterEl.textContent = `${charCount} ký tự • ${wordCount} từ`;
}

// Attach input & keydown events
document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('translation-input-text');
  if (textarea) {
    textarea.addEventListener('input', updateTranslationCharCounter);
    textarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        submitTranslationEvaluation();
      }
    });
  }
});

// =========================================================================
// 6. AUDIO / TTS PLAYBACK
// =========================================================================
function speakTranslationSourceSentence() {
  const q = translationQuestionsList[currentTranslationIndex];
  if (!q) return;
  const textToSpeak = q.task.direction === 'en_to_vi' ? translationCurrentSourceText : translationCurrentBenchmarkText;
  if (typeof speakText === 'function' && textToSpeak) {
    speakText(textToSpeak, 'en-US');
  }
}
window.speakTranslationSourceSentence = speakTranslationSourceSentence;

function speakTranslationRefSentence() {
  const q = translationQuestionsList[currentTranslationIndex];
  if (!q) return;
  const textToSpeak = q.task.direction === 'vi_to_en' ? translationCurrentBenchmarkText : translationCurrentSourceText;
  if (typeof speakText === 'function' && textToSpeak) {
    speakText(textToSpeak, 'en-US');
  }
}
window.speakTranslationRefSentence = speakTranslationRefSentence;

// =========================================================================
// 7. VOCAHINT 3-TIER & VOCASKIP
// =========================================================================
function updateTranslationWalletBadges() {
  const hintsCount = typeof getUserHints === 'function' ? getUserHints() : 0;
  const skipsCount = typeof getUserSkips === 'function' ? getUserSkips() : 0;

  const hintBadge = document.getElementById('translation-hint-count-badge');
  const skipBadge = document.getElementById('translation-skip-count-badge');

  if (hintBadge) hintBadge.textContent = `(${hintsCount})`;
  if (skipBadge) skipBadge.textContent = `(${skipsCount})`;
}

function useTranslationHint() {
  const currentHints = typeof getUserHints === 'function' ? getUserHints() : 0;
  if (currentHints <= 0) {
    if (typeof showToast === 'function') showToast('⚠️ Bạn đã hết VocaHint! Hãy ghé Cửa Hàng để nạp thêm nhé.');
    if (typeof openShopModal === 'function') openShopModal();
    return;
  }

  setUserHints(currentHints - 1);
  translationHintsUsedTotal++;
  if (typeof addLedgerEntry === 'function') {
    addLedgerEntry('HINT_USED', 0, `Sử dụng 1 VocaHint trong Dịch Thuật (còn ${currentHints - 1})`);
  }
  updateTranslationWalletBadges();

  translationHintsRevealed++;
  const hintBox = document.getElementById('translation-hint-box');
  const hintContent = document.getElementById('translation-hint-content');
  const q = translationQuestionsList[currentTranslationIndex];
  if (!hintBox || !hintContent || !q) return;

  hintBox.style.display = 'block';
  const isEnToVi = (q.task.direction === 'en_to_vi');
  const term = q.mainWord.term || '';
  const meaning = q.mainWord.definitionVi || q.mainWord.definition || '';
  const pos = q.mainWord.partOfSpeech || 'từ vựng';

  if (isEnToVi) {
    if (translationHintsRevealed === 1) {
      hintContent.innerHTML = `
        <div>
          🎯 <strong>Từ khóa chính:</strong> <code>${escapeHtml(term)}</code> (${escapeHtml(pos)}: <em>${escapeHtml(meaning)}</em>)<br>
          💡 <strong>Mẹo dịch:</strong> Xác định rõ chủ ngữ và động từ chính của câu trước khi chuyển ngữ sang tiếng Việt.
        </div>
      `;
    } else if (translationHintsRevealed === 2) {
      const benchmarkWords = (translationCurrentBenchmarkText || '').split(/\s+/);
      const halfLen = Math.max(3, Math.floor(benchmarkWords.length / 2));
      const firstHalf = benchmarkWords.slice(0, halfLen).join(' ');
      hintContent.innerHTML = `
        <div>
          🔗 <strong>Gợi ý nửa đầu câu tiếng Việt:</strong> <span style="color: #34d399; font-weight: 600;">"${escapeHtml(firstHalf)}..."</span><br>
          📝 <strong>Lưu ý:</strong> Diễn đạt tự nhiên, tránh dịch word-by-word (từng chữ một).
        </div>
      `;
    } else {
      hintContent.innerHTML = `
        <div>
          🇻🇳 <strong>Bản dịch tham khảo gợi ý:</strong><br>
          <span style="color: #38bdf8; font-weight: 700; font-size: 13.5px;">"${escapeHtml(translationCurrentBenchmarkText)}"</span>
        </div>
      `;
    }
  } else {
    // vi_to_en
    if (translationHintsRevealed === 1) {
      hintContent.innerHTML = `
        <div>
          🎯 <strong>Từ vựng tiếng Anh cần dùng:</strong> <code>${escapeHtml(term)}</code> (${escapeHtml(pos)})<br>
          💡 <strong>Cấu trúc ngữ pháp:</strong> Hãy chú ý chia thì của động từ và sử dụng mạo từ (a/an/the) phù hợp.
        </div>
      `;
    } else if (translationHintsRevealed === 2) {
      const enWords = (translationCurrentBenchmarkText || '').split(/\s+/);
      const firstThree = enWords.slice(0, Math.min(4, enWords.length)).join(' ');
      hintContent.innerHTML = `
        <div>
          🔗 <strong>Cụm từ mở đầu tiếng Anh:</strong> <span style="color: #38bdf8; font-weight: 600;">"${escapeHtml(firstThree)}..."</span><br>
          📝 Đảm bảo câu có đầy đủ Chủ ngữ + Vị ngữ hoàn chỉnh.
        </div>
      `;
    } else {
      const enWords = (translationCurrentBenchmarkText || '').split(/\s+/);
      const masked = enWords.map(w => {
        const clean = w.replace(/^[^\w]+|[^\w]+$/g, '');
        if (clean.length <= 1) return w;
        return clean[0] + '_'.repeat(Math.min(5, clean.length - 1));
      }).join(' ');
      hintContent.innerHTML = `
        <div>
          🔤 <strong>Khung chữ cái đầu của câu tiếng Anh:</strong><br>
          <code style="color: #fbbf24; font-size: 13px; font-weight: 700;">${escapeHtml(masked)}</code>
        </div>
      `;
    }
  }
}
window.useTranslationHint = useTranslationHint;

function skipTranslationQuestion() {
  const currentSkips = typeof getUserSkips === 'function' ? getUserSkips() : 0;
  if (currentSkips <= 0) {
    if (typeof showToast === 'function') showToast('⚠️ Bạn đã hết VocaSkip! Hãy ghé Cửa Hàng để nạp thêm nhé.');
    if (typeof openShopModal === 'function') openShopModal();
    return;
  }

  setUserSkips(currentSkips - 1);
  translationSkipsUsedTotal++;
  if (typeof addLedgerEntry === 'function') {
    addLedgerEntry('SKIP_USED', 0, `Sử dụng 1 VocaSkip trong Dịch Thuật (còn ${currentSkips - 1})`);
  }
  updateTranslationWalletBadges();

  if (typeof showToast === 'function') {
    showToast('⏭️ Đã bỏ qua câu này!');
  }
  nextTranslationQuestion();
}
window.skipTranslationQuestion = skipTranslationQuestion;

// =========================================================================
// 8. GEMINI AI TRANSLATION EVALUATION ENGINE (Strict & Unforgiving)
// =========================================================================
async function submitTranslationEvaluation() {
  const inputArea = document.getElementById('translation-input-text');
  if (!inputArea) return;
  const userTranslation = (inputArea.value || '').trim();

  if (!userTranslation) {
    if (typeof showToast === 'function') showToast('⚠️ Vui lòng nhập bản dịch trước khi gửi chấm điểm nhé!');
    inputArea.focus();
    return;
  }

  const wordCount = userTranslation.split(/\s+/).length;
  if (wordCount < 2) {
    if (typeof showToast === 'function') showToast('⚠️ Bản dịch quá ngắn! Vui lòng hoàn thành trọn vẹn cả câu.');
    return;
  }

  inputArea.disabled = true;
  const actionsRow = document.getElementById('translation-actions-row');
  const aiLoading = document.getElementById('translation-ai-loading');
  const resultPanel = document.getElementById('translation-result-panel');

  if (actionsRow) actionsRow.style.display = 'none';
  if (aiLoading) aiLoading.style.display = 'block';
  if (resultPanel) resultPanel.style.display = 'none';

  const q = translationQuestionsList[currentTranslationIndex];
  const direction = q.task.direction;
  const targetWord = q.mainWord.term;
  const targetDef = q.mainWord.definitionVi || q.mainWord.definition;
  const sourceSentence = translationCurrentSourceText;
  const benchmarkSentence = translationCurrentBenchmarkText;

  const prompt = `You are a strict, professional translation examiner and linguist grading a bidirectional translation exam.
Exam mode: ${direction === 'en_to_vi' ? 'English to Vietnamese' : 'Vietnamese to English'}
Target Word: "${targetWord}" (Meaning: "${targetDef}")
Original Source Sentence: "${sourceSentence}"
Benchmark Reference Translation: "${benchmarkSentence}"
Student's Submitted Translation: "${userTranslation}"

GRADING POLICY (STRICT & UNFORGIVING):
1. Score Range: 0 to 100.
2. Dock points heavily for:
   - Grammatical errors, wrong verb tenses, incorrect articles (a/an/the), wrong prepositions (-15 to -25 pts).
   - Distorted meaning, reversed clauses, or hallucinated facts (-30 to -50 pts).
   - Omission or wrong usage of the target keyword "${targetWord}" (-20 pts).
   - Unnatural word-for-word translation that sounds robotic or unidiomatic (-10 to -20 pts).
3. Award 90-100 ONLY for highly accurate, fluent, and natural translations that sound native.

OUTPUT FORMAT: Return STRICT JSON ONLY without markdown fences or backticks:
{
  "score": <number 0-100>,
  "passedFloor": <boolean, true if score >= ${translationFloorScore}>,
  "verdict": "<short concise verdict in Vietnamese, max 25 words>",
  "analysis": {
    "grammar": "<detailed feedback on grammar, structure & accuracy in Vietnamese, max 40 words>",
    "nuance": "<nuance and vocabulary choice analysis in Vietnamese, max 35 words>",
    "errors": "<specific errors detected, or 'Không có lỗi đáng kể' in Vietnamese>"
  },
  "polishedRewrite": "<natural, native-like translation rewrite in target language>",
  "tip": "<actionable translation tip or idiom in Vietnamese, max 30 words>"
}`;

  let evalResult = null;
  try {
    if (typeof callGeminiAiModel === 'function') {
      const rawRes = await callGeminiAiModel(prompt, 'fast', 0.2);
      if (rawRes) {
        const cleanJson = rawRes.replace(/```json/gi, '').replace(/```/g, '').trim();
        evalResult = JSON.parse(cleanJson);
      }
    }
  } catch (err) {
    console.warn('Gemini Translation evaluation API error, using heuristic fallback:', err);
  }

  if (!evalResult || typeof evalResult.score !== 'number') {
    evalResult = fallbackHeuristicTranslationGrading(userTranslation, benchmarkSentence, targetWord, direction);
  }

  renderTranslationEvaluationResult(evalResult, userTranslation);
}
window.submitTranslationEvaluation = submitTranslationEvaluation;

function fallbackHeuristicTranslationGrading(userTrans, benchmark, targetWord, direction) {
  const cleanUser = userTrans.toLowerCase().trim();
  const cleanBench = benchmark.toLowerCase().trim();
  const userTokens = cleanUser.split(/\s+/);
  const benchTokens = cleanBench.split(/\s+/);

  let matchCount = 0;
  userTokens.forEach(t => {
    if (benchTokens.includes(t)) matchCount++;
  });
  const overlapRatio = benchTokens.length > 0 ? (matchCount / benchTokens.length) : 0.5;
  const lenRatio = Math.min(userTokens.length, benchTokens.length) / Math.max(userTokens.length, benchTokens.length);

  let baseScore = Math.round((overlapRatio * 60) + (lenRatio * 30) + 10);
  if (direction === 'vi_to_en' && targetWord && cleanUser.includes(targetWord.toLowerCase())) {
    baseScore = Math.min(100, baseScore + 10);
  }
  baseScore = Math.max(30, Math.min(95, baseScore));

  const passed = baseScore >= translationFloorScore;
  return {
    score: baseScore,
    passedFloor: passed,
    verdict: passed ? 'Bản dịch đạt chuẩn ngữ nghĩa và truyền tải thông điệp tốt.' : 'Bản dịch chưa đạt điểm sàn, cần chú ý cấu trúc câu và từ vựng.',
    analysis: {
      grammar: passed ? 'Cấu trúc câu cơ bản hoàn chỉnh và diễn đạt tương đối rõ ràng.' : 'Còn một số điểm chưa chuẩn xác về ngữ pháp hoặc trật tự từ trong câu.',
      nuance: 'Sắc thái câu phù hợp với ngữ cảnh giao tiếp thông thường.',
      errors: passed ? 'Không có lỗi nghiêm trọng.' : 'Câu còn mang tính dịch thô từng từ (word-by-word).'
    },
    polishedRewrite: benchmark,
    tip: 'Hãy chú ý liên từ nối và cách dùng cụm từ cố định (collocations) để câu văn mượt mà hơn.'
  };
}

function renderTranslationEvaluationResult(evalResult, userTranslation) {
  const aiLoading = document.getElementById('translation-ai-loading');
  const resultPanel = document.getElementById('translation-result-panel');
  if (aiLoading) aiLoading.style.display = 'none';
  if (resultPanel) resultPanel.style.display = 'block';

  const score = Math.max(0, Math.min(100, parseInt(evalResult.score, 10) || 50));
  const passed = score >= translationFloorScore;

  translationGradedIndices.add(currentTranslationIndex);
  translationSessionScores.push(score);

  // Verdict banner styling
  const verdictBanner = document.getElementById('translation-verdict-banner');
  const verdictText = document.getElementById('translation-verdict-text');
  const scoreDisplay = document.getElementById('translation-score-display');

  const cfg = getTranslationDifficultyConfig(currentTranslationDifficulty);
  const earnedCoins = passed ? Math.round(cfg.baseXu * translationDiffMult) : 0;
  if (earnedCoins > 0) translationSessionPointsEarned += earnedCoins;

  if (verdictBanner) {
    verdictBanner.style.background = passed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
    verdictBanner.style.border = `1px solid ${passed ? '#10b981' : '#ef4444'}`;
    verdictBanner.style.color = passed ? '#34d399' : '#f87171';
  }
  if (verdictText) {
    verdictText.textContent = passed ? `✅ Đạt sàn ${translationFloorScore}đ! (+${earnedCoins} Xu)` : `❌ Chưa đạt sàn ${translationFloorScore}đ (0 Xu)`;
  }
  if (scoreDisplay) {
    scoreDisplay.textContent = `${score} / 100đ`;
    scoreDisplay.style.background = passed ? '#10b981' : '#ef4444';
    scoreDisplay.style.color = '#fff';
  }

  // Update session score badge in header
  const scoreBadge = document.getElementById('translation-score-badge');
  if (scoreBadge) scoreBadge.textContent = `Bài: +${translationSessionPointsEarned}đ`;

  // 3 Feedback Cards
  const vEl = document.getElementById('translation-feedback-verdict');
  const gEl = document.getElementById('translation-feedback-grammar');
  const sEl = document.getElementById('translation-feedback-suggestion');
  const tEl = document.getElementById('translation-feedback-tip');

  if (vEl) vEl.textContent = evalResult.verdict || (passed ? 'Bản dịch tốt!' : 'Cần cải thiện bản dịch.');
  if (gEl) {
    const gText = evalResult.analysis?.grammar || '';
    const errText = evalResult.analysis?.errors && evalResult.analysis?.errors !== 'Không có lỗi đáng kể' ? ` • Lỗi: ${evalResult.analysis.errors}` : '';
    gEl.textContent = `${gText}${errText}`;
  }
  if (sEl) sEl.textContent = `"${evalResult.polishedRewrite || translationCurrentBenchmarkText}"`;
  if (tEl) tEl.textContent = `💡 Mẹo dịch thuật: ${evalResult.tip || 'Luyện tập thường xuyên để nâng cao phản xạ dịch thuật ngữ cảnh.'}`;

  // Reference Benchmark Box
  const refTextEl = document.getElementById('translation-reference-text');
  const speakRefBtn = document.getElementById('btn-translation-speak-ref');
  const q = translationQuestionsList[currentTranslationIndex];

  if (refTextEl) refTextEl.textContent = `"${translationCurrentBenchmarkText}"`;
  if (speakRefBtn) {
    speakRefBtn.style.display = q.task.direction === 'vi_to_en' ? 'flex' : 'none';
  }

  // Handle Mistake Tracking for unpassed questions
  if (!passed && translationCurrentWordRef) {
    translationSessionWrongWords.push(translationCurrentWordRef);
    if (typeof addWordToMistakeList === 'function') {
      addWordToMistakeList(translationCurrentWordRef, 'translation');
    }
  }
}

// =========================================================================
// 9. NAVIGATION & FINISH SESSION
// =========================================================================
function nextTranslationQuestion() {
  if (currentTranslationIndex < translationQuestionsList.length - 1) {
    currentTranslationIndex++;
    renderTranslationCurrentQuestion();
  } else {
    finishTranslationSession();
  }
}
window.nextTranslationQuestion = nextTranslationQuestion;

function finishTranslationSession() {
  translationIsCompleted = true;

  const total = translationQuestionsList.length || 1;
  const done = translationGradedIndices.size;
  const isComp = done >= total && total > 0;

  let res = { finalPts: translationSessionPointsEarned, completionMult: 1.0, deckLengthMult: 1.0, milestoneBonus: 0, combinedMult: 1.0 };
  if (typeof calculateSessionFinalPointsV3 === 'function') {
    res = calculateSessionFinalPointsV3(translationSessionPointsEarned, done, total, isComp);
  } else if (typeof calculateSessionFinalPoints === 'function') {
    res = calculateSessionFinalPoints(translationSessionPointsEarned, done, total, isComp);
  }

  const finalPts = res.finalPts;
  if (finalPts > 0) {
    if (typeof setUserPoints === 'function') setUserPoints(getUserPoints() + finalPts);
    if (typeof addLedgerEntry === 'function') {
      const bonusText = res.milestoneBonus > 0 ? ` + Thưởng mốc ${done} câu (+${res.milestoneBonus} Xu)` : '';
      addLedgerEntry('STUDY_TRANSLATION', finalPts, `Dịch Thuật Song Phương (${done}/${total} câu, x${res.combinedMult}${bonusText})`);
    }
    if (typeof recordStudyFlowAction === 'function') {
      recordStudyFlowAction('translation');
    }
    if (typeof saveDatabase === 'function') saveDatabase(true);
    if (typeof pushCurrentDatabaseToCloud === 'function') pushCurrentDatabaseToCloud();
  }

  // Duration
  const durationSec = translationStartTime > 0 ? Math.max(1, Math.floor((Date.now() - translationStartTime) / 1000)) : 0;
  const mins = Math.floor(durationSec / 60);
  const secs = durationSec % 60;
  const durationStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  if (done > 0 && typeof addDailyStudySeconds === 'function') {
    addDailyStudySeconds(durationSec, 'translation');
  }

  // Calculate Average Accuracy Score & Pass Rate
  let avgScore = 0;
  if (translationSessionScores.length > 0) {
    const sum = translationSessionScores.reduce((a, b) => a + b, 0);
    avgScore = Math.round(sum / translationSessionScores.length);
  }
  const passedCount = translationSessionScores.filter(s => s >= translationFloorScore).length;
  const floorRatioPct = total > 0 ? Math.round((passedCount / total) * 100) : 0;

  // Populate 5-Tile Stats Dashboard
  const floorRatioEl = document.getElementById('translation-res-floor-ratio');
  const pointsEl = document.getElementById('translation-res-points');
  const avgScoreEl = document.getElementById('translation-res-avg-score');
  const hintsSkipsEl = document.getElementById('translation-res-hints-skips');
  const durationEl = document.getElementById('translation-res-duration');
  const diffBadgeEl = document.getElementById('translation-res-difficulty-badge');

  if (floorRatioEl) floorRatioEl.textContent = `${passedCount}/${total} (${floorRatioPct}%)`;
  if (pointsEl) pointsEl.textContent = `+${finalPts} VoCoin`;
  if (avgScoreEl) avgScoreEl.textContent = `${avgScore} / 100`;
  if (hintsSkipsEl) hintsSkipsEl.textContent = `${translationHintsUsedTotal} gợi ý • ${translationSkipsUsedTotal} skip`;
  if (durationEl) durationEl.textContent = durationStr;

  const cfg = getTranslationDifficultyConfig(currentTranslationDifficulty);
  const dirLabel = currentTranslationDirection === 'en_to_vi' ? '🇬🇧 ➔ 🇻🇳' : '🇻🇳 ➔ 🇬🇧';
  if (diffBadgeEl) diffBadgeEl.textContent = `🌐 Chiều: ${dirLabel} • ${cfg.label} (x${translationDiffMult})`;

  // Bonus breakdown pill
  const bonusBox = document.getElementById('translation-res-bonus-box');
  if (bonusBox) {
    if (res.completionMult > 1.0 || res.deckLengthMult > 1.0 || res.milestoneBonus > 0) {
      bonusBox.style.display = 'block';
      bonusBox.innerHTML = `✨ Hệ số hoàn thành: <strong>x${res.completionMult}</strong> • Quy mô: <strong>x${res.deckLengthMult}</strong>${res.milestoneBonus > 0 ? ` • Thưởng mốc: <strong>+${res.milestoneBonus} Xu</strong>` : ''}`;
    } else {
      bonusBox.style.display = 'none';
    }
  }

  // Unpassed / Wrong words retry banner
  const wrongWordsUnique = [];
  const seen = new Set();
  translationSessionWrongWords.forEach(w => {
    if (!w) return;
    const k = (w.id || w.term || '').toLowerCase();
    if (k && !seen.has(k)) {
      seen.add(k);
      wrongWordsUnique.push(w);
    }
  });

  const wrongBanner = document.getElementById('translation-res-wrong-banner');
  const wrongCountEl = document.getElementById('translation-res-wrong-count');
  const retryBtn = document.getElementById('translation-btn-retry-wrong');

  if (wrongWordsUnique.length > 0) {
    if (wrongBanner) wrongBanner.style.display = 'block';
    if (wrongCountEl) wrongCountEl.textContent = `❌ Từ chưa đạt chuẩn: ${wrongWordsUnique.length} từ`;
    if (retryBtn) retryBtn.textContent = `🔄 Luyện Lại Riêng ${wrongWordsUnique.length} từ chưa đạt sàn`;
  } else {
    if (wrongBanner) wrongBanner.style.display = 'none';
  }

  if (typeof playVocaSfx === 'function') {
    playVocaSfx('fireworks');
  }
  openModal('modal-translation-result');
}
window.finishTranslationSession = finishTranslationSession;

function closeTranslationResultModal() {
  if (typeof stopVocaSfx === 'function') {
    stopVocaSfx('fireworks');
  } else if (typeof sfxAudio !== 'undefined' && sfxAudio) {
    try { sfxAudio.pause(); sfxAudio.currentTime = 0; } catch (e) {}
  }
  closeModal('modal-translation-result');
}
window.closeTranslationResultModal = closeTranslationResultModal;

function retryTranslationWrongWordsOnly() {
  const wrongWordsUnique = [];
  const seen = new Set();
  translationSessionWrongWords.forEach(w => {
    if (!w) return;
    const k = (w.id || w.term || '').toLowerCase();
    if (k && !seen.has(k)) {
      seen.add(k);
      wrongWordsUnique.push(w);
    }
  });

  closeTranslationResultModal();
  if (wrongWordsUnique.length > 0) {
    startTranslationMode(false, wrongWordsUnique, true);
  } else {
    if (typeof showToast === 'function') showToast('🎉 Không có từ nào bị sai để luyện lại!');
  }
}
window.retryTranslationWrongWordsOnly = retryTranslationWrongWordsOnly;

function restartCurrentTranslationSession() {
  closeTranslationResultModal();
  const originalWords = translationQuestionsList.map(q => q.mainWord);
  startTranslationMode(false, originalWords, true);
}
window.restartCurrentTranslationSession = restartCurrentTranslationSession;

// =========================================================================
// 10. EARLY EXIT & STATE MANAGEMENT
// =========================================================================
function exitTranslationMode(force = false) {
  if (translationIsCompleted || force) {
    if (studySourceContext === 'review-queue' || !currentDeckId) {
      showScreen('screen-decks');
      if (typeof refreshActiveScreenData === 'function') refreshActiveScreenData();
    } else {
      showScreen('screen-deck-detail');
      if (typeof refreshActiveScreenData === 'function') refreshActiveScreenData();
    }
    return;
  }

  const total = translationQuestionsList.length || 1;
  const done = translationGradedIndices.size;

  if (done > 0 && done < total) {
    if (typeof openStudyExitConfirmModal === 'function') {
      openStudyExitConfirmModal({
        mode: 'translation',
        modeLabel: 'Dịch Thuật Song Phương (VIP β)',
        completedCount: done,
        totalCount: total,
        currentPointsEarned: translationSessionPointsEarned,
        onConfirmExit: () => {
          exitTranslationMode(true);
        }
      });
      return;
    }
  }

  exitTranslationMode(true);
}
window.exitTranslationMode = exitTranslationMode;
