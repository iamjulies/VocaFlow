// =========================================================================

// VOCAFLOW 07-SPEAKING-ENGINE.JS (v0.10.9-48)

// AI Speaking Lab, MediaRecorder, VAD, Gemini audio analysis, multi-take economy

// =========================================================================

    // =========================================================================
    // =========================================================================
    // AI SPEAKING & PRONUNCIATION LAB ENGINE (v0.10.6d - FULL MULTI-TAKE ECONOMY)
    // =========================================================================
    // AI SPEAKING & PRONUNCIATION LAB ENGINE (v0.10.6o - ELSA GRADE PHONETICS)
    // =========================================================================
    // AI SPEAKING & PRONUNCIATION LAB ENGINE (v0.10.6p - ELSA GRADE PHONETICS)
    // =========================================================================
    // AI SPEAKING & PRONUNCIATION LAB ENGINE (v0.10.6q - ELSA GRADE PHONETICS)
    // =========================================================================
    // AI SPEAKING & PRONUNCIATION LAB ENGINE (v0.10.6q - ELSA GRADE PHONETICS)
    // =========================================================================
    // AI SPEAKING & PRONUNCIATION LAB ENGINE (v0.10.6r - ELSA GRADE PHONETICS)
    // =========================================================================
    // AI SPEAKING & PRONUNCIATION LAB ENGINE (v0.10.6t - OXFORD CALIBRATED)
    // =========================================================================
    let speakingWordsList = [];
    let currentSpeakingIndex = 0;
    let speakingMediaRecorder = null;
    let speakingAudioChunks = [];
    let speakingAudioBlob = null;
    let speakingAudioBlobUrl = null;
    let speakingCurrentAudioBase64 = null;
    let speakingFinalAudioMime = 'audio/webm';
    let isSpeakingRecording = false;
    let speakingFlowState = 'idle';
    let speakingRecordTimerInterval = null;
    let speakingRecordSeconds = 0;
    let speakingSessionPointsEarned = 0;
    let speakingGradedWordIds = new Set();
    let speakingCurrentMediaStream = null;
    let speakingAutoPlayTimeout = null;
    let speakingFireworksAnimationId = null;

    // v0.10.6t: Session Metrics & Tracking
    let speakingSessionTakes = [];       // [{ wordId, score, isFloor }]
    let speakingTotalTakesCount = 0;     // Total recording takes submitted
    let speakingFloorTakesCount = 0;     // Total takes passing floor score
    let speakingWordsPassedFloorCount = 0;
    let speakingWordsSkippedCount = 0;
    let speakingWordSkipsLeft = 3;
    let speakingTotalWords = 0;
    let speakingCompletedWords = 0;
    let speakingStartTime = 0;
    let speakingIsCompleted = false;
    let isEvaluatingSpeaking = false;

    // Multi-Take Economy & Difficulty Engine
    let currentSpeakingDifficulty = localStorage.getItem('vocaflow_speaking_difficulty') || 'easy';
    let selectedSpeakingSetupDifficulty = 'easy';
    let speakingCluesConfig = JSON.parse(localStorage.getItem('vocaflow_speaking_clues') || '{"def":true,"ipa":true,"audio":true}');
    let speakingSetupUseSelection = false;
    let speakingSetupCustomWordList = null;
    let speakingTakes = [];
    let speakingCurrentTakeIndex = 0;
    let speakingMaxTakes = 5;
    let speakingMaxListens = 5;
    let speakingListensUsed = 0;
    let speakingAutoPlayDone = false;
    let speakingFloorScore = 70;
    let speakingFloorReached = false;
    let speakingSyllableCache = {};
    let pendingAudioBlob = null;
    let pendingAudioBase64 = null;

    function getSupportedAudioMimeType() {
      const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/wav', 'audio/ogg'];
      for (const t of types) {
        if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) return t;
      }
      return '';
    }

    async function getSpeakingAudioStream() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false
          }
        });
        speakingCurrentMediaStream = stream;
        return stream;
      } catch (e1) {
        try {
          const fallback = await navigator.mediaDevices.getUserMedia({ audio: true });
          speakingCurrentMediaStream = fallback;
          return fallback;
        } catch (e2) {
          throw e2;
        }
      }
    }

    async function analyzeAudioSpeechEnergy(blob) {
      if (!blob || blob.size < 1500) return { hasVoice: false, reason: 'too_small' };
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return { hasVoice: blob.size > 2500, reason: 'no_audiocontext' };
        const audioCtx = new AudioCtx();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0);
        let sumSquares = 0, peak = 0, speechSamplesCount = 0;
        for (let i = 0; i < channelData.length; i++) {
          const val = Math.abs(channelData[i]);
          sumSquares += val * val;
          if (val > peak) peak = val;
          if (val > 0.03) speechSamplesCount++;
        }
        const rms = Math.sqrt(sumSquares / channelData.length);
        const duration = audioBuffer.duration;
        const speechDuration = speechSamplesCount / audioBuffer.sampleRate;
        await audioCtx.close();
        if (peak < 0.035 || rms < 0.006 || speechDuration < 0.15) return { hasVoice: false, reason: 'silent', rms, peak, speechDuration, duration };
        return { hasVoice: true, rms, peak, speechDuration, duration };
      } catch (e) {
        return { hasVoice: blob.size > 2500, reason: 'fallback' };
      }
    }

    // Difficulty Config Engine
    function getSpeakingDifficultyConfig(diff) {
      if (diff === 'hard') return { floorScore: 90, diffMult: 2.0, maxTakes: 3, maxListens: 3, minClues: 1, maxClues: 1 };
      if (diff === 'medium') return { floorScore: 80, diffMult: 1.5, maxTakes: 4, maxListens: 4, minClues: 2, maxClues: 2 };
      return { floorScore: 70, diffMult: 1.0, maxTakes: 5, maxListens: 5, minClues: 3, maxClues: 3 };
    }

    function getSpeakingClueMult(diff = null, clues = null) {
      const d = diff || selectedSpeakingSetupDifficulty || currentSpeakingDifficulty || 'easy';
      const c = clues || speakingCluesConfig || { def: true, ipa: true, audio: true };
      const def = !!c.def, ipa = !!c.ipa, audio = !!c.audio;

      if (d === 'easy') return 1.0;
      if (d === 'medium') {
        if (def && ipa) return 1.5;
        if (def && audio) return 1.25;
        if (ipa && audio) return 1.0;
        return 1.0;
      }
      if (d === 'hard') {
        if (def && !ipa && !audio) return 1.5;
        if (!def && ipa && !audio) return 1.25;
        if (!def && !ipa && audio) return 1.0;
        return 1.0;
      }
      return 1.0;
    }

    function getSpeakingTotalMult(diff = null, clues = null) {
      const d = diff || selectedSpeakingSetupDifficulty || currentSpeakingDifficulty || 'easy';
      const cfg = getSpeakingDifficultyConfig(d);
      const cm = getSpeakingClueMult(d, clues);
      return Math.round(cfg.diffMult * cm * 1000) / 1000;
    }

    function selectSpeakingSetupDifficulty(diff) {
      if (!hasAtLeastOneApiKey()) {
        alert('🔒 Chức năng Luyện Nói (Speaking) yêu cầu kết nối ít nhất 1 Google Gemini API Key!\n\nVui lòng vào Cài Đặt (Settings) để thêm API key!');
        openSettingsModal();
        return;
      }
      if (!['easy', 'medium', 'hard'].includes(diff)) diff = 'easy';
      selectedSpeakingSetupDifficulty = diff;
      currentSpeakingDifficulty = diff;

      ['easy', 'medium', 'hard'].forEach(d => {
        const card = document.getElementById('speaking-diff-card-' + d);
        if (!card) return;
        if (d === diff) {
          if (d === 'easy') {
            card.style.borderColor = '#10b981';
            card.style.background = 'rgba(16, 185, 129, 0.12)';
          } else if (d === 'medium') {
            card.style.borderColor = '#fbbf24';
            card.style.background = 'rgba(245, 158, 11, 0.12)';
          } else if (d === 'hard') {
            card.style.borderColor = '#f87171';
            card.style.background = 'rgba(239, 68, 68, 0.12)';
          }
        } else {
          card.style.borderColor = 'var(--border)';
          card.style.background = 'var(--surface-elevated)';
        }
      });

      if (diff === 'easy') {
        speakingCluesConfig = { def: true, ipa: true, audio: true };
      } else if (diff === 'medium') {
        const activeCount = Object.values(speakingCluesConfig).filter(Boolean).length;
        if (activeCount !== 2) {
          speakingCluesConfig = { def: true, ipa: true, audio: false };
        }
      } else if (diff === 'hard') {
        const activeCount = Object.values(speakingCluesConfig).filter(Boolean).length;
        if (activeCount !== 1) {
          speakingCluesConfig = { def: true, ipa: false, audio: false };
        }
      }

      ['def', 'ipa', 'audio'].forEach(k => {
        const chk = document.getElementById('speaking-chk-' + k);
        const isAct = !!speakingCluesConfig[k];
        if (chk) chk.checked = isAct;
        updateSpeakingClueUI(k, isAct);
      });

      updateSpeakingClueMultiplierBadge();
    }

    function toggleSpeakingClue(clueKey) {
      const diff = selectedSpeakingSetupDifficulty || currentSpeakingDifficulty || 'easy';

      if (diff === 'easy') {
        speakingCluesConfig = { def: true, ipa: true, audio: true };
        ['def', 'ipa', 'audio'].forEach(k => {
          const chk = document.getElementById('speaking-chk-' + k);
          if (chk) chk.checked = true;
          updateSpeakingClueUI(k, true);
        });
        updateSpeakingClueMultiplierBadge();
        showToast('⚠️ Cấp độ Dễ luôn giữ đủ 3/3 manh mối!');
        return;
      }

      if (diff === 'hard') {
        speakingCluesConfig = {
          def: clueKey === 'def',
          ipa: clueKey === 'ipa',
          audio: clueKey === 'audio'
        };
        ['def', 'ipa', 'audio'].forEach(k => {
          const chk = document.getElementById('speaking-chk-' + k);
          const isAct = !!speakingCluesConfig[k];
          if (chk) chk.checked = isAct;
          updateSpeakingClueUI(k, isAct);
        });
        updateSpeakingClueMultiplierBadge();
        localStorage.setItem('vocaflow_speaking_clues', JSON.stringify(speakingCluesConfig));
        return;
      }

      if (diff === 'medium') {
        if (speakingCluesConfig[clueKey]) {
          const inactiveKey = ['def', 'ipa', 'audio'].find(k => !speakingCluesConfig[k]);
          if (inactiveKey) {
            speakingCluesConfig[clueKey] = false;
            speakingCluesConfig[inactiveKey] = true;
          }
        } else {
          speakingCluesConfig[clueKey] = true;
          const activeKeys = ['def', 'ipa', 'audio'].filter(k => k !== clueKey && speakingCluesConfig[k]);
          if (activeKeys.length > 1) {
            speakingCluesConfig[activeKeys[1]] = false;
          }
        }

        ['def', 'ipa', 'audio'].forEach(k => {
          const c = document.getElementById('speaking-chk-' + k);
          const isAct = !!speakingCluesConfig[k];
          if (c) c.checked = isAct;
          updateSpeakingClueUI(k, isAct);
        });
        updateSpeakingClueMultiplierBadge();
        localStorage.setItem('vocaflow_speaking_clues', JSON.stringify(speakingCluesConfig));
        return;
      }
    }

    function updateSpeakingClueUI(clueKey, isChecked) {
      const toggleBtn = document.getElementById('speaking-clue-toggle-' + clueKey);
      if (!toggleBtn) return;
      if (isChecked) {
        toggleBtn.style.borderColor = '#6366f1';
        toggleBtn.style.background = 'rgba(99,102,241,0.2)';
        toggleBtn.style.color = '#fff';
      } else {
        toggleBtn.style.borderColor = 'var(--border)';
        toggleBtn.style.background = 'var(--surface-elevated)';
        toggleBtn.style.color = 'var(--text-muted)';
      }
    }

    function updateSpeakingClueMultiplierBadge() {
      const badge = document.getElementById('speaking-clues-multiplier-badge');
      if (!badge) return;
      const activeCount = ['def', 'ipa', 'audio'].filter(k => !!speakingCluesConfig[k]).length;
      const totalMult = getSpeakingTotalMult(selectedSpeakingSetupDifficulty, speakingCluesConfig);
      badge.textContent = '🎯 ' + activeCount + '/3 manh mối (x' + totalMult + ')';
    }

    function openSpeakingSetupModal(useSelectionOnly = false, customWordList = null) {
      dismissMiniAutoFlashcardIfActive();
      if (!hasAtLeastOneApiKey()) {
        alert('🔒 Chức năng Luyện Nói (Speaking) yêu cầu kết nối ít nhất 1 Google Gemini API Key để AI có thể phân tích và chấm điểm phát âm của bạn.\n\nVui lòng vào Cài Đặt (Settings) để thêm API key!');
        openSettingsModal();
        return;
      }
      speakingSetupUseSelection = useSelectionOnly;
      speakingSetupCustomWordList = customWordList;

      let deckWords = customWordList || getFilteredDeckWords();
      if (!customWordList && useSelectionOnly && selectedWordIds.size > 0) {
        deckWords = words.filter(w => selectedWordIds.has(w.id));
      } else if (!customWordList && selectedWordIds.size > 0) {
        deckWords = words.filter(w => selectedWordIds.has(w.id));
      } else if (!customWordList && (!deckWords || deckWords.length === 0)) {
        deckWords = words.filter(w => w.deckId === currentDeckId);
      }

      if (!deckWords || deckWords.length === 0) {
        alert('Không có từ vựng nào để luyện phát âm!');
        return;
      }

      const deck = decks.find(d => d.id === currentDeckId);
      const subtitle = document.getElementById('speaking-setup-subtitle');
      if (subtitle) {
        if (customWordList) {
          subtitle.textContent = '🎯 Hàng đợi ôn tập hôm nay • Tổng số: ' + deckWords.length + ' từ';
        } else {
          subtitle.textContent = 'VocaDeck: "' + (deck ? deck.title : 'Từ vựng đã chọn') + '" • Tổng số: ' + deckWords.length + ' từ';
        }
      }

      let savedDiff = localStorage.getItem('vocaflow_speaking_difficulty') || 'easy';
      if (savedDiff !== 'easy' && isGuest()) savedDiff = 'easy';
      selectSpeakingSetupDifficulty(savedDiff);

      const shuffleCb = document.getElementById('speaking-setup-shuffle-checkbox');
      if (shuffleCb) shuffleCb.checked = isStudyShuffle;

      openModal('modal-speaking-setup');
    }

    function confirmStartSpeakingFromModal() {
      if (!hasAtLeastOneApiKey()) {
        alert('🔒 Chức năng Luyện Nói (Speaking) yêu cầu kết nối ít nhất 1 Google Gemini API Key!\n\nVui lòng vào Cài Đặt (Settings) để thêm API key!');
        closeModal('modal-speaking-setup');
        openSettingsModal();
        return;
      }
      const hasClue = !!(speakingCluesConfig.def || speakingCluesConfig.ipa || speakingCluesConfig.audio);
      if (!hasClue) {
        alert('Vui lòng chọn ít nhất 1 manh mối hiển thị (Nghĩa TV, Phiên âm hoặc Âm thanh)!');
        return;
      }

      currentSpeakingDifficulty = selectedSpeakingSetupDifficulty || 'easy';
      localStorage.setItem('vocaflow_speaking_difficulty', currentSpeakingDifficulty);
      localStorage.setItem('vocaflow_speaking_clues', JSON.stringify(speakingCluesConfig));

      const shuffleCb = document.getElementById('speaking-setup-shuffle-checkbox');
      if (shuffleCb) {
        isStudyShuffle = shuffleCb.checked;
        localStorage.setItem('vocaflow_study_shuffle', isStudyShuffle ? 'true' : 'false');
      }

      closeModal('modal-speaking-setup');
      startSpeakingMode(speakingSetupUseSelection, speakingSetupCustomWordList);
    }

    function startSpeakingMode(useSelectionOnly = false, customWordList = null) {
      dismissMiniAutoFlashcardIfActive();
      if (!hasAtLeastOneApiKey()) {
        alert('🔒 Chức năng Luyện Nói (Speaking) yêu cầu kết nối ít nhất 1 Google Gemini API Key để AI có thể phân tích và chấm điểm phát âm của bạn.\n\nVui lòng vào Cài Đặt (Settings) để thêm API key!');
        openSettingsModal();
        return;
      }
      if (selectedSpeakingSetupDifficulty) {
        currentSpeakingDifficulty = selectedSpeakingSetupDifficulty;
      }
      studySourceContext = customWordList ? 'review-queue' : 'deck';
      speakingSessionWrongWords = [];
      let targetWords = customWordList || getFilteredDeckWords();
      if (!customWordList && useSelectionOnly && selectedWordIds.size > 0) {
        targetWords = words.filter(w => selectedWordIds.has(w.id));
      } else if (!customWordList && selectedWordIds.size > 0) {
        targetWords = words.filter(w => selectedWordIds.has(w.id));
      } else if (!customWordList && (!targetWords || targetWords.length === 0)) {
        targetWords = words.filter(w => w.deckId === currentDeckId);
      }

      if (!targetWords || targetWords.length === 0) {
        alert('Không có từ vựng nào để luyện phát âm!');
        return;
      }

      speakingWordsList = isStudyShuffle ? [...targetWords].sort(() => Math.random() - 0.5) : [...targetWords];
      currentSpeakingIndex = 0;
      speakingSessionPointsEarned = 0;
      speakingGradedWordIds.clear();
      speakingSyllableCache = {};
      speakingSessionTakes = [];
      speakingTotalTakesCount = 0;
      speakingFloorTakesCount = 0;
      speakingWordsPassedFloorCount = 0;
      speakingWordsSkippedCount = 0;
      speakingWordSkipsLeft = 3;
      speakingTotalWords = speakingWordsList.length;
      speakingCompletedWords = 0;
      speakingStartTime = Date.now();
      speakingIsCompleted = false;

      const cfg = getSpeakingDifficultyConfig(currentSpeakingDifficulty);
      speakingFloorScore = cfg.floorScore;
      speakingMaxTakes = cfg.maxTakes;
      speakingMaxListens = cfg.maxListens;

      resetSpeakingWordState();
      const scoreBadge = document.getElementById('speaking-score-badge');
      if (scoreBadge) scoreBadge.textContent = 'Bài: +0đ';
      updateSpeakingDifficultyBadge();
      showScreen('screen-speaking');
      renderSpeakingCurrentWord();
    }

    function updateSpeakingDifficultyBadge() {
      const badge = document.getElementById('speaking-difficulty-badge');
      if (!badge) return;
      const totalMult = getSpeakingTotalMult();
      const labels = { easy: '🟢 Dễ', medium: '🟡 TB', hard: '🔴 Khó' };
      badge.textContent = (labels[currentSpeakingDifficulty] || '🟢 Dễ') + ' (x' + totalMult + ')';
    }

    function exitSpeakingMode() {
      if (speakingAutoPlayTimeout) { clearTimeout(speakingAutoPlayTimeout); speakingAutoPlayTimeout = null; }
      stopSpeakingRecord();

      const total = speakingTotalWords || (speakingWordsList ? speakingWordsList.length : 1);
      const done = speakingCompletedWords;

      if (!speakingIsCompleted && (done > 0 || speakingSessionPointsEarned !== 0 || currentSpeakingIndex > 0)) {
        promptStudyEarlyExit({
          mode: 'speaking',
          done,
          total,
          basePoints: speakingSessionPointsEarned,
          onConfirmExit: () => doExecuteExitSpeaking(done, total)
        });
        return;
      }
      doExecuteExitSpeaking(done, total);
    }

    function doExecuteExitSpeaking(done, total) {
      if (speakingAutoPlayTimeout) { clearTimeout(speakingAutoPlayTimeout); speakingAutoPlayTimeout = null; }
      stopSpeakingRecord();
      resetSpeakingWordState();
      closeSpeakingResultModal();

      if (speakingCompletedWords > 0 || speakingTotalTakesCount > 0) {
        try { if (typeof recordStudyFlowAction === 'function') recordStudyFlowAction('speaking'); } catch (e) {}
      }

      if (speakingCurrentMediaStream) {
        try { speakingCurrentMediaStream.getTracks().forEach(track => track.stop()); } catch (e) {}
        speakingCurrentMediaStream = null;
      }

      try {
        if (speakingSessionPointsEarned !== 0) {
          const isComp = done >= total && total > 0;
          const res = calculateSessionFinalPoints(speakingSessionPointsEarned, done, total, isComp);
          const finalPts = res.finalPts;

          if (finalPts !== 0) {
            const curDeck = decks.find(d => d.id === currentDeckId);
            const deckTitle = curDeck ? curDeck.title : 'VocaDeck';
            const newBalance = Math.max(0, getUserPoints() + finalPts);
            setUserPoints(newBalance);
            const bonusText = res.milestoneBonus > 0 ? ' + Thưởng mốc ' + done + ' từ (+' + res.milestoneBonus + ' VoCoin)' : '';
            addLedgerEntry('STUDY_SPEAKING', finalPts, 'Luyện nói AI "' + deckTitle + '" (' + done + '/' + total + ' từ, x' + res.combinedMult + bonusText + ')', newBalance);
            saveDatabase(true);
            pushCurrentDatabaseToCloud();
            showToast('🎉 Speaking: ' + (finalPts > 0 ? '+' : '') + finalPts + ' VoCoin (x' + res.completionMult + ' hoàn thành, x' + res.deckLengthMult + ' quy mô' + bonusText + ')');
          }
          speakingSessionPointsEarned = 0;
        }
      } catch (errPoints) {
        console.warn('Speaking points settlement error:', errPoints);
      }

      try {
        if (studySourceContext === 'review-queue' || !currentDeckId) {
          showScreen('screen-decks');
          refreshActiveScreenData();
        } else {
          openDeckDetail(currentDeckId);
        }
      } catch (errNav) {
        console.warn('Speaking navigation fallback:', errNav);
        showScreen('screen-decks');
        refreshActiveScreenData();
      }
    }

    function shuffleCurrentSpeaking() {
      if (!speakingWordsList || speakingWordsList.length <= 1) return;
      const remainingCount = speakingWordsList.length - 1 - currentSpeakingIndex;
      if (remainingCount <= 0) {
        showToast('ℹ️ Bạn đang ở từ cuối cùng, không còn từ phía sau để xáo trộn!');
        return;
      }
      if (remainingCount === 1) {
        showToast('ℹ️ Chỉ còn 1 từ phía sau, không thể xáo trộn thêm!');
        return;
      }
      for (let i = speakingWordsList.length - 1; i > currentSpeakingIndex + 1; i--) {
        const j = currentSpeakingIndex + 1 + Math.floor(Math.random() * (i - currentSpeakingIndex));
        [speakingWordsList[i], speakingWordsList[j]] = [speakingWordsList[j], speakingWordsList[i]];
      }
      showToast(`🔀 Đã xáo trộn ${remainingCount} từ còn lại phía sau!`);
    }

    function updateSpeakingNextButtonState() {
      const nextBtn = document.getElementById('btn-spk-next');
      if (!nextBtn) return;
      const canProceed = speakingFloorReached || (speakingCurrentTakeIndex >= speakingMaxTakes);

      if (canProceed) {
        nextBtn.disabled = false;
        nextBtn.style.opacity = '1';
        nextBtn.style.cursor = 'pointer';
        nextBtn.style.pointerEvents = 'auto';
        nextBtn.style.background = 'linear-gradient(135deg, #ec4899, #db2777)';
        nextBtn.style.boxShadow = '0 4px 14px rgba(236,72,153,0.3)';
        nextBtn.title = 'Chuyển sang từ tiếp theo (Phím Enter hoặc Phím ->)';
      } else {
        nextBtn.disabled = true;
        nextBtn.style.opacity = '0.35';
        nextBtn.style.cursor = 'not-allowed';
        nextBtn.style.pointerEvents = 'none';
        nextBtn.style.background = 'var(--surface-elevated)';
        nextBtn.style.boxShadow = 'none';
        nextBtn.title = '🔒 Cần đạt điểm sàn (' + speakingFloorScore + 'đ) hoặc dùng VocaSkip để tiếp tục';
      }
    }

    function renderSpeakingCurrentWord() {
      if (speakingWordsList.length === 0) return;
      const word = speakingWordsList[currentSpeakingIndex];
      if (!word) return;

      // Polysemy / Homographs: Pick random sense
      const senses = getWordSenses(word);
      const chosenSense = (senses && senses.length > 0) ? senses[Math.floor(Math.random() * senses.length)] : word;
      word._activeSpeakingSense = chosenSense;
      const senseIdx = senses.indexOf(chosenSense);

      const counterEl = document.getElementById('speaking-counter');
      if (counterEl) counterEl.textContent = 'Từ ' + (currentSpeakingIndex + 1) + ' / ' + speakingWordsList.length;

      const termEl = document.getElementById('spk-word-term');
      const ipaEl = document.getElementById('spk-word-ipa');
      const posEl = document.getElementById('spk-word-pos');
      const cefrEl = document.getElementById('spk-word-cefr');
      const defEl = document.getElementById('spk-word-def');
      const exEl = document.getElementById('spk-word-example');
      const phoneticAudioCont = document.getElementById('spk-phonetic-audio-container');
      const speakerBtn = document.getElementById('btn-spk-speaker') || document.querySelector('.btn-speaker');
      const listenBadge = document.getElementById('spk-listen-quota-badge');

      const showIpa = !!speakingCluesConfig.ipa;
      const showDef = !!speakingCluesConfig.def;
      const showAudio = !!speakingCluesConfig.audio;

      // 1. English Term & IPA (v0.10.6q: Từ tiếng Anh gắn liền với manh mối IPA)
      if (termEl) {
        if (showIpa) {
          termEl.textContent = word.term || '';
          termEl.style.display = 'block';
        } else {
          termEl.textContent = '';
          termEl.style.display = 'none';
        }
      }

      if (ipaEl) {
        if (showIpa) {
          const phoneticVal = chosenSense.phonetic || word.phonetic || '/.../';
          ipaEl.textContent = phoneticVal;
          ipaEl.style.display = 'inline';
        } else {
          ipaEl.textContent = '';
          ipaEl.style.display = 'none';
        }
      }

      // 2. Speaker Button & Listen Quota
      if (speakerBtn) {
        speakerBtn.style.display = showAudio ? 'inline-flex' : 'none';
      }

      // 3. Phonetic & Audio Container
      if (phoneticAudioCont) {
        phoneticAudioCont.style.display = (showIpa || showAudio) ? 'inline-flex' : 'none';
      }

      // 4. Definition
      if (defEl) {
        if (showDef) {
          const senseDef = chosenSense.definitionVi || chosenSense.definition || word.definitionVi || word.definition || '';
          defEl.textContent = senseDef;
          defEl.style.display = 'block';
        } else {
          defEl.textContent = '';
          defEl.style.display = 'none';
        }
      }

      // 5. Example
      if (exEl) {
        const senseEx = chosenSense.exampleSentence || chosenSense.example || word.exampleSentence || word.example;
        if ((showDef || showIpa) && senseEx) {
          exEl.textContent = '"' + senseEx + '"';
          exEl.style.display = 'block';
        } else {
          exEl.textContent = '';
          exEl.style.display = 'none';
        }
      }

      if (posEl) {
        const posVal = chosenSense.partOfSpeech || word.partOfSpeech || 'noun';
        const badgeHtml = (senses.length > 1) ? ` <span class="badge" style="background:rgba(99,102,241,0.2); color:#818cf8; font-size:9.5px; margin-left:4px;">📚 Nghĩa ${senseIdx + 1}/${senses.length}</span>` : '';
        posEl.innerHTML = escapeHtml(posVal) + badgeHtml;
      }
      if (cefrEl) {
        const cefrVal = chosenSense.cefrLevel || word.cefrLevel || word.level || 'B1';
        cefrEl.textContent = cefrVal;
        cefrEl.className = 'badge badge-level-' + cefrVal.toLowerCase();
      }

      const skipBtn = document.getElementById('btn-spk-skip');
      if (skipBtn) {
        const curSkips = getUserSkips();
        skipBtn.textContent = '⏭️ VocaSkip (' + (curSkips > 0 ? curSkips : '100 VoCoin') + ')';
      }

      // Fresh word state
      resetSpeakingWordState(true);
      updateSpeakingNextButtonState();

      if (listenBadge) {
        const remaining = Math.max(0, speakingMaxListens - speakingListensUsed);
        listenBadge.textContent = '(' + remaining + '/' + speakingMaxListens + ')';
        listenBadge.style.opacity = remaining <= 0 ? '0.4' : '1';
      }

      if (showAudio && !speakingAutoPlayDone) {
        if (speakingAutoPlayTimeout) clearTimeout(speakingAutoPlayTimeout);
        speakingAutoPlayTimeout = setTimeout(() => {
          const curScreen = document.getElementById('screen-speaking');
          if (curScreen && curScreen.classList.contains('active')) {
            speakCurrentSpeakingWord(true);
            speakingAutoPlayDone = true;
          }
        }, 350);
      }
    }

    function speakCurrentSpeakingWord(isAutoPlay = false) {
      if (isSpeakingRecording) {
        showToast('⚠️ Đang thu âm, cấm tuyệt đối phát âm mẫu!');
        return;
      }
      if (speakingFloorReached) {
        const word = speakingWordsList[currentSpeakingIndex];
        if (word && word.term) speakText(word.term);
        return;
      }
      if (!speakingCluesConfig.audio) {
        if (!isAutoPlay) showToast('⚠️ Manh mối Âm thanh đã bị tắt!');
        return;
      }
      if (speakingListensUsed >= speakingMaxListens) {
        if (!isAutoPlay) showToast('⚠️ Đã hết lượt nghe mẫu cho từ này!');
        return;
      }
      speakingListensUsed++;
      const listenBadge = document.getElementById('spk-listen-quota-badge');
      if (listenBadge) {
        const remaining = Math.max(0, speakingMaxListens - speakingListensUsed);
        listenBadge.textContent = '(' + remaining + '/' + speakingMaxListens + ')';
        if (remaining <= 0) listenBadge.style.opacity = '0.4';
        else listenBadge.style.opacity = '1';
      }
      const word = speakingWordsList[currentSpeakingIndex];
      if (word && word.term) speakText(word.term);
    }

    function speakCurrentSpeakingWordFree() {
      if (isSpeakingRecording) {
        showToast('⚠️ Đang thu âm, cấm tuyệt đối phát âm mẫu!');
        return;
      }
      const word = speakingWordsList[currentSpeakingIndex];
      if (word && word.term) speakText(word.term);
    }

    function nextSpeakingWord() {
      if (typeof dismissVipMemeOverlay === 'function') dismissVipMemeOverlay();
      if (isSpeakingRecording) stopSpeakingRecord();

      const canProceed = speakingFloorReached || (speakingCurrentTakeIndex >= speakingMaxTakes);
      if (!canProceed) {
        showToast('🔒 Bạn cần đạt từ ' + speakingFloorScore + 'đ hoặc dùng VocaSkip để tiếp tục!');
        return;
      }

      speakingCompletedWords++;
      if (speakingFloorReached) {
        speakingWordsPassedFloorCount++;
      }

      if (currentSpeakingIndex < speakingWordsList.length - 1) {
        currentSpeakingIndex++;
        renderSpeakingCurrentWord();
      } else {
        finishSpeakingSession();
      }
    }

    function skipSpeakingWord() {
      if (isSpeakingRecording) stopSpeakingRecord();

      const curWord = (speakingWordsList && currentSpeakingIndex < speakingWordsList.length) ? speakingWordsList[currentSpeakingIndex] : null;
      if (curWord) {
        addWordToMistakeList(curWord, 'speaking');
        if (!speakingSessionWrongWords.some(w => (w.id && w.id === curWord.id) || (w.term && w.term.toLowerCase() === curWord.term.toLowerCase()))) {
          speakingSessionWrongWords.push(curWord);
        }
      }

      const curSkips = getUserSkips();
      const curPts = getUserPoints();
      const skipCost = 100;

      if (curSkips <= 0 && curPts < skipCost) {
        showToast('🪙 Bạn không đủ điểm ví (cần 100 VoCoin để đổi 1 VocaSkip)');
        openShopModal();
        return;
      }

      if (curSkips > 0) {
        setUserSkips(curSkips - 1);
        showToast('⏭️ Đã dùng 1 VocaSkip (còn ' + getUserSkips() + ' VocaSkip).');
      } else {
        setUserPoints(curPts - skipCost);
        showToast('⏭️ Đã dùng 100 VoCoin ví để dùng VocaSkip từ này.');
      }

      saveDatabase(true);
      pushCurrentDatabaseToCloud();
      updateEconomyUI();

      speakingWordsSkippedCount++;
      speakingCompletedWords++;

      const skipBtn = document.getElementById('btn-spk-skip');
      if (skipBtn) {
        const remainingSkips = getUserSkips();
        skipBtn.textContent = '⏭️ VocaSkip (' + (remainingSkips > 0 ? remainingSkips : '100 VoCoin') + ')';
      }

      if (currentSpeakingIndex < speakingWordsList.length - 1) {
        currentSpeakingIndex++;
        renderSpeakingCurrentWord();
      } else {
        finishSpeakingSession();
      }
    }

    function finishSpeakingSession() {
      if (typeof recordLessonCompleted === 'function') recordLessonCompleted('speaking');
      try { if (typeof recordStudyFlowAction === 'function') recordStudyFlowAction('speaking'); } catch (e) {}
      speakingIsCompleted = true;

      const totalWords = speakingWordsList.length || 1;
      const totalTakes = speakingTotalTakesCount;
      const floorTakes = speakingFloorTakesCount;
      const floorRatePct = totalTakes > 0 ? Math.round((floorTakes / totalTakes) * 100) : 0;
      const skipsUsed = speakingWordsSkippedCount;
      if (currentSpeakingDifficulty === 'hard' && totalTakes > 0 && floorTakes === totalTakes && skipsUsed === 0) {
        if (typeof checkAndUnlockAchievement === 'function') checkAndUnlockAchievement('skill_speaking_perfect_hard');
      }
      if (currentSpeakingDifficulty === 'hard' && totalWords >= 50 && floorTakes === totalTakes && skipsUsed === 0) {
        if (typeof checkAndUnlockAchievement === 'function') checkAndUnlockAchievement('skill_perfect_session_50_hard');
      }

      const floorRatioEl = document.getElementById('spk-res-floor-ratio') || document.getElementById('spk-res-score-ratio');
      const pointsEl = document.getElementById('spk-res-points');
      const durationEl = document.getElementById('spk-res-duration');
      const avgScoreEl = document.getElementById('spk-res-avg-score');
      const diffBadgeEl = document.getElementById('spk-res-difficulty-badge');
      const skipsUsedEl = document.getElementById('spk-res-skips-used');
      const bonusBoxEl = document.getElementById('spk-res-bonus-box');

      if (floorRatioEl) floorRatioEl.textContent = floorTakes + '/' + totalTakes + ' (' + floorRatePct + '%)';
      if (pointsEl) pointsEl.textContent = (speakingSessionPointsEarned >= 0 ? '+' : '') + speakingSessionPointsEarned + ' VoCoin';
      if (skipsUsedEl) skipsUsedEl.textContent = skipsUsed + ' lượt';

      const durationSec = Math.max(1, Math.round((Date.now() - speakingStartTime) / 1000));
      const mins = Math.floor(durationSec / 60).toString().padStart(2, '0');
      const secs = (durationSec % 60).toString().padStart(2, '0');
      if (durationEl) durationEl.textContent = mins + ':' + secs;

      const allScores = speakingSessionTakes.map(t => t.score);
      const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : (speakingFloorScore || 80);
      if (avgScoreEl) avgScoreEl.textContent = avgScore + ' / 100';

      if (diffBadgeEl) {
        const labels = { easy: '🟢 Cấp độ: Dễ (x1.0)', medium: '🟡 Cấp độ: Trung Bình (x1.5)', hard: '🔴 Cấp độ: Khó (x2.0)' };
        diffBadgeEl.textContent = labels[currentSpeakingDifficulty] || '🟢 Cấp độ: Dễ (x1.0)';
      }

      if (bonusBoxEl) {
        const res = calculateSessionFinalPoints(speakingSessionPointsEarned, speakingCompletedWords, totalWords, speakingCompletedWords >= totalWords);
        bonusBoxEl.innerHTML = '🎁 <strong>Thưởng Balance v2:</strong> Hệ số hoàn thành x' + res.completionMult + ' • Hệ số quy mô x' + res.deckLengthMult + (res.milestoneBonus > 0 ? ' • Thưởng mốc +' + res.milestoneBonus + ' VoCoin' : '');
        bonusBoxEl.style.display = 'block';
      }

      // WRONG WORDS RETRY BANNER (v0.10.9-37)
      const wrongBannerEl = document.getElementById('spk-res-wrong-banner');
      const wrongCountEl = document.getElementById('spk-res-wrong-count');
      const wrongBtnLabelEl = document.getElementById('spk-res-wrong-btn-label');
      if (wrongBannerEl) {
        if (speakingSessionWrongWords && speakingSessionWrongWords.length > 0) {
          wrongBannerEl.style.display = 'block';
          if (wrongCountEl) wrongCountEl.textContent = speakingSessionWrongWords.length + ' từ';
          if (wrongBtnLabelEl) wrongBtnLabelEl.textContent = speakingSessionWrongWords.length + ' từ';
        } else {
          wrongBannerEl.style.display = 'none';
        }
      }

      if (typeof autoPostMilestoneToCommunity === 'function' && speakingCompletedWords >= 30) {
        autoPostMilestoneToCommunity('session_long', {
          mode: 'Speaking (Luyện Nói)',
          wordCount: speakingCompletedWords,
          difficulty: currentSpeakingDifficulty,
          accuracy: floorRatePct
        });
      }
      if (studySourceContext === 'review-queue' && typeof renderDailyReviewBanner === 'function') {
        renderDailyReviewBanner();
      }

      openModal('modal-speaking-result');
      playVocaSfx('fireworks', true);
      if (typeof recordLessonCompleted === 'function') recordLessonCompleted('quiz');

      setTimeout(() => {
        const intensity = totalTakes > 0 ? Math.min(1.0, Math.max(0.3, floorTakes / totalTakes)) : 0.5;
        launchSpeakingFireworks(intensity);
      }, 100);
    }

    function closeSpeakingResultModal() {
      stopVocaSfx('fireworks');
      if (speakingFireworksAnimationId) {
        cancelAnimationFrame(speakingFireworksAnimationId);
        speakingFireworksAnimationId = null;
      }
      closeModal('modal-speaking-result');
    }

    function launchSpeakingFireworks(intensity = 1.0) {
      const canvas = document.getElementById('speaking-fireworks-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = canvas.parentElement.clientWidth || 480;
      canvas.height = canvas.parentElement.clientHeight || 420;

      if (speakingFireworksAnimationId) {
        cancelAnimationFrame(speakingFireworksAnimationId);
        speakingFireworksAnimationId = null;
      }

      const particles = [];
      const colors = ['#ec4899', '#34d399', '#6366f1', '#f59e0b', '#38bdf8', '#fbbf24', '#a855f7', '#f43f5e'];
      const count = Math.min(180, Math.floor(40 + intensity * 120));

      function createExplosion(x, y, power) {
        for (let i = 0; i < power; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 5 + 2;
          particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: Math.random() * 3 + 1.5,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: 1,
            decay: Math.random() * 0.02 + 0.015
          });
        }
      }

      createExplosion(canvas.width * 0.3, canvas.height * 0.4, Math.floor(count * 0.5));
      createExplosion(canvas.width * 0.7, canvas.height * 0.35, Math.floor(count * 0.5));

      function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.08;
          p.alpha -= p.decay;

          if (p.alpha <= 0) {
            particles.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        if (particles.length > 0) {
          speakingFireworksAnimationId = requestAnimationFrame(animate);
        } else {
          speakingFireworksAnimationId = null;
        }
      }

      speakingFireworksAnimationId = requestAnimationFrame(animate);
    }

    function resetSpeakingWordState(clearTakes = true) {
      if (speakingRecordTimerInterval) { clearInterval(speakingRecordTimerInterval); speakingRecordTimerInterval = null; }
      isSpeakingRecording = false;
      isEvaluatingSpeaking = false;
      speakingFlowState = 'idle';
      speakingRecordSeconds = 0;
      speakingAudioChunks = [];
      if (speakingAudioBlobUrl) {
        try { URL.revokeObjectURL(speakingAudioBlobUrl); } catch (e) {}
      }
      speakingAudioBlob = null;
      speakingAudioBlobUrl = null;
      speakingCurrentAudioBase64 = null;
      pendingAudioBlob = null;
      pendingAudioBase64 = null;

      if (clearTakes) {
        speakingTakes = [];
        speakingCurrentTakeIndex = 0;
        speakingListensUsed = 0;
        speakingAutoPlayDone = false;
        speakingFloorReached = false;
      }

      const micBtn = document.getElementById('btn-speaking-mic');
      const statusEl = document.getElementById('speaking-record-status');
      const timerEl = document.getElementById('speaking-record-timer');
      const waveEl = document.getElementById('speaking-wave-box');
      const playbackCont = document.getElementById('speaking-user-playback-container');
      const btnSubmitEval = document.getElementById('btn-spk-submit-eval');
      const btnPlayback = document.getElementById('btn-spk-playback-user');
      const btnRetry = document.getElementById('btn-spk-retry');

      if (micBtn) {
        micBtn.style.background = 'linear-gradient(135deg, #ec4899, #db2777)';
        micBtn.style.boxShadow = '0 6px 20px rgba(236,72,153,0.35)';
        micBtn.style.transform = 'scale(1)';
        micBtn.disabled = false;
        micBtn.style.opacity = '1';
        micBtn.style.cursor = 'pointer';
      }
      if (statusEl) { statusEl.textContent = 'Nhấn vào Mic để bắt đầu nói'; statusEl.style.color = 'var(--text)'; }
      if (timerEl) timerEl.textContent = 'Giữ giọng rõ ràng • Tối đa 8 giây • Lượt: ' + speakingCurrentTakeIndex + '/' + speakingMaxTakes;
      if (waveEl) waveEl.style.display = 'none';
      if (playbackCont) playbackCont.style.display = 'none';
      if (btnSubmitEval) btnSubmitEval.style.display = 'flex';
      if (btnPlayback) {
        btnPlayback.style.display = 'inline-flex';
        btnPlayback.textContent = '🎧 Nghe lại';
      }
      if (btnRetry) btnRetry.style.display = 'inline-flex';

      const resultPanel = document.getElementById('speaking-result-panel');
      const aiLoading = document.getElementById('speaking-ai-loading');
      const aiContent = document.getElementById('speaking-ai-content');
      const rewardCont = document.getElementById('spk-reward-badge-container');
      const takeHistEl = document.getElementById('spk-take-history');
      const floorBanner = document.getElementById('spk-floor-banner');
      const failBanner = document.getElementById('spk-fail-banner');
      const retryBanner = document.getElementById('spk-network-error-banner');
      const detailsBox = document.getElementById('spk-word-details-box');
      const speakerBtn = document.getElementById('btn-spk-speaker');
      if (speakerBtn) {
        speakerBtn.style.opacity = '1';
        speakerBtn.style.pointerEvents = 'auto';
      }

      if (resultPanel) resultPanel.style.display = 'none';
      if (aiLoading) aiLoading.style.display = 'none';
      if (aiContent) aiContent.style.display = 'none';
      if (rewardCont) rewardCont.style.display = 'none';
      if (takeHistEl) takeHistEl.innerHTML = '';
      if (floorBanner) floorBanner.style.display = 'none';
      if (failBanner) failBanner.style.display = 'none';
      if (retryBanner) retryBanner.style.display = 'none';
      if (detailsBox) detailsBox.style.display = 'none';
    }

    async function toggleSpeakingRecord() {
      if (isSpeakingRecording) {
        stopSpeakingRecord();
      } else {
        if (speakingCurrentTakeIndex >= speakingMaxTakes) {
          showToast('⚠️ Đã hết ' + speakingMaxTakes + ' lượt thu âm cho từ này!');
          return;
        }
        await startSpeakingRecord();
      }
    }

    async function startSpeakingRecord() {
      try {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        const stream = await getSpeakingAudioStream();

        const mimeType = getSupportedAudioMimeType();
        speakingMediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        speakingAudioChunks = [];

        // Revoke previous audio blob url when recording a new take
        if (speakingAudioBlobUrl) {
          try { URL.revokeObjectURL(speakingAudioBlobUrl); } catch (e) {}
          speakingAudioBlobUrl = null;
        }
        speakingAudioBlob = null;
        speakingCurrentAudioBase64 = null;

        speakingMediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            speakingAudioChunks.push(e.data);
          }
        };

        speakingMediaRecorder.onstop = async () => {
          if (speakingCurrentMediaStream) {
            try { speakingCurrentMediaStream.getTracks().forEach(t => t.stop()); } catch (e) {}
            speakingCurrentMediaStream = null;
          }

          speakingFinalAudioMime = speakingMediaRecorder.mimeType || 'audio/webm';
          speakingAudioBlob = new Blob(speakingAudioChunks, { type: speakingFinalAudioMime });
          speakingAudioBlobUrl = URL.createObjectURL(speakingAudioBlob);

          const reader = new FileReader();
          reader.readAsDataURL(speakingAudioBlob);
          reader.onloadend = () => {
            const base64data = reader.result;
            speakingCurrentAudioBase64 = base64data ? base64data.split(',')[1] : null;
          };

          speakingFlowState = 'recorded_ready';

          const statusEl = document.getElementById('speaking-record-status');
          const timerEl = document.getElementById('speaking-record-timer');
          const playbackCont = document.getElementById('speaking-user-playback-container');
          const waveEl = document.getElementById('speaking-wave-box');
          const btnSubmitEval = document.getElementById('btn-spk-submit-eval');
          const btnPlayback = document.getElementById('btn-spk-playback-user');
          const btnRetry = document.getElementById('btn-spk-retry');

          if (statusEl) {
            statusEl.textContent = '✅ Đã thu âm xong! Nghe lại hoặc nhấn Chấm Điểm';
            statusEl.style.color = '#34d399';
          }
          if (timerEl) timerEl.textContent = 'Thời lượng: ' + speakingRecordSeconds + 's • Lượt: ' + (speakingCurrentTakeIndex + 1) + '/' + speakingMaxTakes;
          if (waveEl) waveEl.style.display = 'none';
          if (btnSubmitEval) btnSubmitEval.style.display = 'flex';
          if (btnPlayback) {
            btnPlayback.style.display = 'inline-flex';
            btnPlayback.textContent = '🎧 Nghe lại';
          }
          if (btnRetry) btnRetry.style.display = 'inline-flex';
          if (playbackCont) {
            playbackCont.style.display = 'flex';
            playbackCont.style.flexDirection = 'column';
          }
        };

        speakingMediaRecorder.start();
        isSpeakingRecording = true;
        speakingFlowState = 'recording';
        speakingRecordSeconds = 0;

        const micBtn = document.getElementById('btn-speaking-mic');
        const statusEl = document.getElementById('speaking-record-status');
        const timerEl = document.getElementById('speaking-record-timer');
        const waveEl = document.getElementById('speaking-wave-box');
        const playbackCont = document.getElementById('speaking-user-playback-container');
        const speakerBtn = document.getElementById('btn-spk-speaker');

        if (speakerBtn) {
          speakerBtn.style.opacity = '0.3';
          speakerBtn.style.pointerEvents = 'none';
        }

        if (micBtn) {
          micBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
          micBtn.style.boxShadow = '0 0 25px rgba(239,68,68,0.7)';
          micBtn.style.transform = 'scale(1.08)';
        }
        if (statusEl) {
          statusEl.textContent = '🔴 Đang lắng nghe... Bấm để dừng';
          statusEl.style.color = '#f87171';
        }
        if (waveEl) waveEl.style.display = 'flex';
        if (playbackCont) playbackCont.style.display = 'none';

        speakingRecordTimerInterval = setInterval(() => {
          speakingRecordSeconds++;
          if (timerEl) timerEl.textContent = '⏱️ Đang thu âm: ' + speakingRecordSeconds + 's / 8s';
          if (speakingRecordSeconds >= 8) {
            stopSpeakingRecord();
          }
        }, 1000);

      } catch (err) {
        console.error('Mic Error:', err);
        showToast('⚠️ Không thể truy cập Microphone! Vui lòng kiểm tra quyền Micro của trình duyệt.');
        resetSpeakingWordState();
      }
    }

    function stopSpeakingRecord() {
      if (speakingRecordTimerInterval) {
        clearInterval(speakingRecordTimerInterval);
        speakingRecordTimerInterval = null;
      }
      if (speakingMediaRecorder && speakingMediaRecorder.state !== 'inactive') {
        speakingMediaRecorder.stop();
      }
      isSpeakingRecording = false;

      if (speakingCurrentMediaStream) {
        try { speakingCurrentMediaStream.getTracks().forEach(t => t.stop()); } catch (e) {}
        speakingCurrentMediaStream = null;
      }

      const micBtn = document.getElementById('btn-speaking-mic');
      if (micBtn) {
        micBtn.style.background = 'linear-gradient(135deg, #ec4899, #db2777)';
        micBtn.style.boxShadow = '0 6px 20px rgba(236,72,153,0.35)';
        micBtn.style.transform = 'scale(1)';
      }
      const speakerBtn = document.getElementById('btn-spk-speaker');
      if (speakerBtn) {
        speakerBtn.style.opacity = '1';
        speakerBtn.style.pointerEvents = 'auto';
      }
    }

    async function submitSpeakingEvaluation() {
      if (!hasAtLeastOneApiKey()) {
        alert('🔒 Chức năng Luyện Nói (Speaking) yêu cầu kết nối ít nhất 1 Google Gemini API Key để AI có thể chấm điểm âm thanh!\n\nVui lòng vào Cài Đặt để nhập API Key.');
        openSettingsModal();
        return;
      }
      if (isEvaluatingSpeaking) {
        console.warn('Speaking evaluation is already in flight, ignoring duplicate call.');
        return;
      }
      if (!speakingCurrentAudioBase64 || !speakingAudioBlob) {
        showToast('⚠️ Bản thu âm này đã được chấm điểm hoặc chưa có dữ liệu! Hãy bấm Mic thu âm lại nhé.');
        return;
      }

      const vadResult = await analyzeAudioSpeechEnergy(speakingAudioBlob);
      if (vadResult.duration && vadResult.duration < 0.4) {
        showToast('⚠️ Bản thu âm quá ngắn (< 0.4s). Vui lòng nói rõ ràng hơn!');
        return;
      }

      if (!vadResult.hasVoice) {
        const resultPanel = document.getElementById('speaking-result-panel');
        const aiLoading = document.getElementById('speaking-ai-loading');
        const aiContent = document.getElementById('speaking-ai-content');
        if (resultPanel) resultPanel.style.display = 'block';
        if (aiLoading) aiLoading.style.display = 'none';
        if (aiContent) aiContent.style.display = 'block';

        renderDiagnosticResult({
          score: 0,
          verdict: 'Không có giọng nói',
          detectedTranscript: '(Không phát hiện âm thanh)',
          wordsBreakdown: [],
          phonemeDiagnostics: { stress: 'Chưa phát âm', endingSounds: 'Không có âm', vowels: 'Không có âm' },
          feedbackVi: '🔇 Micro chưa thu được giọng nói hoặc âm lượng quá nhỏ. Bạn hãy kiểm tra lại Micro, nói to và rõ ràng hơn nhé!'
        }, false);
        return;
      }

      isEvaluatingSpeaking = true;
      pendingAudioBlob = speakingAudioBlob;
      pendingAudioBase64 = speakingCurrentAudioBase64;

      speakingFlowState = 'evaluating';
      const resultPanel = document.getElementById('speaking-result-panel');
      const aiLoading = document.getElementById('speaking-ai-loading');
      const aiContent = document.getElementById('speaking-ai-content');

      if (resultPanel) resultPanel.style.display = 'block';
      if (aiLoading) aiLoading.style.display = 'block';
      if (aiContent) aiContent.style.display = 'none';

      // Hide evaluation button while keeping playback visible
      const btnSubmitEval = document.getElementById('btn-spk-submit-eval');
      if (btnSubmitEval) btnSubmitEval.style.display = 'none';

      evaluateSpeakingAudioWithGemini(speakingFinalAudioMime || 'audio/webm');
    }

    // String similarity (Levenshtein distance) for anti-hallucination / anti-nonsense guard (v0.10.9-33)
    function calculateStringSimilarity(s1, s2) {
      if (!s1 || !s2) return 0;
      const a = s1.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
      const b = s2.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
      if (a === b) return 1.0;
      if (a.length === 0 || b.length === 0) return 0;
      const matrix = [];
      for (let i = 0; i <= b.length; i++) matrix[i] = [i];
      for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          if (b.charAt(i - 1) === a.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }
      const distance = matrix[b.length][a.length];
      const maxLen = Math.max(a.length, b.length);
      return 1 - (distance / maxLen);
    }
    window.calculateStringSimilarity = calculateStringSimilarity;

    async function evaluateSpeakingAudioWithGemini(mimeType = 'audio/webm') {
      const resultPanel = document.getElementById('speaking-result-panel');
      const aiLoading = document.getElementById('speaking-ai-loading');
      const aiContent = document.getElementById('speaking-ai-content');
      const currentWord = speakingWordsList[currentSpeakingIndex];

      if (!currentWord || !pendingAudioBase64) {
        if (aiLoading) aiLoading.style.display = 'none';
        isEvaluatingSpeaking = false;
        return;
      }

      let key = (geminiApiKey || localStorage.getItem(STORAGE_KEY_GEMINI_KEY) || '').trim();
      if (!key) {
        isEvaluatingSpeaking = false;
        if (aiLoading) aiLoading.style.display = 'none';
        if (aiContent) aiContent.style.display = 'block';
        renderDiagnosticResult({
          score: 0,
          verdict: 'Cần API Key',
          detectedTranscript: '(Chưa cấu hình API)',
          wordsBreakdown: [],
          phonemeDiagnostics: { stress: 'Cần Key', endingSounds: 'Cần Key', vowels: 'Cần Key' },
          feedbackVi: '🔑 Bạn chưa cài đặt Gemini API Key. Hãy vào mục Cài Đặt nhập Key Gemini miễn phí để AI phân tích âm vị chuẩn xác như ELSA nhé!'
        }, false);
        return;
      }

      const activeSense = currentWord._activeSpeakingSense || (getWordSenses(currentWord)[0]) || currentWord;
      const targetIpa = activeSense.phonetic || currentWord.phonetic || '';
      const targetMeaning = activeSense.definitionVi || activeSense.definition || currentWord.definitionVi || currentWord.definition || '';
      const targetPos = activeSense.partOfSpeech || currentWord.partOfSpeech || '';
      const needSyllable = !speakingSyllableCache[currentWord.id];

      const prompt = `You are a certified Oxford Phonetician and ELSA-grade AI Speech Assessment Engine for English learners.

TARGET WORD/PHRASE: "${currentWord.term}"
${targetPos ? `TARGET PART OF SPEECH: "${targetPos}"\n` : ''}REFERENCE IPA: "${targetIpa}"
INTENDED MEANING: "${targetMeaning}"

═══════════════════════════════════════════════════════
OBJECTIVE & FAIR PHONETIC CRITERIA (ANTI-AM-BOI & STRICT ACCURACY):
═══════════════════════════════════════════════════════
1. EXACT ACOUSTIC TRANSCRIPTION (MANDATORY):
- Listen to the audio and transcribe in "detectedTranscript" EXACTLY what the user literally spoke.
- If the user spoke a corrupted word, nonsense word, or wrong word (e.g. saying "acadepussy", "acadepus", "akaboom" instead of "academic"):
  * Write that exact word in "detectedTranscript" (e.g. "acadepussy").
  * Assign score between 0 and 30 ONLY.
  * Set verdict to "Chưa đúng từ / Sai từ".
- If the user reads in Vietnamese "âm bồi" (reading English word like separate flat Vietnamese words/syllables, e.g. "a-ca-đe-mích" with flat Vietnamese tones, no English stress, no vowel reduction to /ə/, no proper English consonants):
  * Write the exact âm bồi transcription in "detectedTranscript" (e.g. "a ca đe mích").
  * HARD-CAP score at 45 to 60. NEVER give >= 70 for âm bồi reading.
  * In "feedbackVi", explicitly explain why reading as Vietnamese syllables ("âm bồi") is incorrect and guide them to use English primary stress and schwa /ə/.

2. ACCURATE CONTINUOUS SCORING (0 to 100):
- 95 - 100: Flawless native/near-native pronunciation, crisp consonants, natural stress and vowel reductions.
- 85 - 94: Very good standard English pronunciation with clear stress, good vowels, natural cadence.
- 70 - 84: Understandable passing grade with minor non-native accent or slightly softer ending consonants.
- 45 - 69: Noticeable pronunciation errors, wrong stress, or Vietnamese "âm bồi" flat reading.
- 0 - 39: Wrong word, nonsense word, unintelligible, or silence.

3. STRICT LINGUISTIC SANITY RULES:
- RULE A (NO FAKE ELONGATION): NEVER ask or suggest elongating ("ngân dài", "kéo dài") stop consonants (/p, t, k, b, d, g/) or nasal codas (/m, n, ŋ/). Nasal endings (e.g. in "person", "foundation") and stop endings are naturally brief closures.
- RULE B (NO PHANTOM SOUNDS): Do NOT hallucinate sounds that don't exist in the standard IPA.
- RULE C (ACCENT TOLERANCE): Do NOT penalize natural American vs British variations (e.g. rhotic /r/, flap [ɾ] in "water", or /ɑː/ vs /æ/ in "dance").
- RULE D (CONSTRUCTIVE FEEDBACK): If pronunciation is good, explain what sounded great. If not, give actionable mouth/tongue tips in Vietnamese.
- RULE E (POLYSEMY & HOMOGRAPHS): If this word is a homograph or has stress shifting between grammatical forms (e.g. noun vs verb like 'record', 'present', 'object', 'contract', 'permit', 'lead', 'tear', etc.), strictly evaluate whether the user's stress and vowel reduction match the specified TARGET PART OF SPEECH (${targetPos || 'specified form'}) and REFERENCE IPA (${targetIpa}).

4. MULTI-WORD & COMPOUND PHRASES:
- For multi-word phrases (e.g. "aqueous solution", "point out"): evaluate each word individually in "wordsBreakdown".

${needSyllable ? '5. SYLLABLE COUNT: Count total syllables in the target phrase and return as "syllableCount".\n' : ''}
═══════════════════════════════════════════════════════
RETURN ONLY VALID JSON MATCHING THIS EXACT SCHEMA WITHOUT MARKDOWN BLOCKS:
═══════════════════════════════════════════════════════
{
  "score": 92,
  "verdict": "Rất tốt",
  "detectedTranscript": "${currentWord.term}",
  "wordsBreakdown": [
    {
      "word": "${currentWord.term.split(' ')[0] || 'word'}",
      "ipa": "${targetIpa || '/.../'}",
      "status": "correct",
      "feedback": "Phát âm rõ ràng, đúng trọng âm và âm đuôi"
    }
  ],
  "phonemeDiagnostics": {
    "stress": "Trọng âm rơi đúng vào âm tiết chính",
    "endingSounds": "Âm đuôi phát âm đầy đủ",
    "vowels": "Nguyên âm chuẩn xác"
  },
  "feedbackVi": "Nhận xét tiếng Việt súc tích, tự nhiên và chỉ dẫn cụ thể nếu có lỗi"
}`;

      try {
        const cachedWorkingModel = localStorage.getItem('vocaflow_gemini_working_model');
        const standardModels = (typeof GEMINI_STANDARD_MODELS !== 'undefined' && GEMINI_STANDARD_MODELS.length > 0) ? GEMINI_STANDARD_MODELS : ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-pro'];
        const modelsToTry = cachedWorkingModel ? [cachedWorkingModel, ...standardModels.filter(m => m !== cachedWorkingModel)] : standardModels;

        let evalSuccess = false;
        let evalData = null;

        for (const m of modelsToTry) {
          try {
            const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent?key=' + key;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const res = await fetch(url, {
              method: 'POST',
              signal: controller.signal,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    { inlineData: { mimeType: mimeType.split(';')[0] || 'audio/webm', data: pendingAudioBase64 } },
                    { text: prompt }
                  ]
                }],
                generationConfig: {
                  responseMimeType: "application/json",
                  temperature: 0.15,
                  maxOutputTokens: 1024
                },
                safetySettings: [
                  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
              })
            });
            clearTimeout(timeoutId);

            if (res.ok) {
              const resJson = await res.json();
              const rawText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (rawText) {
                evalData = JSON.parse(rawText.replace(/```json/gi, '').replace(/```/gi, '').trim());
                localStorage.setItem('vocaflow_gemini_working_model', m);
                evalSuccess = true;
                break;
              }
            } else if (res.status === 429 || res.status >= 500) {
              continue;
            }
          } catch (modelErr) {
            console.warn('Model ' + m + ' speaking eval failed:', modelErr);
          }
        }

        if (aiLoading) aiLoading.style.display = 'none';
        if (aiContent) aiContent.style.display = 'block';

        if (evalSuccess && evalData) {
          // Post-processing guard against hallucinated high scores on nonsense or âm bồi (v0.10.9-33)
          if (evalData.detectedTranscript && typeof evalData.detectedTranscript === 'string') {
            const targetClean = currentWord.term.toLowerCase().trim();
            const transcriptClean = evalData.detectedTranscript.toLowerCase().trim();
            const sim = calculateStringSimilarity(targetClean, transcriptClean);

            if (sim < 0.70) {
              evalData.score = Math.min(Number(evalData.score) || 0, 30);
              evalData.verdict = 'Chưa đúng từ';
              if (!evalData.feedbackVi || !evalData.feedbackVi.includes(evalData.detectedTranscript)) {
                evalData.feedbackVi = `⚠️ AI ghi nhận bạn đọc thành "${evalData.detectedTranscript}" (khác với từ mục tiêu "${currentWord.term}"). Vui lòng phát âm lại đúng từ nhé!`;
              }
            } else if (sim < 0.85) {
              evalData.score = Math.min(Number(evalData.score) || 0, 65);
              if (evalData.score < 70) evalData.verdict = 'Cần luyện thêm';
            }

            // Detect Âm Bồi in transcript or feedback
            if (/[\u00C0-\u1EF9]|a-ca|đe-mích|âm bồi/i.test(evalData.detectedTranscript + ' ' + (evalData.feedbackVi || ''))) {
              if (evalData.feedbackVi && (evalData.feedbackVi.toLowerCase().includes('âm bồi') || evalData.feedbackVi.toLowerCase().includes('tiếng việt') || evalData.detectedTranscript.includes(' '))) {
                evalData.score = Math.min(Number(evalData.score) || 0, 58);
                evalData.verdict = 'Đọc kiểu âm bồi';
              }
            }
          }

          // v0.10.6t: Preserve speakingAudioBlob & speakingAudioBlobUrl for user playback
          speakingCurrentAudioBase64 = null;
          pendingAudioBlob = null;
          pendingAudioBase64 = null;
          isEvaluatingSpeaking = false;

          if (evalData.syllableCount && currentWord && !speakingSyllableCache[currentWord.id]) {
            speakingSyllableCache[currentWord.id] = Math.max(1, Math.round(Number(evalData.syllableCount) || 1));
          }

          renderDiagnosticResult(evalData, true);
        } else {
          isEvaluatingSpeaking = false;
          showNetworkErrorBanner();
        }

      } catch (err) {
        console.error('Speaking eval error:', err);
        isEvaluatingSpeaking = false;
        if (aiLoading) aiLoading.style.display = 'none';
        if (aiContent) aiContent.style.display = 'block';
        showNetworkErrorBanner();
      }
    }

    function showNetworkErrorBanner() {
      const banner = document.getElementById('spk-network-error-banner');
      if (banner) {
        banner.style.display = 'block';
        banner.innerHTML = `
          <div style="background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.4); border-radius: 12px; padding: 12px; text-align: center;">
            <div style="font-size: 13px; font-weight: 700; color: #fbbf24; margin-bottom: 8px;">⚠️ Không thể kết nối AI hoặc phản hồi bị lỗi. Bạn không bị mất lượt thu!</div>
            <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
              <button class="btn btn-sm" onclick="retryPendingEvaluation()" style="background: rgba(56,189,248,0.2); border: 1px solid rgba(56,189,248,0.5); color: #38bdf8; font-weight: 700; border-radius: 20px; padding: 6px 14px; cursor: pointer;">🔄 Thử chấm lại (Retry)</button>
              <button class="btn btn-sm" onclick="discardPendingAndRerecord()" style="background: rgba(245,158,11,0.2); border: 1px solid rgba(245,158,11,0.5); color: #fbbf24; font-weight: 700; border-radius: 20px; padding: 6px 14px; cursor: pointer;">🎙️ Thu âm lại</button>
            </div>
          </div>
        `;
      }
    }

    function retryPendingEvaluation() {
      const banner = document.getElementById('spk-network-error-banner');
      if (banner) banner.style.display = 'none';
      if (pendingAudioBase64) {
        const aiLoading = document.getElementById('speaking-ai-loading');
        const aiContent = document.getElementById('speaking-ai-content');
        if (aiLoading) aiLoading.style.display = 'block';
        if (aiContent) aiContent.style.display = 'none';
        evaluateSpeakingAudioWithGemini(speakingFinalAudioMime || 'audio/webm');
      } else {
        showToast('⚠️ Không còn bản thu âm chờ. Hãy thu âm lại!');
      }
    }

    function discardPendingAndRerecord() {
      pendingAudioBlob = null;
      pendingAudioBase64 = null;
      isEvaluatingSpeaking = false;
      const banner = document.getElementById('spk-network-error-banner');
      if (banner) banner.style.display = 'none';
      const resultPanel = document.getElementById('speaking-result-panel');
      if (resultPanel) resultPanel.style.display = 'none';
      speakingFlowState = 'idle';
      showToast('🎙️ Hãy thu âm lại!');
    }

    function speakPhonemePart(wordOrIpa) {
      if (isSpeakingRecording) {
        showToast('⚠️ Đang thu âm, cấm tuyệt đối phát âm mẫu!');
        return;
      }
      if (!wordOrIpa) return;
      speakText(wordOrIpa);
      showToast('🔊 Đang nghe phát âm mẫu: ' + wordOrIpa);
    }

    function retrySpeakingFromBadge() {
      const resultPanel = document.getElementById('speaking-result-panel');
      if (resultPanel) resultPanel.style.display = 'none';
      speakingFlowState = 'idle';
      return toggleSpeakingRecord();
    }

    function renderDiagnosticResult(data, countAsTake = true) {
      speakingFlowState = 'evaluated';
      const currentWord = speakingWordsList[currentSpeakingIndex];
      let score = Math.max(0, Math.min(100, Math.round(Number(data.score) || 0)));

      if (countAsTake) {
        speakingTakes.push(score);
        speakingCurrentTakeIndex = speakingTakes.length;
        const isFloor = score >= speakingFloorScore;
        if (isFloor) {
          speakingFloorReached = true;
          if (typeof triggerVipMemeReaction === 'function') triggerVipMemeReaction('right');
        } else {
          if (typeof triggerVipMemeReaction === 'function') triggerVipMemeReaction('fail');
        }

        speakingTotalTakesCount++;
        if (isFloor) {
          speakingFloorTakesCount++;
        }
        speakingSessionTakes.push({ wordId: currentWord?.id, score, isFloor });
        if (currentSpeakingDifficulty === 'hard' && speakingTakes.length === 1 && score >= 95) {
          if (typeof checkAndUnlockAchievement === 'function') checkAndUnlockAchievement('skill_onetake_95');
        }
        try { if (typeof recordStudyFlowAction === 'function') recordStudyFlowAction('speaking'); } catch (e) {}
      }

      // Update Recording Box Status & Keep Playback Accessible
      const statusEl = document.getElementById('speaking-record-status');
      const timerEl = document.getElementById('speaking-record-timer');
      const playbackCont = document.getElementById('speaking-user-playback-container');
      const btnSubmitEval = document.getElementById('btn-spk-submit-eval');
      const btnPlayback = document.getElementById('btn-spk-playback-user');
      const btnRetry = document.getElementById('btn-spk-retry');

      if (statusEl) {
        statusEl.textContent = '🎉 Đã chấm điểm xong! Bạn có thể nghe lại giọng mình hoặc nhấn Mic để thu lại.';
        statusEl.style.color = '#34d399';
      }
      if (timerEl) {
        timerEl.textContent = 'Lượt hiện tại: ' + speakingCurrentTakeIndex + '/' + speakingMaxTakes + (speakingFloorReached ? ' • Đạt sàn (' + speakingFloorScore + 'đ) ✅' : ' • Chưa đạt sàn (' + speakingFloorScore + 'đ)');
      }
      if (btnSubmitEval) {
        btnSubmitEval.style.display = 'none';
      }
      if (btnPlayback) {
        btnPlayback.style.display = speakingAudioBlobUrl ? 'inline-flex' : 'none';
        btnPlayback.textContent = '🎧 Nghe lại giọng bạn' + (speakingCurrentTakeIndex > 0 ? ' (Lần ' + speakingCurrentTakeIndex + ')' : '');
      }
      if (btnRetry) {
        const canRetry = speakingCurrentTakeIndex < speakingMaxTakes && !speakingFloorReached;
        btnRetry.style.display = canRetry ? 'inline-flex' : 'none';
      }
      if (playbackCont) {
        playbackCont.style.display = speakingAudioBlobUrl ? 'flex' : 'none';
      }

      const scoreNumEl = document.getElementById('spk-score-num');
      const scoreCircleEl = document.getElementById('spk-score-circle');
      const verdictEl = document.getElementById('spk-verdict-text');
      const detectedEl = document.getElementById('spk-detected-speech');
      const feedbackEl = document.getElementById('spk-feedback-text');
      const phonemesEl = document.getElementById('spk-phonemes-container');

      if (scoreNumEl) scoreNumEl.textContent = score;

      let scoreColor = '#34d399';
      let verdict = data.verdict || 'Tuyệt vời!';
      if (score >= 90) {
        scoreColor = '#34d399';
        verdict = data.verdict || '🌟 Xuất sắc!';
      } else if (score >= 80) {
        scoreColor = '#10b981';
        verdict = data.verdict || '👍 Khá tốt';
      } else if (score >= 50) {
        scoreColor = '#fbbf24';
        verdict = data.verdict || '💡 Cần cải thiện';
      } else {
        scoreColor = '#f87171';
        verdict = data.verdict || '⚠️ Chưa chuẩn';
      }

      if (scoreCircleEl) {
        scoreCircleEl.style.background = scoreColor;
        scoreCircleEl.style.boxShadow = '0 4px 14px ' + scoreColor + '55';
      }
      if (verdictEl) {
        verdictEl.textContent = verdict;
        verdictEl.style.color = scoreColor;
      }
      if (detectedEl) {
        detectedEl.textContent = data.detectedTranscript || data.detectedSpeech || (currentWord?.term || '');
      }
      if (feedbackEl) {
        feedbackEl.textContent = data.feedbackVi || data.vietnameseSpecificMistake || 'Phát âm rõ ràng, chuẩn ngữ điệu!';
      }

      // 3 Pillar Badges
      const pStress = document.getElementById('spk-pillar-stress');
      const pEnding = document.getElementById('spk-pillar-ending');
      const pVowels = document.getElementById('spk-pillar-vowels');

      const diag = data.phonemeDiagnostics || data.accuracyDetails;
      if (pStress) pStress.textContent = '🎯 Trọng âm: ' + (diag?.stress || 'Tốt');
      if (pEnding) pEnding.textContent = '🔊 Âm đuôi: ' + (diag?.endingSounds || diag?.endingSound || 'Chuẩn');
      if (pVowels) pVowels.textContent = '🔤 Nguyên âm: ' + (diag?.vowels || 'Rõ');

      // Word Diagnostic Chips
      if (phonemesEl) {
        let phtml = '';
        const wordsList = Array.isArray(data.wordsBreakdown) ? data.wordsBreakdown : [];

        if (wordsList.length > 0) {
          phtml += '<div style="width: 100%; display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 8px;">';
          wordsList.forEach(w => {
            const isOk = w.status === 'correct';
            const isWarn = w.status === 'warning';
            const bg = isOk ? 'rgba(52,211,153,0.15)' : (isWarn ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)');
            const col = isOk ? '#34d399' : (isWarn ? '#fbbf24' : '#f87171');
            const border = isOk ? 'rgba(52,211,153,0.4)' : (isWarn ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)');
            const icon = isOk ? '✓' : (isWarn ? '⚠' : '✗');

            phtml += `
              <div onclick="speakPhonemePart('${escapeHtml(w.word)}')" title="${escapeHtml(w.feedback || '')} (Bấm để nghe)" style="background: ${bg}; color: ${col}; border: 1.5px solid ${border}; border-radius: 12px; padding: 6px 12px; display: inline-flex; flex-direction: column; align-items: center; min-width: 70px; cursor: pointer; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform='scale(1)'">
                <div style="display: flex; align-items: center; gap: 4px;">
                  <strong style="font-size: 13.5px;">${escapeHtml(w.word)}</strong>
                  <span style="font-size: 11px; font-weight: 800;">${icon}</span>
                </div>
                ${w.ipa ? '<span style="font-size: 10px; font-family: monospace; opacity: 0.85; margin: 1px 0;">' + escapeHtml(w.ipa) + '</span>' : ''}
                ${w.feedback ? '<span style="font-size: 9.5px; opacity: 0.85; text-align: center;">' + escapeHtml(w.feedback) + '</span>' : ''}
              </div>
            `;
          });
          phtml += '</div>';
        } else {
          phtml = '<span class="badge" style="background: rgba(52,211,153,0.15); color: #34d399; font-size: 11px; padding: 4px 10px;">' + (currentWord?.term || '') + '</span>';
        }
        phonemesEl.innerHTML = phtml;
      }

      // Render Take History Badges
      const takeHistEl = document.getElementById('spk-take-history');
      if (takeHistEl && speakingTakes.length > 0) {
        let thHtml = '';
        speakingTakes.forEach((s, i) => {
          const passed = s >= speakingFloorScore;
          const bg = passed ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.15)';
          const col = passed ? '#34d399' : '#f87171';
          const label = passed ? 'Lần ' + (i + 1) + ': ' + s + 'đ ✓' : 'Lần ' + (i + 1) + ': ' + s + 'đ';
          thHtml += '<span style="background: ' + bg + '; color: ' + col + '; border-radius: 12px; padding: 3px 10px; font-size: 11px; font-weight: 700;">' + label + '</span> ';
        });
        takeHistEl.innerHTML = thHtml;
        takeHistEl.style.display = 'flex';
      }

      // Multi-Take Economy & Floor Score Check
      const rewardCont = document.getElementById('spk-reward-badge-container');
      const floorBanner = document.getElementById('spk-floor-banner');
      const failBanner = document.getElementById('spk-fail-banner');

      if (rewardCont && countAsTake) {
        if (speakingFloorReached) {
          if (floorBanner) {
            floorBanner.style.display = 'block';
            floorBanner.innerHTML = '<div style="background: rgba(52,211,153,0.12); border: 1px solid rgba(52,211,153,0.4); border-radius: 12px; padding: 10px 14px; text-align: center; font-size: 12px; color: #34d399; font-weight: 700;">✅ Đã đạt điểm sàn (' + speakingFloorScore + ')! Có thể Tiếp tục hoặc Thu lại (tính trung bình cộng).</div>';
          }

          if (currentWord && !speakingGradedWordIds.has(currentWord.id)) {
            speakingGradedWordIds.add(currentWord.id);
            removeWordFromMistakeList(currentWord, false);
            const syllCount = speakingSyllableCache[currentWord.id] || Math.max(1, Math.ceil((currentWord.term || '').length / 3));
            const baseXu = Math.max(3, syllCount * 3);
            const admissionScore = speakingTakes.reduce((a, b) => a + b, 0) / speakingTakes.length;
            const admissionRatio = Math.min(2, admissionScore / speakingFloorScore);
            const cfg = getSpeakingDifficultyConfig(currentSpeakingDifficulty);
            const clueMult = getSpeakingClueMult();
            const wordReward = Math.round(baseXu * cfg.diffMult * clueMult * admissionRatio);
            const masteryDelta = Math.round(5 * admissionRatio);

            speakingSessionPointsEarned += wordReward;
            const scoreBadge = document.getElementById('speaking-score-badge');
            if (scoreBadge) scoreBadge.textContent = 'Bài: +' + speakingSessionPointsEarned + 'đ';

            const { deltaPoints: effectiveMasteryGain } = updateWordMasteryScore(currentWord, masteryDelta);

            rewardCont.innerHTML = '<span class="badge" style="font-size: 12.5px; font-weight: 800; padding: 7px 18px; border-radius: 20px; background: linear-gradient(135deg, rgba(52,211,153,0.2), rgba(16,185,129,0.2)); color: #34d399; border: 1px solid rgba(52,211,153,0.4);">🪙 +' + wordReward + ' VoCoin • 📈 +' + effectiveMasteryGain + '% Thuộc từ (Sàn: ' + speakingFloorScore + ')</span>';
            rewardCont.style.display = 'flex';
            playVocaSfx('correct');
          }

        } else if (speakingCurrentTakeIndex >= speakingMaxTakes) {
          // All takes exhausted & floor NOT reached -> Penalty
          if (failBanner) {
            const syllCount = speakingSyllableCache[currentWord.id] || Math.max(1, Math.ceil((currentWord.term || '').length / 3));
            const baseXu = Math.max(3, syllCount * 3);
            const admissionScore = speakingTakes.reduce((a, b) => a + b, 0) / speakingTakes.length;
            const cfg = getSpeakingDifficultyConfig(currentSpeakingDifficulty);
            const clueMult = getSpeakingClueMult();
            const penalty = -Math.round(baseXu * cfg.diffMult * clueMult * (1 - (admissionScore / 100)));

            speakingSessionPointsEarned += penalty;
            const scoreBadge = document.getElementById('speaking-score-badge');
            if (scoreBadge) scoreBadge.textContent = 'Bài: ' + speakingSessionPointsEarned + 'đ';

            if (currentWord) {
              speakingGradedWordIds.add(currentWord.id);
              updateWordMasteryScore(currentWord, -5);
              addWordToMistakeList(currentWord, 'speaking');
              if (!speakingSessionWrongWords.some(w => (w.id && w.id === currentWord.id) || (w.term && w.term.toLowerCase() === currentWord.term.toLowerCase()))) {
                speakingSessionWrongWords.push(currentWord);
              }
            }

            failBanner.style.display = 'block';
            failBanner.innerHTML = '<div style="background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.4); border-radius: 12px; padding: 10px 14px; text-align: center; font-size: 12px; color: #f87171; font-weight: 700;">❌ Hết ' + speakingMaxTakes + ' lượt thu! Trung bình: ' + Math.round(admissionScore) + 'đ < Sàn ' + speakingFloorScore + 'đ → ' + penalty + ' VoCoin, -5% Thuộc từ</div>';

            rewardCont.innerHTML = '<span class="badge" style="font-size: 12.5px; font-weight: 800; padding: 7px 18px; border-radius: 20px; background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.4);">💸 ' + penalty + ' VoCoin • 📉 -5% Thuộc từ</span>';
            rewardCont.style.display = 'flex';
          }

        } else {
          // Still have takes left, score < floor
          const remaining = speakingMaxTakes - speakingCurrentTakeIndex;
          rewardCont.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; width: 100%;">
              <button class="btn btn-primary" onclick="retrySpeakingFromBadge()" style="background: linear-gradient(135deg, #f59e0b, #d97706); border: none; font-weight: 800; font-size: 13px; padding: 9px 20px; border-radius: 24px; box-shadow: 0 4px 14px rgba(245,158,11,0.35); display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
                🔄 Thử lại (còn ${remaining} lượt) — Phím Space
              </button>
              <span style="font-size: 11px; color: var(--text-muted);">
                💡 Cần đạt từ <strong>${speakingFloorScore}/100 điểm</strong> để nhận VoCoin và mở khóa Từ Tiếp Theo!
              </span>
            </div>
          `;
          rewardCont.style.display = 'flex';
        }
      }

      // Render Full Word Details Card if floor reached or all takes exhausted
      const detailsBox = document.getElementById('spk-word-details-box');
      if (detailsBox && currentWord && (speakingFloorReached || speakingCurrentTakeIndex >= speakingMaxTakes)) {
        const detailTerm = document.getElementById('spk-detail-term');
        const detailPos = document.getElementById('spk-detail-pos');
        const detailCefr = document.getElementById('spk-detail-cefr');
        const detailPhonetic = document.getElementById('spk-detail-phonetic');
        const detailDef = document.getElementById('spk-detail-def');
        const detailEx = document.getElementById('spk-detail-example');
        const detailMeta = document.getElementById('spk-detail-meta');

        if (detailTerm) detailTerm.textContent = currentWord.term || '';
        if (detailPos) detailPos.textContent = currentWord.partOfSpeech || 'noun';
        if (detailCefr) {
          detailCefr.textContent = currentWord.cefrLevel || currentWord.level || 'B1';
          detailCefr.className = 'badge badge-level-' + (currentWord.cefrLevel || currentWord.level || 'b1').toLowerCase();
        }
        if (detailPhonetic) detailPhonetic.textContent = currentWord.phonetic || '';
        if (detailDef) detailDef.textContent = currentWord.definitionVi || currentWord.definition || '';
        if (detailEx) detailEx.textContent = (currentWord.exampleSentence || currentWord.example) ? '“' + (currentWord.exampleSentence || currentWord.example) + '”' : '';

        let metaHtml = '';
        if (currentWord.synonyms && currentWord.synonyms.length) metaHtml += '<div><strong>Đồng nghĩa:</strong> ' + escapeHtml(currentWord.synonyms.join(', ')) + '</div>';
        if (currentWord.antonyms && currentWord.antonyms.length) metaHtml += '<div><strong>Trái nghĩa:</strong> ' + escapeHtml(currentWord.antonyms.join(', ')) + '</div>';
        if (currentWord.collocations && currentWord.collocations.length) metaHtml += '<div><strong>Cụm từ:</strong> ' + escapeHtml(currentWord.collocations.join(', ')) + '</div>';
        if (currentWord.note) metaHtml += '<div><strong>Ghi chú:</strong> ' + escapeHtml(currentWord.note) + '</div>';
        if (detailMeta) {
          detailMeta.innerHTML = metaHtml || '<div style="color:var(--text-muted);text-align:center;">Chưa có dữ liệu mở rộng</div>';
        }
        detailsBox.style.display = 'block';
      }

      if (speakingCurrentTakeIndex >= speakingMaxTakes && !speakingFloorReached) {
        const micBtn = document.getElementById('btn-speaking-mic');
        if (micBtn) {
          micBtn.disabled = true;
          micBtn.style.opacity = '0.4';
        }
      }

      // Update Next button locking state
      updateSpeakingNextButtonState();
    }

    function playSpeakingUserAudio() {
      if (speakingAudioBlobUrl) {
        const audio = new Audio(speakingAudioBlobUrl);
        audio.play().then(() => {
          showToast('🎧 Đang phát lại bản thu âm của bạn...');
        }).catch(e => {
          console.warn('Audio playback error:', e);
          showToast('⚠️ Không thể phát bản thu âm!');
        });
      } else {
        showToast('⚠️ Chưa có bản thu âm nào cho từ này!');
      }
    }

    function startAutoFlashcardMode(useSelectionOnly = false, customWordList = null) {
      lastScreenBeforeAutoFc = document.querySelector('.screen.active')?.id || 'screen-decks';
      isAutoFcMiniMode = false;
      const miniEl = document.getElementById('autofc-mini-player');
      if (miniEl) miniEl.style.display = 'none';
      studySourceContext = customWordList ? 'review-queue' : 'deck';
      let deckWords = customWordList || getFilteredDeckWords();
      if (!customWordList && useSelectionOnly && selectedWordIds.size > 0) {
        deckWords = words.filter(w => selectedWordIds.has(w.id));
      } else if (!customWordList && selectedWordIds.size > 0) {
        deckWords = words.filter(w => selectedWordIds.has(w.id));
      }

      if (deckWords.length === 0) {
        alert('Không có từ vựng nào để chạy Auto Flashcard!');
        return;
      }

      if (isStudyShuffle) {
        autoFlashcardList = [...deckWords].sort(() => Math.random() - 0.5);
      } else {
        autoFlashcardList = [...deckWords];
      }
      autoFlashcardIndex = 0;
      isAutoPlaying = true;
      showScreen('screen-autofc');
      syncAutoFlashcardControlsUI();
      runAutoFlashcardLoop();
    }

    function shuffleCurrentAutoFlashcard() {
      if (!autoFlashcardList || autoFlashcardList.length <= 1) return;
      const remainingCount = autoFlashcardList.length - 1 - autoFlashcardIndex;
      if (remainingCount <= 0) {
        showToast('ℹ️ Bạn đang ở thẻ cuối cùng, không còn thẻ phía sau để xáo trộn!');
        return;
      }
      if (remainingCount === 1) {
        showToast('ℹ️ Chỉ còn 1 thẻ phía sau, không thể xáo trộn thêm!');
        return;
      }
      for (let i = autoFlashcardList.length - 1; i > autoFlashcardIndex + 1; i--) {
        const j = autoFlashcardIndex + 1 + Math.floor(Math.random() * (i - autoFlashcardIndex));
        [autoFlashcardList[i], autoFlashcardList[j]] = [autoFlashcardList[j], autoFlashcardList[i]];
      }
      showToast(`🔀 Đã xáo trộn ${remainingCount} thẻ còn lại phía sau!`);
    }

    function syncAutoFlashcardControlsUI() {
      const playIcon = document.getElementById('icon-autofc-playpause');
      const miniPlayIcon = document.getElementById('icon-autofc-mini-playpause');
      const loopBtn = document.getElementById('btn-autofc-loop');
      const miniLoopBtn = document.getElementById('btn-autofc-mini-loop');

      if (playIcon) {
        playIcon.innerHTML = `<use href="#${isAutoPlaying ? 'i-pause' : 'i-play'}"/>`;
      }
      if (miniPlayIcon) {
        miniPlayIcon.innerHTML = `<use href="#${isAutoPlaying ? 'i-pause' : 'i-play'}"/>`;
      }
      if (miniLoopBtn) {
        miniLoopBtn.style.color = isAutoLoop ? '#34d399' : 'var(--text-muted)';
      }
      if (loopBtn) {
        if (isAutoLoop) {
          loopBtn.style.color = '#34d399';
          loopBtn.style.borderColor = '#10b981';
          loopBtn.style.background = 'rgba(16, 185, 129, 0.12)';
        } else {
          loopBtn.style.color = 'var(--text-muted)';
          loopBtn.style.borderColor = 'var(--border)';
          loopBtn.style.background = 'transparent';
        }
      }

      const enSlider = document.getElementById('autofc-speed-en-slider');
      const viSlider = document.getElementById('autofc-speed-vi-slider');
      const delaySlider = document.getElementById('autofc-delay-slider');
      if (enSlider) enSlider.value = currentSpeechRateEn;
      if (viSlider) viSlider.value = currentSpeechRateVi;
      if (delaySlider) delaySlider.value = autoDelaySeconds;

      const enLbl = document.getElementById('autofc-speed-en-label');
      const viLbl = document.getElementById('autofc-speed-vi-label');
      const delayLbl = document.getElementById('autofc-delay-label');
      if (enLbl) enLbl.textContent = `${currentSpeechRateEn.toFixed(1)}x`;
      if (viLbl) viLbl.textContent = `${currentSpeechRateVi.toFixed(1)}x`;
      if (delayLbl) delayLbl.textContent = `${autoDelaySeconds.toFixed(1)}s`;
    }

    function handleAutoCardManualFlip() {
      if (isAutoPlaying) {
        // When active auto loop is speaking/running, ignore manual click to keep sequence clean
        return;
      }
      const cardEl = document.getElementById('autofc-card-element');
      if (cardEl) {
        cardEl.classList.toggle('flipped');
      }
    }

    function toggleAutoFlashcardPlayPause() {
      if (isAutoPlaying) {
        isAutoPlaying = false;
        autoFlashcardStepId++;
        stopAllAudio();
        const statusEl = document.getElementById('autofc-status-indicator');
        if (statusEl) {
          statusEl.textContent = '⏸️ Đã tạm dừng';
          statusEl.style.color = 'var(--warning)';
        }
        const hintEl = document.getElementById('autofc-hint-text');
        if (hintEl) {
          hintEl.textContent = '👆 Chạm vào thẻ để lật xem mặt trước / sau';
        }
      } else {
        isAutoPlaying = true;
        const hintEl = document.getElementById('autofc-hint-text');
        if (hintEl) {
          hintEl.textContent = '⏳ Tự động lật và đọc tiếng Việt sau khi phát âm';
        }
        runAutoFlashcardLoop();
      }
      syncAutoFlashcardControlsUI();
    }

    function toggleAutoFlashcardLoop() {
      isAutoLoop = !isAutoLoop;
      syncAutoFlashcardControlsUI();
      showToast(isAutoLoop ? '🔁 Đã bật lặp vô tận danh sách' : '➡️ Đã tắt lặp (chạy 1 lượt rồi dừng)');
    }

    function nextAutoFlashcard() {
      autoFlashcardStepId++;
      stopAllAudio();

      autoFlashcardIndex++;
      if (autoFlashcardIndex >= autoFlashcardList.length) {
        autoFlashcardIndex = isAutoLoop ? 0 : autoFlashcardList.length - 1;
      }
      if (isAutoPlaying) {
        runAutoFlashcardLoop();
      } else {
        renderAutoCardOnly(autoFlashcardIndex);
      }
    }

    function prevAutoFlashcard() {
      autoFlashcardStepId++;
      stopAllAudio();

      autoFlashcardIndex--;
      if (autoFlashcardIndex < 0) {
        autoFlashcardIndex = isAutoLoop ? autoFlashcardList.length - 1 : 0;
      }
      if (isAutoPlaying) {
        runAutoFlashcardLoop();
      } else {
        renderAutoCardOnly(autoFlashcardIndex);
      }
    }

    function exitAutoFlashcard(force = false) {
      // v0.10.9-alpha-30: Auto Flashcard allows free exit anytime without interruption/penalty modal
      doExecuteExitAutoFlashcard();
    }

    function doExecuteExitAutoFlashcard() {
      checkAndApplyPendingAppUpdate();
      isAutoPlaying = false;
      isAutoFcMiniMode = false;
      autoFlashcardStepId++;
      stopAllAudio();
      const miniEl = document.getElementById('autofc-mini-player');
      if (miniEl) miniEl.style.display = 'none';
      try {
        if (studySourceContext === 'review-queue' || !currentDeckId) {
          showScreen('screen-decks');
          refreshActiveScreenData();
        } else {
          openDeckDetail(currentDeckId);
        }
      } catch (errNav) {
        console.warn('AutoFC navigation fallback:', errNav);
        showScreen('screen-decks');
        refreshActiveScreenData();
      }
    }

    function renderAutoCardOnly(index) {
      if (!autoFlashcardList || autoFlashcardList.length === 0) return;
      const word = autoFlashcardList[index];
      const total = autoFlashcardList.length;

      document.getElementById('autofc-counter').textContent = `Thẻ ${index + 1} / ${total}`;
      document.getElementById('autofc-progress-bar').style.width = `${Math.round(((index + 1) / total) * 100)}%`;

      const cardEl = document.getElementById('autofc-card-element');
      if (cardEl) cardEl.classList.remove('flipped');

      const hintEl = document.getElementById('autofc-hint-text');
      if (hintEl) {
        hintEl.textContent = isAutoPlaying ? '⏳ Tự động lật và đọc tiếng Việt sau khi phát âm' : '👆 Chạm vào thẻ để lật xem mặt trước / sau';
      }

      const senses = (typeof getWordSenses === 'function') ? getWordSenses(word) : [];
      const isMultiSense = senses.length > 1;

      // Front
      const cefrEl = document.getElementById('autofc-front-cefr');
      if (word.cefrLevel || (senses[0] && senses[0].cefrLevel)) {
        cefrEl.textContent = word.cefrLevel || senses[0].cefrLevel;
        cefrEl.style.display = 'inline-block';
      } else {
        cefrEl.style.display = 'none';
      }
      document.getElementById('autofc-front-pos').textContent = (word.partOfSpeech || (senses[0] && senses[0].partOfSpeech) || 'WORD').toUpperCase();
      document.getElementById('autofc-front-term').textContent = word.term;
      document.getElementById('autofc-front-phonetic').textContent = word.phonetic || (senses[0] && senses[0].phonetic) || '';

      // Back
      document.getElementById('autofc-back-term').textContent = word.term;
      const backDefEl = document.getElementById('autofc-back-def');
      const backExEl = document.getElementById('autofc-back-example');

      if (isMultiSense) {
        let sensesHtml = '<div style="display: flex; flex-direction: column; gap: 8px; text-align: left; max-height: 190px; overflow-y: auto; padding-right: 4px; margin-top: 4px;">';
        senses.forEach((s, sIdx) => {
          sensesHtml += `
            <div style="background: var(--surface-elevated, rgba(255,255,255,0.06)); border: 1px solid var(--border); border-radius: 8px; padding: 6px 10px; font-size: 13px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
                <span class="badge" style="background: rgba(99,102,241,0.2); color: #818cf8; font-size: 10px; font-weight: 700;">Nghĩa ${sIdx + 1}</span>
                <span class="badge badge-pos" style="font-size: 9.5px;">${escapeHtml(s.partOfSpeech || 'noun')}</span>
                <span class="badge badge-level-${(s.cefrLevel || 'b1').toLowerCase()}" style="font-size: 9.5px;">${escapeHtml(s.cefrLevel || 'B1')}</span>
              </div>
              <div style="font-weight: 700; color: var(--text);">${escapeHtml(s.definitionVi)}</div>
              ${s.exampleSentence ? `<div style="font-size: 11.5px; color: var(--text-muted); font-style: italic; margin-top: 2px;">“${escapeHtml(s.exampleSentence)}”</div>` : ''}
            </div>
          `;
        });
        sensesHtml += '</div>';
        if (backDefEl) backDefEl.innerHTML = sensesHtml;
        if (backExEl) backExEl.textContent = '';
      } else {
        if (backDefEl) backDefEl.textContent = word.definitionVi || senses[0]?.definitionVi || '';
        if (backExEl) backExEl.textContent = (word.exampleSentence || senses[0]?.exampleSentence) ? `“${word.exampleSentence || senses[0]?.exampleSentence}”` : '';
      }

      const metaEl = document.getElementById('autofc-back-meta');
      let metaHtml = '';
      if (word.synonyms && word.synonyms.length) metaHtml += `<div><strong>Đồng nghĩa:</strong> ${escapeHtml(Array.isArray(word.synonyms) ? word.synonyms.join(', ') : word.synonyms)}</div>`;
      if (word.antonyms && word.antonyms.length) metaHtml += `<div><strong>Trái nghĩa:</strong> ${escapeHtml(Array.isArray(word.antonyms) ? word.antonyms.join(', ') : word.antonyms)}</div>`;
      if (word.collocations && word.collocations.length) metaHtml += `<div><strong>Cụm từ:</strong> ${escapeHtml(Array.isArray(word.collocations) ? word.collocations.join(', ') : word.collocations)}</div>`;
      if (word.note) metaHtml += `<div><strong>Ghi chú:</strong> ${escapeHtml(word.note)}</div>`;
      metaEl.innerHTML = metaHtml || '<div style="color:var(--text-muted);text-align:center;">Chưa có dữ liệu mở rộng</div>';

      // Sync Mini Player (PiP)
      const miniTitle = document.getElementById('autofc-mini-title');
      const miniProg = document.getElementById('autofc-mini-progress');
      const miniPos = document.getElementById('autofc-mini-pos');
      const miniFrontTerm = document.getElementById('autofc-mini-front-term');
      const miniFrontPhonetic = document.getElementById('autofc-mini-front-phonetic');
      const miniBackTerm = document.getElementById('autofc-mini-back-term');
      const miniBackDef = document.getElementById('autofc-mini-back-def');
      const miniCardEl = document.getElementById('autofc-mini-card-element');
      const miniStatus = document.getElementById('autofc-mini-status');

      if (miniTitle) miniTitle.textContent = `Auto FC (${index + 1}/${total})`;
      if (miniProg) miniProg.style.width = `${Math.round(((index + 1) / total) * 100)}%`;
      if (miniPos) miniPos.textContent = (word.partOfSpeech || (senses[0] && senses[0].partOfSpeech) || 'WORD').toLowerCase();
      if (miniFrontTerm) miniFrontTerm.textContent = word.term;
      if (miniFrontPhonetic) miniFrontPhonetic.textContent = word.phonetic || (senses[0] && senses[0].phonetic) || '';
      if (miniBackTerm) miniBackTerm.textContent = word.term;
      if (miniBackDef) {
        if (isMultiSense) {
          miniBackDef.textContent = senses.map((s, i) => `${i + 1}. ${s.definitionVi}`).join(' | ');
        } else {
          miniBackDef.textContent = word.definitionVi || senses[0]?.definitionVi || '';
        }
      }
      if (miniCardEl) miniCardEl.classList.remove('flipped');
      if (miniStatus) {
        miniStatus.textContent = '🔊 EN';
        miniStatus.style.color = '#38bdf8';
      }
    }

    async function runAutoFlashcardLoop() {
      const thisStepId = ++autoFlashcardStepId;

      while (isAutoPlaying) {
        if (autoFlashcardIndex >= autoFlashcardList.length) {
          if (isAutoLoop && autoFlashcardList.length > 0) {
            autoFlashcardIndex = 0;
          } else {
            isAutoPlaying = false;
            syncAutoFlashcardControlsUI();
            alert('Đã hoàn thành lượt đọc Auto Flashcard!');
            exitAutoFlashcard(true);
            return;
          }
        }

        const word = autoFlashcardList[autoFlashcardIndex];
        renderAutoCardOnly(autoFlashcardIndex);

        // 1. Show Front & status
        const cardEl = document.getElementById('autofc-card-element');
        if (cardEl) cardEl.classList.remove('flipped');
        const statusEl = document.getElementById('autofc-status-indicator');
        if (statusEl) {
          statusEl.textContent = '🔊 Đang đọc tiếng Anh...';
          statusEl.style.color = '#38bdf8';
        }

        // Preload upcoming words audio in the background to prevent 429 rate limits & delays
        preloadUpcomingAudio(autoFlashcardIndex);

        await new Promise(r => setTimeout(r, 500));
        if (!isAutoPlaying || thisStepId !== autoFlashcardStepId) return;

        // 2. Speak English Term completely
        await playAudioAsync(word.term, 'en-US', currentSpeechRateEn);
        if (!isAutoPlaying || thisStepId !== autoFlashcardStepId) return;

        // 3. Calm thinking & recall pause (1.4s) so learner can absorb and guess the meaning
        if (statusEl) {
          statusEl.textContent = '🧠 Ghi nhớ nghĩa từ...';
          statusEl.style.color = 'var(--text-muted)';
        }
        await new Promise(r => setTimeout(r, 1400));
        if (!isAutoPlaying || thisStepId !== autoFlashcardStepId) return;

        // 4. Flip to Back smoothly
        if (cardEl) cardEl.classList.add('flipped');
        const miniCardEl = document.getElementById('autofc-mini-card-element');
        const miniStatusEl = document.getElementById('autofc-mini-status');
        if (miniCardEl) miniCardEl.classList.add('flipped');
        if (miniStatusEl) {
          miniStatusEl.textContent = '🔊 VI';
          miniStatusEl.style.color = '#34d399';
        }
        if (statusEl) {
          statusEl.textContent = '🇻🇳 Chuẩn bị đọc nghĩa...';
          statusEl.style.color = '#34d399';
        }

        // 5. Post-flip settle pause (850ms) to let the 3D flip animation finish completely
        await new Promise(r => setTimeout(r, 850));
        if (!isAutoPlaying || thisStepId !== autoFlashcardStepId) return;

        // 6. Speak Vietnamese Definition completely (Multi-sense sequential support)
        const senses = (typeof getWordSenses === 'function') ? getWordSenses(word) : [];
        if (senses.length > 1) {
          for (let sIdx = 0; sIdx < senses.length; sIdx++) {
            const s = senses[sIdx];
            if (!isAutoPlaying || thisStepId !== autoFlashcardStepId) return;
            if (s.definitionVi) {
              if (statusEl) {
                statusEl.textContent = `🇻🇳 Đang đọc nghĩa ${sIdx + 1}/${senses.length}...`;
                statusEl.style.color = '#34d399';
              }
              if (miniStatusEl) {
                miniStatusEl.textContent = `🔊 VI (${sIdx + 1}/${senses.length})`;
              }
              const senseSpeech = `Nét nghĩa ${sIdx + 1}: ${s.definitionVi}`;
              await playAudioAsync(senseSpeech, 'vi', currentSpeechRateVi);
              if (!isAutoPlaying || thisStepId !== autoFlashcardStepId) return;
              if (sIdx < senses.length - 1) {
                await new Promise(r => setTimeout(r, 450));
              }
            }
          }
        } else if (word.definitionVi || (senses[0] && senses[0].definitionVi)) {
          const singleDef = word.definitionVi || senses[0].definitionVi;
          if (statusEl) {
            statusEl.textContent = '🇻🇳 Đang đọc tiếng Việt...';
            statusEl.style.color = '#34d399';
          }
          await playAudioAsync(singleDef, 'vi', currentSpeechRateVi);
        }
        if (!isAutoPlaying || thisStepId !== autoFlashcardStepId) return;

        // AUTO FC PROGRESSION (v0.0.9.22 & v0.10.9-49):
        // If word is brand new (masteryScore === 0), award +1% so it transitions to "Đang học (1%)"
        const currentScore = (typeof word.masteryScore === 'number') ? word.masteryScore : 0;
        if (currentScore === 0) {
          word.masteryScore = 1;
          word.status = 'learning';
          word.updatedAt = new Date().toISOString();
          const globalIdx = words.findIndex(w => w.id === word.id);
          if (globalIdx >= 0) {
            words[globalIdx].masteryScore = 1;
            words[globalIdx].status = 'learning';
            words[globalIdx].updatedAt = word.updatedAt;
          }
          saveDatabase(true);
        } else if (studySourceContext === 'review-queue') {
          word.updatedAt = new Date().toISOString();
          const globalIdx = words.findIndex(w => w.id === word.id);
          if (globalIdx >= 0) {
            words[globalIdx].updatedAt = word.updatedAt;
          }
          saveDatabase(true);
        }

        // 7. Rest period before next word (user configured delay + buffer)
        if (statusEl) {
          statusEl.textContent = '⏱️ Nghỉ ngắt nhịp...';
          statusEl.style.color = 'var(--text-muted)';
        }
        const restDurationMs = (Math.max(0.6, autoDelaySeconds) + 0.5) * 1000;
        await new Promise(r => setTimeout(r, restDurationMs));
        if (!isAutoPlaying || thisStepId !== autoFlashcardStepId) return;

        // 8. Move to next card
        autoFlashcardIndex++;
      }
    }
