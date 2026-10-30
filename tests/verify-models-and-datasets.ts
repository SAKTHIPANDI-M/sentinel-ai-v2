// Verification suite for upgraded Multi-Domain Model Registry & Dataset Selection

async function runTests() {
  console.log('--- SENTINELAI MULTI-DOMAIN MODEL & DATASET VERIFICATION ---');
  const baseUrl = 'http://127.0.0.1:3000';
  let passed = 0;
  let failed = 0;

  async function check(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ FAIL: ${name} ->`, err.message);
      failed++;
    }
  }

  // 1. Check Model Registry Count & Domains
  await check('Verify >= 40 Models and 10 Industry Domains', async () => {
    const res = await fetch(`${baseUrl}/api/v1/models`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const models = await res.json();

    if (!Array.isArray(models)) throw new Error('Models is not an array');
    if (models.length < 40) throw new Error(`Expected at least 40 models, got ${models.length}`);

    const expectedDomains = [
      'Banking & Finance',
      'Healthcare',
      'E-commerce & Retail',
      'NLP & Generative AI',
      'Computer Vision',
      'Cybersecurity',
      'Manufacturing & IoT',
      'Education',
      'Transportation & Logistics',
      'General Machine Learning',
    ];

    const presentDomains = new Set(models.map((m: any) => m.domain));
    for (const d of expectedDomains) {
      if (!presentDomains.has(d)) {
        throw new Error(`Missing expected domain: ${d}`);
      }
    }
    console.log(`   Found ${models.length} models spanning all ${expectedDomains.length} domains.`);
  });

  // 2. Test Dataset List Endpoint
  await check('GET /api/v1/models/:id/datasets', async () => {
    const res = await fetch(`${baseUrl}/api/v1/models/cardio-risk-v3.2/datasets`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.datasets) || data.datasets.length === 0) {
      throw new Error('No datasets returned for model');
    }
    console.log(`   Model cardio-risk-v3.2 has ${data.datasets.length} datasets available.`);
  });

  // 3. Test Dataset Selection Endpoint
  await check('POST /api/v1/models/:id/datasets/select', async () => {
    const resList = await fetch(`${baseUrl}/api/v1/models/cardio-risk-v3.2/datasets`);
    const dataList = await resList.json();
    const target = dataList.datasets[0];

    const res = await fetch(`${baseUrl}/api/v1/models/cardio-risk-v3.2/datasets/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datasetId: target.id }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success || data.model.activeDatasetId !== target.id) {
      throw new Error('Dataset selection did not update model activeDatasetId');
    }
  });

  // 4. Test Dataset Upload with Valid Schema
  await check('POST /api/v1/models/:id/datasets/upload (Valid CSV)', async () => {
    const csvContent = `age,systolic_bp,total_cholesterol,hdl_cholesterol,smoking_status,groundTruth\n65,135,210,48,1,high_risk\n42,120,180,55,0,low_risk\n71,150,240,40,1,high_risk`;
    const res = await fetch(`${baseUrl}/api/v1/models/cardio-risk-v3.2/datasets/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Automated_Test_Cohort',
        fileFormat: 'csv',
        content: csvContent,
        description: 'Test validation cohort',
      }),
    });
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    const data = await res.json();
    if (!data.validation.isValid) throw new Error('Expected dataset to be valid');
    if (!data.validation.hasGroundTruth) throw new Error('Expected ground truth detection');
  });

  // 5. Test Dataset Upload with Invalid Schema (Missing Required Columns)
  await check('POST /api/v1/models/:id/datasets/upload (Rejects Missing Columns)', async () => {
    const invalidCsv = `user_id,amount,timestamp\n1,100,2026-10-29\n2,200,2026-10-29`;
    const res = await fetch(`${baseUrl}/api/v1/models/cardio-risk-v3.2/datasets/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Invalid_Cohort',
        fileFormat: 'csv',
        content: invalidCsv,
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400 Bad Request, got ${res.status}`);
    const data = await res.json();
    if (data.validation.isValid) throw new Error('Expected dataset validation to fail');
    if (!data.validation.missingRequiredColumns.length) throw new Error('Expected missing columns report');
    console.log(`   Correctly flagged missing columns: ${data.validation.missingRequiredColumns.join(', ')}`);
  });

  // 6. Test Model Telemetry Across Multiple Domains
  await check('Verify Telemetry Across Distinct Domains', async () => {
    const testIds = ['fraud-velocity-v2', 'support-intent-llm', 'network-intrusion-v3', 'traffic-forecast-v3'];
    for (const id of testIds) {
      const res = await fetch(`${baseUrl}/api/v1/monitoring/overview?model_id=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error(`Failed to fetch overview for ${id}: HTTP ${res.status}`);
      const data = await res.json();
      if (!data.model || data.model.id !== id) throw new Error(`Model mismatch for ${id}`);
      if (typeof data.reliability_score !== 'number') throw new Error(`Missing reliability_score for ${id}`);
    }
  });

  console.log(`\nModel & Dataset Verification Complete: ${passed} PASSED, ${failed} FAILED.`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
