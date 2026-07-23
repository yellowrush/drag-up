# Kid Idea Box CloudBase Deployment

This is the low-risk CloudBase path for `kid-idea-box`. It keeps the current Vercel deployment unchanged.

## Cost Guardrails

CloudBase is not an unlimited free hosting service.

- As of the current Tencent Cloud pricing page, each CloudBase account can create one free trial environment with 3000 resource points per month.
- Each CloudBase environment includes 1GB free static hosting capacity.
- If a paid environment exceeds its quota and overage is enabled, Tencent Cloud charges overage usage. Current examples include API calls at 0.5 CNY per 10k calls per day, outbound traffic at 0.8 CNY per GB, static hosting traffic at 0.21 CNY per GB, and static hosting capacity overage at 0.005 CNY per GB per day.
- For this child-facing idea box, keep traffic tiny, avoid AI/model features, avoid database writes unless needed, and do not enable overage until you explicitly decide to pay.

Recommended first test:

1. Use a free trial CloudBase environment if available.
2. Keep "overage does not stop service" disabled.
3. Do not buy resource packs during the first test.
4. Check usage after the first few submissions.

## What Stays Unchanged

- Existing Vercel files remain in `kid-idea-box/`.
- CloudBase static files live in `kid-idea-box-cloudbase/`.
- Existing Vercel API remains in `kid-idea-box/api/issues.js`.
- Existing game CloudBase config remains in `cloudbaserc.json`.
- CloudBase migration uses a separate function config: `cloudbaserc.kid-idea-box.json`.

## CloudBase Pieces

- Static files: upload `kid-idea-box-cloudbase/` to CloudBase static website hosting.
- API function: deploy `cloudfunctions/kidIdeaIssues/`.
- HTTP path: bind the function to `/api/issues` so the existing frontend can keep calling `fetch('/api/issues')`.

## Environment Variables

Set these on the `kidIdeaIssues` cloud function:

- `GITHUB_OWNER`: repository owner, for example `yellowrush`
- `GITHUB_REPO`: repository name, for example `drag-up`
- `GITHUB_TOKEN`: fine-grained GitHub token with Issues read/write and Metadata read-only
- `KID_IDEA_LABELS`: optional, defaults to `kid-idea,needs-parent-review,from-idea-box`

Do not put the GitHub token in any frontend file.

## Deploy Function

From the repository root:

```powershell
npx --package @cloudbase/cli cloudbase --config-file cloudbaserc.kid-idea-box.json fn deploy kidIdeaIssues
```

If using the existing project script style, keep this as a manual command first. Do not add it to the normal game deploy flow until the CloudBase version is proven.

## HTTP Access

In the CloudBase console:

1. Open the `kidIdeaIssues` function.
2. Enable HTTP access or bind a custom domain through HTTP access service.
3. Set the trigger path to `/api/issues`.
4. Test:

```powershell
curl https://drag-meow-d8ggfohez51d8d1d7.service.tcloudbase.com/api/issues
```

It should return JSON with an `issues` array.

If the page shows `Unexpected token '<'`, the frontend received HTML instead of JSON. This usually means `/api/issues` is still served by static hosting instead of the `kidIdeaIssues` function.

There are two valid fixes:

1. Preferred: bind the same static hosting domain to the function path `/api/issues`.
2. Fallback: edit `kid-idea-box-cloudbase/config.js` and set the full API URL:

```js
window.KID_IDEA_API_URL = 'https://drag-meow-d8ggfohez51d8d1d7.service.tcloudbase.com/api/issues'
```

Use an empty API URL only when the static page and `/api/issues` function share the same domain. The older `window.KID_IDEA_API_BASE = 'https://YOUR_FUNCTION_DOMAIN'` style is still supported.

## Static Hosting

Upload the contents of `kid-idea-box-cloudbase/` to CloudBase static website hosting. The frontend can stay unchanged if the static site and function share the same domain and `/api/issues` path. If they do not share a domain, set `window.KID_IDEA_API_URL` in `kid-idea-box-cloudbase/config.js`.

For a first private test, use the CloudBase default domain. For a stable mainland China public URL, use a custom domain with ICP filing.

## Vercel Safety

Do not remove Vercel or change DNS yet.

Recommended rollout:

1. Keep the Vercel URL as-is.
2. Deploy CloudBase to a separate test URL.
3. Test name cache, drawing, phone photo upload, issue creation, and issue list.
4. Only after testing, give the CloudBase URL to the child.
5. Leave Vercel online as fallback until the CloudBase URL has worked for a while.
