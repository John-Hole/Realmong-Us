export const PLAYERS_LIST = [
    "Paolo", "Sebastian", "Gioele", "Serena", "Chloe", 
    "Margherita", "Ludovica", "Leonardo (Toniol)", "Christ", 
    "Leonardo Caprai", "Diego", "Alessandro", "Cardoni", 
    "Pio", "Nicolas", "Eleonora", "Luca"
];

export const IMPOSTORS_LIST = ["Ludovica", "Paolo", "Cardoni"];
export const SCIENTIST_LIST = ["Diego"];

export const TASKS_LIST = [
    "Canestri",
    "Trova l'oggetto",
    "Rebus",
    "Puzzle",
    "Pulisci il bagno",
    "Matematica",
    "Limbo",
    "Avanti un altro",
    "C'entra il bicchiere",
    "Percorso bendato",
    "Riempi il bicchiere",
    "Ricorda la sequenza",
    "Attacca le orecchie al bianconiglio"
];

export const ROUND_TIMES = [
    10 * 60 * 1000, // Round 1: 10 mins
    7 * 60 * 1000,  // Round 2: 7 mins
    5 * 60 * 1000   // Round 3+: 5 mins
];

// Utility function to get 8 random tasks
export function getRandomTasks() {
    const shuffled = [...TASKS_LIST].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 8);
}

// Format time from ms to MM:SS
export function formatTime(ms) {
    if (ms <= 0) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
