import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/Dialog';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { Plus } from 'lucide-react';

interface CreateInputDialogProps {
  onCreateInput: (inputs: Record<string, string>) => void;
  varNames: string[];
}

const CreateInputDialog: React.FC<CreateInputDialogProps> = ({ onCreateInput, varNames }) => {
  const [open, setOpen] = useState(false);
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
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 hover:bg-purple-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Input
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Input</DialogTitle>
          <DialogDescription>Create a new input to test your AI system's performance.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Enter a value for each input variable</h3>
            <div className="space-y-4">
              {varNames.map((varName) => (
                <div key={varName}>
                  <label className="text-sm font-medium block mb-2">{varName}</label>
                  <Textarea
                    placeholder={`Enter an input value for {{ ${varName} }}`}
                    value={inputs[varName] || ''}
                    onChange={(e) => setInputs((prev) => ({ ...prev, [varName]: e.target.value }))}
                    className="min-h-[120px] border-2 border-purple-300 focus:border-purple-500 rounded-md"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="flex justify-start gap-3">
          <Button
            onClick={handleSubmit}
            disabled={!varNames.every((varName) => inputs[varName]?.trim())}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6"
          >
            Add Input
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateInputDialog;
