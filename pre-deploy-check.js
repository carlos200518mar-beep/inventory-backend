#!/usr/bin/env node

/**
 * Pre-Deployment Checklist
 * Verifica que todo esté listo antes de desplegar
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 CHECKLIST PRE-DESPLIEGUE\n');
console.log('═══════════════════════════════════════\n');

let errors = 0;
let warnings = 0;

// Check 1: Verificar archivos necesarios
const requiredFiles = [
  'Dockerfile',
  '.dockerignore',
  'package.json',
  'tsconfig.json',
  'prisma/schema.prisma',
  '.env.example'
];

console.log('📁 Verificando archivos necesarios...');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  if (exists) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} NO ENCONTRADO`);
    errors++;
  }
});
console.log();

// Check 2: Verificar .env.example
console.log('🔐 Verificando .env.example...');
const envExample = fs.readFileSync(path.join(__dirname, '.env.example'), 'utf8');
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'NODE_ENV', 'PORT'];

requiredEnvVars.forEach(envVar => {
  if (envExample.includes(envVar)) {
    console.log(`   ✅ ${envVar}`);
  } else {
    console.log(`   ⚠️  ${envVar} no encontrado en .env.example`);
    warnings++;
  }
});
console.log();

// Check 3: Verificar package.json scripts
console.log('📦 Verificando scripts de npm...');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const requiredScripts = [
  'build',
  'start:prod',
  'prisma:generate',
  'prisma:migrate:deploy'
];

requiredScripts.forEach(script => {
  if (packageJson.scripts && packageJson.scripts[script]) {
    console.log(`   ✅ ${script}`);
  } else {
    console.log(`   ❌ Script "${script}" no encontrado`);
    errors++;
  }
});
console.log();

// Check 4: Verificar dependencias críticas
console.log('📚 Verificando dependencias críticas...');
const criticalDeps = ['@nestjs/core', '@nestjs/common', '@prisma/client', 'bcrypt'];

criticalDeps.forEach(dep => {
  if (packageJson.dependencies && packageJson.dependencies[dep]) {
    console.log(`   ✅ ${dep}`);
  } else {
    console.log(`   ❌ ${dep} no instalado`);
    errors++;
  }
});
console.log();

// Check 5: Verificar Prisma schema
console.log('🗄️  Verificando Prisma schema...');
const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  if (schema.includes('datasource db')) {
    console.log('   ✅ Datasource configurado');
  } else {
    console.log('   ❌ Datasource no encontrado en schema.prisma');
    errors++;
  }
  
  if (schema.includes('generator client')) {
    console.log('   ✅ Generator client configurado');
  } else {
    console.log('   ❌ Generator client no encontrado');
    errors++;
  }
  
  // Contar modelos
  const models = schema.match(/model\s+\w+/g);
  if (models && models.length > 0) {
    console.log(`   ✅ ${models.length} modelos definidos`);
  } else {
    console.log('   ⚠️  No se encontraron modelos');
    warnings++;
  }
} else {
  console.log('   ❌ schema.prisma no encontrado');
  errors++;
}
console.log();

// Check 6: Verificar .gitignore
console.log('🚫 Verificando .gitignore...');
const gitignorePath = path.join(__dirname, '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const gitignore = fs.readFileSync(gitignorePath, 'utf8');
  const shouldIgnore = ['.env', 'node_modules', 'dist'];
  
  shouldIgnore.forEach(item => {
    if (gitignore.includes(item)) {
      console.log(`   ✅ ${item} en .gitignore`);
    } else {
      console.log(`   ⚠️  ${item} NO está en .gitignore (PELIGRO)`);
      warnings++;
    }
  });
} else {
  console.log('   ⚠️  .gitignore no encontrado');
  warnings++;
}
console.log();

// Check 7: Verificar que .env no esté en Git
console.log('🔒 Verificando seguridad...');
if (fs.existsSync(path.join(__dirname, '.env'))) {
  console.log('   ⚠️  Archivo .env existe localmente (normal)');
  console.log('   ⚠️  ASEGÚRATE de que NO esté en Git');
  warnings++;
} else {
  console.log('   ✅ No hay .env local (usarás variables de entorno de la plataforma)');
}
console.log();

// Resumen final
console.log('═══════════════════════════════════════\n');
console.log('📊 RESUMEN:\n');

if (errors === 0 && warnings === 0) {
  console.log('🎉 ¡TODO PERFECTO! Tu aplicación está lista para desplegar.\n');
  console.log('Siguientes pasos:');
  console.log('1. Sube tu código a GitHub');
  console.log('2. Conecta tu repo a Railway/Render');
  console.log('3. Configura variables de entorno');
  console.log('4. ¡Despliega!\n');
  process.exit(0);
} else {
  if (errors > 0) {
    console.log(`❌ ${errors} error(es) encontrado(s) - DEBES corregirlos antes de desplegar\n`);
  }
  if (warnings > 0) {
    console.log(`⚠️  ${warnings} advertencia(s) - Revísalas antes de continuar\n`);
  }
  
  console.log('Corrígelos y vuelve a ejecutar este script.\n');
  process.exit(1);
}
