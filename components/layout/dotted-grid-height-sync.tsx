"use client";

import { useEffect, useRef } from "react";

const getDocumentHeight = (): number => {
	const { body, documentElement } = document;
	return Math.max(
		body.scrollHeight,
		body.offsetHeight,
		documentElement.scrollHeight,
		documentElement.offsetHeight,
		documentElement.clientHeight
	);
};

export default function DottedGridHeightSync() {
	const containerRef = useRef<HTMLElement | null>(null);
	const resizeObserverRef = useRef<ResizeObserver | null>(null);
	const mutationObserverRef = useRef<MutationObserver | null>(null);
	const rafRef = useRef<number | null>(null);

	useEffect(() => {
		containerRef.current = document.body;

		const syncHeight = () => {
			if (!containerRef.current) {
				return;
			}

			const nextHeight = `${getDocumentHeight()}px`;
			containerRef.current.style.setProperty("--dotted-grid-dynamic-height", nextHeight);
		};

		const scheduleSync = () => {
			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current);
			}
			rafRef.current = requestAnimationFrame(() => {
				syncHeight();
				rafRef.current = null;
			});
		};

		syncHeight();
		scheduleSync();

		window.addEventListener("resize", scheduleSync);
		window.addEventListener("load", scheduleSync);

		resizeObserverRef.current = new ResizeObserver(scheduleSync);
		resizeObserverRef.current.observe(document.documentElement);
		resizeObserverRef.current.observe(document.body);

		mutationObserverRef.current = new MutationObserver(scheduleSync);
		mutationObserverRef.current.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
		});

		return () => {
			window.removeEventListener("resize", scheduleSync);
			window.removeEventListener("load", scheduleSync);

			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current);
			}

			resizeObserverRef.current?.disconnect();
			mutationObserverRef.current?.disconnect();
		};
	}, []);

	return null;
}
