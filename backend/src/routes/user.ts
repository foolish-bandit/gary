import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { createServerSupabase } from "../lib/supabase";
import { DEFAULT_TABULAR_MODEL, resolveModel } from "../lib/llm";
import { getManagedProviderAvailability, isKnownModel } from "../lib/userSettings";

export const userRouter = Router();

type UserProfileRow = {
  display_name: string | null;
  organisation: string | null;
  tier: string | null;
  message_credits_used: number | null;
  credits_reset_date: string | null;
  tabular_model: string | null;
};

async function ensureProfileRow(userId: string, db: ReturnType<typeof createServerSupabase>) {
  await db
    .from("user_profiles")
    .upsert(
      { user_id: userId },
      { onConflict: "user_id", ignoreDuplicates: true },
    );

  const { data, error } = await db
    .from("user_profiles")
    .select(
      "display_name, organisation, tier, message_credits_used, credits_reset_date, tabular_model",
    )
    .eq("user_id", userId)
    .single();

  if (error) throw error;
  return data as UserProfileRow;
}

// POST /user/profile
userRouter.post("/profile", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const db = createServerSupabase();
  const { error } = await db
    .from("user_profiles")
    .upsert(
      { user_id: userId },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
  if (error) return void res.status(500).json({ detail: error.message });
  res.json({ ok: true });
});

// GET /user/profile
userRouter.get("/profile", requireAuth, async (_req, res) => {
  const userId = res.locals.userId as string;
  const db = createServerSupabase();

  try {
    const data = await ensureProfileRow(userId, db);
    res.json({
      display_name: data.display_name,
      organisation: data.organisation,
      tier: data.tier ?? "Free",
      message_credits_used: data.message_credits_used ?? 0,
      credits_reset_date: data.credits_reset_date,
      tabular_model: resolveModel(data.tabular_model, DEFAULT_TABULAR_MODEL),
      provider_availability: getManagedProviderAvailability(),
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Failed to load profile";
    res.status(500).json({ detail });
  }
});

// PATCH /user/profile
userRouter.patch("/profile", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const db = createServerSupabase();
  const { display_name, organisation, tabular_model } = req.body as {
    display_name?: unknown;
    organisation?: unknown;
    tabular_model?: unknown;
  };

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (display_name !== undefined) {
    if (typeof display_name !== "string") {
      return void res.status(400).json({ detail: "display_name must be a string" });
    }
    update.display_name = display_name.trim() || null;
  }
  if (organisation !== undefined) {
    if (typeof organisation !== "string") {
      return void res.status(400).json({ detail: "organisation must be a string" });
    }
    update.organisation = organisation.trim() || null;
  }
  if (tabular_model !== undefined) {
    if (typeof tabular_model !== "string" || !isKnownModel(tabular_model)) {
      return void res.status(400).json({ detail: "tabular_model is invalid" });
    }
    update.tabular_model = tabular_model;
  }

  try {
    await ensureProfileRow(userId, db);
    const { error } = await db
      .from("user_profiles")
      .update(update)
      .eq("user_id", userId);
    if (error) return void res.status(500).json({ detail: error.message });

    const data = await ensureProfileRow(userId, db);
    res.json({
      display_name: data.display_name,
      organisation: data.organisation,
      tier: data.tier ?? "Free",
      message_credits_used: data.message_credits_used ?? 0,
      credits_reset_date: data.credits_reset_date,
      tabular_model: resolveModel(data.tabular_model, DEFAULT_TABULAR_MODEL),
      provider_availability: getManagedProviderAvailability(),
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Failed to update profile";
    res.status(500).json({ detail });
  }
});

// DELETE /user/account
userRouter.delete("/account", requireAuth, async (_req, res) => {
  const userId = res.locals.userId as string;
  const db = createServerSupabase();
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) return void res.status(500).json({ detail: error.message });
  res.status(204).send();
});
