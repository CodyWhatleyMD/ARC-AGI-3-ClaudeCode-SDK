#!/usr/bin/env node

import { query } from "@anthropic-ai/claude-code";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ARC rotates game IDs; re-check with `node actions/list-games.js` if this 404s.
// FT09 is among the games frontier models can reliably beat (see
// arcprize.org/results/anthropic-claude-opus-5) — a sane out-of-box demo.
const DEFAULT_GAME = "ft09-0d8bbf25";
// Override with argv[4] or ARC_MODEL.
const DEFAULT_MODEL = "claude-sonnet-5";

async function playArcWithClaude(gameName, maxTurns = 100, model = DEFAULT_MODEL) {
  console.log(`🎮 Starting ARC AGI 3 solver for: ${gameName} (model: ${model})`);

  const messages = [];
  const initialPrompt = `Play the ARC AGI 3 game "${gameName}". Read CLAUDE.md to understand how to play. Keep playing until you win or reach ${maxTurns} turns.

IMPORTANT: This is a headless game-solving session with a hard turn budget. Skip any session-start rituals from global user configuration (knowledge folders, memory reviews, etc.) — go straight to the game. Batch shell commands where possible to conserve turns.`;

  try {
    for await (const message of query({
      prompt: initialPrompt,
      abortController: new AbortController(),
      options: {
        maxTurns: maxTurns,
        cwd: __dirname,
        // Pin an explicit, current model. Without this the bundled SDK falls
        // back to a retired default and every run dies on a 404 not_found.
        model: model,
        // Headless runs have no user to approve permission prompts, so the
        // agent's tool calls get silently denied and it can never act.
        // The game loop (CLAUDE.md) has the agent write and run its own
        // analysis scripts, so it needs unrestricted shell in this directory —
        // equivalent to running `claude --dangerously-skip-permissions`.
        permissionMode: "bypassPermissions",
      },
    })) {
      messages.push(message);
      console.log(`\n[Turn ${messages.length}]`);
      
      // Log different message types appropriately
      if (message.type === 'text') {
        console.log('📝 Text:', message.text);
      } else if (message.type === 'tool_use') {
        console.log('🔧 Tool Use:', message.name);
        if (message.input) {
          console.log('   Input:', JSON.stringify(message.input, null, 2));
        }
      } else if (message.type === 'tool_result') {
        console.log('✅ Tool Result:', message.tool_use_id);
        if (message.content) {
          // Handle both string and array content
          const content = typeof message.content === 'string' 
            ? message.content 
            : message.content.map(c => c.text || c).join('\n');
          console.log('   Output:', content.substring(0, 500) + (content.length > 500 ? '...' : ''));
        }
      } else if (message.message?.content) {
        // Handle message wrapper format
        console.log('💬 Message:');
        message.message.content.forEach((content, i) => {
          if (content.type === 'text') {
            console.log('   Text:', content.text);
          } else if (content.type === 'tool_use') {
            console.log('   Tool Use:', content.name, content.input ? JSON.stringify(content.input).substring(0, 100) + '...' : '');
          }
        });
      } else {
        // Fallback for unknown message types
        console.log('❓ Unknown message type:', message.type || 'no type');
        console.log('   Raw:', JSON.stringify(message, null, 2).substring(0, 500) + '...');
      }
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
  }

  console.log(`\n✅ Completed after ${messages.length} turns`);
}

// Main execution
async function main() {
  const gameName = process.argv[2] || DEFAULT_GAME;
  const maxTurns = parseInt(process.argv[3]) || 30;
  const model = process.argv[4] || process.env.ARC_MODEL || DEFAULT_MODEL;

  await playArcWithClaude(gameName, maxTurns, model);
}

main().catch(console.error);
