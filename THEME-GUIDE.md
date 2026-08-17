# Fit4Life theme guide

The V12 theme controls add a cinematic holiday scene while preserving the
black rock identity, page layouts, controls, and gym brand colors. Each preset also
recolors the metallic F4L sign outline and ambient glow to match.

## Publish a theme

1. Sign in with an **owner** account.
2. Open **Trainer workspace → Settings**.
3. Select **Open themes & appearance**.
4. Under **Holiday themes**, click the preset you want.
5. The app publishes the selection to the gym organization. After Supabase confirms
   the write, it appears on every trainer and client device.

There is no separate Save button for a preset. The **Save gym setup** button below
the presets is still used for the gym name, subtitle, brand colors, and equipment.

## Available presets

- **Neon blue:** the normal metallic-black sign with blue neon; no scene or badge.
- **New Year:** midnight clock, fireworks, silver/gold ornaments, and confetti.
- **Halloween:** jack-o'-lantern, bubbling cauldron, orange/violet light, and embers.
- **Thanksgiving:** turkey, football, pumpkins, autumn tree, and falling leaves.
- **Christmas:** snowy Christmas tree, Santa, presents, and falling snow.
- **Valentine’s:** heart sculpture, roses, teddy bear, balloons, and falling hearts.
- **Independence Day:** American flag, metallic stars, sparklers, and fireworks.

Themes never activate automatically. An owner must choose one, and it stays active
until an owner chooses another. Select **Neon blue** to remove the holiday
badge, scene, particles, and themed sign color.

## Permissions and syncing

- Owners can publish themes.
- Trainers cannot preview or publish alternatives; they see the published theme and
  can request an organization-setting change.
- Clients see the published result but have no theme controls.
- The selected theme uses the existing organization `brand_config` sync. Rerun the
  included `supabase-v5-role-boundaries.sql` for the V12 owner-only database trigger
  owner-only `update_my_organization_setup` publishing function, and immediate
  organization Realtime broadcast. Run the complete file again if you previously
  ran an older copy. No new Vercel variable is required.
- Signed-in devices listen for live organization updates. All devices also refresh
  the published theme when the app opens, returns to the foreground, reconnects, and
  during a quiet periodic check if a Realtime event is unavailable.
- A theme is not reported as published until the owner-only Supabase write succeeds.
- A rejected publish shows the Supabase reason so configuration problems are not
  hidden behind a generic error.

## Display behavior

- The 3D artwork stays along the bottom of the rock wall and never intercepts clicks.
- Content panels remain above the artwork, so forms and navigation stay readable.
- Animated snow, leaves, hearts, embers, or atmospheric particles stop when the
  device requests reduced motion.
- Theme scenes are excluded from printing and included in the PWA offline cache.
