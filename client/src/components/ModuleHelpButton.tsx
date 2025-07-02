import React, { useState } from 'react';
import { HelpCircle, X, ChevronRight, ChevronDown, Book, Video, Settings, Users, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// Help content definitions for each module
export interface HelpSection {
  title: string;
  icon: React.ReactNode;
  content: string;
  subsections?: {
    title: string;
    content: string;
    steps?: string[];
  }[];
}

export interface ModuleHelpContent {
  title: string;
  description: string;
  icon: React.ReactNode;
  quickStart: string[];
  sections: HelpSection[];
  tips?: string[];
  features?: {
    name: string;
    description: string;
  }[];
  workflows?: {
    title: string;
    steps: string[];
  }[];
  troubleshooting: {
    issue: string;
    solution: string;
  }[];
}

interface ModuleHelpButtonProps {
  moduleId: string;
  helpContent: ModuleHelpContent;
  className?: string;
}

export const ModuleHelpButton: React.FC<ModuleHelpButtonProps> = ({ 
  moduleId, 
  helpContent, 
  className = "" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionTitle: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionTitle)) {
      newExpanded.delete(sectionTitle);
    } else {
      newExpanded.add(sectionTitle);
    }
    setExpandedSections(newExpanded);
  };

  const filterContent = (content: string, title: string) => {
    if (!searchTerm) return true;
    return content.toLowerCase().includes(searchTerm.toLowerCase()) ||
           title.toLowerCase().includes(searchTerm.toLowerCase());
  };

  const filteredSections = helpContent.sections.filter(section => 
    filterContent(section.content, section.title) ||
    section.subsections?.some(sub => 
      filterContent(sub.content, sub.title) ||
      sub.steps?.some(step => filterContent(step, ''))
    )
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`gap-2 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950 dark:hover:border-blue-700 ${className}`}
          onClick={() => setIsOpen(true)}
        >
          <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-blue-600 dark:text-blue-400 font-medium">Help!</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                {helpContent.icon}
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-blue-900 dark:text-blue-100">
                  {helpContent.title} - Help Guide
                </DialogTitle>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  {helpContent.description}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              Module Help
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex flex-col h-[calc(85vh-120px)]">
          {/* Search Bar */}
          <div className="p-4 border-b bg-gray-50 dark:bg-gray-900">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search help content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white dark:bg-gray-800"
              />
            </div>
          </div>

          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              {/* Quick Start Section */}
              <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                    <Video className="h-5 w-5" />
                    Quick Start Guide
                  </CardTitle>
                  <CardDescription className="text-green-700 dark:text-green-300">
                    Get started with this module in just a few steps
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {helpContent.quickStart.map((step, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <span className="text-green-800 dark:text-green-200">{step}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              {/* Main Help Sections */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Book className="h-5 w-5" />
                  Detailed Instructions
                </h3>
                
                {filteredSections.map((section, index) => (
                  <Card key={index} className="border-gray-200 dark:border-gray-700">
                    <Collapsible
                      open={expandedSections.has(section.title)}
                      onOpenChange={() => toggleSection(section.title)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base">
                              {section.icon}
                              {section.title}
                            </CardTitle>
                            {expandedSections.has(section.title) ? 
                              <ChevronDown className="h-4 w-4" /> : 
                              <ChevronRight className="h-4 w-4" />
                            }
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <p className="text-gray-700 dark:text-gray-300 mb-4">
                            {section.content}
                          </p>
                          
                          {section.subsections && (
                            <div className="space-y-4">
                              {section.subsections.map((subsection, subIndex) => (
                                <div key={subIndex} className="border-l-4 border-blue-200 dark:border-blue-800 pl-4">
                                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                                    {subsection.title}
                                  </h4>
                                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                                    {subsection.content}
                                  </p>
                                  
                                  {subsection.steps && (
                                    <ul className="space-y-1 ml-4">
                                      {subsection.steps.map((step, stepIndex) => (
                                        <li key={stepIndex} className="flex items-start gap-2">
                                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                          <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {step}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>

              {/* Tips Section */}
              {helpContent.tips.length > 0 && (
                <>
                  <Separator />
                  <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                        <Settings className="h-5 w-5" />
                        Pro Tips
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {helpContent.tips.map((tip, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                            <span className="text-amber-800 dark:text-amber-200">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Troubleshooting Section */}
              {helpContent.troubleshooting.length > 0 && (
                <>
                  <Separator />
                  <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
                        <Users className="h-5 w-5" />
                        Troubleshooting
                      </CardTitle>
                      <CardDescription className="text-red-700 dark:text-red-300">
                        Common issues and their solutions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {helpContent.troubleshooting.map((item, index) => (
                          <div key={index} className="border-l-4 border-red-300 dark:border-red-700 pl-4">
                            <h4 className="font-medium text-red-900 dark:text-red-100 mb-1">
                              Problem: {item.issue}
                            </h4>
                            <p className="text-red-700 dark:text-red-300">
                              Solution: {item.solution}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModuleHelpButton;