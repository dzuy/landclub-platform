# Property maps

Public and My Properties detail views share the Mapbox GL JS map in PropertyMap. Set NEXT_PUBLIC_MAPBOX_TOKEN in the local and deployment environment. The browser token needs styles:read and fonts:read. Restart/rebuild after changing the environment.

Actual saved property coordinates take precedence. Approximate coordinates are labeled. When coordinates are missing, the map tries the property name with geographic context, then region, county, state, and country in order. Name searches must match the returned place name; unknown fields are skipped. County queries include state/country context and support Mapbox district results. Fallbacks are approximate areas, not verified property locations. If all searches fail, no marker is invented.

Nearby places support optional coordinates in the staff Facts editor. Otherwise Mapbox Search Box resolves their existing names near the property. Name and distance checks reject unrelated matches. Unmatched places remain in the page’s area list; staff can supply verified coordinates. Search results are used in memory only, not saved to the database or localStorage. Each lookup is billable under Mapbox’s search pricing; search results must not be persisted without the appropriate storage rights. Search Box currently covers US, Canada and Europe; use verified coordinates for other locations.

The map starts centered on the property/region. Clicking pins opens names; matched nearby names in the area list focus individual pins. Unmatched names remain plain text. The property and nearby pin colors differ. Map resources are disposed on navigation; requests are aborted. Existing field-level source notes are excluded from the public payload.

Sources: https://docs.mapbox.com/api/search/search-box/ and https://docs.mapbox.com/mapbox-gl-js/guides/
