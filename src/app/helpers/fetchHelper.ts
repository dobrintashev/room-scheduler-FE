import {PREFERRED_TIMEZONE} from "@/app/constants/home";

export const fetchHelper = async (url: string, token: string, body?: object) => {
    try {
        const options: RequestInit = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Prefer': PREFERRED_TIMEZONE,
                Authorization: `Bearer ${token}`,
            },
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            throw new Error(`Fetch error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error in fetchHelper:', error);
        throw error; // Propagate the error for further handling
    }
};