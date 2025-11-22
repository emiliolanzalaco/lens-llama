'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';

export function AuthBanner() {
    const { authenticated, login, logout, user } = useAuth();

    if (authenticated) {
        return (
            <div className="border-b bg-muted/50">
                <div className="container flex h-14 items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                            Logged in as{' '}
                            <span className="font-medium text-foreground">
                                {user?.email?.address || user?.wallet?.address?.slice(0, 6) + '...' + user?.wallet?.address?.slice(-4)}
                            </span>
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
