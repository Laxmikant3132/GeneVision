import { 
  calculateGCContent, 
  analyzeCodonUsage, 
  translateDNA,
  findORFs,
  compareMutations,
  validateSequence,
  normalizeInputSequence
} from '../../utils/bioinformatics'

export interface AIInsight {
  id: string
  type: 'warning' | 'info' | 'suggestion' | 'critical'
  category: 'quality' | 'functional' | 'structural' | 'optimization' | 'comparative'
  title: string
  description: string
  confidence: number // 0-1
  actionable: boolean
  relatedData?: any
}

export interface SequenceAnalysis {
  sequence: string
  sequenceType: 'dna' | 'rna' | 'protein'
  quality: {
    score: number
    issues: string[]
    warnings: string[]
  }
  composition: {
    gcContent?: number
    gcSkew?: number
    length: number
    ambiguousNucleotides?: number
    stopCodons?: number
  }
  functional: {
    orfs?: any[]
    translation?: any
    codonUsage?: any
    domains?: string[]
    motifs?: string[]
  }
  comparative?: {
    mutations?: any
    similarity?: number
    conservation?: number
  }
  insights: AIInsight[]
}

export class AIInsightsEngine {
  private static instance: AIInsightsEngine
  private knowledgeBase: Map<string, any> = new Map()

  private constructor() {
    this.initializeKnowledgeBase()
  }

  public static getInstance(): AIInsightsEngine {
    if (!AIInsightsEngine.instance) {
      AIInsightsEngine.instance = new AIInsightsEngine()
    }
    return AIInsightsEngine.instance
  }

  private initializeKnowledgeBase() {
    // Initialize with common patterns and thresholds
    this.knowledgeBase.set('gc_content_thresholds', {
      low: 40,
      high: 60,
      extreme_low: 25,
      extreme_high: 75
    })

    this.knowledgeBase.set('sequence_length_thresholds', {
      short: 50,
      medium: 500,
      long: 2000,
      very_long: 10000
    })

    this.knowledgeBase.set('common_motifs', {
      dna: [
        { pattern: 'TATAAA', name: 'TATA Box', function: 'Promoter element' },
        { pattern: 'CAAT', name: 'CAAT Box', function: 'Promoter element' },
        { pattern: 'GGCCGG', name: 'GC Box', function: 'Promoter element' },
        { pattern: 'ATG', name: 'Start Codon', function: 'Translation initiation' },
        { pattern: 'TAA|TAG|TGA', name: 'Stop Codon', function: 'Translation termination' }
      ],
      protein: [
        { pattern: 'RGD', name: 'RGD Motif', function: 'Cell adhesion' },
        { pattern: 'KDEL', name: 'ER Retention Signal', function: 'Protein localization' },
        { pattern: 'NLS', name: 'Nuclear Localization Signal', function: 'Nuclear import' }
      ]
    })

    this.knowledgeBase.set('codon_optimization_hosts', {
      'E. coli': ['TTG', 'CTG', 'CTA', 'TTA'], // Rare codons
      'S. cerevisiae': ['CTA', 'CTC', 'TTG', 'CTG'],
      'Human': ['CGA', 'CGG', 'AGA', 'AGG']
    })
  }

  public async analyzeSequence(
    sequence: string, 
    sequenceType: 'dna' | 'rna' | 'protein',
    context?: {
      question?: string
      referenceSequence?: string
      targetOrganism?: string
      analysisGoal?: string
    }
  ): Promise<SequenceAnalysis> {
    const normalizedSequence = normalizeInputSequence(sequence, sequenceType)
    const insights: AIInsight[] = []

    // Quality Assessment
    const quality = this.assessSequenceQuality(normalizedSequence, sequenceType)
    insights.push(...this.generateQualityInsights(quality, sequenceType))

    // Composition Analysis
    const composition = this.analyzeComposition(normalizedSequence, sequenceType)
    insights.push(...this.generateCompositionInsights(composition, sequenceType))

    // Functional Analysis
    const functional = await this.analyzeFunctionalElements(normalizedSequence, sequenceType)
    insights.push(...this.generateFunctionalInsights(functional, sequenceType, context))

    // Comparative Analysis (if reference provided)
    let comparative
    if (context?.referenceSequence) {
      comparative = this.performComparativeAnalysis(
        normalizedSequence, 
        context.referenceSequence, 
        sequenceType
      )
      insights.push(...this.generateComparativeInsights(comparative, sequenceType))
    }

    // Context-specific insights
    if (context) {
      insights.push(...this.generateContextualInsights(
        normalizedSequence, 
        sequenceType, 
        context,
        { composition, functional, comparative }
      ))
    }

    // Optimization suggestions
    insights.push(...this.generateOptimizationSuggestions(
      normalizedSequence, 
      sequenceType, 
      context
    ))

    return {
      sequence: normalizedSequence,
      sequenceType,
      quality,
      composition,
      functional,
      comparative,
      insights: this.prioritizeInsights(insights)
    }
  }

  private assessSequenceQuality(sequence: string, type: 'dna' | 'rna' | 'protein') {
    const issues: string[] = []
    const warnings: string[] = []
    let score = 100

    // Check for ambiguous characters
    const ambiguousChars = type === 'protein' 
      ? sequence.match(/[BJOUXZ]/g) 
      : sequence.match(/[NRYSWKMBDHV]/g)
    
    if (ambiguousChars) {
      const count = ambiguousChars.length
      const percentage = (count / sequence.length) * 100
      if (percentage > 5) {
        issues.push(`High ambiguous character content: ${percentage.toFixed(1)}%`)
        score -= 20
      } else if (percentage > 1) {
        warnings.push(`Moderate ambiguous character content: ${percentage.toFixed(1)}%`)
        score -= 5
      }
    }

    // Check sequence length
    const thresholds = this.knowledgeBase.get('sequence_length_thresholds')
    if (sequence.length < thresholds.short) {
      warnings.push('Very short sequence - may limit analysis accuracy')
      score -= 10
    } else if (sequence.length > thresholds.very_long) {
      warnings.push('Very long sequence - consider analyzing in segments')
    }

    // Type-specific quality checks
    if (type === 'dna' || type === 'rna') {
      // Check for unusual nucleotide patterns
      const gcContent = calculateGCContent(sequence, type).gcContent
      const gcThresholds = this.knowledgeBase.get('gc_content_thresholds')
      
      if (gcContent < gcThresholds.extreme_low || gcContent > gcThresholds.extreme_high) {
        warnings.push(`Extreme GC content: ${gcContent.toFixed(1)}%`)
        score -= 15
      }

      // Check for repetitive sequences
      const repetitivePattern = /(.{3,})\1{3,}/g
      if (repetitivePattern.test(sequence)) {
        warnings.push('Repetitive sequences detected')
        score -= 5
      }
    }

    return {
      score: Math.max(0, score),
      issues,
      warnings
    }
  }

  private analyzeComposition(sequence: string, type: 'dna' | 'rna' | 'protein') {
    const composition: any = {
      length: sequence.length
    }

    if (type === 'dna' || type === 'rna') {
      const gcAnalysis = calculateGCContent(sequence, type)
      composition.gcContent = gcAnalysis.gcContent
      composition.gcSkew = gcAnalysis.gcSkew
      
      // Count ambiguous nucleotides
      const ambiguous = sequence.match(/[NRYSWKMBDHV]/g)
      composition.ambiguousNucleotides = ambiguous ? ambiguous.length : 0

      // Count stop codons in all frames
      let stopCodons = 0
      const stopCodonPattern = type === 'dna' ? /(TAA|TAG|TGA)/g : /(UAA|UAG|UGA)/g
      const matches = sequence.match(stopCodonPattern)
      composition.stopCodons = matches ? matches.length : 0
    }

    return composition
  }

  private async analyzeFunctionalElements(sequence: string, type: 'dna' | 'rna' | 'protein') {
    const functional: any = {}

    if (type === 'dna' || type === 'rna') {
      // ORF Analysis
      functional.orfs = findORFs(sequence, type)
      
      // Translation Analysis
      if (functional.orfs.length > 0) {
        functional.translation = translateDNA(sequence, 0, type)
      }

      // Codon Usage Analysis
      functional.codonUsage = analyzeCodonUsage(sequence, type)

      // Motif Detection
      functional.motifs = this.detectMotifs(sequence, type)
    } else if (type === 'protein') {
      // Protein-specific analysis
      functional.domains = this.predictProteinDomains(sequence)
      functional.motifs = this.detectMotifs(sequence, type)
      
      // Calculate basic properties
      functional.properties = this.calculateProteinProperties(sequence)
    }

    return functional
  }

  private detectMotifs(sequence: string, type: 'dna' | 'rna' | 'protein'): any[] {
    const motifs = this.knowledgeBase.get('common_motifs')[type] || []
    const detected: any[] = []

    motifs.forEach((motif: any) => {
      const regex = new RegExp(motif.pattern, 'gi')
      const matches = [...sequence.matchAll(regex)]
      
      if (matches.length > 0) {
        detected.push({
          ...motif,
          positions: matches.map(m => m.index),
          count: matches.length
        })
      }
    })

    return detected
  }

  private predictProteinDomains(sequence: string): string[] {
    // Simplified domain prediction based on common patterns
    const domains: string[] = []
    
    // Transmembrane domain prediction (simplified)
    const hydrophobic = /[AILMFWYV]{15,}/g
    if (hydrophobic.test(sequence)) {
      domains.push('Potential transmembrane domain')
    }

    // Signal peptide prediction (simplified)
    if (sequence.length > 20) {
      const nTerminal = sequence.substring(0, 20)
      const hydrophobicCount = (nTerminal.match(/[AILMFWYV]/g) || []).length
      if (hydrophobicCount > 10) {
        domains.push('Potential signal peptide')
      }
    }

    return domains
  }

  private calculateProteinProperties(sequence: string) {
    const hydrophobicAAs = ['A', 'I', 'L', 'M', 'F', 'W', 'Y', 'V']
    const hydrophobicCount = sequence.split('').filter(aa => hydrophobicAAs.includes(aa)).length
    
    return {
      length: sequence.length,
      hydrophobicRatio: hydrophobicCount / sequence.length,
      molecularWeight: this.estimateMolecularWeight(sequence)
    }
  }

  private estimateMolecularWeight(sequence: string): number {
    // Simplified MW calculation for proteins
    const aaWeights: { [key: string]: number } = {
      'A': 89, 'R': 174, 'N': 132, 'D': 133, 'C': 121,
      'Q': 146, 'E': 147, 'G': 75, 'H': 155, 'I': 131,
      'L': 131, 'K': 146, 'M': 149, 'F': 165, 'P': 115,
      'S': 105, 'T': 119, 'W': 204, 'Y': 181, 'V': 117
    }

    return sequence.split('').reduce((total, aa) => {
      return total + (aaWeights[aa] || 110) // Average AA weight as fallback
    }, 0)
  }

  private performComparativeAnalysis(sequence: string, reference: string, type: 'dna' | 'rna' | 'protein') {
    const normalizedRef = normalizeInputSequence(reference, type)
    
    if (!validateSequence(normalizedRef, type)) {
      return null
    }

    const mutations = compareMutations(normalizedRef, sequence)
    
    // Calculate similarity
    const similarity = this.calculateSimilarity(sequence, normalizedRef)
    
    return {
      mutations,
      similarity,
      referenceLength: normalizedRef.length,
      queryLength: sequence.length
    }
  }

  private calculateSimilarity(seq1: string, seq2: string): number {
    const minLength = Math.min(seq1.length, seq2.length)
    let matches = 0

    for (let i = 0; i < minLength; i++) {
      if (seq1[i] === seq2[i]) {
        matches++
      }
    }

    return (matches / Math.max(seq1.length, seq2.length)) * 100
  }

  private generateQualityInsights(quality: any, type: string): AIInsight[] {
    const insights: AIInsight[] = []

    if (quality.score < 70) {
      insights.push({
        id: `quality_low_${Date.now()}`,
        type: 'warning',
        category: 'quality',
        title: 'Low Sequence Quality Detected',
        description: `Quality score: ${quality.score}/100. ${quality.issues.join(', ')}`,
        confidence: 0.9,
        actionable: true,
        relatedData: quality
      })
    }

    quality.warnings.forEach((warning: string, index: number) => {
      insights.push({
        id: `quality_warning_${index}_${Date.now()}`,
        type: 'info',
        category: 'quality',
        title: 'Sequence Quality Notice',
        description: warning,
        confidence: 0.7,
        actionable: false
      })
    })

    return insights
  }

  private generateCompositionInsights(composition: any, type: string): AIInsight[] {
    const insights: AIInsight[] = []

    if (type === 'dna' || type === 'rna') {
      const gcThresholds = this.knowledgeBase.get('gc_content_thresholds')
      
      if (composition.gcContent > gcThresholds.high) {
        insights.push({
          id: `gc_high_${Date.now()}`,
          type: 'info',
          category: 'structural',
          title: 'High GC Content',
          description: `GC content of ${composition.gcContent.toFixed(1)}% may result in strong secondary structures and higher melting temperature.`,
          confidence: 0.8,
          actionable: true,
          relatedData: { gcContent: composition.gcContent }
        })
      } else if (composition.gcContent < gcThresholds.low) {
        insights.push({
          id: `gc_low_${Date.now()}`,
          type: 'info',
          category: 'structural',
          title: 'Low GC Content',
          description: `GC content of ${composition.gcContent.toFixed(1)}% suggests AT-rich regions, potentially indicating regulatory sequences.`,
          confidence: 0.8,
          actionable: true,
          relatedData: { gcContent: composition.gcContent }
        })
      }

      if (Math.abs(composition.gcSkew) > 0.1) {
        insights.push({
          id: `gc_skew_${Date.now()}`,
          type: 'suggestion',
          category: 'functional',
          title: 'Significant GC Skew Detected',
          description: `GC skew of ${composition.gcSkew.toFixed(3)} may indicate replication origin or transcriptional bias.`,
          confidence: 0.6,
          actionable: false,
          relatedData: { gcSkew: composition.gcSkew }
        })
      }
    }

    return insights
  }

  private generateFunctionalInsights(functional: any, type: string, context?: any): AIInsight[] {
    const insights: AIInsight[] = []

    if (type === 'dna' || type === 'rna') {
      if (functional.orfs && functional.orfs.length > 0) {
        const longestORF = functional.orfs[0]
        
        if (longestORF.protein.length > 100) {
          insights.push({
            id: `orf_significant_${Date.now()}`,
            type: 'info',
            category: 'functional',
            title: 'Significant ORF Found',
            description: `Longest ORF encodes ${longestORF.protein.length} amino acids, suggesting potential coding sequence.`,
            confidence: 0.8,
            actionable: true,
            relatedData: longestORF
          })
        }

        if (functional.orfs.length > 3) {
          insights.push({
            id: `multiple_orfs_${Date.now()}`,
            type: 'suggestion',
            category: 'functional',
            title: 'Multiple ORFs Detected',
            description: `${functional.orfs.length} ORFs found. Consider frame selection for optimal protein expression.`,
            confidence: 0.7,
            actionable: true,
            relatedData: { orfCount: functional.orfs.length }
          })
        }
      }

      if (functional.codonUsage && functional.codonUsage.codonBias > 0.02) {
        insights.push({
          id: `codon_bias_${Date.now()}`,
          type: 'suggestion',
          category: 'optimization',
          title: 'Codon Bias Detected',
          description: `Codon bias of ${functional.codonUsage.codonBias.toFixed(3)} suggests optimization may improve expression.`,
          confidence: 0.7,
          actionable: true,
          relatedData: functional.codonUsage
        })
      }

      if (functional.motifs && functional.motifs.length > 0) {
        functional.motifs.forEach((motif: any) => {
          insights.push({
            id: `motif_${motif.name}_${Date.now()}`,
            type: 'info',
            category: 'functional',
            title: `${motif.name} Detected`,
            description: `Found ${motif.count} instance(s) of ${motif.name}: ${motif.function}`,
            confidence: 0.6,
            actionable: false,
            relatedData: motif
          })
        })
      }
    }

    return insights
  }

  private generateComparativeInsights(comparative: any, type: string): AIInsight[] {
    const insights: AIInsight[] = []

    if (comparative && comparative.mutations) {
      const mutationRate = comparative.mutations.mutationRate
      
      if (mutationRate > 5) {
        insights.push({
          id: `high_mutation_rate_${Date.now()}`,
          type: 'warning',
          category: 'comparative',
          title: 'High Mutation Rate',
          description: `${mutationRate.toFixed(1)}% mutation rate detected. Significant sequence divergence from reference.`,
          confidence: 0.9,
          actionable: true,
          relatedData: comparative.mutations
        })
      }

      const missenseCount = comparative.mutations.mutations.filter((m: any) => m.effect === 'missense').length
      const nonsenseCount = comparative.mutations.mutations.filter((m: any) => m.effect === 'nonsense').length

      if (nonsenseCount > 0) {
        insights.push({
          id: `nonsense_mutations_${Date.now()}`,
          type: 'critical',
          category: 'comparative',
          title: 'Nonsense Mutations Detected',
          description: `${nonsenseCount} nonsense mutation(s) create premature stop codons, likely affecting protein function.`,
          confidence: 0.95,
          actionable: true,
          relatedData: { nonsenseCount, mutations: comparative.mutations.mutations }
        })
      }

      if (missenseCount > nonsenseCount && missenseCount > 5) {
        insights.push({
          id: `missense_dominant_${Date.now()}`,
          type: 'suggestion',
          category: 'comparative',
          title: 'Missense Mutations Predominant',
          description: `${missenseCount} missense mutations may affect protein structure and function. Consider structural analysis.`,
          confidence: 0.7,
          actionable: true,
          relatedData: { missenseCount }
        })
      }
    }

    if (comparative && comparative.similarity < 80) {
      insights.push({
        id: `low_similarity_${Date.now()}`,
        type: 'info',
        category: 'comparative',
        title: 'Low Sequence Similarity',
        description: `${comparative.similarity.toFixed(1)}% similarity to reference suggests significant evolutionary divergence.`,
        confidence: 0.8,
        actionable: false,
        relatedData: { similarity: comparative.similarity }
      })
    }

    return insights
  }

  private generateContextualInsights(
    sequence: string, 
    type: string, 
    context: any,
    analysisData: any
  ): AIInsight[] {
    const insights: AIInsight[] = []
    const question = context.question?.toLowerCase() || ''

    // Research context insights
    if (question.includes('disease') || question.includes('pathogen')) {
      insights.push({
        id: `disease_context_${Date.now()}`,
        type: 'suggestion',
        category: 'comparative',
        title: 'Disease Research Context',
        description: 'For disease-related analysis, consider comparing with ClinVar, OMIM, or pathogen databases.',
        confidence: 0.6,
        actionable: true
      })
    }

    if (question.includes('expression') || question.includes('cloning')) {
      if (analysisData.functional?.codonUsage?.codonBias > 0.02) {
        insights.push({
          id: `expression_optimization_${Date.now()}`,
          type: 'suggestion',
          category: 'optimization',
          title: 'Expression Optimization Recommended',
          description: 'High codon bias detected. Consider codon optimization for your target expression system.',
          confidence: 0.8,
          actionable: true,
          relatedData: { targetOrganism: context.targetOrganism }
        })
      }
    }

    if (question.includes('drug') || question.includes('target')) {
      if (type === 'protein') {
        insights.push({
          id: `drug_target_${Date.now()}`,
          type: 'suggestion',
          category: 'functional',
          title: 'Drug Target Analysis',
          description: 'For drug target analysis, consider binding pocket prediction and druggability assessment.',
          confidence: 0.7,
          actionable: true
        })
      }
    }

    return insights
  }

  private generateOptimizationSuggestions(
    sequence: string, 
    type: string, 
    context?: any
  ): AIInsight[] {
    const insights: AIInsight[] = []

    if (type === 'dna' && context?.targetOrganism) {
      const rareCodens = this.knowledgeBase.get('codon_optimization_hosts')[context.targetOrganism]
      if (rareCodens) {
        let rareCodonCount = 0
        rareCodens.forEach((codon: string) => {
          const regex = new RegExp(codon, 'gi')
          const matches = sequence.match(regex)
          if (matches) rareCodonCount += matches.length
        })

        if (rareCodonCount > 0) {
          insights.push({
            id: `rare_codons_${Date.now()}`,
            type: 'suggestion',
            category: 'optimization',
            title: 'Rare Codons Detected',
            description: `${rareCodonCount} rare codons found for ${context.targetOrganism}. Consider codon optimization.`,
            confidence: 0.8,
            actionable: true,
            relatedData: { rareCodonCount, targetOrganism: context.targetOrganism }
          })
        }
      }
    }

    // General optimization suggestions based on sequence characteristics
    if (sequence.length > 2000) {
      insights.push({
        id: `long_sequence_${Date.now()}`,
        type: 'suggestion',
        category: 'optimization',
        title: 'Long Sequence Detected',
        description: 'Consider analyzing in segments or using specialized tools for long sequence analysis.',
        confidence: 0.6,
        actionable: true
      })
    }

    return insights
  }

  private prioritizeInsights(insights: AIInsight[]): AIInsight[] {
    // Sort by priority: critical > warning > suggestion > info
    // Then by confidence (higher first)
    const priorityOrder = { 'critical': 4, 'warning': 3, 'suggestion': 2, 'info': 1 }
    
    return insights.sort((a, b) => {
      const priorityDiff = priorityOrder[b.type] - priorityOrder[a.type]
      if (priorityDiff !== 0) return priorityDiff
      return b.confidence - a.confidence
    })
  }
}

export const aiInsightsEngine = AIInsightsEngine.getInstance()