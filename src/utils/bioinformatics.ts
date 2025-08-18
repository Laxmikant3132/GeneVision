// Bioinformatics analysis utilities

export interface GCContentResult {
  gcContent: number
  atContent: number
  gcSkew: number
  atSkew: number
  length: number
  composition: { [key: string]: number }
}

export interface CodonUsageResult {
  codons: { [key: string]: number }
  aminoAcids: { [key: string]: number }
  totalCodons: number
  mostFrequent: string[]
  leastFrequent: string[]
  codonBias: number
}

export interface TranslationResult {
  protein: string
  length: number
  molecularWeight: number
  isoelectricPoint: number
  hydropathy: number
  composition: { [key: string]: number }
}

export interface MutationAnalysis {
  mutations: Array<{
    position: number
    original: string
    mutated: string
    type: 'substitution' | 'insertion' | 'deletion'
    effect: 'synonymous' | 'missense' | 'nonsense' | 'frameshift'
  }>
  totalMutations: number
  mutationRate: number
}

// Genetic code table
const GENETIC_CODE: { [key: string]: string } = {
  'TTT': 'F', 'TTC': 'F', 'TTA': 'L', 'TTG': 'L',
  'TCT': 'S', 'TCC': 'S', 'TCA': 'S', 'TCG': 'S',
  'TAT': 'Y', 'TAC': 'Y', 'TAA': '*', 'TAG': '*',
  'TGT': 'C', 'TGC': 'C', 'TGA': '*', 'TGG': 'W',
  'CTT': 'L', 'CTC': 'L', 'CTA': 'L', 'CTG': 'L',
  'CCT': 'P', 'CCC': 'P', 'CCA': 'P', 'CCG': 'P',
  'CAT': 'H', 'CAC': 'H', 'CAA': 'Q', 'CAG': 'Q',
  'CGT': 'R', 'CGC': 'R', 'CGA': 'R', 'CGG': 'R',
  'ATT': 'I', 'ATC': 'I', 'ATA': 'I', 'ATG': 'M',
  'ACT': 'T', 'ACC': 'T', 'ACA': 'T', 'ACG': 'T',
  'AAT': 'N', 'AAC': 'N', 'AAA': 'K', 'AAG': 'K',
  'AGT': 'S', 'AGC': 'S', 'AGA': 'R', 'AGG': 'R',
  'GTT': 'V', 'GTC': 'V', 'GTA': 'V', 'GTG': 'V',
  'GCT': 'A', 'GCC': 'A', 'GCA': 'A', 'GCG': 'A',
  'GAT': 'D', 'GAC': 'D', 'GAA': 'E', 'GAG': 'E',
  'GGT': 'G', 'GGC': 'G', 'GGA': 'G', 'GGG': 'G'
}

// Amino acid properties
const AMINO_ACID_PROPERTIES: { [key: string]: { mw: number, pI: number, hydropathy: number } } = {
  'A': { mw: 89.1, pI: 6.0, hydropathy: 1.8 },
  'R': { mw: 174.2, pI: 10.8, hydropathy: -4.5 },
  'N': { mw: 132.1, pI: 5.4, hydropathy: -3.5 },
  'D': { mw: 133.1, pI: 2.8, hydropathy: -3.5 },
  'C': { mw: 121.2, pI: 5.1, hydropathy: 2.5 },
  'Q': { mw: 146.1, pI: 5.7, hydropathy: -3.5 },
  'E': { mw: 147.1, pI: 4.3, hydropathy: -3.5 },
  'G': { mw: 75.1, pI: 6.0, hydropathy: -0.4 },
  'H': { mw: 155.2, pI: 7.6, hydropathy: -3.2 },
  'I': { mw: 131.2, pI: 6.0, hydropathy: 4.5 },
  'L': { mw: 131.2, pI: 6.0, hydropathy: 3.8 },
  'K': { mw: 146.2, pI: 9.7, hydropathy: -3.9 },
  'M': { mw: 149.2, pI: 5.7, hydropathy: 1.9 },
  'F': { mw: 165.2, pI: 5.5, hydropathy: 2.8 },
  'P': { mw: 115.1, pI: 6.3, hydropathy: -1.6 },
  'S': { mw: 105.1, pI: 5.7, hydropathy: -0.8 },
  'T': { mw: 119.1, pI: 5.6, hydropathy: -0.7 },
  'W': { mw: 204.2, pI: 5.9, hydropathy: -0.9 },
  'Y': { mw: 181.2, pI: 5.7, hydropathy: -1.3 },
  'V': { mw: 117.1, pI: 6.0, hydropathy: 4.2 }
}

export const validateSequence = (sequence: string, type: 'dna' | 'rna' | 'protein'): boolean => {
  const cleanSeq = sequence.replace(/\s/g, '').toUpperCase()
  
  switch (type) {
    case 'dna':
      return /^[ATGC]+$/.test(cleanSeq)
    case 'rna':
      return /^[AUGC]+$/.test(cleanSeq)
    case 'protein':
      return /^[ACDEFGHIKLMNPQRSTVWY*]+$/.test(cleanSeq)
    default:
      return false
  }
}

export const cleanSequence = (sequence: string): string => {
  return sequence.replace(/[^A-Za-z]/g, '').toUpperCase()
}

// Normalize raw user/FASTA input. Removes headers and harmonizes bases by type
export const normalizeInputSequence = (
  raw: string,
  type: 'dna' | 'rna' | 'protein'
): string => {
  if (!raw) return ''
  // Drop FASTA headers (lines starting with '>') and join the rest
  const lines = raw.split(/\r?\n/).filter(l => !l.trim().startsWith('>'))
  let seq = lines.join('')
  // Keep letters only and uppercase
  seq = seq.replace(/[^A-Za-z]/g, '').toUpperCase()
  if (type === 'rna') {
    // Accept DNA-like input by converting T -> U
    seq = seq.replace(/T/g, 'U')
  } else if (type === 'dna') {
    // Normalize accidental RNA bases to DNA
    seq = seq.replace(/U/g, 'T')
  }
  return seq
}

// Convert RNA to DNA for processing (U -> T)
export const rnaToData = (sequence: string): string => {
  return sequence.replace(/U/g, 'T')
}

// Convert DNA to RNA (T -> U)
export const dnaToRna = (sequence: string): string => {
  return sequence.replace(/T/g, 'U')
}

export const calculateGCContent = (sequence: string, type: 'dna' | 'rna' = 'dna'): GCContentResult => {
  const cleanSeq = cleanSequence(sequence)
  const length = cleanSeq.length
  
  // Handle both DNA and RNA sequences
  const isRNA = type === 'rna' || cleanSeq.includes('U')
  
  const composition = {
    A: (cleanSeq.match(/A/g) || []).length,
    [isRNA ? 'U' : 'T']: (cleanSeq.match(isRNA ? /U/g : /T/g) || []).length,
    G: (cleanSeq.match(/G/g) || []).length,
    C: (cleanSeq.match(/C/g) || []).length
  }
  
  const gcContent = ((composition.G + composition.C) / length) * 100
  const auContent = isRNA 
    ? ((composition.A + composition['U']) / length) * 100
    : ((composition.A + composition['T']) / length) * 100
  
  const gcSkew = (composition.G - composition.C) / (composition.G + composition.C)
  const auSkew = isRNA
    ? (composition.A - composition['U']) / (composition.A + composition['U'])
    : (composition.A - composition['T']) / (composition.A + composition['T'])
  
  return {
    gcContent: Math.round(gcContent * 100) / 100,
    atContent: Math.round(auContent * 100) / 100, // Keep same property name for compatibility
    gcSkew: Math.round(gcSkew * 1000) / 1000,
    atSkew: Math.round(auSkew * 1000) / 1000,
    length,
    composition
  }
}

export const analyzeCodonUsage = (sequence: string, type: 'dna' | 'rna' = 'dna'): CodonUsageResult => {
  let cleanSeq = cleanSequence(sequence)
  
  // Convert RNA to DNA for genetic code lookup if needed
  const isRNA = type === 'rna' || cleanSeq.includes('U')
  if (isRNA) {
    cleanSeq = rnaToData(cleanSeq)
  }
  
  const codons: { [key: string]: number } = {}
  const aminoAcids: { [key: string]: number } = {}
  
  // Extract codons (groups of 3 nucleotides)
  for (let i = 0; i < cleanSeq.length - 2; i += 3) {
    const codon = cleanSeq.substring(i, i + 3)
    if (codon.length === 3) {
      // Store the original codon (RNA or DNA)
      const displayCodon = isRNA ? dnaToRna(codon) : codon
      codons[displayCodon] = (codons[displayCodon] || 0) + 1
      const aa = GENETIC_CODE[codon]
      if (aa) {
        aminoAcids[aa] = (aminoAcids[aa] || 0) + 1
      }
    }
  }
  
  const totalCodons = Object.values(codons).reduce((sum, count) => sum + count, 0)
  const sortedCodons = Object.entries(codons).sort(([,a], [,b]) => b - a)
  
  const mostFrequent = sortedCodons.slice(0, 5).map(([codon]) => codon)
  const leastFrequent = sortedCodons.slice(-5).map(([codon]) => codon)
  
  // Calculate codon bias (simplified)
  const expectedFreq = 1 / 64 // Assuming equal usage
  const codonBias = Object.values(codons).reduce((bias, count) => {
    const observedFreq = count / totalCodons
    return bias + Math.abs(observedFreq - expectedFreq)
  }, 0) / Object.keys(codons).length
  
  return {
    codons,
    aminoAcids,
    totalCodons,
    mostFrequent,
    leastFrequent,
    codonBias: Math.round(codonBias * 1000) / 1000
  }
}

export const translateDNA = (sequence: string, frame: number = 0, type: 'dna' | 'rna' = 'dna'): TranslationResult => {
  let cleanSeq = cleanSequence(sequence)
  
  // Convert RNA to DNA for genetic code lookup if needed
  const isRNA = type === 'rna' || cleanSeq.includes('U')
  if (isRNA) {
    cleanSeq = rnaToData(cleanSeq)
  }
  
  let protein = ''
  const composition: { [key: string]: number } = {}
  
  // Translate starting from the specified frame
  for (let i = frame; i < cleanSeq.length - 2; i += 3) {
    const codon = cleanSeq.substring(i, i + 3)
    if (codon.length === 3) {
      const aa = GENETIC_CODE[codon] || 'X'
      protein += aa
      composition[aa] = (composition[aa] || 0) + 1
    }
  }
  
  // Calculate molecular weight
  let molecularWeight = 0
  let totalHydropathy = 0
  let validAAs = 0
  
  for (const aa of protein) {
    if (AMINO_ACID_PROPERTIES[aa]) {
      molecularWeight += AMINO_ACID_PROPERTIES[aa].mw
      totalHydropathy += AMINO_ACID_PROPERTIES[aa].hydropathy
      validAAs++
    }
  }
  
  // Simplified isoelectric point calculation
  const basicAAs = (composition['R'] || 0) + (composition['K'] || 0) + (composition['H'] || 0)
  const acidicAAs = (composition['D'] || 0) + (composition['E'] || 0)
  const isoelectricPoint = 7 + (basicAAs - acidicAAs) * 0.5
  
  return {
    protein,
    length: protein.length,
    molecularWeight: Math.round(molecularWeight * 100) / 100,
    isoelectricPoint: Math.round(isoelectricPoint * 100) / 100,
    hydropathy: validAAs > 0 ? Math.round((totalHydropathy / validAAs) * 100) / 100 : 0,
    composition
  }
}

export const findORFs = (sequence: string, type: 'dna' | 'rna' = 'dna'): Array<{ start: number, end: number, frame: number, protein: string }> => {
  if (!sequence || typeof sequence !== 'string') {
    return []
  }
  
  let cleanSeq = cleanSequence(sequence)
  
  // Convert RNA to DNA for genetic code lookup if needed
  const isRNA = type === 'rna' || cleanSeq.includes('U')
  if (isRNA) {
    cleanSeq = rnaToData(cleanSeq)
  }
  
  const orfs: Array<{ start: number, end: number, frame: number, protein: string }> = []
  
  // Check all three reading frames
  for (let frame = 0; frame < 3; frame++) {
    let currentORF = ''
    let startPos = -1
    
    for (let i = frame; i < cleanSeq.length - 2; i += 3) {
      const codon = cleanSeq.substring(i, i + 3)
      const aa = GENETIC_CODE[codon]
      
      if (aa === 'M' && startPos === -1) {
        // Start codon found
        startPos = i
        currentORF = aa
      } else if (startPos !== -1) {
        if (aa === '*') {
          // Stop codon found, save ORF if it's long enough
          if (currentORF.length >= 5) { // Minimum 5 amino acids
            orfs.push({
              start: startPos,
              end: i + 2,
              frame: frame + 1,
              protein: currentORF
            })
          }
          currentORF = ''
          startPos = -1
        } else if (aa) {
          currentORF += aa
        }
      }
    }
  }
  
  return orfs.sort((a, b) => b.protein.length - a.protein.length)
}

export const compareMutations = (original: string, mutated: string): MutationAnalysis => {
  const cleanOriginal = cleanSequence(original)
  const cleanMutated = cleanSequence(mutated)
  const mutations: MutationAnalysis['mutations'] = []
  
  const maxLength = Math.max(cleanOriginal.length, cleanMutated.length)
  
  for (let i = 0; i < maxLength; i++) {
    const origBase = cleanOriginal[i] || ''
    const mutBase = cleanMutated[i] || ''
    
    if (origBase !== mutBase) {
      let type: 'substitution' | 'insertion' | 'deletion'
      let effect: 'synonymous' | 'missense' | 'nonsense' | 'frameshift' = 'missense'
      
      if (!origBase) {
        type = 'insertion'
        effect = 'frameshift'
      } else if (!mutBase) {
        type = 'deletion'
        effect = 'frameshift'
      } else {
        type = 'substitution'
        
        // Check if it's in a codon context
        const codonStart = Math.floor(i / 3) * 3
        const origCodon = cleanOriginal.substring(codonStart, codonStart + 3)
        const mutCodon = cleanMutated.substring(codonStart, codonStart + 3)
        
        if (origCodon.length === 3 && mutCodon.length === 3) {
          const origAA = GENETIC_CODE[origCodon]
          const mutAA = GENETIC_CODE[mutCodon]
          
          if (origAA === mutAA) {
            effect = 'synonymous'
          } else if (mutAA === '*') {
            effect = 'nonsense'
          } else {
            effect = 'missense'
          }
        }
      }
      
      mutations.push({
        position: i,
        original: origBase,
        mutated: mutBase,
        type,
        effect
      })
    }
  }
  
  return {
    mutations,
    totalMutations: mutations.length,
    mutationRate: (mutations.length / maxLength) * 100
  }
}

export const generateAIInsights = (analysisType: string, result: any): string[] => {
  const insights: string[] = []
  
  switch (analysisType) {
    case 'gc-content':
      const gc = result as GCContentResult
      if (gc.gcContent > 60) {
        insights.push('High GC content suggests thermostable properties and potential for strong secondary structures.')
      } else if (gc.gcContent < 40) {
        insights.push('Low GC content may indicate AT-rich regions, common in regulatory sequences.')
      }
      
      if (Math.abs(gc.gcSkew) > 0.1) {
        insights.push('Significant GC skew detected, which may indicate replication origin or transcriptional bias.')
      }
      break
      
    case 'translation':
      const trans = result as TranslationResult
      if (trans.hydropathy > 1) {
        insights.push('Hydrophobic protein detected - likely membrane-associated or structural protein.')
      } else if (trans.hydropathy < -1) {
        insights.push('Hydrophilic protein detected - likely soluble enzyme or signaling protein.')
      }
      
      if (trans.isoelectricPoint > 8) {
        insights.push('Basic protein (high pI) - may bind to DNA/RNA or function in alkaline conditions.')
      } else if (trans.isoelectricPoint < 6) {
        insights.push('Acidic protein (low pI) - may be involved in metal binding or acidic environments.')
      }
      break
      
    case 'codon-usage':
      const codon = result as CodonUsageResult
      if (codon.codonBias > 0.02) {
        insights.push('High codon bias detected - suggests optimized expression in specific organisms.')
      }
      
      const stopCodons = Object.keys(codon.codons).filter(c => GENETIC_CODE[c] === '*').length
      if (stopCodons > 1) {
        insights.push('Multiple stop codons present - check for premature termination signals.')
      }
      break
  }
  
  return insights
}