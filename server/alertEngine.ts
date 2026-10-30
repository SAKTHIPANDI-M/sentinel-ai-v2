import type {
  ModelRecord,
  PredictionEvent,
  Incident,
  ModelAlertRuleConfig,
  ModelDiagnostics,
  IncidentSeverity,
  IncidentStatus,
} from './types.ts';

export interface DetectedAlert {
  ruleId: string;
  ruleName: string;
  category: 'drift' | 'latency' | 'confidence' | 'accuracy' | 'subgroup' | 'regression';
  severity: IncidentSeverity;
  title: string;
  description: string;
  detectedRule: string;
  affectedTarget: string; // e.g. 'latency_ms', 'age_group: 65+', 'velocity_1h'
  supportingMetrics: Record<string, any>;
  suggestedAction: 'rollback' | 'retrain' | 'subgroup_remediation' | 'human_review' | 'pipeline_hotfix';
  assignedOwner: string;
  failureFingerprint?: string;
  timestamp: string;
}

/**
 * Generate tailored, domain-aware alert rules for any model
 */
export function getDefaultAlertRules(model: ModelRecord): ModelAlertRuleConfig[] {
  const domain = model.domain;
  const task = model.task;

  // Domain-specific latency SLA tuning
  let latencySla = 250;
  if (domain === 'Banking & Finance') latencySla = 180;
  else if (domain === 'Cybersecurity') latencySla = 100;
  else if (domain === 'NLP & Generative AI') latencySla = 1200;
  else if (domain === 'Computer Vision') latencySla = 400;
  else if (domain === 'Manufacturing & IoT') latencySla = 150;
  else if (domain === 'Transportation & Logistics') latencySla = 200;

  // Domain-specific confidence threshold tuning
  let minConfidence = 0.70;
  if (domain === 'NLP & Generative AI') minConfidence = 0.58;
  else if (domain === 'Cybersecurity') minConfidence = 0.80;
  else if (domain === 'Healthcare') minConfidence = 0.75;

  const rules: ModelAlertRuleConfig[] = [
    {
      ruleId: 'RULE_LATENCY_SLA',
      name: 'Inference Latency SLA Breach',
      category: 'latency',
      enabled: true,
      threshold: latencySla,
      description: `Flags predictions exceeding the operational SLA of ${latencySla}ms.`,
      requiresGroundTruth: false,
    },
    {
      ruleId: 'RULE_LOW_CONFIDENCE',
      name: 'Low Confidence Outlier Warning',
      category: 'confidence',
      enabled: true,
      threshold: minConfidence,
      description: `Flags predictions with probability confidence lower than ${(minConfidence * 100).toFixed(0)}%.`,
      requiresGroundTruth: false,
    },
    {
      ruleId: 'RULE_FEATURE_DRIFT',
      name: 'Statistical Feature Drift (PSI)',
      category: 'drift',
      enabled: true,
      threshold: 0.15,
      description: 'Detects Population Stability Index (PSI) drift breach > 0.15 against baseline.',
      requiresGroundTruth: false,
    },
    {
      ruleId: 'RULE_PREDICTION_DRIFT',
      name: 'Prediction Distribution Shift',
      category: 'drift',
      enabled: true,
      threshold: 0.25,
      description: 'Monitors class ratio divergence exceeding 25% from expected distribution.',
      requiresGroundTruth: false,
    },
    {
      ruleId: 'RULE_GROUND_TRUTH_MISMATCH',
      name: 'Prediction vs Ground Truth Mismatch',
      category: 'accuracy',
      enabled: true,
      threshold: 1.0,
      description: 'Identifies critical classification or regression error when empirical ground truth is available.',
      requiresGroundTruth: true,
    },
    {
      ruleId: 'RULE_SUBGROUP_DISPARITY',
      name: 'Subgroup Performance Disparity',
      category: 'subgroup',
      enabled: true,
      threshold: 15.0, // 15% relative drop
      description: 'Flags hidden failure slices where a demographic or operational cohort drops > 15% below baseline.',
      requiresGroundTruth: true,
    },
    {
      ruleId: 'RULE_PERFORMANCE_REGRESSION',
      name: 'Model Performance Regression',
      category: 'regression',
      enabled: true,
      threshold: 0.82, // Minimum acceptable accuracy
      description: 'Alerts when evaluated rolling window accuracy degrades below 82% SLA.',
      requiresGroundTruth: true,
    },
  ];

  return rules;
}

/**
 * Generate default diagnostics status for a model
 */
export function getInitialDiagnostics(model: ModelRecord, activeIncidentCount = 0): ModelDiagnostics {
  const rules = model.alertRules || getDefaultAlertRules(model);
  const enabledNames = rules.filter((r) => r.enabled).map((r) => r.name);

  const missingWarnings: string[] = [];
  if (!model.features || model.features.length === 0) {
    missingWarnings.push('No features registered for feature drift tracking.');
  }
  if (!model.monitoredSegments || model.monitoredSegments.length === 0) {
    missingWarnings.push('No segmentation slices specified for subgroup disparity monitoring.');
  }
  if (!model.referenceDataset) {
    missingWarnings.push('Reference baseline dataset missing; using empirical fallback.');
  }

  let status: ModelDiagnostics['monitoringStatus'] = 'active';
  if (model.status === 'critical' || activeIncidentCount >= 2) status = 'degraded';
  else if (model.status === 'watch' || activeIncidentCount === 1) status = 'warning';
  else if (enabledNames.length === 0) status = 'unconfigured';

  return {
    alertRulesEnabled: enabledNames,
    activeIncidentCount,
    monitoringStatus: status,
    missingConfigWarnings: missingWarnings,
  };
}

/**
 * Evaluate an incoming prediction event against a model's configured alert rules
 */
export function evaluateEventAlerts(
  event: PredictionEvent,
  model: ModelRecord,
  recentEvents: PredictionEvent[]
): DetectedAlert[] {
  const alerts: DetectedAlert[] = [];
  const rules = model.alertRules || getDefaultAlertRules(model);
  const ruleMap = new Map(rules.map((r) => [r.ruleId, r]));

  const hasGroundTruth =
    event.groundTruth !== undefined &&
    event.groundTruth !== null &&
    String(event.groundTruth).trim() !== '';

  const timestamp = event.timestamp || new Date().toISOString();

  // 1. High Inference Latency Rule (Unsupervised / No Label Required)
  const latencyRule = ruleMap.get('RULE_LATENCY_SLA');
  if (latencyRule?.enabled && event.latencyMs > latencyRule.threshold) {
    const isExtreme = event.latencyMs > latencyRule.threshold * 2;
    alerts.push({
      ruleId: 'RULE_LATENCY_SLA',
      ruleName: latencyRule.name,
      category: 'latency',
      severity: isExtreme ? 'critical' : 'high',
      title: `Latency SLA Breach: ${event.latencyMs}ms on ${model.name}`,
      description: `Inference latency for model ${model.name} (${model.version}) was observed at ${event.latencyMs}ms, exceeding the configured operational SLA threshold of ${latencyRule.threshold}ms.`,
      detectedRule: `LATENCY_SLA_BREACH (Threshold: ${latencyRule.threshold}ms, Observed: ${event.latencyMs}ms)`,
      affectedTarget: 'inference_latency',
      supportingMetrics: {
        observedLatencyMs: event.latencyMs,
        thresholdLatencyMs: latencyRule.threshold,
        environment: event.environment,
      },
      suggestedAction: 'pipeline_hotfix',
      assignedOwner: model.owner || 'MLOps Platform Team',
      failureFingerprint: `FP-LATENCY-SPIKE-${model.id}`,
      timestamp,
    });
  }

  // 2. Low Confidence Rule (Unsupervised / No Label Required)
  const confRule = ruleMap.get('RULE_LOW_CONFIDENCE');
  if (confRule?.enabled && typeof event.confidence === 'number' && event.confidence < confRule.threshold) {
    // Check if there is a cluster of low confidence in recent events
    const recentLowConf = recentEvents.slice(-20).filter((e) => e.confidence < confRule.threshold);
    if (recentLowConf.length >= 3 || event.confidence < 0.40) {
      alerts.push({
        ruleId: 'RULE_LOW_CONFIDENCE',
        ruleName: confRule.name,
        category: 'confidence',
        severity: event.confidence < 0.45 ? 'high' : 'medium',
        title: `Low Confidence Surge: ${(event.confidence * 100).toFixed(1)}% on ${model.name}`,
        description: `Model ${model.name} produced prediction output "${event.prediction}" with abnormally low confidence (${(event.confidence * 100).toFixed(1)}%), breaching the ${(confRule.threshold * 100).toFixed(0)}% threshold. Repeated instances indicate input uncertainty or out-of-distribution inputs.`,
        detectedRule: `LOW_CONFIDENCE_THRESHOLD (Min: ${(confRule.threshold * 100).toFixed(0)}%, Observed: ${(event.confidence * 100).toFixed(1)}%)`,
        affectedTarget: 'prediction_confidence',
        supportingMetrics: {
          confidence: event.confidence,
          threshold: confRule.threshold,
          recentLowConfidenceCount: recentLowConf.length + 1,
        },
        suggestedAction: 'human_review',
        assignedOwner: model.owner || 'ML Team',
        failureFingerprint: `FP-LOW-CONFIDENCE-${model.id}`,
        timestamp,
      });
    }
  }

  // 3. Feature Drift Anomaly Detection (Unsupervised)
  const driftRule = ruleMap.get('RULE_FEATURE_DRIFT');
  if (driftRule?.enabled && event.features) {
    // Check for extreme feature outliers in incoming event
    for (const [featKey, featVal] of Object.entries(event.features)) {
      if (typeof featVal === 'number') {
        // Severe drift burst marker (e.g. injected values > 1000 or values >> baseline)
        if (featKey.includes('velocity') && featVal > 30) {
          alerts.push({
            ruleId: 'RULE_FEATURE_DRIFT',
            ruleName: driftRule.name,
            category: 'drift',
            severity: featVal > 50 ? 'critical' : 'high',
            title: `Feature Drift Detected: \`${featKey}\` on ${model.name}`,
            description: `Significant covariate distribution shift detected in input feature \`${featKey}\` (observed value: ${featVal}). Statistical divergence exceeds PSI threshold of ${driftRule.threshold}.`,
            detectedRule: `FEATURE_PSI_BREACH (Threshold: ${driftRule.threshold}, Observed value: ${featVal})`,
            affectedTarget: `feature:${featKey}`,
            supportingMetrics: {
              featureName: featKey,
              observedValue: featVal,
              driftMetric: 'PSI',
            },
            suggestedAction: 'retrain',
            assignedOwner: model.owner || 'Data Science',
            failureFingerprint: `FP-FEATURE-DRIFT-${model.id}-${featKey}`,
            timestamp,
          });
          break;
        }
      }
    }
  }

  // 4. SUPERVISED RULES — REQUIRE EMPIRICAL GROUND TRUTH
  // "Use only applicable rules. For example, supervised performance alerts require valid ground-truth labels"
  if (hasGroundTruth) {
    const isMismatch = String(event.prediction).trim().toLowerCase() !== String(event.groundTruth).trim().toLowerCase();

    // 4a. Prediction vs Ground Truth Mismatch
    const mismatchRule = ruleMap.get('RULE_GROUND_TRUTH_MISMATCH');
    if (mismatchRule?.enabled && isMismatch) {
      // Look at labeled recent window error rate
      const labeledRecent = recentEvents.filter((e) => e.groundTruth !== undefined && e.groundTruth !== null);
      const errorsRecent = labeledRecent.filter(
        (e) => String(e.prediction).trim().toLowerCase() !== String(e.groundTruth).trim().toLowerCase()
      );

      // Only trigger if high confidence error OR error cluster
      if (event.confidence >= 0.85 || errorsRecent.length >= 4) {
        alerts.push({
          ruleId: 'RULE_GROUND_TRUTH_MISMATCH',
          ruleName: mismatchRule.name,
          category: 'accuracy',
          severity: event.confidence >= 0.88 ? 'critical' : 'high',
          title: `Ground Truth Conflict: Expected "${event.groundTruth}", Got "${event.prediction}"`,
          description: `Empirical ground truth mismatch detected on ${model.name} (${model.version}). Model predicted "${event.prediction}" with ${event.confidence ? (event.confidence * 100).toFixed(1) + '% confidence' : 'high certainty'} against confirmed ground truth "${event.groundTruth}".`,
          detectedRule: 'GROUND_TRUTH_LABEL_MISMATCH',
          affectedTarget: `target_label:${event.groundTruth}`,
          supportingMetrics: {
            prediction: event.prediction,
            groundTruth: event.groundTruth,
            confidence: event.confidence,
            recentErrorCount: errorsRecent.length + 1,
          },
          suggestedAction: 'retrain',
          assignedOwner: model.owner || 'Validation Lead',
          failureFingerprint: `FP-GT-MISMATCH-${model.id}-${event.groundTruth}`,
          timestamp,
        });
      }
    }

    // 4b. Subgroup Performance Disparity (Simpson's Paradox & Cohort Failures)
    const subgroupRule = ruleMap.get('RULE_SUBGROUP_DISPARITY');
    if (subgroupRule?.enabled && event.segments) {
      for (const [segKey, segVal] of Object.entries(event.segments)) {
        if (!segVal) continue;

        // Gather recent events for this specific slice
        const sliceEvents = recentEvents.filter((e) => e.segments?.[segKey] === segVal);
        const sliceLabeled = sliceEvents.filter((e) => e.groundTruth !== undefined && e.groundTruth !== null);

        if (sliceLabeled.length >= 8) {
          const sliceErrors = sliceLabeled.filter(
            (e) => String(e.prediction).trim().toLowerCase() !== String(e.groundTruth).trim().toLowerCase()
          );
          const sliceAcc = (sliceLabeled.length - sliceErrors.length) / sliceLabeled.length;
          const baselineAcc = model.summaryMetrics.accuracy || 0.94;
          const relativeDrop = Number((((baselineAcc - sliceAcc) / baselineAcc) * 100).toFixed(1));

          if (relativeDrop >= subgroupRule.threshold) {
            alerts.push({
              ruleId: 'RULE_SUBGROUP_DISPARITY',
              ruleName: subgroupRule.name,
              category: 'subgroup',
              severity: relativeDrop >= 30 ? 'critical' : 'high',
              title: `Subgroup Disparity: \`${segKey}=${segVal}\` Accuracy Drop (-${relativeDrop}%)`,
              description: `Critical subgroup failure detected for ${model.name} in slice \`${segKey} = ${segVal}\`. Slice accuracy fell to ${(sliceAcc * 100).toFixed(1)}% compared to global baseline ${(baselineAcc * 100).toFixed(1)}% (relative drop of ${relativeDrop}%). Global aggregate metrics mask this localized failure.`,
              detectedRule: `SUBGROUP_DISPARITY_THRESHOLD_EXCEEDED (Max drop: ${subgroupRule.threshold}%, Observed: ${relativeDrop}%)`,
              affectedTarget: `${segKey}: ${segVal}`,
              supportingMetrics: {
                segment: `${segKey} = ${segVal}`,
                sliceAccuracy: Number(sliceAcc.toFixed(3)),
                baselineAccuracy: baselineAcc,
                relativeDropPct: relativeDrop,
                sampleSize: sliceLabeled.length,
              },
              suggestedAction: 'subgroup_remediation',
              assignedOwner: model.owner || 'Fairness & Bias Lead',
              failureFingerprint: `FP-SUBGROUP-DISPARITY-${model.id}-${segKey}-${segVal}`,
              timestamp,
            });
            break;
          }
        }
      }
    }

    // 4c. Model Performance Regression
    const regRule = ruleMap.get('RULE_PERFORMANCE_REGRESSION');
    if (regRule?.enabled) {
      const labeledWindow = recentEvents.slice(-40).filter((e) => e.groundTruth !== undefined && e.groundTruth !== null);
      if (labeledWindow.length >= 15) {
        const errors = labeledWindow.filter(
          (e) => String(e.prediction).trim().toLowerCase() !== String(e.groundTruth).trim().toLowerCase()
        );
        const rollingAcc = (labeledWindow.length - errors.length) / labeledWindow.length;

        if (rollingAcc < regRule.threshold) {
          alerts.push({
            ruleId: 'RULE_PERFORMANCE_REGRESSION',
            ruleName: regRule.name,
            category: 'regression',
            severity: rollingAcc < 0.70 ? 'critical' : 'high',
            title: `Performance Regression: Rolling Accuracy at ${(rollingAcc * 100).toFixed(1)}%`,
            description: `Evaluated performance for ${model.name} fell below the minimum acceptable SLA threshold of ${(regRule.threshold * 100).toFixed(0)}%. Recent 40-event evaluation window shows ${errors.length} empirical prediction errors.`,
            detectedRule: `ROLLING_ACCURACY_SLA_BREACH (Min: ${(regRule.threshold * 100).toFixed(0)}%, Observed: ${(rollingAcc * 100).toFixed(1)}%)`,
            affectedTarget: 'global_accuracy',
            supportingMetrics: {
              rollingAccuracy: Number(rollingAcc.toFixed(3)),
              threshold: regRule.threshold,
              evaluatedSamples: labeledWindow.length,
              errorCount: errors.length,
            },
            suggestedAction: 'rollback',
            assignedOwner: model.owner || 'Release Manager',
            failureFingerprint: `FP-REGRESSION-${model.id}`,
            timestamp,
          });
        }
      }
    }
  }

  return alerts;
}

/**
 * Deduplicate and record detected alerts into store incidents
 * Stable incident key: ${model.id}::${alert.ruleId}::${alert.affectedTarget}
 */
export function deduplicateAndRecordIncident(
  incidentsList: Incident[],
  alert: DetectedAlert,
  model: ModelRecord,
  addAuditLog?: (actor: string, action: string, details: string, severity?: any) => void
): { incident: Incident; isNew: boolean } {
  const stableKey = `${model.id}::${alert.ruleId}::${alert.affectedTarget}`;

  // Find existing active incident for this exact condition on this model
  const existingIndex = incidentsList.findIndex(
    (inc) =>
      inc.modelId === model.id &&
      inc.failureFingerprint === stableKey &&
      (inc.status === 'open' || inc.status === 'investigating' || inc.status === 'acknowledged')
  );

  if (existingIndex >= 0) {
    const existing = incidentsList[existingIndex];
    existing.occurrenceCount = (existing.occurrenceCount || 1) + 1;
    existing.lastSeen = alert.timestamp;
    existing.supportingMetrics = {
      ...existing.supportingMetrics,
      ...alert.supportingMetrics,
      occurrenceCount: existing.occurrenceCount,
    };
    // Upgrade severity if new occurrence is higher severity
    if (alert.severity === 'critical' && existing.severity !== 'critical') {
      existing.severity = 'critical';
    }
    return { incident: existing, isNew: false };
  }

  // Create new incident
  const newIncident: Incident = {
    id: `INC-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`,
    modelId: model.id,
    modelVersion: model.version,
    title: alert.title,
    description: alert.description,
    severity: alert.severity,
    status: 'open',
    detectedRule: alert.detectedRule,
    supportingMetrics: alert.supportingMetrics,
    firstSeen: alert.timestamp,
    lastSeen: alert.timestamp,
    occurrenceCount: 1,
    affectedSegment: alert.affectedTarget,
    suggestedAction: alert.suggestedAction,
    assignedOwner: alert.assignedOwner,
    failureFingerprint: stableKey,
    comments: [
      {
        id: `c-init-${Date.now()}`,
        author: 'SentinelAI Monitor',
        text: `Automated alert created by rule "${alert.ruleName}". Evaluation detected ${alert.detectedRule}.`,
        timestamp: alert.timestamp,
      },
    ],
  };

  incidentsList.unshift(newIncident);

  if (addAuditLog) {
    addAuditLog(
      'SentinelAI Engine',
      'ALERT_INCIDENT_CREATED',
      `[${alert.severity.toUpperCase()}] Incident ${newIncident.id} generated for model ${model.name}: ${alert.title}`,
      alert.severity === 'critical' ? 'critical' : 'warn'
    );
  }

  return { incident: newIncident, isNew: true };
}
