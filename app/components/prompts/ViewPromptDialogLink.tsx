import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/Dialog';
import { Button } from '~/components/ui/button';
import type { Prompt } from '~/lib/services/optimizer';
import { deletePrompt } from '~/lib/services/optimizer';
import { useUser } from '~/hooks/useUser';
import { useParams } from '@remix-run/react';
import { toast } from 'react-toastify';

interface ViewPromptDialogLinkProps {
  prompt: Prompt;
  children: (openDialog: () => void) => React.ReactNode;
  onDelete?: () => void;
}

const ViewPromptDialogLink: React.FC<ViewPromptDialogLinkProps> = ({ prompt, children, onDelete }) => {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { uid: userId } = useUser();
  const { taskId } = useParams();

  const openDialog = () => {
    setOpen(true);
  };

  const handleDelete = async () => {
    if (!userId || !taskId || !prompt.id) {
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deletePrompt(userId, taskId, prompt.id);

      if (result) {
        toast.success('Prompt deleted successfully!', {
          position: 'bottom-right',
          autoClose: 3000,
        });

        setOpen(false);

        if (onDelete) {
          onDelete();
        }
      } else {
        toast.error('Failed to delete prompt', {
          position: 'bottom-right',
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast.error('Failed to delete prompt', {
        position: 'bottom-right',
        autoClose: 3000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {children(openDialog)}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Prompt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Model</label>
                <div className="text-sm text-muted-foreground">{prompt.model_name}</div>
              </div>
              <div>
                <label className="text-sm font-medium">Temperature</label>
                <div className="text-sm text-muted-foreground">{prompt.temperature}</div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Prompt Text</label>
              <div className="mt-2 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">{prompt.text}</div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? 'Deleting...' : 'Delete Prompt'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ViewPromptDialogLink;
