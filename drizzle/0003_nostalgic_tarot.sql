CREATE TABLE `savings_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(64) NOT NULL,
	`ruleId` int,
	`matchId` int,
	`condition` varchar(256) NOT NULL,
	`amount` int NOT NULL,
	`triggeredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `savings_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `savings_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(64) NOT NULL,
	`condition` varchar(256) NOT NULL,
	`amount` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `savings_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `matches` MODIFY COLUMN `source` varchar(32) NOT NULL DEFAULT 'sheets';--> statement-breakpoint
ALTER TABLE `matches` ADD `matchId` varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE `matches` ADD `ticketSalesStart` varchar(10);--> statement-breakpoint
ALTER TABLE `matches` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT `matches_matchId_unique` UNIQUE(`matchId`);--> statement-breakpoint
ALTER TABLE `savings_history` ADD CONSTRAINT `savings_history_userId_users_openId_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`openId`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `savings_history` ADD CONSTRAINT `savings_history_ruleId_savings_rules_id_fk` FOREIGN KEY (`ruleId`) REFERENCES `savings_rules`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `savings_history` ADD CONSTRAINT `savings_history_matchId_matches_id_fk` FOREIGN KEY (`matchId`) REFERENCES `matches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `savings_rules` ADD CONSTRAINT `savings_rules_userId_users_openId_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`openId`) ON DELETE no action ON UPDATE no action;