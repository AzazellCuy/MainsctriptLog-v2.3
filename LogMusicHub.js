(function() {
    // =========================================================
    // STATE & VARIABLES
    // =========================================================
    const musicPlaylist = [];
    const radioStations = [];
    
    const audio = new Audio();
    let currentMode = 'music'; 
    let currentIndex = 0;
    let isPlaying = false;
    let isShuffle = false;
    let isRepeat = false;
    let isDraggingSlider = false;
    let currentArtistFilter = null;

    // =========================================================
    // DOM ELEMENTS
    // =========================================================
    const el = {
      wrapper: document.getElementById('musicstudio-app'),
      cover: document.getElementById('ms-cover'),
      title: document.getElementById('ms-title'),
      artist: document.getElementById('ms-artist'),
      badge: document.getElementById('ms-status-badge'),
      progress: document.getElementById('ms-progress-bar'),
      timeCurrent: document.getElementById('ms-time-current'),
      timeTotal: document.getElementById('ms-time-total'),
      volume: document.getElementById('ms-volume'),
      playerCard: document.getElementById('ms-player-card'),
      
      btnPlay: document.getElementById('ms-btn-play'),
      btnPrev: document.getElementById('ms-btn-prev'),
      btnNext: document.getElementById('ms-btn-next'),
      btnStop: document.getElementById('ms-btn-stop'),
      btnShuffle: document.getElementById('ms-btn-shuffle'),
      btnRepeat: document.getElementById('ms-btn-repeat'),
      iconPlay: document.getElementById('ms-icon-play'),
      iconPause: document.getElementById('ms-icon-pause'),
      
      tabs: document.querySelectorAll('.musicstudio-tab'),
      tabContents: document.querySelectorAll('.musicstudio-tab-content'),
      
      listMusic: document.getElementById('ms-list-music'),
      listArtists: document.getElementById('ms-list-artists'),
      listRadio: document.getElementById('ms-list-radio'),
      
      searchMusic: document.getElementById('ms-search-music'),
      searchArtist: document.getElementById('ms-search-artist'),
      searchRadio: document.getElementById('ms-search-radio'),
      backArtists: document.getElementById('ms-back-artists')
    };

    // =========================================================
    // INITIALIZATION
    // =========================================================
    function init() {
      // 1. AUTO DETECT THEME
      autoDetectBloggerTheme();

      // 2. PARSE DATA DARI HTML DATABASE
      parseDataFromHTML();

      audio.volume = el.volume.value / 100;
      updateSliderGradient(el.volume); 

      renderMusicList();
      renderArtistList();
      renderRadioList();
      loadItem(0, 'music', false);

      // Events Controls
      el.btnPlay.addEventListener('click', togglePlay);
      el.btnNext.addEventListener('click', playNext);
      el.btnPrev.addEventListener('click', playPrev);
      el.btnStop.addEventListener('click', stopAudio);
      el.btnShuffle.addEventListener('click', toggleShuffle);
      el.btnRepeat.addEventListener('click', toggleRepeat);
      
      // Progress bar events
      el.progress.addEventListener('mousedown', () => isDraggingSlider = true);
      el.progress.addEventListener('touchstart', () => isDraggingSlider = true, {passive: true});
      el.progress.addEventListener('mouseup', () => isDraggingSlider = false);
      el.progress.addEventListener('touchend', () => isDraggingSlider = false);
      
      el.progress.addEventListener('input', (e) => {
         if (currentMode === 'radio' || !isFinite(audio.duration)) return;
         let val = e.target.value;
         let previewTime = (val / 100) * audio.duration;
         el.timeCurrent.textContent = formatTime(previewTime);
         updateSliderGradient(el.progress);
      });

      el.progress.addEventListener('change', (e) => {
         if (currentMode === 'radio' || !isFinite(audio.duration)) return;
         let val = e.target.value;
         audio.currentTime = (val / 100) * audio.duration;
      });

      // Volume control
      el.volume.addEventListener('input', (e) => {
         audio.volume = e.target.value / 100;
         updateSliderGradient(el.volume);
      });
      
      audio.addEventListener('timeupdate', updateProgress);
      audio.addEventListener('ended', handleAudioEnd);
      audio.addEventListener('waiting', () => updateBadge('Memuat...'));
      audio.addEventListener('playing', () => updateBadge(currentMode === 'radio' ? 'LIVE' : 'Memutar'));

      // Tabs
      el.tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.getAttribute('data-target')));
      });

      // Search
      el.searchMusic.addEventListener('input', () => renderMusicList(el.searchMusic.value));
      el.searchArtist.addEventListener('input', () => renderArtistList(el.searchArtist.value));
      el.searchRadio.addEventListener('input', () => renderRadioList(el.searchRadio.value));

      // Back button
      el.backArtists.addEventListener('click', () => {
        currentArtistFilter = null;
        el.backArtists.style.display = 'none';
        el.searchMusic.value = '';
        renderMusicList();
      });
    }

    // =========================================================
    // FUNGSI MENGAMBIL DATA DARI HTML (MENCEGAH ERROR JS)
    // =========================================================
    function parseDataFromHTML() {
      // Ambil Lagu
      document.querySelectorAll('#db-songs .item-lagu').forEach(elem => {
        musicPlaylist.push({
          title: elem.getAttribute('data-title') || 'Unknown Title',
          artist: elem.getAttribute('data-artist') || 'Unknown Artist',
          cover: elem.getAttribute('data-cover') || '',
          src: elem.getAttribute('data-src') || ''
        });
      });

      // Ambil Radio
      document.querySelectorAll('#db-radios .item-radio').forEach(elem => {
        radioStations.push({
          name: elem.getAttribute('data-name') || 'Unknown Radio',
          cover: elem.getAttribute('data-cover') || '',
          stream: elem.getAttribute('data-stream') || ''
        });
      });

      // Mencegah error jika kosong
      if (musicPlaylist.length === 0) {
        musicPlaylist.push({ title: "Belum ada lagu", artist: "Database Kosong", cover: "", src: "" });
      }
      if (radioStations.length === 0) {
        radioStations.push({ name: "Belum ada radio", cover: "", stream: "" });
      }
    }

    // =========================================================
    // AUTO DETECT BLOGGER THEME
    // =========================================================
    function autoDetectBloggerTheme() {
      const checkTheme = () => {
        let isDark = false;
        const html = document.documentElement;
        const body = document.body;
        const darkSelectors = ['.dark', '.dark-mode', '.Night', '[data-theme="dark"]', '[data-mode="dark"]'];
        
        if (document.querySelector(darkSelectors.join(', '))) isDark = true;

        if (!isDark) {
          try {
            const bgColor = window.getComputedStyle(body).backgroundColor;
            const rgb = bgColor.match(/\d+/g);
            if (rgb && rgb.length >= 3 && (rgb.length === 3 || parseFloat(rgb[3]) !== 0)) {
              const brightness = Math.round(((parseInt(rgb[0]) * 299) + (parseInt(rgb[1]) * 587) + (parseInt(rgb[2]) * 114)) / 1000);
              if (brightness < 128) isDark = true;
            }
          } catch(e) {}
        }

        if (isDark) el.wrapper.classList.add('ms-theme-dark');
        else el.wrapper.classList.remove('ms-theme-dark');
      };

      checkTheme();
      const observer = new MutationObserver(checkTheme);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'data-mode'] });
      observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme', 'data-mode', 'style'] });
    }

    // =========================================================
    // FUNGSI GRADIENT SLIDER
    // =========================================================
    function updateSliderGradient(element) {
      let value = element.value;
      let min = element.min ? element.min : 0;
      let max = element.max ? element.max : 100;
      let percentage = ((value - min) / (max - min)) * 100;
      element.style.background = `linear-gradient(to right, var(--ms-primary) ${percentage}%, var(--ms-border) ${percentage}%)`;
    }

    // =========================================================
    // CORE AUDIO FUNCTIONS
    // =========================================================
    function loadItem(index, mode, autoPlay = true) {
      currentMode = mode;
      currentIndex = index;
      
      let item;
      if (mode === 'music') {
        item = musicPlaylist[index];
        el.title.textContent = item.title;
        el.artist.textContent = item.artist;
        el.cover.src = item.cover;
        audio.src = item.src;
        el.progress.disabled = false;
        el.btnShuffle.style.opacity = '1';
        el.btnRepeat.style.opacity = '1';
      } else {
        item = radioStations[index];
        el.title.textContent = item.name;
        el.artist.textContent = "Streaming Radio";
        el.cover.src = item.cover;
        audio.src = item.stream;
        el.progress.value = 0;
        updateSliderGradient(el.progress);
        el.progress.disabled = true; 
        el.timeCurrent.textContent = "LIVE";
        el.timeTotal.textContent = "--:--";
        el.btnShuffle.style.opacity = '0.3';
        el.btnRepeat.style.opacity = '0.3';
      }

      updateActiveListStyle();
      updateBadge("Siap");

      if (autoPlay) {
        audio.play().catch(e => console.log("Auto-play prevented", e));
        isPlaying = true;
        updatePlayUI();
      } else {
        isPlaying = false;
        updatePlayUI();
      }
    }

    function togglePlay() {
      if (!audio.src) return;
      if (isPlaying) {
        audio.pause();
        isPlaying = false;
        updateBadge("Jeda");
      } else {
        audio.play().catch(e => console.log("Play prevented", e));
        isPlaying = true;
        updateBadge(currentMode === 'radio' ? "LIVE" : "Memutar");
      }
      updatePlayUI();
    }

    function stopAudio() {
      audio.pause();
      audio.currentTime = 0;
      isPlaying = false;
      updatePlayUI();
      updateBadge("Berhenti");
      if(currentMode === 'radio') {
        audio.src = ''; 
        setTimeout(() => loadItem(currentIndex, 'radio', false), 100);
      }
    }

    function playNext() {
      let maxIndex = currentMode === 'music' ? musicPlaylist.length - 1 : radioStations.length - 1;
      
      if (currentMode === 'music' && isShuffle) {
        let randomIndex = currentIndex;
        while (randomIndex === currentIndex && maxIndex > 0) {
          randomIndex = Math.floor(Math.random() * (maxIndex + 1));
        }
        loadItem(randomIndex, currentMode, true);
      } else {
        let nextIdx = currentIndex + 1;
        if (nextIdx > maxIndex) nextIdx = 0;
        loadItem(nextIdx, currentMode, true);
      }
    }

    function playPrev() {
      let maxIndex = currentMode === 'music' ? musicPlaylist.length - 1 : radioStations.length - 1;
      let prevIdx = currentIndex - 1;
      if (prevIdx < 0) prevIdx = maxIndex;
      loadItem(prevIdx, currentMode, true);
    }

    function handleAudioEnd() {
      if (currentMode === 'radio') return;
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play();
      } else {
        playNext();
      }
    }

    function toggleShuffle() {
      if (currentMode === 'radio') return;
      isShuffle = !isShuffle;
      el.btnShuffle.classList.toggle('active', isShuffle);
    }

    function toggleRepeat() {
      if (currentMode === 'radio') return;
      isRepeat = !isRepeat;
      el.btnRepeat.classList.toggle('active', isRepeat);
    }

    function updateProgress() {
      if (currentMode === 'radio' || !isFinite(audio.duration)) return;
      if (!isDraggingSlider) {
        let progressPercent = (audio.currentTime / audio.duration) * 100;
        el.progress.value = progressPercent;
        updateSliderGradient(el.progress);
        el.timeCurrent.textContent = formatTime(audio.currentTime);
      }
      el.timeTotal.textContent = formatTime(audio.duration);
    }

    function formatTime(seconds) {
      if (isNaN(seconds)) return "0:00";
      let min = Math.floor(seconds / 60);
      let sec = Math.floor(seconds % 60);
      return min + ":" + (sec < 10 ? "0" + sec : sec);
    }

    // =========================================================
    // UI UPDATES
    // =========================================================
    function updatePlayUI() {
      if (isPlaying) {
        el.iconPlay.style.display = 'none';
        el.iconPause.style.display = 'block';
        el.playerCard.classList.add('playing');
      } else {
        el.iconPlay.style.display = 'block';
        el.iconPause.style.display = 'none';
        el.playerCard.classList.remove('playing');
      }
    }

    function updateBadge(text) {
      el.badge.textContent = text;
    }

    function updateActiveListStyle() {
      document.querySelectorAll('.musicstudio-list-item').forEach(elem => elem.classList.remove('active'));
      let prefix = currentMode === 'music' ? 'ms-track-' : 'ms-radio-';
      let activeEl = document.getElementById(prefix + currentIndex);
      if (activeEl) activeEl.classList.add('active');
    }

    function switchTab(tabId) {
      el.tabs.forEach(t => {
        if (t.getAttribute('data-target') === tabId) t.classList.add('active');
        else t.classList.remove('active');
      });
      el.tabContents.forEach(tc => {
        if (tc.id === tabId) {
           tc.classList.add('active');
           tc.style.display = "flex"; 
        } else {
           tc.classList.remove('active');
           tc.style.display = "none";
        }
      });
    }

    // =========================================================
    // RENDER LISTS
    // =========================================================
    function renderMusicList(searchQuery = '') {
      el.listMusic.innerHTML = '';
      let q = searchQuery.toLowerCase();

      musicPlaylist.forEach((item, index) => {
        if (q && !item.title.toLowerCase().includes(q) && !item.artist.toLowerCase().includes(q)) return;
        if (currentArtistFilter && item.artist !== currentArtistFilter) return;

        let div = document.createElement('div');
        div.className = 'musicstudio-list-item';
        div.id = 'ms-track-' + index;
        if (currentMode === 'music' && currentIndex === index) div.classList.add('active');

        div.innerHTML = `
          <img src="${item.cover}" class="musicstudio-item-thumb" alt="Cover">
          <div class="musicstudio-item-info">
            <p class="musicstudio-item-title">${item.title}</p>
            <p class="musicstudio-item-subtitle">${item.artist}</p>
          </div>
          <div class="musicstudio-item-action">
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        `;
        
        div.addEventListener('click', () => {
          if (currentMode === 'music' && currentIndex === index) {
            togglePlay(); 
          } else {
            loadItem(index, 'music', true);
          }
        });
        el.listMusic.appendChild(div);
      });
    }

    function renderArtistList(searchQuery = '') {
      el.listArtists.innerHTML = '';
      let q = searchQuery.toLowerCase();
      const artistsMap = {};
      musicPlaylist.forEach(track => {
        if (!artistsMap[track.artist]) {
          artistsMap[track.artist] = { name: track.artist, count: 0, cover: track.cover };
        }
        artistsMap[track.artist].count++;
      });

      Object.values(artistsMap).forEach(artist => {
        if (q && !artist.name.toLowerCase().includes(q)) return;
        let div = document.createElement('div');
        div.className = 'musicstudio-list-item';
        div.innerHTML = `
          <img src="${artist.cover}" class="musicstudio-item-thumb musicstudio-item-thumb-round" alt="Artist">
          <div class="musicstudio-item-info">
            <p class="musicstudio-item-title">${artist.name}</p>
            <p class="musicstudio-item-subtitle">${artist.count} Lagu</p>
          </div>
        `;
        div.addEventListener('click', () => {
          currentArtistFilter = artist.name;
          switchTab('tab-music');
          el.backArtists.style.display = 'block';
          el.backArtists.innerHTML = `← Kembali (Memfilter: ${artist.name})`;
          renderMusicList();
        });
        el.listArtists.appendChild(div);
      });
    }

    function renderRadioList(searchQuery = '') {
      el.listRadio.innerHTML = '';
      let q = searchQuery.toLowerCase();

      radioStations.forEach((item, index) => {
        if (q && !item.name.toLowerCase().includes(q)) return;
        let div = document.createElement('div');
        div.className = 'musicstudio-list-item';
        div.id = 'ms-radio-' + index;
        if (currentMode === 'radio' && currentIndex === index) div.classList.add('active');

        div.innerHTML = `
          <img src="${item.cover}" class="musicstudio-item-thumb" alt="Radio">
          <div class="musicstudio-item-info">
            <p class="musicstudio-item-title">${item.name}</p>
            <p class="musicstudio-item-subtitle">Live Stream</p>
          </div>
          <div class="musicstudio-item-action">
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        `;
        div.addEventListener('click', () => {
          if (currentMode === 'radio' && currentIndex === index) {
             if (isPlaying) stopAudio(); else togglePlay(); 
          } else {
            loadItem(index, 'radio', true);
          }
        });
        el.listRadio.appendChild(div);
      });
    }

    // Run
    document.addEventListener('DOMContentLoaded', init);
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(init, 1);
    }

  })();
