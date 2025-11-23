'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';

export function AuthBanner() {
    const { authenticated, login, logout, user, walletAddress } = useAuth();
    const [copied, setCopied] = useState(false);

    const copyAddress = async () => {
        if (walletAddress) {
            await navigator.clipboard.writeText(walletAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (authenticated) {
        return (
            <div className="border-b bg-muted/50">
                <div className="container flex h-14 items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                            Logged in as{' '}
                            {walletAddress ? (
                                <button
                                    onClick={copyAddress}
                                    className="font-medium text-foreground hover:underline cursor-pointer"
                                    title="Click to copy address"
                                >
                                    {copied ? 'copied!' : `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
                                </button>
                            ) : (
                                <span className="font-medium text-foreground">
                                    {user?.email?.address || 'Unknown User'}
                                </span>
                            )}
                        </span>
                    </div>
                    <Button variant="outline" size="sm" onClick={logout}>
                        Logout
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="border-b bg-muted/50">
            <div className="container flex h-14 items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                        Sign in to access all features
                    </span>
                </div>
                <Button size="sm" onClick={login}>
                    Sign In
                </Button>
            </div>
        </div>
    );
}
