export class AppError extends Error {
  public readonly code: string;
  public readonly isTransient: boolean;
  public readonly recoverySteps: string[];

  constructor(message: string, code: string, isTransient: boolean, recoverySteps: string[] = []) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.isTransient = isTransient;
    this.recoverySteps = recoverySteps;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, isTransient: boolean = false) {
    super(message, 'DB_ERROR', isTransient, [
      'Ensure the database file is not locked by another process.',
      'Check if you have sufficient disk space and permissions.'
    ]);
  }
}

export class FileSystemError extends AppError {
  constructor(message: string, isTransient: boolean = false) {
    super(message, 'FS_ERROR', isTransient, [
      'Verify the file or directory exists and you have read/write permissions.',
      'Check if the path is correct.'
    ]);
  }
}

export class ErrorHandler {
  /**
   * Retry a function if it throws a transient error
   */
  public static async withRetry<T>(
    operation: () => Promise<T> | T,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: unknown;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        const isTransient = error instanceof AppError ? error.isTransient : false;
        
        if (!isTransient || attempt === maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)));
      }
    }
    
    throw lastError;
  }

  /**
   * Format error for UI display
   */
  public static formatError(error: unknown): string {
    if (error instanceof AppError) {
      let msg = `[${error.code}] ${error.message}`;
      if (error.recoverySteps.length > 0) {
        msg += '\n\nRecovery Options:\n' + error.recoverySteps.map(s => `- ${s}`).join('\n');
      }
      return msg;
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return String(error);
  }
}

/**
 * Decorator/Wrapper for use cases to handle uncaught exceptions gracefully
 */
export function withErrorGuard<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => TResult
): (...args: TArgs) => TResult {
  return (...args: TArgs): TResult => {
    try {
      return fn(...args);
    } catch (error) {
      console.error(ErrorHandler.formatError(error)); // For CLI/Logs
      throw error; // Re-throw to be handled by UI layer
    }
  };
}
