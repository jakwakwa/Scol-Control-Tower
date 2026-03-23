import type { FormType } from "@/db/schema";
import { FORM_TYPES } from "@/db/schema";

export interface FormConfig {
	type: FormType;
	title: string;
	description: string;
	stage: number;
}

export const INTERNAL_FORM_CONFIGS: FormConfig[] = [
	{
		type: "absa_6995",
		title: "Absa 6995 Pre-screening",
		description: "Mandatory bank assessment for collection facilities",
		stage: 3,
	},
];

export { FORM_TYPES };
