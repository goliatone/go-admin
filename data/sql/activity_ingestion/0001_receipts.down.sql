-- Destructive: removing receipts removes replay protection. Coordinate producers first.
DROP TABLE IF EXISTS admin_activity_ingestion_receipts;
