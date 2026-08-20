export interface Contact {
  id: number;
  phone: string;
  pushName: string | null;
  status: string;
  errorReason: string | null;
  abordadoEm: string | null;
  respondeuEm: string | null;
  convidadoEm: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  total: number;
  pendentes: number;
  abordados: number;
  responderam: number;
  convidados: number;
  ignorados: number;
  taxaResposta: number;
}

export interface OutreachStatus {
  running: boolean;
  paused: boolean;
  progress: number;
  total: number;
  dailySent: number;
  dailyLimit: number;
  errors: Array<{ phone: string; reason: string; at: string }>;
  currentPhone?: string;
}

export interface AppSettings {
  sourceGroupJid: string;
  destinationGroupLink: string;
  delayMin: number;
  delayMax: number;
  dailyLimit: number;
  templates: string[];
}

export interface GroupInfo {
  id: string;
  subject: string;
  size: number;
}
