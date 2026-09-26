CREATE TABLE `activity_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` enum('signal','prediction','decision','system') NOT NULL,
	`title` varchar(160) NOT NULL,
	`detail` varchar(240) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`actorId` int,
	CONSTRAINT `activity_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dashboard_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resourceHealth` varchar(32) NOT NULL,
	`resourceHealthDelta` varchar(32) NOT NULL,
	`atRiskCapacity` varchar(32) NOT NULL,
	`atRiskCapacityDelta` varchar(32) NOT NULL,
	`forecastConfidence` varchar(32) NOT NULL,
	`forecastConfidenceDelta` varchar(32) NOT NULL,
	`openDecisions` int NOT NULL,
	`urgentDecisions` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dashboard_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(160) NOT NULL,
	`recommendation` text NOT NULL,
	`confidence` int NOT NULL,
	`expectedOutcome` varchar(64) NOT NULL,
	`expectedOutcomeLabel` varchar(120) NOT NULL,
	`riskChange` varchar(32) NOT NULL,
	`riskChangeLabel` varchar(120) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`recommendedResource` varchar(120) NOT NULL,
	`skillMatch` varchar(120) NOT NULL,
	`availability` varchar(120) NOT NULL,
	`sourceProjectImpact` varchar(80) NOT NULL,
	`approvedBy` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recovery_scenarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scenarioKey` varchar(40) NOT NULL,
	`title` varchar(120) NOT NULL,
	`subtitle` varchar(160) NOT NULL,
	`timeRecovered` varchar(32) NOT NULL,
	`estimatedCost` varchar(32) NOT NULL,
	`riskReduction` varchar(32) NOT NULL,
	`blurb` text NOT NULL,
	`feasible` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recovery_scenarios_id` PRIMARY KEY(`id`),
	CONSTRAINT `recovery_scenarios_scenarioKey_unique` UNIQUE(`scenarioKey`)
);
--> statement-breakpoint
CREATE TABLE `resource_signals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(160) NOT NULL,
	`detail` text NOT NULL,
	`severity` enum('high','medium','watch') NOT NULL,
	`horizon` varchar(40) NOT NULL,
	`status` enum('active','resolved') NOT NULL DEFAULT 'active',
	`ownersNotified` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resource_signals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
