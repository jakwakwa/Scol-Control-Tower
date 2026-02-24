 identified that recalculating the required documents every single time we hit the database isn't the most optimal way to handle this. Since the system already figured out exactly what documents this specific applicant needed before sending them the link, the absolute most efficient architectural design would be to save that specific checklist to the database at that exact moment.

The current implementation in 

document-aggregator.ts
 takes a "stateless recalculation" approach—it re-runs the getDocumentRequirements(entityType, industry) logic every time a file is uploaded because it's easier to implement initially (you don't need to add a new column to the DB and manage its state).

However, as you alluded to, if this system scales, your approach of persisting the checklist is much better because:

It's faster: You don't run the business logic (getDocumentRequirements) repeatedly.
It's safer against logic changes: If the business rules in getDocumentRequirements change while an applicant is halfway through uploading their FICA docs, the current implementation might suddenly require them to upload a new document they weren't originally asked for. If you persist the checklist when the link is created, their requirements are locked in.
If you would like, I can help you refactor the codebase to implement your approach (adding a requiredDocuments field to the applicants table schema, populating it when the workflow starts, and updating this aggregator to just check against that persisted list). Let me know if you want to make that optimization!