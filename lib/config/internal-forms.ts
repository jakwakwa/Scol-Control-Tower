import { FORM_TYPES } from "@/db/schema";
import type { FormType } from "@/db/schema";

export interface FormConfig {
	type: FormType;
	title: string;
	description: string;
	stage: number;
}

export const INTERNAL_FORM_CONFIGS: FormConfig[] = [
	{
		type: "stratcol_agreement",
		title: "StratCol Agreement",
		description:
			"Core contract establishing legal relationship and entity data",
		stage: 2,
	},
	{
		type: "absa_6995",
		title: "Absa 6995 Pre-screening",
		description: "Mandatory bank assessment for collection facilities",
		stage: 3,
	},
];

export { FORM_TYPES };
