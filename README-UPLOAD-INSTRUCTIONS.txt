ADVOCATE MOHD SALMAN WEBSITE — OVERLAY PACKAGE

IMPORTANT
- This is an overlay package for the existing Cloudflare Pages + Neon project.
- It intentionally does NOT include or overwrite your existing index.html.
- It does NOT include your DATABASE_URL or any secret.
- Keep Cloudflare Pages Build command: npm install
- Keep Build output directory: .
- Upload/extract the contents into the ROOT of your existing GitHub repository (not into a nested folder).
- If GitHub's web uploader asks, drag the extracted folders/files together. Commit to main.
- Existing paths in this package (functions/api/_auth.js and functions/api/auth/*.js) are replacements for the earlier versions.

FEATURES
- Registration and login pages
- Logout and current-user endpoint
- User dashboard
- Private enquiry submission and owner-only viewing
- Enquiry conversation/replies
- Admin enquiry list, restricted server-side to role=admin
- Responsive CSS

DATABASE
The package expects the existing Neon tables:
users, user_sessions, password_reset_tokens, enquiries, enquiry_messages.
It does not create or drop tables.

AFTER UPLOAD
1. Wait for Cloudflare Production deployment to show Success.
2. Open /register.html and create a test account using a test email and a unique password.
3. Test /dashboard.html and submit a dummy enquiry (not a real client's matter).
4. To grant your own account admin access, first register your own account, then run this SQL in Neon SQL Editor, replacing the email:
   UPDATE users SET role='admin' WHERE LOWER(email)=LOWER('YOUR_EMAIL_HERE');
5. Log out and log back in; then open /admin.html.

SECURITY / LAUNCH LIMITATIONS
This is an MVP starter, not a security-audited legal-client portal. Before accepting real client matters:
- Add persistent rate limiting / bot protection to register and login.
- Add email verification and a secure password reset flow.
- Add audit logging, retention policy, backups, and privacy/consent notices.
- Add CSRF protections appropriate to the final domain and deployment.
- Add secure document upload scanning/storage (do not upload client documents until implemented).
- Consider encryption and access-control review for sensitive legal data.
- Restrict admin account creation and use a strong unique admin password.
- Do not put legal-client confidential or sensitive information into test accounts.

ORIGIN NOTE
POST APIs require a same-origin Origin header. Use the deployed site pages, not direct cross-origin API testing tools.
