CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` enum('attendance_create','attendance_update','attendance_delete','expense_add','expense_update','expense_delete','auth_login','auth_logout') NOT NULL,
	`targetId` int,
	`targetType` varchar(32),
	`metadata` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `eventLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`eventName` varchar(64) NOT NULL,
	`eventData` text,
	`seasonYear` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eventLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `matchExpenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userMatchId` int NOT NULL,
	`userId` int NOT NULL,
	`category` enum('transport','ticket','food','other') NOT NULL,
	`amount` int NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `matchExpenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `syncLogs` MODIFY COLUMN `status` enum('success','partial','failed') NOT NULL;--> statement-breakpoint
ALTER TABLE `syncLogs` ADD `resultsCount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `syncLogs` ADD `upcomingCount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `syncLogs` ADD `detailFetched` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `syncLogs` ADD `detailFailed` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `syncLogs` ADD `failedUrls` text;--> statement-breakpoint
ALTER TABLE `syncLogs` ADD `durationMs` int;--> statement-breakpoint
ALTER TABLE `userMatches` ADD `seasonYear` int;--> statement-breakpoint
ALTER TABLE `users` ADD `plan` enum('free','plus','pro') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `planExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeSubscriptionId` varchar(255);