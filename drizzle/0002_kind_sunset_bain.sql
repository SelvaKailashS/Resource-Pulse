CREATE TABLE `beta_enrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('requested','active','paused') NOT NULL DEFAULT 'requested',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `beta_enrollments_id` PRIMARY KEY(`id`),
	CONSTRAINT `beta_enrollments_userId_unique` UNIQUE(`userId`)
);
