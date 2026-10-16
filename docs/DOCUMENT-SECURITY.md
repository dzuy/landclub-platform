# Document upload protections

The release intentionally omits antivirus scanning and quarantine. Admins should upload only documents from trusted sources. Format validation does not establish that a file is malware-free; downloaded files can still pose a risk in a desktop reader. MFA behavior is unchanged.

Uploads require authenticated admin access, same-origin requests and a streamed size limit. The supported formats are PDF, UTF-8 TXT/CSV, PNG and JPEG, up to 20 MiB. Office files must be exported first. PDFs are parsed with a pinned pdf-lib dependency; encrypted files, forms, scripts, external actions/links and embedded files are rejected. Page/object traversal is bounded. Images must decode and remain below 25 megapixels. Text rejects binary/control characters; CSV rejects formula-leading cells. These are format checks, not sanitization or antivirus guarantees.

File bytes stay in private database rows. Every download independently checks current member ownership or group property/role audience on the server. Investments do not grant document access. UUID download paths are authenticated routes, not public storage links. Responses force attachment delivery with private/no-store, nosniff, no-referrer, same-origin resource policy and sandbox CSP headers.

Migration 017_document_audit.sql only adds audit storage and triggers. It does not rewrite existing files, change audiences, add scan states or block legacy downloads. Audit entries contain actor/resource IDs, event type and timestamp; no file contents, filenames or tags. Download authorization decisions are recorded before serving bytes; unavailable audit storage fails closed. Updates/deletes/truncation of audit history are rejected. Database owners can still alter triggers, so this is not independently tamper-proof logging.

Automated tests cover private/group access, revocation, admin-only mutation, investment isolation, unsafe/malformed file rejection, audit failures and migration preservation of legacy bytes/audiences. Production verification must check health, applied migration checksum and authorization responses without retrieving investor documents.

The deferred scanner implementation remains on validation/scanner-20261015. Do not merge its quarantine migration or worker deployment into this release. No scanner verdict is assigned or claimed.
