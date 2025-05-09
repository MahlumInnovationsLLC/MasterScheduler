import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development' || import.meta.env.DEV;

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  body?: any,
  headers?: Record<string, string>
): Promise<Response> {
  const defaultHeaders = {
    ...(body ? { "Content-Type": "application/json" } : {}),
    // Add a special header in development mode to signal the server
    ...(isDevelopment ? { "X-Development-Mode": "true" } : {}),
    ...(headers || {})
  };
  
  // Log request in development mode
  if (isDevelopment) {
    console.log(`🔧 Development mode API request: ${method} ${url}`);
  }
  
  const res = await fetch(url, {
    method,
    headers: defaultHeaders,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
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
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
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
      queryFn: getQueryFn({ on401: "throw" }),
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
