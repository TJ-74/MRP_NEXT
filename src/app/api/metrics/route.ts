import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Simple time series forecasting function using moving average
function forecastTimeSeries(data: Array<{date: string, cost: number}>, numPredictions: number = 3): Array<{date: string, cost: number, isPrediction: boolean}> {
  if (!data || data.length < 4) {
    console.log('Not enough data for forecasting');
    return data.map(d => ({ ...d, isPrediction: false }));
  }
  
  // Sort data by date
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Group by month to reduce noise
  const monthlyData: Record<string, {total: number, count: number}> = {};
  
  sortedData.forEach(item => {
    const month = item.date.substring(0, 7); // YYYY-MM
    if (!monthlyData[month]) {
      monthlyData[month] = { total: 0, count: 0 };
    }
    monthlyData[month].total += item.cost;
    monthlyData[month].count += 1;
  });
  
  // Convert to array of monthly averages
  const monthlyAvg = Object.keys(monthlyData).map(month => ({
    date: month + '-01', // First day of month
    cost: monthlyData[month].total / monthlyData[month].count
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Not enough monthly data points
  if (monthlyAvg.length < 3) {
    console.log('Not enough monthly data for forecasting');
    return data.map(d => ({ ...d, isPrediction: false }));
  }
  
  // Calculate trend using simple linear regression
  // y = mx + b
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  const n = monthlyAvg.length;
  
  for (let i = 0; i < n; i++) {
    const x = i;
    const y = monthlyAvg[i].cost;
    
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  console.log(`Forecasting model: cost = ${slope.toFixed(2)} * month + ${intercept.toFixed(2)}`);
  
  // Make predictions for the next n months
  const result = data.map(d => ({ ...d, isPrediction: false }));
  const lastDate = new Date(monthlyAvg[monthlyAvg.length - 1].date);
  
  for (let i = 1; i <= numPredictions; i++) {
    const nextMonth = new Date(lastDate);
    nextMonth.setMonth(lastDate.getMonth() + i);
    
    const predictedValue = slope * (n + i - 1) + intercept;
    
    // Apply some randomness within a range of ±5% to make it more realistic
    const randomFactor = 1 + (Math.random() * 0.1 - 0.05);
    const predictedCost = predictedValue * randomFactor;
    
    const predictedDate = nextMonth.toISOString().split('T')[0];
    
    console.log(`Predicted cost for ${predictedDate}: $${predictedCost.toFixed(2)}`);
    
    result.push({
      date: predictedDate,
      cost: predictedCost,
      isPrediction: true
    });
  }
  
  return result;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const selectedProcedure = searchParams.get('procedure') || 'Administration of anesthesia for procedure (procedure)';
    console.log('Selected procedure:', selectedProcedure);
    
    // First, get the count of procedures with a dedicated count query
    const { count, error: countError } = await supabase
      .from('procedures')
      .select('*', { count: 'exact' })
      .ilike('description', selectedProcedure);
    
    if (countError) {
      console.error('Error getting procedure count:', countError);
      throw countError;
    }
    
    console.log(`Count query returned: ${count || 0} procedures`);
    
    // Get procedures with all needed fields for metrics and chart
    const { data: procedures, error: proceduresError } = await supabase
      .from('procedures')
      .select('encounter, base_cost, start, patient')
      .ilike('description', selectedProcedure)
      .order('start', { ascending: true })
      .limit(100);
    
    if (proceduresError) {
      console.error('Error fetching procedures:', proceduresError);
      throw proceduresError;
    }
    
    console.log(`Found ${procedures?.length || 0} procedures matching "${selectedProcedure}"`);
    
    // Extract encounter IDs for the metrics calculation
    const encounterIds = procedures
      ?.map(p => p.encounter)
      .filter(Boolean) || [];
    
    console.log(`Found ${encounterIds.length} encounter IDs from procedures`);
    if (encounterIds.length > 0) {
      console.log('Sample encounter IDs:', encounterIds.slice(0, 3));
    }
    
    // Calculate average procedure cost
    let procedureCost = 0;
    if (procedures && procedures.length > 0) {
      const validCosts = procedures
        .map((p: { base_cost: number }) => p.base_cost)
        .filter((cost: number) => cost !== null && cost !== undefined);
      
      if (validCosts.length > 0) {
        procedureCost = validCosts.reduce((sum: number, cost: number) => sum + cost, 0) / validCosts.length;
        console.log(`Average procedure cost: $${procedureCost.toFixed(2)}`);
      }
    }
    
    // Calculate unique patients count
    const uniquePatients = new Set(
      procedures
        ?.map(p => p.patient)
        .filter(Boolean)
    ).size;
    
    console.log(`Unique patients: ${uniquePatients}`);

    // Now that the encounter IDs are stored as text in the encounters table, we can use them directly
    // Get total claim costs from encounters using the encounter IDs
    let avgTotalClaimCost = 0;
    let totalClaimCosts = 0;
    let validEncounterCount = 0;
    
    // Process in batches to avoid query limits
    const batchSize = 20;
    const batches = Math.ceil(encounterIds.length / batchSize);
    
    for (let i = 0; i < batches; i++) {
      const batchIds = encounterIds.slice(i * batchSize, (i + 1) * batchSize);
      
      if (batchIds.length === 0) continue;
      
      console.log(`Processing batch ${i+1}/${batches} with ${batchIds.length} IDs`);
      
      const { data: encountersBatch, error: batchError } = await supabase
        .from('encounters')
        .select('id, total_claim_cost')
        .in('id', batchIds);
      
      if (batchError) {
        console.error(`Error in batch ${i+1}:`, batchError);
        continue;
      }
      
      if (encountersBatch && encountersBatch.length > 0) {
        console.log(`Batch ${i+1}: Found ${encountersBatch.length} encounters`);
        
        encountersBatch.forEach(encounter => {
          if (encounter.total_claim_cost != null) {
            totalClaimCosts += encounter.total_claim_cost;
            validEncounterCount++;
          }
        });
      }
    }
    
    if (validEncounterCount > 0) {
      avgTotalClaimCost = totalClaimCosts / validEncounterCount;
      console.log(`Average total claim cost from ${validEncounterCount} encounters: $${avgTotalClaimCost.toFixed(2)}`);
    } else {
      console.log('No encounters found with valid claim costs.');
    }
    
    // Create time series data directly from procedures
    let timeSeriesData: Array<{date: string, cost: number}> = [];
    
    if (procedures && procedures.length > 0) {
      console.log(`Creating chart data from ${procedures.length} procedures`);
      
      // Add each procedure with its date and cost to the time series data
      timeSeriesData = procedures
        .filter(p => p.start && p.base_cost != null)
        .map(p => ({
          date: new Date(p.start).toISOString().split('T')[0], // Format as YYYY-MM-DD
          cost: p.base_cost
        }));
      
      console.log(`Generated ${timeSeriesData.length} data points for the chart`);
      
      if (timeSeriesData.length > 0) {
        console.log('Sample time series data:', timeSeriesData.slice(0, 3));
      }
    } else {
      console.log('No procedure data available for chart');
    }
    
    // Generate forecasted data
    console.log('Generating forecasts...');
    const forecastedData = forecastTimeSeries(timeSeriesData, 3);
    const predictionsOnly = forecastedData.filter(d => d.isPrediction);
    console.log(`Generated ${predictionsOnly.length} predictions`);
    if (predictionsOnly.length > 0) {
      console.log('Predictions:', predictionsOnly);
    }
    
    // Now, fetch organization data for the cost breakdown table
    let organizationTableData: Array<{
      organization: string,
      baseCost: number,
      totalClaim: number,
      payerCoverage: number,
      outOfPocket: number,
      payer: string,
      patientId: string,
      encounterId: string,
      additionalProcedures: Array<{
        description: string,
        baseCost: number,
        date: string,
        organization: string
      }>
    }> = [];

    if (encounterIds.length > 0) {
      // First get the encounters with their organization IDs and payer IDs
      const { data: encountersWithOrg, error: encountersOrgError } = await supabase
        .from('encounters')
        .select('id, organization, total_claim_cost, payer_coverage, payer, patient')
        .in('id', encounterIds);
      
      if (encountersOrgError) {
        console.error('Error fetching encounters with organizations:', encountersOrgError);
      } else if (encountersWithOrg && encountersWithOrg.length > 0) {
        // Extract unique organization IDs
        const orgIds = Array.from(new Set(encountersWithOrg
          .map(e => e.organization)
          .filter(Boolean)));
        
        // Extract unique payer IDs
        const payerIds = Array.from(new Set(encountersWithOrg
          .map(e => e.payer)
          .filter(Boolean)));

        // Extract unique patient IDs
        const patientIds = Array.from(new Set(encountersWithOrg
          .map(e => e.patient)
          .filter(Boolean)));
          
        // Get organization names
        const { data: organizations, error: orgsError } = await supabase
          .from('organizations')
          .select('id, name')
          .in('id', orgIds);
        
        // Get payer names
        const { data: payers, error: payersError } = await supabase
          .from('payers')
          .select('id, name')
          .in('id', payerIds);

        // Fetch additional procedures for each patient
        // This will help us show other procedures the patient has undergone
        const { data: additionalProcedures, error: procError } = await supabase
          .from('procedures')
          .select('description, base_cost, start, encounter, patient')
          .in('patient', patientIds);

        // Fetch all encounters for these additional procedures to get their organizations
        let additionalEncounterIds: string[] = [];
        if (additionalProcedures) {
          additionalEncounterIds = Array.from(new Set(
            additionalProcedures
              .map(p => p.encounter)
              .filter(Boolean)
          ));
        }

        const encounterOrgMap = new Map<string, string>();
        if (additionalEncounterIds.length > 0) {
          const { data: additionalEncounters, error: addEncError } = await supabase
            .from('encounters')
            .select('id, organization')
            .in('id', additionalEncounterIds);

          if (!addEncError && additionalEncounters) {
            additionalEncounters.forEach(enc => {
              encounterOrgMap.set(enc.id, enc.organization);
            });
          }
        }
        
        if (orgsError) {
          console.error('Error fetching organizations:', orgsError);
        } else if (organizations) {
          if (payersError) {
            console.error('Error fetching payers:', payersError);
          }
          
          if (procError) {
            console.error('Error fetching additional procedures:', procError);
          }
          
          // Create lookup maps for organization and payer names
          const orgNameMap = new Map();
          const payerNameMap = new Map();
          
          organizations.forEach(org => {
            orgNameMap.set(org.id, org.name);
          });
          
          if (payers) {
            payers.forEach(payer => {
              payerNameMap.set(payer.id, payer.name);
            });
          }

          // Create a map of procedures by patient
          const proceduresByPatient = new Map();
          if (additionalProcedures) {
            // Track unique procedures by description to avoid duplicates
            const patientProcTracker = new Map();
            
            additionalProcedures.forEach(proc => {
              if (!proc.patient) return;
              
              // Create unique key for this procedure for this patient
              const procKey = `${proc.patient}:${proc.description}`;
              
              // Skip if we've already added this procedure for this patient
              if (patientProcTracker.has(procKey)) return;
              patientProcTracker.set(procKey, true);
              
              if (!proceduresByPatient.has(proc.patient)) {
                proceduresByPatient.set(proc.patient, []);
              }
              
              const orgId = encounterOrgMap.get(proc.encounter);
              const orgName = orgId ? orgNameMap.get(orgId) || `Organization ${orgId}` : 'Unknown';
              
              proceduresByPatient.get(proc.patient).push({
                description: proc.description,
                baseCost: proc.base_cost,
                date: proc.start,
                organization: orgName,
                organizationId: orgId // Store the organization ID for filtering
              });
            });
          }
          
          // Group encounters by organization and calculate metrics
          const orgMetrics = new Map();
          
          encountersWithOrg.forEach(encounter => {
            const orgId = encounter.organization;
            if (!orgId) return;
            
            if (!orgMetrics.has(orgId)) {
              orgMetrics.set(orgId, {
                count: 0,
                baseCostTotal: 0,
                totalClaimTotal: 0,
                payerCoverageTotal: 0,
                // Store payers as a map of payerId -> frequency
                payers: new Map(),
                // Store representative encounters
                encounters: []
              });
            }
            
            const metrics = orgMetrics.get(orgId);
            metrics.count += 1;
            
            // Store this encounter for later use
            metrics.encounters.push({
              id: encounter.id,
              patient: encounter.patient,
              payer: encounter.payer,
              totalClaim: encounter.total_claim_cost,
              payerCoverage: encounter.payer_coverage
            });
            
            // Find the base cost for this encounter from procedures
            const procedure = procedures?.find(p => p.encounter === encounter.id);
            if (procedure?.base_cost) {
              metrics.baseCostTotal += procedure.base_cost;
            }
            
            if (encounter.total_claim_cost) {
              metrics.totalClaimTotal += encounter.total_claim_cost;
            }
            
            if (encounter.payer_coverage) {
              metrics.payerCoverageTotal += encounter.payer_coverage;
            }
            
            // Track the payer for this encounter
            if (encounter.payer) {
              if (!metrics.payers.has(encounter.payer)) {
                metrics.payers.set(encounter.payer, 0);
              }
              metrics.payers.set(encounter.payer, metrics.payers.get(encounter.payer) + 1);
            }
          });
          
          // Convert to table data
          organizationTableData = Array.from(orgMetrics.entries()).map(([orgId, metrics]) => {
            const baseCost = metrics.count > 0 ? metrics.baseCostTotal / metrics.count : 0;
            const totalClaim = metrics.count > 0 ? metrics.totalClaimTotal / metrics.count : 0;
            const payerCoverage = metrics.count > 0 ? metrics.payerCoverageTotal / metrics.count : 0;
            
            // Find the most common payer for this organization
            let topPayer = null;
            let topPayerCount = 0;
            
            metrics.payers.forEach((count: number, payerId: string) => {
              if (count > topPayerCount) {
                topPayer = payerId;
                topPayerCount = count;
              }
            });
            
            // Get the payer name or use a default
            const payerName = topPayer ? (payerNameMap.get(topPayer) || `Payer ${topPayer}`) : 'Unknown';
            
            // Get a representative encounter/patient to show additional procedures
            const repEncounter = metrics.encounters[0] || {};
            const patientId = repEncounter.patient || '';
            
            // Get additional procedures for this patient
            const allPatientProcedures = proceduresByPatient.get(patientId) || [];
            
            // Filter procedures to show only those from this organization or relevant to this patient
            const patientProcedures = allPatientProcedures.filter((proc: {
              description: string,
              baseCost: number,
              date: string,
              organization: string,
              organizationId?: string
            }) => {
              // Include this procedure if:
              // 1. It's from the same organization, OR
              // 2. It relates to the selected procedure (we keep all if no filtering needed)
              return proc.organizationId === orgId || !proc.organizationId;
            });
            
            return {
              organization: orgNameMap.get(orgId) || `Organization ${orgId}`,
              baseCost,
              totalClaim,
              payerCoverage,
              outOfPocket: totalClaim - payerCoverage,
              payer: payerName,
              patientId,
              encounterId: repEncounter.id || '',
              additionalProcedures: patientProcedures
            };
          }).sort((a, b) => a.organization.localeCompare(b.organization));
        }
      }
    }
    
    return NextResponse.json({ 
      metrics: { 
        totalEncounters: count || 0,
        averageCost: procedureCost,
        uniquePatients,
        avgTotalClaimCost
      },
      chartData: forecastedData,
      tableData: organizationTableData
    });
    
  } catch (error: unknown) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
} 