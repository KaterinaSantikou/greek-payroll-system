/**
 * Basic smoke tests for the PayrollSync application
 * Tests core functionality without complex mocking
 */

const { AuthService } = require('./server/services/authService.ts');
const { PasswordService } = require('./server/services/PasswordService.ts');

async function runBasicTests() {
  console.log('🧪 Running basic smoke tests...\n');
  
  try {
    // Test 1: Password hashing and verification
    console.log('Test 1: Password hashing and verification');
    const testPassword = 'TestPassword123!';
    const hashResult = await PasswordService.hashPassword(testPassword);
    
    console.log('✓ Password hashed successfully');
    console.log(`  Hash length: ${hashResult.hash.length}`);
    
    const isValid = await PasswordService.verifyPassword(testPassword, hashResult.hash);
    const isInvalid = await PasswordService.verifyPassword('wrongpassword', hashResult.hash);
    
    if (isValid && !isInvalid) {
      console.log('✅ Password verification works correctly\n');
    } else {
      console.log('❌ Password verification failed\n');
      return false;
    }

    // Test 2: AuthService token generation
    console.log('Test 2: AuthService token generation');
    const token = AuthService.generateSecureToken(32);
    
    if (token && token.length === 64) { // hex string is 2x length
      console.log('✅ Secure token generation works\n');
    } else {
      console.log('❌ Token generation failed\n');
      return false;
    }

    // Test 3: Environment variables check
    console.log('Test 3: Environment check');
    const hasDatabase = !!process.env.DATABASE_URL;
    const hasJwtSecret = !!process.env.JWT_SECRET;
    
    console.log(`  Database URL: ${hasDatabase ? '✓' : '❌'}`);
    console.log(`  JWT Secret: ${hasJwtSecret ? '✓' : '❌'}`);
    
    if (hasDatabase) {
      console.log('✅ Core environment variables present\n');
    } else {
      console.log('⚠️  Some environment variables missing but tests can continue\n');
    }

    console.log('🎉 All basic tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runBasicTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runBasicTests };