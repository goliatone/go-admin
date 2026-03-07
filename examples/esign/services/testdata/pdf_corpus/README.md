# PDF Corpus Fixtures

This corpus is used by Slice 6 regression tests and fuzz seeds.

- `deterministic_1_page.pdf`: deterministic single-page baseline fixture.
- `deterministic_2_page.pdf`: deterministic two-page baseline fixture.
- `google_import_endstream_corrupt.pdf`: malformed stream (`ndstream`) sample mirroring known Google-import parser failures.
- `encrypted_marker.pdf`: deterministic fixture with `/Encrypt` marker (policy rejection path).
- `linearized_marker.pdf`: deterministic fixture with `/Linearized` marker.
- `object_stream_marker.pdf`: deterministic fixture with `/ObjStm` marker.
