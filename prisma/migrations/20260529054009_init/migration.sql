-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('motorcycle', 'car', 'van', 'truck');

-- CreateTable
CREATE TABLE "customer_profiles" (
    "userId" UUID NOT NULL,
    "display_name" VARCHAR(80) NOT NULL,
    "phone" VARCHAR(20),
    "default_address_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "driver_profiles" (
    "userId" UUID NOT NULL,
    "vehicle_type" "VehicleType",
    "license_plate" VARCHAR(20),
    "is_available" BOOLEAN NOT NULL DEFAULT false,
    "profile_complete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "driver_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "label" VARCHAR(40) NOT NULL,
    "street" VARCHAR(200) NOT NULL,
    "city" VARCHAR(80) NOT NULL,
    "country" VARCHAR(2) NOT NULL,
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_events" (
    "event_id" UUID NOT NULL,
    "event_type" VARCHAR(80) NOT NULL,
    "processed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_events_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE INDEX "addresses_user_id_idx" ON "addresses"("user_id");

-- AddForeignKey
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_default_address_id_fkey" FOREIGN KEY ("default_address_id") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "customer_profiles"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
