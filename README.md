# ARC AGI 3 Benchmark with Claude Code

This project provides a command-line interface for solving ARC AGI 3 (Abstraction and Reasoning Corpus) puzzles using Claude through the Claude Code terminal.

Read more on ARC here: https://three.arcprize.org/

## Prerequisites

- Claude Code CLI (`claude` command available in terminal)
- ARC AGI 3 API key (get one from https://three.arcprize.org)

## System Initialization

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/ThariqS/ARC-AGI-3-ClaudeCode-SDK.git
cd ARC-AGI-3-ClaudeCode-SDK

# Install required dependencies
npm install
```

### 2. Initialize the System with API Key

You'll need an ARC AGI 3 API key to use this system. Initialize with:

Or using the full command:

```bash
node init.js --api-key YOUR_API_KEY
```

This will create a `config.json` file with your API credentials.

### 3. Verify Installation

List available games to ensure everything is working:

```bash
node actions/list-games.js
```

## Getting Started

1. After initialization, run `claude` to start an interactive session with Claude
2. Claude will have access to all game scripts and helper functions
3. Ask Claude to play a specific game or explore available games
4. Give instructions to Claude on how to play `e.g. analyze patterns after every game`

## Automated Solver

Use the `play-arc-with-claude.js` script to run the Claude Code SDK to independently solve ARC AGI 3 puzzles:

```bash
# Basic usage (default game, 30 turns)
node play-arc-with-claude.js

# Specify a game (IDs rotate — get current ones from node actions/list-games.js)
node play-arc-with-claude.js ls20-9607627b

# Specify game and 100 maximum turns
node play-arc-with-claude.js ls20-9607627b 100

# Optionally pick the model (also settable via ARC_MODEL env var)
node play-arc-with-claude.js ls20-9607627b 100 claude-sonnet-5
```

> **Note:** the solver runs the Claude Code agent with permissions bypassed
> (`bypassPermissions`) so it can execute the game scripts and write its own
> analysis helpers unattended. Only run it in a directory you trust it to work in.

This script will:

- Automatically start Claude Code in the project directory
- Have Claude read the game instructions from CLAUDE.md
- Play the specified game until winning or reaching the turn limit
- Log each turn's actions and results to the console

### Script Arguments

- **Game Name** (optional): The ID of the game to play (see `node actions/list-games.js` for current IDs)
- **Max Turns** (optional): Maximum number of agent turns before stopping. Defaults to 30
- **Model** (optional): Claude model ID to use. Defaults to "claude-sonnet-5"; also settable via `ARC_MODEL`

## How to Play

Claude will help you solve ARC AGI 3 puzzles by analyzing visual patterns and reasoning about transformations. Here's the typical workflow claude will use:

### 1. List Available Games

```bash
node actions/list-games.js
```

### 2. Start Tracking Your Progress

```bash
node actions/open-scorecard.js
```

### 3. Begin a Game

```bash
node actions/start-game.js --game [game-id]
```

### 4. Make Moves

Simple directional moves:

```bash
# Conventionally: 1=Up, 2=Down, 3=Left, 4=Right, 5=Enter/Space —
# but the actual effect depends on the game; discover it by experimenting.
node actions/action.js --type 1
node actions/action.js --type 2
node actions/action.js --type 3
node actions/action.js --type 4
node actions/action.js --type 5
```

Click at specific coordinates:

```bash
node actions/action.js --type 6 --x 10 --y 20
```

### 5. Check Game Status

```bash
node actions/status.js
```

### 6. Reset if Needed

```bash
node actions/reset-game.js
```

## Project Structure

- `actions/` - CLI scripts for game interaction
- `helpers/` - Utility functions for analyzing grids and patterns
- `frames/` - Stored game states and history
- `notes/` - Claude's analysis notes during gameplay
- `config.json` - API configuration
- `games.json` - Available games cache
- `sessions.json` - Active game sessions
- `scorecards.json` - Performance history

## Clean Scorecard Runs

ARC-AGI-3's design principles include "no pre-loaded knowledge." The `notes/` and
`games/` folders act as persistent memory across sessions — useful while iterating,
but for a scorecard run you intend to report, start clean:

```bash
rm -rf games/ sessions.json
rm -f notes/game-*.md   # keep WRITING_NOTES.MD (methodology, not game knowledge)
```

## Tips for Success

1. Ask Claude to analyze the initial frames to understand the pattern
2. Use the visualization helpers to better see the grid structure
3. Let Claude track observations in the notes folder
4. Try different approaches if the first strategy doesn't work

## Getting Help

Simply ask Claude questions about:

- Pattern analysis strategies
- Understanding specific game mechanics
- Interpreting grid visualizations
- Debugging failed attempts

Claude will use the available helper functions to analyze frames, detect patterns, and suggest next moves.
