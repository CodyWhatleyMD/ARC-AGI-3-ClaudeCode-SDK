import { program } from 'commander';
import chalk from 'chalk';
import { makeRequest, readJSON, writeJSON, saveFrame, frameStats, SESSIONS_FILE } from '../utils.js';

program
  .requiredOption('--type <number>', 'Action type (1-6)', parseInt)
  .option('--x <number>', 'X coordinate (0-63) for ACTION6', parseInt)
  .option('--y <number>', 'Y coordinate (0-63) for ACTION6', parseInt)
  .option('--game <game-id>', 'Game ID (uses last active if not specified)')
  .option('--reasoning <json>', 'Reasoning metadata as JSON')
  .parse();

const options = program.opts();

function generateCaption(actionType, x, y, prevScore, newScore) {
  const scoreDiff = newScore - prevScore;
  let actionDesc = `ACTION${actionType}`;
  
  if (actionType === 6 && x !== undefined && y !== undefined) {
    actionDesc = `ACTION6 at (${x}, ${y})`;
  }
  
  if (scoreDiff > 0) {
    return `Executed ${actionDesc} - Score increased by ${scoreDiff}`;
  } else if (scoreDiff < 0) {
    return `Executed ${actionDesc} - Score decreased by ${Math.abs(scoreDiff)}`;
  } else {
    return `Executed ${actionDesc}`;
  }
}

async function executeAction() {
  try {
    if (options.type < 1 || options.type > 6) {
      console.error(chalk.red('Action type must be between 1 and 6'));
      process.exit(1);
    }
    
    if (options.type === 6 && (options.x === undefined || options.y === undefined)) {
      console.error(chalk.red('ACTION6 requires --x and --y coordinates'));
      process.exit(1);
    }
    
    if (options.type === 6 && (options.x < 0 || options.x > 63 || options.y < 0 || options.y > 63)) {
      console.error(chalk.red('Coordinates must be between 0 and 63'));
      process.exit(1);
    }
    
    const sessions = await readJSON(SESSIONS_FILE);
    if (!sessions || Object.keys(sessions).length === 0) {
      console.error(chalk.red('No active game sessions. Start a game first:'));
      console.error(chalk.gray('  node start-game.js --game <game-id>'));
      process.exit(1);
    }
    
    let sessionGuid;
    let session;
    
    if (options.game) {
      // Find session by game ID
      const sessionEntry = Object.entries(sessions)
        .find(([guid, s]) => s.gameId === options.game);
      
      if (!sessionEntry) {
        console.error(chalk.red(`No session found for game: ${options.game}`));
        process.exit(1);
      }
      
      [sessionGuid, session] = sessionEntry;
    } else {
      // Find the most recent active session
      const activeSessions = Object.entries(sessions)
        .filter(([_, s]) => s.state === 'NOT_FINISHED')
        .sort(([_, a], [__, b]) => new Date(b.startTime) - new Date(a.startTime));
      
      if (activeSessions.length === 0) {
        console.error(chalk.red('No active games found. Start a new game.'));
        process.exit(1);
      }
      
      [sessionGuid, session] = activeSessions[0];
      if (activeSessions.length > 1) {
        console.log(chalk.yellow(`Multiple active games found. Using: ${session.gameId}`));
      }
    }
    
    if (session.state !== 'NOT_FINISHED') {
      console.error(chalk.red(`Game is in ${session.state} state. Reset the game to continue.`));
      process.exit(1);
    }

    // The API reports which actions this game accepts; fail fast on illegal ones
    if (session.availableActions && !session.availableActions.includes(options.type)) {
      console.error(chalk.red(`ACTION${options.type} is not available in this game.`));
      console.error(chalk.yellow('Available actions:'), session.availableActions.map(a => `ACTION${a}`).join(', '));
      process.exit(1);
    }
    
    let requestBody = {
      game_id: session.gameId,
      guid: sessionGuid
    };
    
    if (options.reasoning) {
      try {
        requestBody.reasoning = JSON.parse(options.reasoning);
      } catch (e) {
        console.error(chalk.red('Invalid JSON in reasoning:'), e.message);
        process.exit(1);
      }
    }
    
    let endpoint = `/api/cmd/ACTION${options.type}`;
    
    if (options.type === 6) {
      requestBody.x = options.x;
      requestBody.y = options.y;
    }
    
    console.log(chalk.blue(`Executing ACTION${options.type}...`));
    
    const response = await makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
    
    const stats = frameStats(response);
    const caption = generateCaption(
      options.type,
      options.x,
      options.y,
      session.score,
      stats.score
    );
    
    const actionData = {
      type: `ACTION${options.type}`,
      params: options.type === 6 ? { x: options.x, y: options.y } : {}
    };
    
    await saveFrame(
      session.guid,
      session.frameCount,
      { ...response, game_id: session.gameId },
      actionData,
      caption
    );
    
    session.state = response.state;
    session.score = stats.score;
    if (stats.availableActions) session.availableActions = stats.availableActions;
    session.frameCount++;
    session.actionCount++;

    console.log(chalk.green('\n✓ Action executed successfully!'));
    console.log(chalk.blue('State:'), response.state);
    console.log(chalk.blue('Levels completed:'), `${stats.score}/${stats.winScore}`);
    if (stats.availableActions) {
      console.log(chalk.blue('Available actions:'), stats.availableActions.map(a => `ACTION${a}`).join(', '));
    }
    
    if (response.state === 'WIN') {
      console.log(chalk.green.bold('\n🎉 GAME WON! 🎉'));
    } else if (response.state === 'GAME_OVER') {
      console.log(chalk.red.bold('\n💀 GAME OVER 💀'));
    }
    
    // Diff layer 0 against the previous frame (frame is [layers][rows][cols])
    const frameChanges = [];
    if (session.lastFrame) {
      const grid = response.frame[0];
      for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
          if (session.lastFrame[0]?.[row]?.[col] !== grid[row][col]) {
            frameChanges.push(`(${row},${col})`);
          }
        }
      }
    }

    if (frameChanges.length > 0 && frameChanges.length < 20) {
      console.log(chalk.gray(`Pixels changed: ${frameChanges.join(', ')}`));
    } else if (frameChanges.length >= 20) {
      console.log(chalk.gray(`${frameChanges.length} pixels changed`));
    }

    // Persist lastFrame so the next invocation can diff against it
    session.lastFrame = response.frame;
    await writeJSON(SESSIONS_FILE, sessions);
    
  } catch (error) {
    console.error(chalk.red('Error executing action:'), error.message);
    process.exit(1);
  }
}

executeAction();