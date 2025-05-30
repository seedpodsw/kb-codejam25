/* Game Rules and Logic:
 * 1. Goal: Harvest a specific number of fully grown plants
 * 
 * 2. Tools:
 *    - Water: Waters plants to help them grow
 *    - Debugger: Removes bugs from plants
 *    - Harvest: Collects fully grown plants
 * 
 * 3. Plant Growth:
 *    - Plants have 5 stages (0-4)
 *    - Must be watered each turn to grow
 *    - Will regress one stage if not watered
 *    - Can only be harvested at max stage (4)
 * 
 * 4. Events:
 *    - Occur randomly based on difficulty (chance: easy 50%, medium 70%, hard 90%)
 *    - Types:
 *      * Bugs: Damage plants and prevent harvesting
 *      * Poison: Causes plants to lose 2 stages when watered
 * 
 * 5. Difficulty Levels: set in initGame at the end of the file
 *    - easy: 4s growth timer, 10s events, 6 harvests needed
 *    - medium: 5s growth timer, 6s events, 6 harvests needed
 *    - hard: 6s growth timer, 3s events, 6 harvests needed
 */

updatePlantImage = (plant) => {
    plant.element.style.backgroundImage = `url(imgs/${plant.stage}.png)`;
}

generatePlants = (count = 6) => {
  const plants = [];
  for (let i = 0; i < count; i++) {
    const plantElement = document.createElement('div');
    plantElement.classList.add('plant');
    
    const waterOverlay = document.createElement('div');
    waterOverlay.classList.add('water-overlay');
    plantElement.appendChild(waterOverlay);

    const bugOverlay = document.createElement('div');
    bugOverlay.classList.add('bug-overlay');
    plantElement.appendChild(bugOverlay);
    
    plants.push({
      element: plantElement,
      name: i,
      stage: 0,
      watered_this_turn: false,
      timer: null,
      hasStarted: false,
      hasBugs: false
    });

    updatePlantImage(plants[i]);
    plantElement.addEventListener('click', () => plantClick(plants[i]));
  }
  return plants;
}

let game = {
  garden: document.getElementById('garden'),
  solve: document.getElementById('solve'),
  plants: generatePlants(6),
  game_tools: {
    water: document.getElementById('garden-tool-water'),
    debugger: document.getElementById('garden-tool-debugger'),
    harvest: document.getElementById('garden-tool-harvest')
  },
  game_stage_interval: 3000,
  game_event_interval: 10000,
  game_max_plant_stage: 4,
  game_harvest_count: 0,
  game_harvest_count_max: 6,
  game_selected_tool: 'water',
  game_instructions: document.getElementById('garden-instructions'),
  game_information_progress: document.getElementById('garden-information-progress'),
  game_information_tool: document.getElementById('garden-information-tool'),
  game_events:['poison','bugs', 'bugs', 'nothing'],
  game_event_chance: 0.5,
  game_event: null,
  lastEventTime: 0,
  lastPlantUpdateTimes: {},
  animationFrameId: null,
  running: false
}

setGameDifficulty = (difficulty) => {
    if(difficulty === 'medium'){
        game.game_stage_interval = 5000;
        game.game_event_interval = 4000;
        game.game_event_chance = 0.7;
    }
    if(difficulty === 'hard'){
        game.game_stage_interval = 5000;
        game.game_event_interval = 3000;
        game.game_event_chance = 0.9;
        game.game_events.push('bugs');
    }
    if(difficulty === 'debug'){
      //no bugs no events
      game.game_events = ['nothing'];
      game.game_event_chance = 0;
      //fast interval
      game.game_stage_interval = 500;
      game.game_event_interval = 12300;
    }
}


initGame = (difficulty) => {
  //set game difficulty
  setGameDifficulty(difficulty);

  //add plants to garden
  game.plants.forEach(plant => {
    game.garden.appendChild(plant.element);
    game.lastPlantUpdateTimes[plant.name] = 0;
  });

  //set event listeners for tools
  game.game_tools.water.addEventListener('click', () => setSelectedTool('water'));
  game.game_tools.debugger.addEventListener('click', () => setSelectedTool('debugger'));
  game.game_tools.harvest.addEventListener('click', () => setSelectedTool('harvest'));

  //set selected tool
  setSelectedTool(game.game_selected_tool);

  //set progress text
  game.game_information_progress.textContent = `Plants Harvested: ${game.game_harvest_count} / ${game.game_harvest_count_max}`;

  // Start the game loop
  game.running = true;
  game.lastEventTime = performance.now();
  gameLoop();
}

const gameLoop = (timestamp) => {
  if (!game.running) return;

  // Handle plant updates
  game.plants.forEach(plant => {
    if (!plant.hasStarted) return;
    
    const lastUpdate = game.lastPlantUpdateTimes[plant.name];
    if (timestamp - lastUpdate >= game.game_stage_interval) {
      if (plant.stage > 0 && !plant.watered_this_turn) {
        plant.stage--;
        updatePlantImage(plant);
      }
      plant.watered_this_turn = false;
      const waterOverlay = plant.element.querySelector('.water-overlay');
      waterOverlay.style.backgroundImage = 'none';
      waterOverlay.style.opacity = '0';
      checkWinCondition();
      game.lastPlantUpdateTimes[plant.name] = timestamp;
    }
  });

  // Handle game events
  if (timestamp - game.lastEventTime >= game.game_event_interval) {
    const event = document.getElementById('garden-event-text');
    const randomEvent = game.game_events[Math.floor(Math.random() * game.game_events.length)];
    game.game_event = randomEvent;

    // if plants have bugs on them then we should reduce their progress by 1 
    game.plants.forEach(plant => {
      if (plant.hasBugs) {
        plant.stage--;
        if(plant.stage < 0){
          plant.stage = 0;
        }
        updatePlantImage(plant);
      }
    });

    if (Math.random() > game.game_event_chance){
      event.textContent = 'Nothing!';
      game.game_event = null;
    } else {
      switch (randomEvent) {
        case 'poison':
          event.textContent = 'Poisonous water! It kills your plants!';
          break;
        case 'bugs':
          event.textContent = 'Pests! They are eating your plants!';
          // enable bug overlays
          game.plants.forEach(plant => {
            plant.hasBugs = true;
            const bugOverlay = plant.element.querySelector('.bug-overlay');
            bugOverlay.style.backgroundImage = 'url(imgs/bugs.png)';
            bugOverlay.style.opacity = '1';
          });
          break;
        default:
          event.textContent = 'Nothing!';
      }
    }
    game.lastEventTime = timestamp;
  }

  game.animationFrameId = requestAnimationFrame(gameLoop);
}

setSelectedTool = (tool) => {
  game.game_tools[game.game_selected_tool].classList.remove('active');
  game.game_tools[tool].classList.add('active');
  game.garden.classList.remove('water-selected', 'harvest-selected', 'debugger-selected');
  game.garden.classList.add(`${tool}-selected`);
  
  game.game_selected_tool = tool;
  game.game_information_tool.textContent = `Selected Tool: ${tool}`;
}

resetPlant = (plant) => {
  plant.stage = 0;
  plant.watered_this_turn = false;
  plant.hasBugs = false;
  plant.hasStarted = false;
  game.lastPlantUpdateTimes[plant.name] = 0;
  // Clear all overlays
  const waterOverlay = plant.element.querySelector('.water-overlay');
  waterOverlay.style.backgroundImage = 'none';
  waterOverlay.style.opacity = '0';
  const bugOverlay = plant.element.querySelector('.bug-overlay');
  bugOverlay.style.backgroundImage = 'none';
  bugOverlay.style.opacity = '0';
  updatePlantImage(plant);
}

plantClick = (plant) => {
    if (plant.stage < game.game_max_plant_stage && game.game_selected_tool === 'water' && !plant.watered_this_turn) {
        const waterOverlay = plant.element.querySelector('.water-overlay');
        waterOverlay.style.backgroundImage = 'url(imgs/water_overlay.png)';
        waterOverlay.style.opacity = '1';
        plant.watered_this_turn = true;

        if (!plant.hasStarted) {
            plant.hasStarted = true;
            game.lastPlantUpdateTimes[plant.name] = performance.now();
        }

        if (game.game_event === 'poison') {
            plant.stage -= 2;
            if (plant.stage < 0) {
                plant.stage = 0;
            }
        } else if (plant.hasBugs) {
            plant.stage--;
            if (plant.stage < 0) {
                plant.stage = 0;
            }
        } else {
            plant.stage++;
        }

        updatePlantImage(plant);
    }
    if (plant.stage === game.game_max_plant_stage && game.game_selected_tool === 'harvest') {

      if (plant.hasBugs) {
        resetPlant(plant);
      } else {
        game.game_harvest_count++;
        resetPlant(plant);
      }
      game.game_information_progress.textContent = `Plants Harvested: ${game.game_harvest_count} / ${game.game_harvest_count_max}`;

    } else if (plant.stage < game.game_max_plant_stage && game.game_selected_tool === 'harvest') {
      resetPlant(plant);
    } else if (game.game_selected_tool === 'debugger' && plant.hasBugs) {
      plant.hasBugs = false;
      const bugOverlay = plant.element.querySelector('.bug-overlay');
      bugOverlay.style.backgroundImage = 'none';
      bugOverlay.style.opacity = '0';
    }
}

checkWinCondition = () => {
  if (game.game_harvest_count >= game.game_harvest_count_max) {
    // Stop the game loop
    game.running = false;
    if (game.animationFrameId) {
      cancelAnimationFrame(game.animationFrameId);
    }
    const event = document.getElementById('garden-event');
    event.style.display = 'none';
    winTextColorizer();
    setTimeout(() => {
      captchaSuccess();
    }, 5000);
  }
}

winTextColorizer = () => {
  const text = 'You win!';
  const winText = document.getElementById('garden-win-text');
  winText.style.display = 'block';

  winText.innerHTML = text.split('').map(char => 
    `<span>${char}</span>`
  ).join('');
  
  const spans = winText.querySelectorAll('span');

  spans.forEach(span => {
    const randomColor = `hsl(${Math.floor(Math.random() * 360)}, 100%, 50%)`;
    span.style.color = randomColor;
  });
  
  setInterval(() => {
    spans.forEach(span => {
      const randomColor = `hsl(${Math.floor(Math.random() * 360)}, 100%, 50%)`;
      span.style.color = randomColor;
    });
  }, 500);
}

captchaSuccess = () => {
  window.top.postMessage("success", '*');
}

game.solve
     .addEventListener('click', () => captchaSuccess()); 

//difficulties: easy, medium, hard

initGame('medium');