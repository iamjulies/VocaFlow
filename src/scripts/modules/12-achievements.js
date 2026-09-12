// =========================================================================

// VOCAFLOW 12-ACHIEVEMENTS.JS (v0.10.9-48)

// Badges, daily tasks, highlights showcase, notifications, VocaMail, User Guide

// =========================================================================

    // =========================================================================
    // NOTIFICATION CENTER & ACTIVITY FEED ENGINE (v0.10.7f-4)
    // =========================================================================
    function copyTextToClipboard(text, successMsg = 'Đã sao chép vào bộ nhớ tạm!') {
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        showToast('📋 ' + successMsg);
      }).catch(() => {
        showToast('📋 ' + text);
      });
    }

    // Global Realtime VIP Registry (v0.10.8-alpha-10.3)
    let globalVipRegistry = {};
    let globalVipRegistryNameMap = {};

    function initGlobalVipRegistry() {
      if (!firebaseConfig.databaseURL) return;
      fetch(`${firebaseConfig.databaseURL}/users.json`)
        .then(res => {
          if (res.headers && res.headers.get('date')) {
            syncTrustedServerTimeFromHeader(res.headers.get('date'));
          }
          return res.ok ? res.json() : null;
        })
        .then(allUsers => {
          if (allUsers && typeof allUsers === 'object') {
            const now = getTrustedCurrentTimestamp();
            Object.entries(allUsers).forEach(([uid, uData]) => {
              if (uData && typeof uData === 'object') {
                const prof = uData.profile || {};
                const rawIsVip = prof.isVip === true || uData.isVip === true;
                const vipTier = prof.vipTier || uData.vipTier || 'none';
                const name = prof.displayName || uData.displayName || '';
                const username = prof.username || uData.username || '';
                const avatar = prof.avatar || uData.avatar || '';
                const vipExpiresAt = Number(prof.vipExpiresAt || uData.vipExpiresAt || 0);

                const isActiveVip = rawIsVip && (vipTier === 'lifetime' || (vipExpiresAt > now));

                const entry = {
                  uid,
                  isVip: isActiveVip,
                  vipTier: isActiveVip ? vipTier : 'none',
                  displayName: name,
                  username,
                  avatar,
                  vipExpiresAt: isActiveVip ? vipExpiresAt : 0
                };
                globalVipRegistry[uid] = entry;
                if (name) globalVipRegistryNameMap[name.trim().toLowerCase()] = entry;
              }
            });
            // Re-render components with fresh VIP data
            renderLibraryDecks();
            if (typeof renderDecks === 'function') renderDecks();
          }
        })
        .catch(() => {});
    }

    function formatVipDurationText(expiresAt, tier) {
      if (tier === 'lifetime' || !expiresAt || expiresAt === 0 || expiresAt === Infinity) {
        return 'Trọn Đời';
      }
      const now = getTrustedCurrentTimestamp();
      const diffMs = Number(expiresAt) - now;
      if (diffMs <= 0) return 'Hết hạn';

      const totalDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const weeks = Math.floor(totalDays / 7);

      if (weeks >= 1) {
        return `${weeks} Tuần`;
      } else {
        return `${Math.max(1, totalDays)} Ngày`;
      }
    }

    function isAuthorVipUser(authorUid, authorName) {
      if (authorUid && currentUser && authorUid === currentUser.uid) return isUserVip();
      if (authorName && currentUser && currentUser.displayName && authorName.trim().toLowerCase() === currentUser.displayName.trim().toLowerCase()) return isUserVip();
      
      const now = getTrustedCurrentTimestamp();
      let entry = null;
      if (authorUid && globalVipRegistry[authorUid]) entry = globalVipRegistry[authorUid];
      else if (authorName && globalVipRegistryNameMap[authorName.trim().toLowerCase()]) entry = globalVipRegistryNameMap[authorName.trim().toLowerCase()];

      if (entry) {
        if (!entry.isVip) return false;
        if (entry.vipTier === 'lifetime') return true;
        const exp = Number(entry.vipExpiresAt || 0);
        return exp > now;
      }

      const student = adminStudentsData.find(s => (authorUid && s.uid === authorUid) || (authorName && s.displayName && s.displayName.trim().toLowerCase() === authorName.trim().toLowerCase()));
      if (student && student.isVip) {
        if (student.vipTier === 'lifetime') return true;
        const exp = Number(student.vipExpiresAt || 0);
        return exp > now;
      }
      return false;
    }

    function getAuthorVipTier(authorUid, authorName) {
      if (!isAuthorVipUser(authorUid, authorName)) return 'none';
      if (authorUid && currentUser && authorUid === currentUser.uid) return getUserVipTier();
      if (authorName && currentUser && currentUser.displayName && authorName.trim().toLowerCase() === currentUser.displayName.trim().toLowerCase()) return getUserVipTier();
      
      if (authorUid && globalVipRegistry[authorUid]) return globalVipRegistry[authorUid].vipTier || 'none';
      if (authorName && globalVipRegistryNameMap[authorName.trim().toLowerCase()]) return globalVipRegistryNameMap[authorName.trim().toLowerCase()].vipTier || 'none';

      const student = adminStudentsData.find(s => (authorUid && s.uid === authorUid) || (authorName && s.displayName && s.displayName.trim().toLowerCase() === authorName.trim().toLowerCase()));
      if (student && student.isVip && student.vipTier) return student.vipTier;
      return 'none';
    }

    function getAuthorVipExpiresAt(authorUid, authorName) {
      if (authorUid && currentUser && authorUid === currentUser.uid) return currentUser.vipExpiresAt || userVipExpiresAt || 0;
      if (authorName && currentUser && currentUser.displayName && authorName.trim().toLowerCase() === currentUser.displayName.trim().toLowerCase()) return currentUser.vipExpiresAt || userVipExpiresAt || 0;
      
      if (authorUid && globalVipRegistry[authorUid]) return globalVipRegistry[authorUid].vipExpiresAt || 0;
      if (authorName && globalVipRegistryNameMap[authorName.trim().toLowerCase()]) return globalVipRegistryNameMap[authorName.trim().toLowerCase()].vipExpiresAt || 0;

      const student = adminStudentsData.find(s => (authorUid && s.uid === authorUid) || (authorName && s.displayName && s.displayName.trim().toLowerCase() === authorName.trim().toLowerCase()));
      if (student && student.isVip && student.vipExpiresAt) return student.vipExpiresAt;
      return 0;
    }

    let userNotifications = [];
    let deletedNotificationIds = new Set();
    let currentNotificationFilter = 'all';

    try {
      const savedNotifs = localStorage.getItem('vocaflow_notifications');
      if (savedNotifs) userNotifications = JSON.parse(savedNotifs) || [];
      const savedDelNotifs = localStorage.getItem('vocaflow_deleted_notif_ids');
      if (savedDelNotifs) deletedNotificationIds = new Set(JSON.parse(savedDelNotifs) || []);
    } catch (e) {}

    function saveDeletedNotificationIds() {
      try {
        localStorage.setItem('vocaflow_deleted_notif_ids', JSON.stringify(Array.from(deletedNotificationIds).slice(-500)));
      } catch (e) {}
    }

    function deduplicateUserNotifications(notifs) {
      if (!Array.isArray(notifs)) return [];
      const seenKeys = new Set();
      const result = [];
      for (const n of notifs) {
        if (!n || !n.id) continue;
        const dayStr = (n.timestamp && typeof n.timestamp === 'string') ? n.timestamp.slice(0, 10) : '';
        // Group by type + title + day
        const dedupeKey = `${n.type || ''}_${n.title || ''}_${dayStr}`;
        if (n.type === 'VIP_BONUS' || n.type === 'SYSTEM' || (n.title && n.title.includes('Quà Tặng VIP Hằng Ngày'))) {
          if (seenKeys.has(dedupeKey)) continue;
          seenKeys.add(dedupeKey);
        }
        result.push(n);
      }
      return result;
    }

    function addNotification(type, title, message, actionType = null, actionData = null, customId = null, customTimestamp = null) {
      const notifId = customId || ('notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
      
      // 1. Never add if deleted by user
      if (deletedNotificationIds.has(notifId)) return null;

      // 2. Check if notification with this ID or duplicate daily bonus already exists
      const todayDayStr = (typeof formatLocalDateString === 'function') ? formatLocalDateString(new Date()) : new Date().toISOString().slice(0, 10);
      const existing = userNotifications.find(n => {
        if (n.id === notifId) return true;
        if (actionType === 'PREVIEW_DECK' && actionData && actionData.deckId && n.actionType === 'PREVIEW_DECK' && n.actionData && n.actionData.deckId === actionData.deckId) return true;
        if (type === 'VIP_BONUS' && (title === n.title || (title && title.includes('Quà Tặng VIP Hằng Ngày') && n.title && n.title.includes('Quà Tặng VIP Hằng Ngày')))) {
          const nDay = (n.timestamp && typeof n.timestamp === 'string') ? n.timestamp.slice(0, 10) : '';
          if (nDay === todayDayStr) return true;
        }
        return false;
      });
      if (existing) return existing;

      const notif = {
        id: notifId,
        type: type, // 'NEW_DECK' | 'NEW_FOLLOWER' | 'FINANCIAL' | 'SYSTEM'
        title: title,
        message: message,
        timestamp: customTimestamp || new Date().toISOString(),
        isRead: false,
        actionType: actionType,
        actionData: actionData
      };

      userNotifications.unshift(notif);
      userNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      if (userNotifications.length > 100) userNotifications = userNotifications.slice(0, 100);
      localStorage.setItem('vocaflow_notifications', JSON.stringify(userNotifications));
      updateNotificationsUI();

      // Cloud backup (using safe PUT for this single notification item)
      if (currentUser && currentUser.uid && !currentUser.uid.startsWith('guest_')) {
        const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
        const authParam = (currentUser && currentUser.idToken) ? '?auth=' + currentUser.idToken : '';
        fetch(`${rtdbUrl}/users/${currentUser.uid}/notifications/${notif.id}.json${authParam}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notif)
        }).catch(() => {});
      }

      return notif;
    }

    async function syncNotificationsWithCloud() {
      if (!currentUser || !currentUser.uid || currentUser.uid.startsWith('guest_')) return;
      const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
      const authParam = (currentUser && currentUser.idToken) ? '?auth=' + currentUser.idToken : '';

      try {
        const [notifsRes, userDocRes, delRes] = await Promise.all([
          fetch(`${rtdbUrl}/users/${currentUser.uid}/notifications.json${authParam}`),
          fetch(`${rtdbUrl}/users/${currentUser.uid}/notificationsClearedTimestamp.json${authParam}`),
          fetch(`${rtdbUrl}/users/${currentUser.uid}/deletedNotificationIds.json${authParam}`)
        ]);

        if (delRes && delRes.ok) {
          const remoteDelIds = await delRes.json();
          if (remoteDelIds && typeof remoteDelIds === 'object') {
            Object.keys(remoteDelIds).forEach(id => deletedNotificationIds.add(id));
            saveDeletedNotificationIds();
          }
        }

        let cloudClearedTime = 0;
        if (userDocRes && userDocRes.ok) {
          const tVal = await userDocRes.json();
          if (typeof tVal === 'number') {
            cloudClearedTime = tVal;
            const localClearedTime = parseInt(localStorage.getItem('vocaflow_notifications_cleared_time') || '0', 10);
            if (cloudClearedTime > localClearedTime) {
              localStorage.setItem('vocaflow_notifications_cleared_time', cloudClearedTime.toString());
            }
          }
        }

        const effectiveClearedTime = Math.max(cloudClearedTime, parseInt(localStorage.getItem('vocaflow_notifications_cleared_time') || '0', 10));

        if (notifsRes && notifsRes.ok) {
          const data = await notifsRes.json();
          const cloudMap = (data && typeof data === 'object') ? data : {};
          const cloudList = Object.values(cloudMap).filter(n => n && n.id);

          const mergedMap = new Map();

          // 1. Keep local valid notifications
          userNotifications.forEach(n => {
            if (n && n.id && !deletedNotificationIds.has(n.id)) {
              if (effectiveClearedTime === 0 || new Date(n.timestamp).getTime() > effectiveClearedTime) {
                mergedMap.set(n.id, { ...n });
              }
            }
          });

          // 2. Merge cloud notifications
          cloudList.forEach(cloudN => {
            if (cloudN && cloudN.id && !deletedNotificationIds.has(cloudN.id)) {
              if (effectiveClearedTime === 0 || new Date(cloudN.timestamp).getTime() > effectiveClearedTime) {
                if (!mergedMap.has(cloudN.id)) {
                  mergedMap.set(cloudN.id, { ...cloudN });
                } else {
                  const localN = mergedMap.get(cloudN.id);
                  // Strict read status sync: If read anywhere, it becomes read!
                  localN.isRead = (localN.isRead === true) || (cloudN.isRead === true);
                  if (cloudN.timestamp) localN.timestamp = cloudN.timestamp;
                }
              }
            }
          });

          userNotifications = deduplicateUserNotifications(Array.from(mergedMap.values()))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 100);

          localStorage.setItem('vocaflow_notifications', JSON.stringify(userNotifications));
          updateNotificationsUI();
          renderNotificationsList();

          // Sync back read state to cloud if local was read but cloud was unread
          const patchObj = {};
          let hasPatch = false;
          userNotifications.forEach(n => {
            if (cloudMap[n.id] && cloudMap[n.id].isRead !== n.isRead) {
              patchObj[`users/${currentUser.uid}/notifications/${n.id}/isRead`] = n.isRead;
              hasPatch = true;
            }
          });
          if (hasPatch) {
            fetch(`${rtdbUrl}/.json${authParam}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(patchObj)
            }).catch(() => {});
          }
        }
      } catch (e) {
        console.warn('Notifications cloud sync notice:', e);
      }
    }

    function checkFollowedCreatorsNewDecks() {
      if (!Array.isArray(cloudLibraryDecks) || cloudLibraryDecks.length === 0) return;
      const followingUids = Object.keys(myFollowingMap || {});
      if (followingUids.length === 0) return;

      const clearedTime = parseInt(localStorage.getItem('vocaflow_notifications_cleared_time') || '0', 10);

      cloudLibraryDecks.forEach(deck => {
        if (!deck || !deck.authorUid || deck.authorUid === currentUser?.uid) return;
        if (myFollowingMap[deck.authorUid]) {
          // Deterministic notification ID per published deck
          const notifId = 'notif_deck_' + deck.id;

          // 1. Skip if user previously deleted this notification
          if (deletedNotificationIds.has(notifId)) return;

          // 2. Skip if already exists in notifications list
          const existing = userNotifications.find(n => n.id === notifId || (n.actionType === 'PREVIEW_DECK' && n.actionData && n.actionData.deckId === deck.id));
          if (existing) return;

          // 3. Resolve exact creation/publication timestamp of the deck
          const deckTimestamp = deck.publishedAt || deck.createdAt || deck.updatedAt || new Date().toISOString();
          const deckTimeMs = new Date(deckTimestamp).getTime();

          // 4. Skip if this deck was published before user cleared their notifications
          if (clearedTime > 0 && deckTimeMs <= clearedTime) return;

          const authorDisplay = deck.author || (deck.authorUsername ? ('@' + deck.authorUsername) : 'Tác giả');
          const authorHandle = deck.authorUsername ? ('@' + deck.authorUsername) : '';
          const notifTitle = `📘 VocaDeck mới từ ${authorHandle || authorDisplay}`;
          const notifMessage = `Tác giả ${authorDisplay} vừa xuất bản VocaDeck mới: "${deck.title}". Nhấn để xem ngay!`;
          
          addNotification('NEW_DECK', notifTitle, notifMessage, 'PREVIEW_DECK', {
            deckId: deck.id,
            deckTitle: deck.title,
            author: deck.author,
            authorUid: deck.authorUid
          }, notifId, deckTimestamp);
        }
      });
    }

    function markAllNotificationsReadSilently() {
      let changed = false;
      userNotifications.forEach(n => {
        if (!n.isRead) {
          n.isRead = true;
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem('vocaflow_notifications', JSON.stringify(userNotifications));
        updateNotificationsUI();
        if (currentUser && currentUser.uid && !currentUser.uid.startsWith('guest_')) {
          const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
          const authParam = (currentUser && currentUser.idToken) ? '?auth=' + currentUser.idToken : '';
          const patch = {};
          userNotifications.forEach(n => {
            patch[`users/${currentUser.uid}/notifications/${n.id}/isRead`] = true;
          });
          fetch(`${rtdbUrl}/.json${authParam}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch)
          }).catch(() => {});
        }
      }
    }

    function openNotificationsModal() {
      const isGuest = !currentUser || !currentUser.email;
      const gView = document.getElementById('notif-guest-lock-view');
      const aView = document.getElementById('notif-main-authenticated-view');
      if (isGuest) {
        if (gView) gView.style.display = 'block';
        if (aView) aView.style.display = 'none';
        openModal('modal-notifications');
        return;
      }
      if (gView) gView.style.display = 'none';
      if (aView) aView.style.display = 'flex';

      // v0.10.9-33: Automatically clear badges & mark all as read upon opening without requiring manual button click
      markAllNotificationsReadSilently();
      updateNotificationsUI();
      renderNotificationsList();
      openModal('modal-notifications');
    }

    function setNotificationFilter(filter) {
      currentNotificationFilter = filter;
      document.querySelectorAll('#notif-filter-tabs .notif-tab-btn').forEach(btn => {
        if (btn.getAttribute('data-filter') === filter) {
          btn.className = 'btn btn-sm btn-primary notif-tab-btn active';
        } else {
          btn.className = 'btn btn-sm btn-outline notif-tab-btn';
        }
      });
      renderNotificationsList();
    }

    function updateNotificationsUI() {
      const unreadCount = userNotifications.filter(n => !n.isRead).length;
      
      const badgeHeader = document.getElementById('header-notif-badge');
      if (badgeHeader) {
        if (unreadCount > 0) {
          badgeHeader.style.display = 'flex';
          badgeHeader.textContent = unreadCount > 99 ? '99+' : unreadCount;
        } else {
          badgeHeader.style.display = 'none';
        }
      }

      const badgeMobile = document.getElementById('mobile-notif-badge');
      if (badgeMobile) {
        if (unreadCount > 0) {
          badgeMobile.style.display = 'inline-block';
          badgeMobile.textContent = unreadCount > 99 ? '99+' : unreadCount;
        } else {
          badgeMobile.style.display = 'none';
        }
      }
    }

    function renderNotificationsList() {
      userNotifications = deduplicateUserNotifications(userNotifications);
      const container = document.getElementById('notifications-list-container');
      if (!container) return;

      let list = [...userNotifications];
      if (currentNotificationFilter !== 'all') {
        list = list.filter(n => {
          const type = n.type || '';
          const title = (n.title || '').toLowerCase();
          const actionType = n.actionType || '';
          if (currentNotificationFilter === 'REWARD') {
            return type === 'REWARD' || type === 'VIP_BONUS' || type === 'STUDY' || n.rewardType ||
                   title.includes('thưởng') || title.includes('quà') || title.includes('trúng') ||
                   title.includes('spin') || title.includes('quảng cáo') || title.includes('vòng quay');
          }
          if (currentNotificationFilter === 'FINANCIAL') {
            return type === 'FINANCIAL' || title.includes('vocoin') || title.includes('ví') ||
                   title.includes('mua') || title.includes('thanh toán') || title.includes('nạp');
          }
          if (currentNotificationFilter === 'NEW_DECK') {
            return type === 'NEW_DECK' || (actionType === 'PREVIEW_DECK' && !title.includes('mua'));
          }
          if (currentNotificationFilter === 'NEW_FOLLOWER') {
            return type === 'NEW_FOLLOWER' || type === 'VOCAMAIL' || actionType === 'VIEW_PROFILE' || title.includes('theo dõi');
          }
          if (currentNotificationFilter === 'SYSTEM') {
            return type === 'SYSTEM' || type === 'BUG_REPORT' || title.includes('báo cáo') ||
                   title.includes('sự cố') || title.includes('hệ thống') || title.includes('admin');
          }
          return type === currentNotificationFilter;
        });
      }

      if (list.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 40px 10px; color: var(--text-muted);">
            <div style="font-size: 36px; margin-bottom: 8px;">🔔</div>
            <div style="font-size: 14px; font-weight: 700; color: var(--text);">Không có thông báo nào trong mục này</div>
            <div style="font-size: 12px; margin-top: 4px; color: var(--text-muted);">Các cập nhật từ tác giả bạn theo dõi, quà tặng & biến động tài khoản sẽ hiển thị tại đây.</div>
          </div>
        `;
        return;
      }

      let html = '';
      list.forEach(n => {
        const isUnread = !n.isRead;
        let typeIcon = '🔔';
        let typeColor = '#38bdf8';
        let typeBg = 'rgba(56,189,248,0.12)';
        let typeBorder = 'rgba(56,189,248,0.3)';

        const tLower = (n.title || '').toLowerCase();
        if (n.type === 'NEW_DECK' || (n.actionType === 'PREVIEW_DECK' && !tLower.includes('mua'))) {
          typeIcon = '📘';
          typeColor = '#818cf8';
          typeBg = 'rgba(99,102,241,0.12)';
          typeBorder = 'rgba(99,102,241,0.3)';
        } else if (n.type === 'NEW_FOLLOWER' || n.actionType === 'VIEW_PROFILE') {
          typeIcon = '👥';
          typeColor = '#34d399';
          typeBg = 'rgba(16,185,129,0.12)';
          typeBorder = 'rgba(16,185,129,0.3)';
        } else if (n.type === 'VIP_BONUS' || tLower.includes('vip') || tLower.includes('quà tân thủ')) {
          typeIcon = '👑';
          typeColor = '#fbbf24';
          typeBg = 'rgba(245,158,11,0.15)';
          typeBorder = 'rgba(245,158,11,0.4)';
        } else if (n.type === 'REWARD' || n.type === 'STUDY' || n.rewardType || tLower.includes('thưởng') || tLower.includes('quà') || tLower.includes('trúng') || tLower.includes('spin') || tLower.includes('quảng cáo')) {
          typeIcon = tLower.includes('quảng cáo') ? '🎬' : (tLower.includes('vòng quay') || tLower.includes('spin') ? '🎡' : (tLower.includes('skip') ? '⏭️' : (tLower.includes('hint') ? '💡' : '🎁')));
          typeColor = '#f472b6';
          typeBg = 'rgba(244,114,182,0.12)';
          typeBorder = 'rgba(244,114,182,0.35)';
        } else if (n.type === 'FINANCIAL' || tLower.includes('vocoin') || tLower.includes('ví') || tLower.includes('mua') || tLower.includes('thanh toán')) {
          typeIcon = tLower.includes('thanh toán') || tLower.includes('thẻ') ? '💳' : (tLower.includes('mua') ? '🛒' : '💎');
          typeColor = '#fbbf24';
          typeBg = 'rgba(245,158,11,0.12)';
          typeBorder = 'rgba(245,158,11,0.3)';
        } else if (n.type === 'VOCAMAIL') {
          typeIcon = '✉️';
          typeColor = '#c084fc';
          typeBg = 'rgba(168,85,247,0.12)';
          typeBorder = 'rgba(168,85,247,0.3)';
        } else if (n.type === 'SYSTEM' || n.type === 'BUG_REPORT' || tLower.includes('báo cáo') || tLower.includes('sự cố')) {
          typeIcon = tLower.includes('báo cáo') || tLower.includes('sự cố') ? '🐛' : '🔔';
          typeColor = '#38bdf8';
          typeBg = 'rgba(56,189,248,0.12)';
          typeBorder = 'rgba(56,189,248,0.3)';
        }

        const timeStr = formatRelativeTime(n.timestamp);

        html += `
          <div class="notification-item" onclick="handleNotificationClick('${n.id}')" style="background: ${isUnread ? 'rgba(99,102,241,0.08)' : 'var(--surface-elevated)'}; border: 1px solid ${isUnread ? 'rgba(99,102,241,0.4)' : 'var(--border)'}; border-radius: 12px; padding: 12px 14px; display: flex; gap: 12px; align-items: flex-start; cursor: pointer; transition: all 0.2s; position: relative;">
            ${isUnread ? '<div style="position: absolute; top: 12px; right: 36px; width: 8px; height: 8px; border-radius: 50%; background: #38bdf8; box-shadow: 0 0 8px #38bdf8;"></div>' : ''}
            <div style="width: 38px; height: 38px; min-width: 38px; min-height: 38px; border-radius: 10px; background: ${typeBg}; border: 1px solid ${typeBorder}; display: flex; align-items: center; justify-content: center; font-size: 18px;">
              ${typeIcon}
            </div>
            <div style="flex: 1; min-width: 0; padding-right: 28px;">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 2px;">
                <div style="font-weight: 700; font-size: 13px; color: ${isUnread ? 'var(--text)' : 'var(--text-muted)'};">${escapeHtml(n.title)}</div>
              </div>
              <div style="font-size: 12px; color: ${isUnread ? 'var(--text)' : 'var(--text-muted)'}; line-height: 1.4; margin-bottom: 4px;">
                ${escapeHtml(n.message || n.content || '')}
              </div>
              ${(n.rewardType || (n.title && n.title.includes('Thưởng'))) ? `
                <div style="margin: 4px 0; display: inline-flex; align-items: center; gap: 4px; background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.3); border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 700; color: #fbbf24;">
                  <span>🎁 Quà tặng:</span> <span>${n.rewardAmount ? ('+' + n.rewardAmount + ' ' + (n.rewardType === 'vip' ? 'Ngày VocaVIP' : (n.rewardType === 'hints' ? 'VocaHint' : (n.rewardType === 'skips' ? 'VocaSkip' : (n.rewardType === 'spins' ? 'VocaSpin' : 'VoCoin'))))) : 'Đã cộng vào tài khoản'}</span>
                </div>
              ` : ''}
              <div style="font-size: 10.5px; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
                <span>🕒</span> <span>${timeStr}</span>
                <span style="color: #38bdf8; margin-left: 6px; font-weight: 600;">• Chạm để xem</span>
              </div>
            </div>
            <button type="button" class="btn btn-outline btn-icon" onclick="deleteSingleNotification('${n.id}', event)" title="Xóa thông báo này" style="position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; padding: 0; border: none; background: transparent; color: var(--text-muted); font-size: 13px; opacity: 0.6;" onmouseenter="this.style.opacity='1'; this.style.color='#f87171'" onmouseleave="this.style.opacity='0.6'; this.style.color='var(--text-muted)'">
              🗑️
            </button>
          </div>
        `;
      });

      container.innerHTML = html;
    }

    function formatRelativeTime(isoString) {
      if (!isoString) return '';
      const date = new Date(isoString);
      const diff = Math.floor((Date.now() - date.getTime()) / 1000);
      if (isNaN(diff)) return '';
      if (diff < 60) return 'Vừa xong';
      if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
      if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
      if (diff < 259200) return `${Math.floor(diff / 86400)} ngày trước`;
      return date.toLocaleDateString('vi-VN');
    }

    function handleNotificationClick(notifId) {
      const notif = userNotifications.find(n => n.id === notifId);
      if (!notif) return;

      if (!notif.isRead) {
        notif.isRead = true;
        localStorage.setItem('vocaflow_notifications', JSON.stringify(userNotifications));
        updateNotificationsUI();
        renderNotificationsList();

        if (currentUser && currentUser.uid && !currentUser.uid.startsWith('guest_')) {
          const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
          const authParam = (currentUser && currentUser.idToken) ? '?auth=' + currentUser.idToken : '';
          fetch(`${rtdbUrl}/users/${currentUser.uid}/notifications/${notif.id}/isRead.json${authParam}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(true)
          }).catch(() => {});
        }
      }

      closeModal('modal-notifications');

      const aType = notif.actionType || '';
      const nType = notif.type || '';
      const title = (notif.title || '').toLowerCase();
      const message = (notif.message || notif.content || '').toLowerCase();

      // 1. Deck preview / Deck details
      if ((aType === 'PREVIEW_DECK' || nType === 'NEW_DECK' || title.includes('vocadeck') || title.includes('bộ từ')) && notif.actionData && notif.actionData.deckId) {
        previewLibraryDeck(notif.actionData.deckId, 'modal-notifications');
        return;
      }

      // 2. Profile / Follower
      if ((aType === 'VIEW_PROFILE' || nType === 'NEW_FOLLOWER' || title.includes('theo dõi')) && notif.actionData && notif.actionData.targetUid) {
        openPublicProfileModal(notif.actionData.targetName || 'Thành viên', notif.actionData.targetUid, '', 'modal-notifications');
        return;
      }

      // 3. VIP / Premium
      if (aType === 'OPEN_VIP' || nType === 'VIP_BONUS' || title.includes('vocavip') || title.includes('vip') || title.includes('hoàng gia')) {
        openVipPricingModal();
        return;
      }

      // 4. Lucky Wheel / VocaSpin / Ads
      if (aType === 'OPEN_WHEEL' || title.includes('spin') || title.includes('quảng cáo') || title.includes('vocaspin') || title.includes('vòng quay') || title.includes('trúng')) {
        openLuckyWheelModal();
        return;
      }

      // 5. Wallet Studio / Economy / Shop
      if (aType === 'OPEN_WALLET' || nType === 'FINANCIAL' || title.includes('ví') || title.includes('vocoin') || title.includes('nạp tiền') || title.includes('mua') || title.includes('xu')) {
        if (title.includes('mua vocaspin') || title.includes('vocashop') || title.includes('cửa hàng')) {
          openShopModal();
        } else {
          openWalletStudioModal();
        }
        return;
      }

      // 6. Bug report / Bounty
      if (aType === 'OPEN_BUG' || nType === 'BUG_REPORT' || title.includes('sự cố') || title.includes('báo cáo') || title.includes('lỗi')) {
        openBugReportModal();
        return;
      }

      // 7. VocaMail / Admin
      if (aType === 'OPEN_VOCAMAIL' || nType === 'VOCAMAIL' || title.includes('vocamail') || title.includes('thư')) {
        openVocaMailModal('history');
        return;
      }

      // 8. Achievements
      if (aType === 'OPEN_ACHIEVEMENTS' || title.includes('danh hiệu') || title.includes('thành tựu') || title.includes('huy hiệu')) {
        openAchievementsModal();
        return;
      }

      // 9. Flow / Streak
      if (aType === 'OPEN_FLOW' || title.includes('flow') || title.includes('streak') || title.includes('chuỗi')) {
        openFlowCalendarModal();
        return;
      }

      // 10. Study mode / Default deck screen
      if (nType === 'STUDY' || title.includes('học') || title.includes('luyện')) {
        showScreen('screen-decks');
        return;
      }

      // Fallback
      showScreen('screen-decks');
    }

    function markAllNotificationsRead() {
      let changed = false;
      userNotifications.forEach(n => {
        if (!n.isRead) {
          n.isRead = true;
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem('vocaflow_notifications', JSON.stringify(userNotifications));
        updateNotificationsUI();
        renderNotificationsList();
        showToast('✓ Đã đánh dấu tất cả thông báo là đã đọc.');

        if (currentUser && currentUser.uid && !currentUser.uid.startsWith('guest_')) {
          const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
          const authParam = (currentUser && currentUser.idToken) ? '?auth=' + currentUser.idToken : '';
          const patch = {};
          userNotifications.forEach(n => {
            patch[`users/${currentUser.uid}/notifications/${n.id}/isRead`] = true;
          });
          fetch(`${rtdbUrl}/.json${authParam}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch)
          }).catch(() => {});
        }
      }
    }

    function deleteSingleNotification(notifId, event = null) {
      if (event) event.stopPropagation();
      deletedNotificationIds.add(notifId);
      saveDeletedNotificationIds();

      userNotifications = userNotifications.filter(n => n.id !== notifId);
      localStorage.setItem('vocaflow_notifications', JSON.stringify(userNotifications));
      updateNotificationsUI();
      renderNotificationsList();

      if (currentUser && currentUser.uid && !currentUser.uid.startsWith('guest_')) {
        const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
        const authParam = (currentUser && currentUser.idToken) ? '?auth=' + currentUser.idToken : '';
        const patchObj = {
          [`users/${currentUser.uid}/notifications/${notifId}`]: null,
          [`users/${currentUser.uid}/deletedNotificationIds/${notifId}`]: true
        };
        fetch(`${rtdbUrl}/.json${authParam}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchObj)
        }).catch(() => {});
      }
    }

    function clearAllNotifications() {
      if (userNotifications.length === 0) return;
      if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách thông báo?')) return;
      
      const nowMs = Date.now();
      localStorage.setItem('vocaflow_notifications_cleared_time', nowMs.toString());
      userNotifications.forEach(n => deletedNotificationIds.add(n.id));
      saveDeletedNotificationIds();

      userNotifications = [];
      localStorage.setItem('vocaflow_notifications', JSON.stringify(userNotifications));
      updateNotificationsUI();
      renderNotificationsList();
      showToast('🗑️ Đã xóa toàn bộ thông báo.');

      if (currentUser && currentUser.uid && !currentUser.uid.startsWith('guest_')) {
        const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
        const authParam = (currentUser && currentUser.idToken) ? '?auth=' + currentUser.idToken : '';
        const patchObj = {
          [`users/${currentUser.uid}/notifications`]: null,
          [`users/${currentUser.uid}/notificationsClearedTimestamp`]: nowMs
        };
        fetch(`${rtdbUrl}/.json${authParam}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchObj)
        }).catch(() => {});
      }
    }


    // =========================================================================
    // BUG REPORT & MULTI-SCREENSHOT ENGINE (v0.10.8-alpha-10.3)
    // =========================================================================
    let recentJsErrorsList = [];
    let currentBugScreenshotBase64 = null;
    let adminBugReportsData = [];
    let currentAdminBugFilter = 'all';
    let currentBugReportScreenshots = []; // Array of Base64 data URLs (max 5)
    let currentBugViewerReport = null;
    let activeBugViewerImages = [];
    let currentBugViewerIndex = 0;

    // Global Javascript runtime error capture
    window.addEventListener('error', (e) => {
      try {
        recentJsErrorsList.push({
          msg: e.message || 'Unknown error',
          file: e.filename ? e.filename.split('/').pop() : 'inline',
          line: e.lineno,
          col: e.colno,
          time: new Date().toISOString()
        });
        if (recentJsErrorsList.length > 5) recentJsErrorsList.shift();
      } catch (err) {}
    });

    function getSystemDiagnosticsInfo() {
      const isOnline = navigator.onLine;
      const ua = navigator.userAgent || 'Unknown';
      const screenRes = `${window.innerWidth}x${window.innerHeight} (Màn hình: ${screen.width}x${screen.height})`;
      const memoryUsage = (performance && performance.memory) ? `${Math.round(performance.memory.usedJSHeapSize / (1024 * 1024))}MB` : 'N/A';
      const version = 'v0.10.8-alpha-10.3 (Build 208)';
      const user = currentUser ? `${currentUser.displayName || currentUser.email || 'Khách'} (${currentUser.uid})` : 'Chưa đăng nhập';
      const isVip = (typeof isUserVip === 'function' && isUserVip()) ? `VIP (${typeof getUserVipTier === 'function' ? getUserVipTier() : 'Active'})` : 'Free';
      const lastError = recentJsErrorsList.length > 0 ? JSON.stringify(recentJsErrorsList[recentJsErrorsList.length - 1]) : 'Không có lỗi JS nào';

      return {
        version,
        platform: navigator.platform || 'Windows',
        userAgent: ua,
        screenResolution: screenRes,
        memoryUsage,
        isOnline,
        user,
        isVip,
        lastJsError: lastError,
        timestamp: new Date().toISOString()
      };
    }

    function escapeJsString(str) {
      if (!str) return '';
      return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
    }

    async function getFreshCloudAuthToken() {
      if (window.firebase && firebase.auth && firebase.auth().currentUser) {
        try {
          const freshToken = await firebase.auth().currentUser.getIdToken(false);
          if (currentUser) currentUser.idToken = freshToken;
          return freshToken;
        } catch (e) {}
      }
      return (currentUser && currentUser.idToken) ? currentUser.idToken : '';
    }

    function openBugBountyModal() { openBugReportModal(); }
    function openBugReportModal() {
      currentBugReportScreenshots = [];
      renderBugReportScreenshotsList();

      const titleInput = document.getElementById('bug-report-title');
      const descInput = document.getElementById('bug-report-desc');
      if (titleInput) titleInput.value = '';
      if (descInput) descInput.value = '';

      const diagEl = document.getElementById('bug-diagnostics-preview');
      if (diagEl) {
        const diag = getSystemDiagnosticsInfo();
        diagEl.textContent = JSON.stringify(diag, null, 2);
      }

      const isGuest = !currentUser || !currentUser.uid || currentUser.uid === 'GUEST' || currentUser.uid.startsWith('guest_');
      const guestLockView = document.getElementById('bug-guest-lock-view');
      const mainAuthView = document.getElementById('bug-main-authenticated-view');

      if (isGuest) {
        if (guestLockView) guestLockView.style.display = 'block';
        if (mainAuthView) mainAuthView.style.display = 'none';
      } else {
        if (guestLockView) guestLockView.style.display = 'none';
        if (mainAuthView) mainAuthView.style.display = 'flex';
      }

      openModal('modal-bug-report');
    }

    function updateBugSeverityUI() {
      const sev = document.querySelector('input[name="bug-severity"]:checked')?.value || 'low';
      const lowLabel = document.getElementById('bug-sev-low-label');
      const medLabel = document.getElementById('bug-sev-med-label');
      const highLabel = document.getElementById('bug-sev-high-label');

      if (lowLabel) {
        lowLabel.style.borderColor = sev === 'low' ? 'rgba(16,185,129,0.5)' : 'var(--border)';
        lowLabel.style.background = sev === 'low' ? 'rgba(16,185,129,0.15)' : 'transparent';
        lowLabel.style.color = sev === 'low' ? '#34d399' : 'var(--text-muted)';
      }
      if (medLabel) {
        medLabel.style.borderColor = sev === 'medium' ? 'rgba(245,158,11,0.5)' : 'var(--border)';
        medLabel.style.background = sev === 'medium' ? 'rgba(245,158,11,0.15)' : 'transparent';
        medLabel.style.color = sev === 'medium' ? '#fbbf24' : 'var(--text-muted)';
      }
      if (highLabel) {
        highLabel.style.borderColor = sev === 'high' ? 'rgba(239,68,68,0.5)' : 'var(--border)';
        highLabel.style.background = sev === 'high' ? 'rgba(239,68,68,0.15)' : 'transparent';
        highLabel.style.color = sev === 'high' ? '#f87171' : 'var(--text-muted)';
      }
    }

    function handleBugScreenshotFiles(input) {
      if (input.files && input.files.length > 0) {
        const remainingSlots = 5 - currentBugReportScreenshots.length;
        if (remainingSlots <= 0) {
          alert('⚠️ Bạn đã thêm tối đa 5 ảnh chụp màn hình!');
          return;
        }

        const filesToProcess = Array.from(input.files).slice(0, remainingSlots);
        filesToProcess.forEach(file => {
          if (file.size > 4 * 1024 * 1024) {
            alert(`⚠️ Ảnh "${file.name}" quá lớn (vui lòng chọn ảnh dưới 4MB)!`);
            return;
          }
          const reader = new FileReader();
          reader.onload = function(e) {
            addBugReportScreenshot(e.target.result);
          };
          reader.readAsDataURL(file);
        });
        input.value = '';
      }
    }

    function addBugReportScreenshot(base64) {
      if (currentBugReportScreenshots.length >= 5) {
        showToast('⚠️ Đã đạt giới hạn tối đa 5 ảnh!');
        return;
      }
      currentBugReportScreenshots.push(base64);
      renderBugReportScreenshotsList();
    }

    function removeBugReportScreenshotAt(index) {
      if (index >= 0 && index < currentBugReportScreenshots.length) {
        currentBugReportScreenshots.splice(index, 1);
        renderBugReportScreenshotsList();
      }
    }

    function renderBugReportScreenshotsList() {
      const container = document.getElementById('bug-screenshots-container');
      const countLabel = document.getElementById('bug-screenshot-count-label');
      const addBtn = document.getElementById('btn-add-bug-screenshot');

      if (countLabel) countLabel.textContent = `${currentBugReportScreenshots.length}/5`;
      if (addBtn) addBtn.style.display = currentBugReportScreenshots.length >= 5 ? 'none' : 'flex';

      if (!container) return;
      if (currentBugReportScreenshots.length === 0) {
        container.innerHTML = '';
        return;
      }

      let html = '';
      currentBugReportScreenshots.forEach((src, idx) => {
        html += `
          <div style="position: relative; width: 72px; height: 72px; border-radius: 8px; overflow: hidden; border: 1.5px solid var(--border); background: rgba(0,0,0,0.3); flex-shrink: 0;">
            <img src="${src}" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;" onclick="openBugScreenshotViewerFromList(currentBugReportScreenshots, ${idx})" title="Bấm để phóng to ảnh #${idx + 1}">
            <button type="button" onclick="removeBugReportScreenshotAt(${idx})" style="position: absolute; top: 2px; right: 2px; background: rgba(239,68,68,0.85); color: #fff; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1;" title="Xóa ảnh này">✕</button>
          </div>
        `;
      });

      container.innerHTML = html;
    }

    // Paste screenshot from clipboard into bug report textarea
    window.addEventListener('paste', function(e) {
      const bugModal = document.getElementById('modal-bug-report');
      if (bugModal && bugModal.classList.contains('active')) {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (const item of items) {
          if (item.kind === 'file' && item.type.startsWith('image/')) {
            const blob = item.getAsFile();
            const reader = new FileReader();
            reader.onload = function(evt) {
              addBugReportScreenshot(evt.target.result);
              showToast('📸 Đã dán ảnh từ Clipboard vào báo cáo!');
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    });

    async function submitBugReport() {
      const cat = document.getElementById('bug-report-category')?.value || 'other';
      const title = (document.getElementById('bug-report-title')?.value || '').trim();
      const desc = (document.getElementById('bug-report-desc')?.value || '').trim();
      const severity = document.querySelector('input[name="bug-severity"]:checked')?.value || 'low';

      if (!title) {
        alert('Vui lòng nhập tiêu đề sự cố!');
        document.getElementById('bug-report-title')?.focus();
        return;
      }
      if (!desc) {
        alert('Vui lòng nhập mô tả chi tiết sự cố!');
        document.getElementById('bug-report-desc')?.focus();
        return;
      }

      const submitBtn = document.getElementById('btn-submit-bug-report');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Đang gửi báo cáo lên Cloud...';
      }

      const reportId = 'bug_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
      const diag = getSystemDiagnosticsInfo();

      const payload = {
        id: reportId,
        category: cat,
        severity: severity,
        title: title,
        description: desc,
        screenshots: currentBugReportScreenshots,
        screenshot: currentBugReportScreenshots[0] || null, // backward compatibility
        diagnostics: diag,
        status: 'open',
        user: {
          uid: currentUser ? currentUser.uid : 'GUEST',
          displayName: currentUser ? (currentUser.displayName || currentUser.email) : 'Khách',
          email: currentUser ? (currentUser.email || '') : '',
          isVip: typeof isUserVip === 'function' ? isUserVip() : false
        },
        createdAt: new Date().toISOString()
      };

      const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
      const token = await getFreshCloudAuthToken();
      const authParam = token ? `?auth=${token}` : '';

      try {
        let res = await fetch(`${rtdbUrl}/bug_reports/${reportId}.json${authParam}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok && authParam) {
          // Fallback without auth param
          res = await fetch(`${rtdbUrl}/bug_reports/${reportId}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }

        closeModal('modal-bug-report');
        showToast('🎉 Đã gửi báo cáo thành công! Cảm ơn bạn đã đóng góp cho VocaFlow.');

        if (typeof addNotification === 'function') {
          addNotification('SYSTEM', '🐛 Đã Tiếp Nhận Báo Cáo', `Mã sự cố #${reportId.slice(0, 10)}: "${title}". Admin sẽ kiểm tra và phản hồi sớm nhất!`);
        }

      } catch (err) {
        console.warn('Bug report submit fallback error:', err);
        closeModal('modal-bug-report');
        showToast('✅ Đã ghi nhận báo cáo cục bộ! Cảm ơn bạn.');
      }
    }


    // =========================================================================
    // CUSTOM BUG BOUNTY REWARD ENGINE (v0.10.8-alpha-10.3)
    // =========================================================================
    let currentBountyReportId = null;
    let currentBountyUserUid = null;
    let currentBountyType = 'coins';

    const BOUNTY_CONFIG = {
      coins: { label: 'VoCoin', unit: 'VoCoin', icon: '🪙', presets: [20, 50, 100, 200, 500], defaultVal: 50 },
      hints: { label: 'VocaHint', unit: 'VocaHint', icon: '💡', presets: [2, 5, 10, 20, 50], defaultVal: 5 },
      skips: { label: 'VocaSkip', unit: 'VocaSkip', icon: '⏭️', presets: [1, 3, 5, 10, 20], defaultVal: 3 },
      spins: { label: 'VocaSpin', unit: 'VocaSpin', icon: '🎡', presets: [1, 2, 5, 10, 20], defaultVal: 2 },
      vip:   { label: 'Ngày VocaVIP', unit: 'Ngày VocaVIP', icon: '👑', presets: [1, 3, 7, 14, 30], defaultVal: 3 }
    };

    function openBugBountyPickerModal(reportId) {
      const report = adminBugReportsData.find(b => b.id === reportId);
      if (!report) {
        showToast('⚠️ Không tìm thấy thông tin báo cáo!');
        return;
      }
      const userUid = report.user?.uid;
      const displayName = report.user?.displayName || 'Flower';
      if (!userUid || userUid === 'GUEST') {
        alert('⚠️ Báo cáo này từ tài khoản Khách (Guest), không thể trao thưởng ví!');
        return;
      }

      currentBountyReportId = reportId;
      currentBountyUserUid = userUid;

      const reporterEl = document.getElementById('bounty-reporter-info');
      const titleEl = document.getElementById('bounty-report-title');
      const noteInput = document.getElementById('bounty-custom-note');

      if (reporterEl) {
        const isVip = (report.user?.isVip === true) || (typeof isAuthorVipUser === 'function' && isAuthorVipUser(userUid, displayName));
        if (isVip) {
          reporterEl.innerHTML = `
            <span class="vip-name-wrapper" onclick="openPublicProfileModal('${escapeJsString(displayName)}', '${escapeJsString(userUid)}', '', 'modal-bug-bounty-picker')" style="cursor: pointer; display: inline-flex; align-items: center; gap: 6px; padding: 2px 8px; border-radius: 6px; background: rgba(255,215,0,0.08); border: 1px solid rgba(255,215,0,0.3);" title="Bấm để xem Hồ sơ Flower VocaVIP">
              <span class="vip-crown-icon" style="font-size: 16px;">👑</span>
              <span class="vip-glowing-name" style="font-weight: 800; font-size: 13.5px; text-decoration: underline; text-underline-offset: 3px;">${escapeHtml(displayName)}</span>
              <span class="badge" style="background: linear-gradient(135deg, #ffd700, #ff8c00); color: #000; font-weight: 800; font-size: 10px; padding: 1px 6px; border-radius: 4px; box-shadow: 0 0 8px rgba(255,215,0,0.4);">👑 VocaVIP</span>
            </span>
            <span style="font-size: 11px; color: var(--text-muted); font-family: monospace;">(${escapeHtml(userUid)})</span>
          `;
        } else {
          reporterEl.innerHTML = `
            <span onclick="openPublicProfileModal('${escapeJsString(displayName)}', '${escapeJsString(userUid)}', '', 'modal-bug-bounty-picker')" style="cursor: pointer; color: #38bdf8; font-weight: 700; text-decoration: underline; text-underline-offset: 3px;" title="Bấm để xem Hồ sơ Flower">
              👤 ${escapeHtml(displayName)}
            </span>
            <span style="font-size: 11px; color: var(--text-muted); font-family: monospace;">(${escapeHtml(userUid)})</span>
          `;
        }
      }

      if (titleEl) {
        titleEl.textContent = `🐛 Báo cáo: "${report.title || 'Không có tiêu đề'}"`;
      }
      if (noteInput) {
        noteInput.value = 'Cảm ơn bạn đã phát hiện và đóng góp báo cáo sự cố cho VocaFlow!';
      }

      selectBountyType('coins');
      openModal('modal-bug-bounty-picker');
    }

    function selectBountyType(type) {
      currentBountyType = type;
      const cfg = BOUNTY_CONFIG[type] || BOUNTY_CONFIG.coins;

      // Update button highlights
      ['coins', 'hints', 'skips', 'spins', 'vip'].forEach(t => {
        const btn = document.getElementById('bounty-btn-' + t);
        if (btn) {
          if (t === type) {
            btn.style.borderColor = '#6366f1';
            btn.style.background = 'rgba(99,102,241,0.2)';
            btn.style.color = '#fff';
          } else {
            btn.style.borderColor = 'var(--border)';
            btn.style.background = 'transparent';
            btn.style.color = 'var(--text-muted)';
          }
        }
      });

      // Update Unit Label
      const unitLabel = document.getElementById('bounty-unit-label');
      if (unitLabel) unitLabel.textContent = cfg.unit;

      // Render Presets
      const presetsCont = document.getElementById('bounty-presets-container');
      if (presetsCont) {
        presetsCont.innerHTML = cfg.presets.map(p => `
          <button type="button" class="btn btn-outline btn-sm" onclick="setBountyAmount(${p})" style="padding: 2px 8px; font-size: 11px; border-radius: 6px;">
            +${p} ${cfg.unit}
          </button>
        `).join('');
      }

      // Set default value
      const amtInput = document.getElementById('bounty-custom-amount');
      if (amtInput) amtInput.value = cfg.defaultVal;

      updateBountyPreview();
    }

    function setBountyAmount(amt) {
      const amtInput = document.getElementById('bounty-custom-amount');
      if (amtInput) amtInput.value = amt;
      updateBountyPreview();
    }

    function updateBountyPreview() {
      const cfg = BOUNTY_CONFIG[currentBountyType] || BOUNTY_CONFIG.coins;
      const amtInput = document.getElementById('bounty-custom-amount');
      const amount = parseInt(amtInput?.value || '1', 10) || 1;
      const previewText = document.getElementById('bounty-preview-text');

      if (previewText) {
        previewText.textContent = `+${amount} ${cfg.unit} (${cfg.icon} ${cfg.label})`;
      }
    }

    async function confirmSendCustomBugBounty() {
      if (!currentBountyReportId || !currentBountyUserUid) return;
      const report = adminBugReportsData.find(b => b.id === currentBountyReportId);
      if (!report) return;

      const cfg = BOUNTY_CONFIG[currentBountyType] || BOUNTY_CONFIG.coins;
      const amtInput = document.getElementById('bounty-custom-amount');
      const noteInput = document.getElementById('bounty-custom-note');
      const amount = Math.max(1, parseInt(amtInput?.value || '1', 10) || 1);
      const customNote = (noteInput?.value || '').trim() || 'Cảm ơn bạn đã phát hiện và đóng góp báo cáo sự cố!';

      const btnConfirm = document.getElementById('btn-confirm-bounty');
      if (btnConfirm) {
        btnConfirm.disabled = true;
        btnConfirm.textContent = '⏳ Đang trao thưởng...';
      }

      const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
      const token = await getFreshCloudAuthToken();
      const authParam = token ? `?auth=${token}` : '';
      const userUid = currentBountyUserUid;
      const isSelf = (currentUser && currentUser.uid === userUid);

      try {
        let rewardSummary = `+${amount} ${cfg.unit}`;

        if (currentBountyType === 'coins') {
          let curEcoRes = await fetch(`${rtdbUrl}/users/${userUid}/economy.json${authParam}`);
          if (!curEcoRes.ok && authParam) curEcoRes = await fetch(`${rtdbUrl}/users/${userUid}/economy.json`);
          const curEco = (curEcoRes.ok ? await curEcoRes.json() : null) || {};
          const newPoints = (curEco.points || 0) + amount;
          let pRes = await fetch(`${rtdbUrl}/users/${userUid}/economy/points.json${authParam}`, { method: 'PUT', body: JSON.stringify(newPoints) });
          if (!pRes.ok && authParam) await fetch(`${rtdbUrl}/users/${userUid}/economy/points.json`, { method: 'PUT', body: JSON.stringify(newPoints) });
          if (isSelf) {
            setUserPoints(getUserPoints() + amount);
            addLedgerEntry('ADMIN_BOUNTY', amount, `Thưởng bắt lỗi sự cố: "${report.title}"`);
          }

        } else if (currentBountyType === 'hints') {
          let curEcoRes = await fetch(`${rtdbUrl}/users/${userUid}/economy.json${authParam}`);
          if (!curEcoRes.ok && authParam) curEcoRes = await fetch(`${rtdbUrl}/users/${userUid}/economy.json`);
          const curEco = (curEcoRes.ok ? await curEcoRes.json() : null) || {};
          const newHints = (curEco.hints || 0) + amount;
          let hRes = await fetch(`${rtdbUrl}/users/${userUid}/economy/hints.json${authParam}`, { method: 'PUT', body: JSON.stringify(newHints) });
          if (!hRes.ok && authParam) await fetch(`${rtdbUrl}/users/${userUid}/economy/hints.json`, { method: 'PUT', body: JSON.stringify(newHints) });
          if (isSelf) setUserHints(getUserHints() + amount);

        } else if (currentBountyType === 'skips') {
          let curEcoRes = await fetch(`${rtdbUrl}/users/${userUid}/economy.json${authParam}`);
          if (!curEcoRes.ok && authParam) curEcoRes = await fetch(`${rtdbUrl}/users/${userUid}/economy.json`);
          const curEco = (curEcoRes.ok ? await curEcoRes.json() : null) || {};
          const newSkips = (curEco.skips || 0) + amount;
          let sRes = await fetch(`${rtdbUrl}/users/${userUid}/economy/skips.json${authParam}`, { method: 'PUT', body: JSON.stringify(newSkips) });
          if (!sRes.ok && authParam) await fetch(`${rtdbUrl}/users/${userUid}/economy/skips.json`, { method: 'PUT', body: JSON.stringify(newSkips) });
          if (isSelf) setUserSkips(getUserSkips() + amount);

        } else if (currentBountyType === 'spins') {
          let curSpinsRes = await fetch(`${rtdbUrl}/users/${userUid}/lucky_spins_left.json${authParam}`);
          if (!curSpinsRes.ok && authParam) curSpinsRes = await fetch(`${rtdbUrl}/users/${userUid}/lucky_spins_left.json`);
          const curSpins = (curSpinsRes.ok ? await curSpinsRes.json() : 0) || 0;
          const newSpins = (parseInt(curSpins, 10) || 0) + amount;
          let spRes = await fetch(`${rtdbUrl}/users/${userUid}/lucky_spins_left.json${authParam}`, { method: 'PUT', body: JSON.stringify(newSpins) });
          if (!spRes.ok && authParam) await fetch(`${rtdbUrl}/users/${userUid}/lucky_spins_left.json`, { method: 'PUT', body: JSON.stringify(newSpins) });
          if (isSelf) setLuckySpinsCount(getLuckySpinsCount() + amount);

        } else if (currentBountyType === 'vip') {
          let curProfRes = await fetch(`${rtdbUrl}/users/${userUid}/profile.json${authParam}`);
          if (!curProfRes.ok && authParam) curProfRes = await fetch(`${rtdbUrl}/users/${userUid}/profile.json`);
          const curProf = (curProfRes.ok ? await curProfRes.json() : null) || {};
          const curExp = (curProf.vipExpiresAt && curProf.vipExpiresAt > Date.now()) ? curProf.vipExpiresAt : Date.now();
          const newExp = curExp + (amount * 24 * 60 * 60 * 1000);

          let vRes = await fetch(`${rtdbUrl}/users/${userUid}/profile.json${authParam}`, {
            method: 'PATCH',
            body: JSON.stringify({ isVip: true, vipTier: curProf.vipTier || 'monthly', vipExpiresAt: newExp })
          });
          if (!vRes.ok && authParam) {
            await fetch(`${rtdbUrl}/users/${userUid}/profile.json`, {
              method: 'PATCH',
              body: JSON.stringify({ isVip: true, vipTier: curProf.vipTier || 'monthly', vipExpiresAt: newExp })
            });
          }
          if (isSelf) {
            localStorage.setItem('vocaflow_vip_expiry', newExp.toString());
            localStorage.setItem('vocaflow_vip_tier', 'bounty');
            updateVipStatusUI();
          }
        }

        // Send clear, rich inbox notification with dual keys (message & content)
        const notifId = 'notif_bounty_' + Date.now();
        const notifMsg = `🎉 Admin đã trao thưởng cho bạn: ${rewardSummary} (${cfg.icon} ${cfg.label}) cho báo cáo sự cố "${report.title}". ${customNote}`;
        
        let notifRes = await fetch(`${rtdbUrl}/users/${userUid}/notifications/${notifId}.json${authParam}`, {
          method: 'PUT',
          body: JSON.stringify({
            id: notifId,
            type: currentBountyType === 'vip' ? 'VIP_BONUS' : 'FINANCIAL',
            title: '🎁 Thưởng Bắt Lỗi (Bug Bounty)',
            message: notifMsg,
            content: notifMsg,
            rewardType: currentBountyType,
            rewardAmount: amount,
            timestamp: new Date().toISOString(),
            read: false
          })
        });

        if (!notifRes.ok && authParam) {
          await fetch(`${rtdbUrl}/users/${userUid}/notifications/${notifId}.json`, {
            method: 'PUT',
            body: JSON.stringify({
              id: notifId,
              type: currentBountyType === 'vip' ? 'VIP_BONUS' : 'FINANCIAL',
              title: '🎁 Thưởng Bắt Lỗi (Bug Bounty)',
              message: notifMsg,
              content: notifMsg,
              rewardType: currentBountyType,
              rewardAmount: amount,
              timestamp: new Date().toISOString(),
              read: false
            })
          });
        }

        if (isSelf && typeof addNotification === 'function') {
          addNotification(
            currentBountyType === 'vip' ? 'VIP_BONUS' : 'FINANCIAL',
            '🎁 Thưởng Bắt Lỗi (Bug Bounty)',
            notifMsg,
            null,
            null,
            notifId
          );
        }

        // Auto update status to resolved
        updateAdminBugStatus(currentBountyReportId, 'resolved');

        closeModal('modal-bug-bounty-picker');
        showToast(`🎉 Đã trao thưởng ${rewardSummary} thành công cho Flower!`);

      } catch (err) {
        console.warn('Send bounty error:', err);
        showToast('⚠️ Lỗi khi gửi phần thưởng lên Cloud!');
      } finally {
        if (btnConfirm) {
          btnConfirm.disabled = false;
          btnConfirm.textContent = '🚀 Xác Nhận Trao Thưởng';
        }
      }
    }

    // =========================================================================
    // VOCAMAIL ENGINE - TRUNG TÂM NHẮN TIN & HỎI ĐÁP ADMIN (v0.10.9-33)
    // =========================================================================
    let vocaMailAttachments = [];
    let selectedVocaMailCategory = 'qa';

    function getVocaMailCategoryLabel(catKey) {
      const labels = {
        qa: '❓ Hỏi đáp học tập',
        vip_payment: '👑 VocaVIP & Nạp tiền',
        feedback: '💡 Đóng góp ý kiến',
        bug: '🐛 Báo cáo sự cố',
        other: '🤝 Khác'
      };
      return labels[catKey] || '❓ Hỏi đáp';
    }

    function openVocaMailModal(initialTab = 'compose') {
      const isGuest = !currentUser || !currentUser.email;
      const gView = document.getElementById('vocamail-guest-lock-view');
      const aView = document.getElementById('vocamail-main-authenticated-view');

      if (isGuest) {
        if (gView) gView.style.display = 'block';
        if (aView) aView.style.display = 'none';
        openModal('modal-vocamail');
        return;
      }

      if (gView) gView.style.display = 'none';
      if (aView) aView.style.display = 'flex';

      const nameEl = document.getElementById('vocamail-sender-name');
      const emailEl = document.getElementById('vocamail-sender-email');
      if (nameEl) nameEl.textContent = currentUser.displayName || currentUser.username || 'Học viên VocaFlow';
      if (emailEl) emailEl.textContent = `(${currentUser.email || 'guest@vocaflow.app'})`;

      updateVocaMailSentBadge();
      switchVocaMailTab(initialTab);
      openModal('modal-vocamail');
    }
    window.openVocaMailModal = openVocaMailModal;

    function switchVocaMailTab(tab = 'compose') {
      const composeBtn = document.getElementById('vocamail-tab-btn-compose');
      const historyBtn = document.getElementById('vocamail-tab-btn-history');
      const composeView = document.getElementById('vocamail-view-compose');
      const historyView = document.getElementById('vocamail-view-history');

      if (tab === 'compose') {
        if (composeBtn) {
          composeBtn.classList.add('active');
          composeBtn.style.background = 'var(--primary)';
          composeBtn.style.color = '#fff';
        }
        if (historyBtn) {
          historyBtn.classList.remove('active');
          historyBtn.style.background = 'transparent';
          historyBtn.style.color = 'var(--text-muted)';
        }
        if (composeView) composeView.style.display = 'flex';
        if (historyView) historyView.style.display = 'none';
      } else {
        if (historyBtn) {
          historyBtn.classList.add('active');
          historyBtn.style.background = 'var(--primary)';
          historyBtn.style.color = '#fff';
        }
        if (composeBtn) {
          composeBtn.classList.remove('active');
          composeBtn.style.background = 'transparent';
          composeBtn.style.color = 'var(--text-muted)';
        }
        if (composeView) composeView.style.display = 'none';
        if (historyView) historyView.style.display = 'flex';
        renderVocaMailHistory();
      }
    }
    window.switchVocaMailTab = switchVocaMailTab;

    function selectVocaMailCategory(catKey, btnEl) {
      selectedVocaMailCategory = catKey;
      document.querySelectorAll('#vocamail-category-grid .vocamail-cat-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.borderColor = 'var(--border)';
        btn.style.background = 'transparent';
        btn.style.color = 'var(--text)';
      });
      if (btnEl) {
        btnEl.classList.add('active');
        btnEl.style.borderColor = '#818cf8';
        btnEl.style.background = 'rgba(99, 102, 241, 0.15)';
        btnEl.style.color = '#818cf8';
      }
    }
    window.selectVocaMailCategory = selectVocaMailCategory;

    function handleVocaMailImageSelect(event) {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const remainingSlots = 3 - vocaMailAttachments.length;
      if (remainingSlots <= 0) {
        showToast('⚠️ Bạn chỉ có thể đính kèm tối đa 3 ảnh!');
        return;
      }

      const filesToProcess = Array.from(files).slice(0, remainingSlots);
      filesToProcess.forEach(file => {
        if (!file.type.startsWith('image/')) {
          showToast('⚠️ Vui lòng chỉ chọn định dạng hình ảnh!');
          return;
        }
        if (file.size > 3 * 1024 * 1024) {
          showToast('⚠️ Dung lượng ảnh tối đa là 3MB!');
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          vocaMailAttachments.push({
            name: file.name,
            size: file.size,
            dataUrl: e.target.result
          });
          renderVocaMailAttachmentsPreview();
        };
        reader.readAsDataURL(file);
      });

      event.target.value = '';
    }
    window.handleVocaMailImageSelect = handleVocaMailImageSelect;

    function removeVocaMailAttachment(index) {
      vocaMailAttachments.splice(index, 1);
      renderVocaMailAttachmentsPreview();
    }
    window.removeVocaMailAttachment = removeVocaMailAttachment;

    function renderVocaMailAttachmentsPreview() {
      const container = document.getElementById('vocamail-attachments-preview');
      if (!container) return;

      if (vocaMailAttachments.length === 0) {
        container.innerHTML = '';
        return;
      }

      container.innerHTML = vocaMailAttachments.map((att, idx) => `
        <div style="position: relative; width: 68px; height: 68px; border-radius: 8px; overflow: hidden; border: 1px solid rgba(129,140,248,0.4); background: #000;">
          <img src="${att.dataUrl}" alt="Attachment ${idx+1}" style="width: 100%; height: 100%; object-fit: cover;">
          <button type="button" onclick="removeVocaMailAttachment(${idx})" style="position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; border-radius: 50%; background: rgba(239,68,68,0.9); color: white; border: none; font-size: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer;">✕</button>
        </div>
      `).join('');
    }

    function getVocaMailHistoryFromStorage() {
      if (!currentUser || !currentUser.uid) return [];
      try {
        const stored = localStorage.getItem(`vocaflow_sent_vocamails_${currentUser.uid}`);
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        return [];
      }
    }

    function saveVocaMailHistoryToStorage(historyList) {
      if (!currentUser || !currentUser.uid) return;
      localStorage.setItem(`vocaflow_sent_vocamails_${currentUser.uid}`, JSON.stringify(historyList));
      updateVocaMailSentBadge();
    }

    function updateVocaMailSentBadge() {
      const badge = document.getElementById('vocamail-sent-count-badge');
      if (!badge) return;
      const history = getVocaMailHistoryFromStorage();
      badge.textContent = history.length;
    }

    async function submitVocaMail() {
      if (!currentUser || !currentUser.email) {
        showToast('🔒 Vui lòng đăng nhập để gửi VocaMail!');
        openAuthModal('login');
        return;
      }

      const subjectInput = document.getElementById('vocamail-input-subject');
      const bodyInput = document.getElementById('vocamail-input-body');
      const sendBtn = document.getElementById('btn-vocamail-send');

      const subjectVal = subjectInput ? subjectInput.value.trim() : '';
      const bodyVal = bodyInput ? bodyInput.value.trim() : '';

      if (!subjectVal) {
        showToast('⚠️ Vui lòng nhập tiêu đề thư!');
        if (subjectInput) subjectInput.focus();
        return;
      }
      if (!bodyVal) {
        showToast('⚠️ Vui lòng nhập nội dung thư chi tiết!');
        if (bodyInput) bodyInput.focus();
        return;
      }

      if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = '⏳ Đang gửi mail...';
      }

      const mailId = 'vm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      const isVip = (typeof isUserVip === 'function' && isUserVip());
      const categoryLabel = getVocaMailCategoryLabel(selectedVocaMailCategory);

      const mailRecord = {
        id: mailId,
        timestamp: new Date().toISOString(),
        category: selectedVocaMailCategory,
        categoryLabel: categoryLabel,
        subject: subjectVal,
        body: bodyVal,
        senderName: currentUser.displayName || currentUser.username || 'Học viên VocaFlow',
        senderEmail: currentUser.email || 'guest@vocaflow.app',
        senderUid: currentUser.uid,
        isVip: isVip,
        attachmentsCount: vocaMailAttachments.length,
        status: 'sent'
      };

      // 1. Save locally
      const history = getVocaMailHistoryFromStorage();
      history.unshift(mailRecord);
      saveVocaMailHistoryToStorage(history);

      // 2. Push to Firebase Realtime Database
      const rtdbUrl = firebaseConfig.databaseURL || 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app';
      const authParam = currentUser.idToken ? `?auth=${currentUser.idToken}` : '';

      try {
        fetch(`${rtdbUrl}/vocamails_inbox/${mailId}.json${authParam}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mailRecord)
        }).catch(() => {});

        fetch(`${rtdbUrl}/users/${currentUser.uid}/vocamails/${mailId}.json${authParam}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mailRecord)
        }).catch(() => {});
      } catch (e) {}

      // 3. Send real email to duwchao@gmail.com & nongduchaolop6c@gmail.com via Multi-Channel Dispatch
      const senderName = currentUser.displayName || currentUser.username || 'Học viên VocaFlow';
      const senderEmail = currentUser.email || 'student@vocaflow.app';
      const formattedDate = new Date().toLocaleString('vi-VN');

      const emailPayload = {
        name: senderName,
        email: senderEmail,
        message: bodyVal,
        _subject: `[VocaMail] [${categoryLabel}] ${subjectVal}`,
        _captcha: 'false',
        _template: 'table',
        _autoresponse: 'false',
        _cc: 'nongduchaolop6c@gmail.com',
        'Mã Thư': mailId,
        'Người Gửi': `${senderName} (${senderEmail})`,
        'UID Học Viên': currentUser.uid,
        'Loại Tài Khoản': isVip ? '👑 VocaVIP' : 'Tài khoản thường',
        'Phân Loại': categoryLabel,
        'Tiêu Đề': subjectVal,
        'Nội Dung Chi Tiết': bodyVal,
        'Ảnh Đính Kèm': vocaMailAttachments.length > 0 ? `${vocaMailAttachments.length} ảnh` : 'Không có',
        'Thời Gian Gửi': formattedDate
      };

      // 3a. Native Windows Desktop C# Bridge (Bypasses all browser/file:/// restrictions)
      if (window.chrome && window.chrome.webview && typeof window.chrome.webview.postMessage === 'function') {
        try {
          window.chrome.webview.postMessage({
            type: 'SEND_VOCAMAIL',
            payload: emailPayload
          });
        } catch (e) {
          console.warn('Native webview postMessage err:', e);
        }
      }

      // 3b. Direct AJAX to both admin mailboxes (for Web PWA / Browser)
      try {
        fetch('https://formsubmit.co/ajax/duwchao@gmail.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(emailPayload)
        }).catch(() => {});

        fetch('https://formsubmit.co/ajax/nongduchaolop6c@gmail.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(emailPayload)
        }).catch(() => {});
      } catch (err) {}

      // 3c. Hidden Form Dispatch Fallback (Standard HTML Form POST)
      const dispatchViaForm = (targetEmail) => {
        try {
          const iframeName = 'vocamail_iframe_' + Math.random().toString(36).substring(2, 9);
          const iframe = document.createElement('iframe');
          iframe.name = iframeName;
          iframe.style.display = 'none';
          document.body.appendChild(iframe);

          const form = document.createElement('form');
          form.method = 'POST';
          form.action = `https://formsubmit.co/${targetEmail}`;
          form.target = iframeName;
          form.style.display = 'none';

          for (const [k, v] of Object.entries(emailPayload)) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = k;
            input.value = typeof v === 'object' ? JSON.stringify(v) : String(v);
            form.appendChild(input);
          }

          document.body.appendChild(form);
          form.submit();

          setTimeout(() => {
            try { document.body.removeChild(form); } catch (e) {}
            try { document.body.removeChild(iframe); } catch (e) {}
          }, 4000);
        } catch (e) {
          console.warn('Form dispatch note:', e);
        }
      };

      // Dispatch to both admin addresses
      dispatchViaForm('duwchao@gmail.com');
      setTimeout(() => dispatchViaForm('nongduchaolop6c@gmail.com'), 600);

      // 4. In-App Notification & Sound
      if (typeof addNotification === 'function') {
        addNotification(
          'VOCAMAIL',
          '✉️ Đã Gửi VocaMail Thành Công',
          `Thư "${subjectVal}" đã được chuyển tiếp trực tiếp vào hộp thư Admin (duwchao@gmail.com & nongduchaolop6c@gmail.com).`,
          'OPEN_VOCAMAIL',
          { mailId }
        );
      }
      playVocaSfx('correct');

      // Reset form
      if (subjectInput) subjectInput.value = '';
      if (bodyInput) bodyInput.value = '';
      vocaMailAttachments = [];
      renderVocaMailAttachmentsPreview();

      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '🚀 Gửi VocaMail Ngay';
      }

      showToast('🎉 Đã gửi VocaMail thành công tới Admin!');
      switchVocaMailTab('history');
    }
    window.submitVocaMail = submitVocaMail;

    function openDirectGmailFallback(mode = 'web') {
      const subjectInput = document.getElementById('vocamail-input-subject');
      const bodyInput = document.getElementById('vocamail-input-body');
      const subjectVal = subjectInput && subjectInput.value.trim() ? subjectInput.value.trim() : 'Hỏi đáp & Hỗ trợ VocaFlow';
      const bodyVal = bodyInput && bodyInput.value.trim() ? bodyInput.value.trim() : 'Xin chào Admin VocaFlow, em cần hỗ trợ:';

      const senderName = currentUser ? (currentUser.displayName || currentUser.username || 'Học viên') : 'Học viên';
      const senderUid = currentUser ? currentUser.uid : 'guest';
      const isVip = typeof isUserVip === 'function' ? isUserVip() : false;

      const fullBody = `${bodyVal}\n\n==============================\n📌 THÔNG TIN HỌC VIÊN VOCAFLOW:\n- Họ & Tên: ${senderName}\n- UID: ${senderUid}\n- Tài khoản: ${isVip ? '👑 VocaVIP' : 'Thường'}\n- Phiên bản: ${VOCAFLOW_APP_VERSION}\n==============================`;

      const targetEmails = 'duwchao@gmail.com,nongduchaolop6c@gmail.com';
      const subjectEncoded = encodeURIComponent('[VocaMail] ' + subjectVal);
      const bodyEncoded = encodeURIComponent(fullBody);

      if (mode === 'web') {
        // Direct Web Gmail Composer (Opens in new browser tab pre-filled)
        const webGmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${targetEmails}&su=${subjectEncoded}&body=${bodyEncoded}`;
        window.open(webGmailUrl, '_blank');
      } else {
        // Native Mail Client (mailto:)
        const mailtoUrl = `mailto:${targetEmails}?subject=${subjectEncoded}&body=${bodyEncoded}`;
        window.location.href = mailtoUrl;
      }
    }
    window.openDirectGmailFallback = openDirectGmailFallback;

    function renderVocaMailHistory() {
      const container = document.getElementById('vocamail-history-list');
      if (!container) return;

      const history = getVocaMailHistoryFromStorage();
      if (history.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 32px 10px; color: var(--text-muted);">
            <span style="font-size: 32px; display: block; margin-bottom: 6px;">📭</span>
            <strong style="font-size: 13.5px; color: var(--text);">Hộp thư đã gửi đang trống</strong>
            <div style="font-size: 11.5px; margin-top: 4px;">Các bức thư bạn gửi cho Admin sẽ được lưu trữ tại đây để bạn tiện theo dõi.</div>
            <button type="button" class="btn btn-primary btn-sm" onclick="switchVocaMailTab('compose')" style="margin-top: 12px; font-size: 11.5px; font-weight: 700;">
              ✍️ Soạn Thư Mới Ngay
            </button>
          </div>
        `;
        return;
      }

      container.innerHTML = history.map(item => {
        const timeStr = formatRelativeTime(item.timestamp);
        return `
          <div style="background: var(--surface-elevated); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span class="badge" style="background: rgba(99,102,241,0.15); color: #818cf8; font-size: 10px; font-weight: 700; border: 1px solid rgba(99,102,241,0.3);">${escapeHtml(item.categoryLabel || '❓ Hỏi đáp')}</span>
                <strong style="font-size: 13px; color: var(--text);">${escapeHtml(item.subject)}</strong>
              </div>
              <span class="badge" style="background: rgba(16,185,129,0.15); color: #34d399; font-size: 10px; font-weight: 700; border: 1px solid rgba(16,185,129,0.3); white-space: nowrap;">✓ Đã gửi</span>
            </div>
            <div style="font-size: 12px; color: var(--text-muted); line-height: 1.45; white-space: pre-wrap; background: rgba(0,0,0,0.15); padding: 8px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.04);">
              ${escapeHtml(item.body)}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; color: var(--text-muted); margin-top: 2px;">
              <span>🕒 ${timeStr} • Gửi tới: <strong>duwchao@gmail.com & nongduchaolop6c@gmail.com</strong></span>
              <span style="color: #818cf8;">#${item.id.slice(0, 10)}</span>
            </div>
          </div>
        `;
      }).join('');
    }
    window.renderVocaMailHistory = renderVocaMailHistory;

    function clearVocaMailHistory() {
      if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử thư VocaMail đã gửi trên thiết bị này không?')) return;
      if (!currentUser || !currentUser.uid) return;
      localStorage.removeItem(`vocaflow_sent_vocamails_${currentUser.uid}`);
      updateVocaMailSentBadge();
      renderVocaMailHistory();
      showToast('🗑️ Đã xóa sạch lịch sử VocaMail trên máy này!');
    }
    window.clearVocaMailHistory = clearVocaMailHistory;


    // =========================================================================
    // ACHIEVEMENT & BADGE SYSTEM ENGINE (v0.10.8-alpha-10.3 - 40 BADGES & FLOW SYSTEM)
    // =========================================================================
    const ACHIEVEMENTS_REGISTRY = {
      // GROUP 1: Khởi Đầu & Khai Phá (Tân Thủ) - Bronze: 50 Xu
      'first_lesson': {
        id: 'first_lesson',
        group: 'starter',
        groupName: '🌱 Khởi Đầu & Khai Phá',
        icon: '🌱',
        name: 'Hạt Mầm Tri Thức',
        desc: 'Hoàn thành bài học đầu tiên (bất kỳ chế độ nào).',
        tier: 'bronze',
        maxProgress: 1,
        unit: 'bài',
        pointsReward: 50
      },
      'first_quiz': {
        id: 'first_quiz',
        group: 'starter',
        groupName: '🌱 Khởi Đầu & Khai Phá',
        icon: '⚡',
        name: 'Tia Chớp Phản Xạ',
        desc: 'Hoàn thành phiên Quiz trắc nghiệm đầu tiên.',
        tier: 'bronze',
        maxProgress: 1,
        unit: 'phiên',
        pointsReward: 50
      },
      'first_spelling': {
        id: 'first_spelling',
        group: 'starter',
        groupName: '🌱 Khởi Đầu & Khai Phá',
        icon: '✍️',
        name: 'Nét Bút Khởi Nguyên',
        desc: 'Hoàn thành phiên Luyện Viết (Spelling) đầu tiên.',
        tier: 'bronze',
        maxProgress: 1,
        unit: 'phiên',
        pointsReward: 50
      },
      'first_speaking': {
        id: 'first_speaking',
        group: 'starter',
        groupName: '🌱 Khởi Đầu & Khai Phá',
        icon: '🎙️',
        name: 'Tiếng Vang Đầu Đời',
        desc: 'Hoàn thành phiên Luyện Nói (Speaking) đầu tiên.',
        tier: 'bronze',
        maxProgress: 1,
        unit: 'phiên',
        pointsReward: 50
      },
      'first_ai_chat': {
        id: 'first_ai_chat',
        group: 'starter',
        groupName: '🌱 Khởi Đầu & Khai Phá',
        icon: '🤖',
        name: 'Chào Người Bạn Ảo',
        desc: 'Trò chuyện câu hỏi đầu tiên với Gia sư AI English Mentor.',
        tier: 'bronze',
        maxProgress: 1,
        unit: 'câu hỏi',
        pointsReward: 50
      },

      // GROUP 2: Bậc Thầy Trí Nhớ & Khổ Luyện (SRS & Mastery)
      'mastery_10': {
        id: 'mastery_10',
        group: 'mastery',
        groupName: '🧠 Bậc Thầy Trí Nhớ & Khổ Luyện',
        icon: '🧠',
        name: 'Khởi Động Não Bộ',
        desc: 'Thuần thục 10 từ vựng độc bản (Độ thuộc 100%).',
        tier: 'bronze',
        maxProgress: 10,
        unit: 'từ độc bản',
        pointsReward: 50
      },
      'mastery_50': {
        id: 'mastery_50',
        group: 'mastery',
        groupName: '🧠 Bậc Thầy Trí Nhớ & Khổ Luyện',
        icon: '📚',
        name: 'Trí Nhớ Thép',
        desc: 'Thuần thục 50 từ vựng độc bản.',
        tier: 'silver',
        maxProgress: 50,
        unit: 'từ độc bản',
        pointsReward: 100
      },
      'mastery_200': {
        id: 'mastery_200',
        group: 'mastery',
        groupName: '🧠 Bậc Thầy Trí Nhớ & Khổ Luyện',
        icon: '🏛️',
        name: 'Bách Khoa Toàn Thư',
        desc: 'Thuần thục 200 từ vựng độc bản.',
        tier: 'gold',
        maxProgress: 200,
        unit: 'từ độc bản',
        pointsReward: 200
      },
      'mastery_500': {
        id: 'mastery_500',
        group: 'mastery',
        groupName: '🧠 Bậc Thầy Trí Nhớ & Khổ Luyện',
        icon: '👑',
        name: 'Từ Điển Sống',
        desc: 'Thuần thục 500 từ vựng độc bản.',
        tier: 'diamond',
        maxProgress: 500,
        unit: 'từ độc bản',
        pointsReward: 500
      },
      'mastery_1000': {
        id: 'mastery_1000',
        group: 'mastery',
        groupName: '🧠 Bậc Thầy Trí Nhớ & Khổ Luyện',
        icon: '🌌',
        name: 'Vị Thần Ngôn Ngữ',
        desc: 'Chạm mốc 1.000 từ vựng độc bản thuần thục 100%.',
        tier: 'mythic',
        maxProgress: 1000,
        unit: 'từ độc bản',
        pointsReward: 1000
      },
      'srs_streak_7': {
        id: 'srs_streak_7',
        group: 'mastery',
        groupName: '🧠 Bậc Thầy Trí Nhớ & Khổ Luyện',
        icon: '⏳',
        name: 'Kẻ Thao Túng Thời Gian',
        desc: 'Dọn sạch toàn bộ Hàng Đợi Ôn Tập SRS trong 7 ngày liên tiếp.',
        tier: 'gold',
        maxProgress: 7,
        unit: 'ngày liên tiếp',
        pointsReward: 200
      },

      // GROUP 3: Chiến Thần Kỹ Năng & Thao Tác (Spelling, Speaking & Quiz)
      'skill_onetake_95': {
        id: 'skill_onetake_95',
        group: 'skill',
        groupName: '⚡ Chiến Thần Kỹ Năng & Thao Tác',
        icon: '🔥',
        name: 'Bản Lĩnh One-Take',
        desc: 'Phát âm đạt >= 95 điểm ở cấp độ Khó chỉ với 1 lần thu âm duy nhất.',
        tier: 'silver',
        maxProgress: 1,
        unit: 'lần',
        pointsReward: 100
      },
      'skill_speaking_perfect_hard': {
        id: 'skill_speaking_perfect_hard',
        group: 'skill',
        groupName: '⚡ Chiến Thần Kỹ Năng & Thao Tác',
        icon: '🎯',
        name: 'Chuẩn Bản Xứ',
        desc: 'Hoàn thành trọn vẹn 1 phiên AI Speaking cấp độ Khó không có lần thu nào dưới điểm sàn.',
        tier: 'gold',
        maxProgress: 1,
        unit: 'phiên',
        pointsReward: 200
      },
      'skill_spelling_flawless_insane': {
        id: 'skill_spelling_flawless_insane',
        group: 'skill',
        groupName: '⚡ Chiến Thần Kỹ Năng & Thao Tác',
        icon: '⌨️',
        name: 'Đôi Tay Bão Táp',
        desc: 'Hoàn thành bài Spelling cấp độ Siêu Khó đạt 100% độ chính xác không sai 1 ký tự.',
        tier: 'silver',
        maxProgress: 1,
        unit: 'phiên',
        pointsReward: 100
      },
      'skill_quiz_streak_30': {
        id: 'skill_quiz_streak_30',
        group: 'skill',
        groupName: '⚡ Chiến Thần Kỹ Năng & Thao Tác',
        icon: '⚡',
        name: 'Bách Phát Bách Trúng',
        desc: 'Trả lời đúng 30 câu Quiz liên tiếp không dùng bất kỳ VocaHint nào.',
        tier: 'gold',
        maxProgress: 30,
        unit: 'câu đúng',
        pointsReward: 200
      },
      'skill_perfect_session_50_hard': {
        id: 'skill_perfect_session_50_hard',
        group: 'skill',
        groupName: '⚡ Chiến Thần Kỹ Năng & Thao Tác',
        icon: '🦾',
        name: 'Cỗ Máy Hoàn Hảo',
        desc: 'Hoàn thành phiên học 50 từ ở mức Khó nhất mà không sai một lỗi nào (100% điểm sàn/độ chính xác).',
        tier: 'diamond',
        maxProgress: 50,
        unit: 'từ hoàn hảo',
        pointsReward: 500
      },

      // GROUP 4: Vận Mệnh & Nhân Phẩm (VocaWheel & Ads)
      'luck_spin_10': {
        id: 'luck_spin_10',
        group: 'luck',
        groupName: '🎡 Vận Mệnh & Nhân Phẩm',
        icon: '🎡',
        name: 'Bàn Tay Vận Mệnh',
        desc: 'Thực hiện 10 VocaSpin trên VocaWheel.',
        tier: 'bronze',
        maxProgress: 10,
        unit: 'VocaSpin',
        pointsReward: 50
      },
      'luck_ads_30': {
        id: 'luck_ads_30',
        group: 'luck',
        groupName: '🎡 Vận Mệnh & Nhân Phẩm',
        icon: '🎬',
        name: 'Nhà Tài Trợ Bền Bỉ',
        desc: 'Xem 30 video quảng cáo tài trợ để nhận VocaSpin.',
        tier: 'silver',
        maxProgress: 30,
        unit: 'lượt xem',
        pointsReward: 100
      },
      'luck_vip_jackpot_3': {
        id: 'luck_vip_jackpot_3',
        group: 'luck',
        groupName: '🎡 Vận Mệnh & Nhân Phẩm',
        icon: '👑',
        name: 'Trúng Số Độc Đắc',
        desc: 'Quay trúng ô giải độc đắc +1 Ngày VocaVIP trên VocaWheel 3 lần.',
        tier: 'gold',
        maxProgress: 3,
        unit: 'lần trúng VocaVIP',
        pointsReward: 200
      },
      'luck_vip_jackpot_streak_3': {
        id: 'luck_vip_jackpot_streak_3',
        group: 'luck',
        groupName: '🎡 Vận Mệnh & Nhân Phẩm',
        icon: '🏆',
        name: 'Triệu Phú Nhân Phẩm',
        desc: 'Quay trúng ô +1 Ngày VocaVIP liên tiếp 3 lần.',
        tier: 'diamond',
        maxProgress: 3,
        unit: 'lần liên tiếp',
        pointsReward: 500
      },
      'luck_unlucky_streak_3': {
        id: 'luck_unlucky_streak_3',
        group: 'luck',
        groupName: '🎡 Vận Mệnh & Nhân Phẩm',
        icon: '💀',
        name: 'Đen Thôi Đỏ Là Red',
        desc: 'Quay trúng ô giải thấp nhất 3 lần liên tiếp.',
        tier: 'silver',
        maxProgress: 3,
        unit: 'lần liên tiếp',
        pointsReward: 100
      },

      // GROUP 5: Pháp Sư Sáng Tạo & Xã Hội (Creator & Community)
      'creator_first_publish': {
        id: 'creator_first_publish',
        group: 'creator',
        groupName: '🧙 Pháp Sư Sáng Tạo & Xã Hội',
        icon: '🧙‍♂️',
        name: 'Pháp Sư Tập Sự',
        desc: 'Xuất bản VocaDeck công khai đầu tiên lên VocaLib Toàn Cầu.',
        tier: 'bronze',
        maxProgress: 1,
        unit: 'VocaDeck',
        pointsReward: 50
      },
      'creator_sell_5_decks': {
        id: 'creator_sell_5_decks',
        group: 'creator',
        groupName: '🧙 Pháp Sư Sáng Tạo & Xã Hội',
        icon: '🏪',
        name: 'Thương Gia Tri Thức',
        desc: 'Bán được 5 VocaDeck trên VocaStudio Creator Marketplace.',
        tier: 'silver',
        maxProgress: 5,
        unit: 'lượt bán',
        pointsReward: 100
      },
      'creator_buy_5_decks': {
        id: 'creator_buy_5_decks',
        group: 'creator',
        groupName: '🧙 Pháp Sư Sáng Tạo & Xã Hội',
        icon: '📚',
        name: 'Mọt Sách',
        desc: 'Mua 5 VocaDeck trên VocaStudio Creator Marketplace.',
        tier: 'silver',
        maxProgress: 5,
        unit: 'bộ đã mua',
        pointsReward: 100
      },
      'community_followers_20': {
        id: 'community_followers_20',
        group: 'creator',
        groupName: '🧙 Pháp Sư Sáng Tạo & Xã Hội',
        icon: '🌟',
        name: 'Idol Giới Trẻ',
        desc: 'Đạt mốc 20 người theo dõi (Followers) trên trang cá nhân.',
        tier: 'gold',
        maxProgress: 20,
        unit: 'người theo dõi',
        pointsReward: 200
      },
      'community_followers_50': {
        id: 'community_followers_50',
        group: 'creator',
        groupName: '🧙 Pháp Sư Sáng Tạo & Xã Hội',
        icon: '🌟',
        name: 'Celebrity',
        desc: 'Đạt mốc 50 người theo dõi (Followers) trên trang cá nhân.',
        tier: 'diamond',
        maxProgress: 50,
        unit: 'người theo dõi',
        pointsReward: 500
      },
      'creator_perfect_rating_deck': {
        id: 'creator_perfect_rating_deck',
        group: 'creator',
        groupName: '🧙 Pháp Sư Sáng Tạo & Xã Hội',
        icon: '⭐',
        name: 'VocaDeck Mô Phạm',
        desc: 'Sở hữu VocaDeck đạt đánh giá trung bình 5.0⭐ (tối thiểu 10 lượt đánh giá).',
        tier: 'diamond',
        maxProgress: 1,
        unit: 'VocaDeck',
        pointsReward: 500
      },
      'referral_invited_3': {
        id: 'referral_invited_3',
        group: 'creator',
        groupName: '🧙 Pháp Sư Sáng Tạo & Xã Hội',
        icon: '🤝',
        name: 'Đại Sứ Vẫy Khách',
        desc: 'Mời thành công 3 bạn bè tham gia qua VocaShare / Link Giới Thiệu.',
        tier: 'silver',
        maxProgress: 3,
        unit: 'bạn bè',
        pointsReward: 100
      },

      // GROUP 6: Tài Chính & Thợ Săn Lỗi (Ledger & Bug Bounty)
      'finance_earned_study_1000': {
        id: 'finance_earned_study_1000',
        group: 'finance',
        groupName: '🏦 Tài Chính & Thợ Săn Lỗi',
        icon: '🪙',
        name: 'Khởi Nghiệp Vốn Âm Tì Địa Ngục',
        desc: 'Tích lũy 1.000 VoCoin hoàn toàn từ việc học và tự tạo từ vựng.',
        tier: 'silver',
        maxProgress: 1000,
        unit: 'VoCoin học tập',
        pointsReward: 100
      },
      'finance_wallet_balance_5000': {
        id: 'finance_wallet_balance_5000',
        group: 'finance',
        groupName: '🏦 Tài Chính & Thợ Săn Lỗi',
        icon: '🏦',
        name: 'Cá Mập VocaFlow',
        desc: 'Số dư khả dụng trong ví chạm mốc 5.000 VoCoin.',
        tier: 'gold',
        maxProgress: 5000,
        unit: 'VoCoin ví',
        pointsReward: 200
      },
      'vip_membership_activated': {
        id: 'vip_membership_activated',
        group: 'finance',
        groupName: '🏦 Tài Chính & Thợ Săn Lỗi',
        icon: '👑',
        name: 'Dòng Máu Hoàng Gia',
        desc: 'Kích hoạt thành công gói Hội Viên VocaVIP (Tháng / Năm / Trọn Đời).',
        tier: 'diamond',
        maxProgress: 1,
        unit: 'gói VocaVIP',
        pointsReward: 500
      },
      'bug_bounty_approved_1': {
        id: 'bug_bounty_approved_1',
        group: 'finance',
        groupName: '🏦 Tài Chính & Thợ Săn Lỗi',
        icon: '🕵️',
        name: 'Thợ Săn Bọ Nghiệp Dư',
        desc: 'Báo cáo >= 1 lỗi được VocaAdmin duyệt và trao thưởng Bug Bounty.',
        tier: 'silver',
        maxProgress: 1,
        unit: 'báo cáo duyệt',
        pointsReward: 100
      },
      'bug_bounty_approved_5': {
        id: 'bug_bounty_approved_5',
        group: 'finance',
        groupName: '🏦 Tài Chính & Thợ Săn Lỗi',
        icon: '🕵️',
        name: 'Thợ Săn Bọ Thành Thạo',
        desc: 'Báo cáo >= 5 lỗi được VocaAdmin duyệt và trao thưởng Bug Bounty.',
        tier: 'silver',
        maxProgress: 5,
        unit: 'báo cáo duyệt',
        pointsReward: 100
      },
      'bug_bounty_approved_10': {
        id: 'bug_bounty_approved_10',
        group: 'finance',
        groupName: '🏦 Tài Chính & Thợ Săn Lỗi',
        icon: '🕵️',
        name: 'Thợ Săn Bọ Chuyên Nghiệp',
        desc: 'Báo cáo >= 10 lỗi được VocaAdmin duyệt và trao thưởng Bug Bounty.',
        tier: 'gold',
        maxProgress: 10,
        unit: 'báo cáo duyệt',
        pointsReward: 200
      },
      'bug_bounty_approved_20': {
        id: 'bug_bounty_approved_20',
        group: 'finance',
        groupName: '🏦 Tài Chính & Thợ Săn Lỗi',
        icon: '🕵️',
        name: 'Thợ Săn Bọ Bậc Thầy',
        desc: 'Báo cáo >= 20 lỗi được VocaAdmin duyệt và trao thưởng Bug Bounty.',
        tier: 'diamond',
        maxProgress: 20,
        unit: 'báo cáo duyệt',
        pointsReward: 500
      },

      // GROUP 7: Trứng Phục Sinh & Ẩn Số (Easter Eggs & Secret Achievements) - v0.10.8-alpha-10.3
      'secret_night_owl': {
        id: 'secret_night_owl',
        group: 'easter_egg',
        groupName: '🥚 Trứng Phục Sinh & Ẩn Số',
        icon: '🦉',
        name: 'Cú Đêm Học Bài',
        desc: 'Học ít nhất 1 câu Quiz / Spelling / Speaking thành công trong khung giờ từ 00:00 đến 04:00 sáng.',
        isSecret: true,
        secretHint: 'Thành tựu bí ẩn. Hãy khám phá bằng cách trải nghiệm ứng dụng!',
        tier: 'silver',
        maxProgress: 1,
        unit: 'lần học đêm',
        pointsReward: 100
      },
      'secret_early_bird': {
        id: 'secret_early_bird',
        group: 'easter_egg',
        groupName: '🥚 Trứng Phục Sinh & Ẩn Số',
        icon: '🌅',
        name: 'Kỷ Luật Thép',
        desc: 'Bắt đầu phiên học đầu tiên trong ngày từ 05:00 đến 06:00 sáng.',
        isSecret: true,
        secretHint: 'Thành tựu bí ẩn. Hãy khám phá bằng cách trải nghiệm ứng dụng!',
        tier: 'silver',
        maxProgress: 1,
        unit: 'phiên sớm',
        pointsReward: 100
      },
      'secret_immortal_streak_30': {
        id: 'secret_immortal_streak_30',
        group: 'easter_egg',
        groupName: '🥚 Trứng Phục Sinh & Ẩn Số',
        icon: '🔥',
        name: 'Bất Tử',
        desc: 'Duy trì chuỗi dòng chảy học tập (Flow) liên tục không ngắt quãng trong 30 ngày (chuỗi tự nhiên).',
        isSecret: true,
        secretHint: 'Thành tựu bí ẩn. Hãy khám phá bằng cách trải nghiệm ứng dụng!',
        tier: 'diamond',
        maxProgress: 30,
        unit: 'ngày liên tiếp',
        pointsReward: 500
      },
      'secret_clutch_speaking_hard': {
        id: 'secret_clutch_speaking_hard',
        group: 'easter_egg',
        groupName: '🥚 Trứng Phục Sinh & Ẩn Số',
        icon: '🏃',
        name: 'Thoát Hiểm Ngoạn Mục',
        desc: 'Vượt qua điểm sàn phát âm ở đúng lượt thu âm cuối cùng (Lần 3/3 ở mức Khó).',
        isSecret: true,
        secretHint: 'Thành tựu bí ẩn. Hãy khám phá bằng cách trải nghiệm ứng dụng!',
        tier: 'gold',
        maxProgress: 1,
        unit: 'lần thoát hiểm',
        pointsReward: 200
      },
      'secret_listen_all_audio_streak_10': {
        id: 'secret_listen_all_audio_streak_10',
        group: 'easter_egg',
        groupName: '🥚 Trứng Phục Sinh & Ẩn Số',
        icon: '🧘',
        name: 'Cẩn Thận Tuyệt Đối',
        desc: 'Nghe đủ 100% số lượt âm thanh mẫu trước khi bấm thu âm ở 10 từ liên tiếp trong Speaking.',
        isSecret: true,
        secretHint: 'Thành tựu bí ẩn. Hãy khám phá bằng cách trải nghiệm ứng dụng!',
        tier: 'gold',
        maxProgress: 10,
        unit: 'từ cẩn thận',
        pointsReward: 200
      }
    };

    let userAchievements = JSON.parse(localStorage.getItem('vocaflow_user_achievements') || '{}');
    let userPinnedBadges = JSON.parse(localStorage.getItem('vocaflow_pinned_badges') || '[]');
    let currentAchievementsTab = 'all';
    let currentAchievementsTier = 'all';
    let isClaimingAchievement = {};

    // Skill & Luck Tracking Variables
    let quizNoHintCurrentStreak = 0;
    let speakingListenAllConsecutiveCount = 0;
    let currentFlowCalendarMonthOffset = 0;

    const BADGE_TIER_CONFIG = {
      bronze:  { name: 'Đồng 🥉', color: '#cd7f32', border: 'rgba(205,127,50,0.4)', bg: 'rgba(205,127,50,0.08)', glow: '0 0 10px rgba(205,127,50,0.2)' },
      silver:  { name: 'Bạc 🥈', color: '#94a3b8', border: 'rgba(148,163,184,0.4)', bg: 'rgba(148,163,184,0.08)', glow: '0 0 10px rgba(148,163,184,0.2)' },
      gold:    { name: 'Vàng 🥇', color: '#f59e0b', border: 'rgba(245,158,11,0.45)', bg: 'rgba(245,158,11,0.08)', glow: '0 0 12px rgba(245,158,11,0.3)' },
      diamond: { name: 'Kim Cương 💎', color: '#38bdf8', border: 'rgba(56,189,248,0.45)', bg: 'rgba(56,189,248,0.08)', glow: '0 0 14px rgba(56,189,248,0.35)' },
      mythic:  { name: 'Thần Thoại 👑', color: '#ec4899', border: 'rgba(236,72,153,0.5)', bg: 'linear-gradient(135deg, rgba(236,72,153,0.12), rgba(245,158,11,0.12))', glow: '0 0 16px rgba(236,72,153,0.4)' }
    };

    // Helper: Local Date Formatter YYYY-MM-DD
    function formatLocalDateString(d) {
      if (!d) d = new Date(getTrustedCurrentTimestamp());
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    // ANTI-EXPLOIT: Calculate Unique Normalized Distinct Mastered Terms (Immune to clone/copy deck)
    function getUniqueMasteredTermsCount() {
      if (!Array.isArray(words) || words.length === 0) return 0;
      const uniqueSet = new Set();
      words.forEach(w => {
        if (!w || !w.term || typeof w.term !== 'string') return;
        const cleanTerm = w.term.trim().toLowerCase();
        if (cleanTerm.length >= 2) {
          const isMastered = (w.status === 'mastered') || (typeof w.masteryScore === 'number' && w.masteryScore >= 100);
          if (isMastered) {
            uniqueSet.add(cleanTerm);
          }
        }
      });
      return uniqueSet.size;
    }

    function saveAchievementsState() {
      if (!currentUser || !currentUser.email) return; // Guest cannot save achievements

      localStorage.setItem('vocaflow_user_achievements', JSON.stringify(userAchievements));
      localStorage.setItem('vocaflow_pinned_badges', JSON.stringify(userPinnedBadges));

      if (currentUser && currentUser.uid && firebaseConfig.databaseURL) {
        const authParam = currentUser.idToken ? `?auth=${currentUser.idToken}` : '';
        const rtdbUrl = firebaseConfig.databaseURL;
        
        fetch(`${rtdbUrl}/users/${currentUser.uid}/achievements.json${authParam}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userAchievements)
        }).catch(() => {});

        fetch(`${rtdbUrl}/users/${currentUser.uid}/pinnedBadges.json${authParam}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userPinnedBadges)
        }).catch(() => {});

        fetch(`${rtdbUrl}/users/${currentUser.uid}/profile/pinnedBadges.json${authParam}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userPinnedBadges)
        }).catch(() => {});
      }
    }

    function updateAchievementProgress(id, currentVal) {
      if (!currentUser || !currentUser.email) return; // Guest cannot earn achievements

      const badgeDef = ACHIEVEMENTS_REGISTRY[id];
      if (!badgeDef) return;

      if (!userAchievements[id]) {
        userAchievements[id] = { unlocked: false, progress: 0, unlockedAt: null, claimedReward: false };
      }

      const userAch = userAchievements[id];
      if (userAch.unlocked) return;

      userAch.progress = Math.min(badgeDef.maxProgress, Math.max(userAch.progress || 0, currentVal));
      if (userAch.progress >= badgeDef.maxProgress) {
        checkAndUnlockAchievement(id);
      } else {
        saveAchievementsState();
      }
    }

    function checkAndUnlockAchievement(id) {
      if (!currentUser || !currentUser.email) return false; // Guest cannot earn achievements

      const badgeDef = ACHIEVEMENTS_REGISTRY[id];
      if (!badgeDef) return false;

      if (!userAchievements[id]) {
        userAchievements[id] = { unlocked: false, progress: 0, unlockedAt: null, claimedReward: false };
      }

      const userAch = userAchievements[id];
      if (userAch.unlocked) return false; // Already unlocked

      userAch.unlocked = true;
      userAch.unlockedAt = new Date().toISOString();
      userAch.progress = badgeDef.maxProgress;
      userAch.claimedReward = false; // Manual claim required

      // Send in-app notification
      if (typeof addNotification === 'function') {
        const notifTitle = badgeDef.isSecret ? `🥚 Mở Khóa Thành Tựu Bí Ẩn: ${badgeDef.name}` : `🏆 Mở Khóa Danh Hiệu: ${badgeDef.name}`;
        addNotification(
          'ACHIEVEMENT',
          notifTitle,
          `Chúc mừng bạn đã xuất sắc khám phá và mở khóa danh hiệu "${badgeDef.name}" (${badgeDef.icon})! Hãy vào Bảng Thành Tựu để nhận thưởng +${badgeDef.pointsReward} VoCoin và ghim huy hiệu lên Hồ Sơ Cá Nhân nhé.`
        );
      }

      // Play gentle celebration sound & show toast
      playVocaSfx('success');
      showToast(`🎉 Mở khóa ${badgeDef.isSecret ? 'Thành Tựu Bí Ẩn' : 'Danh hiệu'} "${badgeDef.icon} ${badgeDef.name}"! Vào Bảng Thành Tựu để nhận thưởng.`);

      // Auto post to community on major milestone badges (Diamond / Legendary)
      if (typeof autoPostMilestoneToCommunity === 'function' && (badgeDef.tier === 'diamond' || badgeDef.tier === 'legendary')) {
        autoPostMilestoneToCommunity('badge', {
          badgeId: id,
          name: badgeDef.name,
          icon: badgeDef.icon,
          desc: badgeDef.desc,
          tier: badgeDef.tier
        });
      }

      saveAchievementsState();
      renderAchievementsList();
      renderProfilePinnedBadges();
      return true;
    }

    // MANUAL REWARD CLAIM ENGINE (With Cloud Anti-Duplicate Guarantee)
    async function claimAchievementReward(id) {
      if (!currentUser || !currentUser.email) {
        openAchievementsModal();
        return;
      }

      const badgeDef = ACHIEVEMENTS_REGISTRY[id];
      if (!badgeDef) return;

      if (!userAchievements[id]) {
        userAchievements[id] = { unlocked: false, progress: 0, unlockedAt: null, claimedReward: false };
      }

      const userAch = userAchievements[id];
      if (!userAch.unlocked) {
        showToast('🔒 Bạn chưa mở khóa thành tựu này!');
        return;
      }

      if (userAch.claimedReward) {
        showToast('⚠️ Bạn đã nhận phần thưởng cho thành tựu này rồi!');
        return;
      }

      if (isClaimingAchievement[id]) return;
      isClaimingAchievement[id] = true;

      const rewardPts = badgeDef.pointsReward || 50;

      // 1. Cloud Anti-Duplicate Check
      if (currentUser && currentUser.uid && !currentUser.uid.startsWith('guest_') && firebaseConfig.databaseURL) {
        const authParam = currentUser.idToken ? `?auth=${currentUser.idToken}` : '';
        const rtdbUrl = firebaseConfig.databaseURL;

        try {
          const checkRes = await fetch(`${rtdbUrl}/users/${currentUser.uid}/achievements/${id}/claimedReward.json${authParam}`);
          if (checkRes.ok) {
            const alreadyClaimedOnCloud = await checkRes.json();
            if (alreadyClaimedOnCloud === true) {
              userAch.claimedReward = true;
              saveAchievementsState();
              renderAchievementsList();
              showToast('⚠️ Phần thưởng thành tựu này đã được nhận trước đó!');
              isClaimingAchievement[id] = false;
              return;
            }
          }
        } catch (e) {
          console.warn('Cloud check claim note:', e);
        }
      }

      // 2. Mark claimed & award points
      userAch.claimedReward = true;
      userAch.claimedAt = new Date().toISOString();

      setUserPoints(getUserPoints() + rewardPts);
      addLedgerEntry('ACHIEVEMENT_REWARD', rewardPts, `🏆 Thưởng Thành tựu: "${badgeDef.name}" (${badgeDef.icon})`);

      saveAchievementsState();
      renderAchievementsList();
      updateEconomyUI();
      playVocaSfx('success');
      showToast(`🎁 Đã nhận thành công +${rewardPts} VoCoin từ "${badgeDef.name}"!`);

      isClaimingAchievement[id] = false;
    }


  // =========================================================================
  // USER GUIDE & KNOWLEDGE BASE ENGINE (v0.10.9-alpha-2)
  // =========================================================================
  let currentGuideCategory = 'starter';
  let currentGuideStarterStep = 0;
  const guideStarterStepsCount = 5;
  let guideReturnContext = null;

  const guideStarterTitles = [
    'Đăng Ký & Đăng Nhập Tài Khoản',
    'Cài Đặt Khóa API Gemini Miễn Phí',
    'Nhập Giftcode Tân Thủ (+200 VoCoin, +20 VocaHint)',
    '3 Cách Tạo Bài Học & Nạp Từ Vựng',
    '4 Chế Độ Học Cốt Lõi Tại VocaFlow'
  ];

  function openUserGuideModal(category = 'starter', stepIndex = 0, targetScrollTop = null) {
    switchUserGuideCategory(category, targetScrollTop === null);
    if (category === 'starter') {
      goToStarterStep(stepIndex, targetScrollTop === null);
    }
    openModal('modal-user-guide');
    if (targetScrollTop !== null && targetScrollTop > 0) {
      setTimeout(() => {
        const contentArea = document.getElementById('guide-content-area');
        if (contentArea) contentArea.scrollTop = targetScrollTop;
      }, 50);
    }
  }

  function switchUserGuideCategory(catKey, resetScroll = true) {
    currentGuideCategory = catKey;
    const allCategories = ['starter', 'flow', 'economy', 'creator', 'vip', 'shortcuts'];

    allCategories.forEach(cat => {
      const btn = document.getElementById(`guide-tab-btn-${cat}`);
      const panel = document.getElementById(`guide-cat-panel-${cat}`);
      if (btn) {
        if (cat === catKey) {
          btn.classList.add('active');
          btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } else {
          btn.classList.remove('active');
        }
      }
      if (panel) {
        if (cat === catKey) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      }
    });

    if (resetScroll) {
      const contentArea = document.getElementById('guide-content-area');
      if (contentArea) contentArea.scrollTop = 0;
    }
  }

  function updateStarterStepUI(resetScroll = true) {
    for (let i = 0; i < guideStarterStepsCount; i++) {
      const slide = document.getElementById(`guide-starter-slide-${i}`);
      if (slide) {
        if (i === currentGuideStarterStep) slide.classList.add('active');
        else slide.classList.remove('active');
      }
    }

    const dots = document.querySelectorAll('#guide-starter-dots .guide-step-dot');
    dots.forEach((dot, idx) => {
      if (idx === currentGuideStarterStep) {
        dot.className = 'guide-step-dot active';
      } else if (idx < currentGuideStarterStep) {
        dot.className = 'guide-step-dot passed';
      } else {
        dot.className = 'guide-step-dot';
      }
    });

    const badgeEl = document.getElementById('guide-starter-step-badge');
    const titleEl = document.getElementById('guide-starter-step-title');
    const pageIndEl = document.getElementById('guide-starter-page-indicator');
    const prevBtn = document.getElementById('guide-starter-btn-prev');
    const nextBtn = document.getElementById('guide-starter-btn-next');

    if (badgeEl) badgeEl.textContent = `Bước ${currentGuideStarterStep + 1} / ${guideStarterStepsCount}`;
    if (titleEl) titleEl.textContent = guideStarterTitles[currentGuideStarterStep] || '';
    if (pageIndEl) pageIndEl.textContent = `Trang ${currentGuideStarterStep + 1} / ${guideStarterStepsCount}`;

    if (prevBtn) prevBtn.disabled = (currentGuideStarterStep === 0);

    if (nextBtn) {
      if (currentGuideStarterStep === guideStarterStepsCount - 1) {
        nextBtn.innerHTML = '🚀 Bắt Đầu Học Ngay!';
        nextBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        nextBtn.style.borderColor = 'transparent';
      } else {
        nextBtn.innerHTML = 'Trang Tiếp ❯';
        nextBtn.style.background = 'var(--primary)';
        nextBtn.style.borderColor = 'var(--primary)';
      }
    }

    if (resetScroll) {
      const contentArea = document.getElementById('guide-content-area');
      if (contentArea) contentArea.scrollTop = 0;
    }
  }

  function navigateStarterStep(delta) {
    const nextStep = currentGuideStarterStep + delta;
    if (nextStep >= guideStarterStepsCount) {
      closeModal('modal-user-guide');
      showToast('🎉 Chúc bạn có những giờ học tiếng Anh tuyệt vời cùng VocaFlow!');
      return;
    }
    if (nextStep >= 0 && nextStep < guideStarterStepsCount) {
      currentGuideStarterStep = nextStep;
      updateStarterStepUI();
    }
  }

  function goToStarterStep(idx, resetScroll = true) {
    if (idx >= 0 && idx < guideStarterStepsCount) {
      currentGuideStarterStep = idx;
      updateStarterStepUI(resetScroll);
    }
  }

  function navigateFromGuide(openActionFn, targetModalId) {
    const contentArea = document.getElementById('guide-content-area');
    guideReturnContext = {
      category: currentGuideCategory,
      starterStep: currentGuideStarterStep,
      scrollTop: contentArea ? contentArea.scrollTop : 0,
      targetModalId: targetModalId
    };
    closeModal('modal-user-guide');
    if (typeof openActionFn === 'function') {
      openActionFn();
    }
  }

  function applyGiftcodeFromGuide(code) {
    navigateFromGuide(() => {
      openShopModal();
      setTimeout(() => {
        const codeInput = document.getElementById('shop-gift-code-input');
        if (codeInput) {
          codeInput.value = code;
          codeInput.focus();
          codeInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          codeInput.style.transition = 'all 0.3s ease';
          codeInput.style.boxShadow = '0 0 16px #f59e0b';
          codeInput.style.borderColor = '#f59e0b';
          setTimeout(() => {
            codeInput.style.boxShadow = '';
            codeInput.style.borderColor = '';
          }, 1800);
        }
        showToast('🎁 Đã điền mã HELLOKHANG2011! Nhấn "Đổi Quà" để nhận +200 VoCoin và +20 VocaHint nhé!');
      }, 300);
    }, 'modal-shop');
  }

  function openAiKeyFromGuide() {
    navigateFromGuide(() => {
      openSettingsModal();
      setTimeout(() => {
        const keyInput = document.getElementById('gemini-api-key-input-1') || document.getElementById('gemini-api-key-input');
        if (keyInput) {
          keyInput.focus();
          keyInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          keyInput.style.transition = 'all 0.3s ease';
          keyInput.style.boxShadow = '0 0 16px #10b981';
          keyInput.style.borderColor = '#10b981';
          setTimeout(() => {
            keyInput.style.boxShadow = '';
            keyInput.style.borderColor = '';
          }, 1800);
        }
        showToast('🔑 Dán mã API Gemini vào ô này rồi nhấn "Lưu Cài Đặt" nhé!');
      }, 300);
    }, 'modal-settings');
  }

  function checkUrlProfileDeepLink() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const userParam = urlParams.get('user') || urlParams.get('u') || urlParams.get('profile');
      if (userParam) {
        const clean = userParam.replace(/^@/, '').trim();
        if (clean) {
          setTimeout(() => {
            if (typeof openPublicProfileModal === 'function') {
              openPublicProfileModal(clean, '', clean);
            } else if (typeof openPublicProfileByAuthor === 'function') {
              openPublicProfileByAuthor(clean, '', clean);
            }
          }, 800);
        }
      }
    } catch (e) {}
  }
  window.checkUrlProfileDeepLink = checkUrlProfileDeepLink;
