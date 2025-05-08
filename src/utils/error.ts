/**
 * Error handling utilities for Recastra
 */

/**
 * Safely executes a function and handles any errors
 * @param fn - The function to execute
 * @param errorMessage - The error message to use if the function throws
 * @param fallback - Optional fallback value to return if the function throws
 * @returns The result of the function or the fallback value
 */
export function safeExecute<T>(fn: () => T, errorMessage: string, fallback?: T): T {
  try {
    return fn();
  } catch (error) {
    console.error(errorMessage, error);
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Safely executes an async function and handles any errors
 * @param fn - The async function to execute
 * @param errorMessage - The error message to use if the function throws
 * @param fallback - Optional fallback value to return if the function throws
 * @returns Promise resolving to the result of the function or the fallback value
 */
export async function safeExecuteAsync<T>(
  fn: () => Promise<T>,
  errorMessage: string,
  fallback?: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(errorMessage, error);
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Creates a timeout promise that rejects after a specified time
 * @param ms - The timeout in milliseconds
 * @param message - The error message to use when the timeout is reached
 * @returns A promise that rejects after the specified time
 */
export function createTimeout<T>(ms: number, message: string): Promise<T> {
  return new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

/**
 * Executes a function with a timeout
 * @param fn - The function to execute
 * @param timeoutMs - The timeout in milliseconds
 * @param timeoutMessage - The error message to use when the timeout is reached
 * @returns Promise resolving to the result of the function
 */
export async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  return Promise.race([fn(), createTimeout<T>(timeoutMs, timeoutMessage)]);
}
