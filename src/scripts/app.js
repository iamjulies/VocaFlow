// =========================================================================

// VOCAFLOW APP.JS - CORE LIFECYCLE & GLOBAL BRIDGE ENTRY POINT (v0.10.9-48)

// Screen Switcher, Universal Modal Manager, Keyboard Shortcuts & Bootstrap

// =========================================================================



    // NAVIGATION
    function showScreen(screenId) {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      const target = document.getElementById(screenId);
      if (target) target.classList.add('active');

      const btnAdd = document.getElementById('btn-header-add');
      if (btnAdd) {
        btnAdd.style.display = 'none';
      }

      // v0.10.9-58: SPA URL Routing for Screens
      if (typeof updateAppUrlRoute === 'function') {
        if (screenId === 'screen-decks') {
          updateAppUrlRoute('/', 'VocaFlow - Học Từ Vựng Thông Minh', true);
        } else if (screenId === 'screen-deck-detail' && typeof currentDeckId !== 'undefined' && currentDeckId) {
          updateAppUrlRoute(`/deck/${currentDeckId}`);
        } else if (screenId === 'screen-quiz') {
          updateAppUrlRoute('/study/quiz');
        } else if (screenId === 'screen-spelling') {
          updateAppUrlRoute('/study/spelling');
        } else if (screenId === 'screen-speaking') {
          updateAppUrlRoute('/study/speaking');
        } else if (screenId === 'screen-autofc') {
          updateAppUrlRoute('/study/autofc');
        }
      }

      // v0.10.7g: Anti-Cheat Isolation for AI Study Mentor FAB
      const fab = document.getElementById('btn-ai-mentor-fab');
      if (fab) {
        const isExamScreen = ['screen-quiz', 'screen-spelling', 'screen-speaking', 'screen-autofc'].includes(screenId);
        fab.style.display = isExamScreen ? 'none' : 'flex';
      }

      // v0.10.9-alpha-12: Context-aware ads (suppress vignette during study screens)
      if (typeof initMonetagPassiveAds === 'function') {
        initMonetagPassiveAds();
      }
    }




    // MODAL CONTROL
    function openModal(id) {
      const el = document.getElementById(id);
      if (el) el.classList.add('active');
      if (id === 'modal-ai-mentor' || id === 'modal-ai-deck-studio') {
        if (typeof initMonetagPassiveAds === 'function') initMonetagPassiveAds();
      }

      // v0.10.9-55: SPA URL Routing on modal open
      if (typeof updateAppUrlRoute === 'function') {
        const modalRouteMap = {
          'modal-profile': '/me/mydeck',
          'modal-shop': '/shop',
          'modal-vip-pricing': '/vocavip',
          'modal-flow-calendar': '/flowstreak',
          'modal-notifications': '/notifications',
          'modal-referral': '/invite',
          'modal-bug-report': '/report',
          'modal-vocamail': '/vocamail',
          'modal-library': '/vocalib',
          'modal-ai-deck-studio': '/vocadeckai',
          'modal-review-queue': '/queue',
          'modal-rewarded-ad': '/ads',
          'modal-publisher': '/admin',
          'modal-ai-mentor': '/mentor',
          'modal-wallet-studio': '/wallet',
          'modal-mistake-notebook': '/mistakes',
          'modal-lucky-wheel': '/wheel',
          'modal-settings': '/settings',
          'modal-achievements': '/achievements',
          'modal-user-guide': '/guide'
        };
        if (modalRouteMap[id]) {
          updateAppUrlRoute(modalRouteMap[id]);
        }
      }
    }
    function closeModal(id) {
      const el = document.getElementById(id);
      if (el) el.classList.remove('active');
      if (id === 'modal-ai-mentor' || id === 'modal-ai-deck-studio') {
        if (typeof initMonetagPassiveAds === 'function') initMonetagPassiveAds();
      }
      if (id === 'modal-rewarded-ad') {
        if (typeof stopRewardedAdCycle === 'function') stopRewardedAdCycle();
      }
      if (typeof cleanForeignClickBlockers === 'function') cleanForeignClickBlockers();
      if (id === 'modal-quiz-result' || id === 'modal-spelling-result') {
        stopVocaSfx('fireworks');
      }
      if (id === 'modal-library-preview' && parentModalBeforePreview) {
        const parentToRestore = parentModalBeforePreview;
        parentModalBeforePreview = null;
        openModal(parentToRestore);
      }
      if (id === 'modal-user-guide') {
        guideReturnContext = null;
      } else if (typeof guideReturnContext !== 'undefined' && guideReturnContext && guideReturnContext.targetModalId === id) {
        const ctx = guideReturnContext;
        guideReturnContext = null;
        setTimeout(() => {
          if (typeof openUserGuideModal === 'function') {
            openUserGuideModal(ctx.category, ctx.starterStep, ctx.scrollTop);
          }
        }, 60);
      }

      // v0.10.9-55: Restore active screen route if no other modal is active
      if (typeof updateAppUrlRoute === 'function') {
        const anyActiveModal = document.querySelector('.modal-overlay.active');
        if (!anyActiveModal) {
          const activeScreen = document.querySelector('.screen.active');
          if (activeScreen && activeScreen.id === 'screen-deck-detail' && typeof currentDeckId !== 'undefined' && currentDeckId) {
            updateAppUrlRoute(`/deck/${currentDeckId}`);
          } else if (activeScreen && activeScreen.id === 'screen-quiz') {
            updateAppUrlRoute('/study/quiz');
          } else if (activeScreen && activeScreen.id === 'screen-spelling') {
            updateAppUrlRoute('/study/spelling');
          } else if (activeScreen && activeScreen.id === 'screen-speaking') {
            updateAppUrlRoute('/study/speaking');
          } else if (activeScreen && activeScreen.id === 'screen-autofc') {
            updateAppUrlRoute('/study/autofc');
          } else {
            updateAppUrlRoute('/', 'VocaFlow - Học Từ Vựng Thông Minh', true);
          }
        }
      }
    }




    // =========================================================================
    // GLOBAL KEYBOARD SHORTCUTS & ESCAPE ENGINE (v0.0.10.3i UPDATE)
    // =========================================================================
    window.addEventListener('keydown', (e) => {
      // UNIVERSAL ESC KEY HANDLER: Closes modals, exits study modes & screens
      if (e.key === 'Escape' || e.code === 'Escape') {
        const activeModals = Array.from(document.querySelectorAll('.modal-overlay.active'));
        if (activeModals.length > 0) {
          e.preventDefault();
          const topModal = activeModals[activeModals.length - 1];
          if (topModal.id === 'modal-study-exit-confirm') {
            cancelStudyEarlyExit();
            return;
          }
          if (topModal.id === 'modal-quiz-result') {
            exitQuizToDeck();
            return;
          }
          if (topModal.id === 'modal-spelling-result') {
            exitSpellingToDeck();
            return;
          }
          if (topModal.id === 'modal-speaking-result') {
            closeSpeakingResultModal();
            return;
          }
          closeModal(topModal.id);
          return;
        }

        const autoFcScreen = document.getElementById('screen-autofc');
        if (autoFcScreen && autoFcScreen.classList.contains('active')) {
          e.preventDefault();
          exitAutoFlashcard();
          return;
        }

        const quizScreen = document.getElementById('screen-quiz');
        if (quizScreen && quizScreen.classList.contains('active')) {
          e.preventDefault();
          exitQuiz();
          return;
        }

        const speakingScreen = document.getElementById('screen-speaking');
        if (speakingScreen && speakingScreen.classList.contains('active')) {
          e.preventDefault();
          exitSpeakingMode();
          return;
        }

        const spellingScreen = document.getElementById('screen-spelling');
        if (spellingScreen && spellingScreen.classList.contains('active')) {
          e.preventDefault();
          exitSpelling();
          return;
        }

        const deckDetailScreen = document.getElementById('screen-deck-detail');
        if (deckDetailScreen && deckDetailScreen.classList.contains('active')) {
          e.preventDefault();
          showScreen('screen-decks');
          return;
        }

        const currentActiveScreen = document.querySelector('.screen.active');
        if (currentActiveScreen && currentActiveScreen.id !== 'screen-decks') {
          e.preventDefault();
          showScreen('screen-decks');
          return;
        }
      }

      // 0. SPEAKING SCREEN SHORTCUTS (v0.10.6c - Phím tắt toàn diện)
      const spkScreen = document.getElementById('screen-speaking');
      if (spkScreen && spkScreen.classList.contains('active')) {
        if (isEvaluatingSpeaking) return;
        if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          if (speakingFlowState === 'evaluated') {
            retrySpeakingFromBadge();
          } else {
            toggleSpeakingRecord();
          }
          return;
        }
        if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          toggleSpeakingRecord();
          return;
        }
        if (e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          if (speakingAudioBlobUrl) {
            playSpeakingUserAudio();
          } else {
            speakCurrentSpeakingWord();
          }
          return;
        }
        if (e.key === 'l' || e.key === 'L') {
          e.preventDefault();
          speakCurrentSpeakingWord();
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (speakingFlowState === 'recorded_ready') {
            submitSpeakingEvaluation();
          } else if (speakingFlowState === 'evaluated') {
            nextSpeakingWord();
          } else if (speakingFlowState === 'recording') {
            stopSpeakingRecord();
          } else {
            nextSpeakingWord();
          }
          return;
        }
        if (e.key === 'ArrowRight' || e.code === 'ArrowRight') {
          e.preventDefault();
          nextSpeakingWord();
          return;
        }
        if (e.key === 'ArrowLeft' || e.code === 'ArrowLeft') {
          e.preventDefault();
          prevSpeakingWord();
          return;
        }
      }

      // Ignore standard shortcuts if user is actively typing in form inputs (unless in spelling boxes)
      const isSpellingBox = e.target && e.target.classList && e.target.classList.contains('spelling-letter-box');
      if (!isSpellingBox && (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable)) {
        return;
      }
      // Ignore shortcuts if any modal is open
      const openModal = document.querySelector('.modal-overlay.active:not(#modal-quiz-result)');
      if (openModal) {
        return;
      }

      // 1. AUTO FLASHCARD SCREEN SHORTCUTS
      const autoFcScreen = document.getElementById('screen-autofc');
      if (autoFcScreen && autoFcScreen.classList.contains('active')) {
        if (e.code === 'Space') {
          e.preventDefault();
          toggleAutoFlashcardPlayPause();
        } else if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          nextAutoFlashcard();
        } else if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          prevAutoFlashcard();
        } else if (e.key === 'Enter') {
          if (!isAutoPlaying) {
            e.preventDefault();
            handleAutoCardManualFlip();
          }
        }
        return;
      }

      // 2. SPELLING SCREEN SHORTCUTS (v0.0.10.3j)
      const spellingScreen = document.getElementById('screen-spelling');
      if (spellingScreen && spellingScreen.classList.contains('active')) {
        if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          if (spellingIsAnswered) {
            nextSpellingQuestion();
          } else {
            const editables = getEditableSpellingInputs();
            const target = editables.find(inp => !inp.value || inp.classList.contains('wrong')) || editables[0];
            if (target) {
              target.focus();
              target.select();
            }
          }
          return;
        }

        if (e.key === 'Enter') {
          if (e.target && e.target.classList && e.target.classList.contains('spelling-letter-box')) {
            return; // Handled locally inside handleSpellingKeyDown
          }
          const nextBtn = document.getElementById('btn-spelling-next');
          const checkBtn = document.getElementById('btn-spelling-check');
          e.preventDefault();
          if (nextBtn && nextBtn.style.display !== 'none') {
            nextSpellingQuestion();
          } else if (checkBtn && checkBtn.style.display !== 'none') {
            checkSpellingAnswer();
          }
        }
        return;
      }

      // 3. QUIZ SCREEN SHORTCUTS
      const quizScreen = document.getElementById('screen-quiz');
      if (quizScreen && quizScreen.classList.contains('active')) {
        if (!quizIsAnswered) {
          if (['1', '2', '3', '4'].includes(e.key)) {
            e.preventDefault();
            const idx = parseInt(e.key, 10) - 1;
            const options = document.querySelectorAll('#quiz-options-container .quiz-option');
            if (options && options[idx] && !options[idx].disabled) {
              options[idx].click();
            }
          }
        } else {
          // When question is answered, Enter or Space advances to next question
          if (e.key === 'Enter' || e.code === 'Space') {
            const nextContainer = document.getElementById('quiz-next-container');
            if (nextContainer && nextContainer.style.display !== 'none') {
              e.preventDefault();
              nextQuizQuestion();
            }
          }
        }
        return;
      }

      // (Legacy manual flashcard shortcuts removed)
    });



  // Horizontal mouse-wheel scroll for guide tabs nav on PC
  window.addEventListener('DOMContentLoaded', () => {
    const verLabel = document.getElementById('settings-app-version-label');
    if (verLabel) verLabel.textContent = VOCAFLOW_APP_FULL_TITLE;
    if (typeof autoHealVipRegression === 'function') autoHealVipRegression();
    if (typeof autoHealExcessVipSpinsToday === 'function') autoHealExcessVipSpinsToday();
    if (typeof healErroneousFreezeDeduction === 'function') healErroneousFreezeDeduction();
    if (typeof updateMistakeBadgeUI === 'function') updateMistakeBadgeUI();
    if (typeof initSpaRouter === 'function') {
      initSpaRouter();
    } else {
      checkUrlProfileDeepLink();
    }
  });
