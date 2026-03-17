"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-background/90 backdrop-blur-md border-b border-border" : "bg-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between h-16">
        <Link href="/" className="text-foreground text-sm font-semibold tracking-[0.2em] uppercase">
          Ceriga<span className="text-accent">.</span>
        </Link>

        <ul className="hidden md:flex items-center gap-8 text-xs text-muted-foreground tracking-widest uppercase">
          <li><Link href="#how-it-works" className="hover:text-foreground transition-colors">How it works</Link></li>
          <li><Link href="#gallery" className="hover:text-foreground transition-colors">Examples</Link></li>
          <li><Link href="#upload" className="hover:text-foreground transition-colors">Upload</Link></li>
        </ul>

        <Link
          href="#upload"
          className="text-xs tracking-widest uppercase bg-foreground text-background px-5 py-2.5 hover:bg-accent hover:text-foreground transition-colors duration-300"
        >
          Get Started
        </Link>
      </nav>
    </header>
  )
}
