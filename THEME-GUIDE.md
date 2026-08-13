# Fit4Life theme guide

The V10 theme controls add small seasonal or sport details while preserving the
black rock identity, blue F4L neon sign, page layouts, and gym brand colors.

## Publish a theme

1. Sign in with an **owner** account.
2. Open **Trainer workspace → Settings**.
3. Select **Open themes & appearance**.
4. Under **Seasonal & sport accents**, click the preset you want.
5. The selection applies immediately. On the hosted app it is also saved to the
   organization and synced to trainer and client devices.

There is no separate Save button for a preset. The **Save gym setup** button below
the presets is still used for the gym name, subtitle, brand colors, and equipment.

## Available presets

- **Neon blue:** the normal Fit4Life look; no seasonal badge.
- **Halloween:** orange and violet.
- **Thanksgiving:** amber and copper.
- **Christmas:** evergreen and cranberry.
- **Valentine’s:** pink and red.
- **Football:** field green and gold.
- **Baseball:** blue and red.
- **Basketball:** hardwood orange and violet.

Themes never activate automatically. An owner must choose one, and it stays active
until an owner chooses another. Select **Neon blue** to remove the seasonal or sport
badge and restore the standard accents.

## Permissions and syncing

- Owners can publish themes.
- Trainers cannot publish them; they can request an organization-setting change.
- Clients see the published result but have no theme controls.
- The selected theme uses the existing organization `brand_config` sync. V10 does
  not require a new Supabase SQL migration or a new Vercel environment variable.
