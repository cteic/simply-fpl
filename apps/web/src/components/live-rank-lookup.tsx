'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LiveRankLookup() {
  const [teamId, setTeamId] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  function handleSubmit() {
    const id = parseInt(teamId, 10);
    if (isNaN(id) || id <= 0) {
      setError('Please enter a valid FPL team ID');
      return;
    }
    router.push(`/rank/${id}`);
  }

  return (
    <div>
      <label htmlFor="team-id">Your FPL team ID</label>
      <input
        id="team-id"
        type="number"
        placeholder="e.g. 1234567"
        value={teamId}
        onChange={e => {
          setTeamId(e.target.value);
          setError('');
        }}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
      />
      {error && <p role="alert">{error}</p>}
      <button onClick={handleSubmit}>
        Check live rank
      </button>
      <p>
        Find your team ID at{' '}
        <a
          href="https://fantasy.premierleague.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          fantasy.premierleague.com
        </a>{' '}
        — it&apos;s in the URL when you view your team.
      </p>
    </div>
  );
}
