import React, { useState, useEffect, useCallback } from 'react';
import { judgeCodeAPI, configAPI } from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

const JudgeCodes = ({ config, onUpdate, onError }) => {
  const [codes, setCodes] = useState([]);
  const [count, setCount] = useState(40);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const codesRequired = config?.require_judge_code === 'true';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await judgeCodeAPI.getAll();
      setCodes(response.data.codes || []);
    } catch (error) {
      onError(error.response?.data?.error || 'Failed to load judge codes');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    const n = Number(count);
    if (!Number.isInteger(n) || n < 1 || n > 200) {
      return onError('Generate between 1 and 200 codes at a time');
    }

    setWorking(true);
    try {
      const response = await judgeCodeAPI.generate(n);
      onError(`Generated ${response.data.count} codes`, 'success');
      await load();
    } catch (error) {
      onError(error.response?.data?.error || 'Failed to generate codes');
    } finally {
      setWorking(false);
    }
  };

  const handleRevoke = async (code) => {
    if (!confirm(`Revoke code ${code}? Votes already cast with it stay counted.`)) return;

    setWorking(true);
    try {
      await judgeCodeAPI.revoke(code);
      onError(`Code ${code} revoked`, 'success');
      await load();
    } catch (error) {
      onError(error.response?.data?.error || 'Failed to revoke code');
    } finally {
      setWorking(false);
    }
  };

  const handleToggleRequirement = async () => {
    const next = !codesRequired;
    if (next && active.length === 0) {
      return onError('Generate some codes before requiring them — nobody could vote');
    }

    setWorking(true);
    try {
      await configAPI.updateKey('require_judge_code', next.toString());
      onError(
        next ? 'Judge codes are now required to vote' : 'Judge codes are no longer required',
        'success'
      );
      onUpdate();
    } catch (error) {
      onError(error.response?.data?.error || 'Failed to update setting');
    } finally {
      setWorking(false);
    }
  };

  const active = codes.filter((c) => !c.revoked);
  const used = active.filter((c) => c.vote_count > 0);
  const unused = active.filter((c) => !c.vote_count);
  const sharedDevices = active.filter((c) => c.vote_count > 0 && !c.device_id);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner text="Loading judge codes..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Requirement toggle */}
      <div className="bg-white rounded-lg shadow p-6 print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Judge Codes</h2>
            <p className="text-sm text-gray-600 mt-1 max-w-2xl">
              Hand one slip to each guest. A code is a ballot, not a person — no names
              are stored. Codes stay off until you turn them on, so you can decide on
              the day.
            </p>
          </div>
          <button
            onClick={handleToggleRequirement}
            disabled={working}
            className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
              codesRequired
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {codesRequired ? 'Stop Requiring Codes' : 'Require Codes to Vote'}
          </button>
        </div>

        <div className="mt-4 flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${codesRequired ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="text-sm font-medium text-gray-700">
            {codesRequired ? 'Codes required — judges must enter one' : 'Codes not required — name-based voting'}
          </span>
        </div>
      </div>

      {/* Generate */}
      <div className="bg-white rounded-lg shadow p-6 print:hidden">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Generate Codes</h3>
        <form onSubmit={handleGenerate} className="flex flex-wrap gap-3 items-end">
          <div>
            <label htmlFor="codeCount" className="block text-xs text-gray-500 mb-1">
              How many
            </label>
            <input
              id="codeCount"
              type="number"
              min="1"
              max="200"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              disabled={working}
              className="w-28 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chili-red"
            />
          </div>
          <button type="submit" disabled={working} className="admin-button disabled:opacity-50">
            Generate
          </button>
          {active.length > 0 && (
            <button
              type="button"
              onClick={() => window.print()}
              disabled={working}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Print Slips ({unused.length} unused)
            </button>
          )}
        </form>
        <p className="mt-3 text-xs text-gray-500">
          Generate a few more than you expect — latecomers and lost slips are the
          usual reason to reprint.
        </p>
      </div>

      {/* Summary */}
      {codes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
          {[
            ['Active', active.length, 'text-gray-900'],
            ['Used', used.length, 'text-green-600'],
            ['Unused', unused.length, 'text-gray-500'],
            ['Revoked', codes.length - active.length, 'text-red-600']
          ].map(([label, value, color]) => (
            <div key={label} className="bg-white rounded-lg shadow p-4">
              <p className="text-xs font-medium text-gray-500">{label}</p>
              <p className={`text-2xl font-semibold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {sharedDevices.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 print:hidden">
          <p className="text-sm text-amber-800">
            {sharedDevices.length} code(s) were used without a device id (private
            browsing, or storage disabled). Nothing is wrong — just noting it.
          </p>
        </div>
      )}

      {/* Printable slips. Everything else is hidden by the print rules. */}
      {active.length > 0 && (
        <div className="print-slips bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 print:hidden">
            Slips — cut along the lines. Printing gives you the {unused.length} unused
            {' '}code{unused.length === 1 ? '' : 's'}; codes already in use are skipped.
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {active.map((entry) => (
              <div
                key={entry.code}
                className={`border-2 border-dashed border-gray-300 rounded-lg p-4 text-center ${
                  entry.vote_count > 0 ? 'bg-gray-50 print:hidden' : ''
                }`}
              >
                <p className="text-xs text-gray-500 truncate">
                  {config?.event_name || 'Chili Cook-Off'}
                </p>
                <p className="text-2xl font-mono font-bold tracking-widest text-gray-900 my-2">
                  {entry.code}
                </p>
                <p className="text-[10px] text-gray-400 print:hidden">
                  {entry.vote_count > 0 ? `${entry.vote_count} rating(s)` : 'unused'}
                </p>
                <button
                  onClick={() => handleRevoke(entry.code)}
                  disabled={working}
                  className="mt-1 text-[10px] text-gray-400 underline hover:text-red-600 print:hidden disabled:opacity-50"
                >
                  revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {codes.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <span className="text-6xl mb-4 block">🎟️</span>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Codes Yet</h3>
          <p className="text-gray-500">Generate a batch above, then print and cut them up.</p>
        </div>
      )}
    </div>
  );
};

export default JudgeCodes;
