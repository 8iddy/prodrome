// Mock data generator for ProDrome

export interface FacilityMetrics {
  date: string;
  testVolume: number;
  avgTAT: number;
  positivityRate: number;
  volumeAnomaly: number;
  tatAnomaly: number;
  positivityAnomaly: number;
  combinedRisk: number;
  backlog?: number;
}

export interface Facility {
  id: string;
  name: string;
  district: string;
  region: string;
  lat: number;
  lng: number;
  status: 'normal' | 'caution' | 'warning' | 'alert';
  lastUpdate: string;
  metrics: FacilityMetrics[];
  baselineVolume: number;
  baselineTAT: number;
  baselinePositivity: number;
}

export interface Alert {
  id: string;
  facilityId: string;
  facilityName: string;
  district: string;
  priority: 'high' | 'medium' | 'low';
  category: 'Respiratory illness likely' | 'Gastrointestinal illness suspected' | 'Vector-borne (malaria suspected)';
  detectedTime: string;
  signals: Array<{
    name: string;
    value: string;
    baseline: string;
    type: 'volume' | 'tat' | 'positivity' | 'backlog';
  }>;
  confidence: number;
  recommendation: string;
  isExpanded?: boolean;
}

const UGANDA_FACILITIES = [
  // Featured facilities
  { name: 'Moroto Regional Hospital', district: 'Moroto', region: 'Karamoja', lat: 1.7016, lng: 34.6681 },
  { name: 'Mulago National Hospital', district: 'Kampala', region: 'Central', lat: 0.3163, lng: 32.5849 },
  { name: 'Mbarara Regional Hospital', district: 'Mbarara', region: 'Southwest', lat: -0.6112, lng: 30.6348 },
  // Additional facilities
  { name: 'Fort Portal Regional Hospital', district: 'Fort Portal', region: 'Western', lat: 0.6717, lng: 30.2695 },
  { name: 'Masaka Regional Hospital', district: 'Masaka', region: 'Central', lat: -0.3339, lng: 31.7347 },
  { name: 'Soroti Regional Hospital', district: 'Soroti', region: 'Northeast', lat: 1.9141, lng: 33.6303 },
  { name: 'Lira Regional Hospital', district: 'Lira', region: 'North', lat: 2.2496, lng: 32.9013 },
  { name: 'Gulu Regional Hospital', district: 'Gulu', region: 'North', lat: 2.7781, lng: 32.2999 },
  { name: 'Jinja Regional Hospital', district: 'Jinja', region: 'East', lat: 0.4308, lng: 33.1256 },
  { name: 'Mbale Regional Hospital', district: 'Mbale', region: 'East', lat: 1.0518, lng: 34.2054 },
  // More facilities to reach 47
  ...Array.from({ length: 37 }, (_, i) => ({
    name: `Health Center ${i + 1}`,
    district: ['Kampala', 'Wakiso', 'Mukono', 'Buikwe'][Math.floor(Math.random() * 4)],
    region: 'Central',
    lat: 0.3 + Math.random() * 0.6,
    lng: 32.0 + Math.random() * 0.8,
  })),
];

function getBaseline(facilitySize: number) {
  return {
    volume: 15 + facilitySize * 3,
    tat: 4 + facilitySize * 0.5,
    positivity: 8 + Math.random() * 7,
  };
}

function generateAnomalyScore(actual: number, baseline: number, threshold: number = 0.3): number {
  const diff = Math.abs(actual - baseline) / baseline;
  return Math.min(100, (diff / threshold) * 100);
}

function shouldGenerateAnomaly(dayOfMonth: number): { type: string; severity: number } | null {
  // Day 8: historical episode (low severity, resolved)
  if (dayOfMonth === 8) return { type: 'historical', severity: 0.4 };
  // Day 22: historical episode
  if (dayOfMonth === 22) return { type: 'historical', severity: 0.35 };
  // Days 27-30: current building episode
  if (dayOfMonth >= 27 && dayOfMonth <= 30) return { type: 'current', severity: 0.5 + (dayOfMonth - 26) * 0.1 };
  return null;
}

export function generateMockData(): { facilities: Facility[]; alerts: Alert[] } {
  const facilities: Facility[] = [];
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Generate facilities
  for (let i = 0; i < UGANDA_FACILITIES.length; i++) {
    const facility = UGANDA_FACILITIES[i];
    const facilitySize = Math.random();
    const baseline = getBaseline(facilitySize);
    const metrics: FacilityMetrics[] = [];
    let maxRisk = 0;

    // Generate 30 days of metrics
    for (let day = 0; day < 30; day++) {
      const currentDate = new Date(thirtyDaysAgo.getTime() + day * 24 * 60 * 60 * 1000);
      const dayOfMonth = currentDate.getDate();
      const dayOfWeek = currentDate.getDay();

      // Day-of-week pattern
      const dayMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 0.6 : dayOfWeek <= 3 ? 1.1 : 0.8;

      let volume = baseline.volume * dayMultiplier * (0.85 + Math.random() * 0.3);
      let tat = baseline.tat * (0.95 + Math.random() * 0.1);
      let positivity = baseline.positivity * (0.9 + Math.random() * 0.2);

      // Apply anomalies for specific facilities
      const anomaly = shouldGenerateAnomaly(dayOfMonth);
      let backlog = 0;

      // Moroto anomaly (featured high alert)
      if (facility.name === 'Moroto Regional Hospital' && dayOfMonth >= 27) {
        const severity = anomaly?.severity || 0;
        volume *= 1 + severity * 3;
        tat *= 1 + severity * 2;
        positivity *= 1 + severity * 2.5;
        backlog = Math.floor(20 + severity * 20);
      }
      // Mulago anomaly (featured medium alert)
      else if (facility.name === 'Mulago National Hospital' && dayOfMonth >= 25) {
        const severity = Math.max(0, (dayOfMonth - 24) * 0.15);
        volume *= 1 + severity * 2;
        tat *= 1 + severity * 1.5;
        positivity *= 1 + severity * 1.8;
      }
      // Mbarara malaria pattern (featured low alert)
      else if (facility.name === 'Mbarara Regional Hospital' && dayOfMonth >= 20) {
        positivity *= 1.4; // Elevated malaria positivity
      }
      // Historical anomalies for other facilities
      else if (anomaly) {
        volume *= 1 + anomaly.severity;
        tat *= 1 + anomaly.severity * 0.5;
      }

      const volumeAnomaly = generateAnomalyScore(volume, baseline.volume);
      const tatAnomaly = generateAnomalyScore(tat, baseline.tat);
      const positivityAnomaly = generateAnomalyScore(positivity, baseline.positivity);
      const combinedRisk = Math.max(volumeAnomaly, tatAnomaly, positivityAnomaly) * 0.8;

      maxRisk = Math.max(maxRisk, combinedRisk);

      metrics.push({
        date: currentDate.toISOString().split('T')[0],
        testVolume: Math.round(volume),
        avgTAT: Math.round(tat * 10) / 10,
        positivityRate: Math.round(positivity * 10) / 10,
        volumeAnomaly,
        tatAnomaly,
        positivityAnomaly,
        combinedRisk,
        backlog: backlog > 0 ? backlog : undefined,
      });
    }

    // Determine status based on current risk
    let status: 'normal' | 'caution' | 'warning' | 'alert' = 'normal';
    if (maxRisk > 70) status = 'alert';
    else if (maxRisk > 50) status = 'warning';
    else if (maxRisk > 30) status = 'caution';

    facilities.push({
      id: `facility-${i}`,
      name: facility.name,
      district: facility.district,
      region: facility.region,
      lat: facility.lat,
      lng: facility.lng,
      status,
      lastUpdate: new Date().toISOString(),
      metrics,
      baselineVolume: baseline.volume,
      baselineTAT: baseline.tat,
      baselinePositivity: baseline.positivity,
    });
  }

  // Generate alerts based on facilities with high risk
  const alerts: Alert[] = [];

  // Alert 1: Moroto High
  alerts.push({
    id: 'alert-1',
    facilityId: 'facility-0',
    facilityName: 'Moroto Regional Hospital',
    district: 'Moroto',
    priority: 'high',
    category: 'Respiratory illness likely',
    detectedTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    signals: [
      { name: 'Test volume', value: '340 tests', baseline: '19 avg', type: 'volume' },
      { name: 'Turnaround time', value: '18.3 hrs', baseline: '6.2 hrs', type: 'tat' },
      { name: 'Respiratory positivity', value: '42%', baseline: '12%', type: 'positivity' },
      { name: 'Backlog', value: '34 pending', baseline: '0', type: 'backlog' },
    ],
    confidence: 87,
    recommendation:
      'Deploy surge testing capacity, notify district surveillance team, activate respiratory response protocol, verify with rapid field investigation.',
  });

  // Alert 2: Mulago Medium
  alerts.push({
    id: 'alert-2',
    facilityId: 'facility-1',
    facilityName: 'Mulago National Hospital',
    district: 'Kampala',
    priority: 'medium',
    category: 'Gastrointestinal illness suspected',
    detectedTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    signals: [
      { name: 'GI panel orders', value: '215% above baseline', baseline: '', type: 'volume' },
      { name: 'Turnaround time', value: '12.1 hrs', baseline: '4.5 hrs', type: 'tat' },
      { name: 'Stool culture positivity', value: '28%', baseline: '8%', type: 'positivity' },
    ],
    confidence: 73,
    recommendation: 'Increase lab staffing for 48 hours, verify signal with facility triage logs, monitor adjacent facilities.',
  });

  // Alert 3: Mbarara Low
  alerts.push({
    id: 'alert-3',
    facilityId: 'facility-2',
    facilityName: 'Mbarara Regional Hospital (Multi-facility cluster)',
    district: 'Mbarara',
    priority: 'low',
    category: 'Vector-borne (malaria suspected)',
    detectedTime: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
    signals: [
      { name: 'Malaria RDT volume', value: '180% above baseline', baseline: '', type: 'volume' },
      { name: 'Positivity', value: '35%', baseline: '22% seasonal baseline', type: 'positivity' },
    ],
    confidence: 62,
    recommendation: 'Routine monitoring; consider vector control assessment if trend persists.',
  });

  return { facilities, alerts };
}

export function getKPIs(facilities: Facility[], alerts: Alert[]) {
  const activeAlerts = alerts.length;
  const severityBreakdown = {
    high: alerts.filter((a) => a.priority === 'high').length,
    medium: alerts.filter((a) => a.priority === 'medium').length,
    low: alerts.filter((a) => a.priority === 'low').length,
  };

  const facilitiesByStatus = {
    normal: facilities.filter((f) => f.status === 'normal').length,
    caution: facilities.filter((f) => f.status === 'caution').length,
    warning: facilities.filter((f) => f.status === 'warning').length,
    alert: facilities.filter((f) => f.status === 'alert').length,
  };

  return {
    activeAlerts,
    severityBreakdown,
    facilitiesMonitored: facilities.length,
    facilitiesByStatus,
    detectionLeadTime: '52 hours avg',
    systemHealth: '94% operational',
  };
}
