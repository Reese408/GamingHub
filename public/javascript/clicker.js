document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const closeUpgrades = document.getElementById('closeUpgrades');
  const upgradesContainer = document.getElementById('upgradesContainer');
  const totalScore = document.getElementById('totalScore');
  const meteorContainer = document.getElementById('meteorContainer');
  const clickPower = document.getElementById('clickPower');
  const researchLab = document.getElementById('researchLab');
  const scientist = document.getElementById('scientist');
  const shipFleet = document.getElementById('shipFleet');
  const satellite = document.getElementById('satellite');

  // Sound Files (update paths based on your structure)
  const meteorClickSound = new Audio('/sounds/meteorClickSound.wav');
  const upgradeSound = new Audio('/sounds/upgradeSoundEdit.mp3');
  const openMenuSound = new Audio('/sounds/openMenuSound.wav');
  const closeMenuSound = new Audio('/sounds/closeMenuSound.wav');

  // Game State Variables
  let currentScore = 0;
  let clickMultiplier = 1;
  let clickPowerUpgradeLevel = 1;
  let clickPowerUpgradeCost = 100;
  let labUpgradeLevel = 1;
  let labUpgradeCost = 1000;
  let labMultiplier = 2.5;
  let labIntervalTimer = 10001;
  let scientistSeconds = 10;
  let scientistUpgradeCost = 10000;
  let scientistUpgradeLevel = 1;
  let shipFleetUpgradeLevel = 1;
  let shipFleetUpgradeCost = 50000;
  let satelliteUpgradeLevel = 1;
  let satelliteUpgradeCost = 100000;
  let satelliteSeconds = 10;
  let shipFleetIntervalTimer = 10001;
  let shipFleetMultiplier = 50;

  // Event Listeners
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

  meteorContainer.addEventListener('click', () => {
    meteorClickSound.currentTime = 0;
    meteorClickSound.play();
    currentScore += clickMultiplier;
    totalScore.textContent = `Funds: ${currentScore}`;
  });

  // Function to handle upgrades
  function handleUpgrade(upgradeElement, cost, level, multiplier, maxLevel = 30) {
    if (currentScore >= cost && level < maxLevel) {
      currentScore -= cost;
      upgradeElement.style.backgroundColor = 'green'; // Change background to green
      upgradeElement.style.backgroundImage = 'none'; // Remove padlock image
      upgradeElement.style.color = 'white'; // Make text visible
      upgradeElement.textContent = `Level ${level + 1}: +${multiplier * 2}`; // Show text after upgrade
      upgradeSound.currentTime = 0;
      upgradeSound.play();
      return true; // Upgrade successful
    }
    return false; // Upgrade failed
  }

  // Click Power Upgrade
  clickPower.addEventListener('click', () => {
    if (handleUpgrade(clickPower, clickPowerUpgradeCost, clickPowerUpgradeLevel, clickMultiplier)) {
      clickMultiplier *= 2;
      clickPowerUpgradeCost = Math.round(clickPowerUpgradeCost * 1.5);
      clickPowerUpgradeLevel++;
      clickPowerCostContainer.textContent = `Next Level Cost: $${clickPowerUpgradeCost}`;
    }
  });

  // Research Lab Upgrade
  researchLab.addEventListener('click', () => {
    if (handleUpgrade(researchLab, labUpgradeCost, labUpgradeLevel, labMultiplier)) {
      labMultiplier *= 2;
      labUpgradeCost = Math.round(labUpgradeCost * 1.5);
      labUpgradeLevel++;
      labCostContainer.textContent = `Next Level Cost: $${labUpgradeCost}`;
    }
  });

  // Scientist Upgrade
  scientist.addEventListener('click', () => {
    if (handleUpgrade(scientist, scientistUpgradeCost, scientistUpgradeLevel, scientistSeconds, 20)) {
      scientistSeconds -= 0.5;
      scientistUpgradeCost = Math.round(scientistUpgradeCost * 1.5);
      scientistUpgradeLevel++;
      scientistCostContainer.textContent = `Next Level Cost: $${scientistUpgradeCost}`;
    }
  });

  // Ship Fleet Upgrade
  shipFleet.addEventListener('click', () => {
    if (handleUpgrade(shipFleet, shipFleetUpgradeCost, shipFleetUpgradeLevel, shipFleetMultiplier)) {
      shipFleetMultiplier *= 2;
      shipFleetUpgradeCost = Math.round(shipFleetUpgradeCost * 1.5);
      shipFleetUpgradeLevel++;
      shipFleetCostContainer.textContent = `Next Level Cost: $${shipFleetUpgradeCost}`;
    }
  });

  // Satellite Upgrade
  satellite.addEventListener('click', () => {
    if (handleUpgrade(satellite, satelliteUpgradeCost, satelliteUpgradeLevel, satelliteSeconds, 20)) {
      satelliteSeconds -= 0.5;
      satelliteUpgradeCost = Math.round(satelliteUpgradeCost * 1.5);
      satelliteUpgradeLevel++;
      satelliteCostContainer.textContent = `Next Level Cost: $${satelliteUpgradeCost}`;
    }
  });
});
