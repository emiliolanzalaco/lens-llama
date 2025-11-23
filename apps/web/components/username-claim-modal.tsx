'use client';

import { useState, useEffect } from 'react';
import { Modal } from './ui/modal';
import { Button } from './ui/button';

interface UsernameClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAddress: string;
  imageId?: string;
  onSuccess?: (username: string, ensName: string) => void;
}

export function UsernameClaimModal({
  isOpen,
  onClose,
  userAddress,
  imageId,
  onSuccess,
}: UsernameClaimModalProps) {
  const [username, setUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  // Check availability when username changes
  useEffect(() => {
    if (!username || username.length < 3) {
      setIsAvailable(null);
      setError(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsChecking(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/username/check-availability?username=${encodeURIComponent(username)}`
        );
        const data = await response.json();

        if (data.available) {
          setIsAvailable(true);
        } else {
          setIsAvailable(false);
          setError(data.error || 'Username is not available');
        }
      } catch (err) {
        setError('Failed to check availability');
        setIsAvailable(null);
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username]);

  const handleClaim = async () => {
    if (!isAvailable || !username) return;

    setIsClaiming(true);
    setError(null);

    try {
      const response = await fetch('/api/username/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          userAddress,
          ...(imageId && { firstImageId: imageId }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim username');
      }

      onSuccess?.(data.username, data.ensName);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim username');
    } finally {
      setIsClaiming(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pick Your Username">
      <div className="space-y-4">
        <p className="text-gray-600">
          Welcome! Pick a username so people can find your photos easily.
        </p>

        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Your username
          </label>
          <div className="relative">
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="alice"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isClaiming}
            />
            <div className="absolute right-3 top-2.5">
              {isChecking && (
                <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-blue-500 rounded-full" />
              )}
              {!isChecking && isAvailable === true && (
                <svg
                  className="w-5 h-5 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
              {!isChecking && isAvailable === false && (
                <svg
                  className="w-5 h-5 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </div>
          </div>
          {username && (
            <p className="mt-1 text-sm text-gray-500">
              Your name will be:{' '}
              <span className="font-mono bg-gray-100 px-1 rounded">
                {username}.lensllama.eth
              </span>
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button
          onClick={handleClaim}
          disabled={!isAvailable || isClaiming || isChecking}
          className="w-full"
        >
          {isClaiming ? 'Creating...' : 'Create Username'}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          3-63 characters, lowercase letters, numbers, and hyphens only
        </p>
      </div>
    </Modal>
  );
}
