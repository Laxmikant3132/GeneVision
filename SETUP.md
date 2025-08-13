# GeneVision Setup Guide

## Quick Start

Your GeneVision bioinformatics application is ready to run! Follow these steps to get started:

### 1. Development Server is Running ✅
The application is already running at: **http://localhost:5173/**

### 2. Firebase Configuration (Required)

To enable user authentication and data storage, you need to set up Firebase:

#### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `genevision-app` (or your preferred name)
4. Enable Google Analytics (optional)
5. Create project

#### Step 2: Enable Authentication
1. In Firebase Console, go to "Authentication"
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password" provider
5. Save changes

#### Step 3: Create Firestore Database
1. Go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select your preferred location
5. Done

#### Step 4: Get Firebase Configuration
1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click "Web app" icon (`</>`)
4. Register app with name "GeneVision"
5. Copy the configuration object

#### Step 5: Update Firebase Config
Replace the configuration in `src/lib/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
}
```

### 3. Test the Application

#### Demo Account
For quick testing, use these credentials:
- **Email**: demo@genevision.com
- **Password**: demo123

#### Sample Sequences
The app includes built-in sample sequences:

**DNA Sequence (Human Beta-Globin)**:
```
ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGGCTGCTGGTGGTCTACCCTTGGACCCAGAGGTTCTTTGAGTCCTTTGGGGATCTGTCCACTCCTGATGCTGTTATGGGCAACCCTAAGGTGAAGGCTCATGGCAAGAAAGTGCTCGGTGCCTTTAGTGATGGCCTGGCTCACCTGGACAACCTCAAGGGCACCTTTGCCACACTGAGTGAGCTGCACTGTGACAAGCTGCACGTGGATCCTGAGAACTTCAGGCTCCTGGGCAACGTGCTGGTCTGTGTGCTGGCCCATCACTTTGGCAAAGAATTCACCCCACCAGTGCAGGCTGCCTATCAGAAAGTGGTGGCTGGTGTGGCTAATGCCCTGGCCCACAAGTATCACTAA
```

**Protein Sequence (Human Insulin)**:
```
MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN
```

### 4. Application Features

#### 🧬 Sequence Analysis
- **GC Content Analysis**: Calculate nucleotide composition
- **Codon Usage**: Analyze codon frequency patterns
- **Translation**: Convert DNA/RNA to protein
- **ORF Finder**: Identify open reading frames
- **Mutation Analysis**: Compare sequences

#### 📊 Visualizations
- Interactive charts with Recharts
- Real-time data visualization
- Export capabilities

#### 🔬 3D Protein Viewer
- Interactive molecular visualization
- Multiple rendering styles
- Structure manipulation controls

#### 🤖 AI Insights
- Intelligent biological interpretations
- Smart recommendations
- Pattern recognition

### 5. Usage Workflow

1. **Register/Login**: Create account or use demo credentials
2. **Create Session**: Start new analysis session
3. **Add Sequences**: Paste or upload sequence data
4. **Run Analysis**: Select analysis tools and execute
5. **View Results**: Explore interactive charts and insights
6. **3D Visualization**: View protein structures in 3D
7. **Export Data**: Download results for further use

### 6. Troubleshooting

#### Common Issues:

**Firebase Authentication Error**:
- Ensure Firebase config is correctly set
- Check if Authentication is enabled in Firebase Console

**Sequence Validation Error**:
- Verify sequence format (DNA: ATGC, RNA: AUGC, Protein: 20 amino acids)
- Remove any non-alphabetic characters

**3D Viewer Not Loading**:
- Check internet connection (3Dmol.js loads from CDN)
- Try refreshing the page

**Charts Not Displaying**:
- Ensure analysis has completed successfully
- Check browser console for errors

### 7. Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint
```

### 8. Project Structure

```
src/
├── components/          # React components
│   ├── analysis/       # Analysis-related components
│   ├── auth/          # Authentication components
│   ├── layout/        # Layout components
│   └── visualization/ # 3D viewer and charts
├── contexts/          # React contexts
├── data/             # Sample data and constants
├── lib/              # Firebase and utilities
├── pages/            # Page components
├── utils/            # Utility functions
└── styles/           # CSS and styling
```

### 9. Next Steps

- **Customize Styling**: Modify Tailwind classes for your branding
- **Add More Analysis Tools**: Extend bioinformatics capabilities
- **Database Integration**: Connect to NCBI, UniProt APIs
- **Advanced AI**: Implement more sophisticated ML models
- **Collaboration Features**: Add sharing and team functionality

### 10. Support

- **Documentation**: Check README.md for detailed information
- **Issues**: Report bugs in the repository issues
- **Community**: Join bioinformatics developer communities

---

**🎉 Your GeneVision application is ready!**

Visit **http://localhost:5173/** to start analyzing sequences with AI-powered insights and 3D visualization!