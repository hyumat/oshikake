CREATE TABLE `matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceKey` varchar(128) NOT NULL,
	`source` varchar(32) NOT NULL DEFAULT 'jleague',
	`date` varchar(10) NOT NULL,
	`kickoff` varchar(5),
	`competition` varchar(128),
	`roundLabel` varchar(64),
	`roundNumber` int,
	`homeTeam` varchar(128) NOT NULL,
	`awayTeam` varchar(128) NOT NULL,
	`opponent` varchar(128) NOT NULL,
	`stadium` varchar(256),
	`marinosSide` enum('home','away'),
	`homeScore` int,
	`awayScore` int,
	`status` varchar(64),
	`isResult` int NOT NULL DEFAULT 0,
	`matchUrl` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `matches_id` PRIMARY KEY(`id`),
	CONSTRAINT `matches_sourceKey_unique` UNIQUE(`sourceKey`)
);
--> statement-breakpoint
CREATE TABLE `syncLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source` varchar(32) NOT NULL,
	`status` enum('success','failed') NOT NULL,
	`matchesCount` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `syncLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userMatches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`matchId` int,
	`date` varchar(10) NOT NULL,
	`kickoff` varchar(5),
	`competition` varchar(128),
	`opponent` varchar(128) NOT NULL,
	`stadium` varchar(256),
	`marinosSide` enum('home','away'),
	`status` enum('planned','attended') NOT NULL DEFAULT 'planned',
	`resultWdl` enum('W','D','L'),
	`marinosGoals` int,
	`opponentGoals` int,
	`costYen` int NOT NULL DEFAULT 0,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userMatches_id` PRIMARY KEY(`id`)
);
