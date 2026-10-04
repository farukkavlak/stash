// The bookmarks shown in the video. Made up; pictures are gradients.
export interface DemoPost {
  id: string;
  name: string;
  handle: string;
  when: string;
  text: string;
  lines: number;
  avatar: string;
  image?: { from: string; to: string; caption?: string };
}

export const POSTS: DemoPost[] = [
  {
    id: "film",
    name: "Mira Okafor",
    handle: "miraokafor",
    when: "Mar 3",
    text: "Finally watched it. Two hours later I'm still thinking about the ending.",
    lines: 2,
    avatar: "#7c5cff",
    image: { from: "#2b1055", to: "#d1495b", caption: "the last scene" },
  },
  {
    id: "meme",
    name: "dev humor",
    handle: "devhumor",
    when: "Jan 12",
    text: "me explaining to the rubber duck why the bug is actually a feature",
    lines: 2,
    avatar: "#ffb703",
  },
  {
    id: "lamp",
    name: "Arda Yıldız",
    handle: "ardayz",
    when: "Feb 21",
    text: "This lamp is 40% off this week. Bought two.",
    lines: 1,
    avatar: "#2a9d8f",
    image: { from: "#f4a261", to: "#e76f51" },
  },
  {
    id: "old",
    name: "Productivity Daily",
    handle: "prodaily",
    when: "Aug 14, 2019",
    text: "47 apps you NEED in 2019 🧵👇",
    lines: 1,
    avatar: "#8d99ae",
  },
  {
    id: "essay",
    name: "Lena Park",
    handle: "lenapark",
    when: "Dec 9",
    text: "A long read on why cities feel smaller after you leave them.",
    lines: 2,
    avatar: "#e63946",
    image: { from: "#1d3557", to: "#457b9d" },
  },
  {
    id: "recipe",
    name: "Sam Rivera",
    handle: "samcooks",
    when: "Nov 2",
    text: "Ten-minute dinner I make every week. Recipe in the replies.",
    lines: 2,
    avatar: "#06d6a0",
  },
];

export interface DemoCategory {
  id: string;
  name: string;
  count: number;
}

export const CATEGORIES: DemoCategory[] = [
  { id: "meme", name: "meme", count: 12 },
  { id: "movie", name: "movie", count: 7 },
  { id: "shop", name: "shop", count: 4 },
  { id: "read", name: "weekly read", count: 9 },
];

export const UNSORTED = 241;
