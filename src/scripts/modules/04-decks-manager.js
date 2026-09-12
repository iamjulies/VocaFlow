// =========================================================================

// VOCAFLOW 04-DECKS-MANAGER.JS (v0.10.9-48)

// CRUD VocaDeck, Word Card Modal, Excel/JSON Import/Export, SRS & Auto-Flashcards

// =========================================================================

    // =========================================================================
    // STUDY SHUFFLE MODE ENGINE (v0.0.8)
    // =========================================================================
    let isStudyShuffle = localStorage.getItem('vocaflow_study_shuffle') === 'true';

    function toggleStudyShuffle() {
      isStudyShuffle = !isStudyShuffle;
      localStorage.setItem('vocaflow_study_shuffle', isStudyShuffle ? 'true' : 'false');
      updateStudyShuffleUI();
      showToast(isStudyShuffle ? '🔀 Đã BẬT Trộn ngẫu nhiên (Flashcard, Auto FC, Quiz)!' : '➡️ Đã TẮT Trộn ngẫu nhiên (Học theo thứ tự gốc).');
    }

    function updateStudyShuffleUI() {
      const btn = document.getElementById('btn-toggle-study-shuffle');
      if (btn) {
        if (isStudyShuffle) {
          btn.classList.add('active');
          btn.style.background = 'linear-gradient(135deg, #8b5cf6, #ec4899)';
          btn.style.color = '#ffffff';
          btn.style.borderColor = 'transparent';
          btn.title = 'Trộn Ngẫu Nhiên: ĐANG BẬT (Click để tắt)';
        } else {
          btn.classList.remove('active');
          btn.style.background = 'transparent';
          btn.style.color = 'var(--text-muted)';
          btn.style.borderColor = 'var(--border)';
          btn.title = 'Trộn Ngẫu Nhiên: ĐANG TẮT (Click để bật)';
        }
      }
    }

    // Initialization
    window.addEventListener('focus', () => {
      if (typeof cleanForeignClickBlockers === 'function') cleanForeignClickBlockers();
    });
    window.addEventListener('DOMContentLoaded', () => {
      if (typeof cleanForeignClickBlockers === 'function') cleanForeignClickBlockers();
      loadAuthState();
      loadDatabase();
      runEconomyMigrationV0104i();
      runLegacyDataMigrationV0107b();
      initTheme();
      updateEconomyUI();
      updateStudyShuffleUI();
      updateSyncStatusUI(navigator.onLine ? 'online' : 'offline');
      if (decks.length === 0) {
        seedSampleData();
      }
      renderDecks();
      // Pre-warm SpeechSynthesis natural voice engine
      if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
      // Auto-trigger sync on load if logged in
      updateNotificationsUI();
      updateAiChatQuotaUI();
      if (typeof initMonetagPassiveAds === 'function') initMonetagPassiveAds();
      if (currentUser && currentUser.uid) {
        if (!Array.isArray(decks) || decks.length === 0 || (decks.length === 1 && decks[0].id === 'deck-oxford-starter') || decks.some(d => words.filter(w => w && w.deckId === d.id).length === 0)) {
          autoRecoverLostDecks(false).catch(() => {});
        }
        handleManualSync();
        loadEconomyFromCloud();
        syncFollowStateWithCloud();
        syncNotificationsWithCloud();
        startPeriodicBidirectionalSync();
      }
      // Pre-fetch cloud library in background so author profiles are always ready (v0.10.6c)
      fetchCloudLibraryDecks().catch(() => {});
    });

    function loadAuthState() {
      try {
        const savedAuth = localStorage.getItem(STORAGE_KEY_AUTH);
        if (savedAuth) {
          currentUser = JSON.parse(savedAuth);
        }
      } catch (e) {
        console.error('Error loading auth state:', e);
      }
      if (currentUser && currentUser.uid) {
        ensureUserHandleAssigned(currentUser);
      }
      updateAuthUI();
      updateEconomyUI();
      initGlobalVipRegistry();
      if (typeof updateShopBonusesUI === 'function') updateShopBonusesUI();

      // Proactively fetch latest profile from Cloud in background
      if (currentUser && currentUser.uid && !currentUser.uid.startsWith('guest_') && firebaseConfig.databaseURL) {
        const authParam = (currentUser && currentUser.idToken) ? '?auth=' + currentUser.idToken : '';
        fetch(`${firebaseConfig.databaseURL}/users/${currentUser.uid}.json${authParam}`)
          .then(res => res.ok ? res.json() : null)
          .then(uData => {
            if (uData && typeof uData === 'object' && currentUser) {
              const prof = uData.profile || {};
              let changed = false;
              if (prof.displayName && prof.displayName !== currentUser.displayName) {
                currentUser.displayName = prof.displayName;
                changed = true;
              }
              const remoteUsername = prof.username || uData.username;
              const remoteLastChange = (prof.lastUsernameChangeTimestamp !== undefined) ? prof.lastUsernameChangeTimestamp : uData.lastUsernameChangeTimestamp;
              if (remoteUsername && remoteUsername.trim().length >= 3 && remoteUsername !== currentUser.username) {
                currentUser.username = remoteUsername.trim().toLowerCase();
                changed = true;
              }
              if (remoteLastChange !== undefined && Number(remoteLastChange) !== currentUser.lastUsernameChangeTimestamp) {
                currentUser.lastUsernameChangeTimestamp = Number(remoteLastChange);
                changed = true;
              }
              const remoteBio = (prof.bio !== undefined) ? prof.bio : uData.bio;
              if (remoteBio !== undefined && remoteBio !== currentUser.bio) {
                currentUser.bio = remoteBio;
                changed = true;
              }
              const remoteAv = prof.avatar || uData.avatar;
              if (remoteAv && remoteAv !== currentUser.avatar) {
                currentUser.avatar = remoteAv;
                changed = true;
              }
              // Sync VIP status from Cloud on startup (v0.10.8-alpha-10.3 / v0.10.9-alpha-6)
              if (prof.isVip !== undefined || uData.isVip !== undefined || uData.vip !== undefined) {
                const rawRemoteIsVip = (prof.isVip !== undefined) ? !!prof.isVip : (uData.isVip !== undefined ? !!uData.isVip : (uData.vip && !!uData.vip.isVip));
                const remoteTier = prof.vipTier || uData.vipTier || (uData.vip && uData.vip.tier) || 'none';
                const remoteExpires = Number(prof.vipExpiresAt || uData.vipExpiresAt || (uData.vip && uData.vip.expiresAt) || 0);
                const isRemoteActive = rawRemoteIsVip && (remoteTier === 'lifetime' || remoteExpires > Date.now());

                const finalIsVip = isRemoteActive;
                const finalTier = isRemoteActive ? remoteTier : 'none';
                const finalExpires = isRemoteActive ? remoteExpires : 0;

                if (finalIsVip !== userIsVip || finalTier !== userVipTier || finalExpires !== userVipExpiresAt) {
                  userIsVip = finalIsVip;
                  userVipTier = finalTier;
                  userVipExpiresAt = finalExpires;
                  localStorage.setItem('vocaflow_user_is_vip', userIsVip ? 'true' : 'false');
                  localStorage.setItem('vocaflow_user_vip_tier', userVipTier);
                  localStorage.setItem('vocaflow_user_vip_expires_at', userVipExpiresAt.toString());
                  if (!userIsVip) {
                    localStorage.removeItem(STORAGE_KEY_VIP_HIGH_WATER);
                  }
                  if (currentUser) {
                    currentUser.isVip = userIsVip;
                    currentUser.vipTier = userVipTier;
                    currentUser.vipExpiresAt = userVipExpiresAt;
                  }
                  changed = true;
                }
              }

              // Sync Achievements & Pinned Badges from Cloud (v0.10.8-alpha-10.3)
              if (uData.achievements && typeof uData.achievements === 'object') {
                Object.keys(uData.achievements).forEach(k => {
                  const r = uData.achievements[k];
                  if (r) {
                    if (!userAchievements[k]) {
                      userAchievements[k] = { ...r };
                    } else {
                      userAchievements[k].unlocked = userAchievements[k].unlocked || !!r.unlocked;
                      userAchievements[k].claimedReward = userAchievements[k].claimedReward || !!r.claimedReward;
                      userAchievements[k].progress = Math.max(userAchievements[k].progress || 0, r.progress || 0);
                      if (r.unlockedAt && !userAchievements[k].unlockedAt) userAchievements[k].unlockedAt = r.unlockedAt;
                      if (r.claimedAt && !userAchievements[k].claimedAt) userAchievements[k].claimedAt = r.claimedAt;
                    }
                  }
                });
                localStorage.setItem('vocaflow_user_achievements', JSON.stringify(userAchievements));
                renderAchievementsList();
              }

              if (Array.isArray(uData.pinnedBadges)) {
                userPinnedBadges = [...uData.pinnedBadges].slice(0, 3);
                localStorage.setItem('vocaflow_pinned_badges', JSON.stringify(userPinnedBadges));
                renderProfilePinnedBadges();
              } else if (prof && Array.isArray(prof.pinnedBadges)) {
                userPinnedBadges = [...prof.pinnedBadges].slice(0, 3);
                localStorage.setItem('vocaflow_pinned_badges', JSON.stringify(userPinnedBadges));
                renderProfilePinnedBadges();
              }

              if (uData.economy && typeof uData.economy === 'object') {
                const pts = typeof uData.economy.points === 'number' ? uData.economy.points : parseInt(uData.economy.points, 10);
                if (!isNaN(pts)) {
                  localStorage.setItem(STORAGE_KEY_USER_POINTS, pts.toString());
                  updateEconomyUI();
                }
                const remoteLuckySpins = typeof uData.economy.luckySpins === 'number' ? uData.economy.luckySpins : parseInt(uData.economy.luckySpins, 10);
                if (!isNaN(remoteLuckySpins)) {
                  const localEcoTime = parseInt(localStorage.getItem(STORAGE_KEY_ECONOMY_TIME) || '0', 10);
                  const remoteEcoTime = uData.economy.updatedAt ? new Date(uData.economy.updatedAt).getTime() : 0;
                  if (localEcoTime > remoteEcoTime && (Date.now() - localEcoTime < 300000)) {
                    // Local economy was updated recently (e.g. user spun), protect local spins
                  } else {
                    localStorage.setItem('vocaflow_lucky_spins_left', Math.max(0, remoteLuckySpins).toString());
                  }
                }
                if (uData.economy.luckySpinsDate) {
                  localStorage.setItem('vocaflow_last_spin_date', uData.economy.luckySpinsDate);
                }
                if (uData.economy.lastVipSpinDate) {
                  const localVipDate = localStorage.getItem('vocaflow_last_vip_spin_date') || '';
                  if (!localVipDate || localVipDate < uData.economy.lastVipSpinDate) {
                    localStorage.setItem('vocaflow_last_vip_spin_date', uData.economy.lastVipSpinDate);
                  }
                }
                if (typeof updateLuckyWheelUI === 'function') updateLuckyWheelUI();
                if (typeof updateShopBonusesUI === 'function') updateShopBonusesUI();
              } else if (uData.points !== undefined) {
                const pts = typeof uData.points === 'number' ? uData.points : parseInt(uData.points, 10);
                if (!isNaN(pts)) {
                  localStorage.setItem(STORAGE_KEY_USER_POINTS, pts.toString());
                  updateEconomyUI();
                }
              }
              if (uData.lucky_spins_left !== undefined && (!uData.economy || uData.economy.luckySpins === undefined)) {
                const sps = parseInt(uData.lucky_spins_left, 10);
                if (!isNaN(sps)) {
                  const localEcoTime = parseInt(localStorage.getItem(STORAGE_KEY_ECONOMY_TIME) || '0', 10);
                  if (localEcoTime === 0 || Date.now() - localEcoTime > 300000) {
                    localStorage.setItem('vocaflow_lucky_spins_left', Math.max(0, sps).toString());
                  }
                  if (typeof updateLuckyWheelUI === 'function') updateLuckyWheelUI();
                  if (typeof updateShopBonusesUI === 'function') updateShopBonusesUI();
                }
              }
              if (typeof autoHealExcessVipSpinsToday === 'function') {
                autoHealExcessVipSpinsToday();
              }

              // Sync Flow from Cloud on Startup (v0.10.8-alpha-10.15 - Bidirectional Union Merge)
              const remoteStartupFlowDates = Array.isArray(uData.flowDates) 
                ? uData.flowDates 
                : ((uData.flow && Array.isArray(uData.flow.dates)) 
                  ? uData.flow.dates 
                  : (Array.isArray(uData.studyDates) ? uData.studyDates : []));

              if (remoteStartupFlowDates && remoteStartupFlowDates.length > 0) {
                let localFlowDates = getFlowDates();
                const unionSet = new Set([...localFlowDates, ...remoteStartupFlowDates]);
                const mergedFlowDates = Array.from(unionSet).sort();
                localStorage.setItem('vocaflow_flow_dates', JSON.stringify(mergedFlowDates));
                localStorage.setItem('vocaflow_study_dates', JSON.stringify(mergedFlowDates));
              }

              const remoteStartupFreezeDates = Array.isArray(uData.flowFreezeDates)
                ? uData.flowFreezeDates
                : ((uData.flow && Array.isArray(uData.flow.freezeDates))
                  ? uData.flow.freezeDates
                  : (Array.isArray(uData.streakFreezeHistory) ? uData.streakFreezeHistory : []));

              const localFreezeDates = getFlowFreezeDates();
              const unionFreezeSet = new Set([...localFreezeDates, ...remoteStartupFreezeDates]);
              const mergedFreezeDates = Array.from(unionFreezeSet).sort();
              if (mergedFreezeDates.length > 0) {
                localStorage.setItem('vocaflow_flow_freeze_dates', JSON.stringify(mergedFreezeDates));
                localStorage.setItem('vocaflow_streak_freeze_history', JSON.stringify(mergedFreezeDates));
              }

              const remoteStartupFreezes = (uData.flowFreezes !== undefined)
                ? parseInt(uData.flowFreezes, 10)
                : ((uData.flow && uData.flow.freezes !== undefined)
                  ? parseInt(uData.flow.freezes, 10)
                  : ((uData.economy && uData.economy.flowFreezes !== undefined)
                    ? parseInt(uData.economy.flowFreezes, 10)
                    : (uData.streakFreezes !== undefined ? parseInt(uData.streakFreezes, 10) : NaN)));

              if (!isNaN(remoteStartupFreezes)) {
                const localFreezes = getUserFlowFreezes();
                const maxCap = getMaxFlowFreezes();
                let syncedFreezes = localFreezes;
                const localSet = new Set(localFreezeDates);
                const remoteSet = new Set(remoteStartupFreezeDates);
                const newFromRemote = remoteStartupFreezeDates.filter(d => !localSet.has(d)).length;
                const newFromLocal = localFreezeDates.filter(d => !remoteSet.has(d)).length;

                if (remoteStartupFreezeDates.length === 0 && localFreezeDates.length > 0) {
                  syncedFreezes = Math.max(localFreezes, remoteStartupFreezes);
                } else {
                  const adjustedRemote = Math.max(0, remoteStartupFreezes - newFromLocal);
                  const adjustedLocal = Math.max(0, localFreezes - newFromRemote);
                  syncedFreezes = Math.max(adjustedLocal, adjustedRemote);
                }
                syncedFreezes = Math.min(maxCap, Math.max(0, syncedFreezes));

                localStorage.setItem('vocaflow_flow_freezes', syncedFreezes.toString());
                localStorage.setItem('vocaflow_streak_freezes', syncedFreezes.toString());
              }

              updateFlowUI();
              if (typeof renderFlowCalendar === 'function') renderFlowCalendar();

              if (typeof checkAndGrantVipDailySpinBonus === 'function') {
                checkAndGrantVipDailySpinBonus();
              }
              updateLuckyWheelUI();
              updateShopBonusesUI();

              if (changed) {
                localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(currentUser));
                updateAuthUI();
                renderLibraryDecks();
              }
            }
          })
          .catch(() => {});
      }
    }


    // =========================================================================
    // MULTI-SELECTION, MULTI-TIER MASTERY & SLIDER FILTER ENGINE (v0.0.8.10)
    // =========================================================================
    let selectedWordIds = new Set();
    let customMinScore = 0;
    let customMaxScore = 100;

    function setWordPosFilter(val) {
      currentPosFilter = val || 'all';
      renderWordList();
      updateSelectionUI();
    }

    function setWordCefrFilter(val) {
      currentCefrFilter = val || 'all';
      renderWordList();
      updateSelectionUI();
    }

    function getWordScore(w) {
      if (!w) return 0;
      if (typeof w.masteryScore === 'number') return w.masteryScore;
      if (w.status === 'mastered') return 100;
      if (w.status === 'learning') return 40;
      return 0;
    }

    function getWordMasteryInfo(score) {
      if (score >= 100) {
        return {
          label: '👑 Đã thuộc (100%)',
          shortLabel: '100% Đã thuộc',
          tier: 'mastered',
          badgeStyle: 'background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.35);',
          trackColor: '#10b981'
        };
      }
      if (score >= 76) {
        return {
          label: '⭐ Sắp thuộc (' + score + '%)',
          shortLabel: score + '% Sắp thuộc',
          tier: 'tier4',
          badgeStyle: 'background: rgba(139, 92, 246, 0.15); color: #c084fc; border: 1px solid rgba(139, 92, 246, 0.35);',
          trackColor: '#8b5cf6'
        };
      }
      if (score >= 51) {
        return {
          label: '🌳 Khá thuộc (' + score + '%)',
          shortLabel: score + '% Khá thuộc',
          tier: 'tier3',
          badgeStyle: 'background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.35);',
          trackColor: '#3b82f6'
        };
      }
      if (score >= 26) {
        return {
          label: '🌿 Hơi thuộc (' + score + '%)',
          shortLabel: score + '% Hơi thuộc',
          tier: 'tier2',
          badgeStyle: 'background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.35);',
          trackColor: '#f59e0b'
        };
      }
      if (score >= 1) {
        return {
          label: '🐣 Vừa học (' + score + '%)',
          shortLabel: score + '% Vừa học',
          tier: 'tier1',
          badgeStyle: 'background: rgba(6, 182, 212, 0.15); color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.35);',
          trackColor: '#06b6d4'
        };
      }
      return {
        label: '🌱 Mới (0%)',
        shortLabel: '0% Mới',
        tier: 'new',
        badgeStyle: 'background: rgba(100, 116, 139, 0.15); color: #94a3b8; border: 1px solid rgba(100, 116, 139, 0.3);',
        trackColor: '#64748b'
      };
    }

    function getFilteredDeckWords() {
      const searchEl = document.getElementById('word-search-input');
      const query = (searchEl ? searchEl.value : '').toLowerCase().trim();
      let deckWords = words.filter(w => w.deckId === currentDeckId);

      // Filter by mastery tier / range
      if (currentWordFilter === '0') {
        deckWords = deckWords.filter(w => getWordScore(w) === 0);
      } else if (currentWordFilter === '1-25') {
        deckWords = deckWords.filter(w => { const s = getWordScore(w); return s >= 1 && s <= 25; });
      } else if (currentWordFilter === '26-50') {
        deckWords = deckWords.filter(w => { const s = getWordScore(w); return s >= 26 && s <= 50; });
      } else if (currentWordFilter === '51-75') {
        deckWords = deckWords.filter(w => { const s = getWordScore(w); return s >= 51 && s <= 75; });
      } else if (currentWordFilter === '76-99') {
        deckWords = deckWords.filter(w => { const s = getWordScore(w); return s >= 76 && s <= 99; });
      } else if (currentWordFilter === '100') {
        deckWords = deckWords.filter(w => getWordScore(w) >= 100);
      } else if (currentWordFilter === 'custom-range') {
        deckWords = deckWords.filter(w => {
          const s = getWordScore(w);
          return s >= customMinScore && s <= customMaxScore;
        });
      }

      // Filter by Part of Speech (POS) (v0.0.9.23)
      if (currentPosFilter && currentPosFilter !== 'all') {
        const targetPos = currentPosFilter.toLowerCase().trim();
        deckWords = deckWords.filter(w => {
          const wPos = (w.partOfSpeech || '').toLowerCase().trim();
          if (targetPos === 'other') {
            return !['noun', 'verb', 'adjective', 'adverb', 'noun phrase', 'phrasal verb', 'phrase', 'idiom', 'preposition', 'conjunction'].includes(wPos);
          }
          if (targetPos === 'noun') {
            return wPos === 'noun' || wPos === 'n' || wPos.startsWith('n ') || (wPos.startsWith('noun') && wPos !== 'noun phrase');
          }
          if (targetPos === 'verb') {
            return wPos === 'verb' || wPos === 'v' || wPos.startsWith('v ') || (wPos.startsWith('verb') && wPos !== 'phrasal verb');
          }
          if (targetPos === 'adjective') {
            return wPos === 'adjective' || wPos === 'adj' || wPos.startsWith('adj');
          }
          if (targetPos === 'adverb') {
            return wPos === 'adverb' || wPos === 'adv' || wPos.startsWith('adv');
          }
          if (targetPos === 'noun phrase') {
            return wPos === 'noun phrase' || wPos.includes('noun phrase') || wPos.includes('cụm danh từ');
          }
          if (targetPos === 'phrasal verb') {
            return wPos === 'phrasal verb' || wPos.includes('phrasal verb') || wPos.includes('cụm động từ');
          }
          if (targetPos === 'phrase') {
            return wPos.includes('phrase') || wPos.includes('cụm');
          }
          if (targetPos === 'idiom') {
            return wPos === 'idiom' || wPos.includes('idiom') || wPos.includes('thành ngữ');
          }
          return wPos === targetPos || wPos.includes(targetPos);
        });
      }

      // Filter by CEFR Level (v0.0.9.23)
      if (currentCefrFilter && currentCefrFilter !== 'all') {
        const targetCefr = currentCefrFilter.toUpperCase().trim();
        deckWords = deckWords.filter(w => (w.cefrLevel || '').toUpperCase().trim() === targetCefr);
      }

      if (query) {
        deckWords = deckWords.filter(w => 
          (w.term || '').toLowerCase().includes(query) ||
          (w.definitionVi || w.definition || '').toLowerCase().includes(query) ||
          (w.exampleSentence || w.example || '').toLowerCase().includes(query) ||
          (w.synonyms && w.synonyms.some(s => s.toLowerCase().includes(query))) ||
          (w.collocations && w.collocations.some(c => c.toLowerCase().includes(query)))
        );
      }
      return deckWords;
    }

    function updateMasteryChipCounts() {
      const allDeckWords = words.filter(w => w.deckId === currentDeckId);
      const countAll = allDeckWords.length;
      let count0 = 0, count1_25 = 0, count26_50 = 0, count51_75 = 0, count76_99 = 0, count100 = 0;

      allDeckWords.forEach(w => {
        const s = getWordScore(w);
        if (s === 0) count0++;
        else if (s <= 25) count1_25++;
        else if (s <= 50) count26_50++;
        else if (s <= 75) count51_75++;
        else if (s <= 99) count76_99++;
        else count100++;
      });

      const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      setTxt('chip-count-all', countAll);
      setTxt('chip-count-0', count0);
      setTxt('chip-count-1-25', count1_25);
      setTxt('chip-count-26-50', count26_50);
      setTxt('chip-count-51-75', count51_75);
      setTxt('chip-count-76-99', count76_99);
      setTxt('chip-count-100', count100);
    }

    function toggleMasterySliderPanel() {
      const panel = document.getElementById('mastery-slider-panel');
      if (!panel) return;
      const isHidden = panel.style.display === 'none' || !panel.style.display;
      panel.style.display = isHidden ? 'block' : 'none';
      const btn = document.getElementById('btn-toggle-mastery-slider');
      if (btn) {
        btn.style.background = isHidden ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.08)';
      }
    }

    function handleMasterySliderChange() {
      const minSlider = document.getElementById('mastery-min-slider');
      const maxSlider = document.getElementById('mastery-max-slider');
      if (!minSlider || !maxSlider) return;

      let min = parseInt(minSlider.value, 10);
      let max = parseInt(maxSlider.value, 10);
      if (min > max) {
        min = max;
        minSlider.value = min;
      }

      customMinScore = min;
      customMaxScore = max;

      const rangeVal = document.getElementById('slider-range-val');
      const labelMin = document.getElementById('label-min-score');
      const labelMax = document.getElementById('label-max-score');

      if (rangeVal) rangeVal.textContent = min + '% - ' + max + '%';
      if (labelMin) labelMin.textContent = min + '%';
      if (labelMax) labelMax.textContent = max + '%';

      currentWordFilter = 'custom-range';
      document.querySelectorAll('#deck-word-filter-chips .chip').forEach(c => c.classList.remove('active'));
      renderWordList();
    }

    function resetMasterySlider() {
      const minSlider = document.getElementById('mastery-min-slider');
      const maxSlider = document.getElementById('mastery-max-slider');
      if (minSlider) minSlider.value = 0;
      if (maxSlider) maxSlider.value = 100;
      customMinScore = 0;
      customMaxScore = 100;

      const rangeVal = document.getElementById('slider-range-val');
      const labelMin = document.getElementById('label-min-score');
      const labelMax = document.getElementById('label-max-score');

      if (rangeVal) rangeVal.textContent = '0% - 100%';
      if (labelMin) labelMin.textContent = '0%';
      if (labelMax) labelMax.textContent = '100%';

      currentWordFilter = 'all';
      document.querySelectorAll('#deck-word-filter-chips .chip').forEach(c => c.classList.remove('active'));
      const firstChip = document.querySelector('#deck-word-filter-chips .chip');
      if (firstChip) firstChip.classList.add('active');
      renderWordList();
    }

    function setWordFilter(filter, el) {
      currentWordFilter = filter;
      try {
        localStorage.setItem('vocaflow_word_filter', filter);
      } catch (e) {}
      document.querySelectorAll('#deck-word-filter-chips .chip').forEach(c => c.classList.remove('active'));
      if (el) el.classList.add('active');
      renderWordList();
      if (currentUser && currentUser.uid && !currentUser.uid.startsWith('guest_')) {
        pushCurrentDatabaseToCloud();
      }
    }

    function updateWordModalMasteryPreview(val) {
      val = parseInt(val, 10) || 0;
      const valEl = document.getElementById('modal-word-mastery-val');
      const badgeEl = document.getElementById('modal-word-mastery-badge');
      if (valEl) valEl.textContent = val + '%';
      if (badgeEl) {
        const info = getWordMasteryInfo(val);
        badgeEl.textContent = info.label;
        badgeEl.setAttribute('style', info.badgeStyle);
      }
    }

    function quickAdjustWordScore(wordId) {
      const w = words.find(item => item.id === wordId);
      if (!w) return;
      const cur = getWordScore(w);
      const tiers = [0, 25, 50, 75, 90, 100];
      let next = 0;
      for (let i = 0; i < tiers.length; i++) {
        if (tiers[i] > cur) { next = tiers[i]; break; }
      }
      w.masteryScore = next;
      w.status = next >= 100 ? 'mastered' : (next > 0 ? 'learning' : 'newWord');
      w.updatedAt = new Date().toISOString();
      saveDatabase(true);
      renderWordList();
      showToast('🎯 Đã cập nhật "' + w.term + '": ' + next + '% (' + getWordMasteryInfo(next).shortLabel + ')');
    }

    function toggleWordSelect(wordId, isChecked) {
      if (isChecked) {
        selectedWordIds.add(wordId);
      } else {
        selectedWordIds.delete(wordId);
      }
      const item = document.getElementById('word-item-' + wordId);
      if (item) {
        item.classList.toggle('selected', isChecked);
      }
      updateSelectionUI();
    }

    function toggleSelectAllWords(isChecked) {
      const currentFiltered = getFilteredDeckWords();
      if (isChecked) {
        currentFiltered.forEach(w => selectedWordIds.add(w.id));
      } else {
        currentFiltered.forEach(w => selectedWordIds.delete(w.id));
      }
      renderWordList();
      updateSelectionUI();
    }

    function updateSelectionUI() {
      const count = selectedWordIds.size;
      const countBadge = document.getElementById('selected-word-count-badge');
      const fcLabel = document.getElementById('fc-count-label');
      const autofcLabel = document.getElementById('autofc-count-label');
      const quizLabel = document.getElementById('quiz-count-label');
      const btnDeleteSelected = document.getElementById('btn-delete-selected');
      const selectAllCheckbox = document.getElementById('select-all-words-checkbox');

      if (countBadge) countBadge.textContent = count > 0 ? count + ' từ được chọn' : '0 từ được chọn';
      if (fcLabel) fcLabel.textContent = '';
      if (autofcLabel) autofcLabel.textContent = '';
      if (quizLabel) quizLabel.textContent = '';
      if (btnDeleteSelected) btnDeleteSelected.style.display = count > 0 ? 'inline-flex' : 'none';
      const btnCopySel = document.getElementById('btn-copy-selected');
      const btnCutSel = document.getElementById('btn-cut-selected');
      if (btnCopySel) btnCopySel.style.display = count > 0 ? 'inline-flex' : 'none';
      if (btnCutSel) btnCutSel.style.display = count > 0 ? 'inline-flex' : 'none';
      updateClipboardUI();

      const currentFiltered = getFilteredDeckWords();
      if (selectAllCheckbox) {
        selectAllCheckbox.checked = currentFiltered.length > 0 && currentFiltered.every(w => selectedWordIds.has(w.id));
      }
    }

    function deleteSelectedWords() {
      if (selectedWordIds.size === 0) return;
      if (!confirm('Bạn có chắc chắn muốn xóa ' + selectedWordIds.size + ' từ vựng đã chọn?')) return;

      selectedWordIds.forEach(id => deletedWordIds.add(id));
      saveDeletedTombstones();

      words = words.filter(w => !selectedWordIds.has(w.id));
      selectedWordIds.clear();
      saveDatabase(true);
      renderWordList();
      updateSelectionUI();
      showToast('Đã xóa các từ đã chọn!');
    }

    // =========================================================================
    // CEFR-WEIGHTED MASTERY SCORE ENGINE (0 - 100%)
    // =========================================================================
    function calculateMasteryPoints(cefrLevel, isQuiz = false) {
      const norm = (cefrLevel || '').toUpperCase().trim();
      let baseGain = 6;
      if (norm === 'A1') baseGain = 6;
      else if (norm === 'A2') baseGain = 5;
      else if (norm === 'B1') baseGain = 4;
      else if (norm === 'B2') baseGain = 3;
      else if (norm === 'C1') baseGain = 2;
      else if (norm === 'C2') baseGain = 1;

      let gain = baseGain;
      if (isQuiz) {
        gain = Math.round(baseGain * 1.5);
      }

      const penalty = Math.ceil(gain * 0.5);
      return { gain, penalty };
    }

    function updateWordMasteryScore(word, deltaPoints) {
      if (typeof word.masteryScore !== 'number') {
        if (word.status === 'mastered') word.masteryScore = 100;
        else if (word.status === 'learning') word.masteryScore = 40;
        else word.masteryScore = 0;
      }

      // balance_vip: VIP gains 125% mastery score on progress
      let effectiveDelta = deltaPoints;
      if (deltaPoints > 0 && typeof isUserVip === 'function' && isUserVip()) {
        effectiveDelta = Math.round(deltaPoints * 1.25);
      }

      let newScore = word.masteryScore + effectiveDelta;
      if (newScore < 0) newScore = 0;
      if (newScore > 100) newScore = 100;

      word.masteryScore = newScore;
      if (newScore >= 100) {
        word.status = 'mastered';
      } else if (newScore > 0) {
        word.status = 'learning';
      } else {
        word.status = 'newWord';
      }
      word.updatedAt = new Date().toISOString();

      // Real-time synchronization to master words array (v0.0.10.1h)
      const mainIdx = words.findIndex(w => w.id === word.id);
      if (mainIdx >= 0) {
        words[mainIdx].masteryScore = newScore;
        words[mainIdx].status = word.status;
        words[mainIdx].updatedAt = word.updatedAt;
      }

      return { newScore, deltaPoints: effectiveDelta };
    }

    // =========================================================================
    // DECK TABS, PINNING & ARCHIVE STORAGE ENGINE
    // =========================================================================
    let currentDeckTab = localStorage.getItem('vocaflow_deck_tab') || 'active'; // 'active' | 'archived'

    function setDeckTab(tab, triggerSync = true) {
      currentDeckTab = tab;
      try {
        localStorage.setItem('vocaflow_deck_tab', tab);
      } catch (e) {}
      const tabActiveEl = document.getElementById('tab-active-decks');
      const tabArchivedEl = document.getElementById('tab-archived-decks');
      if (tabActiveEl) {
        if (tab === 'active') tabActiveEl.classList.add('active');
        else tabActiveEl.classList.remove('active');
      }
      if (tabArchivedEl) {
        if (tab === 'archived') tabArchivedEl.classList.add('active');
        else tabArchivedEl.classList.remove('active');
      }
      renderDecks();
      if (triggerSync && currentUser && currentUser.uid && !currentUser.uid.startsWith('guest_')) {
        pushCurrentDatabaseToCloud();
      }
    }

    function togglePinDeck(deckId) {
      const deck = decks.find(d => d.id === deckId);
      if (!deck) return;

      deck.isPinned = !deck.isPinned;
      deck.updatedAt = new Date().toISOString();
      saveDatabase(true);
      renderDecks();

      if (currentDeckId === deckId) {
        updateDeckDetailHeader();
      }

      pushCurrentDatabaseToCloud();
      showToast(deck.isPinned ? '📌 Đã ghim VocaDeck "' + deck.title + '" lên đầu!' : 'Đã bỏ ghim VocaDeck "' + deck.title + '"');
    }

    function toggleArchiveDeck(deckId) {
      const deck = decks.find(d => d.id === deckId);
      if (!deck) return;

      deck.isArchived = !deck.isArchived;
      if (deck.isArchived) {
        deck.isPinned = false;
      }
      deck.updatedAt = new Date().toISOString();
      saveDatabase(true);
      renderDecks();

      if (currentDeckId === deckId) {
        if (deck.isArchived) {
          showScreen('screen-decks');
        } else {
          updateDeckDetailHeader();
        }
      }

      pushCurrentDatabaseToCloud();
      showToast(deck.isArchived ? '📦 Đã cất VocaDeck "' + deck.title + '" vào Kho Lưu Trữ!' : '🔄 Đã khôi phục VocaDeck "' + deck.title + '" về danh sách đang học!');
    }

    function updateDeckDetailHeader() {
      const deck = decks.find(d => d.id === currentDeckId);
      if (!deck) return;

      const pinBtn = document.getElementById('btn-detail-pin');
      if (pinBtn) {
        pinBtn.classList.toggle('active-pin-btn', !!deck.isPinned);
        pinBtn.title = deck.isPinned ? 'Bỏ ghim VocaDeck' : 'Ghim VocaDeck lên đầu';
      }

      const archiveBtn = document.getElementById('btn-detail-archive');
      if (archiveBtn) {
        archiveBtn.innerHTML = '<svg class="icon icon-sm"><use href="#' + (deck.isArchived ? 'i-unarchive' : 'i-archive') + '"/></svg>';
        archiveBtn.title = deck.isArchived ? 'Khôi phục về danh sách đang học' : 'Lưu trữ (Cất VocaDeck này)';
      }
    }

    // =========================================================================
    // DECK RENDERING & CUSTOMIZATION (EDIT / DELETE / PIN / ARCHIVE)
    // =========================================================================
    let currentDeckSort = localStorage.getItem('vocaflow_deck_sort') || 'recent';

    function setDeckSort(sortKey) {
      currentDeckSort = sortKey;
      localStorage.setItem('vocaflow_deck_sort', sortKey);
      renderDecks();
      if (currentUser && currentUser.uid) {
        pushCurrentDatabaseToCloud();
      }
    }

        // Universal screen real-time data refresher (v0.0.10.1h)
    function refreshActiveScreenData() {
      renderDecks();
      renderDailyReviewBanner();
      if (typeof updateMistakeBadgeUI === 'function') updateMistakeBadgeUI();
      if (currentDeckId) {
        updateDeckDetailHeader();
        renderWordList();
        updateSelectionUI();
      }
    }

    let deckSearchQuery = '';

    function handleDeckSearchInput(val) {
      deckSearchQuery = (val || '').trim().toLowerCase();
      const clearBtn = document.getElementById('btn-clear-deck-search');
      if (clearBtn) {
        clearBtn.style.display = deckSearchQuery ? 'inline-flex' : 'none';
      }
      renderDecks();
    }
    window.handleDeckSearchInput = handleDeckSearchInput;

    function clearDeckSearch() {
      deckSearchQuery = '';
      const input = document.getElementById('deck-search-input');
      if (input) input.value = '';
      const clearBtn = document.getElementById('btn-clear-deck-search');
      if (clearBtn) clearBtn.style.display = 'none';
      renderDecks();
    }
    window.clearDeckSearch = clearDeckSearch;

    function renderDecks() {
      // Auto-heal orphan words before rendering (v0.10.8-alpha-24)
      autoHealOrphanWords(false);
      renderDailyReviewBanner();
      const container = document.getElementById('deck-grid');
      if (!container) return;
      container.innerHTML = '';

      const tabActiveEl = document.getElementById('tab-active-decks');
      const tabArchivedEl = document.getElementById('tab-archived-decks');
      if (tabActiveEl) {
        if (currentDeckTab === 'active') tabActiveEl.classList.add('active');
        else tabActiveEl.classList.remove('active');
      }
      if (tabArchivedEl) {
        if (currentDeckTab === 'archived') tabArchivedEl.classList.add('active');
        else tabArchivedEl.classList.remove('active');
      }

      const activeDecks = decks.filter(d => !d.isArchived);
      const archivedDecks = decks.filter(d => !!d.isArchived);

      const countActive = document.getElementById('count-active-decks');
      const countArchived = document.getElementById('count-archived-decks');
      if (countActive) countActive.textContent = activeDecks.length;
      if (countArchived) countArchived.textContent = archivedDecks.length;

      const sortSelect = document.getElementById('deck-sort-select');
      if (sortSelect && sortSelect.value !== currentDeckSort) {
        sortSelect.value = currentDeckSort;
      }

      function sortDeckList(list) {
        const pinnedList = list.filter(d => currentDeckTab === 'active' && !!d.isPinned);
        const unpinnedList = list.filter(d => currentDeckTab !== 'active' || !d.isPinned);

        function compareCriteria(a, b) {
          if (currentDeckSort === 'name_asc') {
            return (a.title || '').localeCompare(b.title || '', 'vi', { sensitivity: 'base' });
          } else if (currentDeckSort === 'name_desc') {
            return (b.title || '').localeCompare(a.title || '', 'vi', { sensitivity: 'base' });
          } else if (currentDeckSort === 'count_desc') {
            const countA = words.filter(w => w.deckId === a.id).length;
            const countB = words.filter(w => w.deckId === b.id).length;
            if (countB !== countA) return countB - countA;
            return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
          } else if (currentDeckSort === 'mastery_desc') {
            const wordsA = words.filter(w => w.deckId === a.id);
            const wordsB = words.filter(w => w.deckId === b.id);
            const scoreA = wordsA.length ? Math.round(wordsA.reduce((s, w) => s + getWordScore(w), 0) / wordsA.length) : 0;
            const scoreB = wordsB.length ? Math.round(wordsB.reduce((s, w) => s + getWordScore(w), 0) / wordsB.length) : 0;
            if (scoreB !== scoreA) return scoreB - scoreA;
            return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
          } else if (currentDeckSort === 'created_desc') {
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
          } else {
            return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
          }
        }

        pinnedList.sort(compareCriteria);
        unpinnedList.sort(compareCriteria);

        return [...pinnedList, ...unpinnedList];
      }

      let displayDecks = [];
      if (currentDeckTab === 'active') {
        displayDecks = sortDeckList(activeDecks);
      } else {
        displayDecks = sortDeckList(archivedDecks);
      }

      if (deckSearchQuery) {
        displayDecks = displayDecks.filter(d => {
          const t = (d.title || '').toLowerCase();
          const desc = (d.description || '').toLowerCase();
          const auth = (d.author || '').toLowerCase();
          const cat = (d.category || '').toLowerCase();
          const tags = Array.isArray(d.tags) ? d.tags.map(x => String(x).toLowerCase()) : [];
          return t.includes(deckSearchQuery) || 
                 desc.includes(deckSearchQuery) || 
                 auth.includes(deckSearchQuery) || 
                 cat.includes(deckSearchQuery) || 
                 tags.some(tag => tag.includes(deckSearchQuery));
        });
      }

      if (displayDecks.length === 0) {
        if (deckSearchQuery) {
          container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 42px 20px; background: var(--surface); border-radius: var(--radius); border: 1px dashed var(--border);">
              <div style="font-size: 36px; margin-bottom: 10px;">🔍</div>
              <h3 style="font-size: 16.5px; margin-bottom: 6px; color: var(--text);">Không Tìm Thấy VocaDeck Nào</h3>
              <p style="color: var(--text-muted); font-size: 13px; margin: 0 0 16px;">
                Không có bộ từ nào khớp với từ khóa "<strong>${escapeHtml(deckSearchQuery)}</strong>".
              </p>
              <button class="btn btn-outline btn-sm" onclick="clearDeckSearch()" style="font-weight: 700;">
                ✕ Xóa Bộ Lọc Tìm Kiếm
              </button>
            </div>
          `;
          return;
        }
        if (currentDeckTab === 'active') {
          container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 42px 20px; background: var(--surface); border-radius: var(--radius); border: 1px dashed var(--border);">
              <div style="font-size: 40px; margin-bottom: 10px;">📚</div>
              <h3 style="font-size: 18px; margin-bottom: 6px; color: var(--text);">Bạn Chưa Có VocaDeck Nào</h3>
              <p style="color: var(--text-muted); font-size: 13px; margin: 0 0 20px; max-width: 460px; margin-inline: auto; line-height: 1.5;">
                Khám phá ngay VocaStore Tiếng Anh <strong>Lớp 10, 11, 12 Trọng tâm</strong> có sẵn trong Thư Viện để bắt đầu ôn luyện ngay chỉ với 1-Click!
              </p>
              <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <button class="btn btn-primary" onclick="openLibraryModal()" style="background: linear-gradient(135deg, #4f46e5, #7c3aed); border: none; font-weight: 700; padding: 8px 18px;">
                  📚 Khám Phá Thư Viện VocaLib (1-Click)
                </button>
                <button class="btn btn-outline" onclick="openDeckModal()">
                  <svg class="icon"><use href="#i-add"/></svg> Tạo VocaDeck Riêng
                </button>
              </div>
            </div>
          `;
        } else {
          container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 48px 20px; background: var(--surface); border-radius: var(--radius); border: 1px dashed var(--border);">
              <svg class="icon icon-xl" style="fill: var(--text-muted); margin-bottom: 12px;"><use href="#i-archive"/></svg>
              <h3 style="font-size: 18px; margin-bottom: 6px;">Kho lưu trữ đang trống</h3>
              <p style="color: var(--text-muted); font-size: 13px; margin: 0; max-width: 420px; margin-inline: auto;">Khi học xong một VocaDeck hoặc muốn tạm ẩn đi cho gọn gàng, bạn hãy bấm nút <strong>"Lưu trữ"</strong> ở VocaDeck đó nhé!</p>
            </div>
          `;
        }
        return;
      }

      displayDecks.forEach((deck, deckIdx) => {
        const deckWords = words.filter(w => w.deckId === deck.id);
        const total = deckWords.length;
        const mastered = deckWords.filter(w => getWordScore(w) >= 100).length;

        let avgScore = 0;
        if (total > 0) {
          const totalScore = deckWords.reduce((sum, w) => sum + getWordScore(w), 0);
          avgScore = Math.round(totalScore / total);
        }

        const isPinned = !!deck.isPinned;
        const isArchived = !!deck.isArchived;
        const isVipDeck = !!(deck.isVipOnly || deck.isVipExclusive || deck.isVip || (deck.tags && deck.tags.includes('vip')) || (deck.title && deck.title.includes('(VIP)')));

        const card = document.createElement('div');
        card.className = 'deck-card' + (isPinned ? ' pinned' : '') + (isArchived ? ' archived' : '') + (isVipDeck ? ' vip-deck-card' : '');
        card.innerHTML = `
          ${!isVipDeck ? `<div class="deck-card-strip" style="background-color: ${deck.color || '#4f46e5'}"></div>` : ''}
          <div class="deck-header">
            <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; flex-wrap: wrap;">
              <h3 class="deck-title">${escapeHtml(deck.title)}</h3>
              ${isVipDeck ? '<span class="badge" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; font-weight: 800; font-size: 10px; border: 1px solid rgba(251,191,36,0.6); padding: 1px 6px;">👑 VIP</span>' : ''}
              ${isPinned ? '<span class="badge badge-pinned" title="VocaDeck đã được ghim lên đầu"><svg class="icon icon-sm"><use href="#i-pin"/></svg> Đã ghim</span>' : ''}
              ${isArchived ? '<span class="badge" style="background: rgba(148, 163, 184, 0.15); color: #94a3b8;"><svg class="icon icon-sm"><use href="#i-archive"/></svg> Đã lưu trữ</span>' : ''}
            </div>
            <span class="badge" style="background: rgba(255,255,255,0.06); flex-shrink: 0;">${total} từ</span>
          </div>
          <p class="deck-desc">${escapeHtml(deck.description || 'Chưa có mô tả')}</p>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${avgScore}%;"></div>
          </div>
          <div class="deck-stats">
            <span>Mức độ thuộc: ${avgScore}%</span>
            <span>Đã thuộc: ${mastered}/${total}</span>
          </div>
          ${(() => {
            const { author: liveAuthor, authorUid: liveAuthorUid, isVip: isVipAuth } = getLiveDeckAuthor(deck);
            return `
              <div class="deck-meta-footer" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px; margin-top: 8px;">
                <span class="deck-timestamp" style="margin-top: 0;">🕒 Cập nhật: ${formatDateTime(deck.updatedAt || deck.createdAt)}</span>
                ${liveAuthor ? `<div class="deck-author-line">${isVipAuth ? `<span class="vip-name-wrapper" style="gap: 3px; cursor: pointer; text-decoration: underline; font-weight: 700;" onclick="event.stopPropagation(); openPublicProfileModal('${escapeHtml(liveAuthor)}', '${escapeHtml(liveAuthorUid)}', '${escapeHtml(deck.libSourceId || deck.id)}')" title="Xem hồ sơ tác giả VIP"><span class="vip-crown-icon" style="font-size: 12px; margin: 0;">👑</span><strong class="vip-glowing-name" style="font-size: 11.5px;">${escapeHtml(liveAuthor)}</strong></span>` : `<span style="color: #a5b4fc; font-weight: 600; cursor: pointer; text-decoration: underline;" onclick="event.stopPropagation(); openPublicProfileModal('${escapeHtml(liveAuthor)}', '${escapeHtml(liveAuthorUid)}', '${escapeHtml(deck.libSourceId || deck.id)}')" title="Xem hồ sơ người đóng góp">👤 ${escapeHtml(liveAuthor)}</span>`}</div>` : ''}
              </div>
            `;
          })()}

          <div class="deck-actions-grid">
            <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); editDeck('${deck.id}')" title="Sửa thông tin VocaDeck">
              <svg class="icon icon-sm"><use href="#i-edit"/></svg> <span class="hide-on-mobile">Sửa</span>
            </button>
            <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); toggleArchiveDeck('${deck.id}')" title="${isArchived ? 'Khôi phục về danh sách đang học' : 'Lưu trữ (Cất VocaDeck)'}">
              <svg class="icon icon-sm"><use href="#${isArchived ? 'i-unarchive' : 'i-archive'}"/></svg> <span class="hide-on-mobile">${isArchived ? 'Khôi phục' : 'Lưu trữ'}</span>
            </button>
            <button class="btn btn-outline btn-sm ${isPinned ? 'active-pin-btn' : ''}" onclick="event.stopPropagation(); togglePinDeck('${deck.id}')" title="${isPinned ? 'Bỏ ghim VocaDeck' : 'Ghim VocaDeck lên đầu'}">
              <svg class="icon icon-sm"><use href="#i-pin"/></svg> <span class="hide-on-mobile">${isPinned ? 'Bỏ ghim' : 'Ghim'}</span>
            </button>
            <button class="btn btn-outline btn-sm btn-delete-deck" onclick="event.stopPropagation(); deleteDeck('${deck.id}')" title="Xóa VocaDeck này" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.35);">
              <svg class="icon icon-sm"><use href="#i-delete"/></svg> <span class="hide-on-mobile">Xóa</span>
            </button>
          </div>
        `;
        card.addEventListener('click', (e) => {
          if (e.target.closest('button')) return;
          openDeckDetail(deck.id);
        });
        container.appendChild(card);

        // In-feed Native AdSense Unit (v0.10.8-alpha-10.3)
        if (!isUserVip() && (deckIdx === 3 || (deckIdx > 3 && deckIdx % 8 === 3))) {
          const infeedCard = document.createElement('div');
          infeedCard.className = 'deck-card adsense-infeed-card';
          infeedCard.style.cssText = 'grid-column: span 1; padding: 14px; background: var(--surface-elevated); border: 1.5px dashed rgba(99,102,241,0.3); border-radius: 14px; display: flex; flex-direction: column; justify-content: center; min-height: 180px; overflow: hidden; position: relative;';
          infeedCard.innerHTML = `
            <div style="font-size: 10px; color: var(--text-muted); font-weight: 700; margin-bottom: 6px; text-transform: uppercase;">Quảng cáo tài trợ</div>
            <ins class="adsbygoogle"
                 style="display:block"
                 data-ad-format="fluid"
                 data-ad-layout-key="-gv-5+29-24-33"
                 data-ad-client="ca-pub-1343250003116465"
                 data-ad-slot="8893043969"></ins>
          `;
          container.appendChild(infeedCard);
          try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
        }
      });

      // Trigger Multiplex in decks screen
      const decksMultiplex = document.getElementById('decks-footer-adsense-multiplex-container');
      if (decksMultiplex) {
        const isVip = isUserVip();
        decksMultiplex.style.display = isVip ? 'none' : 'block';
        if (!isVip) {
          try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
        }
      }
    }



    function deleteDeck(deckId) {
      const deck = decks.find(d => d.id === deckId);
      if (!deck) return;

      if (!confirm('Bạn có chắc chắn muốn xóa VocaDeck "' + deck.title + '" và tất cả từ vựng bên trong?')) {
        return;
      }

      // Automatically take snapshot before deleting (v0.10.9-alpha-18)
      takeDeckSnapshot();

      deletedDeckIds.add(deckId);
      const deckWords = words.filter(w => w.deckId === deckId);
      deckWords.forEach(w => deletedWordIds.add(w.id));
      saveDeletedTombstones();

      decks = decks.filter(d => d.id !== deckId);
      words = words.filter(w => w.deckId !== deckId);

      // Never leave user in an empty void: if all decks deleted, re-seed starter deck
      if (decks.length === 0) {
        if (deletedDeckIds.has('deck-oxford-starter')) {
          deletedDeckIds.delete('deck-oxford-starter');
          saveDeletedTombstones();
        }
        seedSampleData();
      }

      saveDatabase(true);
      renderDecks();

      if (currentDeckId === deckId) {
        showScreen('screen-decks');
      }
      showToast('Đã xóa VocaDeck "' + deck.title + '"! (Đã tự động lưu bản dự phòng)');
    }

    // OPEN DECK DETAIL
    function openDeckDetail(deckId) {
      currentDeckId = deckId;
      selectedWordIds.clear();
      const deck = decks.find(d => d.id === deckId);
      if (!deck) return;

      // Automatically reconcile and clean any duplicate words inside this deck
      reconcileDuplicateWordsInDecks(deckId, false);

      document.getElementById('deck-detail-title').textContent = deck.title;
      document.getElementById('deck-detail-desc').textContent = deck.description || '';
      const timeEl = document.getElementById('deck-detail-timestamp');
      if (timeEl) {
        let timeText = '🕒 Tạo: ' + formatDateOnly(deck.createdAt || deck.updatedAt);
        const { author: liveAuthor, authorUid: liveAuthorUid, isVip: isVipAuth } = getLiveDeckAuthor(deck);

        if (liveAuthor) {
          const authorHtml = isVipAuth
            ? `<span class="vip-name-wrapper" style="gap: 3px; cursor: pointer; font-weight: 700; display: inline-flex; vertical-align: middle;" onclick="openPublicProfileModal('${escapeHtml(liveAuthor)}', '${escapeHtml(liveAuthorUid)}', '${escapeHtml(deck.libSourceId || deck.id)}')" title="Xem hồ sơ tác giả VIP"><span class="vip-crown-icon" style="font-size: 13px; margin: 0;">👑</span><strong class="vip-glowing-name" style="text-decoration: underline; font-size: 12.5px;">${escapeHtml(liveAuthor)}</strong></span>`
            : `<span style="color: #a5b4fc; cursor: pointer; text-decoration: underline; font-weight: 600;" onclick="openPublicProfileModal('${escapeHtml(liveAuthor)}', '${escapeHtml(liveAuthorUid)}', '${escapeHtml(deck.libSourceId || deck.id)}')" title="Xem hồ sơ người đóng góp">${escapeHtml(liveAuthor)}</span>`;
          timeEl.innerHTML = `${timeText} • 👤 Đóng góp: ${authorHtml}`;
        } else {
          timeEl.textContent = timeText;
        }
      }
      document.getElementById('word-search-input').value = '';
      
      // Restore saved word filter preference
      currentWordFilter = localStorage.getItem('vocaflow_word_filter') || 'all';
      let matchedChip = false;
      document.querySelectorAll('#deck-word-filter-chips .chip').forEach(c => {
        const attr = c.getAttribute('onclick') || '';
        if (attr.includes(`'${currentWordFilter}'`)) {
          c.classList.add('active');
          matchedChip = true;
        } else {
          c.classList.remove('active');
        }
      });
      if (!matchedChip) {
        currentWordFilter = 'all';
        const firstChip = document.querySelector('#deck-word-filter-chips .chip');
        if (firstChip) firstChip.classList.add('active');
      }

      currentPosFilter = 'all';
      currentCefrFilter = 'all';
      const posFilterSelect = document.getElementById('filter-word-pos-select');
      if (posFilterSelect) posFilterSelect.value = 'all';
      const cefrFilterSelect = document.getElementById('filter-word-cefr-select');
      if (cefrFilterSelect) cefrFilterSelect.value = 'all';

      // Reset slider panel
      const panel = document.getElementById('mastery-slider-panel');
      if (panel) panel.style.display = 'none';
      const minSlider = document.getElementById('mastery-min-slider');
      const maxSlider = document.getElementById('mastery-max-slider');
      if (minSlider) minSlider.value = 0;
      if (maxSlider) maxSlider.value = 100;
      customMinScore = 0;
      customMaxScore = 100;

      updateDeckDetailHeader();
      applyUiFilterSettings();
      renderWordList();
      updateSelectionUI();
      showScreen('screen-deck-detail');
    }

    // RENDER WORD LIST WITH MULTI-TIER MASTERY CARDS
    function renderWordList() {
      const container = document.getElementById('word-list-container');
      if (!container) return;
      container.innerHTML = '';

      updateMasteryChipCounts();
      const deckWords = getFilteredDeckWords();

      if (deckWords.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 36px 20px; color: var(--text-muted); background: var(--surface); border: 1px dashed var(--border); border-radius: 14px; margin-top: 10px;">
            <div style="font-size: 32px; margin-bottom: 8px;">📖</div>
            <p style="font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 4px;">Không tìm thấy từ vựng nào</p>
            <p style="font-size: 12px; margin-bottom: 16px;">Không có từ nào phù hợp với bộ lọc hoặc tìm kiếm hiện tại.</p>
            <button class="btn btn-primary" onclick="openWordModal()" style="margin: 0 auto; display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px;">
              <svg class="icon"><use href="#i-add"/></svg> Thêm Từ Vựng Mới
            </button>
          </div>
        `;
        updateSelectionUI();
        return;
      }

      deckWords.forEach(w => {
        const item = document.createElement('div');
        item.className = 'word-item' + (selectedWordIds.has(w.id) ? ' selected' : '');
        item.id = 'word-item-' + w.id;

        const score = getWordScore(w);
        const masteryInfo = getWordMasteryInfo(score);
        const senses = getWordSenses(w);
        const isMultiSense = senses.length > 1;

        const multiBadge = isMultiSense ? `<span class="badge" style="background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); font-size: 10px; font-weight: 700;">📚 ${senses.length} nghĩa</span>` : '';
        const cefrBadge = w.cefrLevel ? '<span class="badge badge-cefr">' + escapeHtml(w.cefrLevel) + '</span>' : '';
        const synText = w.synonyms && w.synonyms.length ? '<span class="tag-syn">≈ ' + escapeHtml(w.synonyms.slice(0, 3).join(', ')) + '</span>' : '';
        const antText = w.antonyms && w.antonyms.length ? '<span class="tag-ant">≠ ' + escapeHtml(w.antonyms.slice(0, 2).join(', ')) + '</span>' : '';
        const collText = w.collocations && w.collocations.length ? '<span class="tag-coll">• ' + escapeHtml(w.collocations.slice(0, 2).join(', ')) + '</span>' : '';

        let bodyContentHtml = '';
        if (isMultiSense) {
          bodyContentHtml += '<div class="word-senses-summary" style="display: flex; flex-direction: column; gap: 6px; margin: 6px 0;">';
          senses.forEach((s, sIdx) => {
            const sSyn = s.synonyms && s.synonyms.length ? `<span class="tag-syn" style="font-size: 10px;">≈ ${escapeHtml(s.synonyms.slice(0, 2).join(', '))}</span>` : '';
            const sAnt = s.antonyms && s.antonyms.length ? `<span class="tag-ant" style="font-size: 10px;">≠ ${escapeHtml(s.antonyms.slice(0, 2).join(', '))}</span>` : '';
            const sColl = s.collocations && s.collocations.length ? `<span class="tag-coll" style="font-size: 10px;">• ${escapeHtml(s.collocations.slice(0, 2).join(', '))}</span>` : '';
            bodyContentHtml += `
              <div style="background: rgba(255, 255, 255, 0.03); border-left: 3px solid #a855f7; padding: 5px 8px; border-radius: 0 6px 6px 0; font-size: 12px;">
                <div style="display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap;">
                  <strong style="color: #c084fc; font-size: 11px;">#${sIdx + 1}</strong>
                  <span class="badge badge-pos" style="font-size: 9.5px; padding: 1px 4px;">${escapeHtml(s.partOfSpeech || 'noun')}</span>
                  ${s.cefrLevel ? `<span class="badge badge-cefr" style="font-size: 9px; padding: 1px 4px;">${escapeHtml(s.cefrLevel)}</span>` : ''}
                  ${s.phonetic ? `<span style="font-family: monospace; font-size: 11px; color: var(--text-muted);">${escapeHtml(s.phonetic)}</span>` : ''}
                  <span style="font-weight: 600; color: var(--text);">${escapeHtml(s.definitionVi || '')}</span>
                </div>
                ${s.exampleSentence ? `<div style="font-size: 11px; color: var(--text-muted); font-style: italic; margin-top: 2px;">“${escapeHtml(s.exampleSentence)}”</div>` : ''}
                ${(sSyn || sAnt || sColl) ? `<div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 3px;">${sSyn} ${sAnt} ${sColl}</div>` : ''}
              </div>
            `;
          });
          bodyContentHtml += '</div>';
        } else {
          bodyContentHtml += `
            ${w.phonetic ? '<div class="word-phonetic">' + escapeHtml(w.phonetic) + '</div>' : ''}
            <div class="word-def">${escapeHtml(w.definitionVi || w.definition || '')}</div>
            ${w.exampleSentence ? '<div class="word-example">“' + escapeHtml(w.exampleSentence) + '”</div>' : ''}
            ${(synText || antText || collText) ? '<div class="word-tags">' + synText + ' ' + antText + ' ' + collText + '</div>' : ''}
          `;
        }

        item.innerHTML = `
          <div class="word-item-header">
            <div class="word-item-left">
              <input type="checkbox" class="word-select-checkbox" ${selectedWordIds.has(w.id) ? 'checked' : ''} onchange="toggleWordSelect('${w.id}', this.checked)" onclick="event.stopPropagation()" title="Chọn từ này để học">
              <span class="word-term">${escapeHtml(w.term)}</span>
              ${multiBadge}
              ${cefrBadge}
              ${!isMultiSense && w.partOfSpeech ? '<span class="badge badge-pos">' + escapeHtml(w.partOfSpeech) + '</span>' : ''}
              <button class="btn-speaker" onclick="speakWordById('${w.id}')" title="Phát âm">
                <svg class="icon icon-sm"><use href="#i-volume"/></svg>
              </button>
            </div>
            <div class="word-item-right">
              <span class="badge" style="${masteryInfo.badgeStyle}; font-size: 11px; font-weight: 700;">
                ${masteryInfo.label}
              </span>
              <button class="btn btn-outline btn-icon btn-sm" onclick="copySingleWord('${w.id}')" title="Sao chép từ này"><svg class="icon icon-sm"><use href="#i-copy"/></svg></button>
              <button class="btn btn-outline btn-icon btn-sm" onclick="cutSingleWord('${w.id}')" title="Cắt từ này (chuyển sang bộ khác)"><svg class="icon icon-sm"><use href="#i-cut"/></svg></button>
              <button class="btn btn-outline btn-icon btn-sm" onclick="editWord('${w.id}')" title="Sửa"><svg class="icon icon-sm"><use href="#i-edit"/></svg></button>
              <button class="btn btn-outline btn-icon btn-sm" onclick="deleteWord('${w.id}')" title="Xóa"><svg class="icon icon-sm" style="fill: var(--danger);"><use href="#i-delete"/></svg></button>
            </div>
          </div>

          <div class="word-item-body">
            ${bodyContentHtml}

            <div class="word-mastery-row">
              <div class="word-mastery-track">
                <div class="word-mastery-fill" style="width: ${score}%; background: ${masteryInfo.trackColor};"></div>
              </div>
              <span class="word-mastery-score-text" style="color: ${masteryInfo.trackColor}; font-weight: 700;">${score}/100đ</span>
              <span class="word-timestamp">🕒 ${formatDateTime(w.updatedAt || w.createdAt)}</span>
            </div>
          </div>
        `;
        container.appendChild(item);
      });

      updateSelectionUI();

      // Trigger Multiplex in deck detail screen (v0.10.8-alpha-10.3)
      const detailMultiplex = document.getElementById('deck-detail-adsense-multiplex-container');
      if (detailMultiplex) {
        const isVip = isUserVip();
        detailMultiplex.style.display = isVip ? 'none' : 'block';
        if (!isVip) {
          try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
        }
      }
    }


    // =========================================================================
    // POLYSEMY & HOMOGRAPHS SENSES ENGINE (v0.10.9-alpha-8)
    // =========================================================================
    function getWordSenses(w) {
      if (!w) return [];
      if (Array.isArray(w.senses) && w.senses.length > 0) {
        return w.senses.map(s => ({
          partOfSpeech: s.partOfSpeech || 'noun',
          cefrLevel: s.cefrLevel || s.level || 'B1',
          phonetic: s.phonetic || s.ipa || '',
          definitionVi: s.definitionVi || s.definition || '',
          exampleSentence: s.exampleSentence || s.example || '',
          synonyms: Array.isArray(s.synonyms) ? s.synonyms : parseList(s.synonyms || ''),
          antonyms: Array.isArray(s.antonyms) ? s.antonyms : parseList(s.antonyms || ''),
          collocations: Array.isArray(s.collocations) ? s.collocations : parseList(s.collocations || ''),
          note: s.note || ''
        }));
      }
      return [{
        partOfSpeech: w.partOfSpeech || 'noun',
        cefrLevel: w.cefrLevel || w.level || 'B1',
        phonetic: w.phonetic || '',
        definitionVi: w.definitionVi || w.definition || '',
        exampleSentence: w.exampleSentence || w.example || '',
        synonyms: Array.isArray(w.synonyms) ? w.synonyms : parseList(w.synonyms || ''),
        antonyms: Array.isArray(w.antonyms) ? w.antonyms : parseList(w.antonyms || ''),
        collocations: Array.isArray(w.collocations) ? w.collocations : parseList(w.collocations || ''),
        note: w.note || ''
      }];
    }

    let activeIpaSenseIndex = 0;
    let currentActiveSenseTab = 0;

    function switchWordSenseTab(targetIdx) {
      const container = document.getElementById('word-senses-container');
      if (!container) return;
      const cards = container.querySelectorAll('.word-sense-card');
      if (targetIdx < 0 || targetIdx >= cards.length) return;

      currentActiveSenseTab = targetIdx;
      activeIpaSenseIndex = targetIdx;

      // Toggle display of cards: only targetIdx is block, others are none
      cards.forEach((card, idx) => {
        card.style.display = (idx === targetIdx) ? 'block' : 'none';
      });

      // Update Tab Bar buttons styles
      const tabBar = document.getElementById('word-senses-tab-bar');
      if (tabBar) {
        const tabBtns = tabBar.querySelectorAll('.btn-sense-num-tab');
        tabBtns.forEach((btn, idx) => {
          if (idx === targetIdx) {
            btn.style.background = 'linear-gradient(135deg, #6366f1, #a855f7)';
            btn.style.color = '#ffffff';
            btn.style.borderColor = '#c084fc';
            btn.style.boxShadow = '0 2px 8px rgba(168, 85, 247, 0.4)';
            btn.style.fontWeight = '800';
          } else {
            btn.style.background = 'rgba(255, 255, 255, 0.05)';
            btn.style.color = 'var(--text-muted)';
            btn.style.borderColor = 'var(--border)';
            btn.style.boxShadow = 'none';
            btn.style.fontWeight = '600';
          }
        });
      }

      // Update Delete Button in Tab Bar
      const delCont = document.getElementById('word-sense-delete-btn-container');
      if (delCont) {
        if (cards.length > 1) {
          delCont.innerHTML = `
            <button type="button" class="btn btn-outline btn-sm" onclick="removeWordModalSense(${targetIdx})" title="Xóa nét nghĩa ${targetIdx + 1}" style="color: #f87171; border-color: rgba(239, 68, 68, 0.35); font-size: 11px; padding: 3px 8px; border-radius: 8px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;">
              <span>🗑️</span> <span>Xóa nghĩa ${targetIdx + 1}</span>
            </button>
          `;
        } else {
          delCont.innerHTML = '';
        }
      }
    }

    function toggleIpaKeyboardForSense(idx) {
      activeIpaSenseIndex = idx;
      const panel = document.getElementById('ipa-keyboard-panel');
      if (!panel) return;
      if (panel.style.display === 'none' || panel.dataset.activeSense !== String(idx)) {
        panel.style.display = 'block';
        panel.dataset.activeSense = String(idx);
        renderIpaKeys();
      } else {
        panel.style.display = 'none';
      }
    }

    function getModalSensesFromDOM() {
      const container = document.getElementById('word-senses-container');
      if (!container) return [];
      const cards = container.querySelectorAll('.word-sense-card');
      const list = [];
      cards.forEach((card, idx) => {
        const pos = document.getElementById('word-pos-' + idx)?.value ?? '';
        const cefr = document.getElementById('word-cefr-' + idx)?.value || '';
        const phonetic = (document.getElementById('word-phonetic-' + idx)?.value || '').trim();
        const def = (document.getElementById('word-def-' + idx)?.value || '').trim();
        const example = (document.getElementById('word-example-' + idx)?.value || '').trim();
        const syn = parseList(document.getElementById('word-synonyms-' + idx)?.value || '');
        const ant = parseList(document.getElementById('word-antonyms-' + idx)?.value || '');
        const coll = parseList(document.getElementById('word-collocations-' + idx)?.value || '');
        const note = (document.getElementById('word-note-' + idx)?.value || '').trim();
        list.push({
          partOfSpeech: pos,
          cefrLevel: cefr,
          phonetic: phonetic,
          definitionVi: def,
          exampleSentence: example,
          synonyms: syn,
          antonyms: ant,
          collocations: coll,
          note: note
        });
      });
      return list;
    }

    function renderWordModalSenses(sensesList) {
      const container = document.getElementById('word-senses-container');
      const tabBar = document.getElementById('word-senses-tab-bar');
      const delCont = document.getElementById('word-sense-delete-btn-container');
      if (!container) return;

      const list = (sensesList && sensesList.length > 0) ? sensesList : [{
        partOfSpeech: '', cefrLevel: '', phonetic: '', definitionVi: '',
        exampleSentence: '', synonyms: [], antonyms: [], collocations: [], note: ''
      }];

      if (currentActiveSenseTab >= list.length) {
        currentActiveSenseTab = Math.max(0, list.length - 1);
      }
      activeIpaSenseIndex = currentActiveSenseTab;

      // 1. Render Tab Bar (1, 2, 3, 4... +)
      if (tabBar) {
        let tabsHtml = `<span style="font-size: 12px; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 4px; margin-right: 4px;">📚 Nét nghĩa:</span>`;
        list.forEach((s, idx) => {
          const isActive = (idx === currentActiveSenseTab);
          const activeStyle = isActive 
            ? 'background: linear-gradient(135deg, #6366f1, #a855f7); color: #fff; border-color: #c084fc; box-shadow: 0 2px 8px rgba(168, 85, 247, 0.4); font-weight: 800;'
            : 'background: rgba(255, 255, 255, 0.05); color: var(--text-muted); border-color: var(--border); font-weight: 600;';
          tabsHtml += `
            <button type="button" class="btn btn-sm btn-sense-num-tab" onclick="switchWordSenseTab(${idx})" style="min-width: 32px; height: 30px; border-radius: 8px; padding: 0 10px; font-size: 12.5px; border: 1px solid transparent; cursor: pointer; transition: all 0.2s; ${activeStyle}">
              ${idx + 1}
            </button>
          `;
        });
        // Plus (+) button to add new sense
        tabsHtml += `
          <button type="button" class="btn btn-sm" onclick="addWordModalBlankSense()" title="Thêm nét nghĩa mới (Polysemy / Homograph)" style="width: 30px; height: 30px; border-radius: 8px; padding: 0; font-size: 16px; font-weight: 700; border: 1px dashed rgba(168, 85, 247, 0.6); color: #c084fc; background: rgba(168, 85, 247, 0.1); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s;">
            +
          </button>
        `;
        tabBar.innerHTML = tabsHtml;
      }

      // 2. Render Delete button in tab bar container
      if (delCont) {
        if (list.length > 1) {
          delCont.innerHTML = `
            <button type="button" class="btn btn-outline btn-sm" onclick="removeWordModalSense(${currentActiveSenseTab})" title="Xóa nét nghĩa ${currentActiveSenseTab + 1}" style="color: #f87171; border-color: rgba(239, 68, 68, 0.35); font-size: 11px; padding: 3px 8px; border-radius: 8px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;">
              <span>🗑️</span> <span>Xóa nghĩa ${currentActiveSenseTab + 1}</span>
            </button>
          `;
        } else {
          delCont.innerHTML = '';
        }
      }

      // 3. Render Cards: Only currentActiveSenseTab is display: block, others are display: none
      const posOptions = [
        { val: '', label: 'Không (Tự động / Auto)' },
        { val: 'noun', label: 'Danh từ (Noun)' },
        { val: 'verb', label: 'Động từ (Verb)' },
        { val: 'adjective', label: 'Tính từ (Adjective)' },
        { val: 'adverb', label: 'Trạng từ (Adverb)' },
        { val: 'noun phrase', label: 'Cụm danh từ (Noun Phrase)' },
        { val: 'phrasal verb', label: 'Cụm động từ (Phrasal Verb)' },
        { val: 'phrase', label: 'Cụm từ / Thành ngữ (Phrase)' },
        { val: 'idiom', label: 'Thành ngữ (Idiom)' },
        { val: 'preposition', label: 'Giới từ (Preposition)' },
        { val: 'conjunction', label: 'Liên từ (Conjunction)' },
        { val: 'interjection', label: 'Thán từ (Interjection)' },
        { val: 'other', label: 'Khác (Other)' }
      ];

      const cefrOptions = [
        { val: '', label: 'Không (Tự động / Auto)' },
        { val: 'A1', label: 'A1' },
        { val: 'A2', label: 'A2' },
        { val: 'B1', label: 'B1' },
        { val: 'B2', label: 'B2' },
        { val: 'C1', label: 'C1' },
        { val: 'C2', label: 'C2' }
      ];

      let html = '';
      list.forEach((s, idx) => {
        const synStr = Array.isArray(s.synonyms) ? s.synonyms.join(', ') : (s.synonyms || '');
        const antStr = Array.isArray(s.antonyms) ? s.antonyms.join(', ') : (s.antonyms || '');
        const collStr = Array.isArray(s.collocations) ? s.collocations.join(', ') : (s.collocations || '');
        const isVisible = (idx === currentActiveSenseTab);

        let posOptHtml = '';
        posOptions.forEach(opt => {
          const curPos = (s.partOfSpeech || '').toLowerCase().trim();
          const optVal = opt.val.toLowerCase().trim();
          const selected = (curPos === optVal) ? 'selected' : '';
          posOptHtml += `<option value="${opt.val}" ${selected}>${opt.label}</option>`;
        });

        let cefrOptHtml = '';
        cefrOptions.forEach(opt => {
          const curCefr = (s.cefrLevel || '').toUpperCase().trim();
          const optVal = opt.val.toUpperCase().trim();
          const selected = (curCefr === optVal) ? 'selected' : '';
          cefrOptHtml += `<option value="${opt.val}" ${selected}>${opt.label}</option>`;
        });

        html += `
          <div class="word-sense-card" id="word-sense-card-${idx}" style="display: ${isVisible ? 'block' : 'none'}; background: var(--surface-elevated, rgba(255, 255, 255, 0.03)); border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; position: relative;">
            <div class="form-row" style="display: grid; grid-template-columns: 1.4fr 0.9fr 1.7fr; gap: 8px; margin-bottom: 10px;">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 11px;">Từ loại *</label>
                <select id="word-pos-${idx}" class="form-select" style="font-size: 12px; padding: 6px 8px;">
                  ${posOptHtml}
                </select>
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 11px;">CEFR</label>
                <select id="word-cefr-${idx}" class="form-select" style="font-size: 12px; padding: 6px 8px;">
                  ${cefrOptHtml}
                </select>
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <label class="form-label" style="font-size: 11px; margin-bottom: 2px;">Phiên âm IPA</label>
                  <button type="button" class="btn btn-outline btn-sm" onclick="toggleIpaKeyboardForSense(${idx})" style="font-size: 10px; padding: 1px 6px; height: 20px;">⌨️ IPA</button>
                </div>
                <input type="text" id="word-phonetic-${idx}" class="form-input" placeholder="/.../" value="${escapeHtml(s.phonetic || '')}" style="font-size: 12px; padding: 6px 8px;">
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 10px;">
              <label class="form-label" style="font-size: 11px;">Định nghĩa tiếng Việt *</label>
              <textarea id="word-def-${idx}" class="form-textarea" placeholder="Nghĩa cốt lõi tiếng Việt cho nét nghĩa này..." required style="font-size: 12.5px; padding: 6px 8px; min-height: 52px;">${escapeHtml(s.definitionVi || '')}</textarea>
            </div>

            <div class="form-group" style="margin-bottom: 10px;">
              <label class="form-label" style="font-size: 11px;">Câu ví dụ</label>
              <textarea id="word-example-${idx}" class="form-textarea" placeholder="Câu ví dụ minh họa cách dùng nghĩa này..." style="font-size: 12px; padding: 6px 8px; min-height: 46px;">${escapeHtml(s.exampleSentence || '')}</textarea>
            </div>

            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 11px;">Từ đồng nghĩa (Synonyms)</label>
                <input type="text" id="word-synonyms-${idx}" class="form-input" placeholder="cách nhau bởi dấu phẩy" value="${escapeHtml(synStr)}" style="font-size: 12px; padding: 6px 8px;">
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 11px;">Từ trái nghĩa (Antonyms)</label>
                <input type="text" id="word-antonyms-${idx}" class="form-input" placeholder="cách nhau bởi dấu phẩy" value="${escapeHtml(antStr)}" style="font-size: 12px; padding: 6px 8px;">
              </div>
            </div>

            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 0;">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 11px;">Cụm từ đi kèm (Collocations)</label>
                <input type="text" id="word-collocations-${idx}" class="form-input" placeholder="cụm từ hay gặp..." value="${escapeHtml(collStr)}" style="font-size: 12px; padding: 6px 8px;">
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 11px;">Ghi chú & Mẹo nhớ</label>
                <input type="text" id="word-note-${idx}" class="form-input" placeholder="Mẹo nhớ, giới từ đi kèm..." value="${escapeHtml(s.note || '')}" style="font-size: 12px; padding: 6px 8px;">
              </div>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;

      // Keep fallback inputs in sync for backward compatibility
      const first = list[0];
      if (first) {
        if (document.getElementById('word-pos')) document.getElementById('word-pos').value = first.partOfSpeech || 'noun';
        if (document.getElementById('word-cefr')) document.getElementById('word-cefr').value = first.cefrLevel || 'B1';
        if (document.getElementById('word-phonetic')) document.getElementById('word-phonetic').value = first.phonetic || '';
        if (document.getElementById('word-def')) document.getElementById('word-def').value = first.definitionVi || '';
        if (document.getElementById('word-example')) document.getElementById('word-example').value = first.exampleSentence || '';
        if (document.getElementById('word-synonyms')) document.getElementById('word-synonyms').value = Array.isArray(first.synonyms) ? first.synonyms.join(', ') : (first.synonyms || '');
        if (document.getElementById('word-antonyms')) document.getElementById('word-antonyms').value = Array.isArray(first.antonyms) ? first.antonyms.join(', ') : (first.antonyms || '');
        if (document.getElementById('word-collocations')) document.getElementById('word-collocations').value = Array.isArray(first.collocations) ? first.collocations.join(', ') : (first.collocations || '');
        if (document.getElementById('word-note')) document.getElementById('word-note').value = first.note || '';
      }
    }

    function addWordModalBlankSense() {
      const currentList = getModalSensesFromDOM();
      currentList.push({
        partOfSpeech: '',
        cefrLevel: '',
        phonetic: '',
        definitionVi: '',
        exampleSentence: '',
        synonyms: [],
        antonyms: [],
        collocations: [],
        note: ''
      });
      currentActiveSenseTab = currentList.length - 1;
      renderWordModalSenses(currentList);
      setTimeout(() => {
        const newDef = document.getElementById('word-def-' + currentActiveSenseTab);
        if (newDef) newDef.focus();
      }, 50);
      showToast('➕ Đã thêm nét nghĩa #' + currentList.length + '!');
    }

    function removeWordModalSense(idx) {
      const currentList = getModalSensesFromDOM();
      if (currentList.length <= 1) {
        showToast('⚠️ Từ vựng phải có ít nhất 1 nét nghĩa!');
        return;
      }
      currentList.splice(idx, 1);
      currentActiveSenseTab = Math.min(idx, currentList.length - 1);
      renderWordModalSenses(currentList);
      showToast('🗑️ Đã xóa nét nghĩa.');
    }

    function checkWordTermDuplicate(term) {
      const warnEl = document.getElementById('word-term-duplicate-warning');
      const warnTextEl = document.getElementById('word-term-duplicate-text');
      const openBtn = document.getElementById('btn-open-existing-duplicate');
      if (!warnEl) return;

      const cleanTerm = (term || '').trim().toLowerCase();
      const currentWordId = document.getElementById('word-id')?.value || '';

      if (!cleanTerm) {
        warnEl.style.display = 'none';
        return;
      }

      const existingWord = words.find(w => 
        w.deckId === currentDeckId && 
        w.id !== currentWordId && 
        w.term && 
        w.term.trim().toLowerCase() === cleanTerm
      );

      if (existingWord) {
        warnEl.style.display = 'flex';
        if (warnTextEl) {
          warnTextEl.textContent = `Từ "${existingWord.term}" đã có trong bộ này! Hãy mở từ cũ để thêm nét nghĩa thay vì tạo trùng.`;
        }
        if (openBtn) {
          openBtn.onclick = () => {
            editWord(existingWord.id);
          };
        }
      } else {
        warnEl.style.display = 'none';
      }
    }

    function openWordModal() {
      currentActiveSenseTab = 0;
      document.getElementById('word-id').value = '';
      document.getElementById('word-term').value = '';
      const dupWarn = document.getElementById('word-term-duplicate-warning');
      if (dupWarn) dupWarn.style.display = 'none';
      renderWordModalSenses([{
        partOfSpeech: '',
        cefrLevel: '',
        phonetic: '',
        definitionVi: '',
        exampleSentence: '',
        synonyms: [],
        antonyms: [],
        collocations: [],
        note: ''
      }]);
      
      // Reset & hide mastery slider for brand new word creation (v0.0.10.3h)
      const masteryGroup = document.getElementById('form-word-mastery-group');
      if (masteryGroup) masteryGroup.style.display = 'none';
      const slider = document.getElementById('word-mastery-slider');
      if (slider) {
        slider.min = 0;
        slider.max = 100;
        slider.value = 0;
      }
      updateWordModalMasteryPreview(0);

      document.getElementById('modal-word-title').textContent = 'Thêm Từ Vựng Mới';
      document.getElementById('ipa-keyboard-panel').style.display = 'none';
      updateWordModalAiButtonState();
      openModal('modal-word');
      setTimeout(() => {
        const termInput = document.getElementById('word-term');
        if (termInput) {
          termInput.focus();
          termInput.select();
        }
      }, 60);
    }

    function editWord(id) {
      const w = words.find(item => item.id === id);
      if (!w) return;

      const score = getWordScore(w);

      document.getElementById('word-id').value = w.id;
      document.getElementById('word-term').value = w.term;
      const dupWarn = document.getElementById('word-term-duplicate-warning');
      if (dupWarn) dupWarn.style.display = 'none';
      
      currentActiveSenseTab = 0;
      const senses = getWordSenses(w);
      renderWordModalSenses(senses);

      // Show mastery slider when editing existing word
      const masteryGroup = document.getElementById('form-word-mastery-group');
      if (masteryGroup) masteryGroup.style.display = 'block';
      const slider = document.getElementById('word-mastery-slider');
      if (slider) {
        slider.min = 0;
        slider.max = Math.max(0, score);
        slider.value = score;
      }
      updateWordModalMasteryPreview(score);

      document.getElementById('modal-word-title').textContent = 'Chỉnh Sửa Từ Vựng';
      document.getElementById('ipa-keyboard-panel').style.display = 'none';
      updateWordModalAiButtonState();
      openModal('modal-word');
    }

    function saveWordForm(e) {
      e.preventDefault();
      const id = document.getElementById('word-id').value || 'w-' + Date.now();
      const term = document.getElementById('word-term').value.trim();
      if (!term) {
        alert('Vui lòng nhập từ vựng tiếng Anh!');
        return;
      }

      // Check duplicate word in current deck
      const normalizedTerm = term.toLowerCase();
      const duplicateWord = words.find(w => 
        w.deckId === currentDeckId && 
        w.id !== id && 
        w.term && 
        w.term.trim().toLowerCase() === normalizedTerm
      );
      if (duplicateWord) {
        alert(`⚠️ Từ "${term}" đã tồn tại trong VocaDeck này rồi!\n\nVì VocaFlow hiện đã hỗ trợ tính năng Đa nét nghĩa (Polysemy), bạn hãy mở từ "${duplicateWord.term}" đã có sẵn để thêm các nét nghĩa mới thay vì tạo nhiều từ trùng lặp nhé.`);
        return;
      }

      const collectedSenses = getModalSensesFromDOM();
      // Filter out senses with empty Vietnamese definition
      const validSenses = (collectedSenses || []).filter(s => s && s.definitionVi && s.definitionVi.trim().length > 0);

      if (validSenses.length === 0) {
        alert('⚠️ Vui lòng nhập định nghĩa tiếng Việt cho ít nhất 1 nét nghĩa để lưu từ vựng!');
        return;
      }

      // If user left POS or CEFR as "Không" and typed manually, default gracefully
      validSenses.forEach(s => {
        if (!s.partOfSpeech || !s.partOfSpeech.trim()) {
          s.partOfSpeech = 'noun';
        }
        if (!s.cefrLevel || !s.cefrLevel.trim()) {
          s.cefrLevel = 'B1';
        }
      });

      const primarySense = validSenses[0];
      const pos = primarySense.partOfSpeech;
      const cefr = primarySense.cefrLevel || 'B1';
      const phonetic = primarySense.phonetic || '';
      const def = primarySense.definitionVi;
      const example = primarySense.exampleSentence || '';
      const syn = primarySense.synonyms || [];
      const ant = primarySense.antonyms || [];
      const coll = primarySense.collocations || [];
      const note = primarySense.note || '';
      
      const slider = document.getElementById('word-mastery-slider');
      const score = slider ? parseInt(slider.value, 10) : 0;
      const status = score >= 100 ? 'mastered' : (score > 0 ? 'learning' : 'newWord');
      const nowIso = new Date().toISOString();

      const existingIndex = words.findIndex(w => w.id === id);
      if (existingIndex >= 0) {
        words[existingIndex] = {
          ...words[existingIndex],
          term,
          senses: validSenses,
          partOfSpeech: pos,
          cefrLevel: cefr,
          phonetic: phonetic,
          definitionVi: def,
          exampleSentence: example,
          synonyms: syn,
          antonyms: ant,
          collocations: coll,
          note: note,
          masteryScore: score,
          status: status,
          updatedAt: nowIso
        };
      } else {
        words.push({
          id,
          deckId: currentDeckId,
          term,
          senses: validSenses,
          partOfSpeech: pos,
          cefrLevel: cefr,
          phonetic: phonetic,
          definitionVi: def,
          exampleSentence: example,
          synonyms: syn,
          antonyms: ant,
          collocations: coll,
          note: note,
          status: status,
          masteryScore: score,
          createdAt: nowIso,
          updatedAt: nowIso
        });
        if (!isGuest()) {
          addLedgerEntry('CREATE_WORD', 10, `Tự soạn từ vựng mới "${term}" (+10 VoCoin)`);
          setUserPoints(getUserPoints() + 10);
        }
        showToast(`📝 Đã thêm từ vựng mới "${term}" (+10 VoCoin)!`);
      }

      saveDatabase(true);
      renderWordList();
      closeModal('modal-word');
      showToast('Đã lưu từ vựng thành công!');
    }

    function deleteWord(wordId) {
      const w = words.find(item => item.id === wordId);
      if (!w) return;
      if (!confirm('Bạn có chắc chắn muốn xóa từ "' + w.term + '"?')) return;

      // Register Tombstone to permanently prevent zombie resurrection
      deletedWordIds.add(wordId);
      saveDeletedTombstones();

      words = words.filter(item => item.id !== wordId);
      selectedWordIds.delete(wordId);

      saveDatabase(true);
      renderWordList();
      renderDecks();
      updateSelectionUI();
      showToast('🗑️ Đã xóa từ "' + w.term + '"!');
    }

    // =========================================================================
    function chameleonStyleMatching(distractor, targetCorrectDef) {
      if (!distractor || typeof distractor !== 'string') return '';
      if (!targetCorrectDef || typeof targetCorrectDef !== 'string') return distractor.trim();

      let res = distractor.trim();
      const targetTrimmed = targetCorrectDef.trim();
      const isTargetCap = /^[A-ZÀ-Ỹ]/.test(targetTrimmed);
      const hasTargetDot = /\.$/.test(targetTrimmed);

      // 1. Match first letter capitalization
      if (isTargetCap && res.length > 0) {
        res = res.charAt(0).toUpperCase() + res.slice(1);
      } else if (!isTargetCap && res.length > 0) {
        res = res.charAt(0).toLowerCase() + res.slice(1);
      }

      // 2. Match trailing period
      res = res.replace(/\.+$/, '');
      if (hasTargetDot) {
        res += '.';
      }

      return res;
    }

    // =========================================================================
    // SPACED REPETITION SYSTEM (SRS) REVIEW QUEUE ENGINE (v0.0.10.0)
    // =========================================================================
    let reviewDueWordsList = [];

    function getReviewIntervalDays(score) {
      if (score >= 100) return 30;
      if (score >= 76) return 14;
      if (score >= 51) return 7;
      if (score >= 26) return 3;
      return 1; // 0 - 25%
    }

    // =========================================================================
    // SRS REVIEW QUEUE & SUBSET SELECTION ENGINE (v0.10.9-alpha-14)
    // =========================================================================
    let reviewQueueMasterList = [];
    let reviewQueueFilteredList = [];
    let reviewQueueSelectedWordIds = new Set();
    let reviewQueueSortMode = 'overdue-desc';
    let reviewQueueDeckFilter = 'all';
    let reviewQueueSearchQuery = '';
    let reviewQueueActivePreset = null;

    function getDueReviewWords() {
      const now = Date.now();
      const msPerDay = 24 * 60 * 60 * 1000;
      // Exclude words belonging to archived decks
      const archivedDeckIds = new Set(decks.filter(d => !!d.isArchived).map(d => d.id));

      return words.filter(w => {
        if (archivedDeckIds.has(w.deckId)) return false;
        const score = getWordScore(w);
        if (score <= 0) return false; // Words with 0% mastery have not been learned yet, exclude from review queue
        const intervalDays = getReviewIntervalDays(score);
        const lastTime = new Date(w.updatedAt || w.createdAt || 0).getTime();
        if (!lastTime) return false;
        const diffDays = (now - lastTime) / msPerDay;
        return diffDays >= intervalDays;
      });
    }

    function renderDailyReviewBanner() {
      const container = document.getElementById('daily-review-banner-container');
      if (!container) return;

      if (!showReviewQueueSetting) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
      }
      container.style.display = 'block';

      const archivedDeckIds = new Set(decks.filter(d => !!d.isArchived).map(d => d.id));
      const learnedWords = words.filter(w => !archivedDeckIds.has(w.deckId) && getWordScore(w) > 0);
      const dueWords = getDueReviewWords();
      reviewDueWordsList = dueWords;

      if (learnedWords.length === 0) {
        container.innerHTML = '';
        return;
      }

      if (dueWords.length > 0) {
        container.innerHTML = `
          <div class="daily-review-banner" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(236, 72, 153, 0.12)); border: 1px solid rgba(99, 102, 241, 0.35); border-radius: 14px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
            <div style="display: flex; align-items: center; gap: 14px; min-width: 240px; flex: 1;">
              <div style="width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #6366f1, #ec4899); display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; box-shadow: 0 3px 12px rgba(99, 102, 241, 0.35);">
                🔔
              </div>
              <div>
                <div style="font-weight: 700; font-size: 14.5px; color: var(--text); display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span>Hàng Đợi Ôn Tập Hôm Nay</span>
                  <span class="badge" style="background: #ef4444; color: #fff; font-size: 11px; font-weight: 800; padding: 2px 9px; border-radius: 10px; box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);">${dueWords.length} từ cần ôn</span>
                </div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 3px;">
                  Đã đến chu kỳ lặp lại ngắt quãng (Spaced Repetition) để củng cố trí nhớ dài hạn!
                </div>
              </div>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
              <button class="btn btn-primary" onclick="openReviewQueueModal()" style="background: linear-gradient(135deg, #6366f1, #ec4899); border: none; font-weight: 700; font-size: 12.5px; padding: 8px 18px; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 3px 12px rgba(236, 72, 153, 0.35);">
                ⚡ <span>Ôn Tập Ngay (${dueWords.length})</span>
              </button>
            </div>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(99, 102, 241, 0.08)); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 14px; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 22px;">🎉</span>
              <div>
                <span style="font-weight: 700; font-size: 13.5px; color: #34d399;">Trí nhớ tuyệt vời!</span>
                <span style="font-size: 12px; color: var(--text-muted); margin-left: 6px;">Không có từ vựng nào bị trễ hạn chu kỳ ôn tập hôm nay.</span>
              </div>
            </div>
            <button class="btn btn-outline btn-sm" onclick="openReviewQueueModal()" style="font-size: 11.5px; padding: 4px 10px;">
              👁️ Xem lịch chu kỳ (${learnedWords.length} từ đã học)
            </button>
          </div>
        `;
      }
    }

    function openReviewQueueModal() {
      const archivedDeckIds = new Set(decks.filter(d => !!d.isArchived).map(d => d.id));
      const learnedWords = words.filter(w => !archivedDeckIds.has(w.deckId) && getWordScore(w) > 0);
      const dueWords = getDueReviewWords();
      reviewQueueMasterList = dueWords.length > 0 ? dueWords : [...learnedWords];
      reviewDueWordsList = reviewQueueMasterList;

      const countBadge = document.getElementById('review-queue-modal-count-badge');
      if (countBadge) {
        countBadge.textContent = dueWords.length > 0 ? `${dueWords.length} từ cần ôn` : `0 từ đến hạn / ${learnedWords.length} từ đã học`;
        countBadge.style.background = dueWords.length > 0 ? '#ef4444' : '#10b981';
      }

      // Populate deck filter select
      const deckFilterSelect = document.getElementById('review-queue-deck-filter');
      if (deckFilterSelect) {
        const deckCounts = {};
        reviewQueueMasterList.forEach(w => {
          deckCounts[w.deckId] = (deckCounts[w.deckId] || 0) + 1;
        });

        let opts = `<option value="all">📁 Tất cả VocaDeck (${reviewQueueMasterList.length})</option>`;
        decks.forEach(d => {
          if (!d.isArchived && deckCounts[d.id]) {
            opts += `<option value="${d.id}">📁 ${escapeHtml(d.title)} (${deckCounts[d.id]})</option>`;
          }
        });
        deckFilterSelect.innerHTML = opts;
        deckFilterSelect.value = 'all';
      }

      // Reset filters & search
      reviewQueueDeckFilter = 'all';
      reviewQueueSearchQuery = '';
      const searchInput = document.getElementById('review-queue-search');
      if (searchInput) searchInput.value = '';

      reviewQueueSortMode = 'overdue-desc';
      const sortSelect = document.getElementById('review-queue-sort');
      if (sortSelect) sortSelect.value = 'overdue-desc';

      // Default preset: If > 50 words, pre-select top 50; if <= 50, select all
      reviewQueueSelectedWordIds.clear();
      const defaultCount = reviewQueueMasterList.length > 50 ? 50 : reviewQueueMasterList.length;
      if (defaultCount > 0) {
        selectReviewQueuePreset(defaultCount, false);
      } else {
        filterAndRenderReviewQueue();
      }

      openModal('modal-review-queue');
    }

    function selectReviewQueuePreset(preset, showToastMsg = true) {
      reviewQueueActivePreset = preset;

      // Update preset pills active state
      ['20', '50', '100', 'rand20', 'rand50', 'all', 'clear'].forEach(key => {
        const btn = document.getElementById('preset-btn-' + key);
        if (btn) btn.classList.remove('active');
      });

      if (preset === 'clear') {
        reviewQueueSelectedWordIds.clear();
        const clearBtn = document.getElementById('preset-btn-clear');
        if (clearBtn) clearBtn.classList.add('active');
        if (showToastMsg) showToast('❌ Đã bỏ chọn tất cả từ trong hàng đợi!');
      } else if (preset === 'all') {
        reviewQueueSelectedWordIds.clear();
        (reviewQueueFilteredList.length > 0 ? reviewQueueFilteredList : reviewQueueMasterList).forEach(w => {
          reviewQueueSelectedWordIds.add(w.id);
        });
        const allBtn = document.getElementById('preset-btn-all');
        if (allBtn) allBtn.classList.add('active');
        if (showToastMsg) showToast(`📋 Đã chọn tất cả ${reviewQueueSelectedWordIds.size} từ!`);
      } else if (preset === 'random20' || preset === 'random50') {
        reviewQueueSelectedWordIds.clear();
        const count = preset === 'random20' ? 20 : 50;
        const sourceList = reviewQueueFilteredList.length > 0 ? reviewQueueFilteredList : reviewQueueMasterList;
        const shuffled = [...sourceList].sort(() => Math.random() - 0.5);
        shuffled.slice(0, Math.min(count, shuffled.length)).forEach(w => {
          reviewQueueSelectedWordIds.add(w.id);
        });
        const randBtn = document.getElementById(preset === 'random20' ? 'preset-btn-rand20' : 'preset-btn-rand50');
        if (randBtn) randBtn.classList.add('active');
        if (showToastMsg) showToast(`🔀 Đã bốc ngẫu nhiên ${reviewQueueSelectedWordIds.size} từ!`);
      } else if (typeof preset === 'number') {
        reviewQueueSelectedWordIds.clear();
        const sourceList = reviewQueueFilteredList.length > 0 ? reviewQueueFilteredList : reviewQueueMasterList;
        const now = Date.now();
        const msPerDay = 24 * 60 * 60 * 1000;
        const sortedByOverdue = [...sourceList].sort((a, b) => {
          const scoreA = getWordScore(a);
          const scoreB = getWordScore(b);
          const intA = getReviewIntervalDays(scoreA);
          const intB = getReviewIntervalDays(scoreB);
          const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          const overdueA = ((now - timeA) / msPerDay) - intA;
          const overdueB = ((now - timeB) / msPerDay) - intB;
          return overdueB - overdueA;
        });

        sortedByOverdue.slice(0, Math.min(preset, sortedByOverdue.length)).forEach(w => {
          reviewQueueSelectedWordIds.add(w.id);
        });
        const numBtn = document.getElementById('preset-btn-' + preset);
        if (numBtn) numBtn.classList.add('active');
        if (showToastMsg) showToast(`⚡ Đã chọn nhanh ${reviewQueueSelectedWordIds.size} từ trễ hạn nhất!`);
      }

      filterAndRenderReviewQueue();
    }

    function toggleReviewQueueSelectAll(checked) {
      // Clear preset pills active state
      ['20', '50', '100', 'rand20', 'rand50', 'all', 'clear'].forEach(key => {
        const btn = document.getElementById('preset-btn-' + key);
        if (btn) btn.classList.remove('active');
      });

      if (checked) {
        reviewQueueFilteredList.forEach(w => reviewQueueSelectedWordIds.add(w.id));
      } else {
        reviewQueueFilteredList.forEach(w => reviewQueueSelectedWordIds.delete(w.id));
      }

      filterAndRenderReviewQueue();
    }

    function toggleReviewQueueWordSelect(wordId, checked) {
      if (checked) {
        reviewQueueSelectedWordIds.add(wordId);
      } else {
        reviewQueueSelectedWordIds.delete(wordId);
      }

      // Clear preset pills active state
      ['20', '50', '100', 'rand20', 'rand50', 'all', 'clear'].forEach(key => {
        const btn = document.getElementById('preset-btn-' + key);
        if (btn) btn.classList.remove('active');
      });

      updateReviewQueueHeaderAndActions();
    }

    function onReviewQueueDeckFilterChange(val) {
      reviewQueueDeckFilter = val;
      filterAndRenderReviewQueue();
    }

    function onReviewQueueSortChange(val) {
      reviewQueueSortMode = val;
      filterAndRenderReviewQueue();
    }

    function onReviewQueueSearch(val) {
      reviewQueueSearchQuery = (val || '').trim().toLowerCase();
      filterAndRenderReviewQueue();
    }

    function updateReviewQueueHeaderAndActions() {
      const selectedBadge = document.getElementById('review-queue-selected-badge');
      if (selectedBadge) {
        selectedBadge.textContent = `Đã chọn: ${reviewQueueSelectedWordIds.size} / ${reviewQueueFilteredList.length} từ`;
      }

      const selectAllCb = document.getElementById('review-queue-select-all-cb');
      if (selectAllCb) {
        selectAllCb.checked = reviewQueueFilteredList.length > 0 && reviewQueueFilteredList.every(w => reviewQueueSelectedWordIds.has(w.id));
      }

      const count = reviewQueueSelectedWordIds.size > 0 ? reviewQueueSelectedWordIds.size : reviewQueueFilteredList.length;
      const spkLabel = document.getElementById('label-review-speaking');
      const afcLabel = document.getElementById('label-review-autofc');
      const splLabel = document.getElementById('label-review-spelling');
      const qzLabel = document.getElementById('label-review-quiz');

      if (spkLabel) spkLabel.textContent = `Luyện Nói (${count})`;
      if (afcLabel) afcLabel.textContent = `Auto Flashcard (${count})`;
      if (splLabel) splLabel.textContent = `Luyện Viết (${count})`;
      if (qzLabel) qzLabel.textContent = `Quiz (${count})`;
    }

    function filterAndRenderReviewQueue() {
      const container = document.getElementById('review-queue-words-container');
      if (!container) return;

      const now = Date.now();
      const msPerDay = 24 * 60 * 60 * 1000;

      // 1. Filter
      let list = reviewQueueMasterList.filter(w => {
        if (reviewQueueDeckFilter !== 'all' && w.deckId !== reviewQueueDeckFilter) return false;
        if (reviewQueueSearchQuery) {
          const term = (w.term || '').toLowerCase();
          const def = (w.definitionVi || w.definition || '').toLowerCase();
          if (!term.includes(reviewQueueSearchQuery) && !def.includes(reviewQueueSearchQuery)) return false;
        }
        return true;
      });

      // 2. Sort
      list.sort((a, b) => {
        const scoreA = getWordScore(a);
        const scoreB = getWordScore(b);
        const intA = getReviewIntervalDays(scoreA);
        const intB = getReviewIntervalDays(scoreB);
        const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        const overdueA = ((now - timeA) / msPerDay) - intA;
        const overdueB = ((now - timeB) / msPerDay) - intB;

        if (reviewQueueSortMode === 'overdue-desc') return overdueB - overdueA;
        if (reviewQueueSortMode === 'overdue-asc') return overdueA - overdueB;
        if (reviewQueueSortMode === 'score-asc') return scoreA - scoreB;
        if (reviewQueueSortMode === 'score-desc') return scoreB - scoreA;
        if (reviewQueueSortMode === 'alpha-asc') return (a.term || '').localeCompare(b.term || '');
        return 0;
      });

      reviewQueueFilteredList = list;

      const summaryText = document.getElementById('review-queue-summary-text');
      if (summaryText) {
        summaryText.textContent = `Hiển thị ${reviewQueueFilteredList.length} / ${reviewQueueMasterList.length} từ`;
      }

      updateReviewQueueHeaderAndActions();

      if (reviewQueueFilteredList.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px;">Không tìm thấy từ vựng nào khớp với bộ lọc hiện tại.</div>';
        return;
      }

      let htmlRows = '';
      reviewQueueFilteredList.forEach((w, idx) => {
        const score = getWordScore(w);
        const masteryInfo = getWordMasteryInfo(score);
        const lastTime = new Date(w.updatedAt || w.createdAt || 0).getTime();
        const diffDays = Math.floor((now - lastTime) / msPerDay);
        const interval = getReviewIntervalDays(score);
        const isOverdue = diffDays >= interval;
        const isChecked = reviewQueueSelectedWordIds.has(w.id);

        const deckObj = decks.find(d => d.id === w.deckId);
        const deckName = deckObj ? deckObj.title : 'VocaDeck';

        htmlRows += `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-radius: 8px; margin-bottom: 6px; background: ${isChecked ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface)'}; border: 1px solid ${isChecked ? 'rgba(99, 102, 241, 0.35)' : 'var(--border)'}; gap: 10px; transition: all 0.2s ease;">
            <div style="display: flex; align-items: center; gap: 10px; min-width: 140px; flex: 1;">
              <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleReviewQueueWordSelect('${w.id}', this.checked)" style="width: 16px; height: 16px; accent-color: #6366f1; cursor: pointer; flex-shrink: 0;">
              <span style="font-size: 11px; color: var(--text-muted); width: 22px; flex-shrink: 0;">#${idx + 1}</span>
              <div style="min-width: 0;">
                <div style="font-weight: 700; font-size: 13.5px; color: var(--text); display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                  <span>${escapeHtml(w.term)}</span>
                  ${w.cefrLevel ? '<span class="badge badge-cefr">' + escapeHtml(w.cefrLevel) + '</span>' : ''}
                  ${w.partOfSpeech ? '<span class="badge badge-pos">' + escapeHtml(w.partOfSpeech) + '</span>' : ''}
                  <span class="badge" style="font-size: 10px; background: rgba(255,255,255,0.05); color: var(--text-muted);" title="VocaDeck: ${escapeHtml(deckName)}">📁 ${escapeHtml(deckName)}</span>
                </div>
                <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${escapeHtml(w.definitionVi || w.definition || '')}
                </div>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
              <div style="text-align: right;">
                <span class="badge" style="${masteryInfo.badgeStyle}; font-size: 10px; font-weight: 700;">${score}%</span>
                <div style="font-size: 10.5px; margin-top: 2px; color: ${isOverdue ? '#f87171' : 'var(--text-muted)'}; font-weight: ${isOverdue ? '700' : '400'};">
                  ${isOverdue ? '⚠️ Trễ ' + diffDays + ' ngày' : 'Đã học ' + diffDays + ' ngày trước'}
                </div>
              </div>
              <button class="btn-speaker" onclick="speakWordById('${w.id}')" title="Nghe phát âm" style="margin: 0;">
                <svg class="icon icon-sm"><use href="#i-volume"/></svg>
              </button>
            </div>
          </div>
        `;
      });

      container.innerHTML = htmlRows;
    }

    function launchReviewDueWords(mode) {
      let targetList = [];
      if (reviewQueueSelectedWordIds.size > 0) {
        targetList = reviewQueueMasterList.filter(w => reviewQueueSelectedWordIds.has(w.id));
      } else if (reviewQueueFilteredList.length > 0) {
        targetList = reviewQueueFilteredList;
      } else {
        targetList = reviewQueueMasterList;
      }

      if (!targetList || targetList.length === 0) {
        alert('Không có từ vựng nào được chọn để ôn tập!');
        return;
      }

      closeModal('modal-review-queue');
      showToast(`🚀 Bắt đầu ôn tập ${targetList.length} từ đã chọn!`);

      if (mode === 'speaking') {
        openSpeakingSetupModal(false, targetList);
      } else if (mode === 'autofc') {
        startAutoFlashcardMode(false, targetList);
      } else if (mode === 'spelling') {
        openSpellingSetupModal(false, targetList);
      } else if (mode === 'quiz') {
        if (targetList.length < 2) {
          alert('Cần tối thiểu 2 từ vựng để tạo bài Trắc nghiệm!');
          return;
        }
        openQuizSetupModal(false, targetList);
      }
    }


    // =========================================================================
    // EXCEL / XLSX IMPORT & EXPORT ENGINE
    // =========================================================================

    const STANDARD_HEADERS = [
      'Term', 'PartOfSpeech', 'Phonetic', 'Definition', 'CEFR',
      'Example', 'Synonyms', 'Antonyms', 'Collocations', 'Note', 'Status'
    ];

    const COLUMN_ALIASES = {
      term: ['term', 'từ vựng', 'tu vung', 'từ tiếng anh', 'tu tieng anh', 'word', 'vocabulary', 'từ', 'tu', 'english'],
      partOfSpeech: ['partofspeech', 'pos', 'từ loại', 'tu loai', 'loại từ', 'loai tu', 'type', 'word type', 'từ_loại'],
      phonetic: ['phonetic', 'ipa', 'phiên âm', 'phien am', 'phát âm', 'phat am', 'pronunciation', 'sound'],
      definition: ['definition', 'definitionvi', 'định nghĩa', 'dinh nghia', 'nghĩa', 'nghia', 'nghĩa tiếng việt', 'nghia tieng viet', 'meaning', 'vietnamese', 'dịch'],
      cefr: ['cefr', 'cefrlevel', 'cấp độ', 'cap do', 'trình độ', 'trinh do', 'level', 'band', 'grade'],
      example: ['example', 'examplesentence', 'ví dụ', 'vi du', 'câu ví dụ', 'cau vi du', 'sentence', 'sample'],
      synonyms: ['synonyms', 'synonym', 'đồng nghĩa', 'dong nghia', 'từ đồng nghĩa', 'tu dong nghia', 'syn', 'syns'],
      antonyms: ['antonyms', 'antonym', 'trái nghĩa', 'trai nghia', 'từ trái nghĩa', 'tu trai nghia', 'ant', 'ants'],
      collocations: ['collocations', 'collocation', 'cụm từ', 'cum tu', 'cụm từ đi kèm', 'cum tu di kem', 'coll', 'colls', 'phrases'],
      note: ['note', 'notes', 'ghi chú', 'ghi chu', 'mẹo nhớ', 'meo nho', 'mẹo', 'meo', 'comment'],
      status: ['status', 'trạng thái', 'trang thai', 'tình trạng', 'tinh trang', 'tiến độ', 'tien do']
    };

    function normalizeColName(str) {
      if (!str) return '';
      let s = String(str).toLowerCase().trim();
      s = s.replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
           .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
           .replace(/[ìíịỉĩ]/g, 'i')
           .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
           .replace(/[ùúụủũưừứựửữ]/g, 'u')
           .replace(/[ỳýỵỷỹ]/g, 'y')
           .replace(/[đ]/g, 'd')
           .replace(/[^a-z0-9]/g, '');
      return s;
    }

    function matchColumnKey(rawHeader) {
      const clean = normalizeColName(rawHeader);
      for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
        for (const alias of aliases) {
          const cleanAlias = normalizeColName(alias);
          if (clean === cleanAlias || clean.includes(cleanAlias)) {
            return key;
          }
        }
      }
      return null;
    }

    // EXPORT TO NATIVE .XLSX
    function exportCurrentDeckExcel() {
      const deck = decks.find(d => d.id === currentDeckId);
      const deckWords = words.filter(w => w.deckId === currentDeckId);

      if (deckWords.length === 0) {
        alert('VocaDeck này chưa có dữ liệu để xuất Excel!');
        return;
      }

      const rows = [STANDARD_HEADERS];

      deckWords.forEach(w => {
        let statusLabel = 'Mới';
        if (w.status === 'learning') statusLabel = 'Đang học';
        if (w.status === 'mastered') statusLabel = 'Đã thuộc';

        rows.push([
          w.term || '',
          w.partOfSpeech || '',
          w.phonetic || '',
          w.definitionVi || '',
          w.cefrLevel || '',
          w.exampleSentence || '',
          (w.synonyms || []).join(', '),
          (w.antonyms || []).join(', '),
          (w.collocations || []).join(', '),
          w.note || '',
          statusLabel
        ]);
      });

      const fileName = `${(deck.title || 'vocab').replace(/\s+/g, '_')}_vocab.xlsx`;

      if (typeof XLSX !== 'undefined') {
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [
          { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 32 }, { wch: 8 },
          { wch: 38 }, { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 12 }
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, (deck.title || 'Vocabulary').slice(0, 31));
        XLSX.writeFile(wb, fileName);
      } else {
        // Fallback to CSV
        let csv = '\uFEFF' + rows.map(r => r.map(csvEscape).join(',')).join('\n');
        downloadBlob(csv, fileName.replace('.xlsx', '.csv'), 'text/csv;charset=utf-8;');
      }

      showToast('Đã xuất file Excel (.xlsx) với từng cột riêng biệt thành công!');
    }

    // DOWNLOAD PRE-STYLED SAMPLE TEMPLATE .XLSX
    function downloadSampleExcelTemplate() {
      const rows = [
        STANDARD_HEADERS,
        [
          'Ubiquitous',
          'adjective',
          '/juːˈbɪk.wə.təs/',
          'Có mặt ở khắp mọi nơi cùng một lúc',
          'C1',
          'Smartphones have become ubiquitous in daily life.',
          'omnipresent, pervasive, universal',
          'rare, scarce',
          'ubiquitous presence, become ubiquitous',
          'Mẹo nhớ: U ở khắp mọi nơi',
          'Mới'
        ],
        [
          'Resilient',
          'adjective',
          '/rɪˈzɪl.jənt/',
          'Kiên cường, phục hồi nhanh chóng',
          'B2',
          'The local economy proved remarkably resilient.',
          'tough, adaptable, buoyant',
          'fragile, vulnerable, weak',
          'resilient economy, highly resilient',
          'Dùng trong IELTS Writing Task 2',
          'Đang học'
        ],
        [
          'Eloquent',
          'adjective',
          '/ˈel.ə.kwənt/',
          'Hùng biện, ăn nói lưu loát và truyền cảm',
          'C1',
          'She gave an eloquent speech that moved everyone.',
          'articulate, expressive, fluent',
          'inarticulate, hesitant',
          'eloquent speaker, eloquent plea',
          'Thường miêu tả bài phát biểu hoặc người diễn giải',
          'Mới'
        ]
      ];

      const fileName = 'VocaFlow_Mau_Nhap_Tu_Vung.xlsx';

      if (typeof XLSX !== 'undefined') {
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [
          { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 35 }, { wch: 8 },
          { wch: 45 }, { wch: 30 }, { wch: 25 }, { wch: 30 }, { wch: 30 }, { wch: 12 }
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'VocaFlow_Template');
        XLSX.writeFile(wb, fileName);
      } else {
        let csv = '\uFEFF' + rows.map(r => r.map(csvEscape).join(',')).join('\n');
        downloadBlob(csv, 'VocaFlow_Mau_Nhap_Tu_Vung.csv', 'text/csv;charset=utf-8;');
      }

      showToast('Đã tải xuống file Excel mẫu chuẩn (.xlsx)!');
    }

    function downloadBlob(content, fileName, mimeType) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    function importExcelModal() {
      document.getElementById('import-text-area').value = '';
      openModal('modal-import');
    }

    // HANDLE EXCEL (.XLSX, .XLS, .CSV) FILE UPLOAD
    function handleExcelFileUpload(e) {
      const file = e.target.files[0];
      if (!file) return;

      const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

      if (isXlsx && typeof XLSX !== 'undefined') {
        const reader = new FileReader();
        reader.onload = function(evt) {
          try {
            const data = new Uint8Array(evt.target.result);
            const wb = XLSX.read(data, { type: 'array' });
            const firstSheetName = wb.SheetNames[0];
            const ws = wb.Sheets[firstSheetName];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
            processParsedGrid(rows);
          } catch (err) {
            alert('Lỗi khi đọc file Excel: ' + err.message);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        const reader = new FileReader();
        reader.onload = function(evt) {
          const text = evt.target.result;
          document.getElementById('import-text-area').value = text;
        };
        reader.readAsText(file, 'UTF-8');
      }
    }

    function processTextImport() {
      const text = document.getElementById('import-text-area').value.trim();
      if (!text) {
        alert('Vui lòng chọn file Excel (.xlsx) hoặc dán văn bản.');
        return;
      }

      const lines = text.split(/\r\n|\n/);
      const rows = lines.map(parseCsvLine);
      processParsedGrid(rows);
    }

    // CORE POSITION-INDEPENDENT PARSING & VALIDATION ENGINE
    function processParsedGrid(rows) {
      if (!rows || rows.length === 0) {
        alert('File không có dữ liệu dòng nào!');
        return;
      }

      // 1. Scan for header row in top 5 rows
      let headerRowIdx = -1;
      let headerKeyMap = {}; // Maps standard key ('term', 'definition', etc.) -> column index
      let recognizedCols = [];
      let unrecognizedCols = [];

      for (let r = 0; r < Math.min(rows.length, 5); r++) {
        const row = rows[r];
        if (!row || row.length === 0) continue;

        const tempMap = {};
        const tempRec = [];
        const tempUnrec = [];

        row.forEach((cell, cIdx) => {
          const cellStr = cell ? String(cell).trim() : '';
          if (!cellStr) return;

          const colLetter = String.fromCharCode(65 + cIdx);
          const matchedKey = matchColumnKey(cellStr);
          if (matchedKey) {
            tempMap[matchedKey] = cIdx;
            tempRec.push(`"${cellStr}" (Cột ${colLetter})`);
          } else {
            tempUnrec.push(`"${cellStr}" (Cột ${colLetter})`);
          }
        });

        if (tempMap['term'] !== undefined || tempMap['definition'] !== undefined) {
          headerRowIdx = r;
          headerKeyMap = tempMap;
          recognizedCols = tempRec;
          unrecognizedCols = tempUnrec;
          break;
        }
      }

      // 2. Validate mandatory columns
      if (headerRowIdx === -1 || headerKeyMap['term'] === undefined) {
        alert('❌ LỖI THIẾU CỘT BẮT BUỘC:\n\nKhông tìm thấy cột "Term" (Từ vựng tiếng Anh) trong file.\nVui lòng đặt tiêu đề cột là "Term" hoặc "Từ vựng".');
        return;
      }

      if (headerKeyMap['definition'] === undefined) {
        alert('❌ LỖI THIẾU CỘT BẮT BUỘC:\n\nKhông tìm thấy cột "Definition" (Định nghĩa tiếng Việt) trong file.\nVui lòng đặt tiêu đề cột là "Definition" hoặc "Định nghĩa" / "Nghĩa".');
        return;
      }

      // 3. Parse Data Rows
      const termIdx = headerKeyMap['term'];
      const defIdx = headerKeyMap['definition'];
      const posIdx = headerKeyMap['partOfSpeech'];
      const phoneticIdx = headerKeyMap['phonetic'];
      const cefrIdx = headerKeyMap['cefr'];
      const exampleIdx = headerKeyMap['example'];
      const synIdx = headerKeyMap['synonyms'];
      const antIdx = headerKeyMap['antonyms'];
      const collIdx = headerKeyMap['collocations'];
      const noteIdx = headerKeyMap['note'];
      const statusIdx = headerKeyMap['status'];

      let importedCount = 0;
      let skippedCount = 0;

      for (let r = headerRowIdx + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) {
          skippedCount++;
          continue;
        }

        const term = row[termIdx] ? String(row[termIdx]).trim() : '';
        const def = row[defIdx] ? String(row[defIdx]).trim() : '';

        if (!term && !def) {
          skippedCount++;
          continue;
        }

        if (!term || !def) {
          skippedCount++;
          continue;
        }

        const pos = posIdx !== undefined && row[posIdx] ? String(row[posIdx]).trim() : 'noun';
        const phonetic = phoneticIdx !== undefined && row[phoneticIdx] ? String(row[phoneticIdx]).trim() : '';
        const cefr = cefrIdx !== undefined && row[cefrIdx] ? String(row[cefrIdx]).trim().toUpperCase() : '';
        const example = exampleIdx !== undefined && row[exampleIdx] ? String(row[exampleIdx]).trim() : '';
        const syn = synIdx !== undefined && row[synIdx] ? parseList(String(row[synIdx])) : [];
        const ant = antIdx !== undefined && row[antIdx] ? parseList(String(row[antIdx])) : [];
        const coll = collIdx !== undefined && row[collIdx] ? parseList(String(row[collIdx])) : [];
        const note = noteIdx !== undefined && row[noteIdx] ? String(row[noteIdx]).trim() : '';
        
        let status = 'newWord';
        let masteryScore = 0;
        if (statusIdx !== undefined && row[statusIdx]) {
          const s = String(row[statusIdx]).toLowerCase();
          if (s.includes('master') || s.includes('thuộc') || s.includes('done')) {
            status = 'mastered';
            masteryScore = 100;
          } else if (s.includes('learn') || s.includes('học') || s.includes('review')) {
            status = 'learning';
            masteryScore = 40;
          }
        }

        const nowIso = new Date().toISOString();
        const normalizedTerm = term.toLowerCase();
        const existingInDeck = words.find(w => 
          w.deckId === currentDeckId && 
          w.term && 
          w.term.trim().toLowerCase() === normalizedTerm
        );

        const newSense = {
          partOfSpeech: pos,
          phonetic,
          definitionVi: def,
          cefrLevel: cefr || undefined,
          exampleSentence: example || undefined,
          synonyms: syn,
          antonyms: ant,
          collocations: coll,
          note: note || undefined
        };

        if (existingInDeck) {
          // Initialize senses if missing
          if (!existingInDeck.senses || !Array.isArray(existingInDeck.senses) || existingInDeck.senses.length === 0) {
            existingInDeck.senses = [{
              partOfSpeech: existingInDeck.partOfSpeech || 'noun',
              phonetic: existingInDeck.phonetic || '',
              definitionVi: existingInDeck.definitionVi || '',
              cefrLevel: existingInDeck.cefrLevel,
              exampleSentence: existingInDeck.exampleSentence,
              synonyms: existingInDeck.synonyms || [],
              antonyms: existingInDeck.antonyms || [],
              collocations: existingInDeck.collocations || [],
              note: existingInDeck.note
            }];
          }
          // Avoid duplicate sense with identical definitionVi
          const isSenseDuplicate = existingInDeck.senses.some(s => s.definitionVi && s.definitionVi.trim().toLowerCase() === def.toLowerCase());
          if (!isSenseDuplicate) {
            existingInDeck.senses.push(newSense);
            existingInDeck.updatedAt = nowIso;
          }
        } else {
          words.push({
            id: 'w-imp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            deckId: currentDeckId,
            term,
            senses: [newSense],
            partOfSpeech: pos,
            phonetic,
            definitionVi: def,
            cefrLevel: cefr || undefined,
            exampleSentence: example || undefined,
            synonyms: syn,
            antonyms: ant,
            collocations: coll,
            note: note || undefined,
            status,
            masteryScore,
            createdAt: nowIso,
            updatedAt: nowIso
          });
        }

        importedCount++;
      }

      saveDatabase();
      renderWordList();
      closeModal('modal-import');

      // 4. Report feedback to user
      let msg = `✅ ĐÃ NHẬP THÀNH CÔNG: ${importedCount} từ vựng vào VocaDeck!\n\n`;
      msg += `📌 Các cột đã nhận diện: ${recognizedCols.join(', ')}\n`;
      if (unrecognizedCols.length > 0) {
        msg += `\n⚠️ CHÚ Ý: Các cột sau không nhận diện được tên chuẩn (đã tự động bỏ qua):\n👉 ${unrecognizedCols.join(', ')}`;
      }

      alert(msg);
      showToast(`Đã nhập thành công ${importedCount} từ vựng!`);
    }

    // BACKUP
    function exportAllBackup() {
      const data = { decks, words, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VocaFlow_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      showToast('Đã xuất toàn bộ dữ liệu sao lưu!');
    }

    // =========================================================================
    // AUTO FLASHCARD (HANDS-FREE AUDIO LOOP: EN -> VI -> NEXT)
    // =========================================================================
    let isAutoPlaying = false;
    let isAutoLoop = true;
    let autoFlashcardList = [];
    let autoFlashcardIndex = 0;
    let autoFlashcardStepId = 0;
    let isAutoFcMiniMode = false;
    let lastScreenBeforeAutoFc = 'screen-decks';

    function dismissMiniAutoFlashcardIfActive() {
      if (isAutoFcMiniMode || (document.getElementById('autofc-mini-player') && document.getElementById('autofc-mini-player').style.display !== 'none')) {
        closeAutoFcMiniPlayer();
      }
    }

    function minimizeAutoFlashcardToPip() {
      if (isGuest()) {
        alert('🔒 Chế độ cửa sổ thu nhỏ (Mini Floating Flashcard) chỉ dành cho tài khoản đã đăng ký/đăng nhập!');
        openAuthModal('login');
        return;
      }
      isAutoFcMiniMode = true;
      const miniEl = document.getElementById('autofc-mini-player');
      if (miniEl) miniEl.style.display = 'flex';

      const targetScreen = lastScreenBeforeAutoFc || 'screen-deck-detail';
      showScreen(targetScreen);
      refreshActiveScreenData();
      syncAutoFlashcardControlsUI();
      showToast('🗗 Đã thu nhỏ Auto Flashcard! Bạn có thể vừa nghe vừa thao tác ứng dụng.');
    }

    function maximizeAutoFcMiniPlayer() {
      isAutoFcMiniMode = false;
      const miniEl = document.getElementById('autofc-mini-player');
      if (miniEl) miniEl.style.display = 'none';

      showScreen('screen-autofc');
      syncAutoFlashcardControlsUI();
      renderAutoCardOnly(autoFlashcardIndex);
    }

    function closeAutoFcMiniPlayer() {
      isAutoFcMiniMode = false;
      const miniEl = document.getElementById('autofc-mini-player');
      if (miniEl) miniEl.style.display = 'none';

      isAutoPlaying = false;
      autoFlashcardStepId++;
      stopAllAudio();
      showToast('⏹️ Đã tắt Auto Flashcard.');
    }


    // =========================================================================
    // AI DECK GENERATOR STUDIO ENGINE (v0.0.10.3e UPDATE)
    // =========================================================================
    let currentAiStudioMode = 'topic';
    let aiStudioTargetDeckId = null;
    let aiGeneratedWordsCache = [];
    let isAiStudioGenerating = false;
    let aiStudioGenStatus = '';
    let aiStudioGenProgress = 0;

    function handleAiWordCountBlur(input) {
      if (!input) return;
      let val = parseInt(input.value, 10);
      if (isNaN(val) || val < 5) val = 5;
      if (val > 50) val = 50;
      input.value = val;
      updateAiStudioCost();
    }

    function handleAiWordCountInput(input) {
      updateAiStudioCost();
    }

    function openAiDeckStudioModal(optionalDeckId = null) {
      const isGuest = !currentUser || !currentUser.email;
      const gView = document.getElementById('aideck-guest-lock-view');
      const kView = document.getElementById('aideck-apikey-lock-view');
      const aView = document.getElementById('aideck-main-authenticated-view');
      if (isGuest) {
        if (gView) gView.style.display = 'block';
        if (kView) kView.style.display = 'none';
        if (aView) aView.style.display = 'none';
        openModal('modal-ai-deck-studio');
        return;
      }
      if (!hasAtLeastOneApiKey()) {
        if (gView) gView.style.display = 'none';
        if (kView) kView.style.display = 'block';
        if (aView) aView.style.display = 'none';
        openModal('modal-ai-deck-studio');
        return;
      }
      if (gView) gView.style.display = 'none';
      if (kView) kView.style.display = 'none';
      if (aView) aView.style.display = 'flex';

      aiStudioTargetDeckId = optionalDeckId;
      
      const pts = getUserPoints();
      const ptsLabel = document.getElementById('ai-studio-wallet-pts');
      if (ptsLabel) ptsLabel.textContent = pts + 'đ';

      // Check key warning
      const warnEl = document.getElementById('ai-studio-key-warning');
      const key = geminiApiKey || localStorage.getItem(STORAGE_KEY_GEMINI_KEY) || '';
      if (warnEl) warnEl.style.display = key ? 'none' : 'flex';

      if (isAiStudioGenerating) {
        // Still generating in background
        const loadSec = document.getElementById('ai-studio-loading-sec');
        const prevSec = document.getElementById('ai-studio-preview-sec');
        const inputsSec = document.getElementById('ai-studio-inputs-container');
        if (loadSec) loadSec.style.display = 'block';
        if (prevSec) prevSec.style.display = 'none';
        if (inputsSec) inputsSec.style.display = 'none';
        const loadStatus = document.getElementById('ai-loading-status');
        const loadProgress = document.getElementById('ai-loading-progress-fill');
        if (loadStatus) loadStatus.textContent = aiStudioGenStatus || 'Đang tạo từ bằng AI...';
        if (loadProgress) loadProgress.style.width = aiStudioGenProgress + '%';
      } else if (aiGeneratedWordsCache && aiGeneratedWordsCache.length > 0) {
        // Already finished, show preview
        const loadSec = document.getElementById('ai-studio-loading-sec');
        const prevSec = document.getElementById('ai-studio-preview-sec');
        const inputsSec = document.getElementById('ai-studio-inputs-container');
        if (loadSec) loadSec.style.display = 'none';
        if (inputsSec) inputsSec.style.display = 'none';
        renderAiStudioPreviewList();
      } else {
        // Ready for new generation
        resetAiStudioView();
      }

      updateAiStudioCost();
      openModal('modal-ai-deck-studio');
    }

    function switchAiStudioMode(mode) {
      currentAiStudioMode = mode;
      document.querySelectorAll('.ai-studio-tab-btn').forEach(btn => {
        btn.className = 'btn btn-sm btn-outline ai-studio-tab-btn';
      });

      const activeBtn = document.getElementById(`ai-tab-${mode}`);
      if (activeBtn) activeBtn.className = 'btn btn-sm btn-primary ai-studio-tab-btn';

      const secTopic = document.getElementById('ai-mode-topic-sec');
      const secPassage = document.getElementById('ai-mode-passage-sec');
      const secRaw = document.getElementById('ai-mode-raw-sec');

      if (secTopic) secTopic.style.display = mode === 'topic' ? 'block' : 'none';
      if (secPassage) secPassage.style.display = mode === 'passage' ? 'block' : 'none';
      if (secRaw) secRaw.style.display = mode === 'raw' ? 'block' : 'none';

      updateAiStudioCost();
    }

    function getSelectedAiWordCount() {
      if (currentAiStudioMode === 'topic') {
        const inp = document.getElementById('ai-topic-count-input');
        let val = inp ? parseInt(inp.value, 10) : 10;
        if (isNaN(val)) return 5;
        return Math.max(1, Math.min(50, val));
      } else if (currentAiStudioMode === 'passage') {
        const inp = document.getElementById('ai-passage-count-input');
        let val = inp ? parseInt(inp.value, 10) : 10;
        if (isNaN(val)) return 5;
        return Math.max(1, Math.min(50, val));
      } else if (currentAiStudioMode === 'raw') {
        const rawText = (document.getElementById('ai-raw-input')?.value || '').trim();
        if (!rawText) return 5;
        const wordsList = rawText.split(/[,\n]+/).map(w => w.trim()).filter(w => w.length > 0);
        return Math.min(50, Math.max(1, wordsList.length));
      }
      return 10;
    }

    function updateAiStudioCost() {
      const count = getSelectedAiWordCount();
      const cost = count * 20;
      const userPts = getUserPoints();

      const costEl = document.getElementById('ai-cost-display');
      const subEl = document.getElementById('ai-balance-after');
      if (costEl) costEl.textContent = `${cost}đ ví (${count} từ x 20đ)`;

      if (subEl) {
        const remain = userPts - cost;
        if (remain >= 0) {
          subEl.textContent = `${remain}đ ví`;
          subEl.style.color = '#34d399';
        } else {
          subEl.textContent = `Thiếu ${Math.abs(remain)}đ ví (hãy nạp GiftCode hoặc học thủ công)`;
          subEl.style.color = '#f87171';
        }
      }
    }

    function resetAiStudioView() {
      aiGeneratedWordsCache = [];
      isAiStudioGenerating = false;
      const loadSec = document.getElementById('ai-studio-loading-sec');
      const prevSec = document.getElementById('ai-studio-preview-sec');
      const inputsSec = document.getElementById('ai-studio-inputs-container');
      const genBtn = document.getElementById('btn-do-generate-ai');

      if (loadSec) loadSec.style.display = 'none';
      if (prevSec) prevSec.style.display = 'none';
      if (inputsSec) inputsSec.style.display = 'block';
      if (genBtn) {
        genBtn.disabled = false;
        genBtn.style.opacity = '1';
      }
      updateAiStudioCost();
    }

    function repairAndParseCompactArrayJson(rawText) {
      if (!rawText || typeof rawText !== 'string') return [];
      let cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

      function objectToRow(obj) {
        if (!obj || typeof obj !== 'object') return null;
        const term = (obj.term || obj.word || obj.vocab || obj.name || '').trim();
        if (!term) return null;
        const ipa = (obj.phonetic_ipa || obj.phonetic || obj.ipa || obj.pronunciation || '').trim();
        const pos = (obj.part_of_speech || obj.pos || obj.type || 'noun').trim();
        const def = (obj.definition_vietnamese || obj.definition || obj.meaning_vi || obj.meaning || obj.def || '').trim();
        const ex = (obj.example_sentence || obj.example || obj.sentence || '').trim();
        const cefr = (obj.cefr_level || obj.cefr || obj.level || 'B1').trim();
        const colloc = Array.isArray(obj.collocations) ? obj.collocations.join(', ') : (obj.collocations_csv || obj.collocations || '').trim();
        const syn = Array.isArray(obj.synonyms) ? obj.synonyms.join(', ') : (obj.synonyms_csv || obj.synonyms || '').trim();
        const ant = Array.isArray(obj.antonyms) ? obj.antonyms.join(', ') : (obj.antonyms_csv || obj.antonyms || '').trim();
        const note = (obj.note || obj.mnemonic || obj.tips || '').trim();
        return [term, ipa, pos, def, ex, cefr, colloc, syn, ant, note];
      }

      // 1. Direct JSON.parse
      try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (Array.isArray(parsed[0])) {
            return parsed.filter(item => Array.isArray(item) && item.length >= 2);
          } else if (typeof parsed[0] === 'object') {
            const rows = parsed.map(objectToRow).filter(Boolean);
            if (rows.length > 0) return rows;
          }
        } else if (parsed && typeof parsed === 'object') {
          const arr = parsed.words || parsed.vocabulary || parsed.data || parsed.items || parsed.deck || Object.values(parsed).find(v => Array.isArray(v));
          if (Array.isArray(arr) && arr.length > 0) {
            if (Array.isArray(arr[0])) {
              return arr.filter(item => Array.isArray(item) && item.length >= 2);
            } else if (typeof arr[0] === 'object') {
              const rows = arr.map(objectToRow).filter(Boolean);
              if (rows.length > 0) return rows;
            }
          }
        }
      } catch (e) {}

      // 2. Substring between '[' and ']' or '{' and '}'
      const startIdx = cleaned.indexOf('[');
      const lastClosed = cleaned.lastIndexOf(']');
      if (startIdx !== -1 && lastClosed > startIdx) {
        try {
          const p = JSON.parse(cleaned.substring(startIdx, lastClosed + 1));
          if (Array.isArray(p)) {
            if (Array.isArray(p[0])) return p.filter(item => Array.isArray(item) && item.length >= 2);
            const rows = p.map(objectToRow).filter(Boolean);
            if (rows.length > 0) return rows;
          }
        } catch (err) {}
      }

      const objStart = cleaned.indexOf('{');
      const objEnd = cleaned.lastIndexOf('}');
      if (objStart !== -1 && objEnd > objStart) {
        try {
          const p = JSON.parse(cleaned.substring(objStart, objEnd + 1));
          const arr = p.words || p.vocabulary || p.data || p.items || Object.values(p).find(v => Array.isArray(v));
          if (Array.isArray(arr)) {
            const rows = arr.map(objectToRow).filter(Boolean);
            if (rows.length > 0) return rows;
          }
        } catch (err) {}
      }

      // 3. Fallback regex
      const results = [];
      const regex = /\[\s*"([^"]+)"\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"(?:\s*,\s*"([^"]*)")?(?:\s*,\s*"([^"]*)")?(?:\s*,\s*"([^"]*)")?(?:\s*,\s*"([^"]*)")?(?:\s*,\s*"([^"]*)")?(?:\s*,\s*"([^"]*)")?\s*\]/g;
      let match;
      while ((match = regex.exec(cleaned)) !== null) {
        results.push([
          match[1] || '',
          match[2] || '',
          match[3] || '',
          match[4] || '',
          match[5] || '',
          match[6] || 'B1',
          match[7] || '',
          match[8] || '',
          match[9] || '',
          match[10] || ''
        ]);
      }
      return results;
    }

    async function startAiStudioGeneration() {
      const count = getSelectedAiWordCount();
      const requiredCost = count * 20;
      const userPts = getUserPoints();

      if (userPts < requiredCost) {
        alert(`⚠️ Số dư ví của bạn (${userPts}đ) không đủ để tạo ${count} từ (${requiredCost}đ ví).\n\nHãy nạp mã quà tặng trong VocaShop hoặc thêm từ thủ công để nhận ngay +10đ ví thưởng!`);
        return;
      }

      let prompt = '';
      if (currentAiStudioMode === 'topic') {
        const topic = (document.getElementById('ai-topic-input')?.value || '').trim();
        if (!topic) {
          alert('Vui lòng nhập chủ đề bạn muốn tạo từ vựng!');
          document.getElementById('ai-topic-input')?.focus();
          return;
        }
        const cefr = document.getElementById('ai-topic-cefr')?.value || 'auto';
        prompt = `You are a world-class English lexicographer and Oxford dictionary engine.
Generate exactly ${count} unique, high-yield, non-duplicate English vocabulary words/phrases for topic: "${topic}".
Target CEFR Level: ${cefr === 'auto' ? 'Diverse mix (A1, A2, B1, B2, C1, C2)' : cefr}.

MANDATORY COMPREHENSIVE VOCABULARY STANDARDS (ALL 10 COLUMNS ARE STRICTLY REQUIRED - NEVER LEAVE ANY EMPTY):
1. TERM (term): Unique, high-frequency, lowercase (unless proper noun). Singular nouns, base infinitive verbs.
2. PHONETIC (phonetic_ipa): Accurate standard Oxford/Cambridge IPA transcription enclosed in slashes (e.g. "/rɪˈzɪliənt/").
3. PART OF SPEECH (part_of_speech): Exactly one of: "noun", "verb", "adjective", "adverb", "noun phrase", "phrasal verb", "phrase", "idiom", "preposition", "conjunction", "interjection".
4. DEFINITION (definition_vietnamese): Concise, high-accuracy Vietnamese translation matching topic.
5. EXAMPLE SENTENCE (example_sentence): A natural, high-quality contextual sentence demonstrating usage.
6. CEFR LEVEL (cefr_level): Exactly one of "A1", "A2", "B1", "B2", "C1", "C2".
7. COLLOCATIONS (collocations_csv): MANDATORY. Provide 2-4 natural, high-frequency collocations/phrases separated by commas (e.g. "resilient economy, highly resilient, remain resilient"). NEVER leave empty!
8. SYNONYMS (synonyms_csv): MANDATORY. Provide 2-3 accurate English synonyms separated by commas (e.g. "tough, adaptable, robust"). NEVER leave empty!
9. ANTONYMS (antonyms_csv): MANDATORY. Provide 2-3 accurate English antonyms/opposites separated by commas (e.g. "fragile, weak, vulnerable"). If no direct antonym, provide contrasting terms. NEVER leave empty!
10. NOTE & MNEMONIC (note): MANDATORY. Provide a practical memory tip, common preposition pairing, or contextual nuance in Vietnamese (e.g. "Thường đi kèm giới từ 'to'; mẹo nhớ: sức bật đàn hồi"). NEVER leave empty!

OUTPUT FORMAT:
Return ONLY a valid raw JSON 2D array of strings with NO markdown fences:
[
  ["term", "phonetic_ipa", "part_of_speech", "definition_vietnamese", "example_sentence", "cefr_level", "collocations_csv", "synonyms_csv", "antonyms_csv", "note"]
]`;
      } else if (currentAiStudioMode === 'passage') {
        const passage = (document.getElementById('ai-passage-input')?.value || '').trim();
        if (!passage) {
          alert('Vui lòng dán đoạn văn tiếng Anh cần trích xuất từ vựng!');
          document.getElementById('ai-passage-input')?.focus();
          return;
        }
        prompt = `You are a world-class English lexicographer and Oxford dictionary engine. Extract exactly ${count} most valuable, academic, non-duplicate English vocabulary words from this passage:
"""${passage}"""

MANDATORY COMPREHENSIVE VOCABULARY STANDARDS (ALL 10 COLUMNS ARE STRICTLY REQUIRED - NEVER LEAVE ANY EMPTY):
1. TERM: Unique, academic terms. Lowercase, singular nouns, base infinitive verbs.
2. PHONETIC (phonetic_ipa): Accurate standard IPA enclosed in slashes (e.g. "/ˌskruːtənaɪz/").
3. PART OF SPEECH: Exactly one of: "noun", "verb", "adjective", "adverb", "noun phrase", "phrasal verb", "phrase", "idiom", "preposition", "conjunction".
4. DEFINITION: Accurate, natural Vietnamese translation in passage context.
5. EXAMPLE SENTENCE: Natural contextual sentence from passage or illustrating usage.
6. CEFR LEVEL: "A1", "A2", "B1", "B2", "C1", or "C2".
7. COLLOCATIONS (collocations_csv): MANDATORY. 2-4 natural collocations separated by commas. NEVER leave empty!
8. SYNONYMS (synonyms_csv): MANDATORY. 2-3 accurate English synonyms separated by commas. NEVER leave empty!
9. ANTONYMS (antonyms_csv): MANDATORY. 2-3 accurate English antonyms/opposites separated by commas. NEVER leave empty!
10. NOTE & MNEMONIC (note): MANDATORY. Practical memory tip, preposition rule, or context note in Vietnamese. NEVER leave empty!

OUTPUT FORMAT:
Return ONLY a valid raw JSON 2D array with NO markdown fences:
[
  ["term", "phonetic_ipa", "part_of_speech", "definition_vietnamese", "example_sentence", "cefr_level", "collocations_csv", "synonyms_csv", "antonyms_csv", "note"]
]`;
      } else if (currentAiStudioMode === 'raw') {
        const rawWords = (document.getElementById('ai-raw-input')?.value || '').trim();
        if (!rawWords) {
          alert('Vui lòng dán danh sách từ tiếng Anh thô!');
          document.getElementById('ai-raw-input')?.focus();
          return;
        }
        prompt = `You are a world-class English lexicographer and Oxford dictionary engine. Standardize and enrich these vocabulary terms into complete dictionary entries: ${rawWords}

MANDATORY COMPREHENSIVE VOCABULARY STANDARDS (ALL 10 COLUMNS ARE STRICTLY REQUIRED - NEVER LEAVE ANY EMPTY):
1. NO DUPLICATES: Ensure each term is unique.
2. CASING & FORMS: Lowercase; Nouns in SINGULAR; Verbs in BASE INFINITIVE.
3. PHONETIC (phonetic_ipa): Accurate standard IPA enclosed in slashes (e.g. "/.../").
4. PART OF SPEECH: Exactly one of: "noun", "verb", "adjective", "adverb", "noun phrase", "phrasal verb", "phrase", "idiom", "preposition", "conjunction".
5. DEFINITION: Precise Vietnamese meaning.
6. EXAMPLE SENTENCE: A natural, clear contextual example sentence.
7. CEFR LEVEL: Accurate CEFR grade ("A1", "A2", "B1", "B2", "C1", "C2").
8. COLLOCATIONS (collocations_csv): MANDATORY. 2-4 natural collocations separated by commas. NEVER leave empty!
9. SYNONYMS (synonyms_csv): MANDATORY. 2-3 accurate English synonyms separated by commas. NEVER leave empty!
10. ANTONYMS (antonyms_csv): MANDATORY. 2-3 accurate English antonyms/opposites separated by commas. NEVER leave empty!
11. NOTE & MNEMONIC (note): MANDATORY. Practical memory tip, preposition usage, or grammar nuance in Vietnamese. NEVER leave empty!

OUTPUT FORMAT:
Return ONLY a valid raw JSON 2D array with NO markdown fences:
[
  ["term", "phonetic_ipa", "part_of_speech", "definition_vietnamese", "example_sentence", "cefr_level", "collocations_csv", "synonyms_csv", "antonyms_csv", "note"]
]`;
      }

      let key = (geminiApiKey || localStorage.getItem(STORAGE_KEY_GEMINI_KEY) || '').trim();

      if (!hasAtLeastOneApiKey()) {
        alert('🔑 Bạn chưa cài đặt Gemini API Key!\n\nĐể AI tạo VocaDeck độc nhất và chính xác theo chủ đề, hãy mở mục Cài Đặt và dán API Key (miễn phí từ Google) vào nhé!');
        closeModal('modal-ai-deck-studio');
        openSettingsModal();
        return;
      }

      isAiStudioGenerating = true;
      aiStudioGenStatus = '✨ Đang kết nối Gemini AI Studio...';
      aiStudioGenProgress = 30;

      const loadSec = document.getElementById('ai-studio-loading-sec');
      const inputsSec = document.getElementById('ai-studio-inputs-container');
      const loadStatus = document.getElementById('ai-loading-status');
      const loadProgress = document.getElementById('ai-loading-progress-fill');
      const genBtn = document.getElementById('btn-do-generate-ai');

      if (inputsSec) inputsSec.style.display = 'none';
      if (loadSec) loadSec.style.display = 'block';
      if (genBtn) {
        genBtn.disabled = true;
        genBtn.style.opacity = '0.5';
      }

      if (loadStatus) loadStatus.textContent = aiStudioGenStatus;
      if (loadProgress) loadProgress.style.width = aiStudioGenProgress + '%';

      try {
        let rawResponseText = '';
        const cachedWorkingModel = localStorage.getItem('vocaflow_gemini_working_model');
        const standardModels = (typeof GEMINI_STANDARD_MODELS !== 'undefined' && GEMINI_STANDARD_MODELS.length > 0) ? GEMINI_STANDARD_MODELS : ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-pro'];
        const modelsToTry = cachedWorkingModel ? [cachedWorkingModel, ...standardModels.filter(m => m !== cachedWorkingModel)] : standardModels;

        let fetchSuccess = false;
        let lastErrorMsg = '';

        for (const m of modelsToTry) {
          try {
            aiStudioGenStatus = `🧠 Đang sáng tạo VocaDeck với mô hình ${m}...`;
            aiStudioGenProgress = 65;
            if (loadStatus) loadStatus.textContent = aiStudioGenStatus;
            if (loadProgress) loadProgress.style.width = aiStudioGenProgress + '%';

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  responseMimeType: "application/json",
                  temperature: 0.7,
                  maxOutputTokens: 4096
                },
                safetySettings: [
                  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
              })
            });

            if (res.ok) {
              const resData = await res.json();
              rawResponseText = resData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (rawResponseText) {
                localStorage.setItem('vocaflow_gemini_working_model', m);
                fetchSuccess = true;
                break;
              }
            } else {
              const errJson = await res.json().catch(() => ({}));
              lastErrorMsg = errJson?.error?.message || `HTTP ${res.status}`;
              console.warn(`Model ${m} error:`, lastErrorMsg);
            }
          } catch (e) {
            lastErrorMsg = e.message;
            console.warn(`Model ${m} failed:`, e);
          }
        }

        if (!fetchSuccess || !rawResponseText) {
          throw new Error(lastErrorMsg || 'Không thể kết nối Gemini API.');
        }

        aiStudioGenProgress = 95;
        aiStudioGenStatus = '🔍 Đang tinh chỉnh ví dụ & collocations...';
        if (loadProgress) loadProgress.style.width = aiStudioGenProgress + '%';
        if (loadStatus) loadStatus.textContent = aiStudioGenStatus;

        const parsedArray = repairAndParseCompactArrayJson(rawResponseText);
        if (!parsedArray || parsedArray.length === 0) {
          throw new Error('Không thể phân giải dữ liệu từ AI. Vui lòng thử lại!');
        }

        const seenTerms = new Set();
        const uniqueWords = [];

        parsedArray.forEach((row, idx) => {
          let termStr = (row[0] || '').trim();
          if (!['English', 'Vietnamese', 'French', 'German', 'Spanish', 'Japanese', 'Chinese', 'Google', 'IELTS', 'TOEIC', 'TOEFL'].includes(termStr)) {
            termStr = termStr.toLowerCase();
          }
          if (!termStr) return;
          if (seenTerms.has(termStr)) return; // Prevent duplicates in the same generated deck
          seenTerms.add(termStr);

          // Standardize Part of Speech strictly matching manual add word dropdown
          let rawPos = (row[2] || 'noun').trim().toLowerCase();
          if (rawPos.includes('noun phrase') || rawPos === 'cụm danh từ') rawPos = 'noun phrase';
          else if (rawPos.includes('phrasal verb') || rawPos === 'cụm động từ') rawPos = 'phrasal verb';
          else if (rawPos.includes('idiom') || rawPos === 'thành ngữ') rawPos = 'idiom';
          else if (rawPos.includes('phrase') || rawPos === 'cụm từ') rawPos = 'phrase';
          else if (rawPos === 'n' || rawPos === 'n.' || rawPos.includes('noun') || rawPos.includes('danh từ')) rawPos = 'noun';
          else if (rawPos === 'v' || rawPos === 'v.' || rawPos.includes('verb') || rawPos.includes('động từ')) rawPos = 'verb';
          else if (rawPos === 'adj' || rawPos === 'adj.' || rawPos.includes('adjective') || rawPos.includes('tính từ')) rawPos = 'adjective';
          else if (rawPos === 'adv' || rawPos === 'adv.' || rawPos.includes('adverb') || rawPos.includes('trạng từ')) rawPos = 'adverb';
          else if (rawPos.includes('prep') || rawPos.includes('giới từ')) rawPos = 'preposition';
          else if (rawPos.includes('conj') || rawPos.includes('liên từ')) rawPos = 'conjunction';
          else if (rawPos.includes('interj') || rawPos.includes('thán từ')) rawPos = 'interjection';
          else rawPos = 'other';

          // Standardize Phonetic slashes /.../
          let phonetic = (row[1] || '').trim();
          if (phonetic && !phonetic.startsWith('/')) phonetic = '/' + phonetic;
          if (phonetic && !phonetic.endsWith('/')) phonetic = phonetic + '/';

          let level = (row[5] || 'B1').trim().toUpperCase();
          if (!['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(level)) level = 'B2';

          uniqueWords.push({
            id: 'ai_w_' + Date.now() + '_' + idx,
            selected: true,
            term: termStr,
            phonetic: phonetic,
            partOfSpeech: rawPos,
            definitionVi: (row[3] || '').trim(),
            example: (row[4] || '').trim(),
            level: level,
            collocations: (row[6] || '').trim(),
            synonyms: (row[7] || '').trim(),
            antonyms: (row[8] || '').trim(),
            note: (row[9] || '').trim()
          });
        });

        aiGeneratedWordsCache = uniqueWords;

        isAiStudioGenerating = false;
        aiStudioGenProgress = 100;

        if (loadSec) loadSec.style.display = 'none';

        // Check if modal is active
        const modalEl = document.getElementById('modal-ai-deck-studio');
        if (modalEl && modalEl.classList.contains('active')) {
          renderAiStudioPreviewList();
        } else {
          showToast(`✨ AI đã tạo xong ${aiGeneratedWordsCache.length} từ vựng! Nhấn "Tạo Bằng AI" để xem và lưu.`);
        }
      } catch (err) {
        isAiStudioGenerating = false;
        console.error('AI Generation Error:', err);
        if (loadSec) loadSec.style.display = 'none';
        if (inputsSec) inputsSec.style.display = 'block';
        if (genBtn) {
          genBtn.disabled = false;
          genBtn.style.opacity = '1';
        }

        const errMsg = err.message || '';
        let politeError = '';
        if (errMsg.includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('resource_exhausted')) {
          politeError = '⚠️ Hạn mức gọi Gemini API (Quota) tạm thời đã chạm giới hạn hoặc đang bị quá tải.\n\nXin vui lòng đợi khoảng 30 - 60 giây rồi bấm "Tạo Lại" nhé! Rất xin lỗi bạn vì sự bất tiện này.';
        } else if (errMsg.includes('400') || errMsg.includes('403') || errMsg.toLowerCase().includes('api_key') || errMsg.toLowerCase().includes('not found')) {
          politeError = '🔑 Gemini API Key của bạn không hợp lệ hoặc đã bị vô hiệu hóa.\n\nVui lòng vào mục Cài Đặt để kiểm tra hoặc lấy Key miễn phí mới tại aistudio.google.com trong 10 giây.';
        } else if (errMsg.includes('500') || errMsg.includes('503')) {
          politeError = '⚠️ Máy chủ Google Gemini tạm thời quá tải hoặc đang bảo trì.\n\nXin vui lòng thử lại sau giây lát nhé!';
        } else {
          politeError = `⚠️ Đã xảy ra lỗi khi tạo từ bằng AI: ${errMsg}\n\nXin vui lòng thử lại hoặc kiểm tra kết nối mạng.`;
        }

        alert(politeError);
      }
    }

    function renderAiStudioPreviewList() {
      const prevSec = document.getElementById('ai-studio-preview-sec');
      const listEl = document.getElementById('ai-preview-words-list');
      const sumText = document.getElementById('ai-preview-summary-text');
      const inputsSec = document.getElementById('ai-studio-inputs-container');
      if (!prevSec || !listEl) return;

      if (inputsSec) inputsSec.style.display = 'none';

      const activeCount = aiGeneratedWordsCache.filter(w => w.selected).length;
      if (sumText) sumText.textContent = `🎉 Đã tạo ${aiGeneratedWordsCache.length} từ (${activeCount} từ được chọn • Chi phí: ${activeCount * 20}đ ví)`;

      let html = '';
      aiGeneratedWordsCache.forEach((w, idx) => {
        html += `
          <div style="background: var(--surface-elevated); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; display: flex; align-items: flex-start; gap: 8px;">
            <input type="checkbox" ${w.selected ? 'checked' : ''} onchange="toggleAiWordItemSelect(${idx}, this.checked)" style="margin-top: 4px; accent-color: var(--primary); width: 16px; height: 16px; cursor: pointer;">
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 6px;">
                <div>
                  <strong style="color: #38bdf8; font-size: 13px;">${escapeHtml(w.term)}</strong>
                  ${w.phonetic ? `<span style="font-size: 11px; color: var(--text-muted); margin-left: 4px;">${escapeHtml(w.phonetic)}</span>` : ''}
                </div>
                <div style="display: flex; gap: 4px;">
                  <span class="badge" style="font-size: 9.5px; background: rgba(99,102,241,0.15); color: #a5b4fc;">${escapeHtml(w.partOfSpeech)}</span>
                  <span class="badge badge-level-${(w.level || 'B1').toLowerCase()}" style="font-size: 9.5px;">${w.level}</span>
                </div>
              </div>
              <div style="font-size: 12px; color: var(--text); margin-top: 2px;">${escapeHtml(w.definitionVi)}</div>
              ${w.example ? `<div style="font-size: 11px; color: var(--text-muted); font-style: italic; margin-top: 2px;">VD: "${escapeHtml(w.example)}"</div>` : ''}
            </div>
          </div>
        `;
      });

      listEl.innerHTML = html;
      prevSec.style.display = 'block';
    }

    function toggleAiWordItemSelect(idx, checked) {
      if (aiGeneratedWordsCache[idx]) {
        aiGeneratedWordsCache[idx].selected = checked;
        const sumText = document.getElementById('ai-preview-summary-text');
        const activeCount = aiGeneratedWordsCache.filter(w => w.selected).length;
        if (sumText) sumText.textContent = `🎉 Đã tạo ${aiGeneratedWordsCache.length} từ (${activeCount} từ được chọn • Chi phí: ${activeCount * 20}đ ví)`;
      }
    }

    function toggleSelectAllAiPreview(checked) {
      aiGeneratedWordsCache.forEach(w => w.selected = checked);
      renderAiStudioPreviewList();
    }

    function confirmSaveAiGeneratedWords() {
      const selectedWords = aiGeneratedWordsCache.filter(w => w.selected);
      if (selectedWords.length === 0) {
        alert('Vui lòng chọn ít nhất 1 từ vựng để lưu vào VocaDeck!');
        return;
      }

      const actualCost = selectedWords.length * 20;
      const currentPts = getUserPoints();

      if (currentPts < actualCost) {
        alert(`Số dư ví (${currentPts}đ) không đủ để lưu ${selectedWords.length} từ (${actualCost}đ ví)!`);
        return;
      }

      const titleInput = document.getElementById('ai-new-deck-title');
      let deckTitle = titleInput ? titleInput.value.trim() : '';
      if (!deckTitle) {
        if (currentAiStudioMode === 'topic') {
          deckTitle = document.getElementById('ai-topic-input')?.value.trim() || 'VocaDeck AI';
        } else if (currentAiStudioMode === 'passage') {
          deckTitle = 'Từ Vựng Trích Xuất Báo / Đoạn Văn (' + formatDateOnly(new Date()) + ')';
        } else {
          deckTitle = 'VocaDeck Chuẩn Hóa AI (' + formatDateOnly(new Date()) + ')';
        }
      }

      // Record transaction in ledger FIRST
      addLedgerEntry('AI_GEN', -actualCost, `Tạo VocaDeck "${deckTitle}" (${selectedWords.length} từ bằng AI Studio)`);

      // Deduct wallet points
      setUserPoints(currentPts - actualCost);

      const newDeckId = 'deck_' + Date.now();
      const newDeck = {
        id: newDeckId,
        title: deckTitle,
        description: `VocaDeck ${selectedWords.length} từ được tạo tự động bởi VocaDeck AI.`,
        color: '#8b5cf6',
        isPinned: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      decks.unshift(newDeck);
      const targetDeckId = newDeckId;

      const newWordObjects = selectedWords.map((w, idx) => ({
        id: 'w_' + Date.now() + '_' + idx,
        deckId: targetDeckId,
        term: w.term,
        definitionVi: w.definitionVi,
        definition: w.definitionVi,
        phonetic: w.phonetic || '',
        partOfSpeech: w.partOfSpeech || '',
        exampleSentence: w.example || '',
        example: w.example || '',
        note: w.note || '',
        cefrLevel: w.level || 'B1',
        level: w.level || 'B1',
        synonyms: w.synonyms ? w.synonyms.split(',').map(s=>s.trim()).filter(Boolean) : [],
        antonyms: w.antonyms ? w.antonyms.split(',').map(s=>s.trim()).filter(Boolean) : [],
        collocations: w.collocations ? w.collocations.split(',').map(s=>s.trim()).filter(Boolean) : [],
        status: 'newWord',
        masteryScore: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      words.push(...newWordObjects);
      saveDatabase(true);
      playVocaSfx('purchase');

      closeModal('modal-ai-deck-studio');
      showToast(`🎉 Đã tạo thành công ${newWordObjects.length} từ vựng bằng AI! (-${actualCost} VoCoin)`);
      renderDecks();
      openDeckDetail(targetDeckId);
    }

    // =========================================================================
    // VOCAFLOW CLIPBOARD ENGINE: COPY, CUT & PASTE (v0.0.10.3b)
    // =========================================================================
    let vocaClipboard = {
      action: null, // 'copy' or 'cut'
      words: [],
      sourceDeckId: null
    };

    function copySelectedWords() {
      if (selectedWordIds.size === 0) return;
      const targetWords = words.filter(w => selectedWordIds.has(w.id));
      if (targetWords.length === 0) return;

      vocaClipboard = {
        action: 'copy',
        words: JSON.parse(JSON.stringify(targetWords)),
        sourceDeckId: currentDeckId
      };

      showToast(`📋 Đã sao chép ${targetWords.length} từ vựng vào bộ nhớ tạm!`);
      updateClipboardUI();
    }

    function cutSelectedWords() {
      if (selectedWordIds.size === 0) return;
      const targetWords = words.filter(w => selectedWordIds.has(w.id));
      if (targetWords.length === 0) return;

      vocaClipboard = {
        action: 'cut',
        words: JSON.parse(JSON.stringify(targetWords)),
        sourceDeckId: currentDeckId
      };

      showToast(`✂️ Đã cắt ${targetWords.length} từ vựng (chuyển tới VocaDeck khác và bấm "Dán")!`);
      updateClipboardUI();
    }

    function copySingleWord(wordId) {
      const w = words.find(item => item.id === wordId);
      if (!w) return;

      vocaClipboard = {
        action: 'copy',
        words: [JSON.parse(JSON.stringify(w))],
        sourceDeckId: currentDeckId
      };

      showToast(`📋 Đã sao chép từ "${w.term}" vào bộ nhớ tạm!`);
      updateClipboardUI();
    }

    function cutSingleWord(wordId) {
      const w = words.find(item => item.id === wordId);
      if (!w) return;

      vocaClipboard = {
        action: 'cut',
        words: [JSON.parse(JSON.stringify(w))],
        sourceDeckId: currentDeckId
      };

      showToast(`✂️ Đã cắt từ "${w.term}" (hãy mở VocaDeck khác và bấm "Dán")!`);
      updateClipboardUI();
    }

    function pasteWordsFromClipboard() {
      if (!vocaClipboard || !vocaClipboard.words || vocaClipboard.words.length === 0) {
        alert('Bộ nhớ tạm trống! Hãy chọn từ và bấm "Sao chép" hoặc "Cắt" trước.');
        return;
      }

      if (!currentDeckId) {
        alert('Vui lòng mở một VocaDeck để dán từ vựng vào!');
        return;
      }

      if (vocaClipboard.action === 'cut') {
        if (vocaClipboard.sourceDeckId === currentDeckId) {
          alert('⚠️ Các từ này đang nằm sẵn trong VocaDeck hiện tại!');
          return;
        }

        const count = vocaClipboard.words.length;
        vocaClipboard.words.forEach(cw => {
          const liveWord = words.find(w => w.id === cw.id);
          if (liveWord) {
            liveWord.deckId = currentDeckId;
            liveWord.updatedAt = new Date().toISOString();
          }
        });

        vocaClipboard = { action: null, words: [], sourceDeckId: null };
        saveDatabase(true);
        renderWordList();
        renderDecks();
        updateSelectionUI();
        updateClipboardUI();
        showToast(`✂️ Đã di chuyển thành công ${count} từ vựng sang VocaDeck này!`);
      } else {
        // Copy action: Clone words with new IDs while PRESERVING masteryScore & learning state (v0.10.6c)
        const newWordObjects = vocaClipboard.words.map((w, idx) => ({
          ...w,
          id: 'w_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substr(2, 4),
          deckId: currentDeckId,
          status: w.status || 'newWord',
          masteryScore: (typeof w.masteryScore === 'number') ? w.masteryScore : 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));

        words.push(...newWordObjects);
        saveDatabase(true);
        renderWordList();
        renderDecks();
        updateSelectionUI();
        updateClipboardUI();
        showToast(`📋 Đã dán thành công ${newWordObjects.length} từ vựng vào VocaDeck này!`);
      }
    }

    function updateClipboardUI() {
      const btnPaste = document.getElementById('btn-paste-words');
      const labelPaste = document.getElementById('paste-words-label');
      const hasClipboard = vocaClipboard && vocaClipboard.words && vocaClipboard.words.length > 0;

      if (btnPaste) {
        btnPaste.style.display = hasClipboard ? 'inline-flex' : 'none';
      }
      if (labelPaste && hasClipboard) {
        const actLabel = vocaClipboard.action === 'cut' ? '✂️ Di chuyển' : '📋 Dán';
        labelPaste.textContent = `${actLabel} (${vocaClipboard.words.length})`;
      }
    }
