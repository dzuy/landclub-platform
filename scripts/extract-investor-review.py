"""Parse complete Gmail text extractions into a private, local-only review fixture.

Place the four original .xlsx files and corresponding .xlsx.txt Gmail extractions
in .data/investor-review first. No network, database, identities or grants touched.
"""
import csv
import hashlib
import io
import json
from pathlib import Path
import re

root = Path(__file__).resolve().parent.parent / '.data' / 'investor-review'
books = []
manifest = []
for file in sorted(root.glob('*.xlsx.txt')):
    original = file.with_suffix('')
    if not original.exists():
        raise ValueError(f'Missing original workbook: {original.name}')
    tabs = []
    text = file.read_text()
    for match in re.finditer(r'<PARSED TEXT FOR SHEET:.*?TAB NAME: (.*?)>\s*\n(.*?)(?=<PARSED TEXT FOR SHEET:|\Z)', text, re.S):
        tabs.append({'name': match[1], 'rows': list(csv.DictReader(io.StringIO(match[2].strip())))})
    books.append({'filename': original.name, 'tabs': tabs})
    manifest.append({'filename': original.name, 'sha256': hashlib.sha256(original.read_bytes()).hexdigest(), 'extractionSha256': hashlib.sha256(file.read_bytes()).hexdigest(), 'tabs': len(tabs)})
if len(books) != 4 or sum(len(b['tabs']) for b in books) != 40:
    raise ValueError('Expected four complete workbooks and 40 tabs; refusing partial fixture')
for name, data in [('workbooks.json', books), ('manifest.json', manifest)]:
    target = root / name
    target.write_text(json.dumps(data, indent=2))
    target.chmod(0o600)
print('Created private review fixture: 4 workbooks, 40 tabs. No database changes.')
