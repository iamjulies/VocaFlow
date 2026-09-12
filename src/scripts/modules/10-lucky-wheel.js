// =========================================================================

// VOCAFLOW 10-LUCKY-WHEEL.JS (v0.10.9-48)

// Lucky wheel canvas, spin purchase, rewarded video ads, monetization

// =========================================================================

    // =========================================================================
    // DYNAMIC SHUFFLED LUCKY WHEEL & REWARDED ADS ENGINE (v0.10.8-alpha-10.3)
    // =========================================================================
    const AD_COOLDOWN_MS = 20 * 60 * 1000; // 20 minutes cooldown (v0.10.8-alpha-10.3)
    let luckyWheelIsSpinning = false;
    let luckyWheelCurrentRotation = 0;
    let adWatchInterval = null;
    let adWatchSecondsLeft = 30;
    let currentActiveWheelSlices = []; // 8 dynamic shuffled slices
    let currentWheelHasJackpot = false;

    function prepareDynamicWheelSlices() {
      const isVip = isUserVip();

      if (isVip) {
        // VIP Wheel: 100% Always contains +1 Day VIP Jackpot
        currentWheelHasJackpot = true;
        const baseVipSlices = [
          { id: 'vip_1d', label: '👑 +1 Ngày VocaVIP', type: 'VIP', val: 1, color: '#f59e0b', text: '👑 +1 Ngày VocaVIP Hoàng Gia' },
          { id: 'pts_300', label: '🪙 300 VoCoin', type: 'POINTS', val: 300, color: '#ff4d4d', text: '300 VoCoin' },
          { id: 'hints_10', label: '💡 10 VocaHint', type: 'HINTS', val: 10, color: '#ffaf40', text: '10 VocaHint' },
          { id: 'skips_5', label: '⏩ 5 VocaSkip', type: 'SKIPS', val: 5, color: '#32ff7e', text: '5 VocaSkip' },
          { id: 'pts_150', label: '🪙 150 VoCoin', type: 'POINTS', val: 150, color: '#3db5ff', text: '150 VoCoin' },
          { id: 'hints_5', label: '💡 5 VocaHint', type: 'HINTS', val: 5, color: '#7d5fff', text: '5 VocaHint' },
          { id: 'pts_200', label: '🪙 200 VoCoin', type: 'POINTS', val: 200, color: '#ff4b95', text: '200 VoCoin' },
          { id: 'skips_3', label: '⏩ 3 VocaSkip', type: 'SKIPS', val: 3, color: '#cd84f1', text: '3 VocaSkip' }
        ];
        // Randomly shuffle all 8 slices
        currentActiveWheelSlices = [...baseVipSlices].sort(() => Math.random() - 0.5);
      } else {
        // Regular Wheel: 33.3% chance to contain +1 Day VIP Jackpot
        currentWheelHasJackpot = (Math.random() < 0.3333);
        const jackpotSlice = currentWheelHasJackpot
          ? { id: 'vip_1d', label: '👑 +1 Ngày VocaVIP', type: 'VIP', val: 1, color: '#f59e0b', text: '👑 +1 Ngày VocaVIP Trải Nghiệm' }
          : { id: 'pts_150', label: '🪙 150 VoCoin', type: 'POINTS', val: 150, color: '#f59e0b', text: '150 VoCoin' };

        const baseRegularPool = [
          jackpotSlice,
          { id: 'pts_200', label: '🪙 200 VoCoin', type: 'POINTS', val: 200, color: '#ff4d4d', text: '200 VoCoin' },
          { id: 'hints_5', label: '💡 5 VocaHint', type: 'HINTS', val: 5, color: '#ffaf40', text: '5 VocaHint' },
          { id: 'skips_3', label: '⏩ 3 VocaSkip', type: 'SKIPS', val: 3, color: '#32ff7e', text: '3 VocaSkip' },
          { id: 'pts_50', label: '🪙 50 VoCoin', type: 'POINTS', val: 50, color: '#3db5ff', text: '50 VoCoin' },
          { id: 'hints_2', label: '💡 2 VocaHint', type: 'HINTS', val: 2, color: '#7d5fff', text: '2 VocaHint' },
          { id: 'pts_100', label: '🪙 100 VoCoin', type: 'POINTS', val: 100, color: '#ff4b95', text: '100 VoCoin' },
          { id: 'skips_1', label: '⏩ 1 VocaSkip', type: 'SKIPS', val: 1, color: '#cd84f1', text: '1 VocaSkip' }
        ];
        // Randomly shuffle all 8 slices
        currentActiveWheelSlices = [...baseRegularPool].sort(() => Math.random() - 0.5);
      }
    }

    function getTodayString() {
      return getTodayDateString();
    }

    let isGrantingVipDailySpin = false;

    function checkAndGrantVipDailySpinBonus() {
      if (isGrantingVipDailySpin) return false;
      const isVip = typeof isUserVip === 'function' ? isUserVip() : false;
      if (!isVip) return false;

      // Anti-clock manipulation guard
      if (isSystemClockManipulatedBackward()) {
        return false;
      }

      const today = (typeof formatLocalDateString === 'function') ? formatLocalDateString(new Date()) : getTodayString();
      const maxObservedDate = localStorage.getItem(STORAGE_KEY_MAX_OBSERVED_DATE) || '';
      if (maxObservedDate && today < maxObservedDate) {
        return false;
      }

      const notifId = 'notif_vip_daily_spin_' + today;

      // 1. Multi-layer idempotency guard: Ensure exactly ONE grant per calendar day
      const lastDailyDate = localStorage.getItem('vocaflow_last_vip_spin_date') || '';
      if (lastDailyDate && (lastDailyDate === today || today <= lastDailyDate)) {
        return false;
      }

      const isDateMatchToday = (dateStr) => {
        if (!dateStr) return false;
        if (dateStr === today || (typeof dateStr.startsWith === 'function' && dateStr.startsWith(today))) return true;
        try {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) {
            const loc = (typeof formatLocalDateString === 'function') ? formatLocalDateString(d) : '';
            if (loc === today) return true;
          }
        } catch (e) {}
        return false;
      };

      // Check if notification already exists for today across synced userNotifications
      const alreadyNotified = Array.isArray(userNotifications) && userNotifications.some(n =>
        n && (n.id === notifId || (n.type === 'VIP_BONUS' && n.title && (n.title.includes('Quà Tặng VIP Hằng Ngày') || n.title.includes('Quà Tặng VocaVIP Hằng Ngày') || n.title.includes('VocaSpin')) && isDateMatchToday(n.timestamp)))
      );
      if (alreadyNotified) {
        // Already granted on another session/device: synchronize local marker and exit immediately
        localStorage.setItem('vocaflow_last_vip_spin_date', today);
        return false;
      }

      // 2. Perform atomic grant of exactly +2 spins (VocaSpin notifications via VocaNoti only - v0.10.9-alpha-27)
      isGrantingVipDailySpin = true;
      try {
        localStorage.setItem('vocaflow_last_vip_spin_date', today);
        localStorage.setItem(STORAGE_KEY_ECONOMY_TIME, Date.now().toString());
        let spins = parseInt(localStorage.getItem('vocaflow_lucky_spins_left') || '0', 10);
        if (isNaN(spins) || spins < 0) spins = 0;
        spins += 2;
        localStorage.setItem('vocaflow_lucky_spins_left', spins.toString());

        if (typeof addNotification === 'function') {
          addNotification('VIP_BONUS', '👑 Quà Tặng VocaVIP Hằng Ngày', 'Đặc quyền VocaVIP: Bạn được cộng dồn thêm +2 VocaSpin hôm nay!', null, null, notifId);
        }

        updateLuckyWheelUI();
        updateShopBonusesUI();
        saveDatabase(true);
        if (typeof syncEconomyToCloud === 'function') {
          syncEconomyToCloud();
        }
        if (typeof broadcastEconomyUpdate === 'function') {
          broadcastEconomyUpdate();
        }
        return true;
      } finally {
        isGrantingVipDailySpin = false;
      }
    }

    // =========================================================================
    // VIP DAILY SPIN SELF-HEALING & EXCESS CORRECTION (v0.10.9-alpha-19)
    // =========================================================================
    function autoHealExcessVipSpinsToday() {
      const isVip = typeof isUserVip === 'function' ? isUserVip() : false;
      if (!isVip) return;

      const HEAL_KEY = 'vocaflow_spins_healed_v0109a19';
      if (localStorage.getItem(HEAL_KEY)) return;

      const today = (typeof formatLocalDateString === 'function') ? formatLocalDateString(new Date()) : getTodayString();
      let curSpins = parseInt(localStorage.getItem('vocaflow_lucky_spins_left') || '0', 10);
      if (isNaN(curSpins)) curSpins = 0;

      const isDateMatchToday = (dateStr) => {
        if (!dateStr) return false;
        if (dateStr === today || (typeof dateStr.startsWith === 'function' && dateStr.startsWith(today))) return true;
        try {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) {
            const loc = (typeof formatLocalDateString === 'function') ? formatLocalDateString(d) : '';
            if (loc === today) return true;
          }
        } catch (e) {}
        return false;
      };

      // Count VIP spin daily notifications or compensation notifications for today
      const todayDailyNotifs = Array.isArray(userNotifications) ? userNotifications.filter(n =>
        n && (n.id === 'notif_vip_daily_spin_' + today || (n.type === 'VIP_BONUS' && n.title && (n.title.includes('Quà Tặng VIP Hằng Ngày') || n.title.includes('Quà Tặng VocaVIP Hằng Ngày') || n.title.includes('Bồi Hoàn Lượt Quay VIP') || n.title.includes('Bồi Hoàn VocaSpin VIP')) && isDateMatchToday(n.timestamp)))
      ) : [];

      const hasPurchasedSpins = Array.isArray(userLedger) && userLedger.some(tx =>
        tx && (tx.type === 'BUY_SPINS' || tx.type === 'PURCHASE_SPIN')
      );

      const lastSpinDate = localStorage.getItem('vocaflow_last_spin_date') || '';
      const hasSpunToday = lastSpinDate === today;

      // If user received multiple spin grants today (inflated to > 2 without purchasing)
      if (!hasPurchasedSpins && (todayDailyNotifs.length > 1 || curSpins > 2)) {
        const adjustedSpins = hasSpunToday ? 0 : 2;
        localStorage.setItem('vocaflow_lucky_spins_left', adjustedSpins.toString());
        localStorage.setItem('vocaflow_last_vip_spin_date', today);
        localStorage.setItem(STORAGE_KEY_ECONOMY_TIME, Date.now().toString());
        localStorage.setItem(HEAL_KEY, 'true');

        // Deduplicate notifications: retain only one single valid notification for today
        if (Array.isArray(userNotifications)) {
          let keptOne = false;
          userNotifications = userNotifications.filter(n => {
            if (!n) return false;
            const isDup = n.id === 'notif_vip_daily_spin_' + today || (n.type === 'VIP_BONUS' && n.title && (n.title.includes('Quà Tặng VIP Hằng Ngày') || n.title.includes('Quà Tặng VocaVIP Hằng Ngày') || n.title.includes('Bồi Hoàn Lượt Quay VIP') || n.title.includes('Bồi Hoàn VocaSpin VIP')) && isDateMatchToday(n.timestamp));
            if (isDup) {
              if (!keptOne) { keptOne = true; return true; }
              return false;
            }
            return true;
          });
          localStorage.setItem('vocaflow_notifications', JSON.stringify(userNotifications));
          if (typeof updateNotificationsUI === 'function') updateNotificationsUI();
          if (typeof renderNotificationsList === 'function') renderNotificationsList();
        }

        updateLuckyWheelUI();
        updateShopBonusesUI();
        saveDatabase(true);
        if (typeof syncEconomyToCloud === 'function') {
          syncEconomyToCloud();
        }
        if (typeof broadcastEconomyUpdate === 'function') {
          broadcastEconomyUpdate();
        }
        showToast('👑 Đã hiệu chỉnh lại VocaSpin VIP hôm nay: đúng chuẩn +2 lượt/ngày!');
      } else {
        localStorage.setItem(HEAL_KEY, 'true');
      }
    }

    function getLuckySpinsCount() {
      if (typeof isUserVip === 'function' && isUserVip()) {
        checkAndGrantVipDailySpinBonus();
      }
      const raw = localStorage.getItem('vocaflow_lucky_spins_left');
      const parsed = parseInt(raw || '0', 10);
      return Math.max(0, isNaN(parsed) ? 0 : parsed);
    }

    function setLuckySpinsCount(count) {
      const cleanCount = Math.max(0, count);
      localStorage.setItem('vocaflow_lucky_spins_left', cleanCount.toString());
      localStorage.setItem('vocaflow_last_spin_date', getTodayString());
      localStorage.setItem(STORAGE_KEY_ECONOMY_TIME, Date.now().toString());
      updateLuckyWheelUI();
      if (typeof syncEconomyToCloud === 'function') {
        syncEconomyToCloud();
      }
      if (typeof broadcastEconomyUpdate === 'function') {
        broadcastEconomyUpdate();
      }
    }

    function updateShopBonusesUI() {
      const isVip = isUserVip();
      const spins = getLuckySpinsCount();
      const discount = getStoreActiveDiscount();

      // Event Discount Banner in VocaShop
      const existingSaleBanner = document.getElementById('shop-sale-event-banner');
      if (discount.isDiscountActive) {
        if (!existingSaleBanner) {
          const shopModal = document.querySelector('#modal-shop .modal');
          if (shopModal) {
            const bannerDiv = document.createElement('div');
            bannerDiv.id = 'shop-sale-event-banner';
            bannerDiv.style.cssText = 'background: linear-gradient(135deg, #ef4444, #f59e0b); color: white; padding: 8px 12px; border-radius: 10px; font-size: 12px; font-weight: 800; text-align: center; margin-bottom: 12px; box-shadow: 0 4px 14px rgba(239,68,68,0.4); animation: pulse-ad 2s infinite;';
            bannerDiv.innerHTML = `<span>${discount.bannerText}</span>`;
            const titleEl = shopModal.querySelector('.modal-title');
            if (titleEl && titleEl.nextSibling) {
              shopModal.insertBefore(bannerDiv, titleEl.nextSibling);
            }
          }
        } else {
          existingSaleBanner.style.display = 'block';
          existingSaleBanner.innerHTML = `<span>${discount.bannerText}</span>`;
        }
      } else if (existingSaleBanner) {
        existingSaleBanner.style.display = 'none';
      }

      // Dynamic Discount Engine for Store Items (v0.10.9-alpha-22)
      // 1. Spin packages
      const spinPacks = [
        { code: 'S5', basePrice: 10000, perSpin: 2000, spins: 5, defaultBtn: '💳 Mua (10k)', prefix: '💳 Mua' },
        { code: 'S15', basePrice: 25000, perSpin: 1667, spins: 15, defaultBtn: '🚀 Mua (25k)', prefix: '🚀 Mua' },
        { code: 'S40', basePrice: 50000, perSpin: 1250, spins: 40, defaultBtn: '👑 Mua (50k)', prefix: '👑 Mua' }
      ];
      spinPacks.forEach(sp => {
        const priceEl = document.getElementById(`shop-spin-price-${sp.code}`);
        const btnEl = document.getElementById(`shop-spin-btn-${sp.code}`);
        const badgeEl = document.getElementById(`shop-spin-badge-${sp.code}`);
        if (discount.isDiscountActive) {
          const finalPrice = applyStoreDiscountToPrice(sp.basePrice);
          const perUnit = Math.round(finalPrice / sp.spins);
          const kStr = (finalPrice / 1000).toFixed(1).replace('.0', '') + 'k';
          if (priceEl) {
            priceEl.innerHTML = `<s>${sp.basePrice.toLocaleString('vi-VN')}đ</s> <strong style="color: #ffd700;">${finalPrice.toLocaleString('vi-VN')}đ</strong> <span style="color: var(--text-muted); font-weight: normal;">(Chỉ ${perUnit.toLocaleString('vi-VN')}đ/lượt)</span>`;
          }
          if (btnEl) btnEl.textContent = `${sp.prefix} (${kStr})`;
          if (badgeEl) badgeEl.innerHTML = `<span class="badge" style="background: rgba(239,68,68,0.25); color: #f87171; font-size: 9.5px; margin-left: 4px;">-${discount.discountPct}%</span>`;
        } else {
          if (priceEl) {
            const label = sp.code === 'S15' ? `(~${sp.perSpin.toLocaleString('vi-VN')}đ/lượt)` : `(Chỉ ${sp.perSpin.toLocaleString('vi-VN')}đ/lượt)`;
            priceEl.innerHTML = `${sp.basePrice.toLocaleString('vi-VN')}đ <span style="color: var(--text-muted); font-weight: normal;">${label}</span>`;
          }
          if (btnEl) btnEl.textContent = sp.defaultBtn;
          if (badgeEl) badgeEl.innerHTML = '';
        }
      });

      // 2. Hint packages
      const hintPacks = [
        { count: 1, basePoints: 50, isDiscountPkg: false },
        { count: 5, basePoints: 250, isDiscountPkg: false },
        { count: 10, basePoints: 450, isDiscountPkg: true }
      ];
      hintPacks.forEach(hp => {
        const priceEl = document.getElementById(`shop-hint-price-${hp.count}`);
        const btnEl = document.getElementById(`shop-hint-btn-${hp.count}`);
        const badgeEl = document.getElementById(`shop-hint-badge-${hp.count}`);
        if (discount.isDiscountActive) {
          const finalPoints = applyStoreDiscountToPrice(hp.basePoints);
          if (priceEl) {
            const prefix = hp.isDiscountPkg ? 'Giá ưu đãi: ' : 'Giá: ';
            priceEl.innerHTML = `${prefix}<s>${hp.basePoints}</s> <strong style="color: #ffd700;">${finalPoints} VoCoin</strong>`;
          }
          if (btnEl) btnEl.textContent = `Đổi (${finalPoints} VoCoin)`;
          if (badgeEl) badgeEl.innerHTML = `<span class="badge" style="background: rgba(239,68,68,0.25); color: #f87171; font-size: 9.5px; margin-left: 4px;">-${discount.discountPct}%</span>`;
        } else {
          if (priceEl) {
            priceEl.innerHTML = hp.isDiscountPkg ? `Giá ưu đãi: ${hp.basePoints} VoCoin` : `Giá: ${hp.basePoints} VoCoin`;
          }
          if (btnEl) btnEl.textContent = `Đổi (${hp.basePoints} VoCoin)`;
          if (badgeEl) badgeEl.innerHTML = '';
        }
      });

      // 3. Skip packages
      const skipPacks = [
        { count: 1, basePoints: 100, isDiscountPkg: false },
        { count: 5, basePoints: 500, isDiscountPkg: false },
        { count: 10, basePoints: 900, isDiscountPkg: true }
      ];
      skipPacks.forEach(sk => {
        const priceEl = document.getElementById(`shop-skip-price-${sk.count}`);
        const btnEl = document.getElementById(`shop-skip-btn-${sk.count}`);
        const badgeEl = document.getElementById(`shop-skip-badge-${sk.count}`);
        if (discount.isDiscountActive) {
          const finalPoints = applyStoreDiscountToPrice(sk.basePoints);
          if (priceEl) {
            const prefix = sk.isDiscountPkg ? 'Giá ưu đãi: ' : 'Giá: ';
            priceEl.innerHTML = `${prefix}<s>${sk.basePoints}</s> <strong style="color: #ffd700;">${finalPoints} VoCoin</strong>`;
          }
          if (btnEl) btnEl.textContent = `Đổi (${finalPoints} VoCoin)`;
          if (badgeEl) badgeEl.innerHTML = `<span class="badge" style="background: rgba(239,68,68,0.25); color: #f87171; font-size: 9.5px; margin-left: 4px;">-${discount.discountPct}%</span>`;
        } else {
          if (priceEl) {
            priceEl.innerHTML = sk.isDiscountPkg ? `Giá ưu đãi: ${sk.basePoints} VoCoin` : `Giá: ${sk.basePoints} VoCoin`;
          }
          if (btnEl) btnEl.textContent = `Đổi (${sk.basePoints} VoCoin)`;
          if (badgeEl) badgeEl.innerHTML = '';
        }
      });

      // 4. FlowFreeze item
      const freezeDescEl = document.getElementById('shop-freeze-desc');
      const freezeBtnEl = document.getElementById('btn-shop-buy-freeze');
      const freezeBadgeEl = document.getElementById('shop-freeze-badge');
      if (discount.isDiscountActive) {
        const finalFreezePoints = applyStoreDiscountToPrice(200);
        if (freezeDescEl) {
          freezeDescEl.innerHTML = `Tự động bảo vệ FlowStreak khi bạn nghỉ học (Giá: <s>200</s> <strong style="color: #ffd700;">${finalFreezePoints} VoCoin</strong>)`;
        }
        if (freezeBtnEl) freezeBtnEl.textContent = `Mua (${finalFreezePoints} VoCoin)`;
        if (freezeBadgeEl) freezeBadgeEl.innerHTML = `<span class="badge" style="background: rgba(239,68,68,0.25); color: #f87171; font-size: 9.5px; margin-left: 4px;">-${discount.discountPct}%</span>`;
      } else {
        if (freezeDescEl) freezeDescEl.innerHTML = 'Tự động bảo vệ FlowStreak khi bạn nghỉ học (Giá: 200 VoCoin)';
        if (freezeBtnEl) freezeBtnEl.textContent = 'Mua (200 VoCoin)';
        if (freezeBadgeEl) freezeBadgeEl.innerHTML = '';
      }

      // 1. Update Lucky Wheel banner in VocaShop
      const wheelTitle = document.getElementById('shop-wheel-title');
      const wheelBadge = document.getElementById('shop-wheel-badge');
      const wheelDesc = document.getElementById('shop-wheel-desc');
      const adBanner = document.getElementById('shop-rewarded-ad-banner');

      if (wheelTitle) {
        wheelTitle.textContent = isVip ? '👑 Vòng Quay May Mắn VocaVIP' : '🎡 Vòng Quay May Mắn';
      }
      if (wheelBadge) {
        wheelBadge.textContent = `Còn ${spins} Lượt`;
        wheelBadge.style.background = spins > 0 ? 'rgba(16,185,129,0.2)' : 'rgba(148,163,184,0.15)';
        wheelBadge.style.color = spins > 0 ? '#34d399' : '#94a3b8';
      }
      if (wheelDesc) {
        wheelDesc.textContent = isVip 
          ? '👑 Đặc quyền VocaVIP: Cơ cấu giải 300 VoCoin, 10 VocaHint & Độc Đắc +1 Ngày VocaVIP'
          : 'Cơ hội trúng 200 VoCoin, VocaHint, VocaSkip & Giải Độc Đắc +1 Ngày VocaVIP!';
      }

      // 2. Hide Rewarded Ads completely for VIP users
      const shopAdsenseContainer = document.getElementById('shop-adsense-qc1-container');
      if (shopAdsenseContainer) {
        shopAdsenseContainer.style.display = isVip ? 'none' : 'block';
        if (!isVip) {
          try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
        }
      }

      if (adBanner) {
        adBanner.style.display = 'flex';
        updateAdButtonCooldownState();
      }
    }

    function openRewardedAdModalFromWheel() {
      const lastWatch = parseInt(localStorage.getItem('vocaflow_last_ad_watch_time') || '0', 10);
      const elapsed = Date.now() - lastWatch;
      if (elapsed < AD_COOLDOWN_MS) {
        const remainingSec = Math.ceil((AD_COOLDOWN_MS - elapsed) / 1000);
        const m = Math.floor(remainingSec / 60);
        const s = remainingSec % 60;
        showToast(`⏱️ Đang chờ giãn cách! Vui lòng đợi ${m} phút ${s} giây để xem tiếp!`);
        return;
      }
      closeModal('modal-lucky-wheel');
      openRewardedAdModal();
    }

    function updateAdButtonCooldownState() {
      let btn = document.getElementById('btn-shop-watch-ad');
      const wheelBtn = document.getElementById('btn-wheel-watch-ad');
      const adBadge = document.getElementById('shop-ad-badge');
      const banner = document.getElementById('shop-rewarded-ad-banner');
      
      // Auto-inject button if missing in DOM for any reason
      if (!btn && banner) {
        const newBtn = document.createElement('button');
        newBtn.type = 'button';
        newBtn.id = 'btn-shop-watch-ad';
        newBtn.className = 'btn btn-sm';
        newBtn.onclick = (e) => { e.stopPropagation(); openRewardedAdModal(); };
        newBtn.style.cssText = 'white-space: nowrap; flex-shrink: 0; background: linear-gradient(135deg, #38bdf8, #6366f1); color: white; border: none; font-weight: 800; padding: 8px 14px; border-radius: 8px; box-shadow: 0 3px 10px rgba(56,189,248,0.35); cursor: pointer;';
        newBtn.textContent = '🎬 Xem Ngay';
        banner.appendChild(newBtn);
        btn = newBtn;
      }

      const lastWatch = parseInt(localStorage.getItem('vocaflow_last_ad_watch_time') || '0', 10);
      const elapsed = Date.now() - lastWatch;

      const headerAdDot = document.getElementById('header-ad-ready-dot');

      if (elapsed < AD_COOLDOWN_MS) {
        if (headerAdDot) headerAdDot.style.display = 'none';
        const remainingSec = Math.ceil((AD_COOLDOWN_MS - elapsed) / 1000);
        const m = Math.floor(remainingSec / 60);
        const s = remainingSec % 60;
        const timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        if (btn) {
          btn.textContent = `⏱️ Chờ ${timeStr}`;
          btn.disabled = true;
          btn.style.opacity = '1';
          btn.style.cursor = 'not-allowed';
          btn.style.background = 'rgba(245,158,11,0.15)';
          btn.style.color = '#fbbf24';
          btn.style.border = '1px solid rgba(245,158,11,0.4)';
          btn.style.boxShadow = 'none';
        }
        if (adBadge) {
          adBadge.textContent = `⏱️ ${timeStr}`;
          adBadge.style.background = 'rgba(245,158,11,0.2)';
          adBadge.style.color = '#fbbf24';
        }
        if (wheelBtn) {
          wheelBtn.textContent = `⏱️ Chờ ${timeStr} để xem tiếp`;
          wheelBtn.disabled = true;
          wheelBtn.style.opacity = '0.7';
          wheelBtn.style.cursor = 'not-allowed';
        }
      } else {
        if (headerAdDot) headerAdDot.style.display = 'flex';
        if (btn) {
          btn.textContent = '🎬 Xem Ngay';
          btn.disabled = false;
          btn.style.opacity = '1';
          btn.style.cursor = 'pointer';
          btn.style.background = 'linear-gradient(135deg, #38bdf8, #6366f1)';
          btn.style.color = 'white';
          btn.style.border = 'none';
          btn.style.boxShadow = '0 3px 10px rgba(56,189,248,0.35)';
        }
        if (adBadge) {
          adBadge.textContent = '+1 VocaSpin';
          adBadge.style.background = 'rgba(56,189,248,0.2)';
          adBadge.style.color = '#38bdf8';
        }
        if (wheelBtn) {
          wheelBtn.textContent = '🎬 Xem Video 30s Nhận +1 VocaSpin';
          wheelBtn.disabled = false;
          wheelBtn.style.opacity = '1';
          wheelBtn.style.cursor = 'pointer';
        }
      }
    }

    function renderWheelSlices() {
      const wheel = document.getElementById('lucky-wheel-element');
      if (!wheel) return;

      if (!currentActiveWheelSlices || currentActiveWheelSlices.length !== 8) {
        prepareDynamicWheelSlices();
      }

      // 8 Segments conic gradient
      const conicParts = currentActiveWheelSlices.map((s, i) => `${s.color} ${i * 45}deg ${(i + 1) * 45}deg`).join(', ');
      wheel.style.background = `conic-gradient(${conicParts})`;

      let labelsHtml = '';
      currentActiveWheelSlices.forEach((s, i) => {
        const angle = i * 45 + 22.5;
        labelsHtml += `
          <div class="lucky-wheel-slice-label" style="transform: rotate(${angle}deg);">
            <span>${s.label}</span>
          </div>
        `;
      });

      wheel.innerHTML = labelsHtml;
    }

    function updateLuckyWheelUI() {
      const isVip = isUserVip();
      const spins = getLuckySpinsCount();

      const titleEl = document.getElementById('lucky-wheel-modal-title');
      const subEl = document.getElementById('lucky-wheel-modal-sub');
      const spinsCountEl = document.getElementById('lucky-wheel-spins-count');
      const adCta = document.getElementById('lucky-wheel-ad-cta');

      if (titleEl) titleEl.textContent = isVip ? '👑 Vòng Quay May Mắn Hoàng Gia' : '🎡 Vòng Quay May Mắn';
      if (subEl) {
        if (isVip) {
          subEl.innerHTML = '<span style="color: #ffd700; font-weight: 700;">👑 Đặc quyền VocaVIP: Luôn có ô Độc Đắc +1 Ngày VocaVIP & 300 VoCoin!</span>';
        } else if (currentWheelHasJackpot) {
          subEl.innerHTML = '<span style="color: #ffd700; font-weight: 800; animation: vip-combo 2.5s infinite;">✨ HOT: Ô ĐỘC ĐẮC +1 NGÀY VOCAVIP ĐANG XUẤT HIỆN! ✨</span>';
        } else {
          subEl.innerHTML = '<span style="color: var(--text-muted);">Quay trúng VoCoin, VocaHint, VocaSkip & Cơ hội săn VocaVIP!</span>';
        }
      }
      if (spinsCountEl) spinsCountEl.textContent = spins.toString();

      if (adCta) {
        adCta.style.display = (spins === 0) ? 'block' : 'none';
      }
    }

    function openLuckyWheelModal() {
      if (currentUser && currentUser.uid && typeof loadEconomyFromCloud === 'function') {
        loadEconomyFromCloud().then(() => {
          if (typeof isUserVip === 'function' && isUserVip()) {
            checkAndGrantVipDailySpinBonus();
          }
          updateLuckyWheelUI();
        }).catch(() => {});
      }
      if (typeof isUserVip === 'function' && isUserVip()) {
        checkAndGrantVipDailySpinBonus();
      }
      if (!luckyWheelIsSpinning) {
        prepareDynamicWheelSlices();
      }
      renderWheelSlices();
      updateLuckyWheelUI();
      const resultBox = document.getElementById('lucky-wheel-result-box');
      if (resultBox) resultBox.textContent = 'Bấm QUAY để thử vận may ngay!';
      openModal('modal-lucky-wheel');
    }

    function grantVipOneDayBonus() {
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      const isCurrentlyVip = isUserVip();
      
      // ONLY true LIFETIME VIP gets converted to Xu + Hints
      if (isCurrentlyVip && userVipTier === 'lifetime') {
        setUserPoints(getUserPoints() + 300);
        setUserHints(getUserHints() + 5);
        addLedgerEntry('LUCKY_WHEEL', 300, '👑 Giải Độc Đắc: +1 Ngày VocaVIP (Đã quy đổi 300 VoCoin + 5 VocaHint cho VocaVIP Trọn Đời)');
        saveDatabase(true);
        pushCurrentDatabaseToCloud();
        return { isLifetime: true, message: '👑 Bạn đã sở hữu VocaVIP Trọn Đời! Đã tặng thêm 300 VoCoin & 5 VocaHint!' };
      }

      // For Monthly, Yearly or Non-VIP: Extend expiration by exactly 24 hours with Bulletproof Protection
      const highWater = getVipHighWaterExp();
      const currentExp = (highWater && highWater > Date.now()) ? highWater : Date.now();
      const newExp = currentExp + ONE_DAY_MS;
      const targetTier = (userVipTier && userVipTier !== 'none') ? userVipTier : 'monthly';
      
      const vRes = applyVipState(true, targetTier, newExp, 'lucky_wheel', false);
      userIsVip = vRes.userIsVip;
      userVipTier = vRes.userVipTier;
      userVipExpiresAt = vRes.userVipExpiresAt;

      const expiryDateFormatted = new Date(userVipExpiresAt).toLocaleDateString('vi-VN');
      addLedgerEntry('LUCKY_WHEEL', 0, `👑 Trúng Giải Độc Đắc: +1 Ngày VIP Hoàng Gia (Hạn mới: ${expiryDateFormatted})`);

      saveDatabase(true);
      pushCurrentDatabaseToCloud();
      updateAuthUI();
      if (typeof initGlobalVipRegistry === 'function') initGlobalVipRegistry();
      if (typeof updateAiChatQuotaUI === 'function') updateAiChatQuotaUI();

      return { isLifetime: false, newExpiry: userVipExpiresAt, formatted: expiryDateFormatted };
    }

    // =========================================================================
    // MONETAG ADS & PASSIVE ADS ENGINE (v0.10.9-alpha-12)
    // =========================================================================
    const MONETAG_INPAGE_ZONE = '11730204';
    const MONETAG_VIGNETTE_ZONE = '11730208';
    let monetagInPageScriptEl = null;
    let monetagVignetteScriptEl = null;
    let lastRewardedAdTriggerTime = 0;
    let rewardedAdCurrentType = 'inpage';

    // Instant & Thorough Ad Purge for VIP Accounts (No F5 Reload Needed!)
    function purgeAllAdArtifactsFromDOM() {
      // 1. Remove all ad network script tags
      const scriptSelectors = [
        '#monetag-inpage-script',
        '#monetag-vignette-script',
        'script[src*="nap5k.com"]',
        'script[src*="n6wxm.com"]',
        'script[src*="quge5.com"]',
        'script[src*="3nbf4.com"]',
        'script[data-zone="11730204"]',
        'script[data-zone="11730208"]'
      ];
      scriptSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          try { el.remove(); } catch (e) {}
        });
      });

      // 2. Remove all ad iframes, banners, and wrappers injected into the DOM
      const adSelectors = [
        'iframe[src*="nap5k.com"]',
        'iframe[src*="n6wxm.com"]',
        'iframe[src*="monetag"]',
        'div[id*="monetag"]',
        'div[class*="monetag"]',
        'div[class*="vignette"]',
        'div[class*="inpage"]',
        'div[id*="vignette"]',
        'div[id*="inpage"]',
        'div[data-zone="11730204"]',
        'div[data-zone="11730208"]'
      ];
      adSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          if (!el.classList.contains('modal-overlay') && !el.closest('.modal-overlay') && !el.closest('#toast-container')) {
            try { el.remove(); } catch (e) {}
          }
        });
      });

      // 3. Scan body direct children for foreign fixed overlays/banners
      Array.from(document.body.children).forEach(child => {
        if (child.tagName === 'DIV' || child.tagName === 'IFRAME') {
          const id = child.id || '';
          const cls = child.className || '';
          const style = child.getAttribute('style') || '';
          const isVocaFlowElement = id.startsWith('screen-') || id.startsWith('modal-') || id.startsWith('toast-') || id === 'toast' || id.startsWith('app-global-') || id === 'app' || id === 'app-container' || child.tagName === 'HEADER' || child.tagName === 'MAIN' || child.tagName === 'NAV';
          if (!isVocaFlowElement && (style.includes('position: fixed') || style.includes('position: absolute')) && (style.includes('z-index') || cls.includes('ad') || id.includes('ad'))) {
            if (!child.querySelector('#screen-decks') && !child.querySelector('.brand') && !child.classList.contains('modal-overlay')) {
              try { child.remove(); } catch (e) {}
            }
          }
        }
      });

      monetagInPageScriptEl = null;
      monetagVignetteScriptEl = null;
    }

    // Context-Aware Detection: In Study Mode (Quiz, Spelling, Speaking, Flashcards) or AI Mentor
    function isInStudyOrMentorMode() {
      const studyScreens = ['screen-quiz', 'screen-spelling', 'screen-speaking', 'screen-autofc'];
      for (const sid of studyScreens) {
        const el = document.getElementById(sid);
        if (el && el.classList.contains('active')) return true;
      }
      if (typeof isFlashcardStudyActive !== 'undefined' && isFlashcardStudyActive) return true;
      const mentorModal = document.getElementById('modal-ai-mentor');
      if (mentorModal && mentorModal.classList.contains('active')) return true;
      const deckStudioModal = document.getElementById('modal-ai-deck-studio');
      if (deckStudioModal && deckStudioModal.classList.contains('active')) return true;
      return false;
    }

    function cleanForeignClickBlockers() {
      try {
        const rewardedAdModal = document.getElementById('modal-rewarded-ad');
        if (rewardedAdModal && rewardedAdModal.classList.contains('active')) {
          // Do not delete active ad frames while user is watching rewarded video
          return;
        }

        const parents = [document.body, document.documentElement];
        parents.forEach(parent => {
          if (!parent) return;
          Array.from(parent.children).forEach(child => {
            if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE' || child.tagName === 'LINK') return;
            const id = child.id || '';
            const cls = child.className || '';
            
            // Whitelist legitimate VocaFlow elements
            const isVocaFlow = id.startsWith('screen-') || 
                               id.startsWith('modal-') || 
                               id.startsWith('toast-') || 
                               id === 'toast' ||
                               id.startsWith('app-global-') ||
                               id.startsWith('btn-ai-mentor') ||
                               id === 'btn-ai-mentor-fab' ||
                               id === 'app' || 
                               id === 'app-container' || 
                               id === 'toast-container' || 
                               id === 'decks-footer-adsense-multiplex-container' ||
                               child.tagName === 'HEADER' || 
                               child.tagName === 'MAIN' || 
                               child.tagName === 'NAV' || 
                               child.classList.contains('modal-overlay') || 
                               child.classList.contains('app-global-loader') ||
                               child.classList.contains('screen');
            if (isVocaFlow) return;

            const style = window.getComputedStyle(child);
            const isFixedOrAbs = (style.position === 'fixed' || style.position === 'absolute');
            const zIndex = parseInt(style.zIndex, 10) || 0;
            const rect = child.getBoundingClientRect();
            const coversScreen = (rect.width >= window.innerWidth * 0.4 && rect.height >= window.innerHeight * 0.4);

            if (isFixedOrAbs && (zIndex >= 50 || coversScreen || cls.includes('vignette') || id.includes('vignette') || cls.includes('ad') || id.includes('ad'))) {
              if (!child.classList.contains('modal-overlay')) {
                try { child.remove(); } catch (e) { child.style.pointerEvents = 'none'; }
              }
            }
          });
        });
      } catch (err) {
        console.warn('Click blocker cleaner notice:', err);
      }
    }

    function suppressVignetteAd() {
      const vScript = document.getElementById('monetag-vignette-script');
      if (vScript) {
        try { vScript.remove(); } catch (e) {}
        monetagVignetteScriptEl = null;
      }
      document.querySelectorAll('iframe[src*="n6wxm.com"], div[class*="vignette"], div[id*="vignette"]').forEach(el => {
        try { el.remove(); } catch (e) {}
      });
      cleanForeignClickBlockers();
    }

    function injectInPagePushAd() {
      if (!document.getElementById('monetag-inpage-script')) {
        try {
          const s = document.createElement('script');
          s.id = 'monetag-inpage-script';
          s.dataset.zone = MONETAG_INPAGE_ZONE;
          s.src = 'https://nap5k.com/tag.min.js';
          (document.documentElement || document.body).appendChild(s);
          monetagInPageScriptEl = s;
        } catch (e) {
          console.warn('Monetag In-Page Push init error:', e);
        }
      }
    }

    function injectVignetteAd() {
      if (!document.getElementById('monetag-vignette-script')) {
        try {
          const s = document.createElement('script');
          s.id = 'monetag-vignette-script';
          s.dataset.zone = MONETAG_VIGNETTE_ZONE;
          s.src = 'https://n6wxm.com/vignette.min.js';
          (document.documentElement || document.body).appendChild(s);
          monetagVignetteScriptEl = s;
        } catch (e) {
          console.warn('Monetag Vignette init error:', e);
        }
      }
    }

    function initMonetagPassiveAds() {
      const isVip = (typeof isUserVip === 'function' && isUserVip());
      const isDesktop = !!(window.chrome && window.chrome.webview);
      
      // VIP users OR Windows Desktop App: 100% clean ad-free / script-free experience
      if (isVip || isDesktop) {
        purgeAllAdArtifactsFromDOM();
        cleanForeignClickBlockers();
        return;
      }

      // v0.10.9-alpha-20: Vignette ads are strictly INTERSTITIAL / REWARDED ONLY!
      // NEVER inject full-screen click interceptor ads during passive navigation.
      suppressVignetteAd();
      cleanForeignClickBlockers();

      // Only small in-page push banner allowed on web when not in exam/study mode
      if (!isInStudyOrMentorMode()) {
        injectInPagePushAd();
      }
    }

    // =========================================================================
    // REWARDED ADS CYCLING ENGINE (v0.10.9-alpha-12 - IN-APP NO NEW TAB)
    // =========================================================================
    function startRewardedAdCycle() {
      lastRewardedAdTriggerTime = Date.now();
      rewardedAdCurrentType = 'inpage';
      triggerRewardedAdBanner('inpage');
    }

    function isAnyAdCurrentlyOnScreen() {
      const adNodes = document.querySelectorAll('iframe[src*="nap5k"], iframe[src*="n6wxm"], div[class*="inpage"], div[class*="vignette"], div[id*="inpage"], div[id*="vignette"]');
      for (const node of adNodes) {
        const rect = node.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && window.getComputedStyle(node).display !== 'none' && window.getComputedStyle(node).visibility !== 'hidden') {
          return true;
        }
      }
      return false;
    }

    function triggerRewardedAdBanner(type = 'inpage') {
      const statusBadge = document.getElementById('rewarded-ad-status-badge');
      if (type === 'inpage') {
        if (statusBadge) statusBadge.innerHTML = '<span>📢 Biểu ngữ tài trợ In-Page Push đang hiển thị</span>';
        injectInPagePushAd();
      } else {
        if (statusBadge) statusBadge.innerHTML = '<span>🎬 Biểu ngữ tài trợ Vignette Banner đang hiển thị</span>';
        injectVignetteAd();
      }
      lastRewardedAdTriggerTime = Date.now();
    }

    function checkAndCycleRewardedAds() {
      // Only cycle if in active countdown and remaining time > 3 seconds
      if (adWatchSecondsLeft <= 3) return;

      const elapsedSinceLastTrigger = Date.now() - lastRewardedAdTriggerTime;
      // Minimum 4 seconds cooldown between ad popups to prevent stacking
      if (elapsedSinceLastTrigger < 4000) return;

      // Anti-stacking rule: if an ad is already on screen, DO NOT trigger another!
      if (isAnyAdCurrentlyOnScreen()) return;

      // Ad was closed/dismissed by user while session is still active: trigger next cleanly!
      rewardedAdCurrentType = (rewardedAdCurrentType === 'inpage') ? 'vignette' : 'inpage';
      triggerRewardedAdBanner(rewardedAdCurrentType);
    }

    function stopRewardedAdCycle() {
      // Suppress any active vignette so it does not block the reward claim button
      suppressVignetteAd();
      const statusBadge = document.getElementById('rewarded-ad-status-badge');
      if (statusBadge) {
        statusBadge.innerHTML = '<span style="color: #34d399;">✅ Đã hoàn tất 30s xem quảng cáo! Bấm nút Nhận Thưởng bên dưới.</span>';
      }
    }

    // =========================================================================
    // REWARDED VIDEO ADS ENGINE (v0.10.8-alpha-10.3 / v0.10.9-alpha-12)
    // =========================================================================
    const AD_FEATURE_SLIDES = [
      {
        icon: '👑',
        sponsor: 'VocaVIP Hoàng Gia',
        title: 'VocaFlow Pro - AI English Mentor 24/7',
        desc: 'Trợ lý học thuật và luyện phản xạ giao tiếp tiếng Anh 24/7 không giới hạn, kèm vương miện neon độc quyền.',
        tags: ['✓ VIP Unlimited', '✓ Realtime Sync', '✓ 0đ Phí AI']
      },
      {
        icon: '🎙️',
        sponsor: 'ELSA Speak Phonetics AI',
        title: 'ELSA Speak AI - Chuẩn Hóa Phát Âm Bản Xứ',
        desc: 'Công nghệ AI chấm điểm khẩu hình, nối âm, nuốt âm và trọng âm ngữ điệu chuẩn kỳ thi quốc tế.',
        tags: ['✓ AI Phonetics', '✓ Chuẩn Bản Xứ', '✓ IELTS 8.0+']
      },
      {
        icon: '🧠',
        sponsor: 'Oxford & Cambridge E-Learning',
        title: 'Spaced Repetition System (SRS Ebbinghaus)',
        desc: 'Phương pháp lặp lại ngắt quãng dựa trên đường cong quên lãng Ebbinghaus giúp nhớ 3.000 từ vựng cốt lõi.',
        tags: ['✓ Chuẩn Quốc Tế', '✓ Nhớ Lâu x5', '✓ Flashcards 3D']
      },
      {
        icon: '⚡',
        sponsor: 'Google Cloud Asia-Southeast1',
        title: 'Hạ Tầng Cloud Realtime Siêu Tốc',
        desc: 'Đồng bộ học tập tức thì giữa Web Online và Windows Desktop App mà không lo mất tiến độ.',
        tags: ['✓ Offline-First', '✓ Auto Backup', '✓ Bảo Mật 100%']
      },
      {
        icon: '📚',
        sponsor: 'Global Success & IELTS Cambridge',
        title: 'Kho Thư Viện THPT Quốc Gia & IELTS 8.0+',
        desc: 'Hơn 50+ VocaDeck tuyển chọn chuẩn SGK Global Success và bộ đề thi trọng tâm mới nhất.',
        tags: ['✓ Chuẩn SGK Mới', '✓ 100% Miễn Phí', '✓ Audio HD']
      }
    ];

    let isAdWatchPausedDueToTabSwitch = false;
    let currentAdActiveSlide = null;

    function openRewardedAdModal() {
      const lastWatch = parseInt(localStorage.getItem('vocaflow_last_ad_watch_time') || '0', 10);
      const elapsed = Date.now() - lastWatch;
      if (elapsed < AD_COOLDOWN_MS) {
        const remainingSec = Math.ceil((AD_COOLDOWN_MS - elapsed) / 1000);
        showToast(`⏱️ Vui lòng chờ ${Math.floor(remainingSec / 60)} phút ${remainingSec % 60} giây để xem video tiếp theo!`);
        return;
      }

      // Pick a random ad slide
      currentAdActiveSlide = AD_FEATURE_SLIDES[Math.floor(Math.random() * AD_FEATURE_SLIDES.length)];
      const titleEl = document.getElementById('ad-player-feature-title');
      const descEl = document.getElementById('ad-player-feature-desc');
      const countdownEl = document.getElementById('ad-player-countdown');
      const progressFill = document.getElementById('ad-player-progress-fill');
      const claimBtn = document.getElementById('btn-ad-claim-reward');

      if (titleEl) titleEl.textContent = `${currentAdActiveSlide.icon} ${currentAdActiveSlide.title}`;
      if (descEl) descEl.textContent = currentAdActiveSlide.desc;
      if (progressFill) progressFill.style.width = '0%';

      adWatchSecondsLeft = 30; // 30 seconds ad watch
      isAdWatchPausedDueToTabSwitch = false;
      if (countdownEl) countdownEl.textContent = `Còn ${adWatchSecondsLeft}s`;
      if (claimBtn) {
        claimBtn.disabled = true;
        claimBtn.textContent = '⏳ Đang xem quảng cáo (30s)...';
        claimBtn.style.opacity = '0.5';
        claimBtn.style.cursor = 'not-allowed';
      }

      openModal('modal-rewarded-ad');
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {}

      // Start in-app non-overlapping ad cycle for the 30s session (NO DIRECT LINK / NO TAB SWITCH)
      startRewardedAdCycle();

      if (adWatchInterval) clearInterval(adWatchInterval);
      adWatchInterval = setInterval(() => {
        // ANTI-CHEAT: Check if window / tab is active and visible
        if (document.hidden || !document.hasFocus()) {
          isAdWatchPausedDueToTabSwitch = true;
          if (titleEl) titleEl.textContent = '⏸️ Quảng Cáo Đã Tạm Dừng';
          if (descEl) descEl.textContent = '⚠️ Bạn vừa chuyển tab/ứng dụng khác! Vui lòng giữ màn hình VocaFlow để tiếp tục xem.';
          if (countdownEl) countdownEl.textContent = `⏸️ Tạm dừng (Còn ${adWatchSecondsLeft}s)`;
          return; // Freeze timer
        }

        // Resume if returning to tab
        if (isAdWatchPausedDueToTabSwitch) {
          isAdWatchPausedDueToTabSwitch = false;
          if (titleEl && currentAdActiveSlide) titleEl.textContent = currentAdActiveSlide.title;
          if (descEl && currentAdActiveSlide) descEl.textContent = currentAdActiveSlide.desc;
        }

        adWatchSecondsLeft--;
        const progressPct = Math.round(((30 - adWatchSecondsLeft) / 30) * 100);
        if (progressFill) progressFill.style.width = `${progressPct}%`;
        if (countdownEl) countdownEl.textContent = adWatchSecondsLeft > 0 ? `Còn ${adWatchSecondsLeft}s` : '✓ Hoàn tất!';

        // Cycle ads: check if active ad was closed and trigger next cleanly (no stacking)
        checkAndCycleRewardedAds();

        if (adWatchSecondsLeft <= 0) {
          clearInterval(adWatchInterval);
          adWatchInterval = null;
          stopRewardedAdCycle();
          if (claimBtn) {
            claimBtn.disabled = false;
            claimBtn.textContent = '🎉 Nhận Thưởng (+1 VocaSpin)';
            claimBtn.style.opacity = '1';
            claimBtn.style.cursor = 'pointer';
          }
        }
      }, 1000);
    }

    function cancelRewardedAd() {
      if (adWatchInterval) {
        clearInterval(adWatchInterval);
        adWatchInterval = null;
      }
      stopRewardedAdCycle();
      isAdWatchPausedDueToTabSwitch = false;
      
      // Cancel Penalty: count as spent attempt and start cooldown immediately
      const nowTs = Date.now();
      localStorage.setItem('vocaflow_last_ad_watch_time', nowTs.toString());
      if (typeof patchInstantAdCooldownToCloud === 'function') patchInstantAdCooldownToCloud(nowTs);
      updateAdButtonCooldownState();
      updateShopBonusesUI();
      saveDatabase(true);
      if (typeof pushCurrentDatabaseToCloud === 'function') pushCurrentDatabaseToCloud();

      closeModal('modal-rewarded-ad');
      showToast('⏱️ Đã hủy xem quảng cáo. Thời gian chờ giãn cách 20 phút bắt đầu tính!');
    }

    function claimRewardedAdReward() {
      if (adWatchSecondsLeft > 0) return;
      stopRewardedAdCycle();

      // 1. Grant +1 Lucky Spin
      setLuckySpinsCount(getLuckySpinsCount() + 1);
      if (typeof recordAdWatched === 'function') recordAdWatched();

      // 2. Set ad cooldown
      const nowTs = Date.now();
      localStorage.setItem('vocaflow_last_ad_watch_time', nowTs.toString());
      if (typeof patchInstantAdCooldownToCloud === 'function') patchInstantAdCooldownToCloud(nowTs);

      // 3. Notification & sync (No 0 Xu ledger entry)
      if (typeof addNotification === 'function') {
        addNotification('STUDY', '🎬 Thưởng Xem Quảng Cáo', 'Bạn đã xem xong quảng cáo và nhận được +1 VocaSpin!');
      }
      saveDatabase(true);
      pushCurrentDatabaseToCloud();

      closeModal('modal-rewarded-ad');
      showToast('🎉 Nhận thưởng thành công: +1 VocaSpin!');
      updateEconomyUI();
      updateShopBonusesUI();
      openLuckyWheelModal();
    }

    // Cooldown ticker every 1 second
    setInterval(() => {
      updateAdButtonCooldownState();
    }, 1000);
