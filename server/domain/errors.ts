/** Errors raised by the domain layer. Messages are i18n keys, never raw SQL or stack traces. */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(code);
    this.name = "DomainError";
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string) {
    super("errors.notFound", { entity });
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends DomainError {
  constructor(permission?: string) {
    super("errors.forbidden", permission ? { permission } : undefined);
    this.name = "ForbiddenError";
  }
}

export class InvalidTransitionError extends DomainError {
  constructor(entity: string, from: string, to: string) {
    super("errors.invalidTransition", { entity, from, to });
    this.name = "InvalidTransitionError";
  }
}
