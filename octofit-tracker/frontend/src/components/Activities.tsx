import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type ActivityRecord = { type: string; minutes: number; points?: number };

export default function Activities() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadActivities() {
      try {
        const response = await getJson<{ activities: ActivityRecord[] }>('/api/activities');
        if (!cancelled) {
          setActivities(response.activities ?? []);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError('Unable to load activities.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadActivities();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <CapabilityCard title="Activities" description="Track student activity minutes and points." isLoading={isLoading} error={error} empty={activities.length === 0} emptyMessage="No activities">
      <ul className="list-group list-group-flush">
        {activities.map((activity, index) => (
          <li key={`${activity.type}-${activity.minutes}-${index}`} className="list-group-item">
            <strong>{activity.type}</strong> — {activity.minutes} minutes {typeof activity.points === 'number' ? `(${activity.points} pts)` : ''}
          </li>
        ))}
      </ul>
    </CapabilityCard>
  );
}
