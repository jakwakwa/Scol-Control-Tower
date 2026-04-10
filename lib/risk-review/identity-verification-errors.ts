const NON_RETRIABLE_IDENTITY_ERROR_PATTERNS = [
    /PAGE_LIMIT_EXCEEDED/i,
    /Document pages exceed the limit/i,
    /UNSUPPORTED_FILE_TYPE/i,
    /INVALID_ARGUMENT.*[Uu]nable to process/i,
    /INVALID_ARGUMENT.*[Uu]nsupported/i,
    /INVALID_ARGUMENT.*[Ii]nvalid image content/i,
    /INVALID_ARGUMENT.*[Nn]o text detected/i,
];

export function isNonRetriableIdentityError(errorMessage: string): boolean {
    return NON_RETRIABLE_IDENTITY_ERROR_PATTERNS.some(pattern =>
        pattern.test(errorMessage)
    );
}
