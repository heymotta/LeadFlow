import { useState, useEffect } from 'react';
import { api } from '../api';
import { Contact } from '../types';

interface Props {
  refreshKey: number;
}

const STATUS_OPTIONS = [
  { value: 'todos', label: '📋 Todos' },
  { value: 'pendente', label: '⏳ Pendentes' },
  { value: 'abordado', label: '📨 Abordados' },
  { value: 'respondeu', label: '💬 Responderam' },
  { value: 'convidado', label: '✅ Convidados' },
  { value: 'ignorado', label: '❌ Ignorados' },
];

export default function ContactsTable({ refreshKey }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('todos');
  const [search, setSearch] = useState('');
  const limit = 25;

  const fetchContacts = async () => {
    try {
      const data = await api.getContacts({ status, search, page, limit });
      setContacts(data.contacts);
      setTotal(data.total);
    } catch (err) {
      console.error('Erro ao buscar contatos:', err);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [page, status, search, refreshKey]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [status, search]);

  const totalPages = Math.ceil(total / limit);

  const formatDate = (date: string | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPhone = (phone: string) => {
    return phone.replace('@s.whatsapp.net', '');
  };

  return (
    <div className="table-wrapper">
      <div className="table-toolbar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="🔍 Buscar por telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <span style={{ marginLeft: 'auto', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          {total} contato(s)
        </span>
      </div>

      {contacts.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📭</div>
          <p>Nenhum contato encontrado</p>
        </div>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>Telefone</th>
                <th>Nome</th>
                <th>Status</th>
                <th>Abordado em</th>
                <th>Respondeu em</th>
                <th>Convidado em</th>
                <th>Erro</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                    {formatPhone(c.phone)}
                  </td>
                  <td>{c.pushName || '—'}</td>
                  <td>
                    <span className={`status-pill ${c.status}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>{formatDate(c.abordadoEm)}</td>
                  <td>{formatDate(c.respondeuEm)}</td>
                  <td>{formatDate(c.convidadoEm)}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.errorReason || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="table-footer">
            <span>
              Página {page} de {totalPages || 1}
            </span>
            <div className="pagination">
              <button
                className="btn btn-sm btn-ghost"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                ← Anterior
              </button>
              <button
                className="btn btn-sm btn-ghost"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Próxima →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
