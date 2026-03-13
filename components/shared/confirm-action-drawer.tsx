"use client";

import type React from "react";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import AsyncActionButton from "@/components/shared/async-action-button";
import { Button } from "@/components/ui/button";

interface ConfirmActionDrawerProps {
	trigger: React.ReactNode;
	title: string;
	description: string;
	confirmLabel: string;
	cancelLabel?: string;
	disabled?: boolean;
	isLoading?: boolean;
	onConfirm: () => void | Promise<void>;
}

export default function ConfirmActionDrawer({
	trigger,
	title,
	description,
	confirmLabel,
	cancelLabel = "Cancel",
	disabled = false,
	isLoading = false,
	onConfirm,
}: ConfirmActionDrawerProps) {
	return (
		<Drawer>
			<DrawerTrigger asChild disabled={disabled}>
				{trigger}
			</DrawerTrigger>
			<DrawerContent>
				<div className="mx-auto w-full max-w-sm">
					<DrawerHeader>
						<DrawerTitle>{title}</DrawerTitle>
						<DrawerDescription>{description}</DrawerDescription>
					</DrawerHeader>
					<DrawerFooter>
						<AsyncActionButton
							label={confirmLabel}
							loadingLabel="Submitting..."
							isLoading={isLoading}
							onClick={onConfirm}
						/>
						<DrawerClose asChild>
							<Button variant="outline" disabled={isLoading}>
								{cancelLabel}
							</Button>
						</DrawerClose>
					</DrawerFooter>
				</div>
			</DrawerContent>
		</Drawer>
	);
}
