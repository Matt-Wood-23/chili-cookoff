import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { configAPI } from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '0.0.0.0'];

// Render well above display size so the code stays crisp when it fills a phone
// screen for someone to scan.
const QR_RENDER_PX = 1024;

const ShareAccess = ({ config, onError }) => {
  const [qr, setQr] = useState('');
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fullScreen, setFullScreen] = useState(false);
  const [copied, setCopied] = useState(false);

  // The address this page was served from is, by definition, an address that
  // works - you are looking at the site through it. That beats detecting the
  // machine's IP, which cannot tell which interface a guest can actually reach.
  const shareUrl = window.location.origin;
  const isLocalOnly = LOCAL_HOSTS.includes(window.location.hostname);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (isLocalOnly) {
        // Only useful in the one case the origin is not shareable.
        const response = await configAPI.getNetworkAddresses();
        setAddresses(response.data.addresses || []);
      } else {
        setQr(await QRCode.toDataURL(shareUrl, {
          width: QR_RENDER_PX,
          margin: 2,
          errorCorrectionLevel: 'M'
        }));
      }
    } catch (error) {
      onError(error.response?.data?.error || 'Could not build the share link');
    } finally {
      setLoading(false);
    }
  }, [isLocalOnly, shareUrl, onError]);

  useEffect(() => { load(); }, [load]);

  // Escape closes the scan overlay, since it covers the whole screen.
  useEffect(() => {
    if (!fullScreen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setFullScreen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullScreen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onError('Could not copy — select the address and copy it by hand');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner text="Building share link..." />
      </div>
    );
  }

  // Viewing the panel on the host machine: the origin says "localhost", which
  // on a guest's phone means their own phone. Refuse to make a QR that cannot
  // work, and point at the addresses that can.
  if (isLocalOnly) {
    const port = window.location.port ? `:${window.location.port}` : '';
    return (
      <div className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-amber-900 mb-2">
            Open this page on your network address first
          </h2>
          <p className="text-sm text-amber-800">
            You are viewing the admin panel at{' '}
            <code className="font-mono">{window.location.host}</code>. A QR code made
            from that would send guests to their own phone. Reopen the site at one of
            the addresses below, then come back to this tab.
          </p>
        </div>

        {addresses.length > 0 ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              This machine is reachable at
            </h3>
            <ul className="space-y-2">
              {addresses.map(({ name, address }) => (
                <li key={`${name}-${address}`}>
                  <a
                    href={`http://${address}${port}`}
                    className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg hover:border-chili-red transition-colors"
                  >
                    <span className="font-mono text-gray-900">http://{address}{port}</span>
                    <span className="text-xs text-gray-500">{name}</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-gray-500">
              Pick the one on the same network as your guests. If you are on wifi,
              that is usually the wifi adapter rather than a virtual one.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-600">
            No external network addresses found. If this machine is offline, guests
            have nothing to connect to yet.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900">Let Judges In</h2>
        <p className="text-sm text-gray-600 mt-1">
          Hold your phone up and let people scan this. Tap the code to blow it up
          so a group can scan it at once.
        </p>

        <div className="mt-6 flex flex-col items-center">
          <button
            type="button"
            onClick={() => setFullScreen(true)}
            className="rounded-xl border-4 border-white shadow-lg focus:outline-none focus:ring-4 focus:ring-chili-red/40"
            aria-label="Show the code full screen for scanning"
          >
            <img src={qr} alt={`QR code linking to ${shareUrl}`} className="w-64 h-64 block" />
          </button>

          <p className="mt-4 font-mono text-lg text-gray-900 break-all text-center">{shareUrl}</p>

          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => setFullScreen(true)} className="admin-button">
              Show Big
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-bold"
            >
              {copied ? 'Copied' : 'Copy Link'}
            </button>
          </div>

          <p className="mt-4 text-xs text-gray-500 text-center max-w-md">
            Phones may warn that the site is &ldquo;not secure&rdquo; before loading.
            That is expected on a local network and safe to continue past.
            {config?.require_judge_code === 'true' &&
              ' Judges will also need a code from a slip once they arrive.'}
          </p>
        </div>
      </div>

      {fullScreen && (
        <div
          className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-4 cursor-pointer"
          onClick={() => setFullScreen(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setFullScreen(false); }}
          aria-label="Close full screen code"
        >
          <img
            src={qr}
            alt={`QR code linking to ${shareUrl}`}
            className="w-[min(88vw,88vh)] h-[min(88vw,88vh)]"
          />
          <p className="mt-4 font-mono text-base sm:text-xl text-gray-900 break-all text-center">
            {shareUrl}
          </p>
          <p className="mt-2 text-xs text-gray-400">Tap anywhere to close</p>
        </div>
      )}
    </div>
  );
};

export default ShareAccess;
