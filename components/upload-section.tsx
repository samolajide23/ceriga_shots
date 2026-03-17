"use client"

import { useEffect, useState, useCallback } from "react"
import { Upload, Image as ImageIcon } from "lucide-react"

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

export function UploadSection() {
  const [isDragging, setIsDragging] = useState(false)
  const [uploaded, setUploaded] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (uploaded) URL.revokeObjectURL(uploaded)
    }
  }, [uploaded])

  const handleFile = useCallback((file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_UPLOAD_BYTES) return
    if (file.type !== "image/png" && file.type !== "image/jpeg") return

    const url = URL.createObjectURL(file)
    setUploaded((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [handleFile])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0])
    e.currentTarget.value = ""
  }

  return (
    <section id="upload" className="py-32 max-w-7xl mx-auto px-6 lg:px-12">
      <div className="max-w-xl mx-auto lg:mx-0">
        <span className="flex items-center gap-3 mb-6">
          <span className="w-6 h-px bg-accent" />
          <span className="text-accent text-xs tracking-[0.3em] uppercase font-medium">Start Here</span>
        </span>
        <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-foreground mb-4 text-balance">
          Upload your design
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-12">
          Drop your front or back design. We handle the rest — flat lays, angles, lifestyle shots, and motion content.
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed transition-all duration-300 cursor-pointer group ${
          isDragging
            ? "border-accent bg-accent/5"
            : "border-border hover:border-muted-foreground"
        }`}
      >
        <label className="block cursor-pointer">
          <input
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            onChange={handleChange}
          />

          {uploaded ? (
            <div className="relative aspect-video overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={uploaded} alt="Uploaded design" className="w-full h-full object-contain bg-secondary" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-background/60 backdrop-blur-sm">
                <span className="text-xs tracking-widest uppercase text-foreground font-semibold">Replace image</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 px-8 gap-6">
              <div className={`w-16 h-16 border border-border flex items-center justify-center transition-colors duration-300 ${isDragging ? "border-accent" : "group-hover:border-muted-foreground"}`}>
                <Upload className={`w-6 h-6 transition-colors duration-300 ${isDragging ? "text-accent" : "text-muted-foreground group-hover:text-foreground"}`} />
              </div>
              <div className="text-center">
                <p className="text-foreground font-semibold mb-1">Drag & drop or click to upload</p>
                <p className="text-muted-foreground text-sm">Upload front or back design</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3 h-3" /> PNG
                </span>
                <span className="w-px h-3 bg-border" />
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3 h-3" /> JPG
                </span>
                <span className="w-px h-3 bg-border" />
                <span>Max 20MB</span>
              </div>
            </div>
          )}
        </label>
      </div>

      {uploaded && (
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <button className="flex-1 bg-foreground text-background text-sm font-semibold tracking-wider uppercase px-8 py-4 hover:bg-accent hover:text-foreground transition-all duration-300">
            Generate Content Pack
          </button>
          <button
            onClick={() =>
              setUploaded((prev) => {
                if (prev) URL.revokeObjectURL(prev)
                return null
              })
            }
            className="border border-border text-muted-foreground text-sm tracking-wider uppercase px-8 py-4 hover:border-foreground hover:text-foreground transition-all duration-300"
          >
            Clear
          </button>
        </div>
      )}
    </section>
  )
}
