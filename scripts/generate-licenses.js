#!/usr/bin/env node
/**
 * Generate comprehensive license list from npm and cargo dependencies
 * Outputs a JSON file with all third-party licenses for display in the About section
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Output file path
const outputPath = join(projectRoot, 'public', 'third-party-licenses.json');

/**
 * Get npm package licenses using npm list command
 */
function getNpmLicenses() {
  try {
    // Use npm list to get all dependencies with their licenses
    // This will include both direct and transitive dependencies
    const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
    const packageLockPath = join(projectRoot, 'package-lock.json');
    
    let licenses = [];
    
    // Try to read package-lock.json if it exists
    try {
      const packageLockContent = readFileSync(packageLockPath, 'utf-8');
      if (packageLockContent) {
        try {
          const packageLock = JSON.parse(packageLockContent);
          
          // Extract license information from package-lock.json
          const packages = packageLock.packages || {};
          
          for (const [path, pkg] of Object.entries(packages)) {
            if (path && pkg && (pkg.license || pkg.licenses)) {
              const name = pkg.name || path.split('node_modules/').pop();
              const version = pkg.version || 'unknown';
              const license = pkg.license || (Array.isArray(pkg.licenses) ? pkg.licenses.map(l => l.type).join(', ') : 'Unknown');
              
              licenses.push({
                name: name || 'unknown',
                version,
                license: typeof license === 'string' ? license : 'Unknown',
                type: 'npm',
                repository: pkg.repository?.url || pkg.repository || '',
              });
            }
          }
        } catch (parseError) {
          console.warn('Failed to parse package-lock.json:', parseError.message);
        }
      }
    } catch (error) {
      console.warn('package-lock.json not found or not readable:', error.message);
    }
    
    // If no licenses found, fallback to manually checking package.json dependencies
    if (licenses.length === 0) {
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      
      for (const [name, version] of Object.entries(allDeps)) {
        licenses.push({
          name,
          version: version.replace(/[\^~]/, ''),
          license: 'See package.json',
          type: 'npm',
          repository: '',
        });
      }
    }
    
    // Remove duplicates based on name+version
    const uniqueLicenses = [];
    const seen = new Set();
    
    for (const license of licenses) {
      const key = `${license.name}@${license.version}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueLicenses.push(license);
      }
    }
    
    // Sort alphabetically by name
    return uniqueLicenses.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error getting npm licenses:', error);
    return [];
  }
}

/**
 * Get Rust crate licenses from Cargo.toml dependencies
 * Note: For full license info, cargo-license or cargo-about should be used
 */
function getCargoLicenses() {
  try {
    const cargoTomlPath = join(projectRoot, 'src-tauri', 'Cargo.toml');
    const cargoToml = readFileSync(cargoTomlPath, 'utf-8');
    
    const licenses = [];
    
    // Parse Cargo.toml to extract dependencies
    // This is a simple parser - for production, consider using a proper TOML parser
    const lines = cargoToml.split('\n');
    let inDependencies = false;
    let inDevDependencies = false;
    let currentSection = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        inDependencies = false;
        inDevDependencies = false;
        
        if (trimmed.includes('[dependencies]')) {
          inDependencies = true;
          currentSection = 'dependencies';
        } else if (trimmed.includes('[dev-dependencies]')) {
          inDevDependencies = true;
          currentSection = 'dev-dependencies';
        } else {
          currentSection = '';
        }
      }
      
      if ((inDependencies || inDevDependencies) && trimmed && !trimmed.startsWith('[') && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([a-zA-Z0-9_-]+)\s*=/);
        if (match) {
          const crateName = match[1];
          // Extract version if present
          const versionMatch = trimmed.match(/version\s*=\s*"([^"]+)"/);
          const version = versionMatch ? versionMatch[1] : 'unknown';
          
          licenses.push({
            name: crateName,
            version,
            license: 'See crates.io or Cargo.toml',
            type: 'cargo',
            repository: `https://crates.io/crates/${crateName}`,
          });
        }
      }
    }
    
    // Sort alphabetically
    return licenses.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error getting cargo licenses:', error);
    return [];
  }
}

/**
 * Generate formatted license text
 */
function formatLicenseText(allLicenses) {
  let text = '';
  
  // Group by license type
  const byLicense = {};
  for (const license of allLicenses) {
    const licenseKey = license.license || 'Unknown';
    if (!byLicense[licenseKey]) {
      byLicense[licenseKey] = [];
    }
    byLicense[licenseKey].push(license);
  }
  
  // Format output
  for (const [licenseType, packages] of Object.entries(byLicense)) {
    text += `\n=== ${licenseType} ===\n\n`;
    for (const pkg of packages) {
      text += `${pkg.name}@${pkg.version}`;
      if (pkg.repository) {
        text += `\n  Repository: ${pkg.repository}`;
      }
      text += '\n\n';
    }
  }
  
  return text.trim();
}

/**
 * Main function
 */
function main() {
  console.log('Generating third-party license information...');
  
  const npmLicenses = getNpmLicenses();
  console.log(`Found ${npmLicenses.length} npm packages`);
  
  const cargoLicenses = getCargoLicenses();
  console.log(`Found ${cargoLicenses.length} cargo crates`);
  
  const allLicenses = [...npmLicenses, ...cargoLicenses];
  const licenseText = formatLicenseText(allLicenses);
  
  const output = {
    generatedAt: new Date().toISOString(),
    totalPackages: allLicenses.length,
    npmPackages: npmLicenses.length,
    cargoCrates: cargoLicenses.length,
    licenses: allLicenses,
    formattedText: licenseText,
  };
  
  // Ensure public directory exists
  try {
    const publicDir = join(projectRoot, 'public');
    try {
      mkdirSync(publicDir, { recursive: true });
    } catch (mkdirError) {
      // Directory might already exist, ignore error
    }
    
    writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`✓ License information written to ${outputPath}`);
    console.log(`  Total packages: ${allLicenses.length}`);
  } catch (error) {
    console.error('Error writing license file:', error);
    process.exit(1);
  }
}

main();

