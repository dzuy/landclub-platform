# Land Club invitation email

`invite-user.html` is the production Supabase Auth **Invite user** template.
Subject: `You’re invited to Land Club`.

Saved to project `sfrdfzxxbhcmvjgxbshp` on October 12, 2026. Supabase sends through Resend SMTP; the working Resend team is **Land-Club**, with the verified `auth.land.club` domain. Both dzuylinh@gmail.com and dzuy@land.club have admin access. The separate empty team is not the email provider for this app.

The template uses the site's cream, forest green, ink and muted colors, a serif wordmark and footer, email-safe system fonts, inline styles and presentation tables. Mobile spacing is reduced below 620px. No externally hosted images or font downloads are required.

Keep the CTA exactly `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=invite`. The app's confirmation page protects invitation tokens from link scanners. Do not replace it with a directly consumed authentication link.

`invite-user.preview.html` is a nonfunctional visual preview with a sample address. Do not upload the preview as the live template. Updating repository files does not update Supabase automatically.
