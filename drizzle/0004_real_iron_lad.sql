CREATE TABLE `entitlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(64) NOT NULL,
	`plan` enum('free','plus','pro') NOT NULL DEFAULT 'free',
	`planExpiresAt` timestamp,
	`stripeSubscriptionId` varchar(255),
	`status` enum('active','inactive','canceled','past_due','trialing') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `entitlements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` varchar(255) NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`processedAt` timestamp NOT NULL DEFAULT (now()),
	`payload` text,
	`status` enum('success','failed') NOT NULL DEFAULT 'success',
	`errorMessage` text,
	CONSTRAINT `webhook_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `webhook_events_eventId_unique` UNIQUE(`eventId`)
);
--> statement-breakpoint
ALTER TABLE `matches` ADD `performId` varchar(64);--> statement-breakpoint
ALTER TABLE `matches` ADD `performIdStatus` enum('suggested','approved');--> statement-breakpoint
ALTER TABLE `entitlements` ADD CONSTRAINT `entitlements_userId_users_openId_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`openId`) ON DELETE no action ON UPDATE no action;