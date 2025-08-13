import { setLocale, t } from "@/i18n/i18nService";

async function run() {
  await setLocale("es");
  if (t("app.title") !== "MiniChat Voz") throw new Error("ES title mismatch");
  await setLocale("en");
  if (t("app.title") !== "MiniChat Voice") throw new Error("EN title mismatch");
  const missing = t("non.existent.key" as any);
  if (missing !== "non.existent.key") throw new Error("Fallback failed");
  console.log("i18n tests passed");
}
run();
