"use client"

import Image from "next/image"
import { Download } from "lucide-react"

const results = [
  { src: "/images/hoodie-flatlay.jpg", label: "Flat Lay", tag: "Top-Down" },
  { src: "/images/hoodie-angle.jpg", label: "Product Shot", tag: "45° Angle" },
  { src: "/images/hoodie-closeup.jpg", label: "Detail Shot", tag: "Close-Up" },
  { src: "/images/hoodie-lifestyle.jpg", label: "Campaign Shot", tag: "Lifestyle" },
  { src: "/images/gallery-1.jpg", label: "Editorial", tag: "Lookbook" },
  { src: "/images/gallery-2.jpg", label: "Flat Lay II", tag: "Folded" },
]

export function ResultsSection() {
  return (
    <section className="py-32 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-16">
          <div>
            <span className="flex items-center gap-3 mb-6">
              <span className="w-6 h-px bg-accent" />
              <span className="text-accent text-xs tracking-[0.3em] uppercase font-medium">Generated Results</span>
            </span>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-foreground text-balance max-w-sm">
              Your full content library
            </h2>
          </div>
          <p className="text-muted-foreground leading-relaxed max-w-sm lg:text-right">
            Every angle, every format — ready to publish on your store, social media, or campaign.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
          {results.map((item, i) => (
            <div
              key={item.label + i}
              className="relative overflow-hidden group aspect-square"
            >
              <Image
                src={item.src}
                alt={item.label}
                width={500}
                height={500}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-background/0 group-hover:bg-background/60 transition-all duration-400 flex flex-col items-start justify-end p-5 opacity-0 group-hover:opacity-100">
                <span className="text-[10px] text-accent tracking-[0.25em] uppercase font-semibold mb-1">{item.tag}</span>
                <span className="text-foreground font-semibold text-sm">{item.label}</span>
                <button className="mt-3 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Download className="w-3 h-3" />
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <button className="bg-foreground text-background text-sm font-semibold tracking-wider uppercase px-10 py-4 hover:bg-accent hover:text-foreground transition-all duration-300">
            Download All (ZIP)
          </button>
        </div>
      </div>
    </section>
  )
}
