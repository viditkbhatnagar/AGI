CREATE TABLE "courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"live_class_config" jsonb,
	"mba_modules" jsonb,
	"modules" jsonb,
	CONSTRAINT "courses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"course_slug" text NOT NULL,
	"enroll_date" timestamp NOT NULL,
	"valid_until" timestamp NOT NULL,
	"completed_modules" jsonb,
	"quiz_attempts" jsonb
);
--> statement-breakpoint
CREATE TABLE "live_classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"meet_link" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recordings" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_slug" text NOT NULL,
	"live_class_id" integer,
	"title" text NOT NULL,
	"description" text,
	"file_url" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer,
	"duration" integer,
	"module_index" integer,
	"uploaded_by" integer NOT NULL,
	"uploaded_at" timestamp NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"address" text,
	"dob" timestamp,
	"pathway" text NOT NULL,
	"course_progress" jsonb,
	"quiz_summary" jsonb,
	"certificate_ready" jsonb,
	"watch_time" jsonb
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_slug_courses_slug_fk" FOREIGN KEY ("course_slug") REFERENCES "public"."courses"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_classes" ADD CONSTRAINT "live_classes_course_slug_courses_slug_fk" FOREIGN KEY ("course_slug") REFERENCES "public"."courses"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_course_slug_courses_slug_fk" FOREIGN KEY ("course_slug") REFERENCES "public"."courses"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_live_class_id_live_classes_id_fk" FOREIGN KEY ("live_class_id") REFERENCES "public"."live_classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;