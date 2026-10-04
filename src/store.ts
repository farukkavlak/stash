// Extension storage. Each kept post has its own key, so saving one never rewrites the rest.
import type { Post } from './types';

export interface Category {
  id: string;
  name: string;
}

export interface KeptPost {
  post: Post;
  category: string | undefined;
  keptAt: string;
}

export interface Store {
  isKept: (id: string) => boolean;
  keptCount: () => number;
  keptPosts: () => KeptPost[];
  kept: (id: string) => KeptPost | undefined;
  keep: (post: Post, category: string | undefined) => Promise<void>;
  unkeep: (id: string) => Promise<void>;
  setCategory: (id: string, category: string | undefined) => Promise<void>;
  // Replaces a kept post with the platform's newer copy.
  updatePost: (post: Post) => Promise<void>;

  categories: () => Category[];
  addCategory: (name: string) => Promise<void>;
  renameCategory: (id: string, name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Removals not yet confirmed by the platform.
  pendingRemovals: () => string[];
  isPendingRemoval: (id: string) => boolean;
  markForRemoval: (id: string) => Promise<void>;
  clearRemoval: (id: string) => Promise<void>;
}

export const MAX_CATEGORIES = 9;
const DEFAULT_CATEGORIES = ['meme', 'movie', 'shop', 'weekly read'];

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === 'string') : [];
}

// Early versions stored { item, savedAt }; both shapes are read.
function readKept(value: unknown): KeptPost | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const stored = value as { post?: Post; item?: Post; category?: unknown; keptAt?: unknown; savedAt?: unknown };
  const post = stored.post ?? stored.item;
  if (typeof post?.id !== 'string') return undefined;
  const category = typeof stored.category === 'string' ? stored.category : undefined;
  const keptAt = typeof stored.keptAt === 'string' ? stored.keptAt : typeof stored.savedAt === 'string' ? stored.savedAt : '';
  return { post, category, keptAt };
}

function isCategory(value: unknown): value is Category {
  const category = value as Partial<Category> | null;
  return typeof category?.id === 'string' && typeof category.name === 'string';
}

export async function openStore(platform: string): Promise<Store> {
  const keys = {
    post: (id: string) => `${platform}:item:${id}`,
    postPrefix: `${platform}:item:`,
    keptIds: `${platform}:kept`,
    pending: `${platform}:pending`,
    categories: `${platform}:categories`,
  };
  const storage = chrome.storage.local;
  const all = await storage.get(null);

  const kept = new Map<string, KeptPost>();
  for (const [key, value] of Object.entries(all)) {
    const entry = key.startsWith(keys.postPrefix) ? readKept(value) : undefined;
    if (entry !== undefined) kept.set(entry.post.id, entry);
  }
  // The first version stored only ids.
  const keptIds = new Set(strings(all[keys.keptIds]));
  const pending = new Set(strings(all[keys.pending]));
  const storedCategories: unknown = all[keys.categories];
  let categories = Array.isArray(storedCategories) ? (storedCategories as unknown[]).filter(isCategory) : [];
  if (categories.length === 0) {
    categories = DEFAULT_CATEGORIES.map((name) => ({ id: crypto.randomUUID(), name }));
    await storage.set({ [keys.categories]: categories });
  }

  const savePost = (entry: KeptPost) => storage.set({ [keys.post(entry.post.id)]: entry });
  const saveCategories = () => storage.set({ [keys.categories]: categories });
  const savePending = () => storage.set({ [keys.pending]: [...pending] });

  return {
    isKept: (id) => kept.has(id) || keptIds.has(id),
    keptCount: () => kept.size + keptIds.size,
    keptPosts: () => [...kept.values()],
    kept: (id) => kept.get(id),
    async keep(post, category) {
      const entry = { post, category, keptAt: new Date().toISOString() };
      kept.set(post.id, entry);
      await savePost(entry);
    },
    async unkeep(id) {
      kept.delete(id);
      await storage.remove(keys.post(id));
    },
    async setCategory(id, category) {
      const entry = kept.get(id);
      if (entry === undefined) return;
      entry.category = category;
      await savePost(entry);
    },
    async updatePost(post) {
      const entry = kept.get(post.id);
      if (entry === undefined || JSON.stringify(entry.post) === JSON.stringify(post)) return;
      entry.post = post;
      await savePost(entry);
    },

    categories: () => categories,
    async addCategory(name) {
      if (categories.length >= MAX_CATEGORIES) return;
      categories = [...categories, { id: crypto.randomUUID(), name }];
      await saveCategories();
    },
    async renameCategory(id, name) {
      categories = categories.map((category) => (category.id === id ? { id, name } : category));
      await saveCategories();
    },
    async deleteCategory(id) {
      categories = categories.filter((category) => category.id !== id);
      await saveCategories();
      const moved = [...kept.values()].filter((entry) => entry.category === id);
      for (const entry of moved) entry.category = undefined;
      await Promise.all(moved.map(savePost));
    },

    pendingRemovals: () => [...pending],
    isPendingRemoval: (id) => pending.has(id),
    async markForRemoval(id) {
      pending.add(id);
      await savePending();
    },
    async clearRemoval(id) {
      pending.delete(id);
      await savePending();
    },
  };
}
