'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useProjects } from '@/hooks/use-projects'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function GeneratePage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { addProject } = useProjects()
  const router = useRouter()

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      alert('Please select an image file')
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
      // Simulate image generation
      await new Promise(resolve => setTimeout(resolve, 2000))

      const project = addProject({
        name: file.name.replace(/\.[^/.]+$/, ''),
        originalImage: preview,
        originalImageName: file.name,
        generatedImages: [
          {
            id: '1',
            type: 'flat-lay',
            url: '/images/hoodie-flatlay.jpg',
            timestamp: Date.now(),
          },
          {
            id: '2',
            type: 'product-shot',
            url: '/images/hoodie-angle.jpg',
            timestamp: Date.now(),
          },
          {
            id: '3',
            type: 'detail',
            url: '/images/hoodie-closeup.jpg',
            timestamp: Date.now(),
          },
          {
            id: '4',
            type: 'lifestyle',
            url: '/images/hoodie-lifestyle.jpg',
            timestamp: Date.now(),
          },
        ],
      })

      router.push(`/dashboard/results/${project.id}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Generate Product Content</h1>
        <p className="text-muted-foreground">Upload your design to generate photos and videos</p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
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
          <label htmlFor="file-input" className="cursor-pointer">
            <div className="space-y-2">
              <div className="text-4xl">📸</div>
              <p className="font-medium">Drop your image here</p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
            </div>
          </label>
        </div>

        {/* Preview */}
        {preview && (
          <div className="space-y-4">
            <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-border">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Selected: {file?.name}</p>
              <Button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Generating...' : 'Generate Content'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
