// =========================================================================
// VOCAFLOW SPA ROUTER & URL HISTORY ENGINE (v0.10.9-58 Build 290)
// Enables direct clean URLs, deep sub-links & browser history navigation (pushState/popstate)
// =========================================================================

let isRouterNavigating = false;

function getAppBasePath() {
  if (window.location.protocol === 'file:') return '';
  const pathname = window.location.pathname;
  const lower = pathname.toLowerCase();
  const idx = lower.indexOf('/vocaflow');
  if (idx !== -1) {
    return pathname.slice(idx, idx + '/vocaflow'.length);
  }
  return '';
}
window.getAppBasePath = getAppBasePath;

function updateAppUrlRoute(routePath, title = 'VocaFlow', replace = false) {
  if (window.location.protocol === 'file:') return;
  if (isRouterNavigating) return;

  const basePath = getAppBasePath();
  let cleanRoute = routePath.startsWith('/') ? routePath : '/' + routePath;
  let fullTarget = '';
  if (cleanRoute === '/' || cleanRoute === '/homepage') {
    fullTarget = basePath ? (basePath + '/') : '/';
  } else {
    fullTarget = basePath ? (basePath + cleanRoute) : cleanRoute;
  }

  try {
    const currentUrl = window.location.pathname + window.location.search;
    if (currentUrl === fullTarget) return;

    if (replace) {
      window.history.replaceState({ route: cleanRoute }, title, fullTarget);
    } else {
      window.history.pushState({ route: cleanRoute }, title, fullTarget);
    }
  } catch (e) {
    console.warn('Router pushState failed:', e);
  }
}
window.updateAppUrlRoute = updateAppUrlRoute;

function resolveRouteFromUrl() {
  const l = window.location;
  const searchParams = new URLSearchParams(l.search);

  // 1. Check referral code param ?ref=... / ?invite=...
  const refParam = searchParams.get('ref') || searchParams.get('invite');
  if (refParam) {
    const cleanRef = refParam.trim().toUpperCase();
    if (cleanRef) sessionStorage.setItem('vocaflow_pending_ref_code', cleanRef);
  }

  // 2. Check GitHub Pages 404 SPA redirect param ?p=...
  const pParam = searchParams.get('p');
  if (pParam) {
    let decoded = decodeURIComponent(pParam);
    return decoded.split('?')[0].trim();
  }

  // 3. Check legacy deep-link params ?user=... / ?u=... / ?profile=...
  const userParam = searchParams.get('user') || searchParams.get('u') || searchParams.get('profile');
  const postParam = searchParams.get('post') || searchParams.get('p_id');
  if (userParam) {
    const cleanUser = userParam.replace(/^@+/, '').split('?')[0].replace(/\/+$/, '').trim();
    if (postParam) {
      return `/@${cleanUser}/post/${postParam.trim()}`;
    }
    return cleanUser ? '/@' + cleanUser : '';
  }

  if (postParam) {
    return `/community/post/${postParam.trim()}`;
  }

  // 4. Check direct pathname
  const basePath = getAppBasePath();
  let path = l.pathname;
  if (basePath && path.toLowerCase().startsWith(basePath.toLowerCase())) {
    path = path.slice(basePath.length);
  }
  if (!path || path === '/' || path === '/index.html' || path === '/vocaflow.html' || path === '/homepage') {
    if (refParam) return `/invite/${refParam.trim().toUpperCase()}`;
    return '/';
  }
  return path.split('?')[0].trim();
}
window.resolveRouteFromUrl = resolveRouteFromUrl;

function navigateToRoute(route, isPopState = false) {
  if (!route) return;
  isRouterNavigating = true;

  try {
    let clean = route.trim();
    if (clean.startsWith('/')) clean = clean.slice(1);
    clean = clean.split('?')[0].split('#')[0].replace(/\/+$/, '').trim();
    const segments = clean.split('/').map(s => s.trim().toLowerCase());
    const firstSegment = segments[0] || '';
    const secondSegment = segments[1] || '';

    // 1. Handle deep link to specific post: /@username/post/postId or user/@username/post/postId
    if (clean.includes('/post/')) {
      const parts = clean.split('/post/');
      const authorPart = parts[0].replace(/^(user\/@?|u\/|@+)/, '').trim();
      const postId = (parts[1] || '').trim();

      if (authorPart && authorPart !== 'community') {
        if (typeof openPublicProfileModal === 'function') {
          openPublicProfileModal('@' + authorPart, '', authorPart);
        } else if (typeof openPublicProfileByAuthor === 'function') {
          openPublicProfileByAuthor('@' + authorPart, '', authorPart);
        }
        setTimeout(() => {
          if (typeof switchPubProfileTab === 'function') switchPubProfileTab('community');
          if (postId && typeof highlightAndScrollToPost === 'function') {
            highlightAndScrollToPost(postId, true);
          }
        }, 300);
        return;
      } else if (postId) {
        if (typeof openProfileModal === 'function') openProfileModal('community');
        setTimeout(() => {
          if (typeof togglePostCommentsSection === 'function') {
            communityActiveCommentsPostId = postId;
            if (typeof renderCommunityFeed === 'function') renderCommunityFeed();
          }
          if (typeof highlightAndScrollToPost === 'function') {
            highlightAndScrollToPost(postId, false);
          }
        }, 300);
        return;
      }
    }

    // 2. Handle /invite/@username/code or /invite/code or /referral/...
    if (firstSegment === 'invite' || firstSegment === 'referral') {
      const parts = clean.split('/').filter(Boolean);
      let refCode = '';
      if (parts.length >= 3) {
        refCode = parts[2].trim().toUpperCase();
      } else if (parts.length === 2) {
        const seg = parts[1].trim();
        if (!seg.startsWith('@')) {
          refCode = seg.toUpperCase();
        }
      }
      if (refCode) {
        sessionStorage.setItem('vocaflow_pending_ref_code', refCode);
      }
      if (typeof openReferralModal === 'function') openReferralModal();
      return;
    }

    // 3. Handle /me sub-routes: /me/mydeck, /me/stats, /me/achievements, /me/community, /me/sync, /me/followers, /me/following
    if (firstSegment === 'me' || firstSegment === 'profile') {
      if (secondSegment === 'followers' || secondSegment === 'follower') {
        if (typeof openProfileModal === 'function') openProfileModal('decks');
        setTimeout(() => {
          if (typeof openSubscribersListModal === 'function') openSubscribersListModal('followers');
        }, 120);
        return;
      }
      if (secondSegment === 'following' || secondSegment === 'follows') {
        if (typeof openProfileModal === 'function') openProfileModal('decks');
        setTimeout(() => {
          if (typeof openSubscribersListModal === 'function') openSubscribersListModal('following');
        }, 120);
        return;
      }
      if (secondSegment === 'stats' || secondSegment === 'chiso') {
        if (typeof openProfileModal === 'function') openProfileModal('stats');
        return;
      }
      if (secondSegment === 'achievements' || secondSegment === 'thanhtuu' || secondSegment === 'badges') {
        if (typeof openProfileModal === 'function') openProfileModal('achievements');
        return;
      }
      if (secondSegment === 'community' || secondSegment === 'congdong' || secondSegment === 'feed') {
        if (typeof openProfileModal === 'function') openProfileModal('community');
        return;
      }
      if (secondSegment === 'sync' || secondSegment === 'cloud' || secondSegment === 'dongbo') {
        if (typeof openProfileModal === 'function') openProfileModal('cloud');
        return;
      }
      // Default /me or /me/mydeck or /me/decks
      if (typeof openProfileModal === 'function') openProfileModal('decks');
      return;
    }

    // 4. Handle Public Profile sub-routes: /@handle/stats, /@handle/community, /@handle/decks, /@handle/followers, /@handle/following
    if (firstSegment.startsWith('@') || firstSegment === 'user' || firstSegment === 'u') {
      let handle = '';
      let subTab = '';
      if (firstSegment.startsWith('@')) {
        handle = firstSegment.replace(/^@+/, '').trim();
        subTab = secondSegment;
      } else {
        handle = (secondSegment || '').replace(/^@+/, '').trim();
        subTab = segments[2] || '';
      }

      if (handle) {
        if (typeof openPublicProfileModal === 'function') {
          openPublicProfileModal('@' + handle, '', handle);
        } else if (typeof openPublicProfileByAuthor === 'function') {
          openPublicProfileByAuthor('@' + handle, '', handle);
        }

        if (subTab === 'stats') {
          setTimeout(() => { if (typeof switchPubProfileTab === 'function') switchPubProfileTab('stats'); }, 200);
        } else if (subTab === 'community') {
          setTimeout(() => { if (typeof switchPubProfileTab === 'function') switchPubProfileTab('community'); }, 200);
        } else {
          setTimeout(() => { if (typeof switchPubProfileTab === 'function') switchPubProfileTab('decks'); }, 200);
        }
      }
      return;
    }

    // 5. Handle /deck/:deckId
    if (firstSegment === 'deck' && secondSegment) {
      const targetDeckId = clean.split('/')[1]?.trim();
      if (targetDeckId && typeof openDeckDetail === 'function') {
        openDeckDetail(targetDeckId);
      }
      return;
    }

    // 6. Handle /study/:mode
    if (firstSegment === 'study' && secondSegment) {
      if (secondSegment === 'quiz' && typeof startQuizMode === 'function') {
        startQuizMode();
        return;
      }
      if (secondSegment === 'spelling' && typeof startSpellingMode === 'function') {
        startSpellingMode();
        return;
      }
      if (secondSegment === 'speaking' && typeof startSpeakingMode === 'function') {
        startSpeakingMode();
        return;
      }
    }

    // 7. Clean primary navigation and modal routes
    switch (firstSegment) {
      case 'homepage':
      case 'decks':
      case 'home':
        if (typeof showScreen === 'function') showScreen('screen-decks');
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        break;

      case 'community':
      case 'feed':
        if (typeof openProfileModal === 'function') openProfileModal('community');
        break;

      case 'shop':
      case 'store':
        if (typeof openShopModal === 'function') openShopModal();
        break;

      case 'vocavip':
      case 'vip':
      case 'pricing':
        if (typeof openVipPricingModal === 'function') openVipPricingModal();
        break;

      case 'flowtreak':
      case 'flowstreak':
      case 'streak':
      case 'calendar':
        if (typeof openFlowCalendarModal === 'function') openFlowCalendarModal();
        break;

      case 'notifications':
      case 'notification':
      case 'notif':
        if (typeof openNotificationsModal === 'function') openNotificationsModal();
        break;

      case 'vocamail':
      case 'mail':
      case 'inbox':
        if (typeof openVocaMailModal === 'function') openVocaMailModal();
        break;

      case 'report':
      case 'bug':
      case 'feedback':
        if (typeof openBugReportModal === 'function') openBugReportModal();
        break;

      case 'ads':
      case 'ad':
      case 'rewarded-ad':
      case 'video-ads':
        if (typeof openRewardedAdModal === 'function') openRewardedAdModal();
        break;

      case 'queue':
      case 'review':
      case 'daily':
        if (typeof openReviewQueueModal === 'function') openReviewQueueModal();
        break;

      case 'vocalib':
      case 'library':
      case 'lib':
        if (typeof openLibraryModal === 'function') openLibraryModal();
        break;

      case 'vocadeckai':
      case 'aistudio':
      case 'ai-studio':
      case 'deckai':
        if (typeof openAiDeckStudioModal === 'function') openAiDeckStudioModal();
        break;

      case 'dev':
      case 'publisher':
      case 'admin':
        if (sessionStorage.getItem('vocaflow_dev_authorized') === 'true') {
          if (typeof openPublisherModal === 'function') openPublisherModal('students');
        } else {
          const pass = prompt('🔒 CỔNG QUẢN TRỊ DEVELOPER (PUBLISHER PORTAL)\nVui lòng nhập mật khẩu xác thực Developer:');
          if (pass) {
            const cleanPass = pass.toLowerCase().trim().replace(/\s+/g, ' ');
            const validTriggers = [
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
            if (validTriggers.includes(cleanPass)) {
              sessionStorage.setItem('vocaflow_dev_authorized', 'true');
              if (typeof showToast === 'function') showToast('🕹️ Xác thực Developer thành công!');
              if (typeof openPublisherModal === 'function') openPublisherModal('students');
            } else {
              if (typeof showToast === 'function') showToast('⛔ Mật khẩu Developer không chính xác!');
              if (typeof showScreen === 'function') showScreen('screen-decks');
            }
          } else {
            if (typeof showScreen === 'function') showScreen('screen-decks');
          }
        }
        break;

      case 'mentor':
      case 'ai':
      case 'chat':
        if (typeof openAiMentorModal === 'function') openAiMentorModal();
        break;

      case 'wallet':
      case 'studio':
        if (typeof openWalletStudioModal === 'function') openWalletStudioModal();
        break;

      case 'mistakes':
      case 'errors':
        if (typeof openMistakeNotebookModal === 'function') openMistakeNotebookModal();
        break;

      case 'wheel':
      case 'spin':
        if (typeof openLuckyWheelModal === 'function') openLuckyWheelModal();
        break;

      case 'settings':
        if (typeof openSettingsModal === 'function') openSettingsModal();
        break;

      case 'achievements':
      case 'badges':
        if (typeof openAchievementsModal === 'function') openAchievementsModal();
        break;

      case 'guide':
      case 'help':
        if (typeof openUserGuideModal === 'function') openUserGuideModal();
        break;

      default:
        // Default to homepage without error
        if (typeof showScreen === 'function') showScreen('screen-decks');
        break;
    }
  } finally {
    isRouterNavigating = false;
  }
}
window.navigateToRoute = navigateToRoute;

function initSpaRouter() {
  const targetRoute = resolveRouteFromUrl();

  // Restore clean URL in address bar if ?p= or legacy ?user= was used
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.has('p') || searchParams.has('user') || searchParams.has('u') || searchParams.has('profile')) {
    const basePath = getAppBasePath();
    const cleanPath = (targetRoute.startsWith('/') ? targetRoute : '/' + targetRoute);
    const fullTarget = (cleanPath === '/' || cleanPath === '/homepage') ? (basePath ? (basePath + '/') : '/') : (basePath ? (basePath + cleanPath) : cleanPath);
    try {
      window.history.replaceState({ route: cleanPath }, 'VocaFlow', fullTarget);
    } catch (e) {}
  }

  // Delay slightly to let data and DOM finish initializing
  setTimeout(() => {
    navigateToRoute(targetRoute, false);
  }, 400);

  // Listen to popstate (Browser Back/Forward buttons)
  window.addEventListener('popstate', (e) => {
    const route = resolveRouteFromUrl();
    navigateToRoute(route, true);
  });
}
window.initSpaRouter = initSpaRouter;

