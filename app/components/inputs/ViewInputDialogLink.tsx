import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/Dialog';
import { Button } from '~/components/ui/button';
import type { ManualInput } from '~/lib/services/optimizer';

interface ViewInputDialogLinkProps {
  input: ManualInput;
  children: React.ReactNode;
}

const ViewInputDialogLink: React.FC<ViewInputDialogLinkProps> = ({ input, children }) => {
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Input</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {Object.entries(input.inputs).map(([key, value]) => (
              <div key={key}>
                <label className="text-sm font-medium">{key}</label>
                <div className="mt-2 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap font-mono">{value}</div>
              </div>
            ))}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
              {/* <Button variant="destructive">Delete Input</Button> */}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ViewInputDialogLink;
