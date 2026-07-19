import { expect, type Page } from "@playwright/test";

const LAYOUT_STORAGE_KEY = "wd3000-layout";

export const APP_VIEWPORT = { width: 1440, height: 900 } as const;

export async function clearLayoutStorage(page: Page): Promise<void> {
  await page.evaluate((key) => {
    localStorage.removeItem(key);
  }, LAYOUT_STORAGE_KEY);
}

export async function waitForAppReady(page: Page): Promise<void> {
  await expect(page.getByRole("button", { name: "UI", exact: true })).toBeVisible({
    timeout: 30_000,
  });
}

export async function gotoApp(page: Page, options?: { resetStorage?: boolean }): Promise<void> {
  await page.setViewportSize(APP_VIEWPORT);
  await page.goto("./");
  await waitForAppReady(page);

  if (options?.resetStorage) {
    await clearLayoutStorage(page);
    await page.reload();
    await waitForAppReady(page);
  }
}

export async function openPerformerSubView(page: Page, label: string): Promise<void> {
  await page.getByRole("button", { name: label, exact: true }).click();
}

export async function openDebuggerSubView(page: Page, label: string): Promise<void> {
  await page.getByRole("button", { name: label, exact: true }).click();
}

/** Modifier key for shortcuts: Meta on macOS, Control in Linux CI. */
export function modKey(): "Meta" | "Control" {
  return process.platform === "darwin" ? "Meta" : "Control";
}

export async function pressModShortcut(page: Page, key: string): Promise<void> {
  await page.keyboard.press(`${modKey()}+${key}`);
}

export async function closeControlInspector(page: Page): Promise<void> {
  const done = page.getByRole("button", { name: "Done" });
  if (await done.isVisible()) {
    await done.click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
}

export async function addWidget(page: Page, type: string): Promise<void> {
  await page.getByRole("button", { name: "Add widget" }).first().click();
  await page.getByRole("menuitem", { name: type }).click();
}
