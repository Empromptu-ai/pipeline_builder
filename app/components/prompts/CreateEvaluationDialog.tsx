import React, { useState } from 'react';
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
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Plus } from 'lucide-react';

interface CreateEvaluationDialogProps {
  onCreateEval: (name: string, text: string) => void;
}

const CreateEvaluationDialog: React.FC<CreateEvaluationDialogProps> = ({ onCreateEval }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (name.trim() && text.trim()) {
      onCreateEval(name.trim(), text.trim());
      setName('');
      setText('');
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 hover:bg-purple-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Evaluation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Evaluation</DialogTitle>
          <DialogDescription>Create a new evaluation to assess your AI system's performance.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2">Evaluation Name</label>
            <Input
              placeholder="e.g., Product Knowledge Check"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-2 border-purple-300 focus:border-purple-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-2">Evaluation Criteria</label>
            <Textarea
              placeholder="e.g., Make sure that responses accurately reflect our product capabilities without hyperbole or inaccuracies."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[120px] border-2 border-purple-300 focus:border-purple-500"
            />
          </div>
        </div>
        <DialogFooter className="flex justify-start gap-3">
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !text.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6"
          >
            Add Evaluation
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEvaluationDialog;
