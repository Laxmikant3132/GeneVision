import React, { useMemo, useState } from 'react'
import {
  Lightbulb,
  Beaker,
  Dna,
  BarChart3,
  Rocket,
  Eraser,
  Info,
  ListChecks,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  validateSequence,
  normalizeInputSequence,
  calculateGCContent,
  analyzeCodonUsage,
  translateDNA,
  findORFs,
} from '../utils/bioinformatics'

import SpecialistChatbot from '../components/analysis/SpecialistChatbot'

// Minimal AA properties for quick protein summaries in-page (kept small and local)
const AA_HYDROPATHY: Record<string, number> = {
  A: 1.8, R: -4.5, N: -3.5, D: -3.5, C: 2.5, Q: -3.5, E: -3.5, G: -0.4,
  H: -3.2, I: 4.5, L: 3.8, K: -3.9, M: 1.9, F: 2.8, P: -1.6, S: -0.8,
  T: -0.7, W: -0.9, Y: -1.3, V: 4.2,
}

// Simple utility to count characters
const countChars = (s: string) => s.split('').reduce<Record<string, number>>((acc, ch) => {
  acc[ch] = (acc[ch] || 0) + 1
  return acc
}, {})

const percent = (num: number, den: number) => (den === 0 ? 0 : Math.round((num / den) * 1000) / 10)

const Specialist: React.FC = () => {
  const [seqType, setSeqType] = useState<'dna' | 'rna' | 'protein'>('dna')
  const [raw, setRaw] = useState('')
  const [clean, setClean] = useState('')

  const analyze = () => {
    const normalized = normalizeInputSequence(raw, seqType)
    if (!normalized) {
      toast.error('Please paste a sequence to analyze.')
      return
    }
    if (!validateSequence(normalized, seqType)) {
      toast.error(`The input is not a valid ${seqType.toUpperCase()} sequence.`)
      return
    }
    setClean(normalized)
    toast.success('Sequence analyzed!')
  }

  const length = clean.length

  // DNA/RNA metrics
  const gc = useMemo(() => {
    if (!clean || seqType === 'protein') return null
    return calculateGCContent(clean, seqType)
  }, [clean, seqType])

  const codon = useMemo(() => {
    if (!clean || seqType === 'protein') return null
    // analyzeCodonUsage expects groups of 3; it will ignore trailing <3
    return analyzeCodonUsage(clean, seqType)
  }, [clean, seqType])

  const orfs = useMemo(() => {
    if (!clean || seqType === 'protein') return []
    return findORFs(clean, seqType).slice(0, 3)
  }, [clean, seqType])

  const translation = useMemo(() => {
    if (!clean || seqType === 'protein') return null
    // Frame 0 translation summary
    return translateDNA(clean, 0, seqType)
  }, [clean, seqType])

  // Protein summaries
  const proteinSummary = useMemo(() => {
    if (!clean || seqType !== 'protein') return null
    const comp = countChars(clean)
    const total = clean.length
    const avgHydro =
      total === 0
        ? 0
        : Math.round(
            (clean
              .split('')
              .reduce((sum, aa) => sum + (AA_HYDROPATHY[aa] ?? 0), 0) /
              total) * 100
          ) / 100

    // Top 5 residues by count
    const top = Object.entries(comp)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    return { comp, total, avgHydro, top }
  }, [clean, seqType])

  const useExamples = (type: 'dna' | 'rna' | 'protein') => {
    setSeqType(type)
    if (type === 'dna') {
      setRaw('>Example DNA\nATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG')
    } else if (type === 'rna') {
      setRaw('>Example RNA\nAUGGCCAUUGUAAUGGGCCGCUGAAAGGGUGCCCGAUAG')
    } else {
      setRaw('>Example Protein\nMKWVTFISLLFLFSSAYS')
    }
    setClean('')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-white">
      {/* Header */}
      <section className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm mb-3">
          <Lightbulb className="h-4 w-4" />
          Specialist Sequence Explainer
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold">Understand Your Sequences</h1>
        <p className="text-white/80 mt-2 max-w-2xl">
          Paste a DNA, RNA, or Protein sequence. Get plain-language explanations with quick visuals:
          composition, GC content, ORFs, translation, and more.
        </p>
      </section>

      {/* Controls */}
      <section className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-5 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Dna className="h-5 w-5 text-purple-300" />
            <span className="font-medium">Sequence Type</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSeqType('dna')}
              className={`px-3 py-1.5 rounded-lg border ${seqType === 'dna' ? 'bg-white/20 border-white/40' : 'bg-white/5 border-white/20 hover:bg-white/10'}`}
            >DNA</button>
            <button
              onClick={() => setSeqType('rna')}
              className={`px-3 py-1.5 rounded-lg border ${seqType === 'rna' ? 'bg-white/20 border-white/40' : 'bg-white/5 border-white/20 hover:bg-white/10'}`}
            >RNA</button>
            <button
              onClick={() => setSeqType('protein')}
              className={`px-3 py-1.5 rounded-lg border ${seqType === 'protein' ? 'bg-white/20 border-white/40' : 'bg-white/5 border-white/20 hover:bg-white/10'}`}
            >Protein</button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <label className="text-sm text-white/80">Paste sequence (plain or FASTA)</label>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[140px]"
            placeholder={'>FASTA header optional\nATGC...'}
          />
          <div className="flex flex-wrap gap-2 justify-between">
            <div className="flex gap-2">
              <button onClick={() => useExamples('dna')} className="px-3 py-1.5 text-sm rounded-lg bg-white/5 border border-white/20 hover:bg-white/10">DNA example</button>
              <button onClick={() => useExamples('rna')} className="px-3 py-1.5 text-sm rounded-lg bg-white/5 border border-white/20 hover:bg-white/10">RNA example</button>
              <button onClick={() => useExamples('protein')} className="px-3 py-1.5 text-sm rounded-lg bg-white/5 border border-white/20 hover:bg-white/10">Protein example</button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setRaw(''); setClean('') }} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-white/5 border border-white/20 hover:bg-white/10">
                <Eraser className="h-4 w-4" /> Clear
              </button>
              <button onClick={analyze} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                <Rocket className="h-4 w-4" /> Analyze
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Results and Explanations */}
      {!clean ? (
        <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-8 text-white/70 text-center">
          <Dna className="h-8 w-8 mx-auto mb-3" />
          Paste a sequence and click Analyze to see explanations here.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overview */}
          <section className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-5">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-5 w-5 text-blue-300" />
              <h2 className="text-lg font-semibold">Overview</h2>
            </div>
            <p className="text-white/80 mb-2">
              Detected {seqType.toUpperCase()} sequence with length <span className="font-semibold text-white">{length}</span>.
            </p>
            {seqType !== 'protein' ? (
              <p className="text-white/70 text-sm">
                We compute base composition, GC content, potential open reading frames (ORFs), and translate in frame 1 (0-based).
              </p>
            ) : (
              <p className="text-white/70 text-sm">
                We summarize amino-acid composition and average hydropathy (Kyte-Doolittle scale, approximate).
              </p>
            )}
          </section>

          {/* Composition */}
          <section className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-5">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-5 w-5 text-purple-300" />
              <h2 className="text-lg font-semibold">Composition</h2>
            </div>

            {seqType !== 'protein' && gc && (
              <div className="space-y-2">
                {/* Bars */}
                {(['A', gc.composition['U'] !== undefined ? 'U' : 'T', 'G', 'C'] as const).map((base) => {
                  const count = (gc.composition as any)[base] || 0
                  const p = percent(count, gc.length)
                  return (
                    <div key={base}>
                      <div className="flex justify-between text-sm text-white/80">
                        <span>{base}</span>
                        <span>{count} ({p}%)</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600" style={{ width: `${p}%` }} />
                      </div>
                    </div>
                  )
                })}

                {/* GC content summary */}
                <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-1"><Beaker className="h-4 w-4 text-blue-300" /><span className="font-medium">GC Content</span></div>
                  <div className="text-white/80">GC: <span className="font-semibold text-white">{gc.gcContent}%</span> • AT/AU: <span className="font-semibold text-white">{gc.atContent}%</span> • GC skew: {gc.gcSkew}</div>
                  <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${gc.gcContent}%` }} />
                  </div>
                  <p className="text-white/70 text-sm mt-2">
                    GC content reflects stability and potential secondary structure; higher GC often increases melting temperature.
                  </p>
                </div>
              </div>
            )}

            {seqType === 'protein' && proteinSummary && (
              <div className="space-y-2">
                {proteinSummary.top.map(([aa, count]) => {
                  const p = percent(count as number, proteinSummary.total)
                  return (
                    <div key={aa}>
                      <div className="flex justify-between text-sm text-white/80">
                        <span>{aa}</span>
                        <span>{count as number} ({p}%)</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600" style={{ width: `${p}%` }} />
                      </div>
                    </div>
                  )
                })}
                <div className="mt-3 text-white/80">Average hydropathy: <span className="font-semibold text-white">{proteinSummary.avgHydro}</span></div>
                <p className="text-white/70 text-sm">Hydropathy &gt; 1 suggests hydrophobic (possible membrane) character; &lt; 0 suggests hydrophilic.</p>
              </div>
            )}
          </section>

          {/* Codon usage (DNA/RNA) */}
          {seqType !== 'protein' && codon && (
            <section className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-5">
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className="h-5 w-5 text-yellow-300" />
                <h2 className="text-lg font-semibold">Codon Usage (Top 5)</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {codon.mostFrequent.map((c) => (
                  <div key={c} className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                    <div className="font-semibold">{c}</div>
                    <div className="text-sm text-white/80">{codon.codons[c]} times</div>
                  </div>
                ))}
              </div>
              <p className="text-white/70 text-sm mt-3">
                Codon preferences can hint at expression efficiency and organismal bias.
              </p>
            </section>
          )}

          {/* ORFs (DNA/RNA) */}
          {seqType !== 'protein' && orfs.length > 0 && (
            <section className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-5">
              <div className="flex items-center gap-2 mb-3">
                <Beaker className="h-5 w-5 text-emerald-300" />
                <h2 className="text-lg font-semibold">Top ORFs</h2>
              </div>
              <div className="space-y-3">
                {orfs.map((o, idx) => {
                  const aaLen = o.protein.length
                  const p = Math.min(100, Math.round((aaLen / Math.max(1, length / 3)) * 100))
                  return (
                    <div key={`${o.start}-${idx}`} className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between text-sm text-white/80">
                        <div>Frame: <span className="text-white font-medium">{o.frame}</span></div>
                        <div>Start: {o.start} • End: {o.end} • AA length: <span className="text-white font-medium">{aaLen}</span></div>
                      </div>
                      <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-fuchsia-400 to-fuchsia-600" style={{ width: `${p}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-white/70 text-sm mt-3">ORFs indicate potential protein-coding regions bounded by start/stop codons.</p>
            </section>
          )}

          {/* Translation summary (DNA/RNA) */}
          {seqType !== 'protein' && translation && (
            <section className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-5">
              <div className="flex items-center gap-2 mb-3">
                <Beaker className="h-5 w-5 text-pink-300" />
                <h2 className="text-lg font-semibold">Translation (Frame 1)</h2>
              </div>
              <div className="text-white/80 mb-2">
                Protein length: <span className="font-semibold text-white">{translation.length}</span> • 
                MW (approx): <span className="font-semibold text-white">{translation.molecularWeight} Da</span> • 
                pI (approx): <span className="font-semibold text-white">{translation.isoelectricPoint}</span> • 
                Hydropathy: <span className="font-semibold text-white">{translation.hydropathy}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 font-mono text-sm break-all">
                {translation.protein.slice(0, 120)}{translation.protein.length > 120 ? '…' : ''}
              </div>
              <p className="text-white/70 text-sm mt-3">
                This is a naive in-frame translation; ORFs above suggest coding segments with proper start/stop.
              </p>
            </section>
          )}

          {/* Chatbot */}
          <SpecialistChatbot
            seqType={seqType}
            clean={clean}
            gc={gc}
            codon={codon}
            translation={translation}
            orfs={orfs}
            proteinSummary={proteinSummary}
          />
        </div>
      )}
    </div>
  )
}

export default Specialist