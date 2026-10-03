import type { Metadata } from 'next'
import { GuidedExample } from '@/components/site/guided-example'

export const metadata: Metadata = { title: 'Guided example · ProDrome', description: 'Follow one laboratory alert from the first unusual week to the next step.' }
export default function ExamplePage() { return <GuidedExample /> }
