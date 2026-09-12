CREATE TABLE "storefront_sections" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"eyebrow_en" text,
	"eyebrow_es" text,
	"headline_en" text NOT NULL,
	"headline_es" text NOT NULL,
	"body_en" text,
	"body_es" text,
	"cta_label_en" text,
	"cta_label_es" text,
	"cta_href" text,
	"media_id" text,
	"featured_product_id" text,
	"featured_collection" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "storefront_sections" ADD CONSTRAINT "storefront_sections_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_sections" ADD CONSTRAINT "storefront_sections_featured_product_id_products_id_fk" FOREIGN KEY ("featured_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "storefront_sections_key_idx" ON "storefront_sections" USING btree ("key");--> statement-breakpoint
INSERT INTO "storefront_sections" ("id", "key", "label", "eyebrow_en", "eyebrow_es", "headline_en", "headline_es", "body_en", "body_es", "cta_label_en", "cta_label_es", "cta_href", "featured_product_id", "featured_collection", "active", "sort_order") VALUES
('sf_hero', 'hero', 'Hero', 'SL / Solo', 'SL / Solo', 'Tap into who you are.', 'Conecta con quien eres.', 'Choose your SnapLink, make it yours, and connect with one tap.', 'Elige tu SnapLink, hazlo tuyo y conecta con un toque.', 'Choose your SnapLink', 'Elige tu SnapLink', '/hardware', (SELECT "id" FROM "products" WHERE "slug" = 'nfc-card' LIMIT 1), 'signature', true, 1),
('sf_see_tap', 'see_tap', 'See the Tap', 'See the tap.', 'Mira el toque.', 'Watch one tap change the moment.', 'Mira cómo un toque cambia el momento.', 'Real product demonstrations uploaded through Product Studio.', 'Demostraciones reales cargadas desde Product Studio.', 'See the hardware', 'Ver el hardware', '/hardware/nfc-card', (SELECT "id" FROM "products" WHERE "slug" = 'nfc-card' LIMIT 1), NULL, true, 2),
('sf_purpose', 'purpose', 'Purpose discovery', 'Find your fit', 'Encuentra el ideal', 'What will your SnapLink do?', '¿Qué hará tu SnapLink?', 'Choose your purpose and see the hardware that fits it.', 'Elige tu propósito y descubre el hardware ideal.', NULL, NULL, NULL, NULL, NULL, true, 3),
('sf_collections', 'collections', 'Collections and style', 'Find your look', 'Encuentra tu estilo', 'Made for your personality.', 'Hecho para tu personalidad.', 'From signature finishes to playful characters, choose a SnapLink that feels like yours.', 'Desde acabados emblemáticos hasta personajes divertidos, elige un SnapLink que se sienta tuyo.', 'Explore hardware', 'Explorar hardware', '/hardware', NULL, 'signature', true, 4),
('sf_hardware', 'hardware', 'Hardware merchandising', 'Choose your SnapLink', 'Elige tu SnapLink', 'Hardware made for the moment.', 'Hardware hecho para el momento.', 'Product, purpose, price and a clear path to choose.', 'Producto, propósito, precio y una forma clara de elegir.', 'Shop all hardware', 'Ver todo el hardware', '/hardware', NULL, NULL, true, 5),
('sf_personalization', 'personalization', 'Personalization', 'Make it yours.', 'Hazlo tuyo.', 'Choose the details that fit you.', 'Elige los detalles que van contigo.', 'Choose hardware, style, color or design, and what happens after the tap.', 'Elige hardware, estilo, color o diseño y qué sucede después del toque.', 'Customize', 'Personalizar', '/hardware/nfc-card', (SELECT "id" FROM "products" WHERE "slug" = 'nfc-card' LIMIT 1), NULL, true, 6),
('sf_profile_demo', 'profile_demo', 'Profile demo', 'Profile demo', 'Demo de perfil', 'This is what opens after the tap.', 'Esto es lo que se abre después del toque.', 'Your real SOLO profile—contact actions, links, and everything you choose to share.', 'Tu perfil SOLO real: contacto, enlaces y todo lo que elijas compartir.', 'Open the live profile', 'Abrir el perfil real', '/u/jose', NULL, NULL, true, 7),
('sf_how', 'how_it_works', 'How it works', 'How it works', 'Cómo funciona', 'From checkout to every tap after.', 'Desde la compra hasta cada toque.', 'Buy → We ship → Tap → Activate → Update anytime.', 'Compra → Enviamos → Toca → Activa → Actualiza cuando quieras.', NULL, NULL, NULL, NULL, NULL, true, 8),
('sf_trust', 'trust', 'Trust', 'Built for everyday connection', 'Hecho para conexiones diarias', 'Simple to use. Easy to keep current.', 'Fácil de usar. Fácil de mantener.', 'No app required. Secure checkout. Update anytime.', 'Sin app. Compra segura. Actualiza cuando quieras.', NULL, NULL, NULL, NULL, NULL, true, 9),
('sf_business', 'business', 'Business cross-promotion', 'Run a business?', '¿Tienes un negocio?', 'We built a SnapLink for that, too.', 'También creamos un SnapLink para eso.', 'Turn every tap into more than a contact—connect customers to your business, services, reviews, campaigns and more.', 'Convierte cada toque en más que un contacto: conecta clientes con tu negocio, servicios, reseñas, campañas y más.', 'Explore SnapLink for Business', 'Explorar SnapLink para Negocios', 'https://snaplink.southlineone.com', NULL, 'business', true, 10),
('sf_final', 'final_cta', 'Final CTA', 'One tap. Make it yours.', 'Un toque. Hazlo tuyo.', 'There’s a SnapLink that looks like you.', 'Hay un SnapLink que se parece a ti.', 'Choose your hardware, find your style, and decide what happens after the tap.', 'Elige tu hardware, encuentra tu estilo y decide qué pasa después del toque.', 'Choose your SnapLink', 'Elige tu SnapLink', '/hardware', (SELECT "id" FROM "products" WHERE "slug" = 'nfc-card' LIMIT 1), NULL, true, 11);
