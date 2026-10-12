# Event cover images

Admins can upload, drag and drop, replace, or remove an image in the event drawer. Generation controls are currently hidden; the server integration is retained for future use. Save Event attaches the selected image to the event. Existing events without images remain valid. Cover images appear on member event cards and dashboard event previews.

Images use the existing PHOTO_STORAGE_BACKEND configuration (local development or private Supabase storage). Uploads accept JPEG, PNG, WebP, and GIF up to 20 MiB, validate decoded pixels, strip metadata, and store resized WebP covers. Image reads require a club member session; upload and generation require admin access and a matching request Origin.

To enable generation, configure OPENAI_API_KEY on the server and restart the app. Never put the key in a NEXT_PUBLIC variable. OPENAI_IMAGE_MODEL optionally overrides the default gpt-image-1. The endpoint uses the [OpenAI Images API](https://developers.openai.com/api/reference/resources/images/methods/generate). Generation incurs API usage. Without a key, uploads remain available and generation returns an explanatory message.

Images are written before the event is saved. Abandoned drafts or replaced covers can leave unreferenced storage objects; no automatic deletion is performed.
