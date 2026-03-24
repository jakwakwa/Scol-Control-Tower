"use client";

/**
 * SignatureCanvas Component
 * A canvas-based signature capture component with touch and mouse support
 * Note: Using UK spelling throughout (e.g., colour, centre)
 */

import type * as React from "react";
import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { RiEraserLine, RiCheckLine, } from "@remixicon/react";

interface SignatureCanvasProps {
	/** Callback when signature is saved */
	onSave: (dataUrl: string) => void;
	/** Callback when signature is cleared */
	onClear?: () => void;
	/** Canvas width in pixels */
	width?: number;
	/** Canvas height in pixels */
	height?: number;
	/** Line colour for signature */
	strokeColour?: string;
	/** Line width for signature */
	strokeWidth?: number;
	/** Background colour */
	backgroundColour?: string;
	/** Label text */
	label?: string;
	/** Whether the signature is required */
	required?: boolean;
	/** Error message to display */
	error?: string;
	/** Initial signature data URL (for editing) */
	initialValue?: string;
	/** Disabled state */
	disabled?: boolean;
	/** Additional class names */
	className?: string;
}

export function SignatureCanvas({
	onSave,
	onClear,
	width = 400,
	height = 150,
	strokeColour = "#1a1a1a",
	strokeWidth = 2,
	backgroundColour = "#ffffff",
	label = "Signature",
	required = false,
	error,
	initialValue,
	disabled = false,
	className,
}: SignatureCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [isDrawing, setIsDrawing] = useState(false);
	const [hasSignature, setHasSignature] = useState(false);
	const [lastPosition, setLastPosition] = useState<{
		x: number;
		y: number;
	} | null>(null);

	// Initialise canvas
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Set canvas size
		canvas.width = width;
		canvas.height = height;

		// Fill background
		ctx.fillStyle = backgroundColour;
		ctx.fillRect(0, 0, width, height);

		// Load initial value if provided
		if (initialValue) {
			const img = new Image();
			img.onload = () => {
				ctx.drawImage(img, 0, 0);
				setHasSignature(true);
			};
			img.src = initialValue;
		}
	}, [width, height, backgroundColour, initialValue]);

	// Get position from event (works for both mouse and touch)
	const getPosition = useCallback(
		(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
			const canvas = canvasRef.current;
			if (!canvas) return { x: 0, y: 0 };

			const rect = canvas.getBoundingClientRect();
			const scaleX = canvas.width / rect.width;
			const scaleY = canvas.height / rect.height;

			if ("touches" in e) {
				const touch = e.touches[0];
				if (!touch) return { x: 0, y: 0 };
				return {
					x: (touch.clientX - rect.left) * scaleX,
					y: (touch.clientY - rect.top) * scaleY,
				};
			}

			return {
				x: (e.clientX - rect.left) * scaleX,
				y: (e.clientY - rect.top) * scaleY,
			};
		},
		[]
	);

	// Start drawing
	const handleStart = useCallback(
		(e: React.MouseEvent | React.TouchEvent) => {
			if (disabled) return;

			e.preventDefault();
			setIsDrawing(true);
			setLastPosition(getPosition(e));
		},
		[disabled, getPosition]
	);

	// Draw
	const handleMove = useCallback(
		(e: React.MouseEvent | React.TouchEvent) => {
			if (!isDrawing || disabled) return;

			e.preventDefault();
			const canvas = canvasRef.current;
			const ctx = canvas?.getContext("2d");
			if (!(ctx && lastPosition)) return;

			const currentPosition = getPosition(e);

			ctx.beginPath();
			ctx.strokeStyle = strokeColour;
			ctx.lineWidth = strokeWidth;
			ctx.lineCap = "round";
			ctx.lineJoin = "round";
			ctx.moveTo(lastPosition.x, lastPosition.y);
			ctx.lineTo(currentPosition.x, currentPosition.y);
			ctx.stroke();

			setLastPosition(currentPosition);
			setHasSignature(true);
		},
		[isDrawing, disabled, lastPosition, getPosition, strokeColour, strokeWidth]
	);

	// Stop drawing
	const handleEnd = useCallback(() => {
		setIsDrawing(false);
		setLastPosition(null);
	}, []);

	// Clear signature
	const handleClear = useCallback(() => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (!(ctx && canvas)) return;

		ctx.fillStyle = backgroundColour;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		setHasSignature(false);
		onClear?.();
	}, [backgroundColour, onClear]);

	// Save signature
	const handleSave = useCallback(() => {
		const canvas = canvasRef.current;
		if (!(canvas && hasSignature)) return;

		const dataUrl = canvas.toDataURL("image/png");
		onSave(dataUrl);
	}, [hasSignature, onSave]);

	// Handle touch events to prevent scrolling while drawing
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const preventScroll = (e: TouchEvent) => {
			if (isDrawing) {
				e.preventDefault();
			}
		};

		canvas.addEventListener("touchmove", preventScroll, { passive: false });

		return () => {
			canvas.removeEventListener("touchmove", preventScroll);
		};
	}, [isDrawing]);

	return (
		<div className={cn("space-y-2", className)}>
			{label && (
				<Label className="text-sm font-medium text-foreground">
					{label}
					{required && <span className="text-destructive ml-1">*</span>}
				</Label>
			)}

			<div
				className={cn(
					"relative rounded-lg border-2 border-dashed transition-colors",
					error ? "border-destructive" : "border-border",
					disabled ? "opacity-50 cursor-not-allowed" : "cursor-crosshair",
					!hasSignature && "bg-muted/30"
				)}>
				<canvas
					ref={canvasRef}
					className="rounded-lg w-full"
					style={{
						maxWidth: width,
						height: "auto",
						aspectRatio: `${width}/${height}`,
						touchAction: "none",
					}}
					onMouseDown={handleStart}
					onMouseMove={handleMove}
					onMouseUp={handleEnd}
					onMouseLeave={handleEnd}
					onTouchStart={handleStart}
					onTouchMove={handleMove}
					onTouchEnd={handleEnd}
				/>

				{/* Placeholder text when empty */}
				{!(hasSignature || disabled ) && (
					<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
						<p className="text-muted-foreground text-sm">
							Sign here using your mouse or touch
						</p>
					</div>
				)}
			</div>

			{/* Action buttons */}
			<div className="flex items-center gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={handleClear}
					disabled={disabled || !hasSignature}
					className="gap-1.5">
					<RiEraserLine className="h-4 w-4" />
					Clear
				</Button>

				<Button
					type="button"
					variant="default"
					size="sm"
					onClick={handleSave}
					disabled={disabled || !hasSignature}
					className="gap-1.5">
					<RiCheckLine className="h-4 w-4" />
					Confirm Signature
				</Button>
			</div>

			{/* Error message */}
			{error && <p className="text-sm text-destructive">{error}</p>}

			{/* Helper text */}
			<p className="text-xs text-muted-foreground">
				By signing above, you confirm that you are the authorised signatory.
			</p>
		</div>
	);
}

// ============================================
// Signature Display Component (Read-only)
// ============================================

interface SignatureDisplayProps {
	/** Signature data URL */
	dataUrl: string;
	/** Signatory name */
	name?: string;
	/** Date signed */
	date?: string;
	/** Label */
	label?: string;
	/** Additional class names */
	className?: string;
}

export function SignatureDisplay({
	dataUrl,
	name,
	date,
	label = "Signature",
	className,
}: SignatureDisplayProps) {
	return (
		<div className={cn("space-y-2", className)}>
			{label && <Label className="text-sm font-medium text-foreground">{label}</Label>}

			<div className="rounded-lg border border-border bg-muted/30 p-4">
				<img src={dataUrl} alt="Signature" className="max-w-full h-auto rounded" />

				{(name || date) && (
					<div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
						{name && <span>{name}</span>}
						{date && <span>{date}</span>}
					</div>
				)}
			</div>
		</div>
	);
}
