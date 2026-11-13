import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type LeaderboardEntry = { teamName: string; totalPoints: number; rank: number };

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLeaderboard() {
      try {
        const response = await getJson<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard');
        if (!cancelled) {
          setEntries(response.leaderboard ?? []);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError('Unable to load leaderboard.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadLeaderboard();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <CapabilityCard title="Leaderboard" description="Compare team point totals." isLoading={isLoading} error={error} empty={entries.length === 0} emptyMessage="No leaderboard">
      <ol className="list-group list-group-numbered">
        {entries.map((entry) => (
          <li key={`${entry.teamName}-${entry.rank}`} className="list-group-item d-flex justify-content-between align-items-center">
            <span>{entry.teamName}</span>
            <span>{entry.totalPoints}</span>
          </li>
        ))}
      </ol>
    </CapabilityCard>
  );
}
