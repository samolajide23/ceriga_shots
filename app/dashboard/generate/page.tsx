'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useProjects } from '@/hooks/use-projects'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function GeneratePage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [assetCount, setAssetCount] = useState<number>(4)
  const { addProject } = useProjects()
  const router = useRouter()

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      toast({
        title: 'Unsupported file',
        description: 'Please select an image file.',
        variant: 'destructive',
      })
      return
    }

    setFile(selectedFile)
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(selectedFile)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleGenerate = async () => {
    if (!file || !preview) return

    setIsLoading(true)
    try {
      const project = addProject({
        name: file.name.replace(/\.[^/.]+$/, ''),
        originalImage: preview,
        originalImageName: file.name,
        generatedImages: [],
        generation: {
          status: 'generating',
          total: assetCount,
          completed: 0,
        },
      })

      router.push(`/dashboard/results/${project.id}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-[70vw] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Area */}
        <div className="space-y-6">
          <div>
            <span className="flex items-center gap-3 mb-4">
              <span className="w-6 h-px bg-accent" />
              <span className="text-accent text-xs tracking-[0.3em] uppercase font-medium">
                Start Here
              </span>
            </span>
            <h1 className="text-3xl font-bold mb-2">Upload your design</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Drop your front or back design. We handle the rest — flat lays, angles, lifestyle shots,
              and motion content.
            </p>

            <div className="mt-6 flex items-center justify-between gap-4">
              <div className="text-xs text-muted-foreground tracking-widest uppercase">
                Number of assets
              </div>
              <Select value={String(assetCount)} onValueChange={(v) => setAssetCount(Number(v))}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 asset</SelectItem>
                  <SelectItem value="4">4 assets</SelectItem>
                  <SelectItem value="8">8 assets</SelectItem>
                  <SelectItem value="12">12 assets</SelectItem>
                  <SelectItem value="16">16 assets</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors w-[70vw] max-w-full ${
              isDragging ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
            }`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="hidden"
              id="file-input"
            />
            <div className="flex flex-col gap-4">
              <label htmlFor="file-input" className="block cursor-pointer space-y-4">
                {preview ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground truncate">
                      {file?.name ?? 'Uploaded design'}
                    </p>
                    <div className="relative w-full aspect-video rounded-md overflow-hidden border border-border bg-secondary">
                      <Image
                        src={preview}
                        alt="Uploaded design preview"
                        fill
                        className="object-contain"
                        sizes="(min-width: 1024px) 512px, 100vw"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Click or drop a new file to replace.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">No file chosen</p>
                    <div className="mx-auto w-16 h-16 rounded-md border border-border flex items-center justify-center text-muted-foreground">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="text-foreground font-semibold mb-1">
                        Drag &amp; drop or click to upload
                      </p>
                      <p className="text-sm text-muted-foreground">Upload front or back design</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    PNG
                  </span>
                  <span className="w-px h-3 bg-border" />
                  <span className="flex items-center gap-1.5">
                    JPG
                  </span>
                  <span className="w-px h-3 bg-border" />
                  <span>Max 20MB</span>
                </div>
              </label>

              {preview && (
                <Button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Generating...' : 'Generate Content'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right column intentionally left for future settings or tips */}
      </div>
    </div>
  )
}
