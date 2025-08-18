import React, { useMemo, useRef, useState, useEffect } from 'react'
import { MessageSquare, Send } from 'lucide-react'
import type { GCContentResult, CodonUsageResult, TranslationResult } from '../../utils/bioinformatics'

export type SeqType = 'dna' | 'rna' | 'protein'

interface ProteinSummary {
  comp: Record<string, number>
  total: number
  avgHydro: number
  top: [string, number][]
}

interface SpecialistChatbotProps {
  seqType: SeqType
  clean: string
  gc: GCContentResult | null
  codon: CodonUsageResult | null
  translation: TranslationResult | null
  orfs: Array<{ start: number; end: number; frame: number; protein: string }>
  proteinSummary: ProteinSummary | null
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// Very lightweight, local rule-based responder with built-in definitions (no external API calls)
const DEFINITIONS: { keywords: string[]; text: string }[] = [
  { keywords: ['gc content', 'gc%'], text: 'GC content: percentage of G and C bases in a DNA/RNA sequence. Higher GC generally increases stability and melting temperature.' },
  { keywords: ['gc skew'], text: 'GC skew: (G − C) / (G + C). Skew indicates strand bias and can hint at replication origins or transcriptional asymmetry.' },
  { keywords: ['codon usage', 'codon'], text: 'Codon usage: frequency of each 3-base codon in coding regions. Organisms prefer certain synonymous codons (codon bias), affecting translation efficiency.' },
  { keywords: ['codon bias'], text: 'Codon bias: deviation from equal codon frequencies. High bias can indicate adaptation to tRNA abundance and potentially higher expression.' },
  { keywords: ['orf', 'open reading frame'], text: 'Open Reading Frame (ORF): a start-to-stop region in a reading frame that could encode a protein.' },
  { keywords: ['reading frame', 'frame'], text: 'Reading frame: partition of sequence into triplets (3 forward frames; plus 3 reverse if considering reverse complement).'},
  { keywords: ['translation'], text: 'Translation: converting nucleotide triplets (codons) into amino acids using the genetic code.' },
  { keywords: ['hydropathy', 'hydrophobicity'], text: 'Hydropathy: average hydrophobic/hydrophilic tendency of amino acids in a protein. Higher values suggest membrane/structural roles.' },
  { keywords: ['isoelectric point', 'pi'], text: 'Isoelectric point (pI): pH at which a protein carries no net charge. Useful for purification and solubility predictions.' },
  { keywords: ['molecular weight', 'mw'], text: 'Molecular weight: sum of amino-acid masses; often reported as Daltons (Da). Approximate without post-translational modifications.' },
  { keywords: ['fasta'], text: 'FASTA: text format where an optional header line starts with ">" followed by sequence lines.' },
  { keywords: ['start codon'], text: 'Start codon: typically ATG (DNA) / AUG (RNA) encoding Methionine. Alternative starts (e.g., CTG, TTG) exist in some contexts.' },
  { keywords: ['stop codon'], text: 'Stop codon: TAA, TAG, TGA (DNA) or UAA, UAG, UGA (RNA). They terminate translation and do not encode amino acids.' },
  { keywords: ['amino acid', 'aa'], text: 'Amino acid: building block of proteins; 20 standard amino acids with distinct properties (charge, size, hydropathy).'}
]

function findDefinition(q: string): string | null {
  for (const def of DEFINITIONS) {
    if (def.keywords.some(k => q.includes(k))) return def.text
  }
  // Generic "what is ..." fallback for key terms
  const m = q.match(/what\s+is\s+([a-zA-Z \-]+)\??/)
  if (m) {
    const term = m[1].trim()
    for (const def of DEFINITIONS) {
      if (def.keywords.some(k => term.includes(k))) return def.text
    }
  }
  return null
}

function buildResponse(
  question: string,
  props: SpecialistChatbotProps
): string {
  const q = question.trim().toLowerCase()
  const { seqType, clean, gc, codon, translation, orfs, proteinSummary } = props

  // Greetings / help
  if (/^(hi|hello|hey)\b/.test(q) || q.includes('help')) {
    return 'Hi! I can define terms (e.g., "What is GC content?") and answer sequence-specific questions (GC, codons, ORFs, translation, pI, hydropathy).'
  }

  // Definitions (available even without a sequence)
  const def = findDefinition(q)
  if (def) return def

  // How-to explanations
  if (q.includes('how') && (q.includes('calculate') || q.includes('compute'))) {
    if (q.includes('gc')) {
      return 'How to calculate GC content: remove headers/spaces, normalize T/U for DNA/RNA, count G and C, then GC% = (G+C)/length * 100.'
    }
    if (q.includes('codon')) {
      return 'How to compute codon usage: take sequence in-frame, split into triplets, count each codon, divide by total codons for frequencies.'
    }
    if (q.includes('hydropathy')) {
      return 'Hydropathy: map each AA to a hydropathy index (e.g., Kyte-Doolittle), average across residues; >1 often hydrophobic.'
    }
    if (q.includes('pi') || q.includes('isoelectric')) {
      return 'pI: estimate from counts of acidic/basic residues (D,E vs K,R,H) or use precise algorithms; we provide a simplified estimate.'
    }
  }

  // General facts
  if (q.includes('how many') && q.includes('frame')) {
    return 'There are 3 forward reading frames (0,1,2). Including reverse complement adds 3 more (total 6 frames).'
  }
  if (q.includes('start codon')) return 'Start codon is typically ATG (DNA) / AUG (RNA) encoding Methionine; alternatives like CTG/TTG occur in some organisms.'
  if (q.includes('stop codon')) return 'Stop codons are TAA, TAG, TGA (DNA) or UAA, UAG, UGA (RNA); they signal translation termination.'

  // Sequence-aware: require analyzed content
  if (!clean) {
    return 'For sequence-specific results (GC, codons, ORFs, translation), please paste a sequence and click Analyze.'
  }

  // GC / composition
  if (q.includes('gc') || q.includes('composition') || q.includes('base')) {
    if (!gc) return 'GC metrics are only available for DNA/RNA sequences.'
    const bases = Object.entries(gc.composition)
      .map(([b, n]) => `${b}:${n}`)
      .join(', ')
    return `GC: ${gc.gcContent}% • AT/AU: ${gc.atContent}% • GC skew: ${gc.gcSkew}. Composition: ${bases}. Length: ${gc.length}.`
  }

  // Codon usage
  if (q.includes('codon')) {
    if (!codon) return 'Codon usage is only available for DNA/RNA sequences.'
    const top = codon.mostFrequent
      .map((c) => `${c}(${codon.codons[c]})`)
      .join(', ')
    return `Top codons: ${top}. Total codons: ${codon.totalCodons}. Codon bias (simplified): ${codon.codonBias}.`
  }

  // ORFs
  if (q.includes('orf') || q.includes('open reading')) {
    if (!orfs || orfs.length === 0) return 'No ORFs detected or analysis not available.'
    const top = orfs.slice(0, 3)
      .map((o) => `F${o.frame} ${o.start}-${o.end} (AA:${o.protein.length})`)
      .join(' | ')
    return `Top ORFs: ${top}.`
  }

  // Translation / protein info (from DNA/RNA translation or protein input)
  if (q.includes('translate') || q.includes('protein') || q.includes('mw') || q.includes('molecular') || q.includes('hydropathy') || q.includes('pi')) {
    if (seqType !== 'protein') {
      if (!translation) return 'No translation is available yet.'
      return `Translation length: ${translation.length} AA • MW ~${translation.molecularWeight} Da • pI ~${translation.isoelectricPoint} • Hydropathy: ${translation.hydropathy}.`
    }
    // Direct protein sequence summaries
    if (!proteinSummary) return 'No protein summary available.'
    const top = proteinSummary.top.map(([aa, n]) => `${aa}:${n}`).join(', ')
    return `Protein length: ${proteinSummary.total} AA • Avg hydropathy: ${proteinSummary.avgHydro}. Enriched residues: ${top}.`
  }

  // Length
  if (q.includes('length')) {
    return `Sequence length: ${clean.length} (${seqType.toUpperCase()}).`
  }

  // Default fallback
  return 'I can define terms (e.g., GC content, ORF, codon bias) and answer sequence-specific questions (GC, codons, ORFs, translation, MW, pI, hydropathy). Try: "What is an ORF?" or "Show top ORFs".'
}

const SpecialistChatbot: React.FC<SpecialistChatbotProps> = (props) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'I am your Specialist assistant. Ask about GC content, composition, codon usage, ORFs, translation length, MW, pI, or hydropathy for the current sequence.'
    }
  ])
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement | null>(null)

  const canAsk = useMemo(() => props.clean.length > 0, [props.clean])

  const send = () => {
    const q = input.trim()
    if (!q) return
    const userMsg: ChatMessage = { role: 'user', content: q }
    const answer = buildResponse(q, props)
    const botMsg: ChatMessage = { role: 'assistant', content: answer }
    setMessages((m) => [...m, userMsg, botMsg])
    setInput('')
  }

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages])

  return (
    <section className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-5">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="h-5 w-5 text-cyan-300" />
        <h2 className="text-lg font-semibold">Specialist Chat</h2>
      </div>

      {!canAsk && (
        <p className="text-white/70 text-sm mb-3">Paste a sequence and click Analyze to enable sequence-aware answers.</p>
      )}

      <div ref={listRef} className="max-h-72 overflow-auto space-y-2 p-3 rounded-xl bg-white/5 border border-white/10">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`px-3 py-2 rounded-lg text-sm ${
              m.role === 'assistant'
                ? 'bg-white/10 border border-white/10 text-white/90'
                : 'bg-blue-500/20 border border-blue-400/20 text-white'
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send()
          }}
          placeholder={canAsk ? 'Ask e.g., What is the GC content?' : 'Enter a question...'}
          className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <button
          onClick={send}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50"
          disabled={!input.trim()}
        >
          <Send className="h-4 w-4" />
          Send
        </button>
      </div>

      <p className="text-white/60 text-xs mt-2">
        Local, rule-based helper. For advanced AI, integrate your preferred API and swap this component.
      </p>
    </section>
  )
}

export default SpecialistChatbot