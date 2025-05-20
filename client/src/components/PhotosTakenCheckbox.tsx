import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';

interface PhotosTakenCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const PhotosTakenCheckbox: React.FC<PhotosTakenCheckboxProps> = ({ 
  checked, 
  onChange 
}) => {
  return (
    <div className="flex items-center justify-center">
      <Checkbox
        checked={checked}
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-green-500"
      />
    </div>
  );
};