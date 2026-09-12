// =========================================================================

// VOCAFLOW 08-WALLET-ECONOMY.JS (v0.10.9-48)

// VoCoin wallet, Ledger, Flow streak calendar, Freeze protection & referral codes

// =========================================================================

    // =========================================================================
    // SPECIAL PROMOTION & EVENT DISCOUNT ENGINE (v0.10.8-alpha-10.3)
    // =========================================================================
    function getStoreActiveDiscount() {
      const now = new Date();
      const d = now.getDate();
      const m = now.getMonth() + 1;

      // 1. Creator Birthday: 10/08 -> EXACTLY 25% OFF
      if (d === 10 && m === 8) {
        return {
          isDiscountActive: true,
          discountPct: 25,
          discountRate: 0.25,
          eventName: '🎂 SIÊU SALE SINH NHẬT CREATOR (10/08)',
          badgeText: '🎂 SALE SINH NHẬT -25%',
          bannerText: '🎂 Chúc mừng Sinh Nhật Creator (10/08)! Siêu ưu đãi GIẢM NGAY 25% TOÀN BỘ CỬA HÀNG!'
        };
      }

      // 2. Double Days: 1/1, 2/2, 3/3, 4/4, 5/5, 6/6, 7/7, 8/8, 9/9, 10/10, 11/11, 12/12
      if (d === m) {
        const seedPct = 15 + ((d * 7 + m * 13) % 11); // 15..25%
        return {
          isDiscountActive: true,
          discountPct: seedPct,
          discountRate: seedPct / 100,
          eventName: `🔥 SIÊU SALE NGÀY ĐÔI ${d}/${m}`,
          badgeText: `🔥 SALE NGÀY ĐÔI -${seedPct}%`,
          bannerText: `🔥 Sự kiện Siêu Sale Ngày Đôi ${d}/${m}! Giảm giá ${seedPct}% toàn bộ Cửa Hàng VocaShop!`
        };
      }

      return {
        isDiscountActive: false,
        discountPct: 0,
        discountRate: 0,
        eventName: '',
        badgeText: '',
        bannerText: ''
      };
    }

    function applyStoreDiscountToPrice(originalPrice) {
      const discount = getStoreActiveDiscount();
      if (!discount.isDiscountActive) return originalPrice;
      const discounted = Math.round(originalPrice * (1 - discount.discountRate));
      return Math.max(1, discounted);
    }

    // =========================================================================
    // REAL-MONEY SPIN PURCHASE PAYMENT ENGINE (v0.10.8-alpha-10.3)
    // =========================================================================
    let currentSpinPurchasePack = { code: 'SPIN15', name: '15 VocaSpin', amount: 25000, spins: 15 };

    function openSpinPurchasePaymentModal(code, name, amount, spins) {
      const isGuest = !currentUser || !currentUser.email;
      const gView = document.getElementById('spin-guest-lock-view');
      const aView = document.getElementById('spin-main-authenticated-view');
      if (isGuest) {
        if (gView) gView.style.display = 'block';
        if (aView) aView.style.display = 'none';
        openModal('modal-spin-purchase-payment');
        return;
      }
      if (gView) gView.style.display = 'none';
      if (aView) aView.style.display = 'flex';

      const discount = getStoreActiveDiscount();
      const finalAmount = applyStoreDiscountToPrice(amount);
      currentSpinPurchasePack = { code, name, amount: finalAmount, spins };

      const nameEl = document.getElementById('spin-pay-pack-name');
      const amountEl = document.getElementById('spin-pay-amount-text');
      const syntaxEl = document.getElementById('spin-pay-syntax-code');
      const qrImgEl = document.getElementById('spin-pay-qr-img');

      if (nameEl) {
        nameEl.innerHTML = discount.isDiscountActive
          ? `${name} (<s style="opacity:0.65;">${amount.toLocaleString('vi-VN')}đ</s> <strong style="color:#ffd700;">${finalAmount.toLocaleString('vi-VN')}đ</strong>)`
          : `${name} (${amount.toLocaleString('vi-VN')}đ)`;
      }
      if (amountEl) amountEl.textContent = `${finalAmount.toLocaleString('vi-VN')}đ`;

      let rawUid = (currentUser && currentUser.uid) ? currentUser.uid : 'GUEST';
      const syntax = `VOCA ${getShortUidUpper(rawUid)} ${code}`;

      if (syntaxEl) syntaxEl.textContent = syntax;

      const encodedDesc = encodeURIComponent(syntax);
      const qrUrl = `https://img.vietqr.io/image/970422-0916541813-compact2.png?amount=${finalAmount}&addInfo=${encodedDesc}&accountName=NONG%20DUC%20HAO`;
      if (qrImgEl) qrImgEl.src = qrUrl;

      openModal('modal-spin-purchase-payment');
    }

    function copySpinPaySyntax() {
      const syntaxEl = document.getElementById('spin-pay-syntax-code');
      if (syntaxEl) {
        navigator.clipboard.writeText(syntaxEl.textContent.trim()).then(() => {
          showToast('📋 Đã sao chép nội dung chuyển khoản!');
        }).catch(() => {
          showToast('Nội dung: ' + syntaxEl.textContent.trim());
        });
      }
    }

    function copySpinPayField(val, label) {
      navigator.clipboard.writeText(val).then(() => {
        showToast(`📋 Đã sao chép ${label}: ${val}`);
      });
    }

    function confirmSpinTransferSent() {
      closeModal('modal-spin-purchase-payment');
      showToast('🎉 Đã ghi nhận thông tin chuyển khoản! Admin sẽ duyệt và cộng VocaSpin cho bạn ngay!');
      if (typeof addNotification === 'function') {
        addNotification('FINANCIAL', '💳 Yêu Cầu Mua VocaSpin', `Đã ghi nhận thanh toán gói ${currentSpinPurchasePack.name}. Hệ thống đang kiểm tra giao dịch.`);
      }
    }

    function triggerLuckyWheelSpin() {
      if (luckyWheelIsSpinning) return;

      const spins = getLuckySpinsCount();
      if (spins <= 0) {
        if (!isUserVip()) {
          showToast('🎬 Bạn đã hết VocaSpin! Hãy xem video 30s để nhận thêm VocaSpin ngay!');
          closeModal('modal-lucky-wheel');
          openRewardedAdModal();
        } else {
          showToast('⏳ Bạn đã dùng hết VocaSpin VocaVIP hôm nay. Hẹn gặp lại bạn vào ngày mai!');
        }
        return;
      }

      luckyWheelIsSpinning = true;
      setLuckySpinsCount(spins - 1);

      const wheel = document.getElementById('lucky-wheel-element');
      const resultBox = document.getElementById('lucky-wheel-result-box');
      if (resultBox) resultBox.innerHTML = '<span style="color:#38bdf8;">🔄 Đang quay... Chúc bạn may mắn!</span>';

      // 1. Pick winning index with adjusted Jackpot probability (v0.10.9-38)
      // VIP users: Jackpot rate is 6.25% (was 12.5%)
      // Regular users: Jackpot rate is 7% (when jackpot appears on wheel; wheel has 33.3% jackpot spawn rate)
      const isVip = isUserVip();
      const vipTargetRate = isVip ? 0.0625 : 0.07;
      const vipSliceIndex = currentActiveWheelSlices.findIndex(s => s.type === 'VIP' || s.id === 'vip_1d');

      let winningIndex = 0;
      if (vipSliceIndex >= 0) {
        if (Math.random() < vipTargetRate) {
          winningIndex = vipSliceIndex;
        } else {
          // Uniformly pick among the other 7 non-VIP slices
          const otherIndices = [];
          for (let i = 0; i < currentActiveWheelSlices.length; i++) {
            if (i !== vipSliceIndex) otherIndices.push(i);
          }
          winningIndex = (otherIndices.length > 0)
            ? otherIndices[Math.floor(Math.random() * otherIndices.length)]
            : 0;
        }
      } else {
        // No VIP slice on this wheel (regular user without jackpot) -> uniform 1/8 across all slices
        winningIndex = Math.floor(Math.random() * (currentActiveWheelSlices.length || 8));
      }

      const prize = currentActiveWheelSlices[winningIndex] || currentActiveWheelSlices[0];

      // 2. Calculate exact angle to place the winning slice directly under top needle (0 deg)
      // Center of winning slice is at: winningIndex * 45 + 22.5 deg
      const sliceCenterAngle = winningIndex * 45 + 22.5;
      const targetBaseRotation = (360 - sliceCenterAngle) % 360;
      const jitter = (Math.random() - 0.5) * 16; // Small jitter +/- 8 deg within slice

      const extraRounds = 5;
      const currentMod = ((luckyWheelCurrentRotation % 360) + 360) % 360;
      let diff = targetBaseRotation - currentMod;
      if (diff <= 0) diff += 360;

      luckyWheelCurrentRotation += (extraRounds * 360) + diff + jitter;

      if (wheel) {
        wheel.style.transform = `rotate(${luckyWheelCurrentRotation}deg)`;
      }

      setTimeout(() => {
        luckyWheelIsSpinning = false;

        // Apply prize reward
        let prizeMsg = '';
        if (prize.type === 'VIP') {
          const vipRes = grantVipOneDayBonus();
          prizeMsg = vipRes.isLifetime ? vipRes.message : `👑 GIẢI ĐỘC ĐẮC: +1 Ngày VocaVIP Hoàng Gia! (Đến ${vipRes.formatted})`;
          if (typeof addNotification === 'function') {
            addNotification('FINANCIAL', '👑 Trúng Giải Độc Đắc VocaVIP', prizeMsg);
          }
        } else if (prize.type === 'POINTS') {
          setUserPoints(getUserPoints() + prize.val);
          addLedgerEntry('LUCKY_WHEEL', prize.val, `🎁 Trúng ${prize.val} VoCoin từ VocaWheel`);
          prizeMsg = `🎉 Chúc mừng bạn đã trúng ${prize.val} VoCoin!`;
          saveDatabase(true);
          pushCurrentDatabaseToCloud();
        } else if (prize.type === 'HINTS') {
          setUserHints(getUserHints() + prize.val);
          if (typeof addNotification === 'function') {
            addNotification('STUDY', '💡 Trúng VocaHint', `Chúc mừng bạn đã trúng +${prize.val} VocaHint từ VocaWheel!`);
          }
          prizeMsg = `💡 Chúc mừng bạn đã trúng +${prize.val} VocaHint!`;
          saveDatabase(true);
          pushCurrentDatabaseToCloud();
        } else if (prize.type === 'SKIPS') {
          setUserSkips(getUserSkips() + prize.val);
          if (typeof addNotification === 'function') {
            addNotification('STUDY', '⏭️ Trúng VocaSkip', `Chúc mừng bạn đã trúng +${prize.val} VocaSkip từ VocaWheel!`);
          }
          prizeMsg = `⏭️ Chúc mừng bạn đã trúng +${prize.val} VocaSkip!`;
          saveDatabase(true);
          pushCurrentDatabaseToCloud();
        }

        if (resultBox) {
          resultBox.innerHTML = `<span style="color:#34d399;">${prizeMsg}</span>`;
        }
        showToast(prizeMsg);
        if (typeof recordLuckySpinExecuted === 'function') recordLuckySpinExecuted(prize);
        updateEconomyUI();
        updateShopBonusesUI();

        // Prepare fresh shuffled slices for the next spin
        setTimeout(() => {
          if (!luckyWheelIsSpinning) {
            prepareDynamicWheelSlices();
            renderWheelSlices();
            updateLuckyWheelUI();
          }
        }, 1200);
      }, 5000);
    }


    // =========================================================================
    // FLOW & FLOW FREEZE ENGINE (v0.10.8-alpha-10.16 - AUTO GAP FREEZE & VIP CAP)
    // =========================================================================
    function getMaxFlowFreezes() {
      return (typeof isUserVip === 'function' && isUserVip()) ? 7 : 3;
    }

    function getFlowDates() {
      try {
        return JSON.parse(localStorage.getItem('vocaflow_flow_dates') || localStorage.getItem('vocaflow_study_dates') || '[]');
      } catch (e) { return []; }
    }

    function getFlowFreezeDates() {
      try {
        return JSON.parse(localStorage.getItem('vocaflow_flow_freeze_dates') || localStorage.getItem('vocaflow_streak_freeze_history') || '[]');
      } catch (e) { return []; }
    }

    function getUserFlowFreezes() {
      const maxFreezes = getMaxFlowFreezes();
      const raw = localStorage.getItem('vocaflow_flow_freezes');
      if (raw !== null) {
        const parsed = parseInt(raw, 10);
        return Math.min(maxFreezes, Math.max(0, isNaN(parsed) ? 0 : parsed));
      }
      const rawLegacy = localStorage.getItem('vocaflow_streak_freezes');
      if (rawLegacy !== null) {
        const parsed = parseInt(rawLegacy, 10);
        return Math.min(maxFreezes, Math.max(0, isNaN(parsed) ? 0 : parsed));
      }
      return 1;
    }

    function setUserFlowFreezes(val) {
      const maxFreezes = getMaxFlowFreezes();
      const v = Math.min(maxFreezes, Math.max(0, parseInt(val, 10) || 0));
      localStorage.setItem('vocaflow_flow_freezes', v.toString());
      localStorage.setItem('vocaflow_streak_freezes', v.toString());
      updateFlowUI();
      saveDatabase(true);
      pushCurrentDatabaseToCloud();
    }

    // Self-healing: Restore wrongly deducted Flow Freeze (v0.10.9-alpha-23)
    function healErroneousFreezeDeduction() {
      const HEAL_KEY = 'vocaflow_freeze_healed_v0109a23';
      if (localStorage.getItem(HEAL_KEY)) return;
      try {
        const freezeDates = getFlowFreezeDates();
        let currentFreezes = getUserFlowFreezes();
        const maxCap = getMaxFlowFreezes();

        // If user's flow freezes were wiped out to 0 due to cross-device sync bug:
        if (currentFreezes === 0 && (freezeDates.length > 0 || isUserVip() || (currentUser && currentUser.email))) {
          currentFreezes = 1;
          setUserFlowFreezes(currentFreezes);
          addLedgerEntry('RECOVER_FLOW_FREEZE', 0, '❄️ Bồi hoàn +1 Flow Freeze bị trừ nhầm do lỗi đồng bộ (1/' + maxCap + ')');
          if (typeof showToast === 'function') {
            showToast('❄️ VocaFlow đã bồi hoàn +1 Flow Freeze bảo vệ chuỗi vào ví của bạn (Hiện có: 1/' + maxCap + ')!');
          }
          saveDatabase(true);
          pushCurrentDatabaseToCloud();
        }
      } catch (e) {
        console.warn('Freeze heal error:', e);
      } finally {
        localStorage.setItem(HEAL_KEY, 'true');
      }
    }

    // Auto-consumption of Flow Freeze when missed days occur (v0.10.8-alpha-10.16 / v0.10.9-alpha-6)
    function evaluateAndAutoApplyFlowFreezes() {
      let flowDates = getFlowDates();
      let freezeDates = getFlowFreezeDates();
      let currentFreezes = getUserFlowFreezes();

      if (currentFreezes <= 0) return false;

      const allActive = new Set([...flowDates, ...freezeDates]);
      if (allActive.size === 0) return false;

      let sortedDates = Array.from(allActive).sort();
      let earliestDateStr = sortedDates[0];

      let checkDate = new Date(getTrustedCurrentTimestamp());
      checkDate.setDate(checkDate.getDate() - 1); // Yesterday
      const yesterdayStr = formatLocalDateString(checkDate);

      // If yesterday is already active (studied or frozen), current active streak is NOT broken!
      if (allActive.has(yesterdayStr)) {
        return false;
      }

      // Yesterday was missed! Scan backward consecutive missed days
      let consecutiveMissedDays = [];
      let tempDate = new Date(checkDate);
      while (true) {
        const dStr = formatLocalDateString(tempDate);
        if (dStr < earliestDateStr) break;
        if (allActive.has(dStr)) break;
        consecutiveMissedDays.push(dStr);
        tempDate.setDate(tempDate.getDate() - 1);
        // Do not look back further than the number of freezes we currently hold
        if (consecutiveMissedDays.length > currentFreezes) break;
      }

      let appliedCount = 0;
      let appliedDatesList = [];

      // Only apply if the missed gap can be bridged by current freezes
      // AND there was activity before the gap (genuine streak protection)
      if (consecutiveMissedDays.length > 0 && consecutiveMissedDays.length <= currentFreezes) {
        const earliestMissed = consecutiveMissedDays[consecutiveMissedDays.length - 1];
        let hasPrior = false;
        for (const act of allActive) {
          if (act < earliestMissed) {
            hasPrior = true;
            break;
          }
        }

        if (hasPrior) {
          for (const dStr of consecutiveMissedDays) {
            currentFreezes--;
            freezeDates.push(dStr);
            allActive.add(dStr);
            appliedCount++;
            appliedDatesList.push(dStr);
          }
        }
      }

      if (appliedCount > 0) {
        freezeDates.sort();
        localStorage.setItem('vocaflow_flow_freeze_dates', JSON.stringify(freezeDates));
        localStorage.setItem('vocaflow_streak_freeze_history', JSON.stringify(freezeDates));
        localStorage.setItem('vocaflow_flow_freezes', currentFreezes.toString());
        localStorage.setItem('vocaflow_streak_freezes', currentFreezes.toString());

        saveDatabase(true);
        pushCurrentDatabaseToCloud();
        updateFlowUI();
        if (typeof renderFlowCalendar === 'function') renderFlowCalendar();

        const dateLabels = appliedDatesList.map(d => {
          const parts = d.split('-');
          return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
        }).reverse().join(', ');

        showToast(`❄️ Đã tự động kích hoạt ${appliedCount} Flow Freeze bảo vệ chuỗi ngày học (${dateLabels})! (Còn ${currentFreezes}/${getMaxFlowFreezes()} lượt)`);
        return true;
      }

      return false;
    }

    function calculateCurrentFlow() {
      // Auto apply Flow Freezes to bridge gaps if user missed days
      evaluateAndAutoApplyFlowFreezes();

      const dates = getFlowDates();
      const freezes = getFlowFreezeDates();
      if (dates.length === 0 && freezes.length === 0) return { currentFlow: 0, pureFlow: 0, maxFlow: 0 };

      const trustedNow = getTrustedCurrentTimestamp();
      const todayStr = formatLocalDateString(new Date(trustedNow));
      let checkDate = new Date(trustedNow);
      let currentFlow = 0;
      let pureFlow = 0;

      const todayIncluded = dates.includes(todayStr) || freezes.includes(todayStr);
      if (!todayIncluded) {
        checkDate.setDate(checkDate.getDate() - 1);
      }

      for (let i = 0; i < 365; i++) {
        const dStr = formatLocalDateString(checkDate);
        if (dates.includes(dStr)) {
          currentFlow++;
          pureFlow++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (freezes.includes(dStr)) {
          // Flow Freeze protects and bridges the continuous streak, but DOES NOT add to currentFlow!
          pureFlow = 0;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      let maxFlow = parseInt(localStorage.getItem('vocaflow_flow_max') || '0', 10);
      if (currentFlow > maxFlow) {
        maxFlow = currentFlow;
        localStorage.setItem('vocaflow_flow_max', maxFlow.toString());
      }

      localStorage.setItem('vocaflow_flow_days', currentFlow.toString());
      localStorage.setItem('vocaflow_streak_days', currentFlow.toString());
      localStorage.setItem('vocaflow_pure_streak_days', pureFlow.toString());
      return { currentFlow, pureFlow, maxFlow };
    }

    function recordStudyFlowAction(actionType = 'study') {
      const todayStr = formatLocalDateString(new Date(getTrustedCurrentTimestamp()));

      // Anti-cheat: check if clock was rolled back
      const maxObservedDate = localStorage.getItem(STORAGE_KEY_MAX_OBSERVED_DATE) || '';
      if (maxObservedDate && todayStr < maxObservedDate) {
        showToast('⚠️ Đồng hồ thiết bị đang ở quá khứ so với lịch sử học (' + todayStr + ' < ' + maxObservedDate + ')! Vui lòng chỉnh đúng ngày giờ.');
        return;
      }
      if (isSystemClockManipulatedBackward()) {
        showToast('⚠️ Phát hiện đồng hồ hệ thống bị chỉnh lùi! Vui lòng chỉnh đúng ngày giờ chuẩn để tiếp tục tích lũy Flow.');
        return;
      }

      let dates = getFlowDates();
      let isNewDay = false;

      if (!dates.includes(todayStr)) {
        dates.push(todayStr);
        if (dates.length > 365) dates = dates.slice(-365);
        localStorage.setItem('vocaflow_flow_dates', JSON.stringify(dates));
        localStorage.setItem('vocaflow_study_dates', JSON.stringify(dates));
        isNewDay = true;
      }

      const { currentFlow, pureFlow } = calculateCurrentFlow();
      updateFlowUI();

      // Check Cú Đêm (00:00 - 04:00) & Kỷ Luật Thép (05:00 - 06:00)
      const now = new Date();
      const hour = now.getHours();
      if (hour >= 0 && hour < 4) {
        if (typeof checkAndUnlockAchievement === 'function') checkAndUnlockAchievement('secret_night_owl');
      }
      if (hour >= 5 && hour < 6) {
        if (typeof checkAndUnlockAchievement === 'function') checkAndUnlockAchievement('secret_early_bird');
      }

      // Check Bất Tử (30 ngày pure streak)
      if (typeof updateAchievementProgress === 'function') {
        updateAchievementProgress('secret_immortal_streak_30', pureFlow);
      }
      if (pureFlow >= 30) {
        if (typeof checkAndUnlockAchievement === 'function') checkAndUnlockAchievement('secret_immortal_streak_30');
      }

      if (isNewDay) {
        const milestones = [7, 30, 100, 200, 365];
        if (milestones.includes(currentFlow) && typeof autoPostMilestoneToCommunity === 'function') {
          autoPostMilestoneToCommunity('flow_streak', { days: currentFlow });
        }
        saveDatabase(true);
        pushCurrentDatabaseToCloud();
      }
    }

    function buyFlowFreezeItem() {
      if (!currentUser || !currentUser.email) {
        alert('🔒 Vui lòng đăng nhập tài khoản để mua Flow Freeze!');
        closeModal('modal-shop');
        openAuthModal('login');
        return;
      }

      const maxFreezes = getMaxFlowFreezes();
      const currentFreezes = getUserFlowFreezes();

      if (currentFreezes >= maxFreezes) {
        alert(`⚠️ Bạn đã tích trữ tối đa ${maxFreezes}/${maxFreezes} FlowFreeze!\n\n${!isUserVip() ? '👑 Hãy nâng cấp VocaVIP để mở rộng sức chứa lên tối đa 7 FlowFreeze (bảo vệ chuỗi nghỉ liên tục 7 ngày)!' : 'Hãy sử dụng bớt khi cần thiết trước khi mua thêm nhé.'}`);
        return;
      }

      const costPoints = applyStoreDiscountToPrice(200);
      const currentPoints = getUserPoints();

      if (currentPoints < costPoints) {
        alert(`⚠️ Số VoCoin trong ví của bạn (${currentPoints} VoCoin) không đủ để mua FlowFreeze (${costPoints} VoCoin)!\n\nHãy hoàn thành các bài học hoặc làm Quiz để tích lũy thêm VoCoin nhé.`);
        return;
      }

      setUserPoints(currentPoints - costPoints);
      const newFreezes = Math.min(maxFreezes, currentFreezes + 1);
      setUserFlowFreezes(newFreezes);

      addLedgerEntry('BUY_FLOW_FREEZE', -costPoints, `Mua +1 Flow Freeze (Đóng Băng Dòng Chảy) trong VocaShop (${newFreezes}/${maxFreezes})`);
      showToast(`❄️ Đã mua thành công +1 Flow Freeze! (Hiện có: ${newFreezes}/${maxFreezes})`);
      updateEconomyUI();
      updateFlowUI();
      saveDatabase(true);
      pushCurrentDatabaseToCloud();
    }

    function updateFlowUI() {
      const { currentFlow, maxFlow } = calculateCurrentFlow();
      const freezes = getUserFlowFreezes();
      const maxFreezes = getMaxFlowFreezes();

      const headerFlow = document.getElementById('header-flow-count');
      if (headerFlow) headerFlow.textContent = currentFlow;

      const profFlow = document.getElementById('profile-flow-count');
      if (profFlow) profFlow.textContent = currentFlow;

      const calCurrent = document.getElementById('flow-cal-stat-current');
      if (calCurrent) calCurrent.textContent = `${currentFlow} Ngày`;

      const calMax = document.getElementById('flow-cal-stat-max');
      if (calMax) calMax.textContent = `${maxFlow} Ngày`;

      const calFreezes = document.getElementById('flow-cal-stat-freezes');
      if (calFreezes) calFreezes.textContent = `${freezes}/${maxFreezes}`;

      const shopFreezes = document.getElementById('shop-user-freezes');
      if (shopFreezes) shopFreezes.textContent = `${freezes}/${maxFreezes}`;

      const capBadge = document.getElementById('shop-flow-freeze-cap-badge');
      if (capBadge) capBadge.textContent = (typeof isUserVip === 'function' && isUserVip()) ? '👑 VIP: Tối đa 7 lượt' : 'Tối đa: 3 lượt';

      const ownedBadge = document.getElementById('shop-freeze-owned-badge');
      if (ownedBadge) ownedBadge.textContent = `Đang có: ${freezes}/${maxFreezes}`;

      const buyBtn = document.getElementById('btn-shop-buy-freeze');
      if (buyBtn) {
        if (freezes >= maxFreezes) {
          buyBtn.textContent = 'Đã Đầy';
          buyBtn.disabled = true;
          buyBtn.style.opacity = '0.5';
        } else {
          buyBtn.textContent = 'Mua (200đ)';
          buyBtn.disabled = false;
          buyBtn.style.opacity = '1';
        }
      }
    }

    function openFlowCalendarModal() {
      if (!currentUser || !currentUser.email) {
        openGuestFeatureLockModal('Dòng Chảy Học Tập', 'Dòng Chảy Học Tập (Flow), Lịch Chuỗi Ngày Học, Đóng Băng Chuỗi & Nhận Thưởng', '🌊 🔒');
        return;
      }
      currentFlowCalendarMonthOffset = 0;
      renderFlowCalendar();
      if (typeof render7DayPerformanceChart === 'function') {
        render7DayPerformanceChart('flow-calendar-7day-chart-container');
      }
      openModal('modal-flow-calendar');
    }
    window.openFlowCalendarModal = openFlowCalendarModal;

    function changeFlowCalendarMonth(delta) {
      currentFlowCalendarMonthOffset += delta;
      if (currentFlowCalendarMonthOffset > 0) currentFlowCalendarMonthOffset = 0;
      renderFlowCalendar();
    }

    function renderFlowCalendar() {
      const grid = document.getElementById('flow-calendar-grid');
      const title = document.getElementById('flow-calendar-month-title');
      const btnNext = document.getElementById('btn-flow-cal-next');
      if (!grid || !title) return;

      const flowDates = getFlowDates();
      const freezeDates = getFlowFreezeDates();
      const today = new Date();
      const todayStr = formatLocalDateString(today);

      const viewDate = new Date(today.getFullYear(), today.getMonth() + currentFlowCalendarMonthOffset, 1);
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();

      title.textContent = `Tháng ${month + 1} / ${year}`;
      if (btnNext) btnNext.disabled = (currentFlowCalendarMonthOffset >= 0);

      const firstDay = new Date(year, month, 1).getDay();
      const startDayIdx = (firstDay + 6) % 7; // Monday = 0, Sunday = 6
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      let html = '';
      for (let i = 0; i < startDayIdx; i++) {
        html += '<div style="opacity: 0.15; padding: 4px; text-align: center;"></div>';
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const cellIdx = startDayIdx + d - 1;
        const colIdx = cellIdx % 7; // 0 = Mon, 6 = Sun
        const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        
        const hasFlow = flowDates.includes(dStr);
        const hasFreeze = freezeDates.includes(dStr);
        const isActive = hasFlow || hasFreeze;
        const isToday = (dStr === todayStr);

        // Check horizontal connections in the same week row
        const prevDStr = (d > 1) ? `${year}-${String(month + 1).padStart(2, '0')}-${String(d - 1).padStart(2, '0')}` : null;
        const hasPrevActiveInRow = (isActive && colIdx > 0 && prevDStr && (flowDates.includes(prevDStr) || freezeDates.includes(prevDStr)));

        const nextDStr = (d < daysInMonth) ? `${year}-${String(month + 1).padStart(2, '0')}-${String(d + 1).padStart(2, '0')}` : null;
        const hasNextActiveInRow = (isActive && colIdx < 6 && nextDStr && (flowDates.includes(nextDStr) || freezeDates.includes(nextDStr)));

        // Base cell styles
        let cellStyle = 'position: relative; aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: all 0.2s; box-sizing: border-box;';
        let connectorLeftHtml = '';
        let connectorRightHtml = '';
        let iconHtml = '';
        let numberHtml = '';

        if (isActive) {
          // Connected border radius styling
          if (hasPrevActiveInRow && hasNextActiveInRow) {
            cellStyle += ' border-radius: 4px;';
          } else if (hasPrevActiveInRow) {
            cellStyle += ' border-top-left-radius: 4px; border-bottom-left-radius: 4px; border-top-right-radius: 12px; border-bottom-right-radius: 12px;';
          } else if (hasNextActiveInRow) {
            cellStyle += ' border-top-right-radius: 4px; border-bottom-right-radius: 4px; border-top-left-radius: 12px; border-bottom-left-radius: 12px;';
          } else {
            cellStyle += ' border-radius: 12px;';
          }

          if (hasFlow) {
            cellStyle += ' background: linear-gradient(135deg, rgba(6,182,212,0.4), rgba(59,130,246,0.4)); border: 1.5px solid #22d3ee; box-shadow: 0 0 14px rgba(6,182,212,0.5);';
            iconHtml = `<img src="${FLOW_ICON_DATA_URI}" alt="Flow" style="width: 44px; height: 44px; max-width: 85%; max-height: 85%; object-fit: contain; z-index: 3; filter: drop-shadow(0 3px 12px rgba(6,182,212,0.85));">`;
            numberHtml = `<span style="position: absolute; top: 2px; left: 4px; font-size: 9px; font-weight: 800; color: #a5f3fc; opacity: 0.9; line-height: 1; z-index: 4; text-shadow: 0 1px 3px rgba(0,0,0,0.9);">${d}</span>`;
          } else if (hasFreeze) {
            cellStyle += ' background: linear-gradient(135deg, rgba(56,189,248,0.35), rgba(147,197,253,0.35)); border: 1.5px dashed #38bdf8; box-shadow: 0 0 14px rgba(56,189,248,0.5);';
            iconHtml = `<img src="${FREEZE_ICON_DATA_URI}" alt="Freeze" style="width: 44px; height: 44px; max-width: 85%; max-height: 85%; object-fit: contain; z-index: 3; filter: drop-shadow(0 3px 12px rgba(56,189,248,0.85));">`;
            numberHtml = `<span style="position: absolute; top: 2px; left: 4px; font-size: 9px; font-weight: 800; color: #bae6fd; opacity: 0.9; line-height: 1; z-index: 4; text-shadow: 0 1px 3px rgba(0,0,0,0.9);">${d}</span>`;
          }

          // Horizontal Connecting Path Lines (Dynamic Water Wave Flow - model2.txt)
          if (hasPrevActiveInRow) {
            connectorLeftHtml = '<div class="flow-wave-connector" style="left: -8px; right: 50%;"></div>';
          }
          if (hasNextActiveInRow) {
            connectorRightHtml = '<div class="flow-wave-connector" style="left: 50%; right: -8px;"></div>';
          }
        } else {
          cellStyle += ' border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); color: var(--text-muted); opacity: 0.65;';
          numberHtml = `<span style="font-size: 13px; font-weight: 600;">${d}</span>`;
        }

        // Today highlight outline
        if (isToday) {
          cellStyle += ' outline: 2.5px solid #ffd700; outline-offset: 1px; font-weight: 900; z-index: 5; box-shadow: 0 0 14px rgba(255,215,0,0.55);';
        }

        html += `
          <div style="${cellStyle}" title="${dStr}${isToday ? ' (Hôm nay)' : ''}${hasFlow ? ' • Đã mở Dòng Chảy (Flow 🌊)' : (hasFreeze ? ' • Đóng Băng Bảo Vệ (Flow Freeze ❄️)' : '')}">
            ${connectorLeftHtml}
            ${connectorRightHtml}
            ${numberHtml}
            ${iconHtml}
          </div>
        `;
      }

      grid.innerHTML = html;
      updateFlowUI();
    }

    function recordLessonCompleted(mode) {
      if (!currentUser || !currentUser.email) return;

      if (!userAchievements['first_lesson']) {
        userAchievements['first_lesson'] = { unlocked: false, progress: 0, unlockedAt: null, claimedReward: false };
      }
      userAchievements['first_lesson'].progress = 1;
      checkAndUnlockAchievement('first_lesson');

      if (mode === 'quiz') {
        if (!userAchievements['first_quiz']) userAchievements['first_quiz'] = { unlocked: false, progress: 0, unlockedAt: null, claimedReward: false };
        userAchievements['first_quiz'].progress = 1;
        checkAndUnlockAchievement('first_quiz');
      } else if (mode === 'spelling') {
        if (!userAchievements['first_spelling']) userAchievements['first_spelling'] = { unlocked: false, progress: 0, unlockedAt: null, claimedReward: false };
        userAchievements['first_spelling'].progress = 1;
        checkAndUnlockAchievement('first_spelling');
      } else if (mode === 'speaking') {
        if (!userAchievements['first_speaking']) userAchievements['first_speaking'] = { unlocked: false, progress: 0, unlockedAt: null, claimedReward: false };
        userAchievements['first_speaking'].progress = 1;
        checkAndUnlockAchievement('first_speaking');
      }

      recordStudyFlowAction(mode);
      checkMasteryAchievements();
      checkSrsStreakAchievement();
      checkCreatorAndFinanceAchievements();
    }

    function recordAiChatUsed() {
      if (!currentUser || !currentUser.email) return;

      if (!userAchievements['first_ai_chat']) {
        userAchievements['first_ai_chat'] = { unlocked: false, progress: 0, unlockedAt: null, claimedReward: false };
      }
      userAchievements['first_ai_chat'].progress = 1;
      checkAndUnlockAchievement('first_ai_chat');
    }

    function checkMasteryAchievements() {
      if (!currentUser || !currentUser.email) return;

      const distinctCount = getUniqueMasteredTermsCount();
      const masteryTiers = [
        { id: 'mastery_10', target: 10 },
        { id: 'mastery_50', target: 50 },
        { id: 'mastery_200', target: 200 },
        { id: 'mastery_500', target: 500 },
        { id: 'mastery_1000', target: 1000 }
      ];

      masteryTiers.forEach(t => {
        if (!userAchievements[t.id]) {
          userAchievements[t.id] = { unlocked: false, progress: 0, unlockedAt: null, claimedReward: false };
        }
        userAchievements[t.id].progress = Math.min(t.target, distinctCount);
        if (distinctCount >= t.target) {
          checkAndUnlockAchievement(t.id);
        }
      });
      saveAchievementsState();
    }

    function checkSrsStreakAchievement() {
      if (!currentUser || !currentUser.email) return;

      const dueCount = typeof getSrsDueWordsCount === 'function' ? getSrsDueWordsCount() : 0;
      const todayStr = formatLocalDateString(new Date());
      
      let clearHistory = [];
      try {
        clearHistory = JSON.parse(localStorage.getItem('vocaflow_srs_clear_dates') || '[]');
      } catch (e) { clearHistory = []; }

      if (dueCount === 0) {
        if (!clearHistory.includes(todayStr)) {
          clearHistory.push(todayStr);
          if (clearHistory.length > 30) clearHistory = clearHistory.slice(-30);
          localStorage.setItem('vocaflow_srs_clear_dates', JSON.stringify(clearHistory));
        }
      }

      let streak = 0;
      let checkDate = new Date();
      for (let i = 0; i < 30; i++) {
        const dStr = formatLocalDateString(checkDate);
        if (clearHistory.includes(dStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      if (!userAchievements['srs_streak_7']) {
        userAchievements['srs_streak_7'] = { unlocked: false, progress: 0, unlockedAt: null, claimedReward: false };
      }
      userAchievements['srs_streak_7'].progress = Math.min(7, streak);
      if (streak >= 7) {
        checkAndUnlockAchievement('srs_streak_7');
      }
      saveAchievementsState();
    }

    function recordLuckySpinExecuted(prize) {
      if (!currentUser || !currentUser.email) return;

      let totalSpins = parseInt(localStorage.getItem('vocaflow_total_spins_count') || '0', 10) + 1;
      localStorage.setItem('vocaflow_total_spins_count', totalSpins.toString());
      updateAchievementProgress('luck_spin_10', totalSpins);

      if (prize && prize.type === 'VIP') {
        let totalVipWins = parseInt(localStorage.getItem('vocaflow_vip_jackpot_wins') || '0', 10) + 1;
        localStorage.setItem('vocaflow_vip_jackpot_wins', totalVipWins.toString());
        updateAchievementProgress('luck_vip_jackpot_3', totalVipWins);

        let vipStreak = parseInt(localStorage.getItem('vocaflow_vip_jackpot_streak') || '0', 10) + 1;
        localStorage.setItem('vocaflow_vip_jackpot_streak', vipStreak.toString());
        updateAchievementProgress('luck_vip_jackpot_streak_3', vipStreak);

        localStorage.setItem('vocaflow_lowest_prize_streak', '0');
      } else {
        localStorage.setItem('vocaflow_vip_jackpot_streak', '0');
      }

      const isLowest = prize && ((prize.type === 'POINTS' && prize.val <= 50) || (prize.type === 'SKIPS' && prize.val <= 1));
      if (isLowest) {
        let unluckyStreak = parseInt(localStorage.getItem('vocaflow_lowest_prize_streak') || '0', 10) + 1;
        localStorage.setItem('vocaflow_lowest_prize_streak', unluckyStreak.toString());
        updateAchievementProgress('luck_unlucky_streak_3', unluckyStreak);
      } else if (prize && prize.type !== 'VIP') {
        localStorage.setItem('vocaflow_lowest_prize_streak', '0');
      }
    }

    function recordAdWatched() {
      if (!currentUser || !currentUser.email) return;

      let totalAds = parseInt(localStorage.getItem('vocaflow_total_ad_watches') || '0', 10) + 1;
      localStorage.setItem('vocaflow_total_ad_watches', totalAds.toString());
      updateAchievementProgress('luck_ads_30', totalAds);
    }

    function checkCreatorAndFinanceAchievements() {
      if (!currentUser || !currentUser.email) return;

      const allDecks = typeof getAllLibraryDecks === 'function' ? getAllLibraryDecks() : (cloudLibraryDecks || []);
      if (currentUser && currentUser.uid) {
        const myDecks = allDecks.filter(d => d.authorUid === currentUser.uid || (currentUser.displayName && d.author === currentUser.displayName));
        if (myDecks.length >= 1) {
          checkAndUnlockAchievement('creator_first_publish');
        }
        
        const totalSales = myDecks.reduce((sum, d) => sum + (d.salesCount || d.downloadsCount || d.clonesCount || 0), 0);
        updateAchievementProgress('creator_sell_5_decks', totalSales);

        const hasPerfectDeck = myDecks.some(d => (d.rating >= 4.95) && ((d.ratingCount || d.reviewsCount || 0) >= 10));
        if (hasPerfectDeck) {
          checkAndUnlockAchievement('creator_perfect_rating_deck');
        }
      }

      let buyCount = parseInt(localStorage.getItem('vocaflow_purchased_decks_count') || '0', 10);
      updateAchievementProgress('creator_buy_5_decks', buyCount);

      let followerCount = 0;
      if (typeof myFollowersMap !== 'undefined' && myFollowersMap && typeof myFollowersMap === 'object') {
        followerCount = Object.keys(myFollowersMap).length;
      } else if (currentUser && typeof currentUser.followerCount === 'number') {
        followerCount = currentUser.followerCount;
      }
      updateAchievementProgress('community_followers_20', followerCount);
      updateAchievementProgress('community_followers_50', followerCount);

      let refCount = 0;
      try {
        const refStats = JSON.parse(localStorage.getItem('vocaflow_referral_stats') || '{}');
        refCount = refStats.totalInvited || parseInt(localStorage.getItem('vocaflow_referral_invited_count') || '0', 10);
      } catch (e) {}
      updateAchievementProgress('referral_invited_3', refCount);

      let studyPtsEarned = parseInt(localStorage.getItem('vocaflow_study_pts_earned_total') || '0', 10);
      updateAchievementProgress('finance_earned_study_1000', studyPtsEarned);

      const currentWallet = getUserPoints();
      updateAchievementProgress('finance_wallet_balance_5000', currentWallet);

      if (typeof isUserVip === 'function' && isUserVip()) {
        checkAndUnlockAchievement('vip_membership_activated');
      }

      let bugCount = currentUser?.bugBountyApprovedCount || parseInt(localStorage.getItem('vocaflow_bug_bounty_approved_count') || '0', 10);
      updateAchievementProgress('bug_bounty_approved_1', bugCount);
      updateAchievementProgress('bug_bounty_approved_5', bugCount);
      updateAchievementProgress('bug_bounty_approved_10', bugCount);
      updateAchievementProgress('bug_bounty_approved_20', bugCount);
    }

    function togglePinBadge(badgeId) {
      if (!currentUser || !currentUser.email) {
        openAchievementsModal();
        return;
      }

      const badgeDef = ACHIEVEMENTS_REGISTRY[badgeId];
      if (!badgeDef) return;

      const userAch = userAchievements[badgeId];
      if (!userAch || !userAch.unlocked) {
        showToast('🔒 Bạn chưa mở khóa huy hiệu này!');
        return;
      }

      const existingIndex = userPinnedBadges.indexOf(badgeId);
      if (existingIndex >= 0) {
        userPinnedBadges.splice(existingIndex, 1);
        saveAchievementsState();
        renderAchievementsList();
        renderProfilePinnedBadges();
        showToast(`📌 Đã bỏ ghim danh hiệu "${badgeDef.name}"!`);
      } else {
        if (userPinnedBadges.length >= 3) {
          alert('⚠️ Bạn chỉ có thể ghim tối đa 3 danh hiệu lên hồ sơ! Hãy bỏ ghim bớt 1 danh hiệu trước nhé.');
          return;
        }
        userPinnedBadges.push(badgeId);
        saveAchievementsState();
        renderAchievementsList();
        renderProfilePinnedBadges();
        playVocaSfx('success');
        showToast(`⭐ Đã ghim danh hiệu "${badgeDef.icon} ${badgeDef.name}" lên hồ sơ!`);
      }
    }

    function openAchievementsModal() {
      const isGuest = !currentUser || !currentUser.email;
      const guestView = document.getElementById('achievements-guest-lock-view');
      const mainView = document.getElementById('achievements-main-view');

      if (isGuest) {
        if (guestView) guestView.style.display = 'flex';
        if (mainView) mainView.style.display = 'none';
        openModal('modal-achievements');
        return;
      }

      if (guestView) guestView.style.display = 'none';
      if (mainView) mainView.style.display = 'flex';

      checkMasteryAchievements();
      checkSrsStreakAchievement();
      checkCreatorAndFinanceAchievements();
      filterAchievementsTab(currentAchievementsTab || 'all');
      filterAchievementsTier(currentAchievementsTier || 'all');
      renderAchievementsList();
      openModal('modal-achievements');
    }

    function filterAchievementsTab(tab) {
      currentAchievementsTab = tab;
      const tabKeys = ['all', 'starter', 'mastery', 'skill', 'luck', 'creator', 'finance', 'easter_egg', 'unlocked'];
      tabKeys.forEach(t => {
        const btn = document.getElementById('btn-achieve-tab-' + t);
        if (!btn) return;
        if (t === tab) {
          btn.className = 'btn btn-sm btn-primary';
          btn.style.cssText = 'font-size: 12px; padding: 5px 12px; border-radius: 8px; font-weight: 700; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; color: #fff; box-shadow: 0 3px 10px rgba(99,102,241,0.4); white-space: nowrap; flex-shrink: 0;';
        } else {
          btn.className = 'btn btn-sm btn-outline';
          btn.style.cssText = 'font-size: 12px; padding: 5px 12px; border-radius: 8px; font-weight: 600; background: rgba(255,255,255,0.04); border: 1px solid var(--border); color: var(--text-muted); white-space: nowrap; flex-shrink: 0;';
        }
      });
      renderAchievementsList();
    }

    function filterAchievementsTier(tier) {
      currentAchievementsTier = tier;
      const tierStyles = {
        all: {
          activeBg: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          activeColor: '#ffffff',
          activeGlow: '0 3px 10px rgba(99,102,241,0.4)',
          inactiveBg: 'rgba(255,255,255,0.04)',
          inactiveColor: 'var(--text-muted)',
          inactiveBorder: 'var(--border)'
        },
        bronze: {
          activeBg: 'linear-gradient(135deg, #cd7f32, #a0522d)',
          activeColor: '#ffffff',
          activeGlow: '0 3px 10px rgba(205,127,50,0.4)',
          inactiveBg: 'rgba(205,127,50,0.08)',
          inactiveColor: '#cd7f32',
          inactiveBorder: 'rgba(205,127,50,0.35)'
        },
        silver: {
          activeBg: 'linear-gradient(135deg, #94a3b8, #64748b)',
          activeColor: '#ffffff',
          activeGlow: '0 3px 10px rgba(148,163,184,0.4)',
          inactiveBg: 'rgba(148,163,184,0.08)',
          inactiveColor: '#94a3b8',
          inactiveBorder: 'rgba(148,163,184,0.35)'
        },
        gold: {
          activeBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
          activeColor: '#ffffff',
          activeGlow: '0 3px 10px rgba(245,158,11,0.4)',
          inactiveBg: 'rgba(245,158,11,0.08)',
          inactiveColor: '#f59e0b',
          inactiveBorder: 'rgba(245,158,11,0.35)'
        },
        diamond: {
          activeBg: 'linear-gradient(135deg, #38bdf8, #0284c7)',
          activeColor: '#ffffff',
          activeGlow: '0 3px 10px rgba(56,189,248,0.4)',
          inactiveBg: 'rgba(56,189,248,0.08)',
          inactiveColor: '#38bdf8',
          inactiveBorder: 'rgba(56,189,248,0.35)'
        },
        mythic: {
          activeBg: 'linear-gradient(135deg, #ec4899, #db2777)',
          activeColor: '#ffffff',
          activeGlow: '0 3px 10px rgba(236,72,153,0.4)',
          inactiveBg: 'rgba(236,72,153,0.08)',
          inactiveColor: '#ec4899',
          inactiveBorder: 'rgba(236,72,153,0.35)'
        }
      };

      const tierKeys = ['all', 'bronze', 'silver', 'gold', 'diamond', 'mythic'];
      tierKeys.forEach(t => {
        const btn = document.getElementById('btn-achieve-tier-' + t);
        if (!btn) return;
        const cfg = tierStyles[t] || tierStyles.all;
        if (t === tier) {
          btn.className = 'btn btn-sm btn-primary';
          btn.style.cssText = `font-size: 11.5px; padding: 4px 11px; border-radius: 8px; font-weight: 700; background: ${cfg.activeBg}; border: none; color: ${cfg.activeColor}; box-shadow: ${cfg.activeGlow}; white-space: nowrap; flex-shrink: 0;`;
        } else {
          btn.className = 'btn btn-sm btn-outline';
          btn.style.cssText = `font-size: 11.5px; padding: 4px 11px; border-radius: 8px; font-weight: 600; background: ${cfg.inactiveBg}; border: 1px solid ${cfg.inactiveBorder}; color: ${cfg.inactiveColor}; white-space: nowrap; flex-shrink: 0;`;
        }
      });
      renderAchievementsList();
    }

    function renderAchievementsList() {
      const container = document.getElementById('achievements-list-container');
      const statUnlocked = document.getElementById('achieve-stat-unlocked');
      const statCoins = document.getElementById('achieve-stat-coins');
      const statPinned = document.getElementById('achieve-stat-pinned');

      const allIds = Object.keys(ACHIEVEMENTS_REGISTRY);
      const unlockedList = allIds.filter(id => userAchievements[id] && userAchievements[id].unlocked);
      
      let totalCoinsClaimed = 0;
      unlockedList.forEach(id => {
        if (userAchievements[id] && userAchievements[id].claimedReward) {
          totalCoinsClaimed += (ACHIEVEMENTS_REGISTRY[id].pointsReward || 0);
        }
      });

      if (statUnlocked) statUnlocked.textContent = `${unlockedList.length} / ${allIds.length}`;
      if (statCoins) statCoins.textContent = `+${totalCoinsClaimed} VoCoin`;
      if (statPinned) statPinned.textContent = `${userPinnedBadges.length} / 3`;

      if (!container) return;

      let filteredIds = allIds;
      // 1. Filter by Category
      if (currentAchievementsTab === 'starter') {
        filteredIds = filteredIds.filter(id => ACHIEVEMENTS_REGISTRY[id].group === 'starter');
      } else if (currentAchievementsTab === 'mastery') {
        filteredIds = filteredIds.filter(id => ACHIEVEMENTS_REGISTRY[id].group === 'mastery');
      } else if (currentAchievementsTab === 'skill') {
        filteredIds = filteredIds.filter(id => ACHIEVEMENTS_REGISTRY[id].group === 'skill');
      } else if (currentAchievementsTab === 'luck') {
        filteredIds = filteredIds.filter(id => ACHIEVEMENTS_REGISTRY[id].group === 'luck');
      } else if (currentAchievementsTab === 'creator') {
        filteredIds = filteredIds.filter(id => ACHIEVEMENTS_REGISTRY[id].group === 'creator');
      } else if (currentAchievementsTab === 'finance') {
        filteredIds = filteredIds.filter(id => ACHIEVEMENTS_REGISTRY[id].group === 'finance');
      } else if (currentAchievementsTab === 'easter_egg') {
        filteredIds = filteredIds.filter(id => ACHIEVEMENTS_REGISTRY[id].group === 'easter_egg');
      } else if (currentAchievementsTab === 'unlocked') {
        filteredIds = filteredIds.filter(id => unlockedList.includes(id));
      }

      // 2. Filter by Rarity / Tier
      if (currentAchievementsTier !== 'all') {
        filteredIds = filteredIds.filter(id => ACHIEVEMENTS_REGISTRY[id].tier === currentAchievementsTier);
      }

      if (filteredIds.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 12.5px;">Chưa có thành tựu nào khớp với bộ lọc hiện tại.</div>';
        return;
      }

      let html = '';
      filteredIds.forEach(id => {
        const def = ACHIEVEMENTS_REGISTRY[id];
        const userAch = userAchievements[id] || { unlocked: false, progress: 0, unlockedAt: null, claimedReward: false };
        const isUnlocked = !!userAch.unlocked;
        const isClaimed = !!userAch.claimedReward;
        const progress = Math.min(def.maxProgress, userAch.progress || 0);
        const pct = Math.round((progress / def.maxProgress) * 100);
        const tier = BADGE_TIER_CONFIG[def.tier] || BADGE_TIER_CONFIG.bronze;
        const pinIdx = userPinnedBadges.indexOf(id);
        const isPinned = pinIdx >= 0;

        const unlockedTimeStr = userAch.unlockedAt ? new Date(userAch.unlockedAt).toLocaleDateString('vi-VN') : '';
        const isSecretLocked = def.isSecret && !isUnlocked;
        const displayDesc = isSecretLocked ? '🔒 ' + (def.secretHint || 'Thành tựu bí ẩn. Hãy khám phá bằng cách trải nghiệm ứng dụng!') : def.desc;

        html += `
          <div style="background: ${isUnlocked ? tier.bg : 'var(--surface-elevated)'}; border: 1.5px solid ${isUnlocked ? tier.border : 'var(--border)'}; border-radius: 12px; padding: 9px 11px; display: flex; gap: 10px; align-items: center; transition: all 0.2s; opacity: ${isUnlocked ? '1' : '0.75'}; box-shadow: ${isUnlocked ? tier.glow : 'none'};">
            
            <!-- BADGE ICON -->
            <div style="width: 44px; height: 44px; min-width: 44px; min-height: 44px; border-radius: 50%; background: ${isUnlocked ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.04)'}; border: 2px solid ${isUnlocked ? tier.color : 'var(--border)'}; display: flex; align-items: center; justify-content: center; font-size: 22px; filter: ${isUnlocked ? 'none' : 'grayscale(100%) opacity(0.5)'}; flex-shrink: 0;">
              ${def.icon}
            </div>

            <!-- CONTENT -->
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                  <strong style="font-size: 13px; color: ${isUnlocked ? tier.color : 'var(--text)'};">${escapeHtml(def.name)}</strong>
                  <span class="badge" style="background: ${isUnlocked ? tier.bg : 'rgba(255,255,255,0.06)'}; color: ${isUnlocked ? tier.color : 'var(--text-muted)'}; font-size: 9px; border: 1px solid ${isUnlocked ? tier.border : 'var(--border)'}; padding: 1px 5px;">
                    ${def.isSecret ? (isUnlocked ? tier.name : '🥚 Bí Ẩn') : tier.name}
                  </span>
                </div>
                <span class="badge" style="background: rgba(16,185,129,0.15); color: #34d399; font-size: 10px; font-weight: 700;">+${def.pointsReward} VoCoin</span>
              </div>

              <div style="font-size: 11px; color: ${isSecretLocked ? '#a5b4fc' : 'var(--text-muted)'}; margin: 2px 0 4px 0; line-height: 1.3; font-style: ${isSecretLocked ? 'italic' : 'normal'};">${escapeHtml(displayDesc)}</div>

              <!-- PROGRESS BAR -->
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="flex: 1; height: 5px; background: rgba(0,0,0,0.3); border-radius: 3px; overflow: hidden; border: 1px solid var(--border);">
                  <div style="width: ${isSecretLocked ? '0' : pct}%; height: 100%; background: ${isUnlocked ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #6366f1, #a855f7)'}; border-radius: 3px; transition: width 0.3s;"></div>
                </div>
                <span style="font-size: 9.5px; font-family: monospace; font-weight: 700; color: ${isUnlocked ? '#34d399' : 'var(--text-muted)'}; min-width: 55px; text-align: right;">
                  ${isSecretLocked ? '??? (Bí ẩn)' : `${progress}/${def.maxProgress} (${pct}%)`}
                </span>
              </div>

              ${isUnlocked ? `
                <div style="font-size: 9.5px; color: #34d399; margin-top: 2px; display: flex; align-items: center; gap: 4px;">
                  <span>✅ Đã mở: ${unlockedTimeStr} ${isClaimed ? '• Đã nhận thưởng' : '• <strong>Chưa nhận VoCoin</strong>'}</span>
                </div>
              ` : ''}
            </div>

            <!-- ACTION BUTTON -->
            <div style="flex-shrink: 0; display: flex; align-items: center; justify-content: flex-end;">
              ${isUnlocked ? `
                ${!isClaimed ? `
                  <button type="button" class="btn btn-sm" onclick="claimAchievementReward('${id}')" style="font-size: 11px; padding: 5px 9px; font-weight: 800; background: linear-gradient(135deg, #10b981, #059669); border: none; color: #fff; box-shadow: 0 2px 8px rgba(16,185,129,0.4); border-radius: 7px; white-space: nowrap; cursor: pointer;" title="Nhấn để nhận phần thưởng +${def.pointsReward} VoCoin">
                    🎁 +${def.pointsReward} VoCoin
                  </button>
                ` : `
                  ${isPinned ? `
                    <button type="button" class="btn btn-sm btn-outline" onclick="togglePinBadge('${id}')" style="font-size: 11px; padding: 4px 8px; color: #ffd700; border-color: rgba(255,215,0,0.5); font-weight: 800; background: rgba(255,215,0,0.12); border-radius: 7px; white-space: nowrap;" title="Đang ghim ở vị trí #${pinIdx + 1}. Bấm để bỏ ghim">
                      ⭐ #${pinIdx + 1}
                    </button>
                  ` : `
                    <button type="button" class="btn btn-sm btn-primary" onclick="togglePinBadge('${id}')" style="font-size: 11px; padding: 4px 8px; font-weight: 700; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; border-radius: 7px; white-space: nowrap;" title="Ghim danh hiệu này lên Hồ Sơ Cá Nhân">
                      📌 Ghim
                    </button>
                  `}
                `}
              ` : `
                <button type="button" class="btn btn-sm btn-outline" disabled style="font-size: 11px; padding: 4px 7px; opacity: 0.4; color: var(--text-muted); border-color: var(--border); border-radius: 7px; white-space: nowrap;" title="Chưa mở khóa">
                  🔒
                </button>
              `}
            </div>

          </div>
        `;
      });

      container.innerHTML = html;
    }

    // PROFILE 3-BADGE SHOWCASE (v0.10.8-alpha-10.3: Big Lock for Guests - Hình 2)
    function renderProfilePinnedBadges() {
      const container = document.getElementById('profile-pinned-badges-showcase');
      if (!container) return;

      const isGuest = !currentUser || !currentUser.email;

      container.style.cssText = 'display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; width: 100%; box-sizing: border-box;';

      let html = '';
      for (let i = 0; i < 3; i++) {
        if (isGuest) {
          // Guest: Show big Lock icon (Hình 2)
          html += `
            <div onclick="openAchievementsModal()" style="background: rgba(255,255,255,0.02); border: 1.5px dashed rgba(239,68,68,0.35); border-radius: 8px; padding: 6px 3px; text-align: center; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 52px; min-width: 0; overflow: hidden; transition: all 0.2s;" onmouseover="this.style.borderColor='#ef4444';this.style.background='rgba(239,68,68,0.08)'" onmouseout="this.style.borderColor='rgba(239,68,68,0.35)';this.style.background='rgba(255,255,255,0.02)'" title="Đăng nhập để mở khóa kho danh hiệu">
              <span style="font-size: 18px; line-height: 1;">🔒</span>
              <span style="font-size: 9px; color: #f87171; margin-top: 2px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;">Khóa (#${i + 1})</span>
            </div>
          `;
          continue;
        }

        const badgeId = userPinnedBadges[i];
        const badgeDef = badgeId ? ACHIEVEMENTS_REGISTRY[badgeId] : null;

        if (badgeDef) {
          const t = BADGE_TIER_CONFIG[badgeDef.tier] || BADGE_TIER_CONFIG.bronze;
          html += `
            <div class="pinned-badge-card tier-${badgeDef.tier || 'bronze'}" onclick="openAchievementsModal()" style="min-height: 58px;" title="${escapeHtml(badgeDef.name)}: ${escapeHtml(badgeDef.desc)} (Bấm để mở kho huy hiệu)">
              <div class="pinned-badge-content" style="padding: 6px 3px;">
                <div style="font-size: 18px; line-height: 1; margin-bottom: 2px;">${badgeDef.icon}</div>
                <div style="font-size: 10px; font-weight: 800; color: ${t.color}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; max-width: 100%;">${escapeHtml(badgeDef.name)}</div>
                <div style="font-size: 8px; color: var(--text-muted); text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; max-width: 100%; margin-top: 1px;">${t.name}</div>
              </div>
            </div>
          `;
        } else {
          html += `
            <div onclick="openAchievementsModal()" style="background: rgba(255,255,255,0.02); border: 1.5px dashed var(--border); border-radius: 8px; padding: 6px 3px; text-align: center; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 52px; min-width: 0; overflow: hidden;" title="Nhấn để chọn huy hiệu ghim lên hồ sơ">
              <span style="font-size: 14px; color: var(--text-muted); line-height: 1;">➕</span>
              <span style="font-size: 9px; color: var(--text-muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;">Trống (#${i + 1})</span>
            </div>
          `;
        }
      }
      container.innerHTML = html;
    }

    // =========================================================================
    // VIP CAT MEME REACTION ENGINE (v0.10.8-alpha-10.3 - RESILIENT VIP CHECK)
    // =========================================================================
    const VIP_MEME_BASE_CDN = 'https://raw.githubusercontent.com/iamjulies/VocaFlow/main/memes/';

    const VIP_RIGHT_MEMES = [
      'right/cat_dance_1.gif',
      'right/cat_ok.gif',
      'right/dance_cat.gif',
      'right/kitty_cute.gif',
      'right/mommy_smash.gif',
      'right/mr_bean_dancing.gif',
      'right/sigma_cat.gif',
      'right/take_this_rose.gif'
    ];

    const VIP_FAIL_MEMES = [
      'fail/cat_fail.gif',
      'fail/cat_crying.gif',
      'fail/cat_meme_fail_1.gif',
      'fail/cat_meme_fail_2.gif',
      'fail/cat_meme_fail_3.gif',
      'fail/cat_what.gif',
      'fail/cat_disappointed.gif',
      'fail/lmao_cat_fail.gif'
    ];

    let vipMemeDismissTimeout = null;
    let vipMemeFadeTimeout = null;
    let vipMemeSaveTimeout = null;
    let vipMemeTriggerTimestamp = 0;

    function getVipCatMemeDuration() {
      const saved = localStorage.getItem('vocaflow_vip_cat_memes_duration');
      const val = parseFloat(saved);
      return (!isNaN(val) && val >= 1.0 && val <= 6.0) ? val : 2.5;
    }

    function triggerVipMemeReaction(type = 'right') {
      // 1. VIP Verification: Resilient Multi-Source Check
      let isVip = false;
      try {
        if (typeof isUserVip === 'function' && isUserVip()) isVip = true;
      } catch (e) {}
      if (!isVip && typeof userIsVip !== 'undefined' && userIsVip) isVip = true;
      if (!isVip && typeof adminVipOverride !== 'undefined' && adminVipOverride) isVip = true;
      if (!isVip && localStorage.getItem('vocaflow_user_is_vip') === 'true') isVip = true;

      if (!isVip) {
        return;
      }

      // 2. Setting check
      const memeEnabled = localStorage.getItem('vocaflow_vip_cat_memes_enabled');
      if (memeEnabled === 'false') return;

      const isRight = (type === 'right' || type === 'correct' || type === 'pass');
      const list = isRight ? VIP_RIGHT_MEMES : VIP_FAIL_MEMES;
      const randomPath = list[Math.floor(Math.random() * list.length)];
      const memeUrl = VIP_MEME_BASE_CDN + randomPath;

      let overlay = document.getElementById('vip-cat-meme-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'vip-cat-meme-overlay';
        overlay.className = 'vip-cat-meme-overlay';
        document.body.appendChild(overlay);
      }

      vipMemeTriggerTimestamp = Date.now();

      // Pure vanilla GIF centered on screen (no frames/boxes)
      overlay.innerHTML = `
        <img src="${memeUrl}" alt="VIP Cat Meme" class="vip-meme-vanilla-img" onerror="this.onerror=null;this.src='memes/' + '${randomPath}';">
      `;

      overlay.style.display = 'flex';
      overlay.classList.remove('hidden', 'fading-out');
      overlay.classList.add('active');

      if (vipMemeFadeTimeout) clearTimeout(vipMemeFadeTimeout);
      if (vipMemeDismissTimeout) clearTimeout(vipMemeDismissTimeout);

      // Phase 2 duration: Customizable by user via slider (default 2.5s)
      const durationSec = getVipCatMemeDuration();
      const durationMs = Math.round(durationSec * 1000);

      // Phase 2 -> Phase 3: Vanish after durationMs
      vipMemeFadeTimeout = setTimeout(() => {
        overlay.classList.remove('active');
        overlay.classList.add('fading-out');

        vipMemeDismissTimeout = setTimeout(() => {
          overlay.classList.remove('fading-out');
          overlay.classList.add('hidden');
          overlay.style.display = 'none';
          overlay.innerHTML = '';
        }, 250);
      }, durationMs);
    }

    // Instant kill switch: "Tắt phụt luôn / tắt đột ngột" khi bấm chuột/nhấn màn hình bất kỳ đâu (sau 250ms miễn nhiễm kích hoạt)
    function dismissVipMemeOverlay() {
      if (vipMemeFadeTimeout) { clearTimeout(vipMemeFadeTimeout); vipMemeFadeTimeout = null; }
      if (vipMemeDismissTimeout) { clearTimeout(vipMemeDismissTimeout); vipMemeDismissTimeout = null; }
      const overlay = document.getElementById('vip-cat-meme-overlay');
      if (!overlay) return;
      overlay.classList.remove('active', 'fading-out');
      overlay.classList.add('hidden');
      overlay.style.display = 'none';
      overlay.innerHTML = '';
    }

    // Global listener: Bấm chuột hoặc nhấn vào màn hình ở bất kì chỗ nào thì tắt đột ngột (miễn nhiễm 250ms đầu tiên sau khi kích hoạt)
    if (!window._vipMemeGlobalClickListenerAttached) {
      window._vipMemeGlobalClickListenerAttached = true;
      window.addEventListener('pointerdown', function(e) {
        if (Date.now() - vipMemeTriggerTimestamp < 250) return;
        const overlay = document.getElementById('vip-cat-meme-overlay');
        if (overlay && overlay.classList.contains('active')) {
          dismissVipMemeOverlay();
        }
      }, true);
    }

    function toggleVipCatMemeSetting(enabled) {
      localStorage.setItem('vocaflow_vip_cat_memes_enabled', enabled ? 'true' : 'false');
      localStorage.setItem(STORAGE_KEY_SETTINGS_TIME, Date.now().toString());
      const durationContainer = document.getElementById('setting-vip-cat-meme-duration-container');
      if (durationContainer) {
        durationContainer.style.opacity = enabled ? '1' : '0.4';
        durationContainer.style.pointerEvents = enabled ? 'auto' : 'none';
      }
      showToast(enabled ? '😸 Đã bật hiệu ứng Meme Mèo VIP!' : '🔇 Đã tắt hiệu ứng Meme Mèo VIP.');

      if (typeof pushCurrentDatabaseToCloud === 'function' && currentUser && currentUser.email) {
        if (vipMemeSaveTimeout) clearTimeout(vipMemeSaveTimeout);
        vipMemeSaveTimeout = setTimeout(() => {
          saveDatabase(true);
          pushCurrentDatabaseToCloud();
        }, 500);
      }
    }

    function updateVipCatMemeDuration(val) {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        localStorage.setItem('vocaflow_vip_cat_memes_duration', num.toFixed(1));
        localStorage.setItem(STORAGE_KEY_SETTINGS_TIME, Date.now().toString());
        const label = document.getElementById('vip-cat-meme-duration-label');
        if (label) label.textContent = `${num.toFixed(1)} giây`;

        if (typeof pushCurrentDatabaseToCloud === 'function' && currentUser && currentUser.email) {
          if (vipMemeSaveTimeout) clearTimeout(vipMemeSaveTimeout);
          vipMemeSaveTimeout = setTimeout(() => {
            saveDatabase(true);
            pushCurrentDatabaseToCloud();
          }, 800);
        }
      }
    }


    // =========================================================================
    // REFERRAL & AFFILIATE PROGRAM ENGINE (v0.10.8-alpha-10.3)
    // =========================================================================
    function getUserReferralCode(user) {
      if (!user || !user.uid) return 'GUEST';
      return user.uid.substring(0, 8).toUpperCase();
    }

    function openReferralModal() {
      if (!currentUser || !currentUser.email) {
        openGuestFeatureLockModal('Mời Bạn Bè', 'VocaShare: Giới Thiệu Bạn Bè, Nhận VocaVIP & Hoa Hồng VoCoin Thụ Động', '🤝 🔒');
        return;
      }
      if (!currentUser || !currentUser.uid) {
        alert('🔒 Vui lòng đăng nhập hoặc tạo tài khoản để lấy mã giới thiệu và nhận quà!');
        openAuthModal('login');
        return;
      }

      const myCode = getUserReferralCode(currentUser);
      const codeDisplay = document.getElementById('ref-my-code-display');

      // Auto-register code to global index for lookup
      if (currentUser && currentUser.uid && firebaseConfig.databaseURL) {
        const authParam = currentUser.idToken ? `?auth=${currentUser.idToken}` : '';
        fetch(`${firebaseConfig.databaseURL}/referrals_index/${myCode}.json${authParam}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: currentUser.uid,
            displayName: currentUser.displayName || '',
            email: currentUser.email || ''
          })
        }).catch(() => {});
      }
      const linkInput = document.getElementById('ref-my-link-input');
      const badgeEarned = document.getElementById('ref-my-vip-earned-badge');
      const statFriends = document.getElementById('ref-stat-friends-count');
      const statVip = document.getElementById('ref-stat-vip-days');
      const inputGroup = document.getElementById('ref-input-group');
      const statusMsg = document.getElementById('ref-claim-status-msg');
      const inputCode = document.getElementById('ref-input-code');

      if (codeDisplay) codeDisplay.textContent = myCode;
      const cleanRefLink = getMyReferralCleanLink();
      if (linkInput) linkInput.value = cleanRefLink;

      // Check if user has already claimed a referrer
      const claimedReferrer = localStorage.getItem('vocaflow_referred_by') || (currentUser && currentUser.referredBy) || '';
      if (claimedReferrer) {
        if (inputGroup) inputGroup.style.display = 'none';
        if (statusMsg) {
          statusMsg.style.display = 'block';
          statusMsg.innerHTML = `<span style="color: #34d399; font-weight: 700;">✅ Bạn đã nhận quà tân thủ từ mã giới thiệu: <strong>${escapeHtml(claimedReferrer)}</strong></span>`;
        }
      } else {
        if (inputGroup) inputGroup.style.display = 'flex';
        if (statusMsg) statusMsg.style.display = 'none';
        // Auto-fill pending ref code if present from URL
        const pendingRef = sessionStorage.getItem('vocaflow_pending_ref_code') || '';
        if (pendingRef && inputCode) {
          inputCode.value = pendingRef;
          setTimeout(() => {
            inputCode.style.borderColor = '#10b981';
            inputCode.style.boxShadow = '0 0 12px rgba(16, 185, 129, 0.4)';
          }, 150);
        }
      }

      // Load referral stats from localStorage / memory
      const friendsCount = parseInt(localStorage.getItem('vocaflow_referrals_count') || '0', 10);
      if (statFriends) statFriends.textContent = friendsCount.toString();
      if (statVip) statVip.textContent = `+${friendsCount} ngày`;
      if (badgeEarned) badgeEarned.textContent = `Đã nhận: +${friendsCount} Ngày VocaVIP`;

      openModal('modal-referral');

      // Fetch and sync cloud stats & claimed status in background
      syncReferralStatsFromCloud();
    }

    async function syncReferralStatsFromCloud() {
      if (!currentUser || !currentUser.uid || !firebaseConfig.databaseURL) return;
      try {
        const token = typeof getFreshCloudAuthToken === 'function' ? await getFreshCloudAuthToken() : (currentUser.idToken || '');
        const rtdbUrl = firebaseConfig.databaseURL;

        // 1. Sync Referral Stats (Friends invited & VIP Days earned)
        let statRes = null;
        if (token) {
          try { statRes = await fetch(`${rtdbUrl}/referrals_stats/${currentUser.uid}.json?auth=${token}`); } catch(e) {}
        }
        if (!statRes || !statRes.ok) {
          statRes = await fetch(`${rtdbUrl}/referrals_stats/${currentUser.uid}.json`);
        }
        if (statRes && statRes.ok) {
          const data = await statRes.json();
          if (data && typeof data === 'object') {
            const count = data.count || 0;
            localStorage.setItem('vocaflow_referrals_count', count.toString());
            const statFriends = document.getElementById('ref-stat-friends-count');
            const statVip = document.getElementById('ref-stat-vip-days');
            const badgeEarned = document.getElementById('ref-my-vip-earned-badge');
            if (statFriends) statFriends.textContent = count.toString();
            if (statVip) statVip.textContent = `+${count} ngày`;
            if (badgeEarned) badgeEarned.textContent = `Đã nhận: +${count} Ngày VocaVIP`;
          }
        }

        // 2. Sync Claimed Referral Status from Cloud (Anti-desync for multiple devices & cache clear)
        let claimedCode = localStorage.getItem('vocaflow_referred_by') || (currentUser && currentUser.referredBy) || '';
        if (!claimedCode) {
          // Check user profile node
          let refRes = null;
          if (token) {
            try { refRes = await fetch(`${rtdbUrl}/users/${currentUser.uid}/profile/referredBy.json?auth=${token}`); } catch(e) {}
          }
          if (!refRes || !refRes.ok) {
            refRes = await fetch(`${rtdbUrl}/users/${currentUser.uid}/profile/referredBy.json`);
          }
          if (refRes && refRes.ok) {
            const remoteRef = await refRes.json();
            if (remoteRef && typeof remoteRef === 'string') {
              claimedCode = remoteRef;
              localStorage.setItem('vocaflow_referred_by', claimedCode);
              if (currentUser) currentUser.referredBy = claimedCode;
            }
          }

          if (!claimedCode) {
            // Check direct /users/{uid}/referredBy node
            let directRefRes = null;
            if (token) {
              try { directRefRes = await fetch(`${rtdbUrl}/users/${currentUser.uid}/referredBy.json?auth=${token}`); } catch(e) {}
            }
            if (!directRefRes || !directRefRes.ok) {
              directRefRes = await fetch(`${rtdbUrl}/users/${currentUser.uid}/referredBy.json`);
            }
            if (directRefRes && directRefRes.ok) {
              const directRef = await directRefRes.json();
              if (directRef && typeof directRef === 'string') {
                claimedCode = directRef;
                localStorage.setItem('vocaflow_referred_by', claimedCode);
                if (currentUser) currentUser.referredBy = claimedCode;
              }
            }
          }

          if (!claimedCode) {
            // Check /referrals_claimed_by/{uid} index
            let claimCheckRes = null;
            if (token) {
              try { claimCheckRes = await fetch(`${rtdbUrl}/referrals_claimed_by/${currentUser.uid}.json?auth=${token}`); } catch(e) {}
            }
            if (!claimCheckRes || !claimCheckRes.ok) {
              claimCheckRes = await fetch(`${rtdbUrl}/referrals_claimed_by/${currentUser.uid}.json`);
            }
            if (claimCheckRes && claimCheckRes.ok) {
              const claimObj = await claimCheckRes.json();
              if (claimObj && (claimObj.code || typeof claimObj === 'string')) {
                claimedCode = typeof claimObj === 'string' ? claimObj : claimObj.code;
                localStorage.setItem('vocaflow_referred_by', claimedCode);
                if (currentUser) currentUser.referredBy = claimedCode;
              }
            }
          }
        }

        // 3. Update Modal UI immediately
        const inputGroup = document.getElementById('ref-input-group');
        const statusMsg = document.getElementById('ref-claim-status-msg');
        if (claimedCode) {
          if (inputGroup) inputGroup.style.display = 'none';
          if (statusMsg) {
            statusMsg.style.display = 'block';
            statusMsg.innerHTML = `<span style="color: #34d399; font-weight: 700;">✅ Bạn đã nhận quà tân thủ từ mã giới thiệu: <strong>${escapeHtml(claimedCode)}</strong></span>`;
          }
        } else {
          if (inputGroup) inputGroup.style.display = 'flex';
          if (statusMsg) statusMsg.style.display = 'none';
        }

      } catch (e) {
        console.warn('Sync referral stats warning:', e);
      }
    }

    function getMyReferralCleanLink() {
      const code = getUserReferralCode(currentUser);
      if (!code || code === 'GUEST') return 'https://iamjulies.github.io/VocaFlow/invite';
      const myHandle = (currentUser && (currentUser.username || (currentUser.email ? currentUser.email.split('@')[0] : '')) || '').replace(/^@+/, '').trim();
      const cleanHandle = myHandle || (currentUser && currentUser.displayName ? currentUser.displayName.replace(/\s+/g, '').toLowerCase() : '');
      let baseUrl = 'https://iamjulies.github.io/VocaFlow';
      try {
        if (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) {
          baseUrl = window.location.origin + (typeof getAppBasePath === 'function' ? getAppBasePath() : (window.location.pathname.includes('/VocaFlow') ? '/VocaFlow' : ''));
          baseUrl = baseUrl.replace(/\/+$/, '');
        }
      } catch (e) {}
      return cleanHandle ? `${baseUrl}/invite/@${cleanHandle}/${code}` : `${baseUrl}/invite/${code}`;
    }
    window.getMyReferralCleanLink = getMyReferralCleanLink;

    function copyMyReferralCode() {
      const code = getUserReferralCode(currentUser);
      if (!code || code === 'GUEST') return;
      navigator.clipboard.writeText(code).then(() => {
        showToast(`📋 Đã sao chép mã giới thiệu: ${code}`);
      }).catch(() => {
        prompt('Mã giới thiệu của bạn (nhấn Ctrl+C để sao chép):', code);
      });
    }

    function copyMyReferralLink() {
      const code = getUserReferralCode(currentUser);
      if (!code || code === 'GUEST') return;
      const link = getMyReferralCleanLink();
      navigator.clipboard.writeText(link).then(() => {
        showToast('🔗 Đã sao chép link mời bạn bè!');
      }).catch(() => {
        prompt('Link mời bạn bè của bạn (nhấn Ctrl+C để sao chép):', link);
      });
    }

    async function submitReferralCode() {
      if (!currentUser || !currentUser.uid) {
        alert('🔒 Vui lòng đăng nhập để nhập mã nhận quà!');
        return;
      }

      const input = document.getElementById('ref-input-code');
      const rawCode = (input ? input.value : '').trim().toUpperCase();
      if (!rawCode) {
        alert('Vui lòng nhập mã giới thiệu!');
        return;
      }

      const myCode = getUserReferralCode(currentUser);
      if (rawCode === myCode || rawCode === currentUser.uid.toUpperCase()) {
        alert('⚠️ Bạn không thể tự nhập mã giới thiệu của chính mình!');
        return;
      }

      const claimedReferrer = localStorage.getItem('vocaflow_referred_by') || (currentUser && currentUser.referredBy) || '';
      if (claimedReferrer) {
        alert('⚠️ Bạn đã từng nhận quà tân thủ trước đó rồi (chỉ áp dụng 1 lần duy nhất)!');
        return;
      }

      showToast('⏳ Đang xác minh mã giới thiệu...');

      // 1. Mark as claimed locally & in currentUser
      localStorage.setItem('vocaflow_referred_by', rawCode);
      if (currentUser) currentUser.referredBy = rawCode;
      sessionStorage.removeItem('vocaflow_pending_ref_code');

      // 2. Award Newbie Rewards: +1 Day VIP + 100 Xu + 3 Hints + 1 Lucky Spin (v0.10.8-alpha-10.3)
      const vipGrantRes = grantVipOneDayBonus();
      setUserPoints(getUserPoints() + 100);
      setUserHints(getUserHints() + 3);
      setLuckySpinsCount(getLuckySpinsCount() + 1);
      if (typeof recordAdWatched === 'function') recordAdWatched();

      // 3. Ledger entry & notifications
      addLedgerEntry('REFERRAL_NEWBIE_GIFT', 100, `🎁 Quà tân thủ khi nhập mã giới thiệu: ${rawCode}`);
      if (typeof addNotification === 'function') {
        addNotification('VIP_BONUS', '👑 Quà Tân Thủ: +1 Ngày VocaVIP', `Bạn đã nhận được +1 Ngày VocaVIP Hoàng Gia, 100 VoCoin, +3 VocaHint và +1 VocaSpin từ mã ${rawCode}!`);
      }
      saveDatabase(true);
      pushCurrentDatabaseToCloud();

      // 4. Record to Firebase Cloud & Grant +1 Day VIP to Referrer
      if (firebaseConfig.databaseURL) {
        try {
          const token = typeof getFreshCloudAuthToken === 'function' ? await getFreshCloudAuthToken() : (currentUser.idToken || '');
          const authParam = token ? `?auth=${token}` : '';
          const rtdbUrl = firebaseConfig.databaseURL;
          
          // Save claim record in claims index
          await fetch(`${rtdbUrl}/referral_claims/${rawCode}/${currentUser.uid}.json${authParam}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              claimedAt: Date.now(),
              newbieUid: currentUser.uid,
              newbieName: currentUser.displayName || currentUser.email,
              newbieEmail: currentUser.email || ''
            })
          }).catch(() => {});

          // Save claim record in user's profile and claimed_by index
          await fetch(`${rtdbUrl}/users/${currentUser.uid}/profile/referredBy.json${authParam}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rawCode)
          }).catch(() => {});

          await fetch(`${rtdbUrl}/users/${currentUser.uid}/referredBy.json${authParam}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rawCode)
          }).catch(() => {});

          await fetch(`${rtdbUrl}/referrals_claimed_by/${currentUser.uid}.json${authParam}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: rawCode,
              claimedAt: Date.now()
            })
          }).catch(() => {});

          // Look up Referrer UID via referrals_index
          let refLookupRes = null;
          if (token) {
            try { refLookupRes = await fetch(`${rtdbUrl}/referrals_index/${rawCode}.json?auth=${token}`); } catch(e) {}
          }
          if (!refLookupRes || !refLookupRes.ok) {
            refLookupRes = await fetch(`${rtdbUrl}/referrals_index/${rawCode}.json`);
          }
          if (refLookupRes && refLookupRes.ok) {
            const refOwner = await refLookupRes.json();
            if (refOwner && refOwner.uid) {
              const referrerUid = refOwner.uid;
              
              // Pull referrer current profile
              let profRes = null;
              if (token) {
                try { profRes = await fetch(`${rtdbUrl}/users/${referrerUid}/profile.json?auth=${token}`); } catch(e) {}
              }
              if (!profRes || !profRes.ok) {
                profRes = await fetch(`${rtdbUrl}/users/${referrerUid}/profile.json`);
              }
              const refProf = (profRes && profRes.ok ? await profRes.json() : null) || {};
              const ONE_DAY_MS = 24 * 60 * 60 * 1000;
              const currentExp = (refProf.vipExpiresAt && refProf.vipExpiresAt > Date.now()) ? refProf.vipExpiresAt : Date.now();
              const newExp = currentExp + ONE_DAY_MS;
              const newTier = (refProf.vipTier && refProf.vipTier !== 'none') ? refProf.vipTier : 'monthly';

              // Grant VIP bonus to referrer on Cloud
              await fetch(`${rtdbUrl}/users/${referrerUid}/profile.json${authParam}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  isVip: true,
                  vipTier: newTier,
                  vipExpiresAt: newExp,
                  updatedAt: new Date().toISOString()
                })
              }).catch(() => {});

              await fetch(`${rtdbUrl}/users/${referrerUid}.json${authParam}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  isVip: true,
                  vipTier: newTier,
                  vipExpiresAt: newExp
                })
              }).catch(() => {});

              // Push direct notification to Referrer inbox
              const notifId = 'notif_ref_' + Date.now();
              const friendName = currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Bạn mới');
              await fetch(`${rtdbUrl}/users/${referrerUid}/notifications/${notifId}.json${authParam}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: notifId,
                  type: 'VIP_BONUS',
                  title: '👑 Thưởng +1 Ngày VocaVIP từ VocaShare',
                  content: `Bạn bè ${friendName} vừa nhập mã VocaShare của bạn! Bạn được tặng ngay +1 Ngày VocaVIP Hoàng Gia.`,
                  message: `Bạn bè ${friendName} vừa nhập mã VocaShare của bạn! Bạn được tặng ngay +1 Ngày VocaVIP Hoàng Gia.`,
                  timestamp: new Date().toISOString(),
                  read: false
                })
              }).catch(() => {});

              // Increment referrer stats count
              let statRes = null;
              if (token) {
                try { statRes = await fetch(`${rtdbUrl}/referrals_stats/${referrerUid}/count.json?auth=${token}`); } catch(e) {}
              }
              if (!statRes || !statRes.ok) {
                statRes = await fetch(`${rtdbUrl}/referrals_stats/${referrerUid}/count.json`);
              }
              const curCount = (statRes && statRes.ok ? await statRes.json() : 0) || 0;
              await fetch(`${rtdbUrl}/referrals_stats/${referrerUid}.json${authParam}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  count: curCount + 1,
                  lastFriend: friendName,
                  updatedAt: new Date().toISOString()
                })
              }).catch(() => {});
            }
          }
        } catch (e) {
          console.warn('Cloud referral claim record warning:', e);
        }
      }

      // 5. Update UI
      const inputGroup = document.getElementById('ref-input-group');
      const statusMsg = document.getElementById('ref-claim-status-msg');
      if (inputGroup) inputGroup.style.display = 'none';
      if (statusMsg) {
        statusMsg.style.display = 'block';
        statusMsg.innerHTML = `<span style="color: #34d399; font-weight: 700;">✅ Nhận quà thành công! Mã giới thiệu: <strong>${escapeHtml(rawCode)}</strong></span>`;
      }

      playVocaSfx('success');
      showToast('🎉 Chúc mừng bạn đã nhận +100 VoCoin, +3 VocaHint và +1 VocaSpin!');
      updateEconomyUI();
      updateShopBonusesUI();
    }

    // Auto-detect referral code from URL query params on startup
    window.addEventListener('DOMContentLoaded', () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref') || urlParams.get('invite');
        if (refCode) {
          sessionStorage.setItem('vocaflow_pending_ref_code', refCode.trim().toUpperCase());
        }
      } catch (e) {}
    });

    // DECK COLOR PALETTE PRESETS (v0.0.10.3h)
    const DECK_PALETTE_COLORS = [
      '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
      '#ec4899', '#f43f5e', '#ef4444', '#f97316',
      '#f59e0b', '#eab308', '#84cc16', '#10b981',
      '#14b8a6', '#06b6d4', '#3b82f6', '#64748b'
    ];

    function renderDeckColorPalette(activeColor = '#6366f1') {
      const container = document.getElementById('deck-color-palette');
      if (!container) return;
      
      const customInput = document.getElementById('deck-custom-color-input');
      const hiddenInput = document.getElementById('deck-selected-color');
      if (hiddenInput) hiddenInput.value = activeColor;
      if (customInput) customInput.value = activeColor.startsWith('#') ? activeColor : '#6366f1';

      let html = '';
      DECK_PALETTE_COLORS.forEach(hex => {
        const isSel = (activeColor.toLowerCase() === hex.toLowerCase());
        html += `
          <div onclick="selectDeckPresetColor('${hex}')" style="width: 28px; height: 28px; border-radius: 50%; background-color: ${hex}; cursor: pointer; border: ${isSel ? '3px solid white' : '2px solid rgba(255,255,255,0.1)'}; box-shadow: ${isSel ? '0 0 10px ' + hex : 'none'}; transition: all 0.2s;" title="${hex}"></div>
        `;
      });
      container.innerHTML = html;
    }

    function selectDeckPresetColor(hex) {
      renderDeckColorPalette(hex);
    }

    function selectDeckCustomColor(hex) {
      renderDeckColorPalette(hex);
    }

    // DECK MODAL
    
    window.openDeckModal = openDeckModal;
    window.saveDeckForm = saveDeckForm;
    window.editDeck = editDeck;
    window.selectDeckPresetColor = selectDeckPresetColor;
    window.selectDeckCustomColor = selectDeckCustomColor;
    window.openWordModal = openWordModal;
    function openDeckModal() {
      document.getElementById('deck-id').value = '';
      document.getElementById('deck-title').value = '';
      document.getElementById('deck-desc').value = '';
      renderDeckColorPalette('#6366f1');
      document.getElementById('modal-deck-title').textContent = 'Tạo VocaDeck Mới';
      openModal('modal-deck');
    }

    function editDeck(deckId) {
      const deck = decks.find(d => d.id === deckId);
      if (!deck) return;

      document.getElementById('deck-id').value = deck.id;
      document.getElementById('deck-title').value = deck.title;
      document.getElementById('deck-desc').value = deck.description || '';
      renderDeckColorPalette(deck.color || '#6366f1');

      document.getElementById('modal-deck-title').textContent = 'Chỉnh Sửa VocaDeck';
      openModal('modal-deck');
    }

    function saveDeckForm(e) {
      e.preventDefault();
      const id = document.getElementById('deck-id').value || 'deck-' + Date.now();
      const title = document.getElementById('deck-title').value.trim();
      const desc = document.getElementById('deck-desc').value.trim();
      const color = document.getElementById('deck-selected-color')?.value || '#6366f1';
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
      showToast('Đã lưu VocaDeck thành công!');
    }

    // WORD MODAL
    function updateWordModalAiButtonState() {
      const aiBtn = document.getElementById('btn-ai-generate');
      const aiIcon = document.getElementById('ai-btn-icon');
      const aiText = document.getElementById('ai-btn-text');
      if (!aiBtn) return;
      if (!hasAtLeastOneApiKey()) {
        aiBtn.title = '🔒 Cần kết nối ít nhất 1 Gemini API Key trong Cài Đặt để dùng AI Điền Tự Động';
        if (aiIcon) aiIcon.textContent = '🔒';
        if (aiText) aiText.textContent = 'AI Điền (Cần Key)';
        aiBtn.style.opacity = '0.75';
      } else {
        aiBtn.title = 'Tự động tra cứu nghĩa, IPA, ví dụ bằng Google Gemini AI';
        if (aiIcon) aiIcon.textContent = '✨';
        if (aiText) aiText.textContent = 'AI Điền Tự Động';
        aiBtn.style.opacity = '1';
      }
    }


    // =========================================================================
  // VIP PRICING & UPGRADE MODAL LOGIC (v0.10.8-alpha-10.3 HIERARCHY ENGINE)
  // =========================================================================
  let currentSelectedVipPlan = { tier: 'yearly', name: 'VIP 1 Năm', priceStr: '299.000đ', amount: 299000 };
  let currentActiveVipTab = 'yearly';

  function switchVipPlanTab(tier) {
    currentActiveVipTab = tier;
    
    // Update tab buttons
    const btnFree = document.getElementById('vip-tab-btn-free');
    const btnMonthly = document.getElementById('vip-tab-btn-monthly');
    const btnYearly = document.getElementById('vip-tab-btn-yearly');
    const btnLifetime = document.getElementById('vip-tab-btn-lifetime');

    if (btnFree) btnFree.classList.toggle('active', tier === 'free');
    if (btnMonthly) btnMonthly.classList.toggle('active', tier === 'monthly');
    if (btnYearly) btnYearly.classList.toggle('active', tier === 'yearly');
    if (btnLifetime) btnLifetime.classList.toggle('active', tier === 'lifetime');

    // Update active-tab-card class on cards (for mobile display)
    const cardFree = document.getElementById('vip-card-free');
    const cardMonthly = document.getElementById('vip-card-monthly');
    const cardYearly = document.getElementById('vip-card-yearly');
    const cardLifetime = document.getElementById('vip-card-lifetime');

    if (cardFree) cardFree.classList.toggle('active-tab-card', tier === 'free');
    if (cardMonthly) cardMonthly.classList.toggle('active-tab-card', tier === 'monthly');
    if (cardYearly) cardYearly.classList.toggle('active-tab-card', tier === 'yearly');
    if (cardLifetime) cardLifetime.classList.toggle('active-tab-card', tier === 'lifetime');
  }

  function openVipPricingModal() {
    const modal = document.getElementById('modal-vip-pricing');
    if (!modal) return;

    const isGuest = !currentUser || !currentUser.email;
    const gView = document.getElementById('vip-guest-lock-view');
    const aView = document.getElementById('vip-main-authenticated-view');
    if (isGuest) {
      if (gView) gView.style.display = 'block';
      if (aView) aView.style.display = 'none';
      modal.classList.add('active');
      return;
    }
    if (gView) gView.style.display = 'none';
    if (aView) aView.style.display = 'flex';

    modal.classList.add('active');

    const box = document.getElementById('vip-payment-info-box');
    if (box) box.style.display = 'none';

    // Special Event Discount Banner & Pricing (v0.10.9-alpha-22)
    const discount = getStoreActiveDiscount();
    const vipSaleBanner = document.getElementById('vip-sale-event-banner');
    if (vipSaleBanner) {
      if (discount.isDiscountActive) {
        vipSaleBanner.style.display = 'block';
        vipSaleBanner.innerHTML = `<span>${discount.bannerText}</span>`;
      } else {
        vipSaleBanner.style.display = 'none';
      }
    }

    const vipPriceMonthly = document.getElementById('vip-price-display-monthly');
    const vipPriceYearly = document.getElementById('vip-price-display-yearly');
    const vipPriceLifetime = document.getElementById('vip-price-display-lifetime');
    const vipEquivYearly = document.getElementById('vip-monthly-equiv-yearly');

    if (discount.isDiscountActive) {
      const finalMonthly = applyStoreDiscountToPrice(39000);
      const finalYearly = applyStoreDiscountToPrice(299000);
      const finalLifetime = applyStoreDiscountToPrice(599000);
      const equivMonthly = Math.round(finalYearly / 12);
      if (vipPriceMonthly) vipPriceMonthly.innerHTML = `<s>39.000đ</s> <strong style="color: #ffd700;">${finalMonthly.toLocaleString('vi-VN')}đ</strong>`;
      if (vipPriceYearly) vipPriceYearly.innerHTML = `<s>299.000đ</s> <strong style="color: #ffd700;">${finalYearly.toLocaleString('vi-VN')}đ</strong>`;
      if (vipPriceLifetime) vipPriceLifetime.innerHTML = `<s>599.000đ</s> <strong style="color: #ffd700;">${finalLifetime.toLocaleString('vi-VN')}đ</strong>`;
      if (vipEquivYearly) vipEquivYearly.textContent = `Chỉ ~${equivMonthly.toLocaleString('vi-VN')}đ / tháng (-${discount.discountPct}%)`;
    } else {
      if (vipPriceMonthly) vipPriceMonthly.textContent = '39.000đ';
      if (vipPriceYearly) vipPriceYearly.textContent = '299.000đ';
      if (vipPriceLifetime) vipPriceLifetime.textContent = '599.000đ';
      if (vipEquivYearly) vipEquivYearly.textContent = 'Chỉ ~25.000đ / tháng';
    }

    // Check user's current VIP status
    const isVip = isUserVip();
    const currentTier = getUserVipTier();
    const expiryTimestamp = userVipExpiresAt || 0;
    const expiryDateStr = expiryTimestamp > 0 ? new Date(expiryTimestamp).toLocaleDateString('vi-VN') : '';

    const bannerEl = document.getElementById('vip-current-status-banner');
    const bannerTierEl = document.getElementById('vip-banner-current-tier');
    const bannerExpiryEl = document.getElementById('vip-banner-expiry-info');

    // Cards & Buttons
    const cardFree = document.getElementById('vip-card-free');
    const btnFree = document.getElementById('btn-plan-free');

    const cardMonthly = document.getElementById('vip-card-monthly');
    const btnMonthly = document.getElementById('btn-plan-monthly');

    const cardYearly = document.getElementById('vip-card-yearly');
    const btnYearly = document.getElementById('btn-plan-yearly');

    const cardLifetime = document.getElementById('vip-card-lifetime');
    const btnLifetime = document.getElementById('btn-plan-lifetime');

    if (isVip) {
      if (bannerEl) bannerEl.style.display = 'flex';
      const durationLabel = formatVipDurationText(expiryTimestamp, currentTier);
      if (bannerTierEl) bannerTierEl.textContent = `VIP ${durationLabel}`;
      if (bannerExpiryEl) {
        bannerExpiryEl.innerHTML = currentTier === 'lifetime'
          ? 'Đặc quyền sở hữu: <strong>Vĩnh Viễn (Không bao giờ hết hạn)</strong>'
          : `Thời hạn hiện tại đến: <strong style="color: #fbbf24;">${expiryDateStr}</strong> (${durationLabel})`;
      }

      if (cardFree) { cardFree.style.opacity = '0.5'; cardFree.style.filter = 'grayscale(0.6)'; }
      if (btnFree) { btnFree.disabled = true; btnFree.textContent = '🌱 Gói Cơ Bản'; btnFree.style.cursor = 'default'; }

      if (currentTier === 'lifetime') {
        // All locked because already highest
        if (cardMonthly) { cardMonthly.style.opacity = '0.5'; cardMonthly.style.filter = 'grayscale(0.6)'; }
        if (btnMonthly) { btnMonthly.disabled = true; btnMonthly.textContent = '🔒 Đã có VIP Trọn Đời'; btnMonthly.style.cursor = 'not-allowed'; }

        if (cardYearly) { cardYearly.style.opacity = '0.5'; cardYearly.style.filter = 'grayscale(0.6)'; }
        if (btnYearly) { btnYearly.disabled = true; btnYearly.textContent = '🔒 Đã có VIP Trọn Đời'; btnYearly.style.cursor = 'not-allowed'; }

        if (cardLifetime) { cardLifetime.style.opacity = '1'; cardLifetime.style.border = '2px solid #a855f7'; }
        if (btnLifetime) { btnLifetime.disabled = true; btnLifetime.textContent = '👑 Đã Sở Hữu Vĩnh Viễn'; btnLifetime.style.cursor = 'default'; }

      } else if (currentTier === 'yearly') {
        // Monthly locked, Yearly active/locked, Lifetime open for upgrade
        if (cardMonthly) { cardMonthly.style.opacity = '0.5'; cardMonthly.style.filter = 'grayscale(0.6)'; }
        if (btnMonthly) { btnMonthly.disabled = true; btnMonthly.textContent = `🔒 Đã có VIP (${durationLabel})`; btnMonthly.style.cursor = 'not-allowed'; }

        if (cardYearly) { cardYearly.style.opacity = '0.9'; cardYearly.style.border = '2px solid #10b981'; }
        if (btnYearly) { btnYearly.disabled = true; btnYearly.textContent = `✓ Đang Dùng (Đến ${expiryDateStr})`; btnYearly.style.background = 'rgba(16,185,129,0.2)'; btnYearly.style.borderColor = 'rgba(16,185,129,0.5)'; btnYearly.style.cursor = 'default'; }

        if (cardLifetime) { cardLifetime.style.opacity = '1'; cardLifetime.style.border = '2px solid #a855f7'; }
        if (btnLifetime) { btnLifetime.disabled = false; btnLifetime.textContent = '👑 Nâng Cấp Lên Trọn Đời'; btnLifetime.style.cursor = 'pointer'; }

      } else if (currentTier === 'monthly') {
        // Monthly active/locked, Yearly open with rollover, Lifetime open
        if (cardMonthly) { cardMonthly.style.opacity = '0.9'; cardMonthly.style.border = '2px solid #10b981'; }
        if (btnMonthly) { btnMonthly.disabled = true; btnMonthly.textContent = `✓ Đang Dùng (Đến ${expiryDateStr})`; btnMonthly.style.background = 'rgba(16,185,129,0.2)'; btnMonthly.style.borderColor = 'rgba(16,185,129,0.5)'; btnMonthly.style.cursor = 'default'; }

        if (cardYearly) { cardYearly.style.opacity = '1'; cardYearly.style.border = '2px solid #f59e0b'; }
        if (btnYearly) { btnYearly.disabled = false; btnYearly.textContent = '🚀 Lên Đời Gói Năm (+365 Ngày)'; btnYearly.style.cursor = 'pointer'; }

        if (cardLifetime) { cardLifetime.style.opacity = '1'; cardLifetime.style.border = '2px solid #a855f7'; }
        if (btnLifetime) { btnLifetime.disabled = false; btnLifetime.textContent = '👑 Nâng Cấp Lên Trọn Đời'; btnLifetime.style.cursor = 'pointer'; }
      }
    } else {
      // Non-VIP: All open, Free is current
      if (bannerEl) bannerEl.style.display = 'none';

      if (cardFree) { cardFree.style.opacity = '1'; cardFree.style.filter = 'none'; cardFree.style.border = '1.5px solid rgba(16,185,129,0.5)'; }
      if (btnFree) { btnFree.disabled = true; btnFree.textContent = '✓ Gói Hiện Tại'; btnFree.style.background = 'rgba(16,185,129,0.12)'; btnFree.style.color = '#34d399'; btnFree.style.borderColor = 'rgba(16,185,129,0.4)'; btnFree.style.cursor = 'default'; }

      if (cardMonthly) { cardMonthly.style.opacity = '1'; cardMonthly.style.filter = 'none'; cardMonthly.style.border = '1px solid var(--border)'; }
      if (btnMonthly) { btnMonthly.disabled = false; btnMonthly.textContent = 'Chọn Gói Tháng'; btnMonthly.style.cursor = 'pointer'; }

      if (cardYearly) { cardYearly.style.opacity = '1'; cardYearly.style.filter = 'none'; cardYearly.style.border = '2px solid #f59e0b'; }
      if (btnYearly) { btnYearly.disabled = false; btnYearly.textContent = '🚀 Nâng Cấp Gói Năm'; btnYearly.style.cursor = 'pointer'; }

      if (cardLifetime) { cardLifetime.style.opacity = '1'; cardLifetime.style.filter = 'none'; cardLifetime.style.border = '1.5px solid rgba(168, 85, 247, 0.6)'; }
      if (btnLifetime) { btnLifetime.disabled = false; btnLifetime.textContent = '👑 Sở Hữu Trọn Đời'; btnLifetime.style.cursor = 'pointer'; }
    }

    if (isVip) {
      if (currentTier === 'yearly') {
        switchVipPlanTab('lifetime');
      } else if (currentTier === 'monthly') {
        switchVipPlanTab('yearly');
      } else if (currentTier === 'lifetime') {
        switchVipPlanTab('lifetime');
      } else {
        switchVipPlanTab('yearly');
      }
    } else {
      switchVipPlanTab('yearly');
    }
  }
  window.openVipPricingModal = openVipPricingModal;

  function getShortUidUpper(uid) {
    if (!uid) return 'GUEST';
    const str = String(uid).trim();
    return (str.length > 16 ? str.substring(0, 16) : str).toUpperCase();
  }
  window.getShortUidUpper = getShortUidUpper;

  function getCleanTransferSyntax(tierOrCode) {
    const rawUid = (currentUser && currentUser.uid) ? currentUser.uid : 'GUEST';
    const shortUid = getShortUidUpper(rawUid);
    const tierCodes = {
      'monthly': '1M',
      'yearly': '1Y',
      'lifetime': 'LT',
      '1m': '1M',
      '1y': '1Y',
      'lt': 'LT',
      's5': 'S5',
      's15': 'S15',
      's40': 'S40'
    };
    const code = tierCodes[String(tierOrCode).toLowerCase()] || String(tierOrCode).toUpperCase();
    return `VOCA ${shortUid} ${code}`;
  }
  window.getCleanTransferSyntax = getCleanTransferSyntax;

  function selectVipPlan(tier, name, priceStr, amount) {
    switchVipPlanTab(tier);
    const discount = getStoreActiveDiscount();
    const finalAmount = applyStoreDiscountToPrice(amount);
    const finalPriceStr = discount.isDiscountActive ? `${finalAmount.toLocaleString('vi-VN')}đ (-${discount.discountPct}%)` : priceStr;
    const syntax = getCleanTransferSyntax(tier);
    currentSelectedVipPlan = { tier, name, priceStr: finalPriceStr, amount: finalAmount, syntax };

    const box = document.getElementById('vip-payment-info-box');
    const planNameEl = document.getElementById('vip-selected-plan-name');
    const planPriceEl = document.getElementById('vip-selected-plan-price');
    const syntaxEl = document.getElementById('vip-transfer-syntax');
    const qrImg = document.getElementById('vip-vietqr-img');
    const rolloverNoticeEl = document.getElementById('vip-rollover-notice');
    const rolloverTextEl = document.getElementById('vip-rollover-text');

    if (planNameEl) planNameEl.textContent = name;
    if (planPriceEl) planPriceEl.textContent = finalPriceStr;
    if (syntaxEl) syntaxEl.textContent = syntax;

    // Calculate rollover date if active
    const isVip = isUserVip();
    const currentTier = getUserVipTier();
    const currentExpiry = userVipExpiresAt || 0;

    if (isVip && currentExpiry > Date.now() && tier !== 'lifetime') {
      const addedDays = tier === 'yearly' ? 365 : 30;
      const newExpiry = new Date(currentExpiry + addedDays * 86400000);
      if (rolloverNoticeEl) rolloverNoticeEl.style.display = 'flex';
      if (rolloverTextEl) {
        rolloverTextEl.innerHTML = `Thời hạn gói ${name} sẽ được <strong>cộng dồn nối tiếp</strong> từ hạn gói cũ đến ngày: <strong style="color:#ffd700;">${newExpiry.toLocaleDateString('vi-VN')}</strong>.`;
      }
    } else if (tier === 'lifetime') {
      if (rolloverNoticeEl) rolloverNoticeEl.style.display = 'flex';
      if (rolloverTextEl) {
        const userEmail = (currentUser && currentUser.email) ? currentUser.email : 'của bạn';
        rolloverTextEl.innerHTML = `👑 Gói VocaVIP Trọn Đời sẽ kích hoạt <strong>vĩnh viễn</strong> ngay lập tức cho tài khoản ${escapeHtml(userEmail)}.`;
      }
    } else {
      if (rolloverNoticeEl) rolloverNoticeEl.style.display = 'none';
    }

    const payAmountDisplay = document.getElementById('vip-pay-amount-display');
    if (payAmountDisplay) payAmountDisplay.textContent = `${finalAmount.toLocaleString('vi-VN')}đ`;

    if (qrImg) {
      qrImg.src = `https://img.vietqr.io/image/970422-0916541813-compact2.png?amount=${finalAmount}&addInfo=${encodeURIComponent(syntax)}&accountName=NONG%20DUC%20HAO`;
    }

    if (box) {
      box.style.display = 'block';
      box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function copyAccountNumber() {
    const accEl = document.getElementById('vip-acc-number');
    if (accEl) {
      const text = accEl.textContent.trim();
      navigator.clipboard.writeText(text).then(() => {
        showToast('📋 Đã sao chép STK MB Bank: ' + text);
      }).catch(() => {
        showToast('STK: ' + text);
      });
    }
  }

  function copyTransferSyntax() {
    const syntaxEl = document.getElementById('vip-transfer-syntax');
    if (syntaxEl) {
      const text = syntaxEl.textContent.trim();
      navigator.clipboard.writeText(text).then(() => {
        showToast('📋 Đã sao chép cú pháp chuyển khoản: ' + text);
      }).catch(() => {
        showToast('Cú pháp: ' + text);
      });
    }
  }

  function confirmVipPaymentSubmitted() {
    const syntax = currentSelectedVipPlan.syntax || getCleanTransferSyntax(currentSelectedVipPlan.tier);
    const pendingPayment = {
      id: 'pay_' + Date.now(),
      tier: currentSelectedVipPlan.tier,
      planName: currentSelectedVipPlan.name,
      priceStr: currentSelectedVipPlan.priceStr,
      amount: currentSelectedVipPlan.amount,
      syntax: syntax,
      timestamp: Date.now(),
      status: 'pending'
    };
    localStorage.setItem('vocaflow_pending_vip_payment', JSON.stringify(pendingPayment));

    // 1. Send Pending Notification to Notification Center
    if (typeof addNotification === 'function') {
      addNotification(
        'FINANCIAL',
        `⏳ Đang Đối Soát Chuyển Khoản ${currentSelectedVipPlan.name}`,
        `Hệ thống đã ghi nhận yêu cầu nâng cấp gói ${currentSelectedVipPlan.name} (${currentSelectedVipPlan.priceStr}) với cú pháp "${syntax}". Thời gian đối soát thông thường từ 1 - 5 phút.`
      );
    }

    showToast('⏳ Đã gửi yêu cầu đối soát! Hệ thống đang kiểm tra giao dịch (1-5 phút).');
    closeModal('modal-vip-pricing');

    // 2. Schedule verification check after 2.5 minutes
    setTimeout(() => {
      checkPendingVipPaymentStatus();
    }, 150000);
  }

  function checkPendingVipPaymentStatus() {
    const rawPending = localStorage.getItem('vocaflow_pending_vip_payment');
    if (!rawPending) return;
    try {
      const pending = JSON.parse(rawPending);
      if (pending.status === 'pending') {
        const isVipNow = isUserVip();
        const currentTier = getUserVipTier();
        if (isVipNow && (currentTier === pending.tier || currentTier === 'lifetime')) {
          // Activated by admin or verified
          localStorage.removeItem('vocaflow_pending_vip_payment');
          if (typeof addNotification === 'function') {
            addNotification(
              'FINANCIAL',
              `👑 Kích Hoạt ${pending.planName} Thành Công!`,
              `Hệ thống đã xác nhận thanh toán thành công. Toàn bộ đặc quyền VocaVIP của bạn đã được kích hoạt!`
            );
          }
        } else {
          // Not received / unverified after window
          localStorage.removeItem('vocaflow_pending_vip_payment');
          if (typeof addNotification === 'function') {
            addNotification(
              'FINANCIAL',
              `⚠️ Đối Soát Chưa Thành Công (${pending.planName})`,
              `Hệ thống chưa tìm thấy giao dịch ${pending.priceStr} với cú pháp "${pending.syntax}". Nếu bạn đã chuyển tiền thực tế, vui lòng liên hệ Admin NONG DUC HAO (SĐT/Zalo: 0876048326) kèm ảnh biên lai để được kích hoạt ngay nhé!`
            );
          }
        }
      }
    } catch (e) {}
  }
