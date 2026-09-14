// =========================================================================
// VOCAFLOW 06C-WRITING-ENGINE.JS (v0.10.10-8 - SENTENCE WRITING LAB β)
// AI-Powered Writing Lab with Thematic Word Linking & Band 8.0+ Native Polish
// =========================================================================

let writingQuestionsList = [];
let currentWritingIndex = 0;
let currentWritingDifficulty = localStorage.getItem('vocaflow_writing_difficulty') || 'easy';
let selectedWritingSetupDifficulty = 'easy';
let writingSetupQuestionCount = 'all'; // 5 | 10 | 'all'
let writingSetupUseSelection = false;
let writingSetupCustomWordList = null;

let writingSessionPointsEarned = 0;
let writingSessionWrongWords = [];
let writingGradedQuestionIds = new Set();
let writingHintsLeft = 5;
let writingSkipsLeft = 3;
let writingStartTime = 0;
let writingActiveTimeMs = 0;
let writingIsCompleted = false;
let writingPolishedSentence = '';
let writingIsEvaluating = false;

// =========================================================================
// 1. DIFFICULTY CONFIG & REWARDS ENGINE (BALANCE_V2)
// =========================================================================
function getWritingDifficultyConfig(diff) {
  if (diff === 'hard') {
    return {
      floorScore: 90,
      diffMult: 2.8,
      wordsCount: [2, 4],
      minLen: 15,
      maxLen: 35,
      baseXuRange: [55, 90],
      masteryBonus: 22,
      label: '🔴 Khó'
    };
  }
  if (diff === 'medium') {
    return {
      floorScore: 80,
      diffMult: 1.8,
      wordsCount: [2, 3],
      minLen: 0,
      maxLen: 0,
      baseXuRange: [25, 45],
      masteryBonus: 14,
      label: '🟡 Trung Bình'
    };
  }
  return {
    floorScore: 70,
    diffMult: 1.0,
    wordsCount: [1, 1],
    minLen: 0,
    maxLen: 0,
    baseXuRange: [8, 16],
    masteryBonus: 8,
    label: '🟢 Dễ'
  };
}

// =========================================================================
// 2. SETUP MODAL HANDLERS
// =========================================================================
function selectWritingSetupDifficulty(diff) {
  if (diff !== 'easy' && (!currentUser || !currentUser.email)) {
    alert('🔒 Cấp độ Trung Bình và Khó yêu cầu đăng nhập tài khoản để mở khóa!');
    if (typeof openAuthModal === 'function') openAuthModal('login');
    return;
  }
  selectedWritingSetupDifficulty = diff;
  ['easy', 'medium', 'hard'].forEach(d => {
    const card = document.getElementById('writing-diff-card-' + d);
    if (card) {
      if (d === diff) {
        const colors = { easy: '#10b981', medium: '#f59e0b', hard: '#ef4444' };
        card.style.borderColor = colors[d];
      } else {
        card.style.borderColor = 'var(--border)';
      }
    }
  });
}

function selectWritingSetupQuestionCount(count) {
  writingSetupQuestionCount = count;
  ['5', '10', 'all'].forEach(c => {
    const btn = document.getElementById('writing-qc-' + c);
    if (btn) {
      if (String(c) === String(count)) {
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
}

function openWritingSetupModal(useSelection = false, customWordList = null) {
  writingSetupUseSelection = useSelection;
  writingSetupCustomWordList = customWordList;
  selectedWritingSetupDifficulty = currentWritingDifficulty;

  selectWritingSetupDifficulty(selectedWritingSetupDifficulty);
  selectWritingSetupQuestionCount(writingSetupQuestionCount);

  const shuffleCb = document.getElementById('writing-setup-shuffle-checkbox');
  if (shuffleCb) shuffleCb.checked = isStudyShuffle;

  let wordCount = 0;
  if (customWordList) wordCount = customWordList.length;
  else if (useSelection && selectedWordIds.size > 0) wordCount = selectedWordIds.size;
  else wordCount = words.filter(w => w.deckId === currentDeckId).length;

  const sub = document.getElementById('writing-setup-subtitle');
  if (sub) sub.textContent = `${wordCount} từ vựng sẵn sàng cho phiên luyện viết`;

  openModal('modal-writing-setup');
}

function confirmStartWritingFromModal() {
  currentWritingDifficulty = selectedWritingSetupDifficulty;
  localStorage.setItem('vocaflow_writing_difficulty', currentWritingDifficulty);

  const shuffleCb = document.getElementById('writing-setup-shuffle-checkbox');
  if (shuffleCb) {
    isStudyShuffle = shuffleCb.checked;
    localStorage.setItem('vocaflow_study_shuffle', isStudyShuffle ? 'true' : 'false');
  }

  closeModal('modal-writing-setup');
  startWritingMode(writingSetupUseSelection, writingSetupCustomWordList);
}

// =========================================================================
// 3. THEMATIC CLUSTERING ALGORITHM
// =========================================================================
function buildThematicWordClusters(targetWords, diff, maxQuestions) {
  const cfg = getWritingDifficultyConfig(diff);
  const questions = [];
  const pool = [...targetWords];

  if (isStudyShuffle) {
    pool.sort(() => Math.random() - 0.5);
  }

  let limit = pool.length;
  if (maxQuestions === 5) limit = Math.min(5, pool.length);
  else if (maxQuestions === 10) limit = Math.min(10, pool.length);

  for (let i = 0; i < limit; i++) {
    const primary = pool[i];
    if (!primary) continue;

    let cluster = [primary];

    if (diff === 'medium' || diff === 'hard') {
      const requiredCount = diff === 'medium' ? (Math.random() > 0.5 ? 3 : 2) : (Math.random() > 0.4 ? 3 : 2);
      
      // Look for candidate partners in the deck
      const candidates = pool.filter(w => w.id !== primary.id && !cluster.some(c => c.id === w.id));
      
      // Heuristic: matching partOfSpeech context or similar tags
      const sortedCandidates = candidates.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;
        if (a.partOfSpeech && primary.partOfSpeech && a.partOfSpeech !== primary.partOfSpeech) scoreA += 2; // mix noun + verb
        if (b.partOfSpeech && primary.partOfSpeech && b.partOfSpeech !== primary.partOfSpeech) scoreB += 2;
        if (a.cefrLevel === primary.cefrLevel) scoreA += 1;
        if (b.cefrLevel === primary.cefrLevel) scoreB += 1;
        return scoreB - scoreA;
      });

      for (const cand of sortedCandidates) {
        if (cluster.length >= requiredCount) break;
        cluster.push(cand);
      }

      // If deck doesn't have enough words, supplement algorithmic context words
      while (cluster.length < requiredCount) {
        const fallbacks = [
          { term: 'effectively', phonetic: '/ɪˈfektɪvli/', definitionVi: 'một cách hiệu quả', partOfSpeech: 'adverb', isDeckWord: false },
          { term: 'crucial', phonetic: '/ˈkruːʃl/', definitionVi: 'quan trọng, thiết yếu', partOfSpeech: 'adjective', isDeckWord: false },
          { term: 'opportunity', phonetic: '/ˌɒpəˈtjuːnəti/', definitionVi: 'cơ hội', partOfSpeech: 'noun', isDeckWord: false },
          { term: 'improve', phonetic: '/ɪmˈpruːv/', definitionVi: 'cải thiện, nâng cao', partOfSpeech: 'verb', isDeckWord: false },
          { term: 'perspective', phonetic: '/pəˈspektɪv/', definitionVi: 'góc nhìn, quan điểm', partOfSpeech: 'noun', isDeckWord: false }
        ];
        const extra = fallbacks.find(f => !cluster.some(c => c.term.toLowerCase() === f.term.toLowerCase())) || fallbacks[0];
        cluster.push({ ...extra, id: 'extra_' + Date.now() + '_' + Math.random() });
      }
    }

    questions.push({
      id: 'wq_' + i + '_' + Date.now(),
      primaryWord: primary,
      targetWords: cluster,
      difficulty: diff,
      minWords: cfg.minLen,
      maxWords: cfg.maxLen,
      floorScore: cfg.floorScore,
      userSentence: '',
      evaluated: false,
      evalData: null,
      status: 'pending'
    });
  }

  return questions;
}

// =========================================================================
// 4. START & RENDER WRITING SESSION
// =========================================================================
function startWritingMode(fromSelection = false, customWordList = null) {
  if (!currentDeckId && !customWordList) return;
  const deck = decks.find(d => d.id === currentDeckId);
  if (!deck && !customWordList) return;

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
    alert('Bộ từ này chưa có từ vựng nào để luyện viết câu!');
    return;
  }

  writingQuestionsList = buildThematicWordClusters(targetWords, currentWritingDifficulty, writingSetupQuestionCount);
  if (writingQuestionsList.length === 0) {
    alert('Không thể tạo câu hỏi luyện viết. Vui lòng kiểm tra lại bộ từ!');
    return;
  }

  currentWritingIndex = 0;
  writingSessionPointsEarned = 0;
  writingSessionWrongWords = [];
  writingGradedQuestionIds.clear();
  writingHintsLeft = 5;
  writingSkipsLeft = 3;
  writingStartTime = Date.now();
  writingIsCompleted = false;
  writingPolishedSentence = '';

  const scoreBadge = document.getElementById('writing-score-badge');
  if (scoreBadge) scoreBadge.textContent = 'Bài: +0đ';

  updateWritingDifficultyBadge();
  showScreen('screen-writing');
  renderWritingCurrentQuestion();
}

function updateWritingDifficultyBadge() {
  const badge = document.getElementById('writing-difficulty-badge');
  if (!badge) return;
  const cfg = getWritingDifficultyConfig(currentWritingDifficulty);
  badge.textContent = `${cfg.label} (x${cfg.diffMult})`;
  badge.title = `Cấp độ: ${currentWritingDifficulty} • Điểm sàn: ${cfg.floorScore} • Hệ số: x${cfg.diffMult}`;
}

function resetWritingQuestionUI() {
  const inputEl = document.getElementById('writing-sentence-input');
  if (inputEl) {
    inputEl.value = '';
    inputEl.disabled = false;
  }

  const hintBox = document.getElementById('writing-hint-box');
  if (hintBox) {
    hintBox.style.display = 'none';
    hintBox.innerHTML = '';
  }

  const resultPanel = document.getElementById('writing-result-panel');
  const aiLoading = document.getElementById('writing-ai-loading');
  const aiContent = document.getElementById('writing-ai-content');
  const submitBtn = document.getElementById('btn-writing-submit');
  const nextBtn = document.getElementById('btn-writing-next');
  const floorBanner = document.getElementById('writing-floor-banner');
  const failBanner = document.getElementById('writing-fail-banner');
  const rewardCont = document.getElementById('writing-reward-container');

  if (resultPanel) resultPanel.style.display = 'none';
  if (aiLoading) aiLoading.style.display = 'none';
  if (aiContent) aiContent.style.display = 'none';
  if (floorBanner) floorBanner.style.display = 'none';
  if (failBanner) failBanner.style.display = 'none';
  if (rewardCont) rewardCont.style.display = 'none';

  if (submitBtn) {
    submitBtn.style.display = 'flex';
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>🧠 Chấm Điểm AI</span>';
  }
  if (nextBtn) nextBtn.style.display = 'none';

  handleWritingInput('');
}

function renderWritingCurrentQuestion() {
  if (writingQuestionsList.length === 0) return;
  const q = writingQuestionsList[currentWritingIndex];
  if (!q) return;

  resetWritingQuestionUI();

  const counterEl = document.getElementById('writing-counter');
  if (counterEl) counterEl.textContent = `Câu ${currentWritingIndex + 1} / ${writingQuestionsList.length}`;

  // Render Target Words Chips
  const wordsListEl = document.getElementById('writing-target-words-list');
  if (wordsListEl) {
    wordsListEl.innerHTML = q.targetWords.map((w, idx) => `
      <div class="writing-target-chip" id="target-chip-${idx}" style="background: var(--surface-elevated); border: 1.5px solid var(--border); border-radius: 12px; padding: 8px 12px; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
        <span style="font-size: 16px;">🔤</span>
        <div>
          <div style="font-weight: 800; font-size: 14px; color: #fbbf24;">${escapeHtml(w.term || '')}</div>
          <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(w.phonetic || '')} • <em>${escapeHtml(w.definitionVi || w.definition || '')}</em></div>
        </div>
      </div>
    `).join('');
  }

  // Render Requirement Banner
  const reqText = document.getElementById('writing-requirement-text');
  const reqBadge = document.getElementById('writing-target-length-badge');

  if (q.difficulty === 'hard') {
    if (reqText) reqText.innerHTML = `💡 Hãy viết đoạn ngắn kết hợp <strong>${q.targetWords.length} từ</strong> trên và độ dài từ <strong>${q.minWords} - ${q.maxWords} từ</strong>.`;
    if (reqBadge) {
      reqBadge.textContent = `${q.minWords} - ${q.maxWords} từ`;
      reqBadge.style.background = 'rgba(239, 68, 68, 0.15)';
      reqBadge.style.color = '#f87171';
    }
  } else if (q.difficulty === 'medium') {
    if (reqText) reqText.innerHTML = `💡 Hãy viết 1 câu hoàn chỉnh kết hợp cả <strong>${q.targetWords.length} từ</strong> vựng trên một cách tự nhiên.`;
    if (reqBadge) {
      reqBadge.textContent = 'Tự do độ dài';
      reqBadge.style.background = 'rgba(245, 158, 11, 0.15)';
      reqBadge.style.color = '#fbbf24';
    }
  } else {
    if (reqText) reqText.innerHTML = `💡 Hãy viết 1 câu hoàn chỉnh có nghĩa bằng tiếng Anh chứa từ <strong>"${escapeHtml(q.targetWords[0]?.term || '')}"</strong>.`;
    if (reqBadge) {
      reqBadge.textContent = 'Tự do độ dài';
      reqBadge.style.background = 'rgba(16, 185, 129, 0.15)';
      reqBadge.style.color = '#34d399';
    }
  }

  // Update Skip button
  const skipBtn = document.getElementById('btn-writing-skip');
  if (skipBtn) skipBtn.textContent = `⏭️ VocaSkip (${writingSkipsLeft})`;

  // Update Hints count
  const hintCountEl = document.getElementById('writing-hints-count');
  if (hintCountEl) hintCountEl.textContent = writingHintsLeft;

  // Auto focus textarea
  setTimeout(() => {
    const inputEl = document.getElementById('writing-sentence-input');
    if (inputEl) inputEl.focus();
  }, 100);
}

// =========================================================================
// 5. LIVE WORD COUNTER & CHIP HIGHLIGHTING
// =========================================================================
function handleWritingInput(text) {
  const clean = text || '';
  const wordsArr = clean.trim().split(/\s+/).filter(Boolean);
  const wordCount = wordsArr.length;
  const charCount = clean.length;

  const wNumEl = document.getElementById('writing-word-count-num');
  const cNumEl = document.getElementById('writing-char-count-num');
  const statusBadge = document.getElementById('writing-count-status-badge');

  if (wNumEl) wNumEl.textContent = wordCount;
  if (cNumEl) cNumEl.textContent = charCount;

  const q = writingQuestionsList[currentWritingIndex];
  if (q && q.difficulty === 'hard' && statusBadge) {
    statusBadge.style.display = 'inline-block';
    if (wordCount < q.minWords) {
      statusBadge.textContent = `Thiếu ${q.minWords - wordCount} từ`;
      statusBadge.style.background = 'rgba(245, 158, 11, 0.15)';
      statusBadge.style.color = '#fbbf24';
    } else if (wordCount > q.maxWords) {
      statusBadge.textContent = `Vượt quá ${wordCount - q.maxWords} từ`;
      statusBadge.style.background = 'rgba(239, 68, 68, 0.15)';
      statusBadge.style.color = '#f87171';
    } else {
      statusBadge.textContent = '✓ Đạt chuẩn độ dài';
      statusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
      statusBadge.style.color = '#34d399';
    }
  } else if (statusBadge) {
    statusBadge.style.display = 'none';
  }

  // Highlight matched target words in chips
  if (q && q.targetWords) {
    const lowerText = clean.toLowerCase();
    q.targetWords.forEach((tw, idx) => {
      const chip = document.getElementById('target-chip-' + idx);
      if (!chip) return;
      const termLower = (tw.term || '').toLowerCase().trim();
      const isPresent = lowerText.includes(termLower);
      if (isPresent) {
        chip.style.borderColor = '#10b981';
        chip.style.background = 'rgba(16, 185, 129, 0.12)';
      } else {
        chip.style.borderColor = 'var(--border)';
        chip.style.background = 'var(--surface-elevated)';
      }
    });
  }
}

// =========================================================================
// 6. GEMINI AI WRITING EVALUATION ENGINE
// =========================================================================
async function submitWritingEvaluation() {
  if (writingIsEvaluating) return;

  const inputEl = document.getElementById('writing-sentence-input');
  const userSentence = (inputEl ? inputEl.value : '').trim();

  if (!userSentence || userSentence.length < 3) {
    showToast('⚠️ Vui lòng viết ít nhất 1 câu hoàn chỉnh trước khi gửi chấm điểm!');
    return;
  }

  const q = writingQuestionsList[currentWritingIndex];
  if (!q) return;

  q.userSentence = userSentence;
  writingIsEvaluating = true;

  const resultPanel = document.getElementById('writing-result-panel');
  const aiLoading = document.getElementById('writing-ai-loading');
  const aiContent = document.getElementById('writing-ai-content');
  const submitBtn = document.getElementById('btn-writing-submit');

  if (resultPanel) resultPanel.style.display = 'block';
  if (aiLoading) aiLoading.style.display = 'block';
  if (aiContent) aiContent.style.display = 'none';
  if (submitBtn) submitBtn.disabled = true;

  await evaluateWritingSentenceWithGemini(userSentence, q);
}

async function evaluateWritingSentenceWithGemini(userSentence, question) {
  const targetTerms = question.targetWords.map(w => w.term).join(', ');
  const wordDetails = question.targetWords.map(w => `${w.term} (${w.partOfSpeech || 'word'}): ${w.definitionVi || w.definition || ''}`).join('\n');
  const cfg = getWritingDifficultyConfig(question.difficulty);

  const prompt = `You are an elite IELTS Writing Examiner and Native English Stylist (Band 8.5+).
Evaluate the following student sentence written for a vocabulary mastery challenge.

[TASK REQUIREMENTS]
- Target words MUST be used: [${targetTerms}]
- Vocabulary details:
${wordDetails}
- Difficulty Level: ${question.difficulty.toUpperCase()} (Floor score: ${cfg.floorScore}/100)
- Word count constraints: ${question.minWords > 0 ? `${question.minWords} to ${question.maxWords} words` : 'No strict word count constraint'}

[STUDENT SENTENCE]
"${userSentence}"

Evaluate thoroughly across 4 Pillars:
1. Grammar & Syntax (0-100)
2. Vocabulary & Collocations (Proper usage of target words: ${targetTerms})
3. Naturalness & Coherence (Native phrasing, flow, punctuation)
4. Length & Task Compliance (Complied with target words and length)

Output MUST be valid JSON only (no markdown quotes, no triple backticks) matching this structure:
{
  "score": 85,
  "verdict": "Rất tự nhiên / Chuẩn xác / Khá tốt / Cần trau chuốt",
  "pillars": {
    "grammar": { "status": "pass", "note": "Ngữ pháp chuẩn, thì câu chính xác" },
    "vocabulary": { "status": "pass", "note": "Sử dụng từ vựng đúng ngữ cảnh và chuẩn collocations" },
    "naturalness": { "status": "pass", "note": "Cách diễn đạt tự nhiên, mạch lạc" },
    "length": { "status": "pass", "note": "Độ dài câu hợp lý và đáp ứng yêu cầu" }
  },
  "polishedRewrite": "A refined Band 8.5+ native rewrite of the student's thought using the target words gracefully.",
  "feedbackVi": "Chi tiết nhận xét hành văn bằng tiếng Việt (khen điểm tốt, chỉ ra chỗ có thể nâng cấp từ vựng hoặc cấu trúc).",
  "grammarNotesVi": "Ghi chú cấu trúc ngữ pháp quan trọng hoặc sửa lỗi sai nếu có.",
  "targetWordsComplied": true
}`;

  let evalSuccess = false;
  let evalData = null;

  try {
    const keys = typeof getStoredApiKeys === 'function' ? getStoredApiKeys() : [];
    const modelsToTry = typeof getGeminiModelsForTier === 'function' ? getGeminiModelsForTier('deep') : ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-2.0-flash', 'gemini-3.5-flash-lite'];

    for (const k of keys) {
      if (evalSuccess) break;
      for (const m of modelsToTry) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k.trim()}`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 16000);

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
              evalData = JSON.parse(rawText.replace(/```json/gi, '').replace(/```/gi, '').trim());
              if (typeof saveWorkingGeminiModel === 'function') {
                saveWorkingGeminiModel(m, 'deep');
              }
              evalSuccess = true;
              break;
            }
          }
        } catch (e) {
          console.warn(`Gemini writing eval failed with model ${m}:`, e);
        }
      }
    }
  } catch (err) {
    console.error('Gemini Writing Evaluation outer error:', err);
  }

  // Fallback heuristic if API failed or offline
  if (!evalSuccess || !evalData) {
    evalData = generateOfflineWritingEvaluation(userSentence, question);
  }

  renderWritingEvaluationResult(evalData, question);
}

// Offline fallback evaluation engine
function generateOfflineWritingEvaluation(userSentence, question) {
  const wordsArr = userSentence.trim().split(/\s+/).filter(Boolean);
  const wordCount = wordsArr.length;
  const lowerSentence = userSentence.toLowerCase();

  let targetUsedCount = 0;
  question.targetWords.forEach(tw => {
    if (lowerSentence.includes((tw.term || '').toLowerCase().trim())) {
      targetUsedCount++;
    }
  });

  const hasCapital = /^[A-Z]/.test(userSentence.trim());
  const hasPunctuation = /[.!?]$/.test(userSentence.trim());
  const targetComplied = targetUsedCount === question.targetWords.length;

  let baseScore = 75;
  if (targetComplied) baseScore += 15;
  else baseScore -= 20;

  if (hasCapital && hasPunctuation) baseScore += 10;
  if (wordCount >= 5) baseScore += 5;

  baseScore = Math.max(30, Math.min(95, baseScore));

  const polished = `Naturally speaking, ${userSentence.replace(/[.!?]$/, '')}, which effectively illustrates the mastery of the target vocabulary.`;

  return {
    score: baseScore,
    verdict: baseScore >= 80 ? 'Khá tốt!' : 'Cần hoàn thiện',
    pillars: {
      grammar: { status: hasCapital && hasPunctuation ? 'pass' : 'warning', note: hasCapital && hasPunctuation ? 'Cấu trúc câu hoàn chỉnh' : 'Cần chú ý viết hoa đầu câu và dấu chấm câu' },
      vocabulary: { status: targetComplied ? 'pass' : 'fail', note: targetComplied ? 'Đã sử dụng đủ từ vựng yêu cầu' : 'Chưa sử dụng đầy đủ các từ vựng bắt buộc' },
      naturalness: { status: 'pass', note: 'Hành văn tương đối tự nhiên' },
      length: { status: 'pass', note: `${wordCount} từ` }
    },
    polishedRewrite: polished,
    feedbackVi: targetComplied ? 'Bạn đã áp dụng thành công các từ vựng mục tiêu vào ngữ cảnh câu hoàn chỉnh.' : 'Hãy đảm bảo gõ đúng chính tả và đưa đầy đủ các từ vựng mục tiêu vào trong câu nhé!',
    grammarNotesVi: 'Chú ý kết hợp liên từ (e.g. although, because, therefore) để câu văn mạch lạc và đạt điểm cao hơn.',
    targetWordsComplied: targetComplied
  };
}

// =========================================================================
// 7. RENDER EVALUATION RESULT & SETTLEMENT
// =========================================================================
function renderWritingEvaluationResult(evalData, question) {
  writingIsEvaluating = false;
  question.evaluated = true;
  question.evalData = evalData;

  const aiLoading = document.getElementById('writing-ai-loading');
  const aiContent = document.getElementById('writing-ai-content');
  const submitBtn = document.getElementById('btn-writing-submit');
  const nextBtn = document.getElementById('btn-writing-next');

  if (aiLoading) aiLoading.style.display = 'none';
  if (aiContent) aiContent.style.display = 'block';
  if (submitBtn) submitBtn.style.display = 'none';
  if (nextBtn) nextBtn.style.display = 'flex';

  const score = Math.max(0, Math.min(100, parseInt(evalData.score) || 0));
  const cfg = getWritingDifficultyConfig(question.difficulty);
  const floorScore = cfg.floorScore;
  const isPassed = score >= floorScore;

  // Render Score Circle & Verdict
  const scoreNumEl = document.getElementById('writing-score-num');
  const scoreCircle = document.getElementById('writing-score-circle');
  const verdictText = document.getElementById('writing-verdict-text');
  const floorLabel = document.getElementById('writing-floor-label');

  if (scoreNumEl) scoreNumEl.textContent = score;
  if (floorLabel) floorLabel.textContent = `${floorScore}đ`;

  if (scoreCircle) {
    if (score >= 85) {
      scoreCircle.style.background = '#10b981';
      scoreCircle.style.boxShadow = '0 4px 14px rgba(16,185,129,0.35)';
    } else if (score >= floorScore) {
      scoreCircle.style.background = '#f59e0b';
      scoreCircle.style.boxShadow = '0 4px 14px rgba(245,158,11,0.35)';
    } else {
      scoreCircle.style.background = '#ef4444';
      scoreCircle.style.boxShadow = '0 4px 14px rgba(239,68,68,0.35)';
    }
  }

  if (verdictText) {
    verdictText.textContent = evalData.verdict || (isPassed ? 'Đạt chuẩn!' : 'Chưa đạt điểm sàn');
    verdictText.style.color = isPassed ? '#34d399' : '#f87171';
  }

  // Render 4 Pillar Badges
  const renderPillar = (id, label, icon, pillarObj) => {
    const el = document.getElementById(id);
    if (!el) return;
    const st = pillarObj?.status || 'pass';
    if (st === 'pass') {
      el.style.background = 'rgba(16, 185, 129, 0.15)';
      el.style.color = '#34d399';
      el.textContent = `${icon} ${label}: Chuẩn`;
    } else if (st === 'warning') {
      el.style.background = 'rgba(245, 158, 11, 0.15)';
      el.style.color = '#fbbf24';
      el.textContent = `${icon} ${label}: Khá`;
    } else {
      el.style.background = 'rgba(239, 68, 68, 0.15)';
      el.style.color = '#f87171';
      el.textContent = `${icon} ${label}: Cần sửa`;
    }
    el.title = `${label}: ${pillarObj?.note || ''}`;
  };

  renderPillar('writing-pillar-grammar', 'Ngữ pháp', '🎯', evalData.pillars?.grammar);
  renderPillar('writing-pillar-vocab', 'Dùng từ', '🔤', evalData.pillars?.vocabulary);
  renderPillar('writing-pillar-naturalness', 'Mạch lạc', '🌟', evalData.pillars?.naturalness);
  renderPillar('writing-pillar-length', 'Độ dài', '📏', evalData.pillars?.length);

  // Render Polished Rewrite
  writingPolishedSentence = evalData.polishedRewrite || '';
  const polishedTextEl = document.getElementById('writing-polished-text');
  if (polishedTextEl) {
    polishedTextEl.textContent = `"${writingPolishedSentence}"`;
  }

  // Render Feedback & Grammar notes
  const feedbackEl = document.getElementById('writing-feedback-text');
  if (feedbackEl) feedbackEl.innerHTML = escapeHtml(evalData.feedbackVi || 'Câu viết tốt, áp dụng đúng ngữ pháp.');

  const grammarNotesEl = document.getElementById('writing-grammar-notes');
  if (grammarNotesEl) {
    if (evalData.grammarNotesVi) {
      grammarNotesEl.style.display = 'block';
      grammarNotesEl.innerHTML = `<strong>💡 Ghi chú ngữ pháp:</strong> ${escapeHtml(evalData.grammarNotesVi)}`;
    } else {
      grammarNotesEl.style.display = 'none';
    }
  }

  // Economic Settlement & Mistake List Sync
  const floorBanner = document.getElementById('writing-floor-banner');
  const failBanner = document.getElementById('writing-fail-banner');
  const rewardCont = document.getElementById('writing-reward-container');

  if (isPassed) {
    question.status = 'passed';
    const [minXu, maxXu] = cfg.baseXuRange;
    const scoreFactor = score / 100;
    const earnedXu = Math.round((minXu + (maxXu - minXu) * scoreFactor) * cfg.diffMult);

    writingSessionPointsEarned += earnedXu;
    const scoreBadge = document.getElementById('writing-score-badge');
    if (scoreBadge) scoreBadge.textContent = `Bài: +${writingSessionPointsEarned}đ`;

    // Update mastery & clear mistake list for deck words
    question.targetWords.forEach(w => {
      if (w.id && !w.id.startsWith('extra_')) {
        if (typeof updateWordMasteryScore === 'function') updateWordMasteryScore(w, cfg.masteryBonus);
        if (typeof removeWordFromMistakeList === 'function') removeWordFromMistakeList(w, true);
      }
    });

    if (floorBanner) {
      floorBanner.style.display = 'block';
      floorBanner.innerHTML = `<div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 12px; padding: 10px 14px; text-align: center; font-size: 12.5px; color: #34d399; font-weight: 700;">🎉 Đạt điểm sàn (${score}đ >= ${floorScore}đ) • +${earnedXu} VoCoin • +${cfg.masteryBonus}% Thuộc từ</div>`;
    }

    if (rewardCont) {
      rewardCont.style.display = 'flex';
      rewardCont.innerHTML = `<span class="badge" style="font-size: 13px; font-weight: 800; padding: 7px 18px; border-radius: 20px; background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4);">💰 +${earnedXu} VoCoin • 📈 +${cfg.masteryBonus}% Mastery</span>`;
    }

    if (typeof playVocaSfx === 'function') playVocaSfx('success');

  } else {
    question.status = 'failed';
    const penalty = -Math.round(10 * cfg.diffMult);
    writingSessionPointsEarned += penalty;

    const scoreBadge = document.getElementById('writing-score-badge');
    if (scoreBadge) scoreBadge.textContent = `Bài: ${writingSessionPointsEarned}đ`;

    // Add unpassed words to mistake list & session wrong list
    question.targetWords.forEach(w => {
      if (w.id && !w.id.startsWith('extra_')) {
        if (typeof updateWordMasteryScore === 'function') updateWordMasteryScore(w, -5);
        if (typeof addWordToMistakeList === 'function') addWordToMistakeList(w, 'writing');
        if (!writingSessionWrongWords.some(sw => sw.id === w.id)) {
          writingSessionWrongWords.push(w);
        }
      }
    });

    if (failBanner) {
      failBanner.style.display = 'block';
      failBanner.innerHTML = `<div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 12px; padding: 10px 14px; text-align: center; font-size: 12.5px; color: #f87171; font-weight: 700;">⚠️ Chưa đạt điểm sàn (${score}đ < ${floorScore}đ) → Đã lưu từ vào Sổ từ sai • ${penalty} VoCoin</div>`;
    }

    if (rewardCont) {
      rewardCont.style.display = 'flex';
      rewardCont.innerHTML = `<span class="badge" style="font-size: 13px; font-weight: 800; padding: 7px 18px; border-radius: 20px; background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4);">💸 ${penalty} VoCoin • 📉 -5% Thuộc từ</span>`;
    }

    if (typeof playVocaSfx === 'function') playVocaSfx('wrong');
  }
}

// =========================================================================
// 8. VOCAHINT, VOCASKIP & AUDIO PLAYBACK
// =========================================================================
function useWritingHint() {
  const q = writingQuestionsList[currentWritingIndex];
  if (!q) return;

  if (writingHintsLeft <= 0) {
    showToast('⚠️ Bạn đã dùng hết lượt gợi ý VocaHint cho phiên này!');
    return;
  }

  writingHintsLeft--;
  const hintCountEl = document.getElementById('writing-hints-count');
  if (hintCountEl) hintCountEl.textContent = writingHintsLeft;

  const hintBox = document.getElementById('writing-hint-box');
  if (hintBox) {
    hintBox.style.display = 'block';
    const primary = q.primaryWord || q.targetWords[0];
    const templates = [
      `Gợi ý ý tưởng: Bắt đầu câu với trạng từ hoặc mệnh đề chỉ mục đích (e.g. "In order to ${primary.term}...", "Although it is ${primary.term}...")`,
      `Gợi ý cấu trúc câu: "It is widely believed that ${primary.term} plays a crucial role in..."`,
      `Gợi ý collocation: Kết hợp ${primary.term} với các động từ mạnh như (demonstrate, enhance, facilitate, emphasize)...`
    ];
    const randomHint = templates[Math.floor(Math.random() * templates.length)];
    hintBox.innerHTML = `💡 <strong>VocaHint:</strong> ${randomHint}`;
  }

  showToast(`💡 Đã mở gợi ý ý tưởng! (Còn ${writingHintsLeft} lượt)`);
}

function useWritingSkip() {
  if (writingSkipsLeft <= 0) {
    showToast('⚠️ Bạn đã hết lượt VocaSkip cho phiên này!');
    return;
  }

  const q = writingQuestionsList[currentWritingIndex];
  if (q) {
    q.status = 'skipped';
    // Add words to mistake list on skip
    q.targetWords.forEach(w => {
      if (w.id && !w.id.startsWith('extra_')) {
        if (typeof addWordToMistakeList === 'function') addWordToMistakeList(w, 'writing');
        if (!writingSessionWrongWords.some(sw => sw.id === w.id)) {
          writingSessionWrongWords.push(w);
        }
      }
    });
  }

  writingSkipsLeft--;
  showToast(`⏭️ Đã bỏ qua câu này (Còn ${writingSkipsLeft} lượt skip)`);
  nextWritingQuestion();
}

function speakPolishedSentence() {
  if (writingPolishedSentence && typeof speakText === 'function') {
    speakText(writingPolishedSentence);
  }
}

function shuffleCurrentWriting() {
  if (writingQuestionsList.length <= 1) return;
  const remaining = writingQuestionsList.slice(currentWritingIndex + 1);
  remaining.sort(() => Math.random() - 0.5);
  writingQuestionsList = writingQuestionsList.slice(0, currentWritingIndex + 1).concat(remaining);
  showToast('🔀 Đã xáo trộn ngẫu nhiên các câu còn lại!');
}

function nextWritingQuestion() {
  if (currentWritingIndex < writingQuestionsList.length - 1) {
    currentWritingIndex++;
    renderWritingCurrentQuestion();
  } else {
    finishWritingSession();
  }
}

// =========================================================================
// 9. FINISH SESSION & SETTLEMENT
// =========================================================================
function finishWritingSession() {
  writingIsCompleted = true;
  const totalQuestions = writingQuestionsList.length;
  const passedQuestions = writingQuestionsList.filter(q => q.status === 'passed').length;
  const passedRatio = totalQuestions > 0 ? Math.round((passedQuestions / totalQuestions) * 100) : 0;

  const scores = writingQuestionsList.filter(q => q.evalData?.score).map(q => q.evalData.score);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  // Duration
  const durationSec = Math.floor((Date.now() - writingStartTime) / 1000);
  const mins = String(Math.floor(durationSec / 60)).padStart(2, '0');
  const secs = String(durationSec % 60).padStart(2, '0');

  // Update Result Modal Elements
  const ratioEl = document.getElementById('writing-res-floor-ratio');
  const pointsEl = document.getElementById('writing-res-points');
  const avgEl = document.getElementById('writing-res-avg-score');
  const hintsSkipsEl = document.getElementById('writing-res-hints-skips');
  const durationEl = document.getElementById('writing-res-duration');
  const diffBadge = document.getElementById('writing-res-difficulty-badge');

  if (ratioEl) ratioEl.textContent = `${passedQuestions}/${totalQuestions} (${passedRatio}%)`;
  if (pointsEl) pointsEl.textContent = `${writingSessionPointsEarned >= 0 ? '+' : ''}${writingSessionPointsEarned} VoCoin`;
  if (avgEl) avgEl.textContent = `${avgScore} / 100`;
  if (hintsSkipsEl) hintsSkipsEl.textContent = `${5 - writingHintsLeft} gợi ý • ${3 - writingSkipsLeft} skip`;
  if (durationEl) durationEl.textContent = `${mins}:${secs}`;

  const cfg = getWritingDifficultyConfig(currentWritingDifficulty);
  if (diffBadge) {
    diffBadge.textContent = `✍️ Cấp độ: ${cfg.label} (x${cfg.diffMult})`;
  }

  // Wrong words banner
  const wrongBanner = document.getElementById('writing-res-wrong-banner');
  const wrongCountEl = document.getElementById('writing-res-wrong-count');
  const wrongBtnLabel = document.getElementById('writing-res-wrong-btn-label');

  if (writingSessionWrongWords.length > 0) {
    if (wrongBanner) wrongBanner.style.display = 'block';
    if (wrongCountEl) wrongCountEl.textContent = `${writingSessionWrongWords.length} từ`;
    if (wrongBtnLabel) wrongBtnLabel.textContent = `${writingSessionWrongWords.length} từ`;
  } else {
    if (wrongBanner) wrongBanner.style.display = 'none';
  }

  if (typeof playVocaSfx === 'function') playVocaSfx('fireworks');
  openModal('modal-writing-result');
}

function closeWritingResultModal() {
  closeModal('modal-writing-result');
}

function retryWritingWrongWordsOnly() {
  closeWritingResultModal();
  if (writingSessionWrongWords.length === 0) {
    showToast('🎉 Tuyệt vời! Bạn không có từ nào bị lỗi trong phiên này.');
    return;
  }
  const retryList = [...writingSessionWrongWords];
  startWritingMode(true, retryList);
}

function exitWritingMode() {
  if (writingSessionPointsEarned !== 0) {
    const total = writingQuestionsList.length || 1;
    const done = writingQuestionsList.filter(q => q.evaluated).length;
    const isComp = done >= total && total > 0;

    let finalPts = writingSessionPointsEarned;
    if (typeof calculateSessionFinalPoints === 'function') {
      const res = calculateSessionFinalPoints(writingSessionPointsEarned, done, total, isComp);
      finalPts = res.finalPts;
    }

    if (finalPts !== 0) {
      const curDeck = decks.find(d => d.id === currentDeckId);
      const deckTitle = curDeck ? curDeck.title : 'Bộ từ';
      if (typeof setUserPoints === 'function') setUserPoints(Math.max(0, getUserPoints() + finalPts));
      if (typeof addLedgerEntry === 'function') {
        addLedgerEntry('STUDY_WRITING', finalPts, `Luyện viết câu AI "${deckTitle}" (${done}/${total} câu)`);
      }
      if (typeof saveDatabase === 'function') saveDatabase(true);
      if (typeof pushCurrentDatabaseToCloud === 'function') pushCurrentDatabaseToCloud();
      showToast(`🎉 Viết Câu: ${finalPts > 0 ? '+' : ''}${finalPts} Xu`);
    }
    writingSessionPointsEarned = 0;
  }

  if (studySourceContext === 'review-queue' || !currentDeckId) {
    showScreen('screen-decks');
    if (typeof refreshActiveScreenData === 'function') refreshActiveScreenData();
  } else {
    showScreen('screen-deck-detail');
    if (typeof refreshActiveScreenData === 'function') refreshActiveScreenData();
  }
}

// Hotkey listener: Ctrl + Enter to submit writing
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    const screen = document.getElementById('screen-writing');
    if (screen && screen.classList.contains('active')) {
      const submitBtn = document.getElementById('btn-writing-submit');
      const nextBtn = document.getElementById('btn-writing-next');
      if (nextBtn && nextBtn.style.display !== 'none') {
        nextWritingQuestion();
      } else if (submitBtn && submitBtn.style.display !== 'none' && !submitBtn.disabled) {
        submitWritingEvaluation();
      }
    }
  }
});

// Export to window
window.openWritingSetupModal = openWritingSetupModal;
window.confirmStartWritingFromModal = confirmStartWritingFromModal;
window.selectWritingSetupDifficulty = selectWritingSetupDifficulty;
window.selectWritingSetupQuestionCount = selectWritingSetupQuestionCount;
window.startWritingMode = startWritingMode;
window.exitWritingMode = exitWritingMode;
window.renderWritingCurrentQuestion = renderWritingCurrentQuestion;
window.handleWritingInput = handleWritingInput;
window.submitWritingEvaluation = submitWritingEvaluation;
window.useWritingHint = useWritingHint;
window.useWritingSkip = useWritingSkip;
window.speakPolishedSentence = speakPolishedSentence;
window.shuffleCurrentWriting = shuffleCurrentWriting;
window.nextWritingQuestion = nextWritingQuestion;
window.finishWritingSession = finishWritingSession;
window.closeWritingResultModal = closeWritingResultModal;
window.retryWritingWrongWordsOnly = retryWritingWrongWordsOnly;
