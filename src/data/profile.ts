export const profile = {
  name: "Dhanush",
  role: "Computer Science Engineering Student · Developer · Technology Enthusiast",
  education: "B.E. Computer Science and Engineering",
  college: "Sahyadri College of Engineering and Management",
  semester: "3rd Semester",
  email: "bhandaridhanush751@gmail.com",
  intro:
    "I'm a Computer Science Engineering student passionate about technology, building digital experiences, experimenting with emerging technologies, and turning creative ideas into practical projects. I enjoy exploring software development, artificial intelligence, web technologies, and game development while continuously learning and improving my technical skills.",
  about:
    "I'm drawn to the point where technology and imagination meet: a useful travel experience, a more connected community, or a world that invites people to explore. I learn by building, experimenting, and sharing ideas with others.",
  github: "https://github.com/kdno0340T",
  linkedin: "",
};

export const navItems = [
  ["Home", "home"], ["About", "about"], ["Projects", "projects"],
  ["Skills", "skills"], ["Education", "experience"], ["Contact", "contact"],
] as const;

export const interests = ["Technology", "Artificial Intelligence", "Web Development", "Game Development", "Automotive Technology", "Gaming", "Emerging Technologies"];

export const projects = [
  {
    number: "01", name: "EnRoute", category: "TRAVEL TECHNOLOGY / WEB DEVELOPMENT", status: "PROTOTYPE",
    description: "A travel itinerary planning platform designed to make discovering and organizing travel experiences easier. EnRoute brings interactive maps, customized travel packages, hidden gems, trending events, and personalized exploration together.",
    features: ["Interactive Mapbox maps", "Route visualization", "Custom travel itineraries", "Hidden Gems discovery", "Trending Events", "Personalized travel packages"],
    technologies: ["React", "JavaScript", "Mapbox", "Mapbox Directions API", "CSS"], visual: "route",
  },
  {
    number: "02", name: "ResQGrid", category: "COMMUNITY TECHNOLOGY / ANDROID", status: "ONGOING COMMUNITY PROJECT",
    description: "A community disaster connectivity concept to help people exchange emergency information and coordinate assistance when conventional communication infrastructure becomes unreliable during natural disasters.",
    features: ["Emergency communication", "Community coordination", "Disaster information sharing", "Accessibility-oriented design", "Support for people with hearing and speech disabilities"],
    technologies: ["Kotlin", "Android Studio", "Android Development"], visual: "grid",
  },
  {
    number: "03", name: "ECHOES", subtitle: "The Island That Remembers", category: "GAME DEVELOPMENT", status: "IN PROGRESS",
    description: "A cinematic horror-mystery game concept set on an atmospheric island. The project explores environmental storytelling, immersive world-building, atmospheric lighting, mysterious locations, and third-person gameplay.",
    features: ["Roblox game development", "Environmental storytelling", "Atmospheric world design", "Cinematic lighting and fog", "Interactive gameplay", "Immersive horror experiences"],
    technologies: ["Roblox", "Game development", "World building"], visual: "island",
  },
];

export const skills = [
  { name: "C / C++", code: "01", group: "LANGUAGE" }, { name: "Java", code: "02", group: "LANGUAGE" },
  { name: "Python", code: "03", group: "LANGUAGE" }, { name: "Kotlin", code: "04", group: "LANGUAGE" },
  { name: "JavaScript", code: "05", group: "LANGUAGE" }, { name: "React", code: "06", group: "WEB" },
  { name: "Next.js", code: "07", group: "WEB" }, { name: "HTML", code: "08", group: "WEB" },
  { name: "CSS", code: "09", group: "WEB" }, { name: "Android Development", code: "10", group: "MOBILE" },
  { name: "Git & GitHub", code: "11", group: "TOOLS" }, { name: "Mapbox", code: "12", group: "MAPPING" },
];

export const explored = ["Node.js", "Express.js", "FastAPI", "SQLite", "Prisma", "Python AI/ML tooling"];
