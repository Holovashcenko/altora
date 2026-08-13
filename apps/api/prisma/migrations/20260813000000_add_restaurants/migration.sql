-- Create restaurants table
CREATE TABLE "restaurants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "restaurants_slug_key" ON "restaurants"("slug");

-- Create restaurant_members join table
CREATE TABLE "restaurant_members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restaurant_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "restaurant_members_user_restaurant_key" ON "restaurant_members"("user_id","restaurant_id");

ALTER TABLE "restaurant_members" ADD FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "restaurant_members" ADD FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE;

-- Drop the old users.role column (we'll use memberships instead)
ALTER TABLE "users" DROP COLUMN IF EXISTS "role";
