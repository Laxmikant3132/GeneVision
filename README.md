# GeneVision - AI-Powered Bioinformatics Platform

A modern, comprehensive bioinformatics web application for DNA, RNA, and protein sequence analysis with AI-powered insights and 3D molecular visualization.

## Features

### 🧬 Sequence Analysis
- **DNA/RNA Analysis**: GC content, nucleotide composition, codon usage patterns
- **Protein Analysis**: Amino acid translation, molecular weight, isoelectric point
- **ORF Detection**: Open reading frame identification in all reading frames
- **Mutation Analysis**: Compare sequences to identify variations and mutations

### 🤖 AI-Powered Insights
- Intelligent biological interpretations of analysis results
- Smart recommendations based on sequence characteristics
- Pattern recognition and anomaly detection
- Contextual explanations of findings

### � Specialist Chatbot (New)
- **Built-in definitions and how-tos**: GC content, GC skew, codon usage/bias, ORF, reading frames, translation, hydropathy, pI, MW, FASTA, start/stop codons, amino acids
- **Sequence-aware answers**: GC %, base composition, top codons and bias, top ORFs, translation length/MW/pI/hydropathy, protein summaries
- **No external API required**: Local, rule-based helper (extensible to real LLM APIs)

### �📊 Interactive Visualizations
- Real-time charts and graphs using Recharts
- Composition analysis with pie charts and bar graphs
- Codon usage frequency visualization
- Reading frame comparison charts

### 🔬 3D Molecular Visualization
- Interactive 3D protein structure viewer using 3Dmol.js (npm package: `3dmol`)
- Multiple visualization styles (cartoon, stick, sphere, line)
- Various coloring schemes (spectrum, chain, residue, secondary structure)
- Structure manipulation controls (rotate, zoom, pan)
- Export capabilities for publication-quality images

### 🔥 Firebase Integration
- User authentication and profile management
- Real-time data storage and synchronization (Firestore)
- File storage (Firebase Storage)
- Analysis session persistence

### 🌐 Database & External Integrations
- NCBI database connectivity for sequence information
- UniProt integration for protein data
- PDB structure database access

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **State**: Zustand
- **Routing**: React Router
- **Forms**: React Hook Form
- **File Upload**: React Dropzone
- **Network**: Axios
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **3D Visualization**: 3Dmol.js (`3dmol`)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Backend**: Firebase (Auth, Firestore, Storage)

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Firebase account and project (required for auth/db/storage)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd genevision
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   The app ships with a placeholder configuration. You should use your own Firebase project.

   - Option A (current setup): Replace values directly in `src/lib/firebase.ts` with your Firebase config from the Firebase Console.
   - Option B (recommended): Use environment variables.

     Update `src/lib/firebase.ts` to read from env:
     ```ts
     const firebaseConfig = {
       apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
       authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
       projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
       storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
       messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
       appId: import.meta.env.VITE_FIREBASE_APP_ID,
     }
     ```

     Then create a `.env` file in the project root:
     ```env
     VITE_FIREBASE_API_KEY=your-api-key
     VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
     VITE_FIREBASE_PROJECT_ID=your-project-id
     VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
     VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
     VITE_FIREBASE_APP_ID=your-app-id
     ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

### Useful Scripts
- `npm run dev`: Start Vite dev server
- `npm run build`: Type-check (tsc) and build for production
- `npm run preview`: Preview the production build locally
- `npm run lint`: Lint the codebase (ESLint)

## Pages & Routes Overview
- **Home**: Landing page
- **Dashboard**: User dashboard (auth-protected)
- **Analysis**: Sequence analysis workspace
- **Results**: Analysis results with charts and insights
- **Login / Register**: Authentication
- **Profile**: User profile
- **Specialist**: Advanced tools + built-in Specialist Chatbot
- **AdminPanel**: Admin features (role-gated)

## Specialist Chatbot

- **Where**: Specialist page
- **What it answers**:
  - Definitions/how-tos: GC content/skew, codon usage/bias, ORF, frames, translation, hydropathy, pI, MW, FASTA, start/stop codons
  - Sequence-aware: GC %, composition, top codons/bias, top ORFs, translation (length/MW/pI/hydropathy), protein summaries
- **How to use**:
  1. Open Specialist
  2. Paste a sequence and click Analyze
  3. Ask questions like:
     - "What is GC content?"
     - "Show top ORFs"
     - "What is the codon bias?"
     - "What is the translation MW and pI?"
- **Implementation**: Local, rule-based component (`src/components/analysis/SpecialistChatbot.tsx`). You can swap it to a real LLM API.

## Usage Guide

### 1. Account Creation
- Register with email and password
- Complete your profile setup
- Access the dashboard

### 2. Sequence Input
- **Paste Method**: Copy and paste sequences directly
- **File Upload**: Upload FASTA, .txt, or .seq files
- **Validation**: Automatic sequence format validation
- **Multiple Sequences**: Add multiple sequences to a session

### 3. Analysis Tools
- **GC Content**: Calculate nucleotide composition and GC/AT ratios
- **Codon Usage**: Analyze codon frequency and bias patterns
- **Translation**: Convert DNA/RNA to protein sequences
- **ORF Finder**: Identify open reading frames
- **Mutation Analysis**: Compare sequences for variations

### 4. Results Visualization
- **Interactive Charts**: Explore data with responsive charts
- **AI Insights**: Get intelligent biological interpretations
- **3D Structures**: Visualize protein structures in 3D
- **Export Options**: Download results in JSON/CSV formats

### 5. Session Management
- **Save Sessions**: Persist analysis sessions in Firebase
- **Load Previous Work**: Access historical analyses
- **Share Results**: Export and share findings
- **Data Management**: Full control over your data

## Sample Sequences for Testing

### DNA Sequence (Human Beta-Globin)
```
ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGGCTGCTGGTGGTCTACCCTTGGACCCAGAGGTTCTTTGAGTCCTTTGGGGATCTGTCCACTCCTGATGCTGTTATGGGCAACCCTAAGGTGAAGGCTCATGGCAAGAAAGTGCTCGGTGCCTTTAGTGATGGCCTGGCTCACCTGGACAACCTCAAGGGCACCTTTGCCACACTGAGTGAGCTGCACTGTGACAAGCTGCACGTGGATCCTGAGAACTTCAGGCTCCTGGGCAACGTGCTGGTCTGTGTGCTGGCCCATCACTTTGGCAAAGAATTCACCCCACCAGTGCAGGCTGCCTATCAGAAAGTGGTGGCTGGTGTGGCTAATGCCCTGGCCCACAAGTATCACTAA
```

### Protein Sequence (Human Insulin)
```
MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN
```

### RNA Sequence
```
AUGGGUGCACCUGACUCCUGAGGAGAAGUCUGCCGUUACUGCCCUGUGGGGCAAGGUGAACGUGGATGAAGUUGGUGGUGGAGGCCCUGGGCAGGCUGCUGGUGGUUACCCUUGGACCCAGAGGUUCUUUGAGUCCUUUGGGGATCUGUCCACUCCUGAUGCUGUUAUGGGGAACCCUAAGGUGAAGGCUCAUGGCAAGAAAGUGCUCGGUGCCUUUAGUGAUGGCCUGGCUCACCUGGACAACCUCAAGGGCACCUUUGCCACACUGAGUGAGCUGCACUGUGACAAGCUGCACGUGGATCCUGAGAACUUCAGGCUCCUGGGCAACGUGCUGGUCUGUGUGCUGGCCCAUCACUUUGGCAAAGAAUUCACCCCACCAGUGCAGGCUGCCUAUCAGAAAGUGGUGGCUGGUGUGGCUAAUGCCCUGGCCCACAAGUAUCACUAA
```

## API Integration Examples

### NCBI Integration
The application can fetch sequence data from NCBI databases:
```typescript
// Example: Fetch sequence by accession number
const fetchNCBISequence = async (accession: string) => {
  const response = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nucleotide&id=${accession}&rettype=fasta&retmode=text`
  )
  return response.text()
}
```

### UniProt Integration
Protein information retrieval:
```typescript
// Example: Fetch protein data from UniProt
const fetchUniProtData = async (uniprotId: string) => {
  const response = await fetch(
    `https://www.uniprot.org/uniprot/${uniprotId}.fasta`
  )
  return response.text()
}
```

## Deployment

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Hosting
- Serve the static `dist` folder on any static host (e.g., Firebase Hosting, Netlify, Vercel, GitHub Pages).
- Example: Firebase Hosting
  ```bash
  npm install -g firebase-tools
  firebase login
  firebase init hosting
  firebase deploy
  ```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **3Dmol.js** - Molecular visualization library
- **Recharts** - Chart library for React
- **Firebase** - Backend-as-a-Service platform
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **NCBI & UniProt** - Biological databases

## Support

For support, email support@genevision.com or create an issue in the repository.

---

**GeneVision** - Empowering researchers with cutting-edge bioinformatics tools and AI-powered insights.