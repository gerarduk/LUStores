# TODO

## Pending decisions

### Docker image registry (private access)

Once the GitHub repo is made private, the Docker images should also be private,
because they contain the built application code.

The image is currently public on Docker Hub:

- `phyit/lustores`

(The old `phyit/replitauth` image is no longer built or used.)

This is pulled by `docker-compose.prod.yml` and pushed by `.github/workflows/docker-build-push.yml`.

Options:

1. **Docker Hub, free plan:** one private repo, which is now enough because only
   `lustores` is needed.
2. **Docker Hub, paid plan (about $9/month):** unlimited private repos. Fewest changes.
3. **GitHub Container Registry (`ghcr.io`):** free plan includes about 500 MB of
   private storage and 1 GB of downloads a month. Check image sizes first.
4. **Self-hosted registry:** `registry:2` behind nginx. Free, but needs maintaining.

Whichever is chosen:

- Servers must run `docker login` before they can pull.
- Watchtower needs the registry credentials too, or it stops updating silently.

**Status:** undecided.

### Documentation hosting

Chosen: keep the GitHub repo private and deploy the built Sphinx/TypeDoc docs
to Cloudflare Pages or Netlify instead of GitHub Pages. Optionally protect them
with Cloudflare Access.

**Status:** agreed, not yet implemented.


## Pending work

### Redraw authentication diagrams

The Replit login service (`replit-auth`) has been removed, but two diagrams
still show it as part of the login flow:

- `diagrams/authentication-flow.md`
- `diagrams/system-architecture-flow.md`

They need redrawing to show how login actually works now: email/password
through `server/localAuth.ts` and university SSO through
`server/universitySso.ts`. Until then they give a misleading picture to
anyone learning the system.

**Status:** not started.
