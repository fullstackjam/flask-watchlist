CREATE TABLE `movies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`imdb_id` text,
	`title` text NOT NULL,
	`year` text,
	`poster_url` text,
	`overview` text,
	`genres` text,
	`external_rating` text,
	`status` text DEFAULT 'want' NOT NULL,
	`user_rating` integer,
	`notes` text,
	`watched_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`github_id` integer NOT NULL,
	`github_login` text NOT NULL,
	`name` text,
	`avatar_url` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_github_id_unique` ON `users` (`github_id`);