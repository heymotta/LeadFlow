import { useState } from 'react';
import { api } from '../api';
import { OutreachStatus } from '../types';

interface Props {
  outreachStatus: OutreachStatus | null;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefresh: () => void;
}

export default function OutreachControl({ outreachStatus, showToast, onRefresh }: Props) {
  const [batchSize, setBatchSize] = useState(20);
  const [importing, setImporting] = useState(false);
  const [settingUpWebhook, setSettingUpWebhook] = useState(false);

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await api.importContacts();
      showToast(
        `Importados: ${result.imported} | Já existentes: ${result.skipped} | Total no grupo: ${result.total}`,
        'success'
      );
      onRefresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleStart = async () => {
    try {
      await api.startOutreach(batchSize);
      showToast('Abordagem iniciada!', 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handlePause = async () => {
    try {
      await api.pauseOutreach();
      showToast('Abordagem pausada', 'info');
      onRefresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSetupWebhook = async () => {
    setSettingUpWebhook(true);
    try {
      await api.setupWebhook();
      showToast('Webhook configurado com sucesso!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSettingUpWebhook(false);
    }
  };

  const status = outreachStatus;
  const isRunning = status?.running && !status?.paused;
  const isPaused = status?.running && status?.paused;

  return (
    <>
      <div className="action-bar">
        <button className="btn" onClick={handleImport} disabled={importing}>
          {importing ? '⏳ Importando...' : '📥 Importar contatos'}
        </button>

        <div className="separator" />

        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Lote:
        </span>
        <input
          type="number"
          className="inline-input"
          value={batchSize}
          onChange={(e) => setBatchSize(parseInt(e.target.value) || 1)}
          min={1}
          max={100}
        />

        {!isRunning && (
          <button className="btn btn-primary" onClick={handleStart}>
            🚀 Iniciar abordagem
          </button>
        )}
        {isRunning && (
          <button className="btn btn-danger" onClick={handlePause}>
            ⏸️ Pausar
          </button>
        )}
        {isPaused && (
          <button className="btn btn-success" onClick={handleStart}>
            ▶️ Retomar
          </button>
        )}

        <div className="separator" />

        <button className="btn btn-sm" onClick={handleSetupWebhook} disabled={settingUpWebhook}>
          {settingUpWebhook ? '⏳ Configurando...' : '🔗 Configurar Webhook'}
        </button>
      </div>

      {status && (status.running || status.progress > 0) && (
        <div className="outreach-bar">
          <span className={`status-badge ${isRunning ? 'running' : isPaused ? 'paused' : 'idle'}`}>
            {isRunning && <span className="pulse-dot" />}
            {isRunning ? 'Enviando' : isPaused ? 'Pausado' : 'Concluído'}
          </span>

          <div className="progress-container">
            <div className="progress-text">
              {status.progress} / {status.total} enviados
              {status.currentPhone && isRunning && (
                <> — Atual: <strong>{status.currentPhone}</strong></>
              )}
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${status.total > 0 ? (status.progress / status.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            📅 Hoje: {status.dailySent}/{status.dailyLimit}
          </div>

          {status.errors.length > 0 && (
            <div style={{ fontSize: '0.8125rem', color: 'var(--red)' }}>
              ⚠️ {status.errors.length} erro(s)
            </div>
          )}
        </div>
      )}

      {status && status.errors.length > 0 && (
        <div className="errors-list">
          {status.errors.map((err, i) => (
            <div key={i} className="error-item">
              <span>{err.phone}</span>
              <span>{err.reason}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
