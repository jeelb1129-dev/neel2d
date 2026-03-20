import { test, expect } from '@playwright/test';

test.describe('Neel2D App', () => {
  test.beforeEach(async ({ page }) => {
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });
    await page.goto('/');
  });

  test('page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle('Neel2D — AI Companion');
  });

  test('background particles canvas is present', async ({ page }) => {
    const canvas = page.locator('#bg-particles');
    await expect(canvas).toBeVisible();
  });

  test('character canvas is present', async ({ page }) => {
    const canvas = page.locator('#character-canvas');
    await expect(canvas).toBeVisible();
  });

  test('character name tag shows Neel', async ({ page }) => {
    const nameTag = page.locator('#char-name');
    await expect(nameTag).toHaveText('Neel');
  });

  test('character mood tag shows relaxed by default', async ({ page }) => {
    const moodTag = page.locator('#char-mood');
    await expect(moodTag).toHaveText('relaxed');
  });

  test('chat panel is visible', async ({ page }) => {
    const panel = page.locator('#chat-panel');
    await expect(panel).toBeVisible();
  });

  test('welcome message is shown', async ({ page }) => {
    const welcome = page.locator('.welcome-msg');
    await expect(welcome).toBeVisible();
    await expect(welcome).toContainText('Say hello to');
    await expect(welcome).toContainText('Neel');
  });

  test('chat input is focused and functional', async ({ page }) => {
    const input = page.locator('#chat-input');
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();
    await expect(input).toHaveAttribute('placeholder', 'Type a message...');
  });

  test('send button is present', async ({ page }) => {
    const btn = page.locator('#btn-send');
    await expect(btn).toBeVisible();
  });

  test('mic button is present in chat input area', async ({ page }) => {
    const btn = page.locator('#btn-mic');
    await expect(btn).toBeVisible();
  });

  test('typing status shows Online', async ({ page }) => {
    const status = page.locator('#typing-status');
    await expect(status).toHaveText('Online');
  });

  test('floating controls are visible', async ({ page }) => {
    await expect(page.locator('#btn-toggle-panel')).toBeVisible();
    await expect(page.locator('#btn-toggle-voice')).toBeVisible();
    await expect(page.locator('#btn-fullscreen')).toBeVisible();
  });

  test('voice button is active by default', async ({ page }) => {
    const voiceBtn = page.locator('#btn-toggle-voice');
    await expect(voiceBtn).toHaveClass(/active/);
  });

  test('chat panel can be minimized and restored', async ({ page }) => {
    const panel = page.locator('#chat-panel');
    const toggleBtn = page.locator('#btn-toggle-chat');

    // Minimize
    await toggleBtn.click();
    await expect(panel).toHaveClass(/minimized/);

    // Restore via floating toggle button
    await page.locator('#btn-toggle-panel').click();
    await expect(panel).not.toHaveClass(/minimized/);
  });

  test('user can type and send a message', async ({ page }) => {
    const input = page.locator('#chat-input');
    const messages = page.locator('#chat-messages');

    await input.fill('Hello Neel!');
    await page.keyboard.press('Enter');

    // Welcome message should be gone
    await expect(page.locator('.welcome-msg')).toHaveCount(0);

    // User message should appear
    const userMsg = messages.locator('.msg.user .msg-bubble');
    await expect(userMsg).toHaveText('Hello Neel!');

    // Input should be cleared
    await expect(input).toHaveValue('');
  });

  test('thinking indicator shows while waiting for AI', async ({ page }) => {
    const input = page.locator('#chat-input');

    await input.fill('Hello!');
    await page.keyboard.press('Enter');

    // Thinking dots should appear briefly
    const thinking = page.locator('.thinking-dots');
    await expect(thinking).toBeVisible({ timeout: 3000 });
  });

  test('mood updates after AI response', async ({ page }) => {
    const input = page.locator('#chat-input');
    const mood = page.locator('#char-mood');

    await input.fill('Hello!');
    await page.keyboard.press('Enter');

    // Wait for AI response (thinking disappears)
    await expect(page.locator('.thinking-dots')).toHaveCount(0, { timeout: 20000 });

    // Mood should have been updated from the AI response
    const currentMood = await mood.textContent();
    // Should be a valid emotion
    const validMoods = ['happy', 'sad', 'surprised', 'thinking', 'excited', 'relaxed'];
    expect(validMoods).toContain(currentMood);
  });

  test('AI response message appears in chat', async ({ page }) => {
    const input = page.locator('#chat-input');
    const messages = page.locator('#chat-messages');

    await input.fill('Say hi!');
    await page.keyboard.press('Enter');

    // Wait for AI message to appear
    const aiMsg = messages.locator('.msg.ai:not(.thinking-msg) .msg-bubble');
    await expect(aiMsg).toBeVisible({ timeout: 20000 });

    const text = await aiMsg.textContent();
    expect(text.length).toBeGreaterThan(0);
  });

  test('clear chat removes messages', async ({ page }) => {
    // Send a message first
    const input = page.locator('#chat-input');
    await input.fill('Test message');
    await page.keyboard.press('Enter');

    // Wait for user msg
    await expect(page.locator('.msg.user')).toBeVisible({ timeout: 5000 });

    // Clear
    await page.locator('#btn-clear-chat').click();

    // Welcome message back, no chat messages
    await expect(page.locator('.welcome-msg')).toBeVisible();
    await expect(page.locator('.msg.user')).toHaveCount(0);
  });

  test('no JavaScript errors on load', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.reload();
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});
