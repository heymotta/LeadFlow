import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Stats, OutreachStatus } from '../types';
import StatsCards from './StatsCards';
import OutreachControl from './OutreachControl';
import ContactsTable from './ContactsTable';

interface Props {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function Dashboard({ showToast }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [outreachStatus, setOutreachStatus] = useState<OutreachStatus | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const pollingRef = useRef<number | null>(null);

  const fetchStats = async () => {
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (err) {
      console.error('Erro ao buscar stats:', err);
    }
  };

  const fetchOutreachStatus = async () => {
    try {
      const data = await api.getOutreachStatus();
      setOutreachStatus(data);
    } catch (err) {
      console.error('Erro ao buscar status:', err);
    }
  };

  const refresh = () => {
    fetchStats();
    fetchOutreachStatus();
    setRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    fetchStats();
    fetchOutreachStatus();

    // Poll every 3 seconds for outreach status and stats
    pollingRef.current = window.setInterval(() => {
      fetchStats();
      fetchOutreachStatus();
    }, 3000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  return (
    <>
      <StatsCards stats={stats} />

      <OutreachControl
        outreachStatus={outreachStatus}
        showToast={showToast}
        onRefresh={refresh}
      />

      <ContactsTable refreshKey={refreshKey} />
    </>
  );
}
