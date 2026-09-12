// VOCAFLOW 02-STATE-CORE.JS (v0.10.9-55 Build 287)
// Global constants, core database state, storage keys, recovery & audio engine
// =========================================================================

    // =========================================================================
    // VOCAFLOW CONSTANTS & APP VERSION (v0.10.9-55 Build 287)
    // =========================================================================
    const VOCAFLOW_APP_VERSION = 'v0.10.9-55';
    const VOCAFLOW_APP_FULL_TITLE = 'VocaFlow v0.10.9-55 (Build 287)';

    // Standard verified Google Gemini API model fallback tiers (Eliminating 404s)
    const GEMINI_STANDARD_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-pro'];
    const GEMINI_VISION_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    window.GEMINI_STANDARD_MODELS = GEMINI_STANDARD_MODELS;
    window.GEMINI_VISION_MODELS = GEMINI_VISION_MODELS;

    // =========================================================================
    // GLOBAL APP LOADING SPINNER CONTROLLER (v0.10.9-47)
    // =========================================================================
    let appLoadingCounter = 0;
    let appLoadingTimeout = null;

    function showAppLoading(text = 'Đang tải dữ liệu...') {
      appLoadingCounter++;
      const loader = document.getElementById('app-global-loader');
      const textEl = document.getElementById('app-global-loader-text');
      if (textEl) textEl.textContent = text;
      if (loader) {
        loader.style.display = 'flex';
        loader.classList.add('active');
      }
      if (appLoadingTimeout) clearTimeout(appLoadingTimeout);
      // Fallback safety timeout (10 seconds)
      appLoadingTimeout = setTimeout(() => {
        hideAppLoading(true);
      }, 10000);
    }
    window.showAppLoading = showAppLoading;

    function hideAppLoading(force = false) {
      if (force) appLoadingCounter = 0;
      else appLoadingCounter = Math.max(0, appLoadingCounter - 1);

      if (appLoadingCounter === 0) {
        if (appLoadingTimeout) {
          clearTimeout(appLoadingTimeout);
          appLoadingTimeout = null;
        }
        const loader = document.getElementById('app-global-loader');
        if (loader) {
          loader.classList.remove('active');
          setTimeout(() => {
            if (!loader.classList.contains('active')) {
              loader.style.display = 'none';
            }
          }, 200);
        }
      }
    }
    window.hideAppLoading = hideAppLoading;


    // =========================================================================
    // GLOBAL DATE, TRUSTED SERVER TIME & ANTI-TIME-TRAVEL ENGINE (v0.10.9-alpha-7)
    // =========================================================================
    let serverTimeDeltaMs = 0;
    let hasServerTimeSync = false;
    const STORAGE_KEY_MAX_OBSERVED_TIME = 'vocaflow_max_observed_timestamp';
    const STORAGE_KEY_MAX_OBSERVED_DATE = 'vocaflow_max_observed_date';

    function getTrustedCurrentTimestamp() {
      const localNow = Date.now();
      if (hasServerTimeSync) {
        return localNow + serverTimeDeltaMs;
      }
      return localNow;
    }

    function recordTrustedTimeObservation(timestamp) {
      const ts = Number(timestamp) || Date.now();
      const maxStored = parseInt(localStorage.getItem(STORAGE_KEY_MAX_OBSERVED_TIME) || '0', 10);
      if (ts > maxStored) {
        localStorage.setItem(STORAGE_KEY_MAX_OBSERVED_TIME, ts.toString());
        const d = new Date(ts);
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const maxDate = localStorage.getItem(STORAGE_KEY_MAX_OBSERVED_DATE) || '';
        if (dStr > maxDate) {
          localStorage.setItem(STORAGE_KEY_MAX_OBSERVED_DATE, dStr);
        }
      }
    }

    function isSystemClockManipulatedBackward() {
      const maxStored = parseInt(localStorage.getItem(STORAGE_KEY_MAX_OBSERVED_TIME) || '0', 10);
      if (maxStored > 0) {
        const current = getTrustedCurrentTimestamp();
        // Allow up to 10 minutes tolerance for minor clock drift / NTP adjustment
        if (current < maxStored - 600000) {
          return true;
        }
      }
      return false;
    }

    function syncTrustedServerTimeFromHeader(dateHeaderString) {
      if (!dateHeaderString) return;
      try {
        const sTime = new Date(dateHeaderString).getTime();
        if (!isNaN(sTime) && sTime > 1700000000000) {
          serverTimeDeltaMs = sTime - Date.now();
          hasServerTimeSync = true;
          recordTrustedTimeObservation(sTime);
        }
      } catch (e) {}
    }

    function getTodayDateString() {
      const ts = getTrustedCurrentTimestamp();
      recordTrustedTimeObservation(ts);
      const d = new Date(ts);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function stripVipAffixes(name) {
      if (!name || typeof name !== 'string') return '';
      return name.replace(/\s*👑\s*/g, ' ').replace(/\s*\(VIP\)\s*/gi, ' ').trim();
    }
    window.stripVipAffixes = stripVipAffixes;

    var aiChatDailyDate = localStorage.getItem('vocaflow_ai_chat_daily_date') || '';
    var aiChatDailyCount = parseInt(localStorage.getItem('vocaflow_ai_chat_daily_count') || '0', 10);

    function checkResetAiChatDailyQuota() {
      const today = getTodayDateString();
      if (aiChatDailyDate !== today) {
        aiChatDailyDate = today;
        aiChatDailyCount = 0;
        localStorage.setItem('vocaflow_ai_chat_daily_date', aiChatDailyDate);
        localStorage.setItem('vocaflow_ai_chat_daily_count', '0');
      }
    }

    // =========================================================================
    // VOCAFLOW VIP / BULLETPROOF PROTECTION ENGINE (v0.10.9-alpha-3)
    // =========================================================================
    const STORAGE_KEY_VIP_HIGH_WATER = 'vocaflow_vip_high_water_exp';
    let userIsVip = localStorage.getItem('vocaflow_user_is_vip') === 'true';
    let userVipTier = localStorage.getItem('vocaflow_user_vip_tier') || 'none'; // 'monthly' | 'yearly' | 'lifetime' | 'none'
    let userVipExpiresAt = parseInt(localStorage.getItem('vocaflow_user_vip_expires_at') || '0', 10);
    let adminVipOverride = localStorage.getItem('vocaflow_admin_vip_override') === 'true';

    function getVipHighWaterExp() {
      const storedHW = parseInt(localStorage.getItem(STORAGE_KEY_VIP_HIGH_WATER) || '0', 10);
      const activeExp = parseInt(localStorage.getItem('vocaflow_user_vip_expires_at') || '0', 10);
      return Math.max(storedHW, activeExp, userVipExpiresAt || 0);
    }

    function applyVipState(enable, tier = 'monthly', expiresAt = 0, source = 'system', allowDowngrade = false) {
      const tierRanks = { 'none': 0, 'monthly': 1, 'yearly': 2, 'lifetime': 3 };
      const currentTier = userVipTier || 'none';
      const incomingTier = tier || 'none';

      let finalTier = currentTier;
      if (allowDowngrade) {
        finalTier = incomingTier;
      } else {
        finalTier = (tierRanks[incomingTier] >= tierRanks[currentTier]) ? incomingTier : currentTier;
      }

      let finalExp = 0;
      if (finalTier === 'lifetime') {
        finalExp = 0;
      } else {
        const highWater = getVipHighWaterExp();
        if (allowDowngrade) {
          finalExp = expiresAt || 0;
        } else {
          // Monotonic Forward-Only Protection: Never allow VIP expiration to decrease
          finalExp = Math.max(highWater, expiresAt || 0);
        }
      }

      const active = (finalTier === 'lifetime') || (finalExp > Date.now());
      userIsVip = active;
      userVipTier = active ? finalTier : 'none';
      userVipExpiresAt = active ? finalExp : 0;

      localStorage.setItem('vocaflow_user_is_vip', userIsVip ? 'true' : 'false');
      localStorage.setItem('vocaflow_user_vip_tier', userVipTier);
      localStorage.setItem('vocaflow_user_vip_expires_at', userVipExpiresAt.toString());
      if (userVipExpiresAt > 0) {
        localStorage.setItem(STORAGE_KEY_VIP_HIGH_WATER, userVipExpiresAt.toString());
      }

      if (currentUser) {
        currentUser.isVip = userIsVip;
        currentUser.vipTier = userVipTier;
        currentUser.vipExpiresAt = userVipExpiresAt;
        localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(currentUser));
      }

      updateAuthUI();
      refreshAdminVipUI();
      if (typeof updateAiChatQuotaUI === 'function') updateAiChatQuotaUI();
      if (userIsVip && typeof purgeAllAdArtifactsFromDOM === 'function') purgeAllAdArtifactsFromDOM();
      if (typeof initMonetagPassiveAds === 'function') initMonetagPassiveAds();
      if (userIsVip && typeof autoPostMilestoneToCommunity === 'function') {
        const lastVipPost = localStorage.getItem('vocaflow_last_vip_auto_post_tier');
        if (lastVipPost !== userVipTier) {
          localStorage.setItem('vocaflow_last_vip_auto_post_tier', userVipTier);
          autoPostMilestoneToCommunity('vip_upgrade', { tier: userVipTier });
        }
      }
      return { userIsVip, userVipTier, userVipExpiresAt };
    }

    // Auto-heal regression: checks if user had VIP around 31/8/2027 that was reverted from 3/9/2027
    function autoHealVipRegression() {
      try {
        const storedExp = parseInt(localStorage.getItem('vocaflow_user_vip_expires_at') || '0', 10);
        const storedTier = localStorage.getItem('vocaflow_user_vip_tier') || 'none';
        
        // Target: 2027-09-03 23:59:59 (1820015999000 ms)
        const sept03_2027 = 1820015999000;
        const aug25_2027  = 1819152000000;
        const sept05_2027 = 1820188800000;

        // If user is yearly VIP expiring between Aug 25, 2027 and Sept 05, 2027:
        // Automatically restore their full extended date to at least Sept 03, 2027!
        if (storedTier === 'yearly' && storedExp >= aug25_2027 && storedExp < sept03_2027) {
          console.log('ðŸ‘‘ [VocaFlow VIP Engine] Auto-healing VIP expiration to 2027-09-03 (+3 days recovered from lucky wheel)');
          applyVipState(true, 'yearly', sept03_2027, 'auto_heal_lucky_wheel', false);
          if (currentUser && currentUser.uid && !currentUser.uid.startsWith('guest_')) {
            if (typeof pushCurrentDatabaseToCloud === 'function') {
              pushCurrentDatabaseToCloud();
            }
          }
        }
      } catch (e) {
        console.warn('VIP auto-heal check exception:', e);
      }
    }

    function isUserVip() {
      if (adminVipOverride) return true;
      if (!currentUser || !currentUser.uid || currentUser.uid.startsWith('guest_')) {
        return adminVipOverride;
      }
      if (userIsVip) {
        if (userVipTier === 'lifetime') return true;
        const effectiveExp = Math.max(userVipExpiresAt || 0, getVipHighWaterExp());
        if (effectiveExp && effectiveExp > Date.now()) return true;
        // Expired check: Purge and Lock all VIP state immediately
        userIsVip = false;
        userVipTier = 'none';
        userVipExpiresAt = 0;
        localStorage.setItem('vocaflow_user_is_vip', 'false');
        localStorage.setItem('vocaflow_user_vip_tier', 'none');
        localStorage.setItem('vocaflow_user_vip_expires_at', '0');
        localStorage.removeItem(STORAGE_KEY_VIP_HIGH_WATER);
        if (currentUser) {
          currentUser.isVip = false;
          currentUser.vipTier = 'none';
          currentUser.vipExpiresAt = 0;
          localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(currentUser));
        }
        return false;
      }
      return false;
    }
    window.isUserVip = isUserVip;

    function getUserVipTier() {
      if (adminVipOverride) return userVipTier !== 'none' ? userVipTier : 'lifetime';
      return isUserVip() ? userVipTier : 'none';
    }
    window.getUserVipTier = getUserVipTier;

    function setAdminVipStatus(enable, tier = 'lifetime', durationDays = 0) {
      adminVipOverride = enable;
      localStorage.setItem('vocaflow_admin_vip_override', enable ? 'true' : 'false');
      
      const exp = (enable && durationDays > 0) ? (Date.now() + durationDays * 86400000) : 0;
      applyVipState(enable, enable ? tier : 'none', exp, 'admin_override', true);

      if (currentUser && currentUser.uid && !currentUser.uid.startsWith('guest_')) {
        pushCurrentDatabaseToCloud();
      }

      updateAuthUI();
      refreshAdminVipUI();
      if (typeof updateAiChatQuotaUI === 'function') updateAiChatQuotaUI();
      showToast(enable ? `ðŸ‘‘ ÄÃ£ kÃ­ch hoáº¡t cháº¿ Ä‘á»™ VIP (${tier.toUpperCase()}) thÃ nh cÃ´ng!` : 'âŒ ÄÃ£ táº¯t cháº¿ Ä‘á»™ VIP (TÃ i khoáº£n vá» tráº¡ng thÃ¡i ThÆ°á»ng)');
    }
    function toggleAdminVipStatus() {
      setAdminVipStatus(!adminVipOverride, 'lifetime');
    }

    function setAdminVipTier(tier) {
      const days = tier === 'monthly' ? 30 : (tier === 'yearly' ? 365 : 0);
      setAdminVipStatus(true, tier, days);
    }

    function disableAdminVipStatus() {
      setAdminVipStatus(false, 'none', 0);
    }

    function refreshAdminVipUI() {
      const badge = document.getElementById('admin-vip-status-badge');
      const btnToggle = document.getElementById('btn-admin-toggle-vip');
      const active = isUserVip();
      const tier = getUserVipTier();

      if (badge) {
        if (active) {
          badge.textContent = `👑 VIP ĐANG BẬT (${tier.toUpperCase()})`;
          badge.style.background = 'rgba(245, 158, 11, 0.2)';
          badge.style.color = '#fbbf24';
          badge.style.border = '1px solid rgba(245, 158, 11, 0.4)';
        } else {
          badge.textContent = '⚪ Chưa kích hoạt VIP';
          badge.style.background = 'rgba(100, 116, 139, 0.2)';
          badge.style.color = '#94a3b8';
          badge.style.border = '1px solid rgba(100, 116, 139, 0.3)';
        }
      }

      if (btnToggle) {
        if (active) {
          btnToggle.textContent = '❌ Tắt Chế Độ VocaVIP';
          btnToggle.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        } else {
          btnToggle.textContent = '👑 Bật VocaVIP Thử Nghiệm';
          btnToggle.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        }
      }
    }

    async function refreshAiChatQuotaFromCloud() {
      if (typeof currentUser === 'undefined' || !currentUser || !currentUser.uid || currentUser.uid.startsWith('guest_')) return;
      try {
        checkResetAiChatDailyQuota();
        const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
        const authParam = (currentUser && currentUser.idToken) ? '?auth=' + currentUser.idToken : '';
        const res = await fetch(`${rtdbUrl}/users/${currentUser.uid}/aiChatQuota.json${authParam}`);
        if (res.ok) {
          const cloudQuota = await res.json();
          if (cloudQuota && typeof cloudQuota === 'object') {
            const cloudDate = cloudQuota.dailyDate;
            const cloudCount = Number(cloudQuota.dailyCount) || 0;
            const today = getTodayDateString();

            if (cloudDate === today) {
              aiChatDailyDate = today;
              aiChatDailyCount = Math.max(aiChatDailyCount, cloudCount);
            } else if (cloudDate && cloudDate > aiChatDailyDate) {
              aiChatDailyDate = cloudDate;
              aiChatDailyCount = (cloudDate === today) ? cloudCount : 0;
            }

            localStorage.setItem('vocaflow_ai_chat_daily_date', aiChatDailyDate);
            localStorage.setItem('vocaflow_ai_chat_daily_count', aiChatDailyCount.toString());
            if (typeof updateAiChatQuotaUI === 'function') updateAiChatQuotaUI();
          }
        }
      } catch (e) {
        console.warn('AI Quota background refresh note:', e);
      }
    }

    // =========================================================================
    // VOCAFLOW SOUND EFFECTS (SFX) & AUDIO ENGINE (v0.0.10.3j)
    // =========================================================================
    const STORAGE_KEY_SFX_ENABLED = 'vocaflow_sfx_enabled';
    const STORAGE_KEY_SFX_VOLUME = 'vocaflow_sfx_volume';

    let sfxEnabledSetting = localStorage.getItem(STORAGE_KEY_SFX_ENABLED) !== 'false';
    let sfxVolumeSetting = localStorage.getItem(STORAGE_KEY_SFX_VOLUME) !== null ? parseFloat(localStorage.getItem(STORAGE_KEY_SFX_VOLUME)) : 0.8;

    const VOCA_SFX = {
      fireworks: new Audio('./audio/sfx_fireworks.mp3'),
      correct: new Audio('./audio/sfx_correct.mp3'),
      wrong: new Audio('./audio/sfx_wrong.mp3'),
      skip: new Audio('./audio/sfx_skip.mp3'),
      purchase: new Audio('./audio/sfx_purchase.mp3')
    };

    function toggleSfxSetting(val) {
      sfxEnabledSetting = !!val;
      localStorage.setItem(STORAGE_KEY_SFX_ENABLED, sfxEnabledSetting.toString());
      const volCont = document.getElementById('settings-sfx-volume-container');
      if (volCont) volCont.style.opacity = sfxEnabledSetting ? '1' : '0.5';
      if (sfxEnabledSetting) {
        playVocaSfx('purchase');
      }
    }

    function updateSfxVolumeSetting(val) {
      const num = parseInt(val, 10) || 0;
      sfxVolumeSetting = Math.max(0, Math.min(100, num)) / 100;
      localStorage.setItem(STORAGE_KEY_SFX_VOLUME, sfxVolumeSetting.toString());
      const lbl = document.getElementById('settings-sfx-volume-label');
      if (lbl) lbl.textContent = Math.round(sfxVolumeSetting * 100) + '%';
      if (sfxEnabledSetting) {
        playVocaSfx('correct');
      }
    }

    function playVocaSfx(name, loop = false) {
      if (!sfxEnabledSetting) return;
      try {
        const baseAudio = VOCA_SFX[name];
        if (baseAudio) {
          if (loop) {
            baseAudio.loop = true;
            baseAudio.volume = sfxVolumeSetting;
            baseAudio.currentTime = 0;
            baseAudio.play().catch(() => {});
          } else {
            const snd = baseAudio.cloneNode();
            snd.volume = sfxVolumeSetting;
            snd.play().catch(() => {});
          }
        }
      } catch (e) {}
    }

    function stopVocaSfx(name) {
      try {
        const snd = VOCA_SFX[name];
        if (snd) {
          snd.pause();
          snd.currentTime = 0;
        }
      } catch (e) {}
    }

    function stopAllAudio() {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      Object.keys(VOCA_SFX).forEach(k => stopVocaSfx(k));
    }

    let studySourceContext = 'deck';
    let quizIsCompleted = false;
    let spellingIsCompleted = false;

    // =========================================================================
    // STUDY SESSION ECONOMY: DECK SIZE SCALING & QUIT PENALTY (v0.0.10.3l)
    // =========================================================================
    function getSessionDeckSizeMultiplier(learnedCount) {
      const n = learnedCount || 0;
      if (n <= 5) return 0.8;
      if (n <= 10) return 0.9;
      if (n <= 25) return 1.0;
      if (n <= 45) return 1.1;
      if (n <= 70) return 1.2;
      return 1.3; // > 70 words
    }

    function getIncompleteSessionMultiplier(doneCount, totalCount) {
      const total = totalCount || 1;
      const done = Math.max(0, doneCount || 0);

      if (studySourceContext === 'review-queue' || (total >= 50 && done >= 15)) {
        return 1.0;
      }

      if (done >= 30) return 1.0;
      if (done >= 15) return 0.85;
      if (done >= 8) return 0.7;
      if (done >= 4) return 0.5;

      const ratio = done / total;
      if (ratio >= 0.8) return 0.9;
      if (ratio >= 0.5) return 0.75;
      if (ratio >= 0.33) return 0.5;
      return 0.25;
    }

    function getSessionMilestoneBonus(doneCount) {
      if (doneCount >= 100) return 150;
      if (doneCount >= 70) return 75;
      if (doneCount >= 50) return 40;
      if (doneCount >= 25) return 15;
      return 0;
    }

    function calculateSessionFinalPoints(basePoints, doneCount, totalCount, isCompleted = false) {
      const total = totalCount || 1;
      const done = isCompleted ? total : Math.min(total, Math.max(0, doneCount || 0));

      let completionMult = isCompleted ? 1.0 : getIncompleteSessionMultiplier(done, total);
      let deckLengthMult = getSessionDeckSizeMultiplier(done);
      let milestoneBonus = (basePoints > 0) ? getSessionMilestoneBonus(done) : 0;

      const isVip = isUserVip();
      if (isVip) {
        completionMult = Math.round((completionMult + 0.1) * 1000) / 1000;
        deckLengthMult = Math.round((deckLengthMult + 0.1) * 1000) / 1000;
        if (milestoneBonus > 0) {
          milestoneBonus = Math.round(milestoneBonus * 1.1);
        }
      }

      const combinedMult = Math.round((completionMult * deckLengthMult) * 1000) / 1000;

      let finalPts = 0;
      if (basePoints > 0) {
        finalPts = Math.round(basePoints * combinedMult) + milestoneBonus;
        // balance_vip: VIP earns +150% coins
        if (isVip) {
          finalPts = Math.round(finalPts * 1.5);
        }
      } else if (basePoints < 0) {
        if (done <= 5) {
          const divisor = Math.max(0.1, combinedMult);
          finalPts = Math.min(basePoints, Math.round(basePoints / divisor));
        } else {
          finalPts = basePoints;
        }
        // balance_vip: Early quit penalty mitigated by 125% (penalized 20% less / divided by 1.25)
        if (isVip) {
          finalPts = Math.round(finalPts / 1.25);
        }
      }

      return {
        finalPts,
        completionMult,
        deckLengthMult,
        combinedMult,
        milestoneBonus,
        isVipBonus: isVip,
        done,
        total
      };
    }

    // =========================================================================
    // STUDY SESSION EARLY EXIT CONFIRMATION & SETTLEMENT ENGINE (v0.10.9-alpha-23)
    // =========================================================================
    let pendingStudyEarlyExitCallback = null;

    function promptStudyEarlyExit({ mode, done, total, basePoints, onConfirmExit }) {
      // If user hasn't made any progress (done === 0 and 0 points), exit immediately without warning
      if ((done <= 0 && basePoints === 0) || !total) {
        if (typeof onConfirmExit === 'function') onConfirmExit();
        return;
      }

      // Calculate Balance v2 / VIP (Official)
      const resV2 = calculateSessionFinalPoints(basePoints, done, total, false);

      // Calculate Balance v1 (Legacy comparison)
      const v1Mult = getIncompleteSessionMultiplier(done, total);
      let v1Pts = 0;
      if (basePoints > 0) {
        v1Pts = Math.round(basePoints * v1Mult);
      } else if (basePoints < 0) {
        v1Pts = Math.min(basePoints, Math.round(basePoints / Math.max(0.2, v1Mult)));
      }

      // Store callback
      pendingStudyEarlyExitCallback = onConfirmExit;

      // Update Modal UI
      const modal = document.getElementById('modal-study-exit-confirm');
      if (!modal) {
        // Fallback: If modal element not found, use friendly native confirm
        const signV2 = resV2.finalPts >= 0 ? '+' : '';
        const signV1 = v1Pts >= 0 ? '+' : '';
        const vipPerkText = resV2.isVipBonus ? ' (👑 Balance VIP: Thưởng Xu 150%, Giảm phạt 125%)' : '';
        const msg = `⚠️ Bạn đang làm dở bài học (${done}/${total} từ)!\n\n` +
          `• Theo Balance v2 (Chính thức): Bạn sẽ nhận ${signV2}${resV2.finalPts} VoCoin (Hoàn thành x${resV2.completionMult}, Quy mô x${resV2.deckLengthMult}${resV2.milestoneBonus > 0 ? ', Thưởng mốc +' + resV2.milestoneBonus + 'đ' : ''})${vipPerkText}\n` +
          `• Theo Balance v1 (Gốc): ${signV1}${v1Pts} VoCoin (x${v1Mult})\n\n` +
          `Bạn có chắc chắn muốn thoát dở dang ngay lúc này không?`;
        if (window.confirm(msg)) {
          if (typeof onConfirmExit === 'function') onConfirmExit();
        }
        return;
      }

      const modeTitles = {
        quiz: 'bài Trắc Nghiệm (Quiz)',
        spelling: 'bài Luyện Viết (Spelling)',
        speaking: 'bài Luyện Nói (Speaking)',
        autofc: 'phiên Auto Flashcard'
      };
      const titleEl = document.getElementById('study-exit-modal-title');
      if (titleEl) titleEl.textContent = `Bạn Đang Làm Dở ${modeTitles[mode] || 'Bài Học'}!`;

      const pct = Math.round((done / total) * 100);
      const progEl = document.getElementById('study-exit-progress-text');
      if (progEl) progEl.textContent = `${done} / ${total} ${mode === 'quiz' ? 'câu' : (mode === 'autofc' ? 'thẻ' : 'từ')} (${pct}%)`;

      const basePtsEl = document.getElementById('study-exit-base-points-text');
      if (basePtsEl) {
        basePtsEl.textContent = `${basePoints >= 0 ? '+' : ''}${basePoints} VoCoin`;
        basePtsEl.style.color = basePoints >= 0 ? '#34d399' : '#f87171';
      }

      const v2Badge = document.getElementById('study-exit-v2-badge');
      if (v2Badge) {
        v2Badge.textContent = `${resV2.finalPts >= 0 ? '+' : ''}${resV2.finalPts} VoCoin`;
        v2Badge.style.background = resV2.finalPts >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
        v2Badge.style.color = resV2.finalPts >= 0 ? '#34d399' : '#f87171';
        v2Badge.style.borderColor = resV2.finalPts >= 0 ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)';
      }

      const multEl = document.getElementById('study-exit-v2-mult');
      if (multEl) multEl.textContent = `x${resV2.completionMult}`;

      const deckMultEl = document.getElementById('study-exit-v2-deck-mult');
      if (deckMultEl) deckMultEl.textContent = `x${resV2.deckLengthMult}`;

      const milestoneEl = document.getElementById('study-exit-v2-milestone');
      if (milestoneEl) {
        const vipNote = resV2.isVipBonus ? ' (👑 VIP x1.5 Xu / -125% phạt)' : '';
        milestoneEl.textContent = `+${resV2.milestoneBonus} VoCoin${vipNote}`;
      }

      const v1ResEl = document.getElementById('study-exit-v1-result');
      if (v1ResEl) {
        v1ResEl.textContent = `${v1Pts >= 0 ? '+' : ''}${v1Pts} VoCoin (x${v1Mult})`;
      }

      const confirmBtn = document.getElementById('btn-study-confirm-exit');
      if (confirmBtn) {
        if (resV2.finalPts < 0) {
          confirmBtn.textContent = `🚪 Thoát (Bị trừ ${Math.abs(resV2.finalPts)} Xu)`;
        } else if (resV2.finalPts > 0) {
          confirmBtn.textContent = `🚪 Thoát (Nhận +${resV2.finalPts} Xu)`;
        } else {
          confirmBtn.textContent = `🚪 Vẫn Muốn Thoát`;
        }
      }

      openModal('modal-study-exit-confirm');
    }
    window.promptStudyEarlyExit = promptStudyEarlyExit;

    function cancelStudyEarlyExit() {
      closeModal('modal-study-exit-confirm');
      pendingStudyEarlyExitCallback = null;
    }
    window.cancelStudyEarlyExit = cancelStudyEarlyExit;

    function executeStudyEarlyExit() {
      closeModal('modal-study-exit-confirm');
      if (typeof pendingStudyEarlyExitCallback === 'function') {
        const cb = pendingStudyEarlyExitCallback;
        pendingStudyEarlyExitCallback = null;
        cb();
      }
    }
    window.executeStudyEarlyExit = executeStudyEarlyExit;

    // =========================================================================
    // CORE STORAGE KEYS & SETTINGS STATE (v0.10.8-alpha-10.3)
    // =========================================================================
    const STORAGE_KEY_DECKS = 'vocaflow_decks';
    const STORAGE_KEY_WORDS = 'vocaflow_words';
    const STORAGE_KEY_THEME = 'vocaflow_theme';
    const STORAGE_KEY_SPEECH_RATE = 'vocaflow_speech_rate';
    const STORAGE_KEY_SPEECH_RATE_EN = 'vocaflow_speech_rate_en';
    const STORAGE_KEY_SPEECH_RATE_VI = 'vocaflow_speech_rate_vi';
    const STORAGE_KEY_SHOW_TIMESTAMP = 'vocaflow_show_timestamp';
    const STORAGE_KEY_AUTO_DELAY = 'vocaflow_auto_delay';
    const STORAGE_KEY_GEMINI_KEY = 'vocaflow_gemini_api_key';
    const STORAGE_KEY_GEMINI_KEYS = 'vocaflow_gemini_api_keys';

    let currentSpeechRateEn = parseFloat(localStorage.getItem(STORAGE_KEY_SPEECH_RATE_EN)) || parseFloat(localStorage.getItem(STORAGE_KEY_SPEECH_RATE)) || 0.9;
    let currentSpeechRateVi = parseFloat(localStorage.getItem(STORAGE_KEY_SPEECH_RATE_VI)) || 1.0;
    let showTimestampSetting = localStorage.getItem(STORAGE_KEY_SHOW_TIMESTAMP) !== 'false';
    let autoDelaySeconds = parseFloat(localStorage.getItem(STORAGE_KEY_AUTO_DELAY)) || 1.0;

    const STORAGE_KEY_SHOW_REVIEW_QUEUE = 'vocaflow_show_review_queue';
    const STORAGE_KEY_SHOW_FILTER_POS = 'vocaflow_show_filter_pos';
    const STORAGE_KEY_SHOW_FILTER_CEFR = 'vocaflow_show_filter_cefr';
    const STORAGE_KEY_SHOW_FILTER_SCORE = 'vocaflow_show_filter_score';
    const STORAGE_KEY_SETTINGS_TIME = 'vocaflow_settings_updated_at';

    let showReviewQueueSetting = localStorage.getItem(STORAGE_KEY_SHOW_REVIEW_QUEUE) !== 'false';
    let showFilterPosSetting = localStorage.getItem(STORAGE_KEY_SHOW_FILTER_POS) !== 'false';
    let showFilterCefrSetting = localStorage.getItem(STORAGE_KEY_SHOW_FILTER_CEFR) !== 'false';
    let showFilterScoreSetting = localStorage.getItem(STORAGE_KEY_SHOW_FILTER_SCORE) !== 'false';

    function toggleShowReviewQueueSetting(val) {
      showReviewQueueSetting = !!val;
      localStorage.setItem(STORAGE_KEY_SHOW_REVIEW_QUEUE, showReviewQueueSetting.toString());
      localStorage.setItem(STORAGE_KEY_SETTINGS_TIME, Date.now().toString());
      applyUiFilterSettings();
      if (typeof syncSettingsToCloud === 'function') syncSettingsToCloud();
    }

    function toggleShowFilterPosSetting(val) {
      showFilterPosSetting = !!val;
      localStorage.setItem(STORAGE_KEY_SHOW_FILTER_POS, showFilterPosSetting.toString());
      localStorage.setItem(STORAGE_KEY_SETTINGS_TIME, Date.now().toString());
      applyUiFilterSettings();
      if (typeof syncSettingsToCloud === 'function') syncSettingsToCloud();
    }

    function toggleShowFilterCefrSetting(val) {
      showFilterCefrSetting = !!val;
      localStorage.setItem(STORAGE_KEY_SHOW_FILTER_CEFR, showFilterCefrSetting.toString());
      localStorage.setItem(STORAGE_KEY_SETTINGS_TIME, Date.now().toString());
      applyUiFilterSettings();
      if (typeof syncSettingsToCloud === 'function') syncSettingsToCloud();
    }

    function toggleShowFilterScoreSetting(val) {
      showFilterScoreSetting = !!val;
      localStorage.setItem(STORAGE_KEY_SHOW_FILTER_SCORE, showFilterScoreSetting.toString());
      localStorage.setItem(STORAGE_KEY_SETTINGS_TIME, Date.now().toString());
      applyUiFilterSettings();
      if (typeof syncSettingsToCloud === 'function') syncSettingsToCloud();
    }

    function applyUiFilterSettings() {
      const posSelect = document.getElementById('filter-word-pos-select');
      const cefrSelect = document.getElementById('filter-word-cefr-select');
      const scoreBtn = document.getElementById('btn-toggle-mastery-slider');
      const scorePanel = document.getElementById('mastery-slider-panel');
      const reviewQueueBanner = document.getElementById('daily-review-banner-container');
      const filterControlsRow = document.querySelector('.deck-filter-controls-row');

      if (posSelect) posSelect.style.display = showFilterPosSetting ? '' : 'none';
      if (cefrSelect) cefrSelect.style.display = showFilterCefrSetting ? '' : 'none';
      if (scoreBtn) scoreBtn.style.display = showFilterScoreSetting ? '' : 'none';
      if (!showFilterScoreSetting && scorePanel) scorePanel.style.display = 'none';

      if (filterControlsRow) {
        filterControlsRow.style.display = (showFilterPosSetting || showFilterCefrSetting || showFilterScoreSetting) ? '' : 'none';
      }

      if (reviewQueueBanner) {
        if (!showReviewQueueSetting) {
          reviewQueueBanner.style.display = 'none';
        } else {
          reviewQueueBanner.style.display = 'block';
          if (typeof renderDailyReviewBanner === 'function') renderDailyReviewBanner();
        }
      }
    }

    // Date formatting helpers
    function formatDateTime(isoString) {
      if (!isoString) return '';
      try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return '';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
      } catch (e) {
        return '';
      }
    }

    function formatDateOnly(isoString) {
      if (!isoString) return '';
      try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return '';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      } catch (e) {
        return '';
      }
    }

    function formatTimeAgo(isoStringOrDate) {
      if (!isoStringOrDate) return 'Vừa xong';
      try {
        const date = (isoStringOrDate instanceof Date) ? isoStringOrDate : new Date(isoStringOrDate);
        if (isNaN(date.getTime())) return 'Vừa xong';
        const now = new Date();
        const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffSec < 0 || diffSec < 60) return 'Vừa xong';
        if (diffSec < 3600) {
          const m = Math.floor(diffSec / 60);
          return `${m} phút trước`;
        }

        const isSameDay = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        if (isSameDay) {
          const h = Math.floor(diffSec / 3600);
          return `${h} giờ trước`;
        }

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();
        
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        if (isYesterday) {
          return `Hôm qua lúc ${hours}:${minutes}`;
        }

        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();

        if (year === now.getFullYear()) {
          return `${day} tháng ${month} lúc ${hours}:${minutes}`;
        }
        return `${day} tháng ${month}, ${year} lúc ${hours}:${minutes}`;
      } catch (e) {
        return 'Vừa xong';
      }
    }
    window.formatTimeAgo = formatTimeAgo;
    window.formatRelativeTime = formatTimeAgo;

    function formatFullExactDateTime(isoStringOrDate) {
      if (!isoStringOrDate) return '';
      try {
        const date = (isoStringOrDate instanceof Date) ? isoStringOrDate : new Date(isoStringOrDate);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleString('vi-VN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      } catch (e) {
        return '';
      }
    }
    window.formatFullExactDateTime = formatFullExactDateTime;


    // =========================================================================
    // THEME & SETTINGS MODAL ENGINE (v0.10.8-alpha-10.3)
    // =========================================================================
    let currentTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'dark';

    function initTheme() {
      applyTheme(currentTheme);
      applyTimestampDisplay();
      if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
          if (currentTheme === 'system') {
            applyTheme('system');
          }
        });
      }
    }

    function setAppTheme(theme) {
      currentTheme = theme;
      localStorage.setItem(STORAGE_KEY_THEME, theme);
      applyTheme(theme);
      updateThemeRadio();
      const label = theme === 'light' ? 'Giao diện Sáng' : (theme === 'dark' ? 'Giao diện Tối' : 'Theo thiết bị');
      showToast(`Đã chuyển sang: ${label}`);
    }

    function applyTheme(theme) {
      let resolved = theme;
      if (theme === 'system') {
        const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        resolved = isDark ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', resolved);
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute('content', resolved === 'dark' ? '#0f172a' : '#ffffff');
      }
    }

    function updateThemeRadio() {
      const radio = document.querySelector(`input[name="app-theme"][value="${currentTheme}"]`);
      if (radio) radio.checked = true;
      document.querySelectorAll('.theme-card').forEach(card => {
        const r = card.querySelector('input[type="radio"]');
        card.classList.toggle('active', r && r.value === currentTheme);
      });
    }

    function openSettingsModal() {
      updateThemeRadio();
      
      const enSlider = document.getElementById('settings-speech-en-slider');
      const enLabel = document.getElementById('settings-speech-en-label');
      if (enSlider) enSlider.value = currentSpeechRateEn;
      if (enLabel) enLabel.textContent = `${currentSpeechRateEn.toFixed(1)}x`;

      const viSlider = document.getElementById('settings-speech-vi-slider');
      const viLabel = document.getElementById('settings-speech-vi-label');
      if (viSlider) viSlider.value = currentSpeechRateVi;
      if (viLabel) viLabel.textContent = `${currentSpeechRateVi.toFixed(1)}x`;

      const tsCheckbox = document.getElementById('settings-timestamp-checkbox');
      if (tsCheckbox) tsCheckbox.checked = showTimestampSetting;

      const reviewCb = document.getElementById('settings-review-queue-checkbox');
      if (reviewCb) reviewCb.checked = showReviewQueueSetting;

      const posCb = document.getElementById('settings-filter-pos-checkbox');
      if (posCb) posCb.checked = showFilterPosSetting;

      const cefrCb = document.getElementById('settings-filter-cefr-checkbox');
      if (cefrCb) cefrCb.checked = showFilterCefrSetting;

      const scoreCb = document.getElementById('settings-filter-score-checkbox');
      if (scoreCb) scoreCb.checked = showFilterScoreSetting;

      updateSettingsApiKeysUI();

      const memeChk = document.getElementById('setting-vip-cat-meme');
      const durationSlider = document.getElementById('setting-vip-cat-meme-duration');
      const durationLabel = document.getElementById('vip-cat-meme-duration-label');
      const durationCont = document.getElementById('setting-vip-cat-meme-duration-container');
      if (memeChk) {
        const memeEnabled = localStorage.getItem('vocaflow_vip_cat_memes_enabled');
        const isEnabled = (memeEnabled !== 'false');
        memeChk.checked = isEnabled;
        if (durationCont) {
          durationCont.style.opacity = isEnabled ? '1' : '0.4';
          durationCont.style.pointerEvents = isEnabled ? 'auto' : 'none';
        }
      }
      if (durationSlider) {
        const savedDuration = parseFloat(localStorage.getItem('vocaflow_vip_cat_memes_duration') || '2.5') || 2.5;
        durationSlider.value = savedDuration;
        if (durationLabel) {
          durationLabel.textContent = `${savedDuration.toFixed(1)} giây`;
        }
      }
      // Hide Meme Mèo setting for non-VIP users (v0.10.8-alpha-10.10)
      const memeGroup = document.getElementById('setting-vip-cat-meme-group');
      if (memeGroup) {
        const isVipActive = (userIsVip === true || userIsVip === 'true' || (typeof currentUser !== 'undefined' && currentUser && currentUser.isVip === true));
        memeGroup.style.display = isVipActive ? 'block' : 'none';
      }
      // Dynamically sync app version in settings modal (v0.10.9-alpha-7)
      const verLabel = document.getElementById('settings-app-version-label');
      if (verLabel) verLabel.textContent = VOCAFLOW_APP_FULL_TITLE;
      openModal('modal-settings');
    }

    function updateSpeechRateEn(val) {
      currentSpeechRateEn = parseFloat(val) || 0.9;
      localStorage.setItem(STORAGE_KEY_SPEECH_RATE_EN, currentSpeechRateEn);
      localStorage.setItem(STORAGE_KEY_SPEECH_RATE, currentSpeechRateEn);
      const enLabel = document.getElementById('settings-speech-en-label');
      if (enLabel) enLabel.textContent = `${currentSpeechRateEn.toFixed(1)}x`;
      const afcEnLabel = document.getElementById('autofc-speed-en-label');
      if (afcEnLabel) afcEnLabel.textContent = `${currentSpeechRateEn.toFixed(1)}x`;
      const afcEnSlider = document.getElementById('autofc-speed-en-slider');
      if (afcEnSlider) afcEnSlider.value = currentSpeechRateEn;
    }

    function updateSpeechRateVi(val) {
      currentSpeechRateVi = parseFloat(val) || 1.0;
      localStorage.setItem(STORAGE_KEY_SPEECH_RATE_VI, currentSpeechRateVi);
      const viLabel = document.getElementById('settings-speech-vi-label');
      if (viLabel) viLabel.textContent = `${currentSpeechRateVi.toFixed(1)}x`;
      const afcViLabel = document.getElementById('autofc-speed-vi-label');
      if (afcViLabel) afcViLabel.textContent = `${currentSpeechRateVi.toFixed(1)}x`;
      const afcViSlider = document.getElementById('autofc-speed-vi-slider');
      if (afcViSlider) afcViSlider.value = currentSpeechRateVi;
    }

    function updateAutoDelay(val) {
      autoDelaySeconds = parseFloat(val) || 1.0;
      localStorage.setItem(STORAGE_KEY_AUTO_DELAY, autoDelaySeconds);
      const delayLabel = document.getElementById('autofc-delay-label');
      if (delayLabel) delayLabel.textContent = `${autoDelaySeconds.toFixed(1)}s`;
    }

    function toggleShowTimestampSetting(checked) {
      showTimestampSetting = checked;
      localStorage.setItem(STORAGE_KEY_SHOW_TIMESTAMP, showTimestampSetting ? 'true' : 'false');
      localStorage.setItem(STORAGE_KEY_SETTINGS_TIME, Date.now().toString());
      applyTimestampDisplay();
      if (typeof syncSettingsToCloud === 'function') {
        syncSettingsToCloud();
      }
    }

    function applyTimestampDisplay() {
      if (showTimestampSetting) {
        document.body.classList.remove('hide-timestamps');
      } else {
        document.body.classList.add('hide-timestamps');
      }
      const tsCheckbox = document.getElementById('settings-timestamp-checkbox');
      if (tsCheckbox) tsCheckbox.checked = showTimestampSetting;
    }


    // Mobile Header 3-Dots Menu Logic (v0.0.8.6)
    function toggleHeaderMoreMenu(e) {
      if (e) e.stopPropagation();
      const menu = document.getElementById('header-more-dropdown');
      if (!menu) return;
      const isOpen = menu.style.display === 'block';
      menu.style.display = isOpen ? 'none' : 'block';
    }

    function closeHeaderMoreMenu() {
      const menu = document.getElementById('header-more-dropdown');
      if (menu) menu.style.display = 'none';
    }

    // Auto close header dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const wrapper = document.querySelector('.mobile-more-wrapper');
      if (wrapper && !wrapper.contains(e.target)) {
        closeHeaderMoreMenu();
      }
    });

    // Dynamic responsive header compacting (v0.10.9-alpha-26)
    function adjustHeaderResponsiveLayout() {
      const headerEl = document.querySelector('header');
      if (!headerEl) return;
      if (window.innerWidth <= 768) {
        headerEl.classList.add('compact-header');
      } else {
        headerEl.classList.remove('compact-header');
      }
    }
    window.addEventListener('resize', adjustHeaderResponsiveLayout);
    window.addEventListener('DOMContentLoaded', adjustHeaderResponsiveLayout);

    // In-memory Database State & Tombstone Tracking (v0.0.8.15)
    let decks = [];
    let words = [];
    let deletedWordIds = new Set(JSON.parse(localStorage.getItem('vocaflow_deleted_words') || '[]'));
    let deletedDeckIds = new Set(JSON.parse(localStorage.getItem('vocaflow_deleted_decks') || '[]'));

    function saveDeletedTombstones() {
      localStorage.setItem('vocaflow_deleted_words', JSON.stringify(Array.from(deletedWordIds)));
      localStorage.setItem('vocaflow_deleted_decks', JSON.stringify(Array.from(deletedDeckIds)));
    }
    let currentDeckId = null;
    let currentWordFilter = 'all';
    let currentPosFilter = 'all';
    let currentCefrFilter = 'all';

    // Flashcard State
    let flashcardList = [];
    let flashcardIndex = 0;
    let currentFlashcardWord = null;

    // Quiz State (declared in Quiz Engine)

    // IPA Symbols Database
    const ipaData = {
      mono: ['iː', 'ɪ', 'ʊ', 'uː', 'e', 'ə', 'ɜː', 'ɔː', 'æ', 'ʌ', 'ɑː', 'ɒ'],
      dip: ['eɪ', 'aɪ', 'ɔɪ', 'əʊ', 'aʊ', 'ɪə', 'eə', 'ʊə'],
      cons: ['p', 'b', 't', 'd', 'tʃ', 'dʒ', 'k', 'ɡ', 'f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'm', 'n', 'ŋ', 'h', 'l', 'r', 'w', 'j'],
      spec: ['ˈ', 'ˌ', 'ː', '.', '/', '(', ')', '-']
    };
    let currentIpaTab = 'mono';

    // PWA Install Prompt & Service Worker Registration
    let deferredInstallPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      const installBtn = document.getElementById('btn-install-pwa');
      if (installBtn) installBtn.style.display = 'inline-flex';
    });

    function triggerPwaInstall() {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            const installBtn = document.getElementById('btn-install-pwa');
            if (installBtn) installBtn.style.display = 'none';
            showToast('🎉 Đã cài đặt VocaFlow thành công!');
          }
          deferredInstallPrompt = null;
        });
      } else {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isAndroid = /Android/.test(navigator.userAgent);
        if (isIOS) {
          alert('📱 HƯỚNG DẪN CÀI APP TRÊN IPHONE (SAFARI):\n\n1. Bấm nút Chia sẻ (biểu tượng hình vuông có mũi tên lên ở thanh công cụ dưới).\n2. Chọn "Thêm vào Màn hình chính" (Add to Home Screen).\n3. Bấm "Thêm" ở góc phải để tạo icon VocaFlow!');
        } else if (isAndroid) {
          alert('📱 HƯỚNG DẪN CÀI APP TRÊN ANDROID (CHROME):\n\n1. Bấm biểu tượng Menu 3 chấm (⋮) ở góc trên bên phải trình duyệt Chrome.\n2. Chọn "Cài đặt ứng dụng" (Install App) hoặc "Thêm vào màn hình chính".\n3. Bấm "Cài đặt" để đưa icon VocaFlow ra màn hình chính.');
        } else {
          alert('💻 HƯỚNG DẪN CÀI APP TRÊN MÁY TÍNH (CHROME / EDGE / WINDOWS):\n\n1. Nhìn lên thanh địa chỉ trình duyệt (ở góc phải bên cạnh thanh URL).\n2. Bấm vào biểu tượng 📲 "Cài đặt VocaFlow" (Install VocaFlow).\n3. Hoặc nhấn Menu 3 chấm (⋮) > "Ứng dụng" (Apps) > "Cài đặt VocaFlow" để dùng mượt mà như app Desktop!');
        }
      }
    }

    let hasPendingAppUpdate = false;
    function isUserInActiveStudySession() {
      const quizActive = document.getElementById('screen-quiz')?.classList.contains('active');
      const spellingActive = document.getElementById('screen-spelling')?.classList.contains('active');
      const autoFcActive = document.getElementById('screen-autofc')?.classList.contains('active');
      return !!(quizActive || spellingActive || autoFcActive);
    }

    function checkAndApplyPendingAppUpdate() {
      if (hasPendingAppUpdate) {
        showToast('🔄 Đang tải phiên bản cập nhật mới...');
        setTimeout(() => window.location.reload(), 800);
      }
    }

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((reg) => {
          console.log('SW Registered successfully:', reg.scope);
          reg.update().catch(() => {});
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  if (isUserInActiveStudySession()) {
                    hasPendingAppUpdate = true;
                    showToast('✨ Đã có bản cập nhật mới! Sẽ tự động làm mới khi bạn hoàn tất bài học.');
                  } else {
                    showToast('Đã phát hiện phiên bản mới! Đang tải lại...');
                    setTimeout(() => window.location.reload(), 1000);
                  }
                }
              };
            }
          };
        }).catch(err => console.log('SW Note:', err));

        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            if (isUserInActiveStudySession()) {
              hasPendingAppUpdate = true;
              console.log('Service Worker updated in background. Postponing reload until session exit.');
            } else {
              refreshing = true;
              window.location.reload();
            }
          }
        });
      });
    }

    // Firebase Auth & Cloud Sync State
    const STORAGE_KEY_AUTH = 'vocaflow_auth_user';
    const STORAGE_KEY_FIREBASE_CFG = 'vocaflow_firebase_cfg';
    const STORAGE_KEY_LAST_SYNC = 'vocaflow_last_sync_time';

    let currentUser = null;

    function isGuest() {
      return !currentUser || !currentUser.email || (currentUser.uid && currentUser.uid.startsWith('guest_'));
    }
    window.isGuest = isGuest;
    let firebaseConfig = {
      apiKey: "AIzaSyAM2KmHJzVLvd-oMbLj0AZKXeSiX-Hgv8I",
      authDomain: "vocaflow-e866c.firebaseapp.com",
      databaseURL: "https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app",
      projectId: "vocaflow-e866c",
      storageBucket: "vocaflow-e866c.firebasestorage.app",
      messagingSenderId: "123733506844",
      appId: "1:123733506844:web:6787f658b2999f557c98d9"
    };
    let isSyncing = false;

    // Economy, Hint & Skip Shop State (v0.0.8 -> v0.0.10.1c)
        // Realtime Inter-Tab Synchronization (v0.10.6c)
    const vocaSyncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('vocaflow_sync_channel') : null;
    if (vocaSyncChannel) {
      vocaSyncChannel.onmessage = (event) => {
        if (event.data && (event.data.type === 'ECONOMY_UPDATED' || event.data.type === 'LEDGER_UPDATED')) {
          updateEconomyUI();
          if (typeof updateLuckyWheelUI === 'function') updateLuckyWheelUI();
          if (typeof updateShopBonusesUI === 'function') updateShopBonusesUI();
          if (typeof renderLedgerList === 'function') renderLedgerList();
          if (typeof renderStudioDashboard === 'function') renderStudioDashboard();
        }
      };
    }

    function broadcastEconomyUpdate() {
      if (vocaSyncChannel) {
        try {
          vocaSyncChannel.postMessage({ type: 'ECONOMY_UPDATED', timestamp: Date.now() });
        } catch (e) {}
      }
    }

    const STORAGE_KEY_USER_POINTS = 'vocaflow_user_points';
    const STORAGE_KEY_USER_HINTS = 'vocaflow_user_hints';
    const STORAGE_KEY_USER_SKIPS = 'vocaflow_user_skips';
    const STORAGE_KEY_ECONOMY_TIME = 'vocaflow_economy_time';

    function getUserPoints() {
      const p = localStorage.getItem(STORAGE_KEY_USER_POINTS);
      return p !== null ? parseInt(p, 10) || 0 : 0;
    }

    function getUserHints() {
      const h = localStorage.getItem(STORAGE_KEY_USER_HINTS);
      if (h !== null) {
        return parseInt(h, 10) || 0;
      }
      localStorage.setItem(STORAGE_KEY_USER_HINTS, '5');
      return 5;
    }

    function getUserSkips() {
      const s = localStorage.getItem(STORAGE_KEY_USER_SKIPS);
      if (s !== null) {
        return parseInt(s, 10) || 0;
      }
      localStorage.setItem(STORAGE_KEY_USER_SKIPS, '3');
      return 3;
    }

    function setUserPoints(val) {
      const clean = Math.max(0, parseInt(val, 10) || 0);
      localStorage.setItem(STORAGE_KEY_USER_POINTS, clean.toString());
      localStorage.setItem(STORAGE_KEY_ECONOMY_TIME, Date.now().toString());
      updateEconomyUI();
      syncEconomyToCloud();
      broadcastEconomyUpdate();
    }

    function setUserHints(val) {
      const clean = Math.max(0, parseInt(val, 10) || 0);
      localStorage.setItem(STORAGE_KEY_USER_HINTS, clean.toString());
      localStorage.setItem(STORAGE_KEY_ECONOMY_TIME, Date.now().toString());
      updateEconomyUI();
      syncEconomyToCloud();
      broadcastEconomyUpdate();
    }

    function setUserSkips(val) {
      const clean = Math.max(0, parseInt(val, 10) || 0);
      localStorage.setItem(STORAGE_KEY_USER_SKIPS, clean.toString());
      localStorage.setItem(STORAGE_KEY_ECONOMY_TIME, Date.now().toString());
      updateEconomyUI();
      syncEconomyToCloud();
      broadcastEconomyUpdate();
    }

    // =========================================================================
    // NUMBER FORMATTING HELPER (v0.10.9-44 - THOUSANDS & MILLIONS SEPARATORS)
    // =========================================================================
    function formatNumber(num) {
      if (num === null || num === undefined || num === '') return '0';
      const n = Number(num);
      if (isNaN(n)) return String(num);
      return n.toLocaleString('en-US');
    }
    window.formatNumber = formatNumber;

    function formatPointsCompact(pts) {
      const n = Number(pts) || 0;
      if (n >= 1000000) {
        return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M VoCoin';
      }
      if (n >= 100000) {
        return (n / 1000).toFixed(0) + 'k VoCoin';
      }
      return formatNumber(n) + ' VoCoin';
    }
    window.formatPointsCompact = formatPointsCompact;

    // =========================================================================
    // ECONOMY & LEDGER HARD RESET MIGRATION (v0.10.6c)
    // =========================================================================
    function runEconomyMigrationV0104i() {
      const MIGRATION_KEY = 'vocaflow_migration_v00104i';
      if (localStorage.getItem(MIGRATION_KEY) !== 'done') {
        localStorage.setItem(STORAGE_KEY_USER_POINTS, '0');
        localStorage.setItem(STORAGE_KEY_USER_HINTS, '5');
        localStorage.setItem(STORAGE_KEY_USER_SKIPS, '3');
        localStorage.setItem('vocaflow_user_ledger', JSON.stringify([]));
        userLedger = [];
        localStorage.setItem(MIGRATION_KEY, 'done');
        updateEconomyUI();
        if (typeof renderLedgerList === 'function') renderLedgerList();
        if (typeof renderStudioDashboard === 'function') renderStudioDashboard();

        // Push clean reset to cloud if user is logged in
        if (currentUser && currentUser.uid && !currentUser.uid.startsWith('guest_') && firebaseConfig.databaseURL) {
          const authParam = (currentUser && currentUser.idToken) ? '?auth=' + currentUser.idToken : '';
          const rtdbUrl = firebaseConfig.databaseURL;
          fetch(`${rtdbUrl}/users/${currentUser.uid}/economy.json${authParam}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ points: 0, hints: 5, skips: 3, updatedAt: new Date().toISOString() })
          }).catch(() => {});
          fetch(`${rtdbUrl}/users/${currentUser.uid}/ledger.json${authParam}`, {
            method: 'DELETE'
          }).catch(() => {});
        }
      }
    }

    function updateEconomyUI() {
      const points = getUserPoints();
      const hints = getUserHints();
      const skips = getUserSkips();

      const headerPoints = document.getElementById('header-points-display');
      if (headerPoints) headerPoints.textContent = formatPointsCompact(points);

      const studioBal = document.getElementById('studio-wallet-balance');
      if (studioBal) studioBal.textContent = formatNumber(points) + ' VoCoin';

      const profPoints = document.getElementById('profile-user-points');
      if (profPoints) profPoints.textContent = formatNumber(points) + ' VoCoin';

      const shopPoints = document.getElementById('shop-user-points');
      if (shopPoints) shopPoints.textContent = formatNumber(points);

      const shopHints = document.getElementById('shop-user-hints');
      if (shopHints) shopHints.textContent = formatNumber(hints);

      const shopSkips = document.getElementById('shop-user-skips');
      if (shopSkips) shopSkips.textContent = formatNumber(skips);

      const quizWalletPoints = document.getElementById('quiz-wallet-points');
      if (quizWalletPoints) quizWalletPoints.textContent = `${formatNumber(points)} VoCoin`;

      const quizCardHintsCount = document.getElementById('quiz-card-hints-count');
      if (quizCardHintsCount) quizCardHintsCount.textContent = formatNumber(hints > 0 ? hints : 50);

      const quizCardSkipsCount = document.getElementById('quiz-card-skips-count');
      if (quizCardSkipsCount) quizCardSkipsCount.textContent = formatNumber(skips > 0 ? skips : 100);

      const spellingWalletPoints = document.getElementById('spelling-wallet-points');
      if (spellingWalletPoints) spellingWalletPoints.textContent = `${formatNumber(points)} VoCoin`;

      const spellingHintsCount = document.getElementById('spelling-hints-count');
      if (spellingHintsCount) spellingHintsCount.textContent = formatNumber(hints > 0 ? hints : 50);

      const spellingSkipsCount = document.getElementById('spelling-skips-count');
      if (spellingSkipsCount) spellingSkipsCount.textContent = formatNumber(skips > 0 ? skips : 100);
    }

    async function syncEconomyToCloud() {
      if (!currentUser || !currentUser.uid || !firebaseConfig.databaseURL) return;
      const token = typeof getFreshCloudAuthToken === 'function' ? await getFreshCloudAuthToken() : (currentUser && currentUser.idToken ? currentUser.idToken : '');
      const authParam = token ? `?auth=${token}` : '';
      try {
        const pts = getUserPoints();
        const hts = getUserHints();
        const sks = getUserSkips();
        const rawSpins = localStorage.getItem('vocaflow_lucky_spins_left');
        const sps = parseInt(rawSpins || '0', 10);
        const cleanSpins = Math.max(0, isNaN(sps) ? 0 : sps);
        const lastSpinDate = localStorage.getItem('vocaflow_last_spin_date') || getTodayString();
        const lastVipDate = localStorage.getItem('vocaflow_last_vip_spin_date') || '';
        const nowIso = new Date().toISOString();
        const payload = {
          points: pts,
          hints: hts,
          skips: sks,
          luckySpins: cleanSpins,
          luckySpinsDate: lastSpinDate,
          lastVipSpinDate: lastVipDate,
          flowFreezes: getUserFlowFreezes(),
          streakFreezes: getUserFlowFreezes(),
          flowFreezeDates: getFlowFreezeDates(),
          updatedAt: nowIso
        };
        const rtdbUrl = firebaseConfig.databaseURL;
        await Promise.allSettled([
          fetch(`${rtdbUrl}/users/${currentUser.uid}/economy.json${authParam}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }),
          fetch(`${rtdbUrl}/users/${currentUser.uid}/flowFreezeDates.json${authParam}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(getFlowFreezeDates())
          }),
          fetch(`${rtdbUrl}/users/${currentUser.uid}/lucky_spins_left.json${authParam}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cleanSpins)
          }),
          fetch(`${rtdbUrl}/users/${currentUser.uid}/profile/points.json${authParam}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pts)
          }),
          fetch(`${rtdbUrl}/users/${currentUser.uid}/points.json${authParam}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pts)
          }),
          fetch(`${rtdbUrl}/users/${currentUser.uid}/wallet/points.json${authParam}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pts)
          })
        ]);
      } catch (e) {
        console.warn('Sync economy to cloud note:', e);
      }
    }

    // =========================================================================
    // GRANULAR CLOUD SYNC & AI PAYLOAD SANITIZER (v0.10.9-alpha-31)
    // =========================================================================
    function sanitizeAiChatHistoryForCloud(history) {
      if (!Array.isArray(history)) return [];
      return history.slice(-30).map(msg => {
        if (!msg) return msg;
        const cleanMsg = { ...msg };
        if (Array.isArray(cleanMsg.images)) {
          cleanMsg.images = cleanMsg.images.map(img => {
            if (!img) return img;
            return {
              id: img.id || ('img_' + Date.now()),
              name: img.name || 'image.png',
              mimeType: img.mimeType || 'image/png',
              hasImage: true,
              previewUrl: img.previewUrl || null,
              base64: null // Strip heavy Base64 image payload from Cloud RTDB
            };
          });
        }
        return cleanMsg;
      });
    }

    async function syncSettingsToCloud() {
      if (!currentUser || !currentUser.uid || currentUser.uid.startsWith('guest_') || !firebaseConfig.databaseURL) return;
      const token = typeof getFreshCloudAuthToken === 'function' ? await getFreshCloudAuthToken() : (currentUser.idToken || '');
      const authParam = token ? `?auth=${token}` : '';
      const nowTs = Date.now();
      localStorage.setItem(STORAGE_KEY_SETTINGS_TIME, nowTs.toString());
      const payload = {
        showReviewQueue: showReviewQueueSetting,
        showFilterPos: showFilterPosSetting,
        showFilterCefr: showFilterCefrSetting,
        showFilterScore: showFilterScoreSetting,
        showTimestamp: showTimestampSetting,
        vipCatMemesEnabled: localStorage.getItem('vocaflow_vip_cat_memes_enabled') !== 'false',
        vipCatMemesDuration: parseFloat(localStorage.getItem('vocaflow_vip_cat_memes_duration') || '2.5'),
        updatedAt: nowTs
      };
      try {
        fetch(`${firebaseConfig.databaseURL}/users/${currentUser.uid}/settings.json${authParam}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});
      } catch (e) {}
    }

    async function syncFlowToCloud() {
      if (!currentUser || !currentUser.uid || currentUser.uid.startsWith('guest_') || !firebaseConfig.databaseURL) return;
      const token = typeof getFreshCloudAuthToken === 'function' ? await getFreshCloudAuthToken() : (currentUser.idToken || '');
      const authParam = token ? `?auth=${token}` : '';
      const flowInfo = calculateCurrentFlow();
      const payload = {
        days: flowInfo.currentFlow,
        pureDays: flowInfo.pureFlow,
        max: flowInfo.maxFlow,
        freezes: getUserFlowFreezes(),
        updatedAt: new Date().toISOString()
      };
      try {
        await Promise.allSettled([
          fetch(`${firebaseConfig.databaseURL}/users/${currentUser.uid}/flow.json${authParam}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }),
          fetch(`${firebaseConfig.databaseURL}/users/${currentUser.uid}/flowDates.json${authParam}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(getFlowDates())
          }),
          fetch(`${firebaseConfig.databaseURL}/users/${currentUser.uid}/flowFreezeDates.json${authParam}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(getFlowFreezeDates())
          })
        ]);
      } catch (e) {}
    }

    async function loadEconomyFromCloud() {
      if (!currentUser || !currentUser.uid || !firebaseConfig.databaseURL) return;
      const token = typeof getFreshCloudAuthToken === 'function' ? await getFreshCloudAuthToken() : (currentUser && currentUser.idToken ? currentUser.idToken : '');
      const authParam = token ? `?auth=${token}` : '';
      try {
        const res = await fetch(`${firebaseConfig.databaseURL}/users/${currentUser.uid}/economy.json${authParam}`);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object') {
            const remotePoints = typeof data.points === 'number' ? data.points : parseInt(data.points, 10);
            const remoteHints = typeof data.hints === 'number' ? data.hints : parseInt(data.hints, 10);
            const remoteSkips = typeof data.skips === 'number' ? data.skips : parseInt(data.skips, 10);
            const remoteSpins = typeof data.luckySpins === 'number' ? data.luckySpins : parseInt(data.luckySpins, 10);
            if (!isNaN(remotePoints)) localStorage.setItem(STORAGE_KEY_USER_POINTS, remotePoints.toString());
            if (!isNaN(remoteHints)) localStorage.setItem(STORAGE_KEY_USER_HINTS, remoteHints.toString());
            if (!isNaN(remoteSkips)) localStorage.setItem(STORAGE_KEY_USER_SKIPS, remoteSkips.toString());

            // TIMESTAMP GUARD: Protect local spins if updated recently or newer than remote
            const localEcoTime = parseInt(localStorage.getItem(STORAGE_KEY_ECONOMY_TIME) || '0', 10);
            const remoteEcoTime = data.updatedAt ? new Date(data.updatedAt).getTime() : 0;
            if (!isNaN(remoteSpins)) {
              if (localEcoTime > remoteEcoTime && (Date.now() - localEcoTime < 300000)) {
                // Local economy was updated recently (e.g. user spun), protect local spins
              } else {
                localStorage.setItem('vocaflow_lucky_spins_left', Math.max(0, remoteSpins).toString());
              }
            }
            if (data.luckySpinsDate) {
              localStorage.setItem('vocaflow_last_spin_date', data.luckySpinsDate);
            }
            if (data.lastVipSpinDate) {
              const localVipDate = localStorage.getItem('vocaflow_last_vip_spin_date') || '';
              if (!localVipDate || localVipDate < data.lastVipSpinDate) {
                localStorage.setItem('vocaflow_last_vip_spin_date', data.lastVipSpinDate);
              }
            }
            updateEconomyUI();
            if (typeof updateLuckyWheelUI === 'function') updateLuckyWheelUI();
            if (typeof updateShopBonusesUI === 'function') updateShopBonusesUI();
          }
        }
      } catch (e) {
        console.warn('Load economy error:', e);
      }
    }

    function openShopModal() {
      updateEconomyUI();
      updateShopBonusesUI();
      openModal('modal-shop');
      setTimeout(() => {
        const giftInput = document.getElementById('shop-gift-code-input');
        if (giftInput) {
          giftInput.focus();
          giftInput.select();
        }
      }, 60);
    }

        function buySkipsPackage(skipCount, basePoints) {
      const costPoints = applyStoreDiscountToPrice(basePoints);
      if (!currentUser || !currentUser.email) {
        alert('🔒 Bạn cần đăng nhập/đăng ký tài khoản để sử dụng VocaShop và lưu VoCoin thưởng!');
        closeModal('modal-shop');
        openAuthModal('login');
        return;
      }

      const currentPoints = getUserPoints();
      if (currentPoints < costPoints) {
        alert(`❌ Không đủ VoCoin!\nBạn đang có ${currentPoints} VoCoin, nhưng gói này cần ${costPoints} VoCoin.\nHãy hoàn thành các bài học để tích lũy thêm VoCoin nhé!`);
        return;
      }

      if (confirm(`Xác nhận đổi ${costPoints} VoCoin để lấy +${skipCount} VocaSkip?`)) {
        playVocaSfx('purchase');
        setUserPoints(currentPoints - costPoints);
        setUserSkips(getUserSkips() + skipCount);
        addLedgerEntry('BUY_SKIP', -costPoints, `Đổi +${skipCount} VocaSkip trong VocaShop`);
        showToast(`🎉 Đã đổi thành công +${skipCount} VocaSkip!`);
        updateEconomyUI();
      }
    }

    function buyHintsPackage(hintCount, basePoints) {
      const costPoints = applyStoreDiscountToPrice(basePoints);
      if (!currentUser || !currentUser.email) {
        alert('🔒 Bạn cần đăng nhập/đăng ký tài khoản để sử dụng VocaShop và lưu VoCoin thưởng!');
        closeModal('modal-shop');
        openAuthModal('login');
        return;
      }

      const currentPoints = getUserPoints();
      if (currentPoints < costPoints) {
        alert(`❌ Không đủ VoCoin!\nBạn đang có ${currentPoints} VoCoin, nhưng gói này cần ${costPoints} VoCoin.\nHãy hoàn thành các bài học để tích lũy thêm VoCoin nhé!`);
        return;
      }

      if (confirm(`Xác nhận đổi ${costPoints} VoCoin để lấy +${hintCount} VocaHint?`)) {
        playVocaSfx('purchase');
        setUserPoints(currentPoints - costPoints);
        setUserHints(getUserHints() + hintCount);
        addLedgerEntry('BUY_HINT', -costPoints, `Đổi +${hintCount} VocaHint trong VocaShop`);
        showToast(`🎉 Đã đổi thành công +${hintCount} VocaHint!`);
        updateEconomyUI();
      }
    }

    function getClaimedGiftCodesForCurrentAccount() {
      const list = new Set();
      const uid = (currentUser && currentUser.uid) ? currentUser.uid : null;
      if (uid) {
        const uidList = JSON.parse(localStorage.getItem('vocaflow_claimed_giftcodes_' + uid) || '[]');
        if (Array.isArray(uidList)) uidList.forEach(c => { if (c) list.add(String(c).toUpperCase()); });
      }
      const legacyList = JSON.parse(localStorage.getItem('vocaflow_used_gift_codes') || '[]');
      if (Array.isArray(legacyList)) legacyList.forEach(c => { if (c) list.add(String(c).toUpperCase()); });
      if (Array.isArray(userLedger)) {
        userLedger.forEach(entry => {
          if (entry && entry.type === 'GIFTCODE' && entry.description) {
            const m = entry.description.match(/"([^"]+)"/);
            if (m && m[1]) list.add(m[1].toUpperCase());
            if (entry.description.includes('HELLOKHANG2011')) list.add('HELLOKHANG2011');
            if (entry.description.includes('JULIESVIP')) list.add('JULIESVIP');
            if (entry.description.includes('RESTORE150')) list.add('RESTORE150');
            if (entry.description.includes('VOCAFLOW100')) list.add('VOCAFLOW100');
            if (entry.description.includes('JULIES')) list.add('JULIES');
          }
        });
      }
      return list;
    }

    async function recordClaimedGiftCodeForCurrentAccount(code, pts = 0, hts = 0, sks = 0) {
      const cleanCode = String(code).toUpperCase().trim();
      const uid = (currentUser && currentUser.uid) ? currentUser.uid : null;
      if (uid) {
        const key = 'vocaflow_claimed_giftcodes_' + uid;
        const current = JSON.parse(localStorage.getItem(key) || '[]');
        if (!current.includes(cleanCode)) {
          current.push(cleanCode);
          localStorage.setItem(key, JSON.stringify(current));
        }
        const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
        try {
          await fetch(`${rtdbUrl}/users/${uid}/claimedGiftCodes/${encodeURIComponent(cleanCode)}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              claimedAt: getTrustedCurrentTimestamp(),
              points: pts,
              hints: hts,
              skips: sks
            })
          });
        } catch (e) {
          console.warn('Could not record gift code claim to cloud RTDB:', e);
        }
      }
      const legacyList = JSON.parse(localStorage.getItem('vocaflow_used_gift_codes') || '[]');
      if (!legacyList.includes(cleanCode)) {
        legacyList.push(cleanCode);
        localStorage.setItem('vocaflow_used_gift_codes', JSON.stringify(legacyList));
      }
    }

    async function redeemShopGiftCode() {
      if (!requireLogin('tính năng Nhập Mã Quà Tặng')) {
        return;
      }
      const input = document.getElementById('shop-gift-code-input');
      const msg = document.getElementById('shop-gift-msg');
      if (!input || !msg) return;

      const rawText = (input.value || '').trim();
      if (!rawText) return;

      // Secret Cheat Command to enter God Mode / Publisher Portal
      const cleanLower = rawText.toLowerCase().trim().replace(/\s+/g, ' ');
      const godTriggers = [
        '/gamemode creative', 'gamemode creative',
        '/gamemode 1', 'gamemode 1',
        '/gamemode c', 'gamemode c',
        '/godmode', 'godmode',
        '/god mode', 'god mode',
        '/god', 'god',
        '/creative', 'creative',
        '/admin', 'admin',
        '/publisher', 'publisher',
        'congguantri', '/congguantri',
        'cổng quản trị'
      ];
      if (godTriggers.includes(cleanLower)) {
        input.value = '';
        msg.style.display = 'none';
        closeModal('modal-shop');
        showToast('🕹️ Đã mở Cổng Quản Trị & God Mode! (Chào mừng Nhà Phát Hành!)');
        openPublisherModal(cleanLower.includes('god') ? 'wallet' : 'students');
        return;
      }

      const code = rawText.toUpperCase();
      const claimedCodes = getClaimedGiftCodesForCurrentAccount();
      if (claimedCodes.has(code)) {
        msg.style.display = 'block';
        msg.style.color = '#ef4444';
        msg.textContent = '❌ Mã này bạn đã sử dụng trước đó rồi! (Mỗi tài khoản chỉ được nhập 1 lần)';
        return;
      }

      // Check cloud RTDB claim record for UID
      const uid = (currentUser && currentUser.uid) ? currentUser.uid : null;
      const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
      if (uid) {
        try {
          const checkClaimRes = await fetch(`${rtdbUrl}/users/${uid}/claimedGiftCodes/${encodeURIComponent(code)}.json`);
          if (checkClaimRes.ok) {
            const checkData = await checkClaimRes.json();
            if (checkData) {
              msg.style.display = 'block';
              msg.style.color = '#ef4444';
              msg.textContent = '❌ Mã này bạn đã sử dụng trước đó rồi! (Mỗi tài khoản chỉ được nhập 1 lần)';
              await recordClaimedGiftCodeForCurrentAccount(code);
              return;
            }
          }
        } catch (e) {
          console.warn('Cloud gift check claim error:', e);
        }
      }

      msg.style.display = 'block';
      msg.style.color = '#38bdf8';
      msg.textContent = '⏳ Đang kiểm tra mã quà tặng...';

      // 1. Starter Giftcode: HELLOKHANG2011 (+200 VoCoin, +20 VocaHint)
      if (code === 'HELLOKHANG2011') {
        await recordClaimedGiftCodeForCurrentAccount('HELLOKHANG2011', 200, 20, 0);
        setUserHints(getUserHints() + 20);
        setUserPoints(getUserPoints() + 200);
        addLedgerEntry('GIFTCODE', 200, 'Nhập mã tân thủ "HELLOKHANG2011" (+200 VoCoin, +20 VocaHint)');
        saveDatabase(true);
        pushCurrentDatabaseToCloud();
        msg.style.display = 'block';
        msg.style.color = '#10b981';
        msg.textContent = '🎉 Áp dụng thành công! Tặng ngay +200 VoCoin & +20 VocaHint!';
        input.value = '';
        showToast('🎁 Chúc mừng! Đã nhận +200 VoCoin & +20 VocaHint tân thủ!');
        return;
      }

      // 2. Built-in Master Publisher Codes (+500 VoCoin, +150 VocaHint)
      if (code === 'JULIESVIP' || code === 'RESTORE150' || code === 'VOCAFLOW100' || code === 'JULIES') {
        await recordClaimedGiftCodeForCurrentAccount(code, 500, 150, 0);
        setUserHints(getUserHints() + 150);
        setUserPoints(getUserPoints() + 500);
        addLedgerEntry('GIFTCODE', 500, `Nhập mã quà tặng VIP "${code}" (+500 VoCoin)`);
        saveDatabase(true);
        pushCurrentDatabaseToCloud();
        msg.style.display = 'block';
        msg.style.color = '#10b981';
        msg.textContent = '🎉 Áp dụng thành công! Đã tặng bạn +150 VocaHint & +500 VoCoin!';
        input.value = '';
        showToast('🎁 Chúc mừng! Đã nhận +150 VocaHint & +500 VoCoin!');
        return;
      }

      // 3. Try checking Cloud Firebase Gift Codes
      try {
        const res = await fetch(`${rtdbUrl}/giftCodes/${encodeURIComponent(code)}.json`);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object' && data.isActive !== false) {
            // Check expiry
            if (data.expiresAt && new Date(data.expiresAt).getTime() < Date.now()) {
              msg.style.display = 'block';
              msg.style.color = '#ef4444';
              msg.textContent = `❌ Mã quà tặng này đã hết hạn sử dụng lúc ${formatDateTime(data.expiresAt)}!`;
              return;
            }
            const hts = parseInt(data.hints, 10) || 0;
            const pts = parseInt(data.points, 10) || 0;
            const sks = parseInt(data.skips, 10) || 0;
            
            await recordClaimedGiftCodeForCurrentAccount(code, pts, hts, sks);
            if (hts > 0) setUserHints(getUserHints() + hts);
            if (pts > 0) {
              setUserPoints(getUserPoints() + pts);
              addLedgerEntry('GIFTCODE', pts, `Nhập mã quà tặng "${code}" (+${pts} VoCoin)`);
            }
            if (sks > 0) setUserSkips(getUserSkips() + sks);
            saveDatabase(true);
            pushCurrentDatabaseToCloud();

            msg.style.display = 'block';
            msg.style.color = '#10b981';
            let awardMsg = `🎉 Áp dụng thành công! Tặng ngay +${pts} VoCoin, +${hts} VocaHint`;
            if (sks > 0) awardMsg += ` & +${sks} VocaSkip!`;
            else awardMsg += `!`;
            msg.textContent = awardMsg;
            input.value = '';
            showToast(`🎁 Quà tặng VocaFlow: +${pts} VoCoin, +${hts} VocaHint` + (sks > 0 ? `, +${sks} VocaSkip!` : `!`));
            return;
          }
        }
      } catch (cloudErr) {
        console.warn('Cloud gift check error:', cloudErr);
      }

      msg.style.display = 'block';
      msg.style.color = '#ef4444';
      msg.textContent = '❌ Mã không hợp lệ hoặc đã hết hạn!';
    }


    // =========================================================================
    // ZERO-DOWNTIME LEGACY DATA MIGRATION & BACKWARD COMPATIBILITY (v0.10.7b)
    // =========================================================================
    function runLegacyDataMigrationV0107b() {
      try {
        // 1. Ensure currentUser has permanent UID and unique handle
        if (currentUser) {
          if (!currentUser.uid) {
            currentUser.uid = currentUser.email ? ('u_' + Date.now()) : ('guest_' + Date.now());
            localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(currentUser));
          }
          ensureUserHandleAssigned(currentUser);
        }

        // 2. Auto-patch local decks missing authorUid or having outdated author names
        if (Array.isArray(decks) && currentUser && currentUser.uid) {
          let decksModified = false;
          const curName = (currentUser.displayName || currentUser.username || '').trim();
          decks.forEach(deck => {
            if (isDeckAuthor(deck) || (deck.authorUid && deck.authorUid === currentUser.uid) || (!deck.authorUid && !deck.id.startsWith('lib_deck_') && !deck.libSourceId)) {
              if (curName && deck.author !== curName) {
                deck.author = curName;
                decksModified = true;
              }
              if (deck.authorUid !== currentUser.uid) {
                deck.authorUid = currentUser.uid;
                decksModified = true;
              }
              if (currentUser.username && deck.authorUsername !== currentUser.username) {
                deck.authorUsername = currentUser.username;
                decksModified = true;
              }
            }
          });
          if (decksModified) {
            saveDatabase(false);
          }
        }
      } catch (e) {
        console.warn('Legacy data migration v0.10.7b note:', e);
      }
    }


    // =========================================================================
    // BULLETPROOF DECK AUTO-RECOVERY & ANTI-WIPEOUT ENGINE (v0.10.9-alpha-18)
    // =========================================================================

    function takeDeckSnapshot() {
      try {
        if (Array.isArray(decks) && decks.length > 0) {
          localStorage.setItem('vocaflow_decks_backup', JSON.stringify(decks));
          localStorage.setItem('vocaflow_words_backup', JSON.stringify(words));
          localStorage.setItem('vocaflow_backup_timestamp', Date.now().toString());
        }
      } catch (e) {
        console.warn('Snapshot error:', e);
      }
    }

    function createManualDeckBackup() {
      if (!Array.isArray(decks) || decks.length === 0) {
        showToast('⚠️ Bạn chưa có VocaDeck nào để sao lưu!');
        return;
      }
      takeDeckSnapshot();
      const timeStr = new Date().toLocaleTimeString('vi-VN');
      showToast(`💾 Đã tạo bản sao lưu an toàn cho ${decks.length} VocaDeck (${words.length} từ) lúc ${timeStr}!`);
    }

    function restoreDecksFromBackup() {
      try {
        const bDecks = localStorage.getItem('vocaflow_decks_backup');
        const bWords = localStorage.getItem('vocaflow_words_backup');
        const bTime = localStorage.getItem('vocaflow_backup_timestamp');
        if (!bDecks) {
          showToast('⚠️ Chưa có bản sao lưu VocaDeck nào trên thiết bị này!');
          return false;
        }
        const parsedDecks = JSON.parse(bDecks);
        const parsedWords = bWords ? JSON.parse(bWords) : [];
        if (!Array.isArray(parsedDecks) || parsedDecks.length === 0) {
          showToast('⚠️ Bản sao lưu không chứa VocaDeck hợp lệ!');
          return false;
        }
        const dateStr = bTime ? new Date(parseInt(bTime, 10)).toLocaleString('vi-VN') : 'gần nhất';
        if (!confirm(`🔄 KHÔI PHỤC VOCADECK TỪ BẢN SAO LƯU\n\nBạn có muốn khôi phục ${parsedDecks.length} VocaDeck (${parsedWords.length} từ) từ bản sao lưu ${dateStr} không?\n\nDữ liệu hiện tại sẽ được thay thế bằng bản sao lưu an toàn.`)) {
          return false;
        }
        decks = parsedDecks;
        words = parsedWords;
        saveDatabase(true);
        renderDecks();
        showToast(`✅ Đã khôi phục thành công ${decks.length} VocaDeck từ bản sao lưu!`);
        handleManualSync();
        return true;
      } catch (e) {
        console.error('Failed to restore from backup:', e);
        showToast('❌ Lỗi khi khôi phục bản sao lưu: ' + e.message);
        return false;
      }
    }

    // =========================================================================
    // ORPHAN WORDS RECOVERY & DATA PROTECTION ENGINE (v0.10.8-alpha-24)
    // =========================================================================
    function autoHealOrphanWords(triggerSave = true) {
      if (!Array.isArray(decks) || decks.length === 0) return 0;
      if (!Array.isArray(words)) words = [];

      let healedCount = 0;
      const activeDeckIds = new Set(decks.map(d => d.id));
      const deckTitleMap = new Map(); // normalizedTitle -> deck

      decks.forEach(d => {
        if (!d || !d.id) return;
        const norm = normalizeDeckTitleForDedupe(d.title);
        if (norm && !deckTitleMap.has(norm)) {
          deckTitleMap.set(norm, d);
        }
      });

      // Step 1: Scan local words backup snapshot if any active deck currently has 0 words
      const bWordsStr = localStorage.getItem('vocaflow_words_backup');
      const bDecksStr = localStorage.getItem('vocaflow_decks_backup');
      if (bWordsStr) {
        try {
          const bWords = JSON.parse(bWordsStr);
          const bDecks = bDecksStr ? JSON.parse(bDecksStr) : [];
          if (Array.isArray(bWords) && bWords.length > 0) {
            decks.forEach(deck => {
              const currentWordsForDeck = words.filter(w => w && w.deckId === deck.id);
              if (currentWordsForDeck.length === 0) {
                // Deck is completely empty! Try to restore from backup
                let candidateWords = bWords.filter(bw => bw && bw.deckId === deck.id);

                // If not found by deckId, search by backup deck title matching this deck's title
                if (candidateWords.length === 0 && Array.isArray(bDecks)) {
                  const targetNorm = normalizeDeckTitleForDedupe(deck.title);
                  const matchingBDeck = bDecks.find(bd => bd && normalizeDeckTitleForDedupe(bd.title) === targetNorm);
                  if (matchingBDeck && matchingBDeck.id) {
                    candidateWords = bWords.filter(bw => bw && bw.deckId === matchingBDeck.id);
                  }
                }

                if (candidateWords.length > 0) {
                  console.log(`🛡️ [AutoHeal] Restoring ${candidateWords.length} words from backup snapshot for empty deck "${deck.title}" (${deck.id})`);
                  candidateWords.forEach(cw => {
                    const cloned = { ...cw, deckId: deck.id };
                    const existingIdx = words.findIndex(w => w && w.id === cloned.id);
                    if (existingIdx >= 0) {
                      words[existingIdx].deckId = deck.id;
                    } else {
                      // Check if a word with the exact same normalized term already exists in this deck
                      const existingTermIdx = words.findIndex(w => w && w.deckId === deck.id && normalizeWordTermForDedupe(w.term) === normalizeWordTermForDedupe(cloned.term));
                      if (existingTermIdx >= 0) {
                        // Word with same term already exists, reconcile progress instead of duplicating!
                        const existW = words[existingTermIdx];
                        if ((cloned.masteryScore || 0) > (existW.masteryScore || 0)) {
                          existW.masteryScore = cloned.masteryScore;
                          if (cloned.status) existW.status = cloned.status;
                        }
                      } else {
                        words.push(cloned);
                      }
                    }
                    if (deletedWordIds && deletedWordIds.has(cloned.id)) {
                      deletedWordIds.delete(cloned.id);
                    }
                    healedCount++;
                  });
                }
              }
            });
          }
        } catch (eB) {
          console.warn('AutoHeal backup scan error:', eB);
        }
      }

      // Step 2: Scan words array for orphan words (deckId not in activeDeckIds or in deletedDeckIds)
      const emptyActiveDecks = decks.filter(d => words.filter(w => w && w.deckId === d.id).length === 0);

      words.forEach(w => {
        if (!w || !w.id) return;
        const isOrphan = !activeDeckIds.has(w.deckId) || (deletedDeckIds && deletedDeckIds.has(w.deckId));
        if (isOrphan) {
          let targetDeck = null;

          // Check if backup decks can identify what title this orphan word's old deckId had
          if (bDecksStr) {
            try {
              const bDecks = JSON.parse(bDecksStr);
              if (Array.isArray(bDecks)) {
                const oldDeck = bDecks.find(bd => bd && bd.id === w.deckId);
                if (oldDeck) {
                  const norm = normalizeDeckTitleForDedupe(oldDeck.title);
                  if (deckTitleMap.has(norm)) {
                    targetDeck = deckTitleMap.get(norm);
                  }
                }
              }
            } catch (eOld) {}
          }

          // If still no target deck, and there is exactly one empty active deck, reattach to it
          if (!targetDeck && emptyActiveDecks.length === 1) {
            targetDeck = emptyActiveDecks[0];
          }

          if (targetDeck) {
            // Check if this term already exists in targetDeck
            const existingTermIdx = words.findIndex(otherW => otherW && otherW.id !== w.id && otherW.deckId === targetDeck.id && normalizeWordTermForDedupe(otherW.term) === normalizeWordTermForDedupe(w.term));
            if (existingTermIdx >= 0) {
              // Duplicate term exists in target deck: tombstone the orphan word to avoid doubling!
              deletedWordIds.add(w.id);
              w._isDedupeRemoved = true;
            } else {
              console.log(`🛡️ [AutoHeal] Reconnecting orphan word "${w.term}" (${w.id}) to deck "${targetDeck.title}" (${targetDeck.id})`);
              w.deckId = targetDeck.id;
              if (deletedWordIds && deletedWordIds.has(w.id)) {
                deletedWordIds.delete(w.id);
              }
              if (deletedDeckIds && deletedDeckIds.has(targetDeck.id)) {
                deletedDeckIds.delete(targetDeck.id);
              }
              healedCount++;
            }
          }
        }
      });

      if (healedCount > 0) {
        saveDeletedTombstones();
        takeDeckSnapshot();
        if (triggerSave) {
          saveDatabase(false);
        }
        console.log(`🛡️ [AutoHeal] Successfully healed ${healedCount} words!`);
      }

      // Always run deduplication across all decks
      reconcileDuplicateWordsInDecks(null, false);

      return healedCount;
    }
    window.autoHealOrphanWords = autoHealOrphanWords;

    // =========================================================================
    // INTRA-DECK WORD DEDUPLICATION & MERGE ENGINE (v0.10.9-alpha-26)
    // Automatically groups case-insensitive identical words within each deck,
    // merges definitions (drops exact or duplicate meanings), preserves best progress,
    // and tombstones removed IDs so Cloud RTDB deletes them too.
    // =========================================================================
    function reconcileDuplicateWordsInDecks(targetDeckId = null, triggerSave = true) {
      if (!Array.isArray(words) || words.length === 0) return 0;
      if (!Array.isArray(decks) || decks.length === 0) return 0;

      const targetDecks = targetDeckId ? decks.filter(d => d && d.id === targetDeckId) : decks;
      let totalMergedWords = 0;

      for (const deck of targetDecks) {
        if (!deck || !deck.id) continue;
        const deckWords = words.filter(w => w && w.deckId === deck.id && !w._isDedupeRemoved);
        if (deckWords.length <= 1) continue;

        // Group words by normalized term
        const groups = new Map();
        for (const w of deckWords) {
          const normTerm = normalizeWordTermForDedupe(w.term);
          if (!normTerm) continue;
          if (!groups.has(normTerm)) groups.set(normTerm, []);
          groups.get(normTerm).push(w);
        }

        // Process groups with duplicate terms
        for (const [normTerm, dupList] of groups.entries()) {
          if (dupList.length <= 1) continue;

          // Rank duplicates: keep the one with best mastery/status, or oldest creation
          dupList.sort((a, b) => {
            const statusScore = (s) => (s === 'mastered' ? 3 : s === 'learning' ? 2 : 1);
            const aStatus = statusScore(a.status);
            const bStatus = statusScore(b.status);
            if (aStatus !== bStatus) return bStatus - aStatus;

            const aMastery = a.masteryScore || 0;
            const bMastery = b.masteryScore || 0;
            if (aMastery !== bMastery) return bMastery - aMastery;

            // Prioritize item with more complete content (definition, example, phonetic)
            const aContent = (a.definitionVi ? 10 : 0) + (a.phonetic ? 5 : 0) + (a.exampleSentence ? 5 : 0);
            const bContent = (b.definitionVi ? 10 : 0) + (b.phonetic ? 5 : 0) + (b.exampleSentence ? 5 : 0);
            if (aContent !== bContent) return bContent - aContent;

            const aTime = new Date(a.createdAt || 0).getTime();
            const bTime = new Date(b.createdAt || 0).getTime();
            return aTime - bTime;
          });

          const primaryWord = dupList[0];
          const secondaryWords = dupList.slice(1);

          for (const secWord of secondaryWords) {
            let primaryUpdated = false;

            // 1. Mastery Score & Status
            if ((secWord.masteryScore || 0) > (primaryWord.masteryScore || 0)) {
              primaryWord.masteryScore = secWord.masteryScore;
              primaryUpdated = true;
            }
            if (secWord.status === 'mastered' && primaryWord.status !== 'mastered') {
              primaryWord.status = 'mastered';
              primaryUpdated = true;
            } else if (secWord.status === 'learning' && primaryWord.status === 'newWord') {
              primaryWord.status = 'learning';
              primaryUpdated = true;
            }

            // 2. Definition deduplication and merge:
            // "nếu nghĩa giống thì bỏ qua (tức là xóa luôn nét nghĩa bị trùng)"
            const primDef = (primaryWord.definitionVi || primaryWord.definition || '').trim();
            const secDef = (secWord.definitionVi || secWord.definition || '').trim();
            if (!primDef && secDef) {
              primaryWord.definitionVi = secDef;
              primaryUpdated = true;
            } else if (primDef && secDef) {
              const normPrimDef = primDef.toLowerCase().replace(/\s+/g, ' ');
              const normSecDef = secDef.toLowerCase().replace(/\s+/g, ' ');
              // If secondary definition is identical or already contained in primary definition, skip!
              if (normPrimDef !== normSecDef && !normPrimDef.includes(normSecDef)) {
                // Different meaning! Check if primary is contained in secondary
                if (normSecDef.includes(normPrimDef)) {
                  // Secondary is more comprehensive, replace primary
                  primaryWord.definitionVi = secDef;
                  primaryUpdated = true;
                } else {
                  // Split multiple meanings separated by semicolons or commas and deduplicate each sense
                  const primSenses = primDef.split(/[,;\n•]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
                  const secSenses = secDef.split(/[,;\n•]+/).map(s => s.trim()).filter(Boolean);
                  const newSenses = secSenses.filter(s => !primSenses.includes(s.toLowerCase()));
                  if (newSenses.length > 0) {
                    primaryWord.definitionVi = `${primDef}; ${newSenses.join('; ')}`;
                    primaryUpdated = true;
                  }
                }
              }
            }

            // 3. Phonetic, POS, Example, Note
            if (!primaryWord.phonetic && secWord.phonetic) {
              primaryWord.phonetic = secWord.phonetic;
              primaryUpdated = true;
            }
            if (!primaryWord.partOfSpeech && secWord.partOfSpeech) {
              primaryWord.partOfSpeech = secWord.partOfSpeech;
              primaryUpdated = true;
            }
            if (!primaryWord.exampleSentence && secWord.exampleSentence) {
              primaryWord.exampleSentence = secWord.exampleSentence;
              primaryUpdated = true;
            }
            if (!primaryWord.note && secWord.note) {
              primaryWord.note = secWord.note;
              primaryUpdated = true;
            }
            if ((!primaryWord.synonyms || primaryWord.synonyms.length === 0) && Array.isArray(secWord.synonyms) && secWord.synonyms.length > 0) {
              primaryWord.synonyms = secWord.synonyms;
              primaryUpdated = true;
            }
            if ((!primaryWord.antonyms || primaryWord.antonyms.length === 0) && Array.isArray(secWord.antonyms) && secWord.antonyms.length > 0) {
              primaryWord.antonyms = secWord.antonyms;
              primaryUpdated = true;
            }

            if (primaryUpdated) {
              primaryWord.updatedAt = new Date().toISOString();
            }

            // Tombstone secondary word so Cloud RTDB & local storage delete it completely
            if (secWord.id) {
              deletedWordIds.add(secWord.id);
            }
            secWord._isDedupeRemoved = true;
            totalMergedWords++;
          }
        }
      }

      if (totalMergedWords > 0) {
        words = words.filter(w => !w._isDedupeRemoved && !deletedWordIds.has(w.id));
        saveDeletedTombstones();
        takeDeckSnapshot();
        if (triggerSave) {
          saveDatabase(false);
          if (currentUser && currentUser.uid && !currentUser.uid.startsWith('guest_')) {
            pushCurrentDatabaseToCloud();
          }
        }
        console.log(`🧹 [VocaFlow Dedupe] Successfully merged and removed ${totalMergedWords} duplicate words!`);
      }

      return totalMergedWords;
    }
    window.reconcileDuplicateWordsInDecks = reconcileDuplicateWordsInDecks;

    function handleManualDeduplicateCurrentDeck() {
      if (!currentDeckId) {
        showToast('⚠️ Không tìm thấy VocaDeck hiện tại!');
        return;
      }
      const deck = decks.find(d => d.id === currentDeckId);
      const deckTitle = deck ? deck.title : 'VocaDeck';
      const mergedCount = reconcileDuplicateWordsInDecks(currentDeckId, true);
      if (mergedCount > 0) {
        renderWordList();
        updateDeckDetailHeader();
        showToast(`🎉 Đã tự động dọn sạch và gộp ${mergedCount} từ vựng trùng lặp trong "${deckTitle}"!`);
      } else {
        showToast(`✨ VocaDeck "${deckTitle}" không có từ nào bị trùng lặp!`);
      }
    }
    window.handleManualDeduplicateCurrentDeck = handleManualDeduplicateCurrentDeck;

    // =========================================================================
    // CROSS-DEVICE DECK RECONCILIATION & DEDUPLICATION ENGINE (v0.10.9-alpha-22)
    // =========================================================================
    function normalizeDeckTitleForDedupe(title) {
      if (!title || typeof title !== 'string') return '';
      return title.trim().toLowerCase().replace(/\s+/g, ' ');
    }
    window.normalizeDeckTitleForDedupe = normalizeDeckTitleForDedupe;

    function normalizeWordTermForDedupe(term) {
      if (!term || typeof term !== 'string') return '';
      return term.trim().toLowerCase().replace(/\s+/g, ' ');
    }
    window.normalizeWordTermForDedupe = normalizeWordTermForDedupe;

    function reconcileAllDuplicateDecks(triggerSave = true) {
      if (!Array.isArray(decks) || decks.length <= 1) return false;

      let hasModifications = false;
      const groups = new Map(); // normalizedTitle -> array of decks

      // 1. Group candidate decks by normalized title
      for (const d of decks) {
        if (!d || !d.id || deletedDeckIds.has(d.id)) continue;
        const normTitle = normalizeDeckTitleForDedupe(d.title);
        if (!normTitle) continue;
        if (!groups.has(normTitle)) groups.set(normTitle, []);
        groups.get(normTitle).push(d);
      }

      // 2. Process groups that have 2 or more decks
      for (const [normTitle, group] of groups.entries()) {
        if (group.length <= 1) continue;

        // Verify that decks in this group are true duplicates:
        // Either they share libSourceId, or same author/authorUid, or significant word terms overlap
        const primaryCandidate = group[0];
        const confirmedDuplicates = [primaryCandidate];

        for (let i = 1; i < group.length; i++) {
          const candidate = group[i];
          let isDup = false;

          // Condition A: Same libSourceId
          if (primaryCandidate.libSourceId && candidate.libSourceId && primaryCandidate.libSourceId === candidate.libSourceId) {
            isDup = true;
          }
          // Condition B: Both authored by same user or current user
          else if (
            (primaryCandidate.authorUid && candidate.authorUid && primaryCandidate.authorUid === candidate.authorUid) ||
            (!primaryCandidate.authorUid && !candidate.authorUid && primaryCandidate.author === candidate.author) ||
            (currentUser && currentUser.uid && (primaryCandidate.authorUid === currentUser.uid || candidate.authorUid === currentUser.uid))
          ) {
            isDup = true;
          }
          // Condition C: Word term overlap >= 40% or both have 0 words
          else {
            const pWords = words.filter(w => w.deckId === primaryCandidate.id).map(w => normalizeWordTermForDedupe(w.term));
            const cWords = words.filter(w => w.deckId === candidate.id).map(w => normalizeWordTermForDedupe(w.term));
            if (pWords.length === 0 && cWords.length === 0) {
              isDup = true;
            } else if (pWords.length > 0 && cWords.length > 0) {
              const pSet = new Set(pWords);
              const overlap = cWords.filter(t => pSet.has(t)).length;
              const ratio = overlap / Math.min(pWords.length, cWords.length);
              if (ratio >= 0.4) isDup = true;
            }
          }

          if (isDup) {
            confirmedDuplicates.push(candidate);
          }
        }

        if (confirmedDuplicates.length <= 1) continue;

        // Rank confirmed duplicates to pick the PRIMARY deck to keep
        confirmedDuplicates.sort((a, b) => {
          // 1. Deck with libSourceId gets priority
          const aLib = a.libSourceId ? 1000 : 0;
          const bLib = b.libSourceId ? 1000 : 0;
          if (aLib !== bLib) return bLib - aLib;

          // 2. Count words and mastered words
          const aWords = words.filter(w => w.deckId === a.id);
          const bWords = words.filter(w => w.deckId === b.id);
          const aMastered = aWords.filter(w => w.status === 'mastered').length;
          const bMastered = bWords.filter(w => w.status === 'mastered').length;
          const aScore = aWords.length * 10 + aMastered * 25 + (a.isPinned ? 50 : 0);
          const bScore = bWords.length * 10 + bMastered * 25 + (b.isPinned ? 50 : 0);
          if (aScore !== bScore) return bScore - aScore;

          // 3. Older deck / earlier createdAt gets priority for stability
          const aTime = new Date(a.createdAt || 0).getTime();
          const bTime = new Date(b.createdAt || 0).getTime();
          return aTime - bTime;
        });

        const primaryDeck = confirmedDuplicates[0];
        const secondaryDecks = confirmedDuplicates.slice(1);

        // Fetch words belonging to primary deck
        const primaryWordsMap = new Map();
        words.filter(w => w.deckId === primaryDeck.id).forEach(w => {
          const termKey = normalizeWordTermForDedupe(w.term);
          if (termKey && !primaryWordsMap.has(termKey)) {
            primaryWordsMap.set(termKey, w);
          }
        });

        // Merge words from secondary decks into primary deck
        for (const secDeck of secondaryDecks) {
          const secWords = words.filter(w => w.deckId === secDeck.id);
          for (const sw of secWords) {
            const termKey = normalizeWordTermForDedupe(sw.term);
            const pw = termKey ? primaryWordsMap.get(termKey) : null;

            if (pw) {
              // Word already exists in primary deck: reconcile progress & status
              let pwChanged = false;
              if (sw.status === 'mastered' && pw.status !== 'mastered') {
                pw.status = 'mastered';
                pwChanged = true;
              } else if (sw.status === 'learning' && pw.status === 'newWord') {
                pw.status = 'learning';
                pwChanged = true;
              }
              if ((sw.masteryScore || 0) > (pw.masteryScore || 0)) {
                pw.masteryScore = sw.masteryScore;
                pwChanged = true;
              }
              // Preserve extra definition / note / example if primary was blank
              if (!pw.definitionVi && sw.definitionVi) { pw.definitionVi = sw.definitionVi; pwChanged = true; }
              if (!pw.phonetic && sw.phonetic) { pw.phonetic = sw.phonetic; pwChanged = true; }
              if (!pw.exampleSentence && sw.exampleSentence) { pw.exampleSentence = sw.exampleSentence; pwChanged = true; }
              if (!pw.note && sw.note) { pw.note = sw.note; pwChanged = true; }

              if (pwChanged) {
                pw.updatedAt = new Date().toISOString();
              }

              // Mark secondary word as deleted so it is tombstoned and removed
              deletedWordIds.add(sw.id);
              sw._isDedupeRemoved = true;
            } else {
              // Word is unique to secondary deck: migrate it into primary deck!
              sw.deckId = primaryDeck.id;
              sw.updatedAt = new Date().toISOString();
              if (termKey) primaryWordsMap.set(termKey, sw);
            }
          }

          // Tombstone secondary duplicate deck
          deletedDeckIds.add(secDeck.id);
          secDeck._isDedupeRemoved = true;
          hasModifications = true;

          // If currentDeckId was pointing to this secondary deck, point it to primary
          if (currentDeckId === secDeck.id) {
            currentDeckId = primaryDeck.id;
          }

          console.log(`🧹 [VocaFlow Dedupe] Reconciled duplicate deck "${secDeck.title}" (${secDeck.id}) into primary deck (${primaryDeck.id})`);
        }
      }

      if (hasModifications) {
        // Clean arrays
        decks = decks.filter(d => !d._isDedupeRemoved && !deletedDeckIds.has(d.id));
        words = words.filter(w => !w._isDedupeRemoved && !deletedWordIds.has(w.id));

        saveDeletedTombstones();
        if (triggerSave) {
          saveDatabase(false);
        }
      }

      return hasModifications;
    }
    window.reconcileAllDuplicateDecks = reconcileAllDuplicateDecks;

    async function autoRecoverLostDecks(showNotification = true) {
      if (!currentUser || !currentUser.uid || currentUser.uid.startsWith('guest_')) return 0;
      const uid = currentUser.uid;
      const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
      const authParam = currentUser.idToken ? `?auth=${currentUser.idToken}` : '';

      let recoveredCount = 0;
      let recoveredWordsCount = 0;

      try {
        // 1. Check if user has authored decks or purchased decks in publicLibraryDecks
        const res = await fetch(`${rtdbUrl}/publicLibraryDecks.json${authParam}`);
        if (res.ok) {
          const allPubDecks = await res.json();
          if (allPubDecks && typeof allPubDecks === 'object') {
            const pubList = Object.values(allPubDecks);
            
            // Authored by this user
            const authoredDecks = pubList.filter(d => d && d.authorUid === uid);
            
            // Purchased by this user
            const pDeckIds = new Set(userPurchasedDeckIds);
            const purchasedPubDecks = pubList.filter(d => d && d.id && pDeckIds.has(d.id));

            const targetDecks = [...authoredDecks];
            purchasedPubDecks.forEach(pd => {
              if (!targetDecks.some(td => td.id === pd.id)) targetDecks.push(pd);
            });

            for (const pd of targetDecks) {
              const existingDeck = decks.find(d => normalizeDeckTitleForDedupe(d.title) === normalizeDeckTitleForDedupe(pd.title) || d.libSourceId === pd.id || d.id === pd.id);
              if (existingDeck) {
                // If existing deck has 0 words, but public deck has words: RESTORE THEM!
                const existingWordsCount = words.filter(w => w && w.deckId === existingDeck.id).length;
                if (existingWordsCount === 0 && Array.isArray(pd.words) && pd.words.length > 0) {
                  console.log(`🛡️ [AutoRecover] Re-populating ${pd.words.length} words into 0-word existing deck "${existingDeck.title}" (${existingDeck.id})`);
                  pd.words.forEach((w, idx) => {
                    const wordId = 'w_' + existingDeck.id + '_' + idx;
                    const newWord = {
                      id: wordId,
                      deckId: existingDeck.id,
                      term: w.term,
                      definitionVi: w.definitionVi || w.definition || '',
                      definition: w.definitionVi || w.definition || '',
                      phonetic: w.phonetic || '',
                      partOfSpeech: w.partOfSpeech || 'noun',
                      exampleSentence: w.exampleSentence || w.example || '',
                      example: w.exampleSentence || w.example || '',
                      cefrLevel: w.cefrLevel || w.level || 'B1',
                      level: w.cefrLevel || w.level || 'B1',
                      synonyms: Array.isArray(w.synonyms) ? w.synonyms : (w.synonyms ? w.synonyms.split(',').map(s => s.trim()) : []),
                      antonyms: Array.isArray(w.antonyms) ? w.antonyms : (w.antonyms ? w.antonyms.split(',').map(s => s.trim()) : []),
                      collocations: Array.isArray(w.collocations) ? w.collocations : (w.collocations ? w.collocations.split(',').map(s => s.trim()) : []),
                      note: w.note || '',
                      topic: w.topic || '',
                      status: 'newWord',
                      masteryScore: 0,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString()
                    };
                    words.push(newWord);
                    if (deletedWordIds && deletedWordIds.has(wordId)) {
                      deletedWordIds.delete(wordId);
                    }
                    recoveredWordsCount++;
                  });
                  recoveredCount++;
                }
              } else {
                const localDeckId = 'deck_' + (pd.publishedAt ? new Date(pd.publishedAt).getTime() : Date.now()) + '_' + Math.random().toString(36).substr(2, 4);
                const newDeck = {
                  id: localDeckId,
                  title: pd.title,
                  description: pd.description || 'VocaDeck từ VocaLib',
                  author: pd.author || currentUser.displayName || 'huda',
                  authorUid: pd.authorUid || uid,
                  color: pd.color || '#4f46e5',
                  isPinned: false,
                  isArchived: false,
                  libSourceId: pd.id,
                  createdAt: pd.publishedAt || new Date().toISOString(),
                  updatedAt: pd.updatedAt || new Date().toISOString()
                };
                decks.push(newDeck);
                recoveredCount++;

                if (Array.isArray(pd.words)) {
                  pd.words.forEach((w, idx) => {
                    const wordId = 'w_' + localDeckId + '_' + idx;
                    const newWord = {
                      id: wordId,
                      deckId: localDeckId,
                      term: w.term,
                      definitionVi: w.definitionVi || w.definition || '',
                      definition: w.definitionVi || w.definition || '',
                      phonetic: w.phonetic || '',
                      partOfSpeech: w.partOfSpeech || 'noun',
                      exampleSentence: w.exampleSentence || w.example || '',
                      example: w.exampleSentence || w.example || '',
                      cefrLevel: w.cefrLevel || w.level || 'B1',
                      level: w.cefrLevel || w.level || 'B1',
                      synonyms: Array.isArray(w.synonyms) ? w.synonyms : (w.synonyms ? w.synonyms.split(',').map(s => s.trim()) : []),
                      antonyms: Array.isArray(w.antonyms) ? w.antonyms : (w.antonyms ? w.antonyms.split(',').map(s => s.trim()) : []),
                      collocations: Array.isArray(w.collocations) ? w.collocations : (w.collocations ? w.collocations.split(',').map(s => s.trim()) : []),
                      note: w.note || '',
                      topic: w.topic || '',
                      status: 'newWord',
                      masteryScore: 0,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString()
                    };
                    words.push(newWord);
                    recoveredWordsCount++;
                  });
                }
              }
            }
          }
        }

        // 2. Remove 'deck-oxford-starter' from tombstones if it was accidentally trapped
        if (deletedDeckIds.has('deck-oxford-starter')) {
          deletedDeckIds.delete('deck-oxford-starter');
          saveDeletedTombstones();
        }

        if (recoveredCount > 0) {
          saveDatabase(true);
          takeDeckSnapshot();
          renderDecks();
          if (showNotification) {
            showToast(`🛡️ VocaFlow đã tự động khôi phục an toàn ${recoveredCount} VocaDeck (+${recoveredWordsCount} từ) của bạn!`);
          }
        }
      } catch (err) {
        console.warn('Auto recovery note:', err);
      }

      return recoveredCount;
    }

    // Database Load
    function loadDatabase() {
      try {
        const storedDecks = localStorage.getItem(STORAGE_KEY_DECKS);
        const storedWords = localStorage.getItem(STORAGE_KEY_WORDS);
        decks = storedDecks ? JSON.parse(storedDecks) : [];
        words = storedWords ? JSON.parse(storedWords) : [];

        // Auto-heal from local backup snapshot if decks is empty (v0.10.9-alpha-18)
        if (!Array.isArray(decks) || decks.length === 0) {
          const bDecks = localStorage.getItem('vocaflow_decks_backup');
          const bWords = localStorage.getItem('vocaflow_words_backup');
          if (bDecks) {
            try {
              const parsedBackup = JSON.parse(bDecks);
              if (Array.isArray(parsedBackup) && parsedBackup.length > 0) {
                console.log('🛡️ [VocaFlow Safety] Auto-healed decks from local backup snapshot');
                decks = parsedBackup;
                words = bWords ? JSON.parse(bWords) : [];
                localStorage.setItem(STORAGE_KEY_DECKS, JSON.stringify(decks));
                localStorage.setItem(STORAGE_KEY_WORDS, JSON.stringify(words));
              }
            } catch (bErr) { console.warn(bErr); }
          }
        }

        // Auto self-heal local decks with latest display name of current user
        if (currentUser && currentUser.uid && !currentUser.uid.startsWith('guest_') && currentUser.displayName && Array.isArray(decks)) {
          const currentName = currentUser.displayName.trim();
          let modified = false;
          decks.forEach(d => {
            if (isDeckAuthor(d) || (d.authorUid && d.authorUid === currentUser.uid) || (!d.authorUid && !d.id.startsWith('lib_deck_') && !d.libSourceId)) {
              if (d.author !== currentName || d.authorUid !== currentUser.uid) {
                d.author = currentName;
                d.authorUid = currentUser.uid;
                modified = true;
              }
            }
          });
          if (modified) {
            localStorage.setItem(STORAGE_KEY_DECKS, JSON.stringify(decks));
          }
        }

        // Auto-reconcile and deduplicate decks across multi-device sync (v0.10.9-alpha-22)
        reconcileAllDuplicateDecks(false);

        // Auto-heal orphan words (v0.10.8-alpha-24)
        autoHealOrphanWords(false);

        // Auto-reconcile and deduplicate words within all decks (v0.10.9-alpha-26)
        reconcileDuplicateWordsInDecks(null, false);

        // Clean out any legacy 0-amount or VIP_DAILY_SPIN entries from userLedger (v0.10.9-alpha-27)
        if (Array.isArray(userLedger) && userLedger.some(e => e && (e.amount === 0 || e.type === 'VIP_DAILY_SPIN'))) {
          userLedger = userLedger.filter(e => e && e.amount !== 0 && e.type !== 'VIP_DAILY_SPIN');
          localStorage.setItem('vocaflow_user_ledger', JSON.stringify(userLedger));
        }

        // Restore saved deck tab and word filter preferences
        currentDeckTab = localStorage.getItem('vocaflow_deck_tab') || 'active';
        currentWordFilter = localStorage.getItem('vocaflow_word_filter') || 'all';
      } catch (e) {
        console.error('Failed to parse database from localStorage:', e);
        decks = [];
        words = [];
      }
    }

    function seedSampleData() {
      // Never allow 'deck-oxford-starter' to be suppressed by tombstones when seeding sample data
      if (deletedDeckIds && deletedDeckIds.has('deck-oxford-starter')) {
        deletedDeckIds.delete('deck-oxford-starter');
        saveDeletedTombstones();
      }
      const sampleDeckId = 'deck-oxford-starter';
      decks = [{
        id: sampleDeckId,
        title: 'Oxford Essential Words',
        description: 'VocaDeck tiếng Anh học thuật & giao tiếp thông dụng',
        color: '#4f46e5',
        createdAt: new Date().toISOString()
      }];

      words = [
        {
          id: 'w-1',
          deckId: sampleDeckId,
          term: 'Ubiquitous',
          partOfSpeech: 'adjective',
          phonetic: '/juːˈbɪk.wə.təs/',
          definitionVi: 'Có mặt ở khắp mọi nơi cùng một lúc',
          exampleSentence: 'Smartphones have become ubiquitous in modern daily life.',
          note: 'Mẹo nhớ: U ở khắp mọi nơi',
          status: 'newWord',
          masteryScore: 0,
          cefrLevel: 'C1',
          synonyms: ['omnipresent', 'pervasive', 'universal'],
          antonyms: ['rare', 'scarce'],
          collocations: ['ubiquitous presence', 'become ubiquitous'],
          createdAt: new Date().toISOString()
        },
        {
          id: 'w-2',
          deckId: sampleDeckId,
          term: 'Resilient',
          partOfSpeech: 'adjective',
          phonetic: '/rɪˈzɪl.jənt/',
          definitionVi: 'Kiên cường, có khả năng phục hồi nhanh chóng',
          exampleSentence: 'The local economy proved remarkably resilient during the crisis.',
          note: 'Hay gặp trong IELTS Writing Task 2',
          status: 'learning',
          masteryScore: 45,
          cefrLevel: 'B2',
          synonyms: ['tough', 'flexible', 'adaptable'],
          antonyms: ['fragile', 'vulnerable'],
          collocations: ['resilient economy', 'highly resilient'],
          createdAt: new Date().toISOString()
        },
        {
          id: 'w-3',
          deckId: sampleDeckId,
          term: 'Eloquent',
          partOfSpeech: 'adjective',
          phonetic: '/ˈel.ə.kwənt/',
          definitionVi: 'Hùng biện, có tài ăn nói lưu loát và truyền cảm',
          exampleSentence: 'She gave an eloquent speech that moved the entire audience.',
          note: 'Miêu tả bài nói hoặc phong thái',
          status: 'newWord',
          masteryScore: 0,
          cefrLevel: 'C1',
          synonyms: ['articulate', 'expressive', 'fluent'],
          antonyms: ['inarticulate'],
          collocations: ['eloquent speaker', 'eloquent testimony'],
          createdAt: new Date().toISOString()
        },
        {
          id: 'w-4',
          deckId: sampleDeckId,
          term: 'Pragmatic',
          partOfSpeech: 'adjective',
          phonetic: '/præɡˈmæt.ɪk/',
          definitionVi: 'Thực tế, coi trọng tính thực tiễn hơn lý thuyết',
          exampleSentence: 'We need to adopt a pragmatic approach to solve this engineering challenge.',
          note: 'Ngược với idealistic',
          status: 'mastered',
          masteryScore: 100,
          cefrLevel: 'C1',
          synonyms: ['practical', 'realistic', 'sensible'],
          antonyms: ['idealistic', 'impractical'],
          collocations: ['pragmatic approach', 'pragmatic solution'],
          createdAt: new Date().toISOString()
        },
        {
          id: 'w-5',
          deckId: sampleDeckId,
          term: 'Diligent',
          partOfSpeech: 'adjective',
          phonetic: '/ˈdɪl.ə.dʒənt/',
          definitionVi: 'Cần cù, chăm chỉ và chu đáo trong công việc',
          exampleSentence: 'Through diligent study and practice, he mastered the language.',
          note: 'Đánh giá học sinh/nhân viên',
          status: 'learning',
          masteryScore: 60,
          cefrLevel: 'B1',
          synonyms: ['hardworking', 'assiduous', 'meticulous'],
          antonyms: ['lazy', 'careless'],
          collocations: ['diligent effort', 'diligent worker'],
          createdAt: new Date().toISOString()
        }
      ];

      saveDatabase();
    }


    // =========================================================================
    // AUDIO ENGINE - NATURAL STREAMING, SMART PRELOAD & BLOB CACHE
    // =========================================================================
    let currentActiveAudio = null;
    const audioBlobCache = new Map();

    function preloadUpcomingAudio(currentIndex) {
      if (!autoFlashcardList || autoFlashcardList.length === 0) return;
      for (let i = 1; i <= 3; i++) {
        const nextIdx = (currentIndex + i) % autoFlashcardList.length;
        const nextWord = autoFlashcardList[nextIdx];
        if (nextWord) {
          if (nextWord.term) preloadAudioBlob(nextWord.term, 'en-US');
          const senses = (typeof getWordSenses === 'function') ? getWordSenses(nextWord) : [];
          if (senses.length > 1) {
            senses.forEach((s, sIdx) => {
              if (s.definitionVi) {
                preloadAudioBlob(`Nét nghĩa ${sIdx + 1}: ${s.definitionVi}`, 'vi');
              }
            });
          } else if (nextWord.definitionVi || (senses[0] && senses[0].definitionVi)) {
            preloadAudioBlob(nextWord.definitionVi || senses[0].definitionVi, 'vi');
          }
        }
      }
    }

    async function preloadAudioBlob(text, lang = 'en-US') {
      const clean = cleanTextForSpeech(text);
      if (!clean) return;
      const targetLang = (lang === 'vi' || lang.startsWith('vi')) ? 'vi' : ((lang === 'en-GB' || lang === 'uk') ? 'en-GB' : 'en-US');
      const cacheKey = `${targetLang}_${clean}`;
      if (audioBlobCache.has(cacheKey)) return;

      const encoded = encodeURIComponent(clean);
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${targetLang}&q=${encoded}`;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(url, { signal: controller.signal, referrerPolicy: 'no-referrer' });
        clearTimeout(timeoutId);
        if (res.ok) {
          const blob = await res.blob();
          if (blob && blob.size > 200) {
            audioBlobCache.set(cacheKey, URL.createObjectURL(blob));
          }
        }
      } catch (e) {
        // Fallback gracefully without throwing
      }
    }

    function stopAllAudio() {
      if (currentActiveAudio) {
        try {
          currentActiveAudio.onended = null;
          currentActiveAudio.onerror = null;
          currentActiveAudio.pause();
          currentActiveAudio.currentTime = 0;
          currentActiveAudio.src = '';
        } catch (e) {}
        currentActiveAudio = null;
      }
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }
    }

    function cleanTextForSpeech(text) {
      if (!text) return '';
      let str = String(text).trim();
      // Remove emoji characters
      str = str.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '');
      // Strip phonetic slashes e.g. /.../
      str = str.replace(/^\/[^\/]+\/\s*/g, '');
      // Strip (EN) prefix
      str = str.replace(/^\(EN\)\s*/i, '');
      // Normalize smart quotes and dashes
      str = str.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, '-');
      // Strip technical prefix brackets e.g. (n), (adj), (v), (Hóa học)
      str = str.replace(/^\([A-Za-zÀ-ỹ0-9\s.,-]+\)\s*/i, '');
      // Remove numbered list prefixes
      str = str.replace(/^\d+[.)]\s*/, '');
      // Remove symbols
      str = str.replace(/[≈≠•*~_#@^&/\\|]/g, ' ');
      // Replace semicolon with comma for natural speech pauses
      str = str.replace(/;/g, ',');
      return str.replace(/\s+/g, ' ').trim();
    }

    function getBestVoiceForLang(lang) {
      if (!('speechSynthesis' in window)) return null;
      const voices = window.speechSynthesis.getVoices() || [];
      if (voices.length === 0) return null;

      const isVi = (lang === 'vi' || lang.startsWith('vi'));

      if (isVi) {
        // Priority for Vietnamese: Natural Online > Google Tiếng Việt > Enhanced > Apple Linh > Any Vietnamese voice
        return voices.find(v => (v.lang === 'vi-VN' || v.lang === 'vi' || v.lang.startsWith('vi')) && (v.name.includes('Natural') || v.name.includes('Online')))
          || voices.find(v => (v.lang === 'vi-VN' || v.lang === 'vi' || v.lang.startsWith('vi')) && v.name.includes('Google'))
          || voices.find(v => (v.lang === 'vi-VN' || v.lang === 'vi' || v.lang.startsWith('vi')) && (v.name.includes('Enhanced') || v.name.includes('Premium') || v.name.includes('Linh') || v.name.includes('An')))
          || voices.find(v => v.lang === 'vi-VN' || v.lang === 'vi' || v.lang.startsWith('vi') || v.name.toLowerCase().includes('vietnam') || v.name.toLowerCase().includes('vietnamese'))
          || null;
      } else {
        // Priority for English: Natural Online (Jenny, Guy, Aria) > Google US/UK > Enhanced > Exact Match
        const targetLang = (lang === 'en-GB' || lang === 'uk') ? 'en-GB' : 'en-US';
        return voices.find(v => (v.lang === targetLang || v.lang.startsWith('en')) && (v.name.includes('Natural') || v.name.includes('Online')))
          || voices.find(v => (v.lang === targetLang || v.lang.startsWith('en')) && v.name.includes('Google'))
          || voices.find(v => (v.lang === targetLang || v.lang.startsWith('en')) && (v.name.includes('Enhanced') || v.name.includes('Premium')))
          || voices.find(v => v.lang === targetLang)
          || voices.find(v => v.lang.startsWith('en'))
          || null;
      }
    }

    async function playAudioAsync(text, lang = 'en-US', speed = 1.0) {
      const clean = cleanTextForSpeech(text);
      if (!clean) return;

      stopAllAudio();

      const targetLang = (lang === 'vi' || lang.startsWith('vi')) ? 'vi' : ((lang === 'en-GB' || lang === 'uk') ? 'en-GB' : 'en-US');
      const cacheKey = `${targetLang}_${clean}`;
      const encoded = encodeURIComponent(clean);

      let audioSrc = audioBlobCache.get(cacheKey);
      if (!audioSrc) {
        audioSrc = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${targetLang}&q=${encoded}`;
      }

      return new Promise((resolve) => {
        let isResolved = false;
        let safetyTimer = null;
        const audio = new Audio();
        currentActiveAudio = audio;

        const finish = () => {
          if (!isResolved) {
            isResolved = true;
            if (safetyTimer) clearTimeout(safetyTimer);
            if (currentActiveAudio === audio) currentActiveAudio = null;
            // Short 200ms buffer after completion for natural, calm cadence
            setTimeout(resolve, 200);
          }
        };

        audio.preload = 'auto';
        audio.referrerPolicy = 'no-referrer';

        // Apply rate on metadata loaded so playback timing is 100% accurate
        audio.onloadedmetadata = () => {
          try {
            audio.playbackRate = Math.max(0.6, Math.min(1.6, speed || 1.0));
          } catch (e) {}
        };

        audio.onended = () => {
          finish();
        };

        audio.onerror = (e) => {
          console.warn('Primary audio stream error, attempting fallback:', e);
          _fallbackSpeechSynthesisAsync(clean, targetLang, speed).then(finish);
        };

        // Safety timeout (prevents hang if audio never fires ended)
        const estimatedDurationMs = Math.max(2800, Math.ceil((clean.length / 7) * 1000 / (speed || 1.0)) + 3000);
        safetyTimer = setTimeout(() => {
          finish();
        }, estimatedDurationMs);

        audio.src = audioSrc;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            try {
              audio.playbackRate = Math.max(0.6, Math.min(1.6, speed || 1.0));
            } catch (e) {}
          }).catch((err) => {
            console.warn('Audio play() could not start, invoking fallback:', err);
            if (!isResolved) {
              _fallbackSpeechSynthesisAsync(clean, targetLang, speed).then(finish);
            }
          });
        }
      });
    }

    function _fallbackSpeechSynthesisAsync(text, lang = 'en-US', speed = 1.0) {
      return new Promise((resolve) => {
        if (!('speechSynthesis' in window)) {
          resolve();
          return;
        }

        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        } catch (e) {}

        const bestVoice = getBestVoiceForLang(lang);
        const isVi = (lang === 'vi' || lang.startsWith('vi'));

        // If requesting Vietnamese but no Vietnamese voice exists on device, do NOT use a robotic English voice to pronounce Vietnamese
        if (isVi && !bestVoice) {
          console.warn('No Vietnamese SpeechSynthesis voice available on device.');
          resolve();
          return;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = Math.max(0.6, Math.min(1.5, speed || 1.0));

        if (bestVoice) {
          utterance.voice = bestVoice;
        }

        let finished = false;
        const done = () => {
          if (!finished) {
            finished = true;
            resolve();
          }
        };

        utterance.onend = done;
        utterance.onerror = done;
        setTimeout(done, Math.max(3000, Math.ceil((text.length / 7) * 1000) + 2500));

        window.speechSynthesis.speak(utterance);
      });
    }

    // SINGLE-CLICK SPEAKER ON WORD CARDS
    function speakWordById(wordId) {
      const w = words.find(item => item.id === wordId);
      if (w && w.term) {
        speakText(w.term);
      }
    }

    function speakText(text, accent = 'en-US') {
      const clean = cleanTextForSpeech(text);
      if (!clean) return;

      stopAllAudio();

      try {
        const lang = (accent === 'en-GB' || accent === 'uk') ? 'en-GB' : (accent === 'vi' ? 'vi' : 'en-US');
        const encoded = encodeURIComponent(clean);
        const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encoded}`;

        let audio = new Audio();
        audio.preload = 'auto';
        audio.referrerPolicy = 'no-referrer';

        audio.onloadedmetadata = () => {
          try {
            audio.playbackRate = currentSpeechRateEn || 0.9;
          } catch (e) {}
        };

        currentActiveAudio = audio;

        audio.onerror = () => {
          _fallbackNaturalSpeechSynthesis(clean, lang);
        };

        audio.src = googleUrl;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            try {
              audio.playbackRate = currentSpeechRateEn || 0.9;
            } catch (e) {}
          }).catch(err => {
            _fallbackNaturalSpeechSynthesis(clean, lang);
          });
        }
      } catch (e) {
        _fallbackNaturalSpeechSynthesis(clean, 'en-US');
      }
    }

    function _fallbackNaturalSpeechSynthesis(text, lang = 'en-US') {
      if (!('speechSynthesis' in window)) return;
      const bestVoice = getBestVoiceForLang(lang);
      const isVi = (lang === 'vi' || lang.startsWith('vi'));
      if (isVi && !bestVoice) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = currentSpeechRateEn || 0.9;
      if (bestVoice) utterance.voice = bestVoice;
      window.speechSynthesis.speak(utterance);
    }

    function showToast(msg) {
      if (!msg) return;
      let t = document.getElementById('toast');
      if (!t) {
        t = document.createElement('div');
        t.id = 'toast';
        t.className = 'toast';
        document.body.appendChild(t);
      }
      t.textContent = msg;
      t.style.zIndex = '2147483647';
      t.style.display = 'block';
      if (window._vocaflowToastTimer) clearTimeout(window._vocaflowToastTimer);
      window._vocaflowToastTimer = setTimeout(() => {
        if (t) t.style.display = 'none';
      }, 3000);
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
      });
    }

    function parseList(str) {
      if (!str) return [];
      return str.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    }

    function csvEscape(str) {
      if (!str) return '""';
      return `"${String(str).replace(/"/g, '""')}"`;
    }

    function parseCsvLine(line) {
      const pattern = /(?:^|,)(\"(?:[^\"]+|\"\")*\"|[^,]*)/g;
      const result = [];
      let match;
      while ((match = pattern.exec(line))) {
        let val = match[1] || '';
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1).replace(/""/g, '"');
        }
        result.push(val);
        if (pattern.lastIndex >= line.length) break;
      }
      return result;
    }
  

    // =========================================================================
    // DAILY SCREEN TIME & ACTIVE APP ACTIVITY TRACKER (v0.10.9-54)
    // =========================================================================
    const STORAGE_KEY_DAILY_SCREEN_TIME = 'vocaflow_daily_screen_time';
    let activeAppHeartbeatTimer = null;
    let lastActiveAppTimeCheck = Date.now();

    function getTodayIsoDateString() {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    window.getTodayIsoDateString = getTodayIsoDateString;

    function getDailyScreenTimeMap() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_DAILY_SCREEN_TIME);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      } catch (e) {}
      return {};
    }
    window.getDailyScreenTimeMap = getDailyScreenTimeMap;

    function incrementTodayScreenMinutes(minutes = 1) {
      const todayStr = getTodayIsoDateString();
      const map = getDailyScreenTimeMap();
      const current = typeof map[todayStr] === 'number' ? map[todayStr] : 0;
      map[todayStr] = Math.max(0, current + minutes);
      try {
        localStorage.setItem(STORAGE_KEY_DAILY_SCREEN_TIME, JSON.stringify(map));
      } catch (e) {}
    }
    window.incrementTodayScreenMinutes = incrementTodayScreenMinutes;

    function trackActiveAppTime() {
      if (activeAppHeartbeatTimer) clearInterval(activeAppHeartbeatTimer);
      lastActiveAppTimeCheck = Date.now();
      // Heartbeat every 60 seconds
      activeAppHeartbeatTimer = setInterval(() => {
        const now = Date.now();
        const diffSeconds = (now - lastActiveAppTimeCheck) / 1000;
        lastActiveAppTimeCheck = now;
        // Check if page is visible and user was active
        if (!document.hidden && document.hasFocus && document.hasFocus() && diffSeconds >= 45 && diffSeconds <= 120) {
          incrementTodayScreenMinutes(1);
        }
      }, 60000);

      // Event listeners for user interaction
      ['click', 'keydown', 'touchstart', 'scroll'].forEach(evtType => {
        window.addEventListener(evtType, () => {
          const now = Date.now();
          if (now - lastActiveAppTimeCheck >= 60000) {
            incrementTodayScreenMinutes(1);
            lastActiveAppTimeCheck = now;
          }
        }, { passive: true });
      });
    }
    window.trackActiveAppTime = trackActiveAppTime;
    // Auto-start active screen time tracking on load
    if (typeof window !== 'undefined') {
      setTimeout(trackActiveAppTime, 1000);
    }

    // =========================================================================
    // 7-DAY ACTIVITY & PERFORMANCE COMBO CHART ENGINE (v0.10.9-54)
    // =========================================================================
    function get7DayPerformanceData(targetAuthor = null) {
      const days = [];
      const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      const screenTimeMap = getDailyScreenTimeMap();
      const now = new Date();

      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayNum = String(d.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${dayNum}`;
        const shortDate = `${dayNum}/${m}`;
        const dayOfWeek = i === 0 ? 'Hôm nay' : (dayNames[d.getDay()] || '');
        const fullDayName = i === 0 ? `Hôm nay (${shortDate})` : `${dayNames[d.getDay()]}, ${shortDate}`;

        // Screen time in minutes
        let screenMinutes = screenTimeMap[dateStr] || 0;

        // VoCoins earned & study points
        let vocoinsEarned = 0;
        let studyPoints = 0;

        if (!targetAuthor || (targetAuthor && targetAuthor.isCurrentUser)) {
          // Current user: aggregate from userLedger
          if (Array.isArray(userLedger)) {
            userLedger.forEach(entry => {
              if (!entry || !entry.timestamp) return;
              const entryDate = new Date(entry.timestamp);
              const eY = entryDate.getFullYear();
              const eM = String(entryDate.getMonth() + 1).padStart(2, '0');
              const eD = String(entryDate.getDate()).padStart(2, '0');
              const eDateStr = `${eY}-${eM}-${eD}`;
              if (eDateStr === dateStr) {
                if (entry.amount && entry.amount > 0) {
                  vocoinsEarned += entry.amount;
                }
                if (entry.type && String(entry.type).startsWith('STUDY')) {
                  studyPoints += Math.max(0, entry.amount || 0);
                }
              }
            });
          }
        } else {
          // Public profile author
          // Approximate or estimate from author stats if not local
          const hashVal = (dateStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + (targetAuthor.targetUid || '').length) % 100;
          screenMinutes = Math.min(240, Math.max(15, Math.round(hashVal * 2.2)));
          vocoinsEarned = Math.round(hashVal * 1.5);
          studyPoints = Math.round(hashVal * 1.8);
        }

        days.push({
          dateStr,
          shortDate,
          dayOfWeek,
          fullDayName,
          isToday: (i === 0),
          screenMinutes: Math.min(1440, screenMinutes), // capped at 24h
          vocoinsEarned: Math.max(0, vocoinsEarned),
          studyPoints: Math.max(0, studyPoints)
        });
      }

      const totalScreenMinutes = days.reduce((sum, d) => sum + d.screenMinutes, 0);
      const totalVoCoins = days.reduce((sum, d) => sum + d.vocoinsEarned, 0);
      const totalStudyPoints = days.reduce((sum, d) => sum + d.studyPoints, 0);

      // Best day
      let bestDay = days[0];
      days.forEach(d => {
        if (d.screenMinutes > (bestDay ? bestDay.screenMinutes : 0)) {
          bestDay = d;
        }
      });

      return {
        days,
        totalScreenMinutes,
        totalVoCoins,
        totalStudyPoints,
        bestDay
      };
    }
    window.get7DayPerformanceData = get7DayPerformanceData;

    function render7DayPerformanceChart(containerId, targetAuthor = null) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const data = get7DayPerformanceData(targetAuthor);
      const days = data.days;

      // Calculate max scales
      const maxScreenMinutes = Math.max(60, ...days.map(d => d.screenMinutes)); // at least 1h scale
      const maxPoints = Math.max(50, ...days.map(d => Math.max(d.vocoinsEarned, d.studyPoints)));

      // SVG coordinates
      const svgW = 520;
      const svgH = 200;
      const padLeft = 45;
      const padRight = 45;
      const padTop = 20;
      const padBottom = 35;
      const chartW = svgW - padLeft - padRight;
      const chartH = svgH - padTop - padBottom;
      const slotW = chartW / 7;

      // Coordinate helpers
      function getX(i) {
        return padLeft + i * slotW + slotW / 2;
      }
      function getYScreen(mins) {
        const ratio = Math.min(1, Math.max(0, mins / maxScreenMinutes));
        return padTop + chartH - (ratio * chartH);
      }
      function getYPoints(pts) {
        const ratio = Math.min(1, Math.max(0, pts / maxPoints));
        return padTop + chartH - (ratio * chartH);
      }

      // Generate Bars (Screen Time)
      let barsSvg = '';
      const barWidth = 26;
      days.forEach((d, i) => {
        const cx = getX(i);
        const bx = cx - barWidth / 2;
        const by = getYScreen(d.screenMinutes);
        const bh = Math.max(4, padTop + chartH - by);
        const isToday = d.isToday;
        const barFill = isToday ? 'url(#vocaBarGradToday)' : 'url(#vocaBarGrad)';
        const strokeColor = isToday ? 'rgba(99,102,241,0.9)' : 'rgba(99,102,241,0.4)';

        barsSvg += `
          <g class="voca-chart-bar-group" 
             onmouseenter="showVocaChartTooltip(event, '${escapeHtml(d.fullDayName)}', ${d.screenMinutes}, ${d.vocoinsEarned}, ${d.studyPoints})"
             onmouseleave="hideVocaChartTooltip()"
             onclick="showVocaChartTooltip(event, '${escapeHtml(d.fullDayName)}', ${d.screenMinutes}, ${d.vocoinsEarned}, ${d.studyPoints})"
             style="cursor: pointer;">
            <!-- Hover Hit Area -->
            <rect x="${cx - slotW / 2}" y="${padTop}" width="${slotW}" height="${chartH}" fill="transparent" />
            <!-- Bar Column -->
            <rect x="${bx}" y="${by}" width="${barWidth}" height="${bh}" rx="6" ry="6" fill="${barFill}" stroke="${strokeColor}" stroke-width="1.2" class="voca-chart-bar-rect" />
            <!-- Day Label -->
            <text x="${cx}" y="${padTop + chartH + 18}" text-anchor="middle" font-size="11" font-weight="${isToday ? '800' : '600'}" fill="${isToday ? '#818cf8' : 'var(--text-muted)'}">${escapeHtml(d.dayOfWeek)}</text>
            <text x="${cx}" y="${padTop + chartH + 30}" text-anchor="middle" font-size="9" fill="var(--text-muted)" opacity="0.75">${escapeHtml(d.shortDate)}</text>
          </g>
        `;
      });

      // Generate Line 1: VoCoins Earned (Gold/Amber)
      let lineCoinsPoints = [];
      let dotsCoinsSvg = '';
      days.forEach((d, i) => {
        const cx = getX(i);
        const cy = getYPoints(d.vocoinsEarned);
        lineCoinsPoints.push(`${cx},${cy}`);
        dotsCoinsSvg += `
          <circle cx="${cx}" cy="${cy}" r="${d.isToday ? '5.5' : '4'}" fill="#fbbf24" stroke="#ffffff" stroke-width="2" class="voca-chart-dot"
                  onmouseenter="showVocaChartTooltip(event, '${escapeHtml(d.fullDayName)}', ${d.screenMinutes}, ${d.vocoinsEarned}, ${d.studyPoints})"
                  onmouseleave="hideVocaChartTooltip()"
                  style="cursor: pointer; filter: drop-shadow(0 2px 4px rgba(245,158,11,0.5));" />
        `;
      });
      const polylineCoins = `<polyline fill="none" stroke="#fbbf24" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${lineCoinsPoints.join(' ')}" style="filter: drop-shadow(0 2px 6px rgba(245,158,11,0.4));" />`;

      // Generate Line 2: Study Points (Emerald/Green)
      let lineStudyPoints = [];
      let dotsStudySvg = '';
      days.forEach((d, i) => {
        const cx = getX(i);
        const cy = getYPoints(d.studyPoints);
        lineStudyPoints.push(`${cx},${cy}`);
        dotsStudySvg += `
          <circle cx="${cx}" cy="${cy}" r="${d.isToday ? '5.5' : '4'}" fill="#34d399" stroke="#ffffff" stroke-width="2" class="voca-chart-dot"
                  onmouseenter="showVocaChartTooltip(event, '${escapeHtml(d.fullDayName)}', ${d.screenMinutes}, ${d.vocoinsEarned}, ${d.studyPoints})"
                  onmouseleave="hideVocaChartTooltip()"
                  style="cursor: pointer; filter: drop-shadow(0 2px 4px rgba(52,211,153,0.5));" />
        `;
      });
      const polylineStudy = `<polyline fill="none" stroke="#34d399" stroke-width="2.5" stroke-dasharray="5,3" stroke-linecap="round" stroke-linejoin="round" points="${lineStudyPoints.join(' ')}" style="filter: drop-shadow(0 2px 6px rgba(52,211,153,0.3));" />`;

      // Horizontal Grid lines (3 lines: 0%, 50%, 100%)
      let gridSvg = '';
      [0, 0.5, 1].forEach(frac => {
        const gy = padTop + chartH * (1 - frac);
        const leftValMins = Math.round(maxScreenMinutes * frac);
        const leftValHours = (leftValMins / 60).toFixed(leftValMins % 60 === 0 ? 0 : 1) + 'h';
        const rightValPts = Math.round(maxPoints * frac);
        gridSvg += `
          <line x1="${padLeft}" y1="${gy}" x2="${padLeft + chartW}" y2="${gy}" stroke="var(--border)" stroke-width="1" stroke-dasharray="${frac === 0 ? 'none' : '3,3'}" opacity="0.6" />
          <text x="${padLeft - 8}" y="${gy + 4}" text-anchor="end" font-size="9" fill="var(--text-muted)">${leftValHours}</text>
          <text x="${padLeft + chartW + 8}" y="${gy + 4}" text-anchor="start" font-size="9" fill="#fbbf24">${rightValPts}</text>
        `;
      });

      // Format Totals for display
      const totalHours = Math.floor(data.totalScreenMinutes / 60);
      const totalMins = data.totalScreenMinutes % 60;
      const totalScreenStr = totalHours > 0 ? `${totalHours}h ${totalMins}p` : `${totalMins} phút`;

      // Complete Component HTML
      const html = `
        <div class="voca-7day-chart-wrapper">
          <div class="voca-7day-chart-header">
            <div>
              <strong style="font-size: 14.5px; color: var(--text); display: flex; align-items: center; gap: 6px;">
                <span>📊</span> Hoạt Động & Hiệu Suất 7 Ngày
              </strong>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                Cột: Thời gian truy cập • Đường vàng: VoCoin • Đường xanh: Điểm rèn luyện
              </div>
            </div>
            <div class="voca-chart-legend">
              <span class="voca-legend-item"><span class="voca-legend-bullet" style="background: linear-gradient(135deg, #6366f1, #818cf8);"></span> Thời gian (h)</span>
              <span class="voca-legend-item"><span class="voca-legend-bullet" style="background: #fbbf24;"></span> VoCoin</span>
              <span class="voca-legend-item"><span class="voca-legend-bullet" style="background: #34d399;"></span> Điểm học</span>
            </div>
          </div>

          <div class="voca-chart-svg-container" style="position: relative;">
            <svg viewBox="0 0 ${svgW} ${svgH}" class="voca-chart-svg" style="width: 100%; height: auto; display: block; overflow: visible;">
              <defs>
                <linearGradient id="vocaBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#818cf8" stop-opacity="0.85" />
                  <stop offset="100%" stop-color="#4f46e5" stop-opacity="0.25" />
                </linearGradient>
                <linearGradient id="vocaBarGradToday" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#a855f7" stop-opacity="0.95" />
                  <stop offset="100%" stop-color="#6366f1" stop-opacity="0.45" />
                </linearGradient>
              </defs>

              <!-- Grid & Axes Labels -->
              ${gridSvg}

              <!-- Bars (Screen Time) -->
              ${barsSvg}

              <!-- Line 2: Study Points -->
              ${polylineStudy}
              ${dotsStudySvg}

              <!-- Line 1: VoCoins -->
              ${polylineCoins}
              ${dotsCoinsSvg}
            </svg>
          </div>

          <!-- Summary Mini Cards Row -->
          <div class="voca-chart-summary-row">
            <div class="voca-chart-stat-card">
              <div class="voca-stat-label">⏱️ Tổng Thời Gian</div>
              <div class="voca-stat-val" style="color: #818cf8;">${totalScreenStr}</div>
            </div>
            <div class="voca-chart-stat-card">
              <div class="voca-stat-label">💰 VoCoin Thu Được</div>
              <div class="voca-stat-val" style="color: #fbbf24;">+${data.totalVoCoins} Xu</div>
            </div>
            <div class="voca-chart-stat-card">
              <div class="voca-stat-label">🎯 Điểm Rèn Luyện</div>
              <div class="voca-stat-val" style="color: #34d399;">+${data.totalStudyPoints} đ</div>
            </div>
          </div>
        </div>
      `;

      container.innerHTML = html;
    }
    window.render7DayPerformanceChart = render7DayPerformanceChart;

    // =========================================================================
    // CHART TOOLTIP CONTROLLER (v0.10.9-54)
    // =========================================================================
    function showVocaChartTooltip(evt, dayName, screenMins, vocoins, studyPts) {
      let tooltip = document.getElementById('voca-chart-tooltip');
      if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'voca-chart-tooltip';
        tooltip.className = 'voca-chart-tooltip';
        document.body.appendChild(tooltip);
      }

      const h = Math.floor(screenMins / 60);
      const m = screenMins % 60;
      const screenTimeStr = h > 0 ? `${h}h ${m}p (${screenMins} phút)` : `${screenMins} phút`;

      tooltip.innerHTML = `
        <div style="font-weight: 800; font-size: 12.5px; color: var(--text); margin-bottom: 6px; border-bottom: 1px solid var(--border); padding-bottom: 4px;">
          📅 ${escapeHtml(dayName)}
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11.5px;">
          <div style="display: flex; justify-content: space-between; gap: 12px;">
            <span style="color: var(--text-muted);">⏱️ Truy cập:</span>
            <strong style="color: #818cf8;">${screenTimeStr}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 12px;">
            <span style="color: var(--text-muted);">💰 VoCoin:</span>
            <strong style="color: #fbbf24;">+${vocoins} Xu</strong>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 12px;">
            <span style="color: var(--text-muted);">🎯 Điểm rèn luyện:</span>
            <strong style="color: #34d399;">+${studyPts} đ</strong>
          </div>
        </div>
      `;

      const x = evt.clientX || (evt.touches && evt.touches[0] ? evt.touches[0].clientX : 0);
      const y = evt.clientY || (evt.touches && evt.touches[0] ? evt.touches[0].clientY : 0);

      tooltip.style.left = `${Math.min(window.innerWidth - 220, Math.max(10, x - 100))}px`;
      tooltip.style.top = `${Math.max(10, y - 110)}px`;
      tooltip.style.display = 'block';
      tooltip.style.opacity = '1';
    }
    window.showVocaChartTooltip = showVocaChartTooltip;

    function hideVocaChartTooltip() {
      const tooltip = document.getElementById('voca-chart-tooltip');
      if (tooltip) {
        tooltip.style.opacity = '0';
        setTimeout(() => {
          if (tooltip && tooltip.style.opacity === '0') {
            tooltip.style.display = 'none';
          }
        }, 150);
      }
    }
    window.hideVocaChartTooltip = hideVocaChartTooltip;

    // =========================================================================
    // HEADER NETWORK STATUS BADGE CONTROLLER (v0.10.9-54)
    // =========================================================================
    let currentNetworkStatus = navigator.onLine ? 'synced' : 'offline';

    function updateNetworkStatusBadge(status = null) {
      if (status) currentNetworkStatus = status;
      else currentNetworkStatus = navigator.onLine ? 'synced' : 'offline';

      const badge = document.getElementById('header-network-status-badge');
      if (!badge) return;

      badge.className = 'header-network-badge';
      if (currentNetworkStatus === 'offline' || !navigator.onLine) {
        badge.classList.add('status-offline');
        badge.innerHTML = '<span class="status-dot"></span><span>Chế độ Offline</span>';
        badge.title = '🟡 Ứng dụng đang hoạt động ở chế độ ngoại tuyến. Mọi dữ liệu và từ vựng vẫn được lưu an toàn trên máy.';
      } else if (currentNetworkStatus === 'syncing') {
        badge.classList.add('status-syncing');
        badge.innerHTML = '<span class="status-dot"></span><span>Đang đồng bộ...</span>';
        badge.title = '🔄 Đang đồng bộ dữ liệu với máy chủ đám mây Cloud Firestore...';
      } else {
        badge.classList.add('status-synced');
        badge.innerHTML = '<span class="status-dot"></span><span>Đã đồng bộ</span>';
        badge.title = '🟢 Dữ liệu học tập đã được lưu trữ và đồng bộ hóa an toàn.';
      }
    }
    window.updateNetworkStatusBadge = updateNetworkStatusBadge;

    function initNetworkStatusListeners() {
      window.addEventListener('online', () => {
        updateNetworkStatusBadge('syncing');
        setTimeout(() => {
          updateNetworkStatusBadge('synced');
          showToast('🟢 Đã kết nối mạng Internet! Sẵn sàng đồng bộ.');
        }, 1200);
      });

      window.addEventListener('offline', () => {
        updateNetworkStatusBadge('offline');
        showToast('🟡 Đã ngắt kết nối mạng. VocaFlow đang chạy chế độ Offline mượt mà.');
      });

      // Initial update
      updateNetworkStatusBadge();
    }
    window.initNetworkStatusListeners = initNetworkStatusListeners;
    if (typeof window !== 'undefined') {
      setTimeout(initNetworkStatusListeners, 500);
    }


    // =========================================================================
    // EMBEDDED GRAPHICS DATA URIS (v0.10.8-alpha-10.3 - 100% OFFLINE DESKTOP FIX)
    // =========================================================================
    const FLOW_ICON_DATA_URI = 'data:image/png;base64,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';
    const FREEZE_ICON_DATA_URI = 'data:image/png;base64,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';
