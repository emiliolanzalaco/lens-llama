CREATE TABLE "images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encrypted_cid" text NOT NULL,
	"watermarked_cid" text NOT NULL,
	"encryption_key" text NOT NULL,
	"photographer_address" varchar(42) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"price_usdc" numeric(10, 2) NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"image_id" uuid NOT NULL,
	"buyer_address" varchar(42) NOT NULL,
	"photographer_address" varchar(42) NOT NULL,
	"price_usdc" numeric(10, 2) NOT NULL,
	"payment_tx_hash" text NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "photographer_idx" ON "images" USING btree ("photographer_address");--> statement-breakpoint
CREATE INDEX "created_at_idx" ON "images" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "image_id_idx" ON "licenses" USING btree ("image_id");--> statement-breakpoint
CREATE INDEX "buyer_idx" ON "licenses" USING btree ("buyer_address");--> statement-breakpoint
CREATE INDEX "buyer_image_idx" ON "licenses" USING btree ("buyer_address","image_id");--> statement-breakpoint
CREATE INDEX "license_photographer_idx" ON "licenses" USING btree ("photographer_address");