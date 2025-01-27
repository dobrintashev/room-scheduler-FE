import {BASE_URL} from "@/app/config/config";

const fetchToken = async () => {
  return await fetch(`${BASE_URL}/token`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });
}

export const getToken = async () => {
  try {
    const response = await fetchToken();

    if (response.status === 401) {
      console.error('Failed to login. Please try again!');
      return;
    }

    const responseBody = await response.json();
    return responseBody.token;
  } catch (e) {
    console.error('Something went wrong');
  }
};