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
    return str.toLowerCase().trim();
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
        const species = data.pokemon_species

        console.log(species)

        species.forEach(async (p) => {
            var pokemonData = {}
            try {
                const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${p.name}/`)

                if (response.ok) {
                    var pokeStats = await response.json()

                    console.log(pokeStats.sprites.front_default)

                    pokemonData = {
                        id: pokeStats.id,
                        name: p.name,
                        cleanName: normalize(p.name),
                        sprite: pokeStats.sprites.front_default,
                        found: false
                    }
                }
                console.log(pokemonList)
                pokemonList.push(pokemonData);
            }
            catch (error) {
                console.error(`error getting pokemon ${p.name}`)
            }
        });

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
        <div class="poke-card" id="poke-${p.name}">
            <span class="dex-num">#${p.name}</span>
            <img src="${p.sprite}" alt="???">
            <p class="name-display">???</p>
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
    card.querySelector('.name-display').innerText = p.name.toUpperCase();
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