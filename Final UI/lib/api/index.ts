const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface RequestOptions extends RequestInit {
  // Custom options can be added here if needed
}

async function request<T>(endpoint: string, options?: RequestOptions): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  console.log('[API Service] NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
  console.log('[API Service] Attempting to fetch full URL:', url);

  const defaultHeaders: HeadersInit = {}; // Initialize empty

  // Conditionally set Content-Type for JSON, but not for FormData
  if (!(options?.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  // Prepare body: stringify if it's an object and not FormData
  let processedBody: BodyInit | null | undefined = options?.body;
  if (options?.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    processedBody = JSON.stringify(options.body);
  } else {
    processedBody = options?.body; // Use as is if FormData, string, null, undefined, etc.
  }

  const config: RequestInit = {
    method: options?.method || 'GET', // Ensure method is set, default to GET
    ...options, // Spread options first
    headers: { // Then override headers, ensuring defaultHeaders are applied correctly
      ...defaultHeaders,
      ...options?.headers,
    },
    body: processedBody, // Use the processed body
  };

  // Remove body from config if method is GET or HEAD as they cannot have a body
  if (config.method === 'GET' || config.method === 'HEAD') {
    delete config.body;
  }

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // If response is not JSON, use status text
        errorData = { message: response.statusText || `HTTP error! status: ${response.status}` };
      }
      const error: any = new Error(errorData?.message || `HTTP error! status: ${response.status} ${response.statusText}`);
      error.status = response.status;
      error.data = errorData; // Attach original error data if available
      throw error;
    }

    if (response.status === 204) { // No Content
      return undefined as T;
    }

    // Check if response is JSON before trying to parse
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json() as Promise<T>;
    }
    // Handle non-JSON responses, e.g. plain text or empty
    // For this project, assuming most actual data responses are JSON or empty.
    // If plain text is expected for some endpoints, this might need more specific handling.
    return response.text() as unknown as Promise<T>;

  } catch (error) {
    console.error('API Service Request Error:', error);
    // Ensure the re-thrown error is an actual Error object for consistent handling upstream
    if (error instanceof Error) {
        throw error;
    } else {
        throw new Error(String(error) || 'An unknown API error occurred');
    }
  }
}

// Specific API functions will be added below this

export const registerUser = async (userData: any) => { // TODO: Define UserData type
  return request<any>('/auth/register', { // TODO: Define RegisterResponse type
    method: 'POST',
    body: userData, // Pass object directly, request function will stringify
  });
};

export const loginUser = async (credentials: any) => { // TODO: Define Credentials type
  return request<any>('/auth/login', { // TODO: Define LoginResponse type (e.g., { token: string; user: User })
    method: 'POST',
    body: credentials, // Pass object directly
  });
};

export const getCurrentUser = async (token: string) => {
  return request<any>('/users/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
};

export const updateUserProfile = async (profileData: any, token: string) => {
  return request<any>('/users/profile', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: profileData, // Pass object directly
  });
};

export const updateUserPreferences = async (preferencesData: any, token: string) => {
  return request<any>('/users/preferences', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: preferencesData, // Pass object directly
  });
};

export const updateUserCulture = async (cultureData: any, token: string) => {
  return request<any>('/users/culture', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: cultureData, // Pass object directly
  });
};

export const uploadUserResume = async (formData: FormData, token: string) => {
  return request<any>('/users/resume', {
    method: 'POST',
    headers: {
      // Content-Type is deliberately omitted here for FormData.
      // The modified `request` function will handle this.
      'Authorization': `Bearer ${token}`,
    },
    body: formData, // Pass FormData directly
  });
};

export const markUserAsVerified = async (token: string) => {
  return request<any>('/auth/mark-as-verified', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    // No body needed for this specific request if backend uses token for user ID
  });
};

// New function for Firebase social login
export const loginWithFirebaseToken = async (firebaseToken: string) => {
  // This endpoint (/auth/firebase-login) needs to be created on your backend.
  // It should verify the firebaseToken, find or create a user, and return
  // your application's JWT and user data, similar to the standard /auth/login.
  return request<any>('/auth/firebase-login', { // TODO: Define specific LoginResponse type
    method: 'POST',
    body: { token: firebaseToken }, // Sending the Firebase ID token in the request body
  });
};
