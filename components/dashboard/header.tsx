import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ChevronDown } from 'lucide-react'

interface DashboardHeaderProps {
  lastUpdate: Date
}

export default function DashboardHeader({ lastUpdate }: DashboardHeaderProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center gap-4">
          <Link href="/" className="text-2xl font-bold text-primary hover:opacity-80 transition">
            ProDrome
          </Link>
          <div className="hidden sm:flex flex-col gap-1">
            <div className="text-sm text-foreground font-medium">Early Warning Dashboard</div>
            <div className="text-xs text-muted-foreground">Last updated: {formatTime(lastUpdate)}</div>
          </div>
        </div>

        {/* User Dropdown */}
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 bg-transparent">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="hidden sm:inline text-sm">Ministry of Health - Uganda</span>
                </div>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Profile Settings</DropdownMenuItem>
              <DropdownMenuItem>Notifications</DropdownMenuItem>
              <DropdownMenuItem>Sign Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-border">
        <div className="container mx-auto px-4 flex items-center gap-8">
          <button className="py-3 text-sm font-medium text-primary border-b-2 border-primary">Overview</button>
          <button className="py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition">
            Facilities
          </button>
          <button className="py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition">
            Alerts
          </button>
          <button className="py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition">
            Reports
          </button>
        </div>
      </div>
    </header>
  )
}
