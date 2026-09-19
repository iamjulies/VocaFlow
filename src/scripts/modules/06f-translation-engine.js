// =========================================================================
// VOCAFLOW 06F-TRANSLATION-ENGINE.JS (v0.10.10-39 Build 340 - TRANSLATION LAB VIP β)
// Bidirectional Translation Engine (EN ↔ VI) with Direct Gemini AI Generation, Multi-Tier VocaHint & Balance v3
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

let translationActiveWords = [];
let translationActiveDifficulty = 'easy';
let translationActiveDirection = 'en_to_vi';

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
  if (diff === 'expert') {
    return {
      floorScore: 95,
      diffMult: 4.0,
      minWords: 22,
      baseXu: 48,
      label: '🔥 Siêu Khó'
    };
  }
  if (diff === 'hard') {
    return {
      floorScore: 90,
      diffMult: 2.8,
      minWords: 18,
      baseXu: 34,
      label: '🔴 Khó'
    };
  }
  if (diff === 'medium') {
    return {
      floorScore: 80,
      diffMult: 1.8,
      minWords: 10,
      baseXu: 22,
      label: '🟡 Trung Bình'
    };
  }
  return {
    floorScore: 70,
    diffMult: 1.0,
    minWords: 5,
    baseXu: 12,
    label: '🟢 Dễ'
  };
}

// =========================================================================
// 2. VIP ACCESS CHECKER
// =========================================================================
function checkTranslationVipAccess() {
  if (typeof isUserVip === 'function') {
    if (!isUserVip()) {
      if (typeof currentUser === 'undefined' || !currentUser || !currentUser.email) {
        if (typeof showToast === 'function') {
          showToast('🔒 Chế độ Dịch Thuật Song Phương (VIP β) yêu cầu đăng nhập tài khoản VIP!');
        }
        if (typeof openAuthModal === 'function') openAuthModal('login');
      } else {
        if (typeof showToast === 'function') {
          showToast('👑 Chế độ Dịch Thuật Song Phương (VIP β) chỉ dành riêng cho thành viên VIP!');
        }
        if (typeof openVipPricingModal === 'function') {
          openVipPricingModal();
        } else if (typeof openVipModal === 'function') {
          openVipModal();
        }
      }
      return false;
    }
    return true;
  }
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

  if (!customWordList && typeof currentDeckId !== 'undefined' && currentDeckId) {
    const curDeck = (typeof decks !== 'undefined') ? decks.find(d => d.id === currentDeckId) : null;
    if (curDeck && typeof isDeckLockedForUser === 'function' && isDeckLockedForUser(curDeck)) {
      alert(`🔒 Bộ từ "${curDeck.title}" thuộc đặc quyền VocaVIP!\n\nGói VocaVIP của bạn đã hết hạn. Vui lòng gia hạn hoặc nâng cấp VocaVIP để tiếp tục mở khóa học bộ từ này nhé!`);
      if (typeof openVipModal === 'function') openVipModal();
      else if (typeof openAuthModal === 'function') openAuthModal('vip');
      return;
    }
  }

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
    let dirText = 'Anh ➔ Việt';
    if (selectedTranslationSetupDirection === 'vi_to_en') dirText = 'Việt ➔ Anh';
    else if (selectedTranslationSetupDirection === 'random') dirText = 'Ngẫu Nhiên 🔀';
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
  ['en_to_vi', 'vi_to_en', 'random'].forEach(d => {
    const card = document.getElementById('translation-dir-card-' + d);
    if (card) {
      if (d === direction) {
        if (d === 'en_to_vi') {
          card.style.borderColor = '#10b981';
          card.style.background = 'rgba(16, 185, 129, 0.08)';
        } else if (d === 'vi_to_en') {
          card.style.borderColor = '#0ea5e9';
          card.style.background = 'rgba(14, 165, 233, 0.08)';
        } else {
          card.style.borderColor = '#a855f7';
          card.style.background = 'rgba(168, 85, 247, 0.08)';
        }
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
  ['easy', 'medium', 'hard', 'expert'].forEach(d => {
    const card = document.getElementById('translation-diff-card-' + d);
    if (card) {
      if (d === diff) {
        const colors = { easy: '#10b981', medium: '#f59e0b', hard: '#ef4444', expert: '#ec4899' };
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
      if (String(k) === String(countMode)) {
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
// 4. GEMINI AI TASK GENERATION & TASK PARSER
// =========================================================================
function extractCleanPrimaryMeaning(rawDefVi, term) {
  if (!rawDefVi || typeof rawDefVi !== 'string') return (term || '').toLowerCase();
  let clean = rawDefVi.trim();
  clean = clean.replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ').trim();
  clean = clean.replace(/^["'“”]|["'“”]$/g, '').trim();
  clean = clean.replace(/^(thuộc về|có tính chất|mang tính chất|mang tính|dùng để|chỉ|hành động|sự|người|khả năng|tính chất|xảy ra)\s+/i, '').trim();
  
  const parts = clean.split(/[,;\/\n•\-]+/).map(p => p.trim()).filter(Boolean);
  if (parts.length > 0) {
    for (const p of parts) {
      let sub = p.replace(/^(thuộc về|có tính chất|mang tính chất|mang tính|dùng để|chỉ|hành động|sự|người|khả năng|tính chất|xảy ra)\s+/i, '').trim();
      const words = sub.split(/\s+/).filter(Boolean);
      if (words.length > 2) {
        sub = words.slice(0, 2).join(' ');
      }
      if (sub) {
        return sub.toLowerCase();
      }
    }
    return parts[0].toLowerCase();
  }
  return clean.toLowerCase() || (term || '').toLowerCase();
}

// v0.10.10-29: Intelligent Secondary Vocabulary & Phrase Extractor for VocaHint
function extractSecondaryVocabHint(sourceText, targetWord, isEnToVi, benchmarkText) {
  if (!sourceText) return null;
  const englishText = isEnToVi ? sourceText : benchmarkText;
  if (!englishText) return null;

  const targetClean = (targetWord || '').toLowerCase().trim();
  const stopwords = new Set([
    'the','a','an','this','that','these','those','is','are','was','were','be','been','being',
    'have','has','had','do','does','did','will','would','shall','should','can','could','may',
    'might','must','to','of','in','on','at','by','for','with','about','against','between',
    'into','through','during','before','after','above','below','from','up','down','off','over',
    'under','again','further','then','once','here','there','when','where','why','how','all',
    'any','both','each','few','more','most','other','some','such','no','nor','not','only','own',
    'same','so','than','too','very','s','t','just','don','should','now','and','but','or','as',
    'if','while','it','he','she','they','we','you','i','me','him','her','us','them','my','your',
    'his','their','our','its','who','whom','which','what','whose'
  ]);

  const rawTokens = englishText.match(/[a-zA-Z]+(?:'[a-zA-Z]+)?/g) || [];
  const candidates = [];

  for (const rawToken of rawTokens) {
    const lower = rawToken.toLowerCase();
    if (stopwords.has(lower)) continue;
    if (lower === targetClean) continue;
    if (lower.startsWith(targetClean) || targetClean.startsWith(lower)) continue;
    if (lower.length <= 3) continue;
    candidates.push(rawToken);
  }

  if (candidates.length === 0) return null;

  // Check in-memory deck words database first
  const localDb = (typeof words !== 'undefined' && Array.isArray(words)) ? words : [];
  for (const c of candidates) {
    const cLower = c.toLowerCase();
    const found = localDb.find(w => (w.term || '').toLowerCase() === cLower);
    if (found) {
      return {
        word: c,
        meaning: extractCleanPrimaryMeaning(found.definitionVi || found.definition, found.term)
      };
    }
  }

  // Common high-frequency contextual & academic dictionary map
  const commonVocabMap = {
    'police': 'cảnh sát / lực lượng thực thi pháp luật',
    'shoplifters': 'kẻ trộm đồ trong cửa hàng / kẻ ăn cắp vặt',
    'shoplifter': 'kẻ trộm đồ trong cửa hàng / kẻ ăn cắp vặt',
    'employee': 'nhân viên / người lao động',
    'employees': 'các nhân viên / đội ngũ nhân sự',
    'workplace': 'nơi làm việc / môi trường công sở',
    'company': 'công ty / doanh nghiệp',
    'companies': 'các công ty / doanh nghiệp',
    'balance': 'sự cân bằng / trạng thái cân đối',
    'maintain': 'duy trì / giữ gìn',
    'productivity': 'năng suất / hiệu quả làm việc',
    'severely': 'nghiêm trọng / nặng nề',
    'chronic': 'mãn tính / kéo dài dai dẳng',
    'communication': 'giao tiếp / truyền đạt thông tin',
    'essential': 'cần thiết / thiết yếu',
    'resolve': 'giải quyết / tháo gỡ',
    'strategy': 'chiến lược / phương kế',
    'decision': 'quyết định / phán quyết',
    'technology': 'công nghệ / giải pháp kỹ thuật',
    'development': 'sự phát triển / quá trình tiến bộ',
    'environment': 'môi trường / hoàn cảnh xung quanh',
    'experience': 'kinh nghiệm / trải nghiệm thực tế',
    'relationship': 'mối quan hệ / sự gắn kết',
    'community': 'cộng đồng / tập thể',
    'opportunity': 'cơ hội / thời cơ',
    'challenge': 'thử thách / khó khăn',
    'benefit': 'lợi ích / quyền lợi',
    'flexible': 'linh hoạt / uyển chuyển',
    'schedule': 'lịch trình / thời gian biểu'
  };

  for (const c of candidates) {
    const cLower = c.toLowerCase();
    if (commonVocabMap[cLower]) {
      return {
        word: c,
        meaning: commonVocabMap[cLower]
      };
    }
  }

  // Fallback candidate
  const best = candidates[candidates.length - 1] || candidates[0];
  return {
    word: best,
    meaning: 'từ vựng bổ trợ trong câu'
  };
}

async function generateTranslationTasksWithGemini(targetWords, difficulty, direction) {
  if (!targetWords || targetWords.length === 0) return null;

  const sampleWords = targetWords.map((w, idx) => ({
    index: idx,
    term: (w.term || '').trim(),
    pos: (w.partOfSpeech || 'noun').toLowerCase(),
    defVi: (w.definitionVi || w.definition || '').trim(),
    existingExample: (w.exampleSentence || w.example || '').trim()
  })).filter(w => w.term.length > 0);

  const prompt = `You are a world-class bilingual linguist, professional translator, and IELTS examiner.
Generate authentic, context-rich, and natural translation tasks for the following ${sampleWords.length} vocabulary words.

CONFIGURATION:
- Difficulty: "${difficulty}"
  * easy: Short, natural single-clause sentence (<= 10 words). Clear everyday context.
  * medium: Natural compound sentence (10-18 words) in authentic workplace, study, or communication context.
  * hard: Sophisticated, complex academic/professional sentence (> 18 words) with nuanced clauses.
- Direction: "${direction}" (${direction === 'en_to_vi' ? 'English Source Sentence -> Vietnamese Target Translation' : (direction === 'vi_to_en' ? 'Vietnamese Source Sentence -> English Target Translation' : 'Random Bidirectional Translation (Mixture of EN->VI and VI->EN)')})
- Target Words: ${JSON.stringify(sampleWords)}

MANDATORY LINGUISTIC RULES:
1. Every sentence MUST be 100% natural, idiomatically fluent, and reflect authentic native usage of the specific target word in its correct part of speech.
2. ABSOLUTELY FORBIDDEN: NEVER use repetitive generic template formulas like "Understanding the importance of this [word] helps improve our daily work" or awkward literal verb attachments.
3. For each word, create a vivid real-world context (e.g. workplace, business, technology, education, law, psychology, health, personal growth, society).
4. Provide an accurate, elegant, and native-sounding translation in the other language.
5. Provide helpful and useful hints:
   - "secondaryVocabClue": The meaning in Vietnamese of ANOTHER difficult or prominent non-stopword in this sentence (do NOT repeat the targetWord itself!). Example: for "The police will prosecute all shoplifters", secondaryVocabClue should be "shoplifters: kẻ trộm đồ / kẻ ăn cắp vặt".
   - "keyVocabularyClue": A natural collocation phrase or context clue in Vietnamese.
   - "grammarStructureHint": Structural or tense clue in Vietnamese.
   - "sentenceFramingClue": A natural starter phrase in the target language.

OUTPUT FORMAT: Return STRICT JSON ONLY without markdown fences or backticks:
{
  "tasks": [
    {
      "index": 0,
      "targetWord": "<term>",
      "englishSentence": "<natural English sentence containing targetWord>",
      "vietnameseSentence": "<accurate and fluent Vietnamese translation>",
      "secondaryVocabClue": "<translation of another key word/phrase in sentence>",
      "keyVocabularyClue": "<short collocation / contextual clue in Vietnamese>",
      "grammarStructureHint": "<grammar structure / tense clue in Vietnamese>",
      "sentenceFramingClue": "<natural starter phrase in target language>"
    }
  ]
}`;

  let genSuccess = false;
  let resultTasks = null;

  try {
    const keys = typeof getStoredApiKeys === 'function' ? getStoredApiKeys() : [];
    const isHard = (difficulty === 'hard');
    const modelsToTry = isHard
      ? (typeof getGeminiModelsForTier === 'function' ? getGeminiModelsForTier('deep') : ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'])
      : (typeof getGeminiModelsForTier === 'function' ? getGeminiModelsForTier('fast') : ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite', 'gemini-3.8-flash']);

    const timeoutMs = 16000;

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
              const cleanJson = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
              const parsed = JSON.parse(cleanJson);
              if (parsed && Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
                resultTasks = parsed.tasks;
                genSuccess = true;
                if (typeof saveWorkingGeminiModel === 'function') {
                  saveWorkingGeminiModel(m, isHard ? 'deep' : 'fast');
                }
                break;
              }
            }
          }
        } catch (e) {
          console.warn(`Gemini translation tasks generation failed with model ${m}:`, e);
        }
      }
    }
  } catch (err) {
    console.error('Gemini Translation Generation outer error:', err);
  }

  return resultTasks;
}

// =========================================================================
// 5. ENGINE START, GENERATE & RENDER
// =========================================================================
async function startTranslationMode(fromSelection = false, customWordList = null, doShuffle = true) {
  if (!checkTranslationVipAccess()) return;
  if (!currentDeckId && !customWordList) return;

  if (!customWordList && currentDeckId) {
    const curDeck = (typeof decks !== 'undefined') ? decks.find(d => d.id === currentDeckId) : null;
    if (curDeck && typeof isDeckLockedForUser === 'function' && isDeckLockedForUser(curDeck)) {
      alert(`🔒 Bộ từ "${curDeck.title}" thuộc đặc quyền VocaVIP!\n\nGói VocaVIP của bạn đã hết hạn. Vui lòng gia hạn hoặc nâng cấp VocaVIP để tiếp tục mở khóa học bộ từ này nhé!`);
      if (typeof openVipModal === 'function') openVipModal();
      else if (typeof openAuthModal === 'function') openAuthModal('vip');
      return;
    }
  }

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

  translationActiveWords = baseWords;
  translationActiveDifficulty = currentTranslationDifficulty;
  translationActiveDirection = currentTranslationDirection;

  const cfg = getTranslationDifficultyConfig(currentTranslationDifficulty);
  translationFloorScore = cfg.floorScore;
  translationDiffMult = cfg.diffMult;

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

  await loadAndGenerateTranslationTasks(baseWords, currentTranslationDifficulty, currentTranslationDirection);
}
window.startTranslationMode = startTranslationMode;

async function loadAndGenerateTranslationTasks(baseWords, difficulty, direction) {
  const genCard = document.getElementById('translation-generating-card');
  const errCard = document.getElementById('translation-error-card');
  const mainCard = document.getElementById('translation-main-card');

  if (genCard) genCard.style.display = 'block';
  if (errCard) errCard.style.display = 'none';
  if (mainCard) mainCard.style.display = 'none';

  // Call Gemini AI to generate tasks
  const aiTasks = await generateTranslationTasksWithGemini(baseWords, difficulty, direction);

  if (aiTasks && aiTasks.length > 0) {
    translationQuestionsList = baseWords.map((w, idx) => {
      const matched = aiTasks.find(t => t.index === idx || (t.targetWord && t.targetWord.toLowerCase() === w.term.toLowerCase())) || aiTasks[idx];
      const enSentence = matched ? matched.englishSentence : (w.exampleSentence || `We should study ${w.term} in context.`);
      const viSentence = matched ? matched.vietnameseSentence : (w.exampleTranslationVi || `Chúng ta nên học ${extractCleanPrimaryMeaning(w.definitionVi, w.term)} trong ngữ cảnh.`);
      const keyClue = matched ? (matched.keyVocabularyClue || '') : '';
      const grammarHint = matched ? (matched.grammarStructureHint || '') : '';
      const secondaryVocab = matched ? (matched.secondaryVocabClue || '') : '';
      const framingClue = matched ? (matched.sentenceFramingClue || '') : '';

      const isEnToVi = (direction === 'random') ? (Math.random() < 0.5) : (direction === 'en_to_vi');
      const qDirection = isEnToVi ? 'en_to_vi' : 'vi_to_en';
      const taskObj = {
        sourceText: isEnToVi ? enSentence : viSentence,
        benchmarkText: isEnToVi ? viSentence : enSentence,
        englishSentence: enSentence,
        vietnameseSentence: viSentence,
        targetWord: w.term,
        cleanMeaning: extractCleanPrimaryMeaning(w.definitionVi || w.definition, w.term),
        partOfSpeech: w.partOfSpeech || 'noun',
        definitionVi: w.definitionVi || w.definition || '',
        direction: qDirection,
        keyVocabularyClue: keyClue,
        grammarStructureHint: grammarHint,
        secondaryVocabClue: secondaryVocab,
        sentenceFramingClue: framingClue
      };

      return {
        mainWord: w,
        task: taskObj
      };
    });

    if (genCard) genCard.style.display = 'none';
    if (errCard) errCard.style.display = 'none';
    if (mainCard) mainCard.style.display = 'block';
    renderTranslationCurrentQuestion();
  } else {
    // Show explicit error card with Retry and Exit buttons (No silent fallback!)
    if (genCard) genCard.style.display = 'none';
    if (mainCard) mainCard.style.display = 'none';
    if (errCard) {
      errCard.style.display = 'block';
      const errMsgEl = document.getElementById('translation-error-msg');
      if (errMsgEl) {
        errMsgEl.textContent = 'Hệ thống không thể gọi Google Gemini AI (lỗi mạng, kết nối timeout hoặc API key chưa được cấu hình). Bạn hãy kiểm tra lại kết nối mạng hoặc thử lại.';
      }
    }
  }
}

async function retryGenerateTranslationTasks() {
  if (translationActiveWords && translationActiveWords.length > 0) {
    await loadAndGenerateTranslationTasks(translationActiveWords, translationActiveDifficulty, translationActiveDirection);
  } else {
    exitTranslationMode();
  }
}
window.retryGenerateTranslationTasks = retryGenerateTranslationTasks;

function updateTranslationHeaderBadges() {
  const dirBadge = document.getElementById('translation-direction-badge');
  if (dirBadge) {
    if (currentTranslationDirection === 'en_to_vi') {
      dirBadge.textContent = '🇬🇧 ➔ 🇻🇳 Anh - Việt';
      dirBadge.style.color = '#34d399';
      dirBadge.style.borderColor = 'rgba(16, 185, 129, 0.35)';
      dirBadge.style.background = 'rgba(16, 185, 129, 0.18)';
    } else if (currentTranslationDirection === 'vi_to_en') {
      dirBadge.textContent = '🇻🇳 ➔ 🇬🇧 Việt - Anh';
      dirBadge.style.color = '#38bdf8';
      dirBadge.style.borderColor = 'rgba(14, 165, 233, 0.35)';
      dirBadge.style.background = 'rgba(14, 165, 233, 0.18)';
    } else {
      dirBadge.textContent = '🔀 Song Phương (Ngẫu Nhiên)';
      dirBadge.style.color = '#c084fc';
      dirBadge.style.borderColor = 'rgba(168, 85, 247, 0.35)';
      dirBadge.style.background = 'rgba(168, 85, 247, 0.18)';
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
  if (typeof playVocaSfx === 'function') playVocaSfx('pop');

  translationHintsRevealed++;
  const hintBox = document.getElementById('translation-hint-box');
  const hintContent = document.getElementById('translation-hint-content');
  const q = translationQuestionsList[currentTranslationIndex];
  if (!hintBox || !hintContent || !q) return;

  hintBox.style.display = 'block';
  const isEnToVi = (q.task.direction === 'en_to_vi');
  const term = q.mainWord.term || '';
  const meaning = q.mainWord.definitionVi || q.mainWord.definition || '';
  const pos = q.mainWord.partOfSpeech || 'noun';

  if (isEnToVi) {
    if (translationHintsRevealed === 1) {
      // Tầng 1: Gợi ý từ vựng phụ khác trong câu + Cụm từ Collocation & Cấu trúc ngữ pháp
      const secondaryVocab = q.task.secondaryVocabClue || extractSecondaryVocabHint(translationCurrentSourceText, term, true, translationCurrentBenchmarkText);
      const collocationClue = q.task.keyVocabularyClue || '';
      const grammarHint = q.task.grammarStructureHint || '';

      let vocabHtml = '';
      if (secondaryVocab) {
        if (typeof secondaryVocab === 'string') {
          vocabHtml = `<div style="margin-bottom: 6px;">🎯 <strong>Từ vựng phụ trong câu:</strong> <span style="color: #38bdf8; font-weight: 600;">${escapeHtml(secondaryVocab)}</span></div>`;
        } else if (secondaryVocab.word) {
          vocabHtml = `<div style="margin-bottom: 6px;">🎯 <strong>Từ vựng phụ trong câu:</strong> <code style="color: #38bdf8; font-size: 13px; font-weight: 700;">${escapeHtml(secondaryVocab.word)}</code> ➔ <em>${escapeHtml(secondaryVocab.meaning)}</em></div>`;
        }
      }

      let extraHtml = '';
      if (collocationClue) {
        extraHtml += `<div style="margin-bottom: 4px;">💡 <strong>Cụm kết hợp & ngữ cảnh:</strong> <span style="color: #fbbf24; font-weight: 600;">${escapeHtml(collocationClue)}</span></div>`;
      }
      if (grammarHint) {
        extraHtml += `<div style="margin-bottom: 4px;">📐 <strong>Cấu trúc câu:</strong> <span style="color: var(--text);">${escapeHtml(grammarHint)}</span></div>`;
      }
      if (!extraHtml && !vocabHtml) {
        extraHtml = `<div style="margin-bottom: 4px;">💡 <strong>Mẹo dịch:</strong> Phân tích thành phần Chủ ngữ + Động từ chính + Tân ngữ để chuyển ngữ tự nhiên sang tiếng Việt.</div>`;
      }

      hintContent.innerHTML = `
        <div style="background: rgba(245, 158, 11, 0.05); padding: 8px 12px; border-radius: 8px; border-left: 3px solid #fbbf24;">
          <div style="font-size: 11px; font-weight: 700; color: #fbbf24; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">💡 GỢI Ý TẦNG 1: TỪ VỰNG PHỤ & CỤM DIỄN ĐẠT</div>
          ${vocabHtml}
          ${extraHtml}
        </div>
      `;
    } else if (translationHintsRevealed === 2) {
      // Tầng 2: Khung dịch mở đầu câu tự nhiên
      const framingClue = q.task.sentenceFramingClue;
      const benchmarkWords = (translationCurrentBenchmarkText || '').split(/\s+/);
      const halfLen = Math.max(3, Math.min(6, Math.floor(benchmarkWords.length / 2)));
      const starter = framingClue || benchmarkWords.slice(0, halfLen).join(' ');

      hintContent.innerHTML = `
        <div style="background: rgba(52, 211, 153, 0.05); padding: 8px 12px; border-radius: 8px; border-left: 3px solid #34d399;">
          <div style="font-size: 11px; font-weight: 700; color: #34d399; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">🔗 GỢI Ý TẦNG 2: KHUNG DỊCH MỞ ĐẦU CÂU</div>
          <div style="margin-bottom: 6px;">
            Gợi ý mở đầu: <strong style="color: #34d399; font-size: 14px;">"${escapeHtml(starter)}..."</strong>
          </div>
          <div style="font-size: 11.5px; color: var(--text-muted); line-height: 1.5;">
            ✨ Mẹo dịch: Dịch thoát ý tự nhiên, không nhất thiết phải dịch thô từng từ (word-by-word).
          </div>
        </div>
      `;
    } else {
      // Tầng 3: Toàn bộ bản dịch chuẩn tham khảo
      hintContent.innerHTML = `
        <div style="background: rgba(56, 189, 248, 0.05); padding: 8px 12px; border-radius: 8px; border-left: 3px solid #38bdf8;">
          <div style="font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">🇻🇳 GỢI Ý TẦNG 3: BẢN DỊCH THAM KHẢO CHUẨN</div>
          <div style="color: #38bdf8; font-weight: 700; font-size: 14px; margin-bottom: 6px; line-height: 1.5;">
            "${escapeHtml(translationCurrentBenchmarkText)}"
          </div>
          <div style="font-size: 11.5px; color: var(--text-muted);">
            💡 Hãy đối chiếu với bản dịch của bạn để trau chuốt câu văn gãy gọn nhất.
          </div>
        </div>
      `;
    }
  } else {
    // vi_to_en
    if (translationHintsRevealed === 1) {
      // Tầng 1: Gợi ý từ vựng tiếng Anh bổ trợ & Cấu trúc thì/ngữ pháp
      const secondaryVocab = q.task.secondaryVocabClue || extractSecondaryVocabHint(translationCurrentBenchmarkText, term, false, translationCurrentSourceText);
      const collocationClue = q.task.keyVocabularyClue || '';
      const grammarHint = q.task.grammarStructureHint || '';

      let vocabHtml = '';
      if (secondaryVocab) {
        if (typeof secondaryVocab === 'string') {
          vocabHtml = `<div style="margin-bottom: 6px;">🎯 <strong>Từ vựng tiếng Anh bổ trợ:</strong> <span style="color: #38bdf8; font-weight: 600;">${escapeHtml(secondaryVocab)}</span></div>`;
        } else if (secondaryVocab.word) {
          vocabHtml = `<div style="margin-bottom: 6px;">🎯 <strong>Từ vựng tiếng Anh bổ trợ:</strong> <code style="color: #38bdf8; font-size: 13px; font-weight: 700;">${escapeHtml(secondaryVocab.word)}</code> ➔ <em>${escapeHtml(secondaryVocab.meaning)}</em></div>`;
        }
      }

      let extraHtml = '';
      if (grammarHint) {
        extraHtml += `<div style="margin-bottom: 4px;">📐 <strong>Cấu trúc & thì ngữ pháp:</strong> <span style="color: #fbbf24; font-weight: 600;">${escapeHtml(grammarHint)}</span></div>`;
      }
      if (collocationClue) {
        extraHtml += `<div style="margin-bottom: 4px;">💡 <strong>Cụm từ gợi ý:</strong> <span style="color: var(--text);">${escapeHtml(collocationClue)}</span></div>`;
      }

      hintContent.innerHTML = `
        <div style="background: rgba(245, 158, 11, 0.05); padding: 8px 12px; border-radius: 8px; border-left: 3px solid #fbbf24;">
          <div style="font-size: 11px; font-weight: 700; color: #fbbf24; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">💡 GỢI Ý TẦNG 1: TỪ VỰNG BỔ TRỢ & CẤU TRÚC TIẾNG ANH</div>
          ${vocabHtml}
          ${extraHtml}
          <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px;">📝 Chú ý: Chia đúng thì của động từ và mạo từ (a/an/the) phù hợp.</div>
        </div>
      `;
    } else if (translationHintsRevealed === 2) {
      // Tầng 2: Cụm từ mở đầu tiếng Anh
      const enWords = (translationCurrentBenchmarkText || '').split(/\s+/);
      const firstThree = enWords.slice(0, Math.min(4, enWords.length)).join(' ');
      hintContent.innerHTML = `
        <div style="background: rgba(52, 211, 153, 0.05); padding: 8px 12px; border-radius: 8px; border-left: 3px solid #34d399;">
          <div style="font-size: 11px; font-weight: 700; color: #34d399; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">🔗 GỢI Ý TẦNG 2: CỤM TỪ MỞ ĐẦU TIẾNG ANH</div>
          <div style="margin-bottom: 6px;">
            Khung mở đầu: <strong style="color: #38bdf8; font-size: 14px;">"${escapeHtml(firstThree)}..."</strong>
          </div>
          <div style="font-size: 11.5px; color: var(--text-muted); line-height: 1.5;">
            ✨ Đảm bảo câu có đầy đủ Chủ ngữ (Subject) + Vị ngữ (Predicate) hoàn chỉnh.
          </div>
        </div>
      `;
    } else {
      // Tầng 3: Khung chữ cái đầu & câu tiếng Anh chuẩn
      const enWords = (translationCurrentBenchmarkText || '').split(/\s+/);
      const masked = enWords.map(w => {
        const clean = w.replace(/^[^\w]+|[^\w]+$/g, '');
        if (clean.length <= 1) return w;
        return clean[0] + '_'.repeat(Math.min(5, clean.length - 1));
      }).join(' ');

      hintContent.innerHTML = `
        <div style="background: rgba(56, 189, 248, 0.05); padding: 8px 12px; border-radius: 8px; border-left: 3px solid #38bdf8;">
          <div style="font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">🔤 GỢI Ý TẦNG 3: KHUNG CHỮ CÁI ĐẦU & CÂU TIẾNG ANH CHUẨN</div>
          <div style="margin-bottom: 6px;">
            <code style="color: #fbbf24; font-size: 13.5px; font-weight: 700; letter-spacing: 0.5px;">${escapeHtml(masked)}</code>
          </div>
          <div style="color: #38bdf8; font-weight: 600; font-size: 13.5px; margin-top: 6px;">
            "${escapeHtml(translationCurrentBenchmarkText)}"
          </div>
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
  if (typeof playVocaSfx === 'function') playVocaSfx('skip');
  nextTranslationQuestion();
}
window.skipTranslationQuestion = skipTranslationQuestion;

// =========================================================================
// 8. GEMINI AI TRANSLATION EVALUATION ENGINE (Semantic Equivalence & Natural Phrasing)
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

  const prompt = `You are an elite bilingual linguist, professional translator and fair examiner.
Grading Task: Bidirectional Translation (${direction === 'en_to_vi' ? 'English to Vietnamese' : 'Vietnamese to English'})
Target Word: "${targetWord}" (Meaning: "${targetDef}")
Source Sentence: "${sourceSentence}"
Benchmark Reference: "${benchmarkSentence}"
Student's Translation: "${userTranslation}"

EVALUATION PHILOSOPHY & MANDATORY RULES:
1. Grade on SEMANTIC EQUIVALENCE, GRAMMATICAL ACCURACY, and IDIOMATIC FLUENCY (Score 0-100).
2. DO NOT require mechanical word-for-word matching with the Benchmark Reference. In natural translation, there are many legitimate expressions.
3. BE FULLY FLEXIBLE WITH:
   - Vietnamese personal pronouns / perspective ("chúng tôi", "chúng ta", "nhóm mình", "đội ngũ chúng tôi", "mình", "tôi", etc.).
   - Natural word order variations in Vietnamese (e.g., "đây thực sự là..." vs "đây là... thực sự", "rất quan trọng đối với..." vs "đối với... là rất quan trọng").
   - Contextually appropriate synonyms and collocations (e.g. "xung đột" / "bất đồng" / "mâu thuẫn", "cơ hội" / "dịp", "học tập" / "học hỏi", "đạt được" / "gặt hái").
4. CRITICAL RULE: NEVER accuse the student of "word-by-word translation" if their sentence makes complete sense, is grammatically sound, and reads naturally.
5. In "polishedRewrite", craft a genuinely elegant, 100% natural, polished translation in the target language that sounds like native prose (NOT a robotic or clunky literal translation).

OUTPUT FORMAT: Return STRICT JSON ONLY without markdown fences or backticks:
{
  "score": <number 0-100>,
  "passedFloor": <boolean, true if score >= ${translationFloorScore}>,
  "verdict": "<inspiring, concise verdict in Vietnamese, max 25 words>",
  "analysis": {
    "grammar": "<clear feedback on grammar & structure in Vietnamese, max 40 words>",
    "nuance": "<nuance and vocabulary choice analysis in Vietnamese, max 35 words>",
    "errors": "<specific errors detected, or 'Không có lỗi đáng kể' in Vietnamese>"
  },
  "polishedRewrite": "<natural, elegant, native-sounding translation rewrite>",
  "tip": "<actionable, helpful translation tip or collocation advice in Vietnamese, max 30 words>"
}`;

  let evalSuccess = false;
  let evalResult = null;

  try {
    const keys = typeof getStoredApiKeys === 'function' ? getStoredApiKeys() : [];
    const modelsToTry = typeof getGeminiModelsForTier === 'function'
      ? getGeminiModelsForTier('fast')
      : ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite', 'gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'];

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
              const cleanJson = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
              evalResult = JSON.parse(cleanJson);
              if (evalResult && typeof evalResult.score === 'number') {
                if (typeof saveWorkingGeminiModel === 'function') {
                  saveWorkingGeminiModel(m, 'fast');
                }
                evalSuccess = true;
                break;
              }
            }
          }
        } catch (e) {
          console.warn(`Gemini translation eval failed with model ${m}:`, e);
        }
      }
    }
  } catch (err) {
    console.error('Gemini Translation evaluation outer error:', err);
  }

  if (!evalSuccess || !evalResult || typeof evalResult.score !== 'number') {
    evalResult = fallbackHeuristicTranslationGrading(userTranslation, benchmarkSentence, targetWord, targetDef, direction);
  }

  renderTranslationEvaluationResult(evalResult, userTranslation);
}
window.submitTranslationEvaluation = submitTranslationEvaluation;

function fallbackHeuristicTranslationGrading(userTrans, benchmark, targetWord, targetDef, direction) {
  const cleanUser = (userTrans || '').toLowerCase().trim();
  const cleanBench = (benchmark || '').toLowerCase().trim();
  
  // Stopwords list
  const viStopwords = new Set(['là', 'của', 'và', 'có', 'để', 'cho', 'những', 'các', 'một', 'với', 'trong', 'ở', 'thì', 'mà', 'rằng', 'được', 'bị', 'do', 'từ', 'này', 'đó', 'ấy']);
  const enStopwords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'of', 'to', 'in', 'for', 'on', 'with', 'as', 'by', 'at', 'from', 'that', 'this', 'it']);
  const stopwords = direction === 'en_to_vi' ? viStopwords : enStopwords;

  const tokenize = (str) => str.replace(/[.,/#!$%^&*;:{}=\-_`~()?"'“”!]/g, '').split(/\s+/).filter(Boolean);
  const userTokens = tokenize(cleanUser);
  const benchTokens = tokenize(cleanBench);
  const benchContentTokens = benchTokens.filter(t => !stopwords.has(t));

  let matchCount = 0;
  userTokens.forEach(t => {
    if (benchTokens.includes(t)) matchCount++;
  });

  let contentMatchCount = 0;
  benchContentTokens.forEach(t => {
    if (cleanUser.includes(t)) contentMatchCount++;
  });

  const contentRatio = benchContentTokens.length > 0 ? (contentMatchCount / benchContentTokens.length) : 0.7;
  const lenRatio = Math.min(userTokens.length, benchTokens.length) / Math.max(userTokens.length, benchTokens.length);

  // Keyword check
  let keywordBonus = 0;
  if (direction === 'vi_to_en') {
    if (targetWord && cleanUser.includes(targetWord.toLowerCase())) keywordBonus = 15;
  } else {
    const cleanMeaning = extractCleanPrimaryMeaning(targetDef || '', targetWord || '');
    if (cleanMeaning && cleanUser.includes(cleanMeaning.toLowerCase())) keywordBonus = 15;
  }

  let baseScore = Math.round((contentRatio * 55) + (lenRatio * 30) + keywordBonus);
  if (userTokens.length >= 4 && contentRatio >= 0.4) {
    baseScore = Math.max(82, baseScore); // Generous for complete, reasonable attempts
  }
  baseScore = Math.max(35, Math.min(95, baseScore));

  const passed = baseScore >= translationFloorScore;
  return {
    score: baseScore,
    passedFloor: passed,
    verdict: passed ? 'Bản dịch đạt chuẩn ngữ nghĩa và truyền tải thông điệp tự nhiên.' : 'Bản dịch cần chú ý hơn về cấu trúc ngữ pháp và từ vựng trọng tâm.',
    analysis: {
      grammar: passed ? 'Cấu trúc câu hoàn chỉnh, diễn đạt mạch lạc và đúng ngữ cảnh.' : 'Còn một số điểm chưa chuẩn xác về cấu trúc ngữ pháp hoặc trật tự từ.',
      nuance: 'Sắc thái câu phù hợp với ngữ cảnh giao tiếp thực tế.',
      errors: passed ? 'Không có lỗi đáng kể' : 'Cần trau chuốt thêm từ vựng để câu văn lưu loát hơn.'
    },
    polishedRewrite: benchmark,
    tip: 'Hãy chú ý liên từ nối và cách kết hợp từ tự nhiên (collocations) để câu văn trôi chảy hơn.'
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

  const curQ = translationQuestionsList[currentTranslationIndex];
  if (curQ) {
    curQ.score = score;
    curQ.direction = curQ.task?.direction || translationActiveDirection;
  }

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

  // Play SFX & trigger VIP Cat Meme
  if (typeof playVocaSfx === 'function') {
    playVocaSfx(passed ? 'correct' : 'wrong');
  }
  if (typeof triggerVipMemeReaction === 'function') {
    triggerVipMemeReaction(passed ? 'right' : 'fail');
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
  if (typeof calculateUnifiedSessionPoints === 'function') {
    res = calculateUnifiedSessionPoints('translation', translationSessionPointsEarned, done, total);
  } else if (typeof calculateSessionFinalPointsV3 === 'function') {
    res = calculateSessionFinalPointsV3(translationSessionPointsEarned, done, total, isComp);
  } else if (typeof calculateSessionFinalPoints === 'function') {
    res = calculateSessionFinalPoints(translationSessionPointsEarned, done, total, isComp);
  }

  const finalPts = res.finalPts;

  // Calculate Unified Study EXP (v0.10.10-34)
  const translationExpItems = translationSessionScores.length > 0 ? translationSessionScores : new Array(done).fill(80);
  const translationExpRes = (typeof calculateUnifiedStudyExp === 'function')
    ? calculateUnifiedStudyExp('translation', translationExpItems, total, currentTranslationDifficulty)
    : { finalExp: 0 };

  if (translationExpRes.finalExp > 0 && typeof addStudyExp === 'function') {
    addStudyExp(translationExpRes.finalExp, 'translation');
  }

  if (finalPts > 0 || (translationExpRes && translationExpRes.finalExp > 0)) {
    const newBal = Math.max(0, (typeof getUserPoints === 'function' ? getUserPoints() : 0) + finalPts);
    if (typeof setUserPoints === 'function') setUserPoints(newBal);
    if (typeof addLedgerEntry === 'function') {
      const bonusText = res.milestoneBonus > 0 ? ` + Thưởng mốc ${done} câu (+${res.milestoneBonus} Xu)` : '';
      addLedgerEntry('STUDY_TRANSLATION', finalPts, `Dịch Thuật Song Phương (${done}/${total} câu, x${res.combinedMult || 1.0}${bonusText})`, newBal, { studyExp: translationExpRes?.finalExp || 0 });
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

  // Check Bilingual Master (Cầu Nối Song Ngữ) - v0.10.10-36
  const enToViQuestions = translationQuestionsList.filter(q => (q.direction === 'en_to_vi' || (q.task && q.task.direction === 'en_to_vi')) && typeof q.score === 'number');
  const viToEnQuestions = translationQuestionsList.filter(q => (q.direction === 'vi_to_en' || (q.task && q.task.direction === 'vi_to_en')) && typeof q.score === 'number');
  const hasValidEnToVi = enToViQuestions.length > 0 && enToViQuestions.some(q => q.score >= 90);
  const hasValidViToEn = viToEnQuestions.length > 0 && viToEnQuestions.some(q => q.score >= 90);

  if ((translationActiveDirection === 'random' || (enToViQuestions.length > 0 && viToEnQuestions.length > 0)) && hasValidEnToVi && hasValidViToEn) {
    if (typeof checkAndUnlockAchievement === 'function') {
      checkAndUnlockAchievement('extended_bilingual_master');
    } else if (typeof updateAchievementProgress === 'function') {
      updateAchievementProgress('extended_bilingual_master', 1);
    }
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
  const expEl = document.getElementById('translation-res-exp');
  const avgScoreEl = document.getElementById('translation-res-avg-score');
  const hintsSkipsEl = document.getElementById('translation-res-hints-skips');
  const durationEl = document.getElementById('translation-res-duration');
  const diffBadgeEl = document.getElementById('translation-res-difficulty-badge');

  if (floorRatioEl) floorRatioEl.textContent = `${passedCount}/${total} (${floorRatioPct}%)`;
  if (pointsEl) pointsEl.textContent = `+${finalPts} VoCoin`;
  if (expEl) expEl.textContent = `+${translationExpRes?.finalExp || 0} EXP`;
  if (avgScoreEl) avgScoreEl.textContent = `${avgScore} / 100`;
  if (hintsSkipsEl) hintsSkipsEl.textContent = `${translationHintsUsedTotal} gợi ý • ${translationSkipsUsedTotal} skip`;
  if (durationEl) durationEl.textContent = durationStr;

  const cfg = getTranslationDifficultyConfig(currentTranslationDifficulty);
  const dirLabel = currentTranslationDirection === 'en_to_vi' ? '🇬🇧 ➔ 🇻🇳' : (currentTranslationDirection === 'vi_to_en' ? '🇻🇳 ➔ 🇬🇧' : '🔀 Ngẫu Nhiên');
  if (diffBadgeEl) diffBadgeEl.textContent = `🌐 Chiều: ${dirLabel} • ${cfg.label} (x${translationDiffMult})`;

  // Bonus breakdown pill
  const bonusBox = document.getElementById('translation-res-bonus-box');
  if (bonusBox) {
    if (res.commitmentFactor < 1.0 || res.volumeMultiplier > 1.0 || (res.vipMultiplier && res.vipMultiplier > 1.0)) {
      bonusBox.style.display = 'block';
      bonusBox.innerHTML = `✨ Hệ số hoàn thành: <strong>x${res.commitmentFactor || res.completionMult || 1.0}</strong> • Khối lượng: <strong>x${res.volumeMultiplier || res.deckLengthMult || 1.0}</strong> • Trọng số: <strong>x${res.modeWeight || 3.0}</strong>`;
    } else {
      bonusBox.style.display = 'none';
    }
  }

  if (typeof updateModalBrainEnergyIndicator === 'function') {
    updateModalBrainEnergyIndicator('translation-res-energy-box', res);
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
    // Settle points and exp if any
    const total = translationQuestionsList.length || 1;
    const done = translationGradedIndices.size;
    if (!translationIsCompleted && (translationSessionPointsEarned !== 0 || done > 0)) {
      const isComp = false;
      let res = { finalPts: translationSessionPointsEarned, completionMult: 1.0, deckLengthMult: 1.0, milestoneBonus: 0, combinedMult: 1.0 };
      if (typeof calculateUnifiedSessionPoints === 'function') {
        res = calculateUnifiedSessionPoints('translation', translationSessionPointsEarned, done, total);
      } else if (typeof calculateSessionFinalPointsV3 === 'function') {
        res = calculateSessionFinalPointsV3(translationSessionPointsEarned, done, total, isComp);
      } else if (typeof calculateSessionFinalPoints === 'function') {
        res = calculateSessionFinalPoints(translationSessionPointsEarned, done, total, isComp);
      }
      const finalPts = res.finalPts;

      const translationExpItems = translationSessionScores.length > 0 ? translationSessionScores : new Array(done).fill(80);
      const expRes = (typeof calculateUnifiedStudyExp === 'function')
        ? calculateUnifiedStudyExp('translation', translationExpItems, total, currentTranslationDifficulty)
        : { finalExp: 0 };

      if (expRes.finalExp > 0 && typeof addStudyExp === 'function') {
        addStudyExp(expRes.finalExp, 'translation');
      }

      if (finalPts !== 0 || expRes.finalExp > 0) {
        const newBalance = Math.max(0, (typeof getUserPoints === 'function' ? getUserPoints() : 0) + finalPts);
        if (typeof setUserPoints === 'function') setUserPoints(newBalance);
        if (typeof addLedgerEntry === 'function') {
          addLedgerEntry('STUDY_TRANSLATION_PARTIAL', finalPts, `Dịch Thuật (Thoát sớm ${done}/${total} câu, x${res.combinedMult || 1.0})`, newBalance, { studyExp: expRes.finalExp });
        }
        if (typeof saveDatabase === 'function') saveDatabase(true);
        if (typeof pushCurrentDatabaseToCloud === 'function') pushCurrentDatabaseToCloud();
        if (typeof showToast === 'function') {
          showToast(`🎉 Dịch Thuật: ${finalPts > 0 ? '+' : ''}${finalPts} VoCoin • +${expRes.finalExp} EXP`);
        }
      }
      translationSessionPointsEarned = 0;
    }

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
    if (typeof promptStudyEarlyExit === 'function') {
      promptStudyEarlyExit({
        mode: 'translation',
        done,
        total,
        basePoints: translationSessionPointsEarned,
        difficulty: currentTranslationDifficulty,
        onConfirmExit: () => exitTranslationMode(true)
      });
      return;
    }
  }

  exitTranslationMode(true);
}
window.exitTranslationMode = exitTranslationMode;
