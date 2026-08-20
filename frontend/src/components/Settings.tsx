import { useState, useEffect } from 'react';
import { api } from '../api';
import { AppSettings, GroupInfo } from '../types';

interface Props {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function Settings({ showToast }: Props) {
  const [settings, setSettings] = useState<AppSettings>({
    sourceGroupJid: '',
    destinationGroupLink: '',
    delayMin: 30,
    delayMax: 90,
    dailyLimit: 40,
    templates: [],
  });
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [templatesText, setTemplatesText] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getSettings();
      setSettings(data);
      setTemplatesText(
        (data.templates || []).join('\n---\n')
      );
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    setLoadingGroups(true);
    try {
      const data = await api.getGroups();
      setGroups(data);
    } catch (err: any) {
      showToast(`Erro ao carregar grupos: ${err.message}`, 'error');
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const templates = templatesText
        .split('\n---\n')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const updated = { ...settings, templates };
      await api.saveSettings(updated);
      showToast('Configurações salvas!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-panel">
        <p style={{ color: 'var(--text-muted)' }}>Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="settings-panel">
      <h2>⚙️ Configurações</h2>

      <div className="form-group">
        <label>Grupo de origem (WhatsApp)</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={settings.sourceGroupJid}
            onChange={(e) => setSettings({ ...settings, sourceGroupJid: e.target.value })}
            style={{ flex: 1 }}
          >
            <option value="">— Selecione um grupo —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.subject} ({g.size} membros)
              </option>
            ))}
            {settings.sourceGroupJid && !groups.find((g) => g.id === settings.sourceGroupJid) && (
              <option value={settings.sourceGroupJid}>
                {settings.sourceGroupJid} (atual)
              </option>
            )}
          </select>
          <button className="btn btn-sm" onClick={loadGroups} disabled={loadingGroups}>
            {loadingGroups ? '⏳' : '🔄'} Carregar grupos
          </button>
        </div>
        <div className="hint">
          Clique em "Carregar grupos" para buscar os grupos do WhatsApp conectado na Evolution API
        </div>
      </div>

      <div className="form-group">
        <label>Link do grupo de destino</label>
        <input
          type="text"
          value={settings.destinationGroupLink}
          onChange={(e) => setSettings({ ...settings, destinationGroupLink: e.target.value })}
          placeholder="https://chat.whatsapp.com/..."
        />
        <div className="hint">
          Link de convite do grupo para onde os contatos serão direcionados
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Delay mínimo (segundos)</label>
          <input
            type="number"
            value={settings.delayMin}
            onChange={(e) => setSettings({ ...settings, delayMin: parseInt(e.target.value) || 30 })}
            min={10}
          />
        </div>
        <div className="form-group">
          <label>Delay máximo (segundos)</label>
          <input
            type="number"
            value={settings.delayMax}
            onChange={(e) => setSettings({ ...settings, delayMax: parseInt(e.target.value) || 90 })}
            min={10}
          />
        </div>
        <div className="form-group">
          <label>Limite diário</label>
          <input
            type="number"
            value={settings.dailyLimit}
            onChange={(e) => setSettings({ ...settings, dailyLimit: parseInt(e.target.value) || 40 })}
            min={1}
            max={200}
          />
          <div className="hint">Máx. mensagens/dia</div>
        </div>
      </div>

      <div className="form-group">
        <label>Templates de mensagem</label>
        <textarea
          value={templatesText}
          onChange={(e) => setTemplatesText(e.target.value)}
          rows={8}
          placeholder={`Template 1 aqui...\n---\nTemplate 2 aqui...\n---\nTemplate 3 aqui...`}
        />
        <div className="hint">
          Separe cada template com <code>---</code> em uma linha. Um template será sorteado aleatoriamente a cada envio.
        </div>
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '⏳ Salvando...' : '💾 Salvar configurações'}
        </button>
        <button className="btn" onClick={loadSettings}>
          🔄 Recarregar
        </button>
      </div>
    </div>
  );
}
