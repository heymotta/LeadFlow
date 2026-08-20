export interface ContactStatus {
  status: 'pendente' | 'abordado' | 'respondeu' | 'convidado' | 'ignorado';
}

export interface OutreachState {
  running: boolean;
  paused: boolean;
  progress: number;
  total: number;
  dailySent: number;
  dailyLimit: number;
  errors: Array<{ phone: string; reason: string; at: string }>;
  currentPhone?: string;
}

export interface EvolutionParticipant {
  id: string;        // JID e.g. "5511999999999@s.whatsapp.net"
  admin?: string;
}

export interface EvolutionGroupInfo {
  id: string;        // Group JID
  subject: string;   // Group name
  size: number;
}

export interface WebhookPayload {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text?: string;
      };
    };
    messageType?: string;
    messageTimestamp?: number;
  };
}

export interface AppSettings {
  sourceGroupJid: string;
  destinationGroupLink: string;
  delayMin: number;
  delayMax: number;
  dailyLimit: number;
  templates: string[];
}
