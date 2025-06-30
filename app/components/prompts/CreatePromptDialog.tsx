import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/Dialog';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Select } from '~/components/ui/select';

interface Model {
  name: string;
  provider: string;
}

interface CreatePromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreatePrompt: (text: string, modelName: string, temperature: number) => void;
  models: Model[];
}

const CreatePromptDialog: React.FC<CreatePromptDialogProps> = ({ open, onOpenChange, onCreatePrompt, models }) => {
  const [promptText, setPromptText] = useState('');
  const [modelName, setModelName] = useState('');
  const [temperature, setTemperature] = useState(0.7);

  const handleSubmit = () => {
    if (promptText.trim() && modelName) {
      onCreatePrompt(promptText.trim(), modelName, temperature);
      setPromptText('');
      setModelName('');
      setTemperature(0.7);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Prompt</DialogTitle>
          <DialogDescription>Add a new prompt to your prompt family</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Prompt Text</label>
            <Textarea
              placeholder="Enter your prompt..."
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={6}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Model</label>
            <Select value={modelName} onValueChange={setModelName}>
              <option value="">Select a model</option>
              {models.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name} ({model.provider})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Temperature: {temperature}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!promptText.trim() || !modelName}>
            Create Prompt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePromptDialog;
