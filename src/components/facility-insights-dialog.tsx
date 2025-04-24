import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface FacilityData {
  name: string;
  baseCost: number;
  totalClaim: number;
  additionalCosts: number;
  payerCoverage: number;
  outOfPocket: number;
  payer: string;
}

interface FacilityInsightsDialogProps {
  facilityData: FacilityData[];
  procedureName: string;
}

export function FacilityInsightsDialog({ facilityData, procedureName }: FacilityInsightsDialogProps) {
  const [insights, setInsights] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/facility-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityData,
          procedureName
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate facility insights');
      }

      const data = await response.json();
      setInsights(data.insights);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-2 bg-white text-gray-900 hover:bg-gray-100"
          onClick={() => {
            if (!insights) {
              generateInsights();
            }
          }}
        >
          <Sparkles className="h-4 w-4" />
          Compare Facilities
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-gray-900">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Facility Comparison</DialogTitle>
          <DialogDescription className="text-lg mt-2">
            Cost comparison and recommendations for {procedureName}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          )}
          {error && (
            <div className="text-red-500 p-6 rounded bg-red-50/10 text-lg">
              {error}
            </div>
          )}
          {insights && !loading && (
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <style jsx global>{`
                .prose h2 {
                  font-size: 1.5rem;
                  margin-top: 2rem;
                  margin-bottom: 1.25rem;
                  font-weight: 600;
                }
                .prose p {
                  margin-top: 1rem;
                  margin-bottom: 1rem;
                  line-height: 1.6;
                  font-size: 0.95rem;
                }
                .prose ul {
                  margin-top: 1rem;
                  margin-bottom: 1rem;
                  padding-left: 1.25rem;
                }
                .prose li {
                  margin-top: 0.5rem;
                  margin-bottom: 0.5rem;
                  font-size: 0.95rem;
                }
                .prose strong {
                  color: #60A5FA;
                  font-weight: 600;
                }
                .prose h2:first-child {
                  margin-top: 0;
                }
                .prose {
                  font-size: 0.95rem;
                  line-height: 1.6;
                  color: #E5E7EB;
                }
              `}</style>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {insights}
              </ReactMarkdown>
            </div>
          )}
          {!insights && !loading && !error && (
            <div className="text-center py-12 text-gray-400 text-lg">
              Click &quot;Compare Facilities&quot; to get personalized recommendations for choosing the best facility.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 