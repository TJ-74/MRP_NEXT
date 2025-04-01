'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2, X, Building2, Shield, BarChart } from 'lucide-react';
import Navbar from '@/components/NavBar';
import { ChatMessage } from '@/components/ChatMessage';
import { supabase } from '@/lib/supabase';
// import { Bot } from 'lucide-react';
// import SqlQueryWindow from '@/components/SqlQueryWindow';

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
  role: 'user' | 'assistant';
  content: string;
  searchResults?: SearchResult[];
  isDone?: boolean;
}

// interface AIResponse {
//   message: string;
//   searchResults: SearchResult[];
// }

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // States for hospital results panel
  const [showResultsPanel, setShowResultsPanel] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState('');
  const [hospitalResults, setHospitalResults] = useState<Hospital[]>([]);
  const [isLoadingHospitals, setIsLoadingHospitals] = useState(false);
  const [insurancePlans, setInsurancePlans] = useState<string[]>([]);
  const [selectedInsurance, setSelectedInsurance] = useState('');
  // const [currentSqlQuery, setCurrentSqlQuery] = useState<string | null>(null);

  // Reset messages when component mounts (page load)
  useEffect(() => {
    messageCounter = 0;  // Reset the message counter
    setMessages([]); // Start with empty messages
  }, []);

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
      role: 'user',
      content: userMessage
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
        role: 'assistant',
        content: "Analyzing your question..."
      }
    ]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, newUserMessage]
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === loadingMessageId
            ? {
                id: loadingMessageId,
                text: data.message,
                sender: 'ai',
                role: 'assistant',
                content: data.message,
                searchResults: data.searchResults,
                isDone: true
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
                role: 'assistant',
                content: error instanceof Error ? error.message : "An unexpected error occurred.",
                isDone: true
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

  // Update the handleOpenGraph function
  const handleOpenGraph = () => {
    const procedure = encodeURIComponent(selectedProcedure);
    window.open(`/graph?procedure=${procedure}`, '_blank');
  };

  const handleSqlExecute = async (query: string) => {
    try {
      const response = await fetch('/api/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute SQL query');
      }

      const data = await response.json();
      
      // Add the result to the chat
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          text: `Query result:\n${JSON.stringify(data.data, null, 2)}`,
          sender: 'ai',
          role: 'assistant',
          content: `Query result:\n${JSON.stringify(data.data, null, 2)}`,
          isDone: true
        }
      ]);
    } catch (error) {
      console.error('SQL execution error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          text: `Error executing query: ${error instanceof Error ? error.message : 'Unknown error'}`,
          sender: 'system',
          role: 'assistant',
          content: `Error executing query: ${error instanceof Error ? error.message : 'Unknown error'}`,
          isDone: true
        }
      ]);
    }
  };

  return (
    <div className="min-h-screen claude-bg flex flex-col">
      <Navbar />
      
      <div className="flex flex-1 h-[calc(100vh-4rem)] relative overflow-hidden">
        {/* Main Chat Container */}
        <div className={`flex flex-col transition-all duration-300 ease-in-out ${
          showResultsPanel ? 'w-[60%]' : 'w-full'
        }`}>
          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto claude-scrollbar relative">
            <div className="absolute inset-0 py-6">
              <div className="px-4 md:px-6 h-full">
                <div className="space-y-6 pt-6">
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      id={message.id}
                      text={message.text}
                      sender={message.sender}
                      searchResults={message.searchResults}
                      isDone={message.isDone}
                      onMarkDone={() => handleMarkDone(message.id)}
                      onProcedureClick={handleProcedureClick}
                      onSqlExecute={handleSqlExecute}
                    />
                  ))}
                  <div ref={messagesEndRef} className="h-24" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Input Area */}
          <div className="border-t border-gray-700/20 bg-gradient-to-r from-gray-900/90 to-gray-800/90 backdrop-blur-md py-4 shadow-lg">
            <div className="px-4 md:px-6">
              <form onSubmit={handleSubmit} className="w-full">
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your question about healthcare procedures..."
                    className="flex-1 bg-gray-800/50 text-white rounded-lg px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-700/50 placeholder-gray-400 shadow-sm"
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className={`bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3.5 rounded-lg flex items-center justify-center min-w-[60px] transition-all shadow-md ${
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
                <div className="text-xs text-gray-500 mt-2 text-center">
                  Results are based on available California healthcare pricing data.
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Hospital Results Panel */}
        <div className={`fixed top-16 bottom-0 right-0 w-[40%] border-l border-gray-700/50 transition-all duration-300 ease-in-out transform ${
          showResultsPanel ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}>
          {showResultsPanel && (
            <div className="h-full flex flex-col bg-gray-800/60 backdrop-blur-md animate-fade-in">
              {/* Fixed Header */}
              <div className="sticky top-0 z-20">
                <div className="p-4 md:p-5 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/90 to-gray-700/90 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Hospital Results</h2>
                    <p className="text-gray-300 text-sm truncate max-w-[90%] mt-1">{selectedProcedure}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleOpenGraph}
                      className="h-8 w-8 p-0 rounded-full bg-gray-700/70 hover:bg-gray-600 shadow-sm"
                      title="View Cost Comparison Graph"
                    >
                      <BarChart size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowResultsPanel(false)}
                      className="h-8 w-8 p-0 rounded-full bg-gray-700/70 hover:bg-gray-600 shadow-sm"
                      title="Close Results"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                </div>

                {/* Insurance Selector */}
                <div className="p-4 md:p-5 border-b border-gray-700/50 bg-gray-800/70">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Insurance Plan</label>
                  <select
                    className="w-full p-2.5 bg-gray-700/80 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none pl-4 pr-8"
                    value={selectedInsurance}
                    onChange={handleInsuranceChange}
                    disabled={isLoadingHospitals}
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236B7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3E%3C/svg%3E")', backgroundSize: '16px 16px', backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat' }}
                  >
                    {insurancePlans.map((plan) => (
                      <option key={plan} value={plan}>{plan}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Scrollable Results Area */}
              <div className="flex-1 overflow-y-auto hospital-scrollbar">
                <div className="p-4 md:p-5">
                  {isLoadingHospitals ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <Loader2 size={36} className="text-blue-400 animate-spin mb-4" />
                      <p className="text-gray-300 font-medium">Loading hospital data...</p>
                      <p className="text-gray-500 text-sm mt-1">Please wait while we retrieve the latest information.</p>
                    </div>
                  ) : hospitalResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6">
                      <Building2 size={36} className="text-gray-500 mb-4" />
                      <p className="text-gray-300 font-medium">No hospital data found for this procedure and insurance plan.</p>
                      <p className="text-gray-400 text-sm mt-2">Try selecting a different insurance plan or ask about another procedure.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-gray-300 text-sm font-medium">{hospitalResults.length} providers found</p>
                        <p className="text-xs text-gray-500">Sorted by price (lowest first)</p>
                      </div>
                      
                      <div className="space-y-4 pb-2">
                        {hospitalResults.map((hospital) => (
                          <div key={hospital.id} className="bg-gray-800/80 border border-gray-700 rounded-lg p-4 hover:bg-gray-750 transition-all shadow-md hover:shadow-lg group">
                            <div className="mb-3">
                              <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">{hospital.name}</h3>
                              <div className="text-gray-400 text-sm mt-1">
                                <div className="flex items-start">
                                  <Building2 size={16} className="mr-2 mt-0.5 flex-shrink-0 text-gray-500" />
                                  <div className="break-words">
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
                                <p className="text-2xl font-bold text-green-400 group-hover:text-green-300 transition-colors">${hospital.price.toLocaleString()}</p>
                                <p className="text-xs text-gray-400">Base Cost</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mt-3 text-sm border-t border-gray-700 pt-3">
                              <div>
                                <p className="text-blue-400 font-medium group-hover:text-blue-300 transition-colors">${hospital.total_claim_cost.toLocaleString()}</p>
                                <p className="text-gray-500">Total Cost</p>
                              </div>
                              <div>
                                <p className="text-purple-400 font-medium group-hover:text-purple-300 transition-colors">${hospital.payer_coverage.toLocaleString()}</p>
                                <p className="text-gray-500">Insurance Coverage</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
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