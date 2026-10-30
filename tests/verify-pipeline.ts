// Automated pipeline verification suite for SentinelAI

async function runVerification() {
  console.log('--- SENTINELAI PIPELINE VERIFICATION SUITE ---');
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

  // Helper fetch with timeout
  async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = 5000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  // 1. Health Endpoint
  await check('GET /api/v1/health', async () => {
    const res = await fetchWithTimeout(`${baseUrl}/api/v1/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== 'healthy') throw new Error(`Unexpected status: ${data.status}`);
    if (typeof data.events_per_second !== 'number') throw new Error('Missing events_per_second');
  });

  // 2. Models Endpoint
  await check('GET /api/v1/models', async () => {
    const res = await fetchWithTimeout(`${baseUrl}/api/v1/models`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('Models list empty');
  });

  // 3. Single Event Ingestion (snake_case)
  await check('POST /api/v1/events (snake_case)', async () => {
    const payload = {
      event_id: `VERIFY-EV-${Date.now()}`,
      timestamp: new Date().toISOString(),
      model_id: 'cardio-risk-v3.2',
      model_version: '3.2.0',
      input_features: {
        systolic_bp: 142,
        age: 71,
        total_cholesterol: 230,
      },
      prediction: 'high_risk',
      actual_label: 'high_risk',
      confidence: 0.94,
      latency_ms: 82,
      segment_attributes: {
        age_group: '65+',
        care_facility: 'Metropolitan General',
      },
    };
    const res = await fetchWithTimeout(`${baseUrl}/api/v1/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.status !== 201) throw new Error(`Expected 201 Created, got ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Failed to ingest event');
  });

  // 4. Batch Event Ingestion (batch endpoint)
  await check('POST /api/v1/events/batch (batch)', async () => {
    const batch = [
      {
        model_id: 'cardio-risk-v3.2',
        model_version: '3.2.0',
        input_features: { systolic_bp: 135, age: 68 },
        prediction: 'high_risk',
        actual_label: 'high_risk',
        confidence: 0.88,
        latency_ms: 75,
        segment_attributes: { age_group: '65+' },
      },
      {
        model_id: 'cardio-risk-v3.2',
        model_version: '3.2.0',
        input_features: { systolic_bp: 118, age: 34 },
        prediction: 'low_risk',
        actual_label: 'low_risk',
        confidence: 0.96,
        latency_ms: 60,
        segment_attributes: { age_group: '18-45' },
      },
    ];
    const res = await fetchWithTimeout(`${baseUrl}/api/v1/events/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    });
    if (res.status !== 202) throw new Error(`Expected 202 Accepted, got ${res.status}`);
    const data = await res.json();
    if (data.accepted_count !== 2) throw new Error(`Expected 2 accepted, got ${data.accepted_count}`);
  });

  // 5. Monitoring Overview
  await check('GET /api/v1/monitoring/overview', async () => {
    const res = await fetchWithTimeout(`${baseUrl}/api/v1/monitoring/overview?model_id=cardio-risk-v3.2`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (typeof data.reliability_score !== 'number') throw new Error('Missing reliability_score');
    if (typeof data.total_events_received !== 'number') throw new Error('Missing total_events_received');
  });

  // 6. Hidden Failure Radar
  await check('GET /api/v1/monitoring/failures (Hidden Failure Radar)', async () => {
    const res = await fetchWithTimeout(`${baseUrl}/api/v1/monitoring/failures?model_id=cardio-risk-v3.2`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (typeof data.silent_failures_count !== 'number' && typeof data.silentFailuresDetected !== 'number') {
      throw new Error('Missing silent failures count');
    }
    if (!Array.isArray(data.slices)) throw new Error('Missing slices array');
  });

  // 7. Feature and Prediction Drift
  await check('GET /api/v1/monitoring/drift', async () => {
    const res = await fetchWithTimeout(`${baseUrl}/api/v1/monitoring/drift?model_id=cardio-risk-v3.2`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.features)) throw new Error('Missing features drift array');
  });

  // 8. Public Environmental Telemetry (Open-Meteo)
  await check('GET /api/v1/public-data', async () => {
    const res = await fetchWithTimeout(`${baseUrl}/api/v1/public-data`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.provider || (!data.currentObservations && !data.currentObservation)) {
      throw new Error('Invalid public data payload');
    }
  });

  // 9. External Model Adapter Connection Tester
  await check('POST /api/v1/models/test-connection', async () => {
    const res = await fetchWithTimeout(`${baseUrl}/api/v1/models/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpointUrl: 'http://127.0.0.1:3000/api/v1/health',
        authType: 'none',
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.connected) throw new Error('Self probe failed connection');
    if (typeof data.latencyMs !== 'number') throw new Error('Missing latencyMs');
  });

  // 10. Root Cause Investigation Endpoint (Gemini 3.8 Flash / Expert Fallback)
  await check('POST /api/v1/investigate', async () => {
    const res = await fetchWithTimeout(`${baseUrl}/api/v1/investigate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Why is the model failing on elderly patients?',
        modelId: 'cardio-risk-v3.2',
      }),
    }, 8000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.answer || !data.engine) throw new Error('Invalid investigation response');
  });

  console.log(`\nVerification Complete: ${passed} PASSED, ${failed} FAILED.`);
  if (failed > 0) process.exit(1);
}

runVerification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
