/* ============================================================
   DJ WILMER · Lógica del reproductor PWA
   ============================================================ */
(function () {
  'use strict';

  const CFG = window.DJ_WILMER || {};
  const STATION = CFG.station || {};
  const SCHEDULES = Array.isArray(CFG.schedules) ? CFG.schedules : [];
  const HLS_CDN = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.8/dist/hls.min.js';

  const $ = (id) => document.getElementById(id);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isFileProtocol = window.location.protocol === 'file:';

  const state = {
    playing: false,
    loading: false,
    hls: null,
    hlsPromise: null,
    metadataTimer: null,
    metadataTrack: '',
    selectedDay: 'today',
    deferredPrompt: null,
    qrDataUrl: '',
    tab: 'live',
    triedFallback: false,
    connectTimer: null,
    toastTimer: null
  };

  const SCHEDULE_DAYS = [
    { key: 'monday', short: 'Lun', full: 'Lunes' },
    { key: 'tuesday', short: 'Mar', full: 'Martes' },
    { key: 'wednesday', short: 'Mié', full: 'Miércoles' },
    { key: 'thursday', short: 'Jue', full: 'Jueves' },
    { key: 'friday', short: 'Vie', full: 'Viernes' },
    { key: 'saturday', short: 'Sáb', full: 'Sábado' },
    { key: 'sunday', short: 'Dom', full: 'Domingo' }
  ];

  const JS_DAY_INDEX_TO_KEY = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  const SOCIAL_NETWORKS = [
    {
      key: 'social_whatsapp',
      title: 'WhatsApp',
      url: (value, data) => value.startsWith('http')
        ? value
        : `https://wa.me/${value.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`¡Hola! Estoy escuchando ${data.name || 'la radio'} en vivo 🎶`)}`,
      svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm5.78 14.07c-.24.68-1.2 1.25-1.68 1.29-.44.04-1 .06-3.23-.83-2.45-.98-4.04-3.48-4.16-3.64-.12-.16-.99-1.32-.99-2.52s.63-1.79.85-2.03c.22-.24.48-.3.64-.3.16 0 .32 0 .46.01.15.01.35-.06.55.42.21.5.71 1.73.77 1.86.06.13.1.28.02.44-.08.16-.12.26-.24.4-.12.14-.26.31-.37.42-.12.12-.25.25-.11.49.14.24.62 1.02 1.33 1.65.91.81 1.68 1.06 1.92 1.18.24.12.38.1.52-.06.14-.16.6-.7.76-.94.16-.24.32-.2.54-.12.22.08 1.4.66 1.64.78.24.12.4.18.46.28.06.1.06.58-.18 1.26z"/></svg>'
    },
    {
      key: 'social_instagram',
      title: 'Instagram',
      url: (value) => value,
      svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>'
    },
    {
      key: 'social_youtube',
      title: 'YouTube',
      url: (value) => value,
      svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>'
    },
    {
      key: 'social_facebook',
      title: 'Facebook',
      url: (value) => value,
      svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>'
    },
    {
      key: 'social_tiktok',
      title: 'TikTok',
      url: (value) => value,
      svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>'
    },
    {
      key: 'social_x',
      title: 'X (Twitter)',
      url: (value) => value,
      svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>'
    },
    {
      key: 'social_telegram',
      title: 'Telegram',
      url: (value) => value.startsWith('http') ? value : `https://t.me/${value.replace('@', '')}`,
      svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>'
    },
    {
      key: 'social_web',
      title: 'Sitio Web',
      url: (value) => value,
      svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>'
    },
    {
      key: 'social_twitch',
      title: 'Twitch',
      url: (value) => value,
      svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>'
    },
    {
      key: 'social_tunein',
      title: 'TuneIn',
      url: (value) => value,
      svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="2"></circle><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path></svg>'
    },
    {
      key: 'social_radiogarden',
      title: 'Radio Garden',
      url: (value) => value,
      svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>'
    },
    {
      key: 'social_donations',
      title: 'Donaciones',
      url: (value) => value,
      svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>'
    },
    {
      key: 'social_email',
      title: 'Correo electrónico',
      url: (value) => value.startsWith('mailto:') ? value : `mailto:${value}`,
      svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>'
    }
  ];

  /* ---------- Utilidades ---------- */
  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const TITLE_CONNECTORS = new Set([
    'a', 'al', 'con', 'de', 'del', 'el', 'en', 'la', 'las', 'los',
    'para', 'por', 'sin', 'sobre', 'y'
  ]);

  function formatProgramTitle(value) {
    return String(value || '').split(' ').map((word, index) => {
      if (!word) return '';
      if (/^[A-Z0-9][A-Z0-9·]+$/.test(word)) return word;
      const lower = word.toLowerCase();
      if (index > 0 && TITLE_CONNECTORS.has(lower)) return lower;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
  }

  function cacheBust(url) {
    return url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
  }

  function adjustColorBrightness(hex, percent) {
    if (!hex || typeof hex !== 'string') return null;
    let clean = hex.replace('#', '').trim();
    if (clean.length === 3) clean = clean.split('').map((c) => c + c).join('');
    if (clean.length !== 6) return null;
    const num = parseInt(clean, 16);
    if (Number.isNaN(num)) return null;
    let r = (num >> 16) + Math.round(255 * (percent / 100));
    let g = ((num >> 8) & 0x00FF) + Math.round(255 * (percent / 100));
    let b = (num & 0x0000FF) + Math.round(255 * (percent / 100));
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function hexToRgb(hex) {
    if (!hex) return null;
    let clean = String(hex).replace('#', '').trim();
    if (clean.length === 3) clean = clean.split('').map((c) => c + c).join('');
    if (clean.length !== 6) return null;
    const num = parseInt(clean, 16);
    if (Number.isNaN(num)) return null;
    return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
  }

  function showToast(message) {
    const toast = $('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => toast.classList.remove('show'), 3400);
  }

  /* ---------- Tema e identidad ---------- */
  function applyTheme() {
    const primary = (STATION.primary_color || '#FF4500').trim() || '#FF4500';
    const rgb = hexToRgb(primary) || '255, 69, 0';
    const root = document.documentElement;
    root.style.setProperty('--primary', primary);
    root.style.setProperty('--primary-rgb', rgb);

    const device = $('cuarzo-device');
    if (device) {
      device.style.setProperty('--cuarzo-primary', primary);
      device.style.setProperty('--cuarzo-dark', adjustColorBrightness(primary, -45) || '#c41026');
      device.style.setProperty('--cuarzo-mid', adjustColorBrightness(primary, -20) || '#e82c40');
      device.style.setProperty('--cuarzo-play-light', adjustColorBrightness(primary, 20) || '#ff5e70');
    }

    const stops = [
      ['cuarzoStop0', adjustColorBrightness(primary, -45) || '#c41026'],
      ['cuarzoStop1', adjustColorBrightness(primary, -20) || '#e82c40'],
      ['cuarzoStop2', primary],
      ['cuarzoStop3', primary]
    ];
    stops.forEach(([id, color]) => {
      const el = $(id);
      if (el) el.setAttribute('stop-color', color);
    });

    const metaTheme = $('meta-theme-color');
    if (metaTheme) metaTheme.setAttribute('content', primary);
  }

  function renderStation() {
    const name = (STATION.name || 'DJ WILMER').trim() || 'DJ WILMER';
    const slogan = (STATION.slogan || '').trim();
    const logo = (STATION.logo || 'assets/img/logo-1024.png').trim();
    const title = slogan ? `${name} - ${slogan}` : `${name} - En Vivo`;

    document.title = title;

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute('content', slogan || STATION.description || 'Escúchanos en vivo.');
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) ogImage.setAttribute('content', new URL(logo, window.location.href).href);

    const stationName = $('station-name');
    if (stationName) stationName.textContent = name;
    const stationSlogan = $('station-slogan');
    if (stationSlogan) stationSlogan.textContent = slogan || 'En vivo las 24 horas';

    const cover = $('station-cover');
    if (cover) {
      cover.src = logo;
      cover.alt = `Logo de ${name}`;
    }

    const splashLogo = document.querySelector('.app-splash-logo');
    if (splashLogo) splashLogo.src = logo;

    const bgLayer = $('customBgLayer');
    if (bgLayer && STATION.background) {
      bgLayer.style.backgroundImage = `url('${STATION.background}')`;
    }

    const subtitle = $('schedule-card-subtitle');
    if (subtitle) subtitle.textContent = `${name} · Programación y horarios`;

    const footerName = document.querySelector('.cuarzo-footer-text strong');
    if (footerName) footerName.textContent = name;

    $$('[data-bind="name"]').forEach((el) => { el.textContent = name; });
    $$('[data-bind="slogan"]').forEach((el) => { el.textContent = slogan || 'En vivo las 24 horas'; });
    $$('[data-bind="description"]').forEach((el) => { el.textContent = STATION.description || slogan || ''; });

    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) appleTitle.setAttribute('content', name);
  }

  function renderSocials() {
    const list = $('social-list');
    if (!list) return;

    list.innerHTML = '';

    SOCIAL_NETWORKS.forEach((network) => {
      const raw = String(STATION[network.key] || '').trim();
      if (!raw) return;

      const link = document.createElement('a');
      link.href = network.url(raw, STATION);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = `social-icon-link social-${network.key.replace(/^social_/, '')}`;
      link.title = network.title;
      link.setAttribute('aria-label', network.title);
      link.innerHTML = network.svg;
      list.appendChild(link);
    });

    if (STATION.chat && STATION.chat_url) {
      const chat = document.createElement('a');
      chat.href = STATION.chat_url;
      chat.target = '_blank';
      chat.rel = 'noopener noreferrer';
      chat.className = 'social-icon-link social-chat';
      chat.title = 'Chat en vivo';
      chat.setAttribute('aria-label', 'Abrir chat en vivo');
      chat.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
      list.appendChild(chat);
    }

    list.style.display = list.children.length ? 'flex' : 'none';
  }

  /* ---------- Programación ---------- */
  function isProgramOnAir(program) {
    if (!program || !program.start_time || !program.end_time) return false;
    const now = new Date();
    const day = (program.day_of_week || '').toLowerCase().trim();
    if (day !== JS_DAY_INDEX_TO_KEY[now.getDay()]) return false;

    const [startHour, startMinute] = program.start_time.split(':').map(Number);
    const [endHour, endMinute] = program.end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + (startMinute || 0);
    const endMinutes = endHour * 60 + (endMinute || 0);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (endMinutes > startMinutes) return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    if (endMinutes < startMinutes) return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    return true;
  }

  function renderScheduleDays() {
    const nav = $('schedule-days-nav');
    if (!nav) return;

    const todayKey = JS_DAY_INDEX_TO_KEY[new Date().getDay()];
    const todayLabel = (SCHEDULE_DAYS.find((day) => day.key === todayKey) || {}).short || 'Hoy';
    const dot = '<span class="schedule-day-today-dot" aria-hidden="true"></span>';
    let html = '';

    html += `<button type="button" class="schedule-day-tab${state.selectedDay === 'today' ? ' active' : ''}" data-day="today" role="tab" aria-selected="${state.selectedDay === 'today'}">${dot}Hoy (${todayLabel})</button>`;

    SCHEDULE_DAYS.forEach((day) => {
      const isActive = state.selectedDay === day.key;
      html += `<button type="button" class="schedule-day-tab${isActive ? ' active' : ''}" data-day="${day.key}" role="tab" aria-selected="${isActive}">${day.key === todayKey ? dot : ''}${day.short}</button>`;
    });

    html += `<button type="button" class="schedule-day-tab${state.selectedDay === 'all' ? ' active' : ''}" data-day="all" role="tab" aria-selected="${state.selectedDay === 'all'}">Semana Completa</button>`;

    nav.innerHTML = html;
    $$('.schedule-day-tab', nav).forEach((button) => {
      button.addEventListener('click', () => selectScheduleDay(button.getAttribute('data-day')));
    });
  }

  function selectScheduleDay(dayKey) {
    state.selectedDay = dayKey || 'today';
    renderScheduleDays();
    renderScheduleList();
    const list = $('schedule-list-content');
    if (list) list.scrollTop = 0;
  }

  function renderProgramCard(program) {
    const onAir = isProgramOnAir(program);
    const title = formatProgramTitle(program.program_name || 'Programa');
    const announcer = String(program.announcer_name || '').trim();
    const description = String(program.description || '').trim();
    const photo = String(program.announcer_photo_url || '').trim();

    return `
      <article class="program-card${onAir ? ' is-active-now' : ''}">
        <div class="program-card-header">
          <div class="program-time-badge">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--primary);" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <span>${escapeHtml(program.start_time || '')} - ${escapeHtml(program.end_time || '')} hs</span>
          </div>
          ${onAir ? '<div class="program-live-tag"><span class="program-live-dot"></span><span>En el Aire</span></div>' : ''}
        </div>
        <div class="program-main-info">
          <div class="program-announcer-avatar-wrap">
            ${photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(announcer || title)}" class="program-announcer-avatar" loading="lazy" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" />` : ''}
            <div class="program-announcer-fallback" style="${photo ? 'display:none;' : ''}">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line></svg>
            </div>
          </div>
          <div class="program-details">
            <h4 class="program-title">${escapeHtml(title)}</h4>
            ${announcer ? `<div class="program-announcer-name"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg><span>Conduce: <strong>${escapeHtml(announcer)}</strong></span></div>` : ''}
            ${description ? `<p class="program-description">${escapeHtml(description)}</p>` : ''}
          </div>
        </div>
      </article>`;
  }

  function renderScheduleList() {
    const container = $('schedule-list-content');
    if (!container) return;

    const todayKey = JS_DAY_INDEX_TO_KEY[new Date().getDay()];
    const targetKey = state.selectedDay === 'today' ? todayKey : state.selectedDay;
    const musicIcon = '<div class="schedule-empty-icon"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg></div>';

    if (!SCHEDULES.length) {
      container.innerHTML = `<div class="schedule-empty-state">${musicIcon}<h4 class="schedule-empty-title">Transmisión Continua 24 hs</h4><p class="schedule-empty-desc">Disfruta de nuestra programación musical ininterrumpida las 24 horas.</p></div>`;
      return;
    }

    if (targetKey === 'all') {
      let html = '';
      SCHEDULE_DAYS.forEach((day) => {
        const programs = SCHEDULES
          .filter((program) => (program.day_of_week || '').toLowerCase().trim() === day.key)
          .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

        if (programs.length) {
          html += `<div class="schedule-day-group-header"><span class="schedule-day-group-title">${day.full} ${day.key === todayKey ? '· (Hoy)' : ''}</span><span class="schedule-day-group-count">${programs.length} ${programs.length === 1 ? 'programa' : 'programas'}</span></div>`;
          programs.forEach((program) => { html += renderProgramCard(program); });
        }
      });
      container.innerHTML = html || `<div class="schedule-empty-state">${musicIcon}<h4 class="schedule-empty-title">Programación Musical 24 hs</h4><p class="schedule-empty-desc">No hay programas cargados. Transmisión continuada las 24 horas.</p></div>`;
      return;
    }

    const programs = SCHEDULES
      .filter((program) => (program.day_of_week || '').toLowerCase().trim() === targetKey)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

    if (!programs.length) {
      const dayName = (SCHEDULE_DAYS.find((day) => day.key === targetKey) || {}).full || 'este día';
      container.innerHTML = `<div class="schedule-empty-state">${musicIcon}<h4 class="schedule-empty-title">Música Continua los ${dayName}</h4><p class="schedule-empty-desc">Para los ${dayName.toLowerCase()} no hay programas especiales asignados. Disfruta de la mejor selección musical ininterrumpida las 24 horas.</p></div>`;
      return;
    }

    container.innerHTML = programs.map(renderProgramCard).join('');
  }

  /* ---------- Reproducción ---------- */
  async function ensureHlsLoaded() {
    if (typeof window.Hls !== 'undefined') return window.Hls;
    if (state.hlsPromise) return state.hlsPromise;

    state.hlsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = HLS_CDN;
      script.async = true;
      script.onload = () => resolve(window.Hls);
      script.onerror = () => {
        state.hlsPromise = null;
        reject(new Error('No se pudo cargar HLS.js'));
      };
      document.head.appendChild(script);
    });

    return state.hlsPromise;
  }

  function destroyHls() {
    if (state.hls) {
      try { state.hls.destroy(); } catch (error) { /* noop */ }
      state.hls = null;
    }
  }

  function clearConnectTimer() {
    if (state.connectTimer) {
      clearTimeout(state.connectTimer);
      state.connectTimer = null;
    }
  }

  function armConnectTimer() {
    clearConnectTimer();
    state.connectTimer = setTimeout(() => {
      if (state.loading) {
        tryFallback(new Error('Tiempo de conexión agotado'));
      }
    }, 16000);
  }

  function updatePlaybackUI(nextState) {
    const isLoading = nextState === 'loading';
    const isPlaying = nextState === 'playing' || nextState === true;

    state.loading = isLoading;
    state.playing = isPlaying;

    if (isPlaying || !isLoading) clearConnectTimer();

    document.body.classList.toggle('is-playing', isPlaying);
    document.body.classList.toggle('is-loading', isLoading);

    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = isLoading ? 'none' : isPlaying ? 'playing' : 'paused';
      } catch (error) { /* noop */ }
    }

    const button = $('play-btn');
    if (button) {
      button.classList.toggle('is-playing', isPlaying);
      button.setAttribute('aria-pressed', String(isPlaying));
      button.setAttribute('aria-label', isLoading ? 'Cargando señal' : isPlaying ? 'Pausar radio' : 'Reproducir radio');
      button.title = isLoading ? 'Cargando señal...' : isPlaying ? 'Pausar' : 'Reproducir';

      if (isLoading) {
        button.innerHTML = '<span class="spinner-icon" aria-hidden="true"></span>';
      } else if (isPlaying) {
        button.innerHTML = '<svg class="icon-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4.4" height="16" rx="1.3"></rect><rect x="13.6" y="4" width="4.4" height="16" rx="1.3"></rect></svg>';
      } else {
        button.innerHTML = '<svg class="icon-play" viewBox="0 0 24 24" width="44" height="44" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.54.84l11-7.5a1 1 0 0 0 0-1.68l-11-7.5A1 1 0 0 0 7 4.5Z"/></svg>';
      }
    }

    if (isPlaying) {
      startMetadataPolling();
    } else {
      stopMetadataPolling();
    }
  }

  async function connectToStream(url) {
    const audio = $('audio-player');
    if (!audio) throw new Error('Reproductor no disponible');

    destroyHls();

    const isHls = url.toLowerCase().includes('.m3u8');

    if (isHls) {
      const canPlayNative = Boolean(audio.canPlayType('application/vnd.apple.mpegurl') || audio.canPlayType('audio/mpegurl'));

      if (!canPlayNative) {
        try {
          await ensureHlsLoaded();
        } catch (error) {
          console.warn('No se pudo cargar HLS.js:', error);
        }
      }

      if (typeof window.Hls !== 'undefined' && window.Hls.isSupported()) {
        state.hls = new window.Hls({
          enableWorker: true,
          lowLatencyMode: true,
          startFragPrefetch: true,
          liveSyncDurationCount: 1,
          liveMaxLatencyDurationCount: 3,
          maxBufferLength: 10,
          maxMaxBufferLength: 20
        });
        state.hls.loadSource(url);
        state.hls.attachMedia(audio);
        state.hls.on(window.Hls.Events.ERROR, (_, data) => {
          if (data && data.fatal && state.loading) {
            tryFallback(new Error('Error de HLS'));
          }
        });
      } else {
        audio.src = cacheBust(url);
      }
    } else {
      audio.src = cacheBust(url);
    }

    await audio.play();
  }

  async function tryFallback(originalError) {
    if (state.triedFallback) {
      updatePlaybackUI(false);
      showToast('No se pudo conectar con la señal. Revisa tu conexión e intenta de nuevo.');
      return;
    }

    const fallbackUrl = String(STATION.audio_hls_url || '').trim();
    const primaryUrl = String(STATION.audio_streaming_url || '').trim();

    if (!fallbackUrl || fallbackUrl === primaryUrl) {
      updatePlaybackUI(false);
      console.warn('Error de reproducción:', originalError);
      showToast('No se pudo conectar con la señal. Revisa tu conexión e intenta de nuevo.');
      return;
    }

    state.triedFallback = true;
    updatePlaybackUI('loading');
    armConnectTimer();

    try {
      await connectToStream(fallbackUrl);
      updatePlaybackUI(true);
    } catch (error) {
      console.warn('Error en señal alternativa:', error);
      updatePlaybackUI(false);
      showToast('No se pudo conectar con la señal. Revisa tu conexión e intenta de nuevo.');
    }
  }

  async function togglePlay(forceState) {
    const shouldPlay = typeof forceState === 'boolean' ? forceState : !state.playing;

    if (!shouldPlay) {
      stopPlayback();
      return;
    }

    if (state.playing || state.loading) return;

    const primaryUrl = String(STATION.audio_streaming_url || STATION.audio_hls_url || '').trim();
    if (!primaryUrl) {
      showToast('No hay una señal de audio configurada.');
      return;
    }

    state.triedFallback = false;
    updatePlaybackUI('loading');
    armConnectTimer();

    try {
      await connectToStream(primaryUrl);
      updatePlaybackUI(true);
    } catch (error) {
      console.warn('Error al reproducir:', error);
      if (error && (error.name === 'NotAllowedError' || error.name === 'AbortError')) {
        updatePlaybackUI(false);
        showToast('Toca el botón de reproducir para escuchar la radio.');
        return;
      }
      await tryFallback(error);
    }
  }

  function stopPlayback() {
    const audio = $('audio-player');
    clearConnectTimer();
    state.playing = false;
    state.loading = false;
    destroyHls();

    if (audio) {
      try { audio.pause(); } catch (error) { /* noop */ }
      audio.removeAttribute('src');
      try { audio.load(); } catch (error) { /* noop */ }
    }

    updatePlaybackUI(false);
  }

  /* ---------- Metadatos ---------- */
  async function fetchTextWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs || 3500);
    try {
      const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } finally {
      clearTimeout(timer);
    }
  }

  function parseTrack(raw) {
    if (!raw) return '';
    try {
      const json = JSON.parse(raw);
      if (json && typeof json === 'object') {
        return String(
          json.title ||
          json.song ||
          json.current_song ||
          (json.artist ? `${json.artist}${json.title || json.song ? ' - ' + (json.title || json.song) : ''}` : '') ||
          ''
        ).trim();
      }
    } catch (error) {
      const clean = String(raw).replace(/<[^>]*>?/gm, '').trim();
      if (clean && !clean.toLowerCase().includes('not allowed')) return clean;
    }
    return '';
  }

  function startMetadataPolling() {
    stopMetadataPolling();
    const apiUrl = String(STATION.radio_url_api || '').trim();
    if (!apiUrl) return;

    const run = () => {
      if (!state.playing) {
        stopMetadataPolling();
        return;
      }
      pollMetadata(apiUrl);
    };

    run();
    state.metadataTimer = setInterval(run, document.visibilityState === 'hidden' ? 60000 : 25000);
  }

  function stopMetadataPolling() {
    if (state.metadataTimer) {
      clearInterval(state.metadataTimer);
      state.metadataTimer = null;
    }
  }

  async function pollMetadata(apiUrl) {
    const candidates = [
      cacheBust(apiUrl),
      `https://corsproxy.io/?url=${encodeURIComponent(apiUrl)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`
    ];

    let gotResponse = false;
    let track = '';

    for (const url of candidates) {
      try {
        const text = await fetchTextWithTimeout(url, 3500);
        gotResponse = true;
        track = parseTrack(text);
        if (track) break;
      } catch (error) {
        // Se intenta el siguiente método.
      }
    }

    if (!gotResponse || !state.playing) return;

    const box = $('station-now-playing');
    const title = $('now-playing-title');

    if (track.length > 1) {
      state.metadataTrack = track;
      if (title) title.textContent = track;
      if (box) box.style.display = 'inline-flex';
      if ('mediaSession' in navigator && navigator.mediaSession.metadata) {
        navigator.mediaSession.metadata.title = track;
        navigator.mediaSession.metadata.artist = STATION.name || 'DJ WILMER';
      }
    } else if (box) {
      box.style.display = 'none';
    }
  }

  /* ---------- Media Session ---------- */
  function setupMediaSession() {
    if (!('mediaSession' in navigator)) return;

    const name = STATION.name || 'DJ WILMER';
    const artworkUrl = new URL(STATION.logo || 'assets/img/logo-1024.png', window.location.href).href;

    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: name,
        artist: STATION.slogan || 'Radio en vivo',
        album: `${name} Radio`,
        artwork: [
          { src: artworkUrl, sizes: '1024x1024', type: 'image/png' },
          { src: new URL('icons/icon-512.png', window.location.href).href, sizes: '512x512', type: 'image/png' },
          { src: new URL('icons/icon-192.png', window.location.href).href, sizes: '192x192', type: 'image/png' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => togglePlay(true));
      navigator.mediaSession.setActionHandler('pause', () => togglePlay(false));
      navigator.mediaSession.setActionHandler('stop', () => togglePlay(false));
    } catch (error) {
      console.warn('Media Session no disponible:', error);
    }
  }

  /* ---------- Compartir ---------- */
  function getShareUrls() {
    const shareUrl = window.location.href.split('#')[0];
    const radioName = STATION.name || 'DJ WILMER';
    const shareText = `🎧 Te recomiendo escuchar ${radioName} en vivo aquí:`;
    return {
      whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(`${shareText} ${shareUrl}`)}`
    };
  }

  function closeShareMenu() {
    const menu = $('share-menu');
    if (menu) menu.classList.remove('active');
    const button = $('share-btn');
    if (button) button.setAttribute('aria-expanded', 'false');
  }

  function toggleShareMenu() {
    const menu = $('share-menu');
    const button = $('share-btn');
    if (!menu) return;

    const urls = getShareUrls();
    const whatsapp = $('share-whatsapp-btn');
    const facebook = $('share-facebook-btn');
    if (whatsapp) whatsapp.href = urls.whatsapp;
    if (facebook) facebook.href = urls.facebook;

    const isOpen = menu.classList.toggle('active');
    if (button) button.setAttribute('aria-expanded', String(isOpen));
  }

  /* ---------- Modales ---------- */
  function openModal(id) {
    closeShareMenu();
    const modal = $(id);
    if (!modal) return;
    $$('.modal-backdrop.active').forEach((other) => {
      if (other !== modal) other.classList.remove('active');
    });
    modal.classList.add('active');
    document.body.classList.add('modal-open');
  }

  function closeModal(id) {
    const modal = $(id);
    if (modal) modal.classList.remove('active');
    if (!$('.modal-backdrop.active')) document.body.classList.remove('modal-open');
  }

  function closeAllModals() {
    $$('.modal-backdrop.active').forEach((modal) => modal.classList.remove('active'));
    document.body.classList.remove('modal-open');
  }

  /* ---------- PWA / Instalación ---------- */
  function hideInstallButtons() {
    const installButton = $('install-pwa-btn');
    if (installButton) installButton.style.display = 'none';
    const promo = $('install-promo');
    if (promo) promo.style.display = 'none';
  }

  function updateInstallUI() {
    if (isStandalone || isFileProtocol) {
      hideInstallButtons();
      return;
    }

    const installButton = $('install-pwa-btn');
    if (installButton) {
      installButton.style.display = (state.deferredPrompt || isIos) ? 'inline-flex' : 'none';
    }

    const promo = $('install-promo');
    if (promo) promo.style.display = '';
  }

  async function handleInstallClick(event) {
    if (event) event.preventDefault();

    if (isStandalone) return;

    if (state.deferredPrompt) {
      state.deferredPrompt.prompt();
      try {
        const choice = await state.deferredPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          hideInstallButtons();
          showToast('¡Instalación iniciada!');
        }
      } catch (error) {
        console.warn('Instalación PWA:', error);
      }
      state.deferredPrompt = null;
      updateInstallUI();
      return;
    }

    if (isIos) {
      openModal('ios-pwa-modal');
      return;
    }

    if (isFileProtocol) {
      showToast('Abre la PWA desde un servidor (http/https) para poder instalarla.');
      return;
    }

    showToast('Abre el menú de tu navegador y elige “Instalar app” o “Agregar a pantalla principal”.');
  }

  function setupPwa() {
    updateInstallUI();

    const installButton = $('install-pwa-btn');
    if (installButton) installButton.addEventListener('click', handleInstallClick);

    const promo = $('install-promo');
    if (promo) promo.addEventListener('click', handleInstallClick);

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      state.deferredPrompt = event;
      updateInstallUI();
    });

    window.addEventListener('appinstalled', () => {
      state.deferredPrompt = null;
      hideInstallButtons();
      showToast('¡App instalada correctamente!');
    });
  }

  /* ---------- QR ---------- */
  function applyQrModal() {
    const image = $('qr-modal-img');
    if (image && state.qrDataUrl) image.src = state.qrDataUrl;
    const download = $('qr-modal-download-btn');
    if (download && state.qrDataUrl) download.href = state.qrDataUrl;
  }

  function generateQr() {
    if (state.qrDataUrl) return true;
    if (typeof window.QRCode === 'undefined') {
      showToast('No se pudo cargar el generador de QR.');
      return false;
    }

    try {
      const host = document.createElement('div');
      host.style.cssText = 'position:fixed;left:-9999px;top:0;width:320px;height:320px;';
      document.body.appendChild(host);

      new window.QRCode(host, {
        text: window.location.href.split('#')[0],
        width: 512,
        height: 512,
        colorDark: '#0B0F19',
        colorLight: '#ffffff',
        correctLevel: window.QRCode.CorrectLevel.H
      });

      const canvas = host.querySelector('canvas');
      if (canvas) {
        state.qrDataUrl = canvas.toDataURL('image/png');
      }

      setTimeout(() => host.remove(), 150);
      return Boolean(state.qrDataUrl);
    } catch (error) {
      console.warn('Generación de QR:', error);
      showToast('No se pudo generar el código QR.');
      return false;
    }
  }

  function openQrModal() {
    if (!generateQr()) return;
    applyQrModal();
    openModal('qr-modal');
  }

  function setupQr() {
    const button = $('qr-download-btn');
    if (!button) return;

    if (STATION.qr_enabled === false || isStandalone || isFileProtocol) {
      button.style.display = 'none';
      return;
    }

    button.style.display = 'inline-flex';
    button.addEventListener('click', openQrModal);
  }

  /* ---------- Navegación ---------- */
  function setTab(tab) {
    const nextTab = tab === 'schedule' ? 'schedule' : 'live';
    state.tab = nextTab;

    const device = $('cuarzo-device');
    if (device) device.setAttribute('data-active-tab', nextTab);

    const button = $('cuarzo-menu-toggle');
    const text = $('cuarzo-menu-text');
    if (text) text.textContent = nextTab === 'live' ? 'PROGRAMACIÓN' : 'EN VIVO';
    if (button) {
      button.setAttribute('aria-pressed', String(nextTab === 'schedule'));
      button.title = nextTab === 'live' ? 'Ver programación' : 'Volver a En Vivo';
    }

    const content = $('radio-content');
    if (content) content.scrollTop = 0;

    if (nextTab === 'schedule') {
      renderScheduleDays();
      renderScheduleList();
    }
  }

  function toggleTab() {
    setTab(state.tab === 'live' ? 'schedule' : 'live');
  }

  /* ---------- Eventos ---------- */
  function bindEvents() {
    const menuButton = $('cuarzo-menu-toggle');
    if (menuButton) menuButton.addEventListener('click', toggleTab);

    const playButton = $('play-btn');
    if (playButton) playButton.addEventListener('click', () => togglePlay());

    const shareButton = $('share-btn');
    if (shareButton) {
      shareButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleShareMenu();
      });
    }

    const whatsapp = $('share-whatsapp-btn');
    if (whatsapp) whatsapp.addEventListener('click', () => closeShareMenu());
    const facebook = $('share-facebook-btn');
    if (facebook) facebook.addEventListener('click', () => closeShareMenu());

    document.addEventListener('click', (event) => {
      if (!event.target.closest || !event.target.closest('#share-wrapper')) closeShareMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeShareMenu();
        closeAllModals();
      }
    });

    const closeIos = $('close-ios-pwa-modal');
    if (closeIos) closeIos.addEventListener('click', () => closeModal('ios-pwa-modal'));
    const okIos = $('ok-ios-pwa-btn');
    if (okIos) okIos.addEventListener('click', () => closeModal('ios-pwa-modal'));
    const closeQr = $('close-qr-modal');
    if (closeQr) closeQr.addEventListener('click', () => closeModal('qr-modal'));

    $$('.modal-backdrop').forEach((modal) => {
      modal.addEventListener('click', (event) => {
        if (event.target === modal) closeModal(modal.id);
      });
    });

    const audio = $('audio-player');
    if (audio) {
      audio.addEventListener('playing', () => {
        clearConnectTimer();
        updatePlaybackUI(true);
      });

      audio.addEventListener('pause', () => {
        if (state.playing && !state.loading) {
          updatePlaybackUI(false);
        }
      });

      audio.addEventListener('error', () => {
        if (state.playing || state.loading) {
          tryFallback(new Error('Error de audio'));
        }
      });

      audio.addEventListener('stalled', () => {
        if (state.playing) document.body.classList.add('is-buffering');
      });

      audio.addEventListener('playing', () => {
        document.body.classList.remove('is-buffering');
      });
    }

    document.addEventListener('visibilitychange', () => {
      if (state.playing && STATION.radio_url_api) startMetadataPolling();
    });

    window.addEventListener('offline', () => {
      showToast('Sin conexión. Necesitas internet para escuchar la radio.');
    });

    window.addEventListener('online', () => {
      showToast('Conexión restablecida.');
    });
  }

  /* ---------- Service Worker ---------- */
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || isFileProtocol) return;

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((error) => {
        console.warn('Service Worker no registrado:', error);
      });
    });
  }

  /* ---------- Arranque ---------- */
  function init() {
    applyTheme();
    renderStation();
    renderSocials();

    const params = new URLSearchParams(window.location.search);
    const dayParam = params.get('day');
    if (dayParam && (dayParam === 'all' || dayParam === 'today' || SCHEDULE_DAYS.some((day) => day.key === dayParam))) {
      state.selectedDay = dayParam;
    }

    renderScheduleDays();
    renderScheduleList();
    bindEvents();
    setupPwa();
    setupQr();
    setupMediaSession();

    if (params.get('view') === 'schedule') setTab('schedule');
    else setTab('live');

    const year = $('current-year');
    if (year) year.textContent = String(new Date().getFullYear());

    // Refrescar el estado "En el Aire" cada 30 s.
    setInterval(() => {
      if (!SCHEDULES.length) return;
      const active = SCHEDULES.some(isProgramOnAir);
      document.body.classList.toggle('has-live-program', active);
      if (state.tab === 'schedule') renderScheduleList();
    }, 30000);

    if (params.get('action') === 'play') {
      setTimeout(() => togglePlay(true), 650);
    }

    const reveal = () => {
      document.body.classList.add('app-ready');
    };

    if (document.readyState === 'complete') {
      setTimeout(reveal, 350);
    } else {
      window.addEventListener('load', () => setTimeout(reveal, 350), { once: true });
      setTimeout(reveal, 1800);
    }

    registerServiceWorker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
