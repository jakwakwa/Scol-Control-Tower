# ProcureCheck API credentials – request for Stratcol

**Purpose:** You can send the text below (or this file) to your Stratcol contact so they know exactly what to ask for. No technical jargon.

**Reality check:** Stratcol may only have **web portal** access. API (XDev Web API) access is often a separate product or contract with **LexisNexis ProcureCheck South Africa**, who are slow to respond. Ask the questions below **now** so you don't wait for a reply before knowing the next step.

---

## Questions to ask now (don't wait for a response)

Send these to Stratcol (and have them ask ProcureCheck / LexisNexis if needed) in one go:

1. **Does our current contract include access to the ProcureCheck API (XDev Web API), or only the web portal?**  
   If only portal: we need to know how to get API access added (who to contact, what to request).

2. **Who at LexisNexis ProcureCheck South Africa can provision API credentials?**  
   (Username + password for the API, not portal login.) We need a direct contact or process, not only "ask your account manager," so we can chase if comms are slow.

3. **If Stratcol can't get API credentials, what is the process for us (or our client) to request API access from LexisNexis ProcureCheck SA?**  
   (e.g. a form, a specific email, a partner portal, or a technical contact.)

4. **Do they offer sandbox/test API credentials?**  
   So we can integrate and test before going live.

5. **What is the correct base URL for our environment?**  
   (We have `https://xdev.procurecheck.co.za/api/api/v1/` in docs—is that sandbox, production, or something else for our account?)

You don't have to wait for ProcureCheck to reply before sending these; the answers will tell you whether to keep chasing via Stratcol or to get a direct channel to LexisNexis for API provisioning.

**If Stratcol only has portal access:** Use the answers to (2) and (3) to open a direct line to LexisNexis ProcureCheck SA for API provisioning. Don't assume Stratcol can get API credentials—get the process and contact from them in one ask.

---

## Email / message you can send

**Subject:** ProcureCheck API login for [your project / control tower]

Hi,

We're integrating our onboarding system with ProcureCheck's API so we can run vendor checks automatically. To do that, we need **API login details** from ProcureCheck—the same kind of login that would be used by a developer or an integration, not a normal web login.

Please ask ProcureCheck (or your account manager) for:

1. **API username**  
   (Often an email address, e.g. `api-user@yourcompany.com` or a dedicated integration account.)

2. **API password**  
   (The password that goes with that API username.)

We need these for the **ProcureCheck XDev Web API** (the one at `xdev.procurecheck.co.za` or the production URL they give you). Our system will use them only to request an access token and then run vendor/verification checks—we don't need portal access or extra documentation, just this one username and password.

If they ask "what environment?":
- We can start with **sandbox/test** credentials if they have them.
- When we go live, we'll need **production** credentials for the same API.

If they ask "what format?":
- Plain username and password (we use the standard "authenticate" endpoint; no OAuth client IDs or extra setup unless ProcureCheck requires it for our account).

Thanks,  
[Your name]

---

## What to expect back

They might reply with something like:

- **Option A:** "Username: `something@domain.com`, Password: `••••••••`"  
  → Use those exactly in your `.env.local` as `PROCURECHECK_USERNAME` and `PROCURECHECK_PASSWORD`.

- **Option B:** "Use your existing portal login."  
  → Reply: "We need a dedicated **API** login (username + password) for the XDev Web API so our server can call the API automatically. Our application doesn't use the portal; it only calls the API."

- **Option C:** "We've created an API user; credentials are in the portal."  
  → Ask them to send the username and password in a secure way (e.g. separate from the email, or via your secure channel). You need the actual values for your `.env.local`.

---

## After you receive credentials

1. Put them in your `.env.local`:
   ```bash
   PROCURECHECK_USERNAME="the-username-they-gave-you"
   PROCURECHECK_PASSWORD="the-password-they-gave-you"
   PROCURECHECK_ENV="sandbox"
   PROCURECHECK_BASE_URL="https://xdev.procurecheck.co.za/api/api/v1/"
   ```

2. Start the dev server and call the network check endpoint:
   ```bash
   bun run dev
   # In another terminal:
   curl -H "Authorization: Bearer $CRON_SECRET" \
     http://localhost:3000/api/integrations/procurecheck/network-check
   ```

3. If the response includes these fields, you're ready:
   ```json
   {
     "ok": true,
     "tokenIssued": true,
     "vendorsGetListOk": true
   }
   ```

### Running tests

To verify the integration code itself:

```bash
bun test ./lib/procurecheck/__tests__/
bun test ./tests/procurecheck-service.test.ts
```

---

## Implementation Reference

For detailed implementation and usage in production:

- **`lib/procurecheck/client.ts`** — Production API client with JWT authentication, vendor CRUD, polling
- **`lib/procurecheck/types.ts`** — Zod schemas for API responses and `ProcurementData` type
- **`lib/procurecheck/mapper.ts`** — API-to-internal data transformer
- **`lib/services/procurecheck.service.ts`** — Orchestrator that ties the client, mapper, and DB together
- **`app/api/integrations/procurecheck/network-check/route.ts`** — Server-runtime network and allowlist check
- **`procurecheck-postman-collection.json`** — Ready-to-import Postman collection
- **`docs/procurecheck-api-v5.yaml`** — API specification (v5)
- **`docs/procurecheck-ip-whitelist-runbook.md`** — IP allowlist strategy and support email template
- **`docs/solutions/integration-issues/procurecheck-v5-api-jwt-auth-implementation.md`** — Full integration guide
