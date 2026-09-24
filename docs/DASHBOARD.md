# Authenticated dashboard

`/staff` is the authenticated landing page after sign-in. Access continues to require an authorized, confirmed staff account; this release does not enable general member access.

The dashboard restores the prototype's Home, My Properties, Bookings, Documents, Events, and Profile & Settings sections, along with Members, arrival guidance, club updates, and a property issue preview.

Member ownership, stays, documents, events, and maintenance reports are labeled sample content. Their interactive previews use component state only; they do not create bookings, send notifications, store files, grant permissions, or change account settings. The visible email comes from the authenticated identity.

Property content at `/staff/properties` retains its database-backed editing, publication, and revision history. The Members workspace at `/staff/members` keeps invitations at the top and combines Supabase Auth identity/activity with authoritative database roles in the directory below.

Next implementation steps are persistent member profiles and property associations, document storage and access rules, booking availability and conflict enforcement, event registration, and maintenance workflows. Each needs server-side authorization before replacing its preview.

## Account navigation

The header shows Sign in to signed-out visitors and the appropriate account link to signed-in visitors. The staff sidebar and the ordinary account page provide Sign out. Local preview sign-out suppresses the automatic development shortcut for that browser session; a development-only button restores preview access. The shortcut is still unavailable in production.

Registration remains invitation-only in Supabase. The Create account tab explains the invitation process; it does not submit public sign-ups. Confirmed non-staff users can sign in to `/account`, without gaining access to staff pages or property editing.

## Profile & Settings

`/staff/profile` loads and saves the authenticated staff user's name, home region, and communication preferences in Supabase Auth user metadata. Missing preferences default to off. Email is read-only. Profile metadata is never used to determine staff authorization, which continues to use confirmed identity and the server-side UUID allowlist.

Saves are validated server-side and restricted to the current account; no user ID or access fields are accepted from the form. Local preview without a real authorized session prompts for sign-in instead of pretending to save. Notification preferences persist, but email delivery is not yet implemented. Password and email changes remain administrator-managed.

## Events

Admins manage events at `/staff/manage-events` using the Admin Tools navigation. The page and every save require the server's admin authorization. Events are stored in the private database through migration `005_events.sql`; the member-facing `/staff/events` route requires an invited club identity and reads saved events.

Creating or editing a scheduled event immediately makes it visible to all members. Cancellation keeps the event visible with a cancellation notice; archiving hides it from members and is reversible by editing its status. Past events remain available below upcoming events. No sample events are seeded.

The editor accepts a title, description, start/end, location, optional HTTPS event link, and status. Dates are entered in the admin browser's named time zone, stored as UTC instants, and displayed with the saved time zone. Changes use version checks to prevent silently overwriting another admin's edits. RSVPs, capacity limits, and email notifications are not part of this release.
