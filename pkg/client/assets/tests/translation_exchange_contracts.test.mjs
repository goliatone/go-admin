import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const {
  normalizeTranslationExchangeHistoryResponse,
  normalizeTranslationExchangeJob,
  normalizeTranslationExchangeUploadDescriptor,
  normalizeTranslationExchangeValidationResult,
} = await import("../dist/translation-exchange/index.js");

const fixtures = JSON.parse(
  await readFile(
    new URL(
      "../../../../admin/testdata/translation_exchange_contract_fixtures.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

test("translation exchange contracts: normalize export job fixture", () => {
  const job = normalizeTranslationExchangeJob(fixtures.export_completed.job);
  assert.equal(job.kind, "export");
  assert.equal(job.status, "completed");
  assert.equal(job.progress.processed, 2);
  assert.equal(job.request.target_locales[1], "es");
});

test("translation exchange contracts: normalize conflict and partial-success validation fixtures", () => {
  const duplicate = normalizeTranslationExchangeValidationResult(
    fixtures.validate_states.duplicate_row,
  );
  assert.equal(duplicate.summary.partial_success, true);
  assert.equal(duplicate.summary.by_conflict.duplicate_row, 1);
  assert.equal(duplicate.results[1].conflict.type, "duplicate_row");

  const partial = normalizeTranslationExchangeValidationResult(
    fixtures.validate_states.partial_success,
  );
  assert.equal(partial.summary.skipped, 1);
  assert.equal(partial.results[2].status, "skipped");
});

test("translation exchange contracts: normalize upload state model", () => {
  const descriptor = normalizeTranslationExchangeUploadDescriptor({
    state: "validated",
    filename: "translations.json",
    format: "json",
    row_count: 128,
  });
  assert.equal(descriptor.state, "validated");
  assert.equal(descriptor.format, "json");
  assert.equal(descriptor.row_count, 128);
});

test("translation exchange contracts: normalize history fixtures and seeded downloads", () => {
  const history = normalizeTranslationExchangeHistoryResponse(fixtures.history);
  assert.equal(history.history.total, 3);
  assert.equal(history.meta.include_examples, true);
  assert.deepEqual(history.meta.retention_fields, [
    "hard_delete_supported",
    "hard_delete_path",
    "download_kinds",
    "artifact_count",
    "retained",
  ]);
  assert.equal(history.history.items[0].kind, "import_apply");
  assert.equal(history.history.items[0].request_hash, "fixture_apply_request_hash");
  assert.equal(history.history.items[0].retention.hard_delete_supported, true);
  assert.equal(history.history.items[0].request.file_name, "translation_exchange_apply_demo.json");
  assert.equal(history.history.items[0].result.summary.processed, 1);
  assert.equal(history.history.items[0].downloads.report.kind, "report");
  assert.equal(
    history.history.items[2].downloads.artifact.filename,
    "translation_exchange_export.json",
  );
});
