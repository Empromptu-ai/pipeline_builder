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

interface CreateEvaluationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateEval: (name: string, text: string) => void;
}

const CreateEvaluationDialog: React.FC<CreateEvaluationDialogProps> = ({ open, onOpenChange, onCreateEval }) => {
  const [name, setName] = useState('');
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (name.trim() && text.trim()) {
      onCreateEval(name.trim(), text.trim());
      setName('');
      setText('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Evaluation</DialogTitle>
          <DialogDescription>Add a new evaluation criteria</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input placeholder="Evaluation name..." value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Evaluation Criteria</label>
            <Textarea
              placeholder="Describe what makes a good response..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || !text.trim()}>
            Create Evaluation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEvaluationDialog;
