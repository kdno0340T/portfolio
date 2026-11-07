"use client";

import { useEffect, useState } from "react";
import { navItems } from "@/data/profile";

export function Navigation() {
  const [active, setActive] = useState("home");
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setActive(entry.target.id); });
    }, { rootMargin: "-35% 0px -55% 0px" });
    navItems.forEach(([, id]) => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);
  return <nav className="navigation" aria-label="Main navigation">
    <a href="#home" className="nav-mark" aria-label="Dhanush home">D<span>H</span></a>
    <div className="nav-links">{navItems.map(([label, id]) => <a key={id} href={`#${id}`} className={active === id ? "active" : ""}>{label}</a>)}</div>
    <span className="nav-status"><i /> AVAILABLE TO CONNECT</span>
  </nav>;
}
