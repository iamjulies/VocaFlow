// =========================================================================

// VOCAFLOW 03-AUTH.JS (v0.10.9-48)

// Firebase Auth, Realtime Sync, Public Profiles, Social Graph, Monetization & Billing

// =========================================================================

    // =========================================================================
    // AVATAR CROPPER & FRAMING ENGINE (v0.10.9-44)
    // =========================================================================
    let avatarCropperState = {
      image: null,
      zoom: 1.0,
      panX: 0,
      panY: 0,
      rotation: 0,
      isDragging: false,
      startX: 0,
      startY: 0,
      canvasSize: 280,
      cropRadius: 115
    };

    function handleAvatarFileUpload(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, WebP, GIF)!');
        return;
      }

      const reader = new FileReader();
      reader.onload = function(evt) {
        openAvatarCropperModal(evt.target.result);
      };
      reader.readAsDataURL(file);
      event.target.value = '';
    }

    function openAvatarCropperModal(imageDataUrl) {
      const img = new Image();
      img.onload = function() {
        avatarCropperState.image = img;
        avatarCropperState.zoom = 1.0;
        avatarCropperState.panX = 0;
        avatarCropperState.panY = 0;
        avatarCropperState.rotation = 0;
        avatarCropperState.isDragging = false;

        const slider = document.getElementById('avatar-crop-zoom-slider');
        if (slider) slider.value = '1.0';
        const label = document.getElementById('avatar-crop-zoom-label');
        if (label) label.textContent = '1.0x';

        initAvatarCropperEvents();
        openModal('modal-avatar-cropper');
        setTimeout(() => {
          drawAvatarCropCanvas();
        }, 50);
      };
      img.src = imageDataUrl;
    }

    let avatarCropperEventsBound = false;
    function initAvatarCropperEvents() {
      if (avatarCropperEventsBound) return;
      const canvas = document.getElementById('avatar-cropper-canvas');
      if (!canvas) return;

      avatarCropperEventsBound = true;

      // Mouse events
      canvas.addEventListener('mousedown', (e) => {
        avatarCropperState.isDragging = true;
        avatarCropperState.startX = e.clientX - avatarCropperState.panX;
        avatarCropperState.startY = e.clientY - avatarCropperState.panY;
        canvas.style.cursor = 'grabbing';
      });

      window.addEventListener('mousemove', (e) => {
        if (!avatarCropperState.isDragging) return;
        avatarCropperState.panX = e.clientX - avatarCropperState.startX;
        avatarCropperState.panY = e.clientY - avatarCropperState.startY;
        drawAvatarCropCanvas();
      });

      window.addEventListener('mouseup', () => {
        if (avatarCropperState.isDragging) {
          avatarCropperState.isDragging = false;
          const canvas = document.getElementById('avatar-cropper-canvas');
          if (canvas) canvas.style.cursor = 'grab';
        }
      });

      // Touch events
      canvas.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length === 1) {
          avatarCropperState.isDragging = true;
          avatarCropperState.startX = e.touches[0].clientX - avatarCropperState.panX;
          avatarCropperState.startY = e.touches[0].clientY - avatarCropperState.panY;
        }
      }, { passive: true });

      canvas.addEventListener('touchmove', (e) => {
        if (!avatarCropperState.isDragging || !e.touches || e.touches.length !== 1) return;
        avatarCropperState.panX = e.touches[0].clientX - avatarCropperState.startX;
        avatarCropperState.panY = e.touches[0].clientY - avatarCropperState.startY;
        drawAvatarCropCanvas();
      }, { passive: true });

      canvas.addEventListener('touchend', () => {
        avatarCropperState.isDragging = false;
      });

      // Mouse Wheel Zoom
      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        adjustAvatarCropZoom(delta);
      }, { passive: false });
    }

    function onAvatarCropZoomInput(val) {
      avatarCropperState.zoom = Math.max(0.8, Math.min(3.5, parseFloat(val) || 1.0));
      const label = document.getElementById('avatar-crop-zoom-label');
      if (label) label.textContent = avatarCropperState.zoom.toFixed(1) + 'x';
      drawAvatarCropCanvas();
    }

    function adjustAvatarCropZoom(delta) {
      avatarCropperState.zoom = Math.max(0.8, Math.min(3.5, Math.round((avatarCropperState.zoom + delta) * 20) / 20));
      const slider = document.getElementById('avatar-crop-zoom-slider');
      if (slider) slider.value = avatarCropperState.zoom.toString();
      const label = document.getElementById('avatar-crop-zoom-label');
      if (label) label.textContent = avatarCropperState.zoom.toFixed(1) + 'x';
      drawAvatarCropCanvas();
    }

    function rotateAvatarCrop(degrees = 90) {
      avatarCropperState.rotation = (avatarCropperState.rotation + degrees) % 360;
      drawAvatarCropCanvas();
    }

    function resetAvatarCrop() {
      avatarCropperState.zoom = 1.0;
      avatarCropperState.panX = 0;
      avatarCropperState.panY = 0;
      avatarCropperState.rotation = 0;
      const slider = document.getElementById('avatar-crop-zoom-slider');
      if (slider) slider.value = '1.0';
      const label = document.getElementById('avatar-crop-zoom-label');
      if (label) label.textContent = '1.0x';
      drawAvatarCropCanvas();
    }

    function drawAvatarCropCanvas() {
      const canvas = document.getElementById('avatar-cropper-canvas');
      if (!canvas || !avatarCropperState.image) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const r = avatarCropperState.cropRadius || 115;

      ctx.clearRect(0, 0, w, h);

      // 1. Draw Image with Transformations
      ctx.save();
      ctx.translate(cx + avatarCropperState.panX, cy + avatarCropperState.panY);
      ctx.rotate((avatarCropperState.rotation * Math.PI) / 180);
      ctx.scale(avatarCropperState.zoom, avatarCropperState.zoom);

      const img = avatarCropperState.image;
      const minDim = Math.min(img.width, img.height);
      const baseScale = (r * 2) / minDim;
      const drawW = img.width * baseScale;
      const drawH = img.height * baseScale;

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      // 2. Draw Dark Semi-transparent Overlay Outside the Crop Circle
      ctx.save();
      ctx.fillStyle = 'rgba(9, 13, 22, 0.76)';
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();

      // 3. Draw Crop Ring Guide
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshair / Grid hints
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
      ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
      ctx.stroke();
      ctx.restore();

      // 4. Update live thumbnail preview
      updateAvatarCropperThumb();
    }

    function updateAvatarCropperThumb() {
      const thumb = document.getElementById('avatar-cropper-preview-thumb');
      if (!thumb || !avatarCropperState.image) return;
      const tCtx = thumb.getContext('2d');
      const tw = thumb.width;
      const th = thumb.height;
      const tcx = tw / 2;
      const tcy = th / 2;
      const tr = tw / 2;

      tCtx.clearRect(0, 0, tw, th);
      tCtx.save();
      tCtx.beginPath();
      tCtx.arc(tcx, tcy, tr, 0, Math.PI * 2);
      tCtx.clip();

      const scaleRatio = tw / (avatarCropperState.cropRadius * 2);
      tCtx.translate(tcx + avatarCropperState.panX * scaleRatio, tcy + avatarCropperState.panY * scaleRatio);
      tCtx.rotate((avatarCropperState.rotation * Math.PI) / 180);
      tCtx.scale(avatarCropperState.zoom * scaleRatio, avatarCropperState.zoom * scaleRatio);

      const img = avatarCropperState.image;
      const minDim = Math.min(img.width, img.height);
      const baseScale = (avatarCropperState.cropRadius * 2) / minDim;
      const drawW = img.width * baseScale;
      const drawH = img.height * baseScale;

      tCtx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      tCtx.restore();
    }

    function confirmAndApplyCroppedAvatar() {
      if (!avatarCropperState.image) return;
      const exportCanvas = document.createElement('canvas');
      const outSize = 256;
      exportCanvas.width = outSize;
      exportCanvas.height = outSize;
      const ctx = exportCanvas.getContext('2d');

      const cx = outSize / 2;
      const cy = outSize / 2;
      const scaleRatio = outSize / (avatarCropperState.cropRadius * 2);

      ctx.translate(cx + avatarCropperState.panX * scaleRatio, cy + avatarCropperState.panY * scaleRatio);
      ctx.rotate((avatarCropperState.rotation * Math.PI) / 180);
      ctx.scale(avatarCropperState.zoom * scaleRatio, avatarCropperState.zoom * scaleRatio);

      const img = avatarCropperState.image;
      const minDim = Math.min(img.width, img.height);
      const baseScale = (avatarCropperState.cropRadius * 2) / minDim;
      const drawW = img.width * baseScale;
      const drawH = img.height * baseScale;

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

      const finalDataUrl = exportCanvas.toDataURL('image/jpeg', 0.88);
      setUserAvatarImage(finalDataUrl);
      closeModal('modal-avatar-cropper');
      showToast('🎉 Đã cắt & cập nhật ảnh đại diện chuẩn hóa thành công!');
    }

    function removeUserAvatar() {
      setUserAvatarImage('');
      showToast('🗑️ Đã xóa ảnh đại diện!');
    }

    function setUserAvatarImage(avatarDataUrl) {
      const avatarTime = Date.now();
      if (avatarDataUrl) {
        localStorage.setItem('vocaflow_user_avatar', avatarDataUrl);
        localStorage.setItem('vocaflow_avatar_time', avatarTime.toString());
      } else {
        localStorage.removeItem('vocaflow_user_avatar');
        localStorage.setItem('vocaflow_avatar_time', avatarTime.toString());
      }

      if (!currentUser) {
        currentUser = { displayName: 'Khách', email: '', avatar: avatarDataUrl, avatarTime: avatarTime };
      } else {
        currentUser.avatar = avatarDataUrl;
        currentUser.avatarTime = avatarTime;
      }
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(currentUser));
      updateAuthUI();

      // Direct real-time cloud write to replace old avatar
      if (currentUser && currentUser.uid) {
        const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
        const authParam = (currentUser && currentUser.idToken) ? '?auth=' + currentUser.idToken : '';

        fetch(rtdbUrl + '/users/' + currentUser.uid + '/profile/avatar.json' + authParam, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(avatarDataUrl || '')
        }).catch(() => {});

        fetch(rtdbUrl + '/users/' + currentUser.uid + '/avatar.json' + authParam, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(avatarDataUrl || '')
        }).catch(() => {});

        fetch(rtdbUrl + '/users/' + currentUser.uid + '/profile/avatarTime.json' + authParam, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(avatarTime)
        }).catch(() => {});

        // Cascade update avatar in publicLibraryDecks (v0.10.6c)
        if (Array.isArray(cloudLibraryDecks)) {
          cloudLibraryDecks.forEach(d => {
            if (isDeckAuthor(d) && !d.isAnonymous) {
              d.authorAvatar = avatarDataUrl || '';
              fetch(rtdbUrl + '/publicLibraryDecks/' + d.id + '/authorAvatar.json' + authParam, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(avatarDataUrl || '')
              }).catch(() => {});
            }
          });
        }

        pushCurrentDatabaseToCloud();
      }
    }

    // BEAUTIFUL ADJUST WALLET MODAL FUNCTIONS (v0.0.9.2)
    function adjustStudentWalletOnCloud(uid, displayName) {
      const student = adminStudentsData.find(s => s.uid === uid);
      if (!student) return;

      editingStudentUid = uid;
      const avEl = document.getElementById('adjust-wallet-avatar');
      const infoEl = document.getElementById('adjust-wallet-student-info');
      const ptsInput = document.getElementById('adjust-wallet-points-input');
      const htsInput = document.getElementById('adjust-wallet-hints-input');
      const sksInput = document.getElementById('adjust-wallet-skips-input');
      const ptsBadge = document.getElementById('adjust-current-points-badge');
      const htsBadge = document.getElementById('adjust-current-hints-badge');
      const sksBadge = document.getElementById('adjust-current-skips-badge');

      if (avEl) avEl.innerHTML = renderAvatarHtml(student.avatar || (displayName ? displayName[0] : 'U'), 40, 18);
      if (infoEl) infoEl.textContent = displayName + ' • ✉️ ' + student.email;
      if (ptsInput) ptsInput.value = student.points;
      if (htsInput) htsInput.value = student.hints;
      if (sksInput) sksInput.value = student.skips || 0;
      if (ptsBadge) ptsBadge.textContent = 'Hiện có: ' + student.points + ' VoCoin';
      if (htsBadge) htsBadge.textContent = 'Hiện có: ' + student.hints + ' VocaHint';
      if (sksBadge) sksBadge.textContent = 'Hiện có: ' + (student.skips || 0) + ' VocaSkip';
      const spsInput = document.getElementById('adjust-wallet-spins-input');
      const spsBadge = document.getElementById('adjust-current-spins-badge');
      if (spsInput) spsInput.value = student.luckySpins || student.spins || 0;
      if (spsBadge) spsBadge.textContent = 'Hiện có: ' + (student.luckySpins || student.spins || 0) + ' lượt';

      const frzInput = document.getElementById('adjust-wallet-freezes-input');
      const frzBadge = document.getElementById('adjust-current-freezes-badge');
      if (frzInput) frzInput.value = student.flowFreezes || 0;
      if (frzBadge) frzBadge.textContent = 'Hiện có: ' + (student.flowFreezes || 0) + ' FlowFreeze';

      const vipSelect = document.getElementById('adjust-wallet-vip-select');
      const vipBadge = document.getElementById('adjust-current-vip-badge');
      if (vipSelect) vipSelect.value = (student.isVip && student.vipTier) ? student.vipTier : 'none';
      if (vipBadge) vipBadge.textContent = student.isVip ? ('VocaVIP ' + (student.vipTier || '').toUpperCase()) : 'Chưa có VocaVIP';

      openModal('modal-admin-adjust-wallet');
    }

    function addAdjustPoints(amount) {
      const input = document.getElementById('adjust-wallet-points-input');
      if (input) input.value = (parseInt(input.value, 10) || 0) + amount;
    }
    function setAdjustPoints(val) {
      const input = document.getElementById('adjust-wallet-points-input');
      if (input) input.value = val;
    }
    function addAdjustHints(amount) {
      const input = document.getElementById('adjust-wallet-hints-input');
      if (input) input.value = (parseInt(input.value, 10) || 0) + amount;
    }
    function setAdjustHints(val) {
      const input = document.getElementById('adjust-wallet-hints-input');
      if (input) input.value = val;
    }
    function addAdjustSkips(amount) {
      const input = document.getElementById('adjust-wallet-skips-input');
      if (input) input.value = (parseInt(input.value, 10) || 0) + amount;
    }
    function setAdjustSkips(val) {
      const input = document.getElementById('adjust-wallet-skips-input');
      if (input) input.value = val;
    }
    function addAdjustSpins(amount) {
      const input = document.getElementById('adjust-wallet-spins-input');
      if (input) input.value = (parseInt(input.value, 10) || 0) + amount;
    }
    function setAdjustSpins(val) {
      const input = document.getElementById('adjust-wallet-spins-input');
      if (input) input.value = val;
    }
    function addAdjustFreezes(amount) {
      const input = document.getElementById('adjust-wallet-freezes-input');
      if (input) input.value = (parseInt(input.value, 10) || 0) + amount;
    }
    function setAdjustFreezes(val) {
      const input = document.getElementById('adjust-wallet-freezes-input');
      if (input) input.value = val;
    }

    async function saveAdjustStudentWalletCloud() {
      if (!editingStudentUid) return;
      const student = adminStudentsData.find(s => s.uid === editingStudentUid);
      if (!student) return;

      const ptsInput = document.getElementById('adjust-wallet-points-input');
      const htsInput = document.getElementById('adjust-wallet-hints-input');
      const sksInput = document.getElementById('adjust-wallet-skips-input');
      const spsInput = document.getElementById('adjust-wallet-spins-input');
      const frzInput = document.getElementById('adjust-wallet-freezes-input');

      const newPoints = parseInt(ptsInput ? ptsInput.value : '0', 10) || 0;
      const newHints = parseInt(htsInput ? htsInput.value : '0', 10) || 0;
      const newSkips = parseInt(sksInput ? sksInput.value : '0', 10) || 0;
      const newSpins = parseInt(spsInput ? spsInput.value : '0', 10) || 0;
      const newFreezes = parseInt(frzInput ? frzInput.value : '0', 10) || 0;

      const vipSelect = document.getElementById('adjust-wallet-vip-select');
      const selectedVipTier = vipSelect ? vipSelect.value : 'none';
      const isVipGranted = (selectedVipTier !== 'none');
      const durationDays = selectedVipTier === 'monthly' ? 30 : (selectedVipTier === 'yearly' ? 365 : 0);
      const newVipExpiresAt = (isVipGranted && durationDays > 0) ? (Date.now() + durationDays * 86400000) : 0;

      const btn = document.getElementById('btn-save-adjust-wallet');
      if (btn) btn.textContent = '⏳ Đang lưu lên Cloud...';

      const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
      const authParam = (currentUser && currentUser.idToken) ? '?auth=' + currentUser.idToken : '';

      try {
        const payload = {
          points: newPoints,
          hints: newHints,
          skips: newSkips,
          luckySpins: newSpins,
          flowFreezes: newFreezes,
          streakFreezes: newFreezes,
          updatedAt: new Date().toISOString(),
          updatedBy: 'Admin (Publisher Portal)'
        };

        const res = await fetch(rtdbUrl + '/users/' + editingStudentUid + '/economy.json' + authParam, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          student.points = newPoints;
          student.hints = newHints;
          student.skips = newSkips;
          student.spins = newSpins;
          student.luckySpins = newSpins;
          student.flowFreezes = newFreezes;
          student.isVip = isVipGranted;
          student.vipTier = selectedVipTier;

          // Save VIP to user's profile on Cloud
          const vipProfilePayload = {
            isVip: isVipGranted,
            vipTier: selectedVipTier,
            vipExpiresAt: newVipExpiresAt
          };
          fetch(rtdbUrl + '/users/' + editingStudentUid + '/profile.json' + authParam, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vipProfilePayload)
          }).catch(() => {});
          fetch(rtdbUrl + '/users/' + editingStudentUid + '.json' + authParam, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vipProfilePayload)
          }).catch(() => {});

          // Also sync to root keys & flow subnodes for backwards-compatibility
          fetch(rtdbUrl + '/users/' + editingStudentUid + '/points.json' + authParam, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newPoints)
          }).catch(() => {});
          fetch(rtdbUrl + '/users/' + editingStudentUid + '/hints.json' + authParam, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newHints)
          }).catch(() => {});
          fetch(rtdbUrl + '/users/' + editingStudentUid + '/skips.json' + authParam, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSkips)
          }).catch(() => {});
          fetch(rtdbUrl + '/users/' + editingStudentUid + '/flowFreezes.json' + authParam, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newFreezes)
          }).catch(() => {});
          fetch(rtdbUrl + '/users/' + editingStudentUid + '/streakFreezes.json' + authParam, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newFreezes)
          }).catch(() => {});
          fetch(rtdbUrl + '/users/' + editingStudentUid + '/flow/freezes.json' + authParam, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newFreezes)
          }).catch(() => {});

          // If updating currently logged in user, apply immediately locally
          if (currentUser && currentUser.uid === editingStudentUid) {
            userIsVip = isVipGranted;
            userVipTier = selectedVipTier;
            userVipExpiresAt = newVipExpiresAt;
            currentUser.isVip = isVipGranted;
            currentUser.vipTier = selectedVipTier;
            currentUser.vipExpiresAt = newVipExpiresAt;
            localStorage.setItem('vocaflow_user_is_vip', isVipGranted ? 'true' : 'false');
            localStorage.setItem('vocaflow_user_vip_tier', selectedVipTier);
            localStorage.setItem('vocaflow_user_vip_expires_at', newVipExpiresAt.toString());
            localStorage.setItem('vocaflow_flow_freezes', newFreezes.toString());
            localStorage.setItem('vocaflow_streak_freezes', newFreezes.toString());
            localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(currentUser));
            userFlowFreezes = newFreezes;
            if (typeof updateFlowUI === 'function') updateFlowUI();
            updateAuthUI();
          }

          renderAdminStudentsTable();
          closeModal('modal-admin-adjust-wallet');
          showToast('🎉 Đã cập nhật ví, VocaVIP và FlowFreeze cho Flower "' + student.displayName + '" thành công!');
        } else {
          alert('Không thể lưu lên Cloud! Vui lòng thử lại.');
        }
      } catch (err) {
        alert('Lỗi cập nhật: ' + err.message);
      } finally {
        if (btn) btn.textContent = '🚀 Lưu Lên Cloud Ngay';
      }
    }

    function openPublisherModal(defaultTab = 'students') {
      openModal('modal-publisher');
      switchPublisherTab(defaultTab);
      refreshAdminPublisherWalletUI();
      fetchAdminBugReportsList();
      if (defaultTab === 'students') {
        fetchAdminStudentsList();
      }
    }
    window.openPublisherModal = openPublisherModal;

    function openGodMode() {
      openPublisherModal('wallet');
    }
    window.openGodMode = openGodMode;

    function openPublisherPortal(defaultTab = 'students') {
      openPublisherModal(defaultTab);
    }
    window.openPublisherPortal = openPublisherPortal;

    // v0.10.9-45: Removed 5-click easter egg for Admin Portal (accessible via Settings if configured)
    function handleVersionBadgeMultiClick(e) {}
    window.handleVersionBadgeMultiClick = handleVersionBadgeMultiClick;

    // =========================================================================
    // VIP GATEWAY & MACRO RECONCILIATION ENGINE (v0.10.8-alpha-10.6 - AI RECONCILER)
    // =========================================================================
    let adminBankTransactions = [];

    function toggleMacroGuideDetails() {
      const box = document.getElementById('macro-guide-details-box');
      const icon = document.getElementById('macro-guide-toggle-icon');
      if (box) {
        const isHidden = (box.style.display === 'none' || !box.style.display);
        box.style.display = isHidden ? 'block' : 'none';
        if (icon) icon.textContent = isHidden ? '▲' : '▼';
      }
    }
    window.toggleMacroGuideDetails = toggleMacroGuideDetails;

    // =========================================================================
    // UNIVERSAL GUEST FEATURE LOCK MODAL HANDLER
    // =========================================================================
    function openGuestFeatureLockModal(featureName, featureDesc, icon = '💼 🔒', subtitle = '') {
      const modal = document.getElementById('modal-feature-guest-lock');
      if (!modal) return;
      
      const iconEl = document.getElementById('guest-lock-icon');
      const titleEl = document.getElementById('guest-lock-feature-title');
      const descEl = document.getElementById('guest-lock-desc');

      if (iconEl) iconEl.textContent = icon;
      if (titleEl) titleEl.textContent = subtitle || 'Tính Năng Độc Quyền Cho Thành Viên';
      if (descEl) {
        descEl.innerHTML = `Bạn đang sử dụng ở chế độ <strong>Khách (Guest)</strong>. Hãy đăng ký hoặc đăng nhập tài khoản để mở khóa <strong>${featureDesc}</strong>!`;
      }
      openModal('modal-feature-guest-lock');
    }
    window.openGuestFeatureLockModal = openGuestFeatureLockModal;

    // =========================================================================
    // MULTI-IMAGE OCR & BANKING BILL RECONCILER (v0.10.8-released-debug-0.4)
    // =========================================================================
    let adminMultiBillImages = []; // [{ id, name, sizeStr, fullDataUrl, base64, mimeType, status, result, error }]

    function handleAdminMultiBillFilesSelected(e) {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      addAdminMultiBillFiles(Array.from(files));
      e.target.value = '';
    }
    window.handleAdminMultiBillFilesSelected = handleAdminMultiBillFilesSelected;

    function handleAdminMultiBillFilesDropped(e) {
      if (e.dataTransfer && e.dataTransfer.files) {
        const files = Array.from(e.dataTransfer.files).filter(f => f.type && f.type.startsWith('image/'));
        if (files.length > 0) {
          addAdminMultiBillFiles(files);
        }
      }
    }
    window.handleAdminMultiBillFilesDropped = handleAdminMultiBillFilesDropped;

    async function pasteAdminMultiBillFromClipboard() {
      try {
        if (navigator.clipboard && navigator.clipboard.read) {
          const items = await navigator.clipboard.read();
          const imageBlobs = [];
          for (const item of items) {
            for (const type of item.types) {
              if (type.startsWith('image/')) {
                const blob = await item.getType(type);
                imageBlobs.push(blob);
              }
            }
          }
          if (imageBlobs.length > 0) {
            addAdminMultiBillFiles(imageBlobs);
            return;
          }
        }
        showToast('💡 Bấm phím Ctrl + V khi đang mở tab để dán ảnh bill trực tiếp từ clipboard!');
      } catch (err) {
        showToast('💡 Bấm phím Ctrl + V để dán ảnh bill trực tiếp!');
      }
    }
    window.pasteAdminMultiBillFromClipboard = pasteAdminMultiBillFromClipboard;

    function handleAdminBankingImagePaste(e) {
      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData || !clipboardData.items) return;
      const blobs = [];
      for (const item of clipboardData.items) {
        if (item.type && item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) blobs.push(blob);
        }
      }
      if (blobs.length > 0) {
        e.preventDefault();
        addAdminMultiBillFiles(blobs);
      }
    }
    window.handleAdminBankingImagePaste = handleAdminBankingImagePaste;

    // Listen on global window paste when publisher modal is open
    window.addEventListener('paste', (e) => {
      const pubModal = document.getElementById('modal-publisher');
      if (pubModal && pubModal.classList.contains('active')) {
        const vipTab = document.getElementById('pub-tab-content-vip-gateway');
        if (vipTab && vipTab.style.display !== 'none') {
          handleAdminBankingImagePaste(e);
        }
      }
    });

    function addAdminMultiBillFiles(fileList) {
      if (!fileList || fileList.length === 0) return;
      const MAX_IMAGES = 5;
      const remainingSlots = MAX_IMAGES - adminMultiBillImages.length;
      if (remainingSlots <= 0) {
        showToast(`⚠️ Đã đạt giới hạn tối đa ${MAX_IMAGES} ảnh cùng lúc! Vui lòng xóa bớt hoặc quét ảnh hiện tại.`);
        return;
      }

      const accepted = fileList.slice(0, remainingSlots);
      let loadedCount = 0;

      accepted.forEach((file, idx) => {
        const reader = new FileReader();
        reader.onload = function(evt) {
          const fullDataUrl = evt.target.result;
          const mimeType = (file.type || 'image/png').toLowerCase();
          const base64 = fullDataUrl.split(',')[1];
          const sizeKb = Math.round((file.size || (base64.length * 0.75)) / 1024);
          const sizeStr = sizeKb >= 1024 ? (sizeKb / 1024).toFixed(1) + ' MB' : sizeKb + ' KB';

          adminMultiBillImages.push({
            id: 'bill_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4) + '_' + idx,
            name: file.name || `Ảnh biên lai ${adminMultiBillImages.length + 1}`,
            sizeStr: sizeStr,
            fullDataUrl: fullDataUrl,
            base64: base64,
            mimeType: mimeType,
            status: 'pending', // 'pending' | 'processing' | 'completed' | 'error'
            result: null,
            error: null
          });

          loadedCount++;
          if (loadedCount === accepted.length) {
            renderAdminMultiBillThumbnails();
            showToast(`📷 Đã nạp thêm ${accepted.length} ảnh bill (Tổng: ${adminMultiBillImages.length}/5 ảnh)!`);
          }
        };
        reader.readAsDataURL(file);
      });

      if (fileList.length > remainingSlots) {
        showToast(`⚠️ Chỉ thêm được ${remainingSlots} ảnh do giới hạn tối đa 5 ảnh 1 lần.`);
      }
    }
    window.addAdminMultiBillFiles = addAdminMultiBillFiles;

    function removeAdminMultiBillImage(index) {
      if (index >= 0 && index < adminMultiBillImages.length) {
        adminMultiBillImages.splice(index, 1);
        renderAdminMultiBillThumbnails();
        renderAdminMultiBillResultsUI();
        showToast('🗑️ Đã xóa 1 ảnh khỏi danh sách.');
      }
    }
    window.removeAdminMultiBillImage = removeAdminMultiBillImage;

    function clearAllAdminMultiBillImages() {
      adminMultiBillImages = [];
      renderAdminMultiBillThumbnails();
      const resultsBox = document.getElementById('admin-multi-bill-results');
      if (resultsBox) {
        resultsBox.style.display = 'none';
        resultsBox.innerHTML = '';
      }
      showToast('🗑️ Đã xóa toàn bộ ảnh bill.');
    }
    window.clearAllAdminMultiBillImages = clearAllAdminMultiBillImages;

    function renderAdminMultiBillThumbnails() {
      const galleryCont = document.getElementById('admin-multi-bill-gallery-container');
      const countLabel = document.getElementById('admin-multi-bill-count-label');
      const thumbsGrid = document.getElementById('admin-multi-bill-thumbnails');
      const dropzone = document.getElementById('admin-multi-bill-dropzone');

      if (!galleryCont || !thumbsGrid) return;

      if (adminMultiBillImages.length === 0) {
        galleryCont.style.display = 'none';
        thumbsGrid.innerHTML = '';
        if (dropzone) dropzone.style.display = 'block';
        return;
      }

      galleryCont.style.display = 'block';
      if (countLabel) {
        countLabel.textContent = `Danh sách ảnh đã nạp (${adminMultiBillImages.length}/5 ảnh)`;
      }

      let html = '';
      adminMultiBillImages.forEach((img, idx) => {
        let statusBadge = '<span class="badge" style="background: rgba(100,116,139,0.2); color: #94a3b8; font-size: 9.5px;">Chờ quét</span>';
        if (img.status === 'processing') {
          statusBadge = '<span class="badge" style="background: rgba(245,158,11,0.2); color: #fbbf24; font-size: 9.5px;">⏳ Đang quét...</span>';
        } else if (img.status === 'completed') {
          statusBadge = img.result && img.result.matchedStudent ? '<span class="badge" style="background: rgba(16,185,129,0.2); color: #34d399; font-size: 9.5px;">✅ Khớp</span>' : '<span class="badge" style="background: rgba(245,158,11,0.2); color: #fbbf24; font-size: 9.5px;">⚠️ Chưa khớp</span>';
        } else if (img.status === 'error') {
          statusBadge = '<span class="badge" style="background: rgba(239,68,68,0.2); color: #f87171; font-size: 9.5px;">❌ Lỗi</span>';
        }

        html += `
          <div style="position: relative; background: var(--surface); border: 1.5px solid ${img.status === 'completed' ? (img.result?.matchedStudent ? '#10b981' : '#f59e0b') : 'var(--border)'}; border-radius: 10px; overflow: hidden; padding: 6px; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
            <div style="position: relative; width: 100%; height: 100px; border-radius: 6px; overflow: hidden; background: #0f172a; display: flex; align-items: center; justify-content: center;">
              <img src="${img.fullDataUrl}" alt="${escapeHtml(img.name)}" style="width: 100%; height: 100%; object-fit: cover;">
              <button type="button" onclick="event.stopPropagation(); removeAdminMultiBillImage(${idx});" style="position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; border-radius: 50%; background: rgba(0,0,0,0.7); border: 1px solid rgba(255,255,255,0.3); color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; cursor: pointer;" title="Xóa ảnh này">
                ✕
              </button>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px;">
              <span style="font-size: 10.5px; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70px;">#${idx + 1}. ${escapeHtml(img.name)}</span>
              ${statusBadge}
            </div>
            <div style="font-size: 9.5px; color: var(--text-muted);">${img.sizeStr}</div>
          </div>
        `;
      });

      thumbsGrid.innerHTML = html;
    }
    window.renderAdminMultiBillThumbnails = renderAdminMultiBillThumbnails;

    async function processAdminMultiBillImagesAi() {
      if (!adminMultiBillImages || adminMultiBillImages.length === 0) {
        showToast('⚠️ Vui lòng nạp hoặc dán ít nhất 1 ảnh bill trước!');
        return;
      }

      const resultsBox = document.getElementById('admin-multi-bill-results');
      const processBtn = document.getElementById('btn-process-multi-bills');
      if (!resultsBox) return;

      resultsBox.style.display = 'flex';
      resultsBox.innerHTML = `
        <div style="background: rgba(0,0,0,0.35); border: 1.5px solid #818cf8; border-radius: 12px; padding: 18px; text-align: center;">
          <div style="font-size: 24px; margin-bottom: 6px;">⏳</div>
          <div style="font-size: 14px; font-weight: 700; color: #818cf8;">Đang dùng AI Gemini Vision phân tích đồng loạt ${adminMultiBillImages.length} ảnh biên lai...</div>
          <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px;">Hệ thống đang bóc tách số tiền, mã 16 ký tự UID và đối soát với danh sách Flower.</div>
        </div>
      `;

      if (processBtn) {
        processBtn.disabled = true;
        processBtn.textContent = '⏳ Đang quét AI...';
      }

      if (!adminStudentsData || adminStudentsData.length === 0) {
        await fetchAdminStudentsList();
      }

      const apiKey = getEffectiveGeminiApiKey();

      const packageNames = {
        '1M': '👑 VocaVIP Tháng (39k)',
        '1Y': '🟡 VocaVIP Năm (299k)',
        'LT': '👑 VocaVIP Trọn Đời (599k)',
        'S5': '🎡 5 VocaSpin (10k)',
        'S15': '🎡 15 VocaSpin (25k)',
        'S40': '🎡 40 VocaSpin (50k)'
      };

      for (let i = 0; i < adminMultiBillImages.length; i++) {
        const item = adminMultiBillImages[i];
        item.status = 'processing';
        renderAdminMultiBillThumbnails();

        try {
          let extractedText = '';
          let extractedAmount = 0;
          let extractedShortUid = '';
          let extractedCode = '';

          if (apiKey) {
            const promptText = `Bạn là chuyên gia đối soát ngân hàng Việt Nam. Hãy đọc ảnh chụp màn hình giao dịch / biến động số dư ngân hàng này và trích xuất:
1. Số tiền giao dịch (VND)
2. Mã 16 ký tự UID (nằm sau chữ VOCA)
3. Mã gói (1M, 1Y, LT, S5, S15, S40...)
4. Toàn bộ nội dung văn bản hiển thị trên biên lai/thông báo

Trả về DUY NHẤT 1 JSON (không bọc trong markdown hay bất kỳ chữ nào khác):
{
  "rawText": "toàn bộ chữ trên ảnh",
  "amount": 50000,
  "shortUid": "MJFITS6BTHWAJB6M",
  "code": "S40"
}`;

            const visionModels = (typeof GEMINI_VISION_MODELS !== 'undefined' && GEMINI_VISION_MODELS.length > 0) ? GEMINI_VISION_MODELS : ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
            for (const vModel of visionModels) {
              try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${vModel}:generateContent?key=${apiKey}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [{
                      parts: [
                        { text: promptText },
                        { inlineData: { mimeType: item.mimeType || 'image/png', data: item.base64 } }
                      ]
                    }],
                    generationConfig: { temperature: 0.1 }
                  })
                });

                if (response.ok) {
                  const data = await response.json();
                  let rawJsonStr = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                  rawJsonStr = rawJsonStr.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
                  try {
                    const aiParsed = JSON.parse(rawJsonStr);
                    extractedText = aiParsed.rawText || '';
                    extractedAmount = aiParsed.amount || 0;
                    extractedShortUid = aiParsed.shortUid || '';
                    extractedCode = aiParsed.code || '';
                  } catch (jsonErr) {
                    extractedText = rawJsonStr;
                  }
                  if (extractedText || extractedShortUid) break;
                }
              } catch (vErr) {
                console.warn(`Vision model ${vModel} error:`, vErr);
              }
            }
          }

          // Run Multi-Layer parser fallback
          const parsed = parseBankTransactionMultiLayer(extractedText || ('VOCA ' + extractedShortUid + ' ' + extractedCode), adminStudentsData);
          const finalShortUid = extractedShortUid || (parsed ? parsed.shortUid : '');
          const finalCode = (extractedCode || (parsed ? parsed.code : '')).toUpperCase();
          const finalAmount = extractedAmount || (parsed ? parsed.amount : 0);
          const matchedStudent = (parsed && parsed.matchedStudent) ? parsed.matchedStudent : adminStudentsData.find(s => (s.shortUid || getShortUidUpper(s.uid)).toUpperCase() === finalShortUid.toUpperCase());

          item.status = 'completed';
          item.result = {
            rawText: extractedText,
            shortUid: finalShortUid,
            code: finalCode,
            amount: finalAmount,
            matchedStudent: matchedStudent,
            pkgTitle: packageNames[finalCode] || (finalCode ? `Gói ${finalCode}` : 'Giao dịch ngân hàng'),
            activated: false
          };

        } catch (err) {
          console.error(`Error processing bill image ${i}:`, err);
          item.status = 'error';
          item.error = err.message || 'Lỗi xử lý ảnh';
        }

        renderAdminMultiBillThumbnails();
      }

      if (processBtn) {
        processBtn.disabled = false;
        processBtn.textContent = '🚀 AI Quét & Bóc Tách Toàn Bộ Ảnh';
      }

      renderAdminMultiBillResultsUI();
    }
    window.processAdminMultiBillImagesAi = processAdminMultiBillImagesAi;

    function renderAdminMultiBillResultsUI() {
      const resultsBox = document.getElementById('admin-multi-bill-results');
      if (!resultsBox) return;

      const completedItems = adminMultiBillImages.filter(img => img.status === 'completed' && img.result);
      const readyForActivation = completedItems.filter(img => img.result.matchedStudent && img.result.code && !img.result.activated);

      if (completedItems.length === 0) {
        resultsBox.innerHTML = `
          <div style="background: rgba(239,68,68,0.1); border: 1.5px solid rgba(239,68,68,0.3); border-radius: 12px; padding: 14px; text-align: center; color: #f87171; font-size: 13px;">
            ⚠️ Không thể bóc tách dữ liệu từ các ảnh đã tải lên. Vui lòng kiểm tra lại API Key hoặc chất lượng ảnh.
          </div>
        `;
        return;
      }

      let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 4px;">
          <div style="font-size: 14px; font-weight: 800; color: #34d399; display: flex; align-items: center; gap: 6px;">
            <span>📋</span> <span>Kết Quả Bóc Tách AI (${completedItems.length} ảnh)</span>
          </div>
          ${readyForActivation.length > 1 ? `
            <button type="button" class="btn btn-primary btn-sm" onclick="applyAllValidMultiBills()" style="background: linear-gradient(135deg, #10b981, #059669); border: none; font-weight: 800; font-size: 12px; padding: 6px 16px; box-shadow: 0 4px 14px rgba(16,185,129,0.4);">
              ⚡ Kích Hoạt Toàn Bộ (${readyForActivation.length} Flower Hợp Lệ)
            </button>
          ` : ''}
        </div>
      `;

      adminMultiBillImages.forEach((img, idx) => {
        if (img.status === 'error') {
          html += `
            <div style="background: rgba(0,0,0,0.35); border: 1.5px solid #ef4444; border-radius: 12px; padding: 12px; display: flex; gap: 12px; align-items: center;">
              <img src="${img.fullDataUrl}" alt="" style="width: 54px; height: 54px; object-fit: cover; border-radius: 8px; flex-shrink: 0;">
              <div>
                <strong style="color: #f87171; font-size: 13px;">Ảnh #${idx + 1}: ${escapeHtml(img.name)}</strong>
                <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">⚠️ Lỗi: ${escapeHtml(img.error || 'Không thể bóc tách')}</div>
              </div>
            </div>
          `;
          return;
        }

        const res = img.result;
        if (!res) return;

        const isMatched = !!(res.matchedStudent && res.code);
        const isActivated = !!res.activated;

        html += `
          <div style="background: rgba(0,0,0,0.35); border: 1.5px solid ${isActivated ? '#38bdf8' : (isMatched ? '#34d399' : '#fbbf24')}; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 4px 14px rgba(0,0,0,0.2);">
            <!-- ROW 1: HEADER INFO & BUTTON -->
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <img src="${img.fullDataUrl}" alt="" style="width: 44px; height: 44px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border); flex-shrink: 0;">
                <div>
                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span style="font-size: 12px; font-weight: 700; color: var(--text-muted);">Ảnh #${idx + 1}:</span>
                    <strong style="font-size: 14px; color: #38bdf8; font-family: monospace;">${escapeHtml(res.pkgTitle)}</strong>
                    ${res.amount > 0 ? `<span class="badge" style="background: rgba(16,185,129,0.2); color: #34d399; font-weight: 700; font-size: 11px;">+${res.amount.toLocaleString('vi-VN')} đ</span>` : ''}
                  </div>
                  <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                    🔑 16 Ký tự: <strong style="color: #ffd700; font-family: monospace;">${escapeHtml(res.shortUid || 'Không rõ')}</strong> • Mã gói: <strong style="color: #a5b4fc;">${escapeHtml(res.code || 'N/A')}</strong>
                  </div>
                </div>
              </div>

              <div>
                ${isActivated ? `
                  <button type="button" class="btn btn-sm" disabled style="background: rgba(56,189,248,0.15); color: #38bdf8; border: 1px solid rgba(56,189,248,0.4); font-weight: 700; font-size: 12px; padding: 6px 14px;">
                    ✓ Đã Kích Hoạt Thành Công
                  </button>
                ` : (isMatched ? `
                  <button type="button" class="btn btn-primary btn-sm" onclick="applyMultiBillActionSingle(${idx})" style="font-size: 12px; padding: 6px 14px; background: linear-gradient(135deg, #10b981, #059669); border: none; font-weight: 700; box-shadow: 0 4px 14px rgba(16,185,129,0.4);">
                    ⚡ Kích Hoạt ${escapeHtml(res.code)} Ngay
                  </button>
                ` : `
                  <button type="button" class="btn btn-outline btn-sm" onclick="lookupVipStudentByInput('${escapeHtml(res.shortUid || '')}')" style="font-size: 11.5px; color: #fbbf24; border-color: rgba(245,158,11,0.4);">
                    🔍 Tra Cứu Thủ Công
                  </button>
                `)}
              </div>
            </div>

            <!-- ROW 2: MATCHED STUDENT PROFILE -->
            <div style="display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.03); padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border);">
              ${res.matchedStudent ? `
                <div style="width: 36px; height: 36px; min-width: 36px; border-radius: 50%; background: linear-gradient(135deg, #a855f7, #6366f1); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; overflow: hidden; flex-shrink: 0;">
                  ${renderAvatarHtml(res.matchedStudent.avatar || res.matchedStudent.displayName, 36, 14)}
                </div>
                <div style="flex: 1; min-width: 0;">
                  <div style="font-weight: 700; font-size: 13px; color: #ffd700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${escapeHtml(res.matchedStudent.displayName)} <span style="font-weight: normal; font-size: 11px; color: var(--text-muted);">(${escapeHtml(res.matchedStudent.email)})</span>
                  </div>
                  <div style="font-size: 11px; color: var(--text-muted);">UID: ${res.matchedStudent.uid}</div>
                </div>
              ` : `
                <div style="color: #f87171; font-size: 12px;">
                  ❌ ${res.shortUid ? `Tìm thấy mã <strong>${escapeHtml(res.shortUid)}</strong> nhưng chưa khớp Flower nào.` : 'Chưa nhận diện được 16 ký tự UID trên ảnh.'} Hãy kiểm tra lại ảnh hoặc tra cứu bằng ô tìm kiếm.
                </div>
              `}
            </div>
          </div>
        `;
      });

      resultsBox.innerHTML = html;
    }
    window.renderAdminMultiBillResultsUI = renderAdminMultiBillResultsUI;

    async function applyMultiBillActionSingle(index) {
      if (index < 0 || index >= adminMultiBillImages.length) return;
      const item = adminMultiBillImages[index];
      if (!item || !item.result || !item.result.matchedStudent || !item.result.code) return;

      const student = item.result.matchedStudent;
      const code = item.result.code;
      const amount = item.result.amount || 0;
      const rawText = item.result.rawText || `Multi-Bill OCR (${item.name})`;

      await quickApplyStudentVipOrSpin(student.uid, code);
      item.result.activated = true;

      // Record transaction to Cloud bank_transactions
      try {
        const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
        const token = typeof getFreshCloudAuthToken === 'function' ? await getFreshCloudAuthToken() : (currentUser && currentUser.idToken ? currentUser.idToken : '');
        const authParam = token ? '?auth=' + token : '';
        await fetch(`${rtdbUrl}/bank_transactions.json${authParam}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: rawText,
            amount: amount,
            code: code,
            shortUid: getShortUidUpper(student.uid),
            status: 'completed',
            processedAt: Date.now(),
            timestamp: Date.now(),
            source: 'multi_image_vision_ocr'
          })
        });
      } catch (e) {}

      renderAdminMultiBillResultsUI();
      fetchAdminBankTransactions();
    }
    window.applyMultiBillActionSingle = applyMultiBillActionSingle;

    async function applyAllValidMultiBills() {
      const validItems = adminMultiBillImages.filter(img => img.status === 'completed' && img.result && img.result.matchedStudent && img.result.code && !img.result.activated);
      if (validItems.length === 0) {
        showToast('⚠️ Không có biên lai hợp lệ nào đang chờ kích hoạt!');
        return;
      }

      if (!confirm(`Xác nhận kích hoạt hàng loạt cho ${validItems.length} Flower hợp lệ từ các ảnh đã quét?`)) {
        return;
      }

      for (let i = 0; i < adminMultiBillImages.length; i++) {
        const item = adminMultiBillImages[i];
        if (item.status === 'completed' && item.result && item.result.matchedStudent && item.result.code && !item.result.activated) {
          await applyMultiBillActionSingle(i);
        }
      }

      showToast(`🎉 Đã kích hoạt toàn bộ ${validItems.length} Flower thành công!`);
    }
    window.applyAllValidMultiBills = applyAllValidMultiBills;

    // Helper for Smart Clipboard Paste
    async function pasteFromClipboardToSmsInput() {
      try {
        const text = await navigator.clipboard.readText();
        const input = document.getElementById('admin-paste-sms-input');
        if (input && text) {
          input.value = text;
          showToast('📋 Đã dán nội dung từ Clipboard!');
          processPastedBankingSms();
        }
      } catch (err) {
        showToast('⚠️ Không thể đọc Clipboard, vui lòng dùng phím Ctrl+V để dán!');
      }
    }
    window.pasteFromClipboardToSmsInput = pasteFromClipboardToSmsInput;

    async function processPastedBankingSms() {
      const input = document.getElementById('admin-paste-sms-input');
      const resultBox = document.getElementById('admin-paste-sms-result');
      if (!input || !resultBox) return;

      const rawMsg = (input.value || '').trim();
      if (!rawMsg) {
        showToast('⚠️ Vui lòng dán dòng tin nhắn ngân hàng trước!');
        return;
      }

      if (!adminStudentsData || adminStudentsData.length === 0) {
        resultBox.style.display = 'block';
        resultBox.innerHTML = '<div style="text-align:center; padding:12px; color:var(--text-muted);">⏳ Đang đồng bộ danh sách Flower...</div>';
        await fetchAdminStudentsList();
      }

      const parsed = parseBankTransactionMultiLayer(rawMsg, adminStudentsData);
      const shortUid = parsed ? parsed.shortUid : '';
      const code = parsed ? parsed.code : '';
      const amount = parsed ? parsed.amount : 0;
      const matchedStudent = parsed ? parsed.matchedStudent : null;

      const packageNames = {
        '1M': '👑 VocaVIP Tháng (39k)',
        '1Y': '🟡 VocaVIP Năm (299k)',
        'LT': '👑 VocaVIP Trọn Đời (599k)',
        'S5': '🎡 5 VocaSpin (10k)',
        'S15': '🎡 15 VocaSpin (25k)',
        'S40': '🎡 40 VocaSpin (50k)'
      };

      const pkgTitle = packageNames[code] || (code ? `Gói ${code}` : 'Chưa nhận diện gói');

      resultBox.style.display = 'block';
      resultBox.innerHTML = `
        <div style="background: rgba(0,0,0,0.35); border: 1.5px solid ${matchedStudent && code ? '#34d399' : '#fbbf24'}; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <strong style="font-size: 14px; color: #38bdf8; font-family: monospace;">${escapeHtml(code ? pkgTitle : 'Giao dịch ngân hàng')}</strong>
              ${amount > 0 ? `<span class="badge" style="background: rgba(16,185,129,0.2); color: #34d399; font-weight: 700; font-size: 11.5px;">+${amount.toLocaleString('vi-VN')} đ</span>` : ''}
              <span class="badge" style="background: rgba(99,102,241,0.2); color: #a5b4fc; font-size: 10.5px;">Phương thức: ${escapeHtml(parsed ? parsed.matchMethod : 'manual')}</span>
            </div>

            <div style="display: flex; gap: 6px; align-items: center;">
              ${matchedStudent && code ? `
                <button type="button" class="btn btn-primary btn-sm" onclick="applyPastedTransactionAction('${matchedStudent.uid}', '${code}', ${amount}, \`${escapeHtml(rawMsg).replace(/`/g, '')}\`)" style="font-size: 12px; padding: 6px 14px; background: linear-gradient(135deg, #10b981, #059669); border: none; font-weight: 700; box-shadow: 0 4px 14px rgba(16,185,129,0.4);">
                  ⚡ Kích Hoạt ${code} Ngay
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Student Profile Match -->
          <div style="display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.03); padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border);">
            ${matchedStudent ? `
              <div style="width: 36px; height: 36px; min-width: 36px; border-radius: 50%; background: linear-gradient(135deg, #a855f7, #6366f1); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; overflow: hidden;">
                ${renderAvatarHtml(matchedStudent.avatar || matchedStudent.displayName, 36, 14)}
              </div>
              <div style="flex: 1;">
                <div style="font-weight: 700; font-size: 13px; color: #ffd700;">${escapeHtml(matchedStudent.displayName)} <span style="font-weight:normal; font-size:11px; color:var(--text-muted);">(${escapeHtml(matchedStudent.email)})</span></div>
                <div style="font-size: 11px; color: var(--text-muted);">🔑 16 Ký tự: <strong style="color:#38bdf8; font-family:monospace;">${shortUid}</strong> • UID: ${matchedStudent.uid}</div>
              </div>
            ` : `
              <div style="color: #f87171; font-size: 12px;">
                ❌ Chưa khớp Flower nào từ nội dung tin nhắn. Hãy kiểm tra 16 ký tự UID hoặc dùng ô tra cứu ở trên.
              </div>
            `}
          </div>
        </div>
      `;
    }
    window.processPastedBankingSms = processPastedBankingSms;

    async function applyPastedTransactionAction(uid, code, amount, rawContent) {
      await quickApplyStudentVipOrSpin(uid, code);
      // Also record to Cloud bank_transactions for auditing history
      try {
        const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
        const token = typeof getFreshCloudAuthToken === 'function' ? await getFreshCloudAuthToken() : (currentUser && currentUser.idToken ? currentUser.idToken : '');
        const authParam = token ? '?auth=' + token : '';
        await fetch(`${rtdbUrl}/bank_transactions.json${authParam}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: rawContent,
            amount: amount,
            code: code,
            shortUid: getShortUidUpper(uid),
            status: 'completed',
            processedAt: Date.now(),
            timestamp: Date.now(),
            source: 'smart_paste'
          })
        });
        document.getElementById('admin-paste-sms-input').value = '';
        document.getElementById('admin-paste-sms-result').style.display = 'none';
        fetchAdminBankTransactions();
      } catch (e) {}
    }
    window.applyPastedTransactionAction = applyPastedTransactionAction;

    // Multi-Layer Rule-Based & Fuzzy Extraction Engine
    function parseBankTransactionMultiLayer(rawContent, studentsList = []) {
      if (!rawContent || typeof rawContent !== 'string') return null;
      const clean = rawContent.trim();

      let detectedShortUid = '';
      let detectedCode = '';
      let detectedAmount = 0;
      let matchedStudent = null;
      let matchMethod = 'none';

      // 1. Amount Extraction (e.g. +39,000VND or 39.000 đ or 31,590 đ or 39000)
      const amtMatch = clean.match(/(?:\+|\b)(\d{1,3}(?:[.,]\d{3})+|\d{4,7})\s*(?:VND|VNĐ|Đ|D|\b)/i);
      if (amtMatch) {
        const numStr = amtMatch[1].replace(/[.,]/g, '');
        detectedAmount = parseInt(numStr, 10) || 0;
      }

      // 2. Layer 1: Standard & Flexible Regex VOCA <UID_16> <CODE>
      const stdRegex = /(?:VOCA|VOCAFLOW)?[\s:_.-]*([A-Za-z0-9]{16})[\s:_.-]*([A-Za-z0-9]+)?/i;
      const m1 = clean.match(stdRegex);
      if (m1 && m1[1] && m1[1].length === 16) {
        detectedShortUid = m1[1].toUpperCase();
        if (m1[2]) detectedCode = m1[2].toUpperCase();
        matchMethod = 'regex_standard';
      }

      // 3. Fallback: Search for any 16-character alphanumeric token in text
      if (!detectedShortUid) {
        const tokenMatch = clean.match(/\b([A-Za-z0-9]{16})\b/);
        if (tokenMatch) {
          detectedShortUid = tokenMatch[1].toUpperCase();
          matchMethod = 'regex_token_16';
        }
      }

      // 4. Layer 2: Fuzzy Token Scanner against Student List
      if (!detectedShortUid && Array.isArray(studentsList) && studentsList.length > 0) {
        for (const s of studentsList) {
          const sUid16 = (s.shortUid || getShortUidUpper(s.uid)).toUpperCase();
          if (sUid16 && clean.toUpperCase().includes(sUid16)) {
            detectedShortUid = sUid16;
            matchedStudent = s;
            matchMethod = 'fuzzy_token_uid';
            break;
          }
        }
      }

      // 5. Package Code Detection (supports normal and discounted prices)
      if (!detectedCode || !['1M', '1Y', 'LT', 'S5', 'S15', 'S40'].includes(detectedCode)) {
        const upper = clean.toUpperCase();
        if (upper.includes(' 1M') || upper.includes('1M ') || upper.includes('-1M') || upper.includes('_1M') || upper.includes('VIP 1M') || upper.includes('VIP THANG') || upper.includes('VIP THÁNG') || [39000, 31590, 32000, 31000].includes(detectedAmount)) {
          detectedCode = '1M';
        } else if (upper.includes(' 1Y') || upper.includes('1Y ') || upper.includes('-1Y') || upper.includes('_1Y') || upper.includes('VIP 1Y') || upper.includes('VIP NAM') || upper.includes('VIP NĂM') || [299000, 242190, 242000, 240000].includes(detectedAmount)) {
          detectedCode = '1Y';
        } else if (upper.includes(' LT') || upper.includes('LT ') || upper.includes('-LT') || upper.includes('_LT') || upper.includes('VIP LT') || upper.includes('TRON DOI') || upper.includes('TRỌN ĐỜI') || upper.includes('LIFETIME') || [599000, 485190, 485000, 480000].includes(detectedAmount)) {
          detectedCode = 'LT';
        } else if (upper.includes(' S5') || upper.includes('S5 ') || upper.includes('-S5') || upper.includes('SPIN 5') || upper.includes('5 QUAY') || detectedAmount === 10000) {
          detectedCode = 'S5';
        } else if (upper.includes(' S15') || upper.includes('S15 ') || upper.includes('-S15') || upper.includes('SPIN 15') || upper.includes('15 QUAY') || detectedAmount === 25000) {
          detectedCode = 'S15';
        } else if (upper.includes(' S40') || upper.includes('S40 ') || upper.includes('-S40') || upper.includes('SPIN 40') || upper.includes('40 QUAY') || detectedAmount === 50000) {
          detectedCode = 'S40';
        }
      }

      // Match student object
      if (detectedShortUid && !matchedStudent) {
        if (Array.isArray(studentsList) && studentsList.length > 0) {
          matchedStudent = studentsList.find(s => (s.shortUid || getShortUidUpper(s.uid)).toUpperCase() === detectedShortUid || (s.uid || '').toUpperCase() === detectedShortUid);
        }
        if (!matchedStudent && currentUser && currentUser.uid) {
          const cShort = getShortUidUpper(currentUser.uid).toUpperCase();
          if (cShort === detectedShortUid || currentUser.uid.toUpperCase() === detectedShortUid) {
            matchedStudent = {
              uid: currentUser.uid,
              shortUid: cShort,
              displayName: currentUser.displayName || 'Tôi',
              email: currentUser.email || '',
              isVip: isUserVip(),
              vipTier: getUserVipTier(),
              vipExpiresAt: userVipExpiresAt,
              spins: typeof getUserLuckySpins === 'function' ? getUserLuckySpins() : 0,
              points: getUserPoints(),
              hints: getUserHints(),
              skips: getUserSkips(),
              deckCount: (decks || []).length,
              wordCount: (words || []).length
            };
          }
        }
        if (!matchedStudent) {
          matchedStudent = {
            uid: detectedShortUid,
            shortUid: detectedShortUid,
            displayName: 'Flower ' + detectedShortUid,
            email: '',
            isVip: false,
            vipTier: 'none',
            vipExpiresAt: 0,
            spins: 0,
            points: 0,
            hints: 5,
            skips: 3,
            deckCount: 0,
            wordCount: 0
          };
        }
      }

      return {
        shortUid: detectedShortUid,
        code: detectedCode,
        amount: detectedAmount,
        matchedStudent: matchedStudent,
        matchMethod: matchMethod
      };
    }
    window.parseBankTransactionMultiLayer = parseBankTransactionMultiLayer;

    // AI GEMINI BACKUP RECONCILER (For unstructured or messy remarks)
    async function analyzeBankTransactionWithAi(txKey) {
      const tx = adminBankTransactions.find(t => t.key === txKey);
      if (!tx) return;

      const rawMsg = tx.content || tx.syntax || '';
      if (!rawMsg) {
        showToast('⚠️ Không có nội dung giao dịch để phân tích!');
        return;
      }

      showToast('🤖 AI Gemini đang phân tích nội dung đối soát...');

      const studentsSummary = (adminStudentsData || []).slice(0, 50).map(s => ({
        displayName: s.displayName,
        email: s.email,
        shortUid: s.shortUid || getShortUidUpper(s.uid),
        fullUid: s.uid
      }));

      const prompt = `Bạn là chuyên gia đối soát giao dịch ngân hàng tự động cho ứng dụng học từ vựng VocaFlow.
Dưới đây là tin nhắn biến động số dư ngân hàng thực tế từ app MB Bank:
"${rawMsg}"

Danh sách Flower đăng ký trên hệ thống:
${JSON.stringify(studentsSummary)}

Bảng mã gói dịch vụ của VocaFlow:
- 1M: VocaVIP 1 Tháng (39,000đ hoặc giá giảm 31,590đ)
- 1Y: VocaVIP 1 Năm (299,000đ hoặc giá giảm 242,190đ)
- LT: VocaVIP Trọn Đời (599,000đ hoặc giá giảm 485,190đ)
- S5: 5 VocaSpin (10,000đ)
- S15: 15 VocaSpin (25,000đ)
- S40: 40 VocaSpin (50,000đ)

Nhiệm vụ: Hãy phân tích tin nhắn và tìm ra chính xác Flower nào đã chuyển khoản và mua gói nào.
Trả về định dạng JSON DUY NHẤT (không kèm markdown \`\`\`json):
{
  "matchedShortUid": "16_KY_TU_UID_VIET_HOA",
  "matchedStudentName": "Ten Flower",
  "packageCode": "1M | 1Y | LT | S5 | S15 | S40",
  "amountVnd": 39000,
  "confidenceScore": 0.95,
  "aiExplanation": "Giải thích ngắn gọn lý do khớp"
}`;

      try {
        let aiResult = null;
        if (typeof callGeminiApiProxy === 'function') {
          const rawResponse = await callGeminiApiProxy(prompt);
          const cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
          aiResult = JSON.parse(cleanJson);
        } else if (typeof callActiveAiProvider === 'function') {
          const rawResponse = await callActiveAiProvider(prompt);
          const cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
          aiResult = JSON.parse(cleanJson);
        }

        if (aiResult && aiResult.matchedShortUid) {
          const sUid = String(aiResult.matchedShortUid).toUpperCase();
          const pCode = String(aiResult.packageCode || '').toUpperCase();
          
          tx.shortUid = sUid;
          tx.code = pCode;
          tx.aiExplanation = aiResult.aiExplanation;
          tx.aiConfidence = aiResult.confidenceScore;
          tx.aiAnalyzed = true;

          // Sync AI update to Cloud
          const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
          const token = typeof getFreshCloudAuthToken === 'function' ? await getFreshCloudAuthToken() : (currentUser && currentUser.idToken ? currentUser.idToken : '');
          const authParam = token ? '?auth=' + token : '';
          await fetch(`${rtdbUrl}/bank_transactions/${txKey}.json${authParam}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              shortUid: sUid,
              code: pCode,
              aiExplanation: aiResult.aiExplanation,
              aiConfidence: aiResult.confidenceScore,
              aiAnalyzed: true
            })
          });

          showToast(`🎯 AI đã phân tích xong: Khớp ${aiResult.matchedStudentName} (${pCode})!`);
          renderAdminBankTransactionsListUI();
        } else {
          showToast('⚠️ AI không thể xác định chắc chắn Flower từ tin nhắn này.');
        }
      } catch (err) {
        console.error('AI Reconciler Error:', err);
        showToast('⚠️ Lỗi kết nối AI: ' + err.message);
      }
    }
    window.analyzeBankTransactionWithAi = analyzeBankTransactionWithAi;

    async function lookupVipStudentByInput(val) {
      const q = (val || '').toUpperCase().trim();
      const resultBox = document.getElementById('admin-vip-lookup-result');
      if (!resultBox) return;

      if (!q) {
        resultBox.style.display = 'none';
        resultBox.innerHTML = '';
        return;
      }

      if (!adminStudentsData || adminStudentsData.length === 0) {
        resultBox.style.display = 'block';
        resultBox.innerHTML = '<div style="text-align:center; padding:12px; color:var(--text-muted);">⏳ Đang đồng bộ danh sách Flower từ Cloud...</div>';
        await fetchAdminStudentsList();
      }

      // Match by 16-char short UID, full UID, email, or displayName
      let matched = (adminStudentsData || []).filter(s => {
        const short = (s.shortUid || getShortUidUpper(s.uid)).toUpperCase();
        const full = (s.uid || '').toUpperCase();
        const em = (s.email || '').toUpperCase();
        const name = (s.displayName || '').toUpperCase();
        return short === q || full === q || short.includes(q) || full.includes(q) || em.includes(q) || name.includes(q);
      });

      // If not matched, check current user
      if (matched.length === 0 && currentUser && currentUser.uid) {
        const cShort = getShortUidUpper(currentUser.uid).toUpperCase();
        const cFull = (currentUser.uid || '').toUpperCase();
        const cEm = (currentUser.email || '').toUpperCase();
        const cName = (currentUser.displayName || '').toUpperCase();
        if (cShort === q || cFull === q || cShort.includes(q) || cFull.includes(q) || cEm.includes(q) || cName.includes(q)) {
          const curObj = {
            uid: currentUser.uid,
            shortUid: cShort,
            displayName: currentUser.displayName || 'Tôi',
            email: currentUser.email || '',
            avatar: getUserAvatar(),
            isVip: isUserVip(),
            vipTier: getUserVipTier(),
            vipExpiresAt: userVipExpiresAt,
            points: getUserPoints(),
            hints: getUserHints(),
            skips: getUserSkips(),
            spins: typeof getUserLuckySpins === 'function' ? getUserLuckySpins() : 0,
            deckCount: (decks || []).length,
            wordCount: (words || []).length
          };
          matched.push(curObj);
          if (!adminStudentsData.some(s => s.uid === currentUser.uid)) adminStudentsData.push(curObj);
        }
      }

      // If still not matched and query looks like a UID, offer direct lookup/activation
      if (matched.length === 0 && q.length >= 8) {
        try {
          const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
          const token = typeof getFreshCloudAuthToken === 'function' ? await getFreshCloudAuthToken() : (currentUser && currentUser.idToken ? currentUser.idToken : '');
          const authParam = token ? '?auth=' + token : '';
          const directRes = await fetch(`${rtdbUrl}/users/${q}.json${authParam}`);
          if (directRes.ok) {
            const uData = await directRes.json();
            if (uData && typeof uData === 'object') {
              const prof = uData.profile || {};
              const eco = uData.economy || {};
              const sObj = {
                uid: q,
                shortUid: getShortUidUpper(q),
                displayName: prof.displayName || (prof.email ? prof.email.split('@')[0] : 'Flower ' + q.substring(0, 6)),
                email: prof.email || uData.email || '',
                avatar: prof.avatar || uData.avatar || '',
                isVip: !!prof.isVip,
                vipTier: prof.vipTier || 'none',
                vipExpiresAt: prof.vipExpiresAt || 0,
                points: eco.points || uData.points || 0,
                hints: eco.hints || uData.hints || 5,
                skips: eco.skips || uData.skips || 3,
                spins: eco.spins || eco.luckySpins || 0,
                deckCount: Array.isArray(uData.decks) ? uData.decks.length : 0,
                wordCount: Array.isArray(uData.words) ? uData.words.length : 0
              };
              matched.push(sObj);
              if (!adminStudentsData.some(s => s.uid === q)) adminStudentsData.push(sObj);
            }
          }
        } catch (e) {}

        if (matched.length === 0) {
          const directObj = {
            uid: q,
            shortUid: getShortUidUpper(q),
            displayName: 'Flower (UID: ' + getShortUidUpper(q) + ')',
            email: 'Chưa có email',
            avatar: '',
            isVip: false,
            vipTier: 'none',
            vipExpiresAt: 0,
            points: 0,
            hints: 5,
            skips: 3,
            spins: 0,
            deckCount: 0,
            wordCount: 0
          };
          matched.push(directObj);
        }
      }

      if (matched.length === 0) {
        resultBox.style.display = 'block';
        resultBox.innerHTML = `
          <div style="background: rgba(239,68,68,0.08); border: 1px dashed rgba(239,68,68,0.35); border-radius: 10px; padding: 12px; text-align: center; color: #f87171; font-size: 12px;">
            ❌ Không tìm thấy Flower nào khớp với mã tra cứu: <strong>${escapeHtml(q)}</strong>
          </div>
        `;
        return;
      }

      resultBox.style.display = 'block';
      let html = '<div style="display: flex; flex-direction: column; gap: 10px;">';
      matched.forEach(s => {
        const shortUid = s.shortUid || getShortUidUpper(s.uid);
        const isVip = !!s.isVip;
        const tier = s.vipTier || 'none';
        const expStr = s.vipExpiresAt ? new Date(s.vipExpiresAt).toLocaleDateString('vi-VN') : (tier === 'lifetime' ? 'Vĩnh viễn' : 'Chưa kích hoạt');
        const spins = s.spins || 0;

        html += `
          <div style="background: rgba(0,0,0,0.3); border: 1.5px solid ${isVip ? '#fbbf24' : 'var(--border)'}; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px;">
            <!-- Header Info -->
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 42px; height: 42px; min-width: 42px; border-radius: 50%; background: linear-gradient(135deg, #a855f7, #6366f1); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; overflow: hidden; ${isVip ? 'box-shadow: 0 0 0 2px #fbbf24, 0 0 12px rgba(251,191,36,0.6);' : ''}">
                  ${renderAvatarHtml(s.avatar || s.displayName, 42, 16)}
                </div>
                <div>
                  <div style="font-weight: 800; font-size: 14px; color: var(--text); display: flex; align-items: center; gap: 6px;">
                    <span>${escapeHtml(s.displayName)}</span>
                    ${isVip ? `<span class="badge" style="background: rgba(245,158,11,0.25); color: #fbbf24; font-size: 10px; font-weight: 700;">👑 VIP (${tier.toUpperCase()})</span>` : `<span class="badge" style="background: rgba(100,116,139,0.2); color: #94a3b8; font-size: 10px;">Thường</span>`}
                  </div>
                  <div style="font-size: 11px; color: var(--text-muted);">✉️ ${escapeHtml(s.email)} • Hạn VIP: <strong style="color:${isVip ? '#ffd700' : 'var(--text-muted)'};">${expStr}</strong></div>
                </div>
              </div>

              <!-- UID Badges -->
              <div style="text-align: right; font-size: 11px;">
                <div style="background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.3); padding: 3px 8px; border-radius: 6px; color: #ffd700; font-family: monospace; font-weight: 800; font-size: 12px; display: inline-block;">
                  🔑 16 Ký Tự: ${shortUid}
                </div>
                <div style="font-size: 9.5px; color: var(--text-muted); margin-top: 2px;">UID: ${s.uid}</div>
              </div>
            </div>

            <!-- Stats Bar -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 8px; padding: 6px 8px; text-align: center; font-size: 11px;">
              <div><span style="color:var(--text-muted);">🪙 VoCoin:</span> <strong style="color:#fbbf24;">${s.points}</strong></div>
              <div><span style="color:var(--text-muted);">🎡 Quay:</span> <strong style="color:#38bdf8;">${spins} lượt</strong></div>
              <div><span style="color:var(--text-muted);">💡 VocaHint:</span> <strong style="color:#34d399;">${s.hints}</strong></div>
              <div><span style="color:var(--text-muted);">📚 VocaDeck:</span> <strong style="color:#a855f7;">${s.deckCount}</strong></div>
            </div>

            <!-- 1-Click Fast Actions -->
            <div>
              <div style="font-size: 11px; font-weight: 700; color: #38bdf8; margin-bottom: 6px;">⚡ Nạp Gói 1-Click Nhanh Cho Flower Này:</div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button type="button" class="btn btn-sm" onclick="quickApplyStudentVipOrSpin('${escapeHtml(s.uid)}', '1M')" style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; font-weight: 700; font-size: 11px; padding: 5px 10px;">
                  🟢 + 1M (VocaVIP Tháng)
                </button>
                <button type="button" class="btn btn-sm" onclick="quickApplyStudentVipOrSpin('${escapeHtml(s.uid)}', '1Y')" style="background: linear-gradient(135deg, #38bdf8, #0284c7); color: white; border: none; font-weight: 700; font-size: 11px; padding: 5px 10px;">
                  🟡 + 1Y (VocaVIP Năm)
                </button>
                <button type="button" class="btn btn-sm" onclick="quickApplyStudentVipOrSpin('${escapeHtml(s.uid)}', 'LT')" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; font-weight: 700; font-size: 11px; padding: 5px 10px;">
                  👑 + LT (VocaVIP Trọn Đời)
                </button>
                <button type="button" class="btn btn-outline btn-sm" onclick="quickApplyStudentVipOrSpin('${escapeHtml(s.uid)}', 'S5')" style="border-color: rgba(245,158,11,0.5); color: #fbbf24; font-weight: 700; font-size: 11px; padding: 5px 10px;">
                  🎡 + S5 (5 VocaSpin)
                </button>
                <button type="button" class="btn btn-outline btn-sm" onclick="quickApplyStudentVipOrSpin('${escapeHtml(s.uid)}', 'S15')" style="border-color: rgba(236,72,153,0.5); color: #f472b6; font-weight: 700; font-size: 11px; padding: 5px 10px;">
                  🎡 + S15 (15 VocaSpin)
                </button>
                <button type="button" class="btn btn-outline btn-sm" onclick="quickApplyStudentVipOrSpin('${escapeHtml(s.uid)}', 'S40')" style="border-color: rgba(168,85,247,0.5); color: #c084fc; font-weight: 700; font-size: 11px; padding: 5px 10px;">
                  🎡 + S40 (40 VocaSpin)
                </button>
                <button type="button" class="btn btn-outline btn-sm" onclick="quickApplyStudentVipOrSpin('${escapeHtml(s.uid)}', 'cancel_vip')" style="border-color: rgba(239,68,68,0.4); color: #f87171; font-weight: 600; font-size: 11px; padding: 5px 8px;">
                  ❌ Hủy VocaVIP
                </button>
              </div>
            </div>
          </div>
        `;
      });
      html += '</div>';
      resultBox.innerHTML = html;
    }
    window.lookupVipStudentByInput = lookupVipStudentByInput;

    async function quickApplyStudentVipOrSpin(uid, actionType) {
      let student = (adminStudentsData || []).find(s => s.uid === uid || (s.shortUid || getShortUidUpper(s.uid)).toUpperCase() === String(uid).toUpperCase());
      if (!student) {
        student = {
          uid: uid,
          shortUid: getShortUidUpper(uid),
          displayName: 'Flower ' + getShortUidUpper(uid),
          email: '',
          isVip: false,
          vipTier: 'none',
          vipExpiresAt: 0,
          spins: 0,
          points: 0,
          hints: 5,
          skips: 3,
          deckCount: 0,
          wordCount: 0
        };
        if (Array.isArray(adminStudentsData)) adminStudentsData.push(student);
      }

      const act = String(actionType).toUpperCase();
      let isVip = student.isVip;
      let vipTier = student.vipTier || 'none';
      let vipExpiresAt = student.vipExpiresAt || 0;
      let spins = student.spins || 0;
      let actionLabel = '';

      if (act === '1M') {
        isVip = true;
        vipTier = 'monthly';
        const base = (vipExpiresAt && vipExpiresAt > Date.now()) ? vipExpiresAt : Date.now();
        vipExpiresAt = base + 30 * 86400000;
        actionLabel = '👑 Kích hoạt VIP 1 Tháng (+30 ngày)';
      } else if (act === '1Y') {
        isVip = true;
        vipTier = 'yearly';
        const base = (vipExpiresAt && vipExpiresAt > Date.now()) ? vipExpiresAt : Date.now();
        vipExpiresAt = base + 365 * 86400000;
        actionLabel = '👑 Kích hoạt VIP 1 Năm (+365 ngày)';
      } else if (act === 'LT') {
        isVip = true;
        vipTier = 'lifetime';
        vipExpiresAt = 0;
        actionLabel = '👑 Kích hoạt VocaVIP Trọn Đời (Lifetime)';
      } else if (act === 'S5') {
        spins += 5;
        actionLabel = '🎡 Cộng +5 VocaSpin';
      } else if (act === 'S15') {
        spins += 15;
        actionLabel = '🎡 Cộng +15 VocaSpin';
      } else if (act === 'S40') {
        spins += 40;
        actionLabel = '🎡 Cộng +40 VocaSpin';
      } else if (act === 'CANCEL_VIP') {
        isVip = false;
        vipTier = 'none';
        vipExpiresAt = 0;
        actionLabel = '❌ Đã hủy kích hoạt VocaVIP';
      }

      if (!confirm(`Xác nhận thực hiện: "${actionLabel}" cho Flower ${student.displayName} (UID: ${student.shortUid || getShortUidUpper(uid)})?`)) {
        return;
      }

      showToast('⏳ Đang cập nhật dữ liệu lên Firebase Cloud...');

      try {
        const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
        const token = typeof getFreshCloudAuthToken === 'function' ? await getFreshCloudAuthToken() : (currentUser && currentUser.idToken ? currentUser.idToken : '');
        const authParam = token ? '?auth=' + token : '';

        // 1. Update Profile
        await fetch(`${rtdbUrl}/users/${uid}/profile.json${authParam}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isVip: isVip,
            vipTier: vipTier,
            vipExpiresAt: vipExpiresAt,
            lastAdminUpdate: Date.now()
          })
        });

        // 2. Update Economy
        await fetch(`${rtdbUrl}/users/${uid}/economy.json${authParam}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            spins: spins,
            luckySpins: spins,
            lastAdminUpdate: Date.now()
          })
        });

        // Update local cache
        student.isVip = isVip;
        student.vipTier = vipTier;
        student.vipExpiresAt = vipExpiresAt;
        student.spins = spins;
        student.luckySpins = spins;

        // If adjusting current logged-in account
        if (currentUser && (currentUser.uid === uid || getShortUidUpper(currentUser.uid).toUpperCase() === String(uid).toUpperCase())) {
          currentUser.isVip = isVip;
          currentUser.vipTier = vipTier;
          currentUser.vipExpiresAt = vipExpiresAt;
          userIsVip = isVip;
          userVipTier = vipTier;
          userVipExpiresAt = vipExpiresAt;
          localStorage.setItem('vocaflow_user_is_vip', isVip ? 'true' : 'false');
          localStorage.setItem('vocaflow_user_vip_tier', vipTier);
          localStorage.setItem('vocaflow_user_vip_expires_at', vipExpiresAt.toString());
          if (act.startsWith('S') && typeof setLuckySpinsCount === 'function') {
            setLuckySpinsCount(spins);
          }
          updateAuthUI();
          if (typeof refreshAdminVipUI === 'function') refreshAdminVipUI();
        }

        // v0.10.9-46: Record to Successful Activations Log (Cloud & Local)
        const activationRecord = {
          key: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          timestamp: Date.now(),
          uid: student.uid,
          shortUid: student.shortUid || getShortUidUpper(student.uid),
          displayName: student.displayName || 'Flower ' + getShortUidUpper(student.uid),
          email: student.email || '',
          actionType: act,
          actionLabel: actionLabel,
          status: 'success'
        };
        saveAdminVipActivationRecord(activationRecord);

        showToast(`🎉 ${actionLabel} thành công cho ${student.displayName}!`);
        lookupVipStudentByInput(document.getElementById('admin-vip-lookup-input')?.value || student.uid);
        if (typeof renderAdminStudentsTable === 'function') renderAdminStudentsTable();

      } catch (e) {
        console.error('Quick Apply VIP Error:', e);
        showToast('⚠️ Lỗi cập nhật Cloud: ' + e.message);
      }
    }
    window.quickApplyStudentVipOrSpin = quickApplyStudentVipOrSpin;

    // =========================================================================
    // VIP ACTIVATIONS AUDIT LOG ENGINE (v0.10.9-46)
    // =========================================================================
    let adminVipActivations = [];

    async function saveAdminVipActivationRecord(record) {
      if (!record || !record.key) return;
      if (!Array.isArray(adminVipActivations)) adminVipActivations = [];
      adminVipActivations.unshift(record);

      try {
        localStorage.setItem('vocaflow_admin_vip_activations', JSON.stringify(adminVipActivations.slice(0, 100)));
      } catch (e) {}

      try {
        const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
        const token = typeof getFreshCloudAuthToken === 'function' ? await getFreshCloudAuthToken() : (currentUser && currentUser.idToken ? currentUser.idToken : '');
        const authParam = token ? '?auth=' + token : '';
        await fetch(`${rtdbUrl}/vip_activations/${record.key}.json${authParam}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
      } catch (e) {
        console.warn('Failed to push vip activation record to Cloud:', e);
      }
      renderAdminVipActivationsListUI();
    }

    async function fetchAdminVipActivations() {
      const listEl = document.getElementById('admin-vip-activations-list');
      if (!listEl) return;
      listEl.innerHTML = '<div style="text-align: center; padding: 16px; color: var(--text-muted);">⏳ Đang tải lịch sử kích hoạt từ Firebase Cloud...</div>';

      try {
        const savedLocal = localStorage.getItem('vocaflow_admin_vip_activations');
        if (savedLocal) {
          try { adminVipActivations = JSON.parse(savedLocal) || []; } catch(e) {}
        }

        const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
        const token = typeof getFreshCloudAuthToken === 'function' ? await getFreshCloudAuthToken() : (currentUser && currentUser.idToken ? currentUser.idToken : '');
        const authParam = token ? '?auth=' + token : '';

        const res = await fetch(`${rtdbUrl}/vip_activations.json${authParam}`);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object') {
            const cloudItems = [];
            for (const [key, val] of Object.entries(data)) {
              if (val && typeof val === 'object') {
                cloudItems.push({ key, ...val });
              }
            }
            cloudItems.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            adminVipActivations = cloudItems;
            try { localStorage.setItem('vocaflow_admin_vip_activations', JSON.stringify(adminVipActivations.slice(0, 100))); } catch(e) {}
          }
        }
        renderAdminVipActivationsListUI();
        showToast('🔄 Đã cập nhật danh sách kích hoạt thành công!');
      } catch (e) {
        renderAdminVipActivationsListUI();
      }
    }
    window.fetchAdminVipActivations = fetchAdminVipActivations;

    function renderAdminVipActivationsListUI() {
      const listEl = document.getElementById('admin-vip-activations-list');
      if (!listEl) return;

      if (!adminVipActivations || adminVipActivations.length === 0) {
        listEl.innerHTML = '<div style="text-align: center; padding: 18px; color: var(--text-muted); font-size: 12px;"><em>Chưa có bản ghi kích hoạt nào trên hệ thống.</em></div>';
        return;
      }

      const pkgColors = {
        '1M': { bg: 'rgba(16,185,129,0.15)', text: '#34d399', border: 'rgba(16,185,129,0.4)', title: '👑 VocaVIP Tháng (39k)' },
        '1Y': { bg: 'rgba(56,189,248,0.15)', text: '#38bdf8', border: 'rgba(56,189,248,0.4)', title: '🟡 VocaVIP Năm (299k)' },
        'LT': { bg: 'rgba(245,158,11,0.15)', text: '#fbbf24', border: 'rgba(245,158,11,0.4)', title: '👑 VocaVIP Trọn Đời (599k)' },
        'S5': { bg: 'rgba(245,158,11,0.15)', text: '#fbbf24', border: 'rgba(245,158,11,0.4)', title: '🎡 +5 VocaSpin (10k)' },
        'S15': { bg: 'rgba(236,72,153,0.15)', text: '#f472b6', border: 'rgba(236,72,153,0.4)', title: '🎡 +15 VocaSpin (25k)' },
        'S40': { bg: 'rgba(168,85,247,0.15)', text: '#c084fc', border: 'rgba(168,85,247,0.4)', title: '🎡 +40 VocaSpin (50k)' },
        'CANCEL_VIP': { bg: 'rgba(239,68,68,0.15)', text: '#f87171', border: 'rgba(239,68,68,0.4)', title: '❌ Hủy VIP' }
      };

      let html = '';
      adminVipActivations.forEach(item => {
        const timeStr = item.timestamp ? formatDateTime(new Date(item.timestamp).toISOString()) : 'Vừa xong';
        const code = (item.actionType || '').toUpperCase();
        const pkgInfo = pkgColors[code] || { bg: 'rgba(99,102,241,0.15)', text: '#818cf8', border: 'rgba(99,102,241,0.4)', title: item.actionLabel || code };
        const sUid = (item.shortUid || getShortUidUpper(item.uid || '')).toUpperCase();

        html += `
          <div style="background: var(--surface-elevated); border: 1px solid rgba(255,255,255,0.08); border-left: 4px solid ${pkgInfo.text}; border-radius: 10px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
            <div style="display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1;">
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span class="badge" style="background: ${pkgInfo.bg}; color: ${pkgInfo.text}; border: 1px solid ${pkgInfo.border}; font-weight: 800; font-size: 11px; padding: 2px 8px;">${escapeHtml(pkgInfo.title)}</span>
                <strong style="font-size: 13px; color: var(--text); cursor: pointer; text-decoration: underline;" onclick="lookupVipStudentByInput('${escapeHtml(item.uid)}')" title="Bấm để tra cứu Flower này">${escapeHtml(item.displayName || 'Flower')}</strong>
                ${item.email ? `<span style="font-size: 11.5px; color: var(--text-muted);">(${escapeHtml(item.email)})</span>` : ''}
              </div>
              <div style="font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 8px;">
                <span>🆔 <code>${escapeHtml(sUid)}</code></span>
                <span>•</span>
                <span>⏱️ ${timeStr}</span>
                <span>•</span>
                <span style="color: #34d399; font-weight: 700;">✅ Thành công</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <button type="button" class="btn btn-outline btn-icon btn-sm" onclick="deleteAdminVipActivation('${escapeHtml(item.key)}')" style="color: #f87171; border-color: rgba(239,68,68,0.3); padding: 4px 6px;" title="Xóa bản ghi này">
                <svg class="icon icon-sm"><use href="#i-close"/></svg>
              </button>
            </div>
          </div>
        `;
      });

      listEl.innerHTML = html;
    }

    async function deleteAdminVipActivation(actKey) {
      if (!confirm('Xóa bản ghi lịch sử kích hoạt này?')) return;
      adminVipActivations = adminVipActivations.filter(a => a.key !== actKey);
      try {
        localStorage.setItem('vocaflow_admin_vip_activations', JSON.stringify(adminVipActivations.slice(0, 100)));
      } catch(e) {}
      renderAdminVipActivationsListUI();

      try {
        const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
        const token = typeof getFreshCloudAuthToken === 'function' ? await getFreshCloudAuthToken() : (currentUser && currentUser.idToken ? currentUser.idToken : '');
        const authParam = token ? '?auth=' + token : '';
        await fetch(`${rtdbUrl}/vip_activations/${actKey}.json${authParam}`, { method: 'DELETE' });
      } catch(e) {}
      showToast('🗑️ Đã xóa bản ghi!');
    }
    window.deleteAdminVipActivation = deleteAdminVipActivation;

    async function clearAdminVipActivationsLog() {
      if (!confirm('Bạn có chắc muốn xóa toàn bộ lịch sử kích hoạt thành công trên Cloud & Local?')) return;
      adminVipActivations = [];
      try { localStorage.removeItem('vocaflow_admin_vip_activations'); } catch(e) {}
      renderAdminVipActivationsListUI();

      try {
        const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
        const token = typeof getFreshCloudAuthToken === 'function' ? await getFreshCloudAuthToken() : (currentUser && currentUser.idToken ? currentUser.idToken : '');
        const authParam = token ? '?auth=' + token : '';
        await fetch(`${rtdbUrl}/vip_activations.json${authParam}`, { method: 'DELETE' });
      } catch(e) {}
      showToast('🗑️ Đã xóa toàn bộ lịch sử kích hoạt!');
    }
    window.clearAdminVipActivationsLog = clearAdminVipActivationsLog;

    function switchPublisherTab(tab) {
      const isStudents = tab === 'students';
      const isCodes = tab === 'codes';
      const isWallet = tab === 'wallet';
      const isBugs = tab === 'bugs';
      const isVipGateway = tab === 'vip-gateway';

      const sContent = document.getElementById('pub-tab-content-students');
      const cContent = document.getElementById('pub-tab-content-codes');
      const wContent = document.getElementById('pub-tab-content-wallet');
      const bContent = document.getElementById('pub-tab-content-bugs');
      const vContent = document.getElementById('pub-tab-content-vip-gateway');

      if (sContent) sContent.style.display = isStudents ? 'flex' : 'none';
      if (cContent) cContent.style.display = isCodes ? 'block' : 'none';
      if (wContent) wContent.style.display = isWallet ? 'block' : 'none';
      if (bContent) bContent.style.display = isBugs ? 'block' : 'none';
      if (vContent) vContent.style.display = isVipGateway ? 'block' : 'none';

      const sBtn = document.getElementById('pub-tab-btn-students');
      const cBtn = document.getElementById('pub-tab-btn-codes');
      const wBtn = document.getElementById('pub-tab-btn-wallet');
      const bBtn = document.getElementById('pub-tab-btn-bugs');
      const vBtn = document.getElementById('pub-tab-btn-vip-gateway');

      if (sBtn) sBtn.className = isStudents ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline';
      if (cBtn) cBtn.className = isCodes ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline';
      if (wBtn) wBtn.className = isWallet ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline';
      if (bBtn) bBtn.className = isBugs ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline';
      if (vBtn) vBtn.className = isVipGateway ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline';

      if (isStudents && adminStudentsData.length === 0) {
        fetchAdminStudentsList();
      }
      if (isCodes) {
        refreshAdminGiftCodesList();
      }
      if (isBugs) {
        fetchAdminBugReportsList();
      }
      if (isVipGateway) {
        if (adminStudentsData.length === 0) fetchAdminStudentsList();
        fetchAdminVipActivations();
      }
    }

    async function fetchAdminStudentsList() {
      const container = document.getElementById('admin-students-list-container');
      if (!container) return;
      container.innerHTML = '<div style="text-align: center; padding: 24px; color: var(--text-muted);"><span style=\"font-size: 24px; display: block; margin-bottom: 8px;\">⏳</span>Đang tải dữ liệu Flower từ Firebase Cloud...</div>';

      const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
      try {
        const token = typeof getFreshCloudAuthToken === 'function' ? await getFreshCloudAuthToken() : (currentUser && currentUser.idToken ? currentUser.idToken : '');
        let res = null;
        if (token) {
          try { res = await fetch(rtdbUrl + '/users.json?auth=' + token); } catch(e1) {}
        }
        if (!res || !res.ok) {
          res = await fetch(rtdbUrl + '/users.json');
        }
        if (!res.ok) {
          container.innerHTML = '<div style="text-align: center; padding: 20px; color: #ef4444;">⚠️ Không thể tải danh sách Flower (Mã lỗi ' + res.status + '). Vui lòng kiểm tra quyền truy cập hoặc kết nối mạng.</div>';
          return;
        }

        const data = await res.json();
        if (!data || typeof data !== 'object') {
          container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">Chưa có Flower nào đăng ký trên hệ thống.</div>';
          return;
        }

        const studentsList = [];
        for (const [uid, uData] of Object.entries(data)) {
          if (!uData || typeof uData !== 'object') continue;
          const u = uData || {};
          const prof = u.profile || {};
          const email = prof.email || u.email || '';

          // Filter out dummy/root nodes and ghost test bot accounts
          if (!email || typeof email !== 'string' || !email.includes('@') || uid === 'user_julies' || uid === 'u1') {
            continue;
          }

          const eco = u.economy || {};
          let points = 0;
          if (typeof eco.points === 'number') points = eco.points;
          else if (typeof u.points === 'number') points = u.points;
          else if (typeof prof.points === 'number') points = prof.points;
          else if (eco.points !== undefined) points = parseInt(eco.points, 10) || 0;
          else if (u.points !== undefined) points = parseInt(u.points, 10) || 0;

          let hints = 5;
          if (typeof eco.hints === 'number') hints = eco.hints;
          else if (typeof u.hints === 'number') hints = u.hints;
          else if (typeof prof.hints === 'number') hints = prof.hints;
          else if (eco.hints !== undefined) hints = parseInt(eco.hints, 10) || 0;
          else if (u.hints !== undefined) hints = parseInt(u.hints, 10) || 0;

          let skips = 0;
          if (currentUser && currentUser.uid === uid) {
            skips = getUserSkips();
          } else if (typeof eco.skips === 'number') skips = eco.skips;
          else if (typeof u.skips === 'number') skips = u.skips;
          else if (typeof prof.skips === 'number') skips = prof.skips;
          else if (eco.skips !== undefined) skips = parseInt(eco.skips, 10) || 0;
          else if (u.skips !== undefined) skips = parseInt(u.skips, 10) || 0;
          else skips = 3;

          const rawBio = prof.bio || u.bio || prof.userBio || u.userBio || prof.learningGoal || u.learningGoal || '';
          const uDecks = Array.isArray(u.decks) ? u.decks : (u.decks ? Object.values(u.decks) : []);
          const uWords = Array.isArray(u.words) ? u.words : (u.words ? Object.values(u.words) : []);
          const rawAv = prof.avatar || u.avatar || '';
          const avatar = (typeof rawAv === 'string' && (rawAv.startsWith('data:image') || rawAv.startsWith('http'))) ? rawAv : '';

          const isVipStudent = (currentUser && currentUser.uid === uid) ? isUserVip() : (prof.isVip === true || u.isVip === true);
          const vipTierStudent = (currentUser && currentUser.uid === uid) ? getUserVipTier() : (prof.vipTier || u.vipTier || 'none');

          let spins = 0;
          if (currentUser && currentUser.uid === uid) {
            spins = typeof getUserLuckySpins === 'function' ? getUserLuckySpins() : 0;
          } else if (typeof eco.spins === 'number') spins = eco.spins;
          else if (typeof eco.luckySpins === 'number') spins = eco.luckySpins;
          else if (typeof u.spins === 'number') spins = u.spins;
          else if (typeof prof.spins === 'number') spins = prof.spins;
          else if (eco.spins !== undefined) spins = parseInt(eco.spins, 10) || 0;
          else if (eco.luckySpins !== undefined) spins = parseInt(eco.luckySpins, 10) || 0;

          let freezes = 0;
          if (currentUser && currentUser.uid === uid) {
            freezes = typeof getUserFlowFreezes === 'function' ? getUserFlowFreezes() : userFlowFreezes;
          } else if (typeof eco.flowFreezes === 'number') freezes = eco.flowFreezes;
          else if (typeof u.flowFreezes === 'number') freezes = u.flowFreezes;
          else if (typeof prof.flowFreezes === 'number') freezes = prof.flowFreezes;
          else if (typeof u.streakFreezes === 'number') freezes = u.streakFreezes;
          else if (typeof eco.streakFreezes === 'number') freezes = eco.streakFreezes;
          else if (u.flow && typeof u.flow.freezes === 'number') freezes = u.flow.freezes;
          else if (eco.flowFreezes !== undefined) freezes = parseInt(eco.flowFreezes, 10) || 0;

          const vipExp = prof.vipExpiresAt || u.vipExpiresAt || 0;

          studentsList.push({
            uid: uid,
            shortUid: getShortUidUpper(uid),
            displayName: prof.displayName || email.split('@')[0],
            email: email,
            avatar: avatar,
            bio: rawBio,
            points: points,
            hints: hints,
            skips: skips,
            spins: spins,
            luckySpins: spins,
            flowFreezes: freezes,
            deckCount: uDecks.length,
            wordCount: uWords.length,
            lastSync: prof.lastSync || u.lastSync || '',
            rawDecks: uDecks,
            rawWords: uWords,
            isVip: isVipStudent,
            vipTier: vipTierStudent,
            vipExpiresAt: vipExp
          });
        }

        adminStudentsData = studentsList;

        const totalStudents = adminStudentsData.length;
        const totalDecks = adminStudentsData.reduce((sum, s) => sum + s.deckCount, 0);
        const totalWords = adminStudentsData.reduce((sum, s) => sum + s.wordCount, 0);
        const totalPoints = adminStudentsData.reduce((sum, s) => sum + s.points, 0);
        const totalHints = adminStudentsData.reduce((sum, s) => sum + s.hints, 0);
        const totalSkips = adminStudentsData.reduce((sum, s) => sum + s.skips, 0);

        const sCountEl = document.getElementById('admin-stat-total-students');
        const dCountEl = document.getElementById('admin-stat-total-decks');
        const pCountEl = document.getElementById('admin-stat-total-points');

        if (sCountEl) sCountEl.textContent = totalStudents + ' người';
        if (dCountEl) dCountEl.textContent = totalDecks + ' bộ (' + totalWords + ' từ)';
        if (pCountEl) pCountEl.textContent = totalPoints + ' VoCoin (' + totalHints + ' VocaHint, ' + totalSkips + ' VocaSkip)';

        renderAdminStudentsTable();
      } catch (err) {
        console.error('Fetch students error:', err);
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #ef4444;">Lỗi khi tải dữ liệu Flower: ' + escapeHtml(err.message || 'Lỗi không xác định') + '</div>';
      }
    }

    function filterAdminStudents(query) {
      renderAdminStudentsTable(query);
    }

    function renderAdminStudentsTable(filterQuery = '') {
      const container = document.getElementById('admin-students-list-container');
      if (!container) return;

      const searchInput = document.getElementById('admin-students-search-input');
      const q = (filterQuery || (searchInput ? searchInput.value : '')).toLowerCase().trim();

      const filtered = adminStudentsData.filter(s => {
        if (!q) return true;
        return s.displayName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.uid.toLowerCase().includes(q);
      });

      if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 24px; color: var(--text-muted);">Không tìm thấy Flower nào phù hợp với từ khóa "' + escapeHtml(q) + '".</div>';
        return;
      }

      let html = '<div style="display: flex; flex-direction: column; gap: 10px;">';
      filtered.forEach(s => {
        const avatarDisplay = s.avatar || (s.displayName ? s.displayName.trim()[0] : 'U').toUpperCase();
        const formattedDate = s.lastSync ? formatDateTime(s.lastSync) : 'Chưa đồng bộ';

        html += `
          <div style="background: var(--surface-elevated); border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px;">
            <!-- ROW 1: USER INFO -->
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 10px; min-width: 200px; flex: 1; cursor: pointer;" onclick="openPublicProfileByStudent('${escapeHtml(s.uid)}')">
                <div style="width: 40px; height: 40px; min-width: 40px; min-height: 40px; border-radius: 50%; background: linear-gradient(135deg, #a855f7, #6366f1); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; flex-shrink: 0; border: 1.5px solid rgba(255,255,255,0.15); overflow: hidden; ${s.isVip ? 'box-shadow: 0 0 0 2px #fbbf24, 0 0 10px rgba(251,191,36,0.6);' : ''}" title="Bấm để xem hồ sơ Flower">
                  ${renderAvatarHtml(s.avatar || s.displayName, 40, 16)}
                </div>
                <div>
                  <div style="font-weight: 700; font-size: 14px; color: var(--text); display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    ${s.isVip ? `
                      <span class="vip-name-wrapper" style="gap: 4px;" title="Hội viên VocaVIP">
                        <span class="vip-crown-icon" style="font-size: 13px; margin: 0;">👑</span>
                        <span class="vip-glowing-name" style="text-decoration: underline; text-decoration-color: rgba(245,158,11,0.6);">${escapeHtml(s.displayName)}</span>
                      </span>
                      <span class="badge" style="font-size: 9.5px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: 1px solid rgba(251,191,36,0.5); font-weight: 800; padding: 1px 6px;">VocaVIP ${s.vipTier ? s.vipTier.toUpperCase() : ''}</span>
                    ` : `
                      <span style="color: #a5b4fc; text-decoration: underline; text-decoration-color: rgba(99,102,241,0.4);" title="Bấm để xem hồ sơ Flower">${escapeHtml(s.displayName)}</span>
                    `}
                    <span class="badge" onclick="event.stopPropagation(); copyTextToClipboard('${escapeHtml(s.uid)}', 'Đã sao chép UID: ${escapeHtml(s.uid)}')" style="font-size: 10.5px; background: rgba(99, 102, 241, 0.18); color: #a5b4fc; padding: 2px 8px; border-radius: 6px; font-family: monospace; cursor: pointer; border: 1px solid rgba(99, 102, 241, 0.35); user-select: all;" title="Bấm để sao chép toàn bộ UID">UID: ${escapeHtml(s.uid)} 📋</span>
                  </div>
                  <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                    ✉️ ${escapeHtml(s.email)} • 🕒 ${formattedDate}
                  </div>
                </div>
              </div>
            </div>

            <!-- ROW 2: METRICS & ACTION BUTTONS ON DEDICATED ROW -->
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; border-top: 1px dashed rgba(255,255,255,0.06); padding-top: 8px;">
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span class="badge" style="background: rgba(59, 130, 246, 0.12); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.25); font-size: 11.5px; padding: 3px 8px;">
                  📚 ${s.deckCount} bộ (${s.wordCount} từ)
                </span>
                <span class="badge" style="background: rgba(245, 158, 11, 0.12); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.25); font-size: 11.5px; padding: 3px 8px;">
                  💰 ${s.points} VoCoin
                </span>
                <span class="badge" style="background: rgba(236, 72, 153, 0.12); color: #f472b6; border: 1px solid rgba(236, 72, 153, 0.25); font-size: 11.5px; padding: 3px 8px;">
                  💡 ${s.hints} VocaHint
                </span>
                <span class="badge" style="background: rgba(168, 85, 247, 0.12); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.25); font-size: 11.5px; padding: 3px 8px;">
                  ⏩ ${s.skips || 0} VocaSkip
                </span>
                <span class="badge" style="background: rgba(6, 182, 212, 0.12); color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.25); font-size: 11.5px; padding: 3px 8px;">
                  ❄️ ${s.flowFreezes || 0} Freezes
                </span>
                <span class="badge" style="background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.25); font-size: 11.5px; padding: 3px 8px;">
                  🎡 ${s.spins || 0} Spins
                </span>
              </div>

              <div style="display: flex; gap: 6px;">
                <button class="btn btn-outline btn-sm" onclick="adjustStudentWalletOnCloud('${escapeHtml(s.uid)}', '${escapeHtml(s.displayName)}')" style="font-size: 11.5px; padding: 4px 8px; border-color: rgba(245, 158, 11, 0.4); color: #fbbf24; background: rgba(245, 158, 11, 0.08); font-weight: 600;" title="Thưởng hoặc điều chỉnh VoCoin/VocaHint cho Flower">
                  🎁 Sửa Ví
                </button>
                <button class="btn btn-outline btn-sm" onclick="viewStudentDecksModal('${escapeHtml(s.uid)}', '${escapeHtml(s.displayName)}')" style="font-size: 11.5px; padding: 4px 8px; border-color: rgba(99, 102, 241, 0.4); color: #a5b4fc; background: rgba(99, 102, 241, 0.08); font-weight: 600;" title="Xem các VocaDeck của Flower này">
                  👁️ VocaDeck (${s.deckCount})
                </button>
                <button class="btn btn-outline btn-sm" onclick="deleteStudentAccountOnCloud('${escapeHtml(s.uid)}', '${escapeHtml(s.displayName)}')" style="font-size: 11.5px; padding: 4px 8px; border-color: rgba(239, 68, 68, 0.4); color: #f87171; background: rgba(239, 68, 68, 0.08); font-weight: 600;" title="Xóa tài khoản Flower / tài khoản rác này">
                  🗑️ Xóa
                </button>
              </div>
            </div>
          </div>
        `;
      });
      html += '</div>';
      container.innerHTML = html;
    }

    async function deleteStudentAccountOnCloud(uid, displayName) {
      if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản "${displayName}" (UID: ${uid}) khỏi hệ thống không?`)) return;
      try {
        const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
        const authParam = (currentUser && currentUser.idToken) ? '?auth=' + currentUser.idToken : '';
        const res = await fetch(`${rtdbUrl}/users/${uid}.json${authParam}`, { method: 'DELETE' });
        if (res.ok) {
          adminStudentsData = adminStudentsData.filter(s => s.uid !== uid);
          renderAdminStudentsTable();
          showToast(`Đã xóa tài khoản "${displayName}" thành công!`);
        } else {
          showToast(`Lỗi khi xóa tài khoản: ${res.status}`);
        }
      } catch (e) {
        showToast(`Lỗi: ${e.message}`);
      }
    }

    function viewStudentDecksModal(uid, displayName) {
      const student = adminStudentsData.find(s => s.uid === uid);
      if (!student) return;

      const titleEl = document.getElementById('student-modal-title');
      const subEl = document.getElementById('student-modal-subtitle');
      const avEl = document.getElementById('student-modal-avatar');
      const container = document.getElementById('student-modal-decks-container');

      if (titleEl) titleEl.textContent = 'VocaDeck Của ' + displayName;
      if (subEl) subEl.textContent = '✉️ ' + student.email + ' • UID: ' + student.uid;
      if (avEl) avEl.innerHTML = renderAvatarHtml(student.avatar || (displayName ? displayName[0].toUpperCase() : 'U'), 40, 18);

      if (!container) return;

      if (!student.rawDecks || student.rawDecks.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 36px 20px; color: var(--text-muted); background: var(--surface); border: 1px dashed var(--border); border-radius: 12px;"><span style="font-size: 32px; display: block; margin-bottom: 8px;">📭</span>Flower này chưa tạo VocaDeck nào trên Cloud.</div>';
        openModal('modal-student-decks-detail');
        return;
      }

      let html = '';
      student.rawDecks.forEach((deck, idx) => {
        const dWords = (student.rawWords || []).filter(w => w.deckId === deck.id);
        const wCount = dWords.length;
        const mastered = dWords.filter(w => w.status === 'mastered' || (w.masteryScore >= 100)).length;
        const avgScore = wCount ? Math.round(dWords.reduce((sum, w) => sum + getWordScore(w), 0) / wCount) : 0;
        const color = deck.color || '#6366f1';

        html += `
          <div style="background: var(--surface-elevated); border: 1px solid var(--border); border-left: 4px solid ${color}; border-radius: 10px; padding: 12px 14px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
              <div>
                <strong style="font-size: 14.5px; color: var(--text);">${idx + 1}. ${escapeHtml(deck.title || 'Chưa đặt tên')}</strong>
                <p style="font-size: 12px; color: var(--text-muted); margin: 2px 0 0 0;">${escapeHtml(deck.description || 'Không có mô tả')}</p>
              </div>
              <span class="badge" style="background: rgba(99, 102, 241, 0.15); color: #818cf8; flex-shrink: 0; font-size: 11.5px;">
                ${wCount} từ vựng
              </span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-muted); margin-top: 8px; margin-bottom: 4px;">
              <span>Mức độ thuộc: <strong style="color: #34d399;">${avgScore}%</strong> (${mastered}/${wCount} đã thuộc)</span>
              <span>🕒 ${formatDateTime(deck.updatedAt || deck.createdAt)}</span>
            </div>
            <div class="progress-bar-bg" style="height: 5px;">
              <div class="progress-bar-fill" style="width: ${avgScore}%;"></div>
            </div>

            ${dWords.length > 0 ? `
              <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 8px;">
                ${dWords.slice(0, 8).map(w => '<span style="font-size: 10.5px; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; color: var(--text);">' + escapeHtml(w.term) + '</span>').join('')}
                ${dWords.length > 8 ? '<span style="font-size: 10.5px; color: var(--text-muted);">+' + (dWords.length - 8) + ' từ nữa...</span>' : ''}
              </div>
            ` : ''}
          </div>
        `;
      });

      container.innerHTML = html;
      openModal('modal-student-decks-detail');
    }

    function openPublisherModal_Legacy() {
      const setPts = document.getElementById('admin-set-points-input');
      const setHts = document.getElementById('admin-set-hints-input');
      if (setPts) setPts.value = getUserPoints();
      if (setHts) setHts.value = getUserHints();
      openModal('modal-publisher');
      refreshAdminGiftCodesList();
    }

    function refreshAdminPublisherWalletUI() {
      const setPts = document.getElementById('admin-set-points-input');
      const setHts = document.getElementById('admin-set-hints-input');
      const setSks = document.getElementById('admin-set-skips-input');
      const setSps = document.getElementById('admin-set-spins-input');
      if (setPts) setPts.value = getUserPoints();
      if (setHts) setHts.value = getUserHints();
      if (setSks) setSks.value = getUserSkips();
      if (setSps) setSps.value = getLuckySpinsCount();
      refreshAdminVipUI();
    }

    function applyAdminWalletChanges() {
      const pts = parseInt(document.getElementById('admin-set-points-input')?.value, 10);
      const hts = parseInt(document.getElementById('admin-set-hints-input')?.value, 10);
      const sks = parseInt(document.getElementById('admin-set-skips-input')?.value, 10);
      const sps = parseInt(document.getElementById('admin-set-spins-input')?.value, 10);
      if (!isNaN(pts)) setUserPoints(pts);
      if (!isNaN(hts)) setUserHints(hts);
      if (!isNaN(sks)) setUserSkips(sks);
      if (!isNaN(sps)) setLuckySpinsCount(sps);
      showToast(`⚡ Đã cập nhật ví: ${getUserPoints()} VoCoin, ${getUserHints()} VocaHint, ${getUserSkips()} VocaSkip & ${getLuckySpinsCount()} VocaSpin!`);
    }

    function quickAddAdminRewards(ptsToAdd, htsToAdd, sksToAdd = 50, spsToAdd = 10) {
      setUserPoints(getUserPoints() + ptsToAdd);
      setUserHints(getUserHints() + htsToAdd);
      setUserSkips(getUserSkips() + sksToAdd);
      setLuckySpinsCount(getLuckySpinsCount() + spsToAdd);
      refreshAdminPublisherWalletUI();
      showToast(`⚡ Đã cộng nhanh +${ptsToAdd} VoCoin, +${htsToAdd} VocaHint, +${sksToAdd} VocaSkip & +${spsToAdd} VocaSpin!`);
    }

    async function createAdminGiftCode() {
      const nameInput = document.getElementById('admin-code-name');
      const htsInput = document.getElementById('admin-code-hints');
      const sksInput = document.getElementById('admin-code-skips');
      const ptsInput = document.getElementById('admin-code-points');
      if (!nameInput || !htsInput || !ptsInput) return;

      let rawCode = (nameInput.value || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      if (!rawCode) {
        alert('Vui lòng nhập tên mã code (ví dụ: HOCVIEN2026)!');
        return;
      }

      const hints = parseInt(htsInput.value, 10) || 0;
      const skips = parseInt(sksInput ? sksInput.value : '0', 10) || 0;
      const points = parseInt(ptsInput.value, 10) || 0;
      if (hints <= 0 && points <= 0 && skips <= 0) {
        alert('Phải tặng ít nhất VocaHint, VocaSkip hoặc VoCoin thưởng!');
        return;
      }

      const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
      const authParam = (currentUser && currentUser.idToken) ? `?auth=${currentUser.idToken}` : '';

      try {
        let expiresAt = null;
        const expiryVal = document.getElementById('admin-code-expiry')?.value || 'never';
        if (expiryVal === '1h') expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
        else if (expiryVal === '24h') expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
        else if (expiryVal === '3d') expiresAt = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
        else if (expiryVal === '7d') expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
        else if (expiryVal === '30d') expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

        const payload = {
          code: rawCode,
          hints: hints,
          skips: skips,
          points: points,
          expiresAt: expiresAt,
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

          let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
          for (const [codeKey, codeData] of Object.entries(data)) {
            if (!codeData) continue;
            const pts = parseInt(codeData.points, 10) || 0;
            const hts = parseInt(codeData.hints, 10) || 0;
            const sks = parseInt(codeData.skips, 10) || 0;
            const isExpired = codeData.expiresAt && (new Date(codeData.expiresAt).getTime() < Date.now());
            const expiryStr = codeData.expiresAt ? formatDateTime(codeData.expiresAt) : 'Vĩnh viễn';
            const statusBadge = isExpired
              ? '<span class="badge" style="background: rgba(239,68,68,0.2); color: #f87171; font-size: 10px;">🔴 Hết hạn</span>'
              : '<span class="badge" style="background: rgba(16,185,129,0.2); color: #34d399; font-size: 10px;">🟢 Hoạt động</span>';

            let rewards = [];
            if (pts > 0) rewards.push(`+${pts} VoCoin`);
            if (hts > 0) rewards.push(`+${hts} VocaHint`);
            if (sks > 0) rewards.push(`+${sks} VocaSkip`);
            const rewardText = rewards.join(', ') || 'Không có quà';

            html += `
              <div style="display: flex; justify-content: space-between; align-items: center; background: var(--surface-elevated); padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border); flex-wrap: wrap; gap: 8px;">
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <strong style="color: #38bdf8; font-family: monospace; font-size: 13.5px;">${escapeHtml(codeData.code || codeKey)}</strong>
                    ${statusBadge}
                    <span style="font-size: 11.5px; color: var(--text); font-weight: 600;">(${rewardText})</span>
                  </div>
                  <div style="font-size: 10.5px; color: var(--text-muted); margin-top: 3px;">
                    ⏰ Hạn sử dụng: <strong style="color: var(--text);">${expiryStr}</strong>
                  </div>
                </div>
                <div style="display: flex; gap: 6px;">
                  <button class="btn btn-outline btn-sm" style="padding: 3px 8px; font-size: 11px;" onclick="copyGiftCodeToClipboard('${escapeHtml(codeData.code || codeKey)}')">📋 Copy</button>
                  <button class="btn btn-outline btn-sm" style="padding: 3px 8px; font-size: 11px; color: var(--danger); border-color: rgba(239,68,68,0.3);" onclick="deleteAdminGiftCode('${escapeHtml(codeKey)}')">🗑️ Xóa</button>
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
      if (!confirm(`Bạn có chắc chắn muốn xóa mã "${codeKey}" khỏi Cloud? Flower sẽ không dùng được mã này nữa.`)) return;
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
    // CREATOR FOLLOW & SOCIAL GRAPH ENGINE (v0.10.7d)
    // =========================================================================
    let myFollowingMap = {};
    let myFollowersMap = {};
    let currentPublicProfileAuthor = null;

    try {
      const savedFollowing = localStorage.getItem('vocaflow_following_map');
      if (savedFollowing) myFollowingMap = JSON.parse(savedFollowing) || {};
      const savedFollowers = localStorage.getItem('vocaflow_followers_map');
      if (savedFollowers) myFollowersMap = JSON.parse(savedFollowers) || {};
    } catch (e) {}

    async function syncFollowStateWithCloud() {
      if (!currentUser || !currentUser.uid || currentUser.uid.startsWith('guest_')) return;
      const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
      const authParam = (currentUser && currentUser.idToken) ? '?auth=' + currentUser.idToken : '';

      try {
        // Fetch Following Map (Cloud Source of Truth + Bidirectional Union Merge)
        const followingRes = await fetch(`${rtdbUrl}/users/${currentUser.uid}/following.json${authParam}`);
        if (followingRes.ok) {
          const data = await followingRes.json();
          if (data && typeof data === 'object') {
            myFollowingMap = { ...myFollowingMap, ...data };
            if (currentUser && currentUser.uid) delete myFollowingMap[currentUser.uid];
            localStorage.setItem('vocaflow_following_map', JSON.stringify(myFollowingMap));
          }
        }

        // Fetch Followers Map (Cloud Source of Truth + Bidirectional Union Merge)
        const followersRes = await fetch(`${rtdbUrl}/users/${currentUser.uid}/followers.json${authParam}`);
        if (followersRes.ok) {
          const fData = await followersRes.json();
          if (fData && typeof fData === 'object') {
            myFollowersMap = { ...myFollowersMap, ...fData };
            if (currentUser && currentUser.uid) delete myFollowersMap[currentUser.uid];
            localStorage.setItem('vocaflow_followers_map', JSON.stringify(myFollowersMap));
          }
        }

        currentUser.followingCount = Math.max(Object.keys(myFollowingMap).length, currentUser.followingCount || 0);
        currentUser.followerCount = Math.max(Object.keys(myFollowersMap).length, currentUser.followerCount || 0);

        // Push bidirectional sync to cloud to guarantee data retention
        const followPatch = {};
        if (Object.keys(myFollowingMap).length > 0) {
          followPatch[`users/${currentUser.uid}/following`] = myFollowingMap;
        }
        if (Object.keys(myFollowersMap).length > 0) {
          followPatch[`users/${currentUser.uid}/followers`] = myFollowersMap;
        }
        followPatch[`users/${currentUser.uid}/profile/followingCount`] = currentUser.followingCount;
        followPatch[`users/${currentUser.uid}/profile/followerCount`] = currentUser.followerCount;

        fetch(`${rtdbUrl}/.json${authParam}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(followPatch)
        }).catch(() => {});

        localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(currentUser));
        updateAuthUI();
      } catch (e) {
        console.warn('Follow sync notice:', e);
      }
    }

    async function toggleFollowCreator(targetUid, targetName, targetUsername) {
      if (!requireLogin('Theo dõi Tác giả')) return;
      if (!targetUid || targetUid === currentUser.uid || targetUid === 'undefined') {
        showToast('⚠️ Bạn không thể tự theo dõi chính mình!');
        return;
      }

      const isCurrentlyFollowing = !!myFollowingMap[targetUid];
      const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
      const authParam = (currentUser && currentUser.idToken) ? '?auth=' + currentUser.idToken : '';

      if (isCurrentlyFollowing) {
        // Unfollow
        delete myFollowingMap[targetUid];
        localStorage.setItem('vocaflow_following_map', JSON.stringify(myFollowingMap));
        currentUser.followingCount = Object.keys(myFollowingMap).length;
        localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(currentUser));
        updateAuthUI();
        updatePubViewFollowBtn(targetUid);

        // Update target follower count on UI immediately
        if (currentPublicProfileAuthor && currentPublicProfileAuthor.targetUid === targetUid) {
          currentPublicProfileAuthor.targetFollowerCount = Math.max(0, (currentPublicProfileAuthor.targetFollowerCount || 1) - 1);
          const pubFollowerEl = document.getElementById('pub-view-follower-count');
          if (pubFollowerEl) pubFollowerEl.textContent = currentPublicProfileAuthor.targetFollowerCount;
        }

        showToast(`Đã hủy theo dõi tác giả ${targetName || ''}.`);

        // Cloud updates
        fetch(`${rtdbUrl}/users/${currentUser.uid}/following/${targetUid}.json${authParam}`, { method: 'DELETE' }).catch(() => {});
        fetch(`${rtdbUrl}/users/${currentUser.uid}/profile/followingCount.json${authParam}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentUser.followingCount)
        }).catch(() => {});
        fetch(`${rtdbUrl}/users/${targetUid}/followers/${currentUser.uid}.json${authParam}`, { method: 'DELETE' }).catch(() => {});
        if (currentPublicProfileAuthor && currentPublicProfileAuthor.targetUid === targetUid) {
          fetch(`${rtdbUrl}/users/${targetUid}/profile/followerCount.json${authParam}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentPublicProfileAuthor.targetFollowerCount)
          }).catch(() => {});
        }
      } else {
        // Follow
        myFollowingMap[targetUid] = true;
        localStorage.setItem('vocaflow_following_map', JSON.stringify(myFollowingMap));
        currentUser.followingCount = Object.keys(myFollowingMap).length;
        localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(currentUser));
        updateAuthUI();
        updatePubViewFollowBtn(targetUid);

        // Update target follower count on UI immediately
        if (currentPublicProfileAuthor && currentPublicProfileAuthor.targetUid === targetUid) {
          currentPublicProfileAuthor.targetFollowerCount = (currentPublicProfileAuthor.targetFollowerCount || 0) + 1;
          const pubFollowerEl = document.getElementById('pub-view-follower-count');
          if (pubFollowerEl) pubFollowerEl.textContent = currentPublicProfileAuthor.targetFollowerCount;
        }

        showToast(`✨ Đã theo dõi tác giả ${targetName || ''}!`);

        // Cloud updates
        fetch(`${rtdbUrl}/users/${currentUser.uid}/following/${targetUid}.json${authParam}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(true)
        }).catch(() => {});
        fetch(`${rtdbUrl}/users/${currentUser.uid}/profile/followingCount.json${authParam}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentUser.followingCount)
        }).catch(() => {});
        fetch(`${rtdbUrl}/users/${targetUid}/followers/${currentUser.uid}.json${authParam}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(true)
        }).catch(() => {});
        if (currentPublicProfileAuthor && currentPublicProfileAuthor.targetUid === targetUid) {
          fetch(`${rtdbUrl}/users/${targetUid}/profile/followerCount.json${authParam}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentPublicProfileAuthor.targetFollowerCount)
          }).catch(() => {});
        }
      }
    }

    function updatePubViewFollowBtn(targetUid) {
      const btn = document.getElementById('btn-pub-follow');
      if (!btn) return;

      const authorClean = (currentPublicProfileAuthor?.resolvedHandle || '').replace(/^@/, '').trim().toLowerCase();
      const currentHandle = (currentUser?.username || (currentUser?.email ? currentUser.email.split('@')[0] : '')).toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const isSelf = (currentUser && targetUid && targetUid === currentUser.uid) ||
                     (currentPublicProfileAuthor && currentPublicProfileAuthor.isCurrentUser) ||
                     (authorClean && currentHandle && authorClean === currentHandle);

      if (!targetUid || isSelf || targetUid === 'official' || targetUid === 'undefined') {
        btn.style.display = 'none';
        return;
      }

      btn.style.display = 'inline-flex';
      const isFollowing = !!myFollowingMap[targetUid];
      if (isFollowing) {
        btn.innerHTML = '<span>✓ Đang theo dõi</span>';
        btn.style.background = 'rgba(16,185,129,0.12)';
        btn.style.color = '#34d399';
        btn.style.borderColor = 'rgba(16,185,129,0.4)';
        btn.className = 'btn btn-sm btn-outline';
      } else {
        btn.innerHTML = '<span>➕ Theo dõi</span>';
        btn.style.background = 'linear-gradient(135deg, #4f46e5, #7c3aed)';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.className = 'btn btn-sm btn-primary';
      }
    }

    function handlePubViewFollowToggle() {
      if (!currentPublicProfileAuthor || !currentPublicProfileAuthor.targetUid) return;
      toggleFollowCreator(
        currentPublicProfileAuthor.targetUid,
        currentPublicProfileAuthor.resolvedName,
        currentPublicProfileAuthor.resolvedHandle
      );
    }

    async function openSubscribersListModal(type = 'following') {
      const modal = document.getElementById('modal-subscribers-list');
      const titleEl = document.getElementById('subs-modal-title');
      const iconEl = document.getElementById('subs-modal-icon');
      const bodyEl = document.getElementById('subs-modal-body');
      if (!modal || !bodyEl) return;

      const isFollowing = type === 'following';
      if (titleEl) titleEl.textContent = isFollowing ? '✨ Danh Sách Đang Theo Dõi' : '👥 Danh Sách Người Theo Dõi';
      if (iconEl) iconEl.textContent = isFollowing ? '✨' : '👥';

      const map = isFollowing ? myFollowingMap : myFollowersMap;
      const uids = Object.keys(map || {}).filter(uid => uid && uid !== currentUser?.uid && uid !== 'undefined' && uid !== 'null');

      if (uids.length === 0) {
        bodyEl.innerHTML = `
          <div style="text-align: center; padding: 30px 10px; color: var(--text-muted); font-size: 12.5px;">
            <div style="font-size: 28px; margin-bottom: 6px;">${isFollowing ? '👥' : '🌱'}</div>
            ${isFollowing ? 'Bạn chưa theo dõi tác giả nào. Ghé Thư Viện để theo dõi các tác giả yêu thích!' : 'Chưa có người theo dõi nào. Hãy xuất bản VocaDeck hữu ích để kết nối bạn bè!'}
          </div>
        `;
        openModal('modal-subscribers-list');
        return;
      }

      bodyEl.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 12px;">🔄 Đang tải danh sách tác giả...</div>';
      openModal('modal-subscribers-list');

      const allDecks = getAllLibraryDecks();
      const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';

      const userItems = await Promise.all(uids.map(async uid => {
        let name = 'Tác giả VocaFlow';
        let handle = 'user_' + uid.slice(0, 6);
        let avatar = name;

        // Try local matching from library decks first for instant name/avatar fallback
        const foundDeck = allDecks.find(d => d.authorUid === uid);
        if (foundDeck) {
          name = foundDeck.author || name;
          if (foundDeck.authorUsername) handle = foundDeck.authorUsername;
          avatar = foundDeck.authorAvatar || name;
        }

        let isVip = isAuthorVipUser(uid, name);
        let vipTier = getAuthorVipTier(uid, name);

        // ALWAYS fetch real-time profile from Cloud database to get the exact current username, avatar and VIP status
        try {
          const res = await fetch(`${rtdbUrl}/users/${uid}/profile.json`);
          if (res.ok) {
            const p = await res.json();
            if (p && typeof p === 'object') {
              if (p.displayName) name = p.displayName;
              if (p.username && p.username.trim().length >= 3) handle = p.username.trim();
              if (p.avatar) avatar = p.avatar;
              if (p.isVip === true) {
                isVip = true;
                vipTier = p.vipTier || vipTier || 'lifetime';
              }
            }
          }
        } catch (e) {}

        if (isAuthorVipUser(uid, name)) isVip = true;

        return { uid, name, handle, avatar, isVip, vipTier };
      }));

      let html = '';
      userItems.forEach(u => {
        const isFollowed = !!myFollowingMap[u.uid];
        html += `
          <div style="background: var(--surface-elevated); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; cursor: pointer;" onclick="closeModal('modal-subscribers-list'); openPublicProfileModal('${escapeHtml(u.name)}', '${u.uid}')">
              <div style="width: 38px; height: 38px; min-width: 38px; min-height: 38px; border-radius: 50%; background: linear-gradient(135deg, #a855f7, #6366f1); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; color: white; overflow: hidden; ${u.isVip ? 'box-shadow: 0 0 0 2px #fbbf24, 0 0 10px rgba(251,191,36,0.6);' : ''}">
                ${renderAvatarHtml(u.avatar, 38, 16)}
              </div>
              <div style="min-width: 0; flex: 1;">
                <div style="font-weight: 700; font-size: 13px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 4px;">
                  ${u.isVip ? `<span class="vip-name-wrapper"><span class="vip-crown-icon" style="font-size: 12px; margin-right: 4px;">👑</span><span class="vip-glowing-name">${escapeHtml(u.name)}</span></span>` : `<span>${escapeHtml(u.name)}</span>`}
                </div>
                <div style="font-size: 11px; color: #38bdf8; font-family: monospace;">@${escapeHtml(u.handle)}</div>
              </div>
            </div>
            ${currentUser && u.uid !== currentUser.uid ? `
              <button class="btn btn-sm ${isFollowed ? 'btn-outline' : 'btn-primary'}" onclick="toggleFollowCreator('${u.uid}', '${escapeHtml(u.name)}', '${escapeHtml(u.handle)}'); openSubscribersListModal('${type}')" style="font-size: 11px; padding: 3px 8px; flex-shrink: 0; ${isFollowed ? 'color: #34d399; border-color: rgba(16,185,129,0.4); background: rgba(16,185,129,0.08);' : ''}">
                ${isFollowed ? '✓ Đang theo dõi' : '➕ Theo dõi'}
              </button>
            ` : ''}
          </div>
        `;
      });

      bodyEl.innerHTML = html;
    }

    // =========================================================================
    // USER IDENTIFICATION & UNIQUE HANDLE REGISTRY ENGINE (v0.10.7a)
    // =========================================================================
    const RESERVED_USERNAMES = new Set([
      'admin', 'administrator', 'system', 'vocaflow', 'official', 'support', 'help',
      'null', 'undefined', 'true', 'false', 'guest', 'anonymous', 'root', 'api',
      'bot', 'mod', 'moderator', 'dev', 'developer', 'staff', 'owner', 'super',
      'public', 'test', 'error', 'config', 'service', 'database'
    ]);

    const USERNAME_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    function validateUsernameFormat(handle) {
      if (!handle || typeof handle !== 'string') {
        return { valid: false, error: 'Tên người dùng không được để trống!' };
      }
      const clean = handle.toLowerCase().trim();
      if (clean.length < 3) {
        return { valid: false, error: 'Tên người dùng phải có ít nhất 3 ký tự!' };
      }
      if (clean.length > 20) {
        return { valid: false, error: 'Tên người dùng tối đa 20 ký tự!' };
      }
      if (!/^[a-z0-9_]+$/.test(clean)) {
        return { valid: false, error: 'Tên người dùng chỉ được chứa chữ thường (a-z), chữ số (0-9) và dấu gạch dưới (_), không khoảng trắng!' };
      }
      if (RESERVED_USERNAMES.has(clean)) {
        return { valid: false, error: `Tên người dùng @${clean} nằm trong danh sách cấm của hệ thống!` };
      }
      return { valid: true, clean };
    }

    function getUsernameCooldownStatus(lastChangeTimestamp) {
      if (!lastChangeTimestamp) return { canChange: true, daysRemaining: 0, hoursRemaining: 0 };
      const last = Number(lastChangeTimestamp);
      if (isNaN(last) || last <= 0) return { canChange: true, daysRemaining: 0, hoursRemaining: 0 };
      const elapsed = Date.now() - last;
      if (elapsed >= USERNAME_COOLDOWN_MS) {
        return { canChange: true, daysRemaining: 0, hoursRemaining: 0 };
      }
      const remainingMs = USERNAME_COOLDOWN_MS - elapsed;
      const daysRemaining = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
      const hoursRemaining = Math.ceil(remainingMs / (60 * 60 * 1000));
      return { canChange: false, daysRemaining, hoursRemaining, remainingMs };
    }

    async function ensureUserHandleAssigned(user) {
      if (!user) return;
      if (!user.uid || user.uid.startsWith('guest_')) {
        if (!user.username) {
          user.username = 'guest_' + (user.uid ? user.uid.replace('guest_', '').slice(-6) : Math.floor(1000 + Math.random() * 9000));
        }
        return;
      }

      // If user already has a valid non-guest username in local state, do not overwrite
      if (user.username && user.username.trim().length >= 3 && !user.username.startsWith('guest_')) {
        return;
      }

      const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
      const authParam = (user && user.idToken) ? '?auth=' + user.idToken : '';

      // 1. FIRST check if user already has an existing username in Cloud profile
      try {
        const pRes = await fetch(`${rtdbUrl}/users/${user.uid}/profile.json${authParam}`);
        if (pRes.ok) {
          const prof = await pRes.json();
          if (prof && prof.username && prof.username.trim().length >= 3) {
            user.username = prof.username.trim().toLowerCase();
            if (prof.lastUsernameChangeTimestamp) {
              user.lastUsernameChangeTimestamp = Number(prof.lastUsernameChangeTimestamp);
            }
            localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
            updateAuthUI();
            return; // Found existing username on Cloud! DO NOT overwrite!
          }
        }
      } catch (e) {}

      // 2. Only if user has NO username on Cloud, generate an initial candidate
      let baseCandidate = '';
      if (user.email) {
        baseCandidate = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 14);
      } else if (user.displayName) {
        baseCandidate = user.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 14);
      }
      if (baseCandidate.length < 3) {
        baseCandidate = 'user_' + user.uid.slice(0, 6).toLowerCase();
      }

      let finalHandle = baseCandidate;
      try {
        const res = await fetch(`${rtdbUrl}/usernames/${finalHandle}.json${authParam}`);
        if (res.ok) {
          const claimedUid = await res.json();
          if (claimedUid && claimedUid !== user.uid) {
            finalHandle = (baseCandidate.slice(0, 13) + '_' + Math.floor(100 + Math.random() * 900)).toLowerCase();
          }
        }

        const patch = {
          [`usernames/${finalHandle}`]: user.uid,
          [`users/${user.uid}/profile/username`]: finalHandle,
          [`users/${user.uid}/username`]: finalHandle
        };

        await fetch(`${rtdbUrl}/.json${authParam}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch)
        });

        user.username = finalHandle;
        localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
        updateAuthUI();
      } catch (e) {
        console.warn('Auto handle registration fallback:', e);
        user.username = finalHandle;
        localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
        updateAuthUI();
      }
    }

    let usernameLiveValidationTimeout = null;

    function onProfileUsernameInput(val) {
      const fb = document.getElementById('profile-handle-live-feedback');
      if (!fb) return;

      if (!val || val.trim().length === 0) {
        fb.style.display = 'none';
        return;
      }

      const clean = val.toLowerCase().trim();
      const currentHandle = (currentUser?.username || '').toLowerCase().trim();

      if (clean === currentHandle) {
        fb.style.display = 'block';
        fb.style.color = 'var(--text-muted)';
        fb.textContent = 'ℹ️ Đây là tên người dùng hiện tại của bạn.';
        return;
      }

      // Check format
      const valRes = validateUsernameFormat(clean);
      if (!valRes.valid) {
        fb.style.display = 'block';
        fb.style.color = '#f87171';
        fb.textContent = '⚠️ ' + valRes.error;
        return;
      }

      // Check cooldown
      const cooldown = getUsernameCooldownStatus(currentUser?.lastUsernameChangeTimestamp);
      if (!cooldown.canChange) {
        fb.style.display = 'block';
        fb.style.color = '#fbbf24';
        fb.textContent = `⏳ Bạn chỉ có thể đổi tên sau ${cooldown.daysRemaining} ngày nữa.`;
        return;
      }

      fb.style.display = 'block';
      fb.style.color = '#38bdf8';
      fb.textContent = '🔍 Đang kiểm tra tên người dùng...';

      if (usernameLiveValidationTimeout) clearTimeout(usernameLiveValidationTimeout);
      usernameLiveValidationTimeout = setTimeout(async () => {
        const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
        const authParam = (currentUser && currentUser.idToken) ? '?auth=' + currentUser.idToken : '';
        try {
          const checkRes = await fetch(`${rtdbUrl}/usernames/${clean}.json${authParam}`);
          if (checkRes.ok) {
            const claimedUid = await checkRes.json();
            if (claimedUid && claimedUid !== currentUser?.uid) {
              fb.style.color = '#f87171';
              fb.textContent = '❌ Tên người dùng này đã có người sử dụng';
              return;
            }
          }
          fb.style.color = '#34d399';
          fb.textContent = `✅ Tên người dùng @${clean} khả dụng!`;
        } catch (e) {
          fb.style.display = 'none';
        }
      }, 350);
    }

    async function changeUserHandle(rawHandle) {
      if (!currentUser || !currentUser.uid || currentUser.uid.startsWith('guest_')) {
        showToast('🔒 Vui lòng đăng ký / đăng nhập tài khoản để đặt Handle duy nhất!');
        openAuthModal('login');
        return { success: false, reason: 'unauthorized' };
      }

      // 1. Check format (3-20 chars, no special characters)
      const val = validateUsernameFormat(rawHandle);
      if (!val.valid) {
        showToast('⚠️ ' + val.error);
        return { success: false, reason: 'invalid_format', error: val.error };
      }

      const newHandle = val.clean;
      const oldHandle = (currentUser.username || '').toLowerCase().trim();

      if (newHandle === oldHandle) {
        return { success: true, unchanged: true };
      }

      // 2. Check 7-day cooldown
      const cooldown = getUsernameCooldownStatus(currentUser.lastUsernameChangeTimestamp);
      if (!cooldown.canChange) {
        showToast(`⏳ Bạn chỉ có thể đổi tên sau ${cooldown.daysRemaining} ngày nữa`);
        return { success: false, reason: 'cooldown_active', daysRemaining: cooldown.daysRemaining };
      }

      const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
      const authParam = (currentUser && currentUser.idToken) ? '?auth=' + currentUser.idToken : '';

      try {
        // 3. Check Firebase /usernames/{new_handle}
        const checkRes = await fetch(`${rtdbUrl}/usernames/${newHandle}.json${authParam}`);
        if (checkRes.ok) {
          const claimedUid = await checkRes.json();
          if (claimedUid && claimedUid !== currentUser.uid) {
            showToast('❌ Tên người dùng này đã có người sử dụng');
            return { success: false, reason: 'already_taken' };
          }
        }

        // 4. Transactionally delete old handle, create new handle, update profile & record timestamp
        const now = Date.now();
        const patch = {};
        if (oldHandle && oldHandle !== newHandle) {
          patch[`usernames/${oldHandle}`] = null;
        }
        patch[`usernames/${newHandle}`] = currentUser.uid;
        patch[`users/${currentUser.uid}/profile/username`] = newHandle;
        patch[`users/${currentUser.uid}/profile/lastUsernameChangeTimestamp`] = now;
        patch[`users/${currentUser.uid}/username`] = newHandle;
        patch[`users/${currentUser.uid}/lastUsernameChangeTimestamp`] = now;

        const patchRes = await fetch(`${rtdbUrl}/.json${authParam}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch)
        });

        if (patchRes.ok) {
          currentUser.username = newHandle;
          currentUser.lastUsernameChangeTimestamp = now;
          localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(currentUser));

          // Cascade update published decks
          if (Array.isArray(cloudLibraryDecks)) {
            cloudLibraryDecks.forEach(d => {
              if (d.authorUid === currentUser.uid && !d.isAnonymous) {
                d.authorUsername = newHandle;
                fetch(`${rtdbUrl}/publicLibraryDecks/${d.id}/authorUsername.json${authParam}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(newHandle)
                }).catch(() => {});
              }
            });
          }

          updateAuthUI();
          showToast(`🎉 Đã đổi tên người dùng thành công: @${newHandle}`);
          return { success: true };
        } else {
          showToast('⚠️ Không thể cập nhật Handle lên máy chủ. Vui lòng thử lại!');
          return { success: false, reason: 'cloud_error' };
        }
      } catch (err) {
        console.error('Handle change error:', err);
        showToast('⚠️ Lỗi: ' + err.message);
        return { success: false, reason: 'exception', error: err.message };
      }
    }

    function updateAuthUI() {
      // Dynamic Meme Mèo setting visibility for VIP only
      const memeSettingGroup = document.getElementById('setting-vip-cat-meme-group');
      if (memeSettingGroup) {
        memeSettingGroup.style.display = (userIsVip === true) ? 'block' : 'none';
      }
      const nameEl = document.getElementById('user-display-name');
      const profileNameEl = document.getElementById('profile-name');
      const profileEmailEl = document.getElementById('profile-email');
      const profileBadgeEl = document.getElementById('profile-badge');
      const profileAvatarEl = document.getElementById('profile-avatar');
      const authActionBtn = document.getElementById('btn-profile-auth-action');
      const guestBanner = document.getElementById('guest-perks-banner');
      const profileHandleEl = document.getElementById('profile-handle');
      const profileHandleBadge = document.getElementById('profile-handle-badge');
      const profileHandleCooldownHint = document.getElementById('profile-handle-cooldown-hint');
      const usernameInput = document.getElementById('profile-username-input');

      const nameMobileEl = document.getElementById('user-display-name-mobile');
      if (currentUser && currentUser.email) {
        if (guestBanner) guestBanner.style.display = 'none';
        const rawDisplayName = currentUser.displayName || currentUser.email.split('@')[0];
        const userVipActive = isUserVip();
        const userVipTierName = getUserVipTier();
        const displayName = userVipActive ? rawDisplayName : stripVipAffixes(rawDisplayName);
        const userHandle = currentUser.username || currentUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');

        if (nameEl) {
          if (userVipActive) {
            nameEl.innerHTML = `<span class="vip-name-wrapper"><span class="vip-glowing-name">${escapeHtml(displayName)}</span><span class="vip-crown-icon" title="Hội viên VocaVIP (${userVipTierName.toUpperCase()})" style="font-size: 13px;">👑</span></span>`;
          } else {
            nameEl.textContent = displayName;
          }
        }

        if (nameMobileEl) {
          if (userVipActive) {
            nameMobileEl.innerHTML = `Tài khoản: <strong style="display: inline-flex; align-items: center;"><span class="vip-crown-icon" style="margin-right: 4px; margin-left: 0;">👑</span><span class="vip-glowing-name">${escapeHtml(displayName)} (VocaVIP)</span></strong>`;
          } else {
            nameMobileEl.textContent = `Tài khoản (${displayName})`;
          }
        }

        if (profileNameEl) {
          if (userVipActive) {
            profileNameEl.innerHTML = `<span class="vip-name-wrapper"><span class="vip-glowing-name" style="font-size: 1.15em;">${escapeHtml(displayName)}</span><span class="vip-crown-icon" style="font-size: 1.25em;" title="Hội viên VocaVIP (${userVipTierName.toUpperCase()})">👑</span></span>`;
          } else {
            profileNameEl.textContent = displayName;
          }
        }

        if (profileEmailEl) profileEmailEl.textContent = currentUser.email;

        if (profileBadgeEl) {
          if (userVipActive) {
            const durationLabel = formatVipDurationText(userVipExpiresAt, userVipTierName);
            if (durationLabel !== 'Hết hạn') {
              profileBadgeEl.innerHTML = `👑 VocaVIP ${durationLabel}`;
              profileBadgeEl.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
              profileBadgeEl.style.color = '#ffffff';
              profileBadgeEl.style.fontWeight = '800';
              profileBadgeEl.style.border = '1px solid rgba(251, 191, 36, 0.6)';
              profileBadgeEl.style.boxShadow = '0 2px 10px rgba(245, 158, 11, 0.4)';
            } else {
              profileBadgeEl.textContent = 'Đã liên kết Cloud';
              profileBadgeEl.style.background = 'rgba(16,185,129,0.2)';
              profileBadgeEl.style.color = '#34d399';
              profileBadgeEl.style.fontWeight = 'normal';
              profileBadgeEl.style.border = 'none';
              profileBadgeEl.style.boxShadow = 'none';
            }
          } else {
            profileBadgeEl.textContent = 'Đã liên kết Cloud';
            profileBadgeEl.style.background = 'rgba(16,185,129,0.2)';
            profileBadgeEl.style.color = '#34d399';
            profileBadgeEl.style.fontWeight = 'normal';
            profileBadgeEl.style.border = 'none';
            profileBadgeEl.style.boxShadow = 'none';
          }
        }

        const btnProfileUpgrade = document.getElementById('btn-profile-upgrade-vip');
        if (btnProfileUpgrade) {
          if (userVipActive && userVipTierName === 'lifetime') {
            btnProfileUpgrade.style.display = 'none';
          } else if (userVipActive && (userVipTierName === 'monthly' || userVipTierName === 'yearly')) {
            btnProfileUpgrade.style.display = 'inline-flex';
            btnProfileUpgrade.textContent = '👑 Nâng Cấp VocaVIP';
          } else {
            btnProfileUpgrade.style.display = 'inline-flex';
            btnProfileUpgrade.textContent = '👑 Nâng Cấp VocaVIP';
          }
        }

        // Handle & Cooldown Status
        const cooldown = getUsernameCooldownStatus(currentUser.lastUsernameChangeTimestamp);
        if (profileHandleEl) profileHandleEl.textContent = `@${userHandle}`;
        if (profileHandleBadge) {
          if (cooldown.canChange) {
            profileHandleBadge.textContent = '✨ Có thể đổi';
            profileHandleBadge.style.background = 'rgba(16,185,129,0.15)';
            profileHandleBadge.style.color = '#34d399';
            profileHandleBadge.style.borderColor = 'rgba(16,185,129,0.3)';
          } else {
            profileHandleBadge.textContent = `🔒 Sau ${cooldown.daysRemaining} ngày`;
            profileHandleBadge.style.background = 'rgba(245,158,11,0.15)';
            profileHandleBadge.style.color = '#fbbf24';
            profileHandleBadge.style.borderColor = 'rgba(245,158,11,0.3)';
          }
        }
        if (profileHandleCooldownHint) {
          if (cooldown.canChange) {
            profileHandleCooldownHint.textContent = '✨ Có thể đổi tên ngay';
            profileHandleCooldownHint.style.color = '#34d399';
          } else {
            const nextDate = new Date(Number(currentUser.lastUsernameChangeTimestamp) + USERNAME_COOLDOWN_MS).toLocaleDateString('vi-VN');
            profileHandleCooldownHint.textContent = `🔒 Đã khóa (đổi lại sau ${cooldown.daysRemaining} ngày - ${nextDate})`;
            profileHandleCooldownHint.style.color = '#fbbf24';
          }
        }
        if (usernameInput) {
          if (document.activeElement !== usernameInput) {
            usernameInput.value = userHandle;
          }
          if (!cooldown.canChange) {
            usernameInput.disabled = true;
            usernameInput.readOnly = true;
            usernameInput.style.cursor = 'not-allowed';
            usernameInput.style.opacity = '0.55';
            usernameInput.style.pointerEvents = 'none';
            usernameInput.title = `🔒 Bạn chỉ có thể đổi tên sau ${cooldown.daysRemaining} ngày nữa`;
          } else {
            usernameInput.disabled = false;
            usernameInput.readOnly = false;
            usernameInput.style.cursor = 'text';
            usernameInput.style.opacity = '1';
            usernameInput.style.pointerEvents = 'auto';
            usernameInput.title = 'Nhập tên định danh mới (3-20 ký tự)';
          }
        }
        const userAvatar = getUserAvatar(currentUser);
        if (profileAvatarEl) {
          profileAvatarEl.innerHTML = renderAvatarHtml(userAvatar, 58, 26);
          if (userVipActive) {
            profileAvatarEl.classList.add('vip-avatar-glow');
          } else {
            profileAvatarEl.classList.remove('vip-avatar-glow');
            profileAvatarEl.style.boxShadow = 'none';
          }
        }
        const headerAvatarIcon = document.getElementById('user-avatar-icon');
        if (headerAvatarIcon) headerAvatarIcon.innerHTML = renderAvatarHtml(userAvatar, 22, 14);
        const mobileAvatarIcon = document.getElementById('user-avatar-icon-mobile');
        if (mobileAvatarIcon) mobileAvatarIcon.innerHTML = renderAvatarHtml(userAvatar, 22, 14);
        if (authActionBtn) {
          authActionBtn.textContent = '🚪 Đăng xuất tài khoản';
          authActionBtn.style.color = '#ef4444';
          authActionBtn.style.borderColor = 'rgba(239,68,68,0.4)';
        }
      } else {
        if (guestBanner) guestBanner.style.display = 'block';
        if (nameEl) nameEl.textContent = 'Khách';
        if (nameMobileEl) nameMobileEl.textContent = 'Tài khoản (Khách)';
        if (profileNameEl) profileNameEl.textContent = 'Khách (Offline)';
        if (profileEmailEl) profileEmailEl.textContent = 'Dữ liệu lưu trữ nội bộ trên máy này.';
        if (profileBadgeEl) {
          profileBadgeEl.textContent = 'Chưa liên kết';
          profileBadgeEl.style.background = 'rgba(245,158,11,0.2)';
          profileBadgeEl.style.color = '#fbbf24';
        }
        const guestHandle = (currentUser && currentUser.username) ? currentUser.username : 'guest';
        if (profileHandleEl) profileHandleEl.textContent = `@${guestHandle}`;
        if (profileHandleBadge) {
          profileHandleBadge.textContent = 'Khách';
          profileHandleBadge.style.background = 'rgba(148,163,184,0.15)';
          profileHandleBadge.style.color = '#94a3b8';
          profileHandleBadge.style.borderColor = 'rgba(148,163,184,0.3)';
        }
        if (profileHandleCooldownHint) {
          profileHandleCooldownHint.textContent = '🔒 Đăng nhập để đặt Handle duy nhất';
          profileHandleCooldownHint.style.color = 'var(--text-muted)';
        }
        if (usernameInput && document.activeElement !== usernameInput) {
          usernameInput.value = guestHandle;
        }
        if (profileAvatarEl) {
          profileAvatarEl.innerHTML = renderAvatarHtml(getUserAvatar(), 58, 26);
          profileAvatarEl.classList.remove('vip-avatar-glow');
          profileAvatarEl.style.boxShadow = '0 4px 12px rgba(168,85,247,0.3)';
          profileAvatarEl.style.borderColor = 'rgba(255,255,255,0.25)';
        }
        if (authActionBtn) {
          authActionBtn.textContent = 'Đăng nhập / Đăng ký tài khoản';
          authActionBtn.style.color = '#4f46e5';
          authActionBtn.style.borderColor = '#4f46e5';
        }
      }

      // Update Profile Name & Bio Inputs & Bio Display Box
      const nameInput = document.getElementById('profile-display-name-input');
      const bioInput = document.getElementById('profile-bio-input');
      if (nameInput && document.activeElement !== nameInput) nameInput.value = (currentUser && currentUser.displayName) || '';
      if (bioInput && document.activeElement !== bioInput) bioInput.value = (currentUser && currentUser.bio) || '';

      const bioDisplayEl = document.getElementById('profile-bio-display');
      if (bioDisplayEl) {
        const hasBio = currentUser && currentUser.bio && currentUser.bio.trim().length > 0;
        bioDisplayEl.textContent = hasBio ? currentUser.bio : 'Chưa thiết lập mục tiêu cá nhân.';
        bioDisplayEl.style.fontStyle = hasBio ? 'normal' : 'italic';
      }

      // Update metrics
      const isRegisteredUser = !!(currentUser && currentUser.email && currentUser.uid && !currentUser.uid.startsWith('guest_'));
      const followerCountEl = document.getElementById('profile-follower-count');
      const followingCountEl = document.getElementById('profile-following-count');
      if (followerCountEl) {
        followerCountEl.textContent = formatNumber(isRegisteredUser ? (currentUser?.followerCount || Object.keys(myFollowersMap || {}).length || 0) : 0);
      }
      if (followingCountEl) {
        followingCountEl.textContent = formatNumber(isRegisteredUser ? (currentUser?.followingCount || Object.keys(myFollowingMap || {}).length || 0) : 0);
      }

      const statDecks = document.getElementById('profile-stat-decks');
      const statDecksCloud = document.getElementById('profile-stat-decks-cloud');
      const statWords = document.getElementById('profile-stat-words');
      const lastSyncEl = document.getElementById('profile-last-sync');
      if (statDecks) statDecks.textContent = formatNumber(decks.length);
      if (statDecksCloud) statDecksCloud.textContent = `${formatNumber(decks.length)} deck`;
      if (statWords) statWords.textContent = `${formatNumber(words.length)} từ`;
      if (typeof renderProfileDecksList === 'function') renderProfileDecksList();

      const lastSync = localStorage.getItem(STORAGE_KEY_LAST_SYNC);
      if (lastSyncEl) {
        lastSyncEl.textContent = lastSync ? new Date(lastSync).toLocaleString('vi-VN') : 'Chưa đồng bộ';
      }
      if (typeof initMonetagPassiveAds === 'function') initMonetagPassiveAds();
      if (typeof isUserVip === 'function' && isUserVip() && typeof purgeAllAdArtifactsFromDOM === 'function') {
        purgeAllAdArtifactsFromDOM();
      }
    }

    // Modal Switchers
    // Global Login Guard for Guest vs Member Features (v0.0.9.17)
    function requireLogin(featureName = 'tính năng này') {
      if (currentUser && currentUser.email && currentUser.email.trim().length > 0) {
        return true;
      }
      alert('🔒 Vui lòng đăng ký hoặc đăng nhập tài khoản để sử dụng ' + featureName + '!');
      openAuthModal('login');
      return false;
    }

    function toggleGeminiKeyGuide(e) {
      if (e) e.preventDefault();
      const box = document.getElementById('gemini-key-guide-box');
      if (box) {
        box.style.display = (box.style.display === 'none' || !box.style.display) ? 'block' : 'none';
      }
    }

    function toggleProfileEditSection(forceOpen) {
      const container = document.getElementById('profile-custom-fields-container');
      if (!container) return;
      const willOpen = (typeof forceOpen === 'boolean') ? forceOpen : (container.style.display === 'none' || !container.style.display);
      container.style.display = willOpen ? 'flex' : 'none';
      if (willOpen) {
        const nameInput = document.getElementById('profile-display-name-input');
        const bioInput = document.getElementById('profile-bio-input');
        const usernameInput = document.getElementById('profile-username-input');
        if (nameInput) nameInput.value = (currentUser && currentUser.displayName) || '';
        if (bioInput) bioInput.value = (currentUser && currentUser.bio) || '';
        const cooldown = getUsernameCooldownStatus(currentUser ? currentUser.lastUsernameChangeTimestamp : 0);
        if (usernameInput) {
          usernameInput.value = (currentUser && currentUser.username) || '';
          if (!cooldown.canChange) {
            usernameInput.disabled = true;
            usernameInput.readOnly = true;
            usernameInput.style.cursor = 'not-allowed';
            usernameInput.style.opacity = '0.55';
            usernameInput.style.pointerEvents = 'none';
            usernameInput.title = `🔒 Bạn chỉ có thể đổi tên sau ${cooldown.daysRemaining} ngày nữa`;
          } else {
            usernameInput.disabled = false;
            usernameInput.readOnly = false;
            usernameInput.style.cursor = 'text';
            usernameInput.style.opacity = '1';
            usernameInput.style.pointerEvents = 'auto';
            usernameInput.title = 'Nhập tên định danh mới (3-20 ký tự)';
          }
        }
        const fb = document.getElementById('profile-handle-live-feedback');
        if (fb) fb.style.display = 'none';
        if (nameInput) nameInput.focus();
      }
    }

    function isDeckAuthor(deck) {
      if (!deck || !currentUser || !currentUser.uid || currentUser.uid.startsWith('guest_') || (typeof deck.id === 'string' && deck.id.startsWith('lib_deck_'))) {
        return false;
      }
      // 1. Primary match: Permanent authorUid
      if (deck.authorUid && deck.authorUid === currentUser.uid) {
        return true;
      }
      // 2. Secondary match: Email match (legacy deck compatibility)
      if (deck.authorEmail && currentUser.email && deck.authorEmail.toLowerCase() === currentUser.email.toLowerCase()) {
        return true;
      }
      // 3. Tertiary fallback: Display name match for legacy user-authored decks
      if (!deck.authorUid && deck.author && currentUser.displayName && deck.author.trim().toLowerCase() === currentUser.displayName.trim().toLowerCase()) {
        return true;
      }
      // 4. Quaternary fallback: If deck is in user's personal decks (not from library and has no different authorUid):
      if (!deck.libSourceId && !deck.authorUid && !deck.id.startsWith('lib_deck_')) {
        return true;
      }
      return false;
    }

    function getLiveDeckAuthor(deck) {
      if (!deck) return { author: '', authorUid: '', isVip: false };
      let liveAuthor = deck.author || '';
      let liveAuthorUid = deck.authorUid || '';

      // 1. If this is a deck imported from Library:
      if (deck.libSourceId) {
        const libDeck = getAllLibraryDecks().find(d => d.id === deck.libSourceId);
        if (libDeck) {
          if (libDeck.author && !libDeck.isAnonymous) liveAuthor = libDeck.author;
          if (libDeck.authorUid) liveAuthorUid = libDeck.authorUid;
        }
      }

      // 2. If this deck belongs to the current logged-in user:
      if (currentUser && currentUser.uid && !currentUser.uid.startsWith('guest_')) {
        const currentName = (currentUser.displayName || currentUser.username || '').trim();
        if (currentName) {
          if (isDeckAuthor(deck) || (deck.authorUid && deck.authorUid === currentUser.uid) || (!deck.authorUid && !deck.id.startsWith('lib_deck_') && !deck.libSourceId)) {
            liveAuthor = currentName;
            liveAuthorUid = currentUser.uid;
            if (deck.author !== currentName || deck.authorUid !== currentUser.uid) {
              deck.author = currentName;
              deck.authorUid = currentUser.uid;
            }
          }
        }
      }

      // 3. If authorUid belongs to a known user in adminStudentsData / Realtime Cloud:
      if (liveAuthorUid && typeof adminStudentsData !== 'undefined' && Array.isArray(adminStudentsData)) {
        const matchedStudent = adminStudentsData.find(s => s && s.uid === liveAuthorUid);
        if (matchedStudent && matchedStudent.displayName) {
          liveAuthor = matchedStudent.displayName;
        }
      }

      const isVip = isAuthorVipUser(liveAuthorUid, liveAuthor);
      return { author: liveAuthor, authorUid: liveAuthorUid, isVip };
    }

    async function saveUserProfileCustomFields() {
      const nameInput = document.getElementById('profile-display-name-input');
      const bioInput = document.getElementById('profile-bio-input');
      const usernameInput = document.getElementById('profile-username-input');
      const newName = (nameInput?.value || '').trim() || 'Người dùng VocaFlow';
      const newBio = (bioInput?.value || '').trim();
      const rawUsername = (usernameInput?.value || '').trim().toLowerCase();

      if (!currentUser) {
        currentUser = {
          displayName: newName,
          bio: newBio,
          email: '',
          uid: 'guest_' + Date.now()
        };
      } else {
        currentUser.displayName = newName;
        currentUser.bio = newBio;
      }

      // v0.10.7a: Handle username modification
      if (rawUsername && rawUsername !== (currentUser.username || '').toLowerCase() && !currentUser.uid.startsWith('guest_')) {
        const handleResult = await changeUserHandle(rawUsername);
        if (!handleResult.success && !handleResult.unchanged) {
          // If handle change failed due to format, cooldown, or collision, stop and keep edit open
          return;
        }
      }

      localStorage.setItem('vocaflow_user_bio', newBio);
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(currentUser));
      updateAuthUI();
      toggleProfileEditSection(false);
      saveDatabase(true);

      // If logged in, push to Cloud User Profile & Public Library Decks
      if (currentUser && currentUser.uid && !currentUser.uid.startsWith('guest_')) {
        const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
        const authParam = (currentUser && currentUser.idToken) ? '?auth=' + currentUser.idToken : '';

        // 1. Update user profile nodes
        fetch(rtdbUrl + '/users/' + currentUser.uid + '/profile/displayName.json' + authParam, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newName)
        }).catch(() => {});

        fetch(rtdbUrl + '/users/' + currentUser.uid + '/displayName.json' + authParam, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newName)
        }).catch(() => {});

        fetch(rtdbUrl + '/users/' + currentUser.uid + '/profile/bio.json' + authParam, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newBio)
        }).catch(() => {});

        fetch(rtdbUrl + '/users/' + currentUser.uid + '/bio.json' + authParam, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newBio)
        }).catch(() => {});

        // 2. Cascade update all public library decks published by this user!
        if (Array.isArray(cloudLibraryDecks)) {
          cloudLibraryDecks.forEach(d => {
            const isOwner = isDeckAuthor(d);
            if (isOwner && !d.isAnonymous) {
              d.author = newName;
              d.authorBio = newBio;
              d.authorAvatar = currentUser.avatar || d.authorAvatar || '';
              d.authorUid = currentUser.uid;

              fetch(rtdbUrl + '/publicLibraryDecks/' + d.id + '/author.json' + authParam, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newName)
              }).catch(() => {});

              fetch(rtdbUrl + '/publicLibraryDecks/' + d.id + '/authorBio.json' + authParam, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBio)
              }).catch(() => {});

              fetch(rtdbUrl + '/publicLibraryDecks/' + d.id + '/authorUid.json' + authParam, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentUser.uid)
              }).catch(() => {});
            }
          });
          renderLibraryDecks();
        }

        // 3. Cascade update all local personal decks in decks array
        if (Array.isArray(decks)) {
          let localDecksUpdated = false;
          decks.forEach(d => {
            if (isDeckAuthor(d) || (d.authorUid && d.authorUid === currentUser.uid) || (!d.authorUid && !d.id.startsWith('lib_deck_') && !d.libSourceId)) {
              d.author = newName;
              d.authorUid = currentUser.uid;
              localDecksUpdated = true;
            }
          });
          if (localDecksUpdated) {
            saveDatabase(true);
            renderDecks();
            if (currentDeckId) openDeckDetail(currentDeckId);
          }
        }

        pushCurrentDatabaseToCloud();
      } else if (Array.isArray(decks)) {
        // Guest user local cascade update
        decks.forEach(d => {
          if (!d.libSourceId && !d.id.startsWith('lib_deck_')) {
            d.author = newName;
          }
        });
        saveDatabase(true);
        renderDecks();
        if (currentDeckId) openDeckDetail(currentDeckId);
      }

      showToast('✨ Đã lưu và cập nhật tác giả các VocaDeck thành công!');
    }

        async function deletePublishedDeck(deckId) {
      if (!requireLogin('Xóa VocaDeck Đã Đăng')) return;
      const allDecks = getAllLibraryDecks();
      const deck = allDecks.find(d => d.id === deckId);
      if (!deck) return;

      if (deck.id.startsWith('lib_deck_')) {
        alert('❌ Không thể xóa VocaDeck chuẩn của hệ thống VocaFlow!');
        return;
      }

      if (!isDeckAuthor(deck)) {
        alert('❌ Bạn không có quyền xóa VocaDeck của tác giả khác!');
        return;
      }

      if (!confirm(`⚠️ Bạn có chắc chắn muốn xóa vĩnh viễn VocaDeck "${deck.title}" khỏi Thư Viện Toàn Cầu không?\n\n(Lưu ý: VocaDeck sẽ được gỡ bỏ ngay lập tức khỏi VocaLib của tất cả người dùng).`)) {
        return;
      }

      const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
      const authParam = (currentUser && currentUser.idToken) ? `?auth=${currentUser.idToken}` : '';

      try {
        const res = await fetch(`${rtdbUrl}/publicLibraryDecks/${deckId}.json${authParam}`, {
          method: 'DELETE'
        });

        if (res.ok) {
          cloudLibraryDecks = cloudLibraryDecks.filter(d => d.id !== deckId);
          renderLibraryDecks();
          closeModal('modal-library-preview');
          showToast(`🗑️ Đã xóa thành công VocaDeck "${deck.title}" khỏi Thư Viện Toàn Cầu!`);
        } else {
          alert('Không thể xóa trên Cloud! Vui lòng thử lại.');
        }
      } catch (err) {
        alert('Lỗi khi xóa: ' + err.message);
      }
    }

        // =========================================================================
    // CREATOR MONETIZATION, IMMUTABLE LEDGER & MARKETPLACE (v0.10.6c)
    // =========================================================================
    let userLedger = [];
    let userPurchasedDeckIds = new Set();
    let currentLedgerFilter = 'all';

    try {
      const savedLedger = localStorage.getItem('vocaflow_user_ledger');
      if (savedLedger) {
        userLedger = JSON.parse(savedLedger);
        // VocaStudio ledger is strictly for VoCoin transactions (v0.10.9-alpha-27: VocaSpin belongs to VocaNoti only)
        userLedger = userLedger.filter(e => e && e.amount !== 0 && e.type !== 'VIP_DAILY_SPIN');
      }
      const savedPurchased = localStorage.getItem('vocaflow_purchased_decks');
      if (savedPurchased) userPurchasedDeckIds = new Set(JSON.parse(savedPurchased));
    } catch (e) {
      console.warn('Error loading ledger/purchased decks:', e);
    }

    function addLedgerEntry(type, amount, description, explicitBalanceAfter) {
      if (isGuest()) return; // Never record guest transactions into user account ledger
      const numAmount = Number(amount) || 0;
      
      // Do NOT record 0 Xu transactions into wallet balance ledger (v0.10.9-alpha-27: VocaSpin belongs to VocaNoti only)
      if (numAmount === 0 || type === 'VIP_DAILY_SPIN') {
        return;
      }

      const balanceAfter = (typeof explicitBalanceAfter === 'number' && !isNaN(explicitBalanceAfter))
        ? explicitBalanceAfter
        : getUserPoints();

      const tx = {
        id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        timestamp: new Date().toISOString(),
        type: type,
        amount: numAmount,
        balanceAfter: balanceAfter,
        description: description || 'Giao dịch ví'
      };

      userLedger.unshift(tx);
      // Clean up any legacy 0-amount or VIP_DAILY_SPIN entries
      userLedger = userLedger.filter(e => e && e.amount !== 0 && e.type !== 'VIP_DAILY_SPIN');
      if (userLedger.length > 250) userLedger = userLedger.slice(0, 250);
      localStorage.setItem('vocaflow_user_ledger', JSON.stringify(userLedger));

      // Sync to Cloud Ledger immediately if logged in
      if (currentUser && currentUser.uid && !currentUser.uid.startsWith('guest_')) {
        const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
        const authParam = (currentUser && currentUser.idToken) ? '?auth=' + currentUser.idToken : '';
        fetch(`${rtdbUrl}/users/${currentUser.uid}/ledger/${tx.id}.json${authParam}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tx)
        }).catch(() => {});
      }
      broadcastEconomyUpdate();

      // Realtime UI updates for studio ledger
      const curBalEl = document.getElementById('studio-wallet-balance');
      if (curBalEl) curBalEl.textContent = currentBalance + ' VoCoin';

      let totalEarned = 0;
      let totalSpent = 0;
      userLedger.forEach(t => {
        if (t.amount > 0) totalEarned += t.amount;
        else totalSpent += Math.abs(t.amount);
      });
      const earnedEl = document.getElementById('studio-total-earned');
      if (earnedEl) earnedEl.textContent = '+' + totalEarned + ' VoCoin';
      const spentEl = document.getElementById('studio-total-spent');
      if (spentEl) spentEl.textContent = '-' + totalSpent + ' VoCoin';

      renderLedgerList();
    }

    function setPublishPricePreset(price) {
      const input = document.getElementById('pub-deck-price');
      if (input) {
        input.value = price;
        updatePublishPriceUI(price);
      }
      const presets = document.querySelectorAll('.pub-price-preset');
      presets.forEach(btn => {
        if (btn.textContent.includes(price + ' VoCoin') || (price === 0 && btn.textContent.includes('0đ'))) {
          btn.style.borderColor = '#10b981';
          btn.style.color = '#34d399';
        } else {
          btn.style.borderColor = 'var(--border)';
          btn.style.color = 'var(--text)';
        }
      });
    }

    function updatePublishPriceUI(val) {
      const p = parseInt(val) || 0;
      const badge = document.getElementById('pub-price-label-badge');
      if (badge) {
        if (p <= 0) {
          badge.textContent = '🟢 Miễn Phí';
          badge.style.background = 'rgba(16, 185, 129, 0.2)';
          badge.style.color = '#34d399';
        } else {
          badge.textContent = `💎 ${p} VoCoin`;
          badge.style.background = 'rgba(245, 158, 11, 0.2)';
          badge.style.color = '#fbbf24';
        }
      }
    }

    async function fetchCloudLedger() {
      if (isGuest()) return;
      try {
        const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
        const authParam = (currentUser && currentUser.idToken) ? '?auth=' + currentUser.idToken : '';
        const res = await fetch(`${rtdbUrl}/users/${currentUser.uid}/ledger.json${authParam}`);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object' && !data.error) {
            const cloudEntries = Object.values(data).filter(e => e && e.timestamp && e.amount !== 0 && e.type !== 'VIP_DAILY_SPIN');
            const map = new Map();
            userLedger.forEach(tx => { if (tx && tx.id && tx.amount !== 0 && tx.type !== 'VIP_DAILY_SPIN') map.set(tx.id, tx); });
            cloudEntries.forEach(tx => { if (tx && tx.id) map.set(tx.id, tx); });
            userLedger = Array.from(map.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            if (userLedger.length > 250) userLedger = userLedger.slice(0, 250);
            localStorage.setItem('vocaflow_user_ledger', JSON.stringify(userLedger));
            renderLedgerList();
            renderStudioDashboard();
          }
        }
      } catch (e) {
        console.warn('Error fetching cloud ledger:', e);
      }
    }

    async function openWalletStudioModal() {
      const guestView = document.getElementById('studio-guest-lock-view');
      const authView = document.getElementById('studio-main-authenticated-view');

      if (isGuest()) {
        if (guestView) guestView.style.display = 'block';
        if (authView) authView.style.display = 'none';
        openModal('modal-wallet-studio');
        return;
      }

      if (guestView) guestView.style.display = 'none';
      if (authView) authView.style.display = 'flex';

      // Immediate pre-render
      renderStudioDashboard();
      openModal('modal-wallet-studio');

      // Instant live sync in background
      Promise.allSettled([
        typeof fetchCloudLedger === 'function' ? fetchCloudLedger() : Promise.resolve(),
        typeof loadEconomyFromCloud === 'function' ? loadEconomyFromCloud() : Promise.resolve(),
        (typeof fetchCloudLibraryDecks === 'function' && (!cloudLibraryDecks || cloudLibraryDecks.length === 0)) ? fetchCloudLibraryDecks() : Promise.resolve()
      ]).then(() => {
        renderStudioDashboard();
      });
    }

    function switchStudioTab(tab) {
      const tabs = ['ledger', 'store', 'purchased', 'leaderboard'];
      tabs.forEach(t => {
        const sec = document.getElementById(`studio-tab-sec-${t}`);
        const btn = document.getElementById(`tab-btn-${t}`);
        if (t === tab) {
          if (sec) sec.style.display = 'block';
          if (btn) {
            btn.style.borderColor = '#c084fc';
            btn.style.color = '#c084fc';
            btn.style.background = 'rgba(168,85,247,0.12)';
          }
        } else {
          if (sec) sec.style.display = 'none';
          if (btn) {
            btn.style.borderColor = 'var(--border)';
            btn.style.color = 'var(--text)';
            btn.style.background = 'transparent';
          }
        }
      });

      if (tab === 'ledger') renderLedgerList();
      else if (tab === 'store') renderCreatorStoreDecks();
      else if (tab === 'purchased') renderPurchasedDecksList();
      else if (tab === 'leaderboard') renderTopCreatorsLeaderboard();
    }

    function renderStudioDashboard() {
      const curBalance = getUserPoints();
      const balEl = document.getElementById('studio-wallet-balance');
      if (balEl) balEl.textContent = curBalance + ' VoCoin';

// Clean ledger without dummy auto-seeding

      let totalEarned = 0;
      let totalSpent = 0;
      userLedger.forEach(tx => {
        if (tx.amount > 0) totalEarned += tx.amount;
        else totalSpent += Math.abs(tx.amount);
      });

      const earnedEl = document.getElementById('studio-total-earned');
      if (earnedEl) earnedEl.textContent = '+' + totalEarned + ' VoCoin';
      const spentEl = document.getElementById('studio-total-spent');
      if (spentEl) spentEl.textContent = '-' + totalSpent + ' VoCoin';

      const myDecks = getAllLibraryDecks().filter(d => isDeckAuthor(d));

      const sellingEl = document.getElementById('studio-decks-selling-count');
      if (sellingEl) sellingEl.textContent = myDecks.length + ' bộ';

      switchStudioTab('ledger');
    }

        async function manualSyncStudioLedger() {
      showToast('🔄 Đang đồng bộ Sổ cái thời gian thực từ Cloud...');
      if (typeof fetchCloudLedger === 'function') await fetchCloudLedger();
      if (typeof loadEconomyFromCloud === 'function') await loadEconomyFromCloud();
      renderStudioDashboard();
      showToast('✨ Sổ cái đã được đồng bộ mới nhất!');
    }

    function filterLedger(type) {
      currentLedgerFilter = type;
      renderLedgerList();
    }

    function renderLedgerList() {
      const container = document.getElementById('studio-ledger-list');
      if (!container) return;

      let validLedger = userLedger.filter(tx => tx && tx.amount !== 0 && tx.type !== 'VIP_DAILY_SPIN');
      let filtered = validLedger;
      if (currentLedgerFilter === 'income') {
        filtered = validLedger.filter(tx => tx.amount > 0);
      } else if (currentLedgerFilter === 'expense') {
        filtered = validLedger.filter(tx => tx.amount < 0);
      }

      if (filtered.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 24px 10px; color: var(--text-muted); font-size: 12px;">
            <div style="font-size: 24px; margin-bottom: 4px;">📜</div>
            Chưa có giao dịch nào được ghi nhận. Hãy bắt đầu học hoặc xuất bản VocaDeck!
          </div>
        `;
        return;
      }

      let html = '';
      filtered.forEach(tx => {
        const isPlus = tx.amount > 0;
        const color = isPlus ? '#34d399' : '#f87171';
        const sign = tx.amount > 0 ? '+' : '';
        const dateStr = new Date(tx.timestamp).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

        let badgeIcon = '🪙';
        if (tx.type === 'STUDY') badgeIcon = '✍️ Học tập';
        else if (tx.type === 'SELL_DECK') badgeIcon = '💎 Bán VocaDeck';
        else if (tx.type === 'BUY_DECK') badgeIcon = '🛍️ Mua VocaDeck';
        else if (tx.type === 'BUY_HINT') badgeIcon = '💡 Đổi VocaHint';
        else if (tx.type === 'BUY_SKIP') badgeIcon = '⏭️ Đổi VocaSkip';
        else if (tx.type === 'CREATE_WORD') badgeIcon = '📝 Soạn từ mới';
        else if (tx.type === 'AI_GEN') badgeIcon = '🤖 Tạo AI';
        else if (tx.type === 'GIFTCODE') badgeIcon = '🎁 GiftCode';
        else if (tx.type === 'PENALTY_QUIT') badgeIcon = '⚠️ Thoát ngang';

        html += `
          <div style="background: var(--surface-elevated); border: 1px solid var(--border); border-radius: 10px; padding: 9px 12px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
            <div>
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                <span class="badge" style="font-size: 9.5px; padding: 1px 6px; background: ${isPlus ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; color: ${color}; font-weight: 700;">${badgeIcon}</span>
                <span style="font-size: 11px; color: var(--text-muted);">${dateStr}</span>
              </div>
              ${(() => {
                let descHtml = escapeHtml(tx.description || 'Giao dịch hệ thống');
                if (tx.type === 'BUY_DECK') {
                  let deckTitle = tx.deckTitle;
                  let authorName = tx.authorName;
                  let deckId = tx.deckId || '';
                  let authorUid = tx.authorUid || '';

                  if (!deckTitle || !authorName) {
                    const match = (tx.description || '').match(/(?:Mua bộ từ|Mua VocaDeck) "(.*?)" từ tác giả (.*)/);
                    if (match) {
                      deckTitle = match[1];
                      authorName = match[2];
                    }
                  }

                  const allDecks = getAllLibraryDecks();
                  const matchedDeck = allDecks.find(d => (deckId && d.id === deckId) || (authorUid && d.authorUid === authorUid) || (deckTitle && d.title === deckTitle));
                  if (matchedDeck) {
                    if (matchedDeck.author && !matchedDeck.isAnonymous) authorName = matchedDeck.author;
                    deckId = matchedDeck.id;
                    authorUid = matchedDeck.authorUid || authorUid;
                  }

                  if (deckTitle && authorName) {
                    descHtml = `Mua VocaDeck "<strong>${escapeHtml(deckTitle)}</strong>" từ tác giả <span style="color: #818cf8; text-decoration: underline; cursor: pointer; font-weight: 700;" onclick="openPublicProfileModal('${escapeHtml(authorName)}', '${escapeHtml(authorUid)}', '${escapeHtml(deckId)}')" title="Xem hồ sơ tác giả">${escapeHtml(authorName)}</span>`;
                  }
                } else if (tx.type === 'SELL_DECK') {
                  let deckTitle = tx.deckTitle;
                  let buyerName = tx.buyerName;
                  let buyerUid = tx.buyerUid || '';
                  let deckId = tx.deckId || '';

                  // Parse from tx.description if not directly stored (for legacy transactions)
                  if (!deckTitle || !buyerName) {
                    const match = (tx.description || '').match(/Bán VocaDeck "(.*?)" cho (.*?) \(/);
                    if (match) {
                      if (!deckTitle) deckTitle = match[1];
                      if (!buyerName) buyerName = match[2];
                    }
                  }

                  if (deckTitle) {
                    let buyerHtml = '';
                    if (buyerName && buyerName !== 'Một người học' && buyerName !== 'Một Flower') {
                      buyerHtml = `<span style="color: #38bdf8; text-decoration: underline; cursor: pointer; font-weight: 700;" onclick="openPublicProfileModal('${escapeHtml(buyerName)}', '${escapeHtml(buyerUid)}', '${escapeHtml(deckId)}')" title="Xem hồ sơ người mua">${escapeHtml(buyerName)}</span>`;
                    } else if (buyerName) {
                      buyerHtml = `<strong>${escapeHtml(buyerName)}</strong>`;
                    }
                    descHtml = `Bán VocaDeck "<strong>${escapeHtml(deckTitle)}</strong>"${buyerHtml ? ` cho ${buyerHtml}` : ''} (${tx.description?.includes('20%') ? '20% VocaShare' : '100%'})`;
                  }
                }
                return `<div style="font-size: 12px; font-weight: 600; color: var(--text);">${descHtml}</div>`;
              })()}
            </div>
            <div style="text-align: right; flex-shrink: 0;">
              <div style="font-size: 14px; font-weight: 800; color: ${color};">${sign}${tx.amount} VoCoin</div>
              ${(tx.balanceAfter !== undefined && tx.balanceAfter !== null && !isNaN(tx.balanceAfter)) ? `<div style="font-size: 10px; color: var(--text-muted);">Dư: ${tx.balanceAfter} VoCoin</div>` : ''}
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    }

    function renderCreatorStoreDecks() {
      const container = document.getElementById('studio-store-list');
      if (!container) return;

      const myDecks = getAllLibraryDecks().filter(d => currentUser && (
        (d.authorUid && d.authorUid === currentUser.uid) ||
        (d.author && currentUser.displayName && d.author.toLowerCase() === currentUser.displayName.toLowerCase())
      ));

      if (myDecks.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 24px 10px; color: var(--text-muted); font-size: 12px;">
            <div style="font-size: 24px; margin-bottom: 4px;">📦</div>
            Bạn chưa đăng VocaDeck nào lên VocaLib. Hãy xuất bản VocaDeck để bắt đầu kiếm VoCoin!
          </div>
        `;
        return;
      }

      let html = '';
      myDecks.forEach(deck => {
        const price = deck.price || 0;
        const sales = deck.salesCount || 0;
        const totalRev = sales * price;

        html += `
          <div style="background: var(--surface-elevated); border: 1px solid var(--border); border-radius: 12px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
            <div>
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                <span style="font-size: 16px;">${deck.icon || '📘'}</span>
                <strong style="font-size: 13.5px; color: var(--text);">${escapeHtml(deck.title)}</strong>
                <span class="badge" style="font-size: 10px; background: rgba(99,102,241,0.15); color: #a5b4fc;">${(deck.words || []).length} từ</span>
              </div>
              <div style="font-size: 11.5px; color: var(--text-muted); display: flex; gap: 10px; align-items: center;">
                <span>Giá: <strong style="color: #fbbf24;">${price > 0 ? price + ' VoCoin' : 'Miễn phí'}</strong></span>
                <span>• Đã bán/tải: <strong style="color: #38bdf8;">${sales} lượt</strong></span>
                <span>• Doanh thu: <strong style="color: #34d399;">+${totalRev} VoCoin</strong></span>
              </div>
            </div>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-outline btn-sm" onclick="closeModal('modal-wallet-studio'); openEditPublishedDeckModal('${deck.id}');" style="font-size: 11px; padding: 3px 8px; color: #fbbf24; border-color: rgba(245,158,11,0.4);">
                ✏️ Đổi Giá / Sửa
              </button>
              <button class="btn btn-outline btn-sm" onclick="previewLibraryDeck('${deck.id}');" style="font-size: 11px; padding: 3px 8px;">
                👁️ Xem
              </button>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    }

    function renderPurchasedDecksList() {
      const container = document.getElementById('studio-purchased-list');
      if (!container) return;

      // Ensure library decks are fetched if empty
      if (cloudLibraryDecks.length === 0 && typeof fetchCloudLibraryDecks === 'function') {
        fetchCloudLibraryDecks();
      }

      // Auto-recover any purchased decks from userLedger BUY_DECK
      if (Array.isArray(userLedger)) {
        userLedger.forEach(entry => {
          if (entry && entry.type === 'BUY_DECK' && entry.description) {
            const allD = getAllLibraryDecks();
            allD.forEach(ld => {
              if (ld && ld.id && !isDeckAuthor(ld) && (ld.price > 0 || ld.isVip || ld.isVipOnly || ld.id === 'lib_deck_ielts_45_60') && entry.description.includes(ld.title)) {
                userPurchasedDeckIds.add(ld.id);
              }
            });
          }
        });
      }
      if (Array.isArray(decks)) {
        decks.forEach(d => {
          if (d && d.libSourceId && !isDeckAuthor(d)) {
            const matchedLib = getAllLibraryDecks().find(ld => ld.id === d.libSourceId);
            if (matchedLib && (matchedLib.price > 0 || matchedLib.isVip || matchedLib.isVipOnly || matchedLib.id === 'lib_deck_ielts_45_60') && !isDeckAuthor(matchedLib)) {
              userPurchasedDeckIds.add(d.libSourceId);
            }
          }
        });
      }

      const allDecks = getAllLibraryDecks();

      // Purge any own deck IDs that might have been accidentally saved in userPurchasedDeckIds
      allDecks.forEach(d => {
        if (isDeckAuthor(d) && userPurchasedDeckIds.has(d.id)) {
          userPurchasedDeckIds.delete(d.id);
        }
      });

      const purchased = allDecks.filter(d => userPurchasedDeckIds.has(d.id) && !isDeckAuthor(d) && ((d.price || 0) > 0 || d.isVip || d.isVipOnly || d.id === 'lib_deck_ielts_45_60'));

      // Also check if any purchased ID is not in allDecks but exists in local decks (and is not authored by user)
      userPurchasedDeckIds.forEach(pId => {
        if (!purchased.some(d => d.id === pId)) {
          const localMatch = decks.find(d => (d.libSourceId === pId || d.id === pId) && !isDeckAuthor(d));
          if (localMatch && ((localMatch.price || 0) > 0 || localMatch.isVip || localMatch.isVipOnly || localMatch.id === 'lib_deck_ielts_45_60' || pId === 'lib_deck_ielts_45_60')) {
            purchased.push({
              id: pId,
              title: localMatch.title,
              author: localMatch.author || 'VocaCommunity',
              authorUid: localMatch.authorUid || '',
              words: words.filter(w => w.deckId === localMatch.id),
              icon: '📘'
            });
          }
        }
      });

      if (purchased.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 24px 10px; color: var(--text-muted); font-size: 12px;">
            <div style="font-size: 24px; margin-bottom: 4px;">🛍️</div>
            Bạn chưa mua VocaDeck có phí nào. Ghé Thư Viện để khám phá các VocaDeck chất lượng cao!
          </div>
        `;
        return;
      }

      let html = '';
      purchased.forEach(deck => {
        const isImported = decks.some(d => d.title === deck.title || d.libSourceId === deck.id);
        html += `
          <div style="background: var(--surface-elevated); border: 1px solid var(--border); border-radius: 12px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
            <div>
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                <span style="font-size: 16px;">${deck.icon || '📘'}</span>
                <strong style="font-size: 13.5px; color: var(--text);">${escapeHtml(deck.title)}</strong>
                <span class="badge" style="font-size: 10px; background: rgba(16,185,129,0.15); color: #34d399;">Đã sở hữu</span>
              </div>
              <div style="font-size: 11.5px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; flex-wrap: wrap; margin-top: 2px;">
                <span>Tác giả:</span>
                ${isAuthorVipUser(deck.authorUid, deck.author) ? `
                  <span class="vip-name-wrapper" style="gap: 3px; cursor: pointer;" onclick="openPublicProfileModal('${escapeHtml(deck.author)}', '${escapeHtml(deck.authorUid || '')}', '${deck.id}')">
                    <span class="vip-crown-icon" style="font-size: 12px; margin: 0;">👑</span>
                    <strong class="vip-glowing-name" style="text-decoration: underline; text-decoration-color: rgba(245,158,11,0.6); font-size: 12px;">${escapeHtml(deck.author)}</strong>
                  </span>
                ` : `
                  <strong style="color: #818cf8; cursor: pointer; text-decoration: underline; text-decoration-color: rgba(99,102,241,0.4);" onclick="openPublicProfileModal('${escapeHtml(deck.author)}', '${escapeHtml(deck.authorUid || '')}', '${deck.id}')">${escapeHtml(deck.author || 'VocaCommunity')}</strong>
                `}
                <span>• ${(deck.words || []).length} từ</span>
              </div>
            </div>
            <button class="btn btn-outline btn-sm" onclick="installLibraryDeck('${deck.id}');" style="font-size: 11px; padding: 4px 10px; font-weight: 700; color: #818cf8; border-color: rgba(99,102,241,0.4);">
              📥 ${isImported ? 'Cài Lại' : 'Tải Về'}
            </button>
          </div>
        `;
      });

      container.innerHTML = html;
    }

    async function buyCommunityDeck(deckId) {
      if (!requireLogin('Mua VocaDeck')) return;
      const allDecks = getAllLibraryDecks();
      const deck = allDecks.find(d => d.id === deckId);
      if (!deck) return;

      const price = Number(deck.price) || 0;
      const isOwner = isDeckAuthor(deck);

      if (price === 0 || isOwner || userPurchasedDeckIds.has(deck.id)) {
        installLibraryDeck(deck.id);
        return;
      }

      const curPoints = getUserPoints();
      if (curPoints < price) {
        showToast(`🪙 Bạn không đủ VoCoin để mua VocaDeck "${deck.title}" (Cần ${price} VoCoin, bạn có ${curPoints} VoCoin)!`);
        openShopModal();
        return;
      }

      const confirmed = confirm(`💎 XÁC NHẬN MUA VOCADECK\n\nBạn có muốn dùng ${price} VoCoin để mua vĩnh viễn VocaDeck "${deck.title}" của tác giả "${deck.author || 'VocaCommunity'}" không?`);
      if (!confirmed) return;

      // 1. Deduct buyer Xu & persist
      setUserPoints(curPoints - price);
      userPurchasedDeckIds.add(deck.id);
      localStorage.setItem('vocaflow_purchased_decks', JSON.stringify(Array.from(userPurchasedDeckIds)));

      // 2. Add buyer transaction ledger FIRST
      addLedgerEntry('BUY_DECK', -price, `Mua VocaDeck "${deck.title}" từ tác giả ${deck.author || 'VocaCommunity'}`);
      saveDatabase(true);

      // 3. Play purchase sound
      playVocaSfx('purchase');

      // 4. Transfer revenue to Seller on Cloud
      if (deck.authorUid && !deck.authorUid.startsWith('guest_')) {
        try {
          const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
          const urlParams = new URLSearchParams(window.location.search);
          const affRef = urlParams.get('ref');

          const hasAffiliate = affRef && affRef !== deck.authorUid && affRef !== currentUser.uid && !affRef.startsWith('guest_');
          const authorCut = hasAffiliate ? Math.round(price * 0.8) : price;
          const affiliateCut = hasAffiliate ? Math.round(price * 0.2) : 0;

          // Transfer to Author (80% or 100%) with accurate balanceAfter and buyerUid
          fetch(`${rtdbUrl}/users/${deck.authorUid}/wallet/points.json`).then(r => r.json()).then(sellerPts => {
            const currentSellerPts = (typeof sellerPts === 'number' ? sellerPts : 0);
            const newSellerPts = currentSellerPts + authorCut;

            const sellerTx = {
              id: 'tx_sell_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
              timestamp: new Date().toISOString(),
              type: 'SELL_DECK',
              amount: +authorCut,
              balanceAfter: newSellerPts,
              buyerName: currentUser.displayName || 'Một Flower',
              buyerUid: currentUser.uid || '',
              deckTitle: deck.title,
              deckId: deck.id,
              description: `Bán VocaDeck "${deck.title}" cho ${currentUser.displayName || 'Một Flower'} (${hasAffiliate ? '80% sau VocaShare' : '100%'})`
            };

            fetch(`${rtdbUrl}/users/${deck.authorUid}/ledger/${sellerTx.id}.json`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(sellerTx)
            }).catch(() => {});

            fetch(`${rtdbUrl}/users/${deck.authorUid}/wallet/points.json`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newSellerPts)
            }).catch(() => {});
          }).catch(() => {});

          // Transfer to Affiliate if exists (20%)
          if (hasAffiliate && affiliateCut > 0) {
            fetch(`${rtdbUrl}/users/${affRef}/wallet/points.json`).then(r => r.json()).then(affPts => {
              const currentAffPts = (typeof affPts === 'number' ? affPts : 0);
              const newAffPts = currentAffPts + affiliateCut;

              const affTx = {
                id: 'tx_aff_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                timestamp: new Date().toISOString(),
                type: 'SELL_DECK',
                amount: +affiliateCut,
                balanceAfter: newAffPts,
                buyerName: currentUser.displayName || 'Một Flower',
                buyerUid: currentUser.uid || '',
                deckTitle: deck.title,
                deckId: deck.id,
                description: `VocaShare giới thiệu VocaDeck "${deck.title}" (20%)`
              };

              fetch(`${rtdbUrl}/users/${affRef}/ledger/${affTx.id}.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(affTx)
              }).catch(() => {});

              fetch(`${rtdbUrl}/users/${affRef}/wallet/points.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAffPts)
              }).catch(() => {});
            }).catch(() => {});
          }

          const curSales = (deck.salesCount || 0) + 1;
          deck.salesCount = curSales;
          fetch(`${rtdbUrl}/publicLibraryDecks/${deck.id}/salesCount.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(curSales)
          }).catch(() => {});
        } catch (e) {}
      }

      // 5. Install to local library
      installLibraryDeck(deck.id);
      addNotification('FINANCIAL', '🛒 Mua VocaDeck thành công', `Bạn đã mua VocaDeck "${deck.title}" (-${price} VoCoin). Hãy bắt đầu học ngay!`, 'PREVIEW_DECK', { deckId: deck.id });
      showToast(`🎉 Đã mua thành công VocaDeck "${deck.title}" (-${price} VoCoin)!`);
      renderLibraryDecks();
      if (document.getElementById('modal-library-preview')?.classList.contains('active')) {
        previewLibraryDeck(deck.id);
      }
    }

    function updatePublishModalAuthorUI() {
      const authorNameEl = document.getElementById('pub-deck-author-name');
      const authorAvEl = document.getElementById('pub-deck-author-avatar');
      const currentName = (currentUser && currentUser.displayName && currentUser.displayName !== 'Khách' && currentUser.displayName !== 'Khách (Offline)') ? currentUser.displayName : 'Thành viên VocaFlow';
      if (authorNameEl) authorNameEl.textContent = currentName;
      if (authorAvEl) authorAvEl.innerHTML = renderAvatarHtml(currentUser?.avatar || currentName, 26, 12);
    }

    function openEditPublishedDeckModal(deckId) {
      if (!requireLogin('Chỉnh Sửa VocaDeck Đã Đăng')) return;
      updatePublishModalAuthorUI();
      const allDecks = getAllLibraryDecks();
      const deck = allDecks.find(d => d.id === deckId);
      if (!deck) return;

      if (!isDeckAuthor(deck)) {
        alert('❌ Bạn không có quyền chỉnh sửa VocaDeck của tác giả khác!');
        return;
      }

      pendingPublisherDeck = {
        title: deck.title,
        words: deck.words || []
      };

      const editInput = document.getElementById('pub-editing-deck-id');
      if (editInput) editInput.value = deckId;

      const titleInput = document.getElementById('pub-deck-title');
      const descInput = document.getElementById('pub-deck-desc');
      if (titleInput) titleInput.value = deck.title || '';
      if (descInput) descInput.value = deck.description || '';

      const priceInput = document.getElementById('pub-deck-price');
      if (priceInput) {
        priceInput.value = deck.price || 0;
        updatePublishPriceUI(deck.price || 0);
      }

      const catSelect = document.getElementById('pub-deck-category');
      const customCatInput = document.getElementById('pub-deck-custom-category');
      const customGroup = document.getElementById('pub-custom-category-group');

      const knownValues = ['THPT', '10', '11', '12', 'THCS', '6', '7', '8', '9', 'TIEUHOC', 'IELTS', 'TOEIC', 'TOEFL', 'CAMBRIDGE', 'SAT_GRE', 'GIAOTIEP', 'DULICH', 'DUHOC', 'IT', 'KINHTE', 'YKHOA', 'KYTHUAT', 'CHUYENNGANH'];

      if (catSelect) {
        if (knownValues.includes(deck.category)) {
          catSelect.value = deck.category;
          if (customGroup) customGroup.style.display = 'none';
        } else {
          catSelect.value = 'CUSTOM';
          if (customGroup) customGroup.style.display = 'block';
          if (customCatInput) customCatInput.value = deck.category || '';
        }
      }

      const iconSelect = document.getElementById('pub-deck-icon');
      if (iconSelect && deck.icon) iconSelect.value = deck.icon;

      const pubRadio = document.getElementById('pub-visibility-public');
      const anonRadio = document.getElementById('pub-visibility-anon');
      if (deck.isAnonymous || deck.author === 'Ẩn danh') {
        if (anonRadio) anonRadio.checked = true;
      } else {
        if (pubRadio) pubRadio.checked = true;
      }

      const modalIcon = document.getElementById('pub-modal-icon');
      const modalTitle = document.getElementById('pub-modal-title');
      const modalSubtitle = document.getElementById('pub-modal-subtitle');
      if (modalIcon) modalIcon.textContent = '✏️';
      if (modalTitle) modalTitle.textContent = 'Chỉnh Sửa VocaDeck Đã Đăng';
      if (modalSubtitle) modalSubtitle.textContent = 'Cập nhật tên, mô tả, danh mục hoặc dữ liệu từ vựng trên Thư Viện Toàn Cầu';

      const uploadBtn = document.getElementById('btn-pub-do-upload');
      if (uploadBtn) uploadBtn.textContent = '💾 Cập Nhật Lên Thư Viện';

      const previewStatus = document.getElementById('pub-upload-preview-status');
      if (previewStatus) {
        previewStatus.style.display = 'block';
        previewStatus.textContent = `✅ Đang giữ nguyên ${deck.words ? deck.words.length : 0} từ vựng gốc (hoặc tải file/chọn VocaDeck mới nếu muốn thay thế).`;
      }

      openModal('modal-community-upload');
    }

    function openPublicProfileByStudent(studentUid) {
      if (!studentUid) return;
      const student = adminStudentsData.find(s => s.uid === studentUid);
      const name = student?.displayName || 'Flower';
      openPublicProfileModal(name, studentUid);
    }
    window.openPublicProfileByStudent = openPublicProfileByStudent;

    async function openPublicProfileModal(authorName, authorUid, deckId) {
      if (!authorName || authorName === 'Ẩn danh') return;
      if (!cloudLibraryDecks || cloudLibraryDecks.length === 0) {
        try {
          await fetchCloudLibraryDecks();
        } catch (e) {}
      }
      const allDecks = getAllLibraryDecks();

      // Find deck matching the requested author specifically
      let targetDeck = null;
      if (authorUid) {
        targetDeck = allDecks.find(d => d.authorUid === authorUid);
      }
      if (!targetDeck && authorName) {
        targetDeck = allDecks.find(d => (d.author || '').trim().toLowerCase() === authorName.trim().toLowerCase());
      }
      if (!targetDeck && deckId) {
        const candidate = allDecks.find(d => d.id === deckId);
        if (candidate && (!authorName || (candidate.author || '').trim().toLowerCase() === authorName.trim().toLowerCase())) {
          targetDeck = candidate;
        }
      }

      await openPublicProfileByAuthor(authorName, targetDeck?.id || deckId, authorUid || targetDeck?.authorUid || '');
    }

    async function openPublicProfileByAuthor(authorName, deckId, authorUid = '') {
      if (!authorName || authorName === 'Ẩn danh') return;
      const authorClean = (authorName || '').replace(/^@/, '').trim().toLowerCase();
      showAppLoading('Đang tải hồ sơ Flower...');

      try {
        if (!cloudLibraryDecks || cloudLibraryDecks.length === 0) {
          try {
            await fetchCloudLibraryDecks();
          } catch (e) {}
        }
        const allDecks = getAllLibraryDecks();

        let targetDeck = null;
        if (authorUid) {
          targetDeck = allDecks.find(d => d.authorUid === authorUid);
        }
        if (!targetDeck && authorName) {
          targetDeck = allDecks.find(d => (d.author || '').trim().toLowerCase() === authorName.trim().toLowerCase());
        }
        if (!targetDeck && deckId) {
          const candidate = allDecks.find(d => d.id === deckId);
          if (candidate && (!authorName || (candidate.author || '').trim().toLowerCase() === authorName.trim().toLowerCase())) {
            targetDeck = candidate;
          }
        }

        const isVocaFlowOfficial = authorName === 'VocaFlow Chuẩn' || authorClean === 'official' || authorClean === 'vocaflow' || (targetDeck && targetDeck.id.startsWith('lib_deck_'));

        // STRICT USER MATCH: Check author identity against current logged in user (v0.10.9-45)
        const currentHandle = (currentUser?.username || (currentUser?.email ? currentUser.email.split('@')[0] : '')).toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const currentEmailPrefix = (currentUser?.email ? currentUser.email.split('@')[0] : '').toLowerCase();
        const currentDisplayName = (currentUser?.displayName || '').trim().toLowerCase();
        const currentUid = currentUser?.uid || '';

        const isCurrentUser = (authorUid && currentUid && authorUid === currentUid) ||
                              (targetDeck?.authorUid && currentUid && targetDeck.authorUid === currentUid) ||
                              (authorClean && currentHandle && authorClean === currentHandle) ||
                              (authorClean && currentEmailPrefix && authorClean === currentEmailPrefix) ||
                              (authorClean && currentDisplayName && authorClean === currentDisplayName) ||
                              (authorName && currentDisplayName && authorName.trim().toLowerCase() === currentDisplayName);

        let resolvedName = authorName;
        let resolvedHandle = '';
        let resolvedAvatar = targetDeck?.authorAvatar || authorName;
        let resolvedBio = targetDeck?.authorBio || '';
        let targetUid = authorUid || targetDeck?.authorUid || '';
        let targetFollowerCount = 0;
        let targetFollowingCount = 0;
        let authorDecks = [];
        let targetPoints = 0;
        let targetFlowDays = 0;
        let targetPinnedBadges = [];

        if (isVocaFlowOfficial) {
          resolvedName = 'VocaFlow Chuẩn';
          resolvedHandle = 'official';
          resolvedAvatar = 'icons/vocaflow_official_avatar.png';
          resolvedBio = 'Đội ngũ phát triển VocaFlow • Biên soạn VocaStore trọng tâm chuẩn GDPT & Quốc Tế.';
          authorDecks = allDecks.filter(d => d.id.startsWith('lib_deck_') || d.author === 'VocaFlow Chuẩn');
          targetPoints = 999999;
          targetFlowDays = 365;
          targetPinnedBadges = ['ach_deck_master', 'ach_speaking_pro', 'ach_grandmaster'];
        } else if (isCurrentUser) {
          targetUid = currentUid;
          resolvedName = currentUser.displayName || authorName;
          resolvedHandle = currentUser.username || (currentUser.email ? currentUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_') : 'guest');
          resolvedAvatar = currentUser.avatar || localStorage.getItem('vocaflow_user_avatar') || currentUser.displayName || authorName;
          resolvedBio = currentUser.bio || localStorage.getItem('vocaflow_user_bio') || '';
          authorDecks = allDecks.filter(d => (d.authorUid && d.authorUid === currentUser.uid) || (d.author || '').trim().toLowerCase() === authorName.trim().toLowerCase() || (d.author || '').trim().toLowerCase() === (currentUser.displayName || '').trim().toLowerCase());
          targetPoints = (typeof getUserPoints === 'function' ? getUserPoints() : 0);
          targetFlowDays = (typeof calculateCurrentFlow === 'function' ? calculateCurrentFlow().currentFlow : 0);
          targetPinnedBadges = Array.isArray(userPinnedBadges) ? userPinnedBadges : [];
        } else {
          // Find targetUid from all available registries if not provided
          if (!targetUid) {
            const studentMatch = adminStudentsData.find(s => 
              (s.username && s.username.toLowerCase() === authorClean) ||
              (s.email && s.email.split('@')[0].toLowerCase() === authorClean) ||
              (s.displayName && s.displayName.trim().toLowerCase() === (authorName || '').trim().toLowerCase())
            );
            if (studentMatch && studentMatch.uid) targetUid = studentMatch.uid;
            else if (globalVipRegistryNameMap && globalVipRegistryNameMap[authorName.trim().toLowerCase()]?.uid) targetUid = globalVipRegistryNameMap[authorName.trim().toLowerCase()].uid;
            else {
              const deckMatch = allDecks.find(d => 
                (d.authorUsername && d.authorUsername.toLowerCase() === authorClean) ||
                (d.authorEmail && d.authorEmail.split('@')[0].toLowerCase() === authorClean) ||
                (d.author || '').trim().toLowerCase() === (authorName || '').trim().toLowerCase()
              );
              if (deckMatch && deckMatch.authorUid) targetUid = deckMatch.authorUid;
            }

            // v0.10.9-45: If still not found, fetch users list from Cloud RTDB to resolve authentic user UID
            if (!targetUid) {
              const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
              try {
                const uListRes = await fetch(`${rtdbUrl}/users.json`);
                if (uListRes.ok) {
                  const allUsers = await uListRes.json();
                  if (allUsers && typeof allUsers === 'object') {
                    for (const [uid, uData] of Object.entries(allUsers)) {
                      if (!uData) continue;
                      const uHandle = (uData.profile?.username || (uData.email ? uData.email.split('@')[0] : '')).toLowerCase();
                      const uDisplay = (uData.profile?.displayName || uData.displayName || '').trim().toLowerCase();
                      const uEmailPrefix = (uData.email ? uData.email.split('@')[0] : '').toLowerCase();
                      if (uHandle === authorClean || uEmailPrefix === authorClean || uDisplay === authorClean || uid === authorClean) {
                        targetUid = uid;
                        break;
                      }
                    }
                  }
                }
              } catch (e) {
                console.warn('Failed to resolve targetUid from RTDB:', e);
              }
            }
          }

          // Fetch fresh profile & stats from Cloud RTDB for authentic user metadata (v0.10.9-49 single fast pull)
          if (targetUid && targetUid !== 'undefined') {
            const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
            try {
              const rootUserRes = await fetch(`${rtdbUrl}/users/${targetUid}.json`);
              if (rootUserRes.ok) {
                const uData = await rootUserRes.json();
                if (uData && typeof uData === 'object') {
                  if (uData.economy && typeof uData.economy.points === 'number') targetPoints = uData.economy.points;
                  else if (uData.wallet && typeof uData.wallet.points === 'number') targetPoints = uData.wallet.points;
                  else if (typeof uData.points === 'number') targetPoints = uData.points;
                  else if (uData.profile && typeof uData.profile.points === 'number') targetPoints = uData.profile.points;

                  if (uData.profile && typeof uData.profile === 'object') {
                    if (uData.profile.displayName) resolvedName = uData.profile.displayName;
                    if (uData.profile.username) resolvedHandle = uData.profile.username;
                    if (uData.profile.avatar) resolvedAvatar = uData.profile.avatar;
                    if (uData.profile.bio) resolvedBio = uData.profile.bio;
                    if (Array.isArray(uData.profile.pinnedBadges)) targetPinnedBadges = uData.profile.pinnedBadges;
                    if (typeof uData.profile.followerCount === 'number') targetFollowerCount = uData.profile.followerCount;
                    if (typeof uData.profile.followingCount === 'number') targetFollowingCount = uData.profile.followingCount;
                  }
                  if (uData.username && !resolvedHandle) resolvedHandle = uData.username;
                  if (uData.displayName && !resolvedName) resolvedName = uData.displayName;
                  if (uData.bio && !resolvedBio) resolvedBio = uData.bio;
                  if (uData.avatar && !resolvedAvatar) resolvedAvatar = uData.avatar;
                  if (Array.isArray(uData.pinnedBadges) && targetPinnedBadges.length === 0) {
                    targetPinnedBadges = uData.pinnedBadges;
                  }

                  if (uData.flow && typeof uData.flow.days === 'number') {
                    targetFlowDays = uData.flow.days;
                  } else if (uData.flow && typeof uData.flow.currentFlow === 'number') {
                    targetFlowDays = uData.flow.currentFlow;
                  } else if (typeof uData.flow === 'number') {
                    targetFlowDays = uData.flow;
                  }

                  if (uData.followers && typeof uData.followers === 'object') {
                    targetFollowerCount = Object.keys(uData.followers).length;
                  }
                  if (uData.following && typeof uData.following === 'object') {
                    targetFollowingCount = Object.keys(uData.following).length;
                  }

                  if (Array.isArray(uData.decks) && uData.decks.length > 0) {
                    authorDecks = uData.decks;
                  } else if (uData.decks && typeof uData.decks === 'object') {
                    authorDecks = Object.values(uData.decks);
                  }
                }
              }
            } catch (e) {
              console.warn('Single RTDB pull error:', e);
            }
          }

          const matchedStudent = adminStudentsData.find(s => 
            (targetUid && s.uid === targetUid) || 
            (s.username && s.username.toLowerCase() === authorClean) ||
            (s.email && s.email.split('@')[0].toLowerCase() === authorClean) ||
            (s.displayName && s.displayName.trim().toLowerCase() === (authorName || '').trim().toLowerCase())
          );
          if (matchedStudent) {
            resolvedName = matchedStudent.displayName || resolvedName;
            resolvedAvatar = matchedStudent.avatar || matchedStudent.displayName || resolvedAvatar;
            resolvedBio = matchedStudent.bio || resolvedBio || '';
            if (typeof matchedStudent.points === 'number' && targetPoints === 0) targetPoints = matchedStudent.points;
            if (Array.isArray(matchedStudent.pinnedBadges) && targetPinnedBadges.length === 0) targetPinnedBadges = matchedStudent.pinnedBadges;
          }
          authorDecks = allDecks.filter(d => 
            (targetUid && d.authorUid === targetUid) || 
            (targetDeck?.authorUid && d.authorUid === targetDeck.authorUid) || 
            (d.authorUsername && d.authorUsername.toLowerCase() === authorClean) ||
            (d.authorEmail && d.authorEmail.split('@')[0].toLowerCase() === authorClean) ||
            (d.author || '').trim().toLowerCase() === (authorName || '').trim().toLowerCase()
          );
        }

        if (!resolvedHandle) {
          resolvedHandle = targetDeck?.authorUsername || (targetDeck?.authorEmail ? targetDeck.authorEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_') : authorName.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 15));
        }
        const handleEl = document.getElementById('pub-view-handle');
        if (handleEl) handleEl.textContent = `@${resolvedHandle}`;

        const nameEl = document.getElementById('pub-view-name');
        const avEl = document.getElementById('pub-view-avatar');
        const bioEl = document.getElementById('pub-view-bio');
        const statPointsEl = document.getElementById('pub-view-stat-points');
        const statFlowEl = document.getElementById('pub-view-stat-flow');
        const statDecksEl = document.getElementById('pub-view-stat-decks');
        const statWordsEl = document.getElementById('pub-view-stat-words');
        const decksCountEl = document.getElementById('pub-view-decks-count');
        const decksListEl = document.getElementById('pub-view-decks-list');
        const pubSubBadgeEl = document.getElementById('pub-view-sub-badge');

        const totalWords = authorDecks.reduce((sum, d) => sum + (Array.isArray(d.words) ? d.words.length : 0), 0);

        currentPublicProfileAuthor = {
          targetUid: targetUid,
          resolvedName: resolvedName,
          resolvedHandle: resolvedHandle,
          isCurrentUser: isCurrentUser,
          targetFollowerCount: targetFollowerCount,
          targetFollowingCount: targetFollowingCount
        };
        updatePubViewFollowBtn(targetUid);

        const pubFollowerEl = document.getElementById('pub-view-follower-count');
        const pubFollowingEl = document.getElementById('pub-view-following-count');
        if (pubFollowerEl) pubFollowerEl.textContent = formatNumber(targetFollowerCount);
        if (pubFollowingEl) pubFollowingEl.textContent = formatNumber(targetFollowingCount);

        const isAuthorVip = isAuthorVipUser(targetUid, resolvedName);
        const authorVipTier = getAuthorVipTier(targetUid, resolvedName);
        const authorVipExpiresAt = getAuthorVipExpiresAt(targetUid, resolvedName);
        const cleanResolvedName = stripVipAffixes(resolvedName);

        if (nameEl) {
          if (isVocaFlowOfficial) {
            nameEl.innerHTML = `<span class="vip-name-wrapper" style="gap: 6px;"><span class="vip-glowing-name" style="font-size: 1.15em; background: linear-gradient(135deg, #f59e0b, #ec4899, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800;">VocaFlow Chuẩn</span><span style="font-size: 1.25em;" title="Đội ngũ sáng lập & phát triển VocaFlow">👑</span></span>`;
          } else if (isAuthorVip) {
            nameEl.innerHTML = `<span class="vip-name-wrapper" style="gap: 5px;"><span class="vip-glowing-name" style="font-size: 1.15em;">${escapeHtml(cleanResolvedName)}</span><span class="vip-crown-icon" style="font-size: 1.3em;" title="Tác giả VIP (${authorVipTier.toUpperCase()})">👑</span></span>`;
          } else {
            nameEl.textContent = cleanResolvedName;
          }
        }
        if (avEl) {
          avEl.innerHTML = renderAvatarHtml(resolvedAvatar, 72, 28);
          if (isVocaFlowOfficial) {
            avEl.style.boxShadow = '0 0 0 3px #8b5cf6, 0 0 30px rgba(139, 92, 246, 0.8), 0 0 12px rgba(236, 72, 153, 0.6)';
            avEl.style.borderColor = '#c084fc';
          } else if (isAuthorVip) {
            avEl.style.boxShadow = '0 0 0 3px #fbbf24, 0 0 25px rgba(251,191,36,0.65)';
            avEl.style.borderColor = '#fbbf24';
          } else {
            avEl.style.boxShadow = '0 6px 18px rgba(168, 85, 247, 0.4)';
            avEl.style.borderColor = 'rgba(255,255,255,0.3)';
          }
        }
        if (pubSubBadgeEl) {
          if (isVocaFlowOfficial) {
            pubSubBadgeEl.innerHTML = '👑 Đội Ngũ Phát Triển';
            pubSubBadgeEl.style.background = 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(236,72,153,0.25))';
            pubSubBadgeEl.style.color = '#fbbf24';
            pubSubBadgeEl.style.fontWeight = '800';
            pubSubBadgeEl.style.border = '1px solid rgba(251,191,36,0.5)';
          } else if (isAuthorVip) {
            pubSubBadgeEl.innerHTML = '👑 Thành Viên VocaVIP';
            pubSubBadgeEl.style.background = 'rgba(245, 158, 11, 0.15)';
            pubSubBadgeEl.style.color = '#fbbf24';
            pubSubBadgeEl.style.fontWeight = '700';
            pubSubBadgeEl.style.border = '1px solid rgba(245, 158, 11, 0.3)';
          } else {
            pubSubBadgeEl.innerHTML = '🎓 Flower VocaFlow';
            pubSubBadgeEl.style.background = 'rgba(16, 185, 129, 0.15)';
            pubSubBadgeEl.style.color = '#34d399';
            pubSubBadgeEl.style.fontWeight = '700';
            pubSubBadgeEl.style.border = '1px solid rgba(16, 185, 129, 0.3)';
          }
        }
        const pubBadgeEl = document.getElementById('pub-view-badge');
        if (pubBadgeEl) {
          if (isVocaFlowOfficial) {
            pubBadgeEl.innerHTML = '⭐ VocaFlow Official';
            pubBadgeEl.style.background = 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)';
            pubBadgeEl.style.color = '#ffffff';
            pubBadgeEl.style.fontWeight = '800';
            pubBadgeEl.style.border = '1px solid rgba(255,255,255,0.4)';
            pubBadgeEl.style.boxShadow = '0 2px 14px rgba(168,85,247,0.5)';
          } else if (isAuthorVip) {
            const durationLabel = formatVipDurationText(authorVipExpiresAt, authorVipTier);
            if (durationLabel !== 'Hết hạn') {
              pubBadgeEl.innerHTML = `👑 VIP ${durationLabel}`;
              pubBadgeEl.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
              pubBadgeEl.style.color = '#ffffff';
              pubBadgeEl.style.fontWeight = '800';
              pubBadgeEl.style.border = '1px solid rgba(251,191,36,0.6)';
              pubBadgeEl.style.boxShadow = '0 2px 10px rgba(245,158,11,0.4)';
            } else {
              pubBadgeEl.textContent = '🌟 Tác Giả Đóng Góp';
              pubBadgeEl.style.background = 'rgba(99, 102, 241, 0.2)';
              pubBadgeEl.style.color = '#a5b4fc';
              pubBadgeEl.style.fontWeight = '700';
              pubBadgeEl.style.border = '1px solid rgba(99, 102, 241, 0.3)';
              pubBadgeEl.style.boxShadow = 'none';
            }
          } else {
            pubBadgeEl.textContent = '🌟 Tác Giả Đóng Góp';
            pubBadgeEl.style.background = 'rgba(99, 102, 241, 0.2)';
            pubBadgeEl.style.color = '#a5b4fc';
            pubBadgeEl.style.fontWeight = '700';
            pubBadgeEl.style.border = '1px solid rgba(99, 102, 241, 0.3)';
            pubBadgeEl.style.boxShadow = 'none';
          }
        }
        if (bioEl) {
          const cleanBio = (resolvedBio || '').trim();
          if (!cleanBio || cleanBio.startsWith('Tác giả đóng góp') || cleanBio.startsWith('Chưa có')) {
            bioEl.style.display = 'none';
            bioEl.textContent = '';
          } else {
            bioEl.style.display = 'block';
            bioEl.textContent = cleanBio;
          }
        }
        if (statPointsEl) statPointsEl.textContent = `${formatNumber(targetPoints)} VoCoin`;
        if (statFlowEl) statFlowEl.textContent = `${formatNumber(targetFlowDays)} Ngày`;
        if (statDecksEl) statDecksEl.textContent = `${formatNumber(authorDecks.length)} bộ`;
        if (statWordsEl) statWordsEl.textContent = `${formatNumber(totalWords)} từ`;

        const statDecksNumEl = document.getElementById('pub-view-stat-decks-num');
        if (statDecksNumEl) statDecksNumEl.textContent = formatNumber(authorDecks.length);
        const statPointsCardEl = document.getElementById('pub-view-stat-points-card');
        if (statPointsCardEl) statPointsCardEl.textContent = `${formatNumber(targetPoints)} VoCoin`;
        const statFlowCardEl = document.getElementById('pub-view-stat-flow-card');
        if (statFlowCardEl) statFlowCardEl.textContent = `${formatNumber(targetFlowDays)} Ngày`;
        const statWordsCardEl = document.getElementById('pub-view-stat-words-card');
        if (statWordsCardEl) statWordsCardEl.textContent = `${formatNumber(totalWords)} từ`;

        if (decksCountEl) decksCountEl.textContent = formatNumber(authorDecks.length) + ' VocaDeck';
        if (decksListEl) {
          if (authorDecks.length === 0) {
            decksListEl.innerHTML = '<div style="text-align:center; padding:14px; font-size:12px; color:var(--text-muted);">Chưa có VocaDeck công khai nào.</div>';
          } else {
            let h = '';
            authorDecks.forEach(d => {
              h += `
                <div style="background: var(--surface-elevated); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                  <div style="min-width: 0; flex: 1;">
                    <div style="font-weight: 700; font-size: 12.5px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${d.icon || '📘'} ${escapeHtml(d.title)}</div>
                    <div style="font-size: 10.5px; color: var(--text-muted);">${Array.isArray(d.words) ? d.words.length : 0} từ • ${escapeHtml(d.category || 'THPT')}</div>
                  </div>
                  <button class="btn btn-outline btn-sm" style="font-size: 11px; padding: 3px 8px;" onclick="closeModal('modal-public-profile'); previewLibraryDeck('${d.id}', 'modal-public-profile')">👁️ Xem</button>
                </div>
              `;
            });
            decksListEl.innerHTML = h;
          }
        }

        // Render Author Pinned Badges (v0.10.9-42 / Card Format matching personal profile)
        const pubBadgesContainer = document.getElementById('pub-view-badges-container');
        const pubBadgesShowcase = document.getElementById('pub-view-badges-showcase');
        const authorPinnedBadges = (isCurrentUser ? (Array.isArray(userPinnedBadges) ? userPinnedBadges : []) : ((targetPinnedBadges && targetPinnedBadges.length > 0) ? targetPinnedBadges : (targetDeck?.authorPinnedBadges || [])));

        if (pubBadgesContainer && pubBadgesShowcase) {
          if (Array.isArray(authorPinnedBadges) && authorPinnedBadges.length > 0) {
            pubBadgesContainer.style.display = 'block';
            let bHtml = '';
            authorPinnedBadges.slice(0, 3).forEach(bId => {
              const bDef = ACHIEVEMENTS_REGISTRY[bId];
              if (bDef) {
                const t = BADGE_TIER_CONFIG[bDef.tier] || BADGE_TIER_CONFIG.bronze;
                bHtml += `
                  <div class="pinned-badge-card tier-${bDef.tier || 'bronze'}" style="min-height: 58px;" title="${escapeHtml(bDef.name)}: ${escapeHtml(bDef.desc)}">
                    <div class="pinned-badge-content" style="padding: 6px 3px;">
                      <div style="font-size: 18px; line-height: 1; margin-bottom: 2px;">${bDef.icon}</div>
                      <div style="font-size: 10px; font-weight: 800; color: ${t.color}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; max-width: 100%;">${escapeHtml(bDef.name)}</div>
                      <div style="font-size: 8px; color: var(--text-muted); text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; max-width: 100%; margin-top: 1px;">${t.name}</div>
                    </div>
                  </div>
                `;
              }
            });
            pubBadgesShowcase.innerHTML = bHtml;
          } else {
            pubBadgesContainer.style.display = 'none';
            pubBadgesShowcase.innerHTML = '';
          }
        }

        if (typeof switchPubProfileTab === 'function') switchPubProfileTab('decks');
        openModal('modal-public-profile');
        if (typeof updateAppUrlRoute === 'function' && resolvedHandle) {
          updateAppUrlRoute('/@' + resolvedHandle, `${resolvedName} (@${resolvedHandle}) - VocaFlow`);
        }
      } catch (err) {
        console.warn('Error in openPublicProfileByAuthor:', err);
        showToast('⚠️ Không thể tải hồ sơ lúc này. Vui lòng thử lại sau!');
      } finally {
        hideAppLoading();
      }
    }

    async function openPublicProfileByStudent(uid) {
      const s = adminStudentsData.find(st => st.uid === uid);
      if (!s) return;
      await openPublicProfileByAuthor(s.displayName, '', s.uid);
    }
    window.openPublicProfileByAuthor = openPublicProfileByAuthor;
    window.openPublicProfileByStudent = openPublicProfileByStudent;

    function openPublicProfileModal(authorName, deckId = '', studentUid = '') {
      return openPublicProfileByAuthor(authorName, deckId, studentUid);
    }
    window.openPublicProfileModal = openPublicProfileModal;

    // =========================================================================
    // INSTAGRAM PROFILE TAB CONTROLLERS & DECKS LIST RENDERER (v0.10.9-41)
    // =========================================================================
    function renderProfileDecksList() {
      const container = document.getElementById('profile-decks-list-container');
      if (!container) return;
      if (!Array.isArray(decks) || decks.length === 0) {
        container.innerHTML = `
          <div style="background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 12px; padding: 24px; text-align: center;">
            <div style="font-size: 32px; margin-bottom: 8px;">📚✨</div>
            <div style="font-weight: 700; font-size: 13.5px; color: var(--text);">Chưa có VocaDeck nào</div>
            <p style="font-size: 12px; color: var(--text-muted); margin: 4px 0 12px 0;">Hãy tạo VocaDeck đầu tiên hoặc khám phá thư viện VocaLib nhé!</p>
            <button type="button" class="btn btn-primary btn-sm" onclick="closeModal('modal-profile'); openDeckModal();" style="font-weight: 700;">
              ➕ Tạo VocaDeck Ngay
            </button>
          </div>
        `;
        return;
      }

      let html = '';
      decks.forEach(deck => {
        const deckWords = words.filter(w => w.deckId === deck.id);
        const wordCount = deckWords.length;
        const isVip = typeof isVipDeck === 'function' ? isVipDeck(deck) : false;
        html += `
          <div style="background: var(--surface-elevated); border: 1px solid ${isVip ? 'rgba(251,191,36,0.5)' : 'var(--border)'}; border-radius: 10px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px; transition: all 0.2s;">
            <div style="min-width: 0; flex: 1;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                <span style="font-size: 16px;">${deck.icon || '📘'}</span>
                <strong style="font-size: 13px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(deck.title)}</strong>
                ${isVip ? '<span class="badge" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; font-size: 9px; padding: 1px 5px; font-weight: 800;">👑 VIP</span>' : ''}
              </div>
              <div style="font-size: 11px; color: var(--text-muted);">
                <span>${wordCount} từ</span> • <span>${escapeHtml(deck.category || 'Mặc định')}</span>
              </div>
            </div>
            <button type="button" class="btn btn-outline btn-sm" onclick="closeModal('modal-profile'); openDeckDetail('${deck.id}')" style="font-size: 11.5px; padding: 4px 10px; font-weight: 700; flex-shrink: 0;">
              📖 Học Ngay
            </button>
          </div>
        `;
      });
      container.innerHTML = html;
    }
    window.renderProfileDecksList = renderProfileDecksList;

    function switchProfileTab(tabName = 'decks') {
      const tabs = ['decks', 'achievements', 'community', 'cloud'];
      tabs.forEach(t => {
        const btn = document.getElementById(`profile-tab-btn-${t}`);
        const panel = document.getElementById(`profile-tab-panel-${t}`);
        if (btn) {
          if (t === tabName) btn.classList.add('active');
          else btn.classList.remove('active');
        }
        if (panel) {
          panel.style.display = (t === tabName) ? 'block' : 'none';
        }
      });
      if (tabName === 'decks') {
        renderProfileDecksList();
      } else if (tabName === 'community') {
        fetchAndRenderCommunityFeed();
      }
    }
    window.switchProfileTab = switchProfileTab;

    // =========================================================================
    // COMMUNITY FEED & SOCIAL ENGINE (v0.10.9-49 - ZERO-BUDGET CLOUD STRATEGY)
    // =========================================================================
    let communityPosts = [];
    let communityCurrentFilter = 'all';
    let communityActiveAttachedImage = null;
    let communityActiveAttachedBadge = null;
    let communityReplyingToComment = null; // { postId, commentId, authorHandle }
    let communityActiveCommentsPostId = null;

    function handleCommunityImageUpload(event) {
      const file = event.target?.files?.[0];
      if (!file) return;
      if (file.size > 1.5 * 1024 * 1024) {
        alert('⚠️ Kích thước ảnh tối đa là 1.5MB!');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        communityActiveAttachedImage = e.target.result;
        const prevContainer = document.getElementById('community-post-image-preview-container');
        const prevImg = document.getElementById('community-post-image-preview');
        if (prevImg) prevImg.src = communityActiveAttachedImage;
        if (prevContainer) prevContainer.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
    window.handleCommunityImageUpload = handleCommunityImageUpload;

    function clearCommunityPostImage() {
      communityActiveAttachedImage = null;
      const prevContainer = document.getElementById('community-post-image-preview-container');
      const prevImg = document.getElementById('community-post-image-preview');
      if (prevImg) prevImg.src = '';
      if (prevContainer) prevContainer.style.display = 'none';
      const fileInp = document.getElementById('community-image-file-input');
      if (fileInp) fileInp.value = '';
    }
    window.clearCommunityPostImage = clearCommunityPostImage;

    function openCommunityBadgePicker() {
      if (typeof openAchievementsModal === 'function') {
        openAchievementsModal();
        showToast('💡 Nhấn chọn huy hiệu bạn muốn đính kèm vào bài viết!');
      }
    }
    window.openCommunityBadgePicker = openCommunityBadgePicker;

    function selectCommunityPostBadge(badgeId) {
      const bDef = (typeof ACHIEVEMENTS_REGISTRY !== 'undefined') ? ACHIEVEMENTS_REGISTRY[badgeId] : null;
      if (!bDef) return;
      communityActiveAttachedBadge = {
        id: badgeId,
        name: bDef.name,
        icon: bDef.icon || '🏆',
        desc: bDef.desc || '',
        tier: bDef.tier || 'bronze'
      };
      const prevCont = document.getElementById('community-post-badge-preview-container');
      const iconEl = document.getElementById('community-post-badge-icon');
      const nameEl = document.getElementById('community-post-badge-name');
      const descEl = document.getElementById('community-post-badge-desc');
      if (iconEl) iconEl.textContent = bDef.icon || '🏆';
      if (nameEl) nameEl.textContent = bDef.name;
      if (descEl) descEl.textContent = bDef.desc || '';
      if (prevCont) prevCont.style.display = 'flex';
      showToast(`🎖️ Đã đính kèm danh hiệu "${bDef.name}"!`);
    }
    window.selectCommunityPostBadge = selectCommunityPostBadge;

    function clearCommunityPostBadge() {
      communityActiveAttachedBadge = null;
      const prevCont = document.getElementById('community-post-badge-preview-container');
      if (prevCont) prevCont.style.display = 'none';
    }
    window.clearCommunityPostBadge = clearCommunityPostBadge;

    async function submitCommunityPost() {
      if (isGuest()) {
        alert('🔒 Vui lòng đăng nhập tài khoản để đăng bài lên Cộng Đồng!');
        openAuthModal('login');
        return;
      }
      const contentEl = document.getElementById('community-post-content');
      const text = (contentEl?.value || '').trim();
      if (!text && !communityActiveAttachedImage && !communityActiveAttachedBadge) {
        showToast('⚠️ Vui lòng nhập nội dung hoặc đính kèm ảnh/danh hiệu trước khi đăng!');
        return;
      }

      const submitBtn = document.getElementById('btn-submit-community-post');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '⏳ Đang đăng...'; }

      const postId = 'post_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const postObj = {
        id: postId,
        authorUid: currentUser.uid,
        authorName: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Flower'),
        authorHandle: currentUser.username || (currentUser.email ? currentUser.email.split('@')[0] : 'user'),
        authorAvatar: getUserAvatar() || currentUser.displayName || '👤',
        isVip: isUserVip(),
        vipTier: getUserVipTier(),
        content: text,
        image: communityActiveAttachedImage || null,
        badge: communityActiveAttachedBadge || null,
        likes: {},
        comments: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: 'manual'
      };

      try {
        const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
        const token = typeof getFreshCloudAuthToken === 'function' ? await getFreshCloudAuthToken() : (currentUser?.idToken || '');
        const authParam = token ? `?auth=${token}` : '';

        await fetch(`${rtdbUrl}/community_posts/${postId}.json${authParam}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postObj)
        });

        dispatchFollowersNotification({
          type: 'new_post',
          postId: postId,
          authorName: postObj.authorName,
          authorHandle: postObj.authorHandle,
          message: `${postObj.authorName} vừa đăng một bài viết mới trên Cộng Đồng!`
        });

        if (contentEl) contentEl.value = '';
        clearCommunityPostImage();
        clearCommunityPostBadge();

        communityPosts.unshift(postObj);
        renderCommunityFeed();
        showToast('🎉 Đã đăng bài viết lên Cộng Đồng thành công!');
      } catch (err) {
        console.error('Error posting to community:', err);
        showToast('⚠️ Không thể đăng bài lúc này. Vui lòng kiểm tra kết nối!');
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '🚀 Đăng Bài'; }
      }
    }
    window.submitCommunityPost = submitCommunityPost;

    async function autoPostMilestoneToCommunity(type, meta = {}) {
      if (isGuest() || !currentUser || !currentUser.uid) return;
      const postId = 'auto_' + type + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      let contentText = '';
      let badgeData = null;

      if (type === 'badge') {
        contentText = `🏆 Tôi vừa mở khóa danh hiệu: "${meta.name || 'Thành Tựu Mới'}" (${(meta.tier || 'Kim Cương').toUpperCase()})! ${meta.desc ? '• ' + meta.desc : ''}`;
        badgeData = {
          id: meta.badgeId,
          name: meta.name,
          icon: meta.icon || '🎖️',
          desc: meta.desc || '',
          tier: meta.tier || 'diamond'
        };
      } else if (type === 'session_long') {
        contentText = `🔥 Vừa hoàn thành xuất sắc phiên học ${meta.mode || 'Luyện Tập'} với ${meta.wordCount || 30} từ vựng! Độ chính xác: ${meta.accuracy || 100}% • Cấp độ: ${(meta.difficulty || 'easy').toUpperCase()}! 🚀`;
      } else if (type === 'flow_streak') {
        contentText = `🌊 Giữ vững chuỗi Flow Streak ${meta.days || 7} ngày liên tục! Quyết tâm duy trì thói quen học từ mỗi ngày! 🌟`;
      } else if (type === 'vip_upgrade') {
        contentText = `👑 Vừa nâng cấp VocaVIP (${(meta.tier || 'PRO').toUpperCase()})! Sẵn sàng chinh phục từ vựng cùng AI thông minh! ✨`;
      }

      const postObj = {
        id: postId,
        authorUid: currentUser.uid,
        authorName: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Flower'),
        authorHandle: currentUser.username || (currentUser.email ? currentUser.email.split('@')[0] : 'user'),
        authorAvatar: getUserAvatar() || currentUser.displayName || '👤',
        isVip: isUserVip(),
        vipTier: getUserVipTier(),
        content: contentText,
        image: null,
        badge: badgeData,
        likes: {},
        comments: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: 'milestone',
        milestoneType: type
      };

      try {
        const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
        const token = typeof getFreshCloudAuthToken === 'function' ? await getFreshCloudAuthToken() : (currentUser?.idToken || '');
        const authParam = token ? `?auth=${token}` : '';

        await fetch(`${rtdbUrl}/community_posts/${postId}.json${authParam}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postObj)
        });

        dispatchFollowersNotification({
          type: 'milestone',
          postId: postId,
          authorName: postObj.authorName,
          authorHandle: postObj.authorHandle,
          message: `${postObj.authorName} vừa đạt cột mốc mới: ${contentText}`
        });

        communityPosts.unshift(postObj);
      } catch (err) {
        console.warn('Auto milestone post sync error:', err);
      }
    }
    window.autoPostMilestoneToCommunity = autoPostMilestoneToCommunity;

    async function dispatchFollowersNotification(notifData) {
      if (!currentUser || !currentUser.uid || !myFollowersMap) return;
      const followerUids = Object.keys(myFollowersMap);
      if (followerUids.length === 0) return;

      const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
      const token = typeof getFreshCloudAuthToken === 'function' ? await getFreshCloudAuthToken() : (currentUser?.idToken || '');
      const authParam = token ? `?auth=${token}` : '';

      const notifId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const notifPayload = {
        id: notifId,
        type: notifData.type || 'community',
        title: notifData.authorName || 'Cộng đồng VocaFlow',
        message: notifData.message,
        authorHandle: notifData.authorHandle,
        postId: notifData.postId,
        timestamp: new Date().toISOString(),
        read: false
      };

      followerUids.forEach(fUid => {
        fetch(`${rtdbUrl}/users/${fUid}/notifications/${notifId}.json${authParam}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notifPayload)
        }).catch(e => console.warn('Failed to dispatch follower notif to ' + fUid, e));
      });
    }

    async function fetchAndRenderCommunityFeed(force = false) {
      const container = document.getElementById('community-posts-container');
      if (!container) return;

      const compAv = document.getElementById('community-composer-avatar');
      if (compAv) {
        compAv.innerHTML = renderAvatarHtml(getUserAvatar() || currentUser?.displayName || '👤', 38, 16);
      }

      if (communityPosts.length === 0 || force) {
        container.innerHTML = '<div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px;">⏳ Đang tải bảng tin cộng đồng...</div>';
        try {
          const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
          const res = await fetch(`${rtdbUrl}/community_posts.json`);
          if (res.ok) {
            const data = await res.json();
            if (data && typeof data === 'object') {
              communityPosts = Object.values(data).filter(p => p && p.id);
              communityPosts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
              localStorage.setItem('vocaflow_community_posts_cache', JSON.stringify(communityPosts.slice(0, 50)));
            } else {
              communityPosts = [];
            }
          }
        } catch (err) {
          console.warn('Community feed load error, fallback to cache:', err);
          const cached = localStorage.getItem('vocaflow_community_posts_cache');
          if (cached) {
            try { communityPosts = JSON.parse(cached); } catch (e) {}
          }
        }
      }

      renderCommunityFeed();
    }
    window.fetchAndRenderCommunityFeed = fetchAndRenderCommunityFeed;

    function filterCommunityFeed(filter) {
      communityCurrentFilter = filter;
      ['all', 'mine', 'milestone'].forEach(f => {
        const btn = document.getElementById('community-filter-' + f);
        if (btn) {
          if (f === filter) {
            btn.classList.add('active-pill');
            btn.style.background = '#6366f1';
            btn.style.color = '#fff';
          } else {
            btn.classList.remove('active-pill');
            btn.style.background = 'var(--surface-elevated)';
            btn.style.color = 'var(--text-muted)';
          }
        }
      });
      renderCommunityFeed();
    }
    window.filterCommunityFeed = filterCommunityFeed;

    function renderCommunityFeed() {
      const container = document.getElementById('community-posts-container');
      if (!container) return;

      const myUid = currentUser?.uid;
      let filtered = communityPosts;
      if (communityCurrentFilter === 'mine') {
        filtered = communityPosts.filter(p => p.authorUid === myUid);
      } else if (communityCurrentFilter === 'milestone') {
        filtered = communityPosts.filter(p => p.type === 'milestone' || p.badge);
      }

      if (filtered.length === 0) {
        container.innerHTML = `
          <div style="background: var(--surface-elevated); border: 1px solid var(--border); border-radius: 12px; padding: 32px 16px; text-align: center;">
            <div style="font-size: 36px; margin-bottom: 8px;">💬✨</div>
            <strong style="font-size: 14px; color: var(--text);">Chưa có bài viết nào</strong>
            <p style="font-size: 12px; color: var(--text-muted); margin: 4px 0 0 0;">Hãy là người đầu tiên chia sẻ cảm nghĩ hoặc chiến tích học tập!</p>
          </div>
        `;
        return;
      }

      let html = '';
      filtered.forEach(post => {
        const isAuthor = myUid && post.authorUid === myUid;
        const likesMap = post.likes || {};
        const likesCount = Object.keys(likesMap).length;
        const isLiked = myUid && !!likesMap[myUid];

        const commentsMap = post.comments || {};
        const commentsList = Object.values(commentsMap).sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
        const commentsCount = commentsList.length;

        const timeAgo = formatTimeAgo(new Date(post.createdAt || Date.now()));

        html += `
          <div class="community-post-card" id="post-card-${post.id}" style="background: var(--surface-elevated); border: 1px solid var(--border); border-radius: 14px; padding: 14px; box-shadow: 0 4px 14px rgba(0,0,0,0.06); margin-bottom: 12px;">
            <!-- AUTHOR HEADER -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <div style="display: flex; align-items: center; gap: 10px; cursor: pointer;" onclick="openPublicProfileByAuthor('${escapeHtml(post.authorName)}', '', '${post.authorUid}')">
                <div style="width: 40px; height: 40px; border-radius: 50%; overflow: hidden; background: var(--surface); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
                  ${renderAvatarHtml(post.authorAvatar || post.authorName, 40, 16)}
                </div>
                <div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <strong style="font-size: 13.5px; color: var(--text);">${escapeHtml(post.authorName)}</strong>
                    ${post.isVip ? '<span class="badge" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; font-size: 9.5px; padding: 1px 5px;">👑 VIP</span>' : ''}
                  </div>
                  <div style="font-size: 11.5px; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
                    <span>@${escapeHtml(post.authorHandle || 'user')}</span>
                    <span>•</span>
                    <span>${timeAgo}</span>
                  </div>
                </div>
              </div>

              <!-- AUTHOR ACTION MENU -->
              ${isAuthor ? `
                <div style="display: flex; gap: 4px;">
                  <button type="button" class="btn btn-xs btn-outline" onclick="editCommunityPost('${post.id}')" title="Chỉnh sửa bài viết" style="padding: 2px 6px; font-size: 11px;">✏️</button>
                  <button type="button" class="btn btn-xs btn-outline" onclick="deleteCommunityPost('${post.id}')" title="Xóa bài viết" style="padding: 2px 6px; font-size: 11px; color: #f87171; border-color: rgba(248,113,113,0.3);">🗑️</button>
                </div>
              ` : ''}
            </div>

            <!-- POST CONTENT -->
            ${post.content ? `
              <div id="post-content-text-${post.id}" style="font-size: 13.5px; color: var(--text); line-height: 1.55; margin-bottom: 10px; white-space: pre-wrap; word-break: break-word;">
                ${escapeHtml(post.content)}
              </div>
            ` : ''}

            <!-- ATTACHED BADGE BANNER -->
            ${post.badge ? `
              <div style="margin-bottom: 10px; padding: 10px 14px; border-radius: 10px; background: linear-gradient(135deg, rgba(245,158,11,0.15), rgba(236,72,153,0.15)); border: 1px solid rgba(245,158,11,0.4); display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 26px;">${post.badge.icon || '🏆'}</span>
                <div>
                  <div style="font-weight: 800; font-size: 13px; color: #fbbf24;">${escapeHtml(post.badge.name)}</div>
                  <div style="font-size: 11.5px; color: var(--text-muted);">${escapeHtml(post.badge.desc || '')}</div>
                </div>
              </div>
            ` : ''}

            <!-- ATTACHED IMAGE -->
            ${post.image ? `
              <div style="margin-bottom: 10px; border-radius: 10px; overflow: hidden; border: 1px solid var(--border); max-height: 320px; background: #000;">
                <img src="${post.image}" alt="Post image" style="width: 100%; height: auto; max-height: 320px; object-fit: contain; display: block;">
              </div>
            ` : ''}

            <!-- INTERACTION ACTION BAR -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); padding-top: 8px; margin-top: 4px;">
              <div style="display: flex; gap: 10px;">
                <!-- LIKE BUTTON -->
                <button type="button" class="btn btn-xs ${isLiked ? 'btn-primary' : 'btn-outline'}" onclick="togglePostLike('${post.id}')" style="font-size: 12px; display: inline-flex; align-items: center; gap: 5px; ${isLiked ? 'background: rgba(239,68,68,0.2); color: #f87171; border-color: rgba(239,68,68,0.5);' : ''}">
                  <span>${isLiked ? '❤️' : '🤍'}</span>
                  <span>${likesCount}</span>
                </button>

                <!-- COMMENT TOGGLE BUTTON -->
                <button type="button" class="btn btn-xs btn-outline" onclick="togglePostCommentsSection('${post.id}')" style="font-size: 12px; display: inline-flex; align-items: center; gap: 5px;">
                  <span>💬</span>
                  <span>${commentsCount} bình luận</span>
                </button>
              </div>

              <!-- SHARE BUTTON -->
              <button type="button" class="btn btn-xs btn-outline" onclick="shareCommunityPost('${post.id}')" title="Chia sẻ liên kết bài viết" style="font-size: 11px;">
                <span>🔗</span>
              </button>
            </div>

            <!-- COMMENTS SECTION (Collapsible) -->
            <div id="post-comments-section-${post.id}" style="display: ${communityActiveCommentsPostId === post.id ? 'block' : 'none'}; margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 10px;">
              
              <!-- COMMENTS LIST -->
              <div id="post-comments-list-${post.id}" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px;">
                ${commentsList.length === 0 ? `
                  <div style="font-size: 11.5px; color: var(--text-muted); font-style: italic; padding: 4px 0;">Chưa có bình luận nào. Hãy là người đầu tiên bình luận!</div>
                ` : commentsList.map(c => `
                  <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; font-size: 12.5px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                      <div style="display: flex; align-items: center; gap: 6px; cursor: pointer;" onclick="openPublicProfileByAuthor('${escapeHtml(c.authorName)}', '', '${c.authorUid}')">
                        <strong style="color: #38bdf8; font-size: 12px;">@${escapeHtml(c.authorHandle || 'user')}</strong>
                        <span style="font-size: 10.5px; color: var(--text-muted);">${formatTimeAgo(new Date(c.timestamp || Date.now()))}</span>
                      </div>
                      <button type="button" class="btn btn-xs btn-outline" onclick="setReplyingToComment('${post.id}', '${c.id}', '${escapeHtml(c.authorHandle || 'user')}')" style="font-size: 10.5px; padding: 1px 6px;">↩️ Trả lời</button>
                    </div>
                    ${c.replyToAuthorHandle ? `<span style="color: #818cf8; font-size: 11.5px; font-weight: 600;">@${escapeHtml(c.replyToAuthorHandle)} </span>` : ''}
                    <span style="color: var(--text); line-height: 1.4; word-break: break-word;">${escapeHtml(c.content)}</span>
                  </div>
                `).join('')}
              </div>

              <!-- COMMENT INPUT -->
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <div id="reply-indicator-${post.id}" style="display: none; font-size: 11px; color: #818cf8; background: rgba(99,102,241,0.12); padding: 3px 8px; border-radius: 6px; justify-content: space-between; align-items: center;">
                  <span id="reply-indicator-text-${post.id}">Đang trả lời @user</span>
                  <button type="button" onclick="cancelReplyingToComment('${post.id}')" style="background:none; border:none; color:var(--text-muted); cursor:pointer;">✕</button>
                </div>
                <div style="display: flex; gap: 6px;">
                  <input type="text" id="post-comment-input-${post.id}" class="form-input" placeholder="Viết bình luận..." style="font-size: 12px; padding: 6px 10px; flex: 1;" onkeydown="if(event.key === 'Enter') submitPostComment('${post.id}')">
                  <button type="button" class="btn btn-primary btn-sm" onclick="submitPostComment('${post.id}')" style="font-size: 12px; padding: 6px 12px; font-weight: 700;">Gửi</button>
                </div>
              </div>

            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    }

    async function togglePostLike(postId) {
      if (isGuest()) {
        alert('🔒 Vui lòng đăng nhập để thả tim bài viết!');
        openAuthModal('login');
        return;
      }
      const myUid = currentUser?.uid;
      if (!myUid) return;

      const post = communityPosts.find(p => p.id === postId);
      if (!post) return;
      if (!post.likes) post.likes = {};

      const isLiked = !!post.likes[myUid];
      const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
      const token = typeof getFreshCloudAuthToken === 'function' ? await getFreshCloudAuthToken() : (currentUser?.idToken || '');
      const authParam = token ? `?auth=${token}` : '';

      try {
        if (isLiked) {
          delete post.likes[myUid];
          await fetch(`${rtdbUrl}/community_posts/${postId}/likes/${myUid}.json${authParam}`, { method: 'DELETE' });
        } else {
          post.likes[myUid] = true;
          await fetch(`${rtdbUrl}/community_posts/${postId}/likes/${myUid}.json${authParam}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(true)
          });

          if (post.authorUid && post.authorUid !== myUid) {
            const notifId = 'notif_like_' + Date.now();
            fetch(`${rtdbUrl}/users/${post.authorUid}/notifications/${notifId}.json${authParam}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: notifId,
                type: 'like',
                title: '❤️ Lượt thích mới',
                message: `@${currentUser.username || 'user'} đã thích bài viết của bạn!`,
                postId: postId,
                timestamp: new Date().toISOString(),
                read: false
              })
            }).catch(e => console.warn(e));
          }
        }
        renderCommunityFeed();
      } catch (err) {
        console.warn('Like toggle sync error:', err);
      }
    }
    window.togglePostLike = togglePostLike;

    function togglePostCommentsSection(postId) {
      communityActiveCommentsPostId = (communityActiveCommentsPostId === postId) ? null : postId;
      renderCommunityFeed();
      if (communityActiveCommentsPostId === postId) {
        setTimeout(() => {
          document.getElementById(`post-comment-input-${postId}`)?.focus();
        }, 100);
      }
    }
    window.togglePostCommentsSection = togglePostCommentsSection;

    function setReplyingToComment(postId, commentId, authorHandle) {
      communityReplyingToComment = { postId, commentId, authorHandle };
      const ind = document.getElementById(`reply-indicator-${postId}`);
      const txt = document.getElementById(`reply-indicator-text-${postId}`);
      const inp = document.getElementById(`post-comment-input-${postId}`);
      if (ind) ind.style.display = 'flex';
      if (txt) txt.textContent = `Đang trả lời @${authorHandle}`;
      if (inp) {
        inp.value = `@${authorHandle} `;
        inp.focus();
      }
    }
    window.setReplyingToComment = setReplyingToComment;

    function cancelReplyingToComment(postId) {
      communityReplyingToComment = null;
      const ind = document.getElementById(`reply-indicator-${postId}`);
      if (ind) ind.style.display = 'none';
      const inp = document.getElementById(`post-comment-input-${postId}`);
      if (inp) inp.value = '';
    }
    window.cancelReplyingToComment = cancelReplyingToComment;

    async function submitPostComment(postId) {
      if (isGuest()) {
        alert('🔒 Vui lòng đăng nhập để bình luận!');
        openAuthModal('login');
        return;
      }
      const inp = document.getElementById(`post-comment-input-${postId}`);
      const text = (inp?.value || '').trim();
      if (!text) return;

      const post = communityPosts.find(p => p.id === postId);
      if (!post) return;
      if (!post.comments) post.comments = {};

      const commentId = 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const replyHandle = communityReplyingToComment?.postId === postId ? communityReplyingToComment.authorHandle : null;
      const replyCommentId = communityReplyingToComment?.postId === postId ? communityReplyingToComment.commentId : null;

      const commentObj = {
        id: commentId,
        authorUid: currentUser.uid,
        authorName: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Flower'),
        authorHandle: currentUser.username || (currentUser.email ? currentUser.email.split('@')[0] : 'user'),
        authorAvatar: getUserAvatar() || currentUser.displayName || '👤',
        content: text,
        replyToCommentId: replyCommentId,
        replyToAuthorHandle: replyHandle,
        timestamp: new Date().toISOString()
      };

      post.comments[commentId] = commentObj;
      if (inp) inp.value = '';
      cancelReplyingToComment(postId);
      renderCommunityFeed();

      try {
        const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
        const token = typeof getFreshCloudAuthToken === 'function' ? await getFreshCloudAuthToken() : (currentUser?.idToken || '');
        const authParam = token ? `?auth=${token}` : '';

        await fetch(`${rtdbUrl}/community_posts/${postId}/comments/${commentId}.json${authParam}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(commentObj)
        });

        if (post.authorUid && post.authorUid !== currentUser.uid) {
          const notifId = 'notif_comment_' + Date.now();
          fetch(`${rtdbUrl}/users/${post.authorUid}/notifications/${notifId}.json${authParam}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: notifId,
              type: 'comment',
              title: '💬 Bình luận mới',
              message: `@${commentObj.authorHandle} đã bình luận: "${text.slice(0, 60)}"`,
              postId: postId,
              timestamp: new Date().toISOString(),
              read: false
            })
          }).catch(e => console.warn(e));
        }
      } catch (err) {
        console.warn('Comment sync error:', err);
      }
    }
    window.submitPostComment = submitPostComment;

    async function editCommunityPost(postId) {
      const post = communityPosts.find(p => p.id === postId);
      if (!post || post.authorUid !== currentUser?.uid) return;
      const newText = prompt('Chỉnh sửa nội dung bài viết:', post.content || '');
      if (newText === null) return;
      post.content = newText.trim();
      post.updatedAt = new Date().toISOString();
      renderCommunityFeed();

      try {
        const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
        const token = typeof getFreshCloudAuthToken === 'function' ? await getFreshCloudAuthToken() : (currentUser?.idToken || '');
        const authParam = token ? `?auth=${token}` : '';

        await fetch(`${rtdbUrl}/community_posts/${postId}.json${authParam}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: post.content, updatedAt: post.updatedAt })
        });
        showToast('✏️ Đã cập nhật bài viết thành công!');
      } catch (err) {
        console.warn('Edit post sync error:', err);
      }
    }
    window.editCommunityPost = editCommunityPost;

    async function deleteCommunityPost(postId) {
      const post = communityPosts.find(p => p.id === postId);
      if (!post || post.authorUid !== currentUser?.uid) return;
      if (!confirm('Bạn có chắc chắn muốn xóa bài viết này không?')) return;

      communityPosts = communityPosts.filter(p => p.id !== postId);
      renderCommunityFeed();

      try {
        const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
        const token = typeof getFreshCloudAuthToken === 'function' ? await getFreshCloudAuthToken() : (currentUser?.idToken || '');
        const authParam = token ? `?auth=${token}` : '';

        await fetch(`${rtdbUrl}/community_posts/${postId}.json${authParam}`, { method: 'DELETE' });
        showToast('🗑️ Đã xóa bài viết thành công!');
      } catch (err) {
        console.warn('Delete post sync error:', err);
      }
    }
    window.deleteCommunityPost = deleteCommunityPost;

    function shareCommunityPost(postId) {
      const post = communityPosts.find(p => p.id === postId);
      if (!post) return;
      const url = getStandardProfileUrl(post.authorHandle) + `&post=${postId}`;
      navigator.clipboard.writeText(url).then(() => {
        showToast('🔗 Đã sao chép liên kết bài viết vào bộ nhớ tạm!');
      }).catch(() => {
        prompt('Sao chép liên kết bài viết:', url);
      });
    }
    window.shareCommunityPost = shareCommunityPost;

    function switchPubProfileTab(tabName = 'decks') {
      const tabs = ['decks', 'stats'];
      tabs.forEach(t => {
        const btn = document.getElementById(`pub-tab-btn-${t}`);
        const panel = document.getElementById(`pub-tab-panel-${t}`);
        if (btn) {
          if (t === tabName) btn.classList.add('active');
          else btn.classList.remove('active');
        }
        if (panel) {
          panel.style.display = (t === tabName) ? 'block' : 'none';
        }
      });
    }
    window.switchPubProfileTab = switchPubProfileTab;

    function getStandardProfileUrl(handle) {
      const cleanHandle = (handle || '').replace(/^@/, '').trim();
      let baseUrl = 'https://iamjulies.github.io/VocaFlow/';
      try {
        if (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) {
          baseUrl = window.location.origin + window.location.pathname.replace(/\/index\.html$/, '').replace(/\/vocaflow\.html$/, '');
          if (!baseUrl.endsWith('/')) baseUrl += '/';
        }
      } catch (e) {}
      return `${baseUrl}?user=@${cleanHandle}`;
    }
    window.getStandardProfileUrl = getStandardProfileUrl;

    function sharePublicProfile() {
      if (!currentPublicProfileAuthor) return;
      const name = currentPublicProfileAuthor.resolvedName || 'Flower';
      const handle = (currentPublicProfileAuthor.resolvedHandle || 'member').replace(/^@/, '');
      const profileUrl = getStandardProfileUrl(handle);
      const shareTitle = `Hồ sơ học từ vựng của @${handle} trên VocaFlow`;
      const shareText = `Khám phá hồ sơ học từ vựng của @${handle} (${name}) trên VocaFlow: ${profileUrl}`;

      if (navigator.share) {
        navigator.share({
          title: shareTitle,
          text: shareText,
          url: profileUrl
        }).then(() => {
          showToast(`🔗 Đã chia sẻ liên kết hồ sơ của @${handle}!`);
        }).catch(() => {
          copyProfileLinkFallback(profileUrl, handle);
        });
      } else {
        copyProfileLinkFallback(profileUrl, handle);
      }
    }
    window.sharePublicProfile = sharePublicProfile;

    function shareMyProfile() {
      if (!currentUser || !currentUser.email) {
        showToast('🔒 Hãy đăng nhập tài khoản để chia sẻ hồ sơ cá nhân nhé!');
        return;
      }
      const name = currentUser.displayName || 'Flower';
      const handle = (currentUser.username || currentUser.email.split('@')[0]).replace(/^@/, '');
      const profileUrl = getStandardProfileUrl(handle);
      const shareTitle = `Hồ sơ học từ vựng của @${handle} trên VocaFlow`;
      const shareText = `Khám phá hồ sơ học từ vựng của @${handle} (${name}) trên VocaFlow: ${profileUrl}`;

      if (navigator.share) {
        navigator.share({
          title: shareTitle,
          text: shareText,
          url: profileUrl
        }).then(() => {
          showToast(`🔗 Đã chia sẻ liên kết hồ sơ của bạn!`);
        }).catch(() => {
          copyProfileLinkFallback(profileUrl, handle);
        });
      } else {
        copyProfileLinkFallback(profileUrl, handle);
      }
    }
    window.shareMyProfile = shareMyProfile;

    function copyProfileLinkFallback(shareText, handle) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareText).then(() => {
          showToast(`🔗 Đã sao chép liên kết hồ sơ của @${handle}!`);
        }).catch(() => {
          showToast(`🔗 Hồ sơ Flower: @${handle}`);
        });
      } else {
        showToast(`🔗 Hồ sơ Flower: @${handle}`);
      }
    }

    function openProfileModal() {
      updateAuthUI();
      if (typeof checkMasteryAchievements === 'function') checkMasteryAchievements();
      if (typeof renderProfilePinnedBadges === 'function') renderProfilePinnedBadges();
      if (typeof switchProfileTab === 'function') switchProfileTab('decks');
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

    async function handleAuthActionFromProfile() {
      closeModal('modal-profile');
      if (currentUser) {
        await doLogout();
      } else {
        openAuthModal('login');
      }
    }

    async function doLogout() {
      if (!currentUser) return;
      if (!confirm('Bạn có chắc chắn muốn đăng xuất? Mọi dữ liệu của bạn sẽ được đồng bộ lên Cloud an toàn và thiết bị sẽ được đặt lại về trạng thái ban đầu.')) return;

      showToast('⏳ Đang đồng bộ dữ liệu lên Cloud trước khi đăng xuất...');
      try {
        await pushCurrentDatabaseToCloud();
      } catch (e) {
        console.warn('Sync before logout warning:', e);
      }
      closeFirebaseRealtimeSync();
      stopPeriodicBidirectionalSync();

      // 1. Clear all user account data from LocalStorage & Memory ("CHẾT LÀ HẾT")
      currentUser = null;
      localStorage.removeItem(STORAGE_KEY_AUTH);
      localStorage.removeItem('vocaflow_user_ledger');
      userLedger = [];
      localStorage.removeItem('vocaflow_purchased_decks');
      userPurchasedDeckIds = new Set();
      localStorage.removeItem('vocaflow_gemini_api_key');
      geminiApiKey = '';
      const apiInp = document.getElementById('setting-gemini-api-key');
      if (apiInp) apiInp.value = '';

      localStorage.removeItem('vocaflow_user_avatar');
      localStorage.removeItem('vocaflow_avatar_time');
      localStorage.removeItem('vocaflow_user_bio');
      localStorage.removeItem('vocaflow_user_points');
      localStorage.removeItem('vocaflow_user_hints');
      localStorage.removeItem('vocaflow_user_skips');
      localStorage.removeItem('vocaflow_economy_time');
      localStorage.removeItem(STORAGE_KEY_LAST_SYNC);
      localStorage.removeItem('vocaflow_referred_by');
      localStorage.removeItem('vocaflow_user_achievements');
      localStorage.removeItem('vocaflow_pinned_badges');
      userAchievements = {};
      userPinnedBadges = [];
      localStorage.removeItem('vocaflow_referrals_count');
      localStorage.removeItem('vocaflow_deleted_words');
      localStorage.removeItem('vocaflow_deleted_decks');
      deletedWordIds.clear();
      deletedDeckIds.clear();

      // Following & Followers complete wipeout
      myFollowingMap = {};
      myFollowersMap = {};
      localStorage.removeItem('vocaflow_following_map');
      localStorage.removeItem('vocaflow_followers_map');
      localStorage.removeItem('vocaflow_creator_profile_cache');

      // Notifications complete wipeout
      userNotifications = [];
      deletedNotificationIds.clear();
      localStorage.removeItem('vocaflow_user_notifications');
      localStorage.removeItem('vocaflow_deleted_notifications');
      localStorage.removeItem('vocaflow_notifications_cleared_time');
      if (typeof updateNotificationsUI === 'function') updateNotificationsUI();

      // AI Mentor Chat & Quota complete wipeout
      aiChatHistory = [];
      aiQuizCache = {};
      aiChatDailyCount = 0;
      aiChatDailyDate = '';
      localStorage.removeItem('vocaflow_ai_chat_history');
      localStorage.removeItem('vocaflow_ai_chat_daily_count');
      localStorage.removeItem('vocaflow_ai_chat_daily_date');
      localStorage.removeItem('vocaflow_gemini_working_model');

      // VIP state complete wipeout
      userIsVip = false;
      userVipTier = 'none';
      userVipExpiresAt = 0;
      adminVipOverride = false;
      localStorage.removeItem('vocaflow_user_is_vip');
      localStorage.removeItem('vocaflow_user_vip_tier');
      localStorage.removeItem('vocaflow_user_vip_expires_at');
      localStorage.removeItem('vocaflow_admin_vip_override');
      localStorage.removeItem('vocaflow_pending_vip_payment');
      if (typeof renderAiChatMessages === 'function') renderAiChatMessages();
      if (typeof updateAiChatQuotaUI === 'function') updateAiChatQuotaUI();

      // 2. Reset decks & words to clean starter sample data (Trạng thái nguyên thủy)
      seedSampleData();
      saveDatabase(false);

      // 3. Reset points & inventory to guest defaults
      localStorage.setItem('vocaflow_user_points', '0');
      localStorage.setItem('vocaflow_user_hints', '5');
      localStorage.setItem('vocaflow_user_skips', '3');
      updateEconomyUI();

      // 4. Force difficulty to 'easy'
      currentQuizDifficulty = 'easy';
      currentSpellingDifficulty = 'easy';
      localStorage.setItem('vocaflow_quiz_difficulty', 'easy');
      localStorage.setItem('vocaflow_spelling_difficulty', 'easy');

      updateAuthUI();
      refreshActiveScreenData();
      showToast('👋 Đã đăng xuất an toàn. Thiết bị đã được đưa về trạng thái nguyên thủy.');
    }

    async function handleFormLogin(e) {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      // Clear guest/residual state immediately before logging in
      myFollowingMap = {};
      myFollowersMap = {};
      localStorage.removeItem('vocaflow_following_map');
      localStorage.removeItem('vocaflow_followers_map');
      userNotifications = [];
      deletedNotificationIds.clear();
      localStorage.removeItem('vocaflow_user_notifications');
      localStorage.removeItem('vocaflow_deleted_notifications');
      aiChatHistory = [];
      aiQuizCache = {};
      aiChatDailyCount = 0;
      aiChatDailyDate = '';
      localStorage.removeItem('vocaflow_ai_chat_history');
      localStorage.removeItem('vocaflow_ai_chat_daily_count');
      localStorage.removeItem('vocaflow_ai_chat_daily_date');
      localStorage.removeItem('vocaflow_user_ledger');
      userLedger = [];
      localStorage.removeItem(STORAGE_KEY_USER_POINTS);
      localStorage.removeItem(STORAGE_KEY_USER_HINTS);
      localStorage.removeItem(STORAGE_KEY_USER_SKIPS);
      localStorage.removeItem(STORAGE_KEY_ECONOMY_TIME);

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
          let finalAvatar = '';
          let finalAvatarTime = 0;
          let finalBio = '';
          if (firebaseConfig.databaseURL) {
            try {
              const pRes = await fetch(`${firebaseConfig.databaseURL}/users/${data.localId}.json?auth=${data.idToken}`);
              if (pRes.ok) {
                const uData = await pRes.json();
                if (uData && typeof uData === 'object') {
                  const prof = uData.profile || {};
                  if (prof.displayName) finalDisplayName = prof.displayName;
                  if (prof.bio !== undefined) finalBio = prof.bio;
                  else if (uData.bio !== undefined) finalBio = uData.bio;
                  const av = prof.avatar || uData.avatar;
                  if (av && (av.startsWith('data:image') || av.startsWith('http'))) {
                    finalAvatar = av;
                    finalAvatarTime = parseInt(prof.avatarTime || uData.avatarTime || Date.now().toString(), 10);
                  }
                  // Restore VIP on login with Bulletproof Protection
                  if (prof.isVip !== undefined || uData.isVip !== undefined) {
                    const rIsVip = prof.isVip !== undefined ? !!prof.isVip : !!uData.isVip;
                    const rTier = prof.vipTier || uData.vipTier || 'none';
                    const rExp = prof.vipExpiresAt || uData.vipExpiresAt || 0;
                    applyVipState(rIsVip, rTier, rExp, 'auth_login', false);
                  }
                }
              }
            } catch (pErr) {}
          }
          if (!finalDisplayName) finalDisplayName = email.split('@')[0];

          currentUser = {
            uid: data.localId,
            email: data.email,
            displayName: finalDisplayName,
            bio: finalBio,
            avatar: finalAvatar,
            avatarTime: finalAvatarTime,
            isVip: userIsVip,
            vipTier: userVipTier,
            vipExpiresAt: userVipExpiresAt,
            idToken: data.idToken
          };
          if (finalAvatar) {
            localStorage.setItem('vocaflow_user_avatar', finalAvatar);
            localStorage.setItem('vocaflow_avatar_time', finalAvatarTime.toString());
          }
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
      if (currentUser && currentUser.uid) {
        ensureUserHandleAssigned(currentUser);
      }
      updateAuthUI();
      showToast('Đăng nhập thành công!');
      handleManualSync();
      startPeriodicBidirectionalSync();
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
      startPeriodicBidirectionalSync();
    }

    async function handleForgotPassword() {
      const currentEmailInput = document.getElementById('login-email')?.value || document.getElementById('reg-email')?.value || document.getElementById('auth-email')?.value || '';
      const email = prompt('Nhập địa chỉ email của bạn để nhận liên kết đặt lại mật khẩu:', currentEmailInput);
      if (!email || !email.includes('@')) {
        if (email) showToast('⚠️ Vui lòng nhập địa chỉ email hợp lệ!');
        return;
      }

      showToast('⏳ Đang gửi email khôi phục mật khẩu...');
      try {
        const apiKey = (typeof firebaseConfig !== 'undefined' && firebaseConfig.apiKey) ? firebaseConfig.apiKey : '';
        if (apiKey) {
          const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requestType: 'PASSWORD_RESET',
              email: email.trim()
            })
          });
          const data = await res.json();
          if (!res.ok) {
            let errDesc = data.error?.message || 'Không thể gửi email đặt lại mật khẩu.';
            if (errDesc.includes('EMAIL_NOT_FOUND')) errDesc = 'Không tìm thấy tài khoản nào gắn với email này!';
            alert('⚠️ ' + errDesc);
            return;
          }
        }
        alert(`📧 ĐÃ GỬI EMAIL THÀNH CÔNG!\n\nMột liên kết đặt lại mật khẩu đã được gửi tới: ${email}.\n\nVui lòng kiểm tra Hộp thư đến (và mục Thư rác / Spam) để bấm vào liên kết tạo mật khẩu mới nhé!`);
        showToast('📧 Đã gửi link đặt lại mật khẩu qua email!');
      } catch (err) {
        console.error('Password reset error:', err);
        showToast('⚠️ Lỗi kết nối gửi email khôi phục: ' + err.message);
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
        }, 1200);
      }
    }

    async function pushCurrentDatabaseToCloud() {
      if (!currentUser || !currentUser.uid || currentUser.uid.startsWith('guest_') || !firebaseConfig.databaseURL) return;
      const userId = currentUser.uid;
      const rtdbUrl = firebaseConfig.databaseURL;
      const token = typeof getFreshCloudAuthToken === 'function' ? await getFreshCloudAuthToken() : (currentUser && currentUser.idToken ? currentUser.idToken : '');
      const authParam = token ? `?auth=${token}` : '';

      try {
        decks = sanitizeDecks(decks);
        const currentAv = getUserAvatar();
        const avToSave = (typeof currentAv === 'string' && (currentAv.startsWith('data:image') || currentAv.startsWith('http'))) ? currentAv : '';
        const avTimeToSave = parseInt(localStorage.getItem('vocaflow_avatar_time') || Date.now().toString(), 10);
        const refToSave = localStorage.getItem('vocaflow_referred_by') || (currentUser && currentUser.referredBy) || '';

        const payload = {
          profile: {
            displayName: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Khách'),
            username: currentUser.username || '',
            lastUsernameChangeTimestamp: currentUser.lastUsernameChangeTimestamp || 0,
            bio: currentUser.bio || '',
            email: currentUser.email || '',
            avatar: avToSave,
            avatarTime: avTimeToSave,
            referredBy: refToSave,
            pinnedBadges: userPinnedBadges,
            achievementsCount: Object.values(userAchievements).filter(a => a && a.unlocked).length,
            geminiApiKey: geminiApiKey || '',
            geminiApiKeys: getStoredApiKeys(),
            followerCount: Math.max(currentUser.followerCount || 0, Object.keys(myFollowersMap || {}).length),
            followingCount: Math.max(currentUser.followingCount || 0, Object.keys(myFollowingMap || {}).length),
            isVip: isUserVip(),
            vipTier: getUserVipTier(),
            vipExpiresAt: userVipExpiresAt,
            lastSync: new Date().toISOString()
          },
          following: myFollowingMap,
          ...(Object.keys(myFollowersMap || {}).length > 0 ? { followers: myFollowersMap } : {}),
          notifications: (() => {
            const nMap = {};
            userNotifications.forEach(n => { if (n && n.id) nMap[n.id] = n; });
            return nMap;
          })(),
          achievements: userAchievements,
          pinnedBadges: userPinnedBadges,
          purchasedDeckIds: Array.from(userPurchasedDeckIds),
          deckSort: currentDeckSort,
          deckTab: currentDeckTab,
          wordFilter: currentWordFilter,
          decks: decks,
          words: words,
          mistakeNotebook: getMistakeWordsList(),
          deletedWordIds: Array.from(deletedWordIds),
          deletedDeckIds: Array.from(deletedDeckIds),
          aiChatHistory: sanitizeAiChatHistoryForCloud(aiChatHistory),
          economy: {
            points: getUserPoints(),
            hints: getUserHints(),
            skips: getUserSkips(),
            flowFreezes: getUserFlowFreezes(),
            luckySpins: Math.max(0, parseInt(localStorage.getItem('vocaflow_lucky_spins_left') || '0', 10)),
            luckySpinsDate: localStorage.getItem('vocaflow_last_spin_date') || getTodayString(),
            lastVipSpinDate: localStorage.getItem('vocaflow_last_vip_spin_date') || ((typeof formatLocalDateString === 'function') ? formatLocalDateString(new Date()) : getTodayString()),
            lastAdWatchTime: parseInt(localStorage.getItem('vocaflow_last_ad_watch_time') || '0', 10),
            updatedAt: new Date().toISOString()
          },
          aiChatQuota: {
            dailyDate: aiChatDailyDate || getTodayDateString(),
            dailyCount: aiChatDailyCount,
            updatedAt: new Date().toISOString()
          },
          flow: {
            days: calculateCurrentFlow().currentFlow,
            pureDays: calculateCurrentFlow().pureFlow,
            max: calculateCurrentFlow().maxFlow,
            freezes: getUserFlowFreezes(),
            updatedAt: new Date().toISOString()
          },
          flowDates: getFlowDates(),
          flowFreezeDates: getFlowFreezeDates(),
          flowFreezes: getUserFlowFreezes(),
          settings: {
            showReviewQueue: showReviewQueueSetting,
            showFilterPos: showFilterPosSetting,
            showFilterCefr: showFilterCefrSetting,
            showFilterScore: showFilterScoreSetting,
            showTimestamp: showTimestampSetting,
            speechRateEn: currentSpeechRateEn,
            speechRateVi: currentSpeechRateVi,
            sfxEnabled: (typeof sfxEnabled !== 'undefined' ? sfxEnabled : true),
            sfxVolume: (typeof sfxVolume !== 'undefined' ? sfxVolume : 80),
            vipCatMemesEnabled: localStorage.getItem('vocaflow_vip_cat_memes_enabled') !== 'false',
            vipCatMemesDuration: parseFloat(localStorage.getItem('vocaflow_vip_cat_memes_duration') || '2.5') || 2.5,
            updatedAt: new Date().toISOString()
          },
          lastSync: new Date().toISOString()
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        // Safe PATCH method protects sibling nodes (following, followers, notifications)
        await fetch(`${rtdbUrl}/users/${userId}.json${authParam}`, {
          method: 'PATCH',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        clearTimeout(timeoutId);
        localStorage.setItem(STORAGE_KEY_LAST_SYNC, new Date().toISOString());
      } catch (err) {
        console.warn('Auto background push note:', err);
      }
    }

    // =========================================================================
    // FIREBASE REALTIME WEBSOCKET & SSE EVENTSTREAM ENGINE (v0.10.9-alpha-31)
    // =========================================================================
    let rtdbEventSource = null;
    let rtdbEventSourceRetryTimer = null;
    let rtdbActiveSyncUid = null;

    function initFirebaseRealtimeSync(uid, idToken) {
      if (!uid || uid.startsWith('guest_') || !firebaseConfig.databaseURL) return;
      if (rtdbEventSource && rtdbActiveSyncUid === uid) return; // already active for current user

      closeFirebaseRealtimeSync();
      rtdbActiveSyncUid = uid;

      const authParam = idToken ? `?auth=${idToken}` : '';
      const streamUrl = `${firebaseConfig.databaseURL}/users/${uid}.json${authParam}`;

      try {
        if (typeof EventSource !== 'undefined') {
          rtdbEventSource = new EventSource(streamUrl);

          rtdbEventSource.addEventListener('put', (e) => {
            handleRealtimeCloudEvent('put', e.data);
          });

          rtdbEventSource.addEventListener('patch', (e) => {
            handleRealtimeCloudEvent('patch', e.data);
          });

          rtdbEventSource.onerror = () => {
            if (rtdbEventSource) {
              try { rtdbEventSource.close(); } catch (e) {}
              rtdbEventSource = null;
            }
            if (rtdbEventSourceRetryTimer) clearTimeout(rtdbEventSourceRetryTimer);
            rtdbEventSourceRetryTimer = setTimeout(async () => {
              if (currentUser && currentUser.uid && !currentUser.uid.startsWith('guest_')) {
                const freshToken = typeof getFreshCloudAuthToken === 'function' ? await getFreshCloudAuthToken() : (currentUser.idToken || '');
                initFirebaseRealtimeSync(currentUser.uid, freshToken);
              }
            }, 15000);
          };
        }
      } catch (err) {
        console.warn('Realtime Stream Init note:', err);
      }
    }

    function closeFirebaseRealtimeSync() {
      if (rtdbEventSourceRetryTimer) {
        clearTimeout(rtdbEventSourceRetryTimer);
        rtdbEventSourceRetryTimer = null;
      }
      if (rtdbEventSource) {
        try { rtdbEventSource.close(); } catch (e) {}
        rtdbEventSource = null;
      }
      rtdbActiveSyncUid = null;
    }

    function handleRealtimeCloudEvent(eventType, rawData) {
      if (!rawData || !currentUser || !currentUser.uid) return;
      try {
        const parsed = JSON.parse(rawData);
        if (!parsed || typeof parsed !== 'object') return;
        const { path, data } = parsed;
        if (data === null || typeof data === 'undefined') return;

        if (path === '/' || path === '') {
          mergeCloudDataIntoLocal(data, false);
        } else if (path === '/economy' || path.startsWith('/economy')) {
          applyCloudEconomyPatch(data, path);
        } else if (path.startsWith('/flow') || path.startsWith('/flowDates') || path.startsWith('/flowFreezeDates')) {
          applyCloudFlowPatch(path, data);
        } else if (path.startsWith('/profile') || path === '/vip') {
          applyCloudProfilePatch(path, data);
        } else if (path.startsWith('/settings') || path === '/settings') {
          applyCloudSettingsPatch(data);
        } else if (path.startsWith('/notifications') || path === '/notifications') {
          applyCloudNotificationsPatch(data);
        } else if (path.startsWith('/following') || path.startsWith('/followers')) {
          applyCloudSocialPatch(path, data);
        }
      } catch (e) {
        console.warn('Realtime event parse note:', e);
      }
    }

    // Zero-latency instant patch for ad cooldown across devices (v0.10.9-33)
    function patchInstantAdCooldownToCloud(timestamp) {
      if (!currentUser || !currentUser.uid || currentUser.uid.startsWith('guest_') || !firebaseConfig.databaseURL) return;
      const authParam = currentUser.idToken ? `?auth=${currentUser.idToken}` : '';
      const nowTs = Number(timestamp) || Date.now();
      try {
        fetch(`${firebaseConfig.databaseURL}/users/${currentUser.uid}/economy.json${authParam}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lastAdWatchTime: nowTs, updatedAt: new Date().toISOString() })
        }).catch(() => {});
      } catch (e) {}
    }
    window.patchInstantAdCooldownToCloud = patchInstantAdCooldownToCloud;

    function applyCloudEconomyPatch(ecoData, path = '') {
      if (ecoData === null || typeof ecoData === 'undefined') return;

      // Handle direct sub-path patch: /economy/lastAdWatchTime
      if (path.includes('lastAdWatchTime') || (typeof ecoData === 'number' && path.includes('lastAdWatchTime'))) {
        const rAd = typeof ecoData === 'number' ? ecoData : parseInt(ecoData, 10);
        const lAd = parseInt(localStorage.getItem('vocaflow_last_ad_watch_time') || '0', 10);
        if (!isNaN(rAd) && rAd > lAd) {
          localStorage.setItem('vocaflow_last_ad_watch_time', rAd.toString());
          if (typeof updateAdButtonCooldownState === 'function') updateAdButtonCooldownState();
          if (typeof updateShopBonusesUI === 'function') updateShopBonusesUI();
        }
        return;
      }

      if (typeof ecoData !== 'object') return;
      const remotePoints = typeof ecoData.points === 'number' ? ecoData.points : parseInt(ecoData.points, 10);
      const remoteHints = typeof ecoData.hints === 'number' ? ecoData.hints : parseInt(ecoData.hints, 10);
      const remoteSkips = typeof ecoData.skips === 'number' ? ecoData.skips : parseInt(ecoData.skips, 10);
      if (!isNaN(remotePoints)) localStorage.setItem(STORAGE_KEY_USER_POINTS, remotePoints.toString());
      if (!isNaN(remoteHints)) localStorage.setItem(STORAGE_KEY_USER_HINTS, remoteHints.toString());
      if (!isNaN(remoteSkips)) localStorage.setItem(STORAGE_KEY_USER_SKIPS, remoteSkips.toString());

      const remoteSpins = typeof ecoData.luckySpins === 'number' ? ecoData.luckySpins : parseInt(ecoData.luckySpins, 10);
      if (!isNaN(remoteSpins)) {
        localStorage.setItem('vocaflow_lucky_spins_left', Math.max(0, remoteSpins).toString());
      }
      if (ecoData.luckySpinsDate) localStorage.setItem('vocaflow_last_spin_date', ecoData.luckySpinsDate);
      if (ecoData.lastVipSpinDate) localStorage.setItem('vocaflow_last_vip_spin_date', ecoData.lastVipSpinDate);
      if (ecoData.lastAdWatchTime) {
        const rAd = parseInt(ecoData.lastAdWatchTime, 10);
        const lAd = parseInt(localStorage.getItem('vocaflow_last_ad_watch_time') || '0', 10);
        if (!isNaN(rAd) && rAd > lAd) localStorage.setItem('vocaflow_last_ad_watch_time', rAd.toString());
      }
      updateEconomyUI();
      if (typeof updateLuckyWheelUI === 'function') updateLuckyWheelUI();
      if (typeof updateShopBonusesUI === 'function') updateShopBonusesUI();
      if (typeof updateAdButtonCooldownState === 'function') updateAdButtonCooldownState();
    }

    function applyCloudFlowPatch(path, data) {
      if (path === '/flowDates' && Array.isArray(data)) {
        const localFlow = getFlowDates();
        const merged = Array.from(new Set([...localFlow, ...data])).sort();
        localStorage.setItem('vocaflow_flow_dates', JSON.stringify(merged));
        localStorage.setItem('vocaflow_study_dates', JSON.stringify(merged));
      } else if (path === '/flowFreezeDates' && Array.isArray(data)) {
        const localFreeze = getFlowFreezeDates();
        const merged = Array.from(new Set([...localFreeze, ...data])).sort();
        localStorage.setItem('vocaflow_flow_freeze_dates', JSON.stringify(merged));
        localStorage.setItem('vocaflow_streak_freeze_history', JSON.stringify(merged));
      } else if (data && typeof data === 'object') {
        if (Array.isArray(data.dates)) {
          const merged = Array.from(new Set([...getFlowDates(), ...data.dates])).sort();
          localStorage.setItem('vocaflow_flow_dates', JSON.stringify(merged));
        }
        if (data.freezes !== undefined) {
          localStorage.setItem('vocaflow_flow_freezes', String(data.freezes));
        }
      }
      updateFlowUI();
      if (typeof renderFlowCalendar === 'function') renderFlowCalendar();
    }

    function applyCloudProfilePatch(path, data) {
      if (!data || typeof data !== 'object' || !currentUser) return;
      let changed = false;
      if (data.displayName && data.displayName !== currentUser.displayName) {
        currentUser.displayName = data.displayName;
        changed = true;
      }
      if (data.username && data.username !== currentUser.username) {
        currentUser.username = data.username;
        changed = true;
      }
      if (data.bio !== undefined && data.bio !== currentUser.bio) {
        currentUser.bio = data.bio;
        localStorage.setItem('vocaflow_user_bio', data.bio);
        changed = true;
      }
      if (data.isVip !== undefined) {
        applyVipState(!!data.isVip, data.vipTier || 'monthly', Number(data.vipExpiresAt || 0), 'realtime_patch', false);
      }
      if (changed) {
        localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(currentUser));
        updateAuthUI();
      }
    }

    function applyCloudSettingsPatch(settingsData) {
      if (!settingsData || typeof settingsData !== 'object') return;
      if (typeof settingsData.showReviewQueue === 'boolean') {
        showReviewQueueSetting = settingsData.showReviewQueue;
        localStorage.setItem(STORAGE_KEY_SHOW_REVIEW_QUEUE, showReviewQueueSetting.toString());
      }
      if (typeof settingsData.showFilterPos === 'boolean') {
        showFilterPosSetting = settingsData.showFilterPos;
        localStorage.setItem(STORAGE_KEY_SHOW_FILTER_POS, showFilterPosSetting.toString());
      }
      if (typeof settingsData.showFilterCefr === 'boolean') {
        showFilterCefrSetting = settingsData.showFilterCefr;
        localStorage.setItem(STORAGE_KEY_SHOW_FILTER_CEFR, showFilterCefrSetting.toString());
      }
      if (typeof settingsData.showFilterScore === 'boolean') {
        showFilterScoreSetting = settingsData.showFilterScore;
        localStorage.setItem(STORAGE_KEY_SHOW_FILTER_SCORE, showFilterScoreSetting.toString());
      }
      if (typeof settingsData.showTimestamp === 'boolean') {
        showTimestampSetting = settingsData.showTimestamp;
        localStorage.setItem(STORAGE_KEY_SHOW_TIMESTAMP, showTimestampSetting ? 'true' : 'false');
        applyTimestampDisplay();
      }
      if (typeof settingsData.vipCatMemesEnabled === 'boolean') {
        localStorage.setItem('vocaflow_vip_cat_memes_enabled', settingsData.vipCatMemesEnabled ? 'true' : 'false');
        const memeChk = document.getElementById('setting-vip-cat-meme');
        if (memeChk) memeChk.checked = settingsData.vipCatMemesEnabled;
        const durationCont = document.getElementById('setting-vip-cat-meme-duration-container');
        if (durationCont) {
          durationCont.style.opacity = settingsData.vipCatMemesEnabled ? '1' : '0.4';
          durationCont.style.pointerEvents = settingsData.vipCatMemesEnabled ? 'auto' : 'none';
        }
      }
      if (typeof settingsData.vipCatMemesDuration === 'number') {
        const dur = Math.max(1.0, Math.min(4.0, settingsData.vipCatMemesDuration));
        localStorage.setItem('vocaflow_vip_cat_memes_duration', dur.toFixed(1));
        const durationSlider = document.getElementById('setting-vip-cat-meme-duration');
        const durationLabel = document.getElementById('vip-cat-meme-duration-label');
        if (durationSlider) durationSlider.value = dur;
        if (durationLabel) durationLabel.textContent = `${dur.toFixed(1)} giây`;
      }
      applyUiFilterSettings();
    }

    function applyCloudNotificationsPatch(notifsData) {
      if (!notifsData || typeof notifsData !== 'object') return;
      const list = Object.values(notifsData).filter(n => n && n.id && !deletedNotificationIds.has(n.id));
      const map = new Map();
      userNotifications.forEach(n => { if (n && n.id) map.set(n.id, n); });
      list.forEach(n => { map.set(n.id, n); });
      userNotifications = Array.from(map.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 100);
      localStorage.setItem('vocaflow_user_notifications', JSON.stringify(userNotifications));
      updateNotificationsUI();
      if (typeof renderNotificationsList === 'function') renderNotificationsList();
    }

    function applyCloudSocialPatch(path, data) {
      if (!data || typeof data !== 'object') return;
      if (path.startsWith('/following')) {
        myFollowingMap = { ...myFollowingMap, ...data };
        if (currentUser && currentUser.uid) delete myFollowingMap[currentUser.uid];
        localStorage.setItem('vocaflow_following_map', JSON.stringify(myFollowingMap));
      } else if (path.startsWith('/followers')) {
        myFollowersMap = { ...myFollowersMap, ...data };
        if (currentUser && currentUser.uid) delete myFollowersMap[currentUser.uid];
        localStorage.setItem('vocaflow_followers_map', JSON.stringify(myFollowersMap));
      }
      if (currentUser) {
        currentUser.followingCount = Object.keys(myFollowingMap).length;
        currentUser.followerCount = Object.keys(myFollowersMap).length;
        localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(currentUser));
        updateAuthUI();
      }
    }

    // =========================================================================
    // REALTIME SYNC & NETWORK STATUS UI ENGINE (v0.10.8-alpha-24)
    // =========================================================================
    function updateSyncStatusUI(status = 'online') {
      const syncIcon = document.getElementById('sync-icon');
      const syncText = document.getElementById('sync-text');
      const syncIconMob = document.getElementById('sync-icon-mobile');
      const syncTextMob = document.getElementById('sync-text-mobile');
      const syncBadge = document.getElementById('sync-status-badge');
      const btnCloudSync = document.getElementById('btn-cloud-sync');

      const isOnline = navigator.onLine;

      if (status === 'syncing') {
        if (syncIcon) syncIcon.textContent = '🔄';
        if (syncText) syncText.textContent = 'Đang đồng bộ...';
        if (syncIconMob) syncIconMob.textContent = '🔄';
        if (syncTextMob) syncTextMob.textContent = 'Đang đồng bộ...';
        if (syncBadge) {
          syncBadge.textContent = 'Đang kết nối Cloud...';
          syncBadge.style.color = '#38bdf8';
        }
        if (btnCloudSync) {
          btnCloudSync.style.borderColor = 'rgba(56, 189, 248, 0.5)';
          btnCloudSync.style.color = '#38bdf8';
        }
        return;
      }

      if (!isOnline || status === 'offline') {
        if (syncIcon) syncIcon.textContent = '☁️';
        if (syncText) syncText.textContent = 'Ngoại tuyến';
        if (syncIconMob) syncIconMob.textContent = '☁️';
        if (syncTextMob) syncTextMob.textContent = 'Ngoại tuyến';
        if (syncBadge) {
          syncBadge.textContent = 'Mất kết nối Internet (Ngoại tuyến)';
          syncBadge.style.color = '#ef4444';
        }
        if (btnCloudSync) {
          btnCloudSync.style.borderColor = 'rgba(245, 158, 11, 0.5)';
          btnCloudSync.style.color = '#fbbf24';
          btnCloudSync.title = 'Mất kết nối Internet - Đang lưu dữ liệu ngoại tuyến';
        }
        return;
      }

      // Online status
      const lastSyncTime = localStorage.getItem(STORAGE_KEY_LAST_SYNC);
      let syncTooltip = 'Trực tuyến • Bấm để đồng bộ Cloud';
      if (lastSyncTime) {
        try {
          const syncDate = new Date(lastSyncTime);
          syncTooltip = `Trực tuyến • Đồng bộ lần cuối: ${syncDate.toLocaleTimeString('vi-VN')}`;
        } catch (e) {}
      }

      if (syncIcon) syncIcon.textContent = '☁️';
      if (syncText) syncText.textContent = 'Trực tuyến';
      if (syncIconMob) syncIconMob.textContent = '☁️';
      if (syncTextMob) syncTextMob.textContent = 'Trực tuyến';
      if (syncBadge) {
        syncBadge.textContent = 'Trực tuyến (Đã kết nối Cloud)';
        syncBadge.style.color = '#10b981';
      }
      if (btnCloudSync) {
        btnCloudSync.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        btnCloudSync.style.color = '#34d399';
        btnCloudSync.title = syncTooltip;
      }
    }
    window.updateSyncStatusUI = updateSyncStatusUI;

    window.addEventListener('online', () => {
      console.log('🌐 [Network] Trình duyệt báo: Trực tuyến (Online)');
      updateSyncStatusUI('online');
      showToast('🌐 Đã kết nối mạng trở lại (Trực tuyến)');
      if (currentUser && currentUser.email && !isSyncing) {
        handleManualSync();
      }
    });

    window.addEventListener('offline', () => {
      console.log('🔌 [Network] Trình duyệt báo: Mất kết nối mạng (Offline)');
      updateSyncStatusUI('offline');
      showToast('⚠️ Mất kết nối Internet (Ngoại tuyến)');
    });

    // =========================================================================
    // BIDIRECTIONAL MERGE & GRANULAR SYNC ENGINE (v0.10.9-alpha-31)
    // =========================================================================
    function mergeCloudDataIntoLocal(cloudData, triggerCloudPush = false) {
      if (!cloudData || typeof cloudData !== 'object') return;

      // 1. Profile DisplayName, Username, Bio & ReferredBy
      const remoteProf = cloudData.profile || {};
      const remoteName = remoteProf.displayName || cloudData.displayName;
      const remoteRef = (remoteProf && remoteProf.referredBy) || cloudData.referredBy;
      if (remoteRef && typeof remoteRef === 'string') {
        localStorage.setItem('vocaflow_referred_by', remoteRef);
        if (currentUser) currentUser.referredBy = remoteRef;
      }

      // 2. VIP State with Bulletproof Monotonic Sync
      if (remoteProf.isVip !== undefined || cloudData.isVip !== undefined) {
        const rIsVip = (remoteProf.isVip !== undefined) ? !!remoteProf.isVip : !!cloudData.isVip;
        const rTier = remoteProf.vipTier || cloudData.vipTier || 'none';
        const rExp = Number(remoteProf.vipExpiresAt || cloudData.vipExpiresAt || 0);
        const isRemoteActive = rIsVip && (rTier === 'lifetime' || rExp > getTrustedCurrentTimestamp());
        
        const localExp = parseInt(localStorage.getItem('vocaflow_user_vip_expires_at') || '0', 10);
        const localTier = localStorage.getItem('vocaflow_user_vip_tier') || 'none';
        const isLocalActive = userIsVip && (localTier === 'lifetime' || localExp > getTrustedCurrentTimestamp());
        
        if (isRemoteActive || isLocalActive) {
          let localIsAhead = false;
          if (localExp > rExp && localTier !== 'none' && localTier !== 'lifetime') localIsAhead = true;
          const tierRanks = { 'none': 0, 'monthly': 1, 'yearly': 2, 'lifetime': 3 };
          if (tierRanks[localTier] > tierRanks[rTier]) localIsAhead = true;

          applyVipState(true, localIsAhead ? localTier : rTier, Math.max(localExp, rExp), 'cloud_pull', false);
        } else {
          applyVipState(false, 'none', 0, 'cloud_pull', true);
        }
      }

      const remoteUsername = remoteProf.username || cloudData.username;
      const remoteLastChange = (remoteProf.lastUsernameChangeTimestamp !== undefined) ? remoteProf.lastUsernameChangeTimestamp : cloudData.lastUsernameChangeTimestamp;
      const remoteBio = (remoteProf.bio !== undefined) ? remoteProf.bio : cloudData.bio;
      if (remoteBio !== undefined && remoteBio !== null) {
        localStorage.setItem('vocaflow_user_bio', remoteBio);
        const bioDisplay = document.getElementById('profile-bio-display');
        if (bioDisplay) bioDisplay.textContent = (typeof remoteBio === 'string' && remoteBio.trim()) ? remoteBio : 'Chưa thiết lập mục tiêu cá nhân.';
        const bioInput = document.getElementById('profile-bio-input');
        if (bioInput) bioInput.value = (typeof remoteBio === 'string') ? remoteBio : '';
      }
      if (currentUser) {
        let profChanged = false;
        if (remoteName && remoteName.trim().length > 0 && remoteName !== currentUser.displayName) {
          currentUser.displayName = remoteName.trim();
          profChanged = true;
        }
        if (remoteUsername && remoteUsername.trim().length >= 3 && remoteUsername !== currentUser.username) {
          currentUser.username = remoteUsername.trim().toLowerCase();
          profChanged = true;
        }
        if (remoteLastChange !== undefined && Number(remoteLastChange) !== currentUser.lastUsernameChangeTimestamp) {
          currentUser.lastUsernameChangeTimestamp = Number(remoteLastChange);
          profChanged = true;
        }
        if (remoteBio !== undefined && remoteBio !== currentUser.bio) {
          currentUser.bio = remoteBio;
          profChanged = true;
        }
        if (profChanged) {
          localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(currentUser));
          updateAuthUI();
        }
      }

      // 3. Gemini API Keys Smart Merge
      function extractKeysList(raw) {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw.map(k => String(k || '').trim()).filter(k => k);
        if (typeof raw === 'object') return Object.values(raw).map(k => String(k || '').trim()).filter(k => k);
        if (typeof raw === 'string' && raw.trim()) return [raw.trim()];
        return [];
      }

      let remoteKeys = extractKeysList(cloudData.geminiApiKeys);
      if (remoteKeys.length === 0 && cloudData.settings) remoteKeys = extractKeysList(cloudData.settings.geminiApiKeys);
      if (remoteKeys.length === 0 && cloudData.profile) remoteKeys = extractKeysList(cloudData.profile.geminiApiKeys);
      if (remoteKeys.length === 0 && cloudData.geminiApiKey) remoteKeys = extractKeysList(cloudData.geminiApiKey);

      const localKeys = getStoredApiKeys(false);
      let mergedKeys = [];
      const combinedKeys = [...remoteKeys, ...localKeys];
      for (const k of combinedKeys) {
        if (k && !mergedKeys.includes(k) && mergedKeys.length < 3) {
          mergedKeys.push(k);
        }
      }

      if (mergedKeys.length > 0) {
        saveApiKeysList(mergedKeys, false);
        updateSettingsApiKeysUI();
      } else if (geminiApiKey) {
        cloudData.geminiApiKey = geminiApiKey;
        cloudData.geminiApiKeys = getStoredApiKeys(false);
      }

      // 4. Decks & Words with Tombstone Guard & Deduplication
      const remoteDecks = Array.isArray(cloudData.decks) ? cloudData.decks : (cloudData.decks ? Object.values(cloudData.decks) : []);
      const remoteWords = Array.isArray(cloudData.words) ? cloudData.words : (cloudData.words ? Object.values(cloudData.words) : []);

      const remoteAvatar = (cloudData.profile && cloudData.profile.avatar) || cloudData.avatar;
      const remoteAvatarTime = parseInt((cloudData.profile && cloudData.profile.avatarTime) || cloudData.avatarTime || '0', 10);
      const localAvatar = localStorage.getItem('vocaflow_user_avatar');
      const localAvatarTime = parseInt(localStorage.getItem('vocaflow_avatar_time') || '0', 10);

      if (remoteAvatar && typeof remoteAvatar === 'string' && (remoteAvatar.startsWith('data:image') || remoteAvatar.startsWith('http'))) {
        if (remoteAvatarTime >= localAvatarTime || localAvatarTime === 0 || !localAvatar) {
          localStorage.setItem('vocaflow_user_avatar', remoteAvatar);
          localStorage.setItem('vocaflow_avatar_time', remoteAvatarTime.toString());
          if (currentUser) {
            currentUser.avatar = remoteAvatar;
            currentUser.avatarTime = remoteAvatarTime;
            localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(currentUser));
          }
          updateAuthUI();
        }
      } else if (localAvatar && (localAvatar.startsWith('data:image') || localAvatar.startsWith('http'))) {
        if (currentUser) {
          currentUser.avatar = localAvatar;
          currentUser.avatarTime = localAvatarTime || Date.now();
          localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(currentUser));
        }
      }

      if (cloudData.deckSort) {
        currentDeckSort = cloudData.deckSort;
        localStorage.setItem('vocaflow_deck_sort', currentDeckSort);
        const sortSelect = document.getElementById('deck-sort-select');
        if (sortSelect) sortSelect.value = currentDeckSort;
      }
      if (cloudData.deckTab && (cloudData.deckTab === 'active' || cloudData.deckTab === 'archived')) {
        currentDeckTab = cloudData.deckTab;
        localStorage.setItem('vocaflow_deck_tab', currentDeckTab);
      }
      if (cloudData.wordFilter) {
        currentWordFilter = cloudData.wordFilter;
        localStorage.setItem('vocaflow_word_filter', currentWordFilter);
      }

      // Merge deleted tombstones from cloud
      if (cloudData.deletedWordIds && Array.isArray(cloudData.deletedWordIds)) {
        cloudData.deletedWordIds.forEach(id => deletedWordIds.add(id));
      }
      if (cloudData.deletedDeckIds && Array.isArray(cloudData.deletedDeckIds)) {
        cloudData.deletedDeckIds.forEach(id => deletedDeckIds.add(id));
      }

      if (deletedDeckIds.has('deck-oxford-starter') && (decks.length <= 1 && remoteDecks.length === 0)) {
        deletedDeckIds.delete('deck-oxford-starter');
      }
      saveDeletedTombstones();

      const survivingDecksByNormTitle = new Map();
      decks.forEach(d => {
        if (d && d.id && !deletedDeckIds.has(d.id)) {
          const nt = normalizeDeckTitleForDedupe(d.title);
          if (nt && !survivingDecksByNormTitle.has(nt)) survivingDecksByNormTitle.set(nt, d);
        }
      });
      remoteDecks.forEach(rd => {
        if (rd && rd.id && !deletedDeckIds.has(rd.id)) {
          const nt = normalizeDeckTitleForDedupe(rd.title);
          if (nt && !survivingDecksByNormTitle.has(nt)) survivingDecksByNormTitle.set(nt, rd);
        }
      });

      const allKnownDecksById = new Map();
      decks.forEach(d => { if (d && d.id) allKnownDecksById.set(d.id, d); });
      remoteDecks.forEach(rd => { if (rd && rd.id) allKnownDecksById.set(rd.id, rd); });

      words.forEach(w => {
        if (w && w.deckId && deletedDeckIds.has(w.deckId)) {
          const oldDeck = allKnownDecksById.get(w.deckId);
          if (oldDeck) {
            const nt = normalizeDeckTitleForDedupe(oldDeck.title);
            const surviving = survivingDecksByNormTitle.get(nt);
            if (surviving) {
              w.deckId = surviving.id;
              deletedWordIds.delete(w.id);
            }
          }
        }
      });

      decks = decks.filter(d => !deletedDeckIds.has(d.id));
      words = words.filter(w => !deletedWordIds.has(w.id) && !deletedDeckIds.has(w.deckId));

      if (remoteDecks.length > 0) {
        const viableRemoteDecks = remoteDecks.filter(rd => rd && rd.id && !deletedDeckIds.has(rd.id));
        if (viableRemoteDecks.length === 0 && decks.length === 0) {
          deletedDeckIds.clear();
          saveDeletedTombstones();
        }

        if (decks.length === 1 && decks[0].id === 'deck-oxford-starter' && remoteDecks.some(rd => rd && rd.id && rd.id !== 'deck-oxford-starter')) {
          decks = [];
          words = words.filter(w => w.deckId !== 'deck-oxford-starter');
        }
      }

      for (const remoteDeck of remoteDecks) {
        if (!remoteDeck || !remoteDeck.id || deletedDeckIds.has(remoteDeck.id)) continue;
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
            // keep local
          } else {
            decks[localIdx] = {
              ...cleanRemote,
              ...localDeck,
              isPinned: localDeck.isPinned === true,
              isArchived: localDeck.isArchived === true
            };
          }
        } else {
          decks.push(cleanRemote);
        }
      }

      if (remoteWords.length > 0) {
        for (const remoteWord of remoteWords) {
          if (!remoteWord || !remoteWord.id || deletedWordIds.has(remoteWord.id)) continue;
          if (deletedDeckIds.has(remoteWord.deckId)) {
            const oldDeck = allKnownDecksById.get(remoteWord.deckId);
            if (oldDeck) {
              const nt = normalizeDeckTitleForDedupe(oldDeck.title);
              const surviving = survivingDecksByNormTitle.get(nt);
              if (surviving) {
                remoteWord.deckId = surviving.id;
              } else {
                continue;
              }
            } else {
              continue;
            }
          }

          const localIdx = words.findIndex(w => w.id === remoteWord.id);
          if (localIdx >= 0) {
            const localWord = words[localIdx];
            const localTime = new Date(localWord.updatedAt || localWord.createdAt || 0).getTime();
            const remoteTime = new Date(remoteWord.updatedAt || remoteWord.createdAt || 0).getTime();

            if (remoteTime > localTime) {
              words[localIdx] = { ...localWord, ...remoteWord };
            } else if (localTime > remoteTime) {
              // keep local
            } else {
              if (localWord.status === 'mastered' || (localWord.status === 'learning' && remoteWord.status === 'newWord')) {
                // keep local
              } else {
                words[localIdx] = { ...localWord, ...remoteWord };
              }
            }
          } else {
            words.push(remoteWord);
          }
        }
      }

      reconcileAllDuplicateDecks(false);
      autoHealOrphanWords(false);
      if (typeof reconcileDuplicateWordsInDecks === 'function') {
        reconcileDuplicateWordsInDecks(null, false);
      }

      // 5. Economy & Ledger
      if (cloudData.economy && typeof cloudData.economy === 'object') {
        applyCloudEconomyPatch(cloudData.economy);
      }

      if (cloudData.ledger && typeof cloudData.ledger === 'object') {
        const cloudEntries = Object.values(cloudData.ledger).filter(e => e && e.timestamp && e.amount !== 0 && e.type !== 'VIP_DAILY_SPIN');
        const map = new Map();
        userLedger.forEach(tx => { if (tx && tx.id && tx.amount !== 0 && tx.type !== 'VIP_DAILY_SPIN') map.set(tx.id, tx); });
        cloudEntries.forEach(tx => { if (tx && tx.id) map.set(tx.id, tx); });
        userLedger = Array.from(map.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        if (userLedger.length > 250) userLedger = userLedger.slice(0, 250);
        localStorage.setItem('vocaflow_user_ledger', JSON.stringify(userLedger));
        if (typeof renderLedgerList === 'function') renderLedgerList();
        if (typeof renderStudioDashboard === 'function') renderStudioDashboard();
      }

      // 6. Settings
      if (cloudData.settings && typeof cloudData.settings === 'object') {
        applyCloudSettingsPatch(cloudData.settings);
      }

      // 7. Purchased Decks
      if (cloudData.purchasedDeckIds && Array.isArray(cloudData.purchasedDeckIds)) {
        cloudData.purchasedDeckIds.forEach(id => { if (id) userPurchasedDeckIds.add(id); });
      } else if (cloudData.purchasedDeckIds && typeof cloudData.purchasedDeckIds === 'object') {
        Object.keys(cloudData.purchasedDeckIds).forEach(id => { if (id) userPurchasedDeckIds.add(id); });
      }

      if (Array.isArray(userLedger)) {
        userLedger.forEach(entry => {
          if (entry && entry.type === 'BUY_DECK' && entry.description) {
            const allD = getAllLibraryDecks();
            allD.forEach(ld => {
              if (ld && ld.id && !isDeckAuthor(ld) && (ld.price > 0 || ld.isVip || ld.isVipOnly || ld.id === 'lib_deck_ielts_45_60') && entry.description.includes(ld.title)) {
                userPurchasedDeckIds.add(ld.id);
              }
            });
          }
        });
      }
      if (Array.isArray(decks)) {
        decks.forEach(d => {
          if (d && d.libSourceId && !isDeckAuthor(d)) {
            const matchedLib = getAllLibraryDecks().find(ld => ld.id === d.libSourceId);
            if (matchedLib && (matchedLib.price > 0 || matchedLib.isVip || matchedLib.isVipOnly || matchedLib.id === 'lib_deck_ielts_45_60') && !isDeckAuthor(matchedLib)) {
              userPurchasedDeckIds.add(d.libSourceId);
            }
          }
        });
      }

      const allDecksRef = getAllLibraryDecks();
      allDecksRef.forEach(d => {
        if (isDeckAuthor(d) && userPurchasedDeckIds.has(d.id)) {
          userPurchasedDeckIds.delete(d.id);
        }
      });

      localStorage.setItem('vocaflow_purchased_decks', JSON.stringify(Array.from(userPurchasedDeckIds)));
      localStorage.setItem('vocaflow_purchased_decks_count', userPurchasedDeckIds.size.toString());
      if (typeof renderPurchasedDecksList === 'function') renderPurchasedDecksList();

      // 8. Claimed Gift Codes
      if (currentUser && currentUser.uid && cloudData.claimedGiftCodes && typeof cloudData.claimedGiftCodes === 'object') {
        const key = 'vocaflow_claimed_giftcodes_' + currentUser.uid;
        const localClaimed = new Set(JSON.parse(localStorage.getItem(key) || '[]'));
        Object.keys(cloudData.claimedGiftCodes).forEach(code => {
          if (code) localClaimed.add(code.toUpperCase());
        });
        localStorage.setItem(key, JSON.stringify(Array.from(localClaimed)));
      }

      // 9. Following & Followers
      if (cloudData.following && typeof cloudData.following === 'object') {
        myFollowingMap = { ...myFollowingMap, ...cloudData.following };
        if (currentUser && currentUser.uid) delete myFollowingMap[currentUser.uid];
        localStorage.setItem('vocaflow_following_map', JSON.stringify(myFollowingMap));
      }
      if (cloudData.followers && typeof cloudData.followers === 'object') {
        myFollowersMap = { ...myFollowersMap, ...cloudData.followers };
        if (currentUser && currentUser.uid) delete myFollowersMap[currentUser.uid];
        localStorage.setItem('vocaflow_followers_map', JSON.stringify(myFollowersMap));
      }
      if (currentUser) {
        const cloudFollowerCount = (cloudData.profile && typeof cloudData.profile.followerCount === 'number')
          ? cloudData.profile.followerCount
          : (typeof cloudData.followerCount === 'number' ? cloudData.followerCount : 0);
        const cloudFollowingCount = (cloudData.profile && typeof cloudData.profile.followingCount === 'number')
          ? cloudData.profile.followingCount
          : (typeof cloudData.followingCount === 'number' ? cloudData.followingCount : 0);

        currentUser.followingCount = Math.max(Object.keys(myFollowingMap).length, cloudFollowingCount, currentUser.followingCount || 0);
        currentUser.followerCount = Math.max(Object.keys(myFollowersMap).length, cloudFollowerCount, currentUser.followerCount || 0);
        localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(currentUser));
        updateAuthUI();
      }

      // 10. AI Chat History: Smart merge preserving local base64 images
      if (Array.isArray(cloudData.aiChatHistory) && cloudData.aiChatHistory.length > 0) {
        const localMap = new Map();
        aiChatHistory.forEach(m => { if (m && m.timestamp) localMap.set(m.timestamp, m); });
        aiChatHistory = cloudData.aiChatHistory.slice(-30).map(cm => {
          const lm = localMap.get(cm.timestamp);
          if (lm && Array.isArray(lm.images) && lm.images.some(i => i.base64)) {
            return { ...cm, images: lm.images };
          }
          return cm;
        });
        saveAiChatHistoryToStorage();
        if (typeof renderAiChatMessages === 'function') renderAiChatMessages();
      }

      // 11. AI Chat Quota
      if (cloudData.aiChatQuota && typeof cloudData.aiChatQuota === 'object') {
        const cloudDate = cloudData.aiChatQuota.dailyDate;
        const cloudCount = Number(cloudData.aiChatQuota.dailyCount) || 0;
        const today = getTodayDateString();

        if (cloudDate === today) {
          if (aiChatDailyDate === today) {
            aiChatDailyCount = Math.max(aiChatDailyCount, cloudCount);
          } else {
            aiChatDailyDate = today;
            aiChatDailyCount = cloudCount;
          }
        } else if (cloudDate && cloudDate > (aiChatDailyDate || '')) {
          aiChatDailyDate = cloudDate;
          aiChatDailyCount = (cloudDate === today) ? cloudCount : 0;
        }

        localStorage.setItem('vocaflow_ai_chat_daily_date', aiChatDailyDate);
        localStorage.setItem('vocaflow_ai_chat_daily_count', aiChatDailyCount.toString());
        if (typeof updateAiChatQuotaUI === 'function') updateAiChatQuotaUI();
      }

      // 12. Achievements & Pinned Badges
      if (cloudData.achievements && typeof cloudData.achievements === 'object') {
        Object.keys(cloudData.achievements).forEach(k => {
          const r = cloudData.achievements[k];
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

      if (Array.isArray(cloudData.pinnedBadges)) {
        userPinnedBadges = [...cloudData.pinnedBadges].slice(0, 3);
        localStorage.setItem('vocaflow_pinned_badges', JSON.stringify(userPinnedBadges));
        renderProfilePinnedBadges();
      } else if (remoteProf && Array.isArray(remoteProf.pinnedBadges)) {
        userPinnedBadges = [...remoteProf.pinnedBadges].slice(0, 3);
        localStorage.setItem('vocaflow_pinned_badges', JSON.stringify(userPinnedBadges));
        renderProfilePinnedBadges();
      }

      // 13. Flow Streak & Freezes
      const remoteFlowDates = Array.isArray(cloudData.flowDates) 
        ? cloudData.flowDates 
        : ((cloudData.flow && Array.isArray(cloudData.flow.dates)) 
          ? cloudData.flow.dates 
          : (Array.isArray(cloudData.studyDates) ? cloudData.studyDates : []));

      if (remoteFlowDates && remoteFlowDates.length > 0) {
        let localFlowDates = getFlowDates();
        const unionSet = new Set([...localFlowDates, ...remoteFlowDates]);
        const mergedFlowDates = Array.from(unionSet).sort();
        localStorage.setItem('vocaflow_flow_dates', JSON.stringify(mergedFlowDates));
        localStorage.setItem('vocaflow_study_dates', JSON.stringify(mergedFlowDates));
      }

      const remoteFreezeDates = Array.isArray(cloudData.flowFreezeDates)
        ? cloudData.flowFreezeDates
        : ((cloudData.flow && Array.isArray(cloudData.flow.freezeDates))
          ? cloudData.flow.freezeDates
          : (Array.isArray(cloudData.streakFreezeHistory) ? cloudData.streakFreezeHistory : []));

      const localFreezeDates = getFlowFreezeDates();
      const unionFreezeSet = new Set([...localFreezeDates, ...remoteFreezeDates]);
      const mergedFreezeDates = Array.from(unionFreezeSet).sort();
      if (mergedFreezeDates.length > 0) {
        localStorage.setItem('vocaflow_flow_freeze_dates', JSON.stringify(mergedFreezeDates));
        localStorage.setItem('vocaflow_streak_freeze_history', JSON.stringify(mergedFreezeDates));
      }

      const remoteFreezes = (cloudData.flowFreezes !== undefined)
        ? parseInt(cloudData.flowFreezes, 10)
        : ((cloudData.flow && cloudData.flow.freezes !== undefined)
          ? parseInt(cloudData.flow.freezes, 10)
          : ((cloudData.economy && cloudData.economy.flowFreezes !== undefined)
            ? parseInt(cloudData.economy.flowFreezes, 10)
            : (cloudData.streakFreezes !== undefined ? parseInt(cloudData.streakFreezes, 10) : NaN)));

      if (!isNaN(remoteFreezes)) {
        const localFreezes = getUserFlowFreezes();
        const maxCap = getMaxFlowFreezes();
        let syncedFreezes = localFreezes;
        const localSet = new Set(localFreezeDates);
        const remoteSet = new Set(remoteFreezeDates);
        const newFromRemote = remoteFreezeDates.filter(d => !localSet.has(d)).length;
        const newFromLocal = localFreezeDates.filter(d => !remoteSet.has(d)).length;

        if (remoteFreezeDates.length === 0 && localFreezeDates.length > 0) {
          syncedFreezes = Math.max(localFreezes, remoteFreezes);
        } else {
          const adjustedRemote = Math.max(0, remoteFreezes - newFromLocal);
          const adjustedLocal = Math.max(0, localFreezes - newFromRemote);
          syncedFreezes = Math.max(adjustedLocal, adjustedRemote);
        }
        syncedFreezes = Math.min(maxCap, Math.max(0, syncedFreezes));

        localStorage.setItem('vocaflow_flow_freezes', syncedFreezes.toString());
        localStorage.setItem('vocaflow_streak_freezes', syncedFreezes.toString());
      }

      updateFlowUI();
      if (typeof renderFlowCalendar === 'function') renderFlowCalendar();

      // 14. Notifications
      const cloudNotifs = (cloudData.notifications && typeof cloudData.notifications === 'object') ? Object.values(cloudData.notifications).filter(n => n && n.id) : [];
      if (cloudData.deletedNotificationIds && typeof cloudData.deletedNotificationIds === 'object') {
        Object.keys(cloudData.deletedNotificationIds).forEach(id => deletedNotificationIds.add(id));
        saveDeletedNotificationIds();
      }
      const cloudClearedTime = Number(cloudData.notificationsClearedTimestamp) || 0;
      const localClearedTime = parseInt(localStorage.getItem('vocaflow_notifications_cleared_time') || '0', 10);
      const effectiveClearedTime = Math.max(cloudClearedTime, localClearedTime);
      if (cloudClearedTime > localClearedTime) {
        localStorage.setItem('vocaflow_notifications_cleared_time', cloudClearedTime.toString());
      }

      const nMergedMap = new Map();
      userNotifications.forEach(n => {
        if (n && n.id && !deletedNotificationIds.has(n.id)) {
          if (effectiveClearedTime === 0 || new Date(n.timestamp).getTime() > effectiveClearedTime) {
            nMergedMap.set(n.id, { ...n });
          }
        }
      });

      cloudNotifs.forEach(cloudN => {
        if (cloudN && cloudN.id && !deletedNotificationIds.has(cloudN.id)) {
          if (effectiveClearedTime === 0 || new Date(cloudN.timestamp).getTime() > effectiveClearedTime) {
            if (!nMergedMap.has(cloudN.id)) {
              nMergedMap.set(cloudN.id, { ...cloudN });
            } else {
              const localN = nMergedMap.get(cloudN.id);
              localN.isRead = (localN.isRead === true) || (cloudN.isRead === true);
              if (cloudN.timestamp) localN.timestamp = cloudN.timestamp;
            }
          }
        }
      });

      userNotifications = deduplicateUserNotifications(Array.from(nMergedMap.values())).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 100);
      localStorage.setItem('vocaflow_notifications', JSON.stringify(userNotifications));
      updateNotificationsUI();
      renderNotificationsList();

      // 15. Mistake Notebook Two-Way Sync (v0.10.9-43)
      if (cloudData.mistakeNotebook !== undefined) {
        try {
          const remoteMistakes = Array.isArray(cloudData.mistakeNotebook)
            ? cloudData.mistakeNotebook
            : (cloudData.mistakeNotebook && typeof cloudData.mistakeNotebook === 'object' ? Object.values(cloudData.mistakeNotebook) : []);
          const localMistakes = getMistakeWordsList();
          const mergedMap = new Map();

          localMistakes.forEach(item => {
            if (item && (item.wordId || item.term)) {
              const key = String(item.wordId || item.term).toLowerCase();
              mergedMap.set(key, { ...item });
            }
          });

          remoteMistakes.forEach(item => {
            if (item && (item.wordId || item.term)) {
              const key = String(item.wordId || item.term).toLowerCase();
              if (mergedMap.has(key)) {
                const existing = mergedMap.get(key);
                const mergedCount = Math.max(parseInt(existing.mistakeCount, 10) || 1, parseInt(item.mistakeCount, 10) || 1);
                const mergedTime = Math.max(existing.lastMistakeAt || 0, item.lastMistakeAt || 0);
                const mergedModes = Array.from(new Set([...(existing.modesFailed || []), ...(item.modesFailed || [])]));
                mergedMap.set(key, {
                  ...existing,
                  ...item,
                  mistakeCount: mergedCount,
                  lastMistakeAt: mergedTime,
                  modesFailed: mergedModes
                });
              } else {
                mergedMap.set(key, { ...item });
              }
            }
          });

          const finalMistakeList = Array.from(mergedMap.values()).sort((a, b) => (b.lastMistakeAt || 0) - (a.lastMistakeAt || 0));
          saveMistakeWordsList(finalMistakeList, false);
          if (typeof renderMistakeNotebookList === 'function') {
            renderMistakeNotebookList();
          }
        } catch (errMistakeMerge) {
          console.warn('Mistake notebook cloud merge error:', errMistakeMerge);
        }
      }

      saveDatabase(triggerCloudPush);
      refreshActiveScreenData();
    }

    // Bidirectional Cloud Sync Engine (Realtime Cloud Database)
    async function handleManualSync(isSilent = false) {
      if (!currentUser || !currentUser.email) {
        if (!isSilent) {
          showToast('🔒 Bạn cần đăng nhập tài khoản để đồng bộ dữ liệu lên Firebase Cloud!');
          openAuthModal('login');
        }
        return;
      }
      if (isSyncing) return;
      isSyncing = true;

      updateSyncStatusUI('syncing');
      if (!isSilent) {
        showToast('⚡ Đang đồng bộ Cloud siêu tốc...');
      }

      try {
        const userId = currentUser ? currentUser.uid : null;
        const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
        const token = typeof getFreshCloudAuthToken === 'function' ? await getFreshCloudAuthToken() : (currentUser && currentUser.idToken ? currentUser.idToken : '');
        const authParam = token ? `?auth=${token}` : '';

        if (userId && rtdbUrl) {
          // PHASE 1: PULL FROM CLOUD (Lightweight without bulky base64 images)
          try {
            const pullRes = await fetch(`${rtdbUrl}/users/${userId}.json${authParam}`);
            if (pullRes.headers && pullRes.headers.get('date')) {
              syncTrustedServerTimeFromHeader(pullRes.headers.get('date'));
            }
            if (pullRes.ok) {
              const cloudData = await pullRes.json();
              if (cloudData && typeof cloudData === 'object') {
                mergeCloudDataIntoLocal(cloudData, false);
              }
            }
          } catch (pullErr) {
            console.warn('Pull from cloud note:', pullErr);
          }

          // PHASE 2: PUSH SANITIZED STATE TO CLOUD
          try {
            await pushCurrentDatabaseToCloud();
          } catch (pushErr) {
            console.warn('Push error:', pushErr);
          }

          // Ensure Live Realtime EventStream is connected
          initFirebaseRealtimeSync(userId, token);
        }

        const nowIso = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY_LAST_SYNC, nowIso);

        updateSyncStatusUI('online');
        if (!isSilent) {
          showToast('✅ Đồng bộ Cloud thành công!');
        }
      } catch (e) {
        console.error('Sync general error:', e);
        updateSyncStatusUI(navigator.onLine ? 'online' : 'offline');
        if (!isSilent) {
          showToast(navigator.onLine ? 'Đã lưu dữ liệu cục bộ an toàn.' : '⚠️ Mất kết nối Internet (Ngoại tuyến).');
        }
      } finally {
        isSyncing = false;
        updateAuthUI();
      }
    }

    // =========================================================================
    // PERIODIC 30-SECOND BIDIRECTIONAL AUTO-SYNC ENGINE (v0.10.9-32)
    // =========================================================================
    let periodicBidirectionalSyncTimer = null;
    function startPeriodicBidirectionalSync() {
      if (periodicBidirectionalSyncTimer) {
        clearInterval(periodicBidirectionalSyncTimer);
        periodicBidirectionalSyncTimer = null;
      }
      periodicBidirectionalSyncTimer = setInterval(() => {
        if (currentUser && currentUser.uid && !currentUser.uid.startsWith('guest_') && navigator.onLine) {
          handleManualSync(true); // silent background 2-way sync every 30s
        }
      }, 30000);
    }

    function stopPeriodicBidirectionalSync() {
      if (periodicBidirectionalSyncTimer) {
        clearInterval(periodicBidirectionalSyncTimer);
        periodicBidirectionalSyncTimer = null;
      }
    }
