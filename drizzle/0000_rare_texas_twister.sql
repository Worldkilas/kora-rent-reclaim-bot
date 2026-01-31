CREATE TABLE `sponsored_accounts` (
	`address` text PRIMARY KEY NOT NULL,
	`tx_signature` text NOT NULL,
	`slot` text NOT NULL,
	`status` text DEFAULT 'pending',
	`last_checked` integer
);
--> statement-breakpoint
CREATE TABLE `sync_progress` (
	`id` integer PRIMARY KEY NOT NULL,
	`last_signature` text
);
