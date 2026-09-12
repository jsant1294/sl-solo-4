CREATE TABLE "pricing_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name_en" text NOT NULL,
	"name_es" text NOT NULL,
	"tagline_en" text,
	"tagline_es" text,
	"price_monthly_cents" integer,
	"price_yearly_cents" integer,
	"currency" text DEFAULT 'usd' NOT NULL,
	"features_en" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"features_es" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stripe_price_id_monthly" text,
	"stripe_price_id_yearly" text,
	"highlighted" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "plan" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "pricing_plans_key_idx" ON "pricing_plans" USING btree ("key");--> statement-breakpoint
-- Starter seed for the three tiers discussed with the founder (2026-09-12). Placeholder
-- pricing/copy — edit freely from /operator/plans, this only guarantees the rows exist.
-- No plan gates any feature yet; every user defaults to "free" regardless of these rows.
INSERT INTO "pricing_plans" ("id", "key", "name_en", "name_es", "tagline_en", "tagline_es", "price_monthly_cents", "price_yearly_cents", "features_en", "features_es", "highlighted", "sort_order") VALUES
('plan_free', 'free', 'Free', 'Gratis', 'Everything you need to get started.', 'Todo lo que necesitas para empezar.', 0, 0,
  '["Unlimited profile links", "Free contact capture — no paywall", "0% fee on your payment links", "1 profile"]',
  '["Enlaces de perfil ilimitados", "Captura de contactos gratis — sin muro de pago", "0% de comisión en tus enlaces de pago", "1 perfil"]',
  false, 0),
('plan_pro', 'pro', 'Pro', 'Pro', 'For creators and small businesses juggling more than one identity.', 'Para creadores y negocios con más de una identidad.', 600, 6000,
  '["Everything in Free", "Up to 5 profiles", "Remove the SnapLink footer branding", "Export your leads (CSV)", "Priority hardware fulfillment"]',
  '["Todo lo de Gratis", "Hasta 5 perfiles", "Elimina la marca de SnapLink en el pie de página", "Exporta tus contactos (CSV)", "Envío de hardware con prioridad"]',
  true, 1),
('plan_team', 'team', 'Team', 'Equipo', 'For organizations issuing and managing many tags at once.', 'Para organizaciones que emiten y gestionan muchas etiquetas.', NULL, NULL,
  '["Everything in Pro", "Multiple team member seats", "Centralized device & profile management", "Bulk hardware ordering", "Dedicated support"]',
  '["Todo lo de Pro", "Varios puestos de equipo", "Gestión centralizada de dispositivos y perfiles", "Pedidos de hardware al por mayor", "Soporte dedicado"]',
  false, 2)
ON CONFLICT ("key") DO NOTHING;