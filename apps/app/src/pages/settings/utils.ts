// API Error types
interface ApiErrorResponse {
  error: string;
  planLimits?: {
    userLimit: string;
    invitationLimit: string;
    currentUsers: number;
    pendingInvitations: number;
  };
}

interface ApiError extends Error {
  response?: {
    data: ApiErrorResponse;
    status: number;
    statusText: string;
  };
}

// Helper function to extract error message from API response
export const extractErrorMessage = (error: unknown): string => {
  let errorMessage = "An error occurred";

  if (error && typeof error === "object" && "response" in error) {
    const apiError = error as ApiError;
    if (apiError.response?.data?.error) {
      errorMessage = apiError.response.data.error;

      if (apiError.response.data.planLimits) {
        const limits = apiError.response.data.planLimits;
        errorMessage += `. ${limits.userLimit}. Current: ${limits.currentUsers} users, ${limits.pendingInvitations} pending invitations.`;
      }
    } else if (apiError.response?.statusText) {
      errorMessage = `${errorMessage}: ${apiError.response.statusText}`;
    }
  } else if (error && typeof error === "object" && "message" in error) {
    const genericError = error as Error;
    errorMessage = genericError.message;
  }

  return errorMessage;
};
