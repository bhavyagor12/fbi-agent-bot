/**
 * Get ALL members of a Telegram group and check their First Dollar eligibility.
 *
 * Requires:
 *   - TELEGRAM_API_ID     (number, from https://my.telegram.org)
 *   - TELEGRAM_API_HASH   (string, from https://my.telegram.org)
 *   - TELEGRAM_SESSION     (optional, saved session string to skip login)
 *
 * Usage:
 *   npx tsx scripts/get-group-members.ts <groupId>
 *
 * Example:
 *   npx tsx scripts/get-group-members.ts -1001234567890
 *
 * On first run you'll be prompted to log in with your phone number.
 * After login, the script prints a session string — save it as
 * TELEGRAM_SESSION to skip login on subsequent runs.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import * as fs from "fs";
import * as path from "path";
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import * as readline from "readline";
const FIRST_DOLLAR_ONCHAIN_SCORE_URL =
  "https://app.firstdollar.money/api/onchain-score";

async function checkEligibility(telegramUsername: string) {
  const response = await fetch(FIRST_DOLLAR_ONCHAIN_SCORE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegram_username: telegramUsername }),
  });

  const data = await response.json().catch(() => ({}));
  console.log(
    `  [FirstDollar] @${telegramUsername} -> status=${response.status} response=${JSON.stringify(data)}`
  );

  if (!response.ok) {
    return { score: 0, eligible: false };
  }

  const score =
    typeof (data as Record<string, unknown>).onchain_score === "number"
      ? (data as Record<string, number>).onchain_score
      : 0;
  const eligible = (data as Record<string, unknown>).eligible === true;

  return { score, eligible };
}

// --- Config ---
const apiId = Number(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const savedSession = process.env.TELEGRAM_SESSION || "";

if (!apiId || !apiHash) {
  console.error(
    "Error: Set TELEGRAM_API_ID and TELEGRAM_API_HASH environment variables.\n" +
      "Get them from https://my.telegram.org"
  );
  process.exit(1);
}

const groupId = process.argv[2];
if (!groupId) {
  console.error("Usage: npx tsx scripts/get-group-members.ts <groupId>");
  process.exit(1);
}

// --- Helpers ---
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function getAllMembers(client: TelegramClient, chatId: string) {
  const entity = await client.getEntity(chatId);

  // For supergroups / channels
  if (entity instanceof Api.Channel || entity instanceof Api.ChannelFull) {
    const members: Api.User[] = [];
    let offset = 0;
    const batchSize = 200;

    while (true) {
      const result = await client.invoke(
        new Api.channels.GetParticipants({
          channel: entity,
          filter: new Api.ChannelParticipantsSearch({ q: "" }),
          offset,
          limit: batchSize,
          hash: BigInt(0) as unknown as Api.long,
        })
      );

      if (!(result instanceof Api.channels.ChannelParticipants)) break;

      const users = result.users.filter(
        (u): u is Api.User => u instanceof Api.User
      );
      if (users.length === 0) break;

      members.push(...users);
      offset += users.length;

      if (users.length < batchSize) break;
    }

    return members;
  }

  // For basic groups (Api.Chat)
  const fullChat = await client.invoke(
    new Api.messages.GetFullChat({ chatId: entity.id })
  );
  return fullChat.users.filter((u): u is Api.User => u instanceof Api.User);
}

// --- Main ---
async function main() {
  const session = new StringSession(savedSession);
  const client = new TelegramClient(session, apiId, apiHash!, {
    connectionRetries: 3,
  });

  await client.start({
    phoneNumber: () => prompt("Phone number (with country code): "),
    password: () => prompt("2FA password (if enabled): "),
    phoneCode: () => prompt("Login code from Telegram: "),
    onError: (err) => console.error("Auth error:", err),
  });

  // Print session string for reuse
  const sessionString = client.session.save() as unknown as string;
  if (!savedSession) {
    console.log("\n--- Save this session string as TELEGRAM_SESSION ---");
    console.log(sessionString);
    console.log("---------------------------------------------------\n");
  }

  console.log(`Fetching members for group: ${groupId}\n`);

  const members = await getAllMembers(client, groupId);
  // Filter out bots
  const realMembers = members.filter((u) => !u.bot);

  console.log(`Total members fetched: ${realMembers.length}`);
  console.log(`Checking eligibility via First Dollar onchain-score API...\n`);

  const eligible: typeof results = [];
  const notEligible: typeof results = [];
  const noUsername: typeof results = [];

  type MemberResult = {
    id: string;
    username: string;
    name: string;
    score: number;
    eligible: boolean;
  };
  const results: MemberResult[] = [];

  for (let i = 0; i < realMembers.length; i++) {
    const user = realMembers[i];
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
    const username = user.username || "";

    if (!username) {
      const entry: MemberResult = {
        id: String(user.id),
        username: "-",
        name,
        score: 0,
        eligible: false,
      };
      results.push(entry);
      noUsername.push(entry);
      continue;
    }

    const scoreCheck = await checkEligibility(username);
    const entry: MemberResult = {
      id: String(user.id),
      username: `@${username}`,
      name,
      score: scoreCheck.score,
      eligible: scoreCheck.eligible,
    };
    results.push(entry);

    if (scoreCheck.eligible) {
      eligible.push(entry);
    } else {
      notEligible.push(entry);
    }

    // Small delay to avoid rate-limiting the onchain-score API
    if ((i + 1) % 10 === 0) {
      console.log(`  Checked ${i + 1}/${realMembers.length} members...`);
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // --- Print results ---
  const col = { id: 14, user: 20, name: 22, score: 7, status: 12 };
  const divider = "-".repeat(col.id + col.user + col.name + col.score + col.status + 4);

  console.log(`\n${"ID".padEnd(col.id)}| ${"Username".padEnd(col.user)}| ${"Name".padEnd(col.name)}| ${"Score".padEnd(col.score)}| Status`);
  console.log(divider);

  for (const r of results) {
    const status = r.username === "-" ? "NO USERNAME" : r.eligible ? "ELIGIBLE" : "NOT ELIGIBLE";
    console.log(
      `${r.id.padEnd(col.id)}| ${r.username.padEnd(col.user)}| ${r.name.padEnd(col.name)}| ${String(r.score).padEnd(col.score)}| ${status}`
    );
  }

  // --- Summary ---
  console.log(`\n${divider}`);
  console.log(`SUMMARY`);
  console.log(`  Total members:    ${realMembers.length}`);
  console.log(`  Eligible:         ${eligible.length}`);
  console.log(`  Not eligible:     ${notEligible.length}`);
  console.log(`  No username:      ${noUsername.length}`);
  console.log(divider);

  // --- Save ineligible members to JSON file ---
  const ineligibleAll = [...notEligible, ...noUsername];
  const outPath = path.resolve(__dirname, `ineligible-members-${groupId}.json`);
  const outData = {
    groupId,
    checkedAt: new Date().toISOString(),
    totalMembers: realMembers.length,
    ineligibleCount: ineligibleAll.length,
    members: ineligibleAll,
  };
  fs.writeFileSync(outPath, JSON.stringify(outData, null, 2));
  console.log(`\nIneligible members saved to: ${outPath}`);

  await client.disconnect();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err.message);
    process.exit(1);
  });
