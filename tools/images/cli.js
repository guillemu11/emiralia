/**
 * DALL-E 3 Image Generator — Command Line Interface
 *
 * Usage:
 *   node tools/images/cli.js generate "prompt" [--size=square] [--quality=standard]
 *   node tools/images/cli.js list [--limit=10]
 *   node tools/images/cli.js stats
 */

import { generateImage, getDirectoryStats } from './generate-image.js';
import {
  trackGeneration,
  getRecentGenerations,
  getGenerationStats,
  getTopUsers
} from './track-generation.js';
import pool from '../db/pool.js';

const [,, command, ...args] = process.argv;

async function main() {
  if (!command) {
    printUsage();
    process.exit(0);
  }

  switch (command) {
    case 'generate':
    case 'gen': {
      const prompt = args[0];

      if (!prompt) {
        console.error('❌ Error: Prompt is required\n');
        console.log('Usage: node tools/images/cli.js generate "your prompt here" [--size=square]');
        process.exit(1);
      }

      const sizeArg = args.find(a => a.startsWith('--size='));
      const size = sizeArg ? sizeArg.split('=')[1] : 'square';

      const qualityArg = args.find(a => a.startsWith('--quality='));
      const quality = qualityArg ? qualityArg.split('=')[1] : 'standard';

      console.log(`\n🎨 DALL-E 3 Image Generator\n`);
      console.log(`Prompt: "${prompt}"`);
      console.log(`Size: ${size}`);
      console.log(`Quality: ${quality}\n`);

      try {
        const result = await generateImage(prompt, { size, quality });

        // Calculate cost based on quality
        const estimatedCost = quality === 'hd' ? 0.08 : 0.04;

        // Track in database
        await trackGeneration({
          ...result,
          generatedBy: 'cli',
          estimatedCost
        });

        console.log(`\n✅ Success!`);
        console.log(`📁 File: ${result.path}`);
        console.log(`🔗 URL: ${result.url}`);
        console.log(`📐 Size: ${result.size}`);
        console.log(`🎨 Model: ${result.model}`);
        console.log(`💰 Cost: $${estimatedCost.toFixed(2)}`);
        if (result.revisedPrompt && result.revisedPrompt !== prompt) {
          console.log(`\nℹ️  Revised prompt: "${result.revisedPrompt}"`);
        }
        console.log();

      } catch (error) {
        console.error(`\n❌ Generation failed: ${error.message}\n`);
        process.exit(1);
      }

      break;
    }

    case 'list': {
      const limitArg = args.find(a => a.startsWith('--limit='));
      const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 10;

      console.log(`\n📸 Recent Generations (last ${limit})\n`);

      try {
        const generations = await getRecentGenerations(limit, 0);

        if (generations.length === 0) {
          console.log('No generations found. Try generating one first!\n');
        } else {
          generations.forEach((gen, idx) => {
            const promptPreview = gen.prompt.length > 60
              ? gen.prompt.substring(0, 60) + '...'
              : gen.prompt;

            console.log(`${idx + 1}. ID ${gen.id} — ${gen.generated_at.toISOString().substring(0, 19)}`);
            console.log(`   "${promptPreview}"`);
            console.log(`   Size: ${gen.size} | By: ${gen.generated_by} | Cost: $${gen.cost_usd}`);
            console.log(`   URL: ${gen.public_url}\n`);
          });
        }

      } catch (error) {
        console.error(`\n❌ Failed to list generations: ${error.message}\n`);
        process.exit(1);
      }

      break;
    }

    case 'stats': {
      console.log(`\n📊 DALL-E 3 Image Generator — Statistics\n`);

      try {
        const [dbStats, dirStats, topUsers] = await Promise.all([
          getGenerationStats(),
          getDirectoryStats(),
          getTopUsers(5)
        ]);

        console.log(`Database:`);
        console.log(`  Total generations: ${dbStats.total}`);
        console.log(`  Total cost: $${dbStats.total_cost || 0}`);
        console.log(`  Unique users: ${dbStats.unique_users}`);
        if (dbStats.first_generation) {
          console.log(`  First generation: ${dbStats.first_generation.toISOString().substring(0, 19)}`);
        }
        if (dbStats.last_generation) {
          console.log(`  Last generation: ${dbStats.last_generation.toISOString().substring(0, 19)}`);
        }

        console.log(`\nFilesystem:`);
        console.log(`  Images on disk: ${dirStats.count}`);
        console.log(`  Total size: ${dirStats.totalSizeMB} MB`);
        console.log(`  Average size: ${dirStats.avgSizeKB} KB`);
        console.log(`  Directory: ${dirStats.directory}`);

        if (topUsers.length > 0) {
          console.log(`\nTop Users:`);
          topUsers.forEach((user, idx) => {
            console.log(`  ${idx + 1}. ${user.generated_by}: ${user.count} images ($${user.total_cost})`);
          });
        }

        console.log();

      } catch (error) {
        console.error(`\n❌ Failed to get stats: ${error.message}\n`);
        process.exit(1);
      }

      break;
    }

    case 'help':
    case '--help':
    case '-h':
      printUsage();
      break;

    default:
      console.error(`❌ Unknown command: ${command}\n`);
      printUsage();
      process.exit(1);
  }

  // Close database connection
  await pool.end();
  process.exit(0);
}

function printUsage() {
  console.log(`
🎨 DALL-E 3 Image Generator — AI Image Generator

Usage:
  node tools/images/cli.js generate "prompt" [--size=SIZE] [--quality=QUALITY]
  node tools/images/cli.js list [--limit=N]
  node tools/images/cli.js stats
  node tools/images/cli.js help

Commands:
  generate, gen    Generate an image from a text prompt
  list             List recent generations
  stats            Show usage statistics
  help             Show this help message

Options:
  --size=SIZE      Image size: square|landscape|portrait|wide (default: square)
  --quality=QUAL   Quality: standard|hd (default: standard)
                   standard: $0.04/image | hd: $0.08/image
  --limit=N        Limit number of results (default: 10)

Examples:
  # Generate a square image for Instagram (standard quality)
  node tools/images/cli.js generate "luxury Dubai villa with pool, sunset" --size=square

  # Generate a wide banner for website (HD quality)
  node tools/images/cli.js gen "modern office interior, Dubai" --size=wide --quality=hd

  # List last 20 generations
  node tools/images/cli.js list --limit=20

  # Show statistics
  node tools/images/cli.js stats
`);
}

// Run CLI
main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
