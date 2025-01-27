// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';
//
// export function middleware(req: NextRequest) {
//     const token = req.cookies.get('token'); // Fetch token from cookies
//     const isAuthenticated = !!token;
//
//     const loginPath = '/login';
//     const homePath = '/home';
//
//     // Redirect unauthenticated users to the login page
//     if (!isAuthenticated && req.nextUrl.pathname !== loginPath) {
//         return NextResponse.redirect(new URL(loginPath, req.url));
//     }
//
//     // Redirect authenticated users from login page to the home page
//     if (isAuthenticated && req.nextUrl.pathname === loginPath) {
//         return NextResponse.redirect(new URL(homePath, req.url));
//     }
//
//     // Allow the request to continue for authenticated users
//     return NextResponse.next();
// }


import {NextRequest, NextResponse} from 'next/server';

export const config = {
    matcher: ['/home', '/login'], // Add paths to apply middleware
};

export function middleware(request: NextRequest) {
    const token = request.cookies.get('token')?.value || request.headers.get('Authorization');
    const isAuthenticated = !!token;

    const {pathname} = request.nextUrl;

    // Redirect unauthenticated users to `/login`
    if (!isAuthenticated && pathname !== '/login') {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // If authenticated users go to `/login`, redirect them to `/home`
    if (isAuthenticated && pathname === '/login') {
        return NextResponse.redirect(new URL('/home', request.url));
    }

    // Otherwise continue
    return NextResponse.next();
}