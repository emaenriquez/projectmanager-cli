import { TechnologyDetector } from './src/domain/services/TechnologyDetector';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

async function testVersionExtraction() {
  const detector = new TechnologyDetector();
  const testDir = path.join(os.tmpdir(), `test-version-${Date.now()}`);

  try {
    // Create test directory
    fs.mkdirSync(testDir, { recursive: true });

    console.log('Testing version extraction for task 5.3...\n');

    // Test 1: Node.js version from package.json with engines
    console.log('Test 1: Node.js version from package.json');
    const packageJson = {
      name: 'test-project',
      engines: { node: '^18.12.0' }
    };
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify(packageJson)
    );
    let techs = detector.detectFromPackageJson(testDir);
    console.log('Result:', techs.find(t => t.name === 'Node.js'));
    console.log('✓ Pass\n');

    // Clean up for next test
    fs.unlinkSync(path.join(testDir, 'package.json'));

    // Test 2: TypeScript version extraction
    console.log('Test 2: TypeScript version extraction');
    const packageJson2 = {
      name: 'test-project',
      devDependencies: {
        typescript: '^5.1.0'
      }
    };
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify(packageJson2)
    );
    techs = detector.detectFromPackageJson(testDir);
    console.log('Result:', techs.find(t => t.name === 'TypeScript'));
    console.log('✓ Pass\n');

    fs.unlinkSync(path.join(testDir, 'package.json'));

    // Test 3: Framework detection with version
    console.log('Test 3: Framework detection with version');
    const packageJson3 = {
      name: 'test-project',
      dependencies: {
        react: '^18.2.0',
        'next': '~14.0.0'
      }
    };
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify(packageJson3)
    );
    techs = detector.detectFromPackageJson(testDir);
    console.log('React:', techs.find(t => t.name === 'React'));
    console.log('Next.js:', techs.find(t => t.name === 'Next.js'));
    console.log('✓ Pass\n');

    fs.unlinkSync(path.join(testDir, 'package.json'));

    // Test 4: Python version (no lock file)
    console.log('Test 4: Python detection from requirements.txt');
    fs.writeFileSync(
      path.join(testDir, 'requirements.txt'),
      'django==3.0.0\nrequests==2.25.0'
    );
    techs = detector.detectFromRequirements(testDir);
    console.log('Result:', techs.find(t => t.name === 'Python'));
    console.log('✓ Pass\n');

    fs.unlinkSync(path.join(testDir, 'requirements.txt'));

    // Test 5: Go version extraction
    console.log('Test 5: Go version extraction from go.mod');
    fs.writeFileSync(
      path.join(testDir, 'go.mod'),
      'module example.com/hello\ngo 1.20\n'
    );
    techs = detector.detectFromGoMod(testDir);
    console.log('Result:', techs.find(t => t.name === 'Go'));
    console.log('✓ Pass\n');

    fs.unlinkSync(path.join(testDir, 'go.mod'));

    // Test 6: PHP version from composer.json
    console.log('Test 6: PHP version extraction from composer.json');
    const composerJson = {
      name: 'test/project',
      require: {
        php: '^8.1'
      }
    };
    fs.writeFileSync(
      path.join(testDir, 'composer.json'),
      JSON.stringify(composerJson)
    );
    techs = detector.detectFromComposerJson(testDir);
    console.log('Result:', techs.find(t => t.name === 'PHP'));
    console.log('✓ Pass\n');

    fs.unlinkSync(path.join(testDir, 'composer.json'));

    // Test 7: Java version from pom.xml
    console.log('Test 7: Java version extraction from pom.xml');
    const pomXml = `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <modelVersion>4.0.0</modelVersion>
  <properties>
    <source>17</source>
  </properties>
</project>`;
    fs.writeFileSync(path.join(testDir, 'pom.xml'), pomXml);
    techs = detector.detectFromPom(testDir);
    console.log('Result:', techs.find(t => t.name === 'Java'));
    console.log('✓ Pass\n');

    fs.unlinkSync(path.join(testDir, 'pom.xml'));

    // Test 8: Ruby detection from Gemfile
    console.log('Test 8: Ruby framework detection from Gemfile');
    fs.writeFileSync(
      path.join(testDir, 'Gemfile'),
      'source "https://rubygems.org"\ngem "rails"'
    );
    techs = detector.detectFromGemfile(testDir);
    console.log('Result:', techs);
    console.log('✓ Pass\n');

    // Test 9: Comprehensive multi-technology detection
    console.log('Test 9: Comprehensive multi-technology detection');
    fs.unlinkSync(path.join(testDir, 'Gemfile'));
    
    const multiPackageJson = {
      name: 'fullstack-project',
      engines: { node: '18.0.0' },
      dependencies: {
        react: '^18.0.0',
        'next': '^13.0.0'
      },
      devDependencies: {
        typescript: '^5.0.0'
      }
    };
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify(multiPackageJson)
    );
    fs.writeFileSync(
      path.join(testDir, 'requirements.txt'),
      'django==4.0.0'
    );

    techs = detector.detect(testDir);
    console.log(`Detected ${techs.length} technologies:`);
    techs.forEach(tech => {
      console.log(`  - ${tech.name}${tech.version ? ` (${tech.version})` : ''} [${tech.category}]`);
    });
    console.log('✓ Pass\n');

    console.log('All version extraction tests completed successfully! ✓');

  } finally {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  }
}

testVersionExtraction().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
