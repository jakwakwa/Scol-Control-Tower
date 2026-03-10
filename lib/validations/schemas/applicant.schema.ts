import { z } from "zod";

export const applicantSchema = z
	.object({
		companyName: z.string().trim().min(1, "Company name is required"),
		registrationNumber: z.string().trim().optional(),
		contactName: z.string().trim().min(1, "Contact name is required"),
		idNumber: z.string().trim().optional(),
		email: z.string().trim().min(1, "Email is required").email("Invalid email address"),
		phone: z.string().trim().optional(),
		entityType: z.string().trim().optional(),
		productType: z.string().trim().optional(),
		industry: z.string().trim().optional(),
		employeeCount: z.string().trim().optional(),
		estimatedTransactionsPerMonth: z.string().trim().optional(),
		mandateType: z.string().trim().optional(),
		notes: z.string().trim().optional(),
	})
	.superRefine((data, ctx) => {
		if (data.entityType === "proprietor") {
			if (!data.idNumber) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "ID number is required for Proprietors",
					path: ["idNumber"],
				});
			} else if (!/^\d{13}$/.test(data.idNumber)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "ID number must be exactly 13 digits",
					path: ["idNumber"],
				});
			}
		} else {
			if (!data.registrationNumber) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Registration number is required for Companies",
					path: ["registrationNumber"],
				});
			}
			if (data.idNumber && !/^\d{13}$/.test(data.idNumber)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "ID number must be exactly 13 digits",
					path: ["idNumber"],
				});
			}
		}
	});

export type ApplicantFormData = z.infer<typeof applicantSchema>;
