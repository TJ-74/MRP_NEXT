'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RecentProceduresProps {
  encounters: Array<{
    id: string;
    start: string;
    base_encounter_cost: number;
    description: string;
    organization: string;
  }>;
}

export function RecentProcedures({ encounters }: RecentProceduresProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Organization</TableHead>
          <TableHead className="text-right">Cost</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {encounters.map((encounter) => (
          <TableRow key={encounter.id}>
            <TableCell>
              {encounter.start 
                ? new Date(encounter.start).toLocaleDateString()
                : 'N/A'}
            </TableCell>
            <TableCell>{encounter.description || 'Unknown Procedure'}</TableCell>
            <TableCell>{encounter.organization || 'N/A'}</TableCell>
            <TableCell className="text-right">
              ${encounter.base_encounter_cost?.toFixed(2) || '0.00'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
} 