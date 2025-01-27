// app/page.tsx
// By default, this is a Server Component if there's no "use client" directive
import React from 'react';

export default function Home() {
    return (
        <main>
            <h1>Welcome to the Home Page</h1>
            <p>This is served by the new App Router in Next.js 13+</p>
        </main>
    );
}