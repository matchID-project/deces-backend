// Test simple pour vérifier l'authentification auth0
const axios = require('axios');

// Charger les variables d'environnement
require('dotenv').config({ path: '.env.test' });

async function testAuth0() {
  console.log('Test Auth0 avec les variables d\'environnement suivantes:');
  console.log('MOCK_AUTH0:', process.env.MOCK_AUTH0);
  console.log('AUTH0_DOMAIN:', process.env.AUTH0_DOMAIN);
  console.log('AUTH0_CLIENT_ID:', process.env.AUTH0_CLIENT_ID);
  console.log('AUTH0_AUDIENCE:', process.env.AUTH0_AUDIENCE);
  
  // Importer les fonctions auth0
  const { sendAuth0OTP, verifyAuth0OTP } = require('./dist/auth0');
  
  try {
    // Test 1: Envoyer un OTP
    console.log('\nTest 1: Envoi d\'un OTP...');
    const otpResult = await sendAuth0OTP('test@example.com');
    console.log('Résultat OTP:', otpResult);
    
    // Test 2: Vérifier avec le mode mock
    if (process.env.MOCK_AUTH0 === 'true') {
      console.log('\nTest 2: Vérification avec le mode mock...');
      const tokenResult = await verifyAuth0OTP(
        process.env.BACKEND_TOKEN_USER,
        process.env.BACKEND_TOKEN_PASSWORD
      );
      console.log('Token obtenu:', tokenResult);
    }
    
    console.log('\n✅ Tests auth0 réussis!');
  } catch (error) {
    console.error('\n❌ Erreur lors des tests auth0:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Compiler d'abord le TypeScript
const { execSync } = require('child_process');
console.log('Compilation TypeScript...');
execSync('npm run build', { stdio: 'inherit' });

// Lancer les tests
testAuth0();