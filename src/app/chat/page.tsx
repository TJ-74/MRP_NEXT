'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2, X, Building2, Shield } from 'lucide-react';
import Navbar from '@/components/NavBar';
import { ChatMessage } from '@/components/ChatMessage';
import { supabase } from '@/lib/supabase';

interface SearchResult {
  id: string;
  score: string;
  text: string;
  category?: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai' | 'system';
  searchResults?: SearchResult[];
  isDone?: boolean;
}

interface AIResponse {
  message: string;
  searchResults: SearchResult[];
}

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

let messageCounter = 0;

export default function Chat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => [{
    id: 'system-init',
    text: "Hello! I'm your healthcare assistant. How can I help you today?",
    sender: 'system',
  }]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // States for hospital results panel
  const [showResultsPanel, setShowResultsPanel] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState('');
  const [hospitalResults, setHospitalResults] = useState<Hospital[]>([]);
  const [isLoadingHospitals, setIsLoadingHospitals] = useState(false);
  const [insurancePlans, setInsurancePlans] = useState<string[]>([]);
  const [selectedInsurance, setSelectedInsurance] = useState('');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch insurance plans on load
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

  const handleMarkDone = (messageId: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, isDone: true } : msg
      )
    );
  };

  const handleProcedureClick = async (procedure: string) => {
    setSelectedProcedure(procedure);
    setShowResultsPanel(true);
    await searchHospitals(procedure, selectedInsurance);
  };

  const searchHospitals = async (procedure: string, insurancePlan: string) => {
    setIsLoadingHospitals(true);
    try {
      console.log('-------- Search Process Started --------');
      console.log('Searching for procedure:', procedure);
      console.log('Insurance Plan:', insurancePlan);
      
      // 1. Get unique encounters from procedures table
      const { data: procedureData, error: procedureError } = await supabase
        .from('procedures')
        .select('encounter, description')
        .ilike('description', procedure);

      if (procedureError) {
        console.error('Error fetching procedures:', procedureError.message);
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
      console.log('\n1. Unique Encounters Found:', limitedEncounters.length, 'out of', uniqueEncounters.length);

      // First get the payer ID for the selected insurance plan
      const { data: selectedPayerData, error: selectedPayerError } = await supabase
        .from('payers')
        .select('id')
        .eq('name', insurancePlan)
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

        console.log('\n3. Organizations Found:', organizationsData.length);

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
            payer: insurancePlan
          };
        });

        console.log('\n4. Final Results:', results.length);
        setHospitalResults(results);
      } catch (error) {
        console.error('Error during encounters query:', error);
      }
    } catch (error) {
      console.error('Error during search:', error);
    } finally {
      setIsLoadingHospitals(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Close results panel when sending a new message
    setShowResultsPanel(false);

    setIsLoading(true);
    const userMessage = input.trim();
    setInput('');

    messageCounter++;
    const newUserMessage: Message = {
      id: `msg-${messageCounter}`,
      text: userMessage,
      sender: 'user',
    };
    setMessages(prev => [...prev, newUserMessage]);

    // Add loading message
    messageCounter++;
    const loadingMessageId = `msg-${messageCounter}`;
    setMessages(prev => [
      ...prev, 
      { 
        id: loadingMessageId, 
        text: "Analyzing your question...", 
        sender: 'ai',
      }
    ]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: userMessage,
            }
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const data = await response.json() as AIResponse;
      
      // Replace loading message with actual response
      setMessages(prev => 
        prev.map(msg => 
          msg.id === loadingMessageId
            ? {
                id: loadingMessageId,
                text: data.message,
                sender: 'ai',
                searchResults: data.searchResults,
              }
            : msg
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);

      // Replace loading message with error
      setMessages(prev => 
        prev.map(msg => 
          msg.id === loadingMessageId
            ? {
                id: loadingMessageId,
                text: error instanceof Error ? error.message : "An unexpected error occurred.",
                sender: 'system',
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsuranceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newInsurance = e.target.value;
    setSelectedInsurance(newInsurance);
    if (selectedProcedure && showResultsPanel) {
      searchHospitals(selectedProcedure, newInsurance);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex">
          {/* Chat Area */}
          <div className={`transition-all duration-300 ease-in-out ${
            showResultsPanel ? 'w-1/2 pr-3' : 'w-full'
          }`}>
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-2xl h-[calc(100vh-8rem)] flex flex-col border border-gray-700/50">
              <div className="p-4 border-b border-gray-700/50 bg-gray-800/80">
                <h2 className="text-xl font-semibold text-white">Healthcare Procedure Assistant</h2>
                <p className="text-gray-300 text-sm">Ask about medical procedures and pricing at California hospitals</p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 space-y-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <p>Start a conversation by sending a message!</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      id={message.id}
                      text={message.text}
                      sender={message.sender}
                      searchResults={message.searchResults}
                      isDone={message.isDone}
                      onMarkDone={() => handleMarkDone(message.id)}
                      onProcedureClick={handleProcedureClick}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700/50 bg-gray-800/80">
                <div className="flex space-x-4">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your question about healthcare procedures..."
                    className="flex-1 bg-gray-700/80 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600/50"
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center justify-center min-w-[50px] transition-all ${
                      isLoading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send size={20} />
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Hospital Results Panel */}
          {showResultsPanel && (
            <div className="w-1/2 pl-3 animate-slide-in">
              <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-2xl h-[calc(100vh-8rem)] flex flex-col border border-gray-700/50 overflow-hidden">
                <div className="p-4 border-b border-gray-700/50 bg-gray-800/80 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Hospital Results</h2>
                    <p className="text-gray-300 text-sm truncate max-w-[90%]">{selectedProcedure}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowResultsPanel(false)} 
                    className="h-8 w-8 p-0 rounded-full bg-gray-700/50 hover:bg-gray-600"
                  >
                    <X size={16} />
                  </Button>
                </div>

                {/* Insurance Selector */}
                <div className="p-4 border-b border-gray-700/50 bg-gray-800/70">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Insurance Plan</label>
                  <select
                    className="w-full p-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={selectedInsurance}
                    onChange={handleInsuranceChange}
                    disabled={isLoadingHospitals}
                  >
                    {insurancePlans.map((plan) => (
                      <option key={plan} value={plan}>{plan}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                  {isLoadingHospitals ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <Loader2 size={32} className="text-blue-400 animate-spin mb-4" />
                      <p className="text-gray-300">Loading hospital data...</p>
                    </div>
                  ) : hospitalResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <p className="text-center">No hospital data found for this procedure and insurance plan.</p>
                      <p className="text-center text-sm mt-2">Try selecting a different insurance plan.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-gray-300 text-sm">{hospitalResults.length} providers found</p>
                      
                      {hospitalResults.map((hospital) => (
                        <div key={hospital.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-750 transition-all">
                          <div className="mb-3">
                            <h3 className="text-lg font-semibold text-white">{hospital.name}</h3>
                            <div className="text-gray-400 text-sm mt-1">
                              <div className="flex items-start">
                                <Building2 size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                                <div>
                                  {hospital.address}<br />
                                  {hospital.city}, {hospital.state} {hospital.zip}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap justify-between items-center mt-4">
                            <div className="flex items-center mr-4 mb-2">
                              <Shield size={16} className="mr-2 text-blue-400" />
                              <span className="text-gray-300 text-sm">{hospital.payer}</span>
                            </div>
                            
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-400">${hospital.price.toLocaleString()}</p>
                              <p className="text-xs text-gray-400">Base Cost</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mt-3 text-sm border-t border-gray-700 pt-3">
                            <div>
                              <p className="text-blue-400 font-medium">${hospital.total_claim_cost.toLocaleString()}</p>
                              <p className="text-gray-500">Total Cost</p>
                            </div>
                            <div>
                              <p className="text-purple-400 font-medium">${hospital.payer_coverage.toLocaleString()}</p>
                              <p className="text-gray-500">Insurance Coverage</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 