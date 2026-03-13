"use client";

import { RiCheckLine, RiLoader4Line } from "@remixicon/react";
import type React from "react";
import { Button } from "@/components/ui/button";

interface AsyncActionButtonProps
	extends Omit<React.ComponentProps<typeof Button>, "children" | "onClick"> {
	label: string;
	loadingLabel?: string;
	completedLabel?: string;
	isLoading: boolean;
	isCompleted?: boolean;
	hideWhenCompleted?: boolean;
	onClick?: () => void | Promise<void>;
}

export default function AsyncActionButton({
	label,
	loadingLabel,
	completedLabel,
	isLoading,
	isCompleted = false,
	hideWhenCompleted = false,
	onClick,
	disabled,
	...buttonProps
}: AsyncActionButtonProps) {
	if (hideWhenCompleted && isCompleted) {
		return null;
	}

	const isDisabled = Boolean(disabled || isLoading || isCompleted);
	const text = isLoading
		? (loadingLabel ?? "Processing...")
		: isCompleted
			? (completedLabel ?? "Completed")
			: label;

	return (
		<Button {...buttonProps} disabled={isDisabled} onClick={onClick}>
			{isLoading ? (
				<RiLoader4Line className="h-4 w-4 animate-spin" />
			) : isCompleted ? (
				<RiCheckLine className="h-4 w-4" />
			) : null}
			{text}
		</Button>
	);
}
