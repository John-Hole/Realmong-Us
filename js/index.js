import { db, auth } from './firebase-config.js';
import { ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

// DOM Elements
const authSection = document.getElementById('section-auth');
const joinSection = document.getElementById('section-join');
const createSection = document.getElementById('section-create');
const authStatus = document.getElementById('user-status-text');
const btnLogout = document.getElementById('btn-logout');

// Auth inputs
const emailInput = document.getElementById('auth-email');
const passwordInput = document.getElementById('auth-password');
const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');
const btnGuest = document.getElementById('btn-guest');

// Join inputs
const joinCode = document.getElementById('join-code');
const joinName = document.getElementById('join-name');
const btnJoinRoom = document.getElementById('btn-join-room');

// Create inputs
const templateSelect = document.getElementById('template-select');
const createImpostors = document.getElementById('create-impostors');
const createScientist = document.getElementById('create-scientist');
const createKillCooldown = document.getElementById('create-kill-cooldown');
const createMaxMeetings = document.getElementById('create-max-meetings');
const createMeetingDuration = document.getElementById('create-meeting-duration');
const createVideoIntro = document.getElementById('create-video-intro');
const createMaxPlayers = document.getElementById('create-max-players');
const createUnlimitedPlayers = document.getElementById('create-unlimited-players');
const mapRadios = document.getElementsByName('map-mode');
const mapPhotoConfig = document.getElementById('map-photo-config');
const mapTextConfig = document.getElementById('map-text-config');
const mapImageUpload = document.getElementById('map-image-upload');
const mapCanvas = document.getElementById('map-canvas');
const uploadStatus = document.getElementById('upload-status');
const textTasksContainer = document.getElementById('text-tasks-container');
const btnAddTextTask = document.getElementById('btn-add-text-task');
const saveTemplateGroup = document.getElementById('save-template-group');
const templateNameInput = document.getElementById('template-name');
const btnSaveTemplate = document.getElementById('btn-save-template');
const btnCreateRoom = document.getElementById('btn-create-room');

let currentUser = null;
let currentBase64Image = null;

// Handle Unlimited Checkbox
createUnlimitedPlayers.addEventListener('change', (e) => {
    createMaxPlayers.disabled = e.target.checked;
});

// Auto-fill join code from URL if present (from QR code)
const urlParams = new URLSearchParams(window.location.search);
const roomParam = urlParams.get('room');
if (roomParam) {
    joinCode.value = roomParam;
}

// --- AUTH LOGIC ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        authStatus.textContent = `Loggato come: ${user.email}`;
        btnLogout.classList.remove('hidden');
        showMainSections(true);
        loadUserTemplates(user.uid);
    } else {
        currentUser = null;
        authStatus.textContent = "Non loggato";
        btnLogout.classList.add('hidden');
        showAuthSection();
    }
});

function showAuthSection() {
    authSection.classList.remove('hidden');
    joinSection.classList.add('hidden');
    createSection.classList.add('hidden');
    saveTemplateGroup.classList.add('hidden');
}

function showMainSections(isLoggedIn) {
    authSection.classList.add('hidden');
    joinSection.classList.remove('hidden');
    createSection.classList.remove('hidden');
    if (isLoggedIn) {
        saveTemplateGroup.classList.remove('hidden');
    } else {
        saveTemplateGroup.classList.add('hidden');
        authStatus.textContent = "Ospite";
    }
}

btnLogin.addEventListener('click', async () => {
    try {
        await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    } catch (error) {
        alert("Errore login: " + error.message);
    }
});

btnRegister.addEventListener('click', async () => {
    try {
        await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    } catch (error) {
        alert("Errore registrazione: " + error.message);
    }
});

btnLogout.addEventListener('click', async () => {
    await signOut(auth);
});

btnGuest.addEventListener('click', () => {
    showMainSections(false);
});

// --- TEMPLATES LOGIC ---
async function loadUserTemplates(uid) {
    const dbRef = ref(db);
    try {
        const snapshot = await get(child(dbRef, `users/${uid}/templates`));
        if (snapshot.exists()) {
            const templates = snapshot.val();
            // Clear previous user templates (keep base and empty)
            Array.from(templateSelect.options).forEach(opt => {
                if (opt.value !== 'base' && opt.value !== 'empty') {
                    opt.remove();
                }
            });
            
            for (const key in templates) {
                const opt = document.createElement('option');
                opt.value = key;
                opt.textContent = templates[key].name || key;
                opt.dataset.templateData = JSON.stringify(templates[key]);
                templateSelect.appendChild(opt);
            }
        }
    } catch (error) {
        console.error("Error loading templates:", error);
    }
}

btnSaveTemplate.addEventListener('click', async () => {
    if (!currentUser) return;
    const name = templateNameInput.value.trim();
    if (!name) return alert("Inserisci un nome per il template");
    
    const templateData = getRoomConfigFromUI();
    templateData.name = name;
    
    const templateId = Date.now().toString();
    try {
        await set(ref(db, `users/${currentUser.uid}/templates/${templateId}`), templateData);
        alert("Template salvato con successo!");
        templateNameInput.value = '';
        loadUserTemplates(currentUser.uid);
    } catch (error) {
        alert("Errore salvataggio template: " + error.message);
    }
});

templateSelect.addEventListener('change', () => {
    const val = templateSelect.value;
    if (val === 'empty') {
        createImpostors.value = 1;
        createKillCooldown.value = 120;
        createMaxMeetings.value = 1;
        createMeetingDuration.value = 120;
        createScientist.checked = false;
        createVideoIntro.checked = true;
        mapRadios[0].checked = true; // Photo default
        textTasksContainer.innerHTML = '';
        currentBase64Image = null;
        uploadStatus.textContent = '';
        toggleMapMode();
    } else if (val === 'base') {
        createImpostors.value = 3;
        createKillCooldown.value = 120;
        createMaxMeetings.value = 1;
        createMeetingDuration.value = 120;
        createScientist.checked = true;
        createVideoIntro.checked = true;
        mapRadios[0].checked = true; // Photo default
        textTasksContainer.innerHTML = '';
        currentBase64Image = null;
        uploadStatus.textContent = '';
        toggleMapMode();
    } else {
        // Load user template
        const opt = templateSelect.options[templateSelect.selectedIndex];
        if (opt.dataset.templateData) {
            const data = JSON.parse(opt.dataset.templateData);
            createImpostors.value = data.impostorCount || 1;
            createKillCooldown.value = data.killCooldown || 120;
            createMaxMeetings.value = data.maxMeetings !== undefined ? data.maxMeetings : 1;
            createMeetingDuration.value = data.meetingDuration || 120;
            createVideoIntro.checked = data.videoIntro !== undefined ? data.videoIntro : true;
            createScientist.checked = !!data.scientistEnabled;
            
            if (data.mapMode === 'text') {
                mapRadios[1].checked = true;
                currentBase64Image = null;
                uploadStatus.textContent = '';
                textTasksContainer.innerHTML = '';
                if (data.tasks) {
                    data.tasks.forEach(task => addTextTask(task));
                }
            } else {
                mapRadios[0].checked = true;
                currentBase64Image = data.mapImage || null;
                uploadStatus.textContent = currentBase64Image ? "Immagine caricata dal template." : "";
            }
            toggleMapMode();
        }
    }
});

// --- IMAGE COMPRESSION LOGIC ---
mapImageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    uploadStatus.textContent = "Compressione in corso...";
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            mapCanvas.width = width;
            mapCanvas.height = height;
            const ctx = mapCanvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            currentBase64Image = mapCanvas.toDataURL('image/jpeg', 0.6); // Compress to 60% quality JPEG
            uploadStatus.textContent = "Immagine pronta e compressa!";
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// --- TEXT TASKS LOGIC ---
Array.from(mapRadios).forEach(r => r.addEventListener('change', toggleMapMode));

function toggleMapMode() {
    if (mapRadios[0].checked) {
        mapPhotoConfig.classList.remove('hidden');
        mapTextConfig.classList.add('hidden');
    } else {
        mapPhotoConfig.classList.add('hidden');
        mapTextConfig.classList.remove('hidden');
    }
}

function addTextTask(taskData = { num: '', name: '', obj: '', pos: '' }) {
    const div = document.createElement('div');
    div.className = 'task-row';
    div.innerHTML = `
        <input type="text" placeholder="N°" value="${taskData.num}" style="width: 15%;">
        <input type="text" placeholder="Nome Task" value="${taskData.name}" style="width: 35%;">
        <input type="text" placeholder="Obiettivo" value="${taskData.obj}" style="width: 30%;">
        <input type="text" placeholder="Posizione" value="${taskData.pos}" style="width: 20%;">
        <button class="btn btn-danger" style="padding: 0.5rem;">X</button>
    `;
    div.querySelector('.btn-danger').onclick = () => div.remove();
    textTasksContainer.appendChild(div);
}

btnAddTextTask.addEventListener('click', () => addTextTask());

// --- CREATE & JOIN ROOM ---
function getRoomConfigFromUI() {
    const mode = mapRadios[0].checked ? 'photo' : 'text';
    const tasks = [];
    if (mode === 'text') {
        const rows = textTasksContainer.querySelectorAll('.task-row');
        rows.forEach(row => {
            const inputs = row.querySelectorAll('input');
            tasks.push({
                num: inputs[0].value,
                name: inputs[1].value,
                obj: inputs[2].value,
                pos: inputs[3].value
            });
        });
    }
    
    let maxPlayers = createUnlimitedPlayers.checked ? 'unlimited' : parseInt(createMaxPlayers.value) || 15;

    return {
        impostorCount: parseInt(createImpostors.value) || 1,
        killCooldown: parseInt(createKillCooldown.value) || 120,
        maxMeetings: parseInt(createMaxMeetings.value) || 1,
        meetingDuration: parseInt(createMeetingDuration.value) || 120,
        videoIntro: createVideoIntro.checked,
        scientistEnabled: createScientist.checked,
        mapMode: mode,
        mapImage: mode === 'photo' ? currentBase64Image : null,
        tasks: mode === 'text' ? tasks : null,
        maxPlayers: maxPlayers
    };
}

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for(let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

btnCreateRoom.addEventListener('click', async () => {
    const config = getRoomConfigFromUI();
    if (config.mapMode === 'photo' && !config.mapImage && templateSelect.value !== 'base') {
        if (!confirm("Non hai caricato nessuna immagine mappa. Continuare comunque?")) return;
    }

    const imageToSave = config.mapImage;
    delete config.mapImage; // Separiamo l'immagine dal nodo principale

    const roomCode = generateRoomCode();
    
    // Initial state for the room
    const roomData = {
        config: config,
        state: {
            game_status: 'waiting',
            round: 1,
            timer: 0,
            timer_paused: false,
            timer_remaining: 0,
            last_ejected: null
        },
        players: {}
    };

    try {
        await set(ref(db, `rooms/${roomCode}`), roomData);
        if (imageToSave) {
            await set(ref(db, `images/${roomCode}`), imageToSave);
        }
        window.location.href = `master.html?room=${roomCode}`;
    } catch (error) {
        alert("Errore creazione stanza: " + error.message);
    }
});

btnJoinRoom.addEventListener('click', async () => {
    const code = joinCode.value.trim().toUpperCase();
    const name = joinName.value.trim();

    if (!code || !name) {
        return alert("Inserisci sia il codice stanza che il nome giocatore.");
    }

    const dbRef = ref(db);
    try {
        const snapshot = await get(child(dbRef, `rooms/${code}`));
        if (!snapshot.exists()) {
            return alert("Stanza non trovata!");
        }

        const roomData = snapshot.val();
        if (roomData.state && roomData.state.game_status !== 'waiting') {
            return alert("Impossibile accedere: partita già in corso!");
        }
        
        const currentPlayersCount = roomData.players ? Object.keys(roomData.players).length : 0;
        const maxLimit = roomData.config.maxPlayers;
        
        if (maxLimit !== 'unlimited' && currentPlayersCount >= maxLimit) {
            return alert("Impossibile accedere: la stanza è al completo!");
        }

        // Add player to room (initially alive, crewmate, empty tasks)
        // Wait, the real assignment happens on 'game start' in master.js. 
        // Here we just register the player in the room lobby.
        await set(ref(db, `rooms/${code}/players/${name}`), {
            status: 'alive',
            role: 'crewmate',
            meetings_called: 0
        });

        window.location.href = `animatore.html?room=${code}&player=${encodeURIComponent(name)}`;
    } catch (error) {
        alert("Errore di connessione: " + error.message);
    }
});
