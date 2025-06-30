import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/Dialog';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';

interface CreateInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateInput: (inputs: Record<string, string>) => void;
  varNames: string[];
}

const CreateInputDialog: React.FC<CreateInputDialogProps> = ({ open, onOpenChange, onCreateInput, varNames }) => {
  const [inputs, setInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (varNames.length > 0) {
      const newInputs: Record<string, string> = {};
      varNames.forEach((varName) => {
        newInputs[varName] = inputs[varName] || '';
      });
      setInputs(newInputs);
    }
  }, [varNames]);

  const handleSubmit = () => {
    const hasAllInputs = varNames.every((varName) => inputs[varName]?.trim());

    if (hasAllInputs) {
      onCreateInput(inputs);
      setInputs({});
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Test Input</DialogTitle>
          <DialogDescription>Provide values for all prompt variables</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {varNames.map((varName) => (
            <div key={varName}>
              <label className="text-sm font-medium">{varName}</label>
              <Textarea
                placeholder={`Enter value for ${varName}...`}
                value={inputs[varName] || ''}
                onChange={(e) => setInputs((prev) => ({ ...prev, [varName]: e.target.value }))}
                rows={3}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!varNames.every((varName) => inputs[varName]?.trim())}>
            Create Input
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateInputDialog;
