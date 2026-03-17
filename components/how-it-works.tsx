const steps = [
  {
    number: "01",
    title: "Upload your design",
    description:
      "Drop your clothing design — front, back, or full graphic. PNG or JPG. We accept raw files straight from your design tool.",
  },
  {
    number: "02",
    title: "AI generates variations",
    description:
      "Our model analyzes your design and produces flat lays, multiple angles, lifestyle compositions, and short video clips in under 60 seconds.",
  },
  {
    number: "03",
    title: "Download your content pack",
    description:
      "Get your full library in one ZIP — high-resolution images, platform-ready videos, and format-specific exports.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row lg:items-start gap-16">
          {/* Label */}
          <div className="lg:w-72 flex-shrink-0">
            <span className="flex items-center gap-3 mb-4">
              <span className="w-6 h-px bg-accent" />
              <span className="text-accent text-xs tracking-[0.3em] uppercase font-medium">Process</span>
            </span>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-foreground text-balance">
              How it works
            </h2>
          </div>

          {/* Steps */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, i) => (
              <div key={step.number} className="group">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-5xl font-black text-accent/30 leading-none">{step.number}</span>
                  {i < steps.length - 1 && (
                    <span className="hidden md:block flex-1 h-px bg-border" />
                  )}
                </div>
                <h3 className="text-foreground font-semibold text-lg mb-3 tracking-tight">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
