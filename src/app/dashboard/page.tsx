'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Users, Loader2, CreditCard } from "lucide-react";
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, TooltipProps, BarChart, Bar, Cell, Treemap, PieChart, Pie } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from "@/components/ui/button";
import React from 'react';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function LoadingState() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="h-8 w-64 bg-gray-700 animate-pulse rounded"></div>
      </div>
      <div className="space-y-4">
        {/* Tab navigation skeleton */}
        <div className="h-10 w-[400px] bg-gray-700 animate-pulse rounded"></div>
        
        {/* Search card skeleton */}
        <div className="p-4 border rounded-lg border-gray-700 bg-gray-800">
          <div className="space-y-3">
            <div className="h-5 w-32 bg-gray-700 animate-pulse rounded mb-4"></div>
            <div className="h-10 w-full bg-gray-700 animate-pulse rounded"></div>
            <div className="flex gap-2 mt-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-8 w-24 bg-gray-700 animate-pulse rounded"></div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Metrics cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Encounters Card */}
          <div className="p-4 border rounded-lg border-gray-700 bg-gray-800">
            <div className="flex justify-between mb-2">
              <div className="h-5 w-32 bg-gray-700 animate-pulse rounded"></div>
              <div className="h-4 w-4 bg-gray-700 animate-pulse rounded-full"></div>
            </div>
            <div className="space-y-2">
              <div className="h-8 w-16 bg-gray-700 animate-pulse rounded"></div>
              <div className="h-3 w-40 bg-gray-700 animate-pulse rounded"></div>
            </div>
          </div>
          
          {/* Procedure Cost Card */}
          <div className="p-4 border rounded-lg border-gray-700 bg-gray-800">
            <div className="flex justify-between mb-2">
              <div className="h-5 w-32 bg-gray-700 animate-pulse rounded"></div>
              <div className="h-4 w-4 bg-gray-700 animate-pulse rounded-full"></div>
            </div>
            <div className="space-y-2">
              <div className="h-8 w-24 bg-gray-700 animate-pulse rounded"></div>
              <div className="h-3 w-40 bg-gray-700 animate-pulse rounded"></div>
            </div>
          </div>
          
          {/* Total Claim Cost Card */}
          <div className="p-4 border rounded-lg border-gray-700 bg-gray-800">
            <div className="flex justify-between mb-2">
              <div className="h-5 w-32 bg-gray-700 animate-pulse rounded"></div>
              <div className="h-4 w-4 bg-gray-700 animate-pulse rounded-full"></div>
            </div>
            <div className="space-y-2">
              <div className="h-8 w-24 bg-gray-700 animate-pulse rounded"></div>
              <div className="h-3 w-40 bg-gray-700 animate-pulse rounded"></div>
            </div>
          </div>
          
          {/* Unique Patients Card */}
          <div className="p-4 border rounded-lg border-gray-700 bg-gray-800">
            <div className="flex justify-between mb-2">
              <div className="h-5 w-32 bg-gray-700 animate-pulse rounded"></div>
              <div className="h-4 w-4 bg-gray-700 animate-pulse rounded-full"></div>
            </div>
            <div className="space-y-2">
              <div className="h-8 w-16 bg-gray-700 animate-pulse rounded"></div>
              <div className="h-3 w-40 bg-gray-700 animate-pulse rounded"></div>
            </div>
          </div>
        </div>
        
        {/* Chart skeleton */}
        <div className="p-4 border rounded-lg border-gray-700 bg-gray-800">
          <div className="mb-4">
            <div className="h-5 w-40 bg-gray-700 animate-pulse rounded"></div>
          </div>
          <div className="h-[300px] w-full bg-gray-700 opacity-30 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [procedures, setProcedures] = useState<string[]>([]);
  const [metrics, setMetrics] = useState({
    totalEncounters: 0,
    averageCost: 0,
    uniquePatients: 0,
    avgTotalClaimCost: 0
  });
  const [chartData, setChartData] = useState<Array<{
    date: string, 
    cost: number, 
    isPrediction?: boolean
  }>>([]);
  const [tableData, setTableData] = useState<Array<{
    organization: string,
    baseCost: number,
    totalClaim: number,
    payerCoverage: number,
    outOfPocket: number,
    payer: string,
    patientId?: string,
    encounterId?: string,
    additionalProcedures?: Array<{
      description: string,
      baseCost: number,
      date: string,
      organization: string
    }>
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProcedure, setSelectedProcedure] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [sortField, setSortField] = useState<string>("organization");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Toggle expanded row
  const toggleRowExpansion = (index: number) => {
    setExpandedRows(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Add click outside handler
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

  // Fetch unique procedures for dropdown
  useEffect(() => {
    async function fetchProcedures() {
      try {
        const { data, error } = await supabase
          .from('procedures')
          .select('description')
          .order('description');

        if (error) {
          console.error('Error fetching procedures:', error);
          return;
        }

        if (data) {
          const uniqueProcs = Array.from(new Set(data.map(p => p.description)))
            .filter(Boolean)
            .sort();
          setProcedures(uniqueProcs);
        }
      } catch (err) {
        console.error('Error:', err);
      }
    }

    fetchProcedures();
  }, []);

  // Fetch metrics data
  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true);
      try {
        const url = new URL('/api/metrics', window.location.origin);
        if (selectedProcedure) {
          url.searchParams.set('procedure', selectedProcedure);
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch metrics');
        }

        const data = await response.json();
        setMetrics(data.metrics);
        setChartData(data.chartData || []);
        
        // Create sample table data if not provided by API
        if (data.tableData) {
          setTableData(data.tableData);
        } else {
          // Generate mock data for demonstration
          const mockOrgs = ['Memorial Hospital', 'City Medical Center', 'Regional Health', 'University Hospital', 'Community Care'];
          const mockPayers = ['Medicare', 'Medicaid', 'Blue Cross', 'Aetna', 'United Healthcare'];
          const mockProcedureNames = [
            'Diagnostic X-Ray',
            'Blood Test Panel',
            'Cardiovascular Assessment',
            'Physical Therapy Session',
            'Orthopedic Consultation',
            'Neurological Examination',
            'Respiratory Function Test',
            'Urinalysis',
            'Dermatology Screening',
            'Ophthalmology Examination'
          ];
          
          const mockTableData = mockOrgs.map(org => {
            const baseCost = Math.round(data.metrics.averageCost * (0.85 + Math.random() * 0.3));
            const totalClaim = Math.round(baseCost * (1.3 + Math.random() * 0.4));
            const payerCoverage = Math.round(totalClaim * (0.6 + Math.random() * 0.3));
            
            // Create random patientId and encounterId
            const patientId = `P${Math.floor(100000 + Math.random() * 900000)}`;
            const encounterId = `E${Math.floor(100000 + Math.random() * 900000)}`;
            
            // Generate 2-5 additional procedures
            const numAdditionalProcs = Math.floor(2 + Math.random() * 4);
            const usedProcedures = new Set(); // Track used procedures to avoid duplicates
            const additionalProcedures = [];
            
            // Generate unique procedures
            for (let i = 0; i < numAdditionalProcs; i++) {
              // Get a random procedure that hasn't been used yet
              let procedureName;
              do {
                procedureName = mockProcedureNames[Math.floor(Math.random() * mockProcedureNames.length)];
              } while (usedProcedures.has(procedureName));
              
              // Mark this procedure as used
              usedProcedures.add(procedureName);
              
              // Random date within the last 6 months
              const date = new Date();
              date.setMonth(date.getMonth() - Math.floor(Math.random() * 6));
              
              // For the mock data, ensure most procedures are from this organization
              // but occasionally add one from another organization
              const useThisOrg = Math.random() > 0.3; // 70% chance to use the current organization
              
              additionalProcedures.push({
                description: procedureName,
                baseCost: Math.round(300 + Math.random() * 2000),
                date: date.toISOString(),
                organization: useThisOrg ? org : mockOrgs[Math.floor(Math.random() * mockOrgs.length)]
              });
            }
            
            return {
              organization: org,
              baseCost,
              totalClaim,
              payerCoverage,
              outOfPocket: totalClaim - payerCoverage,
              payer: mockPayers[Math.floor(Math.random() * mockPayers.length)],
              patientId,
              encounterId,
              additionalProcedures
            };
          });
          setTableData(mockTableData);
        }
        
        console.log("Received chart data:", data.chartData?.length || 0, "points");
        setError(null);
      } catch (err) {
        console.error('Error fetching metrics:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, [selectedProcedure]);

  // Process chart data to handle predictions correctly
  const processChartData = () => {
    // Group by month to reduce noise
    const monthlyData: Record<string, { 
      total: number, 
      count: number, 
      isPrediction: boolean 
    }> = {};
    
    chartData.forEach(item => {
      const month = item.date.substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { 
          total: 0, 
          count: 0, 
          isPrediction: !!item.isPrediction 
        };
      }
      monthlyData[month].total += item.cost;
      monthlyData[month].count += 1;
      // If any data point is a prediction, mark the whole month as prediction
      if (item.isPrediction) {
        monthlyData[month].isPrediction = true;
      }
    });
    
    // Convert to array of monthly averages
    return Object.keys(monthlyData).map(month => ({
      month,
      avgCost: monthlyData[month].total / monthlyData[month].count,
      isPrediction: monthlyData[month].isPrediction
    })).sort((a, b) => a.month.localeCompare(b.month));
  };

  const chartDataMonthly = processChartData();
  
  // Filter procedures based on search term
  const filteredProcedures = procedures.filter(proc =>
    proc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <LoadingState />;
  if (error) return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-red-500 text-xl">Error Loading Dashboard</div>
        <div className="text-gray-400">{error}</div>
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          className="inline-flex items-center"
        >
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Retry
        </Button>
      </div>
    </div>
  );

  // CustomTooltip component for the chart
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      // Get prediction info based on which values are present
      const hasActualData = payload.some(p => p.dataKey === 'actualCost' && p.value !== null);
      const hasPredictionData = payload.some(p => p.dataKey === 'predictedCost' && p.value !== null);
      const isPrediction = !hasActualData && hasPredictionData;
      
      return (
        <div className={`p-2 rounded shadow-md ${isPrediction ? 'bg-red-900/90' : 'bg-gray-800/90'} border ${isPrediction ? 'border-red-700' : 'border-gray-700'}`}>
          <p className="text-sm font-medium">{label}</p>
          {payload.map((entry, index) => {
            // Skip null values
            if (entry.value === null) return null;
            
            return (
              <p key={`item-${index}`} style={{ color: entry.color }} className="text-sm">
                {`${entry.name}: $${entry.value?.toFixed(2) || 'N/A'}`}
                {entry.dataKey === 'predictedCost' && 
                  <span className="ml-2 text-xs text-red-400">(Predicted)</span>
                }
              </p>
            );
          })}
        </div>
      );
    }
    
    return null;
  };

 

 

  // // Update function parameter types
  // interface ProcedureAnalysisProps {
  //   data: {
  //     organization: string;
  //     baseCost: number;
  //     totalClaim: number;
  //     payerCoverage: number;
  //     outOfPocket: number;
  //     payer: string;
  //   }[];
  // }
  


  // ... existing code ...

  // interface PayerInsightProps {
  //   data: {
  //     name: string;
  //     value: number;
  //     color?: string;
  //   }[];
  // }
  



  // interface InsuranceCoverageProps {
  //   data: {
  //     name: string;
  //     value: number;
  //     fill?: string;
  //   }[];
  // }
  

  // ... existing code ...

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Healthcare Analytics Dashboard</h2>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="procedures">Procedures</TabsTrigger>
          <TabsTrigger value="insurance">Insurance</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search Procedures</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col relative" ref={dropdownRef}>
                <input
                  type="text"
                  className="p-2.5 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Type to search procedures..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                />
                {searchTerm && isDropdownOpen && (
                  <ul className="absolute z-10 w-full mt-1 max-h-60 overflow-auto rounded-lg bg-gray-700 border border-gray-600 top-[100%]">
                    {filteredProcedures.map((proc) => (
                      <li
                        key={proc}
                        className="p-2 hover:bg-gray-600 cursor-pointer text-white"
                        onClick={() => {
                          setSelectedProcedure(proc);
                          setSearchTerm(proc);
                          setIsDropdownOpen(false);
                        }}
                      >
                        {proc}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {selectedProcedure && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedProcedure(null);
                    setSearchTerm("");
                  }}
                  className="w-full md:w-auto"
                >
                  Clear Selection
                </Button>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                {procedures.slice(0, 5).map((procedure) => (
                  <Button
                    key={procedure}
                    variant={selectedProcedure === procedure ? "default" : "outline"}
                    onClick={() => setSelectedProcedure(selectedProcedure === procedure ? null : procedure)}
                    className="text-sm"
                  >
                    {procedure}
                  </Button>
                ))}
                {procedures.length > 5 && (
                  <Button
                    variant="outline"
                    className="text-sm"
                    onClick={() => setSelectedProcedure(null)}
                  >
                    +{procedures.length - 5} more
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">
                  Total Encounters
                </CardTitle>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 text-muted-foreground"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.totalEncounters}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedProcedure ? `For ${selectedProcedure}` : 'Total encounters across all procedures'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">
                  Procedure Cost
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${metrics.averageCost.toFixed(2)}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  Average base procedure cost
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">
                  Total Claim Cost
                </CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${metrics.avgTotalClaimCost.toFixed(2)}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  Average total claim amount
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">
                  Unique Patients
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.uniquePatients}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  Distinct patients receiving this procedure
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Cost Trend Chart */}
          <Card>
              <CardHeader>
              <CardTitle className="text-lg">Procedure Cost Trend Over Time</CardTitle>
              {chartDataMonthly.length > 0 && (
                <div className="text-sm text-gray-400 flex items-center mt-1">
                  <div className="flex items-center mr-4">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
                    <span>Actual Data</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
                    <span>Predictions ({chartDataMonthly.filter(d => d.isPrediction).length} months)</span>
                  </div>
                </div>
              )}
              </CardHeader>
              <CardContent>
              <div className="h-[300px] w-full">
                {chartDataMonthly.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartDataMonthly.map(item => ({
                        month: item.month,
                        actualCost: item.avgCost,
                        predictedCost: item.isPrediction ? item.avgCost : null
                      }))}
                      margin={{ top: 10, right: 30, left: 20, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis 
                        dataKey="month" 
                        stroke="#888" 
                        angle={-45} 
                        textAnchor="end"
                        tick={{ fontSize: 12 }}
                        height={60}
                      />
                      <YAxis 
                        stroke="#888" 
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      
                      {/* Line for actual data */}
                      <Line 
                        type="monotone" 
                        dataKey="actualCost" 
                        name="Actual Cost" 
                        stroke="#8884d8" 
                        activeDot={{ r: 8 }} 
                        strokeWidth={2}
                        connectNulls
                      />
                      
                      {/* Line for prediction data */}
                      <Line 
                        type="monotone" 
                        dataKey="predictedCost" 
                        name="Predicted Cost" 
                        stroke="#ff5252" 
                        strokeWidth={2}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No trend data available for the selected procedure
                  </div>
                )}
              </div>
              </CardContent>
            </Card>
            
            {/* Cost Breakdown Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cost Breakdown by Organization</CardTitle>
                <p className="text-sm text-gray-400">Filter by &quot;base cost&quot; to find the best value for your procedure</p>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md overflow-hidden">
                  <div className="max-h-[350px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-gray-800 z-10">
                        <TableRow>
                          <TableHead 
                            className="w-[250px] cursor-pointer hover:bg-gray-700/50"
                            onClick={() => {
                              if (sortField === "organization") {
                                setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                              } else {
                                setSortField("organization");
                                setSortDirection("asc");
                              }
                            }}
                          >
                            Organization
                            {sortField === "organization" && (
                              <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                            )}
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-gray-700/50"
                            onClick={() => {
                              if (sortField === "payer") {
                                setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                              } else {
                                setSortField("payer");
                                setSortDirection("asc");
                              }
                            }}
                          >
                            Primary Payer
                            {sortField === "payer" && (
                              <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                            )}
                          </TableHead>
                          <TableHead 
                            className="text-right cursor-pointer hover:bg-gray-700/50"
                            onClick={() => {
                              if (sortField === "baseCost") {
                                setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                              } else {
                                setSortField("baseCost");
                                setSortDirection("asc");
                              }
                            }}
                          >
                            Base Cost
                            {sortField === "baseCost" && (
                              <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                            )}
                          </TableHead>
                          <TableHead 
                            className="text-right cursor-pointer hover:bg-gray-700/50"
                            onClick={() => {
                              if (sortField === "totalClaim") {
                                setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                              } else {
                                setSortField("totalClaim");
                                setSortDirection("asc");
                              }
                            }}
                          >
                            Total Claim
                            {sortField === "totalClaim" && (
                              <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                            )}
                          </TableHead>
                          <TableHead 
                            className="text-right cursor-pointer hover:bg-gray-700/50"
                            onClick={() => {
                              if (sortField === "payerCoverage") {
                                setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                              } else {
                                setSortField("payerCoverage");
                                setSortDirection("asc");
                              }
                            }}
                          >
                            Payer Coverage
                            {sortField === "payerCoverage" && (
                              <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                            )}
                          </TableHead>
                          <TableHead 
                            className="text-right cursor-pointer hover:bg-gray-700/50"
                            onClick={() => {
                              if (sortField === "outOfPocket") {
                                setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                              } else {
                                setSortField("outOfPocket");
                                setSortDirection("asc");
                              }
                            }}
                          >
                            Out of Pocket
                            {sortField === "outOfPocket" && (
                              <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                            )}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tableData.length > 0 ? (
                          // Sort the table data based on current sort field and direction
                          [...tableData]
                            .sort((a, b) => {
                              // Handle string sorting for organization and payer fields
                              if (sortField === "organization" || sortField === "payer") {
                                const aVal = a[sortField as keyof typeof a] as string;
                                const bVal = b[sortField as keyof typeof b] as string;
                                return sortDirection === "asc" 
                                  ? aVal.localeCompare(bVal)
                                  : bVal.localeCompare(aVal);
                              }
                              
                              // Handle numeric sorting for all other fields
                              const aValue = a[sortField as keyof typeof a] as number;
                              const bValue = b[sortField as keyof typeof b] as number;
                              
                              return sortDirection === "asc" 
                                ? aValue - bValue 
                                : bValue - aValue;
                            })
                            .map((row, index) => (
                              <React.Fragment key={`row-${index}`}>
                                <TableRow 
                                  className={`cursor-pointer ${expandedRows[index] ? 'bg-gray-700' : ''} hover:bg-gray-700/50`}
                                  onClick={() => toggleRowExpansion(index)}
                                >
                                  <TableCell className="font-medium">
                                    <div className="flex items-center">
                                      <span className="mr-2">{expandedRows[index] ? '▼' : '▶'}</span>
                                      {row.organization}
                                    </div>
                                  </TableCell>
                                  <TableCell>{row.payer || 'Unknown'}</TableCell>
                                  <TableCell className="text-right">${row.baseCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                  <TableCell className="text-right">${row.totalClaim.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                  <TableCell className="text-right">${row.payerCoverage.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                  <TableCell className="text-right">${row.outOfPocket.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                </TableRow>
                                {expandedRows[index] && (
                                  <TableRow className="bg-gray-700/40">
                                    <TableCell colSpan={6} className="p-0">
                                      <div className="p-4 space-y-4">
                                        <div className="flex justify-between items-center">
                                          <h4 className="text-sm font-semibold text-blue-400">
                                            Additional Procedures at {row.organization} for this Patient
                                          </h4>
                                          <div className="text-xs text-gray-400">
                                            Patient ID: {row.patientId || 'Unknown'} | Encounter ID: {row.encounterId || 'Unknown'}
                                          </div>
                                        </div>
                                        
                                        {row.additionalProcedures && row.additionalProcedures.length > 0 ? (
                                          <div className="border border-gray-600 rounded overflow-hidden">
                                            <table className="w-full text-sm">
                                              <thead className="bg-gray-800">
                                                <tr>
                                                  <th className="py-2 px-3 text-left">Procedure</th>
                                                  <th className="py-2 px-3 text-right">Date</th>
                                                  <th className="py-2 px-3 text-right">Base Cost</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {/* Sort procedures by date (newest first) and ensure we have no duplicates */}
                                                {row.additionalProcedures
                                                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                                  .map((proc, i) => (
                                                    <tr key={i} className="border-t border-gray-700">
                                                      <td className="py-2 px-3">{proc.description}</td>
                                                      <td className="py-2 px-3 text-right">{new Date(proc.date).toLocaleDateString()}</td>
                                                      <td className="py-2 px-3 text-right">${proc.baseCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                                    </tr>
                                                  ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        ) : (
                                          <div className="py-4 text-center text-gray-400">
                                            {loading ? (
                                              <div className="flex justify-center items-center">
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                <span>Loading additional procedures...</span>
                                              </div>
                                            ) : (
                                              "No additional procedures found for this patient"
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </React.Fragment>
                            ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                              {loading ? (
                                <div className="flex justify-center items-center">
                                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                  <span>Loading organization data...</span>
                                </div>
                              ) : (
                                "No organization data available for the selected procedure"
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cost Comparison Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cost Comparison Across Facilities</CardTitle>
                <p className="text-sm text-gray-400">Top 5 facilities with lowest base cost for {selectedProcedure || 'procedures'}</p>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full">
                  {tableData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={tableData
                          .sort((a, b) => a.baseCost - b.baseCost)
                          .slice(0, 5)
                          .map((item, index) => ({
                            name: `Facility ${index + 1}`,
                            organization: item.organization,
                            baseCost: item.baseCost,
                            additionalCosts: item.totalClaim - item.baseCost,
                          }))}
                        margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                        <XAxis 
                          dataKey="name"
                          tick={{ fill: '#888', fontSize: 12 }}
                        />
                        <YAxis 
                          tickFormatter={(value) => `$${value}`}
                          tick={{ fill: '#888' }}
                        />
                        <Tooltip 
                          formatter={(value: number, name: string) => {
                            if (name === 'baseCost') return [`$${value.toFixed(2)}`, 'Base Cost'];
                            if (name === 'additionalCosts') return [`$${value.toFixed(2)}`, 'Additional Costs'];
                            return [value, name];
                          }}
                          labelFormatter={(label, payload) => {
                            if (payload && payload.length > 0) {
                              return payload[0].payload.organization;
                            }
                            return label;
                          }}
                          contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                          labelStyle={{ color: '#F3F4F6' }}
                        />
                        <Legend />
                        <Bar dataKey="baseCost" name="Base Cost" stackId="a" fill="#8884d8" />
                        <Bar dataKey="additionalCosts" name="Additional Costs" stackId="a" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No cost data available for comparison
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Insurance Coverage Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Insurance Coverage Comparison</CardTitle>
                <p className="text-sm text-gray-400">Coverage vs. out-of-pocket across different insurers</p>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full">
                  {tableData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={tableData.reduce((result: { name: string; count: number; totalClaim: number; payerCoverage: number; outOfPocket: number; }[], item: { payer: string; totalClaim: number; payerCoverage: number; outOfPocket: number; }) => {
                          // Check if this payer is already in the result
                          const existingPayer = result.find(p => p.name === item.payer);
                          
                          if (existingPayer) {
                            // Update existing payer data
                            existingPayer.count += 1;
                            existingPayer.totalClaim += item.totalClaim;
                            existingPayer.payerCoverage += item.payerCoverage;
                            existingPayer.outOfPocket += item.outOfPocket;
                          } else {
                            // Add new payer data
                            result.push({
                              name: item.payer,
                              count: 1,
                              totalClaim: item.totalClaim,
                              payerCoverage: item.payerCoverage,
                              outOfPocket: item.outOfPocket
                            });
                          }
                          return result;
                        }, []).map(item => ({
                          ...item,
                          value: item.totalClaim,
                          avgValue: item.totalClaim / item.count,
                          efficiency: (item.payerCoverage / item.totalClaim) * 100
                        })).sort((a, b) => b.value - a.value)}
                        margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fill: '#888', fontSize: 12 }}
                        />
                        <YAxis 
                          tickFormatter={(value) => `$${value}`}
                          tick={{ fill: '#888' }}
                        />
                        <Tooltip 
                          formatter={(value: number, name: string) => {
                            if (name === 'value') return [`$${value.toLocaleString()}`, 'Total Claim'];
                            if (name === 'efficiency') return [`${value.toFixed(1)}%`, 'Coverage Efficiency'];
                            return [value, name];
                          }}
                          contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                          labelStyle={{ color: '#F3F4F6' }}
                        />
                        <Legend 
                          formatter={(value) => {
                            return <span style={{ color: '#F3F4F6' }}>{value}</span>;
                          }}
                        />
                        <Bar dataKey="value" name="Total Claim" fill="#8884d8" />
                        <Bar dataKey="efficiency" name="Coverage Efficiency" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No insurance data available for comparison
                    </div>
                  )}
                </div>
                
                {/* Coverage Percentage Table */}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="py-2 px-3 text-left">Insurance Provider</th>
                        <th className="py-2 px-3 text-right">Avg. Coverage</th>
                        <th className="py-2 px-3 text-right">Avg. Out of Pocket</th>
                        <th className="py-2 px-3 text-right">Coverage %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.reduce((result: { name: string; count: number; totalClaim: number; payerCoverage: number; outOfPocket: number; }[], item) => {
                        // Check if this payer is already in the result
                        const existingPayer = result.find(p => p.name === item.payer);
                        
                        if (existingPayer) {
                          // Update existing payer data
                          existingPayer.count += 1;
                          existingPayer.totalClaim += item.totalClaim;
                          existingPayer.payerCoverage += item.payerCoverage;
                          existingPayer.outOfPocket += item.outOfPocket;
                        } else {
                          // Add new payer data
                          result.push({
                            name: item.payer,
                            count: 1,
                            totalClaim: item.totalClaim,
                            payerCoverage: item.payerCoverage,
                            outOfPocket: item.outOfPocket
                          });
                        }
                        return result;
                      }, []).map((item, index) => {
                        // Calculate averages
                        const avgPayerCoverage = item.payerCoverage / item.count;
                        const avgOutOfPocket = item.outOfPocket / item.count;
                        const avgTotalClaim = item.totalClaim / item.count;
                        const coveragePercent = Math.round((avgPayerCoverage / avgTotalClaim) * 100);
                        
                        return (
                          <tr key={index} className="border-t border-gray-700">
                            <td className="py-2 px-3">{item.name}</td>
                            <td className="py-2 px-3 text-right">${avgPayerCoverage.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td className="py-2 px-3 text-right">${avgOutOfPocket.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td className="py-2 px-3 text-right">
                              <div className="flex items-center justify-end">
                                <div className="w-24 bg-gray-700 h-2 rounded-full mr-2">
                                  <div 
                                    className="bg-blue-500 h-2 rounded-full" 
                                    style={{ width: `${coveragePercent}%` }}
                                  ></div>
                                </div>
                                {coveragePercent}%
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Coverage Effectiveness Heat Map */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Coverage Effectiveness by Encounter Class</CardTitle>
                <p className="text-sm text-gray-400">Heat map of coverage percentages by payer and encounter class</p>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full">
                  {tableData.length > 0 ? (
                    <div className="overflow-x-auto max-h-[400px]">
                      <table className="min-w-full text-sm border-separate border-spacing-0">
                        <thead className="bg-gray-800 sticky top-0 z-10">
                          <tr>
                            <th className="py-2 px-3 text-left whitespace-nowrap">Payer</th>
                            <th className="py-2 px-3 text-center whitespace-nowrap">Emergency</th>
                            <th className="py-2 px-3 text-center whitespace-nowrap">Inpatient</th>
                            <th className="py-2 px-3 text-center whitespace-nowrap">Ambulatory</th>
                            <th className="py-2 px-3 text-center whitespace-nowrap">Wellness</th>
                            <th className="py-2 px-3 text-center whitespace-nowrap">Urgent Care</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tableData
                            .reduce((result: { name: string; emergency: number; inpatient: number; ambulatory: number; wellness: number; urgentCare: number; }[], item) => {
                              // Check if this payer is already in the result
                              const existingPayer = result.find(p => p.name === item.payer);
                              
                              if (existingPayer) {
                                return result;
                              } else {
                                // Generate payer data with randomized encounter class coverages
                                // In a real implementation, this would come from API data
                                return [...result, {
                                  name: item.payer,
                                  emergency: Math.round(50 + Math.random() * 40), // 50-90% coverage
                                  inpatient: Math.round(60 + Math.random() * 35), // 60-95% coverage
                                  ambulatory: Math.round(70 + Math.random() * 25), // 70-95% coverage
                                  wellness: Math.round(40 + Math.random() * 50), // 40-90% coverage
                                  urgentCare: Math.round(55 + Math.random() * 35), // 55-90% coverage
                                }];
                              }
                            }, [])
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((payer, index) => (
                              <tr key={index} className="border-t border-gray-700">
                                <td className="py-2 px-3 font-medium whitespace-nowrap">{payer.name}</td>
                                <td className="py-2 px-3">
                                  <div className="flex items-center justify-center">
                                    <div 
                                      className="w-12 h-12 flex items-center justify-center rounded-md text-white text-sm"
                                      style={{ 
                                        backgroundColor: `hsl(${payer.emergency - 50}, 80%, 40%)`,
                                      }}
                                    >
                                      {payer.emergency}%
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2 px-3">
                                  <div className="flex items-center justify-center">
                                    <div 
                                      className="w-12 h-12 flex items-center justify-center rounded-md text-white text-sm"
                                      style={{ 
                                        backgroundColor: `hsl(${payer.inpatient - 50}, 80%, 40%)`,
                                      }}
                                    >
                                      {payer.inpatient}%
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2 px-3">
                                  <div className="flex items-center justify-center">
                                    <div 
                                      className="w-12 h-12 flex items-center justify-center rounded-md text-white text-sm"
                                      style={{ 
                                        backgroundColor: `hsl(${payer.ambulatory - 50}, 80%, 40%)`,
                                      }}
                                    >
                                      {payer.ambulatory}%
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2 px-3">
                                  <div className="flex items-center justify-center">
                                    <div 
                                      className="w-12 h-12 flex items-center justify-center rounded-md text-white text-sm"
                                      style={{ 
                                        backgroundColor: `hsl(${payer.wellness - 50}, 80%, 40%)`,
                                      }}
                                    >
                                      {payer.wellness}%
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2 px-3">
                                  <div className="flex items-center justify-center">
                                    <div 
                                      className="w-12 h-12 flex items-center justify-center rounded-md text-white text-sm"
                                      style={{ 
                                        backgroundColor: `hsl(${payer.urgentCare - 50}, 80%, 40%)`,
                                      }}
                                    >
                                      {payer.urgentCare}%
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ))
                          }
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No data available for coverage effectiveness analysis
                    </div>
                  )}
                </div>
                
                {/* Legend */}
                <div className="mt-4">
                  <p className="text-sm text-gray-400 mb-2">Coverage Percentage Legend</p>
                  <div className="flex items-center">
                    <div className="flex-1 h-4 bg-gradient-to-r from-red-600 via-yellow-500 to-green-500 rounded"></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="procedures" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Procedure Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search procedures..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 p-2.5 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {selectedProcedure && (
                    <Button
                      variant="outline"
                      onClick={() => setSelectedProcedure(null)}
                    >
                      Clear Filter
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {procedures.slice(0, 5).map((procedure) => (
                    <Button
                      key={procedure}
                      variant={selectedProcedure === procedure ? "default" : "outline"}
                      onClick={() => setSelectedProcedure(selectedProcedure === procedure ? null : procedure)}
                      className="text-sm"
                    >
                      {procedure}
                    </Button>
                  ))}
                  {procedures.length > 5 && (
                    <Button
                      variant="outline"
                      className="text-sm"
                      onClick={() => setSelectedProcedure(null)}
                    >
                      +{procedures.length - 5} more
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insurance" className="space-y-4">
          {/* Coverage Expenditure TreeMap */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Coverage Expenditure by Category</CardTitle>
              <p className="text-sm text-gray-400">Visualizing where insurance money is going (size by total coverage amount)</p>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] w-full">
                {tableData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                      data={(() => {
                        // Group by payers - calculate total coverage by payer
                        const payerGroups: Record<string, number> = {};
                        const colorRange = [
                          '#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', 
                          '#d0ed57', '#ffc658', '#ff8042', '#ff5252', '#e88cff',
                          '#c0b7ff', '#5bceae', '#6088ff', '#b372cc', '#36a2eb'
                        ];
                        
                        tableData.forEach(item => {
                          const payer = item.payer || 'Unknown';
                          if (!payerGroups[payer]) {
                            payerGroups[payer] = 0;
                          }
                          payerGroups[payer] += item.payerCoverage;
                        });
                        
                        // Convert to array structure required by Treemap
                        return Object.entries(payerGroups).map(([name, value], index) => ({
                          name,
                          size: value,
                          value, // This is used for the size calculation
                          index, // Used for coloring
                          color: colorRange[index % colorRange.length]
                        }));
                      })()}
                      dataKey="value"
                      aspectRatio={4/3}
                      stroke="#333"
                      fill="#8884d8"
                    >
                      {/* Add color cells back */}
                      {tableData.length > 0 && 
                        Object.keys(tableData.reduce((acc, item) => {
                          acc[item.payer || 'Unknown'] = true;
                          return acc;
                        }, {} as Record<string, boolean>)).map((name, index) => {
                          const colorRange = [
                            '#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', 
                            '#d0ed57', '#ffc658', '#ff8042', '#ff5252', '#e88cff',
                            '#c0b7ff', '#5bceae', '#6088ff', '#b372cc', '#36a2eb'
                          ];
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={colorRange[index % colorRange.length]}
                            />
                          );
                        })
                      }
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-gray-800/90 border border-gray-700 p-4 rounded shadow-md">
                                <p className="text-sm font-bold text-white">{data.name}</p>
                                <p className="text-xl font-bold text-blue-400 mt-1">
                                  ${data.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                </p>
                                <p className="text-xs text-gray-400 mt-2">
                                  Total insurance coverage amount
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </Treemap>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No coverage expenditure data available for visualization
                  </div>
                )}
              </div>
              
              <div className="mt-4">
                <p className="text-sm text-gray-400 mb-2">Treemap Legend</p>
                <div className="grid grid-cols-1 gap-2">
                  <div className="p-3 bg-gray-800 rounded border border-gray-700">
                    <span className="text-sm font-medium">Size:</span>{" "}
                    <span className="text-sm text-gray-400">Total insurance coverage amount paid by each insurance provider</span>
                  </div>
                  
                  {/* Color legend for the most common insurers */}
                  <div className="p-3 bg-gray-800 rounded border border-gray-700">
                    <span className="text-sm font-medium mb-2 block">Insurance Providers:</span>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mt-2">
                      {(() => {
                        // Get unique payers
                        const uniquePayers = Array.from(new Set(tableData.map(item => item.payer)));
                        const colorRange = [
                          '#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', 
                          '#d0ed57', '#ffc658', '#ff8042', '#ff5252', '#e88cff',
                          '#c0b7ff', '#5bceae', '#6088ff', '#b372cc', '#36a2eb'
                        ];
                        
                        return uniquePayers.slice(0, 10).map((payer, index) => (
                          <div key={index} className="flex items-center">
                            <div 
                              className="w-4 h-4 rounded-sm mr-2" 
                              style={{ backgroundColor: colorRange[index % colorRange.length] }}
                            ></div>
                            <span className="text-xs truncate">{payer}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pareto Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pareto Analysis: 80/20 Rule of Coverage Costs</CardTitle>
              <p className="text-sm text-gray-400">Identifying the 20% of procedures/organizations consuming 80% of coverage costs</p>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                {tableData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={(() => {
                        // Group by organizations
                        const orgGroups: Record<string, number> = {};
                        
                        tableData.forEach(item => {
                          const org = item.organization;
                          if (!orgGroups[org]) {
                            orgGroups[org] = 0;
                          }
                          orgGroups[org] += item.payerCoverage;
                        });
                        
                        // Convert to array and sort by coverage amount descending
                        const sortedData = Object.entries(orgGroups)
                          .map(([name, value]) => ({ name, value }))
                          .sort((a, b) => b.value - a.value);
                        
                        // Calculate cumulative percentage
                        const totalValue = sortedData.reduce((sum, item) => sum + item.value, 0);
                        let cumulativePercent = 0;
                        
                        return sortedData.map((item) => {
                          const percent = (item.value / totalValue) * 100;
                          cumulativePercent += percent;
                          return {
                            name: item.name,
                            value: item.value,
                            percent,
                            cumulativePercent,
                            isSignificant: cumulativePercent <= 80 // Mark items in the top 80%
                          };
                        });
                      })()}
                      margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fill: '#888', fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis 
                        yAxisId="left"
                        tickFormatter={(value) => `$${value}`}
                        tick={{ fill: '#888' }}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        tickFormatter={(value) => `${value}%`}
                        tick={{ fill: '#888' }}
                        domain={[0, 100]}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          if (name === 'value') return [`$${value.toLocaleString()}`, 'Coverage Amount'];
                          if (name === 'cumulativePercent') return [`${value.toFixed(1)}%`, 'Cumulative %'];
                          return [value, name];
                        }}
                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                        labelStyle={{ color: '#F3F4F6' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '10px' }} />
                      <Bar 
                        dataKey="value" 
                        name="Coverage Amount" 
                        yAxisId="left" 
                        fill="#8884d8"
                      >
                        {tableData.length > 0 && (
                          (() => {
                            // Group by organizations
                            const orgGroups: Record<string, number> = {};
                            
                            tableData.forEach(item => {
                              const org = item.organization;
                              if (!orgGroups[org]) {
                                orgGroups[org] = 0;
                              }
                              orgGroups[org] += item.payerCoverage;
                            });
                            
                            // Convert to array and sort by coverage amount descending
                            const sortedData = Object.entries(orgGroups)
                              .map(([name, value]) => ({ name, value }))
                              .sort((a, b) => b.value - a.value);
                            
                            // Calculate cumulative percentage
                            const totalValue = sortedData.reduce((sum, item) => sum + item.value, 0);
                            let cumulativePercent = 0;
                            
                            const colorGradient = [
                              '#8884d8', '#9a7fd8', '#ab7bd7', '#bc76d7', '#cd72d6', 
                              '#de6dd6', '#f068d5', '#a56cda', '#816fdf', '#674be0'
                            ];
                            
                            const grayscale = [
                              '#555', '#4c4c4c', '#444', '#3c3c3c', '#343434'
                            ];
                            
                            return sortedData.map((item, index) => {
                              const percent = (item.value / totalValue) * 100;
                              cumulativePercent += percent;
                              const isSignificant = cumulativePercent <= 80;
                              
                              return (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={isSignificant 
                                    ? colorGradient[Math.min(index, colorGradient.length - 1)] 
                                    : grayscale[Math.min(index - colorGradient.length, grayscale.length - 1)]} 
                                />
                              );
                            });
                          })()
                        )}
                      </Bar>
                      <Line
                        type="monotone"
                        dataKey="cumulativePercent"
                        name="Cumulative %"
                        yAxisId="right"
                        stroke="#ff7300"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No cost data available for Pareto analysis
                  </div>
                )}
              </div>
              
              <div className="mt-4 p-4 border border-gray-700 rounded-lg bg-gray-800">
                <h4 className="text-sm font-medium mb-2">Pareto Principle Insight</h4>
                <p className="text-sm text-gray-400">
                  The chart above highlights the &quot;80/20 rule&quot; in healthcare coverage - where approximately 20% of organizations
                  or procedures consume about 80% of insurance coverage expenditure (highlighted in purple).
                  This analysis helps identify high-impact areas for cost optimization and negotiation.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payer Coverage Efficiency */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payer Coverage Efficiency Analysis</CardTitle>
              <p className="text-sm text-gray-400">Comparing coverage percentage against average claim size by payer</p>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                {tableData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tableData.reduce((result: { name: string; count: number; totalValue: number; avgCoverage: number }[], item) => {
                          // Check if this payer is already in the result
                          const existingPayer = result.find(p => p.name === item.payer);
                          
                          if (existingPayer) {
                            // Update existing payer data
                            existingPayer.count += 1;
                            existingPayer.totalValue += item.payerCoverage;
                          } else {
                            // Add new payer data
                            result.push({
                              name: item.payer,
                              count: 1,
                              totalValue: item.payerCoverage,
                              avgCoverage: Math.round((item.payerCoverage / item.totalClaim) * 100)
                            });
                          }
                          return result;
                        }, []).map(item => ({
                          ...item,
                          value: item.totalValue,
                          avgValue: item.totalValue / item.count,
                          efficiency: (item.avgCoverage / 100) * (item.totalValue / item.count)
                        })).sort((a, b) => b.value - a.value)}
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        innerRadius={80}
                        dataKey="value"
                        nameKey="name"
                        label={({
                          cx,
                          cy,
                          midAngle,
                          innerRadius,
                          outerRadius,
                          name,
                          avgCoverage,
                        }) => {
                          const radius = innerRadius + (outerRadius - innerRadius) * 1.15;
                          const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                          const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                          
                          return (
                            <text
                              x={x}
                              y={y}
                              textAnchor={x > cx ? 'start' : 'end'}
                              dominantBaseline="central"
                              fill="#DDD"
                              fontSize={12}
                            >
                              {name} ({avgCoverage}%)
                            </text>
                          );
                        }}
                      >
                        {tableData.reduce((result: { name: string; count: number; totalValue: number; totalCoverage: number }[], item) => {
                          // Check if this payer is already in the result
                          const existingPayer = result.find(p => p.name === item.payer);
                          
                          if (existingPayer) {
                            // Update existing payer data
                            existingPayer.count += 1;
                            existingPayer.totalValue += item.payerCoverage;
                            existingPayer.totalCoverage += (item.payerCoverage / item.totalClaim);
                          } else {
                            // Add new payer data
                            result.push({
                              name: item.payer,
                              count: 1,
                              totalValue: item.payerCoverage,
                              totalCoverage: (item.payerCoverage / item.totalClaim)
                            });
                          }
                          return result;
                        }, []).map(item => ({
                          ...item,
                          value: item.totalValue,
                          avgValue: item.totalValue / item.count,
                          avgCoverage: Math.round((item.totalCoverage / item.count) * 100)
                        })).map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={`hsl(${entry.avgCoverage * 1.2}, 70%, 50%)`} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => {
                          return [`$${value.toLocaleString()}`, 'Total Coverage Amount'];
                        }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-gray-800/90 border border-gray-700 p-3 rounded shadow-md">
                                <p className="text-sm font-bold">{data.name}</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                                  <p className="text-xs text-gray-400">Total Coverage:</p>
                                  <p className="text-xs text-right">${data.value.toLocaleString()}</p>
                                  
                                  <p className="text-xs text-gray-400">Avg. Per Claim:</p>
                                  <p className="text-xs text-right">${data.avgValue.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
                                  
                                  <p className="text-xs text-gray-400">Avg. Coverage %:</p>
                                  <p className="text-xs text-right">{data.avgCoverage}%</p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                        labelStyle={{ color: '#F3F4F6' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No data available for payer efficiency analysis
                  </div>
                )}
              </div>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <h4 className="text-sm font-medium mb-2">Coverage Percentage Legend</h4>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 h-3 bg-gradient-to-r from-red-600 via-yellow-500 to-green-500 rounded"></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <h4 className="text-sm font-medium mb-2">Insight Summary</h4>
                  <p className="text-xs text-gray-400">
                    This visualization shows both the total coverage expenditure by each payer (segment size) 
                    and their average coverage percentage (color). Greener segments indicate higher coverage percentages,
                    while larger segments represent higher total expenditure.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 