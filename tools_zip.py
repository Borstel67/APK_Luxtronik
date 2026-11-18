"""Add classes.dex to the aapt2 output and 4-byte align stored entries (zipalign equivalent)."""
import sys, zipfile

src, dex, out = sys.argv[1:4]
with zipfile.ZipFile(src) as zin, open(out, 'wb') as raw:
    zout = zipfile.ZipFile(raw, 'w')
    entries = [(i, zin.read(i.filename)) for i in zin.infolist()]
    entries.append((zipfile.ZipInfo('classes.dex', (2026, 1, 1, 0, 0, 0)), open(dex, 'rb').read()))
    for info, data in entries:
        zi = zipfile.ZipInfo(info.filename, info.date_time)
        zi.external_attr = info.external_attr
        stored = info.filename == 'resources.arsc' or info.filename.endswith('.png') or getattr(info, 'compress_type', 8) == 0
        zi.compress_type = zipfile.ZIP_STORED if stored else zipfile.ZIP_DEFLATED
        if stored:
            # header = 30 + len(name) + len(extra); pad extra so data starts on a 4-byte boundary
            hdr = raw.tell() + 30 + len(zi.filename.encode())
            pad = (4 - hdr % 4) % 4
            zi.extra = b'\x00' * pad
        zout.writestr(zi, data)
    zout.close()
