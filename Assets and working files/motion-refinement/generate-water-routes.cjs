const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const source = JSON.parse(fs.readFileSync(path.join(root, 'Assets and working files/waterfall-redesign/water-alignment-paths.json'), 'utf8'));
const round = n => Number(n.toFixed(7));
const routes = {};
for (const [plane, definition] of Object.entries(source)) {
  const [sourceWidth, sourceHeight] = definition.size;
  routes[plane] = Object.entries(definition.paths).map(([id, points], index) => {
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    const left = Math.min(...xs), top = Math.min(...ys);
    const width = Math.max(...xs) - left, height = Math.max(...ys) - top;
    return {
      id, left: round(left / sourceWidth), top: round(top / sourceHeight),
      width: round(width / sourceWidth), height: round(height / sourceHeight),
      clip: `polygon(${points.map(([x, y]) => `${round((x - left) / width * 100)}% ${round((y - top) / height * 100)}%`).join(',')})`,
      period: round(Math.max(.7, Math.min(2.4, height / (plane === 'background' ? 65 : 105)))),
      delay: round(-index * .173), opacity: plane === 'background' ? .24 : .32,
    };
  });
}
const code = `/** Static water curtains traced in the paintings' own coordinates.\n * Only the texture inside each curtain moves; the banks and masks stay registered.\n * Regenerate with Assets and working files/motion-refinement/generate-water-routes.cjs.\n */\nexport const waterRoutes = ${JSON.stringify(routes, null, 2)} as const;\n\nexport type WaterPlane = keyof typeof waterRoutes;\n`;
fs.writeFileSync(path.join(root, 'Website/app/water-routes.ts'), code);
console.log(`Registered ${routes.background.length} background and ${routes.foreground.length} foreground water curtains.`);
