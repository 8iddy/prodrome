/** Plain definitions shown in tooltips and on the Methods page. Edit here to change them everywhere. */
export const GLOSSARY = {
  signal: { term: 'Signal', text: 'A week in which a measure moved far from its normal level. ProDrome marks it on the charts and keeps watching.' },
  alert: { term: 'Alert', text: 'A pattern of signals that holds. ProDrome raises one when a change lasts two weeks and a second measure or another location agrees, or when a strong change lasts four weeks. A person reviews every alert.' },
  verified: { term: 'Verified or dismissed', text: 'After review, an alert is verified when the change is real and needs a response. It is dismissed when the reviewer finds a cause that needs no response, such as a testing campaign or a data error.' },
  risk: { term: 'Risk score', text: 'A number from 0 to 1. It combines the size of the change, how fast it builds, how long it lasts and how many measures move together.' },
  baseline: { term: 'Baseline (normal level)', text: 'The median of the same measure at the same location over the past 52 weeks. ProDrome compares each new week with it.' },
  persistence: { term: 'Persistence', text: 'The number of weeks in a row with a signal. A longer run makes an alert more likely.' },
  corroboration: { term: 'Corroboration', text: 'Agreement from a second source: another measure at the same location, or a signal at another location in the same week.' },
  quality: { term: 'Data quality', text: 'Checks on each weekly record, such as a missing date, a negative count or more positives than tests. A flagged record adds less to the risk score.' },
} as const

export type GlossaryKey = keyof typeof GLOSSARY
