const MIN_IMAGE_BYTES = 30 * 1024;
const MIN_PDF_BYTES = 20 * 1024;
const MIN_IMAGE_WIDTH = 900;
const MIN_IMAGE_HEIGHT = 900;
const MIN_ENTROPY = 3.8;
const POR_MAX_AGE_DAYS = 93;

export interface DocumentQualityResult {
	ok: boolean;
	reasons: string[];
	warnings: string[];
}

export function evaluateDocumentQuality(
	fileName: string,
	mimeType: string,
	buffer: Buffer,
	options?: { enforceRecency?: boolean }
): DocumentQualityResult {
	const reasons: string[] = [];
	const warnings: string[] = [];

	if (mimeType.startsWith("image/")) {
		if (buffer.length < MIN_IMAGE_BYTES) {
			reasons.push("Image file is too small and likely illegible");
		}

		const dimensions = getImageDimensions(mimeType, buffer);
		if (!dimensions) {
			reasons.push("Could not read image dimensions");
		} else {
			if (dimensions.width < MIN_IMAGE_WIDTH || dimensions.height < MIN_IMAGE_HEIGHT) {
				reasons.push(
					`Image resolution too low (${dimensions.width}x${dimensions.height}); upload a clearer document`
				);
			}
		}

		const entropy = estimateEntropy(buffer);
		if (entropy < MIN_ENTROPY) {
			reasons.push("Image appears low-detail/blurry; upload a sharper document");
		}
	}

	if (mimeType === "application/pdf" && buffer.length < MIN_PDF_BYTES) {
		reasons.push("PDF file is too small and likely incomplete or unreadable");
	}

	if (options?.enforceRecency) {
		const fileDate = extractDateFromFileName(fileName);
		if (fileDate) {
			const ageInDays = Math.floor(
				(Date.now() - fileDate.getTime()) / (1000 * 60 * 60 * 24)
			);
			if (ageInDays > POR_MAX_AGE_DAYS) {
				reasons.push(
					`Document appears older than ${POR_MAX_AGE_DAYS} days based on filename date`
				);
			}
		} else {
			warnings.push(
				"Could not determine document issue date from filename; recency should be verified downstream"
			);
		}
	}

	return {
		ok: reasons.length === 0,
		reasons,
		warnings,
	};
}

function estimateEntropy(buffer: Buffer): number {
	const sampleSize = Math.min(buffer.length, 12000);
	const counts = new Array<number>(256).fill(0);

	for (let i = 0; i < sampleSize; i++) {
		counts[buffer[i]]++;
	}

	let entropy = 0;
	for (const count of counts) {
		if (count === 0) continue;
		const p = count / sampleSize;
		entropy -= p * Math.log2(p);
	}
	return entropy;
}

function getImageDimensions(
	mimeType: string,
	buffer: Buffer
): { width: number; height: number } | null {
	if (mimeType === "image/png") {
		return getPngDimensions(buffer);
	}
	if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
		return getJpegDimensions(buffer);
	}
	if (mimeType === "image/webp") {
		return getWebpDimensions(buffer);
	}
	return null;
}

function getPngDimensions(buffer: Buffer): { width: number; height: number } | null {
	if (buffer.length < 24) return null;
	if (buffer.toString("ascii", 1, 4) !== "PNG") return null;

	return {
		width: buffer.readUInt32BE(16),
		height: buffer.readUInt32BE(20),
	};
}

function getJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
	if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

	let offset = 2;
	while (offset + 9 < buffer.length) {
		if (buffer[offset] !== 0xff) {
			offset++;
			continue;
		}

		const marker = buffer[offset + 1];
		const segmentLength = buffer.readUInt16BE(offset + 2);
		if (segmentLength < 2) return null;

		// SOF0/SOF2 markers contain dimensions
		if (marker === 0xc0 || marker === 0xc2) {
			return {
				height: buffer.readUInt16BE(offset + 5),
				width: buffer.readUInt16BE(offset + 7),
			};
		}

		offset += 2 + segmentLength;
	}

	return null;
}

function getWebpDimensions(buffer: Buffer): { width: number; height: number } | null {
	if (buffer.length < 30) return null;
	if (buffer.toString("ascii", 0, 4) !== "RIFF") return null;
	if (buffer.toString("ascii", 8, 12) !== "WEBP") return null;

	const chunkType = buffer.toString("ascii", 12, 16);
	if (chunkType === "VP8X") {
		return {
			width: 1 + buffer.readUIntLE(24, 3),
			height: 1 + buffer.readUIntLE(27, 3),
		};
	}
	return null;
}

function extractDateFromFileName(fileName: string): Date | null {
	const normalized = fileName.replace(/_/g, "-").replace(/\./g, "-");
	const candidates = [
		/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/,
		/\b(\d{1,2})-(\d{1,2})-(20\d{2})\b/,
		/\b(\d{1,2})(\d{1,2})(20\d{2})\b/,
	];

	for (const pattern of candidates) {
		const match = normalized.match(pattern);
		if (!match) continue;

		let year: number;
		let month: number;
		let day: number;

		if (pattern === candidates[0]) {
			year = Number.parseInt(match[1], 10);
			month = Number.parseInt(match[2], 10);
			day = Number.parseInt(match[3], 10);
		} else {
			day = Number.parseInt(match[1], 10);
			month = Number.parseInt(match[2], 10);
			year = Number.parseInt(match[3], 10);
		}

		if (month < 1 || month > 12 || day < 1 || day > 31) continue;
		const parsed = new Date(Date.UTC(year, month - 1, day));
		if (!Number.isNaN(parsed.getTime())) return parsed;
	}

	return null;
}
