// =========================================================================
// VOCAFLOW 06E-DICTATION-ENGINE.JS (v0.10.10-31 Build 332 - SENTENCE DICTATION VIP β)
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
let dictationSessionScores = [];
let dictationHintsUsedTotal = 0;
let dictationSkipsUsedTotal = 0;
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
// 2B. SENTENCE SANITIZER (Issue 11 - AI English Only, No Parentheses Leak)
// =========================================================================
function sanitizeEnglishDictationSentence(rawText, fallbackVi = '') {
  if (!rawText) return { cleanSentence: '', extractedVi: fallbackVi || '' };
  let text = String(rawText).trim().replace(/^["'“”]|["'“”]$/g, '');
  let extractedVi = fallbackVi ? String(fallbackVi).trim() : '';

  // 1. Extract Vietnamese translation inside parentheses if present (e.g. "(tiếng Việt)" or "（tiếng Việt）")
  const parenMatch = text.match(/[（(]([^)）]*[\u00C0-\u1EF9]+[^)）]*)[)）]/);
  if (parenMatch && parenMatch[1]) {
    const candidateVi = parenMatch[1].trim();
    if (!extractedVi || extractedVi.startsWith('Câu ví dụ') || extractedVi.length < candidateVi.length) {
      extractedVi = candidateVi;
    }
    text = text.replace(/[（(][^)）]*[\u00C0-\u1EF9]+[^)）]*[)）]/g, ' ').trim();
  }

  // 2. Strip any residual Vietnamese characters from the English sentence string so TTS will never read non-English
  text = text.replace(/[\u00C0-\u1EF9]/g, '');
  text = text.replace(/\s+/g, ' ').trim();
  text = text.replace(/^[-,:;\s]+|[-,:;\s]+$/g, '').trim();

  // If text doesn't end with punctuation, add a period
  if (text && !/[.!?]$/.test(text)) {
    text += '.';
  }

  return {
    cleanSentence: text,
    extractedVi: extractedVi
  };
}

// =========================================================================
// 3. SENTENCE DICTATION REPOSITORY & BUILDER (Issue 7, 11, 12 - Smart POS-Aware Templates)
// =========================================================================
function generateSentenceForWord(mainWord, difficulty, poolWords = []) {
  const term = (mainWord.term || '').trim();
  const rawPos = (mainWord.partOfSpeech || 'noun').toLowerCase();
  const pos = rawPos.includes('verb') ? 'verb' : (rawPos.includes('adj') ? 'adjective' : (rawPos.includes('adv') ? 'adverb' : 'noun'));
  const rawDefVi = mainWord.definitionVi || mainWord.definition || '';
  const defVi = rawDefVi.replace(/^["'“”]|["'“”]$/g, '').trim();

  // Collect potential secondary target words from pool
  const otherWords = (poolWords || []).filter(w => w.id !== mainWord.id && w.term && w.term !== term);
  const w2 = otherWords.length > 0 ? otherWords[0] : null;
  const term2 = w2 ? (w2.term || '').trim() : '';
  const defVi2 = w2 ? (w2.definitionVi || w2.definition || '').trim() : '';
  const w3 = otherWords.length > 1 ? otherWords[1] : null;
  const term3 = w3 ? (w3.term || '').trim() : '';
  const defVi3 = w3 ? (w3.definitionVi || w3.definition || '').trim() : '';

  const cfg = getDictationDifficultyConfig(difficulty);
  let targetWordsArr = [{ term, pos: mainWord.partOfSpeech || 'noun', defVi }];

  // 1. Check if existing example fits nicely and sanitize it
  if (mainWord.exampleSentence || mainWord.example) {
    const rawEx = (mainWord.exampleSentence || mainWord.example).trim();
    const sanitized = sanitizeEnglishDictationSentence(rawEx, mainWord.exampleTranslationVi || '');
    const cleanEx = sanitized.cleanSentence;
    const wordCount = cleanEx ? cleanEx.split(/\s+/).length : 0;

    if (cleanEx && wordCount >= (cfg.minWords - 2) && wordCount <= (cfg.maxWords + 6) && cleanEx.toLowerCase().includes(term.toLowerCase())) {
      let finalTrans = sanitized.extractedVi;
      if (!finalTrans || finalTrans.startsWith('Câu ví dụ')) {
        finalTrans = (defVi ? `Câu ví dụ có chứa từ "${term}" mang nghĩa: ${defVi}.` : `Câu ví dụ thực tế chứa từ "${term}".`);
      }
      return {
        sentenceText: cleanEx,
        sentenceTranslationVi: finalTrans,
        targetWords: targetWordsArr
      };
    }
  }

  // 2. High Quality POS-Aware Curated Templates with Genuine Contextual Vietnamese Translations (Issue 12)
  const safeMeaning = defVi ? defVi.toLowerCase() : term;

  if (difficulty === 'easy') {
    if (pos === 'verb') {
      const verbTemplates = [
        { en: `She wants to ${term} every morning to stay healthy.`, vi: `Cô ấy muốn ${safeMeaning} vào mỗi buổi sáng để duy trì sức khỏe.` },
        { en: `They decided to ${term} together before the meeting started.`, vi: `Họ đã quyết định cùng nhau ${safeMeaning} trước khi cuộc họp bắt đầu.` },
        { en: `We need to ${term} carefully to achieve the best results.`, vi: `Chúng ta cần phải ${safeMeaning} một cách cẩn thận để đạt kết quả tốt nhất.` },
        { en: `He tried to ${term} the task without any hesitation.`, vi: `Anh ấy đã cố gắng ${safeMeaning} nhiệm vụ mà không hề do dự.` },
        { en: `You should ${term} with great attention to every detail.`, vi: `Bạn nên ${safeMeaning} với sự chú ý cao độ đến từng chi tiết.` }
      ];
      const picked = verbTemplates[Math.floor(Math.random() * verbTemplates.length)];
      return { sentenceText: picked.en, sentenceTranslationVi: picked.vi, targetWords: targetWordsArr };
    }
    if (pos === 'adjective') {
      const adjTemplates = [
        { en: `The weather today is surprisingly ${term} and pleasant.`, vi: `Thời tiết hôm nay thật bất ngờ khi rất ${safeMeaning} và dễ chịu.` },
        { en: `This was a truly ${term} experience for our whole team.`, vi: `Đây thực sự là một trải nghiệm ${safeMeaning} đối với cả đội ngũ chúng tôi.` },
        { en: `She gave a very ${term} explanation during the presentation.`, vi: `Cô ấy đã đưa ra một lời giải thích rất ${safeMeaning} trong buổi thuyết trình.` },
        { en: `We noticed a ${term} change in the final design.`, vi: `Chúng tôi đã nhận thấy một sự thay đổi ${safeMeaning} trong bản thiết kế cuối cùng.` },
        { en: `His reaction was remarkably ${term} under high pressure.`, vi: `Phản ứng của anh ấy rất đáng chú ý khi giữ được sự ${safeMeaning} dưới áp lực cao.` }
      ];
      const picked = adjTemplates[Math.floor(Math.random() * adjTemplates.length)];
      return { sentenceText: picked.en, sentenceTranslationVi: picked.vi, targetWords: targetWordsArr };
    }
    if (pos === 'adverb') {
      const advTemplates = [
        { en: `She completed the challenging assignment ${term} and accurately.`, vi: `Cô ấy đã hoàn thành bài tập đầy thử thách một cách ${safeMeaning} và chính xác.` },
        { en: `They listened ${term} to the instructions given by the teacher.`, vi: `Họ đã lắng nghe một cách ${safeMeaning} các chỉ dẫn của giáo viên.` },
        { en: `The system operates ${term} even during the peak hours.`, vi: `Hệ thống vận hành một cách ${safeMeaning} ngay cả trong những khung giờ cao điểm.` }
      ];
      const picked = advTemplates[Math.floor(Math.random() * advTemplates.length)];
      return { sentenceText: picked.en, sentenceTranslationVi: picked.vi, targetWords: targetWordsArr };
    }
    // Noun / Default
    const nounTemplates = [
      { en: `The teacher explained the concept of ${term} in class.`, vi: `Giáo viên đã giải thích khái niệm về ${safeMeaning} trong lớp học.` },
      { en: `They found very useful information about this ${term} today.`, vi: `Họ đã tìm thấy thông tin rất hữu ích về ${safeMeaning} này hôm nay.` },
      { en: `Our main goal is to understand how this ${term} works.`, vi: `Mục tiêu chính của chúng tôi là hiểu rõ cách thức ${safeMeaning} này vận hành.` },
      { en: `She received a valuable ${term} from her mentor yesterday.`, vi: `Cô ấy đã nhận được một ${safeMeaning} quý giá từ người hướng dẫn vào hôm qua.` },
      { en: `Learning about this ${term} expands our practical knowledge.`, vi: `Tìm hiểu về ${safeMeaning} này giúp mở rộng kiến thức thực tiễn của chúng ta.` }
    ];
    const picked = nounTemplates[Math.floor(Math.random() * nounTemplates.length)];
    return { sentenceText: picked.en, sentenceTranslationVi: picked.vi, targetWords: targetWordsArr };
  }

  if (difficulty === 'medium') {
    if (term2 && cfg.targetWordCount >= 2) {
      targetWordsArr.push({ term: term2, pos: w2.partOfSpeech || 'noun', defVi: defVi2 });
      const doubleTemplates = [
        { en: `Recent academic studies demonstrate that combining ${term} with ${term2} delivers substantial educational benefits.`, vi: `Các nghiên cứu học thuật gần đây chứng minh rằng việc kết hợp ${term} cùng ${term2} mang lại nhiều lợi ích giáo dục to lớn.` },
        { en: `Our organization decided to introduce a new ${term} alongside ${term2} to optimize workplace productivity.`, vi: `Tổ chức của chúng tôi quyết định giới thiệu ${term} mới cùng với ${term2} nhằm tối ưu hóa năng suất làm việc.` }
      ];
      const picked = doubleTemplates[Math.floor(Math.random() * doubleTemplates.length)];
      return { sentenceText: picked.en, sentenceTranslationVi: picked.vi, targetWords: targetWordsArr };
    }

    if (pos === 'verb') {
      const verbMedTemplates = [
        { en: `Students who actively learn to ${term} tend to solve complex problems much faster.`, vi: `Những học sinh chủ động học cách ${safeMeaning} có xu hướng giải quyết các vấn đề phức tạp nhanh hơn nhiều.` },
        { en: `The management team encourages all staff members to ${term} whenever new challenges arise.`, vi: `Ban quản lý khuyến khích tất cả nhân viên ${safeMeaning} bất cứ khi nào có thách thức mới phát sinh.` },
        { en: `In order to achieve great milestones, we must ${term} consistently throughout the year.`, vi: `Để đạt được những cột mốc lớn, chúng ta cần phải ${safeMeaning} một cách kiên trì trong suốt cả năm.` }
      ];
      const picked = verbMedTemplates[Math.floor(Math.random() * verbMedTemplates.length)];
      return { sentenceText: picked.en, sentenceTranslationVi: picked.vi, targetWords: targetWordsArr };
    }
    if (pos === 'adjective') {
      const adjMedTemplates = [
        { en: `Having a ${term} mindset allows researchers to uncover surprising insights in modern science.`, vi: `Có một tư duy ${safeMeaning} cho phép các nhà nghiên cứu khám phá ra những hiểu biết bất ngờ trong khoa học hiện đại.` },
        { en: `The company established a ${term} framework that supports continuous innovation and collaboration.`, vi: `Công ty đã thiết lập một khuôn khổ ${safeMeaning} hỗ trợ sự đổi mới và hợp tác liên tục.` }
      ];
      const picked = adjMedTemplates[Math.floor(Math.random() * adjMedTemplates.length)];
      return { sentenceText: picked.en, sentenceTranslationVi: picked.vi, targetWords: targetWordsArr };
    }

    const nounMedTemplates = [
      { en: `Students who thoroughly understand the importance of ${term} usually perform significantly better on their exams.`, vi: `Những học sinh hiểu thấu đáo tầm quan trọng của ${safeMeaning} thường đạt kết quả tốt hơn đáng kể trong các kỳ thi.` },
      { en: `Our development team decided to adopt a modern ${term} in order to improve overall system reliability.`, vi: `Đội ngũ phát triển của chúng tôi quyết định áp dụng một ${safeMeaning} hiện đại nhằm nâng cao độ tin cậy của toàn bộ hệ thống.` },
      { en: `Environmental experts are actively researching the direct relationship between this ${term} and regional climate patterns.`, vi: `Các chuyên gia môi trường đang tích cực nghiên cứu mối quan hệ trực tiếp giữa ${safeMeaning} này và các hình thái khí hậu khu vực.` }
    ];
    const picked = nounMedTemplates[Math.floor(Math.random() * nounMedTemplates.length)];
    return { sentenceText: picked.en, sentenceTranslationVi: picked.vi, targetWords: targetWordsArr };
  }

  if (difficulty === 'hard') {
    if (term2 && cfg.targetWordCount >= 2) targetWordsArr.push({ term: term2, pos: w2.partOfSpeech || 'noun', defVi: defVi2 });
    if (term3 && cfg.targetWordCount >= 3) targetWordsArr.push({ term: term3, pos: w3.partOfSpeech || 'noun', defVi: defVi3 });

    const hardTemplates = [
      { en: `Although many distinguished scholars debated the exact scope of ${term}, everyone agreed that its practical application is indispensable for long-term institutional success.`, vi: `Mặc dù nhiều học giả uy tín đã tranh luận về phạm vi chính xác của ${safeMeaning}, mọi người đều nhất trí rằng ứng dụng thực tiễn của nó là không thể thiếu cho sự thành công lâu dài của tổ chức.` },
      { en: `The international council has officially introduced rigorous standards regarding ${term} to safeguard ethical compliance and foster transparent international collaboration.`, vi: `Hội đồng quốc tế đã chính thức ban hành các tiêu chuẩn nghiêm ngặt liên quan đến ${safeMeaning} nhằm đảm bảo tính tuân thủ đạo đức và thúc đẩy sự hợp tác quốc tế minh bạch.` },
      { en: `Through comprehensive multidisciplinary investigations, scientists demonstrated how mastering ${term} positively impacts economic stability and environmental sustainability.`, vi: `Thông qua các cuộc điều tra đa ngành toàn diện, các nhà khoa học đã chứng minh cách thức làm chủ ${safeMeaning} tác động tích cực đến sự ổn định kinh tế và tính bền vững môi trường.` }
    ];
    const picked = hardTemplates[Math.floor(Math.random() * hardTemplates.length)];
    return { sentenceText: picked.en, sentenceTranslationVi: picked.vi, targetWords: targetWordsArr };
  }

  // Expert / Master (20-30 words, 1-3 target words, hidden)
  if (term2 && cfg.targetWordCount >= 2) targetWordsArr.push({ term: term2, pos: w2.partOfSpeech || 'noun', defVi: defVi2 });
  if (term3 && cfg.targetWordCount >= 3) targetWordsArr.push({ term: term3, pos: w3.partOfSpeech || 'noun', defVi: w3.definitionVi || '' });

  const expertTemplates = [
    { en: `Notwithstanding the persistent socioeconomic challenges encountered throughout the historical transition, the strategic implementation of ${term} enabled the institution to achieve unprecedented academic breakthroughs and international recognition.`, vi: `Bất chấp những thách thức kinh tế xã hội dai dẳng gặp phải trong suốt quá trình chuyển dịch lịch sử, việc triển khai chiến lược ${safeMeaning} đã giúp viện nghiên cứu đạt được những đột phá học thuật chưa từng có và sự công nhận quốc tế.` },
    { en: `Recent empirical investigations conducted across various developing metropolitan regions have confirmed that integrating ${term} with sustainable infrastructure significantly reduces long-term operational expenditures while accelerating community development.`, vi: `Các cuộc điều tra thực nghiệm gần đây được tiến hành trên khắp các vùng đô thị đang phát triển đã xác nhận rằng việc tích hợp ${safeMeaning} với cơ sở hạ tầng bền vững giúp giảm đáng kể chi phí vận hành dài hạn trong khi đẩy nhanh sự phát triển cộng đồng.` },
    { en: `By rigorously synthesizing theoretical methodologies with contemporary practical frameworks, researchers established that mastering ${term} provides professionals with a distinct competitive advantage in rapidly evolving international markets.`, vi: `Bằng cách tổng hợp chặt chẽ các phương pháp lý thuyết với các khuôn khổ thực tiễn đương đại, các nhà nghiên cứu đã xác lập rằng việc làm chủ ${safeMeaning} mang lại cho các chuyên gia lợi thế cạnh tranh rõ rệt trong các thị trường quốc tế đang chuyển dịch nhanh chóng.` }
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
  dictationSessionScores = [];
  dictationHintsUsedTotal = 0;
  dictationSkipsUsedTotal = 0;
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

  // Ensure TTS only speaks clean English text without any Vietnamese inside parentheses (Issue 11)
  const sanitized = sanitizeEnglishDictationSentence(dictationCurrentOriginalSentence, dictationCurrentTranslation);
  const textToSpeak = sanitized.cleanSentence || dictationCurrentOriginalSentence;

  if (typeof speakText === 'function' && textToSpeak) {
    speakText(textToSpeak, 'en-US');
  }

  const wordsCount = textToSpeak ? textToSpeak.split(/\s+/).length : 5;
  const durationMs = Math.max(1500, (wordsCount * 450) / dictationAudioRate);
  setTimeout(() => {
    if (waveBox) waveBox.style.display = 'none';
  }, durationMs);
}
window.playDictationAudio = playDictationAudio;

// =========================================================================
// 7. VOCAHINT MULTI-STAGE & VOCASKIP INTEGRATION (Issue 10 - Calibrated 3-Tier)
// =========================================================================
function useDictationHint() {
  const currentHints = typeof getUserHints === 'function' ? getUserHints() : 0;
  if (currentHints <= 0) {
    if (typeof showToast === 'function') showToast('⚠️ Bạn đã hết VocaHint! Hãy ghé Cửa Hàng để nạp thêm nhé.');
    if (typeof openShopModal === 'function') openShopModal();
    return;
  }

  setUserHints(currentHints - 1);
  dictationHintsUsedTotal++;
  if (typeof addLedgerEntry === 'function') {
    addLedgerEntry('HINT_USED', 0, `Sử dụng 1 VocaHint trong Nghe Gõ Câu (còn ${currentHints - 1})`);
  }
  updateDictationWalletBadges();

  dictationHintsRevealed++;
  const hintBox = document.getElementById('dictation-hint-box');
  const hintContent = document.getElementById('dictation-hint-content');

  if (hintBox && hintContent) {
    hintBox.style.display = 'block';

    const wordsArr = (dictationCurrentOriginalSentence || '').trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = wordsArr.length;
    const targetTermsStr = (dictationCurrentTargetWords || []).map(tw => `<code>${escapeHtml(tw.term)}</code> (${escapeHtml(tw.pos || 'từ vựng')}${tw.defVi ? `: ${escapeHtml(tw.defVi)}` : ''})`).join(', ');

    // Calibrated 3-Tier VocaHint Engine (Issue 10)
    if (dictationHintsRevealed === 1) {
      // Tier 1: Semantic role, POS & keyword clue (NO full translation leak)
      const mainPos = (dictationCurrentWordRef?.partOfSpeech || 'từ vựng').toLowerCase();
      let contextClue = 'Câu diễn tả một thông điệp giao tiếp rõ ràng và mạch lạc trong đời sống.';
      if (mainPos.includes('verb')) contextClue = 'Câu diễn tả một hành động, quyết định hoặc tương tác cụ thể.';
      else if (mainPos.includes('adj')) contextClue = 'Câu miêu tả đặc điểm, tính chất hoặc trạng thái của một sự việc / đối tượng.';
      else if (mainPos.includes('adv')) contextClue = 'Câu bổ nghĩa cho cách thức, mức độ hoặc tần suất thực hiện hành động.';
      else if (mainPos.includes('noun')) contextClue = 'Câu đề cập đến một sự vật, chủ thể, khái niệm hoặc hiện tượng thực tế.';

      hintContent.innerHTML = `
        <div style="font-size: 13px; line-height: 1.6; color: var(--text);">
          <div style="margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
            <span>🎯</span> <strong>Từ vựng trọng tâm:</strong> ${targetTermsStr || 'Đang xác định'}
          </div>
          <div style="color: #38bdf8; font-size: 12px; margin-bottom: 3px;">
            💡 <strong>Ngữ cảnh:</strong> ${contextClue}
          </div>
          <div style="color: var(--text-muted); font-size: 11.5px;">
            📝 Câu gồm <strong>${wordCount} từ</strong>. Hãy nghe lại ở tốc độ 0.75x để bắt trọn từng âm nối!
          </div>
        </div>
      `;
    } else if (dictationHintsRevealed === 2) {
      // Tier 2: Full natural sentence translation
      hintContent.innerHTML = `
        <div style="font-size: 13px; line-height: 1.6; color: var(--text);">
          <div style="margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
            <span>🎯</span> <strong>Từ vựng trọng tâm:</strong> ${targetTermsStr || 'Đang xác định'}
          </div>
          <div style="color: #34d399; font-size: 13px; background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; padding: 6px 10px; border-radius: 4px;">
            🇻🇳 <strong>Dịch nghĩa toàn câu:</strong> "${escapeHtml(dictationCurrentTranslation)}"
          </div>
        </div>
      `;
    } else {
      // Tier 3: Masked sentence frame with word initials (e.g. "S__ w____ t_ l____ t___ t____.")
      const maskedWords = wordsArr.map(w => {
        const clean = w.replace(/^[^\w]+|[^\w]+$/g, '');
        if (clean.length <= 1) return w;
        const first = clean[0];
        const dashes = '_'.repeat(clean.length - 1);
        return w.replace(clean, first + dashes);
      }).join(' ');

      hintContent.innerHTML = `
        <div style="font-size: 13px; line-height: 1.6; color: var(--text);">
          <div style="color: #34d399; font-size: 12.5px; margin-bottom: 6px;">
            🇻🇳 <strong>Dịch nghĩa:</strong> "${escapeHtml(dictationCurrentTranslation)}"
          </div>
          <div style="color: #fbbf24; font-size: 13px; font-family: monospace; background: rgba(0,0,0,0.25); border: 1px solid rgba(251, 191, 36, 0.3); padding: 8px 12px; border-radius: 8px; letter-spacing: 0.5px;">
            🔤 <strong>Khung câu gợi ý:</strong> ${escapeHtml(maskedWords)}
          </div>
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
  dictationSkipsUsedTotal++;
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
  dictationSessionScores.push(accuracyScore);

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
// 9. CELEBRATION, FIREWORKS & 5-TILE SESSION SETTLEMENT (Issue 8)
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
  if (typeof calculateUnifiedSessionPoints === 'function') {
    res = calculateUnifiedSessionPoints('dictation', dictationSessionPointsEarned, done, total);
  } else if (typeof calculateSessionFinalPointsV3 === 'function') {
    res = calculateSessionFinalPointsV3(dictationSessionPointsEarned, done, total, isComp);
  } else if (typeof calculateSessionFinalPoints === 'function') {
    res = calculateSessionFinalPoints(dictationSessionPointsEarned, done, total, isComp);
  }

  const finalPts = res.finalPts;
  if (finalPts > 0) {
    if (typeof setUserPoints === 'function') setUserPoints(getUserPoints() + finalPts);
    if (typeof addLedgerEntry === 'function') {
      const bonusText = res.milestoneBonus > 0 ? ` + Thưởng mốc ${done} câu (+${res.milestoneBonus} Xu)` : '';
      addLedgerEntry('STUDY_DICTATION', finalPts, `Luyện Nghe Gõ Câu (${done}/${total} câu, x${res.combinedMult || 1.0}${bonusText})`);
    }
    if (typeof recordStudyFlowAction === 'function') {
      recordStudyFlowAction('dictation');
    }
    if (typeof saveDatabase === 'function') saveDatabase(true);
    if (typeof pushCurrentDatabaseToCloud === 'function') pushCurrentDatabaseToCloud();
  }

  // Duration
  const durationSec = dictationStartTime > 0 ? Math.max(1, Math.floor((Date.now() - dictationStartTime) / 1000)) : 0;
  const mins = Math.floor(durationSec / 60);
  const secs = durationSec % 60;
  const durationStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  if (done > 0 && typeof addDailyStudySeconds === 'function') {
    addDailyStudySeconds(durationSec, 'dictation');
  }

  // Calculate Average Accuracy Score & Pass Rate
  let avgScore = 0;
  if (dictationSessionScores.length > 0) {
    const sum = dictationSessionScores.reduce((a, b) => a + b, 0);
    avgScore = Math.round(sum / dictationSessionScores.length);
  }
  const passedCount = dictationSessionScores.filter(s => s >= dictationFloorScore).length;
  const floorRatioPct = total > 0 ? Math.round((passedCount / total) * 100) : 0;

  // Populate 5-Tile Stats Dashboard
  const floorRatioEl = document.getElementById('dictation-res-floor-ratio');
  const pointsEl = document.getElementById('dictation-res-points');
  const avgScoreEl = document.getElementById('dictation-res-avg-score');
  const hintsSkipsEl = document.getElementById('dictation-res-hints-skips');
  const durationEl = document.getElementById('dictation-res-duration');
  const diffBadgeEl = document.getElementById('dictation-res-difficulty-badge');

  if (floorRatioEl) floorRatioEl.textContent = `${passedCount}/${total} (${floorRatioPct}%)`;
  if (pointsEl) pointsEl.textContent = `+${finalPts} VoCoin`;
  if (avgScoreEl) avgScoreEl.textContent = `${avgScore} / 100`;
  if (hintsSkipsEl) hintsSkipsEl.textContent = `${dictationHintsUsedTotal} gợi ý • ${dictationSkipsUsedTotal} skip`;
  if (durationEl) durationEl.textContent = durationStr;

  const cfg = getDictationDifficultyConfig(currentDictationDifficulty);
  if (diffBadgeEl) diffBadgeEl.textContent = `🎧 Cấp độ: ${cfg.label} (x${dictationDiffMult})`;

  // Bonus breakdown pill
  const bonusBox = document.getElementById('dictation-res-bonus-box');
  if (bonusBox) {
    if (res.commitmentFactor < 1.0 || res.volumeMultiplier > 1.0 || (res.vipMultiplier && res.vipMultiplier > 1.0)) {
      bonusBox.style.display = 'block';
      bonusBox.innerHTML = `✨ Hệ số hoàn thành: <strong>x${res.commitmentFactor || res.completionMult || 1.0}</strong> • Khối lượng: <strong>x${res.volumeMultiplier || res.deckLengthMult || 1.0}</strong> • Trọng số: <strong>x${res.modeWeight || 2.4}</strong>`;
    } else {
      bonusBox.style.display = 'none';
    }
  }

  if (typeof updateModalBrainEnergyIndicator === 'function') {
    updateModalBrainEnergyIndicator('dictation-res-energy-box', res);
  }

  // Unpassed / Wrong words retry banner
  const wrongWordsUnique = [];
  const seen = new Set();
  dictationSessionWrongWords.forEach(w => {
    if (!w) return;
    const k = (w.id || w.term || '').toLowerCase();
    if (k && !seen.has(k)) {
      seen.add(k);
      wrongWordsUnique.push(w);
    }
  });

  const wrongBanner = document.getElementById('dictation-res-wrong-banner');
  const wrongCountEl = document.getElementById('dictation-res-wrong-count');
  const wrongBtnLabel = document.getElementById('dictation-res-wrong-btn-label');

  if (wrongWordsUnique.length > 0 && wrongBanner) {
    wrongBanner.style.display = 'block';
    if (wrongCountEl) wrongCountEl.textContent = `${wrongWordsUnique.length} từ`;
    if (wrongBtnLabel) wrongBtnLabel.textContent = `${wrongWordsUnique.length} từ`;
  } else if (wrongBanner) {
    wrongBanner.style.display = 'none';
  }

  if (typeof playVocaSfx === 'function') playVocaSfx('fireworks', true);
  if (typeof openModal === 'function') openModal('modal-dictation-result');
}

function retryDictationWrongWordsOnly() {
  const wrongWordsUnique = [];
  const seen = new Set();
  dictationSessionWrongWords.forEach(w => {
    if (!w) return;
    const k = (w.id || w.term || '').toLowerCase();
    if (k && !seen.has(k)) {
      seen.add(k);
      wrongWordsUnique.push(w);
    }
  });

  if (wrongWordsUnique.length === 0) {
    if (typeof showToast === 'function') showToast('🎉 Bạn không có từ nào bị sai cần luyện lại!');
    return;
  }

  closeModal('modal-dictation-result');
  startDictationMode(false, wrongWordsUnique, true);
}
window.retryDictationWrongWordsOnly = retryDictationWrongWordsOnly;

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

  // Early exit points settlement via Unified Balance v4
  if (!dictationIsCompleted && dictationSessionPointsEarned !== 0) {
    const isComp = done >= total && total > 0;
    const res = (typeof calculateUnifiedSessionPoints === 'function')
      ? calculateUnifiedSessionPoints('dictation', dictationSessionPointsEarned, done, total)
      : (typeof calculateSessionFinalPointsV3 === 'function')
        ? calculateSessionFinalPointsV3(dictationSessionPointsEarned, done, total, isComp)
        : calculateSessionFinalPoints(dictationSessionPointsEarned, done, total, isComp);
    const finalPts = res.finalPts;

    if (finalPts !== 0 && typeof setUserPoints === 'function') {
      const curDeck = (typeof decks !== 'undefined') ? decks.find(d => d.id === currentDeckId) : null;
      const deckTitle = curDeck ? curDeck.title : 'Bộ từ vựng';
      setUserPoints(Math.max(0, getUserPoints() + finalPts));
      const bonusText = res.milestoneBonus > 0 ? ` + Thưởng mốc ${done} câu (+${res.milestoneBonus} Xu)` : '';
      if (typeof addLedgerEntry === 'function') {
        addLedgerEntry('STUDY_DICTATION', finalPts, `Nghe gõ câu "${deckTitle}" (${done}/${total} câu, x${res.combinedMult || 1.0}${bonusText})`);
      }
      if (typeof saveDatabase === 'function') saveDatabase(true);
      if (typeof pushCurrentDatabaseToCloud === 'function') pushCurrentDatabaseToCloud();
      if (typeof showToast === 'function') {
        showToast(`🎉 Nghe Gõ Câu: ${finalPts > 0 ? '+' : ''}${finalPts} Xu`);
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
