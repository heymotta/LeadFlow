import axios, { AxiosInstance } from 'axios';
import { config } from './config';
import { EvolutionParticipant, EvolutionGroupInfo } from './types';

class EvolutionClient {
  private api: AxiosInstance;
  private instance: string;

  constructor() {
    this.instance = config.instanceName;
    this.api = axios.create({
      baseURL: config.evolutionApiUrl,
      headers: {
        'Content-Type': 'application/json',
        apikey: config.evolutionApiKey,
      },
      timeout: 30000,
    });
  }

  /**
   * Fetch all groups the instance is part of
   */
  async fetchAllGroups(): Promise<EvolutionGroupInfo[]> {
    const { data } = await this.api.get(
      `/group/fetchAllGroups/${this.instance}?getParticipants=false`
    );
    // Evolution API v2 returns array of group objects
    return (data || []).map((g: any) => ({
      id: g.id,
      subject: g.subject || g.name || g.id,
      size: g.size || g.participants?.length || 0,
    }));
  }

  /**
   * Fetch participants of a specific group
   */
  async fetchGroupParticipants(groupJid: string): Promise<EvolutionParticipant[]> {
    const { data } = await this.api.get(
      `/group/participants/${this.instance}`,
      { params: { groupJid } }
    );
    // v2 returns { participants: [...] } or directly an array
    const participants = data?.participants || data || [];
    return participants.map((p: any) => ({
      id: p.id,
      admin: p.admin || null,
    }));
  }

  /**
   * Send a text message to a phone number or group
   */
  async sendText(number: string, text: string): Promise<any> {
    const { data } = await this.api.post(
      `/message/sendText/${this.instance}`,
      { number, text }
    );
    return data;
  }

  /**
   * Configure the webhook for this instance
   */
  async setWebhook(url: string): Promise<any> {
    const { data } = await this.api.post(
      `/webhook/set/${this.instance}`,
      {
        webhook: {
          enabled: true,
          url,
          byEvents: false,
          base64: false,
          events: ['MESSAGES_UPSERT'],
        },
      }
    );
    return data;
  }
}

export const evolutionClient = new EvolutionClient();
