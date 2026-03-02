import { expect, test } from "@playwright/test";

test("login page renders and allows typing credentials", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Sistema de Cartas - IPDA")).toBeVisible();
  await page.getByLabel("CPF").fill("11122233344");
  await page.getByLabel("Senha").fill("123456");
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
});

