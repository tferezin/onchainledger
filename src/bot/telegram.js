/**
 * Telegram Bot for OnChainLedger
 * Provides free score checks and comparisons via Telegram
 */

import TelegramBot from 'node-telegram-bot-api';
import { handleStart, handleHelp, handleScore, handleCompare, handleAnalyze } from './commands.js';

let bot = null;

/**
 * Initialize and start the Telegram bot
 * @returns {TelegramBot|null} Bot instance or null if not configured
 */
export function startTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.log('Telegram bot: TELEGRAM_BOT_TOKEN not set, skipping bot initialization');
    return null;
  }

  try {
    // Create bot instance
    bot = new TelegramBot(token, { polling: true });

    // Register command handlers
    bot.onText(/\/start/, (msg) => handleStart(bot, msg));
    bot.onText(/\/help/, (msg) => handleHelp(bot, msg));

    bot.onText(/\/score(?:\s+(.+))?/, (msg, match) => {
      const tokenInput = match[1]?.trim();
      handleScore(bot, msg, tokenInput);
    });

    bot.onText(/\/compare(?:\s+(.+))?/, (msg, match) => {
      const args = match[1]?.trim().split(/\s+/);
      handleCompare(bot, msg, args);
    });

    bot.onText(/\/analyze/, (msg) => handleAnalyze(bot, msg));

    // Handle errors
    bot.on('polling_error', (error) => {
      console.error('Telegram polling error:', error.message);
    });

    bot.on('error', (error) => {
      console.error('Telegram bot error:', error.message);
    });

    // Get bot info
    bot.getMe().then((botInfo) => {
      console.log(`Telegram bot started: @${botInfo.username}`);
    }).catch((err) => {
      console.error('Failed to get bot info:', err.message);
    });

    return bot;
  } catch (error) {
    console.error('Failed to start Telegram bot:', error.message);
    return null;
  }
}

/**
 * Stop the Telegram bot
 */
export function stopTelegramBot() {
  if (bot) {
    bot.stopPolling();
    bot = null;
    console.log('Telegram bot stopped');
  }
}

/**
 * Get the bot instance
 * @returns {TelegramBot|null}
 */
export function getBot() {
  return bot;
}

export default startTelegramBot;
