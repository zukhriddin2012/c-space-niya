// SEC-020: Centralized error sanitization
// Maps internal errors to user-friendly messages. Never expose stack traces or DB details.

export interface SanitizedError {
  message: string;
  status: number;
}

export function sanitizeError(error: unknown): SanitizedError {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    // Auth errors
    if (msg.includes('jwt') || msg.includes('token')) {
      return { message: 'Your session has expired. Please sign in again.', status: 401 };
    }
    if (msg.includes('permission') || msg.includes('forbidden')) {
      return { message: 'You don\'t have permission to perform this action.', status: 403 };
    }
    if (msg.includes('rate limit') || msg.includes('too many')) {
      return { message: 'Too many requests. Please wait before trying again.', status: 429 };
    }
    if (msg.includes('csrf')) {
      return { message: 'Your request couldn\'t be verified. Please refresh and try again.', status: 403 };
    }

    // Auth failures
    if (msg.includes('authentication') || msg.includes('credentials') || msg.includes('bcrypt')) {
      return { message: 'Authentication failed. Please try again.', status: 401 };
    }

    // Network/DB errors
    if (msg.includes('network') || msg.includes('timeout') || msg.includes('econnrefused')) {
      return { message: 'Unable to reach the server. Check your connection.', status: 503 };
    }

    // Validation errors
    if (msg.includes('validation') || msg.includes('invalid') || msg.includes('required')) {
      return { message: 'Please check your input and try again.', status: 400 };
    }
  }

  // Default: never expose internal details
  return { message: 'Something went wrong. Please try again later.', status: 500 };
}

// Map HTTP status codes to toast-friendly messages
export function getErrorMessage(status: number): string {
  switch (status) {
    case 400: return 'Please check your input and try again.';
    case 401: return 'Your session has expired. Please sign in again.';
    case 403: return 'You don\'t have permission to perform this action.';
    case 404: return 'The requested resource was not found.';
    case 429: return 'Too many requests. Please wait before trying again.';
    case 503: return 'Service temporarily unavailable. Please try again later.';
    default: return 'Something went wrong. Please try again later.';
  }
}
