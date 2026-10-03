import type { Metadata } from 'next'
import { OperationsDashboard } from '@/components/dashboard/operations-dashboard'

export const metadata: Metadata = { title: 'Dashboard · ProDrome' }
export default function DashboardPage() { return <OperationsDashboard section="overview" /> }
