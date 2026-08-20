import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Evolution API
  evolutionApiUrl: process.env.EVOLUTION_API_URL || '',
  evolutionApiKey: process.env.EVOLUTION_API_KEY || '',
  instanceName: process.env.INSTANCE_NAME || 'leadflow',

  // Auth
  accessPassword: process.env.ACCESS_PASSWORD || 'admin',

  // Webhook
  webhookBaseUrl: process.env.WEBHOOK_BASE_URL || 'http://localhost:3000',
};
