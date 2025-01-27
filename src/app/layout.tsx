"use client"; // We need client-side hooks

import {useEffect} from "react";
import {useRouter} from "next/navigation";
import "../assets/styles/fonts.scss"

export default function ProtectedLayout({children}: { children: React.ReactNode }) {
    const router = useRouter();

    useEffect(() => {
        const token = sessionStorage.getItem("token");
        const isAuthenticated = !!token;

        if (!isAuthenticated) {
            router.push("/login");
        }
    }, [router]);

    // If we need a loading or skeleton state before redirect, we can do so here
    return (
        <html lang="en">
        <body>{children}</body>
        </html>
    );
}