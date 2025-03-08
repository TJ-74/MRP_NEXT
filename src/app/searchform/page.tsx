'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Building2, Shield } from 'lucide-react';
import Navbar from "@/components/NavBar";
import { supabase } from '@/lib/supabase';

// Types for our data
interface Hospital {
  id: string;
  name: string;
  address: string;
  contact_number: string;
  price: number;
  city: string;
  state: string;
  zip: string;
  payer: string;
  total_claim_cost: number;
  payer_coverage: number;
}

interface SearchFormData {
  insurancePlan: string;
  procedure: string;
}



export default function HealthcareSearch() {
  // State management
  const [insurancePlans, setInsurancePlans] = useState<string[]>([]);
  const [procedures, setProcedures] = useState<string[]>([]);
  const [formData, setFormData] = useState<SearchFormData>({
    insurancePlan: '',
    procedure: ''
  });

  const [searchResults, setSearchResults] = useState<Hospital[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch insurance plans from Supabase
  useEffect(() => {
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
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }

    fetchInsurancePlans();
  }, []);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter procedures based on search query
  const filteredProcedures = procedures.filter(proc =>
    proc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch procedures from Supabase
  useEffect(() => {
    async function fetchProcedures() {
      try {
        const { data, error } = await supabase
          .from('procedures')
          .select('description');

        if (error) {
          console.error('Error fetching procedures:', error);
          return;
        }

        if (data) {
          // Filter unique descriptions using Set
          const uniqueProcedures = [...new Set(data.map(item => item.description))];
          setProcedures(uniqueProcedures);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }

    fetchProcedures();
  }, []);

  // Handle search function with actual data
  const handleSearch = async () => {
    setIsLoading(true);
    try {
      console.log('-------- Search Process Started --------');
      console.log('Searching for procedure:', formData.procedure);
      console.log('Insurance Plan:', formData.insurancePlan);
      
      // 1. Get unique encounters from procedures table
      const { data: procedureData, error: procedureError } = await supabase
        .from('procedures')
        .select('encounter, description')
        .ilike('description', formData.procedure);

      if (procedureError) {
        console.error('Error fetching procedures:', procedureError.message);
        return;
      }

      if (!procedureData || procedureData.length === 0) {
        console.error('No procedures found with description:', formData.procedure);
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
      console.log('\n1. Unique Encounters Found:', limitedEncounters.length, 'out of', uniqueEncounters.length);

      // First get the payer ID for the selected insurance plan
      const { data: selectedPayerData, error: selectedPayerError } = await supabase
        .from('payers')
        .select('id')
        .eq('name', formData.insurancePlan)
        .single();

      if (selectedPayerError) {
        console.error('Error fetching selected payer:', selectedPayerError);
        return;
      }

      // 2. Get all matching encounters with insurance plan filter
      try {
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

        console.log('\n2. Encounters Data:', encountersData.length, 'results found');

        // Continue with organization queries
        const organizationIds = [...new Set(encountersData.map(enc => enc.organization))].filter(Boolean);

        if (organizationIds.length === 0) {
          console.error('No valid organization IDs found');
          return;
        }

        // 3. Get organization details
        const { data: organizationsData, error: organizationsError } = await supabase
          .from('organizations')
          .select('id, name, address, city, state, zip, phone')
          .in('id', organizationIds);

        if (organizationsError) {
          console.error('Error fetching organizations:', organizationsError);
          return;
        }

        console.log('\n3. Organizations Found:', organizationsData);

        // 4. Combine all the data
        const results = encountersData.map(encounter => {
          const organization = organizationsData.find(org => org.id === encounter.organization);
          return {
            id: encounter.id,
            name: organization?.name || 'Unknown Hospital',
            price: encounter.base_encounter_cost,
            total_claim_cost: encounter.total_claim_cost,
            payer_coverage: encounter.payer_coverage,
            address: organization?.address || 'Address not available',
            contact_number: organization?.phone || 'Contact not available',
            city: organization?.city || 'City not available',
            state: organization?.state || 'State not available',
            zip: organization?.zip || 'Zip code not available',
            payer: formData.insurancePlan
          };
        });

        console.log('\n4. Final Results:', results);
        console.log('-------- Search Process Completed --------\n');

        setSearchResults(results);
      } catch (error) {
        console.error('Error during encounters query:', error);
      }
    } catch (error) {
      console.error('Error during search:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
       <Navbar />
      <div className="max-w-4xl mx-auto p-4 py-12">
        {/* Search Form */}
        <Card className="mb-6 shadow-lg bg-gray-800 border-gray-700">
          <CardContent className="pt-6 space-y-6">
            <h1 className="text-2xl font-bold text-white mb-4">Find Healthcare Services</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col">
                <label className="mb-2 text-sm font-medium text-gray-300">Insurance Plan</label>
                <select
                  className="p-2.5 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={formData.insurancePlan}
                  onChange={(e) => setFormData({
                    ...formData,
                    insurancePlan: e.target.value
                  })}
                >
                  <option value="">Select Insurance Plan</option>
                  {insurancePlans.map((plan) => (
                    <option key={plan} value={plan}>{plan}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col relative" ref={dropdownRef}>
                <label className="mb-2 text-sm font-medium text-gray-300">Procedure</label>
                <input
                  type="text"
                  className="p-2.5 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Search procedures..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                />
                {searchQuery && isDropdownOpen && (
                  <ul className="absolute z-10 w-full mt-1 max-h-60 overflow-auto rounded-lg bg-gray-700 border border-gray-600 top-[100%]">
                    {filteredProcedures.map((proc) => (
                      <li
                        key={proc}
                        className="p-2 hover:bg-gray-600 cursor-pointer text-white"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            procedure: proc
                          });
                          setSearchQuery(proc);
                          setIsDropdownOpen(false);
                        }}
                      >
                        {proc}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button 
                onClick={handleSearch}
                disabled={!formData.insurancePlan || !searchQuery || isLoading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition-colors px-6 py-2.5 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search size={18} />
                {isLoading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {searchResults.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Search Results</h2>
              <p className="text-gray-400">{searchResults.length} providers found</p>
            </div>
            
            <div className="grid gap-6">
              {searchResults.map((hospital) => (
                <Card key={hospital.id} className="w-full bg-gray-800 border-gray-700 hover:bg-gray-800/80 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      {/* Hospital Info */}
                      <div className="flex-grow space-y-4">
                        <div>
                          <h3 className="text-xl font-semibold text-white mb-2">{hospital.name}</h3>
                          <div className="space-y-1">
                            <div className="flex items-center text-gray-400 text-sm">
                              <Building2 size={16} className="mr-2 flex-shrink-0" />
                              <span>{hospital.address}</span>
                            </div>
                            <div className="text-gray-400 text-sm pl-6">
                              {hospital.city}, {hospital.state} {hospital.zip}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-start gap-6">
                          {/* Contact Info */}
                          <div>
                            <p className="text-sm font-medium text-gray-300 mb-1">Contact</p>
                            <div className="flex items-center text-gray-400">
                              <a href={`tel:${hospital.contact_number}`} 
                                 className="hover:text-blue-400 transition-colors">
                                {hospital.contact_number}
                              </a>
                            </div>
                          </div>

                          {/* Insurance Info */}
                          <div>
                            <p className="text-sm font-medium text-gray-300 mb-1">Insurance Plan</p>
                            <div className="flex items-center text-gray-400">
                              <Shield size={16} className="mr-2" />
                              {hospital.payer}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Price Info */}
                      <div className="flex flex-col items-end justify-between md:min-w-[240px] p-4 bg-gray-900/50 rounded-lg">
                        <div className="text-right space-y-3">
                          <div>
                            <p className="text-3xl font-bold text-green-400">
                              ${hospital.price.toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-400">Base Cost</p>
                          </div>

                          <div className="border-t border-gray-700 pt-3">
                            <div className="mb-2">
                              <p className="text-lg font-semibold text-blue-400">
                                ${hospital.total_claim_cost.toLocaleString()}
                              </p>
                              <p className="text-sm text-gray-400">Total Claim Cost</p>
                            </div>

                            <div>
                              <p className="text-lg font-semibold text-purple-400">
                                ${hospital.payer_coverage.toLocaleString()}
                              </p>
                              <p className="text-sm text-gray-400">Insurance Coverage</p>
                            </div>

                            <div className="mt-2 text-xs text-gray-500">
                              Out of Pocket: ${(hospital.total_claim_cost - hospital.payer_coverage).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 w-full">
                          <Button 
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            onClick={() => window.open(`tel:${hospital.contact_number}`)}
                          >
                            Contact Provider
                          </Button>
                          {/* <p className="text-xs text-center text-gray-500 mt-2">
                            ID: {hospital.id}
                          </p> */}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 