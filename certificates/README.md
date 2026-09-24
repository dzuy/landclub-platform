# Supabase database CA

`supabase-ca.crt` is the public trust certificate linked from the Land Club Supabase project's Database → Settings → SSL configuration.

Source: https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

The runtime uses `NODE_EXTRA_CA_CERTS` to extend Node's certificate trust store. Keep `sslmode=verify-full` in the database connection URL; do not disable certificate validation. This file contains no private key or credential.
