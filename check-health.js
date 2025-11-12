#!/usr/bin/env node

/**
 * Health Check Script
 * Verifica que el backend esté funcionando correctamente
 * Uso: node check-health.js [URL]
 */

const https = require('https');
const http = require('http');

const API_URL = process.argv[2] || 'http://localhost:3000';

console.log('🔍 Verificando salud del backend...');
console.log(`📍 URL: ${API_URL}\n`);

const client = API_URL.startsWith('https') ? https : http;

// Test 1: Verificar que el servidor responde
function checkServer() {
  return new Promise((resolve, reject) => {
    console.log('1️⃣  Verificando servidor...');
    client.get(API_URL, (res) => {
      if (res.statusCode === 200 || res.statusCode === 404) {
        console.log('   ✅ Servidor respondiendo\n');
        resolve();
      } else {
        console.log(`   ⚠️  Código de estado: ${res.statusCode}\n`);
        resolve();
      }
    }).on('error', (err) => {
      console.log(`   ❌ Error: ${err.message}\n`);
      reject(err);
    });
  });
}

// Test 2: Verificar Swagger docs
function checkDocs() {
  return new Promise((resolve, reject) => {
    console.log('2️⃣  Verificando documentación (Swagger)...');
    client.get(`${API_URL}/docs`, (res) => {
      if (res.statusCode === 200) {
        console.log(`   ✅ Swagger disponible en: ${API_URL}/docs\n`);
        resolve();
      } else {
        console.log(`   ⚠️  Swagger no disponible (${res.statusCode})\n`);
        resolve();
      }
    }).on('error', (err) => {
      console.log(`   ❌ Error: ${err.message}\n`);
      reject(err);
    });
  });
}

// Ejecutar checks
async function runChecks() {
  try {
    await checkServer();
    await checkDocs();
    
    console.log('✨ Verificación completada!');
    console.log('\n📌 URLs importantes:');
    console.log(`   • API: ${API_URL}`);
    console.log(`   • Docs: ${API_URL}/docs`);
    console.log(`   • Auth: ${API_URL}/auth/login`);
    
  } catch (error) {
    console.log('\n❌ El backend no está respondiendo correctamente');
    console.log('   Verifica que el servidor esté corriendo');
    process.exit(1);
  }
}

runChecks();
