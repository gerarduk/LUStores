import { useQuery } from "@tanstack/react-query";
import { getCurrentUser, getAuthToken, clearAuthToken } from '../utils/auth';
export function useAuth() {
    const { data: user, isLoading, error } = useQuery({
        queryKey: ["/api/auth/user"],
        queryFn: async () => {
            try {
                return await getCurrentUser();
            }
            catch (error) {
                // Handle authentication errors
                if (error.message.includes('Failed to get user info')) {
                    // Clear invalid token and return null (unauthenticated)
                    clearAuthToken();
                    return null;
                }
                throw error;
            }
        },
        retry: false,
    });
    // Debug logging for development
    if (process.env.NODE_ENV === 'development') {
        console.log('🔐 Auth query result:', { user, isLoading, error, hasToken: !!getAuthToken() });
    }
    return {
        user,
        isLoading,
        isAuthenticated: !!user,
    };
}
