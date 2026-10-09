"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { Shield, Radio, Terminal, LogOut, User } from "lucide-react";

interface UserInfo {
  id: string;
  email: string;
  displayName: string;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  };

  const navLinks = [
    { href: "/dashboard", label: "DASHBOARD" },
    { href: "/analyze", label: "ANALYZER" },
    { href: "/intel", label: "THREAT INTEL" },
    { href: "/settings", label: "SETTINGS" },
  ];

  return (
    <header className="sticky top-0 z-50 h-[80px] w-full border-b border-[var(--border-color)] bg-[var(--bg-primary)]/95 backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto h-full grid grid-cols-12 items-center px-6">
        {/* Columns 1-3: Logo */}
        <div className="col-span-12 md:col-span-3 flex items-center justify-between md:justify-start gap-3">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-9 h-9 border border-[var(--border-strong)] bg-black overflow-hidden flex-shrink-0">
              <Image
                src="/logo.png"
                alt="PhantomVault Logo"
                width={36}
                height={36}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight uppercase leading-none">
                PHANTOM<span className="text-[var(--accent-cobalt)]">VAULT</span>
              </span>
              <span className="text-[10px] tracking-widest uppercase text-[var(--text-muted)] font-mono font-bold mt-0.5">
                DECOY & INTEL
              </span>
            </div>
          </Link>
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>

        {/* Columns 4-9: Links or Status */}
        <div className="hidden md:flex col-span-6 items-center justify-center gap-8">
          {user ? (
            <nav className="flex items-center gap-6">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-xs font-bold uppercase tracking-widest px-2 py-1 transition-colors ${
                      isActive
                        ? "text-[var(--accent-cobalt)] border-b-2 border-[var(--accent-cobalt)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          ) : (
            <div className="flex items-center gap-6 text-[11px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-none animate-pulse" />
                <span>SYSTEM: ONLINE</span>
              </div>
              <span className="text-[var(--border-color)]">|</span>
              <div className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-[var(--accent-cobalt)]" />
                <span>HONEYPOT MESH ACTIVE</span>
              </div>
            </div>
          )}
        </div>

        {/* Columns 10-12: Actions & User */}
        <div className="hidden md:flex col-span-3 items-center justify-end gap-4">
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/profile"
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] hover:text-[var(--accent-cobalt)]"
                title="View operator profile"
              >
                <User className="w-3.5 h-3.5" />
                <span className="truncate max-w-[120px]">{user.displayName}</span>
              </Link>
              <button
                onClick={handleLogout}
                type="button"
                className="p-1.5 border border-transparent hover:border-[var(--border-color)] text-[var(--text-muted)] hover:text-red-500 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-xs font-bold uppercase tracking-widest px-3 py-2 text-[var(--text-primary)] hover:text-[var(--accent-cobalt)]"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="poster-btn poster-btn-sm"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
