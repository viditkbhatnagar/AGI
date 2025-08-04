-- Add final_exam_attempts column to enrollments table
ALTER TABLE "enrollments" ADD COLUMN "final_exam_attempts" jsonb;

-- Create final_examinations table
CREATE TABLE "final_examinations" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"questions" jsonb NOT NULL,
	"passing_score" integer DEFAULT 70 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "final_examinations_course_slug_unique" UNIQUE("course_slug")
);

-- Add foreign key constraint
ALTER TABLE "final_examinations" ADD CONSTRAINT "final_examinations_course_slug_courses_slug_fk" FOREIGN KEY ("course_slug") REFERENCES "courses"("slug") ON DELETE no action ON UPDATE no action; 