'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { BarDatum, ResponsiveBar } from '@nivo/bar';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Shield, Loader2, X } from 'lucide-react';

interface Hospital {
  id: string;
  name: string;
  price: number;
  payer: string;
  total_claim_cost: number;
  payer_coverage: number;
}

interface HospitalInsuranceData {
  insurance: string;
  outOfPocket: number;
}

function GraphContent() {
  const searchParams = useSearchParams();
  const procedure = searchParams.get('procedure');
  const [insurancePlans, setInsurancePlans] = useState<string[]>([]);
  const [selectedInsurance, setSelectedInsurance] = useState('');
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHospital, setSelectedHospital] = useState<string | null>(null);
  const [hospitalInsuranceData, setHospitalInsuranceData] = useState<HospitalInsuranceData[]>([]);
  const [isLoadingHospitalData, setIsLoadingHospitalData] = useState(false);

  useEffect(() => {
    // Fetch insurance plans
    async function fetchInsurancePlans() {
      try {
        const { data, error } = await supabase
          .from('payers')
          .select('name');

        if (error) {
          console.error('Error fetching insurance plans:', error);
          return;
        }

        if (data) {
          const plans = data.map(item => item.name);
          setInsurancePlans(plans);
          // Set default insurance plan
          if (plans.length > 0) {
            setSelectedInsurance(plans[0]);
          }
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }

    fetchInsurancePlans();
  }, []);

  useEffect(() => {
    async function fetchHospitals() {
      if (!procedure || !selectedInsurance) return;

      setIsLoading(true);
      try {
        // 1. Get unique encounters from procedures table
        const { data: procedureData, error: procedureError } = await supabase
          .from('procedures')
          .select('encounter, description')
          .ilike('description', procedure);

        if (procedureError) {
          console.error('Error fetching procedures:', procedureError);
          return;
        }

        if (!procedureData || procedureData.length === 0) {
          console.error('No procedures found with description:', procedure);
          return;
        }

        // Get unique encounters only and ensure they are valid
        const uniqueEncounters = [...new Set(procedureData.map(proc => proc.encounter))].filter(Boolean);
        
        if (uniqueEncounters.length === 0) {
          console.error('No valid encounters found');
          return;
        }
        
        // Limit to first 100 encounters to prevent query issues
        const limitedEncounters = uniqueEncounters.slice(0, 100);

        // Get the payer ID for the selected insurance plan
        const { data: selectedPayerData, error: selectedPayerError } = await supabase
          .from('payers')
          .select('id')
          .eq('name', selectedInsurance)
          .single();

        if (selectedPayerError) {
          console.error('Error fetching selected payer:', selectedPayerError);
          return;
        }

        // Get all matching encounters with insurance plan filter
        const { data: encountersData, error: encountersError } = await supabase
          .from('encounters')
          .select(`
            id,
            organization,
            payer,
            base_encounter_cost,
            total_claim_cost,
            payer_coverage
          `)
          .in('id', limitedEncounters)
          .eq('payer', selectedPayerData.id)
          .order('base_encounter_cost', { ascending: true });

        if (encountersError) {
          console.error('Error fetching encounters:', encountersError);
          return;
        }

        if (!encountersData || encountersData.length === 0) {
          console.error('No encounters found for the given criteria');
          return;
        }

        // Get organization details
        const organizationIds = [...new Set(encountersData.map(enc => enc.organization))].filter(Boolean);
        const { data: organizationsData, error: organizationsError } = await supabase
          .from('organizations')
          .select('id, name, address, city, state, zip, phone')
          .in('id', organizationIds);

        if (organizationsError) {
          console.error('Error fetching organizations:', organizationsError);
          return;
        }

        // Combine all the data
        const results = encountersData.map(encounter => {
          const organization = organizationsData.find(org => org.id === encounter.organization);
          return {
            id: encounter.id,
            name: organization?.name || 'Unknown Hospital',
            price: encounter.base_encounter_cost,
            total_claim_cost: encounter.total_claim_cost,
            payer_coverage: encounter.payer_coverage,
            payer: selectedInsurance
          };
        });

        setHospitals(results);
      } catch (error) {
        console.error('Error during search:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchHospitals();
  }, [procedure, selectedInsurance]);

  useEffect(() => {
    async function fetchHospitalInsuranceData() {
      if (!selectedHospital || !procedure) return;

      setIsLoadingHospitalData(true);
      try {
        // Get all encounters for this procedure
        const { data: procedureData, error: procedureError } = await supabase
          .from('procedures')
          .select('encounter, description')
          .ilike('description', procedure);

        if (procedureError) throw procedureError;
        if (!procedureData || procedureData.length === 0) return;

        const uniqueEncounters = [...new Set(procedureData.map(proc => proc.encounter))].filter(Boolean);
        const limitedEncounters = uniqueEncounters.slice(0, 100);

        // Get organization ID for the selected hospital
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id')
          .ilike('name', selectedHospital)
          .single();

        if (orgError) throw orgError;
        if (!orgData) return;

        // Get encounters for this hospital across all insurance plans
        const { data: encountersData, error: encountersError } = await supabase
          .from('encounters')
          .select(`
            id,
            organization,
            payer,
            total_claim_cost,
            payer_coverage
          `)
          .in('id', limitedEncounters)
          .eq('organization', orgData.id);

        if (encountersError) throw encountersError;
        if (!encountersData) return;

        // Get payer names for the encounters
        const payerIds = [...new Set(encountersData.map(enc => enc.payer))].filter(Boolean);
        const { data: payerData, error: payerError } = await supabase
          .from('payers')
          .select('id, name')
          .in('id', payerIds);

        if (payerError) throw payerError;
        if (!payerData) return;

        // Calculate out-of-pocket costs for each insurance plan
        const insuranceData = payerData.map(payer => {
          const planEncounters = encountersData.filter(enc => enc.payer === payer.id);
          const avgOutOfPocket = planEncounters.reduce((sum, enc) => 
            sum + ((enc.total_claim_cost || 0) - (enc.payer_coverage || 0)), 0) / (planEncounters.length || 1);

          return {
            insurance: payer.name,
            outOfPocket: Math.round(avgOutOfPocket) || 0
          };
        });

        setHospitalInsuranceData(insuranceData);
      } catch (error) {
        console.error('Error fetching hospital insurance data:', error);
      } finally {
        setIsLoadingHospitalData(false);
      }
    }

    fetchHospitalInsuranceData();
  }, [selectedHospital, procedure]);

  if (!procedure) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white">No procedure specified</p>
      </div>
    );
  }

  // Get unique hospitals by name and sort by price
  const uniqueHospitals = hospitals.reduce((acc, hospital) => {
    if (!acc.find(h => h.name === hospital.name)) {
      acc.push(hospital);
    }
    return acc;
  }, [] as Hospital[]).sort((a, b) => a.price - b.price);

  const hospitalData = uniqueHospitals.map(hospital => ({
    hospital: hospital.name || 'Unknown Hospital',
    price: hospital.price || 0,
    totalCost: hospital.total_claim_cost || 0,
    coverage: hospital.payer_coverage || 0,
    outOfPocket: (hospital.total_claim_cost || 0) - (hospital.payer_coverage || 0)
  }));

  // Calculate average out-of-pocket costs per insurance plan
  const insuranceData = insurancePlans.map(plan => {
    const planHospitals = hospitals.filter(h => h.payer === plan);
    const avgOutOfPocket = planHospitals.reduce((sum, h) => 
      sum + ((h.total_claim_cost || 0) - (h.payer_coverage || 0)), 0) / (planHospitals.length || 1);
    
    return {
      insurance: plan,
      outOfPocket: Math.round(avgOutOfPocket) || 0
    };
  });

  const commonTheme = {
    axis: {
      ticks: {
        text: {
          fill: '#D1D5DB'
        }
      },
      legend: {
        text: {
          fill: '#D1D5DB'
        }
      }
    },
    grid: {
      line: {
        stroke: '#374151'
      }
    },
    tooltip: {
      container: {
        background: '#1F2937',
        border: '1px solid #374151',
        borderRadius: '0.5rem',
        color: '#F3F4F6'
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Hospital Cost Analysis</h1>
          <p className="text-gray-400">{procedure}</p>
          
          {/* Insurance Selector */}
          <div className="mt-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <select
              value={selectedInsurance}
              onChange={(e) => setSelectedInsurance(e.target.value)}
              className="bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {insurancePlans.map((plan) => (
                <option key={plan} value={plan}>{plan}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hospital Base Prices Graph */}
          <div className="bg-gray-800 rounded-lg p-6 h-[500px]">
            <h2 className="text-lg font-semibold text-white mb-4">Hospital Base Prices</h2>
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <p className="text-gray-400">Loading hospital data...</p>
                </div>
              </div>
            ) : uniqueHospitals.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-400">No hospitals found for this procedure and insurance plan.</p>
              </div>
            ) : (
              <ResponsiveBar
                data={hospitalData}
                keys={['price']}
                indexBy="hospital"
                margin={{ top: 20, right: 20, bottom: 100, left: 60 }}
                padding={0.3}
                valueScale={{ type: 'linear' }}
                colors={{ scheme: 'category10' }}
                theme={commonTheme}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  format: value => `$${value.toLocaleString()}`
                }}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: -45,
                  format: value => value.length > 20 ? value.substring(0, 20) + '...' : value
                }}
                labelSkipWidth={12}
                labelSkipHeight={12}
                labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                animate={true}
                onClick={(data) => setSelectedHospital(data.data.hospital)}
                tooltip={({ data }) => (
                  <div className="bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-700">
                    <div className="font-semibold text-white">{data.hospital || 'Unknown Hospital'}</div>
                    <div className="text-sm text-gray-300">Base Price: ${(data.price || 0).toLocaleString()}</div>
                    <div className="text-sm text-gray-300">Total Cost: ${(data.totalCost || 0).toLocaleString()}</div>
                    <div className="text-sm text-gray-300">Insurance Coverage: ${(data.coverage || 0).toLocaleString()}</div>
                    <div className="text-sm text-red-300">Out of Pocket: ${(data.outOfPocket || 0).toLocaleString()}</div>
                    <div className="text-sm text-blue-300 mt-2">Click to see costs for all insurance plans</div>
                  </div>
                )}
              />
            )}
          </div>

          {/* Hospital Insurance Modal */}
          {selectedHospital && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-white">
                    Insurance Costs for {selectedHospital}
                  </h3>
                  <button
                    onClick={() => setSelectedHospital(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                {isLoadingHospitalData ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      <p className="text-gray-400">Loading insurance data...</p>
                    </div>
                  </div>
                ) : hospitalInsuranceData.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-gray-400">No insurance data available for this hospital.</p>
                  </div>
                ) : (
                  <div className="h-[400px]">
                    <ResponsiveBar
                      data={hospitalInsuranceData as unknown as BarDatum[]}
                      keys={['outOfPocket']}
                      indexBy="insurance"
                      margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
                      padding={0.3}
                      valueScale={{ type: 'linear' }}
                      colors={{ scheme: 'category10' }}
                      theme={commonTheme}
                      axisLeft={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        format: value => `$${value.toLocaleString()}`
                      }}
                      axisBottom={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: -45,
                        format: value => value.length > 20 ? value.substring(0, 20) + '...' : value
                      }}
                      labelSkipWidth={12}
                      labelSkipHeight={12}
                      labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                      animate={true}
                      tooltip={({ data }) => (
                        <div className="bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-700">
                          <div className="font-semibold text-white">{data.insurance || 'Unknown Insurance'}</div>
                          <div className="text-sm text-red-300">Average Out of Pocket: ${(data.outOfPocket || 0).toLocaleString()}</div>
                        </div>
                      )}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Insurance Out-of-Pocket Costs Graph */}
          <div className="bg-gray-800 rounded-lg p-6 h-[500px]">
            <h2 className="text-lg font-semibold text-white mb-4">Average Out-of-Pocket Costs by Insurance</h2>
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <p className="text-gray-400">Loading insurance data...</p>
                </div>
              </div>
            ) : (
              <ResponsiveBar
                data={insuranceData}
                keys={['outOfPocket']}
                indexBy="insurance"
                margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
                padding={0.3}
                valueScale={{ type: 'linear' }}
                colors={{ scheme: 'category10' }}
                theme={commonTheme}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  format: value => `$${value.toLocaleString()}`
                }}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: -45,
                  format: value => value.length > 20 ? value.substring(0, 20) + '...' : value
                }}
                labelSkipWidth={12}
                labelSkipHeight={12}
                labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                animate={true}
                tooltip={({ data }) => (
                  <div className="bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-700">
                    <div className="font-semibold text-white">{data.insurance || 'Unknown Insurance'}</div>
                    <div className="text-sm text-red-300">Average Out of Pocket: ${(data.outOfPocket || 0).toLocaleString()}</div>
                  </div>
                )}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GraphPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <GraphContent />
    </Suspense>
  );
} 