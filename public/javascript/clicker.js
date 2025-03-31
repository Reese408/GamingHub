document.addEventListener('DOMContentLoaded', async () => {
  // API Configuration
  const API_BASE = 'game-state';

  // Load saved game state
  async function loadGameState() {
    try {
      const response = await fetch(API_BASE);
      if (!response.ok) throw new Error('Failed to load game');
      const savedState = await response.json();

      if (savedState) {
        return {
          currentScore: savedState.currentScore || 0,
          clickMultiplier: savedState.clickMultiplier || 1,
          clickPowerUpgradeLevel: savedState.clickPowerUpgradeLevel || 1,
          clickPowerUpgradeCost: savedState.clickPowerUpgradeCost || 100,
          labUpgradeLevel: savedState.labUpgradeLevel || 1,
          labUpgradeCost: savedState.labUpgradeCost || 1000,
          labMultiplier: savedState.labMultiplier || 2.5,
          scientistUpgradeLevel: savedState.scientistUpgradeLevel || 1,
          scientistUpgradeCost: savedState.scientistUpgradeCost || 10000,
          scientistSeconds: savedState.scientistSeconds || 10,
          shipFleetUpgradeLevel: savedState.shipFleetUpgradeLevel || 1,
          shipFleetUpgradeCost: savedState.shipFleetUpgradeCost || 50000,
          shipFleetMultiplier: savedState.shipFleetMultiplier || 50,
          satelliteUpgradeLevel: savedState.satelliteUpgradeLevel || 1,
          satelliteUpgradeCost: savedState.satelliteUpgradeCost || 100000,
          satelliteSeconds: savedState.satelliteSeconds || 10,
        };
      }
    } catch (err) {
      console.error('Error loading game state:', err);
    }
    return null;
  }

  // Save game state to database
  async function saveGameState() {
    const gameState = {
      currentScore,
      clickMultiplier,
      clickPowerUpgradeLevel,
      clickPowerUpgradeCost,
      labUpgradeLevel,
      labUpgradeCost,
      labMultiplier,
      scientistUpgradeLevel,
      scientistUpgradeCost,
      scientistSeconds,
      shipFleetUpgradeLevel,
      shipFleetUpgradeCost,
      shipFleetMultiplier,
      satelliteUpgradeLevel,
      satelliteUpgradeCost,
      satelliteSeconds,
    };

    try {
      await fetch(`${API_BASE}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gameState),
      });
    } catch (err) {
      console.error('Error saving game state:', err);
    }
  }

  // Auto-save every 30 seconds
  setInterval(saveGameState, 30000);

  // DOM Elements
  const closeUpgrades = document.getElementById('closeUpgrades');
  const openUpgrades = document.getElementById('openUpgrades');
  const upgradesContainer = document.getElementById('upgradesContainer');
  const totalScore = document.getElementById('totalScore');
  const meteorContainer = document.getElementById('meteorContainer');
  const clickPower = document.getElementById('clickPower');
  const researchLab = document.getElementById('researchLab');
  const scientist = document.getElementById('scientist');
  const shipFleet = document.getElementById('shipFleet');
  const satellite = document.getElementById('satellite');
  const clickPowerCostContainer = document.getElementById('clickPowerCostContainer');
  const labCostContainer = document.getElementById('labCostContainer');
  const scientistCostContainer = document.getElementById('scientistCostContainer');
  const shipFleetCostContainer = document.getElementById('shipFleetCostContainer');
  const satelliteCostContainer = document.getElementById('satelliteCostContainer');

  // Sound Files
  const meteorClickSound = new Audio('/sounds/meteorClickSound.wav');
  const upgradeSound = new Audio('/sounds/upgradeSoundEdit.mp3');
  const openMenuSound = new Audio('/sounds/openMenuSound.wav');
  const closeMenuSound = new Audio('/sounds/closeMenuSound.wav');

  // Initialize game state with loaded values or defaults
  const savedState = await loadGameState();
  let currentScore = savedState?.currentScore || 0;
  let clickMultiplier = savedState?.clickMultiplier || 1;
  let clickPowerUpgradeLevel = savedState?.clickPowerUpgradeLevel || 1;
  let clickPowerUpgradeCost = savedState?.clickPowerUpgradeCost || 100;
  let labUpgradeLevel = savedState?.labUpgradeLevel || 1;
  let labUpgradeCost = savedState?.labUpgradeCost || 1000;
  let labMultiplier = savedState?.labMultiplier || 2.5;
  let scientistSeconds = savedState?.scientistSeconds || 10;
  let scientistUpgradeCost = savedState?.scientistUpgradeCost || 10000;
  let scientistUpgradeLevel = savedState?.scientistUpgradeLevel || 1;
  let shipFleetUpgradeLevel = savedState?.shipFleetUpgradeLevel || 1;
  let shipFleetUpgradeCost = savedState?.shipFleetUpgradeCost || 50000;
  let satelliteUpgradeLevel = savedState?.satelliteUpgradeLevel || 1;
  let satelliteUpgradeCost = savedState?.satelliteUpgradeCost || 100000;
  let satelliteSeconds = savedState?.satelliteSeconds || 10;
  let shipFleetMultiplier = savedState?.shipFleetMultiplier || 50;

  // Passive Income Intervals
  let labInterval;
  let shipFleetInterval;

  // Function to update funds display
  function updateFunds() {
    totalScore.textContent = `Funds: ${currentScore}`;
  }

  // Function to style an upgrade element as unlocked
  function styleUpgradeAsUnlocked(element) {
    element.style.backgroundColor = 'green';
    element.style.backgroundImage = 'none';
    element.style.color = 'white';
  }

  // Initialize UI with saved state
  function initializeUI() {
    updateFunds();

    // Click Power
    clickPower.textContent = `Level ${clickPowerUpgradeLevel}: +${clickMultiplier}`;
    clickPowerCostContainer.textContent = `Next Level Cost: $${clickPowerUpgradeCost}`;
    if (clickPowerUpgradeLevel > 1) styleUpgradeAsUnlocked(clickPower);

    // Research Lab
    researchLab.textContent = `Level ${labUpgradeLevel}: +${labMultiplier}`;
    labCostContainer.textContent = `Next Level Cost: $${labUpgradeCost}`;
    if (labUpgradeLevel > 1) styleUpgradeAsUnlocked(researchLab);

    // Scientist
    scientist.textContent = `Level ${scientistUpgradeLevel}: ${scientistSeconds}s`;
    scientistCostContainer.textContent = `Next Level Cost: $${scientistUpgradeCost}`;
    if (scientistUpgradeLevel > 1) styleUpgradeAsUnlocked(scientist);

    // Ship Fleet
    shipFleet.textContent = `Level ${shipFleetUpgradeLevel}: +${shipFleetMultiplier}`;
    shipFleetCostContainer.textContent = `Next Level Cost: $${shipFleetUpgradeCost}`;
    if (shipFleetUpgradeLevel > 1) styleUpgradeAsUnlocked(shipFleet);

    // Satellite
    satellite.textContent = `Level ${satelliteUpgradeLevel}: ${satelliteSeconds}s`;
    satelliteCostContainer.textContent = `Next Level Cost: $${satelliteUpgradeCost}`;
    if (satelliteUpgradeLevel > 1) styleUpgradeAsUnlocked(satellite);
  }

  // Initialize the UI
  initializeUI();

  // Upgrade Menu Toggle
  openUpgrades.addEventListener('click', () => {
    openMenuSound.play();
    upgradesContainer.style.display = 'block';
    openUpgrades.style.display = 'none';
  });

  closeUpgrades.addEventListener('click', () => {
    closeMenuSound.play();
    upgradesContainer.style.display = 'none';
    openUpgrades.style.display = 'block';
  });

  // Meteor Click Handler
  meteorContainer.addEventListener('click', () => {
    meteorClickSound.currentTime = 0;
    meteorClickSound.play();
    currentScore += clickMultiplier;
    updateFunds();
    saveGameState();
  });

  // Function to handle upgrades
  function handleUpgrade(upgradeElement, cost, level, multiplier, maxLevel = 30) {
    if (currentScore >= cost && level < maxLevel) {
      currentScore -= cost;
      updateFunds();

      styleUpgradeAsUnlocked(upgradeElement);
      upgradeSound.currentTime = 0;
      upgradeSound.play();
      return true;
    }
    return false;
  }

  // Click Power Upgrade
  clickPower.addEventListener('click', () => {
    if (handleUpgrade(clickPower, clickPowerUpgradeCost, clickPowerUpgradeLevel, clickMultiplier)) {
      clickMultiplier *= 2;
      clickPowerUpgradeCost = Math.round(clickPowerUpgradeCost * 1.5);
      clickPowerUpgradeLevel++;
      clickPower.textContent = `Level ${clickPowerUpgradeLevel}: +${clickMultiplier}`;
      clickPowerCostContainer.textContent = `Next Level Cost: $${clickPowerUpgradeCost}`;
      saveGameState();
    }
  });

  // Research Lab Upgrade
  researchLab.addEventListener('click', () => {
    if (handleUpgrade(researchLab, labUpgradeCost, labUpgradeLevel, labMultiplier)) {
      labMultiplier *= 2;
      labUpgradeCost = Math.round(labUpgradeCost * 1.5);
      labUpgradeLevel++;
      researchLab.textContent = `Level ${labUpgradeLevel}: +${labMultiplier}`;
      labCostContainer.textContent = `Next Level Cost: $${labUpgradeCost}`;

      if (labUpgradeLevel === 2 || labUpgradeLevel > 2) {
        startLabPassiveIncome();
      }
      saveGameState();
    }
  });

  // Scientist Upgrade
  scientist.addEventListener('click', () => {
    if (handleUpgrade(scientist, scientistUpgradeCost, scientistUpgradeLevel, scientistSeconds, 20)) {
      scientistSeconds -= 0.5;
      scientistUpgradeCost = Math.round(scientistUpgradeCost * 1.5);
      scientistUpgradeLevel++;
      scientist.textContent = `Level ${scientistUpgradeLevel}: ${scientistSeconds}s`;
      scientistCostContainer.textContent = `Next Level Cost: $${scientistUpgradeCost}`;

      if (labUpgradeLevel > 1) {
        startLabPassiveIncome();
      }
      saveGameState();
    }
  });

  // Ship Fleet Upgrade
  shipFleet.addEventListener('click', () => {
    if (handleUpgrade(shipFleet, shipFleetUpgradeCost, shipFleetUpgradeLevel, shipFleetMultiplier)) {
      shipFleetMultiplier *= 2;
      shipFleetUpgradeCost = Math.round(shipFleetUpgradeCost * 1.5);
      shipFleetUpgradeLevel++;
      shipFleet.textContent = `Level ${shipFleetUpgradeLevel}: +${shipFleetMultiplier}`;
      shipFleetCostContainer.textContent = `Next Level Cost: $${shipFleetUpgradeCost}`;

      if (shipFleetUpgradeLevel === 2 || shipFleetUpgradeLevel > 2) {
        startShipFleetPassiveIncome();
      }
      saveGameState();
    }
  });

  // Satellite Upgrade
  satellite.addEventListener('click', () => {
    if (handleUpgrade(satellite, satelliteUpgradeCost, satelliteUpgradeLevel, satelliteSeconds, 20)) {
      satelliteSeconds -= 0.5;
      satelliteUpgradeCost = Math.round(satelliteUpgradeCost * 1.5);
      satelliteUpgradeLevel++;
      satellite.textContent = `Level ${satelliteUpgradeLevel}: ${satelliteSeconds}s`;
      satelliteCostContainer.textContent = `Next Level Cost: $${satelliteUpgradeCost}`;

      if (shipFleetUpgradeLevel > 1) {
        startShipFleetPassiveIncome();
      }
      saveGameState();
    }
  });

  // Start Research Lab passive income when unlocked
  function startLabPassiveIncome() {
    if (labInterval) clearInterval(labInterval);
    labInterval = setInterval(() => {
      currentScore += labMultiplier;
      updateFunds();
      saveGameState();
    }, scientistSeconds * 1000);
  }

  // Start Ship Fleet passive income when unlocked
  function startShipFleetPassiveIncome() {
    if (shipFleetInterval) clearInterval(shipFleetInterval);
    shipFleetInterval = setInterval(() => {
      currentScore += shipFleetMultiplier;
      updateFunds();
      saveGameState();
    }, satelliteSeconds * 1000);
  }

  // Initialize passive income if upgrades were already purchased
  if (labUpgradeLevel > 1) startLabPassiveIncome();
  if (shipFleetUpgradeLevel > 1) startShipFleetPassiveIncome();
});
