// index.js - Main entry point for the WhatsApp chatbot

// Import required modules
import makeWASocket from '@whiskeysockets/baileys'; // Baileys library for WhatsApp connection
import { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys'; // Utilities for auth and disconnection
import { Boom } from '@hapi/boom'; // For handling errors
import pino from 'pino'; // Logger
import fs from 'fs'; // File system for reading JSON and saving QR code
import path from 'path'; // Path utilities
import { fileURLToPath } from 'url'; // For handling file paths in ESM
import QRCode from 'qrcode'; // Library to generate graphical QR code

// Import handlers from separate file
import { handleMessage, sendMainMenu, sendRegionData } from './handlers.js';

// Get directory name for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load census data from JSON file
const censusDataPath = path.join(__dirname, 'census.json');
let censusData;
try {
  const rawData = fs.readFileSync(censusDataPath, 'utf-8');
  censusData = JSON.parse(rawData).tanzania_census_2022;
  console.log('Census data loaded, regions:', censusData.regions.length);
} catch (err) {
  console.error('Failed to load census.json:', err.message);
  process.exit(1);
}

// Function to connect to WhatsApp
const connectToWhatsApp = async () => {
  console.log('Attempting to connect to WhatsApp...');
  // Use multi-file auth state to save session
  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    // Create socket with extended QR timeout and retries
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: true, // Print text QR code as fallback
      logger: pino({ level: 'debug' }), // Debug for troubleshooting
      qrTimeout: 90000, // 90 seconds for QR code
      defaultQueryTimeoutMs: 90000, // Extend query timeout
    });

    // Save credentials whenever updated
    sock.ev.on('creds.update', saveCreds);

    // Handle connection updates for reconnection logic
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        console.log('QR Code generated (scan within 90 seconds):', qr);
        console.log('Generating graphical QR code image...');
        try {
          const qrFilePath = path.join(__dirname, 'qr.png');
          await QRCode.toFile(qrFilePath, qr, {
            color: {
              dark: '#000000', // Black QR code
              light: '#FFFFFF' // White background
            }
          });
          console.log(`Graphical QR code saved as ${qrFilePath}`);
          console.log('1. Open WhatsApp: Settings > Linked Devices > Link a Device.');
          console.log(`2. Scan the QR code image from ${qrFilePath} on your computer.`);
          console.log('3. Alternatively, paste the QR code string above into https://www.qr-code-generator.com/ and scan the generated image.');
        } catch (err) {
          console.error('Failed to generate QR code image:', err.message);
        }
      }
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('Connection closed. Details:', JSON.stringify(lastDisconnect, null, 2), ', reconnecting:', shouldReconnect);
        if (shouldReconnect) {
          connectToWhatsApp(); // Reconnect if not logged out
        }
      } else if (connection === 'open') {
        console.log('WhatsApp connection opened successfully');
      }
    });

    // Handle incoming messages
    sock.ev.on('messages.upsert', async (m) => {
      const msg = m.messages[0];
      console.log('Received message:', JSON.stringify(msg, null, 2));
      if (!msg.key.fromMe && m.type === 'notify') { // Only process user messages
        await handleMessage(sock, msg, censusData);
      }
    });

    return sock;
  } catch (err) {
    console.error('Failed to initialize WhatsApp connection:', err.message);
    process.exit(1);
  }
};

// Start the connection
connectToWhatsApp().catch(err => console.error('Connection failed:', err));

// Export for modularity if needed (though not required here)
export { connectToWhatsApp };