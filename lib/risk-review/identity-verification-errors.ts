const NON_RETRIABLE_IDENTITY_ERROR_PATTERNS = [
	/PAGE_LIMIT_EXCEEDED/i,
	/Document pages exceed the limit/i,
];

export function isNonRetriableIdentityError(errorMessage: string): boolean {
	return NON_RETRIABLE_IDENTITY_ERROR_PATTERNS.some(pattern =>
		pattern.test(errorMessage)
	);
}
