# Authenticated dashboard

`/staff` is the authenticated landing page after sign-in. Access continues to require an authorized, confirmed staff account; this release does not enable general member access.

The dashboard restores the prototype's Home, My Properties, Bookings, Documents, Events, and Profile & Settings sections, along with Administration, arrival guidance, club updates, and a property issue preview.

Member ownership, stays, documents, events, directory entries, maintenance reports, and preferences are labeled sample content. Their interactive previews use component state only; they do not create bookings, send notifications, store files, grant permissions, or change account settings. The visible email comes from the authenticated identity.

Property content at `/staff/properties` retains its database-backed editing, publication, and revision history. Administration links to this existing editor.

Next implementation steps are persistent member profiles and property associations, document storage and access rules, booking availability and conflict enforcement, event registration, and maintenance workflows. Each needs server-side authorization before replacing its preview.
