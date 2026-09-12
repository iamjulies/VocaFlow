// =========================================================================

// VOCAFLOW 06-SPELLING-ENGINE.JS (v0.10.9-48)

// Spelling mode, virtual keyboard, syllable clues, phonetics & score calculation

// =========================================================================

        // =========================================================================
    // SPELLING & FILL-IN-THE-BLANK MODE ENGINE (v0.0.10.1a)
    // =========================================================================
    let spellingList = [];
    let spellingIndex = 0;
    let spellingScore = 0;
    let spellingIsAnswered = false;
    let spellingStartTime = 0;
    let spellingActiveTimeMs = 0;
    let spellingQuestionStartTime = null;
    let spellingCorrectCount = 0;
    let spellingWrongCount = 0;
    let spellingWrongAttemptsForCurrentWord = 0;
    let spellingPointsEarned = 0;
    let spellingHintsUsed = 0;
    let spellingSkipCount = 0;
    let spellingTotalQuestions = 0;
    let spellingFireworksAnimationId = null;

    let currentSpellingDifficulty = localStorage.getItem('vocaflow_spelling_difficulty') || 'easy';
    let spellingSetupUseSelection = false;
    let spellingSetupCustomWordList = null;
    let selectedSpellingSetupDifficulty = 'easy';

    let spellingCluesConfig = {
      def: true,
      ipa: true,
      audio: true
    };
    try {
      const savedClues = localStorage.getItem('vocaflow_spelling_clues');
      if (savedClues) spellingCluesConfig = JSON.parse(savedClues);
    } catch (e) {}

    let currentSpellingHiddenIndices = new Set();
    let currentSpellingRevealedIndices = new Set();

    function getSpellingDifficultyLabel(diff) {
      if (diff === 'extreme') return '🟣 Siêu Khó (x2.5)';
      if (diff === 'hard') return '🔴 Khó (x2.0)';
      if (diff === 'medium') return '🟡 Trung bình (x1.5)';
      return '🟢 Dễ (x1.0)';
    }

        function getSpellingMultipliers() {
      const activeClueCount = [spellingCluesConfig.def, spellingCluesConfig.ipa, spellingCluesConfig.audio].filter(Boolean).length;
      let clueMult = 1.0;
      let clueLabel = 'Toàn diện';
      if (activeClueCount === 1) {
        clueMult = 1.5;
        clueLabel = 'Siêu thử thách';
      } else if (activeClueCount === 2) {
        clueMult = 1.2;
        clueLabel = 'Nâng cao';
      }

      let diffMult = 1.0;
      let diffLabel = 'Dễ';
      if (currentSpellingDifficulty === 'extreme') {
        diffMult = 2.5;
        diffLabel = 'Siêu Khó';
      } else if (currentSpellingDifficulty === 'hard') {
        diffMult = 2.0;
        diffLabel = 'Khó';
      } else if (currentSpellingDifficulty === 'medium') {
        diffMult = 1.5;
        diffLabel = 'Trung bình';
      }

      const totalMult = Number((diffMult * clueMult).toFixed(2));
      return { clueMult, clueLabel, diffMult, diffLabel, totalMult, activeClueCount };
    }

    function updateSpellingClueMultiplierBadge() {
      const badge = document.getElementById('spelling-clues-multiplier-badge');
      if (!badge) return;
      const { clueMult, activeClueCount } = getSpellingMultipliers();
      if (activeClueCount === 1) {
        badge.innerHTML = '🔥 1 Manh mối (x1.5 Thưởng)';
        badge.style.background = 'rgba(239, 68, 68, 0.15)';
        badge.style.color = '#f87171';
        badge.style.borderColor = 'rgba(239, 68, 68, 0.35)';
      } else if (activeClueCount === 2) {
        badge.innerHTML = '⚡ 2 Manh mối (x1.2 Thưởng)';
        badge.style.background = 'rgba(245, 158, 11, 0.15)';
        badge.style.color = '#fbbf24';
        badge.style.borderColor = 'rgba(245, 158, 11, 0.35)';
      } else {
        badge.innerHTML = '🌱 3 Manh mối (x1.0 Chuẩn)';
        badge.style.background = 'rgba(16, 185, 129, 0.15)';
        badge.style.color = '#34d399';
        badge.style.borderColor = 'rgba(16, 185, 129, 0.35)';
      }
    }

    function openSpellingSetupModal(useSelectionOnly = false, customWordList = null) {
      dismissMiniAutoFlashcardIfActive();
      spellingSetupUseSelection = useSelectionOnly;
      spellingSetupCustomWordList = customWordList;

      let deckWords = customWordList || getFilteredDeckWords();
      if (!customWordList && useSelectionOnly && selectedWordIds.size > 0) {
        deckWords = words.filter(w => selectedWordIds.has(w.id));
      } else if (!customWordList && selectedWordIds.size > 0) {
        deckWords = words.filter(w => selectedWordIds.has(w.id));
      }

      if (deckWords.length === 0) {
        alert('Không có từ vựng nào để luyện viết!');
        return;
      }

      const deck = decks.find(d => d.id === currentDeckId);
      const subtitle = document.getElementById('spelling-setup-subtitle');
      if (subtitle) {
        if (customWordList) {
          subtitle.textContent = 'Ôn tập ' + deckWords.length + ' từ vựng đã chọn';
        } else {
          subtitle.textContent = 'VocaDeck: "' + (deck ? deck.title : 'Từ vựng đã chọn') + '" • Tổng số: ' + deckWords.length + ' từ';
        }
      }

      const savedDiff = localStorage.getItem('vocaflow_spelling_difficulty') || 'easy';
      selectSpellingSetupDifficulty(savedDiff);

      // Restore clue checkboxes
      ['def', 'ipa', 'audio'].forEach(k => {
        const chk = document.getElementById('spelling-chk-' + k);
        if (chk) chk.checked = !!spellingCluesConfig[k];
        updateSpellingClueUI(k, !!spellingCluesConfig[k]);
      });
      updateSpellingClueMultiplierBadge();

      const shuffleCb = document.getElementById('spelling-setup-shuffle-checkbox');
      if (shuffleCb) shuffleCb.checked = isStudyShuffle;

      openModal('modal-spelling-setup');
    }

    function selectSpellingSetupDifficulty(diff) {
      if (!['easy', 'medium', 'hard', 'extreme'].includes(diff)) diff = 'easy';
      selectedSpellingSetupDifficulty = diff;
      const cards = {
        easy: document.getElementById('spelling-diff-card-easy'),
        medium: document.getElementById('spelling-diff-card-medium'),
        hard: document.getElementById('spelling-diff-card-hard'),
        extreme: document.getElementById('spelling-diff-card-extreme')
      };

      Object.keys(cards).forEach(k => {
        const c = cards[k];
        if (!c) return;
        if (k === diff) {
          if (k === 'easy') {
            c.style.borderColor = '#10b981';
            c.style.background = 'rgba(16, 185, 129, 0.12)';
            c.style.boxShadow = '0 0 16px rgba(16, 185, 129, 0.25)';
          } else if (k === 'medium') {
            c.style.borderColor = '#fbbf24';
            c.style.background = 'rgba(245, 158, 11, 0.12)';
            c.style.boxShadow = '0 0 16px rgba(245, 158, 11, 0.25)';
          } else if (k === 'hard') {
            c.style.borderColor = '#f87171';
            c.style.background = 'rgba(239, 68, 68, 0.12)';
            c.style.boxShadow = '0 0 16px rgba(239, 68, 68, 0.25)';
          } else if (k === 'extreme') {
            c.style.borderColor = '#c084fc';
            c.style.background = 'rgba(168, 85, 247, 0.15)';
            c.style.boxShadow = '0 0 16px rgba(168, 85, 247, 0.35)';
          }
        } else {
          c.style.borderColor = 'var(--border)';
          c.style.background = 'var(--surface-elevated)';
          c.style.boxShadow = 'none';
        }
      });
    }

    function toggleSpellingClue(clueKey) {
      const chk = document.getElementById('spelling-chk-' + clueKey);
      if (!chk) return;

      // Ensure at least 1 clue is selected
      const defOn = document.getElementById('spelling-chk-def')?.checked;
      const ipaOn = document.getElementById('spelling-chk-ipa')?.checked;
      const audioOn = document.getElementById('spelling-chk-audio')?.checked;

      if (!defOn && !ipaOn && !audioOn) {
        chk.checked = true;
        showToast('⚠️ Bắt buộc phải chọn ít nhất 1 manh mối để nhận diện từ!');
      }

      spellingCluesConfig[clueKey] = chk.checked;
      updateSpellingClueUI(clueKey, chk.checked);
      updateSpellingClueMultiplierBadge();
      localStorage.setItem('vocaflow_spelling_clues', JSON.stringify(spellingCluesConfig));
    }

    function updateSpellingClueUI(clueKey, isChecked) {
      const toggleBtn = document.getElementById('spelling-clue-toggle-' + clueKey);
      if (!toggleBtn) return;
      if (isChecked) {
        toggleBtn.style.borderColor = '#6366f1';
        toggleBtn.style.background = 'rgba(99, 102, 241, 0.2)';
        toggleBtn.style.color = '#fff';
      } else {
        toggleBtn.style.borderColor = 'var(--border)';
        toggleBtn.style.background = 'var(--surface-elevated)';
        toggleBtn.style.color = 'var(--text-muted)';
      }
    }

    function confirmStartSpellingFromModal() {
      // Validate at least one clue
      const hasClue = spellingCluesConfig.def || spellingCluesConfig.ipa || spellingCluesConfig.audio;
      if (!hasClue) {
        alert('Vui lòng chọn ít nhất 1 manh mối hiển thị (Nghĩa TV, Phiên âm hoặc Âm thanh)!');
        return;
      }

      currentSpellingDifficulty = selectedSpellingSetupDifficulty;
      localStorage.setItem('vocaflow_spelling_difficulty', currentSpellingDifficulty);

      const shuffleCb = document.getElementById('spelling-setup-shuffle-checkbox');
      if (shuffleCb) {
        isStudyShuffle = shuffleCb.checked;
        localStorage.setItem('vocaflow_study_shuffle', isStudyShuffle ? 'true' : 'false');
      }

      closeModal('modal-spelling-setup');
      startSpellingMode(spellingSetupUseSelection, spellingSetupCustomWordList);
    }

    function setSpellingDifficulty(diff) {
      if (diff !== 'easy' && (!currentUser || !currentUser.email)) {
        alert('🔒 Cấp độ Thường, Khó và Siêu Khó yêu cầu đăng nhập/đăng ký tài khoản để mở khóa!');
        openAuthModal('login');
        return;
      }
      if (!['easy', 'medium', 'hard', 'extreme'].includes(diff)) diff = 'easy';
      currentSpellingDifficulty = diff;
      localStorage.setItem('vocaflow_spelling_difficulty', diff);
      updateSpellingDifficultyUI();
      showToast('🎯 Đã chọn độ khó Luyện Viết: ' + getSpellingDifficultyLabel(diff));
    }

    function cycleSpellingDifficulty() {
      if (isGuest()) {
        alert('🔒 Cấp độ Thường, Khó và Siêu Khó yêu cầu đăng nhập/đăng ký tài khoản để mở khóa!');
        openAuthModal('login');
        return;
      }
      const order = ['easy', 'medium', 'hard', 'extreme'];
      const nextIdx = (order.indexOf(currentSpellingDifficulty) + 1) % order.length;
      setSpellingDifficulty(order[nextIdx]);
      if (spellingList && spellingList.length > 0 && spellingIndex < spellingList.length) {
        loadSpellingQuestion();
      }
    }

    function updateSpellingDifficultyUI() {
      const badge = document.getElementById('spelling-difficulty-badge');
      if (badge) {
        const { diffMult, totalMult, activeClueCount } = getSpellingMultipliers();
        let icon = '🟢';
        let diffName = 'Dễ';
        if (currentSpellingDifficulty === 'extreme') { icon = '🟣'; diffName = 'Siêu Khó'; }
        else if (currentSpellingDifficulty === 'hard') { icon = '🔴'; diffName = 'Khó'; }
        else if (currentSpellingDifficulty === 'medium') { icon = '🟡'; diffName = 'Trung bình'; }

        badge.textContent = `${icon} ${diffName} (x${totalMult})`;
        badge.title = `Cấp độ: ${diffName} (x${diffMult}) • Manh mối: ${activeClueCount}/3 -> Tổng hệ số: x${totalMult}. Bấm để chuyển đổi nhanh độ khó.`;

        if (currentSpellingDifficulty === 'extreme') {
          badge.style.background = 'rgba(168, 85, 247, 0.15)';
          badge.style.color = '#c084fc';
          badge.style.borderColor = 'rgba(168, 85, 247, 0.35)';
        } else if (currentSpellingDifficulty === 'hard') {
          badge.style.background = 'rgba(239, 68, 68, 0.15)';
          badge.style.color = '#f87171';
          badge.style.borderColor = 'rgba(239, 68, 68, 0.35)';
        } else if (currentSpellingDifficulty === 'medium') {
          badge.style.background = 'rgba(245, 158, 11, 0.15)';
          badge.style.color = '#fbbf24';
          badge.style.borderColor = 'rgba(245, 158, 11, 0.35)';
        } else {
          badge.style.background = 'rgba(16, 185, 129, 0.15)';
          badge.style.color = '#34d399';
          badge.style.borderColor = 'rgba(16, 185, 129, 0.35)';
        }
      }
    }

    function startSpellingMode(useSelectionOnly = false, customWordList = null) {
      dismissMiniAutoFlashcardIfActive();
      studySourceContext = customWordList ? 'review-queue' : 'deck';
      spellingSessionWrongWords = [];
      let deckWords = customWordList || getFilteredDeckWords();
      if (!customWordList && useSelectionOnly && selectedWordIds.size > 0) {
        deckWords = words.filter(w => selectedWordIds.has(w.id));
      } else if (!customWordList && selectedWordIds.size > 0) {
        deckWords = words.filter(w => selectedWordIds.has(w.id));
      }

      if (deckWords.length === 0) {
        alert('Không có từ vựng nào để luyện viết!');
        return;
      }

      if (isStudyShuffle) {
        spellingList = [...deckWords].sort(() => Math.random() - 0.5);
      } else {
        spellingList = [...deckWords];
      }
      spellingIndex = 0;
      spellingScore = 0;
      spellingIsAnswered = false;
      spellingIsCompleted = false;

      // Track statistics
      spellingStartTime = Date.now();
      spellingActiveTimeMs = 0;
      spellingQuestionStartTime = null;
      spellingCorrectCount = 0;
      spellingWrongCount = 0;
      spellingPointsEarned = 0;
      spellingHintsUsed = 0;
      spellingSkipCount = 0;
      spellingTotalQuestions = spellingList.length;

      loadSpellingQuestion();
      showScreen('screen-spelling');
    }

    function shuffleCurrentSpelling() {
      if (!spellingList || spellingList.length <= 1) return;
      const remainingCount = spellingList.length - 1 - spellingIndex;
      if (remainingCount <= 0) {
        showToast('ℹ️ Bạn đang ở từ cuối cùng, không còn từ phía sau để xáo trộn!');
        return;
      }
      if (remainingCount === 1) {
        showToast('ℹ️ Chỉ còn 1 từ phía sau, không thể xáo trộn thêm!');
        return;
      }
      for (let i = spellingList.length - 1; i > spellingIndex + 1; i--) {
        const j = spellingIndex + 1 + Math.floor(Math.random() * (i - spellingIndex));
        [spellingList[i], spellingList[j]] = [spellingList[j], spellingList[i]];
      }
      showToast(`🔀 Đã xáo trộn ${remainingCount} từ còn lại phía sau!`);
    }

    function loadSpellingQuestion() {
      spellingIsAnswered = false;
      spellingQuestionStartTime = Date.now();
      spellingWrongAttemptsForCurrentWord = 0;

      const questionWord = spellingList[spellingIndex];
      const total = spellingList.length;

      // Polysemy / Homographs: Pick random sense
      const senses = getWordSenses(questionWord);
      const chosenSense = (senses && senses.length > 0) ? senses[Math.floor(Math.random() * senses.length)] : questionWord;
      questionWord._activeSpellingSense = chosenSense;
      const senseIdx = senses.indexOf(chosenSense);

      document.getElementById('spelling-counter').textContent = 'Từ ' + (spellingIndex + 1) + ' / ' + total;
      document.getElementById('spelling-score').textContent = 'Bài: ' + (spellingScore >= 0 ? '+' : '') + spellingScore + 'đ';
      updateSpellingWalletPointsDisplay();
      updateSpellingDifficultyUI();

      // Setup Hint & Feedback
      const hintBox = document.getElementById('spelling-hint-box');
      if (hintBox) hintBox.style.display = 'none';
      const detailsBox = document.getElementById('spelling-word-details-box');
      if (detailsBox) detailsBox.style.display = 'none';
      const feedbackMsg = document.getElementById('spelling-feedback-msg');
      if (feedbackMsg) {
        feedbackMsg.textContent = '';
        feedbackMsg.style.color = 'var(--text)';
      }

      // Reset Action Buttons
      const checkBtn = document.getElementById('btn-spelling-check');
      const nextBtn = document.getElementById('btn-spelling-next');
      if (checkBtn) checkBtn.style.display = 'block';
      if (nextBtn) {
        nextBtn.style.display = 'none';
        nextBtn.className = 'btn btn-success';
        nextBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        nextBtn.style.boxShadow = '0 4px 14px rgba(16,185,129,0.3)';
        nextBtn.innerHTML = 'Từ Tiếp Theo [Enter ↵]';
      }

      // 1. Render Clues
      const defEl = document.getElementById('spelling-clue-def');
      const ipaEl = document.getElementById('spelling-clue-ipa');
      const audioEl = document.getElementById('spelling-clue-audio');

      if (defEl) {
        if (spellingCluesConfig.def) {
          const senseDef = chosenSense.definitionVi || chosenSense.definition || questionWord.definitionVi || questionWord.definition || '';
          const badgeHtml = (senses.length > 1) ? `<span class="badge" style="background: rgba(99,102,241,0.2); color: #818cf8; font-size: 10.5px; margin-right: 6px;">📚 Nghĩa ${senseIdx + 1}/${senses.length}</span>` : '';
          defEl.innerHTML = badgeHtml + escapeHtml(senseDef);
          defEl.style.display = 'block';
        } else {
          defEl.style.display = 'none';
        }
      }

      if (ipaEl) {
        const phoneticText = chosenSense.phonetic || questionWord.phonetic;
        if (spellingCluesConfig.ipa && phoneticText) {
          ipaEl.textContent = phoneticText;
          ipaEl.style.display = 'block';
        } else {
          ipaEl.style.display = 'none';
        }
      }

      if (audioEl) {
        audioEl.style.display = spellingCluesConfig.audio ? 'inline-flex' : 'none';
      }

      // 2. Reset Audio Replay Limits & Render Letter Boxes
      spellingAudioPlaysLeft = getMaxSpellingAudioPlays(currentSpellingDifficulty);
      updateSpellingAudioButtonUI();
      renderSpellingBoxes(questionWord.term, currentSpellingDifficulty);

      // Auto-play audio if audio clue is enabled (not counted towards manual replays)
      if (spellingCluesConfig.audio) {
        setTimeout(() => {
          speakSpellingTerm(false);
        }, 150);
      }
    }

    function renderSpellingBoxes(term, difficulty) {
      const container = document.getElementById('spelling-boxes-container');
      if (!container) return;
      container.innerHTML = '';
      container.className = ''; // remove any shake animation

      if (difficulty === 'extreme') {
        const extremeDiv = document.createElement('div');
        extremeDiv.className = 'spelling-extreme-container';

        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'spelling-extreme-input';
        input.className = 'spelling-extreme-input';
        input.placeholder = 'Nhập đầy đủ từ vựng tại đây...';
        input.autocomplete = 'off';
        input.autocorrect = 'off';
        input.autocapitalize = 'off';
        input.spellcheck = false;
        input.dataset.expected = term;
        input.onkeydown = (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            if (spellingIsAnswered) {
              nextSpellingQuestion();
            } else {
              checkSpellingAnswer();
            }
          }
        };
        input.oninput = () => {
          input.classList.remove('wrong');
        };
        extremeDiv.appendChild(input);
        container.appendChild(extremeDiv);

        setTimeout(() => {
          input.focus();
          input.select();
        }, 80);
        return;
      }

      const chars = Array.from(term);
      const letterIndices = [];

      chars.forEach((c, idx) => {
        if (/[a-zA-Z0-9]/.test(c)) {
          letterIndices.push(idx);
        }
      });

      const totalLetters = letterIndices.length;
      let hideCount = 0;

      if (difficulty === 'hard') {
        hideCount = totalLetters; // 100% hidden
      } else if (difficulty === 'medium') {
        hideCount = Math.max(1, Math.ceil((totalLetters * 2) / 3)); // 2/3 hidden
      } else {
        hideCount = Math.max(1, Math.ceil(totalLetters / 3)); // 1/3 hidden
      }

      // Shuffle letter indices to pick hidden ones randomly
      const shuffledIndices = [...letterIndices].sort(() => Math.random() - 0.5);
      currentSpellingHiddenIndices = new Set(shuffledIndices.slice(0, hideCount));
      currentSpellingRevealedIndices = new Set();

      let firstInputToFocus = null;
      let currentWordBlock = document.createElement('div');
      currentWordBlock.className = 'spelling-word-block';
      container.appendChild(currentWordBlock);

      chars.forEach((c, idx) => {
        if (c === ' ') {
          // End current word block and start new block
          currentWordBlock = document.createElement('div');
          currentWordBlock.className = 'spelling-word-block';
          container.appendChild(currentWordBlock);
        } else if (!/[a-zA-Z0-9]/.test(c)) {
          const symDiv = document.createElement('div');
          symDiv.className = 'spelling-symbol-badge';
          symDiv.textContent = c;
          currentWordBlock.appendChild(symDiv);
          // If hyphen or slash, allow next word to be in its own wrap block
          if (c === '-' || c === '/') {
            currentWordBlock = document.createElement('div');
            currentWordBlock.className = 'spelling-word-block';
            container.appendChild(currentWordBlock);
          }
        } else if (!currentSpellingHiddenIndices.has(idx)) {
          // Pre-filled given letter
          const preInput = document.createElement('input');
          preInput.className = 'spelling-letter-box prefilled';
          preInput.value = c.toUpperCase();
          preInput.disabled = true;
          preInput.dataset.index = idx;
          preInput.dataset.expected = c.toLowerCase();
          currentWordBlock.appendChild(preInput);
        } else {
          // Hidden letter box to be typed
          const input = document.createElement('input');
          input.className = 'spelling-letter-box';
          input.maxLength = 1;
          input.autocomplete = 'off';
          input.autocorrect = 'off';
          input.autocapitalize = 'off';
          input.spellcheck = false;
          input.dataset.index = idx;
          input.dataset.expected = c.toLowerCase();

          input.oninput = (e) => handleSpellingInput(e, idx);
          input.onkeydown = (e) => handleSpellingKeyDown(e, idx);
          input.onfocus = () => input.select();
          input.onclick = () => input.select();

          currentWordBlock.appendChild(input);
          if (!firstInputToFocus) firstInputToFocus = input;
        }
      });

      if (firstInputToFocus) {
        setTimeout(() => {
          firstInputToFocus.focus();
          firstInputToFocus.select();
        }, 80);
      }
    }

    function getEditableSpellingInputs() {
      if (currentSpellingDifficulty === 'extreme') {
        const ext = document.getElementById('spelling-extreme-input');
        return ext ? [ext] : [];
      }
      return Array.from(document.querySelectorAll('#spelling-boxes-container .spelling-letter-box:not(.prefilled)'));
    }

    function focusNextSpellingInput(currentInput) {
      const editables = getEditableSpellingInputs();
      const curPos = editables.indexOf(currentInput);
      if (curPos >= 0 && curPos < editables.length - 1) {
        const next = editables[curPos + 1];
        next.focus();
        next.select();
      }
    }

    function handleSpellingInput(e, idx) {
      if (spellingIsAnswered) return;
      const input = e.target;
      const val = (input.value || '').replace(/\s+/g, '');

      if (val.length > 0) {
        input.value = val[val.length - 1].toUpperCase();
        input.classList.remove('wrong');
        focusNextSpellingInput(input);
      } else {
        input.value = '';
      }
    }

    function handleSpellingKeyDown(e, idx) {
      const input = e.target;
      const editables = getEditableSpellingInputs();
      const curPos = editables.indexOf(input);

      // SPACE KEY: Quick focus to next unfilled or wrong letter box
      if (e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space') {
        e.preventDefault();
        if (spellingIsAnswered) {
          nextSpellingQuestion();
          return;
        }
        const target = editables.find(inp => !inp.value || inp.classList.contains('wrong')) || editables[0];
        if (target) {
          target.focus();
          target.select();
        }
        return;
      }

      if (e.key === 'Backspace') {
        if (!input.value && curPos > 0) {
          e.preventDefault();
          const prev = editables[curPos - 1];
          prev.value = '';
          prev.focus();
          prev.select();
        } else {
          input.value = '';
          input.classList.remove('wrong');
        }
      } else if (e.key === 'ArrowLeft') {
        if (curPos > 0) {
          e.preventDefault();
          editables[curPos - 1].focus();
          editables[curPos - 1].select();
        }
      } else if (e.key === 'ArrowRight') {
        if (curPos < editables.length - 1) {
          e.preventDefault();
          editables[curPos + 1].focus();
          editables[curPos + 1].select();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (spellingIsAnswered) {
          nextSpellingQuestion();
        } else {
          checkSpellingAnswer();
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Direct replacement of existing character without needing Backspace
        input.value = e.key.toUpperCase();
        input.classList.remove('wrong');
        e.preventDefault();
        focusNextSpellingInput(input);
      }
    }

    function checkSpellingAnswer() {
      if (spellingIsAnswered) return;
      const questionWord = spellingList[spellingIndex];
      if (!questionWord) return;

      const boxesContainer = document.getElementById('spelling-boxes-container');
      const feedbackMsg = document.getElementById('spelling-feedback-msg');

      if (currentSpellingDifficulty === 'extreme') {
        const extremeInput = document.getElementById('spelling-extreme-input');
        if (!extremeInput) return;
        const userVal = (extremeInput.value || '').trim();
        const expected = (extremeInput.dataset.expected || '').trim();

        if (!userVal) {
          extremeInput.classList.add('wrong');
          extremeInput.focus();
          showToast('⚠️ Vui lòng nhập từ vựng trước khi kiểm tra!');
          return;
        }

        const isCorrect = userVal.toLowerCase() === expected.toLowerCase();
        const { totalMult } = getSpellingMultipliers();
        const mult = totalMult;

        if (isCorrect) {
          playVocaSfx('correct');
          if (typeof triggerVipMemeReaction === 'function') triggerVipMemeReaction('right');
          spellingIsAnswered = true;
          spellingCorrectCount++;
          if (typeof recordStudyFlowAction === 'function') recordStudyFlowAction('spelling');
          spellingWrongAttemptsForCurrentWord = 0;
          removeWordFromMistakeList(questionWord, false);

          const totalBoxes = expected.length;
          const walletPts = Math.min(22, Math.max(1, Math.round(totalBoxes * 0.7 * mult)));
          spellingScore += walletPts;
          spellingPointsEarned += walletPts;

          const masteryGain = Math.min(10, Math.max(2, Math.round(totalBoxes * 0.28 * mult)));
          const { newScore } = updateWordMasteryScore(questionWord, masteryGain);
          const idx = words.findIndex(w => w.id === questionWord.id);
          if (idx >= 0) {
            words[idx].masteryScore = newScore;
            words[idx].updatedAt = new Date().toISOString();
          }

          // Points accumulated in session (deferred to finish/exit)

          setTimeout(() => {
            speakSpellingTerm(false);
          }, 500);

          document.getElementById('spelling-score').textContent = 'Bài: +' + spellingScore + 'đ';
          updateSpellingWalletPointsDisplay();

          if (feedbackMsg) {
            feedbackMsg.textContent = '🏆 SIÊU ĐỈNH! Viết đúng tuyệt đối (+' + masteryGain + 'đ tinh thông, +' + walletPts + 'đ ví)';
            feedbackMsg.style.color = '#c084fc';
          }

          extremeInput.disabled = true;
          extremeInput.classList.remove('wrong');
          extremeInput.classList.add('correct');
          renderWordDetailsCard('spelling', questionWord);

          const checkBtn = document.getElementById('btn-spelling-check');
          const nextBtn = document.getElementById('btn-spelling-next');
          if (checkBtn) checkBtn.style.display = 'none';
          if (nextBtn) {
            nextBtn.style.display = 'block';
            nextBtn.focus();
          }
        } else {
          playVocaSfx('wrong');
          if (typeof triggerVipMemeReaction === 'function') triggerVipMemeReaction('fail');
          spellingWrongCount++;
          spellingWrongAttemptsForCurrentWord++;
          addWordToMistakeList(questionWord, 'spelling');
          if (!spellingSessionWrongWords.some(w => (w.id && w.id === questionWord.id) || (w.term && w.term.toLowerCase() === questionWord.term.toLowerCase()))) {
            spellingSessionWrongWords.push(questionWord);
          }

          const totalBoxes = expected.length;
          const expectedWalletGain = Math.min(22, Math.max(1, Math.round(totalBoxes * 0.7 * mult)));
          const expectedMasteryGain = Math.min(10, Math.max(2, Math.round(totalBoxes * 0.28 * mult)));

          // Deduct 75% of expected points for that question (Hardcore)
          const walletPenalty = Math.max(1, Math.round(expectedWalletGain * 0.75));
          const masteryPenalty = Math.max(1, Math.round(expectedMasteryGain * 0.75));

          spellingScore -= walletPenalty;
          spellingPointsEarned = Math.max(0, spellingPointsEarned - walletPenalty);

          const { newScore } = updateWordMasteryScore(questionWord, -masteryPenalty);
          const idx = words.findIndex(w => w.id === questionWord.id);
          if (idx >= 0) {
            words[idx].masteryScore = newScore;
            words[idx].updatedAt = new Date().toISOString();
          }

          saveDatabase(true);
          document.getElementById('spelling-score').textContent = 'Bài: ' + (spellingScore >= 0 ? '+' : '') + spellingScore + 'đ';
          updateSpellingWalletPointsDisplay();

          if (boxesContainer) {
            boxesContainer.classList.remove('shake-mild', 'shake-intense');
            void boxesContainer.offsetWidth;
            boxesContainer.classList.add('shake-mild');
          }

          if (feedbackMsg) {
            feedbackMsg.textContent = '❌ Chưa chính xác! Bị trừ -' + masteryPenalty + 'đ tinh thông & -' + walletPenalty + ' VoCoin (75% điểm câu). Hãy thử lại!';
            feedbackMsg.style.color = '#f87171';
          }

          extremeInput.classList.add('wrong');
          extremeInput.focus();
          extremeInput.select();
        }
        return;
      }

      const editables = getEditableSpellingInputs();

      // Check if all editable boxes have been filled
      let hasEmpty = false;
      editables.forEach(input => {
        if (!input.value) {
          hasEmpty = true;
          input.classList.add('wrong');
        }
      });

      if (hasEmpty) {
        showToast('⚠️ Hãy điền đầy đủ các chữ cái còn thiếu!');
        const firstEmpty = editables.find(inp => !inp.value);
        if (firstEmpty) firstEmpty.focus();
        return;
      }

      // Determine combined multiplier (Difficulty * Clue Challenge)
      const { totalMult } = getSpellingMultipliers();
      const mult = totalMult;

      // Check user answers letter by letter
      let wrongCount = 0;
      let firstWrongInput = null;

      editables.forEach(input => {
        const expected = (input.dataset.expected || '').toLowerCase();
        const userChar = (input.value || '').toLowerCase();
        if (userChar === expected) {
          input.classList.remove('wrong');
          input.classList.add('correct');
        } else {
          wrongCount++;
          input.classList.remove('correct');
          input.classList.add('wrong');
          if (!firstWrongInput) firstWrongInput = input;
        }
      });

      if (firstWrongInput) {
        setTimeout(() => {
          firstWrongInput.focus();
          firstWrongInput.select();
        }, 120);
      }

      if (wrongCount === 0) {
        // CORRECT ANSWER (100% CORRECT)!
        playVocaSfx('correct');
        if (typeof triggerVipMemeReaction === 'function') triggerVipMemeReaction('right');
        spellingIsAnswered = true;
        spellingCorrectCount++;
        if (typeof recordStudyFlowAction === 'function') recordStudyFlowAction('spelling');
        removeWordFromMistakeList(questionWord, false);

        // Balanced Point Calculation (v0.0.10.1d):
        // 1. Wallet Points: Full effort reward = Total boxes * multiplier
        const totalBoxes = editables.length;
        const walletPts = Math.ceil(totalBoxes * mult);
        spellingScore += walletPts;
        spellingPointsEarned += walletPts;

        // 2. Mastery Score: Balanced scientific scaling (0.35 * boxes * mult, capped at +12%)
        const masteryGain = Math.min(12, Math.ceil(totalBoxes * 0.35 * mult));

        // Update word mastery score & wallet points
        const { newScore } = updateWordMasteryScore(questionWord, masteryGain);
        const idx = words.findIndex(w => w.id === questionWord.id);
        if (idx >= 0) {
          words[idx].masteryScore = newScore;
          words[idx].updatedAt = new Date().toISOString();
        }

        // Points accumulated in session (deferred to finish/exit)

        // Visual & Natural Google Audio Success: Wait 500ms so correct SFX plays first
        setTimeout(() => {
          speakSpellingTerm();
        }, 500);

        document.getElementById('spelling-score').textContent = 'Bài: +' + spellingScore + 'đ';
        updateSpellingWalletPointsDisplay();

        if (feedbackMsg) {
          feedbackMsg.textContent = '🎉 Tuyệt vời! Chính xác 100% (+' + masteryGain + 'đ tinh thông, +' + walletPts + 'đ ví)';
          feedbackMsg.style.color = '#34d399';
        }

        // Disable all inputs & show detailed word card (v0.0.10.1g)
        editables.forEach(inp => {
          inp.disabled = true;
          inp.classList.add('correct');
        });
        renderWordDetailsCard('spelling', questionWord);

        // Switch Action buttons
        const checkBtn = document.getElementById('btn-spelling-check');
        const nextBtn = document.getElementById('btn-spelling-next');
        if (checkBtn) checkBtn.style.display = 'none';
        if (nextBtn) {
          nextBtn.style.display = 'block';
          nextBtn.focus();
        }
      } else {
        // WRONG ANSWER (1 OR MORE WRONG BOXES)!
        playVocaSfx('wrong');
        if (typeof triggerVipMemeReaction === 'function') triggerVipMemeReaction('fail');
        spellingWrongCount++;
        spellingWrongAttemptsForCurrentWord++;
        addWordToMistakeList(questionWord, 'spelling');
        if (!spellingSessionWrongWords.some(w => (w.id && w.id === questionWord.id) || (w.term && w.term.toLowerCase() === questionWord.term.toLowerCase()))) {
          spellingSessionWrongWords.push(questionWord);
        }

        // Balanced Penalty calculation:
        const walletPenalty = Math.ceil(wrongCount * mult);
        const masteryPenalty = Math.min(8, Math.max(1, Math.ceil(wrongCount * 0.35 * mult)));

        const { newScore } = updateWordMasteryScore(questionWord, -masteryPenalty);
        const idx = words.findIndex(w => w.id === questionWord.id);
        if (idx >= 0) {
          words[idx].masteryScore = newScore;
          words[idx].updatedAt = new Date().toISOString();
        }

        const curPts = getUserPoints();
        if (curPts > 0) setUserPoints(Math.max(0, curPts - walletPenalty));
        saveDatabase(true);
        updateSpellingWalletPointsDisplay();

        // Shake Animation
        if (boxesContainer) {
          boxesContainer.classList.remove('shake-mild', 'shake-intense');
          void boxesContainer.offsetWidth; // trigger reflow
          if (spellingWrongAttemptsForCurrentWord >= 3) {
            boxesContainer.classList.add('shake-intense');
          } else {
            boxesContainer.classList.add('shake-mild');
          }
        }

        if (feedbackMsg) {
          feedbackMsg.textContent = '❌ Có ' + wrongCount + ' ô chưa đúng! (-' + masteryPenalty + 'đ tinh thông, -' + walletPenalty + 'đ ví)';
          feedbackMsg.style.color = '#f87171';
        }

        if (firstWrongInput) {
          firstWrongInput.focus();
          firstWrongInput.select();
        }
      }
    }

    function useSpellingSkip() {
      if (spellingIsAnswered) {
        nextSpellingQuestion();
        return;
      }
      const questionWord = spellingList[spellingIndex];
      if (!questionWord) return;

      const curSkips = getUserSkips();
      const curPts = getUserPoints();
      const skipCost = 100;

      if (curSkips <= 0 && curPts < skipCost) {
        showToast('🪙 Bạn không đủ VoCoin (cần 100 VoCoin để đổi 1 VocaSkip)');
        openShopModal();
        return;
      }

      playVocaSfx('skip');

      if (curSkips > 0) {
        setUserSkips(curSkips - 1);
        showToast('⏭️ Đã dùng 1 VocaSkip miễn phí (còn ' + getUserSkips() + ' lượt).');
      } else {
        setUserPoints(curPts - skipCost);
        showToast('⏭️ Đã dùng 100 VoCoin để đổi 1 VocaSkip.');
      }

      addWordToMistakeList(questionWord, 'spelling');
      if (!spellingSessionWrongWords.some(w => (w.id && w.id === questionWord.id) || (w.term && w.term.toLowerCase() === questionWord.term.toLowerCase()))) {
        spellingSessionWrongWords.push(questionWord);
      }

      spellingIsAnswered = true;
      if (spellingQuestionStartTime) {
        spellingActiveTimeMs += (Date.now() - spellingQuestionStartTime);
        spellingQuestionStartTime = null;
      }
      spellingSkipCount++;
      updateSpellingWalletPointsDisplay();

      // Reveal full word in letter boxes or single input with muted color
      if (currentSpellingDifficulty === 'extreme') {
        const ext = document.getElementById('spelling-extreme-input');
        if (ext) {
          ext.value = questionWord.term;
          ext.disabled = true;
          ext.classList.add('hint-revealed');
        }
      } else {
        const editables = getEditableSpellingInputs();
        editables.forEach(inp => {
          inp.value = (inp.dataset.expected || '').toUpperCase();
          inp.disabled = true;
          inp.classList.remove('wrong');
          inp.classList.add('hint-revealed');
        });
      }

      const feedbackMsg = document.getElementById('spelling-feedback-msg');
      if (feedbackMsg) {
        feedbackMsg.textContent = '⏭️ Đã bỏ qua từ: "' + questionWord.term + '"';
        feedbackMsg.style.color = '#f59e0b';
      }

      // Natural speech with 400ms delay so skip SFX finishes first
      setTimeout(() => {
        speakSpellingTerm();
      }, 400);

      // Show Full Word Details Card so user can learn from this skipped word (v0.0.10.1i)
      if (questionWord) {
        renderWordDetailsCard('spelling', questionWord);
      }

      // Switch action buttons with humble/cay-cu amber-orange style (v0.0.10.1i)
      const checkBtn = document.getElementById('btn-spelling-check');
      const nextBtn = document.getElementById('btn-spelling-next');
      if (checkBtn) checkBtn.style.display = 'none';
      if (nextBtn) {
        nextBtn.className = 'btn btn-warning';
        nextBtn.style.background = 'linear-gradient(135deg, #d97706, #b45309)';
        nextBtn.style.boxShadow = '0 4px 14px rgba(217,119,6,0.35)';
        nextBtn.innerHTML = '⏭️ Bỏ Qua • Từ Tiếp Theo [Enter ↵]';
        nextBtn.style.display = 'block';
        nextBtn.focus();
      }
    }

    function useSpellingHint() {
      if (spellingIsAnswered) return;
      const questionWord = spellingList[spellingIndex];
      if (!questionWord) return;

      if (currentSpellingDifficulty === 'extreme') {
        const ext = document.getElementById('spelling-extreme-input');
        if (!ext) return;
        const curVal = ext.value || '';
        const expected = questionWord.term || '';
        if (curVal.toLowerCase() === expected.toLowerCase()) {
          showToast('💡 Bạn đã nhập đúng toàn vẹn từ vựng!');
          return;
        }

        const hintCost = 50;
        const curHints = getUserHints();
        const curPts = getUserPoints();
        if (curHints <= 0 && curPts < hintCost) {
          showToast('🪙 Bạn không đủ VoCoin (cần 50 VoCoin để đổi 1 Gợi ý)');
          openShopModal();
          return;
        }
        if (curHints > 0) setUserHints(curHints - 1);
        else setUserPoints(curPts - hintCost);

        spellingHintsUsed++;
        updateSpellingWalletPointsDisplay();

        let nextCharIndex = 0;
        while (nextCharIndex < expected.length && nextCharIndex < curVal.length && curVal[nextCharIndex].toLowerCase() === expected[nextCharIndex].toLowerCase()) {
          nextCharIndex++;
        }
        ext.value = expected.slice(0, nextCharIndex + 1);
        ext.focus();
        showToast('💡 Đã mở thêm ký tự: "' + expected[nextCharIndex] + '" (' + (nextCharIndex + 1) + '/' + expected.length + ' ký tự)');
        if (ext.value.toLowerCase() === expected.toLowerCase()) {
          checkSpellingAnswer();
        }
        return;
      }

      const editables = getEditableSpellingInputs().filter(inp => !inp.classList.contains('hint-revealed') && inp.value.toLowerCase() !== (inp.dataset.expected || '').toLowerCase());
      if (editables.length === 0) {
        showToast('💡 Đã mở hết tất cả các ký tự!');
        return;
      }

      // Check hint currency / wallet
      const hintCost = 50;
      const curHints = getUserHints();
      const curPts = getUserPoints();

      if (curHints <= 0 && curPts < hintCost) {
        showToast('🪙 Bạn không đủ VoCoin (cần 50 VoCoin để đổi 1 Gợi ý)');
        openShopModal();
        return;
      }

      if (curHints > 0) {
        setUserHints(curHints - 1);
      } else {
        setUserPoints(curPts - hintCost);
      }

      spellingHintsUsed++;
      updateSpellingWalletPointsDisplay();

      // Pick next unrevealed box
      const targetBox = editables[0];
      const expectedChar = targetBox.dataset.expected || '';
      targetBox.value = expectedChar.toUpperCase();
      targetBox.classList.remove('wrong');
      targetBox.classList.add('hint-revealed');
      targetBox.disabled = true;

      showToast('💡 Đã mở chữ cái: "' + expectedChar.toUpperCase() + '"');

      // Focus next editable
      const remainingEditables = getEditableSpellingInputs().filter(inp => !inp.disabled && !inp.classList.contains('hint-revealed'));
      if (remainingEditables.length > 0) {
        remainingEditables[0].focus();
      } else {
        checkSpellingAnswer();
      }
    }

    function nextSpellingQuestion() {
      if (typeof dismissVipMemeOverlay === 'function') dismissVipMemeOverlay();
      spellingIndex++;
      if (spellingIndex < spellingList.length) {
        loadSpellingQuestion();
      } else {
        finishSpellingMode();
      }
    }

    function finishSpellingMode() {
      if (typeof recordLessonCompleted === 'function') recordLessonCompleted('spelling');
      if (spellingQuestionStartTime) {
        spellingActiveTimeMs += (Date.now() - spellingQuestionStartTime);
        spellingQuestionStartTime = null;
      }

      if (spellingIsCompleted) {
        openModal('modal-spelling-result');
        return;
      }
      spellingIsCompleted = true;

      const totalWords = (spellingList && spellingList.length) ? spellingList.length : (spellingTotalQuestions || 1);
      const totalSessionElapsedSec = Math.max(1, Math.round((Date.now() - (spellingStartTime || Date.now())) / 1000));
      const mins = Math.floor(totalSessionElapsedSec / 60);
      const secs = totalSessionElapsedSec % 60;
      const durationText = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
      const spw = (totalSessionElapsedSec / totalWords).toFixed(1);

      const wrongWordsCount = (spellingSessionWrongWords && spellingSessionWrongWords.length) ? spellingSessionWrongWords.length : 0;
      const correctWordsCount = Math.max(0, totalWords - wrongWordsCount);
      const accuracyPct = Math.round((correctWordsCount / totalWords) * 100);

      if (currentSpellingDifficulty === 'hard' && accuracyPct >= 100 && (spellingWrongCount || 0) === 0 && (spellingHintsUsed || 0) === 0) {
        if (typeof checkAndUnlockAchievement === 'function') checkAndUnlockAchievement('skill_spelling_flawless_insane');
      }
      if (currentSpellingDifficulty === 'hard' && totalWords >= 50 && accuracyPct >= 100 && (spellingWrongCount || 0) === 0) {
        if (typeof checkAndUnlockAchievement === 'function') checkAndUnlockAchievement('skill_perfect_session_50_hard');
      }

      // Auto-publish community milestone
      if (typeof autoPublishCommunityMilestone === 'function') {
        if (totalWords >= 50 && accuracyPct >= 100) {
          autoPublishCommunityMilestone('study_perfect', { mode: 'spelling', total: totalWords, accuracyPct, difficulty: currentSpellingDifficulty, points: spellingPointsEarned });
        } else if (totalWords >= 30) {
          autoPublishCommunityMilestone('study_marathon', { mode: 'spelling', total: totalWords, accuracyPct, difficulty: currentSpellingDifficulty, points: spellingPointsEarned });
        }
      }

      const res = calculateSessionFinalPoints(spellingPointsEarned, totalWords, totalWords, true);
      spellingPointsEarned = res.finalPts;
      if (spellingPointsEarned !== 0) {
        const curDeckTitle = (typeof currentDeck !== 'undefined' && currentDeck?.title) || 'Luyện viết';
        const newBalance = Math.max(0, getUserPoints() + spellingPointsEarned);
        setUserPoints(newBalance);
        addLedgerEntry(spellingPointsEarned > 0 ? 'STUDY' : 'PENALTY_QUIT', spellingPointsEarned, `Hoàn thành Luyện viết "${curDeckTitle}" (${correctWordsCount}/${totalWords} từ, x${res.combinedMult})`, newBalance);
        saveDatabase(true);
      }

      const scoreRatioEl = document.getElementById('spelling-res-score-ratio');
      const pointsEl = document.getElementById('spelling-res-points');
      const durationEl = document.getElementById('spelling-res-duration');
      const spwEl = document.getElementById('spelling-res-spw');
      const hintsEl = document.getElementById('spelling-res-hints');
      const skipsEl = document.getElementById('spelling-res-skips');
      const wrongsEl = document.getElementById('spelling-res-wrongs');
      const badgeIconEl = document.getElementById('spelling-res-badge-icon');
      const titleEl = document.getElementById('spelling-res-title');
      const subtitleEl = document.getElementById('spelling-res-subtitle');
      const diffBadgeEl = document.getElementById('spelling-res-difficulty-badge');

      if (diffBadgeEl) {
        const { diffMult, clueMult, totalMult, diffLabel } = getSpellingMultipliers();
        const diffEmoji = currentSpellingDifficulty === 'hard' ? '🔴' : (currentSpellingDifficulty === 'extreme' ? '🟣' : (currentSpellingDifficulty === 'medium' ? '🟡' : '🟢'));
        diffBadgeEl.textContent = '✍️ Cấp độ: ' + diffEmoji + ' ' + diffLabel + ' (x' + diffMult + ') • Hệ số Tổng: x' + totalMult + ' Điểm';
      }

      if (scoreRatioEl) scoreRatioEl.textContent = correctWordsCount + '/' + totalWords + ' (' + accuracyPct + '%)';
      if (pointsEl) pointsEl.textContent = (spellingPointsEarned >= 0 ? '+' : '') + spellingPointsEarned + ' VoCoin (Quy mô x' + res.deckLengthMult + ')';
      if (durationEl) durationEl.textContent = durationText;
      if (spwEl) spwEl.textContent = spw + 's / từ';
      if (hintsEl) hintsEl.textContent = spellingHintsUsed + ' lượt';
      if (skipsEl) skipsEl.textContent = spellingSkipCount + ' từ';
      if (wrongsEl) wrongsEl.textContent = spellingWrongCount + ' lần';

      // WRONG WORDS RETRY BANNER (v0.10.9-37)
      const wrongBannerEl = document.getElementById('spelling-res-wrong-banner');
      const wrongCountEl = document.getElementById('spelling-res-wrong-count');
      const wrongBtnLabelEl = document.getElementById('spelling-res-wrong-btn-label');
      if (wrongBannerEl) {
        if (spellingSessionWrongWords && spellingSessionWrongWords.length > 0) {
          wrongBannerEl.style.display = 'block';
          if (wrongCountEl) wrongCountEl.textContent = spellingSessionWrongWords.length + ' từ';
          if (wrongBtnLabelEl) wrongBtnLabelEl.textContent = spellingSessionWrongWords.length + ' từ sai';
        } else {
          wrongBannerEl.style.display = 'none';
        }
      }

      if (accuracyPct >= 100) {
        if (badgeIconEl) badgeIconEl.textContent = '🏆';
        if (titleEl) titleEl.textContent = 'Tuyệt Đối Xuất Sắc!';
        if (subtitleEl) subtitleEl.textContent = 'Bạn đã gõ đúng 100% tất cả các từ vựng!';
      } else if (accuracyPct >= 80) {
        if (badgeIconEl) badgeIconEl.textContent = '🌟';
        if (titleEl) titleEl.textContent = 'Quá Đỉnh! Luyện Viết Thành Thạo!';
        if (subtitleEl) subtitleEl.textContent = 'Trí nhớ cơ bắp của bạn về VocaDeck này đang cực kỳ tốt!';
      } else if (accuracyPct >= 50) {
        if (badgeIconEl) badgeIconEl.textContent = '🌿';
        if (titleEl) titleEl.textContent = 'Làm Tốt Lắm!';
        if (subtitleEl) subtitleEl.textContent = 'Hãy tiếp tục rèn luyện để viết chuẩn xác 100% nhé!';
      } else {
        if (badgeIconEl) badgeIconEl.textContent = '💪';
        if (titleEl) titleEl.textContent = 'Cố Lên Nào!';
        if (subtitleEl) subtitleEl.textContent = 'Luyện tập thêm một vài lượt nữa là nhớ sâu từng ký tự ngay!';
      }

      const deckBtn = document.getElementById('btn-spelling-result-deck');
      if (deckBtn) {
        deckBtn.style.display = (studySourceContext === 'review-queue' || !currentDeckId) ? 'none' : 'inline-flex';
      }

      openModal('modal-spelling-result');
      playVocaSfx('fireworks', true);
      if (typeof recordLessonCompleted === 'function') recordLessonCompleted('quiz');

      const intensity = accuracyPct / 100;
      setTimeout(() => {
        launchSpellingFireworks(intensity);
      }, 100);
    }

    function launchSpellingFireworks(intensity) {
      if (typeof intensity !== 'number') intensity = 1.0;
      const canvas = document.getElementById('spelling-fireworks-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = canvas.parentElement.clientWidth || 480;
      canvas.height = canvas.parentElement.clientHeight || 420;

      if (spellingFireworksAnimationId) {
        cancelAnimationFrame(spellingFireworksAnimationId);
        spellingFireworksAnimationId = null;
      }

      const particles = [];
      const colors = ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#38bdf8', '#fbbf24', '#a855f7', '#f43f5e'];
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
          spellingFireworksAnimationId = requestAnimationFrame(animate);
        }
      }

      spellingFireworksAnimationId = requestAnimationFrame(animate);
    }

    function retrySpellingFromModal() {
      closeModal('modal-spelling-result');
      startSpellingMode();
    }

    function exitSpelling() {
      checkAndApplyPendingAppUpdate();
      stopAllAudio();
      const total = spellingTotalQuestions || (spellingList ? spellingList.length : 1);
      const done = Math.min(total, spellingIndex + (spellingIsAnswered ? 1 : 0));

      if (!spellingIsCompleted && (done > 0 || spellingPointsEarned !== 0)) {
        promptStudyEarlyExit({
          mode: 'spelling',
          done,
          total,
          basePoints: spellingPointsEarned,
          onConfirmExit: () => doExecuteExitSpelling(done, total)
        });
        return;
      }
      doExecuteExitSpelling(done, total);
    }

    function doExecuteExitSpelling(done, total) {
      stopAllAudio();
      try {
        // Progressive incomplete session leniency / penalty combined (v0.10.6c / v0.10.9-alpha-23)
        if (!spellingIsCompleted && spellingPointsEarned !== 0) {
          const res = calculateSessionFinalPoints(spellingPointsEarned, done, total, false);
          const finalPts = res.finalPts;

          if (finalPts !== 0) {
            const curDeck = decks.find(d => d.id === currentDeckId);
            const curDeckTitle = curDeck ? curDeck.title : 'Luyện viết';
            const pctText = Math.round((done / total) * 100);
            const newBalance = Math.max(0, getUserPoints() + finalPts);
            setUserPoints(newBalance);
            if (finalPts < 0) {
              showToast(`⚠️ Bỏ dở Luyện viết khi âm điểm (${done}/${total} từ - ${pctText}% • Phạt chia /${res.combinedMult}): Trừ ${finalPts} Xu!`);
              addLedgerEntry('PENALTY_QUIT', finalPts, `Bỏ dở Luyện viết "${curDeckTitle}" khi âm điểm (${done}/${total} từ, phạt /${res.combinedMult})`, newBalance);
            } else {
              const bonusText = res.milestoneBonus > 0 ? ` + Thưởng mốc ${done} từ (+${res.milestoneBonus} Xu)` : '';
              showToast(`🎉 Bỏ dở Luyện viết (${done}/${total} từ - ${pctText}% • Hoàn thành x${res.completionMult}, Độ dài x${res.deckLengthMult}${bonusText}): Nhận +${finalPts} Xu!`);
              addLedgerEntry('STUDY', finalPts, `Học Luyện viết "${curDeckTitle}" (${done}/${total} từ, x${res.combinedMult}${bonusText})`, newBalance);
            }
            saveDatabase(true);
          }
          spellingPointsEarned = finalPts;
        }
      } catch (errPoints) {
        console.warn('Spelling points settlement error:', errPoints);
      }

      try {
        if (studySourceContext === 'review-queue' || !currentDeckId) {
          showScreen('screen-decks');
          refreshActiveScreenData();
        } else {
          openDeckDetail(currentDeckId);
        }
      } catch (errNav) {
        console.warn('Spelling navigation fallback:', errNav);
        showScreen('screen-decks');
        refreshActiveScreenData();
      }
    }

    function exitSpellingToDeck() {
      stopVocaSfx('fireworks');
      checkAndApplyPendingAppUpdate();
      closeModal('modal-spelling-result');
      if (studySourceContext === 'review-queue' || !currentDeckId) {
        showScreen('screen-decks');
        refreshActiveScreenData();
      } else {
        openDeckDetail(currentDeckId);
      }
    }

    function exitSpellingToHome() {
      stopVocaSfx('fireworks');
      checkAndApplyPendingAppUpdate();
      closeModal('modal-spelling-result');
      showScreen('screen-decks');
      refreshActiveScreenData();
    }

    let spellingAudioPlaysLeft = 6;

    function getMaxSpellingAudioPlays(diff) {
      const d = diff || currentSpellingDifficulty || 'easy';
      if (d === 'extreme') return 3;
      if (d === 'hard') return 4;
      if (d === 'medium') return 5;
      return 6; // easy
    }

    function updateSpellingAudioButtonUI() {
      const btn = document.getElementById('spelling-clue-audio');
      if (!btn) return;
      const max = getMaxSpellingAudioPlays(currentSpellingDifficulty);
      if (spellingIsAnswered) {
        btn.innerHTML = `<svg class="icon icon-sm"><use href="#i-volume"/></svg> <span>Nghe lại phát âm</span>`;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        btn.disabled = false;
      } else if (spellingAudioPlaysLeft <= 0) {
        btn.innerHTML = `<svg class="icon icon-sm"><use href="#i-volume"/></svg> <span>Hết lượt nghe (0/${max})</span>`;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
        btn.disabled = true;
      } else {
        btn.innerHTML = `<svg class="icon icon-sm"><use href="#i-volume"/></svg> <span>Nghe lại phát âm (${spellingAudioPlaysLeft}/${max})</span>`;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        btn.disabled = false;
      }
    }

    function speakSpellingTerm(isManual = true) {
      if (!spellingList || spellingList.length === 0) return;
      const questionWord = spellingList[spellingIndex];
      if (!questionWord || !questionWord.term) return;

      const max = getMaxSpellingAudioPlays(currentSpellingDifficulty);
      if (isManual) {
        // When already answered or skipped, allow UNLIMITED listening so user can practice
        if (spellingIsAnswered) {
          speakText(questionWord.term);
          return;
        }

        if (spellingAudioPlaysLeft <= 0) {
          showToast(`⚠️ Bạn đã hết lượt nghe phát âm cho từ này (tối đa ${max} lần ở cấp độ ${getSpellingDifficultyLabel(currentSpellingDifficulty)})!`);
          return;
        }
        spellingAudioPlaysLeft--;
        updateSpellingAudioButtonUI();
      }

      speakText(questionWord.term);

      setTimeout(() => {
        const editables = getEditableSpellingInputs();
        const target = editables.find(inp => !inp.value || inp.classList.contains('wrong')) || editables[0];
        if (target) {
          target.focus();
          target.select();
        }
      }, 60);
    }

    function updateSpellingWalletPointsDisplay() {
      const walletEl = document.getElementById('spelling-wallet-points');
      if (walletEl) walletEl.textContent = getUserPoints() + 'đ';
      const hintsEl = document.getElementById('spelling-hints-count');
      if (hintsEl) hintsEl.textContent = getUserHints() > 0 ? getUserHints() : '50đ';
      const skipsEl = document.getElementById('spelling-skips-count');
      if (skipsEl) skipsEl.textContent = getUserSkips() > 0 ? getUserSkips() : '100đ';
    }

    function playSpellingSound(isCorrect) {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (isCorrect) {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
          osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
          gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.3);
        } else {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
          osc.frequency.setValueAtTime(146.83, audioCtx.currentTime + 0.08); // D3
          gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.25);
        }
      } catch (e) {}
    }

        // AI WORD GENERATION ENGINE (GEMINI AI + FREE DICTIONARY FALLBACK)
    // =========================================================================
    function cleanVietnameseDefinition(def) {
      if (!def || typeof def !== 'string') return '';
      let clean = def.trim();

      // Replace ' hoặc ', ' và ', ' / ', '/', ' | ', '|' with ', '
      clean = clean.replace(/\s+(hoặc|và)\s+/gi, ', ');
      clean = clean.replace(/\s*[\/|]\s*/g, ', ');

      // Remove multiple consecutive commas and spaces
      clean = clean.replace(/\s*,\s*,+\s*/g, ', ');
      clean = clean.replace(/,\s*,/g, ', ');

      // Remove leading / trailing dots, commas, semicolons
      clean = clean.replace(/^[\s.,;:]+|[\s.,;:]+$/g, '');

      return clean.trim();
    }

    let isAiGenerating = false;

    async function handleAiGenerateWord() {
      if (!hasAtLeastOneApiKey()) {
        alert('🔒 Chức năng AI Điền Tự Động yêu cầu kết nối ít nhất 1 Google Gemini API Key để AI có thể tự động phân tích từ vựng, phiên âm và ví dụ.\n\nVui lòng vào Cài Đặt (Settings) để thêm API key!');
        openSettingsModal();
        return;
      }
      if (isAiGenerating) return;
      const termInput = document.getElementById('word-term');
      const rawTerm = (termInput ? termInput.value : '').trim();

      if (!rawTerm) {
        alert('Vui lòng gõ từ vựng tiếng Anh vào ô trước khi bấm AI Điền Tự Động!');
        if (termInput) termInput.focus();
        return;
      }

      // Collect user pre-filled context from active tab
      const activeIdx = (typeof currentActiveSenseTab !== 'undefined') ? currentActiveSenseTab : 0;
      const activePosEl = document.getElementById('word-pos-' + activeIdx) || document.getElementById('word-pos');
      const activePos = (activePosEl ? activePosEl.value : '').trim();
      const activeCefrEl = document.getElementById('word-cefr-' + activeIdx) || document.getElementById('word-cefr');
      const activeCefr = (activeCefrEl ? activeCefrEl.value : '').trim();
      const activeIpaEl = document.getElementById('word-phonetic-' + activeIdx) || document.getElementById('word-phonetic');
      const activeIpa = (activeIpaEl ? activeIpaEl.value : '').trim();
      const activeDefEl = document.getElementById('word-def-' + activeIdx) || document.getElementById('word-def');
      const activeDef = (activeDefEl ? activeDefEl.value : '').trim();
      const activeExampleEl = document.getElementById('word-example-' + activeIdx) || document.getElementById('word-example');
      const activeExample = (activeExampleEl ? activeExampleEl.value : '').trim();
      const activeSynEl = document.getElementById('word-synonyms-' + activeIdx) || document.getElementById('word-synonyms');
      const activeSyn = (activeSynEl ? activeSynEl.value : '').trim();
      const activeAntEl = document.getElementById('word-antonyms-' + activeIdx) || document.getElementById('word-antonyms');
      const activeAnt = (activeAntEl ? activeAntEl.value : '').trim();
      const activeCollEl = document.getElementById('word-collocations-' + activeIdx) || document.getElementById('word-collocations');
      const activeColl = (activeCollEl ? activeCollEl.value : '').trim();
      const activeNoteEl = document.getElementById('word-note-' + activeIdx) || document.getElementById('word-note');
      const activeNote = (activeNoteEl ? activeNoteEl.value : '').trim();

      const userContext = {
        pos: activePos,
        cefrLevel: activeCefr,
        ipa: activeIpa,
        definitionVi: activeDef,
        exampleSentence: activeExample,
        synonyms: activeSyn,
        antonyms: activeAnt,
        collocations: activeColl,
        note: activeNote
      };

      isAiGenerating = true;
      const aiBtn = document.getElementById('btn-ai-generate');
      const aiIcon = document.getElementById('ai-btn-icon');
      const aiText = document.getElementById('ai-btn-text');

      if (aiIcon) aiIcon.textContent = '⏳';
      if (aiText) aiText.textContent = 'Đang tư duy & hoàn thiện...';
      if (aiBtn) aiBtn.disabled = true;

      try {
        let result = null;

        // 1. Try Google Gemini API with user context
        if (geminiApiKey) {
          try {
            result = await fetchWordFromGemini(rawTerm, geminiApiKey, userContext);
          } catch (geminiErr) {
            console.warn('Gemini AI API note, fallback to Dictionary Engine:', geminiErr);
          }
        }

        // 2. Fallback to Free Dictionary API if Gemini unavailable
        if (!result) {
          try {
            result = await fetchWordFromDictionary(rawTerm);
          } catch (dictErr) {
            console.warn('Dictionary fallback note:', dictErr);
          }
        }

        if (result) {
          if (result.term && termInput) termInput.value = result.term;

          // Multi-sense Polysemy / Homograph mapping
          let formattedSenses = [];
          if (Array.isArray(result.senses) && result.senses.length > 0) {
            formattedSenses = result.senses.map(s => ({
              partOfSpeech: s.pos || s.partOfSpeech || 'noun',
              cefrLevel: (s.cefrLevel || s.level || 'B1').toUpperCase(),
              phonetic: s.ipa || s.phonetic || '',
              definitionVi: cleanVietnameseDefinition(s.definition || s.definitionVi || ''),
              exampleSentence: s.example || s.exampleSentence || '',
              synonyms: Array.isArray(s.synonyms) ? s.synonyms : parseList(s.synonyms || ''),
              antonyms: Array.isArray(s.antonyms) ? s.antonyms : parseList(s.antonyms || ''),
              collocations: Array.isArray(s.collocations) ? s.collocations : parseList(s.collocations || ''),
              note: s.note || ''
            }));
          } else {
            formattedSenses = [{
              partOfSpeech: result.pos || 'noun',
              cefrLevel: (result.cefrLevel || 'B1').toUpperCase(),
              phonetic: result.ipa || '',
              definitionVi: cleanVietnameseDefinition(result.definition || ''),
              exampleSentence: result.example || '',
              synonyms: Array.isArray(result.synonyms) ? result.synonyms : parseList(result.synonyms || ''),
              antonyms: Array.isArray(result.antonyms) ? result.antonyms : parseList(result.antonyms || ''),
              collocations: Array.isArray(result.collocations) ? result.collocations : parseList(result.collocations || ''),
              note: result.note || ''
            }];
          }

          currentActiveSenseTab = 0;
          renderWordModalSenses(formattedSenses);
          const sensesCount = formattedSenses.length;
          showToast(`✨ AI đã hoàn thiện ${sensesCount} nét nghĩa cho từ "${result.term || rawTerm}"!`);
        } else {
          alert('Không thể kết nối AI hoặc Từ điển (mạng gián đoạn hoặc chưa có API Key). Bạn vui lòng kiểm tra Cài đặt API Key hoặc nhập thủ công nhé!');
        }
      } catch (err) {
        console.error('AI Generate error:', err);
        alert('Lỗi khi tải thông tin: ' + (err.message || 'Mạng không ổn định'));
      } finally {
        isAiGenerating = false;
        if (aiIcon) aiIcon.textContent = '✨';
        if (aiText) aiText.textContent = 'AI Điền Tự Động';
        if (aiBtn) aiBtn.disabled = false;
      }
    }

    async function fetchWordFromGemini(term, key, userContext = {}) {
      if (!key || !key.trim()) return null;

      let posInstruction = '';
      if (userContext.pos) {
        posInstruction = `\n- NGƯỜI DÙNG ĐÃ CHỦ ĐỘNG CHỌN TỪ LOẠI: "${userContext.pos}". BẮT BUỘC: Tất cả các nét nghĩa bạn tạo ra phải tuân thủ đúng từ loại "${userContext.pos}" này (hoặc nét nghĩa chính phải là từ loại này)!`;
      } else {
        posInstruction = `\n- NGƯỜI DÙNG ĐỂ TỪ LOẠI LÀ "Không" (TỰ ĐỘNG): Bạn hãy tự do nhận diện và tự chọn các từ loại chính xác, tự nhiên nhất cho từng nét nghĩa của từ "${term}" (ví dụ nghĩa 1 là danh từ, nghĩa 2 là động từ, v.v.).`;
      }

      let cefrInstruction = '';
      if (userContext.cefrLevel) {
        cefrInstruction = `\n- NGƯỜI DÙNG ĐÃ CHỦ ĐỘNG CHỌN CẤP ĐỘ CEFR: "${userContext.cefrLevel}". BẮT BUỘC: Bạn hãy ưu tiên gán cấp độ "${userContext.cefrLevel}" cho nét nghĩa phù hợp nhất!`;
      } else {
        cefrInstruction = `\n- NGƯỜI DÙNG ĐỂ CẤP ĐỘ CEFR LÀ "Không" (TỰ ĐỘNG): Bạn hãy tự động phân tích độ khó thực tế của từ "${term}" theo chuẩn Oxford/Cambridge và tự do gán cấp độ CEFR chuẩn xác nhất (A1, A2, B1, B2, C1, hoặc C2) cho từng nét nghĩa riêng biệt. KHÔNG ĐƯỢC mặc định gán B1 cho tất cả nếu từ thuộc cấp độ khác.`;
      }

      let contextNote = '';
      if (userContext.definitionVi) contextNote += `\n- Nghĩa người dùng đã gợi ý: "${userContext.definitionVi}"`;
      if (userContext.exampleSentence) contextNote += `\n- Câu ví dụ người dùng đã viết: "${userContext.exampleSentence}"`;
      if (userContext.synonyms) contextNote += `\n- Từ đồng nghĩa người dùng nhập: "${userContext.synonyms}"`;
      if (userContext.antonyms) contextNote += `\n- Từ trái nghĩa người dùng nhập: "${userContext.antonyms}"`;
      if (userContext.collocations) contextNote += `\n- Collocations người dùng nhập: "${userContext.collocations}"`;
      if (userContext.cefrLevel) contextNote += `\n- Cấp độ CEFR người dùng chọn: "${userContext.cefrLevel}"`;

      const prompt = `Bạn là chuyên gia ngôn ngữ học & biên soạn từ điển Oxford/Cambridge hàng đầu cho Flower Việt Nam.
Hãy phân tích và hoàn thiện trọn vẹn 100% dữ liệu từ điển cho từ vựng tiếng Anh: "${term}".
${posInstruction}
${cefrInstruction}
${contextNote ? `\nThông tin người dùng đã nhập sẵn:\n${contextNote}\n` : ''}
ĐẶC BIỆT LƯU Ý VỀ TỰ ĐỘNG ĐIỀN ĐA NÉT NGHĨA (POLYSEMY & HOMOGRAPHS):
- Tự động phân tích và trả về ĐẦY ĐỦ các nét nghĩa thông dụng và quan trọng nhất của từ "${term}" (thường từ 2 đến 4 nét nghĩa phong phú nếu từ có nhiều nghĩa hoặc nhiều từ loại khác nhau). Flower cần nạp đầy đủ tất cả các nét nghĩa này ngay lập tức vào các tab mà không cần bấm thêm thủ công.
- Chỉ khi từ này thật sự đơn nghĩa, từ ngữ chuyên ngành hẹp chỉ có đúng 1 nghĩa duy nhất thì mới trả về 1 nét nghĩa.
- Sắp xếp các nét nghĩa theo thứ tự độ phổ biến giảm dần (nghĩa quan trọng phổ biến nhất ở vị trí đầu tiên).

YÊU CẦU MỖI NÉT NGHĨA TRONG MẢNG "senses" PHẢI ĐẦY ĐỦ CÁC TRƯỜNG:
1. "pos": "noun", "verb", "adjective", "adverb", "noun phrase", "phrasal verb", "phrase", "idiom", "preposition", "conjunction". (Nếu người dùng đã chỉ định từ loại thì bắt buộc theo từ loại đó).
2. "ipa": Phiên âm chuẩn IPA Oxford/Cambridge kèm dấu gạch chéo /.../ (ví dụ: "/tɪər/").
3. "cefrLevel": "A1", "A2", "B1", "B2", "C1", hoặc "C2".
4. "definition": Nghĩa tiếng Việt cô đọng, tự nhiên (dưới 8 từ), KHÔNG có dấu chấm (.) ở cuối.
5. "example": 1 câu ví dụ tiếng Anh tự nhiên kèm bản dịch tiếng Việt trong ngoặc.
6. "synonyms": Mảng 2-3 từ đồng nghĩa tiếng Anh.
7. "antonyms": Mảng 1-2 từ trái nghĩa tiếng Anh (hoặc rỗng []).
8. "collocations": Mảng 2-3 collocations thường gặp.
9. "note": Mẹo nhớ hoặc ngữ cảnh ngữ pháp.

Trả về DUY NHẤT một chuỗi JSON hợp lệ không có markdown block:
{
  "term": "${term}",
  "senses": [
    {
      "pos": "noun",
      "ipa": "/ipa/",
      "cefrLevel": "B1",
      "definition": "Nghĩa tiếng Việt ngắn gọn",
      "example": "English example (Dịch nghĩa)",
      "synonyms": ["syn1", "syn2"],
      "antonyms": ["ant1"],
      "collocations": ["coll1", "coll2"],
      "note": "Mẹo nhớ"
    }
  ]
}`;

      const cachedWorkingModel = localStorage.getItem('vocaflow_gemini_working_model');
      const standardModels = (typeof GEMINI_STANDARD_MODELS !== 'undefined' && GEMINI_STANDARD_MODELS.length > 0) ? GEMINI_STANDARD_MODELS : ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-pro'];
      const models = (cachedWorkingModel && standardModels.includes(cachedWorkingModel)) ? [cachedWorkingModel, ...standardModels.filter(m => m !== cachedWorkingModel)] : standardModels;

      for (const m of models) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6500);

          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key.trim()}`, {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,
                maxOutputTokens: 1400
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

          if (!res.ok) {
            console.warn(`Model ${m} returned HTTP status ${res.status}`);
            continue;
          }

          const data = await res.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!rawText) continue;

          localStorage.setItem('vocaflow_gemini_working_model', m);
          const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsedData = JSON.parse(cleanJson);
          if (parsedData && parsedData.definition) {
            parsedData.definition = cleanVietnameseDefinition(parsedData.definition);
          }
          return parsedData;
        } catch (err) {
          console.warn(`Model ${m} failed:`, err);
        }
      }
      return null;
    }

    async function fetchWordFromDictionary(term) {
      const clean = encodeURIComponent(term.toLowerCase().trim());
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${clean}`);
      if (!res.ok) return null;

      const list = await res.json();
      if (!list || !list.length) return null;

      const item = list[0];
      let ipa = item.phonetic || '';
      if (!ipa && item.phonetics && item.phonetics.length > 0) {
        const pWithText = item.phonetics.find(p => p.text);
        if (pWithText) ipa = pWithText.text;
      }

      const senses = [];
      if (item.meanings && item.meanings.length > 0) {
        item.meanings.slice(0, 4).forEach(m => {
          const mPos = m.partOfSpeech || 'noun';
          let mDef = '';
          let mEx = '';
          let mSyns = (m.synonyms || []).slice(0, 3);
          let mAnts = (m.antonyms || []).slice(0, 2);
          if (m.definitions && m.definitions.length > 0) {
            const fd = m.definitions[0];
            mDef = fd.definition || '';
            mEx = fd.example || '';
            if (fd.synonyms) mSyns = [...mSyns, ...fd.synonyms].slice(0, 3);
            if (fd.antonyms) mAnts = [...mAnts, ...fd.antonyms].slice(0, 2);
          }
          if (mDef) {
            senses.push({
              pos: mPos,
              ipa: ipa,
              cefrLevel: 'B1',
              definition: `(EN) ${mDef}`,
              example: mEx,
              synonyms: mSyns,
              antonyms: mAnts,
              collocations: []
            });
          }
        });
      }

      if (senses.length === 0) {
        senses.push({
          pos: 'noun',
          ipa: ipa,
          cefrLevel: 'B1',
          definition: '',
          example: '',
          synonyms: [],
          antonyms: [],
          collocations: []
        });
      }

      return {
        term: item.word || term,
        senses: senses,
        pos: senses[0].pos,
        ipa: ipa,
        cefrLevel: 'B1',
        definition: senses[0].definition,
        example: senses[0].example,
        synonyms: senses[0].synonyms,
        antonyms: senses[0].antonyms,
        collocations: []
      };
    }

// duplicate deleteWord permanently removed for v0.0.9.7 tombstone integrity

    // IPA VIRTUAL KEYBOARD
    function toggleIpaKeyboard() {
      const panel = document.getElementById('ipa-keyboard-panel');
      if (panel.style.display === 'none') {
        panel.style.display = 'block';
        renderIpaKeys();
      } else {
        panel.style.display = 'none';
      }
    }

    function switchIpaTab(tab, el) {
      currentIpaTab = tab;
      document.querySelectorAll('.ipa-tab').forEach(t => t.classList.remove('active'));
      el.classList.add('active');
      renderIpaKeys();
    }

    function renderIpaKeys() {
      const container = document.getElementById('ipa-keys-container');
      container.innerHTML = '';
      const list = ipaData[currentIpaTab] || [];

      list.forEach(sym => {
        const btn = document.createElement('div');
        btn.className = 'ipa-key';
        btn.textContent = sym;
        btn.onclick = () => insertIpaSymbol(sym);
        container.appendChild(btn);
      });
    }

    function insertIpaSymbol(sym) {
      const input = document.getElementById('word-phonetic-' + activeIpaSenseIndex) || document.getElementById('word-phonetic');
      if (!input) return;
      const start = input.selectionStart || input.value.length;
      const end = input.selectionEnd || input.value.length;
      const current = input.value;
      input.value = current.substring(0, start) + sym + current.substring(end);
      input.focus();
      input.setSelectionRange(start + sym.length, start + sym.length);
    }

    // Legacy Flashcard JS removed permanently
