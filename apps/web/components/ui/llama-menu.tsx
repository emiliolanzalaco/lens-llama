'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { LogIn, LogOut, X, Upload, DoorClosed, DoorOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/use-auth';
import { useUsdcBalance } from '@/lib/hooks/use-usdc-balance';

export function LlamaMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const { login, logout, authenticated, walletAddress } = useAuth();
    const { balance } = useUsdcBalance(walletAddress);
    const menuRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const formattedBalance = balance
        ? Number(balance).toFixed(2)
        : '0.00';

    const showHomeButton = pathname === '/upload' || pathname.startsWith('/images/');

    return (
        <div ref={menuRef} className="fixed bottom-4 left-8 z-50 flex flex-col items-start gap-2">
            {/* Menu Content - Expands Upwards */}
            <div
                className={cn(
                    "flex flex-col gap-2 transition-all duration-300 ease-out origin-bottom-left",
                    isOpen
                        ? "opacity-100 scale-100 translate-y-0"
                        : "opacity-0 scale-95 translate-y-10 pointer-events-none"
                )}
            >
                <div className="flex w-64 flex-col overflow-hidden rounded-2xl bg-neutral-950 p-2 shadow-2xl ring-1 ring-neutral-800">
                    <div className="flex items-center justify-between px-4 py-3">
                        <div>
                            <h3 className="text-sm font-medium text-white">LlamaLens Access</h3>
                            <p className="text-xs text-neutral-400">Manage your session</p>
                        </div>
                        {authenticated && (
                            <span className="text-xs font-medium text-neutral-300">
                                {formattedBalance} USDC
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-1 p-2">
                        {/* Internal Home Button - Only visible on /upload or /images/* */}
                        {showHomeButton && (
                            <Link href="/" onClick={() => setIsOpen(false)}>
                                <button className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-900 hover:text-white">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 group-hover:bg-neutral-800">
                                        <DoorOpen className="h-4 w-4" />
                                    </div>
                                    <span>Home</span>
                                </button>
                            </Link>
                        )}

                        <Link href="/upload" onClick={() => setIsOpen(false)}>
                            <button className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-900 hover:text-white">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 group-hover:bg-neutral-800">
                                    <Upload className="h-4 w-4" />
                                </div>
                                <span>Upload</span>
                            </button>
                        </Link>

                        <button
                            onClick={() => {
                                if (authenticated) {
                                    logout();
                                } else {
                                    login();
                                }
                                setIsOpen(false);
                            }}
                            className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-900 hover:text-white"
                        >
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 group-hover:bg-neutral-800">
                                {authenticated ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                            </div>
                            <span>{authenticated ? 'Sign Out' : 'Login'}</span>
                        </button>
                    </div>
                </div>
            </div>
            {/* Home Button - Only visible on /upload AND when menu is closed */}
            {showHomeButton && !isOpen && (
                <Link href="/" className="ml-3">
                    <button
                        className="group flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-xl transition-transform duration-300 hover:scale-105 active:scale-95 ring-1 ring-neutral-200"
                    >
                        <DoorClosed className="h-6 w-6 text-black group-hover:hidden" />
                        <DoorOpen className="hidden h-6 w-6 text-black group-hover:block" />
                    </button>
                </Link>
            )}

            {/* Circular Trigger Button Group */}
            <div className="group relative h-[80px] w-[80px]">
                {/* Main Llama Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    onMouseEnter={() => setIsOpen(true)}
                    className={cn(
                        "relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-black shadow-2xl transition-transform duration-300 group-hover:scale-95 active:scale-90 ring-4 ring-white/10",
                        isOpen && "ring-white/20"
                    )}
                >
                    <img
                        src="/lama_head.png"
                        alt="Llama Menu"
                        className={cn(
                            "h-full w-full object-cover transition-all duration-500",
                            isOpen ? "scale-110 blur-sm brightness-50" : "scale-100"
                        )}
                    />

                    {/* Overlay Icon when open */}
                    <div
                        className={cn(
                            "absolute inset-0 flex items-center justify-center transition-all duration-300",
                            isOpen ? "opacity-100 rotate-0" : "opacity-0 rotate-90"
                        )}
                    >
                        <X className="h-12 w-12 text-white" />
                    </div>
                </button>
            </div>
        </div>
    );
}
