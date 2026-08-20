import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { evolutionClient } from '../evolutionClient';
import { outreachService } from '../services/outreach';
import { loginHandler, logoutHandler, checkAuthHandler } from '../auth';
import { AppSettings } from '../types';

const router = Router();

// ─── Auth ─────────────────────────────────────────────
router.post('/auth/login', loginHandler);
router.post('/auth/logout', logoutHandler);
router.get('/auth/check', checkAuthHandler);

// ─── Settings ─────────────────────────────────────────
const DEFAULT_SETTINGS: AppSettings = {
  sourceGroupJid: '',
  destinationGroupLink: '',
  delayMin: 30,
  delayMax: 90,
  dailyLimit: 40,
  templates: [
    'Olá! Tudo bem? Estou te convidando para participar de um grupo exclusivo. Posso te enviar o link?',
    'Oi! Vi que participamos do mesmo grupo. Tenho um grupo com conteúdo exclusivo, quer participar?',
    'E aí! Tudo certo? Tenho um grupo com conteúdo muito bom e gostaria de te convidar. Posso mandar o link?',
  ],
};

export async function getSettings(): Promise<AppSettings> {
  const rows = await prisma.setting.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));

  return {
    sourceGroupJid: map.get('sourceGroupJid') || DEFAULT_SETTINGS.sourceGroupJid,
    destinationGroupLink: map.get('destinationGroupLink') || DEFAULT_SETTINGS.destinationGroupLink,
    delayMin: parseInt(map.get('delayMin') || String(DEFAULT_SETTINGS.delayMin), 10),
    delayMax: parseInt(map.get('delayMax') || String(DEFAULT_SETTINGS.delayMax), 10),
    dailyLimit: parseInt(map.get('dailyLimit') || String(DEFAULT_SETTINGS.dailyLimit), 10),
    templates: map.has('templates')
      ? JSON.parse(map.get('templates')!)
      : DEFAULT_SETTINGS.templates,
  };
}

router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/settings', async (req: Request, res: Response) => {
  try {
    const { sourceGroupJid, destinationGroupLink, delayMin, delayMax, dailyLimit, templates } =
      req.body as AppSettings;

    const entries = [
      { key: 'sourceGroupJid', value: sourceGroupJid || '' },
      { key: 'destinationGroupLink', value: destinationGroupLink || '' },
      { key: 'delayMin', value: String(delayMin || 30) },
      { key: 'delayMax', value: String(delayMax || 90) },
      { key: 'dailyLimit', value: String(dailyLimit || 40) },
      { key: 'templates', value: JSON.stringify(templates || DEFAULT_SETTINGS.templates) },
    ];

    for (const entry of entries) {
      await prisma.setting.upsert({
        where: { key: entry.key },
        update: { value: entry.value },
        create: { key: entry.key, value: entry.value },
      });
    }

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Groups ───────────────────────────────────────────
router.get('/groups', async (_req: Request, res: Response) => {
  try {
    const groups = await evolutionClient.fetchAllGroups();
    res.json(groups);
  } catch (err: any) {
    res.status(500).json({ error: err?.response?.data?.message || err.message });
  }
});

// ─── Import contacts ─────────────────────────────────
router.post('/import', async (req: Request, res: Response) => {
  try {
    const settings = await getSettings();
    const groupJid = req.body.groupJid || settings.sourceGroupJid;

    if (!groupJid) {
      res.status(400).json({ error: 'Grupo de origem não configurado' });
      return;
    }

    const participants = await evolutionClient.fetchGroupParticipants(groupJid);
    let imported = 0;
    let skipped = 0;

    for (const p of participants) {
      try {
        await prisma.contact.create({
          data: {
            phone: p.id,
            pushName: null,
          },
        });
        imported++;
      } catch (err: any) {
        // Unique constraint violation = already exists
        if (err.code === 'P2002') {
          skipped++;
        } else {
          throw err;
        }
      }
    }

    res.json({ imported, skipped, total: participants.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.response?.data?.message || err.message });
  }
});

// ─── Contacts ─────────────────────────────────────────
router.get('/contacts', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '50', 10);
    const offset = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'todos') {
      where.status = status;
    }
    if (search) {
      where.phone = { contains: search };
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.contact.count({ where }),
    ]);

    res.json({ contacts, total, page, limit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Stats ────────────────────────────────────────────
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [total, pendentes, abordados, responderam, convidados, ignorados] = await Promise.all([
      prisma.contact.count(),
      prisma.contact.count({ where: { status: 'pendente' } }),
      prisma.contact.count({ where: { status: 'abordado' } }),
      prisma.contact.count({ where: { status: 'respondeu' } }),
      prisma.contact.count({ where: { status: 'convidado' } }),
      prisma.contact.count({ where: { status: 'ignorado' } }),
    ]);

    const taxaResposta =
      abordados + responderam + convidados > 0
        ? (((responderam + convidados) / (abordados + responderam + convidados)) * 100).toFixed(1)
        : '0.0';

    res.json({
      total,
      pendentes,
      abordados,
      responderam,
      convidados,
      ignorados,
      taxaResposta: parseFloat(taxaResposta),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Outreach ─────────────────────────────────────────
router.post('/outreach/start', async (req: Request, res: Response) => {
  try {
    const batchSize = parseInt(req.body.batchSize || '20', 10);
    await outreachService.start(batchSize);
    res.json({ ok: true, status: outreachService.getStatus() });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/outreach/pause', (_req: Request, res: Response) => {
  outreachService.pause();
  res.json({ ok: true, status: outreachService.getStatus() });
});

router.get('/outreach/status', (_req: Request, res: Response) => {
  res.json(outreachService.getStatus());
});

// ─── Webhook setup ────────────────────────────────────
router.post('/webhook/setup', async (_req: Request, res: Response) => {
  try {
    const webhookUrl = `${process.env.WEBHOOK_BASE_URL || 'http://localhost:3000'}/webhook/evolution`;
    const result = await evolutionClient.setWebhook(webhookUrl);
    res.json({ ok: true, webhookUrl, result });
  } catch (err: any) {
    res.status(500).json({ error: err?.response?.data?.message || err.message });
  }
});

export default router;
