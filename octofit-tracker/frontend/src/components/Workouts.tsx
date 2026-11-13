import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type WorkoutSuggestion = { title: string; focus?: string; reason?: string };

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSuggestions() {
      try {
        const response = await getJson<{ suggestions: WorkoutSuggestion[] }>('/api/workouts/suggestions/mona@example.com');
        if (!cancelled) {
          setSuggestions(response.suggestions ?? []);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError('Unable to load workout suggestions.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSuggestions();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns." isLoading={isLoading} error={error} empty={suggestions.length === 0} emptyMessage="No workout suggestions">
      <ul className="list-group list-group-flush">
        {suggestions.map((suggestion, index) => (
          <li key={`${suggestion.title}-${index}`} className="list-group-item">
            <strong>{suggestion.title}</strong>
            {suggestion.focus ? <div>{suggestion.focus}</div> : null}
            {suggestion.reason ? <small>{suggestion.reason}</small> : null}
          </li>
        ))}
      </ul>
    </CapabilityCard>
  );
}
