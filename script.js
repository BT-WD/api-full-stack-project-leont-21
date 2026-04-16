/**
 * POKEMON GUESSING GAME - JAVASCRIPT
 * Logic for fetching Generation 1 Pokémon and managing game state.
 */
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
    // normalize for comparison: lowercase and remove non-alphanumeric characters
    return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
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

                return {
                    id: pokeStats.id,
                    name: p.name,
                    cleanName: normalize(p.name),
                    // use a tiny transparent image as a safe fallback if sprite is null
                    sprite: pokeStats.sprites.front_default || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',
                    found: false
                };
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
            <p class="name-display">${p.found ? p.name.toUpperCase() : '???'}</p>
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
    
    // Check if guess matches any unfound pokemon
    const match = pokemonList.find(p => p.cleanName === userGuess && !p.found);

    if (match) {
        // Mark as found
        match.found = true;
        caughtCount++;
        
        // Update UI
        revealPokemon(match);
        
        // Reset input for next guess
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
    card.querySelector('.name-display').innerText = p.name.toLowerCase();
}

/**
 * Win State logic.
 */
function winGame() {
    clearInterval(timerInterval);
    input.disabled = true;
    input.placeholder = "GOTTA CATCH 'EM ALL!";
    alert(`Congratulations! You finished Gen 1 in ${timeDisplay.innerText}!`);
    // Pro-tip: Insert high score database logic here.
}

// Kick off the loading process
initGame();