import { motion } from 'framer-motion'
import { useCollection } from '../../hooks/useFirestore'
import { fundraiseTarget, fundsRaised, fundsRemaining } from './AvenueProjects'

const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

const AVENUE_DOT = {
  'Club Service': 'bg-purple-500',
  'Community Service': 'bg-emerald-500',
  'Professional Development': 'bg-blue-500',
  'International Service': 'bg-amber-500',
}

// Approved projects that still have money to raise.
function fundraisingProjects(ideas) {
  return ideas
    .filter(i => i.approved && !i.deletedAt && fundraiseTarget(i) > 0)
    .sort((a, b) => fundsRemaining(b) - fundsRemaining(a))
}

function totals(projects) {
  return projects.reduce((acc, p) => {
    acc.target += fundraiseTarget(p)
    acc.raised += fundsRaised(p)
    return acc
  }, { target: 0, raised: 0 })
}

function ProgressBar({ raised, target }) {
  const pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0
  return (
    <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
      <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-rotary-gold'}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// Compact summary embedded in the Treasurer dashboard.
export function FundraisingSummaryCard({ onOpen }) {
  const { data: ideas, loading } = useCollection('avenueProjects')
  const projects = fundraisingProjects(ideas)
  const t = totals(projects)
  const pct = t.target > 0 ? Math.round((t.raised / t.target) * 100) : 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-rotary-gold mb-0.5">Fundraising</p>
          <h3 className="font-display font-bold text-lg">Across {projects.length} active project{projects.length === 1 ? '' : 's'}</h3>
        </div>
        {onOpen && (
          <button onClick={onOpen} className="text-xs font-semibold text-rotary-blue hover:underline shrink-0">Open Tracker →</button>
        )}
      </div>
      {loading ? (
        <div className="h-16 flex items-center justify-center"><div className="w-6 h-6 border-4 border-rotary-blue/20 border-t-rotary-blue rounded-full animate-spin" /></div>
      ) : projects.length === 0 ? (
        <p className="text-sm text-gray-400 py-3">No active fundraising targets right now.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div><p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Target</p><p className="font-display font-extrabold text-lg text-rotary-charcoal">{rupee(t.target)}</p></div>
            <div><p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Raised</p><p className="font-display font-extrabold text-lg text-emerald-600">{rupee(t.raised)}</p></div>
            <div><p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Remaining</p><p className="font-display font-extrabold text-lg text-rotary-gold">{rupee(Math.max(0, t.target - t.raised))}</p></div>
          </div>
          <ProgressBar raised={t.raised} target={t.target} />
          <p className="text-[11px] text-gray-400 mt-1">{pct}% of total target raised</p>
        </>
      )}
    </div>
  )
}

export default function FundraisingTracker({ isAdmin, permissions, onBack }) {
  const { data: ideas, loading } = useCollection('avenueProjects')
  const projects = fundraisingProjects(ideas)
  const t = totals(projects)
  const overallPct = t.target > 0 ? Math.round((t.raised / t.target) * 100) : 0

  if (!isAdmin) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h2 className="font-display font-bold text-xl mb-1">Access Restricted</h2>
      <p className="text-sm text-gray-400">Admin login required.</p>
      <button onClick={onBack} className="mt-6 btn-primary !py-2 !px-6 text-sm !rounded-xl">Go Back</button>
    </div>
  )

  return (
    <section className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div className="flex items-start gap-3 mb-10" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <button onClick={onBack} className="mt-6 p-2.5 rounded-xl border border-gray-200 hover:bg-white transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-rotary-gold animate-pulse" />
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-rotary-gold">Treasury</p>
            </div>
            <h2 className="font-display font-extrabold text-3xl md:text-4xl text-rotary-charcoal">Fundraising Tracker</h2>
            <p className="text-sm text-gray-400">Money the club needs to raise across approved projects. Log contributions in Active Projects.</p>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-24"><div className="w-10 h-10 border-4 border-rotary-blue/20 border-t-rotary-blue rounded-full animate-spin" /></div>
        ) : (
          <>
            {/* Overall totals */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
              {[
                { label: 'Projects', value: projects.length, color: 'text-rotary-charcoal' },
                { label: 'Total Target', value: rupee(t.target), color: 'text-rotary-charcoal' },
                { label: 'Raised', value: rupee(t.raised), color: 'text-emerald-600' },
                { label: 'Remaining', value: rupee(Math.max(0, t.target - t.raised)), color: 'text-rotary-gold' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
                  <p className="text-xs font-medium text-gray-400 mb-1">{s.label}</p>
                  <p className={`font-display font-extrabold text-xl sm:text-2xl leading-none break-words ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {projects.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 mb-8">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm mb-2">
                  <span className="font-semibold text-gray-500">Overall progress</span>
                  <span className="text-gray-400">{rupee(t.raised)} / {rupee(t.target)} · {overallPct}%</span>
                </div>
                <ProgressBar raised={t.raised} target={t.target} />
              </div>
            )}

            {/* Per-project */}
            {projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-24 bg-white rounded-2xl border border-gray-100">
                <svg className="w-10 h-10 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <p className="font-display font-bold text-lg">Nothing to fundraise right now</p>
                <p className="text-sm text-gray-400 mt-1">Approved projects with a funding gap show up here.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {projects.map(p => {
                  const target = fundraiseTarget(p)
                  const raised = fundsRaised(p)
                  const remaining = fundsRemaining(p)
                  const pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0
                  return (
                    <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${AVENUE_DOT[p.avenue] || 'bg-gray-400'}`} />
                            <p className="font-display font-bold text-sm sm:text-base truncate">{p.title}</p>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 pl-4">{p.avenue}</p>
                        </div>
                        <span className={`text-xs font-bold text-right shrink-0 ${pct >= 100 ? 'text-emerald-600' : 'text-rotary-gold'}`}>{pct >= 100 ? 'Fully funded' : `${rupee(remaining)} to go`}</span>
                      </div>
                      <ProgressBar raised={raised} target={target} />
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-gray-400 mt-2">
                        <span>{rupee(raised)} raised of {rupee(target)}</span>
                        <span>{(p.fundraising?.contributions || []).length} contribution{(p.fundraising?.contributions || []).length === 1 ? '' : 's'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
