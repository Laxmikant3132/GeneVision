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

### 📊 Interactive Visualizations
- Real-time charts and graphs using Recharts
- Composition analysis with pie charts and bar graphs
- Codon usage frequency visualization
- Reading frame comparison charts

### 🔬 3D Molecular Visualization
- Interactive 3D protein structure viewer using 3Dmol.js
- Multiple visualization styles (cartoon, stick, sphere, line)
- Various coloring schemes (spectrum, chain, residue, secondary structure)
- Structure manipulation controls (rotate, zoom, pan)
- Export capabilities for publication-quality images

### 🔥 Firebase Integration
- User authentication and profile management
- Real-time data storage and synchronization
- Analysis session persistence
- Cloud-based data backup

### 🌐 Database Integration
- NCBI database connectivity for sequence information
- UniProt integration for protein data
- PDB structure database access
- Real-time biological insights

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom bioinformatics theme
- **Charts**: Recharts for interactive data visualization
- **3D Visualization**: 3Dmol.js for molecular structures
- **Database**: Firebase (Firestore + Authentication)
- **Animation**: Framer Motion for smooth transitions
- **Icons**: Lucide React for modern iconography

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Firebase account and project

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

3. **Firebase Setup**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password)
   - Create a Firestore database
   - Copy your Firebase configuration
   - Update `src/lib/firebase.ts` with your config:

   ```typescript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "your-app-id"
   }
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

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

### Deploy to Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Environment Variables
Create a `.env` file for production:
```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id
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