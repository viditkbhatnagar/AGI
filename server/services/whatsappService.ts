import { initializeWhatsApp } from '../controllers/whatsapp-controller';

let isInitialized = false;

export const startWhatsAppBot = () => {
  if (isInitialized) {
    console.log('WhatsApp bot already initialized');
    return;
  }

  console.log('Initializing WhatsApp bot...');
  initializeWhatsApp();
  isInitialized = true;
};

export const isWhatsAppBotRunning = () => {
  return isInitialized;
};
