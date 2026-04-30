-- Add invoice_pdf_path column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_pdf_path VARCHAR(500);

COMMENT ON COLUMN orders.invoice_pdf_path IS 'Path to uploaded invoice PDF file';
