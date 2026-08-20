import { prisma } from '../db';
import { evolutionClient } from '../evolutionClient';
import { OutreachState, AppSettings } from '../types';
import { getSettings } from '../routes/api';

class OutreachService {
  private state: OutreachState = {
    running: false,
    paused: false,
    progress: 0,
    total: 0,
    dailySent: 0,
    dailyLimit: 40,
    errors: [],
  };

  private abortController: AbortController | null = null;
  private dailySentDate: string = ''; // track which day the counter is for

  getStatus(): OutreachState {
    return { ...this.state };
  }

  async start(batchSize: number): Promise<void> {
    if (this.state.running && !this.state.paused) {
      throw new Error('Abordagem já está rodando');
    }

    // Reset daily counter if it's a new day
    const today = new Date().toISOString().split('T')[0];
    if (this.dailySentDate !== today) {
      this.state.dailySent = 0;
      this.dailySentDate = today;
    }

    const settings = await getSettings();
    this.state.dailyLimit = settings.dailyLimit;

    if (this.state.dailySent >= this.state.dailyLimit) {
      throw new Error(`Limite diário atingido (${this.state.dailyLimit} mensagens)`);
    }

    // Fetch pending contacts
    const remaining = this.state.dailyLimit - this.state.dailySent;
    const limit = Math.min(batchSize, remaining);

    const contacts = await prisma.contact.findMany({
      where: { status: 'pendente' },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });

    if (contacts.length === 0) {
      throw new Error('Nenhum contato pendente encontrado');
    }

    this.state = {
      ...this.state,
      running: true,
      paused: false,
      progress: 0,
      total: contacts.length,
      errors: [],
    };

    this.abortController = new AbortController();

    // Run outreach in background
    this.runOutreach(contacts, settings).catch((err) => {
      console.error('[Outreach] Erro fatal:', err);
      this.state.running = false;
    });
  }

  pause(): void {
    if (this.state.running) {
      this.state.paused = true;
      this.abortController?.abort();
    }
  }

  resume(): void {
    // Resume just re-starts with remaining batch
    if (this.state.paused) {
      this.state.paused = false;
      // Re-start will be called from the API
    }
  }

  private async runOutreach(
    contacts: Array<{ id: number; phone: string }>,
    settings: AppSettings
  ): Promise<void> {
    const { templates, delayMin, delayMax, destinationGroupLink } = settings;

    for (let i = 0; i < contacts.length; i++) {
      // Check if paused or aborted
      if (this.state.paused || this.abortController?.signal.aborted) {
        console.log('[Outreach] Pausado');
        return;
      }

      // Check daily limit again
      const today = new Date().toISOString().split('T')[0];
      if (this.dailySentDate !== today) {
        this.state.dailySent = 0;
        this.dailySentDate = today;
      }
      if (this.state.dailySent >= this.state.dailyLimit) {
        console.log('[Outreach] Limite diário atingido');
        break;
      }

      const contact = contacts[i];
      this.state.currentPhone = contact.phone;

      try {
        // Pick a random template
        const template =
          templates.length > 0
            ? templates[Math.floor(Math.random() * templates.length)]
            : 'Olá! Gostaria de te convidar para um grupo exclusivo.';

        // Extract phone number from JID (remove @s.whatsapp.net)
        const phoneNumber = contact.phone.replace('@s.whatsapp.net', '');

        console.log(`[Outreach] Enviando para ${phoneNumber} (${i + 1}/${contacts.length})`);

        await evolutionClient.sendText(phoneNumber, template);

        // Mark as abordado
        await prisma.contact.update({
          where: { id: contact.id },
          data: {
            status: 'abordado',
            abordadoEm: new Date(),
          },
        });

        this.state.dailySent++;
        this.state.progress = i + 1;
      } catch (err: any) {
        const reason = err?.response?.data?.message || err?.message || 'Erro desconhecido';
        console.error(`[Outreach] Erro ao enviar para ${contact.phone}:`, reason);

        // Mark as ignorado
        await prisma.contact.update({
          where: { id: contact.id },
          data: {
            status: 'ignorado',
            errorReason: reason.substring(0, 500),
          },
        });

        this.state.errors.push({
          phone: contact.phone,
          reason,
          at: new Date().toISOString(),
        });

        this.state.progress = i + 1;
      }

      // Random delay between sends (unless it's the last one)
      if (i < contacts.length - 1 && !this.state.paused) {
        const delay = this.randomDelay(delayMin, delayMax);
        console.log(`[Outreach] Aguardando ${Math.round(delay / 1000)}s antes do próximo envio...`);
        await this.sleep(delay, this.abortController!.signal);
      }
    }

    this.state.running = false;
    this.state.currentPhone = undefined;
    console.log('[Outreach] Rodada concluída');
  }

  private randomDelay(minSec: number, maxSec: number): number {
    const min = minSec * 1000;
    const max = maxSec * 1000;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private sleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, ms);
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
}

export const outreachService = new OutreachService();
