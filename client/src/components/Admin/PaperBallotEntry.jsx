import React, { useState } from 'react';
import { voteAPI } from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

const CATEGORIES = [
  { key: 'heat', label: 'Heat' },
  { key: 'flavor', label: 'Flavor' },
  { key: 'texture', label: 'Texture' },
  { key: 'presentation', label: 'Presentation' },
  { key: 'overall', label: 'Overall' }
];

const EMPTY_SCORES = { heat: '', flavor: '', texture: '', presentation: '', overall: '' };

// Keying in a stack of paper scoresheets. Deliberately plain: no camera, no
// model, no network round trip beyond the submit — this is the path that still
// works when the venue wifi or Ollama does not.
const PaperBallotEntry = ({ chilis, onUpdate, onError }) => {
  const [chiliId, setChiliId] = useState('');
  const [judgeName, setJudgeName] = useState('');
  const [scores, setScores] = useState(EMPTY_SCORES);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [entered, setEntered] = useState([]);

  const setScore = (key, value) => setScores((previous) => ({ ...previous, [key]: value }));

  const resetBallot = ({ keepChili }) => {
    setJudgeName('');
    setScores(EMPTY_SCORES);
    setComments('');
    if (!keepChili) setChiliId('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!chiliId) return onError('Pick which chili this scoresheet is for');
    if (!judgeName.trim()) return onError('Enter the judge name from the scoresheet');

    const parsed = {};
    for (const { key, label } of CATEGORIES) {
      const value = Number(scores[key]);
      if (!Number.isInteger(value) || value < 1 || value > 10) {
        return onError(`${label} must be a whole number between 1 and 10`);
      }
      parsed[key] = value;
    }

    setLoading(true);
    try {
      const response = await voteAPI.submit({
        chili_id: Number(chiliId),
        judge_name: judgeName.trim(),
        ...parsed,
        comments: comments.trim() || undefined
      });

      const chili = chilis.find((c) => c.id === Number(chiliId));
      const label = `${judgeName.trim()} → ${chili ? chili.name : `#${chiliId}`}`;
      setEntered((previous) => [
        { label, updated: Boolean(response.data?.updated), at: Date.now() },
        ...previous
      ].slice(0, 8));

      onError(
        response.data?.updated ? `Replaced an existing ballot (${label})` : `Ballot recorded (${label})`,
        'success'
      );

      // Stay on the same chili — sheets usually come in stacks per entry.
      resetBallot({ keepChili: true });
      onUpdate();
    } catch (error) {
      onError(error.response?.data?.error || error.message || 'Failed to record ballot');
    } finally {
      setLoading(false);
    }
  };

  if (!chilis || chilis.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <span className="text-6xl mb-4 block">📝</span>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Chili Entries</h3>
        <p className="text-gray-500">Add at least one entry before recording paper ballots.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900">Enter a Paper Ballot</h2>
        <p className="text-sm text-gray-600 mt-1">
          Type in a scoresheet on a judge&apos;s behalf. Same one-vote-per-judge rule as
          the app, so re-entering a sheet corrects it rather than double-counting.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ballotChili" className="block text-sm font-medium text-gray-700 mb-2">
                Chili *
              </label>
              <select
                id="ballotChili"
                value={chiliId}
                onChange={(e) => setChiliId(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chili-red"
              >
                <option value="">Select an entry…</option>
                {chilis.map((chili) => (
                  <option key={chili.id} value={chili.id}>
                    {chili.name} — {chili.contestant_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ballotJudge" className="block text-sm font-medium text-gray-700 mb-2">
                Judge Name *
              </label>
              <input
                id="ballotJudge"
                type="text"
                value={judgeName}
                onChange={(e) => setJudgeName(e.target.value)}
                placeholder="As written on the sheet"
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chili-red"
              />
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">Scores (1-10) *</span>
            <div className="flex flex-wrap gap-4">
              {CATEGORIES.map(({ key, label }) => (
                <div key={key} className="flex flex-col items-center">
                  <label htmlFor={`score-${key}`} className="text-xs text-gray-500 mb-1">
                    {label}
                  </label>
                  <input
                    id={`score-${key}`}
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="10"
                    step="1"
                    value={scores[key]}
                    onChange={(e) => setScore(key, e.target.value)}
                    disabled={loading}
                    className="rating-input"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="ballotComments" className="block text-sm font-medium text-gray-700 mb-2">
              Comments (Optional)
            </label>
            <textarea
              id="ballotComments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={2}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chili-red resize-none"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => resetBallot({ keepChili: false })}
              disabled={loading}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-chili-red text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="small" text="" />
                  <span>Recording…</span>
                </>
              ) : (
                <span>Record Ballot</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {entered.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Recorded this session ({entered.length})
          </h3>
          <ul className="space-y-1 text-sm text-gray-600">
            {entered.map((item) => (
              <li key={item.at} className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>{item.label}</span>
                {item.updated && <span className="text-xs text-amber-600">(replaced)</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PaperBallotEntry;
