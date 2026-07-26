import { db, ensureAuth } from './firebase-config.js';
import { ref, onValue, get, update } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js";
import { formatTime, TASKS_LIST, escapeHtml, normalizePlayers } from './game-logic.js';

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

    // Render default SVG Map & initial UI components first
    loadSVGMap();
    renderTasks(null, true);
    renderPlayers(null, null, null);

    // Render QR Code safely
    const qrContainer = document.getElementById("qrcode");
    if (qrContainer && typeof QRCode !== 'undefined' && roomCode) {
        try {
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
        } catch (e) {
            console.warn("Errore generazione iniziale QR code:", e);
        }
    }

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
            
            container._scrollTimer = requestAnimationFrame(autoScrollLoop);
        }
        
        container._scrollTimer = requestAnimationFrame(autoScrollLoop);
    }



    // Render task list in left panel & center table
    function renderTasks(configTasks, enableTasks = true) {
        const leftTaskList = document.getElementById('left-tasks-list');
        const textTasksBody = document.getElementById('text-tasks-body');
        
        if (leftTaskList) leftTaskList.innerHTML = '';
        if (textTasksBody) textTasksBody.innerHTML = '';

        if (enableTasks === false) {
            if (leftTaskList) {
                leftTaskList.innerHTML = '<li style="padding: 1rem; color: #888; text-align: center;">Task disabilitate</li>';
            }
            if (textTasksBody) {
                textTasksBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #888; padding: 1rem;">Task disabilitate</td></tr>';
            }
            return;
        }

        let tasksArray = [];

        if (configTasks && Array.isArray(configTasks) && configTasks.length > 0) {
            tasksArray = configTasks;
        } else {
            // Default fallback to TASKS_LIST from game-logic.js
            tasksArray = TASKS_LIST.map((tStr, idx) => {
                const matchPipe = tStr.match(/^(\d+)\.\s*([^|]+)(?:\|\s*(.+))?$/);
                if (matchPipe) {
                    return {
                        num: matchPipe[1],
                        name: matchPipe[2].trim(),
                        obj: "",
                        pos: matchPipe[3] ? matchPipe[3].trim() : ""
                    };
                }
                const matchColon = tStr.match(/^(\d+)\.\s*([^:]+)(?::\s*(.+))?$/);
                if (matchColon) {
                    return {
                        num: matchColon[1],
                        name: matchColon[2].trim(),
                        obj: matchColon[3] ? matchColon[3].trim() : "",
                        pos: ""
                    };
                }
                return { num: idx + 1, name: tStr, obj: "", pos: "" };
            });
        }

        // Left tasks list (cards)
        if (leftTaskList) {
            tasksArray.forEach(t => {
                const li = document.createElement('li');
                li.className = 'schermo-task-item';
                const taskMainText = t.obj || t.name || '';
                li.innerHTML = `
                    <span class="task-num">#${escapeHtml(t.num)}</span>
                    <div class="task-info">
                        <div class="task-title">${escapeHtml(taskMainText)}</div>
                        ${t.pos ? `<div class="task-location">📍 ${escapeHtml(t.pos)}</div>` : ''}
                    </div>
                `;
                leftTaskList.appendChild(li);
            });
            const leftScroll = document.getElementById('left-tasks-scroll');
            if (leftScroll) setupAutoScroll(leftScroll);
        }

        // Center tasks table (table format)
        if (textTasksBody) {
            tasksArray.forEach(t => {
                const tr = document.createElement('tr');
                const taskMainText = t.obj || t.name || '';
                tr.innerHTML = `
                    <td class="task-td-num">${escapeHtml(t.num)}</td>
                    <td class="task-td-name">${escapeHtml(taskMainText)}</td>
                    <td class="task-td-pos">${t.pos ? escapeHtml(t.pos) : '-'}</td>
                `;
                textTasksBody.appendChild(tr);
            });
            const centerScroll = document.getElementById('center-tasks-scroll');
            if (centerScroll) setupAutoScroll(centerScroll);
        }
    }

    function updateTaskBar(playersData) {
        if (!playersData) return;
        let totalTasks = 0;
        let completedTasks = 0;

        for (const name in playersData) {
            const pData = playersData[name];
            if (!pData) continue;
            // Count tasks for all non-impostors (crewmates, scientists, etc.)
            if (pData.role !== 'impostor' && pData.tasks) { 
                const tasksObj = pData.tasks;
                for (const key in tasksObj) {
                    const task = tasksObj[key];
                    if (task) {
                        totalTasks++;
                        if (task.completed === true || task.completed === "true") {
                            completedTasks++;
                        }
                    }
                }
            }
        }

        const percentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        if (taskProgressFill) {
            taskProgressFill.style.height = `${percentage}%`;
            taskProgressFill.style.width = '100%';
        }
        if (taskProgressText) taskProgressText.textContent = `${Math.round(percentage)}%`;

        const taskCountText = document.getElementById('task-count-text');
        if (taskCountText) {
            taskCountText.textContent = `${completedTasks} / ${totalTasks} completate`;
        }
    }

    async function loadSVGMap() {
        const svgContainer = document.getElementById('svg-map-container');
        if (!svgContainer) return;

        try {
            let response = await fetch('public/assets/MappaOratotorio.svg');
            if (!response.ok) {
                response = await fetch('assets/MappaOratotorio.svg');
            }
            if (!response.ok) throw new Error("HTTP error " + response.status);
            const svgText = await response.text();
            svgContainer.innerHTML = svgText;
            const svgEl = svgContainer.querySelector('svg');
            if (svgEl) {
                svgEl.setAttribute('width', '100%');
                svgEl.setAttribute('height', '100%');
                svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            }
            if (mapViewWrapper) mapViewWrapper.classList.remove('hidden');
            if (textMapContainer) textMapContainer.classList.add('hidden');
        } catch (err) {
            console.error("Errore caricamento MappaOratotorio.svg:", err);
            if (mapViewWrapper) mapViewWrapper.classList.add('hidden');
            if (textMapContainer) textMapContainer.classList.remove('hidden');
        }
    }

    async function renderMapConfig(config) {
        if (!config) return;
        
        const enableMap = config.enableMap !== false;
        const enableTasks = config.enableTasks !== false;
        const mapType = config.mapType || (config.mapMode === 'text' ? 'vector' : 'photo');

        renderTasks(config.tasks, enableTasks);

        if (!enableMap) {
            if (mapViewWrapper) mapViewWrapper.classList.add('hidden');
            if (textMapContainer) textMapContainer.classList.add('hidden');
            return;
        }

        if (mapType === 'vector') {
            await loadSVGMap();
        } else {
            // Check if user uploaded a custom map image in Firebase
            try {
                const imgSnapshot = await get(ref(db, `images/${roomCode}`));
                const svgContainer = document.getElementById('svg-map-container');

                // Default to vector SVG map of Oratorio
                // Only use custom uploaded photo if it exists and is a custom uploaded image
                if (imgSnapshot.exists() && imgSnapshot.val() && !imgSnapshot.val().includes('mappa.jpg') && imgSnapshot.val().length > 100000) {
                    const imgSrc = imgSnapshot.val();
                    if (svgContainer) {
                        svgContainer.innerHTML = `<img id="map-image" src="${imgSrc}" alt="Mappa Stanza" class="map-img">`;
                    }
                    if (mapViewWrapper) mapViewWrapper.classList.remove('hidden');
                    if (textMapContainer) textMapContainer.classList.add('hidden');
                } else {
                    await loadSVGMap();
                }
            } catch (err) {
                console.warn("Mappa personalizzata non caricata, uso SVG di fallback:", err);
                await loadSVGMap();
            }
        }
    }

    function clearTimerFlashing() {
        if (globalTimer) {
            globalTimer.classList.remove('timer-flash-red');
            const headerCard = globalTimer.closest('.center-header-card');
            if (headerCard) headerCard.classList.remove('card-flash-red');
        }
    }

    let isAutoTriggeringEmergencySchermo = false;
    async function triggerEmergencyFromSchermo() {
        if (!roomRef || currentGameState !== 'playing' || isAutoTriggeringEmergencySchermo) return;
        isAutoTriggeringEmergencySchermo = true;
        try {
            await update(roomRef, {
                'state/game_status': 'emergency',
                'state/timer_paused': true,
                'state/timer_remaining': 0
            });
        } catch (e) {
            console.error("Errore scatto emergenza da schermo:", e);
        } finally {
            setTimeout(() => { isAutoTriggeringEmergencySchermo = false; }, 3000);
        }
    }

    function updateTimerUI(endTime, isPaused, remaining) {
        clearInterval(timerInterval);
        
        if (isPaused) {
            clearTimerFlashing();
            if (globalTimer) {
                if (remaining <= 0) {
                    globalTimer.textContent = "00:00";
                    globalTimer.style.color = "#ff4b4b";
                } else {
                    globalTimer.textContent = "⏸️ PAUSA (" + formatTime(remaining) + ")";
                    globalTimer.style.color = "#ff9800";
                }
            }
            return;
        }

        currentTimerEndTime = endTime;
        const headerCard = globalTimer ? globalTimer.closest('.center-header-card') : null;

        const updateTick = () => {
            const now = Date.now();
            const rem = currentTimerEndTime - now;
            
            if (rem <= 0) {
                clearTimerFlashing();
                if (globalTimer) {
                    globalTimer.textContent = "00:00";
                    globalTimer.style.color = "#ff4b4b";
                }
                clearInterval(timerInterval);
                if (currentTimerEndTime > 0 && currentGameState === 'playing') {
                    triggerEmergencyFromSchermo();
                }
            } else {
                if (globalTimer) globalTimer.textContent = formatTime(rem);

                // Lampeggia di rosso quando mancano 30 secondi o meno
                if (rem <= 30000) {
                    if (globalTimer) globalTimer.classList.add('timer-flash-red');
                    if (headerCard) headerCard.classList.add('card-flash-red');
                } else {
                    clearTimerFlashing();
                    if (globalTimer) globalTimer.style.color = "white";
                }
            }
        };

        updateTick();
        timerInterval = setInterval(updateTick, 500);
    }

    // Initialize players list & limit
    function renderPlayers(playersData, votesData, maxPlayers) {
        if (!playersListContainer) return;
        playersListContainer.innerHTML = '';
        
        let playerCount = 0;
        const targetData = playersData || latestPlayersData;
        const targetVotes = votesData || latestVotesData;

        if (targetData) {
            for (const key in targetData) {
                const pData = targetData[key];
                if (!pData) continue;
                playerCount++;

                const displayName = (typeof pData === 'object' && pData.name) ? pData.name : key;
                const pStatus = (typeof pData === 'object' && pData.status) ? pData.status : 'alive';
                const isRevealedDead = pStatus === 'killed_revealed' || 
                                       pStatus === 'dead' || 
                                       pStatus === 'ghost' || 
                                       ((currentGameState === 'discussion' || currentGameState === 'voting') && pStatus === 'killed_hidden');

                const hasVoted = targetVotes && (targetVotes[key] !== undefined || targetVotes[displayName] !== undefined);
                
                const div = document.createElement('div');
                div.className = `player-card ${isRevealedDead ? 'dead' : ''}`;
                
                let statusHtml = '';
                if (isRevealedDead) {
                    statusHtml = '<span class="player-status dead-badge" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4); padding: 2px 8px; border-radius: 10px; font-weight: 700; font-size: 0.75rem;">❌ DEFUNTO</span>';
                } else if (currentGameState === 'voting' || previousStatus === 'voting') {
                    statusHtml = hasVoted 
                        ? '<span class="player-status voted-badge">VOTATO</span>' 
                        : '<span class="player-status waiting-badge">IN ATTESA</span>';
                }

                div.innerHTML = `
                    <div class="player-avatar">👨‍🚀</div>
                    <span class="player-name">${escapeHtml(displayName)}</span>
                    ${statusHtml}
                `;
                playersListContainer.appendChild(div);
            }
        }

        if (playerCount === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.style.cssText = 'color: #94a3b8; text-align: center; padding: 2rem 1rem; font-family: var(--font-ui), sans-serif; font-size: 0.95rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;';
            emptyDiv.textContent = 'In attesa di giocatori...';
            playersListContainer.appendChild(emptyDiv);
        }
        
        const countDisplay = document.getElementById('waiting-players-count');
        if (countDisplay) {
            if (maxPlayers && maxPlayers !== 'unlimited' && !isNaN(parseInt(maxPlayers))) {
                countDisplay.textContent = `(${playerCount}/${maxPlayers})`;
            } else {
                countDisplay.textContent = `(${playerCount})`;
            }
        }

        const playersScroll = document.getElementById('players-scroll-container');
        if (playersScroll) setupAutoScroll(playersScroll);
    }

    function showDeadRevealOverlay(playersData, votesData, maxPlayers) {
        const overlayDeadReveal = document.getElementById('overlay-dead-reveal');
        const deadCardsContainer = document.getElementById('dead-reveal-cards-container');
        const meetingAudio = document.getElementById('meeting-audio');

        if (!overlayDeadReveal || !deadCardsContainer) return;
        
        const deadHiddenPlayers = [];
        if (playersData) {
            for (const pName in playersData) {
                if (playersData[pName].status === 'killed_hidden') {
                    deadHiddenPlayers.push(pName);
                }
            }
        }

        deadCardsContainer.innerHTML = '';

        if (meetingAudio) {
            meetingAudio.currentTime = 0;
            meetingAudio.volume = 1.0;
            meetingAudio.play().catch(e => console.log("Meeting audio autoplay blocked", e));
        }

        if (deadHiddenPlayers.length > 0) {
            deadHiddenPlayers.forEach(pName => {
                const card = document.createElement('div');
                card.className = 'dead-reveal-card';
                card.innerHTML = `
                    <div class="dead-slash-line"></div>
                    <div class="dead-reveal-avatar">👨‍🚀</div>
                    <div class="dead-reveal-info">
                        <span class="dead-reveal-name">${escapeHtml(pName)}</span>
                    </div>
                `;
                deadCardsContainer.appendChild(card);
            });

            overlayDeadReveal.classList.remove('hidden');
            isDeadRevealActive = true;

            // Trigger strike-through animation & stamp drop
            setTimeout(() => {
                const cards = deadCardsContainer.querySelectorAll('.dead-reveal-card');
                cards.forEach(c => c.classList.add('slashed'));
            }, 350);

            // Update local & Firebase status from killed_hidden to killed_revealed
            const dbUpdates = {};
            deadHiddenPlayers.forEach(name => {
                dbUpdates[`rooms/${roomCode}/players/${name}/status`] = 'killed_revealed';
                if (playersData && playersData[name]) {
                    playersData[name].status = 'killed_revealed';
                }
            });
            update(ref(db), dbUpdates).catch(err => console.error("Firebase update status error:", err));

            // Hide overlay after 4.5s and refresh discussion overlay
            setTimeout(() => {
                overlayDeadReveal.classList.add('hidden');
                isDeadRevealActive = false;
                if (currentGameState === 'discussion') {
                    showDiscussionOverlay(latestPlayersData || playersData);
                }
                renderPlayers(latestPlayersData || playersData, latestVotesData || votesData, latestMaxPlayers || maxPlayers);
            }, 4500);
        } else {
            const noDeadDiv = document.createElement('div');
            noDeadDiv.className = 'no-dead-card';
            noDeadDiv.innerHTML = `<span>💚 Nessun giocatore è stato ucciso in questo round!</span>`;
            deadCardsContainer.appendChild(noDeadDiv);

            overlayDeadReveal.classList.remove('hidden');
            isDeadRevealActive = true;
            setTimeout(() => {
                overlayDeadReveal.classList.add('hidden');
                isDeadRevealActive = false;
                if (currentGameState === 'discussion') {
                    showDiscussionOverlay(latestPlayersData || playersData);
                }
                renderPlayers(latestPlayersData || playersData, latestVotesData || votesData, latestMaxPlayers || maxPlayers);
            }, 2500);
        }
    }

    function triggerEjectedTypewriter(element, fullText, speed = 70) {
        if (!element) return;
        if (element._typewriterTimer) clearInterval(element._typewriterTimer);
        element.textContent = '';
        let i = 0;
        element._typewriterTimer = setInterval(() => {
            if (i < fullText.length) {
                element.textContent += fullText.charAt(i);
                i++;
            } else {
                clearInterval(element._typewriterTimer);
            }
        }, speed);
    }

    function showVotingResultsOverlay(playersData, votesData, ejectedPlayer) {
        const overlay = document.getElementById('overlay-voting-results');
        const container = document.getElementById('voting-results-cards-container');
        if (!overlay || !container) return;

        container.innerHTML = '';
        
        const votesByTarget = {};
        if (playersData) {
            for (const pName in playersData) {
                votesByTarget[pName] = [];
            }
        }
        votesByTarget['SKIP'] = [];

        if (votesData) {
            for (const voterName in votesData) {
                const target = votesData[voterName];
                if (target) {
                    if (!votesByTarget[target]) votesByTarget[target] = [];
                    votesByTarget[target].push(voterName);
                }
            }
        }

        const targetsArray = [];
        for (const targetName in votesByTarget) {
            if (targetName !== 'SKIP') {
                const pData = playersData ? playersData[targetName] : null;
                // Exclude players who were dead before the vote and received no votes (unless they are the ejected player)
                const isDeadBeforeVote = pData && 
                    (pData.status === 'killed_revealed' || pData.status === 'dead' || pData.status === 'ghost') && 
                    targetName !== ejectedPlayer;

                if (isDeadBeforeVote && votesByTarget[targetName].length === 0) {
                    continue;
                }

                targetsArray.push({
                    name: targetName,
                    key: targetName,
                    isSkip: false,
                    pData: pData,
                    voters: votesByTarget[targetName],
                    count: votesByTarget[targetName].length
                });
            }
        }

        // Always add SKIP card in the grid with exact same card styling
        targetsArray.push({
            name: 'SALTA VOTO (SKIP)',
            key: 'SKIP',
            isSkip: true,
            voters: votesByTarget['SKIP'] || [],
            count: (votesByTarget['SKIP'] || []).length
        });

        // Ordina: più voti prima, l'espulso prima a parità di voti, skip, infine alfabetico
        targetsArray.sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count;
            if (a.key === ejectedPlayer) return -1;
            if (b.key === ejectedPlayer) return 1;
            return a.name.localeCompare(b.name);
        });

        targetsArray.forEach(item => {
            const card = document.createElement('div');
            const isEjected = item.key === ejectedPlayer && item.key !== 'SKIP';
            
            card.className = `voting-results-card ${isEjected ? 'ejected-highlight' : ''} ${item.isSkip ? 'skip-card' : ''}`;

            let avatarIcon = item.isSkip ? '⏭️' : (item.pData && item.pData.status === 'killed_revealed' ? '💀' : '👨‍🚀');
            let countText = item.count === 1 ? '1 Voto' : `${item.count} Voti`;
            let badgeHtml = item.count > 0 
                ? `<span class="vote-count-badge active">${countText}</span>` 
                : `<span class="vote-count-badge zero">0 Voti</span>`;

            let votersHtml = '';
            if (item.voters && item.voters.length > 0) {
                votersHtml = `
                    <div class="voters-list-container">
                        <span class="voters-label">Votato da:</span>
                        <div class="voters-pills">
                            ${item.voters.map(v => `<span class="voter-pill">👨‍🚀 ${escapeHtml(v)}</span>`).join('')}
                        </div>
                    </div>
                `;
            } else {
                votersHtml = `<div class="no-voters-label">Nessun voto ricevuto</div>`;
            }

            card.innerHTML = `
                <div class="voting-card-top">
                    <div class="voting-card-user">
                        <span class="voting-card-avatar">${avatarIcon}</span>
                        <span class="voting-card-name">${escapeHtml(item.name)}</span>
                    </div>
                    <div class="voting-card-badges">
                        ${badgeHtml}
                    </div>
                </div>
                <div class="voting-card-bottom">
                    ${votersHtml}
                </div>
            `;

            container.appendChild(card);
        });

        overlay.classList.remove('hidden');
    }

    function hideVotingResultsOverlay() {
        const overlay = document.getElementById('overlay-voting-results');
        if (overlay) overlay.classList.add('hidden');
    }

    function showDiscussionOverlay(playersData, votesData, customTitle, customSub) {
        const overlay = document.getElementById('overlay-discussion');
        const container = document.getElementById('discussion-cards-container');
        if (!overlay || !container) return;

        const headerEl = overlay.querySelector('.discussion-header');
        const subheaderEl = overlay.querySelector('.discussion-subheader');

        if (headerEl && customTitle) {
            headerEl.textContent = customTitle;
            if (customTitle.startsWith("VOTAZIONE")) {
                headerEl.style.color = "var(--accent-red)";
                headerEl.style.textShadow = "0 0 25px rgba(239, 68, 68, 0.6), 0 0 50px rgba(239, 68, 68, 0.3)";
            } else {
                headerEl.style.color = "#ffea00";
                headerEl.style.textShadow = "0 0 25px rgba(255, 234, 0, 0.6), 0 0 50px rgba(255, 234, 0, 0.3)";
            }
        } else if (headerEl) {
            headerEl.textContent = "DISCUSSIONE IN CORSO";
            headerEl.style.color = "#ffea00";
            headerEl.style.textShadow = "0 0 25px rgba(255, 234, 0, 0.6), 0 0 50px rgba(255, 234, 0, 0.3)";
        }

        if (subheaderEl && customSub) {
            subheaderEl.textContent = customSub;
        } else if (subheaderEl) {
            subheaderEl.textContent = "CONFRONTATI CON GLI ALTRI GIOCATORI PRIMA CHE INIZINO LE VOTAZIONI";
        }

        container.innerHTML = '';
        
        const targetData = playersData || latestPlayersData;
        const targetVotes = votesData || latestVotesData;
        const playerList = [];
        
        if (targetData) {
            if (Array.isArray(targetData)) {
                targetData.forEach((p, idx) => {
                    if (p) {
                        const displayName = (typeof p === 'object' && p.name) ? p.name : (p.id || `Giocatore ${idx + 1}`);
                        playerList.push({ name: displayName, data: p });
                    }
                });
            } else if (typeof targetData === 'object') {
                for (const key in targetData) {
                    const p = targetData[key];
                    if (p) {
                        const displayName = (typeof p === 'object' && p.name) ? p.name : key;
                        playerList.push({ name: displayName, data: p });
                    }
                }
            }
        }

        // Sort: Alive players first, then Dead players, then alphabetically
        playerList.sort((a, b) => {
            const aDead = a.data && (
                a.data.status === 'dead' || 
                a.data.status === 'ghost' || 
                a.data.status === 'killed_revealed' || 
                a.data.status === 'killed_hidden'
            );
            const bDead = b.data && (
                b.data.status === 'dead' || 
                b.data.status === 'ghost' || 
                b.data.status === 'killed_revealed' || 
                b.data.status === 'killed_hidden'
            );
            if (aDead !== bDead) return aDead ? 1 : -1;
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });

        playerList.forEach(item => {
            const card = document.createElement('div');
            const pStatus = item.data && typeof item.data === 'object' ? item.data.status : 'alive';
            const isDead = pStatus === 'dead' || pStatus === 'ghost' || pStatus === 'killed_revealed' || pStatus === 'killed_hidden';
            
            card.className = `chat-card ${isDead ? 'dead-card' : 'alive-card'}`;

            const avatarIcon = isDead ? '💀' : '👨‍🚀';

            let statusBadge = '';
            let statusDetail = '';

            if (isDead) {
                statusBadge = `<span class="chat-badge dead-badge">💀 MORTO</span>`;
                statusDetail = 'Non può parlare né votare';
            } else if (targetVotes && Object.keys(targetVotes).length > 0) {
                const hasVoted = targetVotes[item.name] !== undefined || (item.data && targetVotes[item.data.id] !== undefined);
                if (hasVoted) {
                    statusBadge = `<span class="chat-badge voted-badge">✓ VOTATO</span>`;
                    statusDetail = 'Ha espresso il suo voto';
                } else {
                    statusBadge = `<span class="chat-badge waiting-badge">⏳ IN ATTESA</span>`;
                    statusDetail = 'Sta decidendo chi votare';
                }
            } else {
                statusBadge = `<span class="chat-badge alive-badge">💚 VIVO</span>`;
                statusDetail = 'Può parlare e votare';
            }

            card.innerHTML = `
                <div class="chat-card-top">
                    <div class="chat-card-user">
                        <span class="chat-card-avatar">${avatarIcon}</span>
                        <span class="chat-card-name">${escapeHtml(item.name)}</span>
                    </div>
                    ${statusBadge}
                </div>
                <div class="chat-card-bottom">
                    <span class="chat-card-detail">${statusDetail}</span>
                </div>
            `;

            container.appendChild(card);
        });

        overlay.classList.remove('hidden');
    }

    function hideDiscussionOverlay() {
        const overlay = document.getElementById('overlay-discussion');
        if (overlay) overlay.classList.add('hidden');
    }

    // Victory Screen Overlay
    function showVictoryOverlay(status, playersData) {

        const isCrewmates = (status === 'crewmates_win');
        
        if (isCrewmates) {
            victoryOverlay.style.background = 'radial-gradient(circle, rgba(0,242,254,0.2) 0%, rgba(5,8,20,1) 70%)';
            title.textContent = 'VITTORIA CREWMATES';
            title.style.color = '#00f2fe';
            title.style.textShadow = '0 0 30px rgba(0, 242, 254, 0.6)';
            subtitle.textContent = 'I CREWMATES HANNO COMPLETATO TUTTE LE TASK';
        } else {
            victoryOverlay.style.background = 'radial-gradient(circle, rgba(255,68,68,0.25) 0%, rgba(15,5,5,1) 70%)';
            title.textContent = 'VITTORIA IMPOSTORI';
            title.style.color = '#ff4444';
            title.style.textShadow = '0 0 30px rgba(255, 68, 68, 0.6)';
            subtitle.textContent = 'GLI IMPOSTORI HANNO CONQUISTATO LA NAVE';
        }

        teamCardsContainer.innerHTML = '';
        if (playersData) {
            for (const pName in playersData) {
                const p = playersData[pName];
                const role = (p.role || '').toLowerCase();
                const isWinner = isCrewmates 
                    ? (role === 'crewmate' || role === 'innocente' || role === 'medico' || role === 'investigatore') 
                    : (role === 'impostore' || role === 'impostor' || role === 'assassino');

                if (isWinner) {
                    const card = document.createElement('div');
                    card.className = 'victory-member-card';
                    card.style.background = isCrewmates 
                        ? 'linear-gradient(145deg, rgba(0, 242, 254, 0.15), rgba(10, 15, 30, 0.95))' 
                        : 'linear-gradient(145deg, rgba(255, 68, 68, 0.2), rgba(30, 10, 10, 0.95))';
                    card.style.border = isCrewmates ? '2px solid #00f2fe' : '2px solid #ff4444';
                    card.style.borderRadius = '16px';
                    card.style.padding = '1.2rem 1.8rem';
                    card.style.minWidth = '180px';
                    card.style.display = 'flex';
                    card.style.flexDirection = 'column';
                    card.style.alignItems = 'center';
                    card.style.gap = '0.6rem';
                    card.style.boxShadow = isCrewmates 
                        ? '0 10px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 242, 254, 0.3)' 
                        : '0 10px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 68, 68, 0.4)';

                    const icon = isCrewmates ? '👨‍🚀' : '👺';
                    const roleBadge = isCrewmates ? 'CREWMATE' : 'IMPOSTORE';

                    card.innerHTML = `
                        <div style="font-size: 3rem; filter: drop-shadow(0 0 10px ${isCrewmates ? 'rgba(0,242,254,0.5)' : 'rgba(255,68,68,0.6)'})">
                            ${icon}
                        </div>
                        <div style="font-family: var(--font-ui), sans-serif; font-weight: 800; font-size: 1.2rem; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">
                            ${escapeHtml(pName)}
                        </div>
                        <div style="font-family: var(--font-ui), sans-serif; font-size: 0.75rem; font-weight: 800; padding: 0.25rem 0.7rem; border-radius: 12px; letter-spacing: 1.5px; ${isCrewmates ? 'background: rgba(0,242,254,0.2); color: #00f2fe; border: 1px solid #00f2fe;' : 'background: rgba(255,68,68,0.25); color: #ff6666; border: 1px solid #ff4444;'}">
                            ${roleBadge}
                        </div>
                    `;
                    teamCardsContainer.appendChild(card);
                }
            }
        }

        victoryOverlay.style.display = 'flex';
        victoryOverlay.classList.remove('hidden');
    }

    function hideVictoryOverlay() {
        const victoryOverlay = document.getElementById('overlay-victory');
        if (victoryOverlay) {
            victoryOverlay.style.display = 'none';
            victoryOverlay.classList.add('hidden');
        }
    }

    // Init QR Code with simplified error correction level
    let qrInitialized = false;

    // Initial render
    renderPlayers(null, null, null);

    ensureAuth().then(() => {
        roomRef = ref(db, `rooms/${roomCode}`);
        onValue(roomRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // 7-day expiration check
            if (data.createdAt && (Date.now() - data.createdAt > 7 * 24 * 60 * 60 * 1000)) {
                alert("La stanza visualizzata è scaduta (durata massima: 7 giorni).");
                window.location.href = "/";
                return;
            }

            if (!qrInitialized && typeof QRCode !== 'undefined') {
                qrInitialized = true;
                try {
                    const qrContainer = document.getElementById("qrcode");
                    if (qrContainer) {
                        qrContainer.innerHTML = '';
                        const joinUrl = `${window.location.origin}/?room=${roomCode}`;
                        new QRCode(qrContainer, {
                            text: joinUrl,
                            width: 150,
                            height: 150,
                            colorDark: "#000000",
                            colorLight: "#ffffff",
                            correctLevel: QRCode.CorrectLevel.L // Simplified low matrix density
                        });
                    }
                } catch (e) {
                    console.warn("Errore generazione QR code in onValue:", e);
                }
            }
            const players = normalizePlayers(data.players);
            const votes = data.votes || {};
            const maxPlayers = data.config ? data.config.maxPlayers : null;

            latestPlayersData = players;
            latestVotesData = votes;
            latestMaxPlayers = maxPlayers;

            // Real-time taskbar & players update on any room change
            updateTaskBar(players);
            renderPlayers(players, votes, maxPlayers);

            if (data.config) {
                renderMapConfig(data.config);
            }

            if (data.state) {
                const status = data.state.game_status || 'waiting';
                currentGameState = status;

                const qrCodeBox = document.getElementById('qr-code-container');
                const roomCodeDisplay = document.getElementById('room-code-display');
                const leftTasksBox = document.getElementById('left-tasks-container');
                const taskbar = document.getElementById('taskbar-container');
                const globalTimer = document.getElementById('global-timer');

                // Toggle visibility based on game state (waiting vs active game)
                const isWaiting = (status === 'waiting');

                if (roomCodeDisplay) {
                    if (isWaiting) roomCodeDisplay.classList.remove('hidden');
                    else roomCodeDisplay.classList.add('hidden');
                }
                if (qrCodeBox) {
                    if (isWaiting) qrCodeBox.classList.remove('hidden');
                    else qrCodeBox.classList.add('hidden');
                }
                if (leftTasksBox) {
                    if (isWaiting) leftTasksBox.classList.remove('hidden');
                    else leftTasksBox.classList.add('hidden');
                }
                if (taskbar) {
                    if (isWaiting) taskbar.classList.add('hidden');
                    else taskbar.classList.remove('hidden');
                }
                if (globalTimer) {
                    if (isWaiting) globalTimer.classList.add('hidden');
                    else globalTimer.classList.remove('hidden');
                }

                const overlayDeadReveal = document.getElementById('overlay-dead-reveal');
                if (status !== 'discussion' && overlayDeadReveal) {
                    overlayDeadReveal.classList.add('hidden');
                    isDeadRevealActive = false;
                }

                if (status !== 'emergency' && overlayMeeting) {
                    overlayMeeting.classList.remove('emergency-active');
                }

                if (status === 'waiting') {
                    hideVotingResultsOverlay();
                    hideDiscussionOverlay();
                    if(overlayMeeting) overlayMeeting.classList.add('hidden');
                    if(overlayEjected) overlayEjected.classList.add('hidden');
                    
                    const mainDashboard = document.getElementById('main-dashboard-layout');
                    if (mainDashboard) mainDashboard.classList.remove('hidden');
                    
                    clearInterval(timerInterval);
                    renderPlayers(players, votes, maxPlayers);
                } 
                else if (status === 'playing') {
                    hideVotingResultsOverlay();
                    hideDiscussionOverlay();
                    if(overlayMeeting) overlayMeeting.classList.add('hidden');
                    
                    const mainDashboard = document.getElementById('main-dashboard-layout');
                    if (mainDashboard) mainDashboard.classList.remove('hidden');
                    
                    if (previousStatus === 'waiting') {
                        const roleOverlay = document.getElementById('role-assignment-overlay');
                        if (roleOverlay) {
                            roleOverlay.classList.remove('hidden');
                            setTimeout(() => {
                                roleOverlay.classList.add('hidden');
                            }, 5000);
                        }
                    }
                    
                    const isComingFromMeeting = previousStatus === 'voting_results' || previousStatus === 'voting' || previousStatus === 'discussion';
                    const lastEjected = data.state ? data.state.last_ejected : null;
                    const hasEjectedPlayer = lastEjected && lastEjected !== 'SKIP';

                    if (isComingFromMeeting && hasEjectedPlayer) {
                        if (overlayEjected) {
                            overlayEjected.classList.remove('hidden');
                            const ejectedMsg = `${lastEjected} è stato espulso...`;

                            triggerEjectedTypewriter(ejectedText, ejectedMsg, 70);
                            setTimeout(() => {
                                overlayEjected.classList.add('hidden');
                            }, 5000);
                        }
                    } else {
                        if (overlayEjected) overlayEjected.classList.add('hidden');
                    }

                    renderPlayers(players, votes, maxPlayers);
                    updateTimerUI(data.state.timer, data.state.timer_paused, data.state.timer_remaining);
                }
                else if (status === 'emergency') {
                    hideVotingResultsOverlay();
                    hideDiscussionOverlay();
                    clearTimerFlashing();
                    if(overlayMeeting) {
                        overlayMeeting.classList.remove('hidden');
                    }
                    if(overlayText) {
                        overlayText.textContent = "EMERGENZA!";
                        overlayText.className = "emergency-text-anim";
                        overlayText.style.animation = "";
                        overlayText.style.textShadow = "";
                        overlayText.style.filter = "";
                    }
                    clearInterval(timerInterval);
                    if (globalTimer) globalTimer.textContent = "EMERGENZA";
                    
                    if (previousStatus !== 'emergency' && sirenAudio) {
                        sirenAudio.volume = 1.0;
                        sirenAudio.play().catch(e => console.log("Siren autoplay blocked", e));
                    }
                }
                else if (status === 'discussion') {
                    hideVotingResultsOverlay();
                    clearTimerFlashing();
                    if(overlayMeeting) overlayMeeting.classList.add('hidden'); 
                    if (globalTimer) {
                        globalTimer.textContent = "DISCUSSIONE";
                        globalTimer.style.color = "#ffeb3b";
                    }
                    clearInterval(timerInterval);

                    if (previousStatus !== 'discussion' && !isDeadRevealActive) {
                        showDeadRevealOverlay(players, votes, maxPlayers);
                    } else if (!isDeadRevealActive) {
                        showDiscussionOverlay(players);
                        renderPlayers(players, votes, maxPlayers);
                    }
                    // Stop siren if it was playing during emergency
                    if (sirenAudio) {
                        sirenAudio.pause();
                        sirenAudio.currentTime = 0;
                    }
                }
                else if (status === 'voting') {
                    hideVotingResultsOverlay();
                    hideDiscussionOverlay();
                    if(overlayMeeting) overlayMeeting.classList.add('hidden');
                    const headerCard = globalTimer ? globalTimer.closest('.center-header-card') : null;
                    clearInterval(timerInterval);
                    
                    if (!data.state.voting_endtime || data.state.voting_endtime === 0) {
                        if (globalTimer) {
                            clearTimerFlashing();
                            globalTimer.textContent = `VOTAZIONE LIBERA`;
                            globalTimer.style.color = "var(--accent-red)";
                        }
                    } else {
                        timerInterval = setInterval(() => {
                            const remaining = Math.max(0, data.state.voting_endtime - Date.now());
                            const sec = Math.ceil(remaining / 1000);
                            if (globalTimer) {
                                globalTimer.textContent = `VOTAZIONE: ${sec}s`;
                                
                                // Lampeggia di rosso negli ultimi 15 secondi di votazione
                                if (remaining <= 15000 && remaining > 0) {
                                    globalTimer.classList.add('timer-flash-red');
                                    if (headerCard) headerCard.classList.add('card-flash-red');
                                } else {
                                    clearTimerFlashing();
                                    globalTimer.style.color = "var(--accent-red)";
                                }
                            }
                            if(remaining <= 0) {
                                clearTimerFlashing();
                                clearInterval(timerInterval);
                            }
                        }, 100);
                    }
                    renderPlayers(players, votes, maxPlayers);
                }
                else if (status === 'voting_results') {
                    clearTimerFlashing();
                    hideDiscussionOverlay();
                    if(overlayMeeting) overlayMeeting.classList.add('hidden');
                    if(overlayEjected) overlayEjected.classList.add('hidden');
                    if (globalTimer) {
                        globalTimer.textContent = "ESITO VOTI";
                        globalTimer.style.color = "#c084fc";
                    }
                    clearInterval(timerInterval);
                    showVotingResultsOverlay(players, data.state.last_votes || votes, data.state.last_ejected);
                }
                else if (status === 'impostors_win' || status === 'crewmates_win') {
                    hideVotingResultsOverlay();
                    hideDiscussionOverlay();
                    if(overlayMeeting) overlayMeeting.classList.add('hidden');
                    if(overlayEjected) overlayEjected.classList.add('hidden');
                    clearTimerFlashing();
                    clearInterval(timerInterval);
                    if (globalTimer) globalTimer.textContent = "GAME OVER";
                    showVictoryOverlay(status, players);
                }

                previousStatus = status;
            }
        }
    }, (error) => {
        console.error("Errore sincronizzazione maxischermo Firebase:", error);
    });
    }).catch(err => console.error("Errore autenticazione maxischermo:", err));
}
