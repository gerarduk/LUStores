import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAuthToken } from "../utils/auth";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = getAuthToken();
  
  const headers: Record<string, string> = { 
    "Accept": "application/json",
    ...(data ? { "Content-Type": "application/json" } : {})
  };
  
  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log(`🔐 apiRequest to ${url}:`, { 
      method, 
      hasToken: !!token, 
      tokenPrefix: token.substring(0, 20) + '...'
    });
  } else {
    console.warn(`⚠️ No auth token found for apiRequest to ${url}`);
    console.warn(`⚠️ Available localStorage keys:`, Object.keys(localStorage));
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = getAuthToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add Authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
        console.log(`🔐 getQueryFn for ${queryKey[0]}:`, { 
          hasToken: !!token, 
          tokenPrefix: token.substring(0, 10) 
        });
      }
    } else {
      console.warn(`⚠️ No auth token found for query ${queryKey[0]}`);
    }
    
    const res = await fetch(queryKey[0] as string, {
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
