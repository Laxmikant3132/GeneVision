#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 GeneVision Enhanced Features Deployment Script');
console.log('================================================\n');

// Check if Firebase CLI is installed
function checkFirebaseCLI() {
  try {
    execSync('firebase --version', { stdio: 'ignore' });
    console.log('✅ Firebase CLI is installed');
    return true;
  } catch (error) {
    console.log('❌ Firebase CLI not found. Please install it first:');
    console.log('   npm install -g firebase-tools');
    return false;
  }
}

// Check if user is logged in to Firebase
function checkFirebaseAuth() {
  try {
    const result = execSync('firebase projects:list', { encoding: 'utf8' });
    if (result.includes('Error')) {
      throw new Error('Not authenticated');
    }
    console.log('✅ Firebase authentication verified');
    return true;
  } catch (error) {
    console.log('❌ Not logged in to Firebase. Please run:');
    console.log('   firebase login');
    return false;
  }
}

// Check if required files exist
function checkRequiredFiles() {
  const requiredFiles = [
    'firestore.rules',
    'database.rules.json',
    'firebase.json',
    'src/lib/firebase.ts',
    'src/config/appConfig.ts'
  ];

  let allFilesExist = true;
  
  requiredFiles.forEach(file => {
    if (fs.existsSync(path.join(process.cwd(), file))) {
      console.log(`✅ ${file} exists`);
    } else {
      console.log(`❌ ${file} is missing`);
      allFilesExist = false;
    }
  });

  return allFilesExist;
}

// Install dependencies
function installDependencies() {
  console.log('\n📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully');
    return true;
  } catch (error) {
    console.log('❌ Failed to install dependencies');
    return false;
  }
}

// Build the project
function buildProject() {
  console.log('\n🔨 Building project...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Project built successfully');
    return true;
  } catch (error) {
    console.log('❌ Build failed');
    return false;
  }
}

// Deploy Firestore rules
function deployFirestoreRules() {
  console.log('\n🔒 Deploying Firestore security rules...');
  try {
    execSync('firebase deploy --only firestore:rules', { stdio: 'inherit' });
    console.log('✅ Firestore rules deployed');
    return true;
  } catch (error) {
    console.log('❌ Failed to deploy Firestore rules');
    return false;
  }
}

// Deploy Realtime Database rules
function deployDatabaseRules() {
  console.log('\n🔒 Deploying Realtime Database rules...');
  try {
    execSync('firebase deploy --only database', { stdio: 'inherit' });
    console.log('✅ Database rules deployed');
    return true;
  } catch (error) {
    console.log('❌ Failed to deploy database rules');
    return false;
  }
}

// Deploy hosting
function deployHosting() {
  console.log('\n🌐 Deploying to Firebase Hosting...');
  try {
    execSync('firebase deploy --only hosting', { stdio: 'inherit' });
    console.log('✅ Hosting deployed');
    return true;
  } catch (error) {
    console.log('❌ Failed to deploy hosting');
    return false;
  }
}

// Create initial admin user document
function setupAdminUser() {
  console.log('\n👤 Setting up admin user...');
  
  const setupScript = `
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function setupAdmin() {
  try {
    await db.collection('users').doc('admin-setup').set({
      email: 'laxmikanttalli303@gmail.com',
      role: 'admin',
      setupComplete: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Admin user setup complete');
  } catch (error) {
    console.log('❌ Admin setup failed:', error.message);
  }
  process.exit(0);
}

setupAdmin();
  `;

  // Check if service account key exists
  if (fs.existsSync('serviceAccountKey.json')) {
    fs.writeFileSync('temp-admin-setup.js', setupScript);
    try {
      execSync('node temp-admin-setup.js', { stdio: 'inherit' });
      fs.unlinkSync('temp-admin-setup.js');
      return true;
    } catch (error) {
      console.log('❌ Admin setup failed');
      if (fs.existsSync('temp-admin-setup.js')) {
        fs.unlinkSync('temp-admin-setup.js');
      }
      return false;
    }
  } else {
    console.log('⚠️  Service account key not found. Admin setup skipped.');
    console.log('   Download serviceAccountKey.json from Firebase Console');
    return true;
  }
}

// Verify deployment
function verifyDeployment() {
  console.log('\n🔍 Verifying deployment...');
  try {
    const result = execSync('firebase hosting:sites:list', { encoding: 'utf8' });
    console.log('✅ Deployment verification complete');
    console.log('\n🎉 Enhanced features deployed successfully!');
    console.log('\nNext steps:');
    console.log('1. Visit your Firebase Console to verify rules');
    console.log('2. Test the enhanced specialist page at /specialist');
    console.log('3. Access the admin panel at /admin');
    console.log('4. Configure email notifications if needed');
    return true;
  } catch (error) {
    console.log('❌ Deployment verification failed');
    return false;
  }
}

// Main deployment function
async function deploy() {
  console.log('Starting enhanced features deployment...\n');

  // Pre-deployment checks
  if (!checkFirebaseCLI()) return;
  if (!checkFirebaseAuth()) return;
  if (!checkRequiredFiles()) return;

  // Installation and build
  if (!installDependencies()) return;
  if (!buildProject()) return;

  // Firebase deployment
  if (!deployFirestoreRules()) return;
  if (!deployDatabaseRules()) return;
  if (!deployHosting()) return;

  // Post-deployment setup
  setupAdminUser();
  verifyDeployment();

  console.log('\n🎊 Deployment complete! Your enhanced GeneVision platform is ready.');
}

// Run deployment
deploy().catch(error => {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
});