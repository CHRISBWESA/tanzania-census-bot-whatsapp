/**
 * handlers.js - Message handling logic for the WhatsApp chatbot
 */

/**
 * Sends the main menu listing available regions.
 * @param {Object} sock - Baileys socket instance
 * @param {Object} msg - Incoming message object
 * @param {Object} censusData - Census data from JSON file
 */
export async function sendMainMenu(sock, msg, censusData) {
  console.log('censusData.regions:', JSON.stringify(censusData.regions, null, 2)); // Debug log
  const regions = censusData.regions || [];
  if (!Array.isArray(regions) || !regions.length) {
    await sock.sendMessage(msg.key.remoteJid, { text: 'Error: No regions found in census data. Please contact the administrator.' });
    return;
  }

  const regionList = regions.map((region, index) => {
    const regionName = region.region || region.name || 'Unknown Region';
    return `${index + 1}. ${regionName}`;
  }).join('\n');
  const menuText = `Welcome to the Tanzania Census 2022 Bot!\n\nPlease select a region by number:\n${regionList}\n\nReply with a number to get details, 'menu' to see this again, or 'help' for instructions.`;
  await sock.sendMessage(msg.key.remoteJid, { text: menuText });
}

/**
 * Formats nested population data into a readable string.
 * @param {Object|Number} population - Population data (object or number)
 * @returns {string} Formatted population string
 */
function formatPopulation(population) {
  if (typeof population === 'object' && population !== null) {
    return `Total: ${population.total || 'N/A'}, Male: ${population.male || 'N/A'}, Female: ${population.female || 'N/A'}`;
  }
  return population || 'N/A';
}

/**
 * Sends census data for a selected region.
 * @param {Object} sock - Baileys socket instance
 * @param {Object} msg - Incoming message object
 * @param {Object} censusData - Census data from JSON file
 * @param {number} regionIndex - Zero-based index of the selected region
 */
export async function sendRegionData(sock, msg, censusData, regionIndex) {
  const regions = censusData.regions || [];
  if (!Array.isArray(regions) || regionIndex < 0 || regionIndex >= regions.length) {
    await sock.sendMessage(msg.key.remoteJid, { text: 'Invalid region number. Reply with a valid number, "menu" to see the list, or "help" for instructions.' });
    return;
  }

  const region = regions[regionIndex];
  const regionName = region.region || region.name || 'Unknown Region';
  const population = region.population ? formatPopulation(region.population) : 'N/A';
  const households = region.households || 'N/A';
  const buildings = region.buildings ? (typeof region.buildings === 'object' ? JSON.stringify(region.buildings) : region.buildings) : 'N/A';

  const response = `${regionName} (2022 Census Data):\n- Population: ${population}\n- Households: ${households}\n- Buildings: ${buildings}\n\nReply with another number, 'menu' to return, or 'help' for instructions.`;
  await sock.sendMessage(msg.key.remoteJid, { text: response });
}

/**
 * Main message handler for processing incoming messages.
 * @param {Object} sock - Baileys socket instance
 * @param {Object} msg - Incoming message object
 * @param {Object} censusData - Census data from JSON file
 */
export async function handleMessage(sock, msg, censusData) {
  if (!msg.message || !msg.message.conversation) return;

  const text = msg.message.conversation.toLowerCase().trim();
  console.log('Processing message:', text);

  if (text === 'start' || text === 'menu') {
    await sendMainMenu(sock, msg, censusData);
  } else if (text === 'help') {
    await sock.sendMessage(msg.key.remoteJid, { text: 'Welcome to the Tanzania Census 2022 Bot!\n- Type "menu" to see available regions.\n- Reply with a number to view region data.\n- Type "help" for this message.' });
  } else if (/^\d+$/.test(text)) {
    const regionIndex = parseInt(text) - 1;
    await sendRegionData(sock, msg, censusData, regionIndex);
  } else {
    await sock.sendMessage(msg.key.remoteJid, { text: 'Please reply with a number to select a region, "menu" to see the list, or "help" for instructions.' });
  }
}