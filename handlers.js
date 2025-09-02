// handlers.js - Message handling logic for the WhatsApp chatbot

// Function to send the main menu
export async function sendMainMenu(sock, msg, censusData) {
  console.log('censusData.regions:', JSON.stringify(censusData.regions, null, 2)); // Debug log
  const regions = censusData.regions || [];
  if (!regions.length) {
    await sock.sendMessage(msg.key.remoteJid, { text: 'Error: No regions found in census data.' });
    return;
  }

  const regionList = regions.map((region, index) => {
    const regionName = region.region || region.name || 'Unknown Region';
    return `${index + 1}. ${regionName}`;
  }).join('\n');
  const menuText = `Welcome to the Tanzania Census 2022 Bot!\n\nPlease select a region by number:\n${regionList}\n\nReply with a number to get details or type 'menu' to see this again.`;
  await sock.sendMessage(msg.key.remoteJid, { text: menuText });
}

// Function to send region data
export async function sendRegionData(sock, msg, censusData, regionIndex) {
  const regions = censusData.regions || [];
  if (regionIndex >= 0 && regionIndex < regions.length) {
    const region = regions[regionIndex];
    console.log('Selected region data:', JSON.stringify(region, null, 2)); // Debug log
    const regionName = region.region || region.name || 'Unknown Region';
    
    // Handle nested objects or missing fields
    const population = typeof region.population === 'object' ? JSON.stringify(region.population) : region.population || 'N/A';
    const households = region.households || 'N/A';
    const buildings = typeof region.buildings === 'object' ? JSON.stringify(region.buildings) : region.buildings || 'N/A';

    const response = `${regionName} (2022 Census Data):\n- Population: ${population}\n- Households: ${households}\n- Buildings: ${buildings}\n\nReply with another number or 'menu' to return.`;
    await sock.sendMessage(msg.key.remoteJid, { text: response });
  } else {
    await sock.sendMessage(msg.key.remoteJid, { text: 'Invalid region number. Reply with a valid number or "menu" to see the list.' });
  }
}

// Main message handler
export async function handleMessage(sock, msg, censusData) {
  if (!msg.message || !msg.message.conversation) return;

  const text = msg.message.conversation.toLowerCase().trim();
  console.log('Processing message:', text);

  if (text === 'start' || text === 'menu') {
    await sendMainMenu(sock, msg, censusData);
  } else if (/^\d+$/.test(text)) {
    const regionIndex = parseInt(text) - 1;
    await sendRegionData(sock, msg, censusData, regionIndex);
  } else {
    await sock.sendMessage(msg.key.remoteJid, { text: 'Please reply with a number to select a region or "menu" to see the list.' });
  }
}