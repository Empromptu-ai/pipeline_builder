import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/Dialog';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { Label } from '~/components/ui/label';
import { Plus, Loader2 } from 'lucide-react';
import type { Model } from '~/lib/services/optimizer';
import { varNamesFromPrompt } from '~/lib/helpers/var-names';
import { createPromptForTask } from '~/lib/services/optimizer';
import { useUser } from '~/hooks/useUser';
import { useParams } from '@remix-run/react';
import { toast } from 'react-toastify';

interface CreatePromptDialogProps {
  onCreate: () => void;
  models?: Model[];
  onRefresh?: () => void;
}

const CreatePromptDialog: React.FC<CreatePromptDialogProps> = ({ onCreate, models = [], onRefresh }) => {
  const [open, setOpen] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [isCreating, setIsCreating] = useState(false);

  const { uid: userId } = useUser();
  const { taskId } = useParams();

  const detectedVariables = useMemo(() => {
    return varNamesFromPrompt(promptText);
  }, [promptText]);

  const handleCreate = async () => {
    if (!userId || !taskId || !promptText.trim() || !selectedModel) {
      return;
    }

    setIsCreating(true);

    try {
      const newPrompt = await createPromptForTask(userId, taskId, promptText, selectedModel, temperature);

      if (newPrompt) {
        toast.success('Prompt created successfully!', {
          position: 'bottom-right',
          autoClose: 3000,
        });

        // Trigger refresh of prompts list
        if (onRefresh) {
          onRefresh();
        } else {
          onCreate();
        }

        // Reset form and close dialog
        setOpen(false);
        setPromptText('');
        setSelectedModel('');
        setTemperature(0.7);
      } else {
        toast.error('Failed to create prompt', {
          position: 'bottom-right',
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error('Error creating prompt:', error);
      toast.error('Failed to create prompt', {
        position: 'bottom-right',
        autoClose: 3000,
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 hover:bg-purple-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Create Prompt
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Prompt</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="model" className="text-sm font-medium">
                Model
              </Label>
              <select
                id="model"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full p-2 border rounded-md bg-white"
              >
                <option value="">Select model</option>
                {models.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="temperature" className="text-sm font-medium">
                Temperature: {temperature}
              </Label>
              <input
                id="temperature"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="prompt-text" className="text-sm font-medium">
              Prompt Text
            </Label>
            <Textarea
              id="prompt-text"
              placeholder="... {{ input }} ..."
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="min-h-[120px] mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Input Variables Detected</Label>
            {detectedVariables.length === 0 ? (
              <div className="mt-2">
                <p className="text-red-500 text-sm">No input variables detected in your prompt.</p>
                <p className="text-gray-600 text-sm mt-1">
                  Be sure to use <code className="bg-gray-100 px-1 rounded">{'{{ input_name }}'}</code> syntax when
                  defining the input variables for your prompt.
                </p>
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-green-600 text-sm">Detected variables: {detectedVariables.join(', ')}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleCreate}
              disabled={!promptText.trim() || !selectedModel || isCreating}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Prompt'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePromptDialog;
