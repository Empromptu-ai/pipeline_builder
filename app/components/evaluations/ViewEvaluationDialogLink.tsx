import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/Dialog';
import { Button } from '~/components/ui/button';
import type { Evaluation } from '~/lib/services/optimizer';

interface ViewEvaluationDialogLinkProps {
  evaluation: Evaluation;
  children: React.ReactNode;
}

const ViewEvaluationDialogLink: React.FC<ViewEvaluationDialogLinkProps> = ({ evaluation, children }) => {
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    setOpen(true);
  };

  return (
    <>
      <div onClick={handleClick} className="cursor-pointer hover:bg-accent/50">
        {children}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">{evaluation.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Criteria</h3>
              <div className="p-4 bg-gray-50 rounded-md text-md whitespace-pre-wrap font-mono">{evaluation.text}</div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ViewEvaluationDialogLink;
