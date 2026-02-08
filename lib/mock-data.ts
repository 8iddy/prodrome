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
  facility: string;
  region: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  signal: string;
  confidence: number;
  firstDetected: string;
  affectedTests: number;
  status: string;
  recommendedAction: string;
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

  // Alert 1: Moroto Critical
  alerts.push({
    id: 'alert-1',
    facilityId: 'facility-0',
    facility: 'Moroto Regional Hospital',
    region: 'Karamoja',
    severity: 'critical',
    signal: 'Multivariate spike: volume +1700% | TAT +195% | respiratory positivity +250% | backlog 34 pending',
    confidence: 0.87,
    firstDetected: '02:15 UTC',
    affectedTests: 340,
    status: 'Active escalation',
    recommendedAction: 'ACTIVATE surge capacity. Deploy epidemiologist on-site. Confirm with field investigation within 4h.',
  });

  // Alert 2: Mulago High
  alerts.push({
    id: 'alert-2',
    facilityId: 'facility-1',
    facility: 'Mulago National Hospital',
    region: 'Central',
    severity: 'high',
    signal: 'Gastrointestinal panel anomaly: volume +215% | stool culture positivity 28% (baseline 8%)',
    confidence: 0.73,
    firstDetected: '05:42 UTC',
    affectedTests: 215,
    status: 'Pending verification',
    recommendedAction: 'Notify epidemiology unit. Increase lab staffing 48hrs. Cross-reference with triage logs.',
  });

  // Alert 3: Mbarara Medium
  alerts.push({
    id: 'alert-3',
    facilityId: 'facility-2',
    facility: 'Mbarara Regional Hospital',
    region: 'Southwest',
    severity: 'medium',
    signal: 'Malaria RDT volume +180% | positivity 35% (seasonal baseline 22%)',
    confidence: 0.62,
    firstDetected: '08:33 UTC',
    affectedTests: 145,
    status: 'Routine monitoring',
    recommendedAction: 'Monitor adjacent districts. Assess vector control readiness if trend persists.',
  });

  return { facilities, alerts };
}

export function getKPIs(facilities: Facility[], alerts: Alert[]) {
  const activeAlerts = alerts.length;
  const severityBreakdown = {
    critical: alerts.filter((a) => a.severity === 'critical').length,
    high: alerts.filter((a) => a.severity === 'high').length,
    medium: alerts.filter((a) => a.severity === 'medium').length,
    low: alerts.filter((a) => a.severity === 'low').length,
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

const { facilities: mockFacilities, alerts: mockAlerts } = generateMockData()

export { mockFacilities, mockAlerts }
