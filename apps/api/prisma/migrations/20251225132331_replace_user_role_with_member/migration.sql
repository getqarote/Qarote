-- Step 1: Create a new enum type with MEMBER (without USER)
-- We create the new enum first, then migrate data by converting through text
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'MEMBER', 'READONLY');

-- Step 2: Remove default values before changing column type
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "Invitation" ALTER COLUMN "role" DROP DEFAULT;

-- Step 3: Switch all tables to use the new enum type
-- This automatically converts USER to MEMBER via the USING clause
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING 
    CASE 
        WHEN "role"::text = 'ADMIN' THEN 'ADMIN'::"UserRole_new"
        WHEN "role"::text = 'MEMBER' THEN 'MEMBER'::"UserRole_new"
        WHEN "role"::text = 'USER' THEN 'MEMBER'::"UserRole_new"  -- Convert USER to MEMBER
        WHEN "role"::text = 'READONLY' THEN 'READONLY'::"UserRole_new"
        ELSE 'MEMBER'::"UserRole_new"  -- Default fallback to MEMBER
    END;

ALTER TABLE "Invitation" ALTER COLUMN "role" TYPE "UserRole_new" USING 
    CASE 
        WHEN "role"::text = 'ADMIN' THEN 'ADMIN'::"UserRole_new"
        WHEN "role"::text = 'MEMBER' THEN 'MEMBER'::"UserRole_new"
        WHEN "role"::text = 'USER' THEN 'MEMBER'::"UserRole_new"  -- Convert USER to MEMBER
        WHEN "role"::text = 'READONLY' THEN 'READONLY'::"UserRole_new"
        ELSE 'MEMBER'::"UserRole_new"  -- Default fallback to MEMBER
    END;

ALTER TABLE "WorkspaceMember" ALTER COLUMN "role" TYPE "UserRole_new" USING 
    CASE 
        WHEN "role"::text = 'ADMIN' THEN 'ADMIN'::"UserRole_new"
        WHEN "role"::text = 'MEMBER' THEN 'MEMBER'::"UserRole_new"
        WHEN "role"::text = 'USER' THEN 'MEMBER'::"UserRole_new"  -- Convert USER to MEMBER
        WHEN "role"::text = 'READONLY' THEN 'READONLY'::"UserRole_new"
        ELSE 'MEMBER'::"UserRole_new"  -- Default fallback to MEMBER
    END;

-- Step 4: Drop the old enum type and rename the new one
DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";

-- Step 5: Set default values to MEMBER
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'MEMBER'::"UserRole";
ALTER TABLE "Invitation" ALTER COLUMN "role" SET DEFAULT 'MEMBER'::"UserRole";

