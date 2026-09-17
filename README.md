# enzoperesafonso.github.io

Personal academic website, built by GitHub Pages with Jekyll. Pushing to `main` publishes it.

## Updating content

You shouldn't need to touch the HTML for most updates. Everything lives in a few text files:

| What | File |
| --- | --- |
| Name, position, email, profile links, CV path | `_config.yml` |
| Homepage intro, research interests, current degree | `_data/profile.yml` |
| Projects (and which ones show on the homepage) | `_data/projects.yml` |
| News | `_data/news.yml` |
| Papers, software, talks | `_data/publications.yml` |
| Tactile 3D models | `_data/models.yml` |
| Sidebar links | `_data/navigation.yml` |

Each file has comments explaining its fields. Other things to know:

- **CV:** the sidebar link is off. Set `cv:` in `_config.yml` back to `/assets/pdfs/CV.pdf` to show it again, and keep that filename so old links don't break.
- **Outreach photos:** drop them into `assets/images/outreach/` and they appear in the gallery automatically. Resize them first (about 1280px on the long side), e.g. `sips -Z 1280 photo.jpg`.
- **Location data:** phone photos contain GPS coordinates, and resizing doesn't remove them. Export without location (Photos app: Export → untick *Include Location*; iPhone share sheet: *Options* → Location off) before adding any photo to the site.
- **3D models:** export from Fusion 360 as OBJ, convert to `.glb`, and keep them small (Draco compression, e.g. `npx @gltf-transform/cli draco in.glb out.glb`). Keep the Fusion source files out of the repo.
- **Project images:** put them in `assets/images/projects/` and set `image:` on the project.

## Previewing locally

With Docker running:

```bash
docker run --rm -p 4000:4000 -v "$PWD":/srv/jekyll jekyll/jekyll:pages jekyll serve --host 0.0.0.0 --watch --force_polling -d /tmp/_site
```

Then open http://localhost:4000. Restart the command after editing `_config.yml`.

## Layout

- `_layouts/default.html`: page shell (sidebar, footer, starfield)
- `_includes/`: sidebar, footer, social icons
- `assets/css/site.css`: all styles
- `assets/js/starfield.js`: the starfield background
- `asteroseismology/`: the standalone asteroseismology simulator
