'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import { useUsdcBalance } from '@/lib/hooks/use-usdc-balance';
import { Button } from '@/components/ui/button';

export function AuthBanner() {
    const { authenticated, login, logout, walletAddress } = useAuth();
    const { balance } = useUsdcBalance(walletAddress);

    // Format balance to 2 decimal places
    const formattedBalance = balance
        ? Number(balance).toFixed(2)
        : '0.00';

    if (authenticated) {
        return (
            <div className="bg-white">
                <div className="flex h-14 items-center justify-between px-2 md:px-4">
                    <div className="text-sm font-medium text-neutral-950">
                        LensLlama
                    </div>
                    <div className="flex items-center gap-6">
                        <span className="text-sm text-neutral-600">
                            {formattedBalance} USDC
                        </span>
                        <Link href="/upload">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-sm text-neutral-600 bg-[#FDF6E3] hover:text-neutral-950 hover:bg-[#F5EED6]"
                            >
                                Upload
                            </Button>
                        </Link>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={logout}
                            className="text-sm text-neutral-600 bg-[#FDF6E3] hover:text-neutral-950 hover:bg-[#F5EED6]"
                        >
                            Sign Out
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white">
            <div className="flex h-14 items-center justify-between px-2 md:px-4">
                <div className="text-sm font-medium text-neutral-950">
                    LensLlama
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={login}
                    className="text-sm text-neutral-600 bg-[#FDF6E3] hover:text-neutral-950 hover:bg-[#F5EED6]"
                >
                    Sign In
                </Button>
            </div>
        </div>
    );
}
