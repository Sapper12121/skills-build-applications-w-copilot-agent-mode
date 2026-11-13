import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type TeamRecord = { name: string; members: Array<string | { _id?: string; name?: string }> };

export default function Teams() {
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTeams() {
      try {
        const response = await getJson<{ teams: TeamRecord[] }>('/api/teams');
        if (!cancelled) {
          setTeams(response.teams ?? []);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError('Unable to load teams.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadTeams();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <CapabilityCard title="Teams" description="Manage teams and members." isLoading={isLoading} error={error} empty={teams.length === 0} emptyMessage="No teams">
      <ul className="list-group list-group-flush">
        {teams.map((team, index) => (
          <li key={`${team.name}-${index}`} className="list-group-item">
            <strong>{team.name}</strong>
            <div>{team.members.length} members</div>
          </li>
        ))}
      </ul>
    </CapabilityCard>
  );
}
