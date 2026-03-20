const PERIMETER_SCHEMA_VERSIONS: Record<string, string> = {
	"onboarding/lead.created": "v2",
	"sanctions/external.received": "v2",
};

export function getPerimeterSchemaVersion(perimeterId: string): string {
	return PERIMETER_SCHEMA_VERSIONS[perimeterId] || "v1";
}
