export type Project = {
  number: string;
  name: string;
  subtitle?: string;
  category: string;
  status: string;
  description: string;
  outcome: string;
  features: string[];
  technologies: string[];
  visual: "route" | "grid" | "island";
  cover?: string;
  coverAlt?: string;
  coverSource?: "real" | "generated" | "provided";
  coverPosition?: string;
};

export type Milestone = { value: number; suffix?: string; label: string };
export type PersonalPhoto = { src: string; title: string; caption: string; thought?: string; copyEditable?: boolean; alt: string; source: "real" | "generated" };

export type PortfolioContent = {
  name: string;
  tagline: string;
  shortBio: string;
  education: { degree: string; institution: string; stage: string };
  hero: { src: string; cutout: string; alt: string; mobile: string; fullBody: string; fullBodyAlt: string; closingCutout: string };
  email: string;
  timeZone: string;
  closing: { eyebrow: string; lineOne: string; lineTwo: string; conversationLabel: string; copyLabel: string; copiedLabel: string; status: string };
  socials: { github: string; linkedin: string; instagram: string };
  photos: {
    galleryGhost: string;
    personal: PersonalPhoto[];
    about: string[];
  };
  textures: { paper: string; darkVignette: string; darkTile: string };
  interests: string[];
  projects: Project[];
  skills: { name: string; code: string; group: string }[];
  explored: string[];
  milestones: Milestone[];
  collaborations: string[];
  journal: string[];
  statement: { headline: string; subline: string };
};
