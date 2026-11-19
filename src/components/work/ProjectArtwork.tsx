import Image from "next/image";
import type { Project } from "@/types/portfolio";

export function ProjectArtwork({ project }: { project: Project }) {
  if (!project.cover) return null;
  const isEnRoute = project.name === "EnRoute";
  const concept = project.coverSource === "generated";
  return <figure className={`project-visual ${concept ? "is-concept" : "is-real"} project-visual-${project.visual}`}>
    <div className={`project-device ${concept ? "project-laptop" : "project-screen"}`}>
      <div className="project-device-top"><span className="project-device-dots" aria-hidden="true"><i /><i /><i /></span><span className="mono">{project.name}</span>{!isEnRoute && <span className="project-source-label mono">{project.category}</span>}</div>
      <div className="project-device-screen">
        {isEnRoute ? <div className="enroute-map-preview" role="img" aria-label="Map interface preview with a custom route, hidden gems and itinerary panel"><div className="enroute-map" aria-hidden="true"><div className="enroute-road enroute-road-a"/><div className="enroute-road enroute-road-b"/><div className="enroute-road enroute-road-c"/><svg viewBox="0 0 600 320" aria-hidden="true"><path d="M85 250 C150 210 137 155 240 177 S330 237 387 152 478 120 525 60"/><circle cx="85" cy="250" r="9"/><circle cx="240" cy="177" r="7"/><circle cx="387" cy="152" r="7"/><circle cx="525" cy="60" r="9"/></svg><span className="enroute-map-label enroute-map-label-a">CUSTOM ROUTE</span><span className="enroute-map-label enroute-map-label-b">HIDDEN GEMS</span></div><div className="enroute-rail" aria-hidden="true"><span>PERSONALIZED EXPLORATION</span><strong>Plan a journey your way.</strong><i/><i/><i/></div></div> : <Image src={project.cover} alt={project.coverAlt ?? `${project.name} project visual`} fill sizes="(max-width: 700px) 92vw, 54vw" loading="lazy" style={{ objectPosition: project.coverPosition ?? "50% 50%" }} />}
      </div>
      {concept && <div className="project-device-base" aria-hidden="true" />}
    </div>
    <figcaption className="project-visual-caption"><span className="mono">{project.category}</span>{project.technologies.length > 0 && <span className="mono">{project.technologies.slice(0, 4).join(" / ")}</span>}</figcaption>
  </figure>;
}
