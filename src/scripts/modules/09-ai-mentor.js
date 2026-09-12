// =========================================================================

// VOCAFLOW 09-AI-MENTOR.JS (v0.10.9-48)

// Gemini AI chatbot, quick chips, quota management, multi-key pool

// =========================================================================

    // =========================================================================
    // VIP MULTI-KEY POOL & FAILOVER ENGINE (v0.10.8-alpha-10.3)
    // =========================================================================
    let geminiApiKeys = [];
    let geminiApiKey = localStorage.getItem(STORAGE_KEY_GEMINI_KEY) || localStorage.getItem('vocaflow_gemini_api_key') || '';
    let keyCooldowns = {}; // key -> expiry timestamp (ms)

    function openVipSubscriptionModal() {
      if (typeof openVipPricingModal === 'function') openVipPricingModal();
    }
    window.openVipSubscriptionModal = openVipSubscriptionModal;

    function saveGeminiApiKey(val) {
      const k = (val || '').trim();
      saveApiKeysList(k ? [k] : [], true);
    }
    window.saveGeminiApiKey = saveGeminiApiKey;

    function getStoredApiKeys(forApiCall = false) {
      const isVip = (typeof isUserVip === 'function' ? isUserVip() : false) || (typeof adminVipOverride !== 'undefined' && adminVipOverride) || (localStorage.getItem('vocaflow_user_is_vip') === 'true');
      try {
        const raw = localStorage.getItem(STORAGE_KEY_GEMINI_KEYS);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            const cleaned = arr.map(k => String(k || '').trim()).filter(k => k);
            if (cleaned.length > 0) {
              if (forApiCall && !isVip) {
                return cleaned.slice(0, 1);
              }
              return cleaned.slice(0, 3);
            }
          }
        }
      } catch (e) {}

      const single = (localStorage.getItem(STORAGE_KEY_GEMINI_KEY) || localStorage.getItem('vocaflow_gemini_api_key') || '').trim();
      return single ? [single] : [];
    }

    function hasAtLeastOneApiKey() {
      const keys = getStoredApiKeys(false);
      return Array.isArray(keys) && keys.length > 0 && keys.some(k => typeof k === 'string' && k.trim().length > 5);
    }
    window.hasAtLeastOneApiKey = hasAtLeastOneApiKey;

    function saveApiKeysList(keysArray, pushCloud = true) {
      let cleaned = (keysArray || []).map(k => String(k || '').trim()).filter(k => k);
      if (cleaned.length > 3) {
        cleaned = cleaned.slice(0, 3);
      }
      geminiApiKeys = cleaned;
      geminiApiKey = cleaned.length > 0 ? cleaned[0] : '';
      localStorage.setItem(STORAGE_KEY_GEMINI_KEYS, JSON.stringify(cleaned));
      localStorage.setItem(STORAGE_KEY_GEMINI_KEY, geminiApiKey);

      if (pushCloud && typeof pushCurrentDatabaseToCloud === 'function' && currentUser && currentUser.email) {
        pushCurrentDatabaseToCloud();
      }
    }

    function getEffectiveGeminiApiKey() {
      const keys = getStoredApiKeys(true);
      if (keys.length === 0) return '';
      const now = Date.now();
      for (const k of keys) {
        if (!keyCooldowns[k] || keyCooldowns[k] < now) {
          return k;
        }
      }
      return keys[0];
    }

    function markGeminiKeyRateLimited(key) {
      if (!key) return;
      keyCooldowns[key] = Date.now() + 60000; // 60s cooldown for rate-limited key
    }

    async function callGeminiApiWithFailover(makeRequestFn) {
      const keys = getStoredApiKeys(true);
      if (keys.length === 0) {
        throw new Error('NO_API_KEY');
      }

      let lastError = null;
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (keyCooldowns[key] && keyCooldowns[key] > Date.now() && keys.length > 1) {
          continue;
        }

        try {
          const res = await makeRequestFn(key);
          if (res && res.status === 429) {
            console.warn(`Gemini API Key #${i+1} reached quota limit (429). Switching to next key in pool...`);
            markGeminiKeyRateLimited(key);
            lastError = new Error('QUOTA_EXHAUSTED_429');
            continue;
          }
          return res;
        } catch (err) {
          console.warn(`Gemini API Key #${i+1} error:`, err);
          lastError = err;
          if (String(err).includes('429') || String(err).includes('RESOURCE_EXHAUSTED') || String(err).includes('quota')) {
            markGeminiKeyRateLimited(key);
            continue;
          }
          throw err;
        }
      }
      throw lastError || new Error('ALL_KEYS_FAILED');
    }

    function handleApiKeyInput(slotIndex, val) {
      const inp1 = document.getElementById('gemini-api-key-input-1');
      const inp2 = document.getElementById('gemini-api-key-input-2');
      const inp3 = document.getElementById('gemini-api-key-input-3');

      // Auto-shift upward if previous slots are empty
      if (slotIndex === 2 && inp1 && !inp1.value.trim() && val.trim()) {
        inp1.value = val;
        if (inp2) inp2.value = '';
        inp1.focus();
        showToast('⬆️ Đã tự động chuyển khóa lên vị trí Khóa 1!');
        compactAndSaveApiKeys();
        return;
      }

      if (slotIndex === 3 && inp3 && val.trim()) {
        if (inp1 && !inp1.value.trim()) {
          inp1.value = val;
          inp3.value = '';
          inp1.focus();
          showToast('⬆️ Đã tự động chuyển khóa lên vị trí Khóa 1!');
          compactAndSaveApiKeys();
          return;
        } else if (inp2 && !inp2.value.trim()) {
          inp2.value = val;
          inp3.value = '';
          inp2.focus();
          showToast('⬆️ Đã tự động chuyển khóa lên vị trí Khóa 2!');
          compactAndSaveApiKeys();
          return;
        }
      }
    }

    function compactAndSaveApiKeys() {
      const inp1 = document.getElementById('gemini-api-key-input-1');
      const inp2 = document.getElementById('gemini-api-key-input-2');
      const inp3 = document.getElementById('gemini-api-key-input-3');

      const v1 = inp1 ? inp1.value.trim() : '';
      const v2 = inp2 ? inp2.value.trim() : '';
      const v3 = inp3 ? inp3.value.trim() : '';

      const isVip = (typeof isUserVip === 'function' ? isUserVip() : false) || (typeof adminVipOverride !== 'undefined' && adminVipOverride) || (localStorage.getItem('vocaflow_user_is_vip') === 'true');

      let cleaned = [];
      if (isVip) {
        cleaned = [v1, v2, v3].filter(k => k).slice(0, 3);
        if (inp1) inp1.value = cleaned[0] || '';
        if (inp2) inp2.value = cleaned[1] || '';
        if (inp3) inp3.value = cleaned[2] || '';
      } else {
        // Non-VIP: update primary key, but preserve existing keys in slots 2 & 3 if they were previously entered!
        const existing = getStoredApiKeys(false);
        const k2 = v2 || existing[1] || '';
        const k3 = v3 || existing[2] || '';
        cleaned = [v1, k2, k3].filter(k => k).slice(0, 3);
        if (inp1) inp1.value = cleaned[0] || '';
      }

      saveApiKeysList(cleaned, true);
      updateSettingsApiKeysStatusText();
    }

    function updateSettingsApiKeysStatusText() {
      const statusText = document.getElementById('gemini-status-text');
      if (!statusText) return;
      const isVip = (typeof isUserVip === 'function' ? isUserVip() : false) || (typeof adminVipOverride !== 'undefined' && adminVipOverride) || (localStorage.getItem('vocaflow_user_is_vip') === 'true');
      const keys = getStoredApiKeys(false);
      if (keys.length === 0) {
        statusText.textContent = 'Chưa cài đặt API Key.';
        statusText.style.color = 'var(--text-muted)';
      } else if (keys.length === 1 || !isVip) {
        if (!isVip && keys.length > 1) {
          statusText.textContent = `✅ Đã lưu Khóa chính. (${keys.length - 1} khóa phụ đang chờ kích hoạt VIP)`;
          statusText.style.color = '#38bdf8';
        } else {
          statusText.textContent = '✅ Đã lưu 1 Khóa API chính.';
          statusText.style.color = '#34d399';
        }
      } else {
        statusText.textContent = `👑 Đã kích hoạt Bể Đa Khóa (${keys.length}/3 Key • x${keys.length} Hạn Ngạch)!`;
        statusText.style.color = '#fbbf24';
      }
    }

    function updateSettingsApiKeysUI() {
      const isVip = (typeof isUserVip === 'function' ? isUserVip() : false) || (typeof adminVipOverride !== 'undefined' && adminVipOverride) || (localStorage.getItem('vocaflow_user_is_vip') === 'true');
      const keys = getStoredApiKeys(false);

      const inp1 = document.getElementById('gemini-api-key-input-1');
      const inp2 = document.getElementById('gemini-api-key-input-2');
      const inp3 = document.getElementById('gemini-api-key-input-3');
      const wrap2 = document.getElementById('gemini-key-2-wrapper');
      const wrap3 = document.getElementById('gemini-key-3-wrapper');
      const poolBadge = document.getElementById('gemini-vip-pool-badge');

      if (inp1) inp1.value = keys[0] || '';
      if (inp2) inp2.value = keys[1] || '';
      if (inp3) inp3.value = keys[2] || '';

      if (poolBadge) {
        poolBadge.style.display = isVip ? 'inline-block' : 'none';
      }

      [
        { inp: inp2, wrap: wrap2, num: 2 },
        { inp: inp3, wrap: wrap3, num: 3 }
      ].forEach(item => {
        if (!item.inp || !item.wrap) return;
        if (isVip) {
          item.inp.disabled = false;
          item.inp.placeholder = `Dán Gemini API Key ${item.num} (Tạo từ Project ${item.num})`;
          item.wrap.style.opacity = '1';
          item.wrap.onclick = null;
        } else {
          item.inp.disabled = true;
          item.inp.placeholder = item.inp.value ? `🔒 Khóa ${item.num} đã lưu (Kích hoạt VocaVIP để sử dụng)` : `🔒 Khóa ${item.num} (Dành riêng cho VocaVIP - Nhân 3 hạn ngạch)`;
          item.wrap.style.opacity = '0.55';
          item.wrap.onclick = () => {
            alert('👑 Tính năng Bể Đa Khóa API (Tối đa 3 Key từ các Project khác nhau để nhân 3 hạn ngạch) chỉ dành riêng cho thành viên VocaVIP!\n\nNâng cấp VocaVIP ngay để mở khóa toàn diện.');
            openVipSubscriptionModal();
          };
        }
      });

      updateSettingsApiKeysStatusText();
    }

    async function testGeminiConnection() {
      const keys = getStoredApiKeys();
      const statusText = document.getElementById('gemini-status-text');
      const btn = document.getElementById('btn-test-gemini');

      if (keys.length === 0) {
        if (statusText) {
          statusText.textContent = '⚠️ Vui lòng dán ít nhất 1 API Key trước khi kiểm tra!';
          statusText.style.color = '#f87171';
        }
        return;
      }

      if (btn) btn.textContent = '⏳ Đang thử toàn bộ khóa...';
      const models = typeof getGeminiModelsForTier === 'function' ? getGeminiModelsForTier('deep') : ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-2.0-flash', 'gemini-3.5-flash-lite'];

      const results = [];
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        let keyOk = false;
        for (const m of models) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            const testRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                contents: [{ parts: [{ text: 'Hi' }] }],
                generationConfig: { maxOutputTokens: 5 }
              })
            });
            clearTimeout(timeoutId);
            if (testRes.ok) {
              keyOk = true;
              if (typeof saveWorkingGeminiModel === 'function') {
                saveWorkingGeminiModel(m, 'deep');
              } else {
                localStorage.setItem('vocaflow_gemini_working_model', m);
              }
              break;
            }
          } catch (e) {}
        }
        results.push(`Khóa ${i+1}: ${keyOk ? '✅ Hoạt động' : '❌ Lỗi kết nối'}`);
      }

      if (btn) btn.textContent = '🧪 Thử kết nối toàn bộ khóa';
      if (statusText) {
        statusText.innerHTML = results.join(' • ');
        statusText.style.color = results.every(r => r.includes('✅')) ? '#34d399' : '#fbbf24';
      }
    }

    function toggleGeminiKeyGuide(e) {
      if (e) e.stopPropagation();
      const guide = document.getElementById('gemini-key-guide-box');
      if (guide) {
        guide.style.display = guide.style.display === 'none' ? 'block' : 'none';
      }
    }


    // =========================================================================
    // AI STUDY CHAT & VOCAMENTOR AI ENGINE (v0.10.9-alpha-29 MULTIMODAL & VIP EXCLUSIVE)
    // =========================================================================
    let aiChatHistory = [];
    let aiChatIsLoading = false;
    let aiChatAttachedImages = []; // Array of { id, name, mimeType, base64, previewUrl } (max 5)
    let aiMiniVoiceRecording = false;
    let aiMiniVoiceRecorder = null;
    let aiMiniVoiceChunks = [];
    let aiMiniVoiceWordTarget = '';

    function getAiChatStorageKey() {
      if (currentUser && currentUser.uid && !currentUser.uid.startsWith('guest_')) {
        return `vocaflow_ai_chat_history_${currentUser.uid}`;
      }
      return 'vocaflow_ai_chat_history';
    }

    function loadAiChatHistory() {
      try {
        const key = getAiChatStorageKey();
        const savedHistory = localStorage.getItem(key) || localStorage.getItem('vocaflow_ai_chat_history');
        if (savedHistory) aiChatHistory = JSON.parse(savedHistory) || [];
      } catch (e) {
        aiChatHistory = [];
      }
    }
    loadAiChatHistory();

    function saveAiChatHistoryToStorage() {
      try {
        const key = getAiChatStorageKey();
        localStorage.setItem(key, JSON.stringify(aiChatHistory));
        localStorage.setItem('vocaflow_ai_chat_history', JSON.stringify(aiChatHistory));
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }
    }

    function triggerAiChatImageSelect() {
      if (typeof isUserVip === 'function' && !isUserVip()) {
        alert('🔒 Tính năng đính kèm hình ảnh VocaMentor AI chỉ dành riêng cho thành viên VIP (VocaVIP)!');
        openVipPricingModal();
        return;
      }
      const input = document.getElementById('ai-chat-image-input');
      if (input) input.click();
    }
    window.triggerAiChatImageSelect = triggerAiChatImageSelect;

    function handleAiChatImageFileInput(input) {
      if (!input || !input.files || input.files.length === 0) return;
      processAiChatFiles(Array.from(input.files));
      input.value = '';
    }
    window.handleAiChatImageFileInput = handleAiChatImageFileInput;

    function processAiChatFiles(fileList) {
      if (!fileList || fileList.length === 0) return;
      if (typeof isUserVip === 'function' && !isUserVip()) {
        alert('🔒 Tính năng VocaMentor AI chỉ dành riêng cho thành viên VIP (VocaVIP)!');
        openVipPricingModal();
        return;
      }

      const maxImages = 5;
      const remainingSlots = maxImages - aiChatAttachedImages.length;
      if (remainingSlots <= 0) {
        showToast(`⚠️ Bạn đã đính kèm tối đa ${maxImages} ảnh!`);
        return;
      }

      const filesToAdd = fileList.filter(f => f && f.type && f.type.startsWith('image/')).slice(0, remainingSlots);
      if (filesToAdd.length === 0) {
        showToast('⚠️ Vui lòng chỉ chọn tệp hình ảnh (PNG, JPG, WebP...)!');
        return;
      }

      let loaded = 0;
      filesToAdd.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target.result;
          if (dataUrl) {
            const mimeType = file.type || 'image/jpeg';
            const base64 = dataUrl.split(',')[1];
            aiChatAttachedImages.push({
              id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
              name: file.name || 'Ảnh đính kèm',
              mimeType: mimeType,
              base64: base64,
              previewUrl: dataUrl
            });
          }
          loaded++;
          if (loaded === filesToAdd.length) {
            renderAiChatAttachedImages();
            showToast(`📸 Đã thêm ${filesToAdd.length} ảnh đính kèm (${aiChatAttachedImages.length}/${maxImages})`);
          }
        };
        reader.readAsDataURL(file);
      });
    }

    function removeAiChatAttachedImage(index) {
      if (index >= 0 && index < aiChatAttachedImages.length) {
        aiChatAttachedImages.splice(index, 1);
        renderAiChatAttachedImages();
      }
    }
    window.removeAiChatAttachedImage = removeAiChatAttachedImage;

    function renderAiChatAttachedImages() {
      const container = document.getElementById('ai-chat-attached-images-container');
      if (!container) return;

      if (aiChatAttachedImages.length === 0) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
      }

      container.style.display = 'flex';
      let html = '';
      aiChatAttachedImages.forEach((img, idx) => {
        html += `
          <div class="ai-chat-image-chip" title="${escapeHtml(img.name || 'Ảnh đính kèm')}">
            <img src="${img.previewUrl}" alt="Attached ${idx + 1}">
            <button type="button" class="ai-chat-image-chip-remove" onclick="removeAiChatAttachedImage(${idx})" title="Xóa ảnh này">✕</button>
          </div>
        `;
      });
      html += `<div style="font-size: 11px; color: var(--text-muted); align-self: center; margin-left: 4px;">(${aiChatAttachedImages.length}/5 ảnh)</div>`;
      container.innerHTML = html;
    }

    function handleAiChatClipboardPaste(e) {
      const modal = document.getElementById('modal-ai-mentor');
      if (!modal || !modal.classList.contains('active')) return;
      if (!e.clipboardData || !e.clipboardData.items) return;

      const items = Array.from(e.clipboardData.items);
      const imageItems = items.filter(item => item.type && item.type.indexOf('image') !== -1);
      if (imageItems.length === 0) return;

      const files = imageItems.map(item => item.getAsFile()).filter(Boolean);
      if (files.length > 0) {
        e.preventDefault();
        processAiChatFiles(files);
      }
    }
    window.removeEventListener('paste', handleAiChatClipboardPaste);
    window.addEventListener('paste', handleAiChatClipboardPaste);

    function getAiChatQuotaStatus() {
      checkResetAiChatDailyQuota();
      const isVip = isUserVip();
      if (isVip) {
        return {
          isVip: true,
          freeLimit: 999999,
          usedToday: aiChatDailyCount,
          remainingFree: 999999,
          isFree: true,
          canSend: true,
          costXu: 0
        };
      }
      const freeLimit = 5;
      const remainingFree = Math.max(0, freeLimit - aiChatDailyCount);
      return {
        isVip: false,
        freeLimit,
        usedToday: aiChatDailyCount,
        remainingFree,
        isFree: remainingFree > 0,
        canSend: remainingFree > 0,
        costXu: 0
      };
    }

    function updateAiChatQuotaUI() {
      const status = getAiChatQuotaStatus();
      const badge = document.getElementById('ai-mentor-quota-badge');
      const fabBadge = document.getElementById('ai-mentor-fab-badge');
      const feeNotice = document.getElementById('ai-chat-fee-notice');
      const sendBtnLabel = document.getElementById('btn-ai-chat-send-label');

      if (status.isVip) {
        if (badge) {
          badge.innerHTML = '👑 VocaVIP Vô Hạn';
          badge.style.background = 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(236, 72, 153, 0.25))';
          badge.style.color = '#fbbf24';
          badge.style.border = '1px solid rgba(251, 191, 36, 0.5)';
        }
        if (fabBadge) {
          fabBadge.innerHTML = '👑';
          fabBadge.style.background = 'linear-gradient(135deg, #f59e0b, #ec4899)';
        }
        if (feeNotice) {
          feeNotice.innerHTML = '<span style="color: #fbbf24; font-weight: 700;">👑 Đặc quyền VocaVIP:</span> Trò chuyện AI không giới hạn 24/7!';
        }
        if (sendBtnLabel) sendBtnLabel.textContent = 'Gửi';
      } else if (status.canSend) {
        if (badge) {
          badge.textContent = `${status.remainingFree}/5 lượt free`;
          badge.style.background = 'rgba(16,185,129,0.15)';
          badge.style.color = '#34d399';
          badge.style.border = '1px solid rgba(16,185,129,0.3)';
        }
        if (fabBadge) {
          fabBadge.textContent = status.remainingFree;
          fabBadge.style.background = '#10b981';
        }
        if (feeNotice) feeNotice.textContent = `Miễn phí hôm nay: còn ${status.remainingFree}/5 lượt • Hết lượt sẽ không thể dùng xu để tiếp tục`;
        if (sendBtnLabel) sendBtnLabel.textContent = 'Gửi';
      } else {
        if (badge) {
          badge.textContent = `0/5 lượt hôm nay`;
          badge.style.background = 'rgba(239,68,68,0.15)';
          badge.style.color = '#f87171';
          badge.style.border = '1px solid rgba(239,68,68,0.3)';
        }
        if (fabBadge) {
          fabBadge.textContent = '0';
          fabBadge.style.background = '#ef4444';
        }
        if (feeNotice) feeNotice.innerHTML = '<span style="color: #f87171; font-weight: 700;">⚠️ Đã dùng hết 5/5 lượt hôm nay:</span> Nâng cấp VocaVIP để mở khóa vô hạn!';
        if (sendBtnLabel) sendBtnLabel.textContent = 'Hết lượt (0/5)';
      }
    }

    function getCurrentStudyContext() {
      const curScreen = document.querySelector('.screen.active')?.id || '';
      
      // 1. If on home/decks list (screen-decks), it is ALWAYS Free / Global context
      if (curScreen === 'screen-decks' || !curScreen) {
        return {
          screen: 'screen-decks',
          deck: null,
          word: null
        };
      }

      let activeDeck = null;
      let activeWord = null;

      if (currentDeckId) {
        activeDeck = decks.find(d => d.id === currentDeckId);
      }

      // 2. If in single flashcard mode, resolve active word
      if (curScreen === 'screen-flashcard' && activeDeck) {
        const deckWords = words.filter(w => w.deckId === activeDeck.id);
        if (deckWords.length > 0 && typeof currentCardIndex === 'number') {
          activeWord = deckWords[currentCardIndex % deckWords.length] || null;
        }
      }

      return {
        screen: curScreen,
        deck: activeDeck,
        word: activeWord
      };
    }

    function updateAiMentorContextUI() {
      try {
        const ctx = getCurrentStudyContext();
        const textEl = document.getElementById('ai-mentor-context-text');
        const badgeEl = document.getElementById('ai-mentor-context-badge');
        const chipsContainer = document.getElementById('ai-mentor-chips-container');

        if (!textEl || !chipsContainer) return;

        let chipsHtml = '';

        if (ctx.word) {
          textEl.textContent = `Từ: "${ctx.word.term}" (${ctx.deck ? ctx.deck.title : 'VocaDeck'})`;
          if (badgeEl) {
            badgeEl.textContent = 'Thẻ từ vựng';
            badgeEl.style.background = 'rgba(99,102,241,0.2)';
            badgeEl.style.color = '#a5b4fc';
          }
          chipsHtml = `
            <button type="button" class="btn btn-outline btn-sm" onclick="triggerAiQuickChip('word_deep')" style="font-size: 11px; padding: 4px 10px; border-radius: 20px; white-space: nowrap; flex-shrink: 0;">💡 Giải thích sâu</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="triggerAiQuickChip('word_compare')" style="font-size: 11px; padding: 4px 10px; border-radius: 20px; white-space: nowrap; flex-shrink: 0;">⚔️ Phân biệt từ</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="triggerAiQuickChip('word_examples')" style="font-size: 11px; padding: 4px 10px; border-radius: 20px; white-space: nowrap; flex-shrink: 0;">📝 3 câu ví dụ</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="triggerAiQuickChip('word_voice')" style="font-size: 11px; padding: 4px 10px; border-radius: 20px; white-space: nowrap; flex-shrink: 0;">🎙️ Luyện phát âm</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="triggerAiQuickChip('word_quiz')" style="font-size: 11px; padding: 4px 10px; border-radius: 20px; white-space: nowrap; flex-shrink: 0;">🎯 Mini Quiz</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="triggerAiQuickChip('word_mnemonic')" style="font-size: 11px; padding: 4px 10px; border-radius: 20px; white-space: nowrap; flex-shrink: 0;">🧠 Mẹo nhớ từ</button>
          `;
        } else if (ctx.deck) {
          textEl.textContent = `VocaDeck: "${ctx.deck.title}"`;
          if (badgeEl) {
            badgeEl.textContent = 'VocaDeck';
            badgeEl.style.background = 'rgba(16,185,129,0.15)';
            badgeEl.style.color = '#34d399';
          }
          chipsHtml = `
            <button type="button" class="btn btn-outline btn-sm" onclick="triggerAiQuickChip('deck_summary')" style="font-size: 11px; padding: 4px 10px; border-radius: 20px; white-space: nowrap; flex-shrink: 0;">💡 Tóm tắt VocaDeck</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="triggerAiQuickChip('deck_quiz')" style="font-size: 11px; padding: 4px 10px; border-radius: 20px; white-space: nowrap; flex-shrink: 0;">🎯 Mini Quiz bộ này</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="triggerAiQuickChip('deck_roleplay')" style="font-size: 11px; padding: 4px 10px; border-radius: 20px; white-space: nowrap; flex-shrink: 0;">🎭 Roleplay hội thoại</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="triggerAiQuickChip('grammar')" style="font-size: 11px; padding: 4px 10px; border-radius: 20px; white-space: nowrap; flex-shrink: 0;">🧐 Sửa ngữ pháp</button>
          `;
        } else {
          textEl.textContent = 'Chế độ học tự do';
          if (badgeEl) {
            badgeEl.textContent = 'Tự do';
            badgeEl.style.background = 'rgba(56,189,248,0.15)';
            badgeEl.style.color = '#38bdf8';
          }
          chipsHtml = `
            <button type="button" class="btn btn-outline btn-sm" onclick="triggerAiQuickChip('grammar')" style="font-size: 11px; padding: 4px 10px; border-radius: 20px; white-space: nowrap; flex-shrink: 0;">🧐 Sửa ngữ pháp</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="triggerAiQuickChip('translate')" style="font-size: 11px; padding: 4px 10px; border-radius: 20px; white-space: nowrap; flex-shrink: 0;">🎯 Dịch bản xứ</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="triggerAiQuickChip('read')" style="font-size: 11px; padding: 4px 10px; border-radius: 20px; white-space: nowrap; flex-shrink: 0;">🎙️ Luyện phát âm</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="triggerAiQuickChip('quiz_free')" style="font-size: 11px; padding: 4px 10px; border-radius: 20px; white-space: nowrap; flex-shrink: 0;">🎯 Đố vui trắc nghiệm</button>
          `;
        }

        chipsContainer.innerHTML = chipsHtml;
      } catch (err) {
        console.warn('Error updating AI Mentor context UI:', err);
      }
    }

    function triggerAiQuickChip(chipKey) {
      const ctx = getCurrentStudyContext();
      let promptText = '';

      if (chipKey === 'grammar') {
        promptText = '🧐 Soi lỗi và giải thích ngữ pháp cho câu: ';
      } else if (chipKey === 'translate') {
        promptText = '🎯 Dịch tự nhiên sang văn phong bản xứ câu: ';
      } else if (chipKey === 'read') {
        promptText = '🎙️ Giúp tao luyện đọc câu tiếng Anh này: ';
      } else if (chipKey === 'quiz_free') {
        promptText = '🎯 Tạo cho tao 1 câu đố trắc nghiệm chủ đề: ';
      } else if (chipKey === 'deck_summary') {
        const title = ctx.deck ? ctx.deck.title : 'VocaDeck này';
        promptText = `💡 Tóm tắt các chủ điểm từ vựng và cấu trúc quan trọng nhất trong VocaDeck "${title}"`;
      } else if (chipKey === 'deck_quiz') {
        const title = ctx.deck ? ctx.deck.title : 'VocaDeck này';
        promptText = `🎯 Tạo 1 câu hỏi trắc nghiệm mini từ các từ vựng trong VocaDeck "${title}"`;
      } else if (chipKey === 'deck_roleplay') {
        const title = ctx.deck ? ctx.deck.title : 'VocaDeck này';
        promptText = `🎭 Hãy bắt đầu một đoạn hội thoại Roleplay ngắn đóng vai tình huống thực tế áp dụng từ vựng trong bộ "${title}"`;
      } else if (chipKey === 'word_deep') {
        const term = ctx.word ? ctx.word.term : 'từ này';
        promptText = `💡 Phân tích chuyên sâu sắc thái nghĩa và ngữ cảnh thực tế của từ "${term}"`;
      } else if (chipKey === 'word_compare') {
        const term = ctx.word ? ctx.word.term : 'từ này';
        promptText = `⚔️ So sánh và phân biệt từ "${term}" với các từ đồng nghĩa dễ gây nhầm lẫn`;
      } else if (chipKey === 'word_examples') {
        const term = ctx.word ? ctx.word.term : 'từ này';
        promptText = `📝 Đặt 3 câu ví dụ cho từ "${term}" theo 3 ngữ cảnh: Giao tiếp thường ngày, Học thuật IELTS/TOEIC và Môi trường công việc`;
      } else if (chipKey === 'word_voice') {
        const term = ctx.word ? ctx.word.term : 'từ này';
        promptText = `🎙️ Giúp tao đọc chuẩn từ "${term}", phân tích khẩu hình, trọng âm và âm đuôi`;
      } else if (chipKey === 'word_quiz') {
        const term = ctx.word ? ctx.word.term : 'từ này';
        promptText = `🎯 Tạo 1 câu hỏi trắc nghiệm mini để kiểm tra cách dùng chính xác của từ "${term}"`;
      } else if (chipKey === 'word_mnemonic') {
        const term = ctx.word ? ctx.word.term : 'từ này';
        promptText = `🧠 Cho tao mẹo nhớ hoặc câu chuyện liên tưởng sáng tạo để nhớ lâu từ "${term}"`;
      }

      const input = document.getElementById('ai-chat-input');
      if (!input || !promptText) return;
      input.value = promptText;
      updateAiChatInputLength();
      if (promptText.endsWith(': ')) {
        input.focus();
        input.selectionStart = input.selectionEnd = input.value.length;
      } else {
        handleSendAiChatMessage();
      }
    }

    function updateAiChatInputLength() {
      const input = document.getElementById('ai-chat-input');
      const counter = document.getElementById('ai-chat-char-counter');
      if (input && counter) {
        counter.textContent = `${input.value.length}/300`;
      }
    }

    function openAiMentorModal() {
      try {
        const isGuest = !currentUser || !currentUser.email;
        const isVip = typeof isUserVip === 'function' ? isUserVip() : false;
        const vView = document.getElementById('aimentor-vip-lock-view');
        const kView = document.getElementById('aimentor-apikey-lock-view');
        const aView = document.getElementById('aimentor-main-authenticated-view');

        // Requirement 5: Lock completely for Guest and Non-VIP users
        if (isGuest || !isVip) {
          if (vView) vView.style.display = 'flex';
          if (kView) kView.style.display = 'none';
          if (aView) aView.style.display = 'none';
          openModal('modal-ai-mentor');
          return;
        }

        if (!hasAtLeastOneApiKey()) {
          if (vView) vView.style.display = 'none';
          if (kView) kView.style.display = 'flex';
          if (aView) aView.style.display = 'none';
          openModal('modal-ai-mentor');
          return;
        }

        if (vView) vView.style.display = 'none';
        if (kView) kView.style.display = 'none';
        if (aView) aView.style.display = 'flex';

        // Anti-Cheat: If on exam screen, prevent opening
        const activeExam = document.querySelector('.screen.active');
        if (activeExam && ['screen-quiz', 'screen-spelling', 'screen-speaking', 'screen-autofc'].includes(activeExam.id)) {
          showToast('🔒 VocaAI không khả dụng trong phòng thi / chế độ luyện tập tập trung!');
          return;
        }
        loadAiChatHistory();
        updateAiMentorContextUI();
        updateAiChatQuotaUI();
        renderAiChatAttachedImages();
        renderAiChatMessages();
        openModal('modal-ai-mentor');
        if (typeof initMonetagPassiveAds === 'function') initMonetagPassiveAds();

        // Realtime sync latest quota from Cloud RTDB
        if (typeof refreshAiChatQuotaFromCloud === 'function') {
          refreshAiChatQuotaFromCloud();
        }

        setTimeout(() => {
          const input = document.getElementById('ai-chat-input');
          if (input) input.focus();
          scrollAiChatToBottom();
        }, 100);
      } catch (err) {
        console.error('Error opening AI Mentor modal:', err);
        openModal('modal-ai-mentor');
      }
    }

    function clearAiChatHistory() {
      if (aiChatHistory.length === 0) return;
      if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện với VocaMentor AI?')) return;
      aiChatHistory = [];
      saveAiChatHistoryToStorage();
      renderAiChatMessages();
      showToast('🗑️ Đã xóa sạch lịch sử trò chuyện.');

      if (currentUser && currentUser.uid && !currentUser.uid.startsWith('guest_')) {
        const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
        const authParam = (currentUser && currentUser.idToken) ? '?auth=' + currentUser.idToken : '';
        fetch(`${rtdbUrl}/users/${currentUser.uid}/aiChatHistory.json${authParam}`, {
          method: 'DELETE'
        }).catch(() => {});
      }
    }

    function scrollAiChatToBottom() {
      const container = document.getElementById('ai-chat-messages');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }

    function renderAiChatMessages() {
      const container = document.getElementById('ai-chat-messages');
      if (!container) return;

      if (aiChatHistory.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 40px 16px; color: var(--text-muted);">
            <div style="font-size: 40px; margin-bottom: 10px;">🤖</div>
            <div style="font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 6px;">Chào bạn! Mình là VocaMentor AI</div>
            <div style="font-size: 12.5px; line-height: 1.5; max-width: 440px; margin: 0 auto; color: var(--text-muted);">
              Được trang bị <strong>Gemini 3.8 Flash Vision</strong>, mình có thể giải thích chuyên sâu, sửa lỗi ngữ pháp, đóng vai hội thoại, luyện phát âm và đặc biệt là <strong>phân tích ảnh chụp bài tập/sách (tối đa 5 ảnh hoặc dán Ctrl+V)</strong>.
            </div>
          </div>
        `;
        return;
      }

      let html = '';
      aiChatHistory.forEach((msg, idx) => {
        const isUser = msg.role === 'user';
        const isError = msg.isError;
        const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';

        if (isUser) {
          let userImagesHtml = '';
          if (msg.images && Array.isArray(msg.images) && msg.images.length > 0) {
            userImagesHtml = '<div class="ai-chat-msg-images-grid">';
            msg.images.forEach((imgObj, iIdx) => {
              const src = imgObj.previewUrl || (imgObj.base64 ? `data:${imgObj.mimeType || 'image/jpeg'};base64,${imgObj.base64}` : '');
              if (src) {
                userImagesHtml += `<img src="${src}" class="ai-chat-msg-img-thumb" onclick="openBugScreenshotViewer('${src}')" title="Bấm để phóng to ảnh ${iIdx + 1}">`;
              }
            });
            userImagesHtml += '</div>';
          }

          html += `
            <div style="display: flex; justify-content: flex-end; align-items: flex-end; gap: 8px;">
              <div style="max-width: 84%; background: linear-gradient(135deg, #4f46e5, #6366f1); color: white; border-radius: 14px 14px 2px 14px; padding: 10px 14px; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);">
                ${userImagesHtml}
                ${msg.text ? `<div style="font-size: 13px; line-height: 1.45; word-break: break-word;">${escapeHtml(msg.text)}</div>` : ''}
                <div style="font-size: 9.5px; opacity: 0.75; text-align: right; margin-top: 4px;">${timeStr}</div>
              </div>
            </div>
          `;
        } else {
          const parsedContent = formatAiChatMarkdown(msg.text, idx);
          html += `
            <div style="display: flex; justify-content: flex-start; align-items: flex-start; gap: 10px;">
              <div style="width: 32px; height: 32px; min-width: 32px; min-height: 32px; border-radius: 8px; background: linear-gradient(135deg, #f59e0b, #ec4899); color: white; display: flex; align-items: center; justify-content: center; font-size: 16px; margin-top: 2px; box-shadow: 0 2px 6px rgba(245, 158, 11, 0.3);">
                🤖
              </div>
              <div style="max-width: 86%; background: ${isError ? 'rgba(239,68,68,0.1)' : 'var(--surface-elevated)'}; border: 1px solid ${isError ? 'rgba(239,68,68,0.3)' : 'var(--border)'}; border-radius: 14px 14px 14px 2px; padding: 12px 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="font-size: 13px; line-height: 1.5; color: var(--text); word-break: break-word;">
                  ${parsedContent}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; padding-top: 6px; border-top: 1px dashed rgba(255,255,255,0.06); font-size: 10px; color: var(--text-muted);">
                  <span>VocaMentor AI (Gemini 3.8 Flash)</span>
                  <div style="display: flex; gap: 6px;">
                    <button type="button" onclick="copyAiChatText(${idx})" title="Sao chép câu trả lời" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 11px; padding: 0;">📋 Sao chép</button>
                    <span>• ${timeStr}</span>
                  </div>
                </div>
              </div>
            </div>
          `;
        }
      });

      if (aiChatIsLoading) {
        html += `
          <div style="display: flex; justify-content: flex-start; align-items: flex-start; gap: 10px;" id="ai-chat-loading-bubble">
            <div style="width: 32px; height: 32px; min-width: 32px; min-height: 32px; border-radius: 8px; background: linear-gradient(135deg, #f59e0b, #ec4899); color: white; display: flex; align-items: center; justify-content: center; font-size: 16px;">
              🤖
            </div>
            <div style="background: var(--surface-elevated); border: 1px solid var(--border); border-radius: 14px 14px 14px 2px; padding: 12px 14px;">
              <div style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #a5b4fc;">
                <span class="spinner" style="width: 14px; height: 14px; border: 2px solid #a5b4fc; border-top-color: transparent; border-radius: 50%; display: inline-block; animation: spin 0.8s linear infinite;"></span>
                <span>VocaMentor AI đang phân tích dữ liệu & ảnh...</span>
              </div>
            </div>
          </div>
        `;
      }

      container.innerHTML = html;
      scrollAiChatToBottom();
    }

    function copyAiChatText(msgIndex) {
      const msg = aiChatHistory[msgIndex];
      if (!msg || !msg.text) return;
      navigator.clipboard.writeText(msg.text).then(() => {
        showToast('📋 Đã sao chép câu trả lời vào bộ nhớ tạm!');
      }).catch(() => {
        showToast('⚠️ Không thể sao chép.');
      });
    }

    let aiQuizCache = {};

    function formatAiChatMarkdown(rawText, msgIndex) {
      if (!rawText) return '';
      let text = rawText;
      const placeholders = [];

      // 1. Parse and extract [MINI_QUIZ: {...}]
      const quizRegex = /\[MINI_QUIZ:\s*(\{.*?\})\]/gs;
      text = text.replace(quizRegex, (match, jsonStr) => {
        try {
          const qData = JSON.parse(jsonStr);
          const qId = 'ai_quiz_' + msgIndex + '_' + Math.random().toString(36).substr(2, 6);
          
          aiQuizCache[qId] = {
            q: qData.q || qData.question || '',
            options: qData.options || [],
            answer: qData.answer !== undefined ? qData.answer : 0,
            explain: qData.explain || ''
          };

          let optionsHtml = '';
          (qData.options || []).forEach((opt, oIdx) => {
            const letter = ['A','B','C','D'][oIdx] || (oIdx + 1);
            // Clean option: strip leading "A. ", "A) ", "1. ", "a. "
            const cleanOpt = (opt || '').toString().replace(/^[A-Da-d0-9][\.\)\-\:\s]+\s*/, '').trim();
            optionsHtml += `
              <button type="button" class="btn btn-outline btn-sm ai-quiz-opt" id="${qId}_opt_${oIdx}" onclick="handleAiMiniQuizAnswer('${qId}', ${oIdx})" style="text-align: left; justify-content: flex-start; padding: 9px 12px; font-size: 12.5px; border-radius: 8px; width: 100%; line-height: 1.4; cursor: pointer; transition: all 0.15s ease;">
                <strong style="margin-right: 8px; color: #818cf8; font-size: 13px;">${letter}.</strong> <span>${escapeHtml(cleanOpt)}</span>
              </button>
            `;
          });

          const cardHtml = `
            <div class="ai-mini-quiz-card" id="${qId}" style="background: var(--surface-elevated); border: 1px solid var(--border); border-radius: 12px; padding: 12px; margin: 10px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <div style="font-size: 11px; font-weight: 700; color: #38bdf8; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
                <span>🎯 CÂU HỎI TRẮC NGHIỆM TƯƠNG TÁC:</span>
              </div>
              <div style="font-weight: 700; font-size: 13.5px; margin-bottom: 10px; color: var(--text); line-height: 1.4;">
                ${escapeHtml(qData.q || qData.question || 'Chọn đáp án đúng:')}
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${optionsHtml}
              </div>
              <div id="${qId}_explain" style="display: none; margin-top: 10px; padding: 10px 12px; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); border-radius: 8px; font-size: 12px; line-height: 1.5;"></div>
            </div>
          `;
          const phKey = `###AI_PLACEHOLDER_${placeholders.length}###`;
          placeholders.push({ key: phKey, html: cardHtml });
          return phKey;
        } catch (e) {
          return '';
        }
      });

      // 2. Parse and extract [VOICE_CHECK: ...] (support word or sentence/text)
      const voiceRegex = /\[VOICE_CHECK:\s*(\{.*?\})\]/gs;
      text = text.replace(voiceRegex, (match, jsonStr) => {
        try {
          const vData = JSON.parse(jsonStr);
          const vTarget = (vData.text || vData.word || '').trim();
          const vIpa = (vData.ipa || '').trim();
          const isSentence = vTarget.includes(' ');
          const vId = 'ai_voice_' + msgIndex + '_' + Math.random().toString(36).substr(2, 4);
          const textEsc = escapeHtml(vTarget).replace(/'/g, "\\'");

          const cardHtml = `
            <div class="ai-voice-check-card" id="${vId}" style="background: var(--surface-elevated); border: 1px solid var(--border); border-radius: 12px; padding: 12px; margin: 10px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <div style="font-size: 11px; font-weight: 700; color: #f472b6; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
                <span>🎙️ PHÒNG LUYỆN NÓI TẠI CHỖ (${isSentence ? 'LUYỆN ĐỌC CÂU' : 'LUYỆN PHÁT ÂM TỪ'}):</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                <div style="flex: 1; min-width: 180px;">
                  <strong style="font-size: 14.5px; color: var(--text); line-height: 1.4;">${escapeHtml(vTarget)}</strong>
                  ${vIpa ? `<div style="font-family: monospace; color: #a5b4fc; font-size: 12px; margin-top: 2px;">${escapeHtml(vIpa)}</div>` : ''}
                </div>
                <button type="button" class="btn btn-outline btn-sm" onclick="speakText('${textEsc}')" style="font-size: 11.5px; padding: 4px 10px; border-radius: 8px; color: #38bdf8; flex-shrink: 0;">
                  🔊 Nghe mẫu
                </button>
              </div>
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <button type="button" id="${vId}_btn" class="btn btn-primary btn-sm" onclick="toggleAiMiniVoiceRecord('${vId}', '${textEsc}')" style="background: linear-gradient(135deg, #ec4899, #db2777); border: none; font-weight: 700; padding: 6px 14px; border-radius: 8px;">
                  🎙️ Nhấn để thu âm
                </button>
                <span id="${vId}_status" style="font-size: 11.5px; color: var(--text-muted);">Bấm Mic và đọc ${isSentence ? 'câu' : 'từ'} này rõ ràng</span>
              </div>
              <div id="${vId}_result" style="display: none; margin-top: 12px; padding: 12px; border-radius: 10px; font-size: 12px; line-height: 1.5;"></div>
            </div>
          `;
          const phKey = `###AI_PLACEHOLDER_${placeholders.length}###`;
          placeholders.push({ key: phKey, html: cardHtml });
          return phKey;
        } catch (e) {
          return '';
        }
      });

      // 3. Escape HTML and format Markdown
      let formatted = escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #a5b4fc;">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^\s*-\s+(.*)$/gm, '<li style="margin-left: 16px;">$1</li>')
        .replace(/\n/g, '<br>');

      // 4. Restore interactive HTML cards
      placeholders.forEach(ph => {
        formatted = formatted.replace(ph.key, ph.html);
      });

      return formatted;
    }

    function handleAiMiniQuizAnswer(qId, selectedIdx) {
      const container = document.getElementById(qId);
      if (!container) return;
      const data = aiQuizCache[qId] || {};

      let correctIdx = 0;
      if (typeof data.answer === 'number') {
        correctIdx = data.answer;
      } else if (typeof data.answer === 'string') {
        const rawAns = data.answer.trim().toUpperCase();
        if (rawAns.startsWith('A') || rawAns === '0') correctIdx = 0;
        else if (rawAns.startsWith('B') || rawAns === '1') correctIdx = 1;
        else if (rawAns.startsWith('C') || rawAns === '2') correctIdx = 2;
        else if (rawAns.startsWith('D') || rawAns === '3') correctIdx = 3;
        else {
          const fIdx = (data.options || []).findIndex(opt => opt.toLowerCase().includes(data.answer.toLowerCase().trim()));
          correctIdx = fIdx !== -1 ? fIdx : 0;
        }
      }

      const buttons = container.querySelectorAll('.ai-quiz-opt');
      buttons.forEach((btn, idx) => {
        btn.disabled = true;
        btn.style.pointerEvents = 'none';
        if (idx === correctIdx) {
          btn.style.background = 'rgba(16,185,129,0.25)';
          btn.style.borderColor = '#10b981';
          btn.style.color = '#34d399';
          btn.style.fontWeight = '700';
        } else if (idx === selectedIdx && selectedIdx !== correctIdx) {
          btn.style.background = 'rgba(239,68,68,0.25)';
          btn.style.borderColor = '#ef4444';
          btn.style.color = '#f87171';
        }
      });

      const explainEl = document.getElementById(qId + '_explain');
      if (explainEl) {
        explainEl.style.display = 'block';
        const isRight = selectedIdx === correctIdx;
        const formattedExplain = (data.explain || 'Đáp án đúng là lựa chọn được tô xanh.')
          .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #6ee7b7;">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>');

        explainEl.innerHTML = `
          <div style="font-weight: 700; color: ${isRight ? '#34d399' : '#f87171'}; margin-bottom: 4px; font-size: 13px;">
            ${isRight ? '🎉 Chính xác!' : '❌ Chưa chính xác!'}
          </div>
          <div style="color: var(--text); line-height: 1.5;">${formattedExplain}</div>
        `;
      }
    }

    async function toggleAiMiniVoiceRecord(vId, targetWord) {
      if (aiMiniVoiceRecording) {
        stopAiMiniVoiceRecord(vId, targetWord);
      } else {
        startAiMiniVoiceRecord(vId, targetWord);
      }
    }

    async function startAiMiniVoiceRecord(vId, targetWord) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        aiMiniVoiceRecorder = new MediaRecorder(stream);
        aiMiniVoiceChunks = [];

        aiMiniVoiceRecorder.ondataavailable = e => {
          if (e.data && e.data.size > 0) aiMiniVoiceChunks.push(e.data);
        };

        aiMiniVoiceRecorder.onstop = async () => {
          const blob = new Blob(aiMiniVoiceChunks, { type: 'audio/webm' });
          stream.getTracks().forEach(t => t.stop());
          evaluateAiMiniVoiceAudio(vId, targetWord, blob);
        };

        aiMiniVoiceRecorder.start();
        aiMiniVoiceRecording = true;

        const btn = document.getElementById(vId + '_btn');
        const statusEl = document.getElementById(vId + '_status');
        if (btn) {
          btn.textContent = '⏹️ Dừng thu âm';
          btn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        }
        if (statusEl) {
          statusEl.textContent = '🔴 Đang lắng nghe bạn nói...';
          statusEl.style.color = '#f87171';
        }

      } catch (err) {
        showToast('⚠️ Không thể truy cập Microphone!');
      }
    }

    function stopAiMiniVoiceRecord(vId, targetWord) {
      if (aiMiniVoiceRecorder && aiMiniVoiceRecorder.state !== 'inactive') {
        aiMiniVoiceRecorder.stop();
      }
      aiMiniVoiceRecording = false;
      const btn = document.getElementById(vId + '_btn');
      const statusEl = document.getElementById(vId + '_status');
      if (btn) {
        btn.textContent = '⏳ Đang chấm điểm...';
        btn.disabled = true;
      }
      if (statusEl) {
        statusEl.textContent = 'AI đang phân tích khẩu hình...';
        statusEl.style.color = '#fbbf24';
      }
    }

    function getEffectiveGeminiApiKey() {
      return (geminiApiKey || localStorage.getItem(STORAGE_KEY_GEMINI_KEY) || localStorage.getItem('vocaflow_gemini_api_key') || '').trim();
    }

    async function evaluateAiMiniVoiceAudio(vId, targetText, audioBlob) {
      const btn = document.getElementById(vId + '_btn');
      const statusEl = document.getElementById(vId + '_status');
      const resultEl = document.getElementById(vId + '_result');

      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result ? reader.result.split(',')[1] : '';
        if (!base64Audio) {
          if (btn) { btn.disabled = false; btn.textContent = '🎙️ Thu âm lại'; btn.style.background = 'linear-gradient(135deg, #ec4899, #db2777)'; }
          if (statusEl) statusEl.textContent = 'Lỗi thu âm. Vui lòng thử lại!';
          return;
        }

        const key = getEffectiveGeminiApiKey();
        if (!key) {
          if (resultEl) {
            resultEl.style.display = 'block';
            resultEl.style.background = 'rgba(239,68,68,0.15)';
            resultEl.innerHTML = '🔑 Vui lòng nhập API Key trong mục ⚙️ Cài đặt để chấm điểm phát âm.';
          }
          if (btn) { btn.disabled = false; btn.textContent = '🎙️ Thu âm lại'; }
          return;
        }

        const keys = typeof getStoredApiKeys === 'function' ? getStoredApiKeys() : [key];
        const modelsToTry = typeof getGeminiModelsForTier === 'function' ? getGeminiModelsForTier('deep') : ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-2.0-flash', 'gemini-3.5-flash-lite'];

        const isSentence = targetText.trim().includes(' ');
        const promptInstruction = isSentence
          ? `Bạn là chuyên gia thẩm âm và luyện ngữ điệu tiếng Anh bản xứ hàng đầu. Flower vừa thu âm đọc CÂU: "${targetText}".
Hãy lắng nghe và phân tích cực kỳ chi tiết, sâu sắc (3-5 câu nhận xét bằng tiếng Việt) về:
1. Độ rõ và chuẩn của các từ khóa quan trọng trong câu, âm đầu và âm đuôi (ending sounds).
2. Trọng âm câu (sentence stress), hiện tượng nối âm (linking sounds) và ngữ điệu (intonation lên/xuống giọng).
3. Hướng dẫn cụ thể cách mở khẩu hình, đặt vị trí lưỡi và ngắt nhịp để nói câu này tự nhiên và "Tây" như người bản xứ.
Trả về DUY NHẤT một chuỗi JSON hợp lệ (không markdown block, không giải thích ngoài JSON):
{
  "score": 85,
  "detected": "Câu phát hiện được",
  "feedbackVi": "Nhận xét ngữ điệu, nối âm và ngữ pháp câu súc tích, tự nhiên và chỉ dẫn cụ thể",
  "strengths": "Điểm Flower làm tốt",
  "improvements": "Điểm Flower cần khắc phục để nói tự nhiên hơn"
}`
          : `Bạn là chuyên gia thẩm âm và phát âm tiếng Anh bản xứ hàng đầu. Flower vừa thu âm đọc TỪ VỰNG: "${targetText}".
Hãy lắng nghe và phân tích cực kỳ chi tiết, sâu sắc (3-5 câu nhận xét bằng tiếng Việt) về:
1. Độ chuẩn của nguyên âm (vowels), phụ âm đầu (onset), và đặc biệt là ÂM ĐUÔI (ending sounds / coda).
2. Trọng âm của từ (word stress) đã rơi đúng âm tiết chưa.
3. Hướng dẫn cụ thể cách mở khẩu hình, đặt vị trí lưỡi để khắc phục triệt để lỗi người Việt hay gặp khi phát âm từ này.
Trả về DUY NHẤT một chuỗi JSON hợp lệ (không markdown block, không giải thích ngoài JSON):
{
  "score": 85,
  "detected": "Từ phát hiện được",
  "feedbackVi": "Nhận xét phát âm chi tiết, súc tích và chỉ dẫn cụ thể khẩu hình",
  "strengths": "Điểm Flower làm tốt",
  "improvements": "Điểm Flower cần khắc phục"
}`;

        const payload = {
          contents: [{
            parts: [
              { text: promptInstruction },
              {
                inlineData: {
                  mimeType: audioBlob.type || 'audio/webm',
                  data: base64Audio
                }
              }
            ]
          }]
        };

        let parsed = null;

        for (const k of keys) {
          if (parsed) break;
          for (const m of modelsToTry) {
            try {
              const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k.trim()}`;
              const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });

              if (res.ok) {
                const data = await res.json();
                const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
                try {
                  parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
                  if (typeof saveWorkingGeminiModel === 'function') {
                    saveWorkingGeminiModel(m, 'deep');
                  } else {
                    localStorage.setItem('vocaflow_gemini_working_model', m);
                  }
                  break;
                } catch (e) {
                  parsed = { score: 80, feedbackVi: rawText, detected: targetText };
                  break;
                }
              }
            } catch (e) {
              console.warn(`Mini Voice model ${m} error:`, e);
            }
          }
        }

        if (parsed) {
          const score = typeof parsed.score === 'number' ? parsed.score : 75;
          const isGood = score >= 75;
          const detected = parsed.detected || targetText;
          const feedback = parsed.feedbackVi || 'Phát âm của bạn khá tốt!';
          const strengths = parsed.strengths || '';
          const improvements = parsed.improvements || '';

          if (resultEl) {
            resultEl.style.display = 'block';
            resultEl.style.background = isGood ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)';
            resultEl.style.border = `1px solid ${isGood ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.35)'}`;
            
            let extraPills = '';
            if (strengths) {
              extraPills += `<div style="margin-top: 6px; padding: 6px 8px; background: rgba(16,185,129,0.15); border-radius: 6px; font-size: 11.5px; color: #a7f3d0;"><strong>🌟 Điểm tốt:</strong> ${escapeHtml(strengths)}</div>`;
            }
            if (improvements) {
              extraPills += `<div style="margin-top: 6px; padding: 6px 8px; background: rgba(245,158,11,0.15); border-radius: 6px; font-size: 11.5px; color: #fde68a;"><strong>💡 Mẹo cải thiện:</strong> ${escapeHtml(improvements)}</div>`;
            }

            resultEl.innerHTML = `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 4px;">
                <strong style="color: ${isGood ? '#34d399' : '#fbbf24'}; font-size: 13.5px;">${isGood ? '🌟 Phát âm Đạt' : '⚠️ Cần cải thiện'}: ${score}/100đ</strong>
                <span style="font-size: 11.5px; color: var(--text-muted);">AI nghe được: "<em>${escapeHtml(detected)}</em>"</span>
              </div>
              <div style="color: var(--text); font-size: 12px; line-height: 1.5;">${escapeHtml(feedback)}</div>
              ${extraPills}
            `;
          }
        } else {
          if (resultEl) {
            resultEl.style.display = 'block';
            resultEl.style.background = 'rgba(239,68,68,0.15)';
            resultEl.textContent = '⚠️ Không thể kết nối dịch vụ chấm điểm phát âm.';
          }
        }

        if (btn) {
          btn.disabled = false;
          btn.textContent = '🎙️ Thu âm lại';
          btn.style.background = 'linear-gradient(135deg, #ec4899, #db2777)';
        }
        if (statusEl) statusEl.textContent = 'Đã hoàn tất đánh giá';
      };
    }

    async function handleSendAiChatMessage(e = null) {
      if (e) e.preventDefault();
      
      const quota = getAiChatQuotaStatus();
      if (!quota.isVip && !quota.canSend) {
        alert('🔒 Bạn đã sử dụng hết 5/5 lượt VocaMentor AI miễn phí hôm nay!\n\nTheo quy định mới, tài khoản thường không thể dùng VoCoin để tiếp tục. Hãy nâng cấp VocaVIP để trò chuyện không giới hạn hoặc quay lại vào ngày mai nhé!');
        openVipPricingModal();
        return;
      }

      if (!hasAtLeastOneApiKey()) {
        alert('🔒 Chức năng VocaMentor AI yêu cầu kết nối ít nhất 1 Google Gemini API Key!\n\nVui lòng vào Cài Đặt để nhập API Key.');
        openSettingsModal();
        return;
      }
      if (aiChatIsLoading) return;

      const input = document.getElementById('ai-chat-input');
      const rawText = input ? (input.value || '').trim() : '';
      const attachedToSend = [...aiChatAttachedImages];

      if (!rawText && attachedToSend.length === 0) return;

      const userMsg = {
        id: 'msg_' + Date.now(),
        role: 'user',
        text: rawText,
        images: attachedToSend.map(img => ({
          name: img.name || 'Ảnh đính kèm',
          mimeType: img.mimeType || 'image/jpeg',
          base64: img.base64,
          previewUrl: img.previewUrl
        })),
        timestamp: new Date().toISOString()
      };

      aiChatHistory.push(userMsg);
      if (typeof recordAiChatUsed === 'function') recordAiChatUsed();
      if (aiChatHistory.length > 30) aiChatHistory = aiChatHistory.slice(-30);
      saveAiChatHistoryToStorage();

      if (input) input.value = '';
      aiChatAttachedImages = [];
      renderAiChatAttachedImages();
      updateAiChatInputLength();
      aiChatIsLoading = true;
      renderAiChatMessages();

      // Check API Key
      let keys = typeof getStoredApiKeys === 'function' ? getStoredApiKeys() : [];
      if (keys.length === 0) {
        const single = typeof getEffectiveGeminiApiKey === 'function' ? getEffectiveGeminiApiKey() : '';
        if (single) keys = [single];
      }
      if (keys.length === 0) {
        const errorMsg = {
          id: 'msg_' + Date.now(),
          role: 'model',
          isError: true,
          text: '🔑 **Chưa cấu hình Google Gemini API Key**\n\nĐể trò chuyện với VocaMentor AI, bạn vui lòng mở **⚙️ Cài đặt** (trên thanh Header) và dán API Key Gemini của bạn nhé!',
          timestamp: new Date().toISOString()
        };
        aiChatHistory.push(errorMsg);
        aiChatIsLoading = false;
        renderAiChatMessages();
        return;
      }

      // Build Contextual Prompt for Gemini
      const ctx = getCurrentStudyContext();
      let contextInfo = 'Ngữ cảnh học: Tự do.';
      if (ctx.word) {
        contextInfo = `Ngữ cảnh học: Người dùng đang mở từ vựng "${ctx.word.term}" (${ctx.word.partOfSpeech || 'noun'}, IPA: ${ctx.word.phonetic || ''}, Nghĩa: ${ctx.word.definitionVi || ctx.word.definition || ''}) thuộc VocaDeck "${ctx.deck ? ctx.deck.title : 'VocaDeck'}".`;
      } else if (ctx.deck) {
        contextInfo = `Ngữ cảnh học: Người dùng đang xem VocaDeck "${ctx.deck.title}" (${ctx.deck.description || ''}).`;
      }

      const systemInstruction = `Bạn là VocaMentor AI - Cố vấn học tập tiếng Anh kiêm chuyên gia phân tích hình ảnh/ngữ liệu của ứng dụng VocaFlow, vận hành trên mô hình Gemini 2.0 Flash Multimodal.
${contextInfo}
Quy tắc phản hồi quan trọng:
1. Nếu người dùng đính kèm ảnh (ảnh chụp bài tập, trang sách, đề thi, bảng từ vựng...): Hãy phân tích kỹ nội dung trong ảnh, giải thích các câu hỏi/từ vựng liên quan, chỉ ra đáp án đúng kèm giải thích ngữ pháp/từ vựng chi tiết bằng tiếng Việt.
2. Giải thích ngắn gọn, trực diện, dễ hiểu bằng tiếng Việt, dùng Markdown in đậm **từ vựng/cấu trúc**.
3. Khi người dùng yêu cầu trắc nghiệm hoặc bạn muốn đố 1 câu: đính kèm thẻ: [MINI_QUIZ: {"q":"Câu hỏi trắc nghiệm?","options":["Lựa chọn 1","Lựa chọn 2","Lựa chọn 3","Lựa chọn 4"],"answer":0,"explain":"Giải thích chi tiết vì sao đáp án này đúng và các đáp án khác sai"}]
   LƯU Ý CỰC KỲ QUAN TRỌNG: TUYỆT ĐỐI KHÔNG lặp lại câu hỏi hay viết các lựa chọn A/B/C/D ở đoạn văn bản bên ngoài. Trong mảng options chỉ ghi nội dung phương án (không đính kèm tiền tố "A.", "B.", "1.", "2.").
4. Khi người dùng yêu cầu luyện phát âm TỪ VỰNG: đính kèm thẻ: [VOICE_CHECK: {"text":"từ_cần_đọc","ipa":"/phiên âm IPA/"}]
5. Khi người dùng yêu cầu luyện phát âm CÂU TIẾNG ANH (hoặc câu có chỉnh sửa): BẮT BUỘC đính kèm thẻ cho TOÀN BỘ CÂU ĐÓ: [VOICE_CHECK: {"text":"câu_tiếng_Anh_hoàn_chỉnh_cần_luyện_đọc","ipa":""}]
   TUYỆT ĐỐI KHÔNG tự ý cắt vụn câu của người dùng thành 1 từ duy nhất khi người dùng yêu cầu luyện đọc cả câu.
6. Luôn thân thiện, tạo cảm hứng học tập và hướng dẫn phương pháp học bản xứ sâu sắc.`;

      // Multi-turn payload (last 8 turns with multimodal image parts)
      const contentsPayload = [];
      const recentTurns = aiChatHistory.slice(-8);
      recentTurns.forEach(turn => {
        if (!turn.isError) {
          const parts = [];
          if (turn.images && Array.isArray(turn.images) && turn.images.length > 0) {
            turn.images.forEach(img => {
              if (img.base64) {
                parts.push({
                  inlineData: {
                    mimeType: img.mimeType || 'image/jpeg',
                    data: img.base64
                  }
                });
              }
            });
          }
          if (turn.text) {
            parts.push({ text: turn.text });
          }
          if (parts.length > 0) {
            contentsPayload.push({
              role: turn.role === 'user' ? 'user' : 'model',
              parts: parts
            });
          }
        }
      });

      const modelsToTry = typeof getGeminiModelsForTier === 'function' ? getGeminiModelsForTier('deep') : ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-2.0-flash', 'gemini-3.5-flash-lite'];

      let fetchSuccess = false;
      let replyText = '';
      let lastErrorMsg = '';

      const payload = {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: contentsPayload
      };

      for (const k of keys) {
        if (fetchSuccess) break;
        for (const m of modelsToTry) {
          try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k.trim()}`;
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            if (res.ok) {
              const data = await res.json();
              replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (replyText) {
                if (typeof saveWorkingGeminiModel === 'function') {
                  saveWorkingGeminiModel(m, 'deep');
                } else {
                  localStorage.setItem('vocaflow_gemini_working_model', m);
                }
                fetchSuccess = true;
                break;
              }
            } else {
              const errJson = await res.json().catch(() => ({}));
              lastErrorMsg = errJson?.error?.message || `HTTP ${res.status}`;
              console.warn(`Model ${m} with key ending in ...${k.slice(-4)} error:`, lastErrorMsg);
            }
          } catch (e) {
            lastErrorMsg = e.message;
            console.warn(`Model ${m} network failed:`, e);
          }
        }
      }

      if (fetchSuccess && replyText) {
        // VIP Unlimited Free
        aiChatDailyCount++;
        localStorage.setItem('vocaflow_ai_chat_daily_count', aiChatDailyCount.toString());
        localStorage.setItem('vocaflow_ai_chat_daily_date', aiChatDailyDate);

        const modelMsg = {
          id: 'msg_' + Date.now(),
          role: 'model',
          text: replyText,
          timestamp: new Date().toISOString()
        };

        aiChatHistory.push(modelMsg);
        if (aiChatHistory.length > 30) aiChatHistory = aiChatHistory.slice(-30);
        saveAiChatHistoryToStorage();
        updateAiChatQuotaUI();

        // Cloud Sync History (last 30 messages to RTDB)
        if (currentUser && currentUser.uid && !currentUser.uid.startsWith('guest_')) {
          const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
          const authParam = (currentUser && currentUser.idToken) ? '?auth=' + currentUser.idToken : '';
          fetch(`${rtdbUrl}/users/${currentUser.uid}/aiChatHistory.json${authParam}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sanitizeAiChatHistoryForCloud(aiChatHistory))
          }).catch(() => {});
        }
      } else {
        const errorMsg = {
          id: 'msg_' + Date.now(),
          role: 'model',
          isError: true,
          text: `⚠️ Không thể kết nối tới Google Gemini AI (${lastErrorMsg || 'Mạng gián đoạn'}). Vui lòng kiểm tra lại API Key trong mục Cài đặt!`,
          timestamp: new Date().toISOString()
        };
        aiChatHistory.push(errorMsg);
        saveAiChatHistoryToStorage();
      }

      aiChatIsLoading = false;
      renderAiChatMessages();
    }
