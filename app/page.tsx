'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, TrendingUp, BarChart3, AlertCircle } from 'lucide-react'

export default function LandingPage() {
  const scrollToHowItWorks = () => {
    const element = document.getElementById('how-it-works')
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-card">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="text-2xl font-bold text-primary">ProDrome</div>
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={scrollToHowItWorks} className="text-sm text-muted-foreground hover:text-foreground transition">
              How It Works
            </button>
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight text-balance">
            Detect Outbreaks Before They Spread
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed text-balance">
            Early warning surveillance from diagnostic system telemetry - detecting outbreaks 48-72 hours before clinical confirmation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/dashboard">
              <Button size="lg" className="gap-2">
                View Live Dashboard <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" onClick={scrollToHowItWorks}>
              How It Works
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20 border-t border-border">
        <h2 className="text-3xl font-bold mb-12 text-foreground">Key Capabilities</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="p-6 rounded-lg border border-border bg-card/50 hover:bg-card/80 transition">
            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Early Warning Detection</h3>
            <p className="text-muted-foreground">
              Continuous monitoring of lab operational metrics detects anomalies indicating emerging disease burden.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 rounded-lg border border-border bg-card/50 hover:bg-card/80 transition">
            <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Multi-Signal Validation</h3>
            <p className="text-muted-foreground">
              Correlated deviations across turnaround time, volume, positivity, and QC signals reduce false alarms.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 rounded-lg border border-border bg-card/50 hover:bg-card/80 transition">
            <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Actionable Alerts</h3>
            <p className="text-muted-foreground">
              Structured alerts specify geography, risk level, signal drivers, and suggested verification steps.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="container mx-auto px-4 py-20 border-t border-border">
        <h2 className="text-3xl font-bold mb-12 text-foreground">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { step: '1', title: 'Connect to Lab Systems', desc: 'LIS logs / structured exports' },
            { step: '2', title: 'Model Normal Behavior', desc: 'Seasonality + baselines' },
            { step: '3', title: 'Detect Anomalies', desc: 'Multivariate + change-point detection' },
            { step: '4', title: 'Alert Public Health', desc: '48–72h earlier detection' },
          ].map((item, idx) => (
            <div key={idx} className="relative">
              <div className="p-6 rounded-lg border border-border bg-card/50">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold mb-4">
                  {item.step}
                </div>
                <h4 className="font-semibold text-foreground mb-2">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
              {idx < 3 && (
                <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-muted-foreground">
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-20 border-t border-border">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-8 rounded-lg bg-primary/5 border border-primary/20">
            <div className="text-4xl font-bold text-primary mb-2">20 days</div>
            <p className="text-muted-foreground">Median global outbreak detection delay</p>
          </div>
          <div className="p-8 rounded-lg bg-accent/5 border border-accent/20">
            <div className="text-4xl font-bold text-accent mb-2">3.7B</div>
            <p className="text-muted-foreground">People lacking timely diagnostics access</p>
          </div>
          <div className="p-8 rounded-lg bg-secondary/5 border border-secondary/20">
            <div className="text-4xl font-bold text-secondary mb-2">48–72 hrs</div>
            <p className="text-muted-foreground">Typical advance warning from ProDrome</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-2">ProDrome</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Population Health Surveillance Through Diagnostic System Monitoring
            </p>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <p>Kampala, Uganda</p>
              <p>Contact: contact@prodrome.health</p>
            </div>
          </div>
          <div className="border-t border-border pt-8">
            <p className="text-xs text-muted-foreground text-center">
              © 2025 ProDrome. This is a prototype with simulated data for demonstration purposes only.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
