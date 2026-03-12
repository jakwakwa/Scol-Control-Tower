/**
 * Common validation schemas and utilities shared across onboarding forms
 * Note: Using UK spelling throughout (e.g., authorisation, organisation)
 */
import { z } from "zod";

// ============================================
// Common Field Schemas
// ============================================

/**
 * South African ID number validation
 * Format: 13 digits, first 6 are date of birth
 */
export const saIdNumberSchema = z
	.string()
	.min(1, "ID number is required")
	.regex(/^\d{13}$/, "ID number must be exactly 13 digits");

/**
 * South African phone number
 */
export const phoneNumberSchema = z
	.string()
	.min(1, "Telephone number is required")
	.regex(
		/^(\+27|0)[1-9][0-9]{8}$/,
		"Please enter a valid South African telephone number"
	);

/**
 * Email validation
 */
export const emailSchema = z
	.string()
	.min(1, "Email address is required")
	.email("Please enter a valid email address");

/**
 * Website URL validation
 */
export const websiteSchema = z
	.string()
	.min(1, "Website address is required")
	.url("Please enter a valid website URL");

/**
 * Postal code validation (South African)
 */
export const postalCodeSchema = z
	.string()
	.min(1, "Postal code is required")
	.regex(/^\d{4}$/, "Postal code must be 4 digits");

/**
 * Company registration number
 */
export const registrationNumberSchema = z
	.string()
	.min(1, "Registration number is required")
	.regex(
		/^\d{4}\/\d{6}\/\d{2}$/,
		"Please enter a valid company registration number (e.g., 2024/123456/07)"
	);

/**
 * Bank account number
 */
export const accountNumberSchema = z
	.string()
	.min(1, "Account number is required")
	.regex(/^\d{6,16}$/, "Account number must be between 6 and 16 digits");

/**
 * Branch code validation
 */
export const branchCodeSchema = z
	.string()
	.min(1, "Branch code is required")
	.regex(/^\d{6}$/, "Branch code must be 6 digits");

// ============================================
// Address Schema
// ============================================

export const addressSchema = z.object({
	address: z.string().min(1, "Address is required"),
	suburb: z.string().min(1, "Suburb is required"),
	townCity: z.string().min(1, "Town/City is required"),
	postalCode: postalCodeSchema,
});

export type Address = z.infer<typeof addressSchema>;

// ============================================
// Director Schema
// ============================================

export const directorSchema = z.object({
	fullName: z.string().min(1, "Full name is required"),
	idNumber: saIdNumberSchema,
});

export type Director = z.infer<typeof directorSchema>;

// ============================================
// Banking Details Schema
// ============================================

export const bankingDetailsSchema = z.object({
	bankName: z.string().min(1, "Bank name is required"),
	accountType: z.string().min(1, "Account type is required"),
	branchCode: branchCodeSchema,
	accountNumber: accountNumberSchema,
	accountName: z.string().optional(),
});

export type BankingDetails = z.infer<typeof bankingDetailsSchema>;

// ============================================
// Signature Schema
// ============================================

export const signatureSchema = z.object({
	name: z.string().min(1, "Name is required"),
	signature: z.string().min(1, "Signature is required"),
	date: z.string().min(1, "Date is required"),
});

export type Signature = z.infer<typeof signatureSchema>;

// ============================================
// Reference Schema (for Absa references)
// ============================================

export const referenceSchema = z.object({
	name: z.string().optional(),
	accountNumber: z.string().optional(),
	reference: z.string().optional(),
});

export type Reference = z.infer<typeof referenceSchema>;

// ============================================
// Utility Functions
// ============================================

/**
 * Create an optional version of a schema that allows empty strings
 */
export function optionalString() {
	return z.string().optional().or(z.literal(""));
}

/**
 * Create a percentage field (0-100)
 */
export function percentageSchema(fieldName: string) {
	return z
		.string()
		.optional()
		.refine(
			val => {
				if (!val || val === "") return true;
				const num = parseFloat(val);
				return !Number.isNaN(num) && num >= 0 && num <= 100;
			},
			{ message: `${fieldName} must be between 0 and 100` }
		);
}

/**
 * Create a currency amount field
 */
export function currencySchema(fieldName: string) {
	return z
		.string()
		.optional()
		.refine(
			val => {
				if (!val || val === "") return true;
				const num = parseFloat(val.replace(/[R,\s]/g, ""));
				return !Number.isNaN(num) && num >= 0;
			},
			{ message: `${fieldName} must be a valid amount` }
		);
}
