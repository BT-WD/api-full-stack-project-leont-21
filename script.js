import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js"
import { ref, push, getDatabase, get, child } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js"

/**
 * POKEMON GUESSING GAME - JAVASCRIPT
 * Logic for fetching Generation 1 Pokémon and managing game state.
 */

const appSettings = {
   databaseURL: "https://guesser-49b4e-default-rtdb.firebaseio.com/"
}
const app = initializeApp(appSettings);
const db = getDatabase(app);

let POKEMON_COUNT = 151
let pokemonList = [];
let caughtCount = 0;
let timerSeconds = 0;
let timerInterval;

// DOM Elements
const grid = document.getElementById('pokemon-grid');
const input = document.getElementById('guess-input');
const startBtn = document.getElementById('start-btn');
const timeDisplay = document.getElementById('time');
const countDisplay = document.getElementById('count');

/**
 * Normalizes strings for comparison.
 * Removes hyphens, spaces, and punctuation to make guessing easier.
 */
function normalize(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}


async function initGame() {
    startBtn.innerText = "Loading Dex...";
    startBtn.disabled = true;

    try {
        const response = await fetch(`https://pokeapi.co/api/v2/generation/1/`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const species = data.pokemon_species;

        console.log(species);

        // Fetch all pokemon details in parallel and wait for them to complete
        const fetchPromises = species.map(async (p) => {
            try {
                const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${p.name}/`);
                if (!res.ok) throw new Error(`Failed to fetch ${p.name}`);
                const pokeStats = await res.json();

                console.log(pokeStats.sprites.front_default);
                if (p.name === "nidoran-f" || p.name === "nidoran-m") {
                    return {
                        id: pokeStats.id,
                        name: "nidoran",
                        cleanName: normalize("Nidoran"),
                        // use a tiny transparent image as a safe fallback if sprite is null
                        sprite: pokeStats.sprites.front_default || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',
                        found: false
                    };
                }
                else {
                    return {
                        id: pokeStats.id,
                        name: p.name,
                        cleanName: normalize(p.name),
                        // use a tiny transparent image as a safe fallback if sprite is null
                        sprite: pokeStats.sprites.front_default || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',
                        found: false
                    };
                }
            } catch (error) {
                console.error(`error getting pokemon ${p.name}`, error);
                return null;
            }
        });

        const results = await Promise.all(fetchPromises);
        // Filter out failed fetches and sort by Pokedex id
        pokemonList = results.filter(Boolean).sort((a, b) => a.id - b.id);

        renderGrid();
        startBtn.innerText = "Start Game";
        startBtn.disabled = false;

    } catch (error) {
        console.error("Initialization Error:", error);
        startBtn.innerText = "Error - API Blocked";
        // Final fallback to prevent the app from crashing
        pokemonList = []; 
    }
}

/**
 * Creates the visual slots in the UI for all 151 Pokémon.
 */
function renderGrid() {
    grid.innerHTML = pokemonList.map(p => `
        <div class="poke-card" id="poke-${p.id}">
            <span class="dex-num">#${String(p.id).padStart(3, '0')}</span>
            <img src="${p.sprite || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='}" alt="${p.found ? p.name : '???'}">
            <p class="name-display">${p.found ? normalize(p.name) : '???'}</p>
        </div>
    `).join('');
}

/**
 * Game Start sequence.
 */
startBtn.addEventListener('click', () => {
    // Enable input and UI
    input.disabled = false;
    input.placeholder = "Type name...";
    input.focus();
    startBtn.style.display = 'none';

    // Start Clock
    timerInterval = setInterval(() => {
        timerSeconds++;
        const mins = Math.floor(timerSeconds / 60);
        const secs = timerSeconds % 60;
        timeDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
});

/**
 * Core Guessing Logic.
 * Listens for every character typed and compares it to the list.
 */
input.addEventListener('input', (e) => {
    const userGuess = normalize(e.target.value);

    // Find all unfound matches (handles duplicate names like Nidoran male/female)
    const matches = pokemonList.filter(p => p.cleanName === userGuess && !p.found);

    if (matches.length > 0) {
        // Mark each matched pokemon as found and reveal
        matches.forEach(m => {
            m.found = true;
            revealPokemon(m);
        });

        // Update counts and UI
        caughtCount += matches.length;
        e.target.value = '';
        countDisplay.innerText = caughtCount;

        // Check for Win Condition
        if (caughtCount === POKEMON_COUNT) {
            winGame();
        }
    }
});

/**
 * Visual reveal of a caught Pokémon.
 */
function revealPokemon(p) {
    const card = document.getElementById(`poke-${p.id}`);
    card.classList.add('found');
    card.querySelector('.name-display').innerText = normalize(p.name);
}

async function saveScore(playerInitials, playerTime) {
  try {
    // write to Realtime Database under 'highscores'
    await push(ref(db, 'highscores'), {
      initials: playerInitials,
      time: playerTime
    });
  } catch (err) {
    console.error('Failed to save score to Realtime DB', err);
  }
}

/**
 * Win State logic.
 */
async function winGame() {
    clearInterval(timerInterval);
    input.disabled = true;
    input.placeholder = "GOTTA CATCH 'EM ALL!";

    const timeTaken = timerSeconds;
    const formatted = formatTime(timeTaken);

    // Prompt for initials (max 3 characters)
    let initials = prompt(`Congratulations! You finished Gen 1 in ${formatted}!\nEnter your initials to post to the leaderboard (max 3 letters):`);

    if (initials && initials.trim()) {
        initials = initials.trim().substring(0,3).toUpperCase();
        try {
            await saveScore(initials, timeTaken);
            alert(`Score saved. Thanks, ${initials}! You finished in ${formatted}.`);
        } catch (err) {
            console.error('Failed to save score on win', err);
            alert('Could not save your score. Please try again later.');
        }
    } else {
        alert(`You finished in ${formatted}! Score not saved (no initials entered).`);
    }
}

// Leaderboard elements
const highscoreBtn = document.getElementById('highscore-btn');
const leaderboardEl = document.getElementById('leaderboard');
const closeLeaderboardBtn = document.getElementById('close-leaderboard');
const leaderboardList = document.getElementById('leaderboard-list');

highscoreBtn.addEventListener('click', async () => {
    await loadAndShowLeaderboard();
});

closeLeaderboardBtn.addEventListener('click', () => {
    leaderboardEl.classList.add('hidden');
    leaderboardEl.setAttribute('aria-hidden', 'true');
});

async function loadAndShowLeaderboard() {
    try {
        const dbRef = ref(db);
        const snapshot = await get(child(dbRef, 'highscores'));
        let entries = [];
        if (snapshot.exists()) {
            const data = snapshot.val();
            entries = Object.values(data);
        } else {
            entries = [];
        }

        // sort by time ascending
        // normalize time values and sort by numeric seconds ascending
        function parseTimeValue(v) {
            if (v == null) return Number.POSITIVE_INFINITY;
            if (typeof v === 'number') return v;
            if (typeof v === 'string') {
                // if already MM:SS
                const m = v.match(/^(\d{1,2}):(\d{2})$/);
                if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
                const n = Number(v);
                if (!Number.isNaN(n)) return n;
            }
            return Number.POSITIVE_INFINITY;
        }

        entries.sort((a, b) => parseTimeValue(a.time) - parseTimeValue(b.time));

        leaderboardList.innerHTML = entries.map((e) => `
            <li>${escapeHtml(e.initials)} — ${formatTime(parseTimeValue(e.time))}</li>
        `).join('');

        leaderboardEl.classList.remove('hidden');
        leaderboardEl.setAttribute('aria-hidden', 'false');
    } catch (err) {
        console.error('Error loading leaderboard', err);
        alert('Unable to load leaderboard');
    }
}

function escapeHtml(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatTime(seconds) {
    // If already formatted as MM:SS, return as-is
    if (typeof seconds === 'string' && /^\d{1,2}:\d{2}$/.test(seconds)) {
        return seconds;
    }

    const secs = Number(seconds);
    if (Number.isNaN(secs)) return '00:00';
    const mins = Math.floor(secs / 60).toString().padStart(2, '0');
    const rem = (secs % 60).toString().padStart(2, '0');
    return `${mins}:${rem}`;
}

// Kick off the loading process
initGame();