import { db, ensureAuth } from './firebase-config.js';
import { ref, onValue, get, update } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js";
import { formatTime, TASKS_LIST, escapeHtml } from './game-logic.js';

function getRoomCodeFromUrl() {
    try {
        const searchParams = new URLSearchParams(window.location.search);
        let code = searchParams.get('room');
        if (code && code.trim()) return code.trim().toUpperCase();

        const match = window.location.href.match(/[?&]room=([a-zA-Z0-9]+)/i);
        if (match && match[1]) return match[1].trim().toUpperCase();

        const cached = sessionStorage.getItem('current_room') || localStorage.getItem('current_room');
        if (cached && cached.trim()) return cached.trim().toUpperCase();
    } catch (e) {
        console.error("Error parsing room code:", e);
    }
    return null;
}

let roomCode = getRoomCodeFromUrl();
console.log("Maxischermo roomCode rilevato:", roomCode);

function enableFullscreen() {
    if (!document.fullscreenElement) {
        const el = document.documentElement;
        if (el.requestFullscreen) {
            el.requestFullscreen().catch(err => console.log("Fullscreen request:", err.message));
        } else if (el.webkitRequestFullscreen) {
            el.webkitRequestFullscreen();
        } else if (el.msRequestFullscreen) {
            el.msRequestFullscreen();
        }
    }
}

// Enable fullscreen on user gesture anywhere on screen
document.addEventListener('click', () => {
    enableFullscreen();
}, { once: false });

if (!roomCode) {
    const joinOverlay = document.getElementById('join-overlay');
    if (joinOverlay) {
        joinOverlay.classList.remove('hidden');
        joinOverlay.style.display = 'flex';
    }
    const btnJoin = document.getElementById('btn-join-room');
    if (btnJoin) {
        btnJoin.addEventListener('click', () => {
            const code = document.getElementById('join-room-input').value.trim().toUpperCase();
            if(!code) {
                alert("Inserisci il codice della stanza!");
                return;
            }
            console.log('Tentativo di connessione alla stanza:', code);
            roomCode = code;
            sessionStorage.setItem('current_room', roomCode);
            localStorage.setItem('current_room', roomCode);
            enableFullscreen();

            const url = new URL(window.location);
            url.searchParams.set('room', code);
            window.history.replaceState({}, '', url);
            
            startConnection();
        });
    }
} else {
    sessionStorage.setItem('current_room', roomCode);
    localStorage.setItem('current_room', roomCode);
    startConnection();
}

function startConnection() {
    let roomRef = null;
    let isDeadRevealActive = false;
    let currentGameState = 'waiting';
    let latestPlayersData = null;
    let latestVotesData = null;
    let latestMaxPlayers = null;

    const joinOverlay = document.getElementById('join-overlay');
    if (joinOverlay) {
        joinOverlay.classList.add('hidden');
        joinOverlay.style.display = 'none';
    }
    const mainDashboard = document.getElementById('main-dashboard-layout');
    if (mainDashboard) {
        mainDashboard.classList.remove('hidden');
    }
    
    // Attempt fullscreen
    enableFullscreen();

    // Elements
    const headerEl = document.getElementById('header-room-code');
    const lobbyCodeDisplay = document.getElementById('waiting-room-code');
    const overlayMeeting = document.getElementById('overlay-meeting');
    const overlayText = document.getElementById('overlay-text');
    const overlayEjected = document.getElementById('overlay-ejected');
    const ejectedText = document.getElementById('ejected-text');
    const globalTimer = document.getElementById('global-timer');
    const taskProgressFill = document.getElementById('task-progress-fill');
    const taskProgressText = document.getElementById('task-progress-text');
    const playersListContainer = document.getElementById('players-list-container');
    const sirenAudio = document.getElementById('siren-audio');
    const mapImage = document.getElementById('map-image');
    const mapViewWrapper = document.getElementById('map-view-wrapper');
    const textMapContainer = document.getElementById('text-map-container');

    if (headerEl) headerEl.textContent = roomCode;
    if (lobbyCodeDisplay) lobbyCodeDisplay.textContent = roomCode;

    // Render QR Code immediately
    const qrContainer = document.getElementById("qrcode");
    if (qrContainer && typeof QRCode !== 'undefined' && roomCode) {
        qrContainer.innerHTML = '';
        const joinUrl = `${window.location.origin}/?room=${roomCode}`;
        new QRCode(qrContainer, {
            text: joinUrl,
            width: 150,
            height: 150,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.L
        });
    }
    
    // Load default SVG Map of Oratorio
    loadSVGMap();
    renderTasks(null, true);
    renderPlayers(null, null, null);

    let previousStatus = null;
    let timerInterval = null;
    let currentTimerEndTime = 0;

    // Helper: Auto-Scroll overflow containers smoothly (Slow, readable pace)
    function setupAutoScroll(container) {
        if (!container) return;
        
        if (container._scrollTimer) {
            cancelAnimationFrame(container._scrollTimer);
            container._scrollTimer = null;
        }
        
        let scrollPos = container.scrollTop;
        let direction = 1;
        let pauseFrames = 240; // 4 seconds initial pause at top
        const speed = 0.15;   // Very slow, smooth crawl (easy to read on projector)
        
        function autoScrollLoop() {
            const maxScroll = container.scrollHeight - container.clientHeight;
            
            if (maxScroll > 10) {
                if (pauseFrames > 0) {
                    pauseFrames--;
                } else {
                    scrollPos += speed * direction;
                    if (scrollPos >= maxScroll) {
                        scrollPos = maxScroll;
                        direction = -1;
                        pauseFrames = 240; // 4 seconds pause at bottom
                    } else if (scrollPos <= 0) {
                        scrollPos = 0;
                        direction = 1;
                        pauseFrames = 240; // 4 seconds pause at top
                    }
                    container.scrollTop = scrollPos;
                }
            } else {
                container.scrollTop = 0;
                scrollPos = 0;
            }
            
}
