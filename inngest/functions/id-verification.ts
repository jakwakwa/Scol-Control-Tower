import { processIdentityVerification } from "@/app/actions/verify-id";
import { inngest } from "../client";

/**
 * Automated Identity Verification
 * 
 * Listens for individual document uploads. If the document is an identity
 * document, it triggers the Google Cloud Document AI Identity Proofing processor.
 */
export const autoVerifyIdentity = inngest.createFunction(
  { id: "auto-verify-identity", name: "Automated Identity Verification" },
  { event: "document/uploaded" },
  async ({ event, step }) => {
    const { applicantId, documentId, documentType } = event.data;

    // Filter for identity document types
    const idTypes = ["ID_DOCUMENT", "PROPRIETOR_ID", "DIRECTOR_ID", "FICA_ID"];
    
    if (!idTypes.includes(documentType)) {
      return { skipped: true, reason: "Not an identity document type", documentType };
    }

    const result = await step.run("verify-identity-document", async () => {
      return await processIdentityVerification(applicantId, documentId);
    });

    if ("error" in result && result.error) {
      throw new Error(`Identity verification failed: ${result.error}`);
    }

    const entitiesFound =
      "data" in result ? result.data?.entities?.length || 0 : 0;

    return { 
      status: "completed", 
      applicantId, 
      documentId, 
      entitiesFound
    };
  }
);
