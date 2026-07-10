import { db } from './firebase-config.js';
import { doc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { PLAYERS_LIST } from './game-logic.js';

const vitalsContainer = document.getElementById('vitals-container');
const btnEmergency = document.getElementById('btn-emergency');
const gameStatusText = document.getElementById('game-status-text');

const gameRef = doc(db, 'game', 'state');
let currentState = null;
let hasUsedMeetingThisRound = false;

// We need to store locally if we used it this round to disable the button.
// An alternative is storing `scientist_meeting_used` in the DB for the round.
// For simplicity, we track it locally based on the round number.
let currentRoundTracker = 0;

onSnapshot(gameRef, (docSnap) => {
    if (docSnap.exists()) {
        currentState = docSnap.data();
        updateUI(currentState);
    }
});

function updateUI(state) {
    gameStatusText.textContent = `Stato: ${state.game_status.toUpperCase()} | Round: ${state.round || 1}`;

    // Handle Meeting logic
    if (state.round !== currentRoundTracker) {
        currentRoundTracker = state.round;
        hasUsedMeetingThisRound = false;
    }

    if (state.game_status === 'playing' && !hasUsedMeetingThisRound) {
        btnEmergency.disabled = false;
        btnEmergency.classList.add('available');
        btnEmergency.textContent = "CHIAMA RIUNIONE";
    } else {
        btnEmergency.disabled = true;
        btnEmergency.classList.remove('available');
        if (hasUsedMeetingThisRound) {
            btnEmergency.textContent = "USATA QUESTO ROUND";
        } else {
            btnEmergency.textContent = "NON DISPONIBILE ORA";
        }
    }

    renderVitals(state.players);
}

function renderVitals(players) {
    vitalsContainer.innerHTML = '';
    if(!players) return;

    PLAYERS_LIST.forEach(name => {
        const pData = players[name];
        if(!pData) return;

        const card = document.createElement('div');
        card.className = 'vital-card';
        
        let statusClass = 'vital-revealed';
        let statusText = 'SCONOSCIUTO';

        if (pData.status === 'alive') {
            statusClass = 'vital-alive';
            statusText = 'ALIVE';
        } else if (pData.status === 'killed_hidden') {
            statusClass = 'vital-killed';
            statusText = 'KILLED!';
        } else if (pData.status === 'killed_revealed') {
            statusClass = 'vital-revealed';
            statusText = 'DEAD';
        }

        card.classList.add(statusClass);
        
        card.innerHTML = `
            <div style="font-size: 1.2rem; font-family: var(--font-pixel); margin-bottom: 0.5rem;">${name}</div>
            <div style="font-size: 0.9rem;">${statusText}</div>
        `;
        
        vitalsContainer.appendChild(card);
    });
}

btnEmergency.addEventListener('click', async () => {
    if(hasUsedMeetingThisRound) return;
    
    if(confirm("Vuoi chiamare una riunione di emergenza? Puoi farlo solo 1 volta per round.")) {
        hasUsedMeetingThisRound = true;
        btnEmergency.disabled = true;
        btnEmergency.classList.remove('available');
        
        await updateDoc(gameRef, {
            game_status: 'meeting_called'
        });
    }
});
