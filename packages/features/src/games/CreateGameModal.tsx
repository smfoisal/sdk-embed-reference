import { useState, type FormEvent } from 'react';
import type { GameSummary } from '@flarie/contract';
import { FlarieApiError, useFlarieApi, useText } from '@flarie/core';
import { Button, Field, Modal } from '@flarie/ui';

export function CreateGameModal({ onClose, onCreated }: { onClose: () => void; onCreated: (game: GameSummary) => void }) {
  const api = useFlarieApi();
  const t = useText();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<GameSummary['kind']>('quiz');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Give the game a name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      onCreated(await api.post<GameSummary>('/games', { name: name.trim(), kind }));
    } catch (err) {
      // The backend is the real gatekeeper (limits, entitlements); show its message.
      setError(err instanceof FlarieApiError ? err.message : "Couldn't create the game. Try again.");
      setSaving(false);
    }
  }

  return (
    <Modal title={t('createGame.title', 'Create game')} onClose={onClose}>
      <form className="fl-form" onSubmit={submit} noValidate>
        <Field label="Name">
          <input className="fl-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Summer quiz" />
        </Field>
        <Field label="Game type">
          <select className="fl-input" value={kind} onChange={(e) => setKind(e.target.value as GameSummary['kind'])}>
            <option value="quiz">Quiz</option>
            <option value="memory">Memory</option>
            <option value="wheel">Spin the wheel</option>
            <option value="puzzle">Puzzle</option>
          </select>
        </Field>
        {error && (
          <p className="fl-error" role="alert">
            {error}
          </p>
        )}
        <div className="fl-form-actions">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating…' : t('createGame.submit', 'Create game')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
