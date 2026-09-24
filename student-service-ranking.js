(() => {
  'use strict';

  // Web App เดิมของระบบหลัก (ไม่ต้องสร้าง Apps Script แยก)
  const STUDENT_SERVICE_API_URL =
    window.APP_CONFIG.API_URL;

  const LEVELS = ['ประถม', 'ม.ต้น', 'ม.ปลาย'];
  const CACHE_KEY = 'LP360:TAMBOL:studentServiceTop3:v7-top3-heading-org';
  const CACHE_AGE = 5 * 60 * 1000;
  const AUTO_ROTATE_DELAY = 4000;
  let rankingData = null;
  let autoRotateTimer = null;
  let activeLevelIndex = 0;
  let autoRotateStoppedByUser = false;
  let autoRotatePausedByHover = false;

  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function displayFirstName(fullName) {
    const name = String(fullName ?? '').trim().replace(/\s+/g, ' ');
    if (!name) return '';

    const parts = name.split(' ');
    if (parts.length <= 1) return name;

    // รองรับนามสกุลลักษณะ "ณ เชียงใหม่" โดยตัดทั้งส่วนสกุลออก
    if (parts.length >= 3 && parts[parts.length - 2] === 'ณ') {
      return parts.slice(0, -2).join(' ') || parts[0];
    }

    return parts.slice(0, -1).join(' ');
  }

  function readCache() {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      return cached && Date.now() - cached.savedAt < CACHE_AGE
        ? cached.data
        : null;
    } catch (_) {
      return null;
    }
  }

  function writeCache(data) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
    } catch (_) {}
  }

  function renderPerson(row, rank, position) {
    if (!row) {
      return `<div class="student-service-podium-person is-empty ${position}" aria-hidden="true"></div>`;
    }

    const fullName = String(row.fullName || row.teacher || '').trim();
    const displayName = String(row.displayName || '').trim() || displayFirstName(fullName);
    const photoUrl = String(row.photoUrl || '').trim();
    const percent = Number(row.percent || 0).toFixed(2);
    const photo = photoUrl
      ? `<img class="student-service-podium-photo" src="${escapeHtml(photoUrl)}" alt="รูป ${escapeHtml(fullName || displayName)}" loading="lazy" decoding="async"><span class="student-service-podium-fallback" hidden aria-hidden="true"><i class="fa-solid fa-user"></i></span>`
      : `<span class="student-service-podium-fallback" aria-hidden="true"><i class="fa-solid fa-user"></i></span>`;

    return `
      <div class="student-service-podium-person rank-${rank} ${position}">
        <div class="student-service-podium-avatar-wrap">
          <span class="student-service-podium-rank">${rank}</span>
          <div class="student-service-podium-avatar">${photo}</div>
        </div>
        <div class="student-service-podium-name">${escapeHtml(displayName)}</div>
        <div class="student-service-podium-percent">${percent}%</div>
      </div>
    `;
  }

  function renderCard(card, level) {
    const type = card.dataset.rankingType;
    const ranking = card.querySelector('.student-service-ranking');
    const rows = rankingData && rankingData[type] && Array.isArray(rankingData[type][level])
      ? rankingData[type][level].slice(0, 3)
      : [];

    card.querySelectorAll('.student-service-tabs button').forEach(button => {
      const active = button.dataset.level === level;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });

    if (!rows.length) {
      ranking.innerHTML = `
        <div class="student-service-slide-level">${escapeHtml(level)}</div>
        <span class="student-service-ranking-status">ยังไม่มีข้อมูล</span>
      `;
      return;
    }

    const rank1 = rows.find(row => Number(row.rank) === 1) || rows[0] || null;
    const rank2 = rows.find(row => Number(row.rank) === 2) || rows[1] || null;
    const rank3 = rows.find(row => Number(row.rank) === 3) || rows[2] || null;

    ranking.innerHTML = `
      <div class="student-service-slide-level">${escapeHtml(level)}</div>
      <div class="student-service-podium" aria-label="3 ลำดับสูงสุด ระดับ ${escapeHtml(level)}">
        ${renderPerson(rank2, 2, 'podium-left')}
        ${renderPerson(rank1, 1, 'podium-center')}
        ${renderPerson(rank3, 3, 'podium-right')}
      </div>
    `;
  }

  function updateTop3Organization() {
    const target = document.getElementById('studentServiceTop3Organization');
    if (!target) return;
    const organizationName = String(
      rankingData && rankingData.organizationName
        ? rankingData.organizationName
        : ''
    ).trim();
    target.textContent = organizationName || '...';
  }

  function renderAll(level) {
    updateTop3Organization();
    document.querySelectorAll('[data-ranking-type]').forEach(card => {
      const active = card.querySelector('.student-service-tabs .is-active');
      renderCard(card, level || (active ? active.dataset.level : LEVELS[0]));
    });
  }

  function stopAutoRotate() {
    if (autoRotateTimer) {
      window.clearInterval(autoRotateTimer);
      autoRotateTimer = null;
    }
  }

  function startAutoRotate() {
    stopAutoRotate();
    if (autoRotateStoppedByUser || autoRotatePausedByHover || !rankingData) return;

    autoRotateTimer = window.setInterval(() => {
      activeLevelIndex = (activeLevelIndex + 1) % LEVELS.length;
      renderAll(LEVELS[activeLevelIndex]);
    }, AUTO_ROTATE_DELAY);
  }

  function bindRankingHoverPause() {
    document.querySelectorAll(
      '.student-service-card[data-ranking-type="quiz"], .student-service-card[data-ranking-type="worksheet"]'
    ).forEach(card => {
      if (card.dataset.rankingHoverPauseBound === '1') return;
      card.dataset.rankingHoverPauseBound = '1';

      card.addEventListener('mouseenter', () => {
        autoRotatePausedByHover = true;
        stopAutoRotate();
      });

      card.addEventListener('mouseleave', () => {
        autoRotatePausedByHover = false;
        startAutoRotate();
      });
    });
  }

  function showError(message) {
    document.querySelectorAll('[data-ranking-type] .student-service-ranking').forEach(box => {
      box.innerHTML = `<span class="student-service-ranking-status">${escapeHtml(message)}</span>`;
    });
  }

  async function loadRankings() {
    rankingData = readCache();
    if (rankingData) {
      activeLevelIndex = 0;
      renderAll(LEVELS[activeLevelIndex]);
      startAutoRotate();
      return;
    }

    if (!/^https:\/\/script\.google\.com\/macros\/s\//.test(STUDENT_SERVICE_API_URL)) {
      showError('กรุณาตั้งค่า URL Apps Script');
      return;
    }

    try {
      let result;
      if (window.SiteFast) {
        result = await window.SiteFast.fetchMode(
          'studentServiceTop3',
          {},
          { key: 'studentServiceTop3:v7-top3-heading-org', ttl: CACHE_AGE }
        );
      } else {
        const separator = STUDENT_SERVICE_API_URL.includes('?') ? '&' : '?';
        const response = await fetch(
          `${STUDENT_SERVICE_API_URL}${separator}mode=studentServiceTop3`,
          { method: 'GET', cache: 'default' }
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        result = await response.json();
      }
      if (!result || (!result.worksheet && !result.quiz)) {
        throw new Error('รูปแบบข้อมูลไม่ถูกต้อง');
      }

      rankingData = result;
      writeCache(result);
      activeLevelIndex = 0;
      renderAll(LEVELS[activeLevelIndex]);
      startAutoRotate();
    } catch (error) {
      console.error('Student service ranking:', error);
      showError('โหลดอันดับไม่สำเร็จ');
    }
  }

  // คง event เดิมไว้: หากในอนาคตเปิดแท็บกลับมา ผู้ใช้ยังเลือกชั้นเองได้
  document.addEventListener('click', event => {
    const tab = event.target.closest('.student-service-tabs button');
    if (!tab) return;

    autoRotateStoppedByUser = true;
    stopAutoRotate();

    activeLevelIndex = Math.max(0, LEVELS.indexOf(tab.dataset.level));
    if (rankingData) renderAll(LEVELS[activeLevelIndex]);
  });

  // รูปเสีย/ไม่มีสิทธิ์เข้าถึง: แสดงไอคอนผู้ใช้แทน โดยไม่ทำให้ ranking หาย
  document.addEventListener('error', event => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || !img.classList.contains('student-service-podium-photo')) return;
    img.hidden = true;
    const fallback = img.nextElementSibling;
    if (fallback) fallback.hidden = false;
  }, true);

  function scheduleRankings() {
    bindRankingHoverPause();
    if (window.SiteFast) window.SiteFast.whenNear('studentServicesBox', loadRankings, '700px 0px');
    else if ('requestIdleCallback' in window) requestIdleCallback(loadRankings, { timeout: 2200 });
    else setTimeout(loadRankings, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleRankings, { once: true });
  } else {
    scheduleRankings();
  }
})();
