export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
  ) {
    console.log(message);
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    console.log(message);
    super(message, 400);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "No autorizado") {
    console.log(message);
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Permiso denegado") {
    console.log(message);
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Recurso no encontrado") {
    console.log(message);
    super(message, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    console.log(message);
    super(message, 409);
    this.name = "ConflictError";
  }
}
