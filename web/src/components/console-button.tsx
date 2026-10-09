"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

interface ConsoleButtonProps {
  className?: string;
  children?: React.ReactNode;
  initialLoggedIn?: boolean;
}

export function ConsoleButton({
  className = "poster-btn whitespace-nowrap",
  children,
  initialLoggedIn = false,
}: ConsoleButtonProps) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(initialLoggedIn);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    // Check client session to keep link href updated
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        setIsLoggedIn(!!data?.user);
      })
      .catch(() => {
        setIsLoggedIn(false);
      });
  }, []);

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (navigating) return;
    setNavigating(true);

    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data?.user) {
        router.push("/dashboard");
      } else {
        router.push("/login?redirect=/dashboard");
      }
    } catch {
      router.push("/login?redirect=/dashboard");
    } finally {
      setTimeout(() => setNavigating(false), 1500);
    }
  };

  const href = isLoggedIn ? "/dashboard" : "/login?redirect=/dashboard";

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={className}
    >
      {children ? (
        children
      ) : (
        <>
          <span>{navigating ? "Entering Console..." : "Enter Console"}</span>
          <ArrowRight className="w-4 h-4" />
        </>
      )}
    </Link>
  );
}
