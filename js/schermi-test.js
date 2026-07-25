/**
 * Lab Test & Presentazione Schermate - Realmong Us
 * Script di gestione per l'anteprima e la modifica isolata delle schermate overlay.
 */

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const toolbar = document.getElementById('lab-toolbar');
    const btnToggleToolbar = document.getElementById('btn-toggle-toolbar');
    const toast = document.getElementById('lab-toast');
    const navButtons = document.querySelectorAll('.lab-nav-buttons .lab-btn[data-target]');
    const replayButtons = document.querySelectorAll('.btn-replay');
    const btnReplayAll = document.getElementById('btn-replay-all');

    // 1. Toggle Toolbar
    btnToggleToolbar.addEventListener('click', () => {
        toolbar.classList.toggle('collapsed');
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            toolbar.classList.toggle('collapsed');
        }
    });

    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    }

    // 2. Navigation Smooth Scroll
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const targetId = btn.getAttribute('data-target');
            if (targetId === 'all') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                const targetCard = document.getElementById(targetId);
                if (targetCard) {
                    const offset = 80;
                    const bodyRect = document.body.getBoundingClientRect().top;
                    const elementRect = targetCard.getBoundingClientRect().top;
                    const elementPosition = elementRect - bodyRect;
                    const offsetPosition = elementPosition - offset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                    
                    replayCardAnimation(targetId);
                }
            }
        });
    });

    // 3. Mock Data Generators

    // A. Dead Reveal Mock
    const deadMockPresets = [
        [
            { name: 'Mario Rossi', icon: '👨‍🚀' },
            { name: 'Giuseppe B.', icon: '👨‍🚀' }
        ],
        [
            { name: 'Elena V.', icon: '👩‍🚀' },
            { name: 'Luca S.', icon: '👨‍🚀' },
            { name: 'Sofia M.', icon: '👩‍🚀' }
        ],
        [] // Nessun morto
    ];
    let currentDeadPreset = 0;

    function renderDeadRevealMock() {
        const container = document.getElementById('mock-dead-reveal-grid');
        if (!container) return;
        container.innerHTML = '';

        const deadList = deadMockPresets[currentDeadPreset];
        if (deadList.length === 0) {
            const noDead = document.createElement('div');
            noDead.className = 'no-dead-card';
            noDead.style.color = '#00f2fe';
            noDead.style.fontSize = '1.4rem';
            noDead.style.padding = '2rem';
            noDead.innerHTML = '💚 Nessun giocatore è stato ucciso in questo round!';
            container.appendChild(noDead);
            return;
        }

        deadList.forEach(p => {
            const card = document.createElement('div');
            card.className = 'dead-reveal-card';
            card.innerHTML = `
                <div class="dead-slash-line"></div>
                <div class="dead-reveal-avatar">${p.icon}</div>
                <div class="dead-reveal-info">
                    <span class="dead-reveal-name">${p.name}</span>
                </div>
            `;
            container.appendChild(card);
        });

        // Trigger animation after delay
        setTimeout(() => {
            const cards = container.querySelectorAll('.dead-reveal-card');
            cards.forEach(c => c.classList.add('slashed'));
        }, 300);
    }

    const btnToggleDead = document.querySelector('.btn-toggle-dead');
    if (btnToggleDead) {
        btnToggleDead.addEventListener('click', () => {
            currentDeadPreset = (currentDeadPreset + 1) % deadMockPresets.length;
            renderDeadRevealMock();
            showToast(`Preset Vittime ${currentDeadPreset + 1}/${deadMockPresets.length}`);
        });
    }

    // B. Meeting Discussion Grid Mock (Show ONLY living players, no tags)
    function renderDiscussionMock() {
        const container = document.getElementById('mock-discussion-votes-grid');
        if (!container) return;
        container.innerHTML = '';

        const livingPlayers = [
            { name: 'Mario Rossi' },
            { name: 'Elena V.' },
            { name: 'Giuseppe B.' },
            { name: 'Sofia M.' },
            { name: 'Marco T.' }
        ];

        livingPlayers.forEach(p => {
            const pCard = document.createElement('div');
            pCard.className = 'discussion-player-card';
            pCard.style.background = 'linear-gradient(145deg, rgba(20, 28, 45, 0.9), rgba(10, 15, 25, 0.95))';
            pCard.style.border = '2px solid rgba(0, 242, 254, 0.4)';
            pCard.style.borderRadius = '14px';
            pCard.style.padding = '1.25rem 2rem';
            pCard.style.minWidth = '200px';
            pCard.style.display = 'flex';
            pCard.style.flexDirection = 'column';
            pCard.style.alignItems = 'center';
            pCard.style.gap = '0.75rem';
            pCard.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.6), 0 0 15px rgba(0, 242, 254, 0.15)';
            pCard.style.transition = 'all 0.3s ease';

            pCard.innerHTML = `
                <div style="font-size: 3rem; filter: drop-shadow(0 0 10px rgba(0,242,254,0.3))">
                    👨‍🚀
                </div>
                <div style="font-family: var(--font-ui), sans-serif; font-weight: 800; font-size: 1.2rem; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">
                    ${p.name}
                </div>
            `;
            container.appendChild(pCard);
        });
    }

    // C. Voting Results Mock (Exact original 1:1 logic from schermo.js)
    function renderVotingResultsMock() {
        const container = document.getElementById('mock-voting-results-grid');
        if (!container) return;
        container.innerHTML = '';

        const mockPlayersData = {
            'Giocatore 1': { status: 'alive' },
            'Giocatore 2': { status: 'alive' },
            'Giocatore 3': { status: 'alive' },
            'Giocatore 4': { status: 'alive' },
            'Giocatore 5': { status: 'alive' },
            'Giocatore 6': { status: 'alive' },
            'Giocatore 7': { status: 'alive' },
            'Giocatore 8': { status: 'alive' },
            'Giocatore 9': { status: 'alive' },
            'Giocatore 10': { status: 'alive' }
        };

        const mockVotesData = {};
        const ejectedPlayer = null;

        const votesByTarget = {};
        for (const pName in mockPlayersData) {
            votesByTarget[pName] = [];
        }
        votesByTarget['SKIP'] = [];

        for (const voterName in mockVotesData) {
            const target = mockVotesData[voterName];
            if (target) {
                if (!votesByTarget[target]) votesByTarget[target] = [];
                votesByTarget[target].push(voterName);
            }
        }

        const targetsArray = [];
        for (const targetName in votesByTarget) {
            if (targetName === 'SKIP') {
                if (votesByTarget['SKIP'].length > 0) {
                    targetsArray.push({
                        name: 'SALTA VOTO (SKIP)',
                        key: 'SKIP',
                        isSkip: true,
                        voters: votesByTarget['SKIP'],
                        count: votesByTarget['SKIP'].length
                    });
                }
            } else {
                const pData = mockPlayersData[targetName];
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
                            ${item.voters.map(v => `<span class="voter-pill">👨‍🚀 ${v}</span>`).join('')}
                        </div>
                    </div>
                `;
            } else {
                votersHtml = `<div class="no-voters-label">Nessun voto ricevuto</div>`;
            }

            let ejectedBadgeHtml = isEjected 
                ? `<span class="ejected-ribbon">🚨 ESPULSO</span>` 
                : '';

            card.innerHTML = `
                <div class="voting-card-top">
                    <div class="voting-card-user">
                        <span class="voting-card-avatar">${avatarIcon}</span>
                        <span class="voting-card-name">${item.name}</span>
                    </div>
                    <div class="voting-card-badges">
                        ${ejectedBadgeHtml}
                        ${badgeHtml}
                    </div>
                </div>
                <div class="voting-card-bottom">
                    ${votersHtml}
                </div>
            `;

            container.appendChild(card);
        });
    }

    // D. Victory Team Toggle Mock
    let currentVictoryTeam = 'crewmates';
    function toggleVictoryTeam() {
        const title = document.getElementById('victory-title');
        const subtitle = document.getElementById('victory-subtitle');
        const overlay = document.getElementById('mock-victory-overlay');
        if (!title || !subtitle || !overlay) return;

        if (currentVictoryTeam === 'crewmates') {
            currentVictoryTeam = 'impostors';
            title.textContent = 'VITTORIA IMPOSTORI';
            title.style.color = '#ff4444';
            title.style.textShadow = '0 0 30px rgba(255, 68, 68, 0.6)';
            subtitle.textContent = 'GLI IMPOSTORI HANNO CONQUISTATO LA NAVE';
            overlay.style.background = 'radial-gradient(circle, rgba(255,68,68,0.25) 0%, rgba(15,5,5,0.98) 70%)';
        } else {
            currentVictoryTeam = 'crewmates';
            title.textContent = 'VITTORIA CREWMATES';
            title.style.color = '#00f2fe';
            title.style.textShadow = '0 0 30px rgba(0, 242, 254, 0.6)';
            subtitle.textContent = 'I CREWMATES HANNO COMPLETATO TUTTE LE TASK';
            overlay.style.background = 'radial-gradient(circle, rgba(0,242,254,0.2) 0%, rgba(5,8,20,0.98) 70%)';
        }
    }

    const btnToggleVictory = document.querySelector('.btn-toggle-victory-team');
    if (btnToggleVictory) {
        btnToggleVictory.addEventListener('click', () => {
            toggleVictoryTeam();
            replayCardAnimation('screen-victory');
            showToast(`Vittoria: ${currentVictoryTeam.toUpperCase()}`);
        });
    }

    // 4. Animation Replay Logic
    function replayCardAnimation(cardId) {
        const card = document.getElementById(cardId);
        if (!card) return;

        card.classList.remove('active-in-view');
        void card.offsetWidth; // Force reflow
        card.classList.add('active-in-view');

        if (cardId === 'screen-dead') {
            renderDeadRevealMock();
        } else if (cardId === 'screen-voting') {
            renderVotingResultsMock();
        } else if (cardId === 'screen-discussion') {
            renderDiscussionMock();
        } else if (cardId === 'screen-role') {
            const text = card.querySelector('.role-animation-text');
            if (text) {
                text.style.animation = 'none';
                void text.offsetWidth;
                text.style.animation = '';
            }
        } else if (cardId === 'screen-meeting') {
            const text = card.querySelector('.alert-text');
            if (text) {
                text.style.animation = 'none';
                void text.offsetWidth;
                text.style.animation = '';
            }
        }
    }

    replayButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const cardId = btn.getAttribute('data-card');
            replayCardAnimation(cardId);
            showToast('Animazione Riavviata');
        });
    });

    if (btnReplayAll) {
        btnReplayAll.addEventListener('click', () => {
            document.querySelectorAll('.lab-screen-card').forEach(card => {
                replayCardAnimation(card.id);
            });
            showToast('Tutte le animazioni riavviate!');
        });
    }

    // 5. Intersection Observer for Scroll Animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active-in-view');
            }
        });
    }, { threshold: 0.3 });

    document.querySelectorAll('.lab-screen-card').forEach(card => {
        observer.observe(card);
    });

    // Initial render
    renderDeadRevealMock();
    renderDiscussionMock();
    renderVotingResultsMock();
});
