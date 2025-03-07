'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import Navbar from "@/components/NavBar";
import { supabase } from '@/lib/supabase';

// Types for our data
interface Hospital {
  id: string;
  name: string;
  address: string;
  contact_number: string;
  price: number;
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

      // 2. Get all matching encounters
      try {
        const { data: encountersData, error: encountersError } = await supabase
          .from('encounters')
          .select(`
            id,
            organization,
            payer,
            base_encounter_cost
          `)
          .in('id', limitedEncounters)
          .order('base_encounter_cost', { ascending: true });  // Order by cost to get most relevant results

        if (encountersError) {
          console.error('Error fetching encounters:', encountersError);
          return;
        }

        if (!encountersData || encountersData.length === 0) {
          console.error('No encounters found for the given IDs');
          return;
        }

        console.log('\n2. Encounters Data:', encountersData.length, 'results found');

        // Continue with organization and payer queries
        const organizationIds = [...new Set(encountersData.map(enc => enc.organization))].filter(Boolean);
        const payerIds = [...new Set(encountersData.map(enc => enc.payer))].filter(Boolean);

        if (organizationIds.length === 0 || payerIds.length === 0) {
          console.error('No valid organization or payer IDs found');
          return;
        }

        // 3. Get organization and payer details
        const [organizationsResponse, payersResponse] = await Promise.all([
          supabase
            .from('organizations')
            .select('id, name')
            .in('id', organizationIds),
          supabase
            .from('payers')
            .select('id, name')
            .in('id', payerIds)
        ]);

        if (organizationsResponse.error) {
          console.error('Error fetching organizations:', organizationsResponse.error);
          return;
        }

        if (payersResponse.error) {
          console.error('Error fetching payers:', payersResponse.error);
          return;
        }

        console.log('\n3. Organizations Found:', organizationsResponse.data);
        console.log('   Payers Found:', payersResponse.data);

        // 4. Combine all the data
        const results = encountersData.map(encounter => {
          const organization = organizationsResponse.data.find(org => org.id === encounter.organization);
          const payer = payersResponse.data.find(p => p.id === encounter.payer);
          return {
            id: encounter.id,
            name: organization?.name || 'Unknown Hospital',
            price: encounter.base_encounter_cost,
            address: 'Address not available',
            contact_number: payer?.name || 'Insurance information not available'
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
            <h2 className="text-2xl font-bold text-white">Search Results</h2>
            {searchResults.map((hospital) => (
              <Card key={hospital.id} className="w-full bg-gray-800 border-gray-700 hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold text-white">{hospital.name}</h3>
                      <p className="text-gray-400">{hospital.address}</p>
                      <p className="text-gray-400 flex items-center gap-2">
                        <span className="font-medium text-gray-300">Insurance:</span> {hospital.contact_number}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-400">
                        ${hospital.price.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">Estimated Cost</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 