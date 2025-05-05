import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowLeft, Clock, Calendar, Search, ArrowUpDown, FileArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';

type ArchivedProject = {
  id: number;
  projectId: number;
  projectNumber: string;
  name: string;
  archivedDate: string;
  archivedBy: string;
  archivedByUser: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
  },
  reason: string | null;
  originalProject: {
    startDate: string;
    estimatedCompletionDate: string;
    actualCompletionDate: string | null;
    status: string;
    percentComplete: string;
  }
};

const ArchivedProjects = () => {
  const { data: archivedProjects, isLoading } = useQuery({
    queryKey: ['/api/archived-projects'],
  });

  const columns: ColumnDef<ArchivedProject>[] = [
    {
      accessorKey: 'projectNumber',
      header: 'Project Number',
      cell: ({ row }) => (
        <div className="font-medium text-blue-400 hover:underline">
          <Link href={`/archived-project/${row.original.id}`}>
            {row.original.projectNumber}
          </Link>
        </div>
      )
    },
    {
      accessorKey: 'name',
      header: 'Project Name',
    },
    {
      accessorKey: 'originalProject.status',
      header: 'Status',
      cell: ({ row }) => {
        return (
          <span className={`px-2 py-1 rounded-full text-xs ${
            row.original.originalProject.status === 'completed' ? 'bg-green-900 text-green-400' :
            row.original.originalProject.status === 'cancelled' ? 'bg-red-900 text-red-400' :
            'bg-gray-800 text-gray-400'
          }`}>
            {row.original.originalProject.status.charAt(0).toUpperCase() + row.original.originalProject.status.slice(1)}
          </span>
        );
      }
    },
    {
      accessorKey: 'originalProject.percentComplete',
      header: 'Progress',
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 bg-gray-800 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full" 
                style={{ width: `${row.original.originalProject.percentComplete}%` }}
              ></div>
            </div>
            <span className="text-xs">{row.original.originalProject.percentComplete}%</span>
          </div>
        )
      }
    },
    {
      accessorKey: 'archivedDate',
      header: 'Archived Date',
      cell: ({ row }) => formatDate(row.original.archivedDate)
    },
    {
      accessorKey: 'archivedByUser',
      header: 'Archived By',
      cell: ({ row }) => {
        const user = row.original.archivedByUser;
        return user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}`
          : user.username;
      }
    },
    {
      accessorKey: 'reason',
      header: 'Reason',
      cell: ({ row }) => row.original.reason || 'No reason provided'
    },
    {
      accessorKey: 'originalProject.actualCompletionDate',
      header: 'Completion Date',
      cell: ({ row }) => row.original.originalProject.actualCompletionDate 
        ? formatDate(row.original.originalProject.actualCompletionDate)
        : 'Not completed'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Active Projects
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Archived Projects</h1>
        </div>
      </div>

      <div className="bg-darkCard rounded-xl border border-gray-800 p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <FileArchive className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-medium">Archived Projects List</h2>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search archived projects..."
              className="pl-8 bg-darkInput border-gray-700"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : archivedProjects && archivedProjects.length > 0 ? (
          <DataTable 
            columns={columns} 
            data={archivedProjects}
            searchPlaceholder="Filter projects..."
            filterColumn="projectNumber"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-gray-700 rounded-lg">
            <FileArchive className="h-12 w-12 text-gray-500 mb-3" />
            <h3 className="text-lg font-medium mb-1">No Archived Projects</h3>
            <p className="text-gray-400 max-w-md">
              There are no archived projects in the system. When you archive a project, it will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchivedProjects;