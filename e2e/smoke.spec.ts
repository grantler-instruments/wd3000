import { expect, test } from "@playwright/test";
import {
  addWidget,
  closeControlInspector,
  gotoApp,
  openDebuggerSubView,
  openPerformerSubView,
  pressModShortcut,
  waitForAppReady,
} from "./helpers/app";

test("app loads in edit mode @smoke", async ({ page }) => {
  await gotoApp(page, { resetStorage: true });

  await openPerformerSubView(page, "UI");

  await expect(page.getByText("Add widgets to build your control surface.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Run/ })).toBeVisible();
});

test("add button widget @smoke", async ({ page }) => {
  await gotoApp(page, { resetStorage: true });

  await openPerformerSubView(page, "UI");

  await addWidget(page, "Button");
  await expect(page.getByRole("heading", { name: "Button 1" })).toBeVisible();
  await closeControlInspector(page);
  await expect(page.getByRole("button", { name: "Trigger" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit widget" })).toBeVisible();
});

test("switch to debugger MQTT view @smoke", async ({ page }) => {
  await gotoApp(page, { resetStorage: true });

  // MIDI/OSC/TUIO/Art-Net are native-only; MQTT is available in the browser.
  // Saved logs appear as named tabs only after save/import — empty state is Live only.
  await openDebuggerSubView(page, "MQTT");
  await expect(page.getByRole("tab", { name: "Live" })).toBeVisible();
  await expect(page.getByText("Add a topic to monitor incoming MQTT.")).toBeVisible();
});

test("run mode toggle with keyboard shortcut @smoke", async ({ page }) => {
  await gotoApp(page, { resetStorage: true });

  await openPerformerSubView(page, "UI");

  await pressModShortcut(page, "e");
  await expect(page.getByText("Switch to edit mode to add controls.")).toBeVisible();

  await pressModShortcut(page, "e");
  await expect(page.getByText("Add widgets to build your control surface.")).toBeVisible();
});

test("reload restores persisted layout @smoke", async ({ page }) => {
  await gotoApp(page, { resetStorage: true });

  await openPerformerSubView(page, "UI");

  await addWidget(page, "Slider");
  await expect(page.getByRole("heading", { name: "Slider 1" })).toBeVisible();
  await closeControlInspector(page);
  await expect(page.getByRole("slider")).toBeVisible();

  await page.reload();
  await waitForAppReady(page);
  await openPerformerSubView(page, "UI");
  await expect(page.getByRole("slider")).toBeVisible({ timeout: 30_000 });
});
