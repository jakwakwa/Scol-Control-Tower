import {
	RiBankCardLine,
	RiExchangeDollarLine,
	RiHandCoinLine,
	RiSecurePaymentLine,
} from "@remixicon/react";

export const MANDATE_TYPES = [
	{ value: "debit_order", label: "Debit Order", icon: RiBankCardLine },
	{
		value: "eft_collection",
		label: "EFT Collection",
		icon: RiExchangeDollarLine,
	},
	{
		value: "realtime_clearing",
		label: "Realtime Clearing",
		icon: RiSecurePaymentLine,
	},
	{
		value: "managed_collection",
		label: "Managed Collection",
		icon: RiHandCoinLine,
	},
];
