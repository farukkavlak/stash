export interface Media {
  kind: 'photo' | 'video' | 'gif' | 'link';
  // A photo, a video's poster or a link preview's image.
  image: string;
  video?: string;
  link?: string;
  title?: string;
}

export interface Post {
  id: string;
  url: string;
  author: string;
  handle: string;
  avatar: string | undefined;
  text: string;
  date: string | undefined;
  media: Media[];
  quote?: Post;
}

// A post in the platform's own page.
export interface PagePost {
  id: string;
  element: HTMLElement;
  actions: HTMLElement;
}

// All platform-specific code sits behind this.
export interface Adapter {
  name: string;
  isSavedPage: () => boolean;
  tabBar: () => HTMLElement | undefined;
  timeline: () => HTMLElement | undefined;
  sidebar: () => HTMLElement | undefined;
  pagePosts: () => PagePost[];
  pagePostAt: (node: Element) => PagePost | undefined;
  onPosts: (listener: (posts: Post[]) => void) => void;
  // reason is 'done' at the end of the list, or an error.
  onEnd: (listener: (reason: string) => void) => void;
  loadMore: () => void;
  remove: (id: string) => Promise<void>;
}

export interface Removal {
  id: string;
  url: string;
  label: string;
  state: 'waiting' | 'sending' | 'removed' | 'failed';
}
