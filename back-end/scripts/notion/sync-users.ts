#!/usr/bin/env tsx

import { prisma } from "../../src/core/prisma";
import { notionService } from "../../src/services/integrations/notion.service";
import { logger } from "../../src/core/logger";

/**
 * Sync all existing users to Notion
 * This script will:
 * 1. Fetch all users from the database
 * 2. For each user, check if they exist in Notion
 * 3. Create or update the user in Notion as needed
 */
async function syncUsersToNotion() {
  console.log("🚀 RabbitHQ - Notion User Sync\n");

  try {
    // Fetch all users
    console.log("Fetching users from database...");
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });

    console.log(`Found ${users.length} users to sync\n`);

    if (users.length === 0) {
      console.log("No users found. Exiting.");
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ userId: string; email: string; error: string }> = [];

    // Process users in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(users.length / batchSize)} (users ${i + 1}-${Math.min(i + batchSize, users.length)})...`
      );

      await Promise.all(
        batch.map(async (user) => {
          try {
            const result = await notionService.syncUser(user);

            if (result.success) {
              successCount++;
              console.log(
                `✅ Synced user: ${user.email} (${result.notionPageId ? "updated" : "created"})`
              );
            } else {
              errorCount++;
              errors.push({
                userId: user.id,
                email: user.email,
                error: result.error || "Unknown error",
              });
              console.error(
                `❌ Failed to sync user: ${user.email} - ${result.error}`
              );
            }
          } catch (error: any) {
            errorCount++;
            errors.push({
              userId: user.id,
              email: user.email,
              error: error.message || "Unknown error",
            });
            console.error(
              `❌ Error syncing user: ${user.email} - ${error.message}`
            );
            logger.error(
              { error, userId: user.id, email: user.email },
              "Failed to sync user to Notion"
            );
          }
        })
      );

      // Small delay between batches to avoid rate limits
      if (i + batchSize < users.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 Sync Summary");
    console.log("=".repeat(60));
    console.log(`Total users: ${users.length}`);
    console.log(`✅ Successfully synced: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);

    if (errors.length > 0) {
      console.log("\n❌ Errors:");
      errors.forEach((err) => {
        console.log(`  - ${err.email} (${err.userId}): ${err.error}`);
      });
    }

    console.log("\n✨ Sync completed!");
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    logger.error({ error }, "Fatal error during Notion user sync");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
syncUsersToNotion()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
