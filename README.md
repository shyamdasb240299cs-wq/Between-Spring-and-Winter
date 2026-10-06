# Between Spring and Winter — complete project

For Aami, with love from Shyamu.

Open Website to edit the finished site. The source is versioned; generated local build folders and packaged release archives are recreated from it and intentionally excluded from Git.

- Website: source code, configuration, package lock, live manga pages, compressed fonts, continuous illustrated landscape, alpha scene layers, character sprite sheets and the 3D book.
- Assets and working files: original generated PNGs, exact saved prompts, earlier assets, conversion/generation scripts, and earlier reference clips.
- Renders and editable models: editable Blender files for the book, house, crane and rabbit, studio renders, layout notes and visual checks.
- Original manga: a copy of your original manga folder, including the parts not currently published. The website displays Part One only.
- References: the smooth-scroll video and earlier notes.
- Deployment: Vercel builds the Website directory from the GitHub main branch. Its project configuration uses the Build Output API, so the server-rendered journey and static media deploy together.

## Run the website

Node.js is already installed on this PC. Double-click Start website.cmd for the development preview, then visit http://127.0.0.1:5173.

To run the local Cloudflare-compatible production build, open a terminal in Website and run:

    npm run start

To rebuild:

    npm run build

For the Vercel deployment build, run:

    npm run build:vercel

The installed dependency packages are copied into Website/node_modules for this PC. On another computer, use Node 22.13 or newer and run npm ci first. The continuous scenery uses lightweight 2D image layers; Three.js renders only the book. Scroll choreography and page deformation are implemented in Website/app.

## Editable art

The current scene layers are in Website/public/scene/layers. The background is one tall continuous painting; the house, torii, cherry canopy, rabbit and cranes are independent alpha assets. Original generated PNGs, exact prompts and the sprite encoder are in Assets and working files/layered-redesign. See Website/LAYERED-DESIGN.md for animation and performance details.

Earlier editable Blender scene models remain in Renders and editable models/scene-models. The live book still uses its Blender case; curved leaf geometry, elasticity, print placement and shadows are created by journey-book.tsx. Its closing turn now rotates around the complete book's center and leaves the ending text on the left.

Generated imagery and fonts are credited in Website/ASSET-CREDITS.md. The original files remain in their original Desktop/apps folder too. No credentials or Git tokens are included.

GitHub repository: https://github.com/shyamdasb240299cs-wq/Between-Spring-and-Winter

The Vercel project uses Website as its root directory. Once its custom-domain DNS is active, the public site is available at https://aami.me.
