import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { evolutionClient } from '../evolutionClient';
import { WebhookPayload } from '../types';
import { getSettings } from './api';

const router = Router();

router.post('/evolution', async (req: Request, res: Response) => {
  try {
    const payload = req.body as WebhookPayload;

    console.log('[Webhook] Evento recebido:', payload.event);

    // Only process MESSAGES_UPSERT
    if (payload.event !== 'MESSAGES_UPSERT' && payload.event !== 'messages.upsert') {
      res.json({ ok: true, action: 'ignored_event' });
      return;
    }

    const data = payload.data;
    if (!data?.key) {
      res.json({ ok: true, action: 'no_key' });
      return;
    }

    // Ignore messages sent by us
    if (data.key.fromMe) {
      res.json({ ok: true, action: 'from_me' });
      return;
    }

    const remoteJid = data.key.remoteJid;
    if (!remoteJid) {
      res.json({ ok: true, action: 'no_jid' });
      return;
    }

    // Ignore group messages (only process private messages)
    if (remoteJid.endsWith('@g.us')) {
      res.json({ ok: true, action: 'group_message' });
      return;
    }

    console.log(`[Webhook] Mensagem de ${remoteJid}`);

    // Find contact in database
    const contact = await prisma.contact.findUnique({
      where: { phone: remoteJid },
    });

    if (!contact) {
      console.log(`[Webhook] Contato ${remoteJid} não está na base, ignorando`);
      res.json({ ok: true, action: 'not_in_database' });
      return;
    }

    // Only respond to contacts with status "abordado"
    if (contact.status !== 'abordado') {
      console.log(`[Webhook] Contato ${remoteJid} já está com status "${contact.status}", ignorando`);
      res.json({ ok: true, action: 'status_not_abordado' });
      return;
    }

    // Get destination group link from settings
    const settings = await getSettings();
    if (!settings.destinationGroupLink) {
      console.error('[Webhook] Link do grupo de destino não configurado!');
      res.status(500).json({ error: 'Link do grupo de destino não configurado' });
      return;
    }

    // Update to "respondeu"
    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        status: 'respondeu',
        respondeuEm: new Date(),
      },
    });

    // Send the destination group link
    const phoneNumber = remoteJid.replace('@s.whatsapp.net', '');
    const linkMessage = `Que bom! 🎉 Aqui está o link do grupo:\n\n${settings.destinationGroupLink}\n\nBem-vindo(a)!`;

    try {
      await evolutionClient.sendText(phoneNumber, linkMessage);

      // Update to "convidado"
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          status: 'convidado',
          convidadoEm: new Date(),
        },
      });

      console.log(`[Webhook] Link enviado e contato ${remoteJid} marcado como convidado`);
    } catch (sendErr: any) {
      console.error(`[Webhook] Erro ao enviar link para ${remoteJid}:`, sendErr.message);
      // Keep status as "respondeu" — the link wasn't sent
    }

    res.json({ ok: true, action: 'invited' });
  } catch (err: any) {
    console.error('[Webhook] Erro ao processar:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
