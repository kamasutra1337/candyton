import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { sfx } from '../audio/sfx';
import { apiEnabled, fetchLeaderboard, type LeaderRow } from '../net/api';

type Mode = 'global' | number; // number = level id

const medal = (rank: number): string => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`);

export function Leaderboard() {
  const openMap = useStore((s) => s.openMap);
  const unlocked = useStore((s) => s.unlocked);
  const me = useStore((s) => s.playerName);

  const [mode, setMode] = useState<Mode>('global');
  const [rows, setRows] = useState<LeaderRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setRows(null);
    fetchLeaderboard(mode === 'global' ? undefined : mode).then((r) => {
      if (!cancelled) {
        setRows(r ?? []);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const levels = Array.from({ length: unlocked }, (_, i) => i + 1);

  return (
    <div className="leaderboard">
      <div className="lb-head">
        <button className="icon-btn" onClick={() => { sfx.play('click'); openMap(); }} aria-label="Back">
          ‹
        </button>
        <h2 className="lb-title">🏆 Leaderboard</h2>
        <span style={{ width: 40 }} />
      </div>

      <div className="lb-tabs">
        <button
          className={`lb-tab ${mode === 'global' ? 'active' : ''}`}
          onClick={() => { sfx.play('click'); setMode('global'); }}
        >
          Global
        </button>
        <div className="lb-levels">
          {levels.map((id) => (
            <button
              key={id}
              className={`lb-level ${mode === id ? 'active' : ''}`}
              onClick={() => { sfx.play('click'); setMode(id); }}
            >
              {id}
            </button>
          ))}
        </div>
      </div>

      <div className="lb-list">
        {!apiEnabled() ? (
          <p className="lb-empty">Leaderboards are available in the online version.</p>
        ) : loading ? (
          <p className="lb-empty">Loading…</p>
        ) : rows && rows.length > 0 ? (
          rows.map((r) => (
            <div key={`${r.rank}-${r.name}`} className={`lb-row ${r.name === me ? 'me' : ''} ${r.rank <= 3 ? 'top' : ''}`}>
              <span className="lb-rank">{medal(r.rank)}</span>
              <span className="lb-name">{r.name}{r.name === me ? ' (you)' : ''}</span>
              {typeof mode === 'number' && r.stars != null && (
                <span className="lb-stars">{'★'.repeat(r.stars)}</span>
              )}
              <span className="lb-score">{r.score.toLocaleString()}</span>
            </div>
          ))
        ) : (
          <p className="lb-empty">No scores yet — play a level to claim the top spot! 🍬</p>
        )}
      </div>

      <p className="lb-foot">
        {mode === 'global' ? 'Ranked by total best score across levels.' : `Level ${mode} — highest score first.`}
      </p>
    </div>
  );
}
