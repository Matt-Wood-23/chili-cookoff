import React, { useState } from 'react';
import { judgeCodeAPI, setJudgeCode } from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

// Shown instead of the chili grid when the event issues codes. Validating up
// front means a judge finds out their code is wrong now, not after they have
// filled in five sliders.
const JudgeCodeEntry = ({ eventName, onVerified }) => {
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();

    if (!trimmed) {
      setError('Enter the code from your slip');
      return;
    }

    setChecking(true);
    setError('');
    try {
      const response = await judgeCodeAPI.validate(trimmed);
      if (response.data.valid) {
        setJudgeCode(response.data.code);
        onVerified(response.data.code);
      } else {
        setError(response.data.error || 'That code is not valid');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Could not check that code. Try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 bg-white rounded-lg shadow p-8 text-center">
      <span className="text-5xl block mb-4">🎟️</span>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Enter Your Judge Code</h1>
      <p className="text-gray-600 mb-6">
        {eventName ? `${eventName} is using judge codes.` : 'This event is using judge codes.'}{' '}
        Your code is on the slip you were handed.
      </p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="judgeCode" className="sr-only">Judge code</label>
        <input
          id="judgeCode"
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
          placeholder="ABCD"
          maxLength={8}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          disabled={checking}
          className="w-full text-center text-3xl font-mono tracking-[0.4em] uppercase px-4 py-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-chili-red disabled:opacity-50"
        />

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={checking}
          className="mt-6 w-full bg-chili-red text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          {checking ? (
            <>
              <LoadingSpinner size="small" text="" />
              <span>Checking…</span>
            </>
          ) : (
            <span>Start Judging</span>
          )}
        </button>
      </form>

      <p className="mt-6 text-xs text-gray-500">
        Lost your slip? Ask the organizer for a new code.
      </p>
    </div>
  );
};

export default JudgeCodeEntry;
