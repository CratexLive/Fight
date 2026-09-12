class SecureStreamUI extends HTMLElement {
    constructor() {
        super();
        this._root = this.attachShadow({ mode: 'closed' });
        this.config = window.PlayerConfig || {};
    }

    connectedCallback() {
        // --- 1. Frontend Domain Locking ---
        const currentDomain = window.location.hostname;
        const allowedDomains = this.config.allowedDomains || ['localhost'];
        
        if (!allowedDomains.includes(currentDomain)) {
            this._root.innerHTML = `
                <style>
                    .denied { color: #ff4444; font-family: sans-serif; text-align: center; margin-top: 20vh; }
                </style>
                <div class="denied"><h2>Unauthorized Domain</h2><p>Player embedded on an invalid domain.</p></div>
            `;
            return;
        }

        // --- 2. Inject HTML and CSS ---
        this._root.innerHTML = `
            <link rel="stylesheet" href="https://cdn.plyr.io/3.7.8/plyr.css" />
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;800&display=swap');
                :host {
                    --plyr-color-main: #00A3FF;
                    --bg-color: #050507;
                    --modal-bg: rgba(15, 15, 18, 0.9);
                    --modal-border: rgba(255, 255, 255, 0.06);
                    --text-secondary: #8a8a93;
                    display: flex; align-items: center; justify-content: center;
                    width: 100%; height: 100vh; font-family: 'Inter', sans-serif;
                    background-image: radial-gradient(circle at 50% 0%, #111118 0%, var(--bg-color) 70%);
                }
                .video-container { width: 100%; max-width: 1280px; box-shadow: 0 30px 80px rgba(0,0,0,0.95); border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); background: #000; position: relative; }
                .custom-loader-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 45; transition: opacity 0.5s, visibility 0.5s; pointer-events: none; }
                .custom-loader-overlay.hidden { opacity: 0; visibility: hidden; }
                .spinner-ring { width: 42px; height: 42px; border: 3px solid rgba(255,255,255,0.05); border-top-color: var(--plyr-color-main); border-radius: 50%; animation: spin 1s cubic-bezier(0.4,0,0.2,1) infinite; margin-bottom: 16px; box-shadow: 0 0 20px rgba(0,163,255,0.2); }
                .loading-text { color: rgba(255,255,255,0.85); font-size: 13px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; animation: pulse 2s ease-in-out infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
                .plyr--loading .plyr__video-wrapper::before, .plyr__video-wrapper::before { display: none !important; opacity: 0 !important; }
                
                .floating-tg { position: absolute; top: 24px; right: 24px; z-index: 50; background: rgba(15,15,18,0.6); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); border-radius: 40px; padding: 6px 12px 6px 6px; display: flex; align-items: center; gap: 10px; text-decoration: none; color: #fff; font-size: 13px; font-weight: 600; box-shadow: 0 10px 30px rgba(0,0,0,0.6); animation: float 4s ease-in-out infinite; opacity: 0; visibility: hidden; transform: translateY(-10px); transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); }
                .floating-tg.show { opacity: 1; visibility: visible; transform: translateY(0); }
                .floating-tg:hover { background: rgba(25,25,30,0.9); transform: scale(1.03); border-color: rgba(0,163,255,0.5); }
                .tg-icon-small { width: 26px; height: 26px; background: linear-gradient(135deg, #2AABEE 0%, #229ED9 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(34,158,217,0.5); }
                .tg-icon-small svg { width: 13px; height: 13px; fill: #fff; margin-right: 1px; margin-top: 1px; }
                .btn-close-tg { background: transparent; border: none; color: rgba(255,255,255,0.4); border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; margin-left: 2px; transition: 0.2s; padding: 0; }
                .btn-close-tg:hover { color: #fff; }
                
                .popup-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 9999; opacity: 0; visibility: hidden; transition: opacity 0.5s, visibility 0.5s; }
                .popup-overlay.show { opacity: 1; visibility: visible; }
                .popup-content { background: var(--modal-bg); padding: 32px 24px 24px; border-radius: 20px; text-align: center; width: 90%; max-width: 270px; border: 1px solid var(--modal-border); box-shadow: 0 40px 80px rgba(0,0,0,0.9); transform: translateY(30px) scale(0.95); opacity: 0; transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1); transition-delay: 0.1s; }
                .popup-overlay.show .popup-content { transform: translateY(0) scale(1); opacity: 1; }
                .tg-icon-wrapper { width: 50px; height: 50px; margin: 0 auto 18px; background: linear-gradient(135deg, #2AABEE 0%, #229ED9 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 25px rgba(34,158,217,0.4); animation: float 4s ease-in-out infinite; }
                .tg-icon-wrapper svg { width: 24px; height: 24px; fill: #fff; margin-right: 2px; margin-top: 1px; }
                .popup-content h2 { margin: 0 0 10px; font-size: 21px; font-weight: 800; color: #fff; letter-spacing: -0.3px; }
                .popup-content p { color: var(--text-secondary); font-size: 13px; line-height: 1.5; margin: 0 0 24px; }
                .btn-join { display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #00A3FF 0%, #0066FF 100%); color: #fff; text-decoration: none; padding: 14px; font-size: 14px; font-weight: 600; border-radius: 12px; margin-bottom: 14px; transition: all 0.3s ease; box-shadow: 0 8px 20px rgba(0,163,255,0.3); position: relative; overflow: hidden; }
                .btn-join::after { content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); transform: skewX(-20deg); transition: all 0.6s; }
                .btn-join:hover { transform: translateY(-2px); box-shadow: 0 12px 25px rgba(0,163,255,0.4); }
                .btn-join:hover::after { left: 150%; }
                .btn-dismiss { display: inline-block; color: rgba(255,255,255,0.4); font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.3s; text-transform: uppercase; padding: 6px 12px; border-radius: 15px; }
                .btn-dismiss:hover { color: #fff; }
                
                @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-5px); } }
                .plyr--video .plyr__control.plyr__tab-focus, .plyr--video .plyr__control:hover, .plyr--video .plyr__control[aria-expanded=true] { background: var(--plyr-color-main); }
                .plyr__menu__container { background: rgba(15,15,18,0.95); backdrop-filter: blur(15px); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.8); }
                .plyr__control { border-radius: 8px !important; }
            </style>

            <div id="main-popup" class="popup-overlay">
                <div class="popup-content">
                    <div class="tg-icon-wrapper">
                        <svg viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.892-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                    </div>
                    <h2>${this.config.popupTitle}</h2>
                    <p>${this.config.popupDesc}</p>
                    <a href="${this.config.telegramLink}" target="_blank" class="btn-join">${this.config.telegramJoinText}</a>
                    <span class="btn-dismiss" id="dismiss-popup">I've joined</span>
                </div>
            </div>

            <div class="video-container">
                <div id="stream-loader" class="custom-loader-overlay">
                    <div class="spinner-ring"></div>
                    <div class="loading-text">Stream Loading...</div>
                </div>

                <div id="floating-tg" class="floating-tg">
                    <a href="${this.config.telegramLink}" target="_blank" style="display:flex; align-items:center; gap:8px; text-decoration:none;">
                        <div class="tg-icon-small">
                            <svg viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.892-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                        </div>
                        <span class="tg-text-small">${this.config.telegramJoinText}</span>
                    </a>
                    <button class="btn-close-tg" id="close-tg">×</button>
                </div>

                <video id="player" controls crossorigin playsinline></video>
            </div>
        `;

        // --- 3. Fetch SVG Sprite for Plyr ---
        fetch('https://cdn.plyr.io/3.7.8/plyr.svg')
            .then(res => res.text())
            .then(svg => {
                const spriteContainer = document.createElement('div');
                spriteContainer.style.display = 'none';
                spriteContainer.innerHTML = svg;
                this._root.insertBefore(spriteContainer, this._root.firstChild);
            }).catch(console.error);

        this.initLogic();
    }

    initLogic() {
        const video = this._root.querySelector('#player');
        const customLoader = this._root.querySelector('#stream-loader');
        const source = this.config.streamUrl;

        // Button Dismiss Events
        this._root.querySelector('#dismiss-popup').addEventListener('click', () => {
            const popup = this._root.querySelector('#main-popup');
            popup.style.opacity = '0';
            popup.style.visibility = 'hidden';
            setTimeout(() => popup.remove(), 500);
        });

        this._root.querySelector('#close-tg').addEventListener('click', () => {
            const el = this._root.querySelector('#floating-tg');
            el.style.opacity = '0';
            el.style.visibility = 'hidden';
            setTimeout(() => el.remove(), 300);
        });

        // Loaders
        const showLoader = () => customLoader.classList.remove('hidden');
        const hideLoader = () => customLoader.classList.add('hidden');
        
        video.addEventListener('loadstart', showLoader);
        video.addEventListener('waiting', showLoader);
        video.addEventListener('canplay', hideLoader);
        video.addEventListener('playing', hideLoader);

        const defaultOptions = {
            controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'],
            settings: ['quality', 'speed'],
            keyboard: { focused: true, global: true },
            displayDuration: true,
            autoplay: true,
            loadSprite: false, // Ensures buttons show inside Shadow DOM
            iconUrl: ''
        };

        if (Hls.isSupported()) {
            const hls = new Hls({ maxBufferLength: 10, enableWorker: true, lowLatencyMode: true });
            hls.loadSource(source);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                const availableQualities = hls.levels.map(l => l.height).sort((a, b) => b - a);
                availableQualities.unshift(0); 
                defaultOptions.quality = { default: 0, options: availableQualities, forced: true, onChange: (e) => this.updateQuality(hls, e) };
                defaultOptions.i18n = { qualityLabel: { 0: 'Auto' } };

                const player = new Plyr(video, defaultOptions);
                player.on('ready', () => {
                    const plyrContainer = this._root.querySelector('.plyr');
                    plyrContainer.appendChild(customLoader);
                    plyrContainer.appendChild(this._root.querySelector('#floating-tg'));
                });
            });
            hls.on(Hls.Events.ERROR, (e, data) => { if (data.fatal) hideLoader(); });
            hls.attachMedia(video);
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = source;
            new Plyr(video, defaultOptions);
        }

        // Popup timers
        setTimeout(() => {
            const mainPopup = this._root.querySelector('#main-popup');
            if (mainPopup) mainPopup.classList.add('show');
        }, 300);

        setTimeout(() => {
            const floatingTg = this._root.querySelector('#floating-tg');
            if (floatingTg) floatingTg.classList.add('show');
        }, 2500);
    }

    updateQuality(hls, newQuality) {
        if (newQuality === 0) hls.currentLevel = -1;
        else hls.levels.forEach((level, idx) => { if (level.height === newQuality) hls.currentLevel = idx; });
    }
}

customElements.define('secure-stream-ui', SecureStreamUI);
