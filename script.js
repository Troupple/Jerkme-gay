(function () {
  var favicon = document.querySelector('link[rel="icon"]');
  if (!favicon) return;

  var gradientWidth = 66.89;
  var frame = 0;
  var frameCount = 80;
  var svgSource;

  function updateFavicon() {
    var offset = -gradientWidth * frame / frameCount;
    var frameSvg = svgSource.replace(/gradientTransform="[^"]*"/,
      'gradientTransform="translate(' + offset.toFixed(2) + ' 0)"');
    favicon.href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(frameSvg);
    frame = (frame + 1) % frameCount;
  }

  fetch(favicon.href).then(function (response) {
    if (!response.ok) throw new Error('Favicon request failed with status ' + response.status + '.');
    return response.text();
  }).then(function (svg) {
    svgSource = svg;
    updateFavicon();
    window.setInterval(updateFavicon, 100);
  }).catch(function (error) {
    console.error('Unable to load the animated SVG favicon.', error);
  });
})();

(function () {
    var STORAGE_KEY = 'jerkme_a11y_mode';
    if (/[?&]reset\b/.test(location.search)) {
      try { Object.keys(localStorage).filter(function (k) { return k.indexOf('jerkme_') === 0; }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    }
    var stored = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) {}

    function applyMode(enabled) {
      document.documentElement.classList.toggle('a11y-mode', enabled);
      window.a11yModeEnabled = enabled;
    }

    applyMode(stored === 'on');

    if (stored === null) {
      document.addEventListener('DOMContentLoaded', function () {
        var overlay = document.getElementById('a11y-consent-overlay');
        var enableBtn = document.getElementById('a11y-consent-enable');
        var declineBtn = document.getElementById('a11y-consent-decline');
        if (!overlay) return;
        overlay.classList.add('open');

        function choose(enabled) {
          try { localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off'); } catch (e) {}
          applyMode(enabled);
          overlay.classList.remove('open');
          window.dispatchEvent(new CustomEvent('a11y-mode-changed', { detail: { enabled: enabled } }));
        }

        enableBtn.addEventListener('click', function () { choose(true); });
        declineBtn.addEventListener('click', function () { choose(false); });
      });
    }
  })();

(function () {
  var button = document.getElementById('sgds-masthead-identify');
  var content = document.getElementById('sgds-masthead-content');
  var icon = button.querySelector('.sgds-masthead-identify-icon');
  function toggleIdentify() {
    var expanded = content.classList.toggle('show');
    icon.classList.toggle('show', expanded);
    button.setAttribute('aria-expanded', String(expanded));
  }
  button.addEventListener('click', toggleIdentify);
  button.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleIdentify();
    }
  });
})();

(function () {
    const NORMAL_SPEED = 4;
    const A11Y_SPEED = 1.5;
    const NORMAL_COLOR_TRANSITION = '0s';
    const A11Y_COLOR_TRANSITION = '0.9s';
    const NORMAL_SPAWN_FADE = '0.1s';
    const A11Y_SPAWN_FADE = '1.4s';
    const NORMAL_STAGGER_DELAY = 0;
    const A11Y_STAGGER_DELAY = 220;

    function isA11yMode() {
      return document.documentElement.classList.contains('a11y-mode');
    }
    function getSpeed() { return isA11yMode() ? A11Y_SPEED : NORMAL_SPEED; }
    function getColorTransition() { return isA11yMode() ? A11Y_COLOR_TRANSITION : NORMAL_COLOR_TRANSITION; }
    function getSpawnFade() { return isA11yMode() ? A11Y_SPAWN_FADE : NORMAL_SPAWN_FADE; }
    function getStaggerDelay() { return isA11yMode() ? A11Y_STAGGER_DELAY : NORMAL_STAGGER_DELAY; }

    let speed = getSpeed();
    let spawnTimeouts = [];
    const pallete = ["rgba(255, 136, 0, 0.8)", "rgba(225, 36, 255, 0.8)", "rgba(106, 25, 255, 0.8)", "rgba(255, 33, 136, 0.8)"];
    const blackDiv = document.getElementById("black");
    const fihLayer = document.getElementById("fih-layer");
    const slider = document.getElementById("fih-slider");
    const countDisplay = document.getElementById("fih-count");
    
    const MOBILE_SPRITE_SCALE = 0.7;
    let spriteScale = window.innerWidth <= 520 ? MOBILE_SPRITE_SCALE : 1;
    let fihWidth = 250 * spriteScale;
    let fihHeight = 125 * spriteScale;
    let fihs = [];
    let animationId = null;
    let cookieFih = null;
    let cookieRespawnTimeout = null;
    let cookieHits = 0;
    let cookieContacts = new Set();
    let cookieWidth = 85 * spriteScale;
    let cookieHeight = 82 * spriteScale;

    function clipVoronoiCell(polygon, site, otherSite) {
      const dx = otherSite.x - site.x;
      const dy = otherSite.y - site.y;
      const limit = (otherSite.x * otherSite.x + otherSite.y * otherSite.y -
        site.x * site.x - site.y * site.y) / 2;
      const clipped = [];

      polygon.forEach(function (point, index) {
        const next = polygon[(index + 1) % polygon.length];
        const pointInside = dx * point.x + dy * point.y <= limit;
        const nextInside = dx * next.x + dy * next.y <= limit;

        if (pointInside) clipped.push(point);
        if (pointInside !== nextInside) {
          const amount = (limit - dx * point.x - dy * point.y) /
            (dx * (next.x - point.x) + dy * (next.y - point.y));
          clipped.push({
            x: point.x + amount * (next.x - point.x),
            y: point.y + amount * (next.y - point.y)
          });
        }
      });
      return clipped;
    }

    function getCookieBiteMask(hitCount) {
      let seed = 9137 + hitCount * 7919;
      function random() {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      }

      const sites = [];
      for (let row = 0; row < 8; row++) {
        for (let column = 0; column < 9; column++) {
          sites.push({
            x: (column + 0.5 + (random() - 0.5) * 0.65) * cookieWidth / 9,
            y: (row + 0.5 + (random() - 0.5) * 0.65) * cookieHeight / 8
          });
        }
      }

      const cutFrom = [cookieWidth + 1, cookieWidth * 0.88, cookieWidth * 0.76, cookieWidth * 0.62][hitCount];
      let cutCells = '';
      sites.forEach(function (site) {
        if (site.x < cutFrom) return;
        let cell = [
          { x: 0, y: 0 },
          { x: cookieWidth, y: 0 },
          { x: cookieWidth, y: cookieHeight },
          { x: 0, y: cookieHeight }
        ];
        sites.forEach(function (otherSite) {
          if (otherSite !== site && cell.length) {
            cell = clipVoronoiCell(cell, site, otherSite);
          }
        });
        if (cell.length) {
          cutCells += 'M' + cell.map(function (point) {
            return point.x.toFixed(2) + ',' + point.y.toFixed(2);
          }).join('L') + 'Z';
        }
      });

      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + cookieWidth +
        '" height="' + cookieHeight + '" viewBox="0 0 ' + cookieWidth + ' ' +
        cookieHeight + '"><defs><mask id="m"><rect width="100%" height="100%" ' +
        'fill="white"/><path d="' + cutCells + '" fill="black"/></mask></defs>' +
        '<rect width="100%" height="100%" fill="white" mask="url(#m)"/></svg>';
      return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
    }

    function updateCookieDamage() {
      if (!cookieFih) return;
      if (cookieHits === 0) {
        cookieFih.element.style.maskImage = 'none';
        cookieFih.element.style.webkitMaskImage = 'none';
        return;
      }
      const mask = getCookieBiteMask(cookieHits);
      cookieFih.element.style.maskImage = mask;
      cookieFih.element.style.webkitMaskImage = mask;
      cookieFih.element.style.maskSize = '100% 100%';
      cookieFih.element.style.webkitMaskSize = '100% 100%';
    }

    function randomizeCookiePosition(cookie) {
      cookie.x = Math.random() * Math.max(0, window.innerWidth - cookieWidth);
      cookie.y = Math.random() * Math.max(0, window.innerHeight - cookieHeight);
      cookie.dirX = Math.random() > 0.5 ? 1 : -1;
      cookie.dirY = Math.random() > 0.5 ? 1 : -1;
      cookie.scaleX = cookie.dirX;
      cookie.element.style.left = cookie.x + 'px';
      cookie.element.style.top = cookie.y + 'px';
      cookie.element.style.transform = 'scaleX(' + cookie.scaleX + ')';
    }

    function spawnCookieFih() {
      if (cookieRespawnTimeout) {
        clearTimeout(cookieRespawnTimeout);
        cookieRespawnTimeout = null;
      }
      if (cookieFih && cookieFih.element.isConnected) {
        cookieFih.element.style.display = 'block';
        cookieHits = 0;
        cookieContacts.clear();
        randomizeCookiePosition(cookieFih);
        updateCookieDamage();
        return;
      }

      const image = document.createElement('img');
      image.className = 'cookie-fih';
      image.src = 'Pics/cookie.png';
      image.alt = '';
      image.setAttribute('aria-hidden', 'true');
      image.style.width = cookieWidth + 'px';
      image.style.height = cookieHeight + 'px';
      fihLayer.appendChild(image);

      cookieFih = {
        element: image,
        x: 0,
        y: 0,
        dirX: 1,
        dirY: 1,
        scaleX: 1
      };
      cookieHits = 0;
      cookieContacts.clear();
      randomizeCookiePosition(cookieFih);
      updateCookieDamage();
    }

    window.spawnCookieFih = spawnCookieFih;
    
    function getNewRandomColor(prevColorIndex) {
      const currentPallete = [...pallete];
      currentPallete.splice(prevColorIndex, 1);
      const colorChoiceIndex = Math.floor(Math.random() * currentPallete.length);
      const newIndex = colorChoiceIndex < prevColorIndex ? colorChoiceIndex : colorChoiceIndex + 1;
      return { color: currentPallete[colorChoiceIndex], index: newIndex };
    }
    
    function clearSpawnTimeouts() {
      spawnTimeouts.forEach(function (id) { clearTimeout(id); });
      spawnTimeouts = [];
    }

    function makeFih() {
      const fihEl = document.createElement('div');
      fihEl.className = 'fih';
      fihEl.style.width = fihWidth + 'px';
      fihEl.style.height = fihHeight + 'px';
      fihEl.style.transition = `background-color ${getColorTransition()} ease, opacity ${getSpawnFade()} ease`;
      fihEl.style.opacity = '0';
      fihLayer.appendChild(fihEl);
      const dirX = Math.random() > 0.5 ? 1 : -1;
      const fih = {
        element: fihEl,
        x: Math.random() * (window.innerWidth - fihWidth),
        y: Math.random() * (window.innerHeight - fihHeight),
        dirX: dirX,
        dirY: Math.random() > 0.5 ? 1 : -1,
        scaleX: dirX,
        prevColorIndex: 0
      };
      fihs.push(fih);
      fihEl.style.backgroundColor = pallete[0];
      fihEl.style.transform = `scaleX(${dirX})`;
      fihEl.style.left = fih.x + "px";
      fihEl.style.top = fih.y + "px";
      requestAnimationFrame(function () {
        fihEl.style.opacity = '1';
      });
      return fih;
    }
    function spawnOneFih() { makeFih(); }

    function createFihs(count) {
      clearSpawnTimeouts();
      fihs.forEach(function (f) { if (f.element.parentNode) f.element.parentNode.removeChild(f.element); });
      fihs = [];

      const staggerDelay = getStaggerDelay();
      for (let i = 0; i < count; i++) {
        if (staggerDelay === 0) {
          spawnOneFih();
        } else {
          spawnTimeouts.push(setTimeout(spawnOneFih, i * staggerDelay));
        }
      }
    }

    function animateCookie() {
      if (!cookieFih || cookieFih.element.style.display === 'none') return;

      const screenHeight = window.innerHeight;
      const screenWidth = window.innerWidth;
      const cookieSpeed = speed;
      const cookie = cookieFih;
      const overlappingFihs = new Set();

      if ((cookie.y <= 0 && cookie.dirY < 0) ||
          (cookie.y >= screenHeight - cookieHeight && cookie.dirY > 0)) {
        cookie.dirY *= -1;
      }
      if ((cookie.x <= 0 && cookie.dirX < 0) ||
          (cookie.x >= screenWidth - cookieWidth && cookie.dirX > 0)) {
        cookie.dirX *= -1;
        cookie.scaleX = cookie.dirX;
        cookie.element.style.transform = 'scaleX(' + cookie.scaleX + ')';
      }

      cookie.x = Math.max(0, Math.min(screenWidth - cookieWidth, cookie.x + cookie.dirX * cookieSpeed));
      cookie.y = Math.max(0, Math.min(screenHeight - cookieHeight, cookie.y + cookie.dirY * cookieSpeed));
      cookie.element.style.left = cookie.x + 'px';
      cookie.element.style.top = cookie.y + 'px';

      fihs.forEach(function (fih) {
        if (cookieHits >= 3) return;
        const overlaps = cookie.x < fih.x + fihWidth &&
          cookie.x + cookieWidth > fih.x &&
          cookie.y < fih.y + fihHeight &&
          cookie.y + cookieHeight > fih.y;
        if (!overlaps) return;

        overlappingFihs.add(fih);
        if (cookieContacts.has(fih)) return;

        cookieHits++;
        updateCookieDamage();
        if (cookieHits >= 3) {
          cookie.element.style.display = 'none';
          cookieContacts.clear();
          cookieRespawnTimeout = setTimeout(spawnCookieFih, 10000);
          return;
        }
      });

      cookieContacts = overlappingFihs;
    }
    
    function animate() {
      const screenHeight = window.innerHeight;
      const screenWidth = window.innerWidth;
      
      fihs.forEach(fih => {
        if (fih.y + fihHeight >= screenHeight || fih.y < 0) {
          fih.dirY *= -1;
          const newColor = getNewRandomColor(fih.prevColorIndex);
          fih.element.style.backgroundColor = newColor.color;
          fih.prevColorIndex = newColor.index;
        }
        if (fih.x + fihWidth >= screenWidth || fih.x < 0) {
          fih.dirX *= -1;
          fih.scaleX = fih.dirX;
          fih.element.style.transform = `scaleX(${fih.scaleX})`;
          const newColor = getNewRandomColor(fih.prevColorIndex);
          fih.element.style.backgroundColor = newColor.color;
          fih.prevColorIndex = newColor.index;
        }
        
        fih.x += fih.dirX * speed;
        fih.y += fih.dirY * speed;
        fih.element.style.left = fih.x + "px";
        fih.element.style.top = fih.y + "px";
      });

      animateCookie();
      
      animationId = window.requestAnimationFrame(animate);
    }
    
    function updateSliderFill() {
      const min = parseFloat(slider.min) || 0;
      const max = parseFloat(slider.max) || 100;
      const val = parseFloat(slider.value);
      const pct = ((val - min) / (max - min)) * 100;
      slider.style.background =
        `linear-gradient(to right, #6666ff 0%, #6666ff ${pct}%, #444 ${pct}%, #444 100%)`;
    }

    const initialCount = parseInt(slider.value, 10) || 1;
    countDisplay.textContent = initialCount;
    createFihs(initialCount);
    updateSliderFill();
    animate();
    
    let sliderDebounceId = null;
    slider.addEventListener('input', function(e) {
      const count = parseInt(e.target.value);
      countDisplay.textContent = count;
      updateSliderFill();
      if (sliderDebounceId) clearTimeout(sliderDebounceId);
      sliderDebounceId = setTimeout(function () {
        createFihs(count);
      }, 300);
    });

    window.addEventListener('a11y-mode-changed', function () {
      speed = getSpeed();
      fihs.forEach(function (fih) {
        fih.element.style.transition = `background-color ${getColorTransition()} ease, opacity ${getSpawnFade()} ease`;
      });
    });

    window.addEventListener('resize', function () {
      const nextScale = window.innerWidth <= 520 ? MOBILE_SPRITE_SCALE : 1;
      if (nextScale === spriteScale) return;
      spriteScale = nextScale;
      fihWidth = 250 * spriteScale;
      fihHeight = 125 * spriteScale;
      cookieWidth = 85 * spriteScale;
      cookieHeight = 82 * spriteScale;
      fihs.forEach(function (fih) {
        fih.element.style.width = fihWidth + 'px';
        fih.element.style.height = fihHeight + 'px';
        fih.x = Math.min(fih.x, Math.max(0, window.innerWidth - fihWidth));
        fih.y = Math.min(fih.y, Math.max(0, window.innerHeight - fihHeight));
        fih.element.style.left = fih.x + 'px';
        fih.element.style.top = fih.y + 'px';
      });
      if (cookieFih) {
        cookieFih.element.style.width = cookieWidth + 'px';
        cookieFih.element.style.height = cookieHeight + 'px';
        cookieFih.element.style.maskSize = '100% 100%';
        cookieFih.element.style.webkitMaskSize = '100% 100%';
        cookieFih.x = Math.min(cookieFih.x, Math.max(0, window.innerWidth - cookieWidth));
        cookieFih.y = Math.min(cookieFih.y, Math.max(0, window.innerHeight - cookieHeight));
        cookieFih.element.style.left = cookieFih.x + 'px';
        cookieFih.element.style.top = cookieFih.y + 'px';
      }
    });
  })();

(function () {
    document.querySelectorAll('#site-banner .site-banner__button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!expanded));
        var c = document.getElementById(btn.getAttribute('aria-controls'));
        if (c) c.hidden = expanded;
      });
    });
  })();

fetch('fish.json').then(function (response) {
    if (!response.ok) throw new Error('Fish profile request failed with status ' + response.status + '.');
    return response.json();
  }).then(function (fishData) {
    if (!Array.isArray(fishData) || !fishData.length || fishData.some(function (fish) {
      return !fish || !fish.name || !(fish.profilePicture || fish.bannerPicture);
    })) {
      console.error('Fish profile data in fish.json is missing required profile picture or banner picture fields.');
      document.getElementById('swipe-stage').textContent = 'Fish profiles could not be loaded. Please check fish.json.';
      document.getElementById('swipe-counter').textContent = 'Profiles unavailable';
      return;
    }

    window.fishProfileData = fishData;
    var MATCH_KEY = 'jerkme_matches';

    var galleryOverlay = document.getElementById('fish-gallery-overlay');
    var galleryCloseBtn = document.getElementById('fish-gallery-close-btn');
    var messagesList = document.getElementById('messages-list');
    var matchEmpty = document.getElementById('match-empty');
    var chatModal = document.getElementById('fish-chat-modal');
    var chatHeader = document.getElementById('fish-chat-header');
    var chatMessages = document.getElementById('fish-chat-messages');
    var chatInput = document.getElementById('fish-chat-input');
    var chatSend = document.getElementById('fish-chat-send');
    var stage = document.getElementById('swipe-stage');
    var swipeCounter = document.getElementById('swipe-counter');
    var matchOverlay = document.getElementById('match-overlay');
    var currentFish = null;
    var lastReply = -1;

    function toast(msg) { if (window.jerkmeToast) window.jerkmeToast(msg); }
    function isA11y() { return document.documentElement.classList.contains('a11y-mode'); }
    function el(tag, cls, text) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text !== undefined) e.textContent = text;
      return e;
    }
    function shuffle(arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }
    function fishByName(name) {
      for (var i = 0; i < fishData.length; i++) if (fishData[i].name === name) return fishData[i];
      return null;
    }
    function indexOfFish(fish) { return fishData.indexOf(fish); }

    function makePic(fish, cls) {
      var d = el('div', cls || 'fish-pic');
      var img = document.createElement('img');
      img.alt = '';
      img.draggable = false;
      var useBanner = cls && cls.indexOf('swipe-photo') !== -1;
      img.src = (useBanner ? (fish.bannerPicture || fish.profilePicture) : (fish.profilePicture || fish.bannerPicture)) || '';
      img.onerror = function () {
        var fallback = el('span', 'fish-pic-fallback', fish.name ? fish.name.charAt(0).toUpperCase() : '?');
        if (img.parentNode) img.parentNode.replaceChild(fallback, img);
      };
      d.appendChild(img);
      return d;
    }

    /*matches by name*/
    var matches = [];
    try {
      matches = JSON.parse(localStorage.getItem(MATCH_KEY) || '[]').filter(function (n) { return !!fishByName(n); });
    } catch (e) { matches = []; }
    function saveMatches() { try { localStorage.setItem(MATCH_KEY, JSON.stringify(matches)); } catch (e) {} }
    function updateMatchTab() { document.getElementById('tab-matches').textContent = 'Messages (' + matches.length + ')'; }
    function isMatched(fish) { return matches.indexOf(fish.name) !== -1; }

    updateMatchTab();

    /*ssages list*/
    function renderMatches() {
      var list = matches.map(fishByName).filter(Boolean);
      messagesList.innerHTML = '';
      list.forEach(function (fish) {
        var row = el('button', 'message-row');
        row.type = 'button';
        row.setAttribute('aria-label', 'Open messages with ' + fish.name);
        row.appendChild(makePic(fish, 'fish-pic messages-avatar'));
        var info = el('span', 'message-row-info');
        info.appendChild(el('span', 'message-row-name', fish.name));
        info.appendChild(el('span', 'message-row-preview', 'New match — say blub and break the ice.'));
        row.appendChild(info);
        row.appendChild(el('span', 'message-row-arrow', '›'));
        row.addEventListener('click', function () { openChat(indexOfFish(fish)); });
        messagesList.appendChild(row);
      });
      matchEmpty.textContent = list.length ? '' : 'No messages yet. Swipe right to meet your first fish.';
    }

    /*tabs*/
    var tabs = document.querySelectorAll('.fish-tab');
    function setTab(name) {
      tabs.forEach(function (t) { t.setAttribute('aria-selected', t.getAttribute('data-tab') === name ? 'true' : 'false'); });
      ['swipe', 'matches'].forEach(function (n) {
        document.getElementById('pane-' + n).classList.toggle('active', n === name);
      });
      if (name === 'matches') renderMatches();
    }
    tabs.forEach(function (t) { t.addEventListener('click', function () { setTab(t.getAttribute('data-tab')); }); });
    function activeTab() {
      for (var i = 0; i < tabs.length; i++) if (tabs[i].getAttribute('aria-selected') === 'true') return tabs[i].getAttribute('data-tab');
      return 'swipe';
    }

    /*tinder but gay*/
    var deck = [];
    var topCard = null, topStampLike = null, topStampNope = null;
    var busy = false;

    function resetDeck() {
      deck = shuffle(fishData.filter(function (f) { return !isMatched(f); }));
      renderDeck();
    }

    function buildCard(fish) {
      var card = el('div', 'swipe-card');
      card.appendChild(makePic(fish, 'fish-pic swipe-photo'));
      var like = el('div', 'swipe-stamp like', 'BLUB');
      var nope = el('div', 'swipe-stamp nope', 'FUCK YOU!');
      card.appendChild(like); card.appendChild(nope);

      var info = el('div', 'swipe-info');
      var nameRow = el('div', 'swipe-name');
      nameRow.appendChild(el('h3', null, fish.name));
      info.appendChild(nameRow);

      var compat = el('div', 'compat');
      compat.appendChild(el('span', null, 'Compatibility'));
      var bar = el('div', 'compat-bar');
      var fill = el('div', 'compat-fill');
      fill.style.width = fish.compat + '%';
      bar.appendChild(fill);
      compat.appendChild(bar);
      compat.appendChild(el('b', null, fish.compat + '%'));
      info.appendChild(compat);

      info.appendChild(el('p', 'swipe-bio', fish.bio));
      var facts = el('div', 'swipe-fish-facts');
      var greenFlag = el('p');
      greenFlag.appendChild(el('b', null, 'GREEN FLAG  '));
      greenFlag.appendChild(document.createTextNode(fish.greenFlag));
      var looking = el('p', 'swipe-looking');
      looking.appendChild(el('b', null, 'Looking for: '));
      looking.appendChild(document.createTextNode(fish.lookingFor));
      facts.appendChild(greenFlag);
      facts.appendChild(looking);
      var opener = el('div', 'swipe-opener');
      opener.appendChild(el('b', null, 'FIRST MESSAGE'));
      opener.appendChild(el('span', null, fish.opener));
      facts.appendChild(opener);
      info.appendChild(facts);
      card.appendChild(info);

      attachDrag(card, like, nope, fish);
      topCard = card; topStampLike = like; topStampNope = nope;
      return card;
    }

    function renderDeck() {
      stage.innerHTML = '';
      topCard = null;
      swipeCounter.textContent = deck.length + ' fish in queue';
      if (!deck.length) {
        swipeCounter.textContent = 'No fish left in this bowl';
        var empty = el('div', 'swipe-empty');
        empty.appendChild(el('div', null, 'You have seen every fish in this area. Check back for more or something.'));
        var b = el('button', null, 'Rewind (passed fish get a second chance)');
        b.type = 'button';
        b.addEventListener('click', resetDeck);
        empty.appendChild(b);
        stage.appendChild(empty);
        return;
      }
      if (deck.length > 1) stage.appendChild(el('div', 'swipe-card-under'));
      stage.appendChild(buildCard(deck[0]));
    }

    function attachDrag(card, likeStamp, nopeStamp, fish) {
      var startX = 0, startY = 0, dx = 0, dy = 0, dragging = false;
      function apply() {
        card.style.transform = 'translate(' + dx + 'px,' + (dy * 0.4) + 'px) rotate(' + (dx / 18) + 'deg)';
        likeStamp.style.opacity = Math.max(0, Math.min(1, dx / 100));
        nopeStamp.style.opacity = Math.max(0, Math.min(1, -dx / 100));
      }
      card.addEventListener('pointerdown', function (e) {
        if (busy) return;
        dragging = true; startX = e.clientX; startY = e.clientY; dx = 0; dy = 0;
        card.classList.remove('spring');
        card.classList.add('dragging');
        try { card.setPointerCapture(e.pointerId); } catch (err) {}
      });
      card.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        dx = e.clientX - startX; dy = e.clientY - startY;
        apply();
      });
      function end() {
        if (!dragging) return;
        dragging = false;
        card.classList.remove('dragging');
        if (dx > 110) decide(true, dy);
        else if (dx < -110) decide(false, dy);
        else {
          card.classList.add('spring');
          card.style.transform = '';
          likeStamp.style.opacity = 0; nopeStamp.style.opacity = 0;
        }
      }
      card.addEventListener('pointerup', end);
      card.addEventListener('pointercancel', end);
    }

    function decide(liked, dyHint) {
      if (busy || !topCard || !deck.length) return;
      busy = true;
      var fish = deck[0];
      var card = topCard;
      (liked ? topStampLike : topStampNope).style.opacity = 1;
      card.classList.remove('dragging', 'spring');
      card.classList.add('fly');
      var dir = liked ? 1 : -1;
      card.style.transform = 'translate(' + (dir * (window.innerWidth + 200)) + 'px,' + ((dyHint || 0) * 0.4 - 40) + 'px) rotate(' + (dir * 30) + 'deg)';
      card.style.opacity = '0';
      setTimeout(function () {
        deck.shift();
        busy = false;
        renderDeck();
        if (liked) handleLike(fish);
      }, isA11y() ? 0 : 340);
    }

    function handleLike(fish) {
      if (Math.random() * 100 < fish.compat) {
        addMatch(fish);
        showMatch(fish);
      } else {
        toast(fish.name + ' left you on read. (Blub.)');
      }
    }

    document.getElementById('swipe-pass').addEventListener('click', function () { decide(false, 0); });
    document.getElementById('swipe-like').addEventListener('click', function () { decide(true, 0); });

    /*match func*/
    function addMatch(fish) {
      if (isMatched(fish)) return;
      matches.push(fish.name);
      saveMatches();
      updateMatchTab();
    }

    var matchFish = null;
    function showMatch(fish) {
      matchFish = fish;
      var you = document.getElementById('match-you');
      you.innerHTML = '';
      var yi = document.createElement('img');
      yi.src = 'Pics/Profiles/human.png'; yi.alt = 'You';
      yi.onerror = function () { you.textContent = 'You'; };
      you.appendChild(yi);

      var slot = document.getElementById('match-fish-slot');
      slot.innerHTML = '';
      slot.appendChild(makePic(fish, 'fish-pic match-avatar'));

      document.getElementById('match-text').textContent = 'You and ' + fish.name + ' both blubbed each other.';
      document.getElementById('match-sub').textContent = fish.compat + '% compatible. Open Messages to start chatting.';

      var hearts = document.getElementById('match-hearts');
      hearts.innerHTML = '';
      if (!isA11y()) {
        for (var i = 0; i < 16; i++) {
          var s = el('span', null, i % 3 === 0 ? '\uD83D\uDC9C' : '\u2764\uFE0F');
          s.style.left = (Math.random() * 100) + '%';
          s.style.animationDelay = (Math.random() * 1.6) + 's';
          hearts.appendChild(s);
        }
      }
      matchOverlay.classList.add('open');
      document.getElementById('match-chat').focus();
    }
    function closeMatch() { matchOverlay.classList.remove('open'); }
    document.getElementById('match-keep').addEventListener('click', closeMatch);
    document.getElementById('match-chat').addEventListener('click', function () {
      var f = matchFish;
      closeMatch();
      if (f) openChat(indexOfFish(f));
    });

    function actuallyOpenGallery() {
      if (!deck.length && !stage.children.length) resetDeck();
      if (!stage.children.length) renderDeck();
      setTab('swipe');
      galleryOverlay.classList.add('open');
    }
    function openGallery() {
      if (window.requireShrimpCheck) window.requireShrimpCheck(actuallyOpenGallery);
      else actuallyOpenGallery();
    }
    function closeGallery() { galleryOverlay.classList.remove('open'); }

    /*chat*/
    function openChat(index) {
      currentFish = fishData[index];
      lastReply = -1;
      chatHeader.innerHTML = '';
      var av = makePic(currentFish, 'fish-avatar');
      chatHeader.appendChild(av);
      var txt = el('div', 'fish-chat-header-text');
      txt.appendChild(el('div', 'fish-chat-name', currentFish.name));
      txt.appendChild(el('div', 'fish-chat-age', currentFish.compat + '% match'));
      chatHeader.appendChild(txt);
      var x = el('button', 'fish-chat-close', '\u2715');
      x.type = 'button';
      x.setAttribute('aria-label', 'Close chat');
      x.addEventListener('click', closeChat);
      chatHeader.appendChild(x);

      chatMessages.innerHTML = '';
      chatModal.classList.add('open');
      chatInput.value = '';
      chatInput.focus();
      var fish = currentFish;
      setTimeout(function () { if (currentFish === fish) addMessage('fish', fish.opener); }, 350);
    }
    function closeChat() { chatModal.classList.remove('open'); currentFish = null; }
    function addMessage(sender, text) {
      var msg = el('div', 'fish-chat-msg ' + sender, text);
      chatMessages.appendChild(msg);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    function nextReply(fish) {
      var r = fish.replies;
      var i;
      do { i = Math.floor(Math.random() * r.length); } while (r.length > 1 && i === lastReply);
      lastReply = i;
      return r[i];
    }
    function sendMessage() {
      var text = chatInput.value.trim();
      if (!text || !currentFish) return;
      addMessage('user', text);
      chatInput.value = '';
      chatInput.focus();
      var fish = currentFish;
      setTimeout(function () {
        if (currentFish === fish) addMessage('fish', nextReply(fish));
      }, 400 + Math.random() * 400);
    }

    /*buttons*/
    galleryCloseBtn.addEventListener('click', closeGallery);
    chatSend.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
    });

    document.addEventListener('keydown', function (e) {
      var inInput = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
      if (e.key === 'Escape') {
        if (matchOverlay.classList.contains('open')) closeMatch();
        else if (chatModal.classList.contains('open')) closeChat();
        else if (galleryOverlay.classList.contains('open')) closeGallery();
        return;
      }
      if (inInput) return;
      if (!galleryOverlay.classList.contains('open') || matchOverlay.classList.contains('open') ||
          chatModal.classList.contains('open') || activeTab() !== 'swipe') return;
      if (e.key === 'ArrowRight') { e.preventDefault(); decide(true, 0); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); decide(false, 0); }
    });

    document.querySelectorAll('.win98-action-btn').forEach(function (button) {
      button.addEventListener('click', function () {
        if (window.win98PopupController && typeof window.win98PopupController.closePopup === 'function') {
          window.win98PopupController.closePopup();
        }
        openGallery();
      });
    });

    resetDeck();
  }, function (error) {
    console.error('Unable to load fish profiles from fish.json.', error);
    document.getElementById('swipe-stage').textContent = 'Fish profiles could not be loaded. Please check fish.json.';
    document.getElementById('swipe-counter').textContent = 'Profiles unavailable';
  });

/*toast*/
  (function () {
    var t = document.getElementById('jerkme-toast');
    var timer = null;
    window.jerkmeToast = function (msg) {
      t.textContent = msg;
      t.classList.add('show');
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { t.classList.remove('show'); }, 3200);
    };
  })();

/*Captcha*/
  (function () {
    var TW = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/';
    var overlay = document.getElementById('captcha-overlay');
    var step1 = document.getElementById('captcha-step1');
    var step2 = document.getElementById('captcha-step2');
    var cbSlot = document.getElementById('captcha-cb-slot');
    var gridEl = document.getElementById('captcha-grid');
    var promptEl = document.getElementById('captcha-prompt');
    var msg = document.getElementById('captcha-msg');
    var verifyBtn = document.getElementById('captcha-verify');
    var VERIFIED_KEY = 'jerkme_captcha_verified';
    var verified = false;
    try { verified = localStorage.getItem(VERIFIED_KEY) === 'yes'; } catch (e) {}
    var pending = null;
    var fails = 0;
    var checking = false;

    var tiles = [];

    function shuffle(a) {
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
      return a;
    }

    function buildGrid() {
      var profiles = window.fishProfileData || [];
      var seen = {};
      var fishProfiles = profiles.filter(function (profile) {
        var path = profile && profile.profilePicture;
        if (!path || /shrimp\.png$/i.test(path) || seen[path]) return false;
        seen[path] = true;
        return true;
      });
      var shrimpProfile = profiles.filter(function (profile) {
        return profile && profile.profilePicture && /shrimp\.png$/i.test(profile.profilePicture);
      })[0];

      if (fishProfiles.length < 8 || !shrimpProfile) {
        console.error('The profile-picture challenge needs eight distinct fish profiles and a shrimp profile.');
        msg.className = '';
        msg.textContent = 'Challenge images are unavailable. Please check fish.json and Pics/Profiles.';
        verifyBtn.disabled = true;
        gridEl.innerHTML = '';
        return false;
      }

      var excluded = {
        name: 'shrimp',
        image: shrimpProfile.profilePicture,
        fish: false,
        on: false
      };
      tiles = shuffle(fishProfiles.slice(0, 8).map(function (profile) {
        return {
          name: profile.name,
          image: profile.profilePicture,
          fish: true,
          on: false
        };
      }).concat([excluded]));
      gridEl.innerHTML = '';
      promptEl.innerHTML = 'Select all fish profile pictures. Do not select the <b>shrimp</b>.';
      verifyBtn.disabled = false;
      tiles.forEach(function (t) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'captcha-tile';
        b.setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-label', t.fish ? t.name + ' fish profile' : 'Do not select ' + t.name);
        var img = document.createElement('img');
        img.src = t.image;
        img.alt = t.name;
        img.onerror = function () { img.replaceWith(document.createTextNode(t.name)); };
        b.appendChild(img);
        b.addEventListener('click', function () {
          t.on = !t.on;
          b.setAttribute('aria-pressed', t.on ? 'true' : 'false');
        });
        gridEl.appendChild(b);
      });
      return true;
    }

    function resetCheckbox() {
      cbSlot.innerHTML = '<input type="checkbox" id="captcha-cb">';
      document.getElementById('captcha-cb').addEventListener('change', onCheck);
    }

    function onCheck(e) {
      if (checking) return;
      checking = true;
      cbSlot.innerHTML = '<div class="captcha-spin" role="img" aria-label="Checking"></div>';
      setTimeout(function () {
        checking = false;
        step1.hidden = true;
        step2.hidden = false;
        msg.textContent = ''; msg.className = '';
        buildGrid();
      }, isA11y() ? 500 : 1100);
    }
    function isA11y() { return document.documentElement.classList.contains('a11y-mode'); }

    var failLines = [
      'Incorrect. Shrimp often select shrimp. Try again.',
      'Hmm. That is very shrimp of you.',
      'Are you a crab? We are not judging. (We are judging.)'
    ];

    verifyBtn.addEventListener('click', function () {
      var ok = tiles.every(function (t) { return t.on === t.fish; });
      if (verifyBtn.disabled) return;
      if (ok || fails >= 3) {
        verified = true;
        try { localStorage.setItem(VERIFIED_KEY, 'yes'); } catch (e) {}
        msg.className = 'ok';
        msg.textContent = ok ? 'Verified: not a shrimp.' : 'Fine. We choose to believe you.';
        setTimeout(function () {
          close();
          var cb = pending; pending = null;
          if (cb) cb();
        }, 800);
      } else {
        msg.className = '';
        msg.textContent = failLines[Math.min(fails, failLines.length - 1)];
        fails++;
        buildGrid();
      }
    });

    function open(cb) {
      pending = cb;
      fails = 0;
      step1.hidden = false;
      step2.hidden = true;
      checking = false;
      resetCheckbox();
      overlay.classList.add('open');
      var c = document.getElementById('captcha-cb');
      if (c) c.focus();
    }
    function close() { overlay.classList.remove('open'); }

    document.getElementById('captcha-cancel').addEventListener('click', function () { pending = null; close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('open')) { pending = null; close(); }
    });

    window.requireShrimpCheck = function (cb) {
      if (verified) { cb(); return; }
      open(cb);
    };
  })();

/*scam cookie opener*/
  (function () {
    var KEY = 'jerkme_cookie_choice';
    var hasSavedChoice = false;
    try { hasSavedChoice = localStorage.getItem(KEY) !== null; } catch (e) {}
    if (hasSavedChoice) {
      window.spawnCookieFih();
      return;
    }

    var banner = document.getElementById('cookie-banner');
    var body = document.getElementById('cookie-body');
    var foot = banner.querySelector('.cookie-foot');
    var vendorsBox = document.getElementById('cookie-vendors');
    var vendorsToggle = document.getElementById('cookie-vendors-toggle');
    var rejectBtn = document.getElementById('cookie-reject');
    var zone = document.getElementById('cookie-dodge-zone');

    function isA11y() { return document.documentElement.classList.contains('a11y-mode'); }

    function show() {
      var consent = document.getElementById('a11y-consent-overlay');
      if (consent && consent.classList.contains('open')) { setTimeout(show, 500); return; }
      banner.classList.add('open');
    }
    setTimeout(show, 2200);

    var A = ['Plankton', 'Big Kelp', 'Reef', 'Tartar Sauce', 'Krill', 'Bubble', 'Coral', 'Tidepool', 'Sea Cucumber', 'Barnacle', 'Brine', 'Anemone'];
    var B = ['& Sons LLC', 'Analytics', 'Holdings', 'GmbH', 'Ad Exchange', 'Data Co-op', 'Consortium', 'Ltd.', 'Insights', 'Global'];
    var vendors = ['The Shrimp Consortium (not affiliated)', 'Definitely Not A Crab Inc.'];
    for (var i = 0; i < 40; i++) vendors.push(A[i % A.length] + ' ' + B[(i * 3 + Math.floor(i / 12)) % B.length]);
    vendors.forEach(function (v) {
      var d = document.createElement('div'); d.textContent = v; vendorsBox.appendChild(d);
    });
    var more = document.createElement('div'); more.textContent = '...and 1,160 more'; vendorsBox.appendChild(more);
    vendorsToggle.addEventListener('click', function () {
      var open = vendorsBox.classList.toggle('open');
      vendorsToggle.setAttribute('aria-expanded', String(open));
      vendorsToggle.textContent = open ? 'Hide partners (why would you)' : 'Show all 1,204 partners';
    });

    document.querySelectorAll('.cookie-toggle input.ck').forEach(function (cb) {
      var categoryNote = cb.closest('.cookie-toggle').querySelector('.cookie-category-note');
      var categoryNoteTimeout = null;
      cb.addEventListener('change', function () {
        if (cb.checked) return;
        if (categoryNoteTimeout) clearTimeout(categoryNoteTimeout);
        categoryNote.textContent = 'This category is a "legitimate interest" and has been re-enabled for your convenience.';
        categoryNote.hidden = false;
        categoryNoteTimeout = setTimeout(function () {
          categoryNote.hidden = true;
          categoryNote.textContent = '';
          categoryNoteTimeout = null;
        }, 5000);
        setTimeout(function () { cb.checked = true; }, 600);
      });
    });

    function finish(kind) {
      var text = {
        accept: 'Thank you! Your data has been shared with all 1,204 partners. (They are all fish.)',
        save: 'Preferences saved. We selected "all of them" on your behalf.',
        reject: 'Rejection noted and, per our policy, ignored. Enjoy your cookies.'
      }[kind];
      try { localStorage.setItem(KEY, kind); } catch (e) {}
      window.spawnCookieFih();
      body.className = 'cookie-body cookie-done';
      body.textContent = text;
      foot.style.display = 'none';
      setTimeout(function () { banner.classList.remove('open'); }, 2800);
    }
    document.getElementById('cookie-accept').addEventListener('click', function () { finish('accept'); });
    document.getElementById('cookie-save').addEventListener('click', function () { finish('save'); });

    var labels = ['Reject All', 'Nope', 'Too slow', 'Almost', 'Try harder', 'So close', 'ok fine'];
    var dodges = 0, MAX = 6;
    function dodge() {
      if (isA11y() || dodges >= MAX) return;
      dodges++;
      var zr = zone.getBoundingClientRect();
      var br = rejectBtn.getBoundingClientRect();
      var maxX = Math.max(0, zr.width - br.width);
      var maxY = Math.max(0, zr.height - br.height);
      rejectBtn.style.left = Math.round(Math.random() * maxX) + 'px';
      rejectBtn.style.top = Math.round(Math.random() * maxY) + 'px';
      rejectBtn.textContent = labels[Math.min(dodges, labels.length - 1)];
    }
    rejectBtn.addEventListener('pointerenter', dodge);
    rejectBtn.addEventListener('click', function () { finish('reject'); });
  })();

(function () {
    var popup = document.getElementById('win98-offer-popup');
    var win98Box = popup.querySelector('.win98popup');
    var closeBtn = document.getElementById('win98-offer-close');
    var timeLeftText = document.getElementById('win98-time-left');
    var remaining = 0;
    var initialRemaining = 0;
    var countDirection = -1;

    var msIntervalId = null;
    var reopenTimeoutId = null;
    var isOpen = false;

    function randomBetween(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function computeScale() {
      var minDim = Math.min(window.innerWidth, window.innerHeight);
      var scale = minDim / 900;
      scale = Math.max(0.6, Math.min(scale, 1.6));
      if (window.innerWidth <= 520) {
        var maxMobileScale = Math.max(0.4, (window.innerWidth - 32) / 265);
        scale = Math.min(scale * 3, maxMobileScale) * 0.7;
      }
      return scale;
    }

    function applyScale() {
      if (win98Box) win98Box.style.transform = 'scale(' + computeScale() + ')';
    }

    function isOtherOverlayOpen() {
      var gallery = document.getElementById('fish-gallery-overlay');
      var chat = document.getElementById('fish-chat-modal');
      var consent = document.getElementById('a11y-consent-overlay');
      return (gallery && gallery.classList.contains('open')) ||
             (chat && chat.classList.contains('open')) ||
             (consent && consent.classList.contains('open')) ||
             ['captcha-overlay', 'match-overlay'].some(function (id) {
               var e = document.getElementById(id);
               return e && e.classList.contains('open');
             });
    }

    function updateCountdownDisplay() {
      if (!timeLeftText) return;
      timeLeftText.textContent = 'TIME LEFT: ' + Math.max(0, remaining) + 'ms';
    }

    function positionRandomly() {
      var rect = win98Box.getBoundingClientRect();
      var w = rect.width || 265;
      var h = rect.height || 118;
      var margin = 20;
      var centerText = document.getElementById('center');
      var slider = document.getElementById('fih-slider-container');

      var underTextTop = 340;
      if (centerText) {
        var centerRect = centerText.getBoundingClientRect();
        underTextTop = centerRect.bottom + 18;
      }

      var safeLeft = (window.innerWidth - w) / 2;
      var safeTop = underTextTop;

      if (slider) {
        var sliderRect = slider.getBoundingClientRect();
        if (safeTop + h > sliderRect.top - margin) {
          safeTop = sliderRect.top - h - margin;
        }
      }

      var maxLeft = window.innerWidth - w - margin;
      if (margin > maxLeft) {
        safeLeft = Math.max(0, (window.innerWidth - w) / 2);
      } else {
        safeLeft = Math.max(margin, Math.min(maxLeft, safeLeft));
      }

      var maxTop = window.innerHeight - h - margin;
      if (margin > maxTop) {
        safeTop = Math.max(0, (window.innerHeight - h) / 2);
      } else {
        safeTop = Math.max(margin, Math.min(maxTop, safeTop));
      }

      popup.style.left = safeLeft + 'px';
      popup.style.top = safeTop + 'px';
    }

    function closePopup() {
      if (!isOpen) return;
      isOpen = false;
      if (msIntervalId) { clearInterval(msIntervalId); msIntervalId = null; }
      popup.style.display = 'none';
      scheduleReopen();
    }

    function scheduleReopen() {
      if (reopenTimeoutId) clearTimeout(reopenTimeoutId);
      var delay = randomBetween(600, 2000);
      reopenTimeoutId = setTimeout(openPopup, delay);
    }

    function openPopup() {
      if (isOpen) return;
      if (isOtherOverlayOpen()) {
        if (reopenTimeoutId) clearTimeout(reopenTimeoutId);
        reopenTimeoutId = setTimeout(openPopup, 500);
        return;
      }
      isOpen = true;
      popup.style.display = 'block';
      applyScale();
      positionRandomly();

      remaining = randomBetween(20000, 90000);
      initialRemaining = remaining;
      countDirection = -1;
      updateCountdownDisplay();
      msIntervalId = setInterval(function () {
        remaining += countDirection * 100;
        if (remaining <= 0) {
          remaining = 0;
          countDirection = 1;
        } else if (remaining >= initialRemaining) {
          remaining = initialRemaining;
          countDirection = -1;
        }
        updateCountdownDisplay();
      }, 100);
    }

    closeBtn.addEventListener('click', closePopup);

    var overlayObserver = new MutationObserver(function () {
      if (isOpen && isOtherOverlayOpen()) closePopup();
    });
    overlayObserver.observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });

    window.win98PopupController = {
      openPopup: openPopup,
      closePopup: closePopup
    };

    window.addEventListener('resize', function () {
      if (isOpen) {
        applyScale();
        positionRandomly();
      }
    });

    openPopup();
  })();
