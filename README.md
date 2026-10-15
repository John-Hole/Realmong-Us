# 🚀 Realmong Us

> **La piattaforma web multiplayer in tempo reale per giocare ad Among Us nella vita reale!**

`Realmong Us` trasforma il celebre gioco di deduzione sociale in un'esperienza dal vivo immersiva per gruppi, feste, campi scuola e serate tra amici. Grazie a **Firebase Realtime Database**, ogni dispositivo (smartphone, tablet o PC) si sincronizza all'istante con lo stato della partita.

---

## 🌟 Funzionalità Principali

- 📱 **Interfaccia Giocatore Mobile-First (`giocatore.html`)**: Ogni partecipante usa il proprio smartphone per visualizzare il proprio ruolo segreto (Crewmate o Impostore), consultare e completare le task assegnate, chiamare meeting di emergenza e votare durante le discussioni.
- 🎛️ **Pannello Game Master / Regia (`master.html`)**: Permette al creatore della stanza di gestire l'intera partita: assegnazione ruoli, impostazione durata round, attivazione emergenze, monitoraggio task e gestione round.
- 📺 **Visualizzazione Maxischermo (`schermo.html`)**: Progettato per essere proiettato su TV o telo in sala. Mostra lo stato del gioco, i countdown, le animazioni drammatiche durante i meeting di emergenza e i risultati delle votazioni con schermate di vittoria dedicate.
- 🧪 **Ruolo Speciale Scienziato (`scienziato.html`)**: Console di monitoraggio aggiuntiva per ruoli avanzati.
- ⚡ **Sincronizzazione Real-Time**: Nessun refresh necessario; cambi di stato, voti ed emergenze si riflettono istantaneamente su tutti i dispositivi.
- 🎨 **Design Cyberpunk & Glassmorphism**: Interfaccia moderna con palette scura, accenti neon, font futuristici (*Orbitron* e *Press Start 2P*) ed effetti sonori integrati.

---

## 🏗️ Architettura del Progetto

```
Realmong-Us/
├── index.html            # Hub centrale di ingresso (Crea partita / Unisciti / Schermo)
├── master.html           # Console di controllo del Game Master
├── giocatore.html        # Interfaccia smartphone per i giocatori
├── schermo.html          # Vista maxischermo/proiettore per la sala
├── scienziato.html       # Interfaccia per il ruolo Scienziato
├── css/                  # Fogli di stile modulari (global.css, hub, ecc.)
├── js/                   # Logica applicativa, gestione Firebase e stato
├── public/               # Asset grafici, suoni e icone
├── firebase-rules.json   # Regole di sicurezza per Firebase Realtime Database
└── vercel.json           # Configurazione di routing e deploy per Vercel
```

---

## 🚀 Come Giocare

1. **Avvia la Stanza**: Il Game Master accede a `index.html` e clicca su **CREA (Manager)**.
2. **Connetti i Giocatori**: I partecipanti scansionano il codice / aprono il link ed entrano come **Giocatori** inserendo il codice della stanza e il proprio nickname.
3. **Imposta il Maxischermo**: Su una TV o proiettore della sala principale, apri la **Schermata Generale** collegata alla stanza.
4. **Gioca**: Il Master avvia la partita, i Crewmate svolgono le loro task fisiche/virtuali, gli Impostori sabotano, e al suono dell'allarme tutti si radunano attorno al maxischermo per votare!

---

## 🛠️ Tecnologie Utilizzate

- **Frontend**: HTML5, CSS3 moderno (Glassmorphism, CSS Custom Properties), JavaScript (ES6+).
- **Backend & Realtime**: Firebase Realtime Database & Firebase Auth.
- **Hosting**: Pronto per il deploy immediato su **Vercel** (`vercel.json`).

---

## 📄 Licenza

Distribuito sotto licenza MIT. Vedi `LICENSE` per maggiori informazioni.
