import * as THREE from "three";

type PrintRequest = { src: string; reverse: boolean; priority: number };
type PrintEntry = PrintRequest & { map: THREE.Texture; materials: Set<THREE.MeshBasicMaterial>; status: "idle" | "queued" | "loading" | "ready" | "failed"; attempts: number };

/** A new GPU texture replaces each placeholder; texture dimensions never mutate. */
export class PrintedPages {
  private entries = new Map<string, PrintEntry>();
  private queue: PrintEntry[] = [];
  private pending = 0;
  private dead = false;
  private wanted = new Set<string>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  constructor(private loader: Pick<THREE.TextureLoader, "load">, private anisotropy: number, private changed: () => void) {}

  private placeholder() {
    const map = new THREE.DataTexture(new Uint8Array([241, 231, 214, 255]), 1, 1);
    map.colorSpace = THREE.SRGBColorSpace; map.needsUpdate = true;
    return map;
  }

  private entry(src: string, reverse: boolean) {
    const key = `${src}:${reverse}`;
    let entry = this.entries.get(key);
    if (!entry) {
      const map = this.placeholder();
      entry = { src, reverse, priority: 100, map, materials: new Set(), status: "idle", attempts: 0 };
      this.entries.set(key, entry);
    }
    return entry;
  }

  material(src: string, reverse: boolean, side: THREE.Side) {
    const entry = this.entry(src, reverse);
    const material = new THREE.MeshBasicMaterial({ map: entry.map, side, toneMapped: false });
    entry.materials.add(material);
    return material;
  }

  prioritize(requests: PrintRequest[]) {
    this.wanted = new Set(requests.map(request => `${request.src}:${request.reverse}`));
    // Keep only the neighboring spreads resident on the GPU.
    for (const [key,entry] of this.entries) {
      if (entry.status === "ready" && !this.wanted.has(key)) {
        entry.map.dispose(); entry.map = this.placeholder(); entry.status = "idle"; entry.attempts = 0;
        for (const material of entry.materials) { material.map = entry.map; material.needsUpdate = true; }
      }
    }
    this.queue = this.queue.filter(entry => {
      if (this.wanted.has(`${entry.src}:${entry.reverse}`)) return true;
      entry.status = "idle";
      return false;
    });
    for (const entry of this.queue) entry.priority = 100;
    for (const request of requests) {
      const entry = this.entry(request.src, request.reverse);
      entry.priority = Math.min(entry.status === "queued" ? entry.priority : 100, request.priority);
      if (entry.status === "idle") { entry.status = "queued"; this.queue.push(entry); }
    }
    this.drain();
  }

  private drain() {
    if (this.dead) return;
    this.queue.sort((a,b) => a.priority - b.priority);
    while (this.pending < 2 && this.queue.length) {
      const entry = this.queue.shift()!;
      entry.status = "loading"; entry.attempts++; this.pending++;
      this.loader.load(entry.src, loaded => {
        this.pending--;
        if (this.dead) { loaded.dispose(); return; }
        if (!this.wanted.has(`${entry.src}:${entry.reverse}`)) {
          loaded.dispose(); entry.status = "idle"; entry.attempts = 0; this.drain(); return;
        }
        loaded.colorSpace = THREE.SRGBColorSpace; loaded.anisotropy = this.anisotropy;
        if (entry.reverse) { loaded.repeat.x = -1; loaded.offset.x = 1; }
        const placeholder = entry.map;
        entry.map = loaded; entry.status = "ready";
        for (const material of entry.materials) { material.map = loaded; material.needsUpdate = true; }
        placeholder.dispose();
        this.changed(); this.drain();
      }, undefined, () => {
        this.pending--;
        if (this.dead) return;
        entry.status = "failed"; this.changed(); this.drain();
        if (entry.attempts < 3) {
          const timer = setTimeout(() => {
            this.timers.delete(timer);
            if (this.dead) return;
            if (!this.wanted.has(`${entry.src}:${entry.reverse}`)) { entry.status = "idle"; entry.attempts = 0; return; }
            entry.status = "queued"; this.queue.push(entry); this.drain();
          }, entry.attempts * 450);
          this.timers.add(timer);
        }
      });
    }
  }

  get loadedCount() { return [...this.entries.values()].filter(e => e.status === "ready").length; }
  get failedCount() { return [...this.entries.values()].filter(e => e.status === "failed" && e.attempts === 3).length; }
  dispose() {
    this.dead = true;
    for (const timer of this.timers) clearTimeout(timer);
    for (const entry of this.entries.values()) entry.map.dispose();
    this.queue.length = 0;
  }
}
