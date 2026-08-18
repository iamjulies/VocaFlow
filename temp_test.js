
    const STORAGE_KEY_DECKS = 'vocaflow_decks';
    const STORAGE_KEY_WORDS = 'vocaflow_words';
    const STORAGE_KEY_THEME = 'vocaflow_theme';
    const STORAGE_KEY_SPEECH_RATE = 'vocaflow_speech_rate';
    const STORAGE_KEY_SPEECH_RATE_EN = 'vocaflow_speech_rate_en';
    const STORAGE_KEY_SPEECH_RATE_VI = 'vocaflow_speech_rate_vi';
    const STORAGE_KEY_SHOW_TIMESTAMP = 'vocaflow_show_timestamp';
    const STORAGE_KEY_AUTO_DELAY = 'vocaflow_auto_delay';
    const STORAGE_KEY_GEMINI_KEY = 'vocaflow_gemini_api_key';

    let currentSpeechRateEn = parseFloat(localStorage.getItem(STORAGE_KEY_SPEECH_RATE_EN)) || parseFloat(localStorage.getItem(STORAGE_KEY_SPEECH_RATE)) || 0.9;
    let currentSpeechRateVi = parseFloat(localStorage.getItem(STORAGE_KEY_SPEECH_RATE_VI)) || 1.0;
    let showTimestampSetting = localStorage.getItem(STORAGE_KEY_SHOW_TIMESTAMP) !== 'false';
    let autoDelaySeconds = parseFloat(localStorage.getItem(STORAGE_KEY_AUTO_DELAY)) || 1.0;

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

    // Gemini AI State
    let geminiApiKey = localStorage.getItem(STORAGE_KEY_GEMINI_KEY) || '';

    function saveGeminiApiKey(val) {
      geminiApiKey = (val || '').trim();
      localStorage.setItem(STORAGE_KEY_GEMINI_KEY, geminiApiKey);
      const statusText = document.getElementById('gemini-status-text');
      if (statusText) {
        if (geminiApiKey) {
          statusText.textContent = '💾 Đã lưu Gemini API Key cá nhân!';
          statusText.style.color = '#34d399';
        } else {
          statusText.textContent = 'ℹ️ Chưa cấu hình Key. Sẽ dùng từ điển mặc định khi tạo từ.';
          statusText.style.color = 'var(--text-muted)';
        }
      }
      if (currentUser && currentUser.uid) {
        pushCurrentDatabaseToCloud();
      }
    }

    async function testGeminiConnection() {
      const input = document.getElementById('gemini-api-key-input');
      const key = (input ? input.value : geminiApiKey).trim();
      const statusText = document.getElementById('gemini-status-text');
      const btn = document.getElementById('btn-test-gemini');

      if (!key) {
        if (statusText) {
          statusText.textContent = '⚠️ Vui lòng dán API Key trước khi kiểm tra!';
          statusText.style.color = '#f87171';
        }
        return;
      }

      if (btn) btn.textContent = '⏳ Đang thử...';
      const models = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.7-flash', 'gemini-pro-latest'];
      let connected = false;
      let lastErr = '';
      let successfulModel = '';

      for (const m of models) {
        try {
          const testRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: "Say OK" }] }],
              generationConfig: { maxOutputTokens: 10 },
              safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
              ]
            })
          });
          const data = await testRes.json();
          if (data.candidates && data.candidates.length > 0) {
            connected = true;
            successfulModel = m;
            saveGeminiApiKey(key);
            localStorage.setItem('vocaflow_gemini_working_model', m);
            if (statusText) {
              statusText.textContent = `✅ Kết nối Gemini AI (${m}) thành công siêu tốc!`;
              statusText.style.color = '#34d399';
            }
            showToast('✅ Kết nối Gemini AI thành công!');
            break;
          } else if (data.error) {
            lastErr = data.error.message;
          }
        } catch (err) {
          lastErr = err.message;
        }
      }

      if (!connected && statusText) {
        statusText.textContent = '❌ Lỗi kết nối: ' + (lastErr || 'Key không hợp lệ.');
        statusText.style.color = '#f87171';
      }

      if (btn) btn.textContent = '🧪 Thử kết nối';
    }

    // Theme Engine
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

      const geminiInput = document.getElementById('gemini-api-key-input');
      if (geminiInput) geminiInput.value = geminiApiKey || '';
      const geminiStatus = document.getElementById('gemini-status-text');
      if (geminiStatus) {
        if (geminiApiKey) {
          geminiStatus.textContent = '🔑 Đã cài đặt Gemini API Key cá nhân.';
          geminiStatus.style.color = '#34d399';
        } else {
          geminiStatus.textContent = 'ℹ️ Chưa nhập Key riêng (đang dùng từ điển mặc định).';
          geminiStatus.style.color = 'var(--text-muted)';
        }
      }
      openModal('modal-settings');
    }

    function updateThemeRadio() {
      const radio = document.querySelector(`input[name="app-theme"][value="${currentTheme}"]`);
      if (radio) radio.checked = true;
      document.querySelectorAll('.theme-card').forEach(card => {
        const r = card.querySelector('input[type="radio"]');
        card.classList.toggle('active', r && r.value === currentTheme);
      });
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
      applyTimestampDisplay();
      if (currentUser && currentUser.uid) {
        pushCurrentDatabaseToCloud();
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

    // In-memory Database State
    let decks = [];
    let words = [];
    let currentDeckId = null;
    let currentWordFilter = 'all';

    // Flashcard State
    let flashcardList = [];
    let flashcardIndex = 0;
    let currentFlashcardWord = null;

    // Quiz State
    let quizList = [];
    let quizIndex = 0;
    let quizScore = 0;

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
          }
          deferredInstallPrompt = null;
        });
      } else {
        // Fallback guide for Android / iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
          alert('📱 CÁCH CÀI APP TRÊN IPHONE (SAFARI):\n\n1. Bấm nút Chia sẻ (biểu tượng hình vuông có mũi tên lên ở cạnh dưới màn hình).\n2. Cuộn xuống và chọn "Thêm vào Màn hình chính" (Add to Home Screen).\n3. Bấm "Thêm" ở góc phải.');
        } else {
          alert('📱 CÁCH CÀI APP TRÊN ANDROID (CHROME):\n\n1. Bấm vào biểu tượng Menu 3 chấm (⋮) ở góc trên bên phải trình duyệt Chrome.\n2. Chọn "Cài đặt ứng dụng" (Install App) hoặc "Thêm vào màn hình chính".\n3. Bấm "Cài đặt" để đưa icon VocaFlow ra màn hình chính.');
        }
      }
    }

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((reg) => {
          console.log('SW Registered successfully:', reg.scope);
          // Check for worker updates
          reg.update().catch(() => {});
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  showToast('Đã phát hiện phiên bản mới! Đang tải lại...');
                  setTimeout(() => window.location.reload(), 1000);
                }
              };
            }
          };
        }).catch(err => console.log('SW Note:', err));

        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });
      });
    }

    // Firebase Auth & Cloud Sync State
    const STORAGE_KEY_AUTH = 'vocaflow_auth_user';
    const STORAGE_KEY_FIREBASE_CFG = 'vocaflow_firebase_cfg';
    const STORAGE_KEY_LAST_SYNC = 'vocaflow_last_sync_time';

    let currentUser = null;
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

    // Economy & Hint Shop State (v0.0.8)
    const STORAGE_KEY_USER_POINTS = 'vocaflow_user_points';
    const STORAGE_KEY_USER_HINTS = 'vocaflow_user_hints';
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
      if (currentUser && currentUser.email) {
        localStorage.setItem(STORAGE_KEY_USER_HINTS, '5');
        return 5;
      }
      return 0;
    }

    function setUserPoints(val) {
      const clean = Math.max(0, parseInt(val, 10) || 0);
      localStorage.setItem(STORAGE_KEY_USER_POINTS, clean.toString());
      localStorage.setItem(STORAGE_KEY_ECONOMY_TIME, Date.now().toString());
      updateEconomyUI();
      syncEconomyToCloud();
    }

    function setUserHints(val) {
      const clean = Math.max(0, parseInt(val, 10) || 0);
      localStorage.setItem(STORAGE_KEY_USER_HINTS, clean.toString());
      localStorage.setItem(STORAGE_KEY_ECONOMY_TIME, Date.now().toString());
      updateEconomyUI();
      syncEconomyToCloud();
    }

    function formatPointsCompact(pts) {
      if (pts >= 100000) {
        return (pts / 1000).toFixed(0) + 'kđ';
      }
      return pts + 'đ';
    }

    function updateEconomyUI() {
      const points = getUserPoints();
      const hints = getUserHints();

      const headerPoints = document.getElementById('header-points-display');
      if (headerPoints) headerPoints.textContent = formatPointsCompact(points);

      const shopPoints = document.getElementById('shop-user-points');
      if (shopPoints) shopPoints.textContent = points;

      const shopHints = document.getElementById('shop-user-hints');
      if (shopHints) shopHints.textContent = hints;

      const quizWalletPoints = document.getElementById('quiz-wallet-points');
      if (quizWalletPoints) quizWalletPoints.textContent = `${points}đ`;

      const quizWalletHints = document.getElementById('quiz-wallet-hints');
      if (quizWalletHints) quizWalletHints.textContent = hints;

      const quizCardHintsCount = document.getElementById('quiz-card-hints-count');
      if (quizCardHintsCount) quizCardHintsCount.textContent = hints;

      const quizHintBtn = document.getElementById('btn-quiz-hint');
      if (quizHintBtn) {
        quizHintBtn.title = `Gợi ý thông minh (Còn ${hints} lượt)`;
      }
    }

    async function syncEconomyToCloud() {
      if (!currentUser || !currentUser.uid || !firebaseConfig.databaseURL) return;
      const authParam = (currentUser && currentUser.idToken) ? `?auth=${currentUser.idToken}` : '';
      try {
        const payload = {
          points: getUserPoints(),
          hints: getUserHints(),
          updatedAt: new Date().toISOString()
        };
        await fetch(`${firebaseConfig.databaseURL}/users/${currentUser.uid}/economy.json${authParam}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (e) {
        console.warn('Sync economy to cloud note:', e);
      }
    }

    async function loadEconomyFromCloud() {
      if (!currentUser || !currentUser.uid || !firebaseConfig.databaseURL) return;
      const authParam = (currentUser && currentUser.idToken) ? `?auth=${currentUser.idToken}` : '';
      try {
        const res = await fetch(`${firebaseConfig.databaseURL}/users/${currentUser.uid}/economy.json${authParam}`);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object') {
            const remotePoints = typeof data.points === 'number' ? data.points : parseInt(data.points, 10);
            const remoteHints = typeof data.hints === 'number' ? data.hints : parseInt(data.hints, 10);
            const remoteTime = new Date(data.updatedAt || 0).getTime();
            const localTime = parseInt(localStorage.getItem(STORAGE_KEY_ECONOMY_TIME) || '0', 10);

            if (remoteTime > localTime || localTime === 0) {
              if (!isNaN(remotePoints)) localStorage.setItem(STORAGE_KEY_USER_POINTS, remotePoints.toString());
              if (!isNaN(remoteHints)) localStorage.setItem(STORAGE_KEY_USER_HINTS, remoteHints.toString());
              localStorage.setItem(STORAGE_KEY_ECONOMY_TIME, remoteTime.toString());
            }
            updateEconomyUI();
          }
        }
      } catch (e) {
        console.warn('Load economy error:', e);
      }
    }

    function openShopModal() {
      updateEconomyUI();
      openModal('modal-shop');
    }

    function buyHintsPackage(hintCount, costPoints) {
      if (!currentUser || !currentUser.email) {
        alert('🔒 Bạn cần đăng nhập/đăng ký tài khoản để sử dụng Cửa hàng và lưu điểm thưởng!');
        closeModal('modal-shop');
        openAuthModal('login');
        return;
      }

      const currentPoints = getUserPoints();
      if (currentPoints < costPoints) {
        alert(`❌ Không đủ điểm!\nBạn đang có ${currentPoints} điểm, nhưng gói này cần ${costPoints} điểm.\nHãy làm thêm Quiz để tích lũy thêm điểm nhé!`);
        return;
      }

      if (confirm(`Xác nhận đổi ${costPoints} điểm để lấy +${hintCount} Lượt Gợi Ý AI?`)) {
        setUserPoints(currentPoints - costPoints);
        setUserHints(getUserHints() + hintCount);
        showToast(`🎉 Đã đổi thành công +${hintCount} lượt gợi ý AI!`);
        updateEconomyUI();
      }
    }

    async function redeemShopGiftCode() {
      const input = document.getElementById('shop-gift-code-input');
      const msg = document.getElementById('shop-gift-msg');
      if (!input || !msg) return;

      const rawText = (input.value || '').trim();
      if (!rawText) return;

      // Secret Minecraft Cheat Command to enter God Mode / Publisher Portal
      const cleanLower = rawText.toLowerCase().replace(/\s+/g, ' ');
      if (cleanLower === '/gamemode creative' || cleanLower === '/gamemode 1' || cleanLower === '/gamemode c') {
        input.value = '';
        msg.style.display = 'none';
        closeModal('modal-shop');
        showToast('🕹️ Set game mode to Creative Mode! (Chào mừng Nhà Phát Hành!)');
        openPublisherModal();
        return;
      }

      const code = rawText.toUpperCase();

      const usedCodes = JSON.parse(localStorage.getItem('vocaflow_used_gift_codes') || '[]');
      if (usedCodes.includes(code)) {
        msg.style.display = 'block';
        msg.style.color = '#ef4444';
        msg.textContent = '❌ Mã này bạn đã sử dụng trước đó rồi!';
        return;
      }

      msg.style.display = 'block';
      msg.style.color = '#38bdf8';
      msg.textContent = '⏳ Đang kiểm tra mã quà tặng...';

      // 1. Try checking Cloud Firebase Gift Codes
      const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
      try {
        const res = await fetch(`${rtdbUrl}/giftCodes/${encodeURIComponent(code)}.json`);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object' && data.isActive !== false) {
            const hts = parseInt(data.hints, 10) || 0;
            const pts = parseInt(data.points, 10) || 0;
            
            usedCodes.push(code);
            localStorage.setItem('vocaflow_used_gift_codes', JSON.stringify(usedCodes));
            if (hts > 0) setUserHints(getUserHints() + hts);
            if (pts > 0) setUserPoints(getUserPoints() + pts);

            msg.style.display = 'block';
            msg.style.color = '#10b981';
            msg.textContent = `🎉 Áp dụng thành công! Tặng ngay +${hts} Gợi Ý & +${pts}đ Ví!`;
            input.value = '';
            showToast(`🎁 Quà tặng VocaFlow: +${hts} Gợi Ý & +${pts}đ!`);
            return;
          }
        }
      } catch (cloudErr) {
        console.warn('Cloud gift check error:', cloudErr);
      }

      // 2. Built-in Master Publisher Codes
      if (code === 'JULIESVIP' || code === 'RESTORE150' || code === 'VOCAFLOW100' || code === 'JULIES') {
        usedCodes.push(code);
        localStorage.setItem('vocaflow_used_gift_codes', JSON.stringify(usedCodes));
        setUserHints(getUserHints() + 150);
        setUserPoints(getUserPoints() + 500);
        msg.style.display = 'block';
        msg.style.color = '#10b981';
        msg.textContent = '🎉 Áp dụng thành công! Đã tặng bạn +150 Lượt Gợi Ý AI & +500đ Ví!';
        input.value = '';
        showToast('🎁 Chúc mừng! Đã nhận +150 Lượt gợi ý & +500đ ví!');
        return;
      }

      msg.style.display = 'block';
      msg.style.color = '#ef4444';
      msg.textContent = '❌ Mã không hợp lệ hoặc đã hết hạn!';
    }

    // =========================================================================
    // PUBLISHER / ADMIN PORTAL LOGIC (v0.0.8)
    // =========================================================================
    function openPublisherModal() {
      const setPts = document.getElementById('admin-set-points-input');
      const setHts = document.getElementById('admin-set-hints-input');
      if (setPts) setPts.value = getUserPoints();
      if (setHts) setHts.value = getUserHints();
      openModal('modal-publisher');
      refreshAdminGiftCodesList();
    }

    function applyAdminWalletChanges() {
      const pts = parseInt(document.getElementById('admin-set-points-input')?.value, 10);
      const hts = parseInt(document.getElementById('admin-set-hints-input')?.value, 10);
      if (!isNaN(pts)) setUserPoints(pts);
      if (!isNaN(hts)) setUserHints(hts);
      showToast(`⚡ Đã cập nhật ví: ${getUserPoints()}đ & ${getUserHints()} gợi ý!`);
    }

    function quickAddAdminRewards(ptsToAdd, htsToAdd) {
      setUserPoints(getUserPoints() + ptsToAdd);
      setUserHints(getUserHints() + htsToAdd);
      const setPts = document.getElementById('admin-set-points-input');
      const setHts = document.getElementById('admin-set-hints-input');
      if (setPts) setPts.value = getUserPoints();
      if (setHts) setHts.value = getUserHints();
      showToast(`⚡ Đã cộng nhanh +${htsToAdd} Gợi Ý & +${ptsToAdd}đ!`);
    }

    async function createAdminGiftCode() {
      const nameInput = document.getElementById('admin-code-name');
      const htsInput = document.getElementById('admin-code-hints');
      const ptsInput = document.getElementById('admin-code-points');
      if (!nameInput || !htsInput || !ptsInput) return;

      let rawCode = (nameInput.value || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      if (!rawCode) {
        alert('Vui lòng nhập tên mã code (ví dụ: HOCVIEN2026)!');
        return;
      }

      const hints = parseInt(htsInput.value, 10) || 0;
      const points = parseInt(ptsInput.value, 10) || 0;
      if (hints <= 0 && points <= 0) {
        alert('Phải tặng ít nhất gợi ý hoặc điểm thưởng!');
        return;
      }

      const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
      const authParam = (currentUser && currentUser.idToken) ? `?auth=${currentUser.idToken}` : '';

      try {
        const payload = {
          code: rawCode,
          hints: hints,
          points: points,
          isActive: true,
          createdAt: new Date().toISOString()
        };

        const res = await fetch(`${rtdbUrl}/giftCodes/${rawCode}.json${authParam}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          showToast(`🚀 Đã phát hành mã "${rawCode}" lên Cloud thành công!`);
          nameInput.value = '';
          refreshAdminGiftCodesList();
        } else {
          alert('Không thể lưu lên Cloud. Kiểm tra quyền hoặc kết nối!');
        }
      } catch (err) {
        alert('Lỗi tạo mã: ' + err.message);
      }
    }

    async function refreshAdminGiftCodesList() {
      const listContainer = document.getElementById('admin-active-codes-list');
      if (!listContainer) return;
      listContainer.innerHTML = '<em>Đang kết nối Cloud tải danh sách...</em>';

      const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
      const authParam = (currentUser && currentUser.idToken) ? `?auth=${currentUser.idToken}` : '';

      try {
        const res = await fetch(`${rtdbUrl}/giftCodes.json${authParam}`);
        if (res.ok) {
          const data = await res.json();
          if (!data || Object.keys(data).length === 0) {
            listContainer.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 10px;">Chưa có mã quà tặng nào trên Cloud. Hãy tạo mã đầu tiên ở trên!</div>';
            return;
          }

          let html = '<div style="display: flex; flex-direction: column; gap: 6px;">';
          for (const [codeKey, codeData] of Object.entries(data)) {
            if (!codeData) continue;
            html += `
              <div style="display: flex; justify-content: space-between; align-items: center; background: var(--surface-elevated); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border);">
                <div>
                  <strong style="color: #38bdf8; font-family: monospace; font-size: 13px;">${escapeHtml(codeData.code || codeKey)}</strong>
                  <span style="font-size: 11px; color: var(--text-muted); margin-left: 8px;">(+${codeData.hints || 0} Gợi Ý, +${codeData.points || 0}đ)</span>
                </div>
                <div style="display: flex; gap: 6px;">
                  <button class="btn btn-outline btn-sm" style="padding: 2px 6px; font-size: 10px;" onclick="copyGiftCodeToClipboard('${escapeHtml(codeData.code || codeKey)}')">📋 Copy</button>
                  <button class="btn btn-outline btn-sm" style="padding: 2px 6px; font-size: 10px; color: var(--danger); border-color: rgba(239,68,68,0.3);" onclick="deleteAdminGiftCode('${escapeHtml(codeKey)}')">🗑️ Xóa</button>
                </div>
              </div>
            `;
          }
          html += '</div>';
          listContainer.innerHTML = html;
        } else {
          listContainer.innerHTML = '<div style="color: var(--danger);">Không tải được danh sách từ Cloud.</div>';
        }
      } catch (err) {
        listContainer.innerHTML = `<div style="color: var(--text-muted);">Lỗi kết nối: ${err.message}</div>`;
      }
    }

    function copyGiftCodeToClipboard(code) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code);
        showToast(`📋 Đã sao chép mã "${code}" vào bộ nhớ tạm!`);
      } else {
        prompt('Copy mã quà tặng:', code);
      }
    }

    async function deleteAdminGiftCode(codeKey) {
      if (!confirm(`Bạn có chắc chắn muốn xóa mã "${codeKey}" khỏi Cloud? Người học sẽ không dùng được mã này nữa.`)) return;
      const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
      const authParam = (currentUser && currentUser.idToken) ? `?auth=${currentUser.idToken}` : '';

      try {
        await fetch(`${rtdbUrl}/giftCodes/${encodeURIComponent(codeKey)}.json${authParam}`, {
          method: 'DELETE'
        });
        showToast(`🗑️ Đã xóa mã "${codeKey}"!`);
        refreshAdminGiftCodesList();
      } catch (err) {
        alert('Lỗi xóa mã: ' + err.message);
      }
    }

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
    window.addEventListener('DOMContentLoaded', () => {
      initTheme();
      loadDatabase();
      loadAuthState();
      updateEconomyUI();
      updateStudyShuffleUI();
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
      if (currentUser && currentUser.uid) {
        handleManualSync();
        loadEconomyFromCloud();
      }
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
      updateAuthUI();
      updateEconomyUI();
    }

    function updateAuthUI() {
      const nameEl = document.getElementById('user-display-name');
      const profileNameEl = document.getElementById('profile-name');
      const profileEmailEl = document.getElementById('profile-email');
      const profileBadgeEl = document.getElementById('profile-badge');
      const profileAvatarEl = document.getElementById('profile-avatar');
      const authActionBtn = document.getElementById('btn-profile-auth-action');

      const nameMobileEl = document.getElementById('user-display-name-mobile');
      if (currentUser && currentUser.email) {
        const displayName = currentUser.displayName || currentUser.email.split('@')[0];
        if (nameEl) nameEl.textContent = displayName;
        if (nameMobileEl) nameMobileEl.textContent = `Tài khoản (${displayName})`;
        if (profileNameEl) profileNameEl.textContent = displayName;
        if (profileEmailEl) profileEmailEl.textContent = currentUser.email;
        if (profileBadgeEl) {
          profileBadgeEl.textContent = 'Đã liên kết Cloud';
          profileBadgeEl.style.background = 'rgba(16,185,129,0.2)';
          profileBadgeEl.style.color = '#34d399';
        }
        if (profileAvatarEl) profileAvatarEl.textContent = (displayName[0] || 'U').toUpperCase();
        if (authActionBtn) {
          authActionBtn.textContent = '🚪 Đăng xuất tài khoản';
          authActionBtn.style.color = '#ef4444';
          authActionBtn.style.borderColor = 'rgba(239,68,68,0.4)';
        }
      } else {
        if (nameEl) nameEl.textContent = 'Khách';
        if (nameMobileEl) nameMobileEl.textContent = 'Tài khoản (Khách)';
        if (profileNameEl) profileNameEl.textContent = 'Khách (Offline)';
        if (profileEmailEl) profileEmailEl.textContent = 'Dữ liệu lưu trữ nội bộ trên máy này.';
        if (profileBadgeEl) {
          profileBadgeEl.textContent = 'Chưa liên kết';
          profileBadgeEl.style.background = 'rgba(245,158,11,0.2)';
          profileBadgeEl.style.color = '#fbbf24';
        }
        if (profileAvatarEl) profileAvatarEl.textContent = 'V';
        if (authActionBtn) {
          authActionBtn.textContent = 'Đăng nhập / Đăng ký tài khoản';
          authActionBtn.style.color = '#4f46e5';
          authActionBtn.style.borderColor = '#4f46e5';
        }
      }

      // Update metrics
      const statDecks = document.getElementById('profile-stat-decks');
      const statWords = document.getElementById('profile-stat-words');
      const lastSyncEl = document.getElementById('profile-last-sync');
      if (statDecks) statDecks.textContent = `${decks.length} bộ`;
      if (statWords) statWords.textContent = `${words.length} từ`;

      const lastSync = localStorage.getItem(STORAGE_KEY_LAST_SYNC);
      if (lastSyncEl) {
        lastSyncEl.textContent = lastSync ? new Date(lastSync).toLocaleString('vi-VN') : 'Chưa đồng bộ';
      }
    }

    // Modal Switchers
    function openProfileModal() {
      updateAuthUI();
      openModal('modal-profile');
    }

    function openAuthModal(defaultTab = 'login') {
      openModal('modal-auth');
      switchAuthTab(defaultTab);
    }

    function switchAuthTab(tab) {
      const isLogin = tab === 'login';
      document.getElementById('form-login').style.display = isLogin ? 'block' : 'none';
      document.getElementById('form-register').style.display = isLogin ? 'none' : 'block';

      document.getElementById('tab-btn-login').className = isLogin ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline';
      document.getElementById('tab-btn-register').className = isLogin ? 'btn btn-sm btn-outline' : 'btn btn-sm btn-primary';

      const titleEl = document.getElementById('auth-modal-title');
      if (titleEl) {
        titleEl.textContent = isLogin ? 'Đăng nhập VocaFlow' : 'Tạo tài khoản mới';
      }
    }

    function handleAuthActionFromProfile() {
      closeModal('modal-profile');
      if (currentUser) {
        if (confirm('Bạn có chắc chắn muốn đăng xuất? (Từ vựng trên máy này vẫn được giữ nguyên)')) {
          currentUser = null;
          localStorage.removeItem(STORAGE_KEY_AUTH);
          updateAuthUI();
          showToast('Đã đăng xuất tài khoản.');
        }
      } else {
        openAuthModal('login');
      }
    }

    async function handleFormLogin(e) {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      if (firebaseConfig.apiKey) {
        try {
          const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, returnSecureToken: true })
          });
          const data = await res.json();
          if (data.error) {
            alert('Lỗi đăng nhập: ' + (data.error.message || 'Sai email hoặc mật khẩu.'));
            return;
          }

          let finalDisplayName = data.displayName;
          if (!finalDisplayName && firebaseConfig.databaseURL) {
            try {
              const pRes = await fetch(`${firebaseConfig.databaseURL}/users/${data.localId}/profile.json?auth=${data.idToken}`);
              if (pRes.ok) {
                const pData = await pRes.json();
                if (pData && pData.displayName) finalDisplayName = pData.displayName;
              }
            } catch (pErr) {}
          }
          if (!finalDisplayName) finalDisplayName = email.split('@')[0];

          currentUser = {
            uid: data.localId,
            email: data.email,
            displayName: finalDisplayName,
            idToken: data.idToken
          };
          localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(currentUser));
        } catch (err) {
          console.log('Firebase Auth error fallback:', err);
          currentUser = { uid: 'u_' + Date.now(), email: email, displayName: email.split('@')[0] };
          localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(currentUser));
        }
      } else {
        currentUser = { uid: 'u_' + Date.now(), email: email, displayName: email.split('@')[0] };
        localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(currentUser));
      }

      closeModal('modal-auth');
      updateAuthUI();
      showToast('Đăng nhập thành công!');
      handleManualSync();
    }

    async function handleFormRegister(e) {
      e.preventDefault();
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const confirmPassword = document.getElementById('reg-confirm-password').value;

      if (password !== confirmPassword) {
        alert('Mật khẩu xác nhận không khớp!');
        return;
      }

      if (firebaseConfig.apiKey) {
        try {
          const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, returnSecureToken: true })
          });
          const data = await res.json();
          if (data.error) {
            alert('Lỗi đăng ký: ' + (data.error.message || 'Không thể tạo tài khoản.'));
            return;
          }

          const finalName = name || email.split('@')[0];
          try {
            await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${firebaseConfig.apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: data.idToken, displayName: finalName, returnSecureToken: true })
            });
          } catch (uErr) {
            console.log('Update displayName note:', uErr);
          }

          currentUser = {
            uid: data.localId,
            email: data.email,
            displayName: finalName,
            idToken: data.idToken
          };
          localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(currentUser));
        } catch (err) {
          currentUser = { uid: 'u_' + Date.now(), email: email, displayName: name || email.split('@')[0] };
          localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(currentUser));
        }
      } else {
        currentUser = { uid: 'u_' + Date.now(), email: email, displayName: name || email.split('@')[0] };
        localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(currentUser));
      }

      closeModal('modal-auth');
      updateAuthUI();
      showToast('Tạo tài khoản thành công!');
      handleManualSync();
    }

    function handleForgotPassword() {
      const email = prompt('Nhập địa chỉ email của bạn để nhận liên kết đặt lại mật khẩu:');
      if (email && email.includes('@')) {
        showToast('Đã gửi liên kết khôi phục tới: ' + email);
      }
    }

    function sanitizeDecks(arr) {
      return (arr || []).map(d => ({
        ...d,
        isPinned: d.isPinned === true,
        isArchived: d.isArchived === true,
        updatedAt: d.updatedAt || d.createdAt || new Date().toISOString()
      }));
    }

    let autoSyncTimer = null;
    function saveDatabase(triggerAutoSync = true) {
      decks = sanitizeDecks(decks);
      localStorage.setItem(STORAGE_KEY_DECKS, JSON.stringify(decks));
      localStorage.setItem(STORAGE_KEY_WORDS, JSON.stringify(words));
      
      if (triggerAutoSync && currentUser && currentUser.uid) {
        if (autoSyncTimer) clearTimeout(autoSyncTimer);
        autoSyncTimer = setTimeout(() => {
          pushCurrentDatabaseToCloud();
        }, 300);
      }
    }

    async function pushCurrentDatabaseToCloud() {
      if (!currentUser || !currentUser.uid) return;
      const userId = currentUser.uid;
      const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
      const authParam = (currentUser && currentUser.idToken) ? `?auth=${currentUser.idToken}` : '';

      try {
        decks = sanitizeDecks(decks);
        const payload = {
          profile: {
            displayName: currentUser.displayName || currentUser.email.split('@')[0],
            email: currentUser.email,
            geminiApiKey: geminiApiKey || '',
            lastSync: new Date().toISOString()
          },
          geminiApiKey: geminiApiKey || '',
          decks: decks,
          words: words,
          lastSync: new Date().toISOString()
        };

        await fetch(`${rtdbUrl}/users/${userId}.json${authParam}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        localStorage.setItem(STORAGE_KEY_LAST_SYNC, new Date().toISOString());
      } catch (err) {
        console.warn('Auto background push note:', err);
      }
    }

    // Bidirectional Cloud Sync Engine (Realtime Cloud Database)
    async function handleManualSync() {
      if (isSyncing) return;
      isSyncing = true;

      const syncIcon = document.getElementById('sync-icon');
      const syncText = document.getElementById('sync-text');
      const syncIconMob = document.getElementById('sync-icon-mobile');
      const syncTextMob = document.getElementById('sync-text-mobile');
      const syncBadge = document.getElementById('sync-status-badge');
      if (syncIcon) syncIcon.textContent = '🔄';
      if (syncText) syncText.textContent = 'Đang đồng bộ...';
      if (syncIconMob) syncIconMob.textContent = '🔄';
      if (syncTextMob) syncTextMob.textContent = 'Đang đồng bộ...';
      if (syncBadge) {
        syncBadge.textContent = 'Đang kết nối Cloud...';
        syncBadge.style.color = '#38bdf8';
      }

      try {
        const userId = currentUser ? currentUser.uid : null;
        const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
        const authParam = (currentUser && currentUser.idToken) ? `?auth=${currentUser.idToken}` : '';

        if (userId && rtdbUrl) {
          // -----------------------------------------------------------
          // PHASE 1: PULL FROM CLOUD (Kéo dữ liệu từ Cloud về trước)
          // -----------------------------------------------------------
          try {
            const pullRes = await fetch(`${rtdbUrl}/users/${userId}.json${authParam}`);
            if (pullRes.ok) {
              const cloudData = await pullRes.json();
              if (cloudData && typeof cloudData === 'object') {
                // Sync API Key from Cloud
                const remoteKey = cloudData.geminiApiKey || (cloudData.profile && cloudData.profile.geminiApiKey);
                if (remoteKey) {
                  const cleanKey = remoteKey.trim();
                  if (cleanKey && (!geminiApiKey || geminiApiKey !== cleanKey)) {
                    geminiApiKey = cleanKey;
                    localStorage.setItem(STORAGE_KEY_GEMINI_KEY, geminiApiKey);
                    const gemInput = document.getElementById('gemini-api-key-input');
                    if (gemInput) gemInput.value = geminiApiKey;
                    const gemStatus = document.getElementById('gemini-status-text');
                    if (gemStatus) {
                      gemStatus.textContent = '🔑 Đã đồng bộ Gemini API Key từ Cloud!';
                      gemStatus.style.color = '#34d399';
                    }
                  }
                } else if (geminiApiKey) {
                  cloudData.geminiApiKey = geminiApiKey;
                }

                const remoteDecks = Array.isArray(cloudData.decks) ? cloudData.decks : (cloudData.decks ? Object.values(cloudData.decks) : []);
                const remoteWords = Array.isArray(cloudData.words) ? cloudData.words : (cloudData.words ? Object.values(cloudData.words) : []);

                if (remoteDecks.length > 0) {
                  // If local only has the initial starter deck and cloud has real decks, remove starter deck
                  if (decks.length === 1 && decks[0].id === 'deck-oxford-starter') {
                    decks = [];
                    words = words.filter(w => w.deckId !== 'deck-oxford-starter');
                  }

                  // Merge decks by ID (Last-Write-Wins with explicit isPinned & isArchived preservation)
                  for (const remoteDeck of remoteDecks) {
                    if (!remoteDeck || !remoteDeck.id) continue;
                    const cleanRemote = {
                      ...remoteDeck,
                      isPinned: remoteDeck.isPinned === true,
                      isArchived: remoteDeck.isArchived === true
                    };
                    const localIdx = decks.findIndex(d => d.id === remoteDeck.id);
                    if (localIdx >= 0) {
                      const localDeck = decks[localIdx];
                      const localTime = new Date(localDeck.updatedAt || localDeck.createdAt || 0).getTime();
                      const remoteTime = new Date(remoteDeck.updatedAt || remoteDeck.createdAt || 0).getTime();
                      if (remoteTime > localTime) {
                        decks[localIdx] = { ...localDeck, ...cleanRemote };
                      } else if (localTime > remoteTime) {
                        // Local is newer: keep local deck
                      } else {
                        // Equal timestamp: merge with boolean preservation
                        decks[localIdx] = {
                          ...localDeck,
                          ...cleanRemote,
                          isPinned: (localDeck.isPinned === true) || (cleanRemote.isPinned === true),
                          isArchived: (localDeck.isArchived === true) || (cleanRemote.isArchived === true)
                        };
                      }
                    } else {
                      decks.push(cleanRemote);
                    }
                  }
                }

                if (remoteWords.length > 0) {
                  // Merge words by ID (Last-Write-Wins with learning progress protection)
                  for (const remoteWord of remoteWords) {
                    if (!remoteWord || !remoteWord.id) continue;
                    const localIdx = words.findIndex(w => w.id === remoteWord.id);
                    if (localIdx >= 0) {
                      const localWord = words[localIdx];
                      const localTime = new Date(localWord.updatedAt || localWord.createdAt || 0).getTime();
                      const remoteTime = new Date(remoteWord.updatedAt || remoteWord.createdAt || 0).getTime();

                      if (remoteTime > localTime) {
                        words[localIdx] = { ...localWord, ...remoteWord };
                      } else if (localTime > remoteTime) {
                        // Local is newer! Keep local word
                      } else {
                        // Timestamps equal: protect higher learning status
                        if (localWord.status === 'mastered' || (localWord.status === 'learning' && remoteWord.status === 'newWord')) {
                          // Keep local progress
                        } else {
                          words[localIdx] = { ...localWord, ...remoteWord };
                        }
                      }
                    } else {
                      words.push(remoteWord);
                    }
                  }
                }

                if (cloudData.economy && typeof cloudData.economy === 'object') {
                  const remotePoints = typeof cloudData.economy.points === 'number' ? cloudData.economy.points : parseInt(cloudData.economy.points, 10);
                  const remoteHints = typeof cloudData.economy.hints === 'number' ? cloudData.economy.hints : parseInt(cloudData.economy.hints, 10);
                  const remoteTime = new Date(cloudData.economy.updatedAt || 0).getTime();
                  const localTime = parseInt(localStorage.getItem(STORAGE_KEY_ECONOMY_TIME) || '0', 10);

                  if (remoteTime > localTime || localTime === 0) {
                    if (!isNaN(remotePoints)) localStorage.setItem(STORAGE_KEY_USER_POINTS, remotePoints.toString());
                    if (!isNaN(remoteHints)) localStorage.setItem(STORAGE_KEY_USER_HINTS, remoteHints.toString());
                    localStorage.setItem(STORAGE_KEY_ECONOMY_TIME, remoteTime.toString());
                  }
                  updateEconomyUI();
                }

                saveDatabase(false);
                renderDecks();
              }
            }
          } catch (pullErr) {
            console.warn('Pull from cloud note:', pullErr);
          }

          // -----------------------------------------------------------
          // PHASE 2: PUSH TO CLOUD (Đẩy toàn bộ trạng thái đã merge lên Cloud)
          // -----------------------------------------------------------
          try {
            decks = sanitizeDecks(decks);
            const payload = {
              profile: {
                displayName: currentUser.displayName || currentUser.email.split('@')[0],
                email: currentUser.email,
                lastSync: new Date().toISOString()
              },
              decks: decks,
              words: words,
              economy: {
                points: getUserPoints(),
                hints: getUserHints(),
                updatedAt: new Date().toISOString()
              },
              lastSync: new Date().toISOString()
            };

            await fetch(`${rtdbUrl}/users/${userId}.json${authParam}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
          } catch (pushErr) {
            console.warn('Push error:', pushErr);
          }
        }

        const nowIso = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY_LAST_SYNC, nowIso);

        if (syncIcon) syncIcon.textContent = '☁️';
        if (syncText) syncText.textContent = 'Đã đồng bộ';
        if (syncIconMob) syncIconMob.textContent = '☁️';
        if (syncTextMob) syncTextMob.textContent = 'Đã đồng bộ tức thì';
        if (syncBadge) {
          syncBadge.textContent = 'Đã đồng bộ Cloud';
          syncBadge.style.color = '#10b981';
        }
        showToast('Đồng bộ Cloud thành công!');
      } catch (e) {
        console.error('Sync general error:', e);
        if (syncIcon) syncIcon.textContent = '☁️';
        if (syncText) syncText.textContent = 'Ngoại tuyến';
        if (syncIconMob) syncIconMob.textContent = '☁️';
        if (syncTextMob) syncTextMob.textContent = 'Dữ liệu cục bộ';
        if (syncBadge) {
          syncBadge.textContent = 'Đang dùng bộ nhớ cục bộ';
          syncBadge.style.color = '#fbbf24';
        }
        showToast('Đã lưu dữ liệu ngoại tuyến.');
      } finally {
        isSyncing = false;
        updateAuthUI();
      }
    }

    // Database Load
    function loadDatabase() {
      try {
        const storedDecks = localStorage.getItem(STORAGE_KEY_DECKS);
        const storedWords = localStorage.getItem(STORAGE_KEY_WORDS);
        decks = storedDecks ? JSON.parse(storedDecks) : [];
        words = storedWords ? JSON.parse(storedWords) : [];
      } catch (e) {
        console.error('Failed to parse database from localStorage:', e);
        decks = [];
        words = [];
      }
    }

    function seedSampleData() {
      const sampleDeckId = 'deck-oxford-starter';
      decks = [{
        id: sampleDeckId,
        title: 'Oxford Essential Words',
        description: 'Bộ từ vựng tiếng Anh học thuật & giao tiếp thông dụng',
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

    // NAVIGATION
    function showScreen(screenId) {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      const target = document.getElementById(screenId);
      if (target) target.classList.add('active');

      const btnAdd = document.getElementById('btn-header-add');
      if (screenId === 'screen-deck-detail') {
        btnAdd.style.display = 'none';
      } else {
        btnAdd.style.display = 'inline-flex';
      }
    }

    // =========================================================================
    // MULTI-SELECTION, MULTI-TIER MASTERY & SLIDER FILTER ENGINE (v0.0.8.9)
    // =========================================================================
    let selectedWordIds = new Set();
    let currentWordFilter = 'all'; // 'all' | '0' | '1-25' | '26-50' | '51-75' | '76-99' | '100' | 'custom-range'
    let customMinScore = 0;
    let customMaxScore = 100;

    function getWordScore(w) {
      if (typeof w.masteryScore === 'number') return w.masteryScore;
      if (w.status === 'mastered') return 100;
      if (w.status === 'learning') return 40;
      return 0;
    }

    function getWordMasteryInfo(score) {
      if (score >= 100) {
        return {
          label: 'ðŸ‘‘ ÄÃ£ thuá»™c (100%)',
          shortLabel: '100% ÄÃ£ thuá»™c',
          tier: 'mastered',
          badgeStyle: 'background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.35);',
          trackColor: '#10b981'
        };
      }
      if (score >= 76) {
        return {
          label: `â­ Sáº¯p thuá»™c (${score}%)`,
          shortLabel: `${score}% Sáº¯p thuá»™c`,
          tier: 'tier4',
          badgeStyle: 'background: rgba(139, 92, 246, 0.15); color: #c084fc; border: 1px solid rgba(139, 92, 246, 0.35);',
          trackColor: '#8b5cf6'
        };
      }
      if (score >= 51) {
        return {
          label: `ðŸŒ³ KhÃ¡ thuá»™c (${score}%)`,
          shortLabel: `${score}% KhÃ¡ thuá»™c`,
          tier: 'tier3',
          badgeStyle: 'background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.35);',
          trackColor: '#3b82f6'
        };
      }
      if (score >= 26) {
        return {
          label: `ðŸŒ¿ HÆ¡i thuá»™c (${score}%)`,
          shortLabel: `${score}% HÆ¡i thuá»™c`,
          tier: 'tier2',
          badgeStyle: 'background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.35);',
          trackColor: '#f59e0b'
        };
      }
      if (score >= 1) {
        return {
          label: `ðŸ£ Vá»«a há»c (${score}%)`,
          shortLabel: `${score}% Vá»«a há»c`,
          tier: 'tier1',
          badgeStyle: 'background: rgba(6, 182, 212, 0.15); color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.35);',
          trackColor: '#06b6d4'
        };
      }
      return {
        label: 'ðŸŒ± Má»›i (0%)',
        shortLabel: '0% Má»›i',
        tier: 'new',
        badgeStyle: 'background: rgba(100, 116, 139, 0.15); color: #94a3b8; border: 1px solid rgba(100, 116, 139, 0.3);',
        trackColor: '#64748b'
      };
    }

    function getFilteredDeckWords() {
      const query = (document.getElementById('word-search-input')?.value || '').toLowerCase().trim();
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

      if (rangeVal) rangeVal.textContent = `${min}% - ${max}%`;
      if (labelMin) labelMin.textContent = `${min}%`;
      if (labelMax) labelMax.textContent = `${max}%`;

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
      document.querySelectorAll('#deck-word-filter-chips .chip').forEach(c => c.classList.remove('active'));
      if (el) el.classList.add('active');
      renderWordList();
    }

    function updateWordModalMasteryPreview(val) {
      val = parseInt(val, 10) || 0;
      const valEl = document.getElementById('modal-word-mastery-val');
      const badgeEl = document.getElementById('modal-word-mastery-badge');
      if (valEl) valEl.textContent = `${val}%`;
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
      showToast(`ðŸŽ¯ ÄÃ£ cáº­p nháº­t "${w.term}": ${next}% (${getWordMasteryInfo(next).shortLabel})`);
    }

    function toggleWordSelect(wordId, isChecked) {
      if (isChecked) {
        selectedWordIds.add(wordId);
      } else {
        selectedWordIds.delete(wordId);
      }
      const item = document.getElementById(`word-item-${wordId}`);
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

      if (countBadge) countBadge.textContent = count > 0 ? `${count} tá»« Ä‘Æ°á»£c chá»n` : '0 tá»« Ä‘Æ°á»£c chá»n';
      const countSuffix = count > 0 ? ` (${count})` : '';
      if (fcLabel) fcLabel.textContent = countSuffix;
      if (autofcLabel) autofcLabel.textContent = countSuffix;
      if (quizLabel) quizLabel.textContent = countSuffix;
      if (btnDeleteSelected) btnDeleteSelected.style.display = count > 0 ? 'inline-flex' : 'none';

      const currentFiltered = getFilteredDeckWords();
      if (selectAllCheckbox) {
        selectAllCheckbox.checked = currentFiltered.length > 0 && currentFiltered.every(w => selectedWordIds.has(w.id));
      }
    }

    function deleteSelectedWords() {
      if (selectedWordIds.size === 0) return;
      if (!confirm(`Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a ${selectedWordIds.size} tá»« vá»±ng Ä‘Ã£ chá»n?`)) return;

      words = words.filter(w => !selectedWordIds.has(w.id));
      selectedWordIds.clear();
      saveDatabase(true);
      renderWordList();
      updateSelectionUI();
      showToast('ÄÃ£ xÃ³a cÃ¡c tá»« Ä‘Ã£ chá»n!');
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

      let newScore = word.masteryScore + deltaPoints;
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
      return { newScore, deltaPoints };
    }

    // =========================================================================
    // DECK TABS, PINNING & ARCHIVE STORAGE ENGINE
    // =========================================================================
    let currentDeckTab = 'active'; // 'active' | 'archived'

    function setDeckTab(tab) {
      currentDeckTab = tab;
      renderDecks();
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
      showToast(deck.isPinned ? `ðŸ“Œ ÄÃ£ ghim bá»™ tá»« "${deck.title}" lÃªn Ä‘áº§u!` : `ÄÃ£ bá» ghim bá»™ tá»« "${deck.title}"`);
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
      showToast(deck.isArchived ? `ðŸ“¦ ÄÃ£ cáº¥t bá»™ tá»« "${deck.title}" vÃ o Kho LÆ°u Trá»¯!` : `ðŸ”„ ÄÃ£ khÃ´i phá»¥c bá»™ tá»« "${deck.title}" vá» danh sÃ¡ch Ä‘ang há»c!`);
    }

    function updateDeckDetailHeader() {
      const deck = decks.find(d => d.id === currentDeckId);
      if (!deck) return;

      const pinBtn = document.getElementById('btn-detail-pin');
      if (pinBtn) {
        pinBtn.classList.toggle('active-pin-btn', !!deck.isPinned);
        pinBtn.title = deck.isPinned ? 'Bá» ghim bá»™ tá»«' : 'Ghim bá»™ tá»« lÃªn Ä‘áº§u';
      }

      const archiveBtn = document.getElementById('btn-detail-archive');
      if (archiveBtn) {
        archiveBtn.innerHTML = `<svg class="icon icon-sm"><use href="#${deck.isArchived ? 'i-unarchive' : 'i-archive'}"/></svg>`;
        archiveBtn.title = deck.isArchived ? 'KhÃ´i phá»¥c vá» danh sÃ¡ch Ä‘ang há»c' : 'LÆ°u trá»¯ (Cáº¥t bá»™ tá»« nÃ y)';
      }
    }

    // =========================================================================
    // DECK RENDERING & CUSTOMIZATION (EDIT / DELETE / PIN / ARCHIVE)
    // =========================================================================
    function renderDecks() {
      const container = document.getElementById('deck-grid');
      if (!container) return;
      container.innerHTML = '';

      const activeDecks = decks.filter(d => !d.isArchived);
      const archivedDecks = decks.filter(d => !d.isArchived);

      const countActive = document.getElementById('count-active-decks');
      const countArchived = document.getElementById('count-archived-decks');
      if (countActive) countActive.textContent = activeDecks.length;
      if (countArchived) countArchived.textContent = archivedDecks.length;

      let displayDecks = [];
      if (currentDeckTab === 'active') {
        displayDecks = [...activeDecks].sort((a, b) => {
          if (!!a.isPinned !== !b.isPinned) {
            return a.isPinned ? -1 : 1;
          }
          return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
        });
      } else {
        displayDecks = [...archivedDecks].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
      }

      if (displayDecks.length === 0) {
        if (currentDeckTab === 'active') {
          container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 42px 20px; background: var(--surface); border-radius: var(--radius); border: 1px dashed var(--border);">
              <div style="font-size: 40px; margin-bottom: 10px;">ðŸ“š</div>
              <h3 style="font-size: 18px; margin-bottom: 6px; color: var(--text);">Báº¡n ChÆ°a CÃ³ Bá»™ Tá»« Vá»±ng NÃ o</h3>
              <p style="color: var(--text-muted); font-size: 13px; margin: 0 0 20px; max-width: 460px; margin-inline: auto; line-height: 1.5;">
                KhÃ¡m phÃ¡ ngay Kho tá»« vá»±ng Tiáº¿ng Anh <strong>Lá»›p 10, 11, 12 Trá»ng tÃ¢m</strong> cÃ³ sáºµn trong ThÆ° Viá»‡n Ä‘á»ƒ báº¯t Ä‘áº§u Ã´n luyá»‡n ngay chá»‰ vá»›i 1-Click!
              </p>
              <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <button class="btn btn-primary" onclick="openLibraryModal()" style="background: linear-gradient(135deg, #4f46e5, #7c3aed); border: none; font-weight: 700; padding: 8px 18px;">
                  ðŸ“š KhÃ¡m PhÃ¡ ThÆ° Viá»‡n Tá»« Vá»±ng (1-Click)
                </button>
                <button class="btn btn-outline" onclick="openDeckModal()">
                  <svg class="icon"><use href="#i-add"/></svg> Táº¡o Bá»™ Tá»« RiÃªng
                </button>
              </div>
            </div>
          `;
        } else {
          container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 48px 20px; background: var(--surface); border-radius: var(--radius); border: 1px dashed var(--border);">
              <svg class="icon icon-xl" style="fill: var(--text-muted); margin-bottom: 12px;"><use href="#i-archive"/></svg>
              <h3 style="font-size: 18px; margin-bottom: 6px;">Kho lÆ°u trá»¯ Ä‘ang trá»‘ng</h3>
              <p style="color: var(--text-muted); font-size: 13px; margin: 0; max-width: 420px; margin-inline: auto;">Khi há»c xong má»™t bá»™ tá»« hoáº·c muá»‘n táº¡m áº©n Ä‘i cho gá»n gÃ ng, báº¡n hÃ£y báº¥m nÃºt <strong>"LÆ°u trá»¯"</strong> á»Ÿ bá»™ tá»« Ä‘Ã³ nhÃ©!</p>
            </div>
          `;
        }
        return;
      }

      displayDecks.forEach(deck => {
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

        const card = document.createElement('div');
        card.className = 'deck-card' + (isPinned ? ' pinned' : '') + (isArchived ? ' archived' : '');
        card.innerHTML = `
          <div class="deck-card-strip" style="background-color: ${deck.color || '#4f46e5'}"></div>
          <div class="deck-header">
            <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; flex-wrap: wrap;">
              <h3 class="deck-title">${escapeHtml(deck.title)}</h3>
              ${isPinned ? `<span class="badge badge-pinned" title="Bá»™ tá»« Ä‘Ã£ Ä‘Æ°á»£c ghim lÃªn Ä‘áº§u"><svg class="icon icon-sm"><use href="#i-pin"/></svg> ÄÃ£ ghim</span>` : ''}
              ${isArchived ? `<span class="badge" style="background: rgba(148, 163, 184, 0.15); color: #94a3b8;"><svg class="icon icon-sm"><use href="#i-archive"/></svg> ÄÃ£ lÆ°u trá»¯</span>` : ''}
            </div>
            <span class="badge" style="background: rgba(255,255,255,0.06); flex-shrink: 0;">${total} tá»«</span>
          </div>
          <p class="deck-desc">${escapeHtml(deck.description || 'ChÆ°a cÃ³ mÃ´ táº£')}</p>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${avgScore}%;"></div>
          </div>
          <div class="deck-stats">
            <span>Má»©c Ä‘á»™ thuá»™c: ${avgScore}%</span>
            <span>ÄÃ£ thuá»™c: ${mastered}/${total}</span>
          </div>
          <div class="deck-timestamp">
            <span>ðŸ•’ Cáº­p nháº­t: ${formatDateTime(deck.updatedAt || deck.createdAt)}</span>
          </div>

          <div class="deck-actions-grid">
            <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); editDeck('${deck.id}')" title="Sá»­a thÃ´ng tin bá»™ tá»«">
              <svg class="icon icon-sm"><use href="#i-edit"/></svg> <span class="hide-on-mobile">Sá»­a</span>
            </button>
            <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); toggleArchiveDeck('${deck.id}')" title="${isArchived ? 'KhÃ´i phá»¥c vá» danh sÃ¡ch Ä‘ang há»c' : 'LÆ°u trá»¯ (Cáº¥t bá»™ tá»«)'}">
              <svg class="icon icon-sm"><use href="#${isArchived ? 'i-unarchive' : 'i-archive'}"/></svg> <span class="hide-on-mobile">${isArchived ? 'KhÃ´i phá»¥c' : 'LÆ°u trá»¯'}</span>
            </button>
            <button class="btn btn-primary btn-sm" onclick="openDeckDetail('${deck.id}')" title="Má»Ÿ danh sÃ¡ch tá»« vá»±ng">
              <svg class="icon icon-sm"><use href="#i-book"/></svg> <span>Xem Bá»™ Tá»«</span>
            </button>
          </div>
        `;
        card.addEventListener('click', (e) => {
          if (e.target.closest('button')) return;
          openDeckDetail(deck.id);
        });
        container.appendChild(card);
      });
    }

    function editDeck(deckId) {
      const deck = decks.find(d => d.id === deckId);
      if (!deck) return;

      document.getElementById('deck-id').value = deck.id;
      document.getElementById('deck-title').value = deck.title;
      document.getElementById('deck-desc').value = deck.description || '';

      const colorRadio = document.querySelector(`input[name="deck-color"][value="${deck.color || '#4f46e5'}"]`);
      if (colorRadio) colorRadio.checked = true;

      document.getElementById('modal-deck-title').textContent = 'Chá»‰nh Sá»­a Bá»™ Tá»«';
      openModal('modal-deck');
    }

    function deleteDeck(deckId) {
      const deck = decks.find(d => d.id === deckId);
      if (!deck) return;

      if (!confirm(`Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a bá»™ tá»« "${deck.title}" vÃ  toÃ n bá»™ tá»« vá»±ng bÃªn trong?`)) {
        return;
      }

      decks = decks.filter(d => d.id !== deckId);
      words = words.filter(w => w.deckId !== deckId);
      saveDatabase(true);
      renderDecks();

      if (currentDeckId === deckId) {
        showScreen('screen-decks');
      }
      showToast(`ÄÃ£ xÃ³a bá»™ tá»« "${deck.title}"!`);
    }

    // OPEN DECK DETAIL
    function openDeckDetail(deckId) {
      currentDeckId = deckId;
      selectedWordIds.clear();
      const deck = decks.find(d => d.id === deckId);
      if (!deck) return;

      document.getElementById('deck-detail-title').textContent = deck.title;
      document.getElementById('deck-detail-desc').textContent = deck.description || '';
      const timeEl = document.getElementById('deck-detail-timestamp');
      if (timeEl) {
        timeEl.textContent = `ðŸ•’ Táº¡o: ${formatDateOnly(deck.createdAt || deck.updatedAt)}`;
      }
      document.getElementById('word-search-input').value = '';
      currentWordFilter = 'all';

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
      renderWordList();
      updateSelectionUI();
      showScreen('screen-deck-detail');
    }

    // RENDER WORD LIST WITH MULTI-TIER MASTERY CARDS
    function renderWordList() {
      const container = document.getElementById('word-list-container');
      container.innerHTML = '';

      updateMasteryChipCounts();
      const deckWords = getFilteredDeckWords();

      if (deckWords.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 36px 20px; color: var(--text-muted); background: var(--surface); border: 1px dashed var(--border); border-radius: 14px; margin-top: 10px;">
            <div style="font-size: 32px; margin-bottom: 8px;">ðŸ“–</div>
            <p style="font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 4px;">KhÃ´ng tÃ¬m tháº¥y tá»« vá»±ng nÃ o</p>
            <p style="font-size: 12px; margin-bottom: 16px;">KhÃ´ng cÃ³ tá»« nÃ o phÃ¹ há»£p vá»›i bá»™ lá»c hoáº·c tÃ¬m kiáº¿m hiá»‡n táº¡i.</p>
            <button class="btn btn-primary" onclick="openWordModal()" style="margin: 0 auto; display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px;">
              <svg class="icon"><use href="#i-add"/></svg> ThÃªm Tá»« Vá»±ng Má»›i
            </button>
          </div>
        `;
        updateSelectionUI();
        return;
      }

      deckWords.forEach(w => {
        const item = document.createElement('div');
        item.className = 'word-item' + (selectedWordIds.has(w.id) ? ' selected' : '');
        item.id = `word-item-${w.id}`;

        const score = getWordScore(w);
        const masteryInfo = getWordMasteryInfo(score);

        const cefrBadge = w.cefrLevel ? `<span class="badge badge-cefr">${w.cefrLevel}</span>` : '';
        const synText = w.synonyms && w.synonyms.length ? `<span class="tag-syn">â‰ˆ ${escapeHtml(w.synonyms.slice(0, 3).join(', '))}</span>` : '';
        const antText = w.antonyms && w.antonyms.length ? `<span class="tag-ant">â‰  ${escapeHtml(w.antonyms.slice(0, 2).join(', '))}</span>` : '';
        const collText = w.collocations && w.collocations.length ? `<span class="tag-coll">â€¢ ${escapeHtml(w.collocations.slice(0, 2).join(', '))}</span>` : '';

        item.innerHTML = `
          <div class="word-item-header">
            <div class="word-item-left">
              <input type="checkbox" class="word-select-checkbox" ${selectedWordIds.has(w.id) ? 'checked' : ''} onchange="toggleWordSelect('${w.id}', this.checked)" onclick="event.stopPropagation()" title="Chá»n tá»« nÃ y Ä‘á»ƒ há»c">
              <span class="word-term">${escapeHtml(w.term)}</span>
              ${cefrBadge}
              ${w.partOfSpeech ? `<span class="badge badge-pos">${w.partOfSpeech}</span>` : ''}
              <button class="btn-speaker" onclick="speakWordById('${w.id}')" title="PhÃ¡t Ã¢m">
                <svg class="icon icon-sm"><use href="#i-volume"/></svg>
              </button>
            </div>
            <div class="word-item-right">
              <span class="badge" style="${masteryInfo.badgeStyle}; font-size: 11px; font-weight: 700; cursor: pointer;" onclick="quickAdjustWordScore('${w.id}')" title="Báº¥m Ä‘á»ƒ Ä‘á»•i nhanh má»©c Ä‘á»™ thuá»™c (0% -> 25% -> 50% -> 75% -> 90% -> 100%)">
                ${masteryInfo.label}
              </span>
              <button class="btn btn-outline btn-icon btn-sm" onclick="editWord('${w.id}')" title="Sá»­a"><svg class="icon icon-sm"><use href="#i-edit"/></svg></button>
              <button class="btn btn-outline btn-icon btn-sm" onclick="deleteWord('${w.id}')" title="XÃ³a"><svg class="icon icon-sm" style="fill: var(--danger);"><use href="#i-delete"/></svg></button>
            </div>
          </div>

          <div class="word-item-body">
            ${w.phonetic ? `<div class="word-phonetic">${escapeHtml(w.phonetic)}</div>` : ''}
            <div class="word-def">${escapeHtml(w.definitionVi || w.definition || '')}</div>
            ${w.exampleSentence ? `<div class="word-example">â€œ${escapeHtml(w.exampleSentence)}â€</div>` : ''}
            
            ${(synText || antText || collText) ? `<div class="word-tags">${synText} ${antText} ${collText}</div>` : ''}

            <div class="word-mastery-row">
              <div class="word-mastery-track" style="cursor: pointer;" onclick="quickAdjustWordScore('${w.id}')" title="Báº¥m Ä‘á»ƒ tÄƒng má»©c Ä‘á»™ thuá»™c">
                <div class="word-mastery-fill" style="width: ${score}%; background: ${masteryInfo.trackColor};"></div>
              </div>
              <span class="word-mastery-score-text" style="color: ${masteryInfo.trackColor}; font-weight: 700;">${score}/100Ä‘</span>
              <span class="word-timestamp">ðŸ•’ ${formatDateTime(w.updatedAt || w.createdAt)}</span>
            </div>
          </div>
        `;
        container.appendChild(item);
      });

      updateSelectionUI();
    }

    // MODAL CONTROL
    function openModal(id) {
      document.getElementById(id).classList.add('active');
    }
    function closeModal(id) {
      document.getElementById(id).classList.remove('active');
    }

    // DECK MODAL
    function openDeckModal() {
      document.getElementById('deck-id').value = '';
      document.getElementById('deck-title').value = '';
      document.getElementById('deck-desc').value = '';
      document.getElementById('modal-deck-title').textContent = 'Táº¡o Bá»™ Tá»« Má»›i';
      openModal('modal-deck');
    }

    function saveDeckForm(e) {
      e.preventDefault();
      const id = document.getElementById('deck-id').value || 'deck-' + Date.now();
      const title = document.getElementById('deck-title').value.trim();
      const desc = document.getElementById('deck-desc').value.trim();
      const color = document.querySelector('input[name="deck-color"]:checked')?.value || '#4f46e5';
      const nowIso = new Date().toISOString();

      const existingIndex = decks.findIndex(d => d.id === id);
      if (existingIndex >= 0) {
        decks[existingIndex] = { ...decks[existingIndex], title, description: desc, color, updatedAt: nowIso };
        if (currentDeckId === id) {
          document.getElementById('deck-detail-title').textContent = title;
          document.getElementById('deck-detail-desc').textContent = desc;
        }
      } else {
        decks.push({ id, title, description: desc, color, createdAt: nowIso, updatedAt: nowIso });
      }

      saveDatabase(true);
      renderDecks();
      closeModal('modal-deck');
      showToast('ÄÃ£ lÆ°u bá»™ tá»« vá»±ng!');
    }

    // WORD MODAL
    function openWordModal() {
      document.getElementById('word-id').value = '';
      document.getElementById('word-term').value = '';
      document.getElementById('word-pos').value = 'noun';
      document.getElementById('word-cefr').value = '';
      document.getElementById('word-phonetic').value = '';
      document.getElementById('word-def').value = '';
      document.getElementById('word-example').value = '';
      document.getElementById('word-synonyms').value = '';
      document.getElementById('word-antonyms').value = '';
      document.getElementById('word-collocations').value = '';
      document.getElementById('word-note').value = '';
      const slider = document.getElementById('word-mastery-slider');
      if (slider) slider.value = 0;
      updateWordModalMasteryPreview(0);

      document.getElementById('modal-word-title').textContent = 'ThÃªm Tá»« Vá»±ng Má»›i';
      document.getElementById('ipa-keyboard-panel').style.display = 'none';
      openModal('modal-word');
    }

    function editWord(id) {
      const w = words.find(item => item.id === id);
      if (!w) return;

      const score = getWordScore(w);

      document.getElementById('word-id').value = w.id;
      document.getElementById('word-term').value = w.term;
      document.getElementById('word-pos').value = w.partOfSpeech || 'noun';
      document.getElementById('word-cefr').value = w.cefrLevel || '';
      document.getElementById('word-phonetic').value = w.phonetic || '';
      document.getElementById('word-def').value = w.definitionVi || w.definition || '';
      document.getElementById('word-example').value = w.exampleSentence || w.example || '';
      document.getElementById('word-synonyms').value = (w.synonyms || []).join(', ');
      document.getElementById('word-antonyms').value = (w.antonyms || []).join(', ');
      document.getElementById('word-collocations').value = (w.collocations || []).join(', ');
      document.getElementById('word-note').value = w.note || '';

      const slider = document.getElementById('word-mastery-slider');
      if (slider) slider.value = score;
      updateWordModalMasteryPreview(score);

      document.getElementById('modal-word-title').textContent = 'Chá»‰nh Sá»­a Tá»« Vá»±ng';
      document.getElementById('ipa-keyboard-panel').style.display = 'none';
      openModal('modal-word');
    }

    function saveWordForm(e) {
      e.preventDefault();
      const id = document.getElementById('word-id').value || 'w-' + Date.now();
      const term = document.getElementById('word-term').value.trim();
      const pos = document.getElementById('word-pos').value;
      const cefr = document.getElementById('word-cefr').value;
      const phonetic = document.getElementById('word-phonetic').value.trim();
      const def = document.getElementById('word-def').value.trim();
      const example = document.getElementById('word-example').value.trim();
      const syn = parseList(document.getElementById('word-synonyms').value);
      const ant = parseList(document.getElementById('word-antonyms').value);
      const coll = parseList(document.getElementById('word-collocations').value);
      const note = document.getElementById('word-note').value.trim();
      
      const slider = document.getElementById('word-mastery-slider');
      const score = slider ? parseInt(slider.value, 10) : 0;
      const status = score >= 100 ? 'mastered' : (score > 0 ? 'learning' : 'newWord');
      const nowIso = new Date().toISOString();

      const existingIndex = words.findIndex(w => w.id === id);
      if (existingIndex >= 0) {
        words[existingIndex] = {
          ...words[existingIndex],
          term, partOfSpeech: pos, cefrLevel: cefr, phonetic,
          definitionVi: def, exampleSentence: example,
          synonyms: syn, antonyms: ant, collocations: coll, note,
          masteryScore: score,
          status: status,
          updatedAt: nowIso
        };
      } else {
        words.push({
          id, deckId: currentDeckId,
          term, partOfSpeech: pos, cefrLevel: cefr, phonetic,
          definitionVi: def, exampleSentence: example,
          synonyms: syn, antonyms: ant, collocations: coll, note,
          status: status,
          masteryScore: score,
          createdAt: nowIso,
          updatedAt: nowIso
        });
      }

      saveDatabase(true);
      renderWordList();
      closeModal('modal-word');
      showToast('ÄÃ£ lÆ°u tá»« vá»±ng thÃ nh cÃ´ng!');
    }
    // =========================================================================
    // AI WORD GENERATION ENGINE (GEMINI AI + FREE DICTIONARY FALLBACK)
    // =========================================================================
    let isAiGenerating = false;

    async function handleAiGenerateWord() {
      if (isAiGenerating) return;
      const termInput = document.getElementById('word-term');
      const rawTerm = (termInput ? termInput.value : '').trim();

      if (!rawTerm) {
        alert('Vui lòng gõ từ vựng tiếng Anh vào ô trước khi bấm AI Điền Tự Động!');
        if (termInput) termInput.focus();
        return;
      }

      // Collect user pre-filled context
      const userContext = {
        pos: document.getElementById('word-pos')?.value || '',
        cefrLevel: document.getElementById('word-cefr')?.value || '',
        ipa: document.getElementById('word-phonetic')?.value.trim() || '',
        definitionVi: document.getElementById('word-def')?.value.trim() || '',
        exampleSentence: document.getElementById('word-example')?.value.trim() || '',
        synonyms: document.getElementById('word-synonyms')?.value.trim() || '',
        antonyms: document.getElementById('word-antonyms')?.value.trim() || '',
        collocations: document.getElementById('word-collocations')?.value.trim() || '',
        note: document.getElementById('word-note')?.value.trim() || ''
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
          // Fill form fields
          if (result.term && termInput) termInput.value = result.term;
          if (result.ipa) document.getElementById('word-phonetic').value = result.ipa;
          if (result.pos) {
            const posSelect = document.getElementById('word-pos');
            if (posSelect) {
              const cleanPos = result.pos.toLowerCase();
              const matchPos = Array.from(posSelect.options).find(opt => opt.value.toLowerCase() === cleanPos || cleanPos.includes(opt.value.toLowerCase()));
              if (matchPos) posSelect.value = matchPos.value;
            }
          }
          if (result.cefrLevel) {
            const cefrSelect = document.getElementById('word-cefr');
            if (cefrSelect) {
              const cleanCefr = result.cefrLevel.toUpperCase().trim();
              const matchCefr = Array.from(cefrSelect.options).find(opt => opt.value === cleanCefr);
              if (matchCefr) cefrSelect.value = matchCefr.value;
            }
          }
          if (result.definition) document.getElementById('word-def').value = result.definition;
          if (result.example) document.getElementById('word-example').value = result.example;
          if (result.synonyms) document.getElementById('word-synonyms').value = Array.isArray(result.synonyms) ? result.synonyms.join(', ') : result.synonyms;
          if (result.antonyms) document.getElementById('word-antonyms').value = Array.isArray(result.antonyms) ? result.antonyms.join(', ') : result.antonyms;
          if (result.collocations) document.getElementById('word-collocations').value = Array.isArray(result.collocations) ? result.collocations.join(', ') : result.collocations;

          showToast('✨ AI đã tư duy & hoàn thiện thông tin từ vựng!');
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

      let contextNote = '';
      if (userContext.definitionVi) contextNote += `\n- Nghĩa người dùng đã viết: "${userContext.definitionVi}"`;
      if (userContext.exampleSentence) contextNote += `\n- Câu ví dụ người dùng đã viết: "${userContext.exampleSentence}"`;
      if (userContext.synonyms) contextNote += `\n- Từ đồng nghĩa người dùng nhập: "${userContext.synonyms}"`;
      if (userContext.antonyms) contextNote += `\n- Từ trái nghĩa người dùng nhập: "${userContext.antonyms}"`;
      if (userContext.collocations) contextNote += `\n- Collocations người dùng nhập: "${userContext.collocations}"`;
      if (userContext.pos) contextNote += `\n- Từ loại người dùng chọn: "${userContext.pos}"`;
      if (userContext.cefrLevel) contextNote += `\n- Cấp độ CEFR người dùng chọn: "${userContext.cefrLevel}"`;

      const prompt = `Bạn là chuyên gia ngôn ngữ học & biên soạn từ điển tiếng Anh cho người học Việt Nam.
Người dùng đang học từ vựng tiếng Anh: "${term}".
${contextNote ? `\nNgười dùng ĐÃ NHẬP SẴN một số thông tin sau:${contextNote}\n
HƯỚNG DẪN TƯ DUY & XỬ LÝ DỮ LIỆU:
1. TÔN TRỌNG Ý ĐỊNH NGƯỜI DÙNG: Xem kỹ nét nghĩa mà người dùng đã nhập (kể cả tiếng lóng, khẩu ngữ, học thuật, hoặc từ nhạy cảm đời thực) để giữ đúng ngữ cảnh đó!
2. NÂNG CẤP & MỞ RỘNG: Nếu thông tin người dùng nhập đã đúng, hãy phát triển cho hay hơn, trau chuốt câu từ và bổ sung thêm các collocations, từ đồng nghĩa/trái nghĩa chất lượng.
3. SỬA LỖI: Nếu thông tin người dùng có lỗi ngữ pháp, chính tả hoặc hiểu sai nghĩa, hãy sửa lại cho chuẩn xác nhất.
4. TỰ ĐIỀN ĐỦ: Điền đầy đủ phiên âm IPA chuẩn Anh-Mỹ, phân loại CEFR, ví dụ tự nhiên kèm dịch tiếng Việt.` : `Hãy phân tích toàn diện từ "${term}": phiên âm IPA chuẩn Anh-Mỹ, từ loại, cấp độ CEFR, định nghĩa tiếng Việt ngắn gọn xúc tích và sát ngữ cảnh, câu ví dụ tiếng Anh tự nhiên kèm dịch nghĩa, từ đồng nghĩa, từ trái nghĩa, collocations.`}

Trả về DUY NHẤT một chuỗi JSON hợp lệ (không markdown block, không giải thích ngoài JSON) theo cấu trúc:
{
  "term": "${term}",
  "pos": "noun/verb/adjective/adverb/phrase/idiom",
  "ipa": "/phiên âm IPA chuẩn Anh-Mỹ/",
  "cefrLevel": "A1/A2/B1/B2/C1/C2",
  "definition": "Định nghĩa tiếng Việt gãy gọn, chuẩn xác và sát ngữ cảnh",
  "example": "1 câu ví dụ tiếng Anh tự nhiên kèm nghĩa tiếng Việt",
  "synonyms": ["từ đồng nghĩa 1", "từ đồng nghĩa 2"],
  "antonyms": ["từ trái nghĩa 1", "từ trái nghĩa 2"],
  "collocations": ["cụm từ đi kèm 1", "cụm từ đi kèm 2"]
}`;

      const cachedWorkingModel = localStorage.getItem('vocaflow_gemini_working_model');
      const standardModels = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.7-flash', 'gemini-pro-latest'];
      const models = cachedWorkingModel ? [cachedWorkingModel, ...standardModels.filter(m => m !== cachedWorkingModel)] : standardModels;

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
                maxOutputTokens: 600
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
          return JSON.parse(cleanJson);
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

      let pos = 'noun';
      let def = '';
      let ex = '';
      let syns = [];
      let ants = [];

      if (item.meanings && item.meanings.length > 0) {
        const firstMeaning = item.meanings[0];
        pos = firstMeaning.partOfSpeech || 'noun';
        if (firstMeaning.synonyms) syns.push(...firstMeaning.synonyms);
        if (firstMeaning.antonyms) ants.push(...firstMeaning.antonyms);

        if (firstMeaning.definitions && firstMeaning.definitions.length > 0) {
          const firstDef = firstMeaning.definitions[0];
          def = firstDef.definition || '';
          ex = firstDef.example || '';
          if (firstDef.synonyms) syns.push(...firstDef.synonyms);
          if (firstDef.antonyms) ants.push(...firstDef.antonyms);
        }
      }

      return {
        term: item.word || term,
        pos: pos,
        ipa: ipa,
        cefrLevel: 'B1',
        definition: def ? `(EN) ${def}` : '',
        example: ex,
        synonyms: syns.slice(0, 4),
        antonyms: ants.slice(0, 3),
        collocations: []
      };
    }

    function deleteWord(id) {
      if (confirm('Bạn có chắc chắn muốn xóa từ vựng này?')) {
        words = words.filter(w => w.id !== id);
        selectedWordIds.delete(id);
        saveDatabase(true);
        renderWordList();
        updateSelectionUI();
        showToast('Đã xóa từ vựng!');
      }
    }

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
      const input = document.getElementById('word-phonetic');
      const start = input.selectionStart || input.value.length;
      const end = input.selectionEnd || input.value.length;
      const current = input.value;
      input.value = current.substring(0, start) + sym + current.substring(end);
      input.focus();
      input.setSelectionRange(start + sym.length, start + sym.length);
    }

    // =========================================================================
    // FLASHCARD 3D MODE WITH CEFR MASTERY GAINS
    // =========================================================================
    function startFlashcardMode(useSelectionOnly = false) {
      let deckWords = getFilteredDeckWords();
      if (useSelectionOnly && selectedWordIds.size > 0) {
        deckWords = words.filter(w => selectedWordIds.has(w.id));
      } else if (selectedWordIds.size > 0) {
        deckWords = words.filter(w => selectedWordIds.has(w.id));
      }

      if (deckWords.length === 0) {
        alert('Không có từ vựng nào để học Flashcard!');
        return;
      }

      if (isStudyShuffle) {
        flashcardList = [...deckWords].sort(() => Math.random() - 0.5);
      } else {
        flashcardList = [...deckWords];
      }
      flashcardIndex = 0;
      loadFlashcard(flashcardIndex);
      showScreen('screen-flashcard');
    }

    function shuffleCurrentFlashcard() {
      if (!flashcardList || flashcardList.length === 0) return;
      flashcardList = [...flashcardList].sort(() => Math.random() - 0.5);
      flashcardIndex = 0;
      loadFlashcard(flashcardIndex);
      showToast('🔀 Đã xáo trộn ngẫu nhiên danh sách thẻ Flashcard!');
    }

    function loadFlashcard(index) {
      const word = flashcardList[index];
      currentFlashcardWord = word;
      const total = flashcardList.length;

      const curScore = typeof word.masteryScore === 'number' ? word.masteryScore : (
        word.status === 'mastered' ? 100 : (word.status === 'learning' ? 40 : 0)
      );
      word.masteryScore = curScore;

      const { gain, penalty } = calculateMasteryPoints(word.cefrLevel, false);

      document.getElementById('flashcard-element').classList.remove('flipped');
      document.getElementById('fc-counter').textContent = `Thẻ ${index + 1} / ${total}`;
      document.getElementById('fc-progress-bar').style.width = `${Math.round(((index + 1) / total) * 100)}%`;

      // Front
      const cefrEl = document.getElementById('fc-front-cefr');
      if (word.cefrLevel) {
        cefrEl.textContent = word.cefrLevel;
        cefrEl.style.display = 'inline-block';
      } else {
        cefrEl.style.display = 'none';
      }

      document.getElementById('fc-front-pos').textContent = (word.partOfSpeech || 'WORD').toUpperCase();
      document.getElementById('fc-front-term').textContent = word.term;
      document.getElementById('fc-front-phonetic').textContent = word.phonetic || '';
      document.getElementById('fc-front-mastery-badge').textContent = `🎯 ${curScore}%`;
      document.getElementById('fc-front-mastery-fill').style.width = `${curScore}%`;
      document.getElementById('fc-front-mastery-sub').textContent = `Mức độ thuộc: ${curScore}/100`;

      // Back
      document.getElementById('fc-back-term').textContent = word.term;
      document.getElementById('fc-back-def').textContent = word.definitionVi;
      document.getElementById('fc-back-example').textContent = word.exampleSentence ? `“${word.exampleSentence}”` : '';
      document.getElementById('fc-back-mastery-badge').textContent = `🎯 ${curScore}%`;

      const metaEl = document.getElementById('fc-back-meta');
      let metaHtml = '';
      if (word.synonyms && word.synonyms.length) metaHtml += `<div><strong>Đồng nghĩa:</strong> ${escapeHtml(word.synonyms.join(', '))}</div>`;
      if (word.antonyms && word.antonyms.length) metaHtml += `<div><strong>Trái nghĩa:</strong> ${escapeHtml(word.antonyms.join(', '))}</div>`;
      if (word.collocations && word.collocations.length) metaHtml += `<div><strong>Cụm từ:</strong> ${escapeHtml(word.collocations.join(', '))}</div>`;
      if (word.note) metaHtml += `<div><strong>Ghi chú:</strong> ${escapeHtml(word.note)}</div>`;
      metaEl.innerHTML = metaHtml || '<div style="color:var(--text-muted);text-align:center;">Chưa có dữ liệu mở rộng</div>';

      // Action buttons with dynamic points preview (50% penalty for wrong)
      document.getElementById('fc-btn-no').innerHTML = `<svg class="icon"><use href="#i-close"/></svg> Chưa thuộc (-${penalty}đ)`;
      document.getElementById('fc-btn-yes').innerHTML = `<svg class="icon"><use href="#i-check"/></svg> Thuộc rồi (+${gain}đ)`;
    }

    function toggleCardFlip() {
      document.getElementById('flashcard-element').classList.toggle('flipped');
    }

    function markFlashcardMastery(isKnown) {
      if (currentFlashcardWord) {
        const { gain, penalty } = calculateMasteryPoints(currentFlashcardWord.cefrLevel, false);
        const delta = isKnown ? gain : -penalty;
        const { newScore } = updateWordMasteryScore(currentFlashcardWord, delta);

        const idx = words.findIndex(w => w.id === currentFlashcardWord.id);
        if (idx >= 0) {
          words[idx].masteryScore = newScore;
          words[idx].status = currentFlashcardWord.status;
          words[idx].updatedAt = currentFlashcardWord.updatedAt;
        }
        saveDatabase(true);

        if (isKnown) {
          showToast(`+${gain} điểm thuộc bài! (Thuộc: ${newScore}%)`);
        } else {
          showToast(`-${penalty} điểm ôn tập! (Thuộc: ${newScore}%)`);
        }
      }

      flashcardIndex++;
      if (flashcardIndex < flashcardList.length) {
        loadFlashcard(flashcardIndex);
      } else {
        alert('Chúc mừng! Bạn đã hoàn thành lượt ôn Flashcard này!');
        showScreen('screen-deck-detail');
        renderWordList();
      }
    }

    // =========================================================================
    // QUIZ TRẮC NGHIỆM MODE WITH CEFR 150% MASTERY GAIN & 50% PENALTY
    // =========================================================================
    let quizIsAnswered = false;

    function startQuizMode(useSelectionOnly = false) {
      let deckWords = getFilteredDeckWords();
      if (useSelectionOnly && selectedWordIds.size > 0) {
        deckWords = words.filter(w => selectedWordIds.has(w.id));
      } else if (selectedWordIds.size > 0) {
        deckWords = words.filter(w => selectedWordIds.has(w.id));
      }

      if (deckWords.length < 2) {
        alert('Cần tối thiểu 2 từ vựng để tạo bài trắc nghiệm Quiz!');
        return;
      }

      if (isStudyShuffle) {
        quizList = [...deckWords].sort(() => Math.random() - 0.5);
      } else {
        quizList = [...deckWords];
      }
      quizIndex = 0;
      quizScore = 0;
      quizIsAnswered = false;
      loadQuizQuestion();
      showScreen('screen-quiz');
    }

    function shuffleCurrentQuiz() {
      if (!quizList || quizList.length === 0) return;
      quizList = [...quizList].sort(() => Math.random() - 0.5);
      quizIndex = 0;
      quizScore = 0;
      quizIsAnswered = false;
      loadQuizQuestion();
      showToast('🔀 Đã xáo trộn ngẫu nhiên bộ câu hỏi Quiz!');
    }

    function generateSmartDistractors(questionWord) {
      const correctDef = (questionWord.definitionVi || '').trim();
      const currentPos = (questionWord.partOfSpeech || 'noun').toLowerCase().trim();
      const currentDeckId = questionWord.deckId;

      // Pool of all valid other words (excluding current word and identical definitions)
      const otherWords = words.filter(w => w.id !== questionWord.id && (w.definitionVi || '').trim() && (w.definitionVi || '').trim().toLowerCase() !== correctDef.toLowerCase());

      const chosenDefs = new Set();

      // 1. Priority 1: Same Part of Speech + Same Deck (Highest match & contextual confusion)
      const samePosSameDeck = otherWords.filter(w => (w.partOfSpeech || 'noun').toLowerCase().trim() === currentPos && w.deckId === currentDeckId);
      samePosSameDeck.sort(() => Math.random() - 0.5).forEach(w => {
        if (chosenDefs.size < 3) chosenDefs.add(w.definitionVi.trim());
      });

      // 2. Priority 2: Same Part of Speech + Other Decks
      if (chosenDefs.size < 3) {
        const samePosOtherDecks = otherWords.filter(w => (w.partOfSpeech || 'noun').toLowerCase().trim() === currentPos && !chosenDefs.has(w.definitionVi.trim()));
        samePosOtherDecks.sort(() => Math.random() - 0.5).forEach(w => {
          if (chosenDefs.size < 3) chosenDefs.add(w.definitionVi.trim());
        });
      }

      // 3. Priority 3: Same Deck (Any POS)
      if (chosenDefs.size < 3) {
        const sameDeckAnyPos = otherWords.filter(w => w.deckId === currentDeckId && !chosenDefs.has(w.definitionVi.trim()));
        sameDeckAnyPos.sort(() => Math.random() - 0.5).forEach(w => {
          if (chosenDefs.size < 3) chosenDefs.add(w.definitionVi.trim());
        });
      }

      // 4. Priority 4: Any other word across the app
      if (chosenDefs.size < 3) {
        const remainingWords = otherWords.filter(w => !chosenDefs.has(w.definitionVi.trim()));
        remainingWords.sort(() => Math.random() - 0.5).forEach(w => {
          if (chosenDefs.size < 3) chosenDefs.add(w.definitionVi.trim());
        });
      }

      // 5. Priority 5: High-Quality Category / POS Fallback Pool (Guarantees smart choices even in small 2-word decks)
      if (chosenDefs.size < 3) {
        const posFallbackPools = {
          noun: [
            'Sự chuyển hóa và biến đổi cấu trúc phân tử',
            'Hiện tượng khuếch tán và dẫn truyền năng lượng',
            'Quá trình phân tách các thành phần trong hỗn hợp',
            'Quy luật bảo toàn và trạng thái cân bằng động',
            'Phương pháp định lượng và đo lường thực nghiệm',
            'Chỉ số biểu thị nồng độ hoặc hiệu suất phản ứng',
            'Cơ chế tác động và kiểm soát phản hồi sinh học',
            'Nguyên lý tương tác giữa các yếu tố trong hệ thống'
          ],
          verb: [
            'Duy trì trạng thái cân bằng trong hệ thống',
            'Tiến hành phân tích và đo lường nồng độ',
            'Kích hoạt quá trình biến đổi và trao đổi chất',
            'Làm suy giảm tốc độ hoặc kìm hãm phản ứng',
            'Thiết lập mối tương quan giữa các thông số',
            'Thúc đẩy quá trình tái tạo và phát triển',
            'Điều chỉnh thông số cho phù hợp với tiêu chuẩn'
          ],
          adjective: [
            'Có khả năng thích ứng và phản ứng nhanh',
            'Đặc trưng bởi tính ổn định và tính liên tục',
            'Tương thích với các điều kiện môi trường xung quanh',
            'Đóng vai trò chủ đạo và mang tính quyết định',
            'Dễ bị phân hủy dưới tác động ngoại cảnh',
            'Có xu hướng tích lũy và gia tăng theo thời gian'
          ],
          adverb: [
            'Một cách tuần tự và có hệ thống rõ ràng',
            'Tương đối đồng đều trên toàn bộ bề mặt',
            'Đột ngột và không thể dự đoán trước',
            'Một cách triệt để và toàn diện nhất'
          ],
          phrase: [
            'Dẫn đến sự thay đổi rõ rệt về cấu trúc',
            'Đóng vai trò trung gian trong toàn bộ chu trình',
            'Phụ thuộc mật thiết vào điều kiện ban đầu'
          ]
        };

        const fallbackList = posFallbackPools[currentPos] || posFallbackPools.noun;
        const shuffledFallbacks = [...fallbackList].sort(() => Math.random() - 0.5);
        shuffledFallbacks.forEach(fb => {
          if (chosenDefs.size < 3 && fb !== correctDef && !chosenDefs.has(fb)) {
            chosenDefs.add(fb);
          }
        });
      }

      return Array.from(chosenDefs).slice(0, 3);
    }

    function loadQuizQuestion() {
      quizIsAnswered = false;
      document.getElementById('quiz-next-container').style.display = 'none';
      const hintBox = document.getElementById('quiz-hint-box');
      if (hintBox) hintBox.style.display = 'none';

      const questionWord = quizList[quizIndex];
      const total = quizList.length;

      document.getElementById('quiz-counter').textContent = `Câu ${quizIndex + 1} / ${total}`;
      document.getElementById('quiz-score').textContent = `Điểm: ${quizScore}`;
      document.getElementById('quiz-question-term').textContent = questionWord.term;
      document.getElementById('quiz-question-phonetic').textContent = questionWord.phonetic || '';

      // Generate 3 Smart Category/POS-matched Distractors
      const distractors = generateSmartDistractors(questionWord);
      const choices = [questionWord.definitionVi, ...distractors].sort(() => Math.random() - 0.5);

      const optionsContainer = document.getElementById('quiz-options-container');
      optionsContainer.innerHTML = '';

      choices.forEach(choice => {
        const opt = document.createElement('button');
        opt.className = 'quiz-option';
        opt.textContent = choice;
        opt.onclick = () => checkQuizAnswer(opt, choice === questionWord.definitionVi);
        optionsContainer.appendChild(opt);
      });

      // Auto-pronounce English Term upon question load (Duolingo style)
      setTimeout(() => {
        speakQuizTerm();
      }, 150);
    }

    function getQuizPointDelta(cefrLevel, isCorrect) {
      let level = (cefrLevel || '').toUpperCase().trim();
      const match = level.match(/[ABC][12]/);
      if (match) {
        level = match[0];
      }

      const correctMap = { 'A1': 2, 'A2': 4, 'B1': 6, 'B2': 8, 'C1': 10, 'C2': 12 };
      const wrongMap = { 'A1': -6, 'A2': -5, 'B1': -4, 'B2': -3, 'C1': -2, 'C2': -1 };

      if (isCorrect) {
        return correctMap[level] !== undefined ? correctMap[level] : 6;
      } else {
        return wrongMap[level] !== undefined ? wrongMap[level] : -4;
      }
    }

    async function showQuizAiHint() {
      if (!quizList || quizList.length === 0 || quizIndex >= quizList.length) return;
      const questionWord = quizList[quizIndex];
      if (!questionWord) return;

      const hintBox = document.getElementById('quiz-hint-box');
      const hintText = document.getElementById('quiz-hint-text');
      if (!hintBox || !hintText) return;

      if (hintBox.style.display === 'block') {
        hintBox.style.display = 'none';
        return;
      }

      // 1. RULE: Only logged in users can use Hints
      if (!currentUser || !currentUser.email) {
        alert('🔒 Tính năng Gợi ý AI chỉ dành cho thành viên đã đăng nhập/đăng ký.\n\nVui lòng đăng nhập hoặc đăng ký tài khoản để nhận ngay 5 lượt gợi ý miễn phí!');
        openAuthModal('login');
        return;
      }

      // 2. RULE: Must have Gemini API Key configured
      const geminiApiKey = localStorage.getItem('vocaflow_gemini_api_key') || '';
      if (!geminiApiKey || !geminiApiKey.trim()) {
        alert('⚠️ Bạn chưa cấu hình Gemini API Key!\n\nVui lòng vào Cài đặt để thêm API Key trước khi sử dụng AI.');
        openSettingsModal();
        return;
      }

      // 3. RULE: Must have hints available
      const currentHints = getUserHints();
      if (currentHints <= 0) {
        if (confirm(`🛒 Bạn đã hết lượt gợi ý AI (0 lượt)!\nSố điểm ví hiện tại: ${getUserPoints()} điểm.\n\nBạn có muốn mở Cửa hàng để đổi 20 điểm lấy 1 lượt gợi ý mới không?`)) {
          openShopModal();
        }
        return;
      }

      hintBox.style.display = 'block';
      hintText.innerHTML = '✨ <em>AI đang tạo gợi ý ngữ cảnh...</em>';

      try {
        const cachedModel = localStorage.getItem('vocaflow_gemini_working_model') || 'gemini-3.5-flash-lite';
        const prompt = `Từ vựng tiếng Anh: "${questionWord.term}". Nghĩa tiếng Việt: "${questionWord.definitionVi}".
Hãy viết 1 câu gợi ý ngữ cảnh siêu ngắn gọn (dưới 15 từ, bằng tiếng Việt) giúp người học đoán được nghĩa mà TUYỆT ĐỐI KHÔNG chứa từ "${questionWord.definitionVi}" hay từ "${questionWord.term}".
Ví dụ từ "wicked": "Gợi ý: Thường miêu tả tính cách nhân vật phản diện trong truyện cổ tích."
Chỉ trả về DUY NHẤT 1 câu gợi ý đó.`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${cachedModel}:generateContent?key=${geminiApiKey.trim()}`, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 60, temperature: 0.3 },
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
          const data = await res.json();
          const rawHint = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (rawHint) {
            setUserHints(currentHints - 1);
            hintText.innerHTML = `✨ <strong>AI Gợi ý:</strong> ${escapeHtml(rawHint)}`;
            showToast(`💡 Đã dùng 1 gợi ý AI (còn ${getUserHints()} lượt).`);
            return;
          }
        }
      } catch (err) {
        console.warn('AI Hint generation error:', err);
      }

      // Fallback local smart cloze hint if AI fails
      let localHint = '';
      if (questionWord.exampleSentence) {
        const termRegex = new RegExp(questionWord.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const clozeEx = questionWord.exampleSentence.replace(termRegex, '[ ... ]');
        localHint = `💡 Ví dụ ngữ cảnh: "${clozeEx}"`;
      } else if (questionWord.collocations && questionWord.collocations.length) {
        localHint = `💡 Cụm từ đi kèm: ${questionWord.collocations.join(', ')}`;
      } else if (questionWord.synonyms && questionWord.synonyms.length) {
        localHint = `💡 Từ gần nghĩa (Synonym): ${questionWord.synonyms.join(', ')}`;
      }

      setUserHints(currentHints - 1);
      hintText.innerHTML = localHint || `💡 Từ này thuộc loại: <strong>${(questionWord.partOfSpeech || 'từ vựng').toUpperCase()}</strong> (Cấp độ: ${questionWord.cefrLevel || 'Chung'})`;
      showToast(`💡 Đã dùng 1 gợi ý (còn ${getUserHints()} lượt).`);
    }

    function checkQuizAnswer(selectedButton, isCorrect) {
      if (quizIsAnswered) return; // Prevent duplicate scoring or clicking after answer!
      quizIsAnswered = true;

      const allButtons = document.querySelectorAll('.quiz-option');
      allButtons.forEach(btn => {
        btn.classList.add('disabled');
        btn.disabled = true;
      });

      const questionWord = quizList[quizIndex];
      const delta = getQuizPointDelta(questionWord?.cefrLevel, isCorrect);
      const currentPts = getUserPoints();
      const newTotalPoints = Math.max(0, currentPts + delta);
      setUserPoints(newTotalPoints);

      if (isCorrect) {
        selectedButton.classList.add('correct');
        quizScore += delta;
        document.getElementById('quiz-score').textContent = `Bài: ${quizScore >= 0 ? '+' : ''}${quizScore}đ`;

        if (questionWord) {
          const { gain } = calculateMasteryPoints(questionWord.cefrLevel, true);
          const { newScore } = updateWordMasteryScore(questionWord, gain);
          const idx = words.findIndex(w => w.id === questionWord.id);
          if (idx >= 0) {
            words[idx].masteryScore = newScore;
            words[idx].status = questionWord.status;
            words[idx].updatedAt = questionWord.updatedAt;
          }
          saveDatabase(true);
          showToast(`🎉 Đúng rồi (+${delta}đ ví, Tổng: ${newTotalPoints}đ)! Thuộc bài: ${newScore}%`);
        }
      } else {
        selectedButton.classList.add('wrong');
        quizScore += delta;
        document.getElementById('quiz-score').textContent = `Bài: ${quizScore >= 0 ? '+' : ''}${quizScore}đ`;

        if (questionWord) {
          const { penalty } = calculateMasteryPoints(questionWord.cefrLevel, true);
          const { newScore } = updateWordMasteryScore(questionWord, -penalty);
          const idx = words.findIndex(w => w.id === questionWord.id);
          if (idx >= 0) {
            words[idx].masteryScore = newScore;
            words[idx].status = questionWord.status;
            words[idx].updatedAt = questionWord.updatedAt;
          }
          saveDatabase(true);

          allButtons.forEach(btn => {
            if (btn.textContent === questionWord.definitionVi) {
              btn.classList.add('correct');
            }
          });
          showToast(`⚠️ Chưa đúng (${delta}đ ví, Còn: ${newTotalPoints}đ)! Thuộc bài: ${newScore}%`);
        }
      }

      document.getElementById('quiz-next-container').style.display = 'block';
    }

    function nextQuizQuestion() {
      quizIndex++;
      if (quizIndex < quizList.length) {
        loadQuizQuestion();
      } else {
        alert(`Bạn đã hoàn thành bài Quiz!\nTổng điểm đạt được: ${quizScore}/${quizList.length * 10}`);
        showScreen('screen-deck-detail');
        renderWordList();
      }
    }

    function speakQuizTerm() {
      if (!quizList || quizList.length === 0 || quizIndex >= quizList.length) return;
      const questionWord = quizList[quizIndex];
      if (questionWord && questionWord.term) {
        speakText(questionWord.term);
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
        alert('Bộ từ này chưa có dữ liệu để xuất Excel!');
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
        words.push({
          id: 'w-imp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
          deckId: currentDeckId,
          term,
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

        importedCount++;
      }

      saveDatabase();
      renderWordList();
      closeModal('modal-import');

      // 4. Report feedback to user
      let msg = `✅ ĐÃ NHẬP THÀNH CÔNG: ${importedCount} từ vựng vào bộ từ!\n\n`;
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

    function startAutoFlashcardMode(useSelectionOnly = false) {
      let deckWords = getFilteredDeckWords();
      if (useSelectionOnly && selectedWordIds.size > 0) {
        deckWords = words.filter(w => selectedWordIds.has(w.id));
      } else if (selectedWordIds.size > 0) {
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
      if (!autoFlashcardList || autoFlashcardList.length === 0) return;
      autoFlashcardList = [...autoFlashcardList].sort(() => Math.random() - 0.5);
      autoFlashcardIndex = 0;
      showToast('🔀 Đã xáo trộn ngẫu nhiên thứ tự phát Auto FC!');
      loadAutoCardData(autoFlashcardIndex);
      if (isAutoPlaying) {
        runAutoFlashcardLoop();
      }
    }

    function syncAutoFlashcardControlsUI() {
      const playIcon = document.getElementById('icon-autofc-playpause');
      const loopBtn = document.getElementById('btn-autofc-loop');
      if (playIcon) {
        playIcon.innerHTML = `<use href="#${isAutoPlaying ? 'i-pause' : 'i-play'}"/>`;
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

    function exitAutoFlashcard() {
      isAutoPlaying = false;
      autoFlashcardStepId++;
      stopAllAudio();
      showScreen('screen-deck-detail');
      renderWordList();
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

      // Front
      const cefrEl = document.getElementById('autofc-front-cefr');
      if (word.cefrLevel) {
        cefrEl.textContent = word.cefrLevel;
        cefrEl.style.display = 'inline-block';
      } else {
        cefrEl.style.display = 'none';
      }
      document.getElementById('autofc-front-pos').textContent = (word.partOfSpeech || 'WORD').toUpperCase();
      document.getElementById('autofc-front-term').textContent = word.term;
      document.getElementById('autofc-front-phonetic').textContent = word.phonetic || '';

      // Back
      document.getElementById('autofc-back-term').textContent = word.term;
      document.getElementById('autofc-back-def').textContent = word.definitionVi;
      document.getElementById('autofc-back-example').textContent = word.exampleSentence ? `“${word.exampleSentence}”` : '';

      const metaEl = document.getElementById('autofc-back-meta');
      let metaHtml = '';
      if (word.synonyms && word.synonyms.length) metaHtml += `<div><strong>Đồng nghĩa:</strong> ${escapeHtml(word.synonyms.join(', '))}</div>`;
      if (word.antonyms && word.antonyms.length) metaHtml += `<div><strong>Trái nghĩa:</strong> ${escapeHtml(word.antonyms.join(', '))}</div>`;
      if (word.collocations && word.collocations.length) metaHtml += `<div><strong>Cụm từ:</strong> ${escapeHtml(word.collocations.join(', '))}</div>`;
      if (word.note) metaHtml += `<div><strong>Ghi chú:</strong> ${escapeHtml(word.note)}</div>`;
      metaEl.innerHTML = metaHtml || '<div style="color:var(--text-muted);text-align:center;">Chưa có dữ liệu mở rộng</div>';
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
            exitAutoFlashcard();
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
        if (statusEl) {
          statusEl.textContent = '🇻🇳 Chuẩn bị đọc nghĩa...';
          statusEl.style.color = '#34d399';
        }

        // 5. Post-flip settle pause (850ms) to let the 3D flip animation finish completely
        await new Promise(r => setTimeout(r, 850));
        if (!isAutoPlaying || thisStepId !== autoFlashcardStepId) return;

        // 6. Speak Vietnamese Definition completely
        if (word.definitionVi) {
          if (statusEl) {
            statusEl.textContent = '🇻🇳 Đang đọc tiếng Việt...';
            statusEl.style.color = '#34d399';
          }
          await playAudioAsync(word.definitionVi, 'vi', currentSpeechRateVi);
        }
        if (!isAutoPlaying || thisStepId !== autoFlashcardStepId) return;

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
          if (nextWord.definitionVi) preloadAudioBlob(nextWord.definitionVi, 'vi');
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
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.style.display = 'block';
      setTimeout(() => { t.style.display = 'none'; }, 3000);
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
    // VOCAFLOW LIBRARY & COMMUNITY ENGINE (v0.0.8.7)
    // =========================================================================
    const BUILTIN_LIBRARY_DECKS = [
    {
        "id":  "lib_deck_10",
        "color":  "#3b82f6",
        "category":  "THPT",
        "description":  "Trọn bộ 60 từ vựng trọng tâm từ Unit 1 đến Unit 10 theo chương trình GDPT Mới.",
        "icon":  "📘",
        "totalWords":  60,
        "grade":  10,
        "title":  "Tiếng Anh Lớp 10 Trọng Tâm (Global Success)",
        "words":  [
                      {
                          "level":  "B2",
                          "antonyms":  "dependent, dependent child",
                          "collocations":  "sole breadwinner, main breadwinner, act as the breadwinner",
                          "example":  "In many modern families, both the husband and wife are equal breadwinners.",
                          "definition":  "Trụ cột gia đình (người kiếm tiền chính nuôi sống gia đình)",
                          "term":  "breadwinner",
                          "topic":  "Unit 1: Family Life",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˈbredˌwɪn.ər/",
                          "synonyms":  "primary earner, sole provider",
                          "note":  "Ghép từ \u0027bread\u0027 (bánh mì/kế sinh nhai) + \u0027winner\u0027 (người kiếm về)."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "breadwinner, office worker",
                          "collocations":  "full-time homemaker, skilled homemaker, work as a homemaker",
                          "example":  "Being a full-time homemaker requires patience, organization, and dedication.",
                          "definition":  "Người nội trợ (người quán xuyến việc nhà và chăm sóc con cái)",
                          "term":  "homemaker",
                          "topic":  "Unit 1: Family Life",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˈhəʊmˌmeɪ.kər/",
                          "synonyms":  "housewife, househusband, caregiver",
                          "note":  "Từ trung tính giới, thay thế cho từ \u0027housewife\u0027 truyền thống."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "light duty, easy chore",
                          "collocations":  "do the heavy lifting, assist with heavy lifting",
                          "example":  "My brother often helps my parents with the heavy lifting around the house.",
                          "definition":  "Công việc nặng nhọc, mang vác đồ nặng trong gia đình",
                          "term":  "heavy lifting",
                          "topic":  "Unit 1: Family Life",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˌhev.i ˈlɪf.tɪŋ/",
                          "synonyms":  "strenuous work, hard physical labor",
                          "note":  "Nghĩa bóng: giải quyết phần công việc gian nan nhất trong một dự án."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "financial freedom, financial ease",
                          "collocations":  "ease the financial burden, shoulder the financial burden, heavy financial burden",
                          "example":  "Sharing living expenses helps ease the financial burden on parents.",
                          "definition":  "Gánh nặng tài chính, áp lực tiền bạc nuôi sống gia đình",
                          "term":  "financial burden",
                          "topic":  "Unit 1: Family Life",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/faɪˈnæn.ʃəl ˈbɜː.dən/",
                          "synonyms":  "economic pressure, monetary strain",
                          "note":  "Động từ đi kèm: ease / relieve (giảm bớt), shoulder / bear (gánh vác)."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "leave all chores to one person",
                          "collocations":  "split chores equally, agree to split chores, chore allocation",
                          "example":  "Happy families often split household chores equally between all members.",
                          "definition":  "Phân chia công việc nhà đều đặn giữa các thành viên",
                          "term":  "split chores",
                          "topic":  "Unit 1: Family Life",
                          "partOfSpeech":  "verb phrase",
                          "phonetic":  "/splɪt tʃɔːz/",
                          "synonyms":  "divide household chores, share domestic duties",
                          "note":  "\u0027Split\u0027 có quá khứ và phân từ hai đều là \u0027split\u0027."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "ingratitude, ungratefulness",
                          "collocations":  "express gratitude, show gratitude, deep gratitude, feeling of gratitude",
                          "example":  "Children should express their heartfelt gratitude to parents for their unconditional care.",
                          "definition":  "Lòng biết ơn, sự tri ân sâu sắc đối với cha mẹ và người thân",
                          "term":  "gratitude",
                          "topic":  "Unit 1: Family Life",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˈɡræt.ɪ.tʃuːd/",
                          "synonyms":  "thankfulness, appreciation, gratefulness",
                          "note":  "Tính từ là \u0027grateful\u0027 (grateful to someone for something)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "zero emission",
                          "collocations":  "reduce carbon footprint, calculate carbon footprint, zero carbon footprint",
                          "example":  "Commuting by public transport is an effective way to minimize your carbon footprint.",
                          "definition":  "Dấu chân carbon (tổng lượng khí nhà kính sinh ra từ hoạt động con người)",
                          "term":  "carbon footprint",
                          "topic":  "Unit 2: Humans \u0026 Environment",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˌkɑː.bən ˈfʊt.prɪnt/",
                          "synonyms":  "greenhouse gas emission, carbon output",
                          "note":  "Thuật ngữ sinh thái trọng tâm trong kỳ thi tốt nghiệp và kiểm tra 10."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "polluting, harmful to the environment",
                          "collocations":  "eco-friendly lifestyle, eco-friendly packaging, eco-friendly materials",
                          "example":  "More consumers are turning to eco-friendly products to reduce plastic pollution.",
                          "definition":  "Thân thiện với môi trường, không gây tổn hại hệ sinh thái",
                          "term":  "eco-friendly",
                          "topic":  "Unit 2: Humans \u0026 Environment",
                          "partOfSpeech":  "adjective",
                          "phonetic":  "/ˌiː.kəʊˈfrend.li/",
                          "synonyms":  "environmentally friendly, green, sustainable",
                          "note":  "Tính từ ghép có gạch nối, thường đứng trước danh từ."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "non-biodegradable, indestructible",
                          "collocations":  "biodegradable waste, biodegradable plastic, 100% biodegradable",
                          "example":  "Supermarkets should replace nylon bags with biodegradable paper containers.",
                          "definition":  "Có thể tự phân hủy sinh học một cách tự nhiên",
                          "term":  "biodegradable",
                          "topic":  "Unit 2: Humans \u0026 Environment",
                          "partOfSpeech":  "adjective",
                          "phonetic":  "/ˌbaɪ.əʊ.dɪˈɡreɪ.də.bəl/",
                          "synonyms":  "decomposable, compostable",
                          "note":  "Tiền tố bio- (sinh học) + degrade (phân hủy) + -able (có thể)."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "N/A",
                          "collocations":  "intensify the greenhouse effect, greenhouse effect gases, cause the greenhouse effect",
                          "example":  "Excessive burning of fossil fuels intensifies the greenhouse effect globally.",
                          "definition":  "Hiệu ứng nhà kính (hiện tượng làm Trái Đất ấm dần lên)",
                          "term":  "greenhouse effect",
                          "topic":  "Unit 2: Humans \u0026 Environment",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˈɡriːn.haʊs ɪˌfekt/",
                          "synonyms":  "global warming phenomenon, thermal entrapment",
                          "note":  "Phân biệt \u0027greenhouse effect\u0027 (hiệu ứng) và \u0027greenhouse gases\u0027 (khí nhà kính)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "energy-wasting, inefficient",
                          "collocations":  "energy-efficient appliances, energy-efficient building, energy-efficient technology",
                          "example":  "Installing energy-efficient LED bulbs cuts down electricity bills significantly.",
                          "definition":  "Tiết kiệm năng lượng, hiệu suất năng lượng cao",
                          "term":  "energy-efficient",
                          "topic":  "Unit 2: Humans \u0026 Environment",
                          "partOfSpeech":  "adjective",
                          "phonetic":  "/ˌen.ə.dʒi.ɪˈfɪʃ.ənt/",
                          "synonyms":  "power-saving, energy-saving, low-consumption",
                          "note":  "Danh từ tương ứng: \u0027energy efficiency\u0027 (hiệu quả sử dụng năng lượng)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "unsustainable, wasteful, destructive",
                          "collocations":  "sustainable development, sustainable lifestyle, sustainable energy",
                          "example":  "We need to promote sustainable agricultural practices to protect the topsoil.",
                          "definition":  "Bền vững (phát triển không làm cạn kiệt tài nguyên tương lai)",
                          "term":  "sustainable",
                          "topic":  "Unit 2: Humans \u0026 Environment",
                          "partOfSpeech":  "adjective",
                          "phonetic":  "/səˈsteɪ.nə.bəl/",
                          "synonyms":  "renewable, eco-friendly, maintainable",
                          "note":  "Danh từ là \u0027sustainability\u0027. Khái niệm then chốt của thế kỷ 21."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "plagiarize, destroy",
                          "collocations":  "compose music, compose a song, compose a symphony",
                          "example":  "Trinh Cong Son composed many immortal love songs and anti-war ballads.",
                          "definition":  "Sáng tác (bản nhạc, ca khúc, tác phẩm nghệ thuật)",
                          "term":  "compose",
                          "topic":  "Unit 3: Music",
                          "partOfSpeech":  "verb",
                          "phonetic":  "/kəmˈpəʊz/",
                          "synonyms":  "create, write, produce, orchestrate",
                          "note":  "Danh từ: composer (nhạc sĩ sáng tác), composition (tác phẩm)."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "N/A",
                          "collocations":  "pass the audition, hold an audition, audition for a role",
                          "example":  "Hundreds of young singers queued up to audition for the singing reality show.",
                          "definition":  "Buổi thử giọng, thi tuyển năng khiếu / Thử giọng thi tuyển",
                          "term":  "audition",
                          "topic":  "Unit 3: Music",
                          "partOfSpeech":  "noun/verb",
                          "phonetic":  "/ɔːˈdɪʃ.ən/",
                          "synonyms":  "tryout, trial performance, screen test",
                          "note":  "Trọng âm 2: au-DI-tion."
                      },
                      {
                          "level":  "A2",
                          "antonyms":  "untalented, clumsy, amateur",
                          "collocations":  "talented musician, highly talented, exceptionally talented",
                          "example":  "She is a exceptionally talented pianist who won international competitions at age 12.",
                          "definition":  "Có tài năng, năng khiếu xuất sắc trong lĩnh vực nào đó",
                          "term":  "talented",
                          "topic":  "Unit 3: Music",
                          "partOfSpeech":  "adjective",
                          "phonetic":  "/ˈtæl.ən.tɪd/",
                          "synonyms":  "gifted, skilled, accomplished, genius",
                          "note":  "Cấu trúc: be talented at / in something."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "commonplace, standard",
                          "collocations":  "global phenomenon, cultural phenomenon, musical phenomenon",
                          "example":  "The band became a global cultural phenomenon almost overnight.",
                          "definition":  "Hiện tượng đặc biệt, người/sự kiện nổi bật gây chấn động",
                          "term":  "phenomenon",
                          "topic":  "Unit 3: Music",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/fəˈnɒm.ɪ.nən/",
                          "synonyms":  "sensation, marvel, trend, wonder",
                          "note":  "Số nhiều là \u0027phenomena\u0027 /fəˈnɒm.ɪ.nə/. Tính từ: phenomenal."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "recorded broadcast, studio playback",
                          "collocations":  "give a live performance, watch a live performance, captivating live performance",
                          "example":  "Attending a live performance of your favorite band is an unforgettable experience.",
                          "definition":  "Buổi biểu diễn trực tiếp (trên sân khấu, trước khán giả)",
                          "term":  "live performance",
                          "topic":  "Unit 3: Music",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/laɪv pəˈfɔː.məns/",
                          "synonyms":  "live show, concert, stage gig",
                          "note":  "\u0027Live\u0027 ở đây phát âm là /laɪv/ (tính từ/trạng từ)."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "contestant, participant",
                          "collocations":  "panel of judges, judge fairly, judge a competition",
                          "example":  "The panel of judges gave constructive feedback to all contestants.",
                          "definition":  "Giám khảo, người chấm giải / Đánh giá, thẩm định chất lượng",
                          "term":  "judge",
                          "topic":  "Unit 3: Music",
                          "partOfSpeech":  "noun/verb",
                          "phonetic":  "/dʒʌdʒ/",
                          "synonyms":  "evaluator, referee, assessor; evaluate, assess",
                          "note":  "Danh từ \u0027judgment\u0027 / \u0027judgement\u0027 (sự phán đoán, đánh giá)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "privileged, wealthy, affluent",
                          "collocations":  "underprivileged children, underprivileged background, support underprivileged families",
                          "example":  "Volunteers organized free evening classes for underprivileged children in rural areas.",
                          "definition":  "Thiệt thòi, có hoàn cảnh khó khăn về kinh tế - xã hội",
                          "term":  "underprivileged",
                          "topic":  "Unit 4: For a Better Community",
                          "partOfSpeech":  "adjective",
                          "phonetic":  "/ˌʌn.dəˈprɪv.əl.ɪdʒd/",
                          "synonyms":  "disadvantaged, deprived, needy, impoverished",
                          "note":  "Trọng âm rơi vào âm tiết 3: un-der-PRIV-i-leged."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "receive, keep, withhold",
                          "collocations":  "donate money to charity, donate blood, generous donation",
                          "example":  "Students decided to donate their old textbooks and clothes to flood victims.",
                          "definition":  "Quyên góp, hiến tặng tiền của, vật phẩm hoặc máu",
                          "term":  "donate",
                          "topic":  "Unit 4: For a Better Community",
                          "partOfSpeech":  "verb",
                          "phonetic":  "/dəʊˈneɪt/",
                          "synonyms":  "contribute, give away, grant, bestow",
                          "note":  "Danh từ là \u0027donation\u0027 /dəʊˈneɪ.ʃən/. Người quyên góp: \u0027donor\u0027."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "selfish behavior",
                          "collocations":  "do community service, perform community service, community service project",
                          "example":  "Participating in community service helps students develop leadership and empathy.",
                          "definition":  "Dịch vụ cộng đồng, hoạt động lao động công ích tình nguyện",
                          "term":  "community service",
                          "topic":  "Unit 4: For a Better Community",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/kəˈmjuː.nə.ti ˌsɜː.vɪs/",
                          "synonyms":  "voluntary work, public service, civic engagement",
                          "note":  "Hoạt động ngoại khóa quan trọng trong hồ sơ du học và học bổng."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "for-profit corporation, commercial enterprise",
                          "collocations":  "run a non-profit organization, work for a non-profit organization",
                          "example":  "The non-profit organization provides clean drinking water to remote villages.",
                          "definition":  "Tổ chức phi lợi nhuận (hoạt động vì mục đích từ thiện/xã hội)",
                          "term":  "non-profit organization",
                          "topic":  "Unit 4: For a Better Community",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˌnɒnˈprɒf.ɪt ˌɔː.ɡən.aɪˈzeɪ.ʃən/",
                          "synonyms":  "NGO, charitable organization, NGO group",
                          "note":  "Viết tắt là NPO. Có thể viết nối: non-profit hoặc nonprofit."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "ability, fitness",
                          "collocations":  "people with disabilities, learning disability, overcome a disability",
                          "example":  "Public buildings should have ramps to improve accessibility for people with disabilities.",
                          "definition":  "Sự khuyết tật, khiếm khuyết về thể chất hoặc tinh thần",
                          "term":  "disability",
                          "topic":  "Unit 4: For a Better Community",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˌdɪs.əˈbɪl.ə.ti/",
                          "synonyms":  "impairment, handicap, physical limitation",
                          "note":  "Tính từ: \u0027disabled\u0027 (người khuyết tật: the disabled / people with disabilities)."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "urban center, metropolitan area",
                          "collocations":  "live in a remote area, access remote areas, remote mountainous area",
                          "example":  "Volunteer doctors traveled to remote areas to provide free health check-ups.",
                          "definition":  "Vùng sâu vùng xa, khu vực hẻo lánh cách biệt",
                          "term":  "remote area",
                          "topic":  "Unit 4: For a Better Community",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/rɪˈməʊt ˈeə.ri.ə/",
                          "synonyms":  "isolated region, distant village, hinterland",
                          "note":  "\u0027Remote\u0027 mang nghĩa xa xôi (remote control = điều khiển từ xa)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "human intelligence, biological mind",
                          "collocations":  "apply artificial intelligence, develop artificial intelligence, AI chatbot",
                          "example":  "Artificial intelligence applications are transforming modern diagnostics and tutoring.",
                          "definition":  "Trí tuệ nhân tạo (công nghệ mô phỏng nhận thức thông minh của con người)",
                          "term":  "artificial intelligence",
                          "topic":  "Unit 5: Inventions",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˌɑː.tɪˈfɪʃ.əl ɪnˈtel.ɪ.dʒəns/",
                          "synonyms":  "AI, machine intelligence, smart algorithm",
                          "note":  "Thuật ngữ công nghệ bắt buộc trong chương trình tiếng Anh 10 mới."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "public domain",
                          "collocations":  "apply for a patent, grant a patent, patent infringement, patent pending",
                          "example":  "The young inventor was granted a patent for his innovative solar-powered boat.",
                          "definition":  "Bằng sáng chế độc quyền / Đăng ký bằng độc quyền sáng chế",
                          "term":  "patent",
                          "topic":  "Unit 5: Inventions",
                          "partOfSpeech":  "noun/verb",
                          "phonetic":  "/ˈpeɪ.tənt/",
                          "synonyms":  "copyright, registered invention, license",
                          "note":  "Phát âm tiếng Anh-Anh là /ˈpeɪ.tənt/ hoặc /ˈpæt.ənt/."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "single-purpose, rigid, limited",
                          "collocations":  "versatile tool, versatile device, highly versatile, versatile actor",
                          "example":  "Smartphones have become the most versatile gadgets in modern human life.",
                          "definition":  "Đa năng, linh hoạt, thích ứng với nhiều mục đích sử dụng khác nhau",
                          "term":  "versatile",
                          "topic":  "Unit 5: Inventions",
                          "partOfSpeech":  "adjective",
                          "phonetic":  "/ˈvɜː.sə.taɪl/",
                          "synonyms":  "all-purpose, flexible, adaptable, multifunctional",
                          "note":  "Danh từ: \u0027versatility\u0027 (tính đa năng, tính linh hoạt)."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "stationary, bulky, immovable",
                          "collocations":  "portable device, portable speaker, portable charger, highly portable",
                          "example":  "Laptops and portable chargers allow students to study anywhere comfortably.",
                          "definition":  "Xách tay, dễ dàng di chuyển và mang theo bên mình",
                          "term":  "portable",
                          "topic":  "Unit 5: Inventions",
                          "partOfSpeech":  "adjective",
                          "phonetic":  "/ˈpɔː.tə.bəl/",
                          "synonyms":  "mobile, transportable, compact, handy",
                          "note":  "Gốc từ tiếng Latin \u0027portare\u0027 nghĩa là mang, vác."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "stagnate, preserve status quo",
                          "collocations":  "revolutionize an industry, revolutionize education, completely revolutionize",
                          "example":  "The invention of the Internet completely revolutionized how we communicate.",
                          "definition":  "Cách mạng hóa, tạo nên sự thay đổi căn bản và toàn diện",
                          "term":  "revolutionize",
                          "topic":  "Unit 5: Inventions",
                          "partOfSpeech":  "verb",
                          "phonetic":  "/ˌrev.əˈluː.ʃən.aɪz/",
                          "synonyms":  "transform, overhaul, reform, modernize",
                          "note":  "Danh từ: \u0027revolution\u0027 (cuộc cách mạng). Tính từ: \u0027revolutionary\u0027."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "conventional, traditional, outdated",
                          "collocations":  "innovative idea, innovative technology, innovative solution",
                          "example":  "Engineers developed an innovative water purification filter from coconut shells.",
                          "definition":  "Có tính đổi mới sáng tạo, mang tính đột phá",
                          "term":  "innovative",
                          "topic":  "Unit 5: Inventions",
                          "partOfSpeech":  "adjective",
                          "phonetic":  "/ˈɪn.ə.və.tɪv/",
                          "synonyms":  "creative, inventive, pioneering, state-of-the-art",
                          "note":  "Động từ: \u0027innovate\u0027 (đổi mới). Danh từ: \u0027innovation\u0027."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "gender equality, gender fairness",
                          "collocations":  "face gender discrimination, combat gender discrimination, prohibit gender discrimination",
                          "example":  "Strict laws were enacted to eliminate gender discrimination in the workplace.",
                          "definition":  "Sự phân biệt đối xử dựa trên giới tính (nam/nữ)",
                          "term":  "gender discrimination",
                          "topic":  "Unit 6: Gender Equality",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˈdʒen.dər dɪˌskrɪm.ɪˈneɪ.ʃən/",
                          "synonyms":  "sex discrimination, sexism, gender bias",
                          "note":  "Động từ là \u0027discriminate against someone on the grounds of gender\u0027."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "inequality, prejudice, bias",
                          "collocations":  "provide equal opportunity, ensure equal opportunity, equal opportunity employer",
                          "example":  "Every child deserves equal opportunity to pursue higher education regardless of gender.",
                          "definition":  "Cơ hội bình đẳng (trong giáo dục, việc làm, thăng tiến)",
                          "term":  "equal opportunity",
                          "topic":  "Unit 6: Gender Equality",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˌiː.kwəl ˌɒp.əˈtʃuː.nə.ti/",
                          "synonyms":  "equal rights, fair access, level playing field",
                          "note":  "Khẩu hiệu quốc tế: Equal opportunities for all."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "retain, maintain, establish",
                          "collocations":  "eliminate poverty, eliminate barriers, completely eliminate",
                          "example":  "International programs aim to eliminate illiteracy and poverty in developing nations.",
                          "definition":  "Xóa bỏ hoàn toàn, bài trừ, loại trừ triệt để",
                          "term":  "eliminate",
                          "topic":  "Unit 6: Gender Equality",
                          "partOfSpeech":  "verb",
                          "phonetic":  "/ɪˈlɪm.ɪ.neɪt/",
                          "synonyms":  "eradicate, get rid of, wipe out, remove",
                          "note":  "Danh từ: \u0027elimination\u0027 (sự loại trừ / vòng loại thể thao)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "suppress, restrict, disempower",
                          "collocations":  "empower women, empower youth, economic empowerment",
                          "example":  "Educating young girls empowers them to become independent community leaders.",
                          "definition":  "Trao quyền, trao cơ hội và sự tự tin để tự quyết định cuộc sống",
                          "term":  "empower",
                          "topic":  "Unit 6: Gender Equality",
                          "partOfSpeech":  "verb",
                          "phonetic":  "/ɪmˈpaʊ.ər/",
                          "synonyms":  "enable, authorize, liberate, equip",
                          "note":  "Danh từ: \u0027empowerment\u0027 (sự trao quyền, sự tự chủ)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "pay equity, equal pay",
                          "collocations":  "gender wage gap, close the wage gap, narrow the wage gap, widen the wage gap",
                          "example":  "Governments are taking active steps to close the gender wage gap across industries.",
                          "definition":  "Khoảng cách chênh lệch tiền lương (thường giữa nam và nữ)",
                          "term":  "wage gap",
                          "topic":  "Unit 6: Gender Equality",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˈweɪdʒ ˌɡæp/",
                          "synonyms":  "pay gap, income disparity",
                          "note":  "Động từ hay đi cùng: \u0027narrow\u0027 (thu hẹp) hoặc \u0027close\u0027 (xóa bỏ) the gap."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "individuality, open-mindedness",
                          "collocations":  "gender stereotype, break stereotypes, cultural stereotype, stereotype someone",
                          "example":  "We must challenge the traditional stereotype that technical careers are only for men.",
                          "definition":  "Định kiến, khuôn mẫu rập khuôn thiếu cơ sở về một nhóm người",
                          "term":  "stereotype",
                          "topic":  "Unit 6: Gender Equality",
                          "partOfSpeech":  "noun/verb",
                          "phonetic":  "/ˈster.i.ə.taɪp/",
                          "synonyms":  "preconception, cliché, bias, generalized belief",
                          "note":  "Cụm từ rất hay gặp: \u0027break / shatter gender stereotypes\u0027 (phá vỡ định kiến giới)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "warfare, conflict",
                          "collocations":  "peacekeeping mission, peacekeeping force, UN peacekeeper",
                          "example":  "Vietnamese military officers participate actively in United Nations peacekeeping missions.",
                          "definition":  "Hoạt động gìn giữ hòa bình (của Liên Hợp Quốc)",
                          "term":  "peacekeeping",
                          "topic":  "Unit 7: VN \u0026 International Orgs",
                          "partOfSpeech":  "noun/adjective",
                          "phonetic":  "/ˈpiːsˌkiː.pɪŋ/",
                          "synonyms":  "peace maintenance, peace protection",
                          "note":  "Việt Nam cử lực lượng gìn giữ hòa bình tới Nam Sudan và Abyei."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "isolate, segregate, separate",
                          "collocations":  "integrate into the global economy, international integration, regional integration",
                          "example":  "Vietnam continues to integrate deeply into the global economy through trade pacts.",
                          "definition":  "Hội nhập, hòa nhập vào nền kinh tế và cộng đồng quốc tế",
                          "term":  "integrate",
                          "topic":  "Unit 7: VN \u0026 International Orgs",
                          "partOfSpeech":  "verb",
                          "phonetic":  "/ˈɪn.tɪ.ɡreɪt/",
                          "synonyms":  "assimilate, incorporate, blend in, cooperate",
                          "note":  "Danh từ: \u0027integration\u0027 (international integration = hội nhập quốc tế)."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "hinder, discourage, suppress",
                          "collocations":  "promote peace, promote economic growth, promote cultural exchange",
                          "example":  "UNICEF works tirelessly to promote children\u0027s rights and education worldwide.",
                          "definition":  "Thúc đẩy, khuyến khích, quảng bá mối quan hệ hữu nghị và thương mại",
                          "term":  "promote",
                          "topic":  "Unit 7: VN \u0026 International Orgs",
                          "partOfSpeech":  "verb",
                          "phonetic":  "/prəˈməʊt/",
                          "synonyms":  "foster, encourage, boost, advance",
                          "note":  "Danh từ: \u0027promotion\u0027 (sự thăng tiến / sự xúc tiến quảng bá)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "compete, oppose, work alone",
                          "collocations":  "collaborate with international partners, collaborate on a project, closely collaborate",
                          "example":  "Vietnamese medical scientists collaborate with WHO experts to prevent pandemics.",
                          "definition":  "Hợp tác, cộng tác cùng nhau để đạt mục tiêu chung",
                          "term":  "collaborate",
                          "topic":  "Unit 7: VN \u0026 International Orgs",
                          "partOfSpeech":  "verb",
                          "phonetic":  "/kəˈlæb.ə.reɪt/",
                          "synonyms":  "cooperate, partner with, work together",
                          "note":  "Cấu trúc: collaborate with someone on / in something. Danh từ: collaboration."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "unilateral (đơn phương), multilateral (đa phương)",
                          "collocations":  "bilateral relations, bilateral agreement, bilateral trade, bilateral cooperation",
                          "example":  "The two countries signed a bilateral trade agreement to lower import tariffs.",
                          "definition":  "Song phương, liên quan đến thỏa thuận giữa hai quốc gia",
                          "term":  "bilateral",
                          "topic":  "Unit 7: VN \u0026 International Orgs",
                          "partOfSpeech":  "adjective",
                          "phonetic":  "/baɪˈlæt.ər.əl/",
                          "synonyms":  "two-sided, two-party, mutual",
                          "note":  "Tiền tố \u0027bi-\u0027 = hai (như bilingual: song ngữ, bicycle: xe đạp)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "unilateral, bilateral",
                          "collocations":  "multilateral diplomacy, multilateral trade organization, multilateral forum",
                          "example":  "Multilateral diplomacy plays a crucial role in resolving transnational climate disputes.",
                          "definition":  "Đa phương, có sự tham gia của nhiều quốc gia (như UN, WTO, ASEAN)",
                          "term":  "multilateral",
                          "topic":  "Unit 7: VN \u0026 International Orgs",
                          "partOfSpeech":  "adjective",
                          "phonetic":  "/ˌmʌl.tiˈlæt.ər.əl/",
                          "synonyms":  "many-sided, international, collective",
                          "note":  "Tiền tố \u0027multi-\u0027 = nhiều (như multimedia, multilingual)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "purely traditional classroom learning",
                          "collocations":  "adopt blended learning, blended learning model, benefits of blended learning",
                          "example":  "Blended learning gives high school students greater flexibility and autonomy.",
                          "definition":  "Phương pháp học tập kết hợp (kết hợp giữa học trực tiếp và học online)",
                          "term":  "blended learning",
                          "topic":  "Unit 8: New Ways to Learn",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˌblen.dɪd ˈlɜː.nɪŋ/",
                          "synonyms":  "hybrid learning, integrated learning",
                          "note":  "\u0027Blend\u0027 là pha trộn, hòa quyện."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "analogue tool, paper resource",
                          "collocations":  "use digital devices, modern digital devices, screen time on digital devices",
                          "example":  "Using digital devices wisely turns the classroom into an interactive learning hub.",
                          "definition":  "Thiết bị kỹ thuật số (laptop, tablet, smartphone phục vụ học tập)",
                          "term":  "digital device",
                          "topic":  "Unit 8: New Ways to Learn",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˈdɪdʒ.ɪ.təl dɪˈvaɪs/",
                          "synonyms":  "electronic gadget, smart device",
                          "note":  "Phân biệt \u0027device\u0027 (đếm được) và \u0027equipment\u0027 (không đếm được)."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "passive, one-way, non-interactive",
                          "collocations":  "interactive whiteboard, interactive game, interactive software, interactive display",
                          "example":  "Teachers design interactive quizzes to make English grammar lessons engaging.",
                          "definition":  "Có tính tương tác cao (giữa người dùng và phần mềm hoặc giữa người học)",
                          "term":  "interactive",
                          "topic":  "Unit 8: New Ways to Learn",
                          "partOfSpeech":  "adjective",
                          "phonetic":  "/ˌɪn.təˈræk.tɪv/",
                          "synonyms":  "participatory, two-way, collaborative",
                          "note":  "Động từ là \u0027interact with\u0027 (tương tác với)."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "restrict, block, deny",
                          "collocations":  "access information, gain access to, free access, internet access",
                          "example":  "The high-speed school Wi-Fi allows students to access digital libraries instantly.",
                          "definition":  "Truy cập, tiếp cận thông tin, tài liệu / Quyền tiếp cận",
                          "term":  "access",
                          "topic":  "Unit 8: New Ways to Learn",
                          "partOfSpeech":  "verb/noun",
                          "phonetic":  "/ˈæk.ses/",
                          "synonyms":  "reach, enter, retrieve, gain entrance to",
                          "note":  "Động từ \u0027access something\u0027 (không có giới từ \u0027to\u0027), nhưng danh từ \u0027have access to something\u0027."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "teacher-led instruction",
                          "collocations":  "self-study materials, develop self-study habits, self-study course",
                          "example":  "Effective self-study skills help Grade 10 students prepare thoroughly for national exams.",
                          "definition":  "Tự học, quá trình chủ động nghiên cứu mà không cần giám sát trực tiếp",
                          "term":  "self-study",
                          "topic":  "Unit 8: New Ways to Learn",
                          "partOfSpeech":  "noun/verb",
                          "phonetic":  "/ˌselfˈstʌd.i/",
                          "synonyms":  "independent learning, self-instruction, autonomous study",
                          "note":  "Tương đương với cụm \u0027autonomous learning\u0027."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "physical classroom, brick-and-mortar school",
                          "collocations":  "attend a virtual classroom, set up a virtual classroom, interactive virtual classroom",
                          "example":  "During severe weather conditions, students attended lessons in a virtual classroom.",
                          "definition":  "Lớp học ảo (môi trường học tập trực tuyến thông qua máy tính và mạng Internet)",
                          "term":  "virtual classroom",
                          "topic":  "Unit 8: New Ways to Learn",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˌvɜː.tʃu.əl ˈklɑːs.ruːm/",
                          "synonyms":  "online classroom, cyber class, digital classroom",
                          "note":  "\u0027Virtual\u0027 có nghĩa là ảo / mô phỏng trên không gian mạng số."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "monoculture, ecological homogeneity",
                          "collocations":  "preserve biodiversity, loss of biodiversity, rich biodiversity, protect biodiversity",
                          "example":  "Protecting national parks is vital to preserve the rich biodiversity of Vietnam.",
                          "definition":  "Sự đa dạng sinh học (sự phong phú của các loài động, thực vật trong tự nhiên)",
                          "term":  "biodiversity",
                          "topic":  "Unit 9: Protecting Environment",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˌbaɪ.əʊ.daɪˈvɜː.sə.ti/",
                          "synonyms":  "biological diversity, ecological variety",
                          "note":  "Ghép từ \u0027bio-\u0027 (sinh học) và \u0027diversity\u0027 (tính đa dạng). Trọng âm 4."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "abundant species, thriving species",
                          "collocations":  "critically endangered species, save endangered species, red list of endangered species",
                          "example":  "The Javan rhino and the saola are critically endangered species in Southeast Asia.",
                          "definition":  "Các loài có nguy cơ tuyệt chủng (động thực vật đứng trước nguy cơ biến mất)",
                          "term":  "endangered species",
                          "topic":  "Unit 9: Protecting Environment",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ɪnˌdeɪn.dʒəd ˈspiː.ʃiːz/",
                          "synonyms":  "threatened species, species at risk",
                          "note":  "\u0027Species\u0027 có dạng số ít và số nhiều giống nhau: one species, many species."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "habitat restoration, habitat conservation",
                          "collocations":  "cause habitat loss, suffer from habitat loss, prevent habitat loss",
                          "example":  "Deforestation and urban expansion are the primary drivers of habitat loss worldwide.",
                          "definition":  "Mất môi trường sống (do nạn phá rừng, đô thị hóa, biến đổi khí hậu)",
                          "term":  "habitat loss",
                          "topic":  "Unit 9: Protecting Environment",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˈhæb.ɪ.tæt lɒs/",
                          "synonyms":  "habitat destruction, habitat fragmentation",
                          "note":  "\u0027Habitat\u0027 là môi trường sống tự nhiên của một loài sinh vật cụ thể."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "wildlife protection, lawful conservation",
                          "collocations":  "anti-poaching patrol, combat poaching, illegal poaching activities",
                          "example":  "Illegal poaching threatens the survival of elephants and rhinos for their horns and tusks.",
                          "definition":  "Nạn săn bắt trộm động vật hoang dã trái phép",
                          "term":  "poaching",
                          "topic":  "Unit 9: Protecting Environment",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˈpəʊ.tʃɪŋ/",
                          "synonyms":  "illegal hunting, wildlife trafficking",
                          "note":  "Người đi săn trộm gọi là \u0027poacher\u0027. Động từ: \u0027poach\u0027."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "destruction, exploitation, depletion",
                          "collocations":  "wildlife conservation, environmental conservation, energy conservation, conservation area",
                          "example":  "The local community participated actively in sea turtle conservation projects.",
                          "definition":  "Công tác bảo tồn, gìn giữ tài nguyên thiên nhiên và động vật hoang dã",
                          "term":  "conservation",
                          "topic":  "Unit 9: Protecting Environment",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˌkɒn.səˈveɪ.ʃən/",
                          "synonyms":  "preservation, protection, safeguarding, stewardship",
                          "note":  "Nhà bảo tồn là \u0027conservationist\u0027. Động từ: \u0027conserve\u0027."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "N/A",
                          "collocations":  "marine ecosystem, forest ecosystem, disrupt the ecosystem, fragile ecosystem",
                          "example":  "Coral reefs are among the most delicate and diverse ecosystems on our planet.",
                          "definition":  "Hệ sinh thái (cộng đồng sinh vật tương tác với môi trường vật lý xung quanh)",
                          "term":  "ecosystem",
                          "topic":  "Unit 9: Protecting Environment",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˈiː.kəʊˌsɪs.təm/",
                          "synonyms":  "ecological system, natural biome",
                          "note":  "Eco- (thuộc môi trường) + system (hệ thống)."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "mass tourism, commercial sightseeing",
                          "collocations":  "develop ecotourism, ecotourism destination, ecotourism tour, ecotourist",
                          "example":  "Ecotourism generates income for local ethnic residents while protecting virgin forests.",
                          "definition":  "Du lịch sinh thái (hình thức du lịch có trách nhiệm với thiên nhiên và văn hóa bản địa)",
                          "term":  "ecotourism",
                          "topic":  "Unit 10: Ecotourism",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˈiː.kəʊˌtʊə.rɪ.zəm/",
                          "synonyms":  "green tourism, ecological travel, sustainable tourism",
                          "note":  "Ghép từ \u0027ecology\u0027 (sinh thái học) + \u0027tourism\u0027 (du lịch)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "N/A",
                          "collocations":  "native flora and fauna, unique flora and fauna, protect local flora and fauna",
                          "example":  "Cuc Phuong National Park boasts an extraordinarily rich diversity of flora and fauna.",
                          "definition":  "Hệ thực vật và hệ động vật (toàn bộ cây cối và muôn thú trong một khu vực)",
                          "term":  "flora and fauna",
                          "topic":  "Unit 10: Ecotourism",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˌflɔː.rə ænd ˈfɔː.nə/",
                          "synonyms":  "plants and animals, wildlife and vegetation",
                          "note":  "\u0027Flora\u0027 chỉ hoa cỏ / thực vật; \u0027Fauna\u0027 chỉ muông thú / động vật."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "destructive tourism, reckless travel",
                          "collocations":  "practice responsible travel, principles of responsible travel",
                          "example":  "Responsible travel involves minimizing waste, respecting local customs, and buying local goods.",
                          "definition":  "Du lịch có trách nhiệm (tôn trọng môi trường tự nhiên và phong tục cộng đồng)",
                          "term":  "responsible travel",
                          "topic":  "Unit 10: Ecotourism",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/rɪˈspɒn.sə.bəl ˈtræv.əl/",
                          "synonyms":  "ethical tourism, mindful traveling",
                          "note":  "Phương châm: \u0027Take nothing but memories, leave nothing but footprints\u0027."
                      },
                      {
                          "level":  "A2",
                          "antonyms":  "point of departure, origin",
                          "collocations":  "popular destination, tourist destination, travel destination, holiday destination",
                          "example":  "Phu Quoc Island has emerged as one of the most attractive beach destinations in Asia.",
                          "definition":  "Điểm đến, đích đến, địa danh du lịch thu hút du khách",
                          "term":  "destination",
                          "topic":  "Unit 10: Ecotourism",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˌdes.tɪˈneɪ.ʃən/",
                          "synonyms":  "tourist spot, holiday location, arrival point",
                          "note":  "Trọng âm 3: des-ti-NA-tion."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "familiar, native, ordinary, commonplace",
                          "collocations":  "exotic plants, exotic wildlife, exotic island, exotic flavor",
                          "example":  "The botanical garden is home to thousands of exotic orchid species and butterflies.",
                          "definition":  "Kỳ lạ, độc đáo, mang vẻ đẹp quyến rũ từ xứ sở xa xôi",
                          "term":  "exotic",
                          "topic":  "Unit 10: Ecotourism",
                          "partOfSpeech":  "adjective",
                          "phonetic":  "/ɪɡˈzɒt.ɪk/",
                          "synonyms":  "unusual, foreign, striking, alluring",
                          "note":  "Trọng âm 2. Âm đầu đọc là /ɪɡˈzɒt.ɪk/."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "N/A",
                          "collocations":  "minimize environmental impact, negative environmental impact, assess environmental impact",
                          "example":  "Before building new resorts, developers must conduct a comprehensive environmental impact assessment.",
                          "definition":  "Tác động môi trường (ảnh hưởng của các hoạt động của con người lên thiên nhiên)",
                          "term":  "environmental impact",
                          "topic":  "Unit 10: Ecotourism",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ɪnˌvaɪ.rənˈmen.təl ˈɪm.pækt/",
                          "synonyms":  "ecological footprint, environmental effect",
                          "note":  "Cụm từ EIA: Environmental Impact Assessment (Đánh giá tác động môi trường)."
                      }
                  ]
    },
    {
        "id":  "lib_deck_11",
        "color":  "#8b5cf6",
        "category":  "THPT",
        "description":  "Trọn bộ 60 từ vựng cốt lõi Unit 1 - Unit 10 bám sát đề kiểm tra và thi học kỳ.",
        "icon":  "📙",
        "totalWords":  60,
        "grade":  11,
        "title":  "Tiếng Anh Lớp 11 Trọng Tâm (Global Success)",
        "words":  [
                      {
                          "level":  "B2",
                          "antonyms":  "immunodeficiency",
                          "collocations":  "boost the immune system, weaken the immune system, strong immune system",
                          "example":  "A balanced diet rich in vitamins and regular exercise significantly strengthen the immune system.",
                          "definition":  "Hệ miễn dịch (hệ thống phòng thủ sinh học chống lại mầm bệnh)",
                          "term":  "immune system",
                          "topic":  "Unit 1: A Long \u0026 Healthy Life",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ɪˈmjuːn ˌsɪs.təm/",
                          "synonyms":  "body defense system, immunity",
                          "note":  "Tính từ \u0027immune\u0027 (immune to disease = miễn dịch với bệnh tật)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "short lifespan, early death",
                          "collocations":  "promote longevity, secret to longevity, exceptional longevity",
                          "example":  "Japanese people are renowned worldwide for their exceptional longevity and healthy eating habits.",
                          "definition":  "Tuổi thọ cao, sự sống lâu",
                          "term":  "longevity",
                          "topic":  "Unit 1: A Long \u0026 Healthy Life",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/lɒnˈdʒev.ə.ti/",
                          "synonyms":  "long life, lifespan, life expectancy",
                          "note":  "Gốc từ \u0027long\u0027 -\u003e tính từ \u0027long-lived\u0027 -\u003e danh từ \u0027longevity\u0027. Trọng âm 2."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "antibiotic sensitivity",
                          "collocations":  "combat antibiotic resistance, cause antibiotic resistance, rise of antibiotic resistance",
                          "example":  "Overusing prescription drugs can lead to dangerous antibiotic resistance in patients.",
                          "definition":  "Sự kháng thuốc kháng sinh (vi khuẩn biến đổi không còn bị tiêu diệt bởi thuốc)",
                          "term":  "antibiotic resistance",
                          "topic":  "Unit 1: A Long \u0026 Healthy Life",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˌæn.ti.baɪˈɒt.ɪk rɪˌzɪs.təns/",
                          "synonyms":  "drug resistance, antimicrobial resistance",
                          "note":  "Vấn đề y tế toàn cầu then chốt được thảo luận trong bài học Unit 1."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "unhealthy, unwholesome, junk food",
                          "collocations":  "nutritious meal, highly nutritious, nutritious diet",
                          "example":  "A nutritious breakfast provides teenagers with the vital energy needed for active school days.",
                          "definition":  "Bổ dưỡng, giàu chất dinh dưỡng tốt cho cơ thể",
                          "term":  "nutritious",
                          "topic":  "Unit 1: A Long \u0026 Healthy Life",
                          "partOfSpeech":  "adjective",
                          "phonetic":  "/njuːˈtrɪʃ.əs/",
                          "synonyms":  "nourishing, wholesome, nutrient-dense",
                          "note":  "Danh từ: nutrition (dinh dưỡng), nutrient (chất dinh dưỡng), nutritionist (chuyên gia dinh dưỡng)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "non-communicable disease, chronic condition",
                          "collocations":  "spread of infectious disease, fight infectious diseases, outbreak of an infectious disease",
                          "example":  "Vaccination is one of the most effective measures to prevent the spread of infectious diseases.",
                          "definition":  "Bệnh truyền nhiễm (bệnh lây lan do virus, vi khuẩn)",
                          "term":  "infectious disease",
                          "topic":  "Unit 1: A Long \u0026 Healthy Life",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ɪnˈfek.ʃəs dɪˌziːz/",
                          "synonyms":  "contagious disease, communicable disease",
                          "note":  "Động từ: infect (lây nhiễm), infection (sự nhiễm trùng), disinfect (khử trùng)."
                      },
                      {
                          "level":  "A2",
                          "antonyms":  "lead a sedentary lifestyle",
                          "collocations":  "work out regularly, gym workout, intense workout routine",
                          "example":  "He makes it a habit to work out at the fitness center three times a week.",
                          "definition":  "Tập thể dục, rèn luyện thể chất",
                          "term":  "work out",
                          "topic":  "Unit 1: A Long \u0026 Healthy Life",
                          "partOfSpeech":  "phrasal verb",
                          "phonetic":  "/wɜːk aʊt/",
                          "synonyms":  "exercise, do physical training, keep fit",
                          "note":  "Danh từ viết liền: a workout (buổi tập luyện)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "generational harmony, mutual understanding",
                          "collocations":  "bridge the generation gap, narrow the generation gap, experience a generation gap",
                          "example":  "Open family communication is essential to bridge the generation gap between parents and teenagers.",
                          "definition":  "Khoảng cách thế hệ (sự khác biệt về tư tưởng, lối sống giữa các thế hệ)",
                          "term":  "generation gap",
                          "topic":  "Unit 2: The Generation Gap",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˌdʒen.əˈreɪ.ʃən ɡæp/",
                          "synonyms":  "generational divide, age divide",
                          "note":  "Động từ hay đi kèm: bridge / narrow (thu hẹp khoảng cách)."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "nuclear family, single-parent family",
                          "collocations":  "live in an extended family, extended family members, traditional extended family",
                          "example":  "Living in an extended family allows children to receive abundant care and love from grandparents.",
                          "definition":  "Gia đình nhiều thế hệ (gồm ông bà, cha mẹ, con cháu cùng chung sống)",
                          "term":  "extended family",
                          "topic":  "Unit 2: The Generation Gap",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ɪkˌsten.dɪd ˈfæm.əl.i/",
                          "synonyms":  "multi-generational family, joint family",
                          "note":  "Trái nghĩa với \u0027nuclear family\u0027 (gia đình hạt nhân chỉ gồm bố mẹ và con cái)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "freedom of movement",
                          "collocations":  "set a curfew, break the curfew, impose a curfew, strict curfew",
                          "example":  "My parents set a strict 10 PM curfew on weekdays to ensure I get enough rest.",
                          "definition":  "Giờ giới nghiêm (giờ quy định phải có mặt ở nhà vào buổi tối)",
                          "term":  "curfew",
                          "topic":  "Unit 2: The Generation Gap",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˈkɜː.fjuː/",
                          "synonyms":  "closing hour, home-coming deadline",
                          "note":  "Cụm từ: \u0027impose a curfew on someone\u0027 (áp đặt giờ giới nghiêm)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "narrow-minded, conservative, rigid, dogmatic",
                          "collocations":  "be open-minded about, open-minded attitude, remain open-minded",
                          "example":  "Modern parents tend to be more open-minded regarding their children\u0027s career choices.",
                          "definition":  "Cởi mở, sẵn sàng lắng nghe và tiếp nhận ý kiến, quan điểm mới",
                          "term":  "open-minded",
                          "topic":  "Unit 2: The Generation Gap",
                          "partOfSpeech":  "adjective",
                          "phonetic":  "/ˌəʊ.pənˈmaɪn.dɪd/",
                          "synonyms":  "receptive, broad-minded, progressive, tolerant",
                          "note":  "Trái nghĩa là \u0027narrow-minded\u0027 hoặc \u0027conservative\u0027 (bảo thủ)."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "harmony, consensus, agreement, peace",
                          "collocations":  "resolve a conflict, family conflict, generate conflict, conflict with parents",
                          "example":  "Disagreements over table manners and screen time often cause family conflicts.",
                          "definition":  "Xung đột, mâu thuẫn / Xảy ra va chạm, bất đồng quan điểm",
                          "term":  "conflict",
                          "topic":  "Unit 2: The Generation Gap",
                          "partOfSpeech":  "noun/verb",
                          "phonetic":  "/ˈkɒn.flɪkt/",
                          "synonyms":  "dispute, discord, clash, friction",
                          "note":  "Danh từ nhấn âm 1 /ˈkɒn.flɪkt/, động từ nhấn âm 2 /kənˈflɪkt/."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "financial dependence, reliance on parents",
                          "collocations":  "achieve financial independence, gain financial independence, strive for financial independence",
                          "example":  "Achieving financial independence allows young adults to make their own life choices freely.",
                          "definition":  "Sự tự chủ tài chính, khả năng tự kiếm tiền và trang trải cuộc sống",
                          "term":  "financial independence",
                          "topic":  "Unit 2: The Generation Gap",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/faɪˈnæn.ʃəl ˌɪn.dɪˈpen.dəns/",
                          "synonyms":  "economic self-reliance, financial autonomy",
                          "note":  "Động từ \u0027achieve / gain / attain financial independence\u0027."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "conventional city, unplanned metropolis",
                          "collocations":  "build a smart city, smart city technology, smart city infrastructure",
                          "example":  "Smart cities utilize sensor networks to optimize traffic flow and reduce power consumption.",
                          "definition":  "Đô thị thông minh (thành phố ứng dụng công nghệ IoT và AI để quản lý)",
                          "term":  "smart city",
                          "topic":  "Unit 3: Cities of the Future",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˈsmɑːt ˌsɪt.i/",
                          "synonyms":  "digital city, intelligent city, cyber city",
                          "note":  "Khái niệm đô thị hóa hiện đại xuyên suốt Unit 3."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "superstructure",
                          "collocations":  "transport infrastructure, modern infrastructure, upgrade infrastructure, green infrastructure",
                          "example":  "The government is investing billions of dollars in upgrading urban transport infrastructure.",
                          "definition":  "Cơ sở hạ tầng (hệ thống giao thông, điện nước, viễn thông công cộng)",
                          "term":  "infrastructure",
                          "topic":  "Unit 3: Cities of the Future",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˈɪn.frəˌstrʌk.tʃər/",
                          "synonyms":  "basic framework, public amenities, municipal facilities",
                          "note":  "Trọng âm 1: IN-fra-struc-ture. Danh từ không đếm được."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "unlivable, inhospitable, uninhabitable",
                          "collocations":  "most livable city, livable environment, create a livable community",
                          "example":  "Da Nang is consistently voted as one of the most livable cities in Vietnam.",
                          "definition":  "Đáng sống, có môi trường sống trong lành và tiện nghi",
                          "term":  "livable",
                          "topic":  "Unit 3: Cities of the Future",
                          "partOfSpeech":  "adjective",
                          "phonetic":  "/ˈlɪv.ə.bəl/",
                          "synonyms":  "habitable, comfortable, pleasant, hospitable",
                          "note":  "Có 2 cách viết: livable hoặc liveable. Danh từ: livability."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "N/A",
                          "collocations":  "consult an urban planner, urban planner team, vision of urban planners",
                          "example":  "Urban planners are designing more pedestrian streets and rooftop gardens to counter heat.",
                          "definition":  "Chuyên gia quy hoạch đô thị",
                          "term":  "urban planner",
                          "topic":  "Unit 3: Cities of the Future",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˌɜː.bən ˈplæn.ər/",
                          "synonyms":  "city planner, municipal designer",
                          "note":  "Urban (thuộc đô thị) \u003e\u003c Rural (thuộc nông thôn). Urbanization = sự đô thị hóa."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "motorway, highway",
                          "collocations":  "create a pedestrian zone, walk in a pedestrian zone, designated pedestrian zone",
                          "example":  "The pedestrian zone around Hoan Kiem Lake attracts massive crowds on weekends.",
                          "definition":  "Phố đi bộ, khu vực dành riêng cho người đi bộ cấm xe cơ giới",
                          "term":  "pedestrian zone",
                          "topic":  "Unit 3: Cities of the Future",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/pəˈdes.tri.ən zəʊn/",
                          "synonyms":  "car-free zone, walking street, pedestrian precinct",
                          "note":  "\u0027Pedestrian\u0027 là người đi bộ (noun) hoặc thuộc người đi bộ (adj)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "N/A",
                          "collocations":  "temperature sensor, motion sensor, smart sensor, sensor network",
                          "example":  "Automated streetlights with motion sensors only turn on when vehicles or pedestrians approach.",
                          "definition":  "Cảm biến, thiết bị cảm ứng thông minh",
                          "term":  "sensor",
                          "topic":  "Unit 3: Cities of the Future",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˈsen.sər/",
                          "synonyms":  "detector, sensing device, transducer",
                          "note":  "Động từ là \u0027sense\u0027 (cảm nhận, nhận biết)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "individual state, faction",
                          "collocations":  "regional bloc, trading bloc, ASEAN bloc, economic bloc",
                          "example":  "ASEAN is a dynamic regional bloc comprising ten Southeast Asian nations.",
                          "definition":  "Khối liên minh các quốc gia có chung lợi ích chính trị, kinh tế",
                          "term":  "bloc",
                          "topic":  "Unit 4: ASEAN and Viet Nam",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/blɒk/",
                          "synonyms":  "alliance, coalition, union, confederation",
                          "note":  "Phân biệt với \u0027block\u0027 (khối nhà/chặn). Cùng phát âm /blɒk/."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "N/A",
                          "collocations":  "sign a charter, ASEAN Charter, UN Charter, constitutional charter",
                          "example":  "The ASEAN Charter entered into force in 2008 to provide a legal framework for the bloc.",
                          "definition":  "Hiến chương, văn kiện mang tính pháp lý quy định mục tiêu và nguyên tắc hoạt động",
                          "term":  "charter",
                          "topic":  "Unit 4: ASEAN and Viet Nam",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˈtʃɑː.tər/",
                          "synonyms":  "constitution, formal covenant, founding treaty",
                          "note":  "Trọng âm 1. Cụm từ: \u0027charter member\u0027 (thành viên sáng lập)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "division, discord, disunity, antagonism",
                          "collocations":  "show solidarity with, ASEAN solidarity, international solidarity, promote solidarity",
                          "example":  "ASEAN member states consistently demonstrate strong solidarity during natural disasters.",
                          "definition":  "Sự đoàn kết, tinh thần tương thân tương ái giữa các thành viên",
                          "term":  "solidarity",
                          "topic":  "Unit 4: ASEAN and Viet Nam",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˌsɒl.ɪˈdær.ə.ti/",
                          "synonyms":  "unity, cohesion, harmony, mutual support",
                          "note":  "Trọng âm 3: sol-i-DAR-i-ty."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "cultural isolation, ethnocentrism",
                          "collocations":  "organize cultural exchange, participate in cultural exchange, student cultural exchange",
                          "example":  "The ASEAN Youth Camp promotes cultural exchange and mutual respect among young delegates.",
                          "definition":  "Giao lưu văn hóa (chương trình chia sẻ truyền thống, nghệ thuật giữa các nước)",
                          "term":  "cultural exchange",
                          "topic":  "Unit 4: ASEAN and Viet Nam",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˌkʌl.tʃər.əl ɪksˈtʃeɪndʒ/",
                          "synonyms":  "cross-cultural sharing, intercultural dialogue",
                          "note":  "Cụm từ rất hay gặp trong bài thi nói về hội nhập quốc tế."
                      },
                      {
                          "level":  "A2",
                          "antonyms":  "compulsory worker, forced laborer",
                          "collocations":  "youth volunteer, volunteer for a mission, international volunteer, voluntary work",
                          "example":  "Many Vietnamese youths volunteer to teach English to underprivileged children across ASEAN.",
                          "definition":  "Tình nguyện làm việc gì / Tình nguyện viên",
                          "term":  "volunteer",
                          "topic":  "Unit 4: ASEAN and Viet Nam",
                          "partOfSpeech":  "verb/noun",
                          "phonetic":  "/ˌvɒl.ənˈtɪər/",
                          "synonyms":  "offer services, unpaid worker, humanitarian helper",
                          "note":  "Tính từ: \u0027voluntary\u0027 /ˈvɒl.ən.tri/ (tự nguyện)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "N/A",
                          "collocations":  "official motto, adopt a motto, live by a motto",
                          "example":  "\u0027One Vision, One Identity, One Community\u0027 is the official motto of ASEAN.",
                          "definition":  "Khẩu hiệu, phương châm hành động",
                          "term":  "motto",
                          "topic":  "Unit 4: ASEAN and Viet Nam",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˈmɒt.əʊ/",
                          "synonyms":  "slogan, maxim, watchword, guiding principle",
                          "note":  "Số nhiều: mottos hoặc mottoes."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "emission reduction, carbon absorption",
                          "collocations":  "cut greenhouse gas emissions, reduce emissions, major source of emissions",
                          "example":  "Governments have pledged to cut greenhouse gas emissions to achieve net-zero targets.",
                          "definition":  "Lượng khí thải nhà kính (CO2, Methane làm thủng tầng ozone và nóng lên toàn cầu)",
                          "term":  "greenhouse gas emission",
                          "topic":  "Unit 5: Global Warming",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˈɡriːn.haʊs ɡæs ɪˈmɪʃ.ən/",
                          "synonyms":  "carbon emission, atmospheric pollution",
                          "note":  "Động từ là \u0027emit\u0027 /iˈmɪt/ (phát thải, tỏa ra)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "beneficial, harmless, fortunate",
                          "collocations":  "catastrophic impact, catastrophic consequences, catastrophic flood",
                          "example":  "Unchecked global warming could have catastrophic consequences for low-lying delta regions.",
                          "definition":  "Thảm khốc, gây thảm họa tàn phá nặng nề",
                          "term":  "catastrophic",
                          "topic":  "Unit 5: Global Warming",
                          "partOfSpeech":  "adjective",
                          "phonetic":  "/ˌkæt.əˈstrɒf.ɪk/",
                          "synonyms":  "disastrous, devastating, calamitous, ruinous",
                          "note":  "Danh từ là \u0027catastrophe\u0027 /kəˈtæs.trə.fi/ (thảm họa). Trọng âm rơi vào /strɒf/."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "afforestation (trồng rừng mới), reforestation (tái trồng rừng)",
                          "collocations":  "combat deforestation, halt deforestation, rate of deforestation",
                          "example":  "Deforestation in the Amazon rainforest releases millions of tons of trapped carbon dioxide.",
                          "definition":  "Nạn phá rừng, sự tàn phá rừng quy mô lớn",
                          "term":  "deforestation",
                          "topic":  "Unit 5: Global Warming",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/diːˌfɒr.ɪˈsteɪ.ʃən/",
                          "synonyms":  "forest clearance, tree-felling, forest devastation",
                          "note":  "Tiền tố de- (hủy bỏ/làm giảm) + forest (rừng) + -ation (danh từ)."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "cold snap, freeze",
                          "collocations":  "severe heatwave, endure a heatwave, record-breaking heatwave",
                          "example":  "Prolonged heatwaves during summer months pose serious health risks to elderly citizens.",
                          "definition":  "Đợt nắng nóng gay gắt kéo dài bất thường",
                          "term":  "heatwave",
                          "topic":  "Unit 5: Global Warming",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˈhiːt.weɪv/",
                          "synonyms":  "prolonged hot spell, thermal wave",
                          "note":  "Viết liền một từ: heatwave (hoặc heat wave)."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "renewable energy, green energy, solar/wind power",
                          "collocations":  "burn fossil fuels, reliance on fossil fuels, phase out fossil fuels",
                          "example":  "Transitioning from fossil fuels to clean renewable energy is vital to halt climate change.",
                          "definition":  "Nhiên liệu hóa thạch (than đá, dầu mỏ, khí đốt tự nhiên hình thành từ xác sinh vật)",
                          "term":  "fossil fuel",
                          "topic":  "Unit 5: Global Warming",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˈfɒs.əl ˌfjuː.əl/",
                          "synonyms":  "conventional energy, non-renewable energy",
                          "note":  "Cụm từ \u0027phase out fossil fuels\u0027 = loại bỏ dần nhiên liệu hóa thạch."
                      },
                      {
                          "level":  "A2",
                          "antonyms":  "freeze, solidify",
                          "collocations":  "ice melts, glaciers melt, melting point, melting ice cap",
                          "example":  "Polar ice caps are melting at an alarming rate, causing global sea levels to rise.",
                          "definition":  "Tan chảy (băng tuyết, sông băng do nhiệt độ tăng)",
                          "term":  "melt",
                          "topic":  "Unit 5: Global Warming",
                          "partOfSpeech":  "verb",
                          "phonetic":  "/melt/",
                          "synonyms":  "thaw, dissolve, liquefy",
                          "note":  "Phân từ tính từ: \u0027molten\u0027 (nóng chảy: molten lava) hoặc \u0027melted\u0027 (melted butter)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "modern innovation",
                          "collocations":  "tangible cultural heritage, intangible cultural heritage, preserve cultural heritage",
                          "example":  "Hoi An Ancient Town is celebrated as a UNESCO World Cultural Heritage site.",
                          "definition":  "Di sản văn hóa (truyền thống, kiến trúc, nghệ thuật truyền lại qua các thế hệ)",
                          "term":  "cultural heritage",
                          "topic":  "Unit 6: Preserving Heritage",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˌkʌl.tʃər.əl ˈher.ɪ.tɪdʒ/",
                          "synonyms":  "cultural legacy, historical patrimony",
                          "note":  "Phân biệt: tangible heritage (di sản hữu thể/vật thể) \u0026 intangible heritage (phi vật thể)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "demolish, destroy, ruin",
                          "collocations":  "restore a monument, restore ancient paintings, restoration project",
                          "example":  "Artisans worked painstakingly for years to restore the ancient pagoda after the fire.",
                          "definition":  "Phục chế, trùng tu, khôi phục lại hiện trạng ban đầu của di tích",
                          "term":  "restore",
                          "topic":  "Unit 6: Preserving Heritage",
                          "partOfSpeech":  "verb",
                          "phonetic":  "/rɪˈstɔːr/",
                          "synonyms":  "renovate, rehabilitate, reconstruct, repair",
                          "note":  "Danh từ: \u0027restoration\u0027 /ˌres.tərˈeɪ.ʃən/ (công tác trùng tu, phục dựng)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "damaged, broken, ruined, ruined",
                          "collocations":  "remain intact, keep intact, leave something intact",
                          "example":  "Remarkably, the 500-year-old stone temple remained intact throughout the earthquake.",
                          "definition":  "Còn nguyên vẹn, không bị hư hại qua biến cố thời gian và chiến tranh",
                          "term":  "intact",
                          "topic":  "Unit 6: Preserving Heritage",
                          "partOfSpeech":  "adjective",
                          "phonetic":  "/ɪnˈtækt/",
                          "synonyms":  "undamaged, unbroken, whole, pristine, preserved",
                          "note":  "Trọng âm 2: in-TACT. Thường đi sau động từ nối: remain intact."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "N/A",
                          "collocations":  "historical monument, ancient monument, national monument",
                          "example":  "Hue Citadel contains numerous historical monuments, royal tombs, and palaces.",
                          "definition":  "Tượng đài, đài kỷ niệm, công trình kiến trúc lịch sử",
                          "term":  "monument",
                          "topic":  "Unit 6: Preserving Heritage",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˈmɒn.jə.mənt/",
                          "synonyms":  "memorial, historic landmark, shrine",
                          "note":  "Tính từ: \u0027monumental\u0027 /ˌmɒn.jəˈmen.təl/ (vĩ đại, to lớn)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "fake, imitation, counterfeit, artificial",
                          "collocations":  "authentic experience, authentic recipe, authentic artifact, prove authentic",
                          "example":  "Tourists flock to Bat Trang pottery village to purchase authentic handmade ceramics.",
                          "definition":  "Đích thực, nguyên bản, chuẩn xác theo truyền thống gốc",
                          "term":  "authentic",
                          "topic":  "Unit 6: Preserving Heritage",
                          "partOfSpeech":  "adjective",
                          "phonetic":  "/ɔːˈθen.tɪk/",
                          "synonyms":  "genuine, original, real, bona fide",
                          "note":  "Danh từ: \u0027authenticity\u0027 /ˌɔː.θenˈtɪs.ə.ti/ (tính chân thực, tính xác thực)."
                      },
                      {
                          "level":  "A2",
                          "antonyms":  "modern pop music",
                          "collocations":  "traditional folk music, folk music performance, folk music preservation",
                          "example":  "Quan Ho folk music was recognized by UNESCO as an Intangible Cultural Heritage of Humanity.",
                          "definition":  "Âm nhạc dân gian, làn điệu dân ca truyền thống (như Quan họ, Đờn ca tài tử)",
                          "term":  "folk music",
                          "topic":  "Unit 6: Preserving Heritage",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˈfəʊk ˌmjuː.zɪk/",
                          "synonyms":  "traditional music, ethnic songs",
                          "note":  "\u0027Folk\u0027 là danh từ/tính từ chỉ những nét văn hóa dân gian bắt nguồn từ nhân dân."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "purely academic education",
                          "collocations":  "attend vocational training, vocational training school, vocational qualification",
                          "example":  "Vocational training offers a direct route into skilled technical careers like automotive engineering.",
                          "definition":  "Đào tạo nghề, học nghề thực hành kỹ năng kỹ thuật",
                          "term":  "vocational training",
                          "topic":  "Unit 7: Education for Leavers",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/vəʊˈkeɪ.ʃən.əl ˈtreɪ.nɪŋ/",
                          "synonyms":  "career training, technical education, trade school",
                          "note":  "Gốc từ: \u0027vocation\u0027 (nghề nghiệp phù hợp thiên hướng cá nhân)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "full-time classroom study",
                          "collocations":  "complete an apprenticeship, serve an apprenticeship, degree apprenticeship",
                          "example":  "Doing an apprenticeship gives school-leavers practical on-the-job experience and certification.",
                          "definition":  "Chế độ vừa học việc vừa làm có lương tại các doanh nghiệp",
                          "term":  "apprenticeship",
                          "topic":  "Unit 7: Education for Leavers",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/əˈpren.tɪs.ʃɪp/",
                          "synonyms":  "traineeship, internship, on-the-job training",
                          "note":  "Người học việc là \u0027apprentice\u0027. Trọng âm 2: ap-PREN-tice-ship."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "secondary education, primary education",
                          "collocations":  "pursue higher education, higher education institution, higher education degree",
                          "example":  "Many high school seniors aspire to pursue higher education at prestigious universities.",
                          "definition":  "Giáo dục bậc cao (bậc đại học và sau đại học)",
                          "term":  "higher education",
                          "topic":  "Unit 7: Education for Leavers",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˌhaɪ.ər edʒ.uˈkeɪ.ʃən/",
                          "synonyms":  "tertiary education, university education",
                          "note":  "Tertiary education là thuật ngữ học thuật đồng nghĩa của higher education."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "master\u0027s degree (thạc sĩ), doctorate (tiến sĩ)",
                          "collocations":  "earn a bachelor\u0027s degree, bachelor\u0027s degree in economics, hold a bachelor\u0027s degree",
                          "example":  "Holding a bachelor\u0027s degree in computer science opens up numerous lucrative job opportunities.",
                          "definition":  "Bằng cử nhân đại học (hoàn thành chương trình 3-4 năm)",
                          "term":  "bachelor\u0027s degree",
                          "topic":  "Unit 7: Education for Leavers",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˈbætʃ.əl.əz dɪˌɡriː/",
                          "synonyms":  "undergraduate degree, BA / BSc",
                          "note":  "BA: Bachelor of Arts (Cử nhân KH Xã hội), BSc: Bachelor of Science (Cử nhân KH Tự nhiên)."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "scholarship, grant, financial aid",
                          "collocations":  "pay tuition fees, affordable tuition fees, exempt from tuition fees",
                          "example":  "Scholarships assist talented students in covering expensive university tuition fees.",
                          "definition":  "Học phí (khoản tiền phải trả cho việc học tại trường)",
                          "term":  "tuition fee",
                          "topic":  "Unit 7: Education for Leavers",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/tjuːˈɪʃ.ən fiː/",
                          "synonyms":  "tuition costs, school fees",
                          "note":  "Thường dùng ở dạng số nhiều: \u0027tuition fees\u0027."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "incompetence, lack of credentials",
                          "collocations":  "gain qualifications, formal qualifications, professional qualification",
                          "example":  "Employers value candidates who possess strong practical skills alongside academic qualifications.",
                          "definition":  "Bằng cấp, chứng chỉ, trình độ chuyên môn đạt chuẩn",
                          "term":  "qualification",
                          "topic":  "Unit 7: Education for Leavers",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˌkwɒl.ɪ.fɪˈkeɪ.ʃən/",
                          "synonyms":  "credential, certificate, degree, diploma",
                          "note":  "Động từ là \u0027qualify\u0027 (qualify for a job = đủ điều kiện làm việc)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "dependent, reliant, helpless",
                          "collocations":  "become self-reliant, self-reliant person, cultivate self-reliant habits",
                          "example":  "Living away from home in a dormitory teaches college students to become self-reliant.",
                          "definition":  "Tự lực cánh sinh, tự dựa vào sức mình mà không phụ thuộc người khác",
                          "term":  "self-reliant",
                          "topic":  "Unit 8: Becoming Independent",
                          "partOfSpeech":  "adjective",
                          "phonetic":  "/ˌself.rɪˈlaɪ.ənt/",
                          "synonyms":  "independent, autonomous, self-sufficient",
                          "note":  "Danh từ: \u0027self-reliance\u0027 (sự tự lực, lòng tự chủ)."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "procrastination, time-wasting",
                          "collocations":  "time management skills, poor time management, effective time management",
                          "example":  "Mastering time management skills helps students balance exam revision and personal relaxation.",
                          "definition":  "Kỹ năng quản lý thời gian hiệu quả",
                          "term":  "time management",
                          "topic":  "Unit 8: Becoming Independent",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˈtaɪm ˌmæn.ɪdʒ.mənt/",
                          "synonyms":  "scheduling efficiency, task prioritization",
                          "note":  "Kỹ năng mềm hàng đầu được rèn luyện trong Unit 8."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "give up, collapse under pressure, surrender",
                          "collocations":  "cope with stress, cope with difficulties, ability to cope with change",
                          "example":  "Counselors guide teenagers on how to cope with academic stress and peer pressure.",
                          "definition":  "Đối phó, đương đầu và xử lý thành công áp lực hoặc khó khăn",
                          "term":  "cope with",
                          "topic":  "Unit 8: Becoming Independent",
                          "partOfSpeech":  "phrasal verb",
                          "phonetic":  "/kəʊp wɪð/",
                          "synonyms":  "deal with, manage, tackle, handle",
                          "note":  "Không dùng \u0027cope up with\u0027 (đây là lỗi ngữ pháp rất phổ biến của học sinh!). Luôn là \u0027cope with\u0027."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "social awkwardness",
                          "collocations":  "develop interpersonal skills, excellent interpersonal skills, interpersonal communication",
                          "example":  "Strong interpersonal skills enable leaders to build trustworthy relationships with team members.",
                          "definition":  "Kỹ năng giao tiếp và ứng xử giữa người với người",
                          "term":  "interpersonal skills",
                          "topic":  "Unit 8: Becoming Independent",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˌɪn.təˈpɜː.sən.əl skɪlz/",
                          "synonyms":  "social skills, people skills, communication skills",
                          "note":  "Tiền tố inter- (giữa) + personal (cá nhân). Luôn dùng ở số nhiều."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "demotivated, passive, lazy",
                          "collocations":  "self-motivated student, highly self-motivated, self-motivated worker",
                          "example":  "Self-motivated learners often achieve higher academic results through independent research.",
                          "definition":  "Tự có động lực, chủ động làm việc mà không cần ai thúc giục",
                          "term":  "self-motivated",
                          "topic":  "Unit 8: Becoming Independent",
                          "partOfSpeech":  "adjective",
                          "phonetic":  "/ˌselfˈməʊ.tɪ.veɪ.tɪd/",
                          "synonyms":  "driven, ambitious, proactive, self-starting",
                          "note":  "Danh từ: \u0027self-motivation\u0027 (động lực nội tại)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "indecision, hesitation",
                          "collocations":  "decision-making process, decision-making skills, rational decision-making",
                          "example":  "Critical thinking is the foundation of sound, rational decision-making.",
                          "definition":  "Kỹ năng ra quyết định / Quá trình đưa ra quyết định",
                          "term":  "decision-making",
                          "topic":  "Unit 8: Becoming Independent",
                          "partOfSpeech":  "noun/adjective",
                          "phonetic":  "/dɪˈsɪʒ.ənˌmeɪ.kɪŋ/",
                          "synonyms":  "judgment, resolution, determination",
                          "note":  "Động từ là \u0027make a decision\u0027 (đưa ra quyết định)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "online support, digital empathy",
                          "collocations":  "victim of cyberbullying, combat cyberbullying, stop cyberbullying",
                          "example":  "Schools must run awareness campaigns to educate students on preventing cyberbullying.",
                          "definition":  "Bắt nạt qua mạng (hành vi xúc phạm, đe dọa người khác trên môi trường Internet)",
                          "term":  "cyberbullying",
                          "topic":  "Unit 9: Social Issues",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˈsaɪ.bəˌbʊl.i.ɪŋ/",
                          "synonyms":  "online harassment, digital bullying, cyber harassment",
                          "note":  "Kẻ bắt nạt qua mạng là \u0027cyberbully\u0027. Động từ: \u0027cyberbully\u0027."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "independent judgment, individuality",
                          "collocations":  "succumb to peer pressure, resist peer pressure, negative peer pressure",
                          "example":  "Teenagers may pick up bad habits like smoking due to intense peer pressure.",
                          "definition":  "Áp lực đồng trang lứa (áp lực phải làm theo bạn bè cùng tuổi để hòa nhập)",
                          "term":  "peer pressure",
                          "topic":  "Unit 9: Social Issues",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˈpɪə ˌpreʃ.ər/",
                          "synonyms":  "social pressure, classmate influence",
                          "note":  "Động từ hay đi cùng: \u0027succumb to\u0027 (nhượng bộ) hoặc \u0027resist\u0027 (chống lại) peer pressure."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "wealth, affluence, prosperity, richness",
                          "collocations":  "eradicate poverty, live in poverty, poverty line, trap of poverty",
                          "example":  "Education is the most powerful sustainable weapon to break the cycle of poverty.",
                          "definition":  "Sự nghèo đói, tình trạng thiếu thốn điều kiện sống tối thiểu",
                          "term":  "poverty",
                          "topic":  "Unit 9: Social Issues",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˈpɒv.ə.ti/",
                          "synonyms":  "deprivation, destitution, indigence, hardship",
                          "note":  "Tính từ: \u0027poor\u0027. Thành ngữ: \u0027live below the poverty line\u0027 (sống dưới mức nghèo khổ)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "family harmony, peaceful home",
                          "collocations":  "suffer from domestic violence, prevent domestic violence, domestic violence hotline",
                          "example":  "Victims of domestic violence need immediate shelter and psychological counseling.",
                          "definition":  "Bạo lực gia đình (hành vi bạo hành thể xác hoặc tinh thần giữa các thành viên)",
                          "term":  "domestic violence",
                          "topic":  "Unit 9: Social Issues",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/dəˌmes.tɪk ˈvaɪə.ləns/",
                          "synonyms":  "family abuse, spousal abuse, domestic abuse",
                          "note":  "Domestic (thuộc gia đình/nội địa) + violence (bạo lực)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "body positivity, self-acceptance",
                          "collocations":  "stop body shaming, target of body shaming, fight against body shaming",
                          "example":  "Body shaming on social networks causes severe anxiety and low self-esteem in young girls.",
                          "definition":  "Miệt thị ngoại hình (hành vi chê bai, chế giễu vóc dáng của người khác)",
                          "term":  "body shaming",
                          "topic":  "Unit 9: Social Issues",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˈbɒd.i ˌʃeɪ.mɪŋ/",
                          "synonyms":  "appearance mocking, physical criticism",
                          "note":  "Thuật ngữ xã hội học rất thịnh hành trong các đề thi nói/viết hiện nay."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "ignore, conceal information",
                          "collocations":  "raise public awareness, raise awareness of social issues, campaign to raise awareness",
                          "example":  "Youth organizations launched a campaign to raise public awareness about mental health.",
                          "definition":  "Nâng cao nhận thức của cộng đồng về một vấn đề quan trọng",
                          "term":  "raise awareness",
                          "topic":  "Unit 9: Social Issues",
                          "partOfSpeech":  "verb phrase",
                          "phonetic":  "/reɪz əˈweə.nəs/",
                          "synonyms":  "heighten consciousness, spread awareness, educate the public",
                          "note":  "Cấu trúc: raise awareness of / about something."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "monoculture, biological uniformity",
                          "collocations":  "preserve biodiversity, threat to biodiversity, rich biodiversity, loss of biodiversity",
                          "example":  "Tropical rainforests harbor more than half of the world\u0027s plant and animal biodiversity.",
                          "definition":  "Đa dạng sinh học (sự phong phú và đa dạng của các dạng sống trong một hệ sinh thái)",
                          "term":  "biodiversity",
                          "topic":  "Unit 10: The Ecosystem",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˌbaɪ.əʊ.daɪˈvɜː.sə.ti/",
                          "synonyms":  "biological diversity, ecological variety",
                          "note":  "Trọng âm 4: bi-o-di-VER-si-ty."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "N/A",
                          "collocations":  "top of the food chain, disrupt the food chain, link in the food chain",
                          "example":  "Apex predators like tigers and eagles play a pivotal role at the top of the food chain.",
                          "definition":  "Chuỗi thức ăn (trật tự dinh dưỡng giữa các sinh vật trong tự nhiên)",
                          "term":  "food chain",
                          "topic":  "Unit 10: The Ecosystem",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˈfuːd ˌtʃeɪn/",
                          "synonyms":  "food web, ecological pyramid, trophic chain",
                          "note":  "Mở rộng: \u0027food web\u0027 (lưới thức ăn gồm nhiều chuỗi thức ăn đan xen)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "habitat restoration, habitat conservation",
                          "collocations":  "suffer habitat loss, cause habitat loss, lead to habitat loss",
                          "example":  "Agricultural expansion and illegal logging are primary causes of severe habitat loss.",
                          "definition":  "Mất môi trường sống tự nhiên của muông thú do con người tác động",
                          "term":  "habitat loss",
                          "topic":  "Unit 10: The Ecosystem",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˈhæb.ɪ.tæt lɒs/",
                          "synonyms":  "habitat destruction, habitat degradation",
                          "note":  "Habitat = môi trường sống tự nhiên của động/thực vật."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "poacher, exploiter",
                          "collocations":  "dedicated conservationist, team of conservationists, wildlife conservationist",
                          "example":  "Conservationists are working around the clock to establish marine protected zones for coral.",
                          "definition":  "Nhà bảo tồn thiên nhiên, người hoạt động bảo vệ môi trường và động vật",
                          "term":  "conservationist",
                          "topic":  "Unit 10: The Ecosystem",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˌkɒn.səˈveɪ.ʃən.ɪst/",
                          "synonyms":  "environmentalist, wildlife protector, ecologist",
                          "note":  "Phân biệt: conservation (sự bảo tồn), conserve (bảo tồn), conservationist (nhà bảo tồn)."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "alive, extant, thriving, surviving",
                          "collocations":  "become extinct, go extinct, on the brink of extinction, functionally extinct",
                          "example":  "The Javan rhinoceros in Cat Tien National Park was officially declared extinct in 2010.",
                          "definition":  "Tuyệt chủng (loài sinh vật đã chết hết và không còn tồn tại trên Trái Đất)",
                          "term":  "extinct",
                          "topic":  "Unit 10: The Ecosystem",
                          "partOfSpeech":  "adjective",
                          "phonetic":  "/ɪkˈstɪŋkt/",
                          "synonyms":  "died out, wiped out, non-existent",
                          "note":  "Danh từ: \u0027extinction\u0027 (sự tuyệt chủng). Cụm: \u0027threatened with extinction\u0027."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "common species, abundant animals",
                          "collocations":  "protect endangered species, list of endangered species, critically endangered species",
                          "example":  "The World Wildlife Fund works relentlessly to safeguard critically endangered species worldwide.",
                          "definition":  "Loài có nguy cơ tuyệt chủng (sinh vật nằm trong Sách Đỏ cần bảo vệ khẩn cấp)",
                          "term":  "endangered species",
                          "topic":  "Unit 10: The Ecosystem",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ɪnˌdeɪn.dʒəd ˈspiː.ʃiːz/",
                          "synonyms":  "threatened species, species at risk",
                          "note":  "Từ \u0027species\u0027 giữ nguyên hình thức ở cả số ít và số nhiều (one species, many species)."
                      }
                  ]
    },
    {
        "id":  "lib_deck_12",
        "color":  "#ec4899",
        "category":  "THPT",
        "description":  "Bộ 60 từ vựng phân hóa cao Unit 1 - Unit 10 trọng tâm ôn thi tốt nghiệp THPT và ĐGNL.",
        "icon":  "📕",
        "totalWords":  60,
        "grade":  12,
        "title":  "Tiếng Anh Lớp 12 Trọng Tâm (Ôn Thi THPT Quốc Gia)",
        "words":  [
                      {
                          "level":  "B2",
                          "antonyms":  "giving up, surrender, apathy",
                          "collocations":  "show perseverance, through sheer perseverance, perseverance in the face of obstacles",
                          "example":  "Through extraordinary perseverance and dedication, Marie Curie made historic breakthroughs in radioactivity.",
                          "definition":  "Sự kiên trì, bền bỉ vượt qua muôn vàn gian nan thử thách",
                          "term":  "perseverance",
                          "topic":  "Unit 1: Life Stories",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˌpɜː.sɪˈvɪə.rəns/",
                          "synonyms":  "persistence, tenacity, endurance, determination",
                          "note":  "Động từ là \u0027persevere\u0027 /ˌpɜː.sɪˈvɪər/ (persevere in/with something)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "unknown, obscure, ordinary, undistinguished",
                          "collocations":  "distinguished career, distinguished scholar, distinguished guest, highly distinguished",
                          "example":  "General Vo Nguyen Giap was a distinguished military strategist admired across the globe.",
                          "definition":  "Kiệt xuất, lỗi lạc, được kính trọng bởi sự nghiệp vĩ đại",
                          "term":  "distinguished",
                          "topic":  "Unit 1: Life Stories",
                          "partOfSpeech":  "adjective",
                          "phonetic":  "/dɪˈstɪŋ.ɡwɪʃt/",
                          "synonyms":  "eminent, illustrious, celebrated, renowned",
                          "note":  "Phân biệt: \u0027distinguished\u0027 (lỗi lạc) và \u0027distinguishable\u0027 (có thể phân biệt được)."
                      },
                      {
                          "level":  "C1",
                          "antonyms":  "miser, misanthrope",
                          "collocations":  "generous philanthropist, billionaire philanthropist, noted philanthropist",
                          "example":  "The tech billionaire became a full-time philanthropist dedicated to eradicating infectious diseases.",
                          "definition":  "Nhà từ thiện, người giàu lòng nhân ái hiến tặng tài sản giúp đời",
                          "term":  "philanthropist",
                          "topic":  "Unit 1: Life Stories",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/fɪˈlæn.θrə.pɪst/",
                          "synonyms":  "benefactor, humanitarian, patron, donor",
                          "note":  "Danh từ trừu tượng: \u0027philanthropy\u0027 (hoạt động nhân đạo từ thiện). Trọng âm 2."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "N/A",
                          "collocations":  "leave a legacy, enduring legacy, lasting legacy, rich legacy",
                          "example":  "President Ho Chi Minh left an enduring legacy of patriotism and moral integrity for the nation.",
                          "definition":  "Di sản tinh thần hoặc vật chất để lại cho thế hệ sau",
                          "term":  "legacy",
                          "topic":  "Unit 1: Life Stories",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˈleɡ.ə.si/",
                          "synonyms":  "heritage, bequest, inheritance, endowment",
                          "note":  "Số nhiều: legacies. Thành ngữ: \u0027legacy of something\u0027."
                      },
                      {
                          "level":  "C1",
                          "antonyms":  "succumb to hardship, yield to despair",
                          "collocations":  "courage to overcome adversity, overcome severe adversity, resilience in adversity",
                          "example":  "Nick Vujicic inspired millions by demonstrating how courage helps individuals overcome adversity.",
                          "definition":  "Vượt qua nghịch cảnh, chiến thắng những hoàn cảnh ngặt nghèo nhất",
                          "term":  "overcome adversity",
                          "topic":  "Unit 1: Life Stories",
                          "partOfSpeech":  "verb phrase",
                          "phonetic":  "/ˌəʊ.vəˈkʌm ədˈvɜː.sə.ti/",
                          "synonyms":  "triumph over hardship, conquer difficulties",
                          "note":  "\u0027Adversity\u0027 (nghịch cảnh) khác với \u0027adversary\u0027 (kẻ thù/đối thủ)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "disreputable, obscure, insignificant",
                          "collocations":  "prestigious award, prestigious university, prestigious scholarship",
                          "example":  "Professor Ngo Bao Chau was awarded the prestigious Fields Medal in mathematics in 2010.",
                          "definition":  "Danh giá, có uy tín và thanh thế lẫy lừng",
                          "term":  "prestigious",
                          "topic":  "Unit 1: Life Stories",
                          "partOfSpeech":  "adjective",
                          "phonetic":  "/presˈtɪdʒ.əs/",
                          "synonyms":  "reputable, esteemed, distinguished, high-status",
                          "note":  "Danh từ là \u0027prestige\u0027 /presˈtiːʒ/ (uy tín, thanh thế). Trọng âm 2."
                      },
                      {
                          "level":  "C1",
                          "antonyms":  "cultural preservation, cultural segregation",
                          "collocations":  "force cultural assimilation, process of cultural assimilation, rapid assimilation",
                          "example":  "Immigrants often experience pressure toward cultural assimilation while trying to maintain their mother tongue.",
                          "definition":  "Sự đồng hóa văn hóa (quá trình tiếp thu hoàn toàn văn hóa của cộng đồng đa số)",
                          "term":  "cultural assimilation",
                          "topic":  "Unit 2: A Multicultural World",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˌkʌl.tʃər.əl əˌsɪm.ɪˈleɪ.ʃən/",
                          "synonyms":  "cultural absorption, cultural integration",
                          "note":  "Động từ: \u0027assimilate into\u0027 (đồng hóa, hòa nhập vào)."
                      },
                      {
                          "level":  "C1",
                          "antonyms":  "cultural alienation, ethnocentrism",
                          "collocations":  "process of acculturation, levels of acculturation, cross-cultural acculturation",
                          "example":  "Acculturation allows individuals to adopt values from a new host society while preserving native traditions.",
                          "definition":  "Sự tiếp biến văn hóa (sự biến đổi văn hóa khi hai nền văn hóa tiếp xúc lâu dài)",
                          "term":  "acculturation",
                          "topic":  "Unit 2: A Multicultural World",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/əˌkʌl.tʃəˈreɪ.ʃən/",
                          "synonyms":  "cultural adaptation, intercultural exchange",
                          "note":  "Thuật ngữ nhân học văn hóa nâng cao xuất hiện trong các bài đọc hiểu chuyên sâu."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "cultural homogenization",
                          "collocations":  "preserve cultural identity, retain cultural identity, shape cultural identity, loss of identity",
                          "example":  "Traditional festivals and the national costume Ao Dai play an essential role in safeguarding our cultural identity.",
                          "definition":  "Bản sắc văn hóa (những nét đặc trưng định hình nên một dân tộc/cộng đồng)",
                          "term":  "cultural identity",
                          "topic":  "Unit 2: A Multicultural World",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˌkʌl.tʃər.əl aɪˈden.tə.ti/",
                          "synonyms":  "cultural distinctiveness, national identity",
                          "note":  "Động từ: \u0027identify with\u0027 (đồng nhất, nhận diện với)."
                      },
                      {
                          "level":  "C1",
                          "antonyms":  "monocultural society, homogeneous community",
                          "collocations":  "cultural melting pot, dynamic melting pot, urban melting pot",
                          "example":  "New York City is often referred to as a vibrant melting pot of global cultures and cuisines.",
                          "definition":  "Nồi lẩu văn hóa (nơi giao thoa và hòa trộn nhiều sắc tộc, nền văn hóa khác nhau)",
                          "term":  "melting pot",
                          "topic":  "Unit 2: A Multicultural World",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˈmel.tɪŋ ˌpɒt/",
                          "synonyms":  "cultural mosaic, multicultural society, cosmopolitan center",
                          "note":  "Phân biệt với mô hình \u0027salad bowl\u0027 (các nền văn hóa cùng tồn tại nhưng giữ nguyên bản sắc riêng)."
                      },
                      {
                          "level":  "C1",
                          "antonyms":  "cultural relativism, cosmopolitanism, open-mindedness",
                          "collocations":  "overcome ethnocentrism, danger of ethnocentrism, ethnocentric attitude",
                          "example":  "Education must combat ethnocentrism by teaching empathy and cross-cultural appreciation.",
                          "definition":  "Chủ nghĩa vị chủng (thái độ cho rằng văn hóa dân tộc mình là ưu việt hơn tất cả)",
                          "term":  "ethnocentrism",
                          "topic":  "Unit 2: A Multicultural World",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˌeθ.nəʊˈsen.trɪ.zəm/",
                          "synonyms":  "cultural superiority, cultural chauvinism, xenophobia",
                          "note":  "Tính từ: \u0027ethnocentric\u0027 /ˌeθ.nəʊˈsen.trɪk/."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "uniformity, monotony, homogeneity",
                          "collocations":  "cultural diversity, ethnic diversity, embrace diversity, promote diversity",
                          "example":  "Modern corporations celebrate workforce diversity as a key catalyst for innovation.",
                          "definition":  "Sự đa dạng phong phú về văn hóa, chủng tộc hoặc quan điểm",
                          "term":  "diversity",
                          "topic":  "Unit 2: A Multicultural World",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/daɪˈvɜː.sə.ti/",
                          "synonyms":  "variety, heterogeneity, multiplicity, richness",
                          "note":  "Tính từ: \u0027diverse\u0027 /daɪˈvɜːs/. Động từ: \u0027diversify\u0027 (đa dạng hóa)."
                      },
                      {
                          "level":  "C1",
                          "antonyms":  "linear economy, take-make-dispose model",
                          "collocations":  "adopt a circular economy, circular economy framework, principles of circular economy",
                          "example":  "Transitioning to a circular economy helps businesses reuse raw materials and eliminate toxic waste.",
                          "definition":  "Kinh tế tuần hoàn (mô hình kinh tế tái sinh, giảm thiểu tối đa rác thải bằng tái chế)",
                          "term":  "circular economy",
                          "topic":  "Unit 3: Green Living",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˌsɜː.kjə.lər iˈkɒn.ə.mi/",
                          "synonyms":  "closed-loop economy, regenerative economic model",
                          "note":  "Mô hình tương phản với \u0027linear economy\u0027 (kinh tế tuyến tính)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "carbon-intensive, high-emission",
                          "collocations":  "carbon neutral pledge, achieve carbon neutrality, carbon neutral lifestyle",
                          "example":  "Vietnam has committed to achieving net-zero emissions and becoming carbon neutral by 2050.",
                          "definition":  "Trung hòa carbon (đạt mức cân bằng giữa lượng phát thải và lượng hấp thụ CO2)",
                          "term":  "carbon neutral",
                          "topic":  "Unit 3: Green Living",
                          "partOfSpeech":  "adjective",
                          "phonetic":  "/ˌkɑː.bən ˈnjuː.trəl/",
                          "synonyms":  "net-zero, climate neutral, zero-carbon",
                          "note":  "Danh từ: \u0027carbon neutrality\u0027 /ˌkɑː.bən njuːˈtræl.ə.ti/."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "reusable containers, biodegradable packaging",
                          "collocations":  "ban single-use plastic, phase out single-use plastic, reliance on single-use plastic",
                          "example":  "Many urban cafes have completely banned single-use plastic straws and cutlery.",
                          "definition":  "Nhựa dùng một lần (vật dụng nhựa sử dụng một lần rồi vứt bỏ gây hại môi trường)",
                          "term":  "single-use plastic",
                          "topic":  "Unit 3: Green Living",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˌsɪŋ.ɡəl juːs ˈplæs.tɪk/",
                          "synonyms":  "disposable plastic, throwaway plastic",
                          "note":  "Tính từ ghép \u0027single-use\u0027 = disposable."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "replenish, restore, regenerate, renew",
                          "collocations":  "deplete natural resources, deplete the ozone layer, severely deplete",
                          "example":  "Overexploitation of underground water sources will rapidly deplete natural freshwater reserves.",
                          "definition":  "Làm cạn kiệt, làm suy giảm nghiêm trọng nguồn tài nguyên",
                          "term":  "deplete",
                          "topic":  "Unit 3: Green Living",
                          "partOfSpeech":  "verb",
                          "phonetic":  "/dɪˈpliːt/",
                          "synonyms":  "exhaust, drain, consume, use up",
                          "note":  "Danh từ: \u0027depletion\u0027 (resource depletion = sự cạn kiệt tài nguyên)."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "fossil fuels, exhaustible energy",
                          "collocations":  "source of renewable energy, harness renewable energy, switch to renewable energy",
                          "example":  "Investing in renewable energy infrastructure creates green jobs and stabilizes power grids.",
                          "definition":  "Năng lượng tái tạo (năng lượng vô tận từ gió, mặt trời, địa nhiệt)",
                          "term":  "renewable energy",
                          "topic":  "Unit 3: Green Living",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/rɪˈnjuː.ə.bəl ˈen.ə.dʒi/",
                          "synonyms":  "green energy, sustainable power, clean energy",
                          "note":  "Tính từ \u0027renewable\u0027 bắt nguồn từ re- (lại) + new (mới) + -able (có thể)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "unsustainability, ecocide",
                          "collocations":  "environmental sustainability, long-term sustainability, achieve sustainability",
                          "example":  "Environmental sustainability must be integrated into every stage of urban architectural design.",
                          "definition":  "Tính bền vững, khả năng duy trì lâu dài mà không phá hủy hệ sinh thái",
                          "term":  "sustainability",
                          "topic":  "Unit 3: Green Living",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/səˌsteɪ.nəˈbɪl.ə.ti/",
                          "synonyms":  "viability, eco-friendly maintenance, ecological balance",
                          "note":  "Trọng âm 4: sus-tain-a-BIL-i-ty. Tính từ: sustainable."
                      },
                      {
                          "level":  "C1",
                          "antonyms":  "compact city, controlled urban growth",
                          "collocations":  "combat urban sprawl, consequences of urban sprawl, rapid urban sprawl",
                          "example":  "Unchecked urban sprawl consumes fertile agricultural lands and exacerbates traffic gridlock.",
                          "definition":  "Sự mở rộng đô thị tự phát, tràn lan thiếu quy hoạch ra vùng ven",
                          "term":  "urban sprawl",
                          "topic":  "Unit 4: Urbanisation",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˌɜː.bən ˈsprɔːl/",
                          "synonyms":  "uncontrolled suburbanization, metropolitan spread",
                          "note":  "\u0027Sprawl\u0027 (noun/verb) chỉ sự lan rộng, ngổn ngang không kiểm soát."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "counter-urbanization, urban-to-rural migration",
                          "collocations":  "wave of rural-to-urban migration, drivers of rural-to-urban migration, handle migration",
                          "example":  "Massive rural-to-urban migration puts severe pressure on housing, healthcare, and electricity in megacities.",
                          "definition":  "Sự di cư từ nông thôn ra thành thị tìm kiếm cơ hội sinh kế",
                          "term":  "rural-to-urban migration",
                          "topic":  "Unit 4: Urbanisation",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˌrʊə.rəl tu ˈɜː.bən maɪˈɡreɪ.ʃən/",
                          "synonyms":  "urban drift, rural exodus, urbanization flow",
                          "note":  "Người di cư là \u0027migrant\u0027 /ˈmaɪ.ɡrənt/. Động từ: \u0027migrate\u0027."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "adequate infrastructure capacity",
                          "collocations":  "lead to infrastructure overload, suffer from infrastructure overload, ease overload",
                          "example":  "Rapid population boom in metropolitan areas frequently results in acute infrastructure overload.",
                          "definition":  "Sự quá tải cơ sở hạ tầng (cầu đường, trường học, bệnh viện quá tải người dùng)",
                          "term":  "infrastructure overload",
                          "topic":  "Unit 4: Urbanisation",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˈɪn.frəˌstrʌk.tʃər ˌəʊ.vəˈləʊd/",
                          "synonyms":  "infrastructure strain, municipal congestion",
                          "note":  "Overload vừa là danh từ vừa là động từ (làm quá tải)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "upscale neighborhood, affluent residential area",
                          "collocations":  "slum clearance, slum dweller, live in a slum, urban slum",
                          "example":  "City municipal programs aim to upgrade slum areas by constructing affordable social housing.",
                          "definition":  "Khu nhà ổ chuột, khu ổ chuột lụp xụp thiếu thốn điều kiện vệ sinh",
                          "term":  "slum",
                          "topic":  "Unit 4: Urbanisation",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/slʌm/",
                          "synonyms":  "shantytown, ghetto, squatter settlement",
                          "note":  "Cụm từ: \u0027slum dwellers\u0027 (cư dân sinh sống tại các khu ổ chuột)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "insanitation, pollution, filth",
                          "collocations":  "improve sanitation, basic sanitation facilities, access to clean sanitation",
                          "example":  "Poor sanitation in densely populated quarters increases the risk of waterborne disease outbreaks.",
                          "definition":  "Hệ thống vệ sinh môi trường công cộng và xử lý nước thải",
                          "term":  "sanitation",
                          "topic":  "Unit 4: Urbanisation",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˌsæn.ɪˈteɪ.ʃən/",
                          "synonyms":  "public hygiene, sewage disposal, clean water facilities",
                          "note":  "Tính từ: \u0027sanitary\u0027 /ˈsæn.ɪ.tri/ (hợp vệ sinh). Trái nghĩa: unsanitary."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "sparse, thinly populated, scattered",
                          "collocations":  "densely populated, dense forest, dense traffic, dense smog",
                          "example":  "Hanoi and Ho Chi Minh City feature some of the most dense urban population centers in Southeast Asia.",
                          "definition":  "Dày đặc, đông đúc (mật độ dân số cao)",
                          "term":  "dense",
                          "topic":  "Unit 4: Urbanisation",
                          "partOfSpeech":  "adjective",
                          "phonetic":  "/dens/",
                          "synonyms":  "crowded, congested, packed, highly concentrated",
                          "note":  "Trạng từ: \u0027densely\u0027. Danh từ: \u0027density\u0027 (population density = mật độ dân số)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "rigidity, inflexibility, obstinacy",
                          "collocations":  "show high adaptability, demonstrate adaptability, career adaptability",
                          "example":  "In an ever-evolving digital job market, adaptability is considered the most critical professional skill.",
                          "definition":  "Khả năng thích ứng linh hoạt trước những thay đổi nhanh chóng của thị trường",
                          "term":  "adaptability",
                          "topic":  "Unit 5: The World of Work",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/əˌdæp.təˈbɪl.ə.ti/",
                          "synonyms":  "flexibility, resilience, versatility, agility",
                          "note":  "Động từ: \u0027adapt to\u0027 (thích nghi với). Tính từ: adaptable."
                      },
                      {
                          "level":  "C1",
                          "antonyms":  "traditional permanent employment, nine-to-five job",
                          "collocations":  "rise of the gig economy, gig economy workers, participate in the gig economy",
                          "example":  "The gig economy enables millions of freelance workers to choose flexible working hours via digital apps.",
                          "definition":  "Nền kinh tế việc làm tự do (nền kinh tế dựa trên các công việc thời vụ, tự do ngắn hạn)",
                          "term":  "gig economy",
                          "topic":  "Unit 5: The World of Work",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˈɡɪɡ ɪˌkɒn.ə.mi/",
                          "synonyms":  "freelance economy, on-demand labor market",
                          "note":  "\u0027Gig\u0027 ban đầu là buổi diễn ca nhạc, nay mang nghĩa công việc hợp đồng ngắn hạn."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "job insecurity, precarity, risk of layoff",
                          "collocations":  "high job security, lack of job security, seek job security, guarantee job security",
                          "example":  "Many graduates prioritize civil service careers because they offer high job security and solid pensions.",
                          "definition":  "Sự bảo đảm việc làm, tính ổn định không lo bị sa thải",
                          "term":  "job security",
                          "topic":  "Unit 5: The World of Work",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˈdʒɒb sɪˌkjʊə.rə.ti/",
                          "synonyms":  "employment stability, career certainty",
                          "note":  "Trái nghĩa: \u0027job insecurity\u0027 (sự bấp bênh trong công việc)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "stagnate, deskill",
                          "collocations":  "upskill the workforce, upskill employees, opportunities to upskill",
                          "example":  "Employees must continuously upskill in data analysis and AI tools to remain competitive.",
                          "definition":  "Nâng cao tay nghề, học thêm các kỹ năng mới cao cấp hơn",
                          "term":  "upskill",
                          "topic":  "Unit 5: The World of Work",
                          "partOfSpeech":  "verb",
                          "phonetic":  "/ˌʌpˈskɪl/",
                          "synonyms":  "enhance skills, reskill, upgrade qualifications, retrain",
                          "note":  "Đi kèm cặp với \u0027reskill\u0027 (đào tạo lại kỹ năng để chuyển đổi nghề)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "on-site work, office-based work",
                          "collocations":  "embrace telecommuting, telecommuting arrangement, telecommuting policy",
                          "example":  "Telecommuting reduces daily commuting stress and enables a healthier work-life balance for parents.",
                          "definition":  "Làm việc từ xa (làm việc tại nhà qua máy tính kết nối Internet)",
                          "term":  "telecommuting",
                          "topic":  "Unit 5: The World of Work",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˌtel.ɪ.kəˈmjuː.tɪŋ/",
                          "synonyms":  "remote work, working from home (WFH), telework",
                          "note":  "Người làm việc từ xa là \u0027telecommuter\u0027."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "sloth, unreliability, unprofessionalism",
                          "collocations":  "strong work ethic, admirable work ethic, instill a work ethic",
                          "example":  "Recruiters praise Vietnamese engineers for their exceptional work ethic and rapid learning capability.",
                          "definition":  "Đạo đức nghề nghiệp, thái độ làm việc chăm chỉ, kỷ luật và trách nhiệm",
                          "term":  "work ethic",
                          "topic":  "Unit 5: The World of Work",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˈwɜːk ˌeθ.ɪk/",
                          "synonyms":  "professional diligence, conscientious attitude",
                          "note":  "Dùng tính từ: \u0027strong work ethic\u0027 (tinh thần trách nhiệm cao độ trong công việc)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "N/A",
                          "collocations":  "search algorithm, complex algorithm, machine learning algorithm, design an algorithm",
                          "example":  "Social media platforms utilize sophisticated algorithms to recommend personalized video content.",
                          "definition":  "Thuật toán (tập hợp các quy tắc tính toán logic để xử lý dữ liệu và giải quyết bài toán)",
                          "term":  "algorithm",
                          "topic":  "Unit 6: Artificial Intelligence",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˈæl.ɡə.rɪ.ðəm/",
                          "synonyms":  "computational rule, mathematical procedure, coded formula",
                          "note":  "Trọng âm 1: AL-go-rithm. Tính từ: algorithmic."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "manual labor, handcrafting",
                          "collocations":  "industrial automation, workplace automation, process automation",
                          "example":  "Factory automation has dramatically boosted manufacturing productivity while reducing workplace hazards.",
                          "definition":  "Sự tự động hóa (ứng dụng máy móc và robot thay thế thao tác thủ công của con người)",
                          "term":  "automation",
                          "topic":  "Unit 6: Artificial Intelligence",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˌɔː.təˈmeɪ.ʃən/",
                          "synonyms":  "mechanization, computerized operation, robotic control",
                          "note":  "Động từ: \u0027automate\u0027. Tính từ: \u0027automated\u0027 (automated system)."
                      },
                      {
                          "level":  "C1",
                          "antonyms":  "N/A",
                          "collocations":  "machine learning model, apply machine learning, machine learning techniques",
                          "example":  "Machine learning algorithms can detect early stages of cancerous tumors on X-ray scans with high accuracy.",
                          "definition":  "Học máy (phân ngành của AI cho phép máy tính tự học hỏi và cải thiện từ dữ liệu)",
                          "term":  "machine learning",
                          "topic":  "Unit 6: Artificial Intelligence",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/məˈʃiːn ˌlɜː.nɪŋ/",
                          "synonyms":  "deep learning, computational intelligence, neural networks",
                          "note":  "Viết tắt là ML. Nhánh con của AI."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "ethical consensus, moral certainty",
                          "collocations":  "raise ethical concerns, address ethical concerns, spark ethical concerns",
                          "example":  "The use of autonomous weapons and facial recognition raises profound ethical concerns worldwide.",
                          "definition":  "Mối lo ngại về mặt đạo đức, chuẩn mực luân lý trong ứng dụng công nghệ",
                          "term":  "ethical concern",
                          "topic":  "Unit 6: Artificial Intelligence",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˈeθ.ɪ.kəl kənˌsɜːn/",
                          "synonyms":  "moral dilemma, ethical issue, moral implication",
                          "note":  "Tính từ: \u0027ethical\u0027 (thuộc về đạo đức) \u003e\u003c \u0027unethical\u0027 (vô đạo đức/phi đạo đức)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "human-driven vehicle",
                          "collocations":  "test autonomous vehicles, safety of autonomous vehicles, fleet of autonomous vehicles",
                          "example":  "Autonomous vehicles are anticipated to minimize traffic accidents caused by human errors.",
                          "definition":  "Xe tự hành (phương tiện giao thông tự lái hoàn toàn bằng AI và cảm biến)",
                          "term":  "autonomous vehicle",
                          "topic":  "Unit 6: Artificial Intelligence",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ɔːˈtɒn.ə.məs ˈvɪə.kəl/",
                          "synonyms":  "self-driving car, driverless vehicle, robotic car",
                          "note":  "\u0027Autonomous\u0027 mang nghĩa tự chủ, tự hành. \u0027Vehicle\u0027 phát âm là /ˈvɪə.kəl/ hoặc /ˈviː.ə.kəl/."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "data breach, privacy invasion",
                          "collocations":  "protect data privacy, violate data privacy, data privacy laws",
                          "example":  "Stringent data privacy regulations prevent technology giants from trading personal information without consent.",
                          "definition":  "Quyền riêng tư dữ liệu cá nhân trên không gian mạng số",
                          "term":  "data privacy",
                          "topic":  "Unit 6: Artificial Intelligence",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˈdeɪ.tə ˈprɪv.ə.si/",
                          "synonyms":  "information privacy, digital privacy, data confidentiality",
                          "note":  "Cụm từ liên quan: \u0027data breach\u0027 (rò rỉ dữ liệu), \u0027data leak\u0027."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "fact, accurate information, verified truth",
                          "collocations":  "spread misinformation, combat misinformation, rampant misinformation",
                          "example":  "Users should verify news sources carefully to avoid spreading medical misinformation online.",
                          "definition":  "Thông tin sai lệch (thông tin không đúng sự thật do sơ suất hoặc lan truyền sai)",
                          "term":  "misinformation",
                          "topic":  "Unit 7: World of Mass Media",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˌmɪs.ɪn.fəˈmeɪ.ʃən/",
                          "synonyms":  "fake news, false info, inaccurate reporting",
                          "note":  "Phân biệt: \u0027misinformation\u0027 (tin sai vô ý) \u0026 \u0027disinformation\u0027 (tin giả cố tình bịa đặt để lừa đảo)."
                      },
                      {
                          "level":  "C1",
                          "antonyms":  "media gullibility, digital illiteracy",
                          "collocations":  "improve media literacy, media literacy curriculum, lack of media literacy",
                          "example":  "Teaching media literacy in high schools empowers students to distinguish credible news from clickbait.",
                          "definition":  "Năng lực hiểu biết truyền thông (kỹ năng tiếp nhận, phân tích và đánh giá phản biện tin tức)",
                          "term":  "media literacy",
                          "topic":  "Unit 7: World of Mass Media",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˈmiː.di.ə ˈlɪt.ər.ə.si/",
                          "synonyms":  "critical media awareness, digital information literacy",
                          "note":  "\u0027Literacy\u0027 là khả năng đọc viết / năng lực hiểu biết một lĩnh vực."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "free press, uncensored media, freedom of speech",
                          "collocations":  "strict censorship, impose censorship, evade censorship, media censorship",
                          "example":  "Online platforms face heated debates over the boundaries between content censorship and free expression.",
                          "definition":  "Sự kiểm duyệt (hành động thẩm định và cắt bỏ nội dung nhạy cảm, độc hại trong xuất bản/truyền thông)",
                          "term":  "censorship",
                          "topic":  "Unit 7: World of Mass Media",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˈsen.sə.ʃɪp/",
                          "synonyms":  "editorial control, information filtering, suppression",
                          "note":  "Động từ: \u0027censor\u0027 (kiểm duyệt). Người kiểm duyệt: \u0027censor\u0027."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "accurate headline, factual reporting",
                          "collocations":  "clickbait headline, clickbait article, falling for clickbait",
                          "example":  "Many unscrupulous websites rely on deceptive clickbait headlines to generate online advertising revenue.",
                          "definition":  "Mồi câu nhấp chuột (tiêu đề giật gân, phóng đại nhằm lôi kéo người dùng bấm vào xem)",
                          "term":  "clickbait",
                          "topic":  "Unit 7: World of Mass Media",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˈklɪk.beɪt/",
                          "synonyms":  "sensational headline, lure, trap link",
                          "note":  "Ghép từ \u0027click\u0027 (nhấp chuột) + \u0027bait\u0027 (mồi câu)."
                      },
                      {
                          "level":  "C1",
                          "antonyms":  "objective journalism, factual accuracy",
                          "collocations":  "media sensationalism, resort to sensationalism, accused of sensationalism",
                          "example":  "Serious journalists criticize tabloids for prioritizing cheap sensationalism over journalistic integrity.",
                          "definition":  "Khuynh hướng giật gân (thủ pháp thổi phồng scandal, bạo lực để câu khách trên báo chí)",
                          "term":  "sensationalism",
                          "topic":  "Unit 7: World of Mass Media",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/senˈseɪ.ʃən.əl.ɪ.zəm/",
                          "synonyms":  "yellow journalism, melodrama, exaggeration",
                          "note":  "Tính từ: \u0027sensational\u0027 (giật gân, gây chấn động)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "unreliable source, questionable rumor, dubious blog",
                          "collocations":  "cite credible sources, verify a credible source, reliable and credible source",
                          "example":  "Students must cite credible sources from peer-reviewed journals when writing research papers.",
                          "definition":  "Nguồn thông tin đáng tin cậy, có căn cứ khoa học hoặc chứng thực rõ ràng",
                          "term":  "credible source",
                          "topic":  "Unit 7: World of Mass Media",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˈkred.ə.bəl sɔːs/",
                          "synonyms":  "reliable source, trustworthy authority, verified reference",
                          "note":  "Danh từ: \u0027credibility\u0027 (sự uy tín, độ tin cậy)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "wildlife protection, legal hunting",
                          "collocations":  "anti-poaching patrol, combat poaching, rampant poaching, victims of poaching",
                          "example":  "Rangers in national parks risk their lives daily on anti-poaching patrols to save wild rhinos.",
                          "definition":  "Nạn săn bắt trộm động vật quý hiếm trái phép",
                          "term":  "poaching",
                          "topic":  "Unit 8: Wildlife Conservation",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˈpəʊ.tʃɪŋ/",
                          "synonyms":  "illegal hunting, wildlife trafficking, illicit game capture",
                          "note":  "Kẻ săn trộm là \u0027poacher\u0027. Động từ: \u0027poach\u0027."
                      },
                      {
                          "level":  "C1",
                          "antonyms":  "habitat connectivity, ecological corridor",
                          "collocations":  "cause habitat fragmentation, reduce habitat fragmentation, threat of fragmentation",
                          "example":  "Highway construction across virgin forests causes severe habitat fragmentation, isolating animal herds.",
                          "definition":  "Sự phân mảnh sinh cảnh (môi trường sống bị chia cắt thành từng mảnh nhỏ do đường sá, đô thị)",
                          "term":  "habitat fragmentation",
                          "topic":  "Unit 8: Wildlife Conservation",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˈhæb.ɪ.tæt ˌfræɡ.menˈteɪ.ʃən/",
                          "synonyms":  "habitat division, ecological fracturing",
                          "note":  "Động từ: \u0027fragment\u0027 (phân mảnh). Danh từ: \u0027fragment\u0027 (mảnh vỡ)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "abundant, thriving, least concern",
                          "collocations":  "critically endangered species, critically endangered animal, red list status",
                          "example":  "The Delacour\u0027s langur in Van Long Wetland Nature Reserve is listed as critically endangered.",
                          "definition":  "Cực kỳ nguy cấp, đứng trước bờ vực tuyệt chủng cao nhất trong tự nhiên",
                          "term":  "critically endangered",
                          "topic":  "Unit 8: Wildlife Conservation",
                          "partOfSpeech":  "adjective phrase",
                          "phonetic":  "/ˈkrɪt.ɪ.kəl.i ɪnˈdeɪn.dʒəd/",
                          "synonyms":  "on the verge of extinction, severely threatened, facing extinction",
                          "note":  "Cấp độ bảo tồn cao nhất của IUCN trước khi bị tuyên bố tuyệt chủng (Extinct in the Wild)."
                      },
                      {
                          "level":  "C1",
                          "antonyms":  "ecological desert, degraded wasteland",
                          "collocations":  "global biodiversity hotspot, designate a biodiversity hotspot, preserve hotspots",
                          "example":  "The Annamite Range in Vietnam is recognized globally as a vital biodiversity hotspot harboring unique endemic species.",
                          "definition":  "Điểm nóng đa dạng sinh học (vùng địa lý có độ đa dạng loài cực cao nhưng đang bị đe dọa nghiêm trọng)",
                          "term":  "biodiversity hotspot",
                          "topic":  "Unit 8: Wildlife Conservation",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˌbaɪ.əʊ.daɪˈvɜː.sə.ti ˈhɒt.spɒt/",
                          "synonyms":  "ecological treasure trove, vital bio-region",
                          "note":  "Thế giới có khoảng 36 điểm nóng đa dạng sinh học trọng điểm."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "in the wild, free-roaming, natural habitat",
                          "collocations":  "breed in captivity, held in captivity, born in captivity",
                          "example":  "Breeding giant pandas in captivity has succeeded in pulling the iconic species back from extinction.",
                          "definition":  "Trong môi trường nuôi nhốt (trong vườn thú, trung tâm cứu hộ bảo tồn)",
                          "term":  "in captivity",
                          "topic":  "Unit 8: Wildlife Conservation",
                          "partOfSpeech":  "prepositional phrase",
                          "phonetic":  "/ɪn kæpˈtɪv.ə.ti/",
                          "synonyms":  "in confinement, caged, zoo-bred",
                          "note":  "Trái nghĩa với \u0027in the wild\u0027 (ngoài tự nhiên)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "capture, remove, eradicate",
                          "collocations":  "reintroduce into the wild, reintroduce native species, reintroduction program",
                          "example":  "Scientists successfully reintroduced rescued pangolins back into protected national parks.",
                          "definition":  "Tái thả, đưa một loài động thực vật trở lại sinh sống trong môi trường tự nhiên bản địa",
                          "term":  "reintroduce",
                          "topic":  "Unit 8: Wildlife Conservation",
                          "partOfSpeech":  "verb",
                          "phonetic":  "/ˌriː.ɪn.trəˈdjuːs/",
                          "synonyms":  "release back, restore, re-establish",
                          "note":  "Danh từ: \u0027reintroduction\u0027 (reintroduction program = chương trình tái thả động vật)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "N/A",
                          "collocations":  "submit a curriculum vitae, polish your CV, tailor your curriculum vitae",
                          "example":  "Ensure your curriculum vitae is professionally formatted and highlights relevant internship experience.",
                          "definition":  "Sơ yếu lý lịch nghề nghiệp, hồ sơ năng lực cá nhân xin việc (viết tắt CV)",
                          "term":  "curriculum vitae",
                          "topic":  "Unit 9: Career Paths",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/kəˌrɪk.jə.ləm ˈviː.taɪ/",
                          "synonyms":  "CV, resume, professional portfolio",
                          "note":  "Gốc Latin: \u0027dòng chảy cuộc đời\u0027. Tiếng Anh-Mỹ thường dùng từ \u0027resume\u0027 /ˈrez.juː.meɪ/."
                      },
                      {
                          "level":  "C1",
                          "antonyms":  "permanent tenure, regular employment",
                          "collocations":  "pass the probationary period, serve a probationary period, 3-month probation",
                          "example":  "New recruits must pass a rigorous two-month probationary period before receiving full company benefits.",
                          "definition":  "Thời gian thử việc (thời gian làm thử để đánh giá năng lực trước khi ký hợp đồng chính thức)",
                          "term":  "probationary period",
                          "topic":  "Unit 9: Career Paths",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/prəˈbeɪ.ʃən.ər.i ˌpɪə.ri.əd/",
                          "synonyms":  "trial period, probation phase, evaluation stage",
                          "note":  "\u0027Probation\u0027 là thời gian thử việc hoặc quản chế."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "niche technical skills, job-specific skills",
                          "collocations":  "develop transferable skills, acquire transferable skills, possess transferable skills",
                          "example":  "Leadership, teamwork, and critical problem-solving are valuable transferable skills sought by all employers.",
                          "definition":  "Kỹ năng chuyển giao (kỹ năng mềm như giao tiếp, đàm phán, giải quyết vấn đề áp dụng được cho mọi ngành nghề)",
                          "term":  "transferable skills",
                          "topic":  "Unit 9: Career Paths",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/trænsˈfɜː.rə.bəl skɪlz/",
                          "synonyms":  "portable skills, universal competencies, soft skills",
                          "note":  "Tính từ: \u0027transferable\u0027 (có thể chuyển giao/mang theo được)."
                      },
                      {
                          "level":  "C1",
                          "antonyms":  "unprofitable, low-paying, poorly rewarded",
                          "collocations":  "lucrative career, lucrative business contract, lucrative market",
                          "example":  "Artificial intelligence engineering is currently one of the most lucrative careers in the technology sector.",
                          "definition":  "Béo bở, sinh lợi cao, mang lại thu nhập lớn",
                          "term":  "lucrative",
                          "topic":  "Unit 9: Career Paths",
                          "partOfSpeech":  "adjective",
                          "phonetic":  "/ˈluː.krə.tɪv/",
                          "synonyms":  "profitable, highly-paying, remunerative, rewarding",
                          "note":  "Trọng âm 1: LU-cra-tive. Từ vựng ăn điểm cao trong bài thi Viết."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "career stagnation, dead-end job",
                          "collocations":  "opportunities for career progression, rapid career progression, career progression ladder",
                          "example":  "Ambitious young professionals look for companies that offer clear opportunities for career progression.",
                          "definition":  "Sự thăng tiến trong sự nghiệp, lộ trình phát triển vị trí nghề nghiệp",
                          "term":  "career progression",
                          "topic":  "Unit 9: Career Paths",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/kəˈrɪər prəˌɡreʃ.ən/",
                          "synonyms":  "career advancement, professional promotion, upward mobility",
                          "note":  "Đồng nghĩa với \u0027career advancement\u0027."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "N/A",
                          "collocations":  "seek vocational guidance, vocational guidance counselor, effective vocational guidance",
                          "example":  "High schools should provide professional vocational guidance to help Grade 12 students make informed university choices.",
                          "definition":  "Hướng nghiệp (sự tư vấn định hướng ngành nghề phù hợp năng lực học sinh)",
                          "term":  "vocational guidance",
                          "topic":  "Unit 9: Career Paths",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/vəʊˈkeɪ.ʃən.əl ˈɡaɪ.dəns/",
                          "synonyms":  "career counseling, occupational advising",
                          "note":  "Vocation (nghề nghiệp) + guidance (sự chỉ dẫn)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "intellectual stagnation",
                          "collocations":  "commit to lifelong learning, lifelong learning mindset, cultivate lifelong learning",
                          "example":  "In an era of relentless technological disruption, lifelong learning is the key to maintaining professional relevance.",
                          "definition":  "Học tập suốt đời (tinh thần liên tục trau dồi tri thức và hoàn thiện bản thân trong suốt cuộc đời)",
                          "term":  "lifelong learning",
                          "topic":  "Unit 10: Lifelong Learning",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˌlaɪf.lɒŋ ˈlɜː.nɪŋ/",
                          "synonyms":  "continuous education, ongoing self-development, perpetual learning",
                          "note":  "Chủ đề đinh của Unit 10 lớp 12, thường xuyên ra trong đề thi Đọc hiểu và Viết luận."
                      },
                      {
                          "level":  "C1",
                          "antonyms":  "passive learner, spoon-fed student",
                          "collocations":  "become an autonomous learner, foster autonomous learners, autonomous learning habits",
                          "example":  "Successful university students are autonomous learners who proactively seek knowledge beyond lectures.",
                          "definition":  "Người học tự chủ (người có khả năng tự đặt mục tiêu, tìm tài liệu và tự đánh giá kết quả học tập)",
                          "term":  "autonomous learner",
                          "topic":  "Unit 10: Lifelong Learning",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ɔːˈtɒn.ə.məs ˈlɜː.nər/",
                          "synonyms":  "independent learner, self-directed student",
                          "note":  "Danh từ: \u0027learner autonomy\u0027 (tính tự chủ trong học tập)."
                      },
                      {
                          "level":  "B1",
                          "antonyms":  "in-person education, on-campus study",
                          "collocations":  "enroll in distance learning, distance learning degree, distance learning platform",
                          "example":  "Distance learning courses enable working adults to obtain accredited master\u0027s degrees flexibly.",
                          "definition":  "Đào tạo từ xa (hình thức học qua mạng mà không cần đến trường trực tiếp)",
                          "term":  "distance learning",
                          "topic":  "Unit 10: Lifelong Learning",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˌdɪs.təns ˈlɜː.nɪŋ/",
                          "synonyms":  "e-learning, online education, remote study",
                          "note":  "Rất phổ biến trong thời kỳ chuyển đổi số giáo dục."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "narrow one\u0027s mind, limit perspective",
                          "collocations":  "broaden one\u0027s horizons, broaden intellectual horizons, travel to broaden horizons",
                          "example":  "Studying abroad and mastering foreign languages significantly broaden students\u0027 cultural horizons.",
                          "definition":  "Mở rộng tầm mắt, mở mang chân trời tri thức và thế giới quan",
                          "term":  "broaden horizons",
                          "topic":  "Unit 10: Lifelong Learning",
                          "partOfSpeech":  "verb phrase",
                          "phonetic":  "/ˈbrɔː.dən həˈraɪ.zənz/",
                          "synonyms":  "expand worldview, widen perspective, enrich knowledge",
                          "note":  "Thành ngữ rất phổ biến trong đề thi học sinh giỏi và thi tốt nghiệp THPT."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "indiscipline, self-indulgence, procrastination",
                          "collocations":  "exercise self-discipline, lack self-discipline, strict self-discipline",
                          "example":  "Online learning requires strong self-discipline to avoid distractions and submit assignments on time.",
                          "definition":  "Tính kỷ luật tự giác, năng lực tự kiểm soát hành vi và kiên định theo đuổi mục tiêu",
                          "term":  "self-discipline",
                          "topic":  "Unit 10: Lifelong Learning",
                          "partOfSpeech":  "noun",
                          "phonetic":  "/ˌselfˈdɪs.ə.plɪn/",
                          "synonyms":  "self-control, willpower, self-restraint, determination",
                          "note":  "Tính từ: \u0027self-disciplined\u0027 (có tính kỷ luật tự giác cao)."
                      },
                      {
                          "level":  "B2",
                          "antonyms":  "blind acceptance, irrational belief",
                          "collocations":  "develop critical thinking, critical thinking skills, foster critical thinking",
                          "example":  "Higher education places a heavy emphasis on developing students\u0027 critical thinking and analytical reasoning.",
                          "definition":  "Tư duy phản biện (năng lực phân tích, đánh giá thông tin một cách khách quan và logic)",
                          "term":  "critical thinking",
                          "topic":  "Unit 10: Lifelong Learning",
                          "partOfSpeech":  "noun phrase",
                          "phonetic":  "/ˌkrɪt.ɪ.kəl ˈθɪŋ.kɪŋ/",
                          "synonyms":  "analytical thinking, rational inquiry, objective reasoning",
                          "note":  "Kỹ năng thế kỷ 21 hàng đầu dành cho học sinh chuẩn bị vào đại học."
                      }
                  ]
    }
]
;
    let cloudLibraryDecks = [];
    let currentLibraryCategory = 'all';
    let currentPreviewDeck = null;
    let pendingPublisherDeck = null;

    function openLibraryModal() {
      currentLibraryCategory = 'all';
      const searchInput = document.getElementById('library-search-input');
      if (searchInput) searchInput.value = '';
      updateLibraryTabsUI();
      renderLibraryDecks();
      openModal('modal-library');
      fetchCloudLibraryDecks();
    }

    function setLibraryCategory(cat) {
      currentLibraryCategory = cat;
      updateLibraryTabsUI();
      renderLibraryDecks();
    }

    function updateLibraryTabsUI() {
      document.querySelectorAll('#lib-category-tabs .lib-filter-btn').forEach(btn => {
        const cat = btn.getAttribute('data-cat');
        if (cat === currentLibraryCategory) {
          btn.className = 'btn btn-sm btn-primary lib-filter-btn active';
        } else {
          btn.className = 'btn btn-sm btn-outline lib-filter-btn';
        }
      });
    }

    async function fetchCloudLibraryDecks() {
      const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
      try {
        const res = await fetch(`${rtdbUrl}/publicLibraryDecks.json`);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object') {
            cloudLibraryDecks = Object.values(data).filter(d => d && d.title && Array.isArray(d.words));
            renderLibraryDecks();
          }
        }
      } catch (err) {
        console.warn('Cloud library fetch notice:', err);
      }
    }

    function getAllLibraryDecks() {
      const map = new Map();
      BUILTIN_LIBRARY_DECKS.forEach(d => map.set(d.id, d));
      cloudLibraryDecks.forEach(d => {
        if (d && d.id) map.set(d.id, d);
      });
      return Array.from(map.values());
    }

    function renderLibraryDecks() {
      const container = document.getElementById('library-deck-list');
      const countAllEl = document.getElementById('lib-count-all');
      if (!container) return;

      const allDecks = getAllLibraryDecks();
      if (countAllEl) countAllEl.textContent = allDecks.length;

      const query = (document.getElementById('library-search-input')?.value || '').toLowerCase().trim();

      let filtered = allDecks.filter(deck => {
        // Category Filter
        if (currentLibraryCategory === '10' && deck.grade !== 10 && !deck.title.includes('Lớp 10') && !deck.title.includes('10')) return false;
        if (currentLibraryCategory === '11' && deck.grade !== 11 && !deck.title.includes('Lớp 11') && !deck.title.includes('11')) return false;
        if (currentLibraryCategory === '12' && deck.grade !== 12 && !deck.title.includes('Lớp 12') && !deck.title.includes('12')) return false;
        if (currentLibraryCategory === 'cloud' && !deck.id.startsWith('pub_')) return false;

        // Search Filter
        if (query) {
          const matchTitle = deck.title.toLowerCase().includes(query);
          const matchDesc = (deck.description || '').toLowerCase().includes(query);
          const matchAuthor = (deck.author || '').toLowerCase().includes(query);
          const matchWords = Array.isArray(deck.words) && deck.words.some(w => (w.term || '').toLowerCase().includes(query) || (w.definition || '').toLowerCase().includes(query));
          return matchTitle || matchDesc || matchAuthor || matchWords;
        }
        return true;
      });

      if (filtered.length === 0) {
        container.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 40px 10px; color: var(--text-muted);">
            <div style="font-size: 32px; margin-bottom: 8px;">🔍</div>
            <div style="font-size: 14px; font-weight: 600;">Không tìm thấy bộ từ nào phù hợp</div>
            <div style="font-size: 12px; margin-top: 4px;">Hãy thử tìm kiếm với từ khóa khác hoặc bấm nút làm mới.</div>
          </div>
        `;
        return;
      }

      let html = '';
      filtered.forEach(deck => {
        const isImported = decks.some(d => d.title === deck.title || d.libSourceId === deck.id);
        const wordCount = Array.isArray(deck.words) ? deck.words.length : 0;
        const color = deck.color || '#4f46e5';
        const icon = deck.icon || '📘';
        const authorName = deck.author || (deck.id.startsWith('lib_deck_') ? 'VocaFlow Chuẩn' : 'Cộng đồng');

        html += `
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 16px 16px 14px; display: flex; flex-direction: column; justify-content: space-between; min-height: 220px; position: relative; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.18);">
            <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: ${color};"></div>
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
                <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0;">
                  <span style="font-size: 22px; flex-shrink: 0;">${icon}</span>
                  <h4 style="margin: 0; font-size: 14.5px; font-weight: 700; color: var(--text); line-height: 1.3;">${escapeHtml(deck.title)}</h4>
                </div>
                <span class="badge" style="background: rgba(255,255,255,0.08); font-size: 11px; font-weight: 700; flex-shrink: 0;">${wordCount} từ</span>
              </div>
              <p style="font-size: 12px; color: var(--text-muted); margin: 0 0 8px 0; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${escapeHtml(deck.description || 'Bộ từ vựng trọng tâm chuẩn GDPT')}
              </p>
              <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 8px;">
                <span class="badge" style="background: rgba(99,102,241,0.15); color: #a5b4fc; font-size: 10.5px;">${deck.category || 'THPT'}</span>
                ${deck.grade ? `<span class="badge" style="background: rgba(16,185,129,0.15); color: #34d399; font-size: 10.5px;">Khối ${deck.grade}</span>` : ''}
              </div>
              <div style="font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
                <span>👤</span> <span>Đóng góp:</span> <strong style="color: var(--text);">${escapeHtml(authorName)}</strong>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1.25fr; gap: 8px; margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.06);">
              <button class="btn btn-outline btn-sm" style="height: 38px; display: inline-flex; align-items: center; justify-content: center; gap: 4px; font-size: 12px; font-weight: 600; background: rgba(255,255,255,0.05); color: var(--text); border: 1px solid var(--border);" onclick="previewLibraryDeck('${deck.id}')">
                👁️ Xem trước
              </button>
              <button class="btn ${isImported ? 'btn-outline' : 'btn-primary'} btn-sm" style="height: 38px; display: inline-flex; align-items: center; justify-content: center; gap: 4px; font-size: 12px; font-weight: 700; ${isImported ? 'background: rgba(99,102,241,0.15); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.3);' : 'background: linear-gradient(135deg, #4f46e5, #7c3aed); border: none; color: white;'}" onclick="installLibraryDeck('${deck.id}')">
                📥 ${isImported ? 'Tải thêm' : 'Tải về học'}
              </button>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    }

    function previewLibraryDeck(deckId) {
      const allDecks = getAllLibraryDecks();
      const deck = allDecks.find(d => d.id === deckId);
      if (!deck) return;
      currentPreviewDeck = deck;

      const authorName = deck.author || (deck.id.startsWith('lib_deck_') ? 'VocaFlow Official' : 'Cộng đồng');

      document.getElementById('lib-preview-icon').textContent = deck.icon || '📘';
      document.getElementById('lib-preview-title').textContent = deck.title;
      document.getElementById('lib-preview-desc').textContent = deck.description || '';
      document.getElementById('lib-preview-count').textContent = `${(deck.words || []).length} từ vựng`;
      document.getElementById('lib-preview-category').textContent = `${deck.category || 'THPT'} • Đóng góp: ${authorName}`;

      const wordsList = document.getElementById('lib-preview-words-container');
      if (wordsList) {
        let html = '';
        (deck.words || []).forEach((w, idx) => {
          html += `
            <div style="background: var(--surface-elevated); padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border);">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">
                <div>
                  <strong style="color: #38bdf8; font-size: 13px;">${idx + 1}. ${escapeHtml(w.term)}</strong>
                  ${w.phonetic ? `<span style="font-size: 11px; color: var(--text-muted); margin-left: 6px;">${escapeHtml(w.phonetic)}</span>` : ''}
                </div>
                <div style="display: flex; gap: 4px;">
                  ${w.partOfSpeech ? `<span class="badge" style="font-size: 9.5px; padding: 1px 5px; background: rgba(99,102,241,0.2); color: #a5b4fc;">${escapeHtml(w.partOfSpeech)}</span>` : ''}
                  ${w.level ? `<span class="badge badge-level-${w.level.toLowerCase()}" style="font-size: 9.5px; padding: 1px 5px;">${w.level}</span>` : ''}
                </div>
              </div>
              <div style="font-size: 12px; color: var(--text); margin-bottom: 2px;">${escapeHtml(w.definition || w.definitionVi || '')}</div>
              ${w.example ? `<div style="font-size: 11px; color: var(--text-muted); font-style: italic;">VD: "${escapeHtml(w.example)}"</div>` : ''}
              ${w.topic ? `<div style="font-size: 10px; color: #a855f7; margin-top: 2px;">📌 ${escapeHtml(w.topic)}</div>` : ''}
            </div>
          `;
        });
        wordsList.innerHTML = html;
      }

      openModal('modal-library-preview');
    }

    function installPreviewedDeck() {
      if (currentPreviewDeck) {
        closeModal('modal-library-preview');
        installLibraryDeck(currentPreviewDeck.id);
      }
    }

    function installLibraryDeck(deckId) {
      const allDecks = getAllLibraryDecks();
      const deck = allDecks.find(d => d.id === deckId);
      if (!deck) return;

      const existing = decks.find(d => d.title === deck.title);
      if (existing) {
        if (!confirm(`Bạn đã có bộ từ "${deck.title}" trong danh sách. Bạn có muốn tạo thêm một bản sao mới của bộ từ này không?`)) {
          return;
        }
      }

      const newDeckId = 'deck_' + Date.now();
      const newDeck = {
        id: newDeckId,
        title: deck.title,
        description: deck.description || 'Bộ từ chuẩn từ Thư Viện VocaFlow',
        color: deck.color || '#4f46e5',
        isPinned: false,
        isArchived: false,
        libSourceId: deck.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const newWords = (deck.words || []).map((w, idx) => ({
        id: 'w_' + Date.now() + '_' + idx,
        deckId: newDeckId,
        term: w.term,
        definitionVi: w.definition || w.definitionVi || '',
        definition: w.definition || w.definitionVi || '',
        phonetic: w.phonetic || '',
        partOfSpeech: w.partOfSpeech || '',
        exampleSentence: w.example || w.exampleSentence || '',
        example: w.example || w.exampleSentence || '',
        cefrLevel: w.level || w.cefrLevel || 'B1',
        level: w.level || w.cefrLevel || 'B1',
        synonyms: Array.isArray(w.synonyms) ? w.synonyms : (w.synonyms ? w.synonyms.split(',').map(s=>s.trim()) : []),
        antonyms: Array.isArray(w.antonyms) ? w.antonyms : (w.antonyms ? w.antonyms.split(',').map(s=>s.trim()) : []),
        collocations: Array.isArray(w.collocations) ? w.collocations : (w.collocations ? w.collocations.split(',').map(s=>s.trim()) : []),
        note: w.note || '',
        topic: w.topic || '',
        status: 'newWord',
        masteryScore: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      decks.unshift(newDeck);
      words.push(...newWords);
      saveDatabase(true);
      renderDecks();
      closeModal('modal-library');

      showToast(`🎉 Đã thêm thành công bộ từ "${deck.title}" (+${newWords.length} từ vựng) vào máy của bạn!`);
      openDeckDetail(newDeckId);
    }

    // =========================================================================
    // COMMUNITY DECK CONTRIBUTION ENGINE (DÀNH CHO TẤT CẢ MỌI NGƯỜI)
    // =========================================================================
    let currentUploadSource = 'file';

    function openCommunityDeckUploadModal(prefillDeckId = null) {
      pendingPublisherDeck = null;
      const fileInput = document.getElementById('pub-upload-file-input');
      const statusEl = document.getElementById('pub-upload-preview-status');
      const authorInput = document.getElementById('pub-deck-author');
      const titleInput = document.getElementById('pub-deck-title');
      const descInput = document.getElementById('pub-deck-desc');
      const localDeckSelect = document.getElementById('pub-local-deck-select');

      if (fileInput) fileInput.value = '';
      if (statusEl) statusEl.style.display = 'none';

      // Set author name
      if (authorInput) {
        authorInput.value = (currentUser && currentUser.displayName && currentUser.displayName !== 'Khách') ? currentUser.displayName : (authorInput.value || 'Thành viên VocaFlow');
      }

      // Populate local decks select
      if (localDeckSelect) {
        let optsHtml = '<option value="">-- Chọn 1 bộ từ của bạn --</option>';
        decks.forEach(d => {
          const count = words.filter(w => w.deckId === d.id).length;
          optsHtml += `<option value="${d.id}">${escapeHtml(d.title)} (${count} từ)</option>`;
        });
        localDeckSelect.innerHTML = optsHtml;
      }

      if (prefillDeckId) {
        setPublisherUploadSource('deck');
        if (localDeckSelect) localDeckSelect.value = prefillDeckId;
        handlePublisherLocalDeckSelected(prefillDeckId);
      } else {
        setPublisherUploadSource('file');
        if (titleInput) titleInput.value = '';
        if (descInput) descInput.value = '';
      }

      openModal('modal-community-upload');
    }

    // Legacy alias
    function openPublisherDeckUploadModal() {
      openCommunityDeckUploadModal();
    }

    function shareCurrentDeckToLibrary() {
      if (currentDeckId) {
        openCommunityDeckUploadModal(currentDeckId);
      }
    }

    function setPublisherUploadSource(source) {
      currentUploadSource = source;
      const fileSection = document.getElementById('pub-source-file-section');
      const deckSection = document.getElementById('pub-source-deck-section');
      const btnFile = document.getElementById('btn-pub-source-file');
      const btnDeck = document.getElementById('btn-pub-source-deck');

      if (source === 'file') {
        if (fileSection) fileSection.style.display = 'block';
        if (deckSection) deckSection.style.display = 'none';
        if (btnFile) { btnFile.className = 'btn btn-sm btn-primary'; }
        if (btnDeck) { btnDeck.className = 'btn btn-sm btn-outline'; }
      } else {
        if (fileSection) fileSection.style.display = 'none';
        if (deckSection) deckSection.style.display = 'block';
        if (btnFile) { btnFile.className = 'btn btn-sm btn-outline'; }
        if (btnDeck) { btnDeck.className = 'btn btn-sm btn-primary'; }
      }
    }

    function handlePublisherLocalDeckSelected(deckId) {
      if (!deckId) return;
      const deck = decks.find(d => d.id === deckId);
      if (!deck) return;

      const deckWords = words.filter(w => w.deckId === deckId);
      if (deckWords.length === 0) {
        alert('Bộ từ này hiện chưa có từ vựng nào để chia sẻ!');
        return;
      }

      const titleInput = document.getElementById('pub-deck-title');
      const descInput = document.getElementById('pub-deck-desc');
      const statusEl = document.getElementById('pub-upload-preview-status');

      if (titleInput) titleInput.value = deck.title;
      if (descInput) descInput.value = deck.description || `Bộ từ vựng chia sẻ bởi ${document.getElementById('pub-deck-author')?.value || 'Thành viên VocaFlow'}`;

      pendingPublisherDeck = {
        title: deck.title,
        description: deck.description || '',
        words: deckWords.map(w => ({
          term: w.term,
          definition: w.definitionVi || w.definition || '',
          partOfSpeech: w.partOfSpeech || '',
          phonetic: w.phonetic || '',
          example: w.exampleSentence || w.example || '',
          topic: w.topic || '',
          level: w.cefrLevel || w.level || 'B1'
        }))
      };

      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.textContent = `✅ Đã sẵn sàng phát hành "${deck.title}" với ${deckWords.length} từ vựng!`;
      }
    }

    function handlePublisherFileSelected(e) {
      const file = e.target.files[0];
      if (!file) return;

      const statusEl = document.getElementById('pub-upload-preview-status');
      const titleInput = document.getElementById('pub-deck-title');
      const descInput = document.getElementById('pub-deck-desc');

      if (!titleInput.value) {
        titleInput.value = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
      }

      if (file.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const parsed = JSON.parse(evt.target.result);
            const wList = Array.isArray(parsed) ? parsed : (parsed.words || []);
            pendingPublisherDeck = {
              title: titleInput.value,
              description: descInput.value,
              words: wList
            };
            if (statusEl) {
              statusEl.style.display = 'block';
              statusEl.textContent = `✅ Đã đọc thành công ${wList.length} từ vựng từ file JSON!`;
            }
          } catch (err) {
            alert('Lỗi đọc file JSON: ' + err.message);
          }
        };
        reader.readAsText(file);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        if (typeof XLSX === 'undefined') {
          alert('Thư viện đọc Excel (SheetJS) chưa sẵn sàng.');
          return;
        }
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Auto pick the sheet with the most rows
            let bestSheetName = workbook.SheetNames[0];
            let maxRows = 0;
            workbook.SheetNames.forEach(sName => {
              const sheet = workbook.Sheets[sName];
              const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
              const rowCount = range.e.r - range.s.r;
              if (rowCount > maxRows) {
                maxRows = rowCount;
                bestSheetName = sName;
              }
            });

            const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[bestSheetName], { header: 1 });
            if (!sheetData || sheetData.length < 2) {
              alert('File Excel không có dữ liệu!');
              return;
            }

            const header = sheetData[0].map(h => (h || '').toString().toLowerCase().trim());
            
            // Column detection
            let termIdx = header.findIndex(h => h.includes('term') || h.includes('từ') || h.includes('vocab') || h.includes('word'));
            let defIdx = header.findIndex(h => h.includes('definition') || h.includes('nghĩa') || h.includes('meaning') || h.includes('dịch'));
            let posIdx = header.findIndex(h => h.includes('partofspeech') || h.includes('loại từ') || h.includes('pos') || h.includes('type'));
            let phonIdx = header.findIndex(h => h.includes('phonetic') || h.includes('phiên âm') || h.includes('ipa') || h.includes('pronun'));
            let exIdx = header.findIndex(h => h.includes('example') || h.includes('ví dụ') || h.includes('sentence'));
            let topicIdx = header.findIndex(h => h.includes('topic') || h.includes('chủ đề') || h.includes('unit'));
            let levelIdx = header.findIndex(h => h.includes('cefr') || h.includes('level') || h.includes('cấp độ'));

            if (termIdx === -1) termIdx = 1;
            if (defIdx === -1) defIdx = 4;

            const extractedWords = [];
            for (let r = 1; r < sheetData.length; r++) {
              const row = sheetData[r];
              if (!row || !row[termIdx]) continue;
              const term = (row[termIdx] || '').toString().trim();
              const def = defIdx !== -1 && row[defIdx] ? row[defIdx].toString().trim() : '';
              if (!term || !def) continue;

              extractedWords.push({
                term: term,
                definition: def,
                partOfSpeech: posIdx !== -1 && row[posIdx] ? row[posIdx].toString().trim() : '',
                phonetic: phonIdx !== -1 && row[phonIdx] ? row[phonIdx].toString().trim() : '',
                example: exIdx !== -1 && row[exIdx] ? row[exIdx].toString().trim() : '',
                topic: topicIdx !== -1 && row[topicIdx] ? row[topicIdx].toString().trim() : '',
                level: levelIdx !== -1 && row[levelIdx] ? row[levelIdx].toString().trim() : 'B1'
              });
            }

            pendingPublisherDeck = {
              title: titleInput.value,
              description: descInput.value,
              words: extractedWords
            };

            if (statusEl) {
              statusEl.style.display = 'block';
              statusEl.textContent = `✅ Đã nhận diện thành công ${extractedWords.length} từ vựng từ sheet "${bestSheetName}"!`;
            }
          } catch (err) {
            alert('Lỗi phân tích file Excel: ' + err.message);
          }
        };
        reader.readAsArrayBuffer(file);
      }
    }

    async function doPublishDeckToCloud() {
      if (!pendingPublisherDeck || !pendingPublisherDeck.words || pendingPublisherDeck.words.length === 0) {
        alert('Vui lòng chọn file Excel hoặc chọn 1 bộ từ hợp lệ trước!');
        return;
      }

      const titleInput = document.getElementById('pub-deck-title');
      const descInput = document.getElementById('pub-deck-desc');
      const catSelect = document.getElementById('pub-deck-category');
      const iconSelect = document.getElementById('pub-deck-icon');
      const authorInput = document.getElementById('pub-deck-author');

      const title = (titleInput?.value || '').trim();
      if (!title) {
        alert('Vui lòng nhập tên bộ từ!');
        return;
      }

      const author = (authorInput?.value || '').trim() || (currentUser && currentUser.displayName) || 'Cộng đồng VocaFlow';
      const deckId = 'pub_deck_' + Date.now();
      const payload = {
        id: deckId,
        title: title,
        description: (descInput?.value || '').trim() || `Bộ từ vựng chia sẻ bởi ${author}`,
        author: author,
        category: catSelect ? catSelect.value : 'THPT',
        icon: iconSelect ? iconSelect.value : '📘',
        color: iconSelect && iconSelect.value === '📙' ? '#f59e0b' : (iconSelect && iconSelect.value === '📕' ? '#ec4899' : (iconSelect && iconSelect.value === '📗' ? '#10b981' : '#3b82f6')),
        totalWords: pendingPublisherDeck.words.length,
        words: pendingPublisherDeck.words,
        publishedAt: new Date().toISOString()
      };

      const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
      const authParam = (currentUser && currentUser.idToken) ? `?auth=${currentUser.idToken}` : '';

      try {
        const btn = document.getElementById('btn-pub-do-upload');
        if (btn) btn.textContent = '⏳ Đang tải lên Thư Viện...';

        const res = await fetch(`${rtdbUrl}/publicLibraryDecks/${deckId}.json${authParam}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          showToast(`🚀 Đã đóng góp thành công bộ từ "${title}" (+${pendingPublisherDeck.words.length} từ) lên Thư Viện toàn cầu!`);
          closeModal('modal-community-upload');
          fetchCloudLibraryDecks();
        } else {
          alert('Không thể lưu lên Cloud. Kiểm tra quyền hoặc kết nối!');
        }
      } catch (err) {
        alert('Lỗi phát hành: ' + err.message);
      } finally {
        const btn = document.getElementById('btn-pub-do-upload');
        if (btn) btn.textContent = '🚀 Đóng Góp Lên Thư Viện Ngay';
      }
    }
  