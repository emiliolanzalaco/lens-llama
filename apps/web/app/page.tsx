'use client';

import { usePrivy } from '@privy-io/react-auth';

export default function HomePage() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center">
          ETH Global - Web3 Payment Platform
        </h1>
        
        <div className="bg-white shadow-md rounded-lg p-8 text-center">
          {!ready ? (
            <div>Loading...</div>
          ) : authenticated ? (
            <div>
              <p className="mb-4">Welcome, {user?.email?.address || user?.wallet?.address}</p>
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Logout
              </button>
            </div>
          ) : (
            <div>
              <p className="mb-4">Connect your wallet or email to get started</p>
              <button
                onClick={login}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Login
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-300 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-2">Privy Integration</h2>
            <p className="text-sm text-gray-600">Authentication with email and wallet support</p>
          </div>
          <div className="border border-gray-300 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-2">Viem Integration</h2>
            <p className="text-sm text-gray-600">TypeScript interface for Ethereum</p>
          </div>
          <div className="border border-gray-300 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-2">Drizzle ORM</h2>
            <p className="text-sm text-gray-600">Type-safe database queries</p>
          </div>
          <div className="border border-gray-300 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-2">x402 Protocol</h2>
            <p className="text-sm text-gray-600">Custom payment facilitator</p>
          </div>
        </div>
      </div>
    </main>
  );
}
