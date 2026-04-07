#!/usr/bin/env node

/**
 * Concert 3 — Repository Setup Script
 *
 * Creates the concert3 repository on GitHub and pushes all files.
 * Requires GH_CLASSIC_TOKEN environment variable with repo creation permissions.
 *
 * Usage:
 *   GH_CLASSIC_TOKEN=ghp_xxx node scripts/setup.mjs
 *
 * Or via the GitHub Actions workflow "Deploy Concert 3 Repo" in the concert repo.
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const TOKEN = process.env.GH_CLASSIC_TOKEN;
const ORG = process.env.GITHUB_ORG || "he3-org";
const REPO_NAME = process.env.REPO_NAME || "concert3";
const VISIBILITY = process.env.REPO_VISIBILITY || "private";

if (!TOKEN) {
  console.error(
    "❌ GH_CLASSIC_TOKEN environment variable is required.\n" +
      "   Set it with a classic personal access token that has repo creation permissions.\n" +
      "   Usage: GH_CLASSIC_TOKEN=ghp_xxx node scripts/setup.mjs"
  );
  process.exit(1);
}

async function main() {
  console.log(`\n🎵 Concert 3 — Repository Setup`);
  console.log(`   Org: ${ORG}`);
  console.log(`   Repo: ${REPO_NAME}`);
  console.log(`   Visibility: ${VISIBILITY}\n`);

  // Step 1: Check if repo already exists
  console.log("📋 Checking if repository exists...");
  const checkResponse = await fetch(
    `https://api.github.com/repos/${ORG}/${REPO_NAME}`,
    {
      headers: {
        Authorization: `token ${TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  let repoExists = checkResponse.status === 200;

  if (!repoExists) {
    // Step 2: Create the repository
    console.log("🏗️  Creating repository...");
    const createResponse = await fetch(
      `https://api.github.com/orgs/${ORG}/repos`,
      {
        method: "POST",
        headers: {
          Authorization: `token ${TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: REPO_NAME,
          description:
            "GitHub-native SDLC orchestration — AI as workers, not managers",
          private: VISIBILITY === "private",
          auto_init: false,
          has_issues: true,
          has_projects: true,
          has_wiki: false,
        }),
      }
    );

    if (!createResponse.ok) {
      const error = await createResponse.json();
      console.error("❌ Failed to create repository:", error.message);
      process.exit(1);
    }

    console.log(`✅ Repository created: https://github.com/${ORG}/${REPO_NAME}`);
  } else {
    console.log(`ℹ️  Repository already exists: https://github.com/${ORG}/${REPO_NAME}`);
  }

  // Step 3: Initialize git and push
  console.log("\n📦 Initializing git and pushing files...");

  const run = (cmd) => {
    console.log(`   $ ${cmd}`);
    execSync(cmd, { cwd: ROOT, stdio: "inherit" });
  };

  if (!existsSync(resolve(ROOT, ".git"))) {
    run("git init");
    run("git checkout -b main");
  }

  // Configure git for this push
  run('git config user.name "Concert Bot"');
  run('git config user.email "concert@github.com"');

  // Add all files
  run("git add -A");

  try {
    run('git commit -m "feat: initial Concert 3 implementation"');
  } catch {
    console.log("   (no changes to commit)");
  }

  // Set remote and push
  const remoteUrl = `https://x-access-token:${TOKEN}@github.com/${ORG}/${REPO_NAME}.git`;

  try {
    run(`git remote remove origin`);
  } catch {
    // Remote may not exist yet
  }
  run(`git remote add origin ${remoteUrl}`);
  run("git push -u origin main --force");

  console.log(`\n🎉 Concert 3 deployed to https://github.com/${ORG}/${REPO_NAME}`);
  console.log("\n📌 Next steps:");
  console.log(
    "   1. Go to the repo → Actions → 🎵 Concert Init → Run workflow"
  );
  console.log("   2. Enter a mission name and description");
  console.log("   3. Edit VISION.md, then comment /accept on the mission issue");
  console.log("   4. Watch the pipeline run automatically! 🚀\n");
}

main().catch((err) => {
  console.error("❌ Setup failed:", err);
  process.exit(1);
});
