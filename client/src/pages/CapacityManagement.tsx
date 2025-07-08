import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import CapacityPlanning from "@/components/capacity/CapacityPlanningNew";
import CapacityAnalytics from "@/components/capacity/CapacityAnalytics";

export default function CapacityManagement() {
  const [activeTab, setActiveTab] = useState("planning");

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div className="container mx-auto p-6 max-w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Capacity Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage production team and department capacity across all manufacturing phases
        </p>
      </div>

      <Card className="bg-white dark:bg-gray-800 shadow-lg">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-700">
            <TabsTrigger 
              value="planning" 
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800"
            >
              Capacity Planning
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800"
            >
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="planning" className="p-6">
            <CapacityPlanning />
          </TabsContent>

          <TabsContent value="analytics" className="p-6">
            <CapacityAnalytics />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}