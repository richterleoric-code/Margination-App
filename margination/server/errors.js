// Errors that are safe to show to the reader. `message` is user-facing.
export class AppError extends Error {
  constructor(code, message, status = 500) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }
}
