import fs from "fs";
import path from "path";
import readline from "readline";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import connectDB from "../lib/mongodb";
import User from "../models/User";

/**
 * ProjectSphere — Phase 1: Secure First Admin Provisioning Script (Hardened)
 *
 * This script safely provisions an administrator account in MongoDB Atlas
 * using the existing User model and bcrypt password hashing configuration.
 *
 * Security Rules Strictly Enforced:
 * 1. Passwords are NEVER accepted through CLI arguments (removed --password).
 * 2. All password creation and reset operations require hidden interactive input.
 * 3. Enforces UTF-8 password byte length strictly between 8 and 72 bytes.
 * 4. Requires password confirmation for every creation or reset.
 * 5. If terminal does not support secure hidden input (TTY raw mode), halts immediately.
 * 6. Database connection and teardown are fully encapsulated in try/finally.
 * 7. Admin password reset alters ONLY the password hash; never modifies administrator name.
 * 8. Account promotion alters ONLY the role field; preserves existing password and profile fields.
 * 9. Email and name validations are enforced universally (CLI flags and interactive prompts).
 * 10. All cancellation, EOF, and Ctrl+C paths execute centralized terminal cleanup and disconnect.
 */

// Load .env.local if MONGODB_URI is not present in process.env
function loadEnvironment(): void {
  if (process.env.MONGODB_URI) {
    return;
  }

  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    try {
      if (typeof process.loadEnvFile === "function") {
        process.loadEnvFile(envPath);
      } else {
        const content = fs.readFileSync(envPath, "utf-8");
        for (const line of content.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            if (
              (val.startsWith('"') && val.endsWith('"')) ||
              (val.startsWith("'") && val.endsWith("'"))
            ) {
              val = val.slice(1, -1);
            }
            if (process.env[key] === undefined) {
              process.env[key] = val;
            }
          }
        }
      }
    } catch {
      // Silently proceed; validation will handle missing MONGODB_URI
    }
  }
}

function isValidEmail(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  return (
    trimmed.length > 0 &&
    trimmed.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
  );
}

function isValidName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 100;
}

// Prompt for standard visible input
function promptVisible(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Prompt for masked / hidden password input — halts if TTY is not available.
// Enter, EOF (Ctrl+D), and Ctrl+C share centralized terminal state cleanup.
function promptHidden(query: string): Promise<string> {
  const stdin = process.stdin;
  const stdout = process.stdout;

  const isRawSupported = Boolean(
    stdin.isTTY && typeof stdin.setRawMode === "function"
  );

  if (!isRawSupported) {
    throw new Error(
      "Terminal does not support secure hidden input (TTY raw mode unavailable). " +
      "Password operations cannot be completed safely without masked input. " +
      "Please run this script directly in an interactive terminal."
    );
  }

  return new Promise((resolve, reject) => {
    stdout.write(query);

    const wasRaw = stdin.isRaw ?? false;
    let input = "";
    let cleanedUp = false;

    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      try {
        stdin.setRawMode(wasRaw);
      } catch {
        // Ignore setRawMode errors if stream already closed
      }
      stdin.removeListener("data", onData);
      stdin.pause();
      stdout.write("\n");
    };

    const onData = (chunk: Buffer | string) => {
      const str = chunk.toString();

      for (const char of str) {
        if (char === "\r" || char === "\n") {
          // Enter: accept complete password
          cleanup();
          resolve(input);
          return;
        } else if (char === "\u0004") {
          // Ctrl+D (EOF): abort without accepting partial password
          cleanup();
          reject(new Error("Operation cancelled by user (EOF)."));
          return;
        } else if (char === "\u0003") {
          // Ctrl+C (SIGINT)
          cleanup();
          reject(new Error("Operation cancelled by user (SIGINT)."));
          return;
        } else if (char === "\u0008" || char === "\x7f") {
          // Backspace
          if (input.length > 0) {
            input = input.slice(0, -1);
            stdout.write("\b \b");
          }
        } else if (char.charCodeAt(0) >= 32) {
          // Normal printable character
          input += char;
          stdout.write("*");
        }
      }
    };

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf-8");
    stdin.on("data", onData);
  });
}

// Reusable secure password entry validating 8–72 bytes (UTF-8) with confirmation
async function acquireSecurePassword(
  promptLabel: string,
  confirmLabel: string
): Promise<string> {
  while (true) {
    const password = await promptHidden(promptLabel);
    if (!password) {
      console.log("Password cannot be empty. Please try again.\n");
      continue;
    }

    const byteLength = Buffer.byteLength(password, "utf8");
    if (byteLength < 8) {
      console.log("Password must be at least 8 bytes (UTF-8). Please try again.\n");
      continue;
    }
    if (byteLength > 72) {
      console.log("Password cannot exceed 72 bytes (UTF-8). Please try again.\n");
      continue;
    }

    const confirmation = await promptHidden(confirmLabel);
    if (password !== confirmation) {
      console.log("Passwords do not match. Please try again.\n");
      continue;
    }

    return password;
  }
}

async function main(): Promise<void> {
  console.log("=======================================================");
  console.log(" ProjectSphere — Administrator Account Provisioning CLI ");
  console.log("=======================================================\n");

  loadEnvironment();

  if (!process.env.MONGODB_URI) {
    console.error(
      "[ERROR] MONGODB_URI is not defined. Please verify .env.local exists with MONGODB_URI set."
    );
    process.exit(1);
  }

  // Parse optional CLI arguments: --name and --email only.
  // Passwords must NEVER be accepted through process arguments.
  const args = process.argv.slice(2);
  let cliName = "";
  let cliEmail = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--name" && args[i + 1]) {
      cliName = args[++i].trim();
    } else if (args[i] === "--email" && args[i + 1]) {
      cliEmail = args[++i].trim();
    } else if (args[i] === "--password") {
      console.error(
        "[SECURITY ERROR] The --password argument is forbidden. Passwords must be entered securely via interactive prompt."
      );
      process.exit(1);
    }
  }

  // 1. Gather & validate administrator email (CLI flag or interactive prompt)
  let email = "";
  if (cliEmail) {
    if (isValidEmail(cliEmail)) {
      email = cliEmail.toLowerCase();
    } else {
      console.log(`[WARNING] Provided --email "${cliEmail}" is invalid. Please enter a valid email.`);
    }
  }
  while (!email) {
    const input = await promptVisible("Enter Administrator Email: ");
    const candidate = input.trim().toLowerCase();
    if (!candidate) {
      console.log("Email cannot be empty.");
    } else if (!isValidEmail(candidate)) {
      console.log("Invalid email address format (max 254 chars). Please try again.");
    } else {
      email = candidate;
    }
  }

  // All database operations, including connection, reside inside try/finally.
  try {
    console.log("\nConnecting to MongoDB Atlas...");
    await connectDB();
    console.log("Connected to database successfully.\n");

    // Existing password hash is intentionally not selected or retrieved into memory
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (existingUser.role === "admin") {
        console.log(
          `[NOTICE] Account with email "${email}" already exists and has role: "admin".`
        );
        console.log(`  User ID : ${existingUser._id.toString()}`);
        console.log(`  Name    : ${existingUser.name}`);
        console.log(`  Role    : ${existingUser.role}\n`);

        const answer = await promptVisible(
          "Do you want to reset this administrator's password? (yes/no): "
        );

        if (answer.toLowerCase() !== "yes") {
          console.log("\n[INFO] No changes were made to the existing administrator account.");
          return;
        }

        // Update ONLY the password hash. Do not modify administrator name or other fields.
        const newPassword = await acquireSecurePassword(
          "Enter new administrator password (8-72 bytes): ",
          "Confirm new administrator password: "
        );

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        existingUser.password = hashedPassword;
        await existingUser.save();

        console.log(`\n[SUCCESS] Password updated successfully for administrator "${email}".`);
        return;
      } else {
        // Account exists with role "student" or "faculty"
        console.log(
          `[NOTICE] Found existing account for "${email}" with role: "${existingUser.role}".`
        );
        console.log(`  User ID : ${existingUser._id.toString()}`);
        console.log(`  Name    : ${existingUser.name}`);
        console.log(`  Role    : ${existingUser.role}\n`);

        const promoteAnswer = await promptVisible(
          `Do you want to promote this user to role "admin"? (yes/no): `
        );

        if (promoteAnswer.toLowerCase() !== "yes") {
          console.log(`\n[INFO] Operation cancelled. No changes were made to user "${email}".`);
          return;
        }

        // Preserve existing name and other profile fields. Change ONLY role by default.
        existingUser.role = "admin";

        const updatePassAnswer = await promptVisible(
          "Do you also want to update their password? (yes/no): "
        );

        if (updatePassAnswer.toLowerCase() === "yes") {
          const newPassword = await acquireSecurePassword(
            "Enter new password (8-72 bytes): ",
            "Confirm new password: "
          );
          const hashedPassword = await bcrypt.hash(newPassword, 12);
          existingUser.password = hashedPassword;
        }

        await existingUser.save();

        console.log(`\n[SUCCESS] Account successfully promoted to administrator!`);
        console.log(`  User ID : ${existingUser._id.toString()}`);
        console.log(`  Name    : ${existingUser.name}`);
        console.log(`  Email   : ${existingUser.email}`);
        console.log(`  Role    : admin`);
        return;
      }
    }

    // Account does not exist — Create new Administrator account
    console.log(`[INFO] No account found with email "${email}". Creating new Administrator...\n`);

    // 2. Gather & validate administrator name
    let name = "";
    if (cliName) {
      if (isValidName(cliName)) {
        name = cliName;
      } else {
        console.log(`[WARNING] Provided --name "${cliName}" must be 2-100 characters.`);
      }
    }
    while (!name) {
      const input = await promptVisible("Enter Administrator Name (2-100 chars): ");
      const candidate = input.trim();
      if (!isValidName(candidate)) {
        console.log("Name must be between 2 and 100 characters. Please try again.");
      } else {
        name = candidate;
      }
    }

    const password = await acquireSecurePassword(
      "Enter Administrator Password (8-72 bytes): ",
      "Confirm Administrator Password: "
    );

    // Hash password using exact bcrypt salt cost of 12 (identical to registration route)
    const hashedPassword = await bcrypt.hash(password, 12);

    const newAdmin = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
    });

    console.log("\n[SUCCESS] Administrator account successfully created!");
    console.log(`  User ID : ${newAdmin._id.toString()}`);
    console.log(`  Name    : ${newAdmin.name}`);
    console.log(`  Email   : ${newAdmin.email}`);
    console.log(`  Role    : ${newAdmin.role}`);
  } catch (error: unknown) {
    console.error("\n[ERROR] An error occurred during admin provisioning:");
    if (error instanceof Error) {
      console.error(`  ${error.message}`);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  } finally {
    // Disconnect attempted in all completion, cancellation, and failure paths.
    try {
      await mongoose.disconnect();
      console.log("\nDatabase connection closed.");
    } catch {
      // Disconnect error ignored on exit
    }
  }
}

void main();
